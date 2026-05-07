from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.modules.reports.models import Report, ReportOverride
from app.modules.reports.schemas import CanonicalReport


class ReportOverrideService:
    """Persist user-edited canonical JSON for one date/range."""

    def __init__(self, db: Session):
        self.db = db

    def get_override(
        self,
        report_id: str,
        mode: str,
        start_date: date,
        end_date: date,
    ) -> ReportOverride | None:
        return (
            self.db.query(ReportOverride)
            .filter(
                ReportOverride.report_id == report_id,
                ReportOverride.mode == mode,
                ReportOverride.start_date == start_date,
                ReportOverride.end_date == end_date,
            )
            .first()
        )

    def upsert_override(
        self,
        report_id: str,
        mode: str,
        start_date: date,
        end_date: date,
        payload: CanonicalReport,
    ) -> ReportOverride:
        report = self.db.query(Report).filter_by(id=report_id).first()
        if not report:
            raise ValueError("Report not found")
        if end_date < start_date:
            raise ValueError("end_date must be greater than or equal to start_date")

        override = self.get_override(report_id, mode, start_date, end_date)
        if not override:
            override = ReportOverride(
                report_id=report.id,
                mode=mode,
                start_date=start_date,
                end_date=end_date,
                payload=payload.model_dump(),
            )
            self.db.add(override)
        else:
            override.payload = payload.model_dump()

        self.db.commit()
        self.db.refresh(override)
        return override

    def delete_override(self, report_id: str, mode: str, start_date: date, end_date: date) -> bool:
        override = self.get_override(report_id, mode, start_date, end_date)
        if not override:
            return False
        self.db.delete(override)
        self.db.commit()
        return True

    @staticmethod
    def envelope(mode: str, start_date: date, end_date: date, override: ReportOverride | None) -> dict[str, Any]:
        return {
            "exists": override is not None,
            "mode": mode,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "data": override.payload if override else None,
            "updated_at": override.updated_at.isoformat() if override and override.updated_at else None,
        }
