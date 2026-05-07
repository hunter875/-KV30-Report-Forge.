"""Source-sheet to canonical JSON mapping.

This file is the business mapping contract. Keep source column names here so
the exporter does not hide sheet logic in ad hoc code.
"""

from __future__ import annotations


# Each STT maps to one or more fallback groups. The first group with a non-zero
# value wins; values inside a group are summed.
STATISTIC_SOURCE_MAPPINGS: dict[int, tuple[tuple[str, ...], ...]] = {
    2: (("vu_chay_thong_ke",),),
    14: (("cnch", "sclq_den_pccc_cnch"),),
    23: (("tin_bai",),),
    24: (("phong_su",),),
    26: (("so_lop_tuyen_truyen",),),
    27: (("so_lop_tuyen_truyen",),),
    28: (("so_nguoi_tham_du_tuyen_truyen",),),
    29: (("so_khuyen_cao_to_roi_da_phat",),),
    31: (("dinh_ky_nhom_i", "dinh_ky_nhom_ii", "dot_xuat_nhom_i", "dot_xuat_nhom_ii"),),
    32: (("dinh_ky_nhom_i", "dinh_ky_nhom_ii"),),
    33: (("dot_xuat_nhom_i", "dot_xuat_nhom_ii"),),
    34: (("kien_nghi",),),
    35: (("xu_phat",),),
    38: (("dinh_chi",),),
    39: (("xu_phat",),),
    40: (("tien_phat_trieu_dong",),),
    43: (("pc06_so_pa_xay_dung_va_phe_duyet",),),
    44: (("pc06_so_pa_duoc_thuc_tap",),),
    46: (("pc07_so_pa_xay_dung_va_phe_duyet",),),
    47: (("pc07_so_pa_duoc_thuc_tap",),),
    49: (("pc08_so_pa_xay_dung_va_phe_duyet",),),
    50: (("pc08_so_pa_duoc_thuc_tap",),),
    52: (("pc09_so_pa_xay_dung_va_phe_duyet",),),
    53: (("pc09_so_pa_duoc_thuc_tap",),),
}


DETAIL_COUNT_MAPPINGS = {
    "danh_sach_cnch": {
        "statistics_key": "cnch",
        "detail_row_type": "cnch_event",
        "detail_date_key": "ngay_xay_ra",
    },
    "danh_sach_sclq": {
        "statistics_key": "sclq_den_pccc_cnch",
        "detail_row_type": "sclq",
        "detail_date_key": "vu_chay_ngay",
    },
}


SOURCE_ROW_TYPES = {
    "statistics",
    "cnch_event",
    "sclq",
    "operation",
    "other_task",
    "vehicle",
}
