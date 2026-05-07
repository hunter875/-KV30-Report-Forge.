"""
Mapper functions - Convert ReportRow data to canonical format.

Each mapper handles a specific domain collection.
All mappers work with dict payload (from ReportRow.payload).
"""

from typing import List, Dict, Any
from app.modules.reports.constants import STATISTICS_TEMPLATE
from app.modules.reports.mapping_config import STATISTIC_SOURCE_MAPPINGS


def _first_row(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    return rows[0] if rows else {}


def _to_int(value: Any) -> int:
    if value is None or value == "":
        return 0
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)

    text = str(value).strip()
    if not text:
        return 0

    normalized = text.replace(" ", "").replace(".", "").replace(",", "")
    try:
        return int(float(normalized))
    except ValueError:
        return 0


def _sum(rows: List[Dict[str, Any]], *keys: str) -> int:
    total = 0
    for row in rows:
        for key in keys:
            total += _to_int(row.get(key))
    return total


def _mapped_stat_value(rows: List[Dict[str, Any]], fallback_groups: tuple[tuple[str, ...], ...]) -> int:
    for keys in fallback_groups:
        total = _sum(rows, *keys)
        if total != 0:
            return total
    return 0


def _text(row: Dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = row.get(key)
        if value is not None and str(value).strip() != "":
            return str(value)
    return ""


def _join_non_empty(*parts: Any) -> str:
    values = [str(part).strip() for part in parts if part is not None and str(part).strip()]
    return ", ".join(values)


def map_header(report, operation_rows: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Map report to header section."""
    operation = _first_row(operation_rows or [])
    return {
        "so_bao_cao": operation.get("so_bao_cao") or report.title or "",
        "ngay_bao_cao": report.report_date.strftime("%d/%m/%Y") if report.report_date else "",
        "don_vi_bao_cao": operation.get("don_vi_bao_cao") or "ĐỘI CC&CNCH KHU VỰC 30",
        "thoi_gian_tu_den": operation.get("thoi_gian_tu_den") or ""
    }


def map_statistics(rows: List, detail_values_by_stt: Dict[int, int] | None = None) -> List[Dict[str, Any]]:
    """
    Map BC NGAY daily rows to bang_thong_ke.
    The frontend stores per-day Google Sheet columns; export sums them into the
    government 61-row statistics contract.
    """
    direct_stats_by_stt = {}
    for row in rows:
        stt = _to_int(row.get("stt"))
        # Imported BC NGAY rows also carry the source sheet row number in `stt`.
        # Treat a row as a direct canonical statistics row only when it has
        # `ket_qua`; otherwise the Excel row number can accidentally override
        # values derived from the actual sheet columns.
        if 1 <= stt <= 61 and "ket_qua" in row:
            direct_stats_by_stt[stt] = _to_int(row.get("ket_qua"))

    aggregated_by_stt = {
        stt: _mapped_stat_value(rows, fallback_groups)
        for stt, fallback_groups in STATISTIC_SOURCE_MAPPINGS.items()
    }

    values_by_stt = {}
    for template_row in STATISTICS_TEMPLATE:
        stt_num = int(template_row["stt"])
        values_by_stt[stt_num] = direct_stats_by_stt.get(stt_num, aggregated_by_stt.get(stt_num, 0))

    for stt, value in (detail_values_by_stt or {}).items():
        values_by_stt[stt] = values_by_stt.get(stt, 0) + _to_int(value)

    # Formula rows must reflect their child rows. Some source sheets carry
    # summary columns, but the canonical government report defines these as
    # calculated totals, so recompute them after direct/fallback mapping.
    values_by_stt[15] = values_by_stt.get(16, 0) + values_by_stt.get(17, 0)
    values_by_stt[31] = values_by_stt.get(32, 0) + values_by_stt.get(33, 0)
    values_by_stt[35] = sum(values_by_stt.get(stt, 0) for stt in range(36, 40))
    # STT 55 is total CBCS by role. The BC NGAY source sheet has
    # "so_nguoi_tham_du_huan_luyen", but that is not the 56-61 role breakdown,
    # so never use it to fabricate STT 55.
    values_by_stt[55] = sum(values_by_stt.get(stt, 0) for stt in range(56, 62))

    result = []
    for template_row in STATISTICS_TEMPLATE:
        stt_num = int(template_row["stt"])
        result.append({
            "stt": template_row["stt"],
            "noi_dung": template_row["noi_dung"],
            "ket_qua": values_by_stt.get(stt_num, 0)
        })

    return result


def map_cnch_events(rows: List) -> List[Dict[str, Any]]:
    """Map CNCH events from payload."""
    return [
        {
            "stt": _to_int(row.get("stt")),
            "mo_ta": _text(row, "mo_ta"),
            "dia_diem": _join_non_empty(row.get("dia_diem"), row.get("dia_chi")),
            "thiet_hai": _text(row, "thiet_hai", "thiet_hai_ve_nguoi"),
            "thoi_gian": _text(row, "thoi_gian"),
            "ngay_xay_ra": _text(row, "ngay_xay_ra"),
            "ket_qua_xu_ly": _text(row, "ket_qua_xu_ly"),
            "noi_dung_tin_bao": _text(row, "noi_dung_tin_bao", "loai_hinh_cnch"),
            "luc_luong_tham_gia": _text(row, "luc_luong_tham_gia"),
            "thong_tin_nan_nhan": _text(row, "thong_tin_nan_nhan", "so_nguoi_cuu_duoc")
        }
        for row in sorted(rows, key=lambda item: _to_int(item.get("stt")))
        if any(value not in (None, "") for key, value in row.items() if key != "stt")
    ]


def map_sclq_events(rows: List) -> List[Dict[str, Any]]:
    """Map SCLQ rows from the SCLQ Google Sheet."""
    return [
        {
            "stt": _to_int(row.get("stt")),
            "vu_chay_ngay": _text(row, "vu_chay_ngay"),
            "dia_diem": _text(row, "dia_diem"),
            "nguyen_nhan": _text(row, "nguyen_nhan"),
            "thiet_hai": _text(row, "thiet_hai"),
            "chi_huy_chua_chay": _text(row, "chi_huy_chua_chay"),
            "ghi_chu": _text(row, "ghi_chu"),
        }
        for row in sorted(rows, key=lambda item: _to_int(item.get("stt")))
        if any(value not in (None, "") for key, value in row.items() if key != "stt")
    ]


def map_tong_vu_chay_events(rows: List) -> List[Dict[str, Any]]:
    """Map Tong Vu Chay rows from the fire statistics Google Sheet."""
    return [
        {
            "stt": _to_int(row.get("stt")),
            "ngay_xay_ra": _text(row, "ngay_xay_ra"),
            "vu_chay": _text(row, "vu_chay"),
            "thoi_gian": _text(row, "thoi_gian"),
            "dia_diem": _text(row, "dia_diem"),
            "phan_loai": _text(row, "phan_loai"),
            "nguyen_nhan": _text(row, "nguyen_nhan"),
            "thiet_hai_ve_nguoi": row.get("thiet_hai_ve_nguoi", ""),
            "thiet_hai_tai_san": row.get("thiet_hai_tai_san", ""),
            "tai_san_cuu_chua": row.get("tai_san_cuu_chua", ""),
            "thoi_gian_toi_dam_chay": _text(row, "thoi_gian_toi_dam_chay"),
            "thoi_gian_khong_che": _text(row, "thoi_gian_khong_che"),
            "thoi_gian_dap_tat_hoan_toan": _text(row, "thoi_gian_dap_tat_hoan_toan"),
            "so_luong_xe": _to_int(row.get("so_luong_xe")),
            "chi_huy_chua_chay": _text(row, "chi_huy_chua_chay"),
            "ghi_chu": _text(row, "ghi_chu"),
        }
        for row in sorted(rows, key=lambda item: _to_int(item.get("stt")))
        if any(value not in (None, "") for key, value in row.items() if key != "stt")
    ]


def map_other_tasks(rows: List) -> List[str]:
    """Map other tasks from payload (list of strings)."""
    return [row.get('noi_dung', '') for row in rows if row.get('noi_dung')]


def map_official_documents(rows: List) -> List:
    """Map official documents (currently unused)."""
    return []


def map_damaged_vehicles(rows: List) -> List[Dict[str, Any]]:
    """Map damaged vehicles from payload."""
    return [
        {
            "bien_so": row.get('bien_so', '') or "",
            "tinh_trang": row.get('tinh_trang', '') or ""
        }
        for row in rows
    ]


def map_detailed_operations(rows: List) -> Dict[str, Any]:
    """Map detailed operations from payload."""
    result = {
        "quan_so_truc": 0,
        "tong_bao_cao": 0,
        "chi_tiet_cnch": "",
        "tong_chi_vien": 0,
        "tong_cong_van": 0,
        "tong_ke_hoach": 0,
        "tong_so_vu_no": 0,
        "tong_so_vu_chay": 0,
        "tong_so_vu_cnch": 0,
        "tong_xe_hu_hong": 0,
        "cong_tac_an_ninh": ""
    }

    if rows and len(rows) > 0:
        row = rows[0]
        for key in result.keys():
            result[key] = row.get(key, result[key]) or result[key]

    return result
