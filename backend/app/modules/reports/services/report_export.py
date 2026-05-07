"""
Report Export Service - Export and rendering orchestration.

Responsibilities:
- Export report to CanonicalReport
- Render Word document
- Coordinate exporter and renderer
"""

from sqlalchemy.orm import Session, joinedload
from app.modules.reports.models import Report
from app.modules.reports.exporter import ReportExporter
from app.modules.reports.renderer import ReportRenderer
from app.modules.reports.schemas import CanonicalReport
from app.modules.reports.constants import STATISTICS_TEMPLATE
from io import BytesIO
from datetime import date
import logging

logger = logging.getLogger(__name__)


class ReportExportService:
    """Export and rendering operations."""

    def __init__(self, db: Session):
        self.db = db

    def export(self, report_id: str, include_details: bool = True):
        """
        Export report to CanonicalReport.

        Args:
            report_id: Report UUID
            include_details: Whether to include detailed sections

        Returns:
            CanonicalReport (pydantic model) or None if not found
        """
        report = self.db.query(Report).options(joinedload(Report.rows)).filter(Report.id == report_id).first()

        if not report:
            logger.warning("Export failed - report not found", extra={"report_id": report_id})
            return None

        logger.info("Exporting report", extra={"report_id": report_id, "row_count": len(report.rows)})
        return ReportExporter.export(report, include_details=include_details)

    def validate_export(self, report_id: str) -> dict:
        """
        Validate that report has all required fields before export.
        Returns: {valid: bool, missing: list[str]}
        """
        report = self.db.query(Report).options(joinedload(Report.rows)).filter(Report.id == report_id).first()
        if not report:
            logger.warning("Validation failed - report not found", extra={"report_id": report_id})
            return {"valid": False, "missing": ["Không tìm thấy báo cáo"]}

        canonical = self.export(report_id)
        if not canonical:
            return {"valid": False, "missing": ["Không thể đọc dữ liệu báo cáo"]}

        missing = []
        header = canonical.header

        # Check required header fields
        if not header.so_bao_cao or not str(header.so_bao_cao).strip():
            missing.append("Số báo cáo")
        if not header.don_vi_bao_cao or not str(header.don_vi_bao_cao).strip():
            missing.append("Đơn vị báo cáo")
        if not header.thoi_gian_tu_den or not str(header.thoi_gian_tu_den).strip():
            missing.append("Thời gian từ đến")

        # Check quan_so_truc > 0
        ops = canonical.phan_I_va_II_chi_tiet_nghiep_vu
        if not ops.quan_so_truc or ops.quan_so_truc <= 0:
            missing.append("Quân số trực (chưa nhập)")

        # Check that event lists have required fields
        for idx, cnch in enumerate(canonical.danh_sach_cnch):
            if not cnch.ngay_xay_ra and not cnch.thoi_gian:
                missing.append(f"CNCH #{idx + 1}: thiếu ngày/thời gian")
            if not cnch.dia_diem:
                missing.append(f"CNCH #{idx + 1}: thiếu địa điểm")

        for idx, sclq in enumerate(canonical.danh_sach_sclq or []):
            if not sclq.vu_chay_ngay:
                missing.append(f"SCLQ #{idx + 1}: thiếu ngày")
            if not sclq.dia_diem:
                missing.append(f"SCLQ #{idx + 1}: thiếu địa điểm")

        return {"valid": len(missing) == 0, "missing": missing}

    def render_docx(self, report_id: str, include_details: bool = True, template_name: str = None) -> BytesIO:
        """
        Render report to Word document.

        Args:
            report_id: Report UUID
            include_details: Whether to include detailed sections
            template_name: Optional template filename

        Returns:
            BytesIO containing rendered .docx

        Raises:
            FileNotFoundError: If template doesn't exist
        """
        canonical = self.export(report_id, include_details=include_details)
        if canonical is None:
            raise ValueError(f"Report {report_id} not found")

        return ReportRenderer.render(canonical, template_name=template_name)

    def render_docx_from_json(self, data, template_name: str = None) -> BytesIO:
        """Render a validated canonical JSON payload without writing it to the database."""
        return ReportRenderer.render(data, template_name=template_name)

    def aggregate_by_date_range(self, start_date: date, end_date: date) -> CanonicalReport:
        """Export the source report by date range.

        Older versions created one report per day and copied workbook rows into
        each report. The source report is now the only data source; date, week,
        and month reports are just filtered views over that source.
        """
        from app.modules.reports.services.report_service import ReportService

        report = ReportService(self.db).ensure_source_report()
        canonical = ReportExporter.export(report, start_date=start_date, end_date=end_date)
        data = canonical.model_dump()
        data["header"] = ReportExportService._date_range_header(
            start_date,
            end_date,
            {"don_vi_bao_cao": data.get("header", {}).get("don_vi_bao_cao")},
        )
        return CanonicalReport(**data)

    def aggregate_report_rows_by_date_range(self, report_id: str, start_date: date, end_date: date) -> CanonicalReport | None:
        """Aggregate imported rows in one report by an inclusive date range."""
        report = self.db.query(Report).options(joinedload(Report.rows)).filter(Report.id == report_id).first()
        if not report:
            return None

        canonical = ReportExporter.export(report, start_date=start_date, end_date=end_date)
        data = canonical.model_dump()
        data["header"] = {
            "so_bao_cao": f"Tổng hợp {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}",
            "ngay_bao_cao": end_date.strftime("%d/%m/%Y"),
            "don_vi_bao_cao": data.get("header", {}).get("don_vi_bao_cao") or "ĐỘI CC&CNCH KHU VỰC 30",
            "thoi_gian_tu_den": f"Từ ngày {start_date.strftime('%d/%m/%Y')} đến ngày {end_date.strftime('%d/%m/%Y')}",
        }
        data["header"] = ReportExportService._date_range_header(
            start_date,
            end_date,
            {"don_vi_bao_cao": data.get("header", {}).get("don_vi_bao_cao")},
        )
        return CanonicalReport(**data)

    @staticmethod
    def _date_range_header(start_date: date, end_date: date, base_header: dict | None = None) -> dict:
        base_header = base_header or {}
        return {
            "so_bao_cao": f"Tổng hợp {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}",
            "ngay_bao_cao": end_date.strftime("%d/%m/%Y"),
            "don_vi_bao_cao": base_header.get("don_vi_bao_cao") or "ĐỘI CC&CNCH KHU VỰC 30",
            "thoi_gian_tu_den": f"Từ ngày {start_date.strftime('%d/%m/%Y')} đến ngày {end_date.strftime('%d/%m/%Y')}",
        }

    @staticmethod
    def _date_range_header(start_date: date, end_date: date, base_header: dict | None = None) -> dict:
        base_header = base_header or {}
        is_daily = start_date == end_date
        date_label = end_date.strftime("%d/%m/%Y")
        title = f"Báo cáo ngày {date_label}" if is_daily else f"Tổng hợp {start_date.strftime('%d/%m/%Y')} - {date_label}"
        time_range = f"Ngày {date_label}" if is_daily else f"Từ ngày {start_date.strftime('%d/%m/%Y')} đến ngày {date_label}"
        return {
            "so_bao_cao": title,
            "ngay_bao_cao": date_label,
            "don_vi_bao_cao": base_header.get("don_vi_bao_cao") or "ĐỘI CC&CNCH KHU VỰC 30",
            "thoi_gian_tu_den": base_header.get("thoi_gian_tu_den") or time_range,
        }

    @staticmethod
    def _merge_canonical_reports(reports, start_date: date, end_date: date) -> CanonicalReport:
        header = {
            "so_bao_cao": f"Tổng hợp {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}",
            "ngay_bao_cao": end_date.strftime("%d/%m/%Y"),
            "don_vi_bao_cao": "ĐỘI CC&CNCH KHU VỰC 30",
            "thoi_gian_tu_den": f"Từ ngày {start_date.strftime('%d/%m/%Y')} đến ngày {end_date.strftime('%d/%m/%Y')}",
        }

        header = ReportExportService._date_range_header(start_date, end_date)

        if reports:
            first_header = reports[0].header.model_dump()
            header["don_vi_bao_cao"] = first_header.get("don_vi_bao_cao") or header["don_vi_bao_cao"]

        stats_by_stt = {
            str(row["stt"]): {
                "stt": str(row["stt"]),
                "noi_dung": row["noi_dung"],
                "ket_qua": 0,
            }
            for row in STATISTICS_TEMPLATE
        }
        for report in reports:
            for row in report.bang_thong_ke:
                key = str(row.stt)
                stats_by_stt.setdefault(key, {"stt": key, "noi_dung": row.noi_dung, "ket_qua": 0})
                stats_by_stt[key]["ket_qua"] += ReportExportService._to_int(row.ket_qua)

        merged = {
            "header": header,
            "bang_thong_ke": [stats_by_stt[key] for key in sorted(stats_by_stt, key=ReportExportService._sort_stt)],
            "danh_sach_cnch": ReportExportService._renumber_list(
                item.model_dump() for report in reports for item in report.danh_sach_cnch
            ),
            "danh_sach_sclq": ReportExportService._renumber_list(
                item.model_dump() for report in reports for item in report.danh_sach_sclq
            ),
            "danh_sach_tong_vu_chay": [],
            "danh_sach_cong_tac_khac": [
                item for report in reports for item in report.danh_sach_cong_tac_khac if str(item).strip()
            ],
            "danh_sach_cong_van_tham_muu": [
                item for report in reports for item in report.danh_sach_cong_van_tham_muu
            ],
            "danh_sach_phuong_tien_hu_hong": [
                item.model_dump() for report in reports for item in report.danh_sach_phuong_tien_hu_hong
            ],
            "phan_I_va_II_chi_tiet_nghiep_vu": ReportExportService._merge_operations(reports),
        }

        return CanonicalReport(**merged)

    @staticmethod
    def _merge_operations(reports):
        numeric_keys = [
            "quan_so_truc",
            "tong_bao_cao",
            "tong_chi_vien",
            "tong_cong_van",
            "tong_ke_hoach",
            "tong_so_vu_no",
            "tong_so_vu_chay",
            "tong_so_vu_cnch",
            "tong_xe_hu_hong",
        ]
        result = {key: 0 for key in numeric_keys}
        text_values = {
            "chi_tiet_cnch": [],
            "cong_tac_an_ninh": [],
        }

        for report in reports:
            data = report.phan_I_va_II_chi_tiet_nghiep_vu.model_dump()
            for key in numeric_keys:
                result[key] += ReportExportService._to_int(data.get(key))
            for key in text_values:
                value = str(data.get(key) or "").strip()
                if value:
                    text_values[key].append(value)

        for key, values in text_values.items():
            result[key] = "\n".join(values)

        return result

    @staticmethod
    def _renumber_list(items):
        result = []
        for index, item in enumerate(items, start=1):
            data = dict(item)
            data["stt"] = index
            result.append(data)
        return result

    @staticmethod
    def _to_int(value) -> int:
        if value in (None, ""):
            return 0
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, (int, float)):
            return int(value)
        try:
            return int(float(str(value).replace(".", "").replace(",", "").strip()))
        except ValueError:
            return 0

    @staticmethod
    def _sort_stt(value: str) -> int:
        try:
            return int(value)
        except ValueError:
            return 0
