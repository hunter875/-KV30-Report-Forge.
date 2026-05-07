"""
Renderer - PRESENTATION ONLY

Renders CanonicalReport to Word document using template.
"""

import logging
import os
import re
from datetime import datetime
from io import BytesIO
from typing import Union

from docxtpl import DocxTemplate

from app.modules.reports.schemas import CanonicalReport

logger = logging.getLogger(__name__)


class ReportRenderer:
    """
    Renders CanonicalReport to Word document.

    Responsibilities:
    - Load Word template by name
    - Build Jinja2 context from CanonicalReport
    - Render and return BytesIO
    """

    TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
    DEFAULT_TEMPLATE = "bc_ngay_kv30.docx"

    @classmethod
    def render(cls, canonical: Union[CanonicalReport, dict], template_name: str = None) -> BytesIO:
        template_name = template_name or cls.DEFAULT_TEMPLATE
        template_path = os.path.join(cls.TEMPLATE_DIR, template_name)

        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Template not found: {template_path}")

        logger.info("Rendering Word document", extra={"template": template_name})

        try:
            tpl = DocxTemplate(template_path)
            tpl.render(cls._build_context(canonical))
            buffer = BytesIO()
            tpl.save(buffer)
            buffer.seek(0)
            logger.info("Document rendered successfully")
            return buffer
        except Exception as e:
            logger.error("Failed to render document", extra={"error": str(e)})
            raise Exception(f"Failed to render document: {e}") from e

    @classmethod
    def _build_context(cls, canonical: Union[CanonicalReport, dict]) -> dict:
        data = canonical.model_dump() if isinstance(canonical, CanonicalReport) else (canonical or {})
        header = data.get("header", {}) or {}
        ops = data.get("phan_I_va_II_chi_tiet_nghiep_vu", {}) or {}
        stat_values = cls._stat_values(data.get("bang_thong_ke", []) or [])

        ngay_bao_cao = str(header.get("ngay_bao_cao") or "")
        ngay_xuat, thang_xuat, nam_xuat = cls._split_vi_date(ngay_bao_cao)

        tu_ngay, den_ngay = cls._date_range_bounds(header.get("thoi_gian_tu_den") or "", ngay_bao_cao)

        context = {
            "so_bao_cao": header.get("so_bao_cao") or "",
            "ngay_bao_cao": ngay_bao_cao,
            "ngay_xuat": ngay_xuat,
            "thang_xuat": thang_xuat,
            "nam_xuat": nam_xuat,
            "tu_ngay": tu_ngay,
            "den_ngay": den_ngay,
            "thang_bao_cao": thang_xuat,
            "don_vi_bao_cao": header.get("don_vi_bao_cao") or "",
            "thoi_gian_tu_den": header.get("thoi_gian_tu_den") or "",
            "danh_sach_chay": cls._map_fire_events(data.get("danh_sach_chay") or data.get("danh_sach_tong_vu_chay", []) or []),
            "danh_sach_cnch": cls._map_cnch_events(data.get("danh_sach_cnch", []) or []),
            "danh_sach_su_co": cls._map_sclq_events(data.get("danh_sach_su_co") or data.get("danh_sach_sclq", []) or []),
            "danh_sach_chi_vien": data.get("danh_sach_chi_vien", []) or [],
            "danh_sach_sclq": data.get("danh_sach_sclq", []) or [],
            "danh_sach_tong_vu_chay": data.get("danh_sach_tong_vu_chay", []) or [],
            "danh_sach_cong_tac_khac": data.get("danh_sach_cong_tac_khac", []) or [],
            "danh_sach_cong_van_tham_muu": data.get("danh_sach_cong_van_tham_muu", []) or [],
            "danh_sach_phuong_tien_hu_hong": data.get("danh_sach_phuong_tien_hu_hong", []) or [],
        }
        context.update(cls._stats_context(stat_values))
        context.update(cls._operations_context(ops, stat_values))
        return context

    @staticmethod
    def _split_vi_date(value: str) -> tuple[str, str, str]:
        for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
            try:
                dt = datetime.strptime(value, fmt)
                return str(dt.day), str(dt.month), str(dt.year)
            except ValueError:
                continue
        return "", "", ""

    @staticmethod
    def _date_range_bounds(time_range: str, fallback_date: str) -> tuple[str, str]:
        dates = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", str(time_range or ""))
        if len(dates) >= 2:
            return dates[0], dates[-1]
        if len(dates) == 1:
            return dates[0], dates[0]
        return fallback_date, fallback_date

    @staticmethod
    def _as_int(value) -> int:
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

    @classmethod
    def _stat_values(cls, stats: list[dict]) -> dict[int, int]:
        values: dict[int, int] = {}
        for item in stats:
            try:
                stt = int(str(item.get("stt", "")).strip())
            except ValueError:
                continue
            values[stt] = cls._as_int(item.get("ket_qua"))
        return values

    @staticmethod
    def _stats_context(values: dict[int, int]) -> dict:
        named_stats = {
            "stt_02_tong_chay": 2,
            "stt_03_chay_chet": 3,
            "stt_04_chay_thuong": 4,
            "stt_05_chay_cuu_nguoi": 5,
            "stt_06_chay_thiet_hai": 6,
            "stt_07_chay_cuu_tai_san": 7,
            "stt_08_tong_no": 8,
            "stt_09_no_chet": 9,
            "stt_10_no_thuong": 10,
            "stt_11_no_cuu_nguoi": 11,
            "stt_12_no_thiet_hai": 12,
            "stt_13_no_cuu_tai_san": 13,
            "stt_14_tong_cnch": 14,
            "stt_15_cnch_cuu_nguoi": 15,
            "stt_16_cnch_truc_tiep": 16,
            "stt_17_cnch_tu_thoat": 17,
            "stt_18_cnch_thi_the": 18,
            "stt_19_cnch_cuu_tai_san": 19,
            "stt_23_tt_mxh_tin_bai": 23,
            "stt_24_tt_mxh_hinh_anh": 24,
            "stt_25_tt_mxh_video": 25,
            "stt_27_tt_so_cuoc": 27,
            "stt_28_tt_so_nguoi": 28,
            "stt_29_tt_to_roi": 29,
            "stt_31_kiem_tra_tong": 31,
            "stt_32_kiem_tra_dinh_ky": 32,
            "stt_33_kiem_tra_dot_xuat": 33,
            "stt_34_vi_pham_phat_hien": 34,
            "stt_35_xu_phat_tong": 35,
            "stt_36_xu_phat_canh_cao": 36,
            "stt_37_xu_phat_tam_dinh_chi": 37,
            "stt_38_xu_phat_dinh_chi": 38,
            "stt_39_xu_phat_tien_mat": 39,
            "stt_40_xu_phat_so_tien": 40,
            "stt_40_xu_phat_tien": 40,
            "stt_43_pa_co_so_duyet": 43,
            "stt_44_pa_co_so_thuc_tap": 44,
            "stt_46_pa_giao_thong_duyet": 46,
            "stt_47_pa_giao_thong_thuc_tap": 47,
            "stt_49_pa_cong_an_duyet": 49,
            "stt_50_pa_cong_an_thuc_tap": 50,
            "stt_52_pa_cnch_duyet": 52,
            "stt_52_pa_cnch_ca_duyet": 52,
            "stt_53_pa_cnch_thuc_tap": 53,
            "stt_53_pa_cnch_ca_thuc_tap": 53,
            "stt_55_hl_tong_cbcs": 55,
            "stt_56_hl_chi_huy_phong": 56,
            "stt_57_hl_chi_huy_doi": 57,
            "stt_58_hl_can_bo_tieu_doi": 58,
            "stt_59_hl_chien_sy": 59,
            "stt_60_hl_lai_xe": 60,
            "stt_61_hl_lai_tau": 61,
        }
        return {name: values.get(stt, 0) for name, stt in named_stats.items()}

    @classmethod
    def _operations_context(cls, ops: dict, stats: dict[int, int]) -> dict:
        context = {
            "phan_I_va_II_chi_tiet_nghiep_vu": ops,
            "tong_so_vu_chay": cls._as_int(ops.get("tong_so_vu_chay")) or stats.get(2, 0),
            "tong_so_vu_no": cls._as_int(ops.get("tong_so_vu_no")) or stats.get(8, 0),
            "tong_so_vu_cnch": cls._as_int(ops.get("tong_so_vu_cnch")) or stats.get(14, 0),
            "tong_chi_vien": cls._as_int(ops.get("tong_chi_vien")),
            "tong_bao_cao": cls._as_int(ops.get("tong_bao_cao")),
            "tong_cong_van": cls._as_int(ops.get("tong_cong_van")),
            "tong_ke_hoach": cls._as_int(ops.get("tong_ke_hoach")),
            "tong_xe_hu_hong": cls._as_int(ops.get("tong_xe_hu_hong")),
            "cong_tac_an_ninh": ops.get("cong_tac_an_ninh") or "",
            "chi_tiet_cnch": ops.get("chi_tiet_cnch") or "",
            "huong_dan_kiem_tra": cls._as_int(ops.get("huong_dan_kiem_tra")),
            "co_so_nhom_1": cls._as_int(ops.get("co_so_nhom_1")),
            "co_so_nhom_2": cls._as_int(ops.get("co_so_nhom_2")),
            "tinh_trang_tru_cap_nuoc": ops.get("tinh_trang_tru_cap_nuoc") or "Không.",
        }
        for key in (
            "tong_quan_so",
            "quan_so_bien_che",
            "quan_so_csnv",
            "quan_so_hdld",
            "quan_so_truc",
            "truc_chi_huy",
            "truc_ban_chien_dau",
            "xe_chi_huy",
            "xe_chua_chay",
            "xe_bon_nuoc",
            "xe_thang",
            "xe_cho_quan",
            "xe_cho_phuong_tien",
        ):
            context[key] = cls._as_int(ops.get(key))
        if not context["tong_quan_so"]:
            context["tong_quan_so"] = context["quan_so_truc"]
        return context

    @staticmethod
    def _map_fire_events(events: list[dict]) -> list[dict]:
        return [
            {
                **event,
                "dia_diem": event.get("dia_diem") or "",
                "luc_luong_tham_gia": event.get("luc_luong_tham_gia") or "",
                "ket_qua_xu_ly": event.get("ket_qua_xu_ly") or "",
                "thiet_hai": event.get("thiet_hai") or event.get("thiet_hai_tai_san") or "Không",
                "thoi_gian": event.get("thoi_gian") or event.get("ngay_xay_ra") or "",
            }
            for event in events
        ]

    @staticmethod
    def _map_cnch_events(events: list[dict]) -> list[dict]:
        return [
            {
                **event,
                "dia_diem": event.get("dia_diem") or "",
                "luc_luong_tham_gia": event.get("luc_luong_tham_gia") or "",
                "ket_qua_xu_ly": event.get("ket_qua_xu_ly") or "",
                "noi_dung_tin_bao": event.get("noi_dung_tin_bao") or event.get("mo_ta") or "",
                "thong_tin_nan_nhan": event.get("thong_tin_nan_nhan") or "",
                "thoi_gian": event.get("thoi_gian") or event.get("ngay_xay_ra") or "",
            }
            for event in events
        ]

    @staticmethod
    def _map_sclq_events(events: list[dict]) -> list[dict]:
        return [
            {
                **event,
                "thoi_gian": event.get("thoi_gian") or event.get("vu_chay_ngay") or "",
                "noi_dung_tin_bao": event.get("noi_dung_tin_bao") or event.get("nguyen_nhan") or "sự cố liên quan đến công tác PCCC",
                "dia_diem": event.get("dia_diem") or "",
                "luc_luong_tham_gia": event.get("luc_luong_tham_gia") or event.get("chi_huy_chua_chay") or "",
                "thiet_hai": event.get("thiet_hai") or "Không",
            }
            for event in events
        ]
