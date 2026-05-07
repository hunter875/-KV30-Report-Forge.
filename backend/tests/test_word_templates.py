import re
import unittest
import zipfile
from io import BytesIO

from app.modules.reports.renderer import ReportRenderer
from app.modules.reports.schemas import CanonicalReport


UNRESOLVED_TEMPLATE_RE = re.compile(r"({{|}}|{%|%})")


def sample_report() -> CanonicalReport:
    return CanonicalReport(
        header={
            "so_bao_cao": "201/BC-KV30",
            "ngay_bao_cao": "01/04/2026",
            "don_vi_bao_cao": "DOI CC&CNCH KHU VUC 30",
            "thoi_gian_tu_den": "Tu ngay 31/03/2026 den ngay 01/04/2026",
        },
        bang_thong_ke=[
            {"stt": "2", "noi_dung": "Tong so vu chay", "ket_qua": 1},
            {"stt": "14", "noi_dung": "Tong so vu tai nan, su co", "ket_qua": 2},
            {"stt": "27", "noi_dung": "So cuoc tuyen truyen", "ket_qua": 1},
            {"stt": "28", "noi_dung": "So nguoi tham du", "ket_qua": 25},
            {"stt": "31", "noi_dung": "So co so duoc kiem tra", "ket_qua": 10},
            {"stt": "40", "noi_dung": "So tien phat", "ket_qua": 50},
            {"stt": "55", "noi_dung": "Tong CBCS huan luyen", "ket_qua": 27},
        ],
        danh_sach_cnch=[
            {
                "stt": 1,
                "dia_diem": "duong Hung Dinh 24",
                "thiet_hai": "Khong",
                "thoi_gian": "15:10 ngay 31/03/2026",
                "ngay_xay_ra": "31/03/2026",
                "ket_qua_xu_ly": "Khong",
                "noi_dung_tin_bao": "chay co",
                "luc_luong_tham_gia": "01 xe chua chay cung 08 CBCS",
                "thong_tin_nan_nhan": "",
            }
        ],
        danh_sach_sclq=[
            {
                "stt": 1,
                "vu_chay_ngay": "31/03/2026",
                "dia_diem": "duong Dong Nhi",
                "nguyen_nhan": "Chay dien",
                "thiet_hai": "Khong",
                "chi_huy_chua_chay": "Dai uy Nguyen Nguyen Anh",
                "ghi_chu": "",
            }
        ],
        phan_I_va_II_chi_tiet_nghiep_vu={
            "quan_so_truc": 24,
            "tong_bao_cao": 2,
            "chi_tiet_cnch": "Khong.",
            "tong_chi_vien": 0,
            "tong_cong_van": 0,
            "tong_ke_hoach": 0,
            "tong_so_vu_no": 0,
            "tong_so_vu_chay": 1,
            "tong_so_vu_cnch": 2,
            "tong_xe_hu_hong": 4,
            "cong_tac_an_ninh": "Khong.",
        },
    )


def rendered_xml_text(docx: BytesIO) -> str:
    docx.seek(0)
    with zipfile.ZipFile(docx) as archive:
        xml_parts = [
            archive.read(name).decode("utf-8", errors="ignore")
            for name in archive.namelist()
            if name.startswith("word/") and name.endswith(".xml")
        ]
    return "\n".join(xml_parts)


class WordTemplateRenderTest(unittest.TestCase):
    def assert_template_renders_cleanly(self, template_name: str) -> None:
        rendered = ReportRenderer.render(sample_report(), template_name=template_name)
        xml = rendered_xml_text(rendered)
        self.assertNotRegex(xml, UNRESOLVED_TEMPLATE_RE, msg=f"{template_name} still has raw Jinja tags")

    def test_daily_template_renders_without_raw_placeholders(self):
        self.assert_template_renders_cleanly("bc_ngay_kv30.docx")

    def test_weekly_template_renders_without_raw_placeholders(self):
        self.assert_template_renders_cleanly("bc_tuan_kv30.docx")


if __name__ == "__main__":
    unittest.main()
