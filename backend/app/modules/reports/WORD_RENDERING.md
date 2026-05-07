# Word Document Rendering System

## Tổng quan

Hệ thống rendering Word document cho phép xuất báo cáo KV30 từ database ra file Microsoft Word (.docx) theo template được thiết kế sẵn.

## Kiến trúc

```
Report (Database)
    ↓
ReportExporter → Canonical JSON
    ↓
ReportRenderer → Word Document (.docx)
```

### Nguyên tắc thiết kế

1. **Pure Template Filling**: Renderer chỉ điền dữ liệu vào template, KHÔNG tạo bảng động hay suy luận cấu trúc
2. **Canonical JSON**: Cấu trúc JSON cố định theo hợp đồng chính phủ, không được thay đổi
3. **Domain-Driven**: Phân loại dữ liệu theo domain (CNCH events, vehicles, operations), không dựa vào STT
4. **Separation of Concerns**: Export logic tách biệt với rendering logic

## Luồng dữ liệu

### 1. Database → Domain Model

```python
Report
  ├── rows: List[ReportRow]
  │   ├── row_type: RowType (STATISTICS | CNCH_EVENT | OTHER_TASK | VEHICLE | SCLQ | TONG_VU_CHAY | OPERATION)
  │   ├── stt: int (presentation index only)
  │   └── domain-specific fields
```

**Quan trọng:** `stt` chỉ là chỉ số trình bày, KHÔNG phải định danh domain. Sử dụng `row_type` để phân loại.

### 2. Domain Model → Canonical JSON

`ReportExporter.export()` chuyển đổi Report thành JSON với cấu trúc cố định:

```python
{
    "header": {...},                              # Thông tin báo cáo
    "bang_thong_ke": [...],                       # 61 dòng thống kê
    "danh_sach_cnch": [...],                      # Danh sách sự cố CNCH
    "danh_sach_cong_tac_khac": [...],            # Danh sách công tác khác
    "danh_sach_cong_van_tham_muu": [],           # Danh sách công văn
    "danh_sach_phuong_tien_hu_hong": [...],      # Danh sách xe hư hỏng
    "phan_I_va_II_chi_tiet_nghiep_vu": {...}     # Chi tiết nghiệp vụ
}
```

### 3. Canonical JSON → Word Document

`ReportRenderer.render()` sử dụng docxtpl để điền JSON vào template:

```python
renderer = ReportRenderer()
docx_bytes = renderer.render(canonical_json)
```

## Các thành phần

### ReportExporter (`exporter.py`)

**Trách nhiệm:** Chuyển đổi Report model sang canonical JSON

**Phương thức chính:**
```python
@staticmethod
def export(report: Report, include_details: bool = True) -> dict
```

**Cách hoạt động:**
1. Phân loại rows theo `row_type`
2. Gọi các mapper tương ứng cho từng domain collection
3. Trả về dict với cấu trúc cố định

### Mappers (`mapper.py`)

Mỗi domain collection có một mapper riêng:

| Mapper | Input | Output |
|--------|-------|--------|
| `map_header()` | Report | Header dict |
| `map_statistics()` | List[ReportRow] | List of 61 stat rows |
| `map_cnch_events()` | List[ReportRow] | List of CNCH event dicts |
| `map_sclq_events()` | List[ReportRow] | List of SCLQ event dicts |
| `map_tong_vu_chay_events()` | List[ReportRow] | List of fire incident dicts |
| `map_other_tasks()` | List[ReportRow] | List of strings |
| `map_official_documents()` | List[ReportRow] | Empty list (placeholder) |
| `map_damaged_vehicles()` | List[ReportRow] | List of vehicle dicts |
| `map_detailed_operations()` | List[ReportRow] | Single operation dict |

**Đặc biệt - Statistics Mapper:**

`map_statistics()` kết hợp dữ liệu từ database với `STATISTICS_TEMPLATE`:
- Template cung cấp 61 dòng `noi_dung` cố định (theo form chính phủ)
- Database cung cấp `ket_qua` cho từng STT
- Nếu không có dữ liệu, `ket_qua` mặc định = 0

### ReportRenderer (`renderer.py`)

**Trách nhiệm:** Điền canonical JSON vào Word template

**Phương thức chính:**
```python
def render(self, report_json: dict) -> BytesIO
```

**Cách hoạt động:**
1. Load template từ `templates/kv30_report.docx`
2. Build context từ JSON (map keys sang placeholders)
3. Render template với docxtpl
4. Trả về BytesIO chứa document

**Context mapping:**
```python
{
    # Header
    "so_bao_cao": header["so_bao_cao"],
    "ngay_bao_cao": header["ngay_bao_cao"],
    ...
    
    # Statistics - flatten to individual placeholders
    "stt_1": stats[0]["noi_dung"],
    "stt_1_ket_qua": stats[0]["ket_qua"],
    ...
    "stt_61": stats[60]["noi_dung"],
    "stt_61_ket_qua": stats[60]["ket_qua"],
    
    # Lists - pass through for Jinja2 loops
    "danh_sach_cnch": [...],
    "danh_sach_cong_tac_khac": [...],
    ...
    
    # Detailed operations - pass through for dot notation
    "phan_I_va_II_chi_tiet_nghiep_vu": {...}
}
```

### Constants (`constants.py`)

**STATISTICS_TEMPLATE:** 61 dòng với `noi_dung` chính xác theo form KV30

Cấu trúc:
```python
[
    {"stt": "1", "noi_dung": "I. TÌNH HÌNH CHÁY, NỔ, SỰ CỐ TAI NẠN"},
    {"stt": "2", "noi_dung": "1. Tổng số vụ cháy"},
    ...
    {"stt": "61", "noi_dung": "Lái tàu CC và CNCH"}
]
```

**Lưu ý:** Không được sửa template này trừ khi có thay đổi chính thức từ form chính phủ.

## API Endpoint

### GET `/api/v1/reports/{report_id}/export-docx`

**Mô tả:** Xuất báo cáo ra file Word

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Content-Disposition: `attachment; filename="report_{report_id}.docx"`

**Luồng xử lý:**
```python
# router.py
@router.get("/{report_id}/export-docx")
async def export_report_docx(report_id: UUID, db: Session = Depends(get_db)):
    service = ReportService(db)
    docx_bytes = service.render_report_docx(report_id)
    return Response(
        content=docx_bytes.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.docx"}
    )

# service.py
def render_report_docx(self, report_id: UUID) -> BytesIO:
    report = self.repository.get_by_id(report_id)
    canonical_json = ReportExporter.export(report, include_details=True)
    renderer = ReportRenderer()
    return renderer.render(canonical_json)
```

## Word Template

Template file: `templates/kv30_report.docx`

Xem chi tiết về placeholders và cấu trúc template tại: [templates/README.md](templates/README.md)

### Yêu cầu template

1. **Header placeholders:** `{{so_bao_cao}}`, `{{ngay_bao_cao}}`, `{{don_vi_bao_cao}}`, `{{thoi_gian_tu_den}}`

2. **Statistics table:** 61 dòng với placeholders:
   - Cột "Nội dung": `{{stt_1}}` đến `{{stt_61}}`
   - Cột "Kết quả": `{{stt_1_ket_qua}}` đến `{{stt_61_ket_qua}}`

3. **Jinja2 loops** cho các danh sách:
   ```jinja2
   {% for item in danh_sach_cnch %}
   ...
   {% endfor %}
   ```

4. **Dot notation** cho detailed operations:
   ```jinja2
   {{phan_I_va_II_chi_tiet_nghiep_vu.quan_so_truc}}
   ```

## Database Schema

### Table: `reports`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | String | Report title |
| report_date | Date | Report date |
| version | Integer | Version number |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Update timestamp |

### Table: `report_rows`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| report_id | UUID | Foreign key to reports |
| row_type | Enum | Domain type: STATISTICS, CNCH_EVENT, OTHER_TASK, VEHICLE, SCLQ, TONG_VU_CHAY, OPERATION |
| stt | Integer | Presentation index (not domain identifier) |

**Domain-specific columns:**

**Statistics:**
- `noi_dung`, `ket_qua`, `don_vi`, `ghi_chu`

**CNCH Events:**
- `mo_ta`, `dia_diem`, `thiet_hai`, `thoi_gian`, `ngay_xay_ra`
- `ket_qua_xu_ly`, `noi_dung_tin_bao`, `luc_luong_tham_gia`, `thong_tin_nan_nhan`

**Vehicles:**
- `bien_so`, `tinh_trang`

**SCLQ Events:**
- `vu_chay_ngay`, `dia_diem`, `nguyen_nhan`, `thiet_hai`, `chi_huy_chua_chay`, `ghi_chu`

**TONG_VU_CHAY Events:**
- `ngay_xay_ra`, `vu_chay`, `thoi_gian`, `dia_diem`, `phan_loai`, `nguyen_nhan`
- `thiet_hai_ve_nguoi`, `thiet_hai_tai_san`, `tai_san_cuu_chua`
- `thoi_gian_toi_dam_chay`, `thoi_gian_khong_che`, `thoi_gian_dap_tat_hoan_toan`
- `so_luong_xe`, `chi_huy_chua_chay`, `ghi_chu`

**Detailed Operations:**
- `quan_so_truc`, `tong_bao_cao`, `chi_tiet_cnch`, `tong_chi_vien`
- `tong_cong_van`, `tong_ke_hoach`, `tong_so_vu_no`, `tong_so_vu_chay`
- `tong_so_vu_cnch`, `tong_xe_hu_hong`, `cong_tac_an_ninh`

## Testing

### Manual Test

```bash
# 1. Tạo sample JSON
python test_render_simple.py

# 2. Kiểm tra output
# File sẽ được tạo tại: test_output.docx

# 3. Mở file bằng Microsoft Word và verify:
#    - Header fields được điền đúng
#    - Statistics table có 61 dòng với dữ liệu
#    - Các danh sách hiển thị đầy đủ
#    - Không có placeholder nào bị thiếu
```

### Integration Test

```python
# Với database đã setup
from app.modules.reports.service import ReportService
from app.db.session import SessionLocal

db = SessionLocal()
service = ReportService(db)

# Export report
docx_bytes = service.render_report_docx(report_id)

# Save to file
with open("output.docx", "wb") as f:
    f.write(docx_bytes.getvalue())
```

## Troubleshooting

### Template không tìm thấy

**Lỗi:** `FileNotFoundError: kv30_report.docx`

**Giải pháp:** Đảm bảo file template tồn tại tại `app/modules/reports/templates/kv30_report.docx`

### Placeholder không được thay thế

**Lỗi:** Document vẫn hiển thị `{{placeholder}}`

**Nguyên nhân:** 
1. Placeholder trong template không khớp với context key
2. Dữ liệu JSON thiếu field tương ứng

**Giải pháp:**
1. Kiểm tra spelling của placeholder trong template
2. Verify JSON structure với `print(canonical_json)`
3. Đảm bảo context mapping trong `_build_context()` đúng

### Statistics table thiếu dữ liệu

**Lỗi:** Một số dòng statistics có `ket_qua = 0` khi không nên

**Nguyên nhân:** Database thiếu rows cho các STT tương ứng

**Giải pháp:** 
1. Kiểm tra `report.rows` có đủ statistics rows không
2. Verify `row_type = RowType.STATISTICS`
3. Đảm bảo `stt` field được set đúng (1-61)

### Jinja2 loop không hoạt động

**Lỗi:** Danh sách không hiển thị hoặc hiển thị raw Jinja2 syntax

**Nguyên nhân:** Template không phải docxtpl format hoặc syntax sai

**Giải pháp:**
1. Đảm bảo sử dụng docxtpl, không phải python-docx thuần
2. Kiểm tra Jinja2 syntax: `{% for %}...{% endfor %}`
3. Verify list được pass vào context đúng key

## Dependencies

```
docxtpl==0.17.3
python-docx>=0.8.11
Jinja2>=3.0.0
```

Cài đặt:
```bash
pip install -r requirements.txt
```

## Tham khảo

- [docxtpl Documentation](https://docxtpl.readthedocs.io/)
- [Jinja2 Template Designer Documentation](https://jinja.palletsprojects.com/en/3.0.x/templates/)
- [python-docx Documentation](https://python-docx.readthedocs.io/)
