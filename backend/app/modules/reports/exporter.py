"""
Exporter - OUTBOUND ONLY

Converts Report model (database) to CanonicalReport.
This is the entry point for data going OUT of the system.
"""

from datetime import date, datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.modules.reports.models import Report, ReportRow, RowType
from app.modules.reports.mapper import (
    map_header,
    map_statistics,
    map_cnch_events,
    map_sclq_events,
    map_other_tasks,
    map_official_documents,
    map_damaged_vehicles,
    map_detailed_operations
)
from app.modules.reports.schemas import (
    CanonicalReport,
    Header,
    StatisticRow,
    CnchEvent,
    Vehicle,
    DetailedOperations
)


class ReportExporter:
    """
    Exports Report model to CanonicalReport format.

    Responsibilities:
    - Read Report from database (via repository or direct query)
    - Extract domain collections using row_type
    - Map each collection using mappers
    - Assemble CanonicalReport object
    - Return validated pydantic model

    This class is OUTBOUND only - converts DB → Canonical JSON.
    For inbound (input → canonical), use Normalizer class.
    """

    @staticmethod
    def export(
        report: Report,
        include_details: bool = True,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> CanonicalReport:
        """
        Export report to canonical format.

        Args:
            report: Report object with loaded rows (use joinedload)
            include_details: Whether to include detailed sections

        Returns:
            CanonicalReport (pydantic model, type-safe)

        Raises:
            ValueError: If data cannot be exported
        """
        # Extract all rows
        all_rows = report.rows if hasattr(report, 'rows') and report.rows else []

        # Domain classification using row_type. Daily reports export only the
        # selected report date; range exports can aggregate imported workbook rows.
        report_date = report.report_date
        effective_start = start_date or report_date
        effective_end = end_date or report_date
        statistics = ReportExporter._filter_statistics_rows(
            [r for r in all_rows if r.row_type == RowType.STATISTICS],
            effective_start,
            effective_end,
        )
        cnch_events = ReportExporter._filter_rows_by_date(
            [r for r in all_rows if r.row_type == RowType.CNCH_EVENT],
            effective_start,
            effective_end,
            "ngay_xay_ra",
        )
        sclq_events = ReportExporter._filter_rows_by_date(
            [r for r in all_rows if r.row_type == RowType.SCLQ],
            effective_start,
            effective_end,
            "vu_chay_ngay",
        )
        other_tasks = [r for r in all_rows if r.row_type == RowType.OTHER_TASK]
        vehicles = [r for r in all_rows if r.row_type == RowType.VEHICLE]
        operations = [r for r in all_rows if r.row_type == RowType.OPERATION]

        # Map each domain - mappers expect dict with payload
        statistics_payloads = [r.data for r in statistics]
        cnch_payloads = [r.data for r in cnch_events]
        sclq_payloads = [r.data for r in sclq_events]

        mapped_cnch_events = map_cnch_events(cnch_payloads)
        mapped_sclq_events = map_sclq_events(sclq_payloads)
        mapped_cnch_events.extend(
            ReportExporter._build_missing_cnch_rows(
                statistics,
                existing_count=len(mapped_cnch_events),
                start_date=effective_start,
                end_date=effective_end,
            )
        )
        mapped_sclq_events.extend(
            ReportExporter._build_missing_sclq_rows(
                statistics,
                existing_count=len(mapped_sclq_events),
                start_date=effective_start,
                end_date=effective_end,
            )
        )

        header_data = map_header(report, [r.data for r in operations])
        bang_thong_ke = map_statistics(
            statistics_payloads,
            ReportExporter._derive_statistics_from_details(cnch_payloads, sclq_payloads),
        )
        detailed_operations = map_detailed_operations([r.data for r in operations])
        ReportExporter._merge_statistics_into_operations(
            detailed_operations,
            statistics_payloads,
            mapped_cnch_events,
            mapped_sclq_events,
        )

        # Build canonical data
        canonical_data = {
            "header": header_data,
            "bang_thong_ke": bang_thong_ke,
            "danh_sach_cnch": mapped_cnch_events,
            "danh_sach_sclq": mapped_sclq_events,
            "danh_sach_tong_vu_chay": [],
            "danh_sach_cong_tac_khac": map_other_tasks([r.data for r in other_tasks]),
            "danh_sach_cong_van_tham_muu": map_official_documents([]),
            "danh_sach_phuong_tien_hu_hong": map_damaged_vehicles([r.data for r in vehicles]),
            "phan_I_va_II_chi_tiet_nghiep_vu": detailed_operations
        }

        # Validate and return as CanonicalReport
        try:
            return CanonicalReport(**canonical_data)
        except Exception as e:
            raise ValueError(f"Failed to create CanonicalReport: {e}") from e

    @staticmethod
    def _filter_statistics_rows(
        rows: List[ReportRow],
        start_date: date | None,
        end_date: date | None,
    ) -> List[ReportRow]:
        if not start_date or not end_date:
            return rows

        filtered = []
        for row in rows:
            data = row.data
            day = ReportExporter._to_int(data.get("ngay"))
            month = ReportExporter._to_int(data.get("thang"))
            row_date = ReportExporter._date_from_day_month(day, month, start_date, end_date)
            if row_date and start_date <= row_date <= end_date:
                filtered.append(row)

        return filtered

    @staticmethod
    def _filter_rows_by_date(
        rows: List[ReportRow],
        start_date: date | None,
        end_date: date | None,
        key: str,
    ) -> List[ReportRow]:
        if not start_date or not end_date:
            return rows
        return [
            row
            for row in rows
            if (parsed := ReportExporter._parse_date(row.data.get(key))) and start_date <= parsed <= end_date
        ]

    @staticmethod
    def _date_from_day_month(day: int, month: int, start_date: date, end_date: date) -> date | None:
        if day <= 0 or month <= 0:
            return None

        for year in range(start_date.year, end_date.year + 1):
            try:
                candidate = date(year, month, day)
            except ValueError:
                continue
            if start_date <= candidate <= end_date:
                return candidate
        return None

    @staticmethod
    def _parse_date(value: Any) -> date | None:
        if value in (None, ""):
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value

        text = str(value).strip()
        for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue
        return None

    @staticmethod
    def _to_int(value: Any) -> int:
        if value in (None, ""):
            return 0
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, (int, float)):
            return int(value)
        try:
            return int(float(str(value).replace(",", ".").strip()))
        except ValueError:
            return 0

    @staticmethod
    def _sum_payloads(rows: List[Dict[str, Any]], *keys: str) -> int:
        total = 0
        for row in rows:
            for key in keys:
                total += ReportExporter._to_int(row.get(key))
        return total

    @staticmethod
    def _build_missing_cnch_rows(
        statistics: List[ReportRow],
        existing_count: int,
        start_date: date | None,
        end_date: date | None,
    ) -> List[Dict[str, Any]]:
        expected = ReportExporter._sum_payloads([row.data for row in statistics], "cnch")
        missing = max(0, expected - existing_count)
        if missing == 0:
            return []

        rows = []
        next_stt = existing_count + 1
        for row in statistics:
            if missing == 0:
                break
            count = ReportExporter._to_int(row.data.get("cnch"))
            if count <= 0:
                continue
            row_date = ReportExporter._date_from_statistics_row(row, start_date, end_date)
            for _ in range(count):
                if missing == 0:
                    break
                rows.append({
                    "stt": next_stt,
                    "mo_ta": "",
                    "dia_diem": "",
                    "thiet_hai": "",
                    "thoi_gian": "",
                    "ngay_xay_ra": row_date.strftime("%d/%m/%Y") if row_date else "",
                    "ket_qua_xu_ly": "",
                    "noi_dung_tin_bao": str(row.data.get("ghi_chu") or "Thiếu chi tiết CNCH từ bảng CNCH"),
                    "luc_luong_tham_gia": "",
                    "thong_tin_nan_nhan": "",
                })
                next_stt += 1
                missing -= 1
        return rows

    @staticmethod
    def _build_missing_sclq_rows(
        statistics: List[ReportRow],
        existing_count: int,
        start_date: date | None,
        end_date: date | None,
    ) -> List[Dict[str, Any]]:
        expected = ReportExporter._sum_payloads([row.data for row in statistics], "sclq_den_pccc_cnch")
        missing = max(0, expected - existing_count)
        if missing == 0:
            return []

        rows = []
        next_stt = existing_count + 1
        for row in statistics:
            if missing == 0:
                break
            count = ReportExporter._to_int(row.data.get("sclq_den_pccc_cnch"))
            if count <= 0:
                continue
            row_date = ReportExporter._date_from_statistics_row(row, start_date, end_date)
            note = str(row.data.get("ghi_chu") or "").strip()
            for _ in range(count):
                if missing == 0:
                    break
                rows.append({
                    "stt": next_stt,
                    "vu_chay_ngay": row_date.strftime("%d/%m/%Y") if row_date else "",
                    "dia_diem": "",
                    "nguyen_nhan": "",
                    "thiet_hai": "",
                    "chi_huy_chua_chay": "",
                    "ghi_chu": note or "Thiếu chi tiết SCLQ từ bảng SCLQ",
                })
                next_stt += 1
                missing -= 1
        return rows

    @staticmethod
    def _date_from_statistics_row(row: ReportRow, start_date: date | None, end_date: date | None) -> date | None:
        if not start_date or not end_date:
            return None
        day = ReportExporter._to_int(row.data.get("ngay"))
        month = ReportExporter._to_int(row.data.get("thang"))
        return ReportExporter._date_from_day_month(day, month, start_date, end_date)

    @staticmethod
    def _derive_statistics_from_details(
        cnch_payloads: List[Dict[str, Any]],
        sclq_payloads: List[Dict[str, Any]],
    ) -> Dict[int, int]:
        """Derive report statistics that only exist in detail sheets.

        BC NGAY carries the event counts, but the detail sheets can provide a
        few child metrics for the CNCH section. Keep this conservative: only
        numeric fields with a clear enough source are mapped.
        """
        _ = sclq_payloads
        rescued_people = ReportExporter._sum_payloads(cnch_payloads, "so_nguoi_cuu_duoc")
        body_or_casualty_count = ReportExporter._sum_payloads(cnch_payloads, "thiet_hai_ve_nguoi")

        return {
            16: rescued_people,
            18: body_or_casualty_count,
        }

    @staticmethod
    def _merge_statistics_into_operations(
        operations: Dict[str, Any],
        statistics: List[Dict[str, Any]],
        cnch_events: List[Dict[str, Any]],
        sclq_events: List[Dict[str, Any]],
    ) -> None:
        vu_chay = ReportExporter._sum_payloads(statistics, "vu_chay_thong_ke")
        sclq = ReportExporter._sum_payloads(statistics, "sclq_den_pccc_cnch")
        chi_vien = ReportExporter._sum_payloads(statistics, "chi_vien")
        cnch = ReportExporter._sum_payloads(statistics, "cnch")

        operations["tong_bao_cao"] = ReportExporter._to_int(operations.get("tong_bao_cao")) or (vu_chay + sclq + chi_vien + cnch)
        operations["tong_chi_vien"] = ReportExporter._to_int(operations.get("tong_chi_vien")) or chi_vien
        operations["tong_so_vu_chay"] = ReportExporter._to_int(operations.get("tong_so_vu_chay")) or vu_chay
        operations["tong_so_vu_cnch"] = ReportExporter._to_int(operations.get("tong_so_vu_cnch")) or cnch

        if not str(operations.get("chi_tiet_cnch") or "").strip():
            detail_lines = []
            if cnch_events:
                detail_lines.append(f"3. Tình hình công tác cứu nạn, cứu hộ: {len(cnch_events)} vụ.")
            else:
                detail_lines.append("3. Tình hình công tác cứu nạn, cứu hộ: Không.")
            detail_lines.append("4. Tình hình chi viện chữa cháy: Không." if chi_vien == 0 else f"4. Tình hình chi viện chữa cháy: {chi_vien} vụ.")
            if sclq_events:
                detail_lines.append(f"5. Tình hình khác có liên quan đến công tác PCCC: {len(sclq_events)} sự cố.")
            else:
                detail_lines.append("5. Tình hình khác có liên quan đến công tác PCCC: Không.")
            operations["chi_tiet_cnch"] = "\n".join(detail_lines)

    @staticmethod
    def to_dict(canonical: CanonicalReport) -> Dict[str, Any]:
        """
        Convert CanonicalReport to plain dict (for JSON serialization).

        Args:
            canonical: CanonicalReport instance

        Returns:
            Plain dict ready for JSON serialization
        """
        return canonical.model_dump()
