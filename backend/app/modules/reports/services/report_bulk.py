"""
Report Bulk Operations - Spreadsheet-style batch updates.

Responsibilities:
- Apply bulk create/update/delete operations
- Version conflict detection
- Optimistic locking
"""

from sqlalchemy.orm import Session
from app.modules.reports.models import Report, ReportRow, RowType
from app.modules.reports.schemas import BulkOperationsRequest, Operation
import logging
import time

logger = logging.getLogger(__name__)


class StaleRowError(ValueError):
    """Client referenced a row id that no longer exists in this report."""


class ReportBulkService:
    """Bulk operations on report rows with version control."""

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _parse_row_type(row_type: str | RowType | None) -> RowType:
        if isinstance(row_type, RowType):
            return row_type
        if not row_type:
            raise ValueError("Operation requires row_type")
        try:
            return RowType(row_type)
        except ValueError as exc:
            raise ValueError(f"Unsupported row_type: {row_type}") from exc

    def _find_row_by_identity(self, report: Report, op: Operation) -> ReportRow | None:
        """Find a row by id, falling back to stable row_type/stt.

        Import with replace recreates row ids. A browser can still have a
        pending edit for the old id; when row_type and stt are available, the
        matching imported row is the correct target.
        """
        row = None
        if op.row_id:
            row = (
                self.db.query(ReportRow)
                .filter(ReportRow.id == op.row_id, ReportRow.report_id == report.id)
                .first()
            )
        if row or not op.row_type or op.stt is None:
            return row

        return (
            self.db.query(ReportRow)
            .filter(
                ReportRow.report_id == report.id,
                ReportRow.row_type == self._parse_row_type(op.row_type),
                ReportRow.stt == op.stt,
            )
            .first()
        )

    def apply_operations(self, report_id: str, payload: BulkOperationsRequest) -> dict:
        """
        Apply bulk operations to a report.

        Args:
            report_id: Report UUID
            payload: BulkOperationsRequest with version and operations

        Returns:
            dict: {"status": "ok", "version": N} or {"status": "conflict", "server_version": N}
        """
        start_time = time.time()

        report = self.db.query(Report).filter_by(id=report_id).with_for_update().first()

        if not report:
            logger.warning("Report not found", extra={"report_id": report_id})
            return {"status": "error", "message": "Report not found"}

        # Version conflict check
        if payload.version != report.version:
            logger.warning(
                "Version conflict",
                extra={
                    "report_id": report_id,
                    "client_version": payload.version,
                    "server_version": report.version
                }
            )
            return {
                "status": "conflict",
                "server_version": report.version
            }

        try:
            op_count = len(payload.operations)
            created_singleton_rows: dict[RowType, ReportRow] = {}
            created_rows_by_temp_id: dict[str, ReportRow] = {}
            created_rows_by_position: dict[tuple[RowType, int], ReportRow] = {}
            for op in payload.operations:
                if op.type == "create":
                    if not op.data:
                        raise ValueError("Create operation requires data")
                    data = dict(op.data)
                    row_type = self._parse_row_type(op.row_type or data.pop("row_type", None))
                    stt = op.stt if op.stt is not None else data.get("stt")
                    if stt is not None:
                        data["stt"] = stt
                    existing_row = None
                    if op.temp_id:
                        existing_row = created_rows_by_temp_id.get(op.temp_id)
                    if existing_row is None and stt is not None:
                        existing_row = created_rows_by_position.get((row_type, int(stt)))
                    if existing_row is None and stt is not None:
                        existing_row = (
                            self.db.query(ReportRow)
                            .filter(
                                ReportRow.report_id == report.id,
                                ReportRow.row_type == row_type,
                                ReportRow.stt == stt,
                            )
                            .first()
                        )
                    if row_type == RowType.OPERATION:
                        existing_row = existing_row or created_singleton_rows.get(row_type) or (
                            self.db.query(ReportRow)
                            .filter(ReportRow.report_id == report.id, ReportRow.row_type == row_type)
                            .first()
                        )
                    if existing_row:
                        existing_row.payload = {**(existing_row.payload or {}), **data}
                        if stt is not None:
                            existing_row.stt = stt
                        if row_type == RowType.OPERATION:
                            created_singleton_rows[row_type] = existing_row
                        if op.temp_id:
                            created_rows_by_temp_id[op.temp_id] = existing_row
                        if stt is not None:
                            created_rows_by_position[(row_type, int(stt))] = existing_row
                        continue
                    row = ReportRow(
                        report_id=report.id,
                        row_type=row_type,
                        stt=stt,
                        payload=data  # Store all other fields in payload
                    )
                    self.db.add(row)
                    if row_type == RowType.OPERATION:
                        created_singleton_rows[row_type] = row
                    if op.temp_id:
                        created_rows_by_temp_id[op.temp_id] = row
                    if stt is not None:
                        created_rows_by_position[(row_type, int(stt))] = row

                elif op.type == "update":
                    if not op.row_id:
                        raise ValueError("Update operation requires row_id")
                    row = self._find_row_by_identity(report, op)
                    if not row:
                        raise StaleRowError(f"Row {op.row_id} not found")
                    data = dict(op.data or {})
                    if op.row_type or "row_type" in data:
                        row.row_type = self._parse_row_type(op.row_type or data.pop("row_type", None))
                    if op.stt is not None:
                        row.stt = op.stt
                        data["stt"] = op.stt
                    elif "stt" in data:
                        row.stt = data["stt"]
                    if data:
                        row.payload = {**(row.payload or {}), **data}

                elif op.type == "delete":
                    if not op.row_id:
                        raise ValueError("Delete operation requires row_id")
                    row = (
                        self.db.query(ReportRow)
                        .filter(ReportRow.id == op.row_id, ReportRow.report_id == report.id)
                        .first()
                    )
                    if not row:
                        raise StaleRowError(f"Row {op.row_id} not found")
                    self.db.delete(row)
                else:
                    raise ValueError(f"Unsupported operation type: {op.type}")

            report.version += 1
            self.db.commit()
            self.db.refresh(report)

            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                "Operations applied",
                extra={
                    "report_id": report_id,
                    "operations": op_count,
                    "new_version": report.version,
                    "duration_ms": duration_ms
                }
            )

            return {
                "status": "ok",
                "version": report.version
            }

        except StaleRowError as e:
            self.db.rollback()
            logger.warning(
                "Stale row operation",
                extra={
                    "report_id": report_id,
                    "error": str(e),
                    "duration_ms": (time.time() - start_time) * 1000
                }
            )
            return {
                "status": "conflict",
                "server_version": report.version,
            }

        except Exception as e:
            self.db.rollback()
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                "Operation failed",
                extra={
                    "report_id": report_id,
                    "error": str(e),
                    "duration_ms": duration_ms
                }
            )
            raise
