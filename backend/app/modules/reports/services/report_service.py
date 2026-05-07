"""
Report Service - CRUD operations for Report model.

Responsibilities:
- Create, read, update reports
- Manage report state
- Basic CRUD only
"""

from sqlalchemy.orm import Session, joinedload
from app.modules.reports.mapping_config import SOURCE_ROW_TYPES
from app.modules.reports.models import Report, ReportRow
from app.modules.reports.schemas import ReportCreate
import logging

logger = logging.getLogger(__name__)
SOURCE_REPORT_TITLE = "Trung tâm dữ liệu KV30"
LEGACY_SOURCE_REPORT_TITLES = ("Kho dữ liệu gốc KV30",)


class ReportService:
    """CRUD operations for Report."""

    def __init__(self, db: Session):
        self.db = db

    def create_report(self, title: str, report_date=None) -> Report:
        """Create a new report."""
        report = Report(title=title, report_date=report_date)
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        logger.info("Created report", extra={"report_id": str(report.id), "title": title})
        return report

    def ensure_source_report(self) -> Report:
        """Return the single source-of-truth report, creating it if needed."""
        source = (
            self.db.query(Report)
            .options(joinedload(Report.rows))
            .filter(Report.title.in_((SOURCE_REPORT_TITLE, *LEGACY_SOURCE_REPORT_TITLES)))
            .first()
        )
        if source:
            if source.title != SOURCE_REPORT_TITLE:
                source.title = SOURCE_REPORT_TITLE
                self.db.commit()
                self.db.refresh(source)
            return source

        candidate = self._best_source_candidate()
        source = Report(title=SOURCE_REPORT_TITLE, report_date=None)
        self.db.add(source)
        self.db.flush()

        if candidate:
            for row in candidate.rows:
                if row.row_type.value not in SOURCE_ROW_TYPES:
                    continue
                self.db.add(ReportRow(
                    report_id=source.id,
                    row_type=row.row_type,
                    stt=row.stt,
                    payload=dict(row.payload or {}),
                ))

        self.db.commit()
        self.db.refresh(source)
        logger.info("Ensured source report", extra={"report_id": str(source.id)})
        return self.get_report_with_rows(str(source.id))

    def get_report(self, report_id: str) -> Report:
        """Get report by ID (without rows)."""
        return self.db.query(Report).filter(Report.id == report_id).first()

    def get_report_with_rows(self, report_id: str) -> Report:
        """Get report with all rows loaded."""
        from sqlalchemy.orm import joinedload
        return self.db.query(Report).options(joinedload(Report.rows)).filter(Report.id == report_id).first()

    def get_all_reports(self):
        """Get all reports (list only, no rows)."""
        return self.db.query(Report).all()

    def _best_source_candidate(self) -> Report | None:
        reports = (
            self.db.query(Report)
            .options(joinedload(Report.rows))
            .filter(~Report.title.in_((SOURCE_REPORT_TITLE, *LEGACY_SOURCE_REPORT_TITLES)))
            .all()
        )
        if not reports:
            return None

        def score(report: Report):
            source_rows = sum(
                1
                for row in report.rows
                if row.row_type and row.row_type.value in SOURCE_ROW_TYPES
            )
            updated = report.updated_at or report.created_at
            return (source_rows, updated)

        best = max(reports, key=score)
        return best if score(best)[0] > 0 else None

    def update_report_metadata(self, report_id: str, **kwargs) -> Report:
        """Update report metadata (title, report_date)."""
        report = self.get_report(report_id)
        if not report:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(report, key):
                setattr(report, key, value)
        self.db.commit()
        self.db.refresh(report)
        return report

    def delete_report(self, report_id: str) -> bool:
        """Delete report and all its rows."""
        report = self.get_report(report_id)
        if not report:
            return False
        self.db.delete(report)
        self.db.commit()
        return True
