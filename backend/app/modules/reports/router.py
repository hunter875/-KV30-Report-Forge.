"""
Router - HTTP API endpoints.

Each endpoint delegates to appropriate service class.
Controllers are thin adapters - no business logic.
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.reports.services.report_service import ReportService
from app.modules.reports.services.report_bulk import ReportBulkService
from app.modules.reports.services.report_export import ReportExportService
from app.modules.reports.services.report_import import ReportImportService
from app.modules.reports.services.report_override import ReportOverrideService
from app.modules.reports.schemas import ReportCreate, ReportResponse, BulkOperationsRequest, CanonicalReport, ReportUpdate
from typing import List, Optional
from datetime import date

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportResponse)
def create_report(payload: ReportCreate, db: Session = Depends(get_db)):
    """Create new report."""
    service = ReportService(db)
    return service.create_report(payload.title, report_date=payload.report_date)


@router.get("", response_model=List[ReportResponse])
def list_reports(db: Session = Depends(get_db)):
    """List all reports."""
    service = ReportService(db)
    return service.get_all_reports()


@router.get("/source", response_model=ReportResponse)
def get_source_report(db: Session = Depends(get_db)):
    """Get or create the single source-of-truth report."""
    service = ReportService(db)
    return service.ensure_source_report()


@router.get("/source/full", response_model=ReportResponse)
def get_source_report_full(db: Session = Depends(get_db)):
    """Get the source-of-truth report with all rows."""
    service = ReportService(db)
    return service.ensure_source_report()


@router.get("/aggregate")
def aggregate_reports(start_date: date, end_date: date, db: Session = Depends(get_db)):
    """Aggregate canonical JSON from all reports in an inclusive date range."""
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be greater than or equal to start_date")

    service = ReportExportService(db)
    canonical = service.aggregate_by_date_range(start_date, end_date)
    return JSONResponse(content=canonical.model_dump())


@router.get("/{report_id}", response_model=ReportResponse)
def fetch_report(report_id: str, db: Session = Depends(get_db)):
    """Get report metadata (without rows)."""
    service = ReportService(db)
    report = service.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{report_id}/full", response_model=ReportResponse)
def fetch_report_full(report_id: str, db: Session = Depends(get_db)):
    """
    Get report with all rows.
    Used by frontend spreadsheet.
    """
    service = ReportService(db)
    report = service.get_report_with_rows(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{report_id}/export")
def export_report_json(report_id: str, include_details: bool = True, db: Session = Depends(get_db)):
    """
    Export report to canonical JSON format.
    This is the government reporting contract.
    Output structure MUST NOT change.
    """
    service = ReportExportService(db)
    canonical = service.export(report_id, include_details=include_details)

    if canonical is None:
        raise HTTPException(status_code=404, detail="Report not found")

    return JSONResponse(content=canonical.model_dump())


@router.get("/{report_id}/aggregate")
def aggregate_report_rows(report_id: str, start_date: date, end_date: date, db: Session = Depends(get_db)):
    """Aggregate imported rows inside one report by an inclusive date range."""
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be greater than or equal to start_date")

    service = ReportExportService(db)
    canonical = service.aggregate_report_rows_by_date_range(report_id, start_date, end_date)
    if canonical is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return JSONResponse(content=canonical.model_dump())


@router.get("/{report_id}/export-docx")
def export_report_docx(
    report_id: str,
    include_details: bool = True,
    template_name: str = None,
    db: Session = Depends(get_db)
):
    """
    Export report as filled Word document.

    Args:
        report_id: Report UUID
        include_details: Include detailed sections
        template_name: Optional template filename (default: kv30_report.docx)
    """
    service = ReportExportService(db)
    try:
        docx_buffer = service.render_docx(
            report_id,
            include_details=include_details,
            template_name=template_name
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Report not found")
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Template error: {str(e)}")

    return Response(
        content=docx_buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename=report_{report_id}.docx"
        }
    )


@router.patch("/{report_id}")
def update_report_metadata(
    report_id: str,
    payload: ReportUpdate,
    db: Session = Depends(get_db)
):
    """
    Update report metadata (title, report_date).
    """
    service = ReportService(db)
    report = service.update_report_metadata(
        report_id,
        title=payload.title,
        report_date=payload.report_date
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{report_id}/validate-export")
def validate_export(report_id: str, db: Session = Depends(get_db)):
    """
    Check if report is ready for export.
    Returns: {valid: bool, missing: list[str]}
    """
    service = ReportExportService(db)
    try:
        result = service.validate_export(report_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{report_id}/render-docx")
def render_report_docx_from_json(
    report_id: str,
    payload: CanonicalReport,
    template_name: str = None,
    db: Session = Depends(get_db)
):
    """
    Render a Word document from the submitted canonical JSON.
    Does not write the JSON back to report rows or increment report version.
    """
    service = ReportExportService(db)
    try:
        docx_buffer = service.render_docx_from_json(payload, template_name=template_name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Template error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return Response(
        content=docx_buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename=report_{report_id}.docx"
        }
    )


@router.get("/{report_id}/override")
def get_report_override(
    report_id: str,
    mode: str,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
):
    """Return saved user JSON override for one report date/range, if any."""
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be greater than or equal to start_date")
    service = ReportOverrideService(db)
    override = service.get_override(report_id, mode, start_date, end_date)
    return service.envelope(mode, start_date, end_date, override)


@router.put("/{report_id}/override")
def save_report_override(
    report_id: str,
    mode: str,
    start_date: date,
    end_date: date,
    payload: CanonicalReport,
    db: Session = Depends(get_db),
):
    """Save edited canonical JSON for one report date/range without changing source rows."""
    service = ReportOverrideService(db)
    try:
        override = service.upsert_override(report_id, mode, start_date, end_date, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404 if "not found" in str(exc).lower() else 400, detail=str(exc))
    return service.envelope(mode, start_date, end_date, override)


@router.delete("/{report_id}/override")
def delete_report_override(
    report_id: str,
    mode: str,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
):
    """Remove saved user JSON override for one report date/range."""
    service = ReportOverrideService(db)
    deleted = service.delete_override(report_id, mode, start_date, end_date)
    return {"status": "ok", "deleted": deleted}


@router.post("/{report_id}/bulk")
def bulk_operations(report_id: str, payload: BulkOperationsRequest, db: Session = Depends(get_db)):
    """
    Apply bulk operations (create/update/delete) with version control.

    Implements optimistic locking:
    - Client sends current version
    - If server version differs, returns conflict
    - Client must reload and retry
    """
    service = ReportBulkService(db)
    result = service.apply_operations(report_id, payload)

    if result["status"] == "error":
        raise HTTPException(status_code=404, detail=result["message"])

    return result


@router.post("/{report_id}/import-preview")
async def preview_import_report_rows(
    report_id: str,
    row_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Preview one import target without writing rows."""
    if not ReportService(db).get_report(report_id):
        raise HTTPException(status_code=404, detail="Report not found")
    service = ReportImportService(db)
    try:
        content = await file.read()
        return service.preview_file(
            row_type=row_type,
            filename=file.filename or "import.xlsx",
            content=content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{report_id}/import-workbook-preview")
async def preview_import_report_workbook(
    report_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Preview the active source tables from the original KV30 .xlsx workbook."""
    if not ReportService(db).get_report(report_id):
        raise HTTPException(status_code=404, detail="Report not found")
    service = ReportImportService(db)
    try:
        content = await file.read()
        return service.preview_workbook(
            filename=file.filename or "import.xlsx",
            content=content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{report_id}/import")
async def import_report_rows(
    report_id: str,
    row_type: str = Form(...),
    replace: bool = Form(False),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Import report rows from .xlsx, .xls, .csv, or .tsv into one report table."""
    service = ReportImportService(db)
    try:
        content = await file.read()
        return service.import_file(
            report_id=report_id,
            row_type=row_type,
            filename=file.filename or "import.xlsx",
            content=content,
            replace=replace,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{report_id}/import-workbook")
async def import_report_workbook(
    report_id: str,
    replace: bool = Form(True),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Import the active source tables from the original KV30 .xlsx workbook."""
    service = ReportImportService(db)
    try:
        content = await file.read()
        return service.import_workbook(
            report_id=report_id,
            filename=file.filename or "import.xlsx",
            content=content,
            replace=replace,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
