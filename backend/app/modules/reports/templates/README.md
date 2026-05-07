# Word Document Template - KV30 Report

This directory contains the Microsoft Word (.docx) template used for rendering KV30 PCCC/CNCH reports.

## Template File

**Required filename:** `kv30_report.docx`

The template uses [docxtpl](https://docxtpl.readthedocs.io/) for Jinja2-style placeholder substitution.

## Template Placeholders

### 1. Header Section

Place these placeholders in the document where header information should appear:

| Placeholder | Description |
|-------------|-------------|
| `{{so_bao_cao}}` | Report number (e.g., "BC-001/2025") |
| `{{ngay_bao_cao}}` | Report date (e.g., "05/05/2025") |
| `{{don_vi_bao_cao}}` | Reporting unit name |
| `{{thoi_gian_tu_den}}` | Time period (e.g., "01/05/2025 - 05/05/2025") |

### 2. Statistics Table (Bảng thống kê)

The statistics table has **61 rows** corresponding to STT 1-61. Each row needs two placeholders:

- **STT column:** `{{stt_1}}`, `{{stt_2}}`, ... `{{stt_61}}` (these contain the `noi_dung` text)
- **Kết quả column:** `{{stt_1_ket_qua}}`, `{{stt_2_ket_qua}}`, ... `{{stt_61_ket_qua}}`

**Note:** The `stt_X` placeholders pull content from the `STATISTICS_TEMPLATE` constant (defined in `app/modules/reports/constants.py`). The `stt_X_ket_qua` placeholders get values from the `bang_thong_ke` array.

### 3. Detailed Operations Section (Phần I và II chi tiết nghiệp vụ)

Place these placeholders for aggregated operation metrics:

| Placeholder | Description |
|-------------|-------------|
| `{{phan_I_va_II_chi_tiet_nghiep_vu.quan_so_truc}}` | Direct officer count |
| `{{phan_I_va_II_chi_tiet_nghiep_vu.tong_bao_cao}}` | Total reports count |
| `{{phan_I_va_II_chi_tiet_nghiep_vu.chi_tiet_cnch}}` | CNCH details text |
| `{{phan_I_va_II_chi_tiet_nghiep_vu.tong_chi_vien}}` | Total visiting officers |
| `{{phan_I_va_II_chi_tiet_nghiep_vu.tong_cong_van}}` | Total official documents |
| `{{phan_I_va_II_chi_tiet_nghiep_vu.tong_ke_hoach}}` | Total plans |
| `{{phan_I_va_II_chi_tiet_nghiep_vu.tong_so_vu_no}}` | Total explosion incidents |
| `{{phan_I_va_II_chi_tiet_nghiep_vu.tong_so_vu_chay}}` | Total fire incidents |
| `{{phan_I_va_II_chi_tiet_nghiep_vu.tong_so_vu_cnch}}` | Total CNCH incidents |
| `{{phan_I_va_II_chi_tiet_nghiep_vu.tong_xe_hu_hong}}` | Total damaged vehicles |
| `{{phan_I_va_II_chi_tiet_nghiep_vu.cong_tac_an_ninh}}` | Security work description |

### 4. CNCH Events List (Danh sách CNCH)

Use a Jinja2 `for` loop to iterate over events:

```jinja2
{% for item in danh_sach_cnch %}
STT: {{item.stt}}
Mô tả: {{item.mo_ta}}
Địa điểm: {{item.dia_diem}}
Thiệt hại: {{item.thiet_hai}}
Thời gian: {{item.thoi_gian}}
Ngày xảy ra: {{item.ngay_xay_ra}}
Kết quả xử lý: {{item.ket_qua_xu_ly}}
Nội dung tin báo: {{item.noi_dung_tin_bao}}
Lực lượng tham gia: {{item.luc_luong_tham_gia}}
Thông tin nạn nhân: {{item.thong_tin_nan_nhan}}
{% endfor %}
```

**CNCH Event fields:**
- `stt` - Sequence number
- `mo_ta` - Description
- `dia_diem` - Location
- `thiet_hai` - Damage assessment
- `thoi_gian` - Time
- `ngay_xay_ra` - Date occurred
- `ket_qua_xu_ly` - Handling result
- `noi_dung_tin_bao` - Report content
- `luc_luong_tham_gia` - Participating forces
- `thong_tin_nan_nhan` - Victim information

### 5. Other Tasks List (Danh sách công tác khác)

List of task descriptions (strings):

```jinja2
{% for task in danh_sach_cong_tac_khac %}
• {{task}}
{% endfor %}
```

### 6. Official Documents List (Danh sách công văn tham mưu)

```jinja2
{% for doc in danh_sach_cong_van_tham_muu %}
• {{doc}}
{% endfor %}
```

### 7. Damaged Vehicles List (Danh sách phương tiện hư hỏng)

```jinja2
{% for vehicle in danh_sach_phuong_tien_hu_hong %}
Biển số: {{vehicle.bien_so}} - Tình trạng: {{vehicle.tinh_trang}}
{% endfor %}
```

**Vehicle fields:**
- `bien_so` - License plate
- `tinh_trang` - Condition/status

## JSON Structure

The renderer expects the following canonical JSON structure:

```json
{
  "header": {
    "so_bao_cao": "string",
    "ngay_bao_cao": "string",
    "don_vi_bao_cao": "string",
    "thoi_gian_tu_den": "string"
  },
  "bang_thong_ke": [
    {"stt": "1", "noi_dung": "string", "ket_qua": number},
    ...
  ],
  "danh_sach_cnch": [
    {
      "stt": number,
      "mo_ta": "string",
      "dia_diem": "string",
      "thiet_hai": "string",
      "thoi_gian": "string",
      "ngay_xay_ra": "string",
      "ket_qua_xu_ly": "string",
      "noi_dung_tin_bao": "string",
      "luc_luong_tham_gia": "string",
      "thong_tin_nan_nhan": "string"
    }
  ],
  "danh_sach_cong_tac_khac": ["string", ...],
  "danh_sach_cong_van_tham_muu": [],
  "danh_sach_phuong_tien_hu_hong": [
    {"bien_so": "string", "tinh_trang": "string"}
  ],
  "phan_I_va_II_chi_tiet_nghiep_vu": {
    "quan_so_truc": number,
    "tong_bao_cao": number,
    "chi_tiet_cnch": "string",
    "tong_chi_vien": number,
    "tong_cong_van": number,
    "tong_ke_hoach": number,
    "tong_so_vu_no": number,
    "tong_so_vu_chay": number,
    "tong_so_vu_cnch": number,
    "tong_xe_hu_hong": number,
    "cong_tac_an_ninh": "string"
  }
}
```

## API Usage

The backend provides an endpoint to export reports as Word documents:

```
GET /api/v1/reports/{report_id}/export-docx
```

**Response:** `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

The endpoint:
1. Fetches the report with all related rows from the database
2. Exports to canonical JSON using `ReportExporter`
3. Renders the Word document using `ReportRenderer` and this template
4. Returns the document as a file download

## Statistics Template

The `stt_X` placeholders (for noi_dung) are populated from `STATISTICS_TEMPLATE` in `app/modules/reports/constants.py`. This contains the exact 61-row structure mandated by the KV30 government form. Do not modify the statistics template without verifying against official documentation.

## Implementation Files

- `renderer.py` - `ReportRenderer` class, pure template rendering
- `exporter.py` - `ReportExporter` class, converts Report model to canonical JSON
- `mapper.py` - Mapping functions for each domain collection
- `constants.py` - `STATISTICS_TEMPLATE` with exact 61-row structure
- `models.py` - SQLAlchemy models with `RowType` enum

## Notes

- This is a **template filling** system, not a document generator. All structure, tables, and layout must be pre-designed in the .docx template.
- Jinja2 loops must be placed in the template where repeated content should appear.
- Placeholders are case-sensitive.
- Missing data defaults to empty strings or 0 as appropriate.