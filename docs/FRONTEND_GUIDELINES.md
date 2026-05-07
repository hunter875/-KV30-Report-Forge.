# Frontend Guidelines

## Purpose

Frontend cung cấp spreadsheet-style data entry interface để thay thế Google Sheets.

**Core Principle:** Spreadsheet UI là single interaction model. Tất cả edits đều trực tiếp trong grid.

---

## Allowed UI Components

### Spreadsheet Grid (HotTable)
- Main editing surface
- Columns theo từng domain
- Copy-paste từ Excel
- Keyboard navigation

### Toolbar
- Report title display
- Save status indicator
- Export button

### Status Indicators
- Connection status
- Version info
- Conflict warnings

### Tab Navigation (nếu cần multi-section)
- Chuyển đổi giữa Statistics, CNCH, Vehicles, Tasks, Operations
- Mỗi tab là một table/form phù hợp

---

## Data Flow

```
User edits cell in HotTable
  → afterChange() hook
  → Create Operation (create/update/delete)
  → setOps([...prevOps, ...newOps])
  
(useEffect on ops.length)
  → if ops.length > 0 → triggerSave()
  
(useReportAutosave)
  → debounce 1000ms
  → POST /reports/{id}/bulk {version, operations}
  
Backend
  → validate version
  → apply operations
  → version++
  → return {status: "ok", version: N}
  
Frontend success
  → setVersion(N)
  → setOps([])
  → saveStatus = "saved"
```

---

## Forbidden Patterns (Absolute!)

❌ **Per-field API calls**
```typescript
// WRONG
onCellEdit(rowId, field, value) {
  await api.updateRow(rowId, {[field]: value})
}
```

❌ **Form-based editing**
```typescript
// WRONG
<Modal>
  <Input name="mo_ta" />
  <Input name="dia_diem" />
</Modal>
```

❌ **Modal row editors**
- Không được mở modal để edit một row
- Tất cả edits trực tiếp trong spreadsheet

❌ **Background sync workers**
- Không có Web Worker, setInterval polling
- Chỉ event-driven autosave

❌ **Multiple save buttons**
- Chỉ có autosave
- Có thể có manual "Save" nhưng không nên

❌ **Business logic in frontend**
- Validation rules ở backend
- Computed fields ở backend/exporter
- Default values ở backend

❌ **Complex state management**
- Không cần Redux, MobX
- Zustand đủ (chỉ hold report, version, pendingOps)
- Không normalize state

---

## State Structure

```typescript
interface ReportStore {
  // Current report data
  currentReport: Report | null
  version: number
  
  // Derived state
  pendingOps: Operation[]
  
  // Actions
  setCurrentReport: (report: Report) => void
  setPendingOps: (count: number) => void
  
  // Computed
  hasUnsavedChanges: boolean // pendingOps.length > 0
}
```

**Responsibilities:**
- Store holds authoritative state
- Spreadsheet reads from store
- Spreadsheet writes to store (via onOpsChange)
- Autosave hook triggers saves

---

## Spreadsheet Columns by Domain

### Statistics Spreadsheet (Default)
```typescript
columns = [
  { data: 'stt', type: 'numeric', width: 60 },
  { data: 'noi_dung', type: 'text', width: 400 },
  { data: 'don_vi', type: 'text', width: 100 },
  { data: 'ket_qua', type: 'numeric', width: 100 },
  { data: 'ghi_chu', type: 'text', width: 200 }
]
```

**Notes:**
- `noi_dung` được populate từ STATISTICS_TEMPLATE (readonly)
- User chỉ edit `don_vi`, `ket_qua`, `ghi_chu`
- `stt` là readonly (hiển thị STT 1-61)

### CNCH Events Table (Future)
```typescript
columns = [
  { data: 'stt', type: 'numeric' },
  { data: 'mo_ta', type: 'text' },
  { data: 'dia_diem', type: 'text' },
  { data: 'thiet_hai', type: 'text' },
  { data: 'thoi_gian', type: 'text' }, // HH:MM
  { data: 'ngay_xay_ra', type: 'text' }, // DD/MM/YYYY
  { data: 'ket_qua_xu_ly', type: 'text' },
  { data: 'noi_dung_tin_bao', type: 'text' },
  { data: 'luc_luong_tham_gia', type: 'text' },
  { data: 'thong_tin_nan_nhan', type: 'text' }
]
```

### SCLQ Events Table (Future)

```typescript
columns = [
  { data: 'stt', type: 'numeric' },
  { data: 'vu_chay_ngay', type: 'text' }, // DD/MM/YYYY
  { data: 'dia_diem', type: 'text' },
  { data: 'nguyen_nhan', type: 'text' },
  { data: 'thiet_hai', type: 'text' },
  { data: 'chi_huy_chua_chay', type: 'text' },
  { data: 'ghi_chu', type: 'text' }
]
```

### TONG_VU_CHAY Events Table (Future)

```typescript
columns = [
  { data: 'stt', type: 'numeric' },
  { data: 'vu_chay', type: 'text' },
  { data: 'dia_diem', type: 'text' },
  { data: 'phan_loai', type: 'text' },
  { data: 'ngay_xay_ra', type: 'text' }, // DD/MM/YYYY
  { data: 'thoi_gian', type: 'text' }, // HH:MM
  { data: 'nguyen_nhan', type: 'text' },
  { data: 'thiet_hai_ve_nguoi', type: 'text' },
  { data: 'thiet_hai_tai_san', type: 'text' },
  { data: 'tai_san_cuu_chua', type: 'text' },
  { data: 'thoi_gian_toi_dam_chay', type: 'text' },
  { data: 'thoi_gian_khong_che', type: 'text' },
  { data: 'thoi_gian_dap_tat_hoan_toan', type: 'text' },
  { data: 'so_luong_xe', type: 'numeric' },
  { data: 'chi_huy_chua_chay', type: 'text' },
  { data: 'ghi_chu', type: 'text' }
]
```

### Vehicles Table (Future)
```typescript
columns = [
  { data: 'bien_so', type: 'text' },
  { data: 'tinh_trang', type: 'text' }
]
```

### Other Tasks (Future)
- Không phải spreadsheet
- Là list với add/remove buttons
- Mỗi item là text input

### Detailed Operations (Future)
- Không phải spreadsheet
- Form với numeric inputs và text areas
- Single record only

---

## Multi-Section UI Pattern

**Option 1: Tabs (Recommended)**
```
┌─────────────────────────────────────┐
│ [Thống kê] [CNCH] [Xe hư hỏng] ... │
├─────────────────────────────────────┤
│ Section content                     │
│ (spreadsheet or form)               │
└─────────────────────────────────────┘
```

**Option 2: Accordion**
```
▼ Thông tin báo cáo (header)
▼ Bảng thống kê (61 rows)
▼ Sự cố CNCH
▼ Công tác khác
...
```

**Recommendation:** Tabs nếu có nhiều sections, single page nếu ít.

---

## Performance Requirements

- Support 500-2000 rows trong statistics spreadsheet
- Paste 100+ cells không lag
- Autosave không block UI
- No layout shifts

**Optimizations:**
- Debounce autosave (1000-1500ms)
- Batch operations
- Virtual scroll nếu >1000 rows
- Avoid re-renders (React.memo, useMemo)

---

## Accessibility

- Keyboard navigation (arrows, enter, tab)
- Screen reader support (HotTable có hỗ trợ cơ bản)
- Focus indicators
- Error announcements

---

## Error Handling

### Network Errors
- Show toast notification
- Keep unsaved changes in local state
- Retry button

### Conflict Errors
- Auto-reload latest data
- Show conflict message
- Allow user to re-apply changes

### Validation Errors
- Backend returns error per row/field
- Highlight problematic cells
- Show error message inline

---

## Internationalization

- Tất cả UI text: "Saving...", "Saved", "Conflict"
- Use i18n library (React-intl hoặc simple dictionary)
- Labels from backend? Không, hardcode Vietnamese

---

## Testing

### Unit Tests
- Store logic
- Operation creation
- Autosave debounce

### Integration Tests
- Full edit → save → reload flow
- Conflict resolution
- Export functionality

### E2E Tests (Playwright)
- Edit cells, save, verify DB
- Paste from Excel
- Conflict scenario (2 tabs)

---

## Code Style

```typescript
// Components
- PascalCase: SpreadsheetTable, SaveStatus
- File: Spreadsheet/index.tsx

// Hooks
- camelCase: useReportAutosave, useDebounce
- Prefix: use*

// Types/Interfaces
- PascalCase: Report, ReportRow, Operation
- Single export per file (default)

// Functions
- camelCase: createOperation, mapRowType
```

---

## Dependencies

**Required:**
- react-hot-table (Handsontable)
- zustand
- axios
- tailwindcss (optional, có thể dùng inline styles)

**Prohibited:**
- Redux/MobX
- React Query (không cần caching phức tạp)
- Formik/React Hook Form (không phải form)
- Lodash (chỉ dùng nếu thực sự cần)

---

## Security Considerations

- No auth yet (future: JWT in Authorization header)
- CSRF protection (FastAPI CSRF middleware)
- XSS: escape user input trong spreadsheet (HotTable có built-in)
- File upload validation (Excel import future)

---

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Handsontable có hỗ trợ tốt, nên các browser cũ không cần support.

---

## Related Documents

- [DOMAIN.md](./DOMAIN.md) - Domain model và business rules
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [WORD_RENDERING.md](./WORD_RENDERING.md) - Word export details
