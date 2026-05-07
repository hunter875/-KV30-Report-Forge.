"""
Canonical Report Schema

Defines the exact structure of canonical JSON reports.
This is the contract between all system components.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class Header(BaseModel):
    """Report header information."""
    so_bao_cao: str = Field(..., description="Report number")
    ngay_bao_cao: str = Field(..., description="Report date")
    don_vi_bao_cao: str = Field(..., description="Reporting unit")
    thoi_gian_tu_den: str = Field(..., description="Time period")


class StatisticRow(BaseModel):
    """Single row in statistics table."""
    stt: str = Field(..., description="Row number 1-61")
    noi_dung: str = Field(..., description="Content from STATISTICS_TEMPLATE")
    ket_qua: int = Field(..., description="Result value")


class CnchEvent(BaseModel):
    """CNCH event record."""
    stt: int = Field(..., description="Sequence number")
    mo_ta: Optional[str] = Field(None, description="Description")
    dia_diem: Optional[str] = Field(None, description="Location")
    thiet_hai: Optional[str] = Field(None, description="Damage assessment")
    thoi_gian: Optional[str] = Field(None, description="Time HH:MM")
    ngay_xay_ra: Optional[str] = Field(None, description="Date DD/MM/YYYY")
    ket_qua_xu_ly: Optional[str] = Field(None, description="Handling result")
    noi_dung_tin_bao: Optional[str] = Field(None, description="Report content")
    luc_luong_tham_gia: Optional[str] = Field(None, description="Participating forces")
    thong_tin_nan_nhan: Optional[str] = Field(None, description="Victim information")


class Vehicle(BaseModel):
    """Damaged vehicle record."""
    bien_so: Optional[str] = Field(None, description="License plate")
    tinh_trang: Optional[str] = Field(None, description="Condition/status")


class DetailedOperations(BaseModel):
    """Detailed operations aggregated data."""
    quan_so_truc: int = Field(0, description="Direct officer count")
    tong_bao_cao: int = Field(0, description="Total reports count")
    chi_tiet_cnch: Optional[str] = Field(None, description="CNCH details text")
    tong_chi_vien: int = Field(0, description="Total visiting officers")
    tong_cong_van: int = Field(0, description="Total official documents")
    tong_ke_hoach: int = Field(0, description="Total plans")
    tong_so_vu_no: int = Field(0, description="Total explosion incidents")
    tong_so_vu_chay: int = Field(0, description="Total fire incidents")
    tong_so_vu_cnch: int = Field(0, description="Total CNCH incidents")
    tong_xe_hu_hong: int = Field(0, description="Total damaged vehicles")
    cong_tac_an_ninh: Optional[str] = Field(None, description="Security work description")


class CanonicalReport(BaseModel):
    """
    Canonical report structure.

    This is THE source of truth for report data.
    All exports and renderings use this exact structure.
    """
    header: Header
    bang_thong_ke: List[StatisticRow] = Field(..., description="61 statistics rows")
    danh_sach_cnch: List[CnchEvent] = Field(default_factory=list)
    danh_sach_cong_tac_khac: List[str] = Field(default_factory=list)
    danh_sach_cong_van_tham_muu: List[Any] = Field(default_factory=list)
    danh_sach_phuong_tien_hu_hong: List[Vehicle] = Field(default_factory=list)
    phan_I_va_II_chi_tiet_nghiep_vu: DetailedOperations = Field(default_factory=DetailedOperations)

    class Config:
        json_schema_extra = {
            "example": {
                "header": {
                    "so_bao_cao": "BC-001/2025",
                    "ngay_bao_cao": "05/05/2025",
                    "don_vi_bao_cao": "Phòng PCCC Q. Hai Bà Trưng",
                    "thoi_gian_tu_den": "01/05 - 05/05/2025"
                },
                "bang_thong_ke": [
                    {"stt": "1", "noi_dung": "I. TÌNH HÌNH CHÁY...", "ket_qua": 0},
                    {"stt": "2", "noi_dung": "1. Tổng số vụ cháy", "ket_qua": 5}
                ],
                "danh_sach_cnch": [],
                "danh_sach_cong_tac_khac": [],
                "danh_sach_cong_van_tham_muu": [],
                "danh_sach_phuong_tien_hu_hong": [],
                "phan_I_va_II_chi_tiet_nghiep_vu": {}
            }
        }
