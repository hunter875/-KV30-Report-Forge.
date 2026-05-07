# Kiến trúc Hệ thống KV30 Report Platform

## Mục tiêu

Nền tảng nhập liệu và phát hành báo cáo nghiệp vụ KV30 theo biểu mẫu nhà nước.

**Không phải:**
- Hệ thống ETL
- Hệ thống xử lý tài liệu
- Hệ thống AI extraction
- Hệ thống quản lý file

**Chỉ có một nhiệm vụ:**
Thu thập dữ liệu báo cáo → chuẩn hóa → xuất báo cáo chuẩn cơ quan nhà nước.

## Nguyên tắc thiết kế

1. **Source-agnostic**: Report không biết dữ liệu đến từ đâu (Web Form, Excel, API, AI)
2. **Immutable Structure**: Cấu trúc báo cáo cố định theo biểu mẫu KV30
3. **Service-centric**: Service layer là trung tâm, controller chỉ là HTTP adapter
4. **Boring Engineering**: Ưu tiên đơn giản, dễ bảo trì, predictable
5. **Layering**: INBOUND (Normalizer) tách biệt OUTBOUND (Exporter)

## Luồng dữ liệu tổng thể

```
┌─────────────────┐
│  Input Channel  │  Web Form / Excel / API / AI
│   (Web Form)    │  Chỉ đọc, không có logic nghiệp vụ
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Normalizer    │  normalizer.py (INBOUND ONLY)
│                 │  Input → CanonicalReport (validated)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Report Services │  3 services tách biệt:
│                 │  • report_service.py (CRUD)
│                 │  • report_bulk.py (spreadsheet ops)
│                 │  • report_export.py (export orchestration)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Database      │  PostgreSQL
│  (persistence)  │  Report + ReportRow (JSONB payload)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Exporter     │  exporter.py (OUTBOUND ONLY)
│                 │  DB → CanonicalReport (pydantic)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Renderer     │  renderer.py (PRESENTATION ONLY)
│                 │  CanonicalReport → Word Template
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Word Document  │  kv30_report.docx (configurable)
│     (.docx)     │  Báo cáo hoàn chỉnh
└─────────────────┘
```

## Các thành phần

### 1. Normalizer (INBOUND)

**File:** `normalizer.py`

**Chức năng:**
- Chuyển mọi input format về CanonicalReport
- Validate cấu trúc với Pydantic
- Điền giá trị mặc định
- Ép kiểu dữ liệu

**Quan trọng:** Normalizer KHÔNG biết về database. Chỉ làm việc với dict → CanonicalReport.

```python
class Normalizer:
    @staticmethod
    def normalize(data: dict) -> CanonicalReport:
        # Validate and transform input
        return CanonicalReport(**data)
```

### 2. Report Services (4 files tách biệt)

#### report_service.py - CRUD + State
```python
class ReportService:
    create_report(title) → Report
    get_report(id) → Report
    get_report_with_rows(id) → Report
    update_report_metadata(id, **kwargs) → Report
    delete_report(id) → bool
```

#### report_bulk.py - Spreadsheet Operations
```python
class ReportBulkService:
    apply_operations(report_id, payload) → {status, version}
    # Handles create/update/delete with optimistic locking
```

#### report_import.py - Import from Excel/CSV
```python
class ReportImportService:
    import_file(report_id, row_type, filename, content, replace) → dict
    # Supports: statistics, cnch_event, sclq, tong_vu_chay
```

#### report_export.py - Export Orchestration
```python
class ReportExportService:
    export(report_id) → CanonicalReport
    render_docx(report_id, template_name) → BytesIO
    render_docx_from_json(canonical, template_name) → BytesIO
    aggregate_by_date_range(start_date, end_date) → CanonicalReport
    # Handles all domains: statistics, cnch_event, sclq, tong_vu_chay, vehicles, tasks, operations
```

**Lý do tách:**
- Tránh God Object
- Mỗi file có single responsibility
- Dễ test và maintain
- Không cần class hierarchy

### 3. Database Schema (JSONB-based)

**Quan trọng:** Schema linh hoạt, không cần migration khi form thay đổi.

```sql
reports (
  id UUID PK,
  title VARCHAR,
  report_date DATE,
  version INTEGER,
  created_at, updated_at
)

report_rows (
  id UUID PK,
  report_id UUID FK,
  row_type ENUM (statistics, cnch_event, other_task, vehicle, operation),
  stt INTEGER,
  payload JSONB NOT NULL DEFAULT '{}',  -- All domain data here
  created_at, updated_at
)
```

**Payload examples:**

Statistics row:
```json
{"noi_dung": "1. Tổng số vụ cháy", "ket_qua": 5, "ghi_chu": ""}
```

CNCH event row:
```json
{
  "mo_ta": "Cháy nhà dân",
  "dia_diem": "P. Hòa Thuận",
  "thiet_hai": "50 triệu",
  "thoi_gian": "14:30",
  "ngay_xay_ra": "05/05/2025",
  ...
}
```

**Lợi ích:**
- Không cần migration khi thêm field mới
- Schema move từ DB → Canonical layer
- DB trở thành storage đơn giản
- Pattern của Notion / Airtable

### 4. Exporter (OUTBOUND)

**File:** `exporter.py`

**Chức năng:**
- Đọc Report từ DB
- Extract domain collections theo row_type
- Map từng collection qua mappers (statistics, cnch, sclq, tong_vu_chay, vehicles, tasks, operations)
- Trả về CanonicalReport (pydantic validated)

**Quan trọng:** Exporter KHÔNG nhận input từ user. Chỉ đọc từ DB.

```python
class ReportExporter:
    @staticmethod
    def export(report: Report) → CanonicalReport:
        # Extract rows by row_type
        # Map each domain
        # Return validated CanonicalReport
```

### 5. Canonical Report (Contract)

**File:** `schemas/canonical_report.py`

**Pydantic models:**
- `Header`
- `StatisticRow`
- `CnchEvent`
- `Vehicle`
- `DetailedOperations`
- `CanonicalReport` (root)

**Quan trọng:** Đây là guardrail sống còn. Tất cả phải qua pydantic validation.

```python
class CanonicalReport(BaseModel):
    header: Header
    bang_thong_ke: List[StatisticRow]
    danh_sach_cnch: List[CnchEvent]
    ...
```

**Rule:** Exporter MUST return CanonicalReport, không phải dict.

### 6. Renderer (PRESENTATION)

**File:** `renderer.py`

**Chức năng:**
- Load Word template by name (configurable)
- Build Jinja2 context từ CanonicalReport
- Render và trả về BytesIO

**Quan trọng:** Template name là configuration, không hardcode.

```python
class ReportRenderer:
    @classmethod
    def render(cls, canonical: CanonicalReport, template_name: str = None) → BytesIO:
        template_name = template_name or "kv30_report.docx"
        # Load template
        # Render with context
        return BytesIO()
```

**Lợi ích:**
- Hỗ trợ nhiều template (KV30, KV31, KV32...)
- Template = configuration, không phải code

## API Endpoints

| Method | Endpoint | Service | Description |
|--------|----------|---------|-------------|
| POST | `/reports/` | ReportService | Create report |
| GET | `/reports/` | ReportService | List all reports |
| GET | `/reports/{id}` | ReportService | Get report metadata |
| GET | `/reports/{id}/full` | ReportService | Get report with rows |
| POST | `/reports/{id}/bulk` | ReportBulkService | Bulk operations |
| POST | `/reports/{id}/import` | ReportImportService | Import from Excel/CSV |
| GET | `/reports/{id}/export` | ReportExportService | Export to JSON |
| GET | `/reports/{id}/export-docx` | ReportExportService | Export to Word |
| POST | `/reports/{id}/render-docx` | ReportExportService | Render Word from JSON |
| GET | `/reports/aggregate` | ReportExportService | Aggregate reports by date range |

## Data Flow Examples

### 1. User nhập liệu (Web Form)

```
User edits cell in spreadsheet
  ↓
Frontend creates Operation {type: "update", row_id, data: {...}}
  ↓
POST /reports/{id}/bulk {version: 3, operations: [...]}
  ↓
ReportBulkService.apply_operations()
  ├─ Check version conflict
  ├─ For each operation:
  │   ├─ create: new ReportRow(payload={...})
  │   ├─ update: row.payload.update({...})
  │   └─ delete: db.delete(row)
  ├─ report.version++
  └─ commit
  ↓
Return {status: "ok", version: 4}
```

### 2. Export Word document

```
GET /reports/{id}/export-docx
  ↓
ReportExportService.render_docx(id)
  ├─ Load report with rows from DB
  ├─ ReportExporter.export(report) → CanonicalReport
  │   ├─ Extract rows by row_type
  │   ├─ Map statistics (payload → StatisticRow[])
  │   ├─ Map CNCH events (payload → CnchEvent[])
  │   ├─ Map SCLQ events (payload → SclqEvent[])
  │   ├─ Map TONG_VU_CHAY (payload → TongVuChayEvent[])
  │   ├─ Map vehicles (payload → Vehicle[])
  │   ├─ Map tasks (payload → string[])
  │   ├─ Map operations (payload → DetailedOperations)
  │   └─ Return CanonicalReport (pydantic validated)
  └─ ReportRenderer.render(canonical, "kv30_report.docx")
      ├─ Load template
      ├─ Build Jinja2 context
      └─ Return BytesIO
↓
Return .docx file
```

### 3. Import từ Excel/CSV

```
POST /reports/{id}/import?row_type=sclq&replace=false (multipart/form-data)
  ↓
ReportImportService.import_file(report_id, row_type, filename, content, replace)
  ├─ Read file (xlsx/csv/tsv)
  ├─ Parse rows using column keys for row_type
  ├─ Map to payload dicts
  ├─ If replace: delete existing rows of this row_type
  ├─ Else: find next STT number
  ├─ Create ReportRow for each data row
  ├─ report.version++
  └─ commit
↓
Return {status: "ok", imported: N, version: X}
```

### 4. Aggregate reports by date range

```
GET /reports/aggregate?start_date=2025-05-01&end_date=2025-05-31
  ↓
ReportExportService.aggregate_by_date_range(start_date, end_date)
  ├─ Query all reports in date range
  ├─ Export each to CanonicalReport
  ├─ Merge statistics by STT (sum ket_qua)
  ├─ Concatenate all lists (CNCH, SCLQ, TONG_VU_CHAY, vehicles)
  ├─ Sum numeric operations fields
  ├─ Concatenate text fields (chi_tiet_cnch, cong_tac_an_ninh)
  └─ Return merged CanonicalReport
↓
Return aggregated JSON
```

## Nguyên tắc Layering

### INBOUND vs OUTBOUND

**INBOUND (Normalizer):**
- Nhận data từ bên ngoài
- Chuyển về CanonicalReport
- Không biết về DB

**OUTBOUND (Exporter):**
- Đọc data từ DB
- Chuyển về CanonicalReport
- Không biết về input sources

**Tại sao tách?**
- Tránh God Object
- Clear separation of concerns
- Dễ test (mock input vs mock DB)
- Future-proof (thêm input channels không ảnh hưởng exporter)

### Service Separation

**Tại sao tách 3 files?**
- `report_service.py`: Basic CRUD, không phình to
- `report_bulk.py`: Complex spreadsheet logic riêng
- `report_export.py`: Export orchestration riêng

**Không cần:**
- Class hierarchy
- Abstract base classes
- Dependency injection framework

**Chỉ cần:**
- File separation
- Clear responsibilities
- Simple imports

## Non-Goals

**Không làm:**
- ETL pipelines
- Background workers
- Microservices
- Complex state management
- Real-time collaboration (CRDT)
- Offline-first
- GraphQL

**Lý do:**
- Boring engineering
- Internal tool
- Predictable behavior
- Easy to maintain

## Success Criteria

Hệ thống thành công khi:

1. User mở report
2. Thấy spreadsheet
3. Paste 100 rows từ Excel
4. Click away
5. Autosave thành công
6. Reload page
7. Data persist đúng
8. Click "Export Word"
9. Download .docx file
10. Mở trong Word, data đúng format

---

**Tài liệu liên quan:**
- [DOMAIN.md](DOMAIN.md) - Domain model chi tiết
- [FRONTEND_GUIDELINES.md](FRONTEND_GUIDELINES.md) - Frontend patterns
- [STARTUP.md](STARTUP.md) - Setup và deployment
