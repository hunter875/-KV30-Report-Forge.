# Domain Model

## Report (Báo cáo)

Một báo cáo là đơn vị nghiệp vụ duy nhất trong hệ thống.

**Attributes:**
- `id` - UUID primary key
- `title` - Tiêu đề báo cáo
- `report_date` - Ngày báo cáo (optional)
- `version` - Version number cho optimistic locking
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Relationships:**
- `rows` - One-to-many relationship với ReportRow

**Domain Invariants:**
- Một Report có thể có 0 hoặc nhiều rows
- Version tự động increment trên mỗi bulk operation
- Report tồn tại độc lập với nguồn dữ liệu (source-agnostic)

---

## ReportRow (Flexible Schema với JSONB)

**Lý do JSONB:** Government forms thay đổi. Không muốn migration liên tục.

**Schema:**
```sql
report_rows (
  id UUID PK,
  report_id UUID FK,
  row_type ENUM (statistics, cnch_event, other_task, vehicle, sclq, tong_vu_chay, operation),
  stt INTEGER (presentation index),
  payload JSONB NOT NULL DEFAULT '{}'  -- All domain data
)
```

**Payload schema theo domain:**

### Domain: STATISTICS

```json
{
  "stt": 5,
  "noi_dung": "1. Tổng số vụ cháy",  // From STATISTICS_TEMPLATE
  "ket_qua": 10,
  "ghi_chu": "optional",
  "don_vi": "optional"
}
```

**Rules:**
- `stt` phải từ 1 đến 61
- `noi_dung` lấy từ STATISTICS_TEMPLATE (không stored, computed)
- `ket_qua` default = 0 nếu không có
- Statistics row_type phải có `stt` và `ket_qua`

### Domain: CNCH_EVENT

```json
{
  "stt": 1,
  "mo_ta": "Cháy nhà dân",
  "dia_diem": "P. Hòa Thuận, Q. Hai Bà Trưng, Hà Nội",
  "thiet_hai": "Tài sản ước tính 50 triệu đồng",
  "thoi_gian": "14:30",
  "ngay_xay_ra": "05/05/2025",
  "ket_qua_xu_ly": "Dập tắt sau 30 phút, không thương vong",
  "noi_dung_tin_bao": "Công dân báo cháy qua 114",
  "luc_luong_tham_gia": "2 xe chữa cháy, 15 CBCS",
  "thong_tin_nan_nhan": "Không có thương vong"
}
```

**All fields optional, default to empty string.**

### Domain: OTHER_TASK

```json
{
  "noi_dung": "Tập huấn PCCC cho nhân viên tòa nhà CT8A"
}
```

**Simple:** Each task is one row with `noi_dung` text.

### Domain: SCLQ (Sự Cố Lửa Quân Sự)

```json
{
  "vu_chay_ngay": "05/05/2025",
  "dia_diem": "Kho vũ khí ABC",
  "nguyen_nhan": "Do chập điện",
  "thiet_hai": "Hỏa độ 100m2",
  "chi_huy_chua_chay": "Đại úy Nguyễn Văn A",
  "ghi_chu": "Không có thương vong"
}
```

**Fields:**
- `vu_chay_ngay`: Date of fire incident (DD/MM/YYYY)
- `dia_diem`: Location
- `nguyen_nhan`: Cause
- `thiet_hai`: Damage assessment
- `chi_huy_chua_chay`: Fire commander
- `ghi_chu`: Notes

**All fields optional, default to empty string.**

### Domain: TONG_VU_CHAY (Tổng số vụ cháy chi tiết)

```json
{
  "ngay_xay_ra": "05/05/2025",
  "vu_chay": "Cháy nhà dân",
  "thoi_gian": "14:30",
  "dia_diem": "P. Hòa Thuận",
  "phan_loai": "Nghiêm trọng",
  "nguyen_nhan": "Do chập điện",
  "thiet_hai_ve_nguoi": "Không có",
  "thiet_hai_tai_san": "50 triệu đồng",
  "tai_san_cuu_chua": "Không có",
  "thoi_gian_toi_dam_chay": "14:30",
  "thoi_gian_khong_che": "14:45",
  "thoi_gian_dap_tat_hoan_toan": "15:00",
  "so_luong_xe": 2,
  "chi_huy_chua_chay": "Đại úy Nguyễn Văn A",
  "ghi_chu": "Dập tắt thành công"
}
```

**Fields:** Comprehensive record of a fire incident including timeline and resources.

**All fields optional, default to empty string or 0.**

### Domain: VEHICLE

```json
{
  "bien_so": "29A-123.45",
  "tinh_trang": "Hư hỏng phần đầu xe do va chạm"
}
```

**Fields:**
- `bien_so`: License plate (string)
- `tinh_trang`: Damage description (string)

### Domain: OPERATION

```json
{
  "quan_so_truc": 45,
  "tong_bao_cao": 180,
  "chi_tiet_cnch": "Thực hiện 5 thành công, 1 chưa đạt",
  "tong_chi_vien": 25,
  "tong_cong_van": 12,
  "tong_ke_hoach": 8,
  "tong_so_vu_no": 2,
  "tong_so_vu_chay": 5,
  "tong_so_vu_cnch": 10,
  "tong_xe_hu_hong": 2,
  "cong_tac_an_ninh": "Đảm bảo an ninh trật tự tại khu vực"
}
```

**Note:** Mỗi Report chỉ có TỐI ĐA 1 operation row. Nếu có nhiều, dùng row đầu tiên.

---

## RowType Enum

```python
class RowType(enum.Enum):
    STATISTICS = "statistics"
    CNCH_EVENT = "cnch_event"
    OTHER_TASK = "other_task"
    VEHICLE = "vehicle"
    SCLQ = "sclq"
    TONG_VU_CHAY = "tong_vu_chay"
    OPERATION = "operation"
```

**Usage:**
- Phân loại domain của ReportRow
- Không phải dùng để xác định thứ tự/sắp xếp
- Query theo row_type để lấy collection

---

## Canonical Data Model

Là **nguồn dữ liệu thật** của báo cáo. Tất cả xuất phát từ đây.

```json
{
  "header": {
    "so_bao_cao": "BC-001/2025",
    "ngay_bao_cao": "05/05/2025",
    "don_vi_bao_cao": "Phòng PCCC Q. Hai Bà Trưng",
    "thoi_gian_tu_den": "01/05 - 05/05/2025"
  },
  "bang_thong_ke": [
    {"stt": "1", "noi_dung": "...", "ket_qua": number}
  ],
  "danh_sach_cnch": [
    {"stt": number, "mo_ta": "...", "dia_diem": "...", ...}
  ],
  "danh_sach_sclq": [
    {"stt": number, "vu_chay_ngay": "...", "dia_diem": "...", ...}
  ],
  "danh_sach_tong_vu_chay": [
    {"stt": number, "vu_chay": "...", "dia_diem": "...", ...}
  ],
  "danh_sach_cong_tac_khac": ["string"],
  "danh_sach_cong_van_tham_muu": [],
  "danh_sach_phuong_tien_hu_hong": [
    {"bien_so": "...", "tinh_trang": "..."}
  ],
  "phan_I_va_II_chi_tiet_nghiep_vu": {
    "quan_so_truc": number, "tong_bao_cao": number, ...
  }
}
```

**Semantics:**
- Header fields computed từ Report.title/report_date
- Statistics `noi_dung` từ STATISTICS_TEMPLATE
- Các danh sách lấy trực tiếp từ ReportRow.payload theo row_type

---

## Domain Rules (Business Logic)

### Statistics
- STT 1 là section header "I. TÌNH HÌNH CHÁY, NỖ, SỰ CỐ TAI NẠN"
- STT 20 là section header "II. KẾT QUẢ CÔNG TÁC PCCC VÀ CNCH"
- Section headers có `ket_qua = 0` (ignored)
- STT có thể bỏ thiếu → default ket_qua = 0

### CNCH Events
- `stt` là số thứ tự trong danh sách (1, 2, 3...)
- Có thể có nhiều events
- Tất cả fields optional (default empty string)

### Other Tasks
- Đơn giản là list của strings
- Mỗi task là một `noi_dung` string trong payload

### SCLQ Events
- `stt` là số thứ tự trong danh sách (1, 2, 3...)
- Có thể có nhiều SCLQ records
- Tất cả fields optional (default empty string)

### TONG_VU_CHAY Events
- `stt` là số thứ tự trong danh sách (1, 2, 3...)
- Có thể có nhiều fire incident records
- Tất cả numeric fields default = 0
- Text fields default = ""

### Damaged Vehicles
- Mỗi vehicle có `bien_so` và `tinh_trang`
- Có thể có nhiều vehicles

### Detailed Operations
- Chỉ có TỐI ĐĂ 1 operation row per report
- Nếu có nhiều, dùng row đầu tiên
- Tất cả numeric fields default = 0
- Text fields default = ""

---

## Mapping Functions (Mapper)

```python
def map_header(report: Report) -> dict
def map_statistics(rows: List[dict]) -> List[dict]  # rows are payload dicts
def map_cnch_events(rows: List[dict]) -> List[dict]
def map_sclq_events(rows: List[dict]) -> List[dict]
def map_tong_vu_chay_events(rows: List[dict]) -> List[dict]
def map_other_tasks(rows: List[dict]) -> List[str]
def map_official_documents(rows: List[dict]) -> List
def map_damaged_vehicles(rows: List[dict]) -> List[dict]
def map_detailed_operations(rows: List[dict]) -> dict
```

**Input:** List of payload dicts (row.payload)
**Output:** Canonical format lists/objects

---

## Versioning & Conflict Detection

**Optimistic Locking:**
- `Report.version` tăng 1 trên mỗi successful bulk operation
- Client gửi version hiện tại trong bulk request
- Nếu `client_version != server_version` → conflict

**Conflict Resolution:**
- Server trả về `{"status": "conflict", "server_version": N}`
- Client reload report và thông báo cho user
- User merge changes và retry

**Implementation:**
```python
# report_bulk.py
def apply_operations(report_id, payload):
    if payload.version != report.version:
        return {"status": "conflict", "server_version": report.version}
    # ... apply ops
    report.version += 1
    return {"status": "ok", "version": report.version}
```

---

## Normalization

**Purpose:** Chuyển đổi từ input format bất kỳ → CanonicalReport (pydantic validated).

**Example:**
```python
# Input từ Web Form (flat dict)
{
  "row_type": "statistics",
  "stt": 5,
  "ket_qua": 10,
  "ghi_chu": "Ghi chú"
}

# → ReportRow.payload
payload = {"ket_qua": 10, "ghi_chu": "Ghi chú"}
row_type = "statistics"
stt = 5
```

**Strategy:**
- Extract row_type, stt (if present)
- Put all other fields into payload dict
- Validate against pydantic CanonicalReport when assembling full report

---

## Constants

### STATISTICS_TEMPLATE

61 entries với exact `noi_dung` từ form KV30:

```python
[
  {"stt": "1", "noi_dung": "I. TÌNH HÌNH CHÁY, NỖ, SỰ CỐ TAI NẠN"},
  {"stt": "2", "noi_dung": "1. Tổng số vụ cháy"},
  ...
  {"stt": "61", "noi_dung": "Lái tàu CC và CNCH"}
]
```

**Lưu ý:** STT là string trong template, integer trong database payload.

**Không được sửa** nếu không có thay đổi chính thức từ form.

---

## Domain vs. Presentation

**STT (Số thứ tự):**
- Là **presentation index** cho spreadsheet
- Dùng để sắp xếp thứ tự hiển thị
- KHÔNG phải domain identifier
- Có thể trống hoặc trùng cho các rows khác nhau (different row_type)

**row_type:**
- Là **domain identifier**
- Xác định domain collection
- Không thay đổi sau khi tạo

**Rule:**
```python
# ĐÚNG: group by row_type
statistics = [r for r in rows if r.row_type == RowType.STATISTICS]
cnch_events = [r for r in rows if r.row_type == RowType.CNCH_EVENT]

# SAI: group by STT range
statistics = [r for r in rows if 1 <= r.stt <= 61]  # Đừng làm vậy!
```

---

## State Machine

```
Report lifecycle:
  created → editing → saved → exported

Detailed:
  ┌─────────┐
  │ created │  (no rows yet)
  └────┬────┘
       │ user edits
       ▼
  ┌─────────┐
  │ editing │  (dirty state, pending ops)
  └────┬────┘
       │ autosave success
       ▼
  ┌─────────┐
  │  saved  │  (version++, ops cleared)
  └────┬────┘
       │ user continues edit
       ▼
  ┌─────────┐
  │ editing │
  └────┬────┘
       │ export
       ▼
  ┌─────────┐
  │exported │  (Word doc generated)
  └─────────┘
```

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [FRONTEND_GUIDELINES.md](./FRONTEND_GUIDELINES.md) - Frontend patterns
- [WORD_RENDERING.md](./WORD_RENDERING.md) - Word rendering details
- [STARTUP.md](./STARTUP.md) - Getting started
