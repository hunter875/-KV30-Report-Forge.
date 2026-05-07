from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, date
from typing import Optional, List, Dict, Any
import uuid


class ReportRowSchema(BaseModel):
    """Schema for ReportRow with payload dict."""
    id: uuid.UUID
    row_type: Optional[str] = None
    stt: Optional[int] = None
    payload: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class ReportCreate(BaseModel):
    title: str
    report_date: Optional[date] = None


class ReportUpdate(BaseModel):
    """Partial update for report metadata."""
    title: Optional[str] = None
    report_date: Optional[date] = None


class ReportOverrideEnvelope(BaseModel):
    exists: bool
    mode: str
    start_date: date
    end_date: date
    data: Optional["CanonicalReport"] = None
    updated_at: Optional[datetime] = None


class ReportResponse(BaseModel):
    id: uuid.UUID
    title: str
    report_date: Optional[date] = None
    version: int
    created_at: datetime
    updated_at: Optional[datetime]
    rows: List[ReportRowSchema] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class RowData(BaseModel):
    """
    Row data for bulk operations.
    All domain fields go into a flat dict - will be stored in payload JSONB.
    """
    row_type: Optional[str] = None
    stt: Optional[int] = None

    # All other fields are dynamic and stored in payload
    # Frontend can send any fields, they'll be stored as-is
    class Config:
        extra = "allow"  # Allow additional fields


class Operation(BaseModel):
    type: str  # "create", "update", "delete"
    row_id: Optional[uuid.UUID] = None
    temp_id: Optional[str] = None
    row_type: Optional[str] = None
    stt: Optional[int] = None
    data: Optional[Dict[str, Any]] = None  # Changed from RowData to Dict


class BulkOperationsRequest(BaseModel):
    version: int
    operations: List[Operation]


class BulkResponse(BaseModel):
    status: str
    version: Optional[int] = None
    server_version: Optional[int] = None


class Header(BaseModel):
    """Report header information."""
    so_bao_cao: str = Field(..., description="Report number")
    ngay_bao_cao: str = Field(..., description="Report date")
    don_vi_bao_cao: str = Field(..., description="Reporting unit")
    thoi_gian_tu_den: str = Field(..., description="Time period")

    model_config = ConfigDict(extra="allow")


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

    model_config = ConfigDict(extra="allow")


class SclqEvent(BaseModel):
    """SCLQ event record."""
    stt: int = Field(..., description="Sequence number")
    vu_chay_ngay: Optional[str] = None
    dia_diem: Optional[str] = None
    nguyen_nhan: Optional[str] = None
    thiet_hai: Optional[str] = None
    chi_huy_chua_chay: Optional[str] = None
    ghi_chu: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class TongVuChayEvent(BaseModel):
    """Detailed fire event record."""
    stt: int = Field(..., description="Sequence number")
    ngay_xay_ra: Optional[str] = None
    vu_chay: Optional[str] = None
    thoi_gian: Optional[str] = None
    dia_diem: Optional[str] = None
    phan_loai: Optional[str] = None
    nguyen_nhan: Optional[str] = None
    thiet_hai_ve_nguoi: Any = ""
    thiet_hai_tai_san: Any = ""
    tai_san_cuu_chua: Any = ""
    thoi_gian_toi_dam_chay: Optional[str] = None
    thoi_gian_khong_che: Optional[str] = None
    thoi_gian_dap_tat_hoan_toan: Optional[str] = None
    so_luong_xe: int = 0
    chi_huy_chua_chay: Optional[str] = None
    ghi_chu: Optional[str] = None

    model_config = ConfigDict(extra="allow")


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

    model_config = ConfigDict(extra="allow")


class CanonicalReport(BaseModel):
    """
    Canonical report structure.

    This is THE source of truth for report data.
    All exports and renderings use this exact structure.
    """
    header: Header
    bang_thong_ke: List[StatisticRow] = Field(..., description="61 statistics rows")
    danh_sach_cnch: List[CnchEvent] = Field(default_factory=list)
    danh_sach_sclq: List[SclqEvent] = Field(default_factory=list)
    danh_sach_tong_vu_chay: List[TongVuChayEvent] = Field(default_factory=list)
    danh_sach_cong_tac_khac: List[str] = Field(default_factory=list)
    danh_sach_cong_van_tham_muu: List[Any] = Field(default_factory=list)
    danh_sach_phuong_tien_hu_hong: List[Vehicle] = Field(default_factory=list)
    phan_I_va_II_chi_tiet_nghiep_vu: DetailedOperations = Field(default_factory=DetailedOperations)

    model_config = ConfigDict(extra="allow")
