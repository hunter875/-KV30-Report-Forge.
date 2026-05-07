"""
Normalizer - INBOUND ONLY

Converts various input formats to CanonicalReport.
This is the entry point for all data coming INTO the system.
"""

from typing import Any, Dict
from pydantic import ValidationError
from app.modules.reports.schemas import CanonicalReport


class Normalizer:
    """
    Normalizes input data to canonical format.

    Responsibilities:
    - Accept various input formats (Excel, API, Web Form, AI extraction)
    - Validate structure
    - Transform field names
    - Fill defaults
    - Return CanonicalReport (pydantic-validated)
    """

    @staticmethod
    def normalize(data: Dict[str, Any]) -> CanonicalReport:
        """
        Convert arbitrary input to CanonicalReport.

        Args:
            data: Raw input dict (from Web Form, Excel, API, etc.)

        Returns:
            CanonicalReport (pydantic model)

        Raises:
            ValueError: If data cannot be normalized
        """
        # Check if already canonical
        if all(k in data for k in ["header", "bang_thong_ke", "danh_sach_cnch",
                                   "danh_sach_cong_tac_khac", "danh_sach_phuong_tien_hu_hong",
                                   "phan_I_va_II_chi_tiet_nghiep_vu"]):
            try:
                return CanonicalReport(**data)
            except ValidationError as e:
                raise ValueError(f"Invalid canonical format: {e}") from e

        # TODO: Implement transformations from various input formats
        # For now, require canonical format
        raise ValueError(
            "Input must be in canonical format. "
            "Expected keys: header, bang_thong_ke, danh_sach_cnch, "
            "danh_sach_cong_tac_khac, danh_sach_phuong_tien_hu_hong, "
            "phan_I_va_II_chi_tiet_nghiep_vu"
        )
