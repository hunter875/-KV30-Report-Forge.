# Trạng thái Hệ thống - KV30 Report Platform

## Tổng quan

Hệ thống nhập liệu và phát hành báo cáo nghiệp vụ KV30 theo chuẩn cơ quan nhà nước.

**Mục tiêu:** Thu thập dữ liệu báo cáo → chuẩn hóa → xuất báo cáo chuẩn

## Kiến trúc hiện tại

```
┌─────────────────┐
│  Input Channel  │  Web Form (frontend)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Normalizer    │  ReportExporter.from_dict()
│  (cải tiến)     │  Chuyển input → canonical JSON
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Report Service  │  CRUD, versioning, conflict handling
│   (trung tâm)   │  Lưu trữ canonical data
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Database     │  PostgreSQL với domain-specific fields
│  (persistence)  │  Report + ReportRow (row_type enum)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Exporter     │  ReportExporter.export()
│                 │  DB → canonical JSON
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Renderer     │  ReportRenderer.render()
│                 │  JSON → Word Template
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Word Document  │  kv30_report.docx
│     (.docx)     │  Báo cáo hoàn chỉnh
└─────────────────┘
```

## Các thành phần đã triển khai

### ✅ Backend (Python/FastAPI)

#### 1. Models (`models.py`)
- **Report**: id, title, report_date, version, created_at, updated_at
- **ReportRow**: id, report_id, row_type (enum), + 30+ domain fields
- **RowType enum**: STATISTICS, CNCH_EVENT, OTHER_TASK, VEHICLE, OPERATION

#### 2. Repository (`repository.py`)
- Data access layer với SQLAlchemy
- CRUD operations cho Report và ReportRow

#### 3. Service (`service.py`)
- `create_report()` - Tạo báo cáo mới
- `get_report()` - Lấy báo cáo theo ID
- `export_report()` - Export sang canonical JSON
- `render_report_docx()` - Render sang Word document
- `apply_operations()` - Bulk operations với version conflict detection

#### 4. Exporter (`exporter.py`)
- `export(report)` - Chuyển Report object → canonical JSON
- `from_dict(data)` - **[MỚI]** Normalizer: validate và chuẩn hóa input dict

#### 5. Mapper (`mapper.py`)
7 hàm mapping cho từng domain:
- `map_header()` - Header metadata
- `map_statistics()` - 61 dòng thống kê (merge với STATISTICS_TEMPLATE)
- `map_cnch_events()` - Danh sách sự cố CNCH
- `map_other_tasks()` - Danh sách công tác khác
- `map_official_documents()` - Danh sách công văn (placeholder)
- `map_damaged_vehicles()` - Danh sách xe hư hỏng
- `map_detailed_operations()` - Chi tiết nghiệp vụ

#### 6. Renderer (`renderer.py`)
- `render(report_json)` - Điền canonical JSON vào Word template
- Sử dụng docxtpl (Jinja2-style placeholders)
- Trả về BytesIO chứa document

#### 7. Constants (`constants.py`)
- `STATISTICS_TEMPLATE` - 61 dòng với noi_dung chính xác theo form KV30

#### 8. Router (`router.py`)
API endpoints:
- `GET /reports/` - List all reports
- `GET /reports/{id}` - Get report by ID
- `POST /reports/` - Create new report
- `POST /reports/{id}/bulk` - Bulk operations (create/update/delete rows)
- `GET /reports/{id}/export-docx` - **[MỚI]** Export Word document

#### 9. Database Migration (`alembic/versions/001_initial.py`)
- Schema với tất cả domain fields
- row_type enum column

### ✅ Frontend (React/TypeScript)

#### 1. Types (`types/report.ts`)
- **[CẬP NHẬT]** ReportRow với đầy đủ domain fields
- DomainRowType enum
- RowData với tất cả optional fields
- Operation, BulkOperationsRequest, BulkResponse

#### 2. API Client (`features/report/api.ts`)
- `getAll()`, `getById()`, `create()`
- `bulkOperations()` - Sync với backend
- `exportDocx()` - **[MỚI]** Download Word document

#### 3. Report Editor (`pages/ReportEditor.tsx`)
- Spreadsheet interface
- Autosave với conflict detection
- Version tracking
- **[MỚI]** Export Word button

#### 4. Store (`features/report/store.ts`)
- Zustand state management
- currentReport, version tracking

#### 5. Autosave Hook (`features/report/useReportAutosave.ts`)
- Debounced autosave
- Conflict handling

### ✅ Word Template

#### Template File (`templates/kv30_report.docx`)
- Jinja2 placeholders cho header
- Statistics table với 61 rows
- Jinja2 loops cho danh sách CNCH, vehicles, tasks
- Detailed operations fields

#### Documentation
- `templates/README.md` - Template specification chi tiết
- `WORD_RENDERING.md` - Hệ thống rendering đầy đủ

## Canonical JSON Structure

```json
{
  "header": {
    "so_bao_cao": "string",
    "ngay_bao_cao": "string",
    "don_vi_bao_cao": "string",
    "thoi_gian_tu_den": "string"
  },
  "bang_thong_ke": [
    {"stt": "1-61", "noi_dung": "...", "ket_qua": number}
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
  "danh_sach_cong_tac_khac": ["string"],
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

## Luồng nghiệp vụ hiện tại

### 1. Nhập liệu (Web Form)
```
User nhập dữ liệu trong Spreadsheet
  ↓
Frontend tạo Operations (create/update/delete)
  ↓
POST /reports/{id}/bulk với version
  ↓
Service.apply_operations() - conflict detection
  ↓
Lưu vào Database
```

### 2. Xuất báo cáo
```
User click "Export Word"
  ↓
GET /reports/{id}/export-docx
  ↓
Service.render_report_docx()
  ├─ Exporter.export(report) → canonical JSON
  └─ Renderer.render(json) → Word document
  ↓
Download file .docx
```

### 3. Normalizer (Input Channel mới)
```
Input data (Web Form / Excel / API)
  ↓
Exporter.from_dict(input_data)
  ├─ Validate structure
  └─ Normalize to canonical JSON
  ↓
Service lưu vào DB
```

## Nguyên tắc kiến trúc đã tuân thủ

✅ **Source-agnostic**: Report không biết nguồn dữ liệu (có thể từ Web Form, Excel, API)

✅ **Immutable Structure**: Cấu trúc canonical JSON cố định theo biểu mẫu nhà nước

✅ **Service-centric**: Service layer là trung tâm, controller chỉ là HTTP adapter

✅ **Boring Engineering**: Code đơn giản, dễ bảo trì, không over-engineering

✅ **Pure Renderer**: Renderer chỉ điền template, không tạo bảng động hay suy luận cấu trúc

## Tính năng đã có

✅ Nhập liệu qua Web Form (Spreadsheet UI)
✅ Autosave với debounce
✅ Version conflict detection
✅ Bulk operations (create/update/delete)
✅ Export sang canonical JSON
✅ Render sang Word document
✅ Download file .docx
✅ Normalizer hỗ trợ dict input (chuẩn bị cho input channels khác)

## Tính năng chưa có (Future)

❌ Input Channel: Excel upload
❌ Input Channel: Google Sheets sync
❌ Input Channel: External API
❌ Input Channel: PDF/OCR AI extraction
❌ Web Form UI cho từng domain type (CNCH, Vehicle, Operation)
❌ Validation rules cho từng field
❌ Report templates (pre-filled forms)
❌ Report history/audit log

## Cách sử dụng

### Backend
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Export Word
1. Mở report trong editor
2. Nhập dữ liệu vào spreadsheet
3. Click "Export Word" button
4. File .docx sẽ được download

## Kết luận

Hệ thống đã đạt được:
- ✅ Kiến trúc đúng nghiệp vụ (Input → Normalizer → Service → Renderer → Output)
- ✅ Canonical JSON làm trung tâm
- ✅ Word rendering hoàn chỉnh
- ✅ Web Form làm input channel chính
- ✅ Normalizer có thể mở rộng cho input channels khác

**Trạng thái:** Hệ thống core đã hoàn thiện, sẵn sàng cho production với Web Form input channel.
