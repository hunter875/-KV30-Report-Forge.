from sqlalchemy.orm import Session, joinedload, selectinload
from app.modules.reports.models import Report, ReportRow
from app.modules.reports.schemas import ReportCreate
from typing import Optional, List, Dict, Any
import uuid


class ReportRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, report_id: str | uuid.UUID) -> Optional[Report]:
        return self.db.query(Report).options(joinedload(Report.rows)).filter(Report.id == report_id).first()

    def get_all(self) -> List[Report]:
        return self.db.query(Report).all()

    def create(self, report: ReportCreate) -> Report:
        db_report = Report(**report.model_dump())
        self.db.add(db_report)
        self.db.commit()
        self.db.refresh(db_report)
        return db_report

    def get_row(self, row_id: str | uuid.UUID) -> Optional[ReportRow]:
        return self.db.query(ReportRow).filter(ReportRow.id == row_id).first()

    def create_row(self, report_id: str | uuid.UUID, row_data: Dict[str, Any]) -> ReportRow:
        db_row = ReportRow(report_id=report_id, **row_data)
        self.db.add(db_row)
        return db_row

    def update_row(self, row_id: str | uuid.UUID, row_data: Dict[str, Any]) -> Optional[ReportRow]:
        db_row = self.get_row(row_id)
        if not db_row:
            return None
        for key, value in row_data.items():
            setattr(db_row, key, value)
        return db_row

    def delete_row(self, row_id: str | uuid.UUID) -> bool:
        db_row = self.get_row(row_id)
        if not db_row:
            return False
        self.db.delete(db_row)
        return True