import uuid
from sqlalchemy import Column, String, Date, Integer, ForeignKey, DateTime, func, Enum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class RowType(str, enum.Enum):
    STATISTICS = "statistics"
    CNCH_EVENT = "cnch_event"
    OTHER_TASK = "other_task"
    VEHICLE = "vehicle"
    SCLQ = "sclq"
    TONG_VU_CHAY = "tong_vu_chay"
    OPERATION = "operation"


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    report_date = Column(Date, nullable=True)
    version = Column(Integer, default=1, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    rows = relationship("ReportRow", back_populates="report", cascade="all, delete-orphan")


class ReportRow(Base):
    """
    ReportRow stores domain data in JSONB payload.

    Schema is flexible - no migrations needed when government forms change.
    All domain-specific fields live in payload dict.
    """
    __tablename__ = "report_rows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    row_type = Column(
        Enum(
            RowType,
            name="row_type",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
    )
    stt = Column(Integer, nullable=True)

    # All domain data stored here
    payload = Column(MutableDict.as_mutable(JSONB), nullable=False, server_default='{}')

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    report = relationship("Report", back_populates="rows")

    def get(self, key: str, default=None):
        """Get value from payload."""
        return self.payload.get(key, default) if self.payload else default

    def set(self, key: str, value):
        """Set value in payload."""
        payload = dict(self.payload or {})
        payload[key] = value
        self.payload = payload

    @property
    def data(self):
        """Access payload as dict."""
        return self.payload or {}


class ReportOverride(Base):
    """User-edited canonical JSON for a selected report date/range.

    Source rows remain the source of truth. Overrides are only applied when the
    user intentionally saves the JSON they want to export for a day/week/range.
    """

    __tablename__ = "report_overrides"
    __table_args__ = (
        UniqueConstraint("report_id", "mode", "start_date", "end_date", name="uq_report_override_scope"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    mode = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    payload = Column(MutableDict.as_mutable(JSONB), nullable=False, server_default='{}')

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
