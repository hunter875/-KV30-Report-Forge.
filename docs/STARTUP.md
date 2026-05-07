# Startup Guide

## Prerequisites

- Docker & Docker Compose
- (Optional) Node.js 18+ và Python 3.11+ nếu chạy local

---

## Quick Start (Docker)

```bash
# Clone repository
cd d:/exel

# Start all services
docker compose up --build
```

**Services:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432

---

## Database Schema

### Current Schema (v2 - JSONB payload)

**Important:** ReportRow uses JSONB payload instead of separate columns.

```sql
-- reports table
id UUID PK
title VARCHAR
report_date DATE
version INTEGER (optimistic locking)
created_at, updated_at

-- report_rows table (JSONB-based)
id UUID PK
report_id UUID FK → reports.id (CASCADE)
row_type ENUM (statistics, cnch_event, other_task, vehicle, sclq, tong_vu_chay, operation)
stt INTEGER (presentation index)
payload JSONB NOT NULL DEFAULT '{}'  -- All domain data
created_at, updated_at
```

**Payload structure varies by row_type:**

| row_type | payload keys |
|-----------|--------------|
| statistics | `stt`, `ket_qua`, `don_vi`, `ghi_chu` |
| cnch_event | `mo_ta`, `dia_diem`, `thiet_hai`, `thoi_gian`, `ngay_xay_ra`, `ket_qua_xu_ly`, `noi_dung_tin_bao`, `luc_luong_tham_gia`, `thong_tin_nan_nhan` |
| other_task | `noi_dung` |
| vehicle | `bien_so`, `tinh_trang` |
| sclq | `vu_chay_ngay`, `dia_diem`, `nguyen_nhan`, `thiet_hai`, `chi_huy_chua_chay`, `ghi_chu` |
| tong_vu_chay | `ngay_xay_ra`, `vu_chay`, `thoi_gian`, `dia_diem`, `phan_loai`, `nguyen_nhan`, `thiet_hai_ve_nguoi`, `thiet_hai_tai_san`, `tai_san_cuu_chua`, `thoi_gian_toi_dam_chay`, `thoi_gian_khong_che`, `thoi_gian_dap_tat_hoan_toan`, `so_luong_xe`, `chi_huy_chua_chay`, `ghi_chu` |
| operation | `quan_so_truc`, `tong_bao_cao`, `chi_tiet_cnch`, `tong_chi_vien`, `tong_cong_van`, `tong_ke_hoach`, `tong_so_vu_no`, `tong_so_vu_chay`, `tong_so_vu_cnch`, `tong_xe_hu_hong`, `cong_tac_an_ninh` |

**Benefits:** No migrations needed when government forms change.

### Migrations

```bash
cd backend
alembic upgrade head
```

**Migration history:**
- `001_initial.py` - Initial schema with separate columns (deprecated)
- `002_refactor_report_rows_schema_jsonb_only.py` - Switch to JSONB payload (current)

**Fresh install:** Run both migrations in order.

---

## Local Development (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup database (PostgreSQL required)
# Database: app, User: app, Password: app

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend URL:** http://localhost:8000

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Frontend URL:** http://localhost:5173

---

## Verify Installation

### 1. Check Backend Health

```bash
curl http://localhost:8000/health
# Expected: {"status": "ok"}
```

### 2. Check API Docs

Open: http://localhost:8000/docs

Swagger UI với tất cả endpoints.

### 3. Create Test Report

```bash
curl -X POST http://localhost:8000/api/v1/reports/ \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Report"}'
```

### 4. Access Frontend

Open: http://localhost:5173

Nên thấy danh sách reports.

---

## Data Entry Workflow

1. **Create Report:** Click "New Report" (frontend)
2. **Enter Spreadsheet:** Edit statistics rows
   - STT & Nội dung: readonly (from template)
   - Đơn vị, Kết quả, Ghi chú: editable
3. **Auto-save:** Changes saved automatically after 1s debounce
4. **Conflict Resolution:** If another tab modified, auto-reload
5. **Export Word:** Click "Export Word" to download .docx

---

## Word Template

Template location: `backend/app/modules/reports/templates/kv30_report.docx`

**To update template:**
1. Edit in Microsoft Word
2. Add Jinja2 placeholders: `{{variable_name}}`
3. Save to templates directory
4. Restart backend if cached

**Template documentation:** See `backend/app/modules/reports/templates/README.md`

---

## Project Structure (Post-Refactor)

```
backend/
├── app/
│   ├── modules/
│   │   └── reports/
│   │       ├── models.py              # Report, ReportRow (JSONB payload)
│   │       ├── schemas/
│   │       │   ├── canonical_report.py  # CanonicalReport (Pydantic)
│   │       │   └── __init__.py
│   │       ├── services/
│   │       │   ├── report_service.py   # CRUD operations
│   │       │   ├── report_bulk.py      # Bulk operations (spreadsheet)
│   │       │   ├── report_import.py    # Import from Excel/CSV
│   │       │   └── report_export.py    # Export & rendering
│   │       ├── exporter.py             # DB → CanonicalReport (OUTBOUND)
│   │       ├── normalizer.py           # Input → CanonicalReport (INBOUND)
│   │       ├── renderer.py             # CanonicalReport → Word
│   │       ├── mapper.py               # Domain mapping functions
│   │       ├── repository.py           # Data access (used by services)
│   │       ├── router.py               # API endpoints
│   │       ├── constants.py            # STATISTICS_TEMPLATE
│   │       └── templates/
│   │           ├── kv30_report.docx
│   │           └── README.md
│   └── main.py
├── alembic/
│   └── versions/
│       ├── 001_initial.py
│       └── 002_refactor_report_rows_schema_jsonb_only.py
└── requirements.txt

frontend/
├── src/
│   ├── components/
│   │   └── Spreadsheet/
│   │       └── index.tsx
│   ├── features/
│   │   └── report/
│   │       ├── api.ts
│   │       ├── hooks.ts
│   │       └── store.ts
│   ├── pages/
│   │   └── ReportEditor.tsx
│   ├── types/
│   │   └── report.ts
│   └── constants/
│       └── statistics.ts
└── package.json
```

---

## Common Issues

### Port Already in Use

```bash
# Check what's using port 8000
lsof -i :8000  # Mac/Linux
netstat -ano | findstr :8000  # Windows

# Change port in docker-compose.yml or .env
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -U app -d app
# Password: app
```

### Migration Errors

```bash
# Reset database (WARNING: deletes all data)
cd backend
docker compose down
docker volume rm exel_postgres_data
docker compose up -d db
alembic upgrade head
```

### Frontend Can't Connect to Backend

- Verify backend is running: http://localhost:8000/docs
- Check CORS settings in `backend/app/main.py`
- Check `VITE_API_URL` in frontend `.env`

---

## Logs

### Backend Logs

```bash
# Docker
docker compose logs -f backend

# Local
# Logs print to stdout with colored output
```

### Frontend Logs

- Browser console (F12)
- Network tab for API calls

### Database Logs

```bash
docker compose logs -f db
```

---

## Stopping Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (deletes database)
docker compose down -v
```

---

## Testing the System

### 1. Create Report
```bash
curl -X POST http://localhost:8000/api/v1/reports/ \
  -H "Content-Type: application/json" \
  -d '{"title": "Báo cáo thử nghiệm KV30"}'
```

### 2. Get Report
```bash
curl http://localhost:8000/api/v1/reports/{id}/full
```

### 3. Bulk Operations (example)
```bash
curl -X POST http://localhost:8000/api/v1/reports/{id}/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "version": 1,
    "operations": [
      {
        "type": "create",
        "data": {
          "row_type": "statistics",
          "stt": 2,
          "ket_qua": 5
        }
      }
    ]
  }'
```

### 4. Export to Word
```bash
curl http://localhost:8000/api/v1/reports/{id}/export-docx \
  --output report.docx
```

---

## Next Steps

1. Read `docs/ARCHITECTURE.md` - Hiểu kiến trúc hệ thống
2. Read `docs/DOMAIN.md` - Hiểu domain model với JSONB payload
3. Read `docs/FRONTEND_GUIDELINES.md` - Quy tắc phát triển frontend
4. Read `backend/app/modules/reports/WORD_RENDERING.md` - Hệ thống rendering Word

---

## Notes

- **JSONB payload:** All domain data stored in single JSONB column. No migrations needed for form changes.
- **CanonicalReport:** Pydantic model guards canonical JSON structure. Exporter must return this, not dict.
- **Normalizer separate:** INBOUND (normalizer) vs OUTBOUND (exporter) are separate classes.
- **Service separation:** 3 service files for single responsibility.

---

**Happy coding!**
