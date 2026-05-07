import unittest
from datetime import date

from app.modules.reports.exporter import ReportExporter
from app.modules.reports.models import Report, ReportRow, RowType


def row(row_type: RowType, stt: int, payload: dict):
    data = dict(payload)
    data.setdefault("stt", stt)
    return ReportRow(row_type=row_type, stt=stt, payload=data)


def stat(stt: int, day: int, month: int, **payload):
    return row(RowType.STATISTICS, stt, {"ngay": day, "thang": month, **payload})


class DailyMappingTest(unittest.TestCase):
    def test_daily_mapping_matches_bc_ngay_counts_and_sclq_details(self):
        report = Report(title="Mapping fixture")
        report.rows = [
            stat(
                1,
                27,
                4,
                sclq_den_pccc_cnch=1,
                cnch=0,
                dinh_ky_nhom_i=2,
                dinh_ky_nhom_ii=3,
                dot_xuat_nhom_i=1,
                dot_xuat_nhom_ii=0,
                xu_phat=1,
                tien_phat_trieu_dong=50,
            ),
            row(
                RowType.SCLQ,
                1,
                {
                    "vu_chay_ngay": "27/04/2026",
                    "dia_diem": "Tru dien duong A",
                    "nguyen_nhan": "Chay dien",
                    "thiet_hai": "Khong",
                    "chi_huy_chua_chay": "",
                    "ghi_chu": "01 chay tru dien",
                },
            ),
        ]

        data = ReportExporter.export(report, start_date=date(2026, 4, 27), end_date=date(2026, 4, 27))
        stats = {item.stt: item.ket_qua for item in data.bang_thong_ke}

        self.assertEqual(stats["14"], 1)
        self.assertEqual(stats["31"], 6)
        self.assertEqual(stats["32"], 5)
        self.assertEqual(stats["33"], 1)
        self.assertEqual(stats["35"], 1)
        self.assertEqual(stats["39"], 1)
        self.assertEqual(stats["40"], 50)
        self.assertEqual(len(data.danh_sach_sclq), 1)
        self.assertEqual(data.danh_sach_sclq[0].dia_diem, "Tru dien duong A")

    def test_weekly_mapping_sums_multiple_real_days(self):
        report = Report(title="Weekly mapping fixture")
        report.rows = [
            stat(1, 31, 3, sclq_den_pccc_cnch=2, cnch=0, tin_bai=1),
            stat(2, 1, 4, sclq_den_pccc_cnch=0, cnch=1, so_lop_tuyen_truyen=1, so_nguoi_tham_du_tuyen_truyen=25),
            row(RowType.SCLQ, 1, {"vu_chay_ngay": "31/03/2026", "dia_diem": "Diem A", "nguyen_nhan": "Chay co"}),
            row(RowType.SCLQ, 2, {"vu_chay_ngay": "31/03/2026", "dia_diem": "Diem B", "nguyen_nhan": "Chay dien"}),
            row(
                RowType.CNCH_EVENT,
                1,
                {
                    "ngay_xay_ra": "01/04/2026",
                    "loai_hinh_cnch": "Mac ket",
                    "dia_diem": "Diem C",
                    "so_nguoi_cuu_duoc": 2,
                    "thiet_hai_ve_nguoi": 1,
                },
            ),
        ]

        data = ReportExporter.export(report, start_date=date(2026, 3, 31), end_date=date(2026, 4, 1))
        stats = {item.stt: item.ket_qua for item in data.bang_thong_ke}

        self.assertEqual(stats["14"], 3)
        self.assertEqual(stats["15"], 2)
        self.assertEqual(stats["16"], 2)
        self.assertEqual(stats["18"], 1)
        self.assertEqual(stats["23"], 1)
        self.assertEqual(stats["27"], 1)
        self.assertEqual(stats["28"], 25)
        self.assertEqual(len(data.danh_sach_sclq), 2)
        self.assertEqual(len(data.danh_sach_cnch), 1)

    def test_missing_detail_rows_are_visible_as_placeholders(self):
        report = Report(title="Missing details fixture")
        report.rows = [
            stat(1, 27, 4, sclq_den_pccc_cnch=1, cnch=1, ghi_chu="01 chay tru dien"),
        ]

        data = ReportExporter.export(report, start_date=date(2026, 4, 27), end_date=date(2026, 4, 27))

        self.assertEqual(len(data.danh_sach_sclq), 1)
        self.assertEqual(len(data.danh_sach_cnch), 1)
        self.assertIn("01 chay tru dien", data.danh_sach_sclq[0].ghi_chu or "")
        self.assertIn("01 chay tru dien", data.danh_sach_cnch[0].noi_dung_tin_bao or "")

    def test_training_total_is_not_fabricated_from_attendee_column(self):
        report = Report(title="Training fixture")
        report.rows = [
            stat(1, 12, 4, so_nguoi_tham_du_huan_luyen=119, tong_so_nguoi_tham_du=119),
        ]

        data = ReportExporter.export(report, start_date=date(2026, 4, 12), end_date=date(2026, 4, 12))
        stats = {item.stt: item.ket_qua for item in data.bang_thong_ke}

        self.assertEqual(stats["55"], 0)
        for stt in ("56", "57", "58", "59", "60", "61"):
            self.assertEqual(stats[stt], 0)

    def test_training_total_matches_role_breakdown(self):
        report = Report(title="Training breakdown fixture")
        report.rows = [
            row(RowType.STATISTICS, 56, {"ket_qua": 1}),
            row(RowType.STATISTICS, 57, {"ket_qua": 2}),
            row(RowType.STATISTICS, 58, {"ket_qua": 3}),
            row(RowType.STATISTICS, 59, {"ket_qua": 4}),
            row(RowType.STATISTICS, 60, {"ket_qua": 5}),
            row(RowType.STATISTICS, 61, {"ket_qua": 6}),
        ]

        data = ReportExporter.export(report)
        stats = {item.stt: item.ket_qua for item in data.bang_thong_ke}

        self.assertEqual(stats["55"], 21)
        self.assertEqual(stats["60"], 5)

    def test_formula_rows_recompute_from_children(self):
        report = Report(title="Formula fixture")
        report.rows = [
            row(RowType.STATISTICS, 15, {"ket_qua": 99}),
            row(RowType.STATISTICS, 16, {"ket_qua": 2}),
            row(RowType.STATISTICS, 17, {"ket_qua": 3}),
            row(RowType.STATISTICS, 31, {"ket_qua": 99}),
            row(RowType.STATISTICS, 32, {"ket_qua": 4}),
            row(RowType.STATISTICS, 33, {"ket_qua": 5}),
            row(RowType.STATISTICS, 35, {"ket_qua": 99}),
            row(RowType.STATISTICS, 36, {"ket_qua": 6}),
            row(RowType.STATISTICS, 37, {"ket_qua": 7}),
            row(RowType.STATISTICS, 38, {"ket_qua": 8}),
            row(RowType.STATISTICS, 39, {"ket_qua": 9}),
        ]

        data = ReportExporter.export(report)
        stats = {item.stt: item.ket_qua for item in data.bang_thong_ke}

        self.assertEqual(stats["15"], 5)
        self.assertEqual(stats["31"], 9)
        self.assertEqual(stats["35"], 30)


if __name__ == "__main__":
    unittest.main()
