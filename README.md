# Data Entry Platform - KV30 Report System

A spreadsheet-style data entry and document generation platform for KV30 PCCC/CNCH reports following Vietnamese government forms.

## System Purpose

Thu thập dữ liệu báo cáo → chuẩn hóa → xuất báo cáo chuẩn cơ quan nhà nước.

**Not:**
- ETL system
- Document processing system
- AI extraction system
- File management system

**Single mission:** Input → Normalize → Export standardized reports.

## Key Features

✅ **Spreadsheet UI** - Replace Google Sheets with in-app editing
✅ **Auto-save** - Debounced with conflict detection
✅ **Version control** - Optimistic locking
✅ **Bulk operations** - Efficient batch updates
✅ **Word export** - Generate .docx documents from template
✅ **Canonical JSON** - Standardized data format (Pydantic validated)
✅ **JSONB storage** - Flexible schema, no migrations for form changes
✅ **Multi-domain** - Statistics, CNCH, Vehicles, Operations

## Quick Start

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

See [docs/STARTUP.md](docs/STARTUP.md) for detailed setup.

## System Principles

1. **Source-agnostic** - Report doesn't know data source
2. **Immutable structure** - Fixed by government form KV30
3. **Service-centric** - Business logic in service layer
4. **Boring engineering** - Simple, maintainable, predictable
5. **Spreadsheet-first** - Single interaction model
6. **Strict layering** - INBOUND (Normalizer) ≠ OUTBOUND (Exporter)

## Tech Stack

**Backend:** Python 3.12, FastAPI, SQLAlchemy 2.x, PostgreSQL, Alembic, Pydantic v2, docxtpl  
**Frontend:** React 18, TypeScript, Vite, Zustand, Handsontable, TailwindCSS

## Project Structure

```
project/
├── backend/
│   ├── app/
│   │   ├── core/           (config, database, exceptions)
│   │   └── modules/
│   │       └── reports/    (models, schemas, services, exporter, renderer, mapper, normalizer)
│   ├── alembic/            (database migrations)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── pages/          (ReportEditor)
│   │   ├── features/report/ (api, hooks, store)
│   │   ├── components/Spreadsheet/
│   │   ├── lib/
│   │   ├── types/
│   │   └── constants/
│   └── package.json
├── docs/                   (documentation)
│   ├── ARCHITECTURE.md
│   ├── DOMAIN.md
│   ├── FRONTEND_GUIDELINES.md
│   └── STARTUP.md
├── docker-compose.yml
└── README.md
```

## Data Flow

```
Input (Web Form / Excel / API / AI)
    ↓
Normalizer (Normalizer.normalize)
    ↓
CanonicalReport (Pydantic validated)
    ↓
Report Services (CRUD, versioning)
    ↓
Database (PostgreSQL with JSONB payload)
    ↓
Exporter.export() → CanonicalReport
    ↓
Renderer.render() → Word Template
    ↓
Word Document (.docx)
```

## Core Domain

### Report

One spreadsheet = one Report.

```sql
reports (
  id UUID PK,
  title VARCHAR,
  report_date DATE,
  version INTEGER,
  created_at, updated_at
)
```

### ReportRow (JSONB-based)

Data rows belonging to a Report. Uses JSONB payload for flexibility.

```sql
report_rows (
  id UUID PK,
  report_id UUID FK,
  row_type ENUM (statistics, cnch_event, other_task, vehicle, operation),
  stt INTEGER (presentation index),
  payload JSONB NOT NULL DEFAULT '{}'  -- All domain data here
)
```

**Payload schema by row_type:**

| row_type | payload fields |
|-----------|----------------|
| statistics | `stt`, `ket_qua`, `don_vi`, `ghi_chu` |
| cnch_event | `mo_ta`, `dia_diem`, `thiet_hai`, `thoi_gian`, `ngay_xay_ra`, `ket_qua_xu_ly`, `noi_dung_tin_bao`, `luc_luong_tham_gia`, `thong_tin_nan_nhan` |
| other_task | `noi_dung` |
| vehicle | `bien_so`, `tinh_trang` |
| operation | `quan_so_truc`, `tong_bao_cao`, `chi_tiet_cnch`, `tong_chi_vien`, `tong_cong_van`, `tong_ke_hoach`, `tong_so_vu_no`, `tong_so_vu_chay`, `tong_so_vu_cnch`, `tong_xe_hu_hong`, `cong_tac_an_ninh` |

**Benefits:** No migrations needed when government forms change. Schema evolves in CanonicalReport (Pydantic), not database.

## CanonicalReport (The Contract)

Pydantic model defining exact report structure. All exports use this.

```python
class CanonicalReport(BaseModel):
    header: Header
    bang_thong_ke: List[StatisticRow]
    danh_sach_cnch: List[CnchEvent]
    danh_sach_cong_tac_khac: List[str]
    danh_sach_cong_van_tham_muu: List[Any]
    danh_sach_phuong_tien_hu_hong: List[Vehicle]
    phan_I_va_II_chi_tiet_nghiep_vu: DetailedOperations
```

**This is the guardrail.** Exporter returns CanonicalReport, not dict. Renderer accepts CanonicalReport.

## API Endpoints

| Method | Endpoint | Service | Description |
|--------|----------|---------|-------------|
| POST | `/reports/` | ReportService | Create report |
| GET | `/reports/{id}` | ReportService | Get report metadata |
| GET | `/reports/{id}/full` | ReportService | Get report with all rows |
| POST | `/reports/{id}/bulk` | ReportBulkService | Bulk create/update/delete |
| GET | `/reports/{id}/export` | ReportExportService | Export to canonical JSON |
| GET | `/reports/{id}/export-docx` | ReportExportService | Export to Word document |

### Bulk Operations

```json
{
  "version": 3,
  "operations": [
    {"type": "create", "data": {"row_type": "statistics", "stt": 5, "ket_qua": 10}},
    {"type": "update", "row_id": "uuid", "data": {"ket_qua": 15}},
    {"type": "delete", "row_id": "uuid"}
  ]
}
```

Response:
```json
{"status": "ok", "version": 4}
// or
{"status": "conflict", "server_version": 5}
```

## Layering (Critical!)

### INBOUND: Normalizer
```python
# normalizer.py
class Normalizer:
    @staticmethod
    def normalize(data: dict) -> CanonicalReport:
        # Transform ANY input → CanonicalReport
        # Knows NOTHING about database
        pass
```

### OUTBOUND: Exporter
```python
# exporter.py
class ReportExporter:
    @staticmethod
    def export(report: Report) -> CanonicalReport:
        # Read from DB → CanonicalReport
        # Knows NOTHING about input sources
        pass
```

**Why separate?** Avoid God Object. Clear separation of concerns. Future-proof for multiple input channels.

## Word Export

Generate Word documents using `docxtpl` with Jinja2 templates.

**Template:** `backend/app/modules/reports/templates/kv30_report.docx`

**Placeholders:**
- Header: `{{so_bao_cao}}`, `{{ngay_bao_cao}}`, `{{don_vi_bao_cao}}`, `{{thoi_gian_tu_den}}`
- Statistics: `{{stt_1}}` ... `{{stt_61}}` for noi_dung, `{{stt_1_ket_qua}}` ... `{{stt_61_ket_qua}}`
- Lists: `{% for item in danh_sach_cnch %}...{% endfor %}`
- Operations: `{{phan_I_va_II_chi_tiet_nghiep_vu.quan_so_truc}}`, etc.

See [backend/app/modules/reports/templates/README.md](backend/app/modules/reports/templates/README.md) for full spec.

## Frontend Architecture

### Spreadsheet UI

Spreadsheet is the **single interaction model**. No forms, no modals.

**Editable columns:**
- Đơn vị
- Kết quả
- Ghi chú

**Readonly columns:**
- STT (from row.payload.stt)
- Nội dung (from STATISTICS_TEMPLATE)

**Data flow:**
```
User edit cell
  → afterChange hook creates Operation
  → Accumulate in ops queue
  → Debounce 1000ms
  → POST /reports/{id}/bulk
  → Success: version++, clear ops
  → Conflict: reload, notify user
```

### State Machine (Autosave)

- `IDLE`: No pending changes
- `SAVING`: Request in flight
- `WAITING_ACK`: Awaiting response
- `CONFLICT`: Version mismatch, reload required

See [docs/FRONTEND_GUIDELINES.md](docs/FRONTEND_GUIDELINES.md) for complete frontend rules.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture & data flow
- [docs/DOMAIN.md](docs/DOMAIN.md) - Domain model & JSONB payload schema
- [docs/FRONTEND_GUIDELINES.md](docs/FRONTEND_GUIDELINES.md) - Frontend patterns & constraints
- [docs/STARTUP.md](docs/STARTUP.md) - Setup, migrations, deployment guide
- [backend/app/modules/reports/WORD_RENDERING.md](backend/app/modules/reports/WORD_RENDERING.md) - Word rendering details
- [backend/app/modules/reports/templates/README.md](backend/app/modules/reports/templates/README.md) - Template specification

## Development Guidelines

### Must
- All writes via bulk `/bulk` endpoint
- Spreadsheet is the single interaction model
- Business logic in service layer
- Use CanonicalReport for exports
- INBOUND (Normalizer) separate from OUTBOUND (Exporter)

### Must Not
- Per-field API calls
- Form-based editing
- Modal editors
- Background sync workers
- Business logic in frontend
- Validation in frontend
- Separate columns for each domain (use JSONB)

## Success Criteria

System works when:
1. User opens report → sees spreadsheet
2. Pastes 100 rows from Excel
3. Clicks away → autosave triggers
4. Reload page → data persists correctly
5. Clicks "Export Word" → downloads .docx
6. Opens Word → data matches government form KV30 exactly

## Non-Goals

❌ No ETL pipeline
❌ No background workers
❌ No microservices
❌ No file storage (beyond template)
❌ No user authentication
❌ No multi-tenancy
❌ No audit log (beyond version history)
❌ No report templates (pre-filled forms)
❌ No scheduling/cron
❌ No email notifications

## License

Internal use only.

# -KV30-Report-Forge.
