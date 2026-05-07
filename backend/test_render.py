"""
Test script for the Word document rendering system.
Creates sample data, exports to canonical JSON, and renders to Word.
"""
import sys
import uuid
from datetime import date
from io import BytesIO

sys.path.insert(0, 'd:/exel/backend')

from app.modules.reports.models import Report, ReportRow, RowType
from app.modules.reports.exporter import ReportExporter
from app.modules.reports.renderer import ReportRenderer
from app.db.session import SessionLocal

def create_sample_report():
    """Create a sample report with all data types."""
    db = SessionLocal()

    try:
        # Create a new report
        report = Report(
            id=uuid.uuid4(),
            title="Báo cáo thử nghiệm KV30",
            report_date=date(2025, 5, 5)
        )

        # Add header info - these would normally be in separate fields
        # For now, we'll use the report's metadata

        # Add statistics rows (STT 1-61)
        statistics_data = [
            (1, "I. TÌNH HÌNH CHÁY, NỖ, SỰ CỐ TAI NẠN", None),
            (2, "1. Tổng số vụ cháy", 5),
            (3, "Số người chết", 0),
            (4, "Số người bị thương", 2),
            (5, "Số người cứu được", 10),
            (6, "Tài sản thiệt hại (ước tính triệu đồng)", 150),
            (7, "Tài sản cứu được (ước tính triệu đồng)", 80),
            (8, "2. Tổng số vụ nổ", 2),
            (9, "Số người chết", 0),
            (10, "Số người bị thương", 1),
            (11, "Số người cứu được", 5),
            (12, "Tài sản thiệt hại (ước tính triệu đồng)", 50),
            (13, "Tài sản cứu được (ước tính triệu đồng)", 30),
            (14, "3. Tổng số vụ tai nạn, sự cố", 3),
            (15, "Số người cứu được (=STT 16+STT 17)", 8),
            (16, "Trong đó, số người trực tiếp cứu được", 5),
            (17, "Trong đó, số người tổ chức hướng dẫn tự thoát nạn", 3),
            (18, "Số thi thể nạn nhân tìm được", 0),
            (19, "Số tài sản cứu được (ước tính triệu đồng)", 25),
            (20, "II. KẾT QUẢ CÔNG TÁC PCCC VÀ CNCH", None),
            (21, "1. Tuyên truyền về PCCC và CNCH", None),
            (22, "1.1. Tuyên truyền qua các phương tiện thông tin truyền thông và nền tảng trực tuyến MXH", None),
            (23, "Số tin, bài đã đăng phát", 45),
            (24, "Số hình ảnh được đăng tải", 120),
            (26, "1.2. Tuyên truyền trực tiếp tại cơ sở, doanh nghiệp, các khu dân cư", None),
            (27, "Số cuộc", 15),
            (28, "Số người tham dự", 500),
            (29, "Số khuyến cáo, tờ rơi đã phát hành", 2000),
            (30, "2. Hướng dẫn, kiểm tra về PCCC và CNCH", None),
            (31, "Số cơ sở được kiểm an toàn PCCC (=STT 31+STT 33)", 50),
            (32, "Kiểm tra định kỳ", 30),
            (33, "Kiểm tra đột xuất theo chuyên đề", 20),
            (34, "Số vi phạm được phát hiện", 12),
            (35, "Tổng số cơ sở bị xử phạt VPHC về PCCC (=STT 36+…+STT 39)", 5),
            (36, "Trong đó, phạt cảnh cáo", 2),
            (37, "Trong đó, tạm đình chỉ hoạt động", 1),
            (38, "Trong đó, đình chỉ hoạt động", 0),
            (39, "Trong đó, phạt tiền", 4),
            (40, "Số tiền phạt thu được (triệu đồng)", 50),
            (41, "3. Xây dựng, thực tập phương án chữa cháy, CNCH", None),
            (42, "3.1. Phương án chữa cháy, cứu nạn, cứu hộ của cơ sở", None),
            (43, "Số phương án được xây dựng và phê duyệt", 25),
            (44, "Số phương án được thực tập", 20),
            (45, "3.2. Phương án chữa cháy, cứu nạn, cứu hộ của phương tiện giao thông", None),
            (46, "Số phương án được xây dựng và phê duyệt", 10),
            (47, "Số phương án được thực tập", 8),
            (48, "3.3. Phương án chữa cháy, cứu nạn, cứu hộ của cơ quan Công an", None),
            (49, "Số phương án được xây dựng và phê duyệt", 5),
            (50, "Số phương án được thực tập", 4),
            (51, "3.4. Phương án cứu nạn, cứu hộ của cơ quan Công an", None),
            (52, "Số phương án được xây dựng và phê duyệt", 3),
            (53, "Số phương án được thực tập", 2),
            (54, "4. Công tác huấn luyện nghiệp vụ chữa cháy và CNCH thường xuyên", None),
            (55, "Tổng số CBCS tham gia huấn luyện (=STT 56+…+STT 61)", 150),
            (56, "Chỉ huy phòng", 10),
            (57, "Chỉ huy Đội", 15),
            (58, "Cán bộ tiểu đội", 25),
            (59, "Chiến sỹ CC và CNCH", 90),
            (61, "Lái tàu CC và CNCH", 10),
        ]

        for stt, noi_dung, ket_qua in statistics_data:
            row = ReportRow(
                id=uuid.uuid4(),
                report_id=report.id,
                row_type=RowType.STATISTICS,
                stt=stt,
                noi_dung=noi_dung,
                ket_qua=ket_qua
            )
            report.rows.append(row)

        # Add CNCH events
        cnch_events = [
            {
                'stt': 1,
                'mo_ta': 'Cháy nhà dân',
                'dia_diem': 'P. Hòa Thuận, Q. Hai Bà Trưng, Hà Nội',
                'thiet_hai': 'Tài sản ước tính 50 triệu đồng',
                'thoi_gian': '14:30',
                'ngay_xay_ra': '05/05/2025',
                'ket_qua_xu_ly': 'Dập tắt sau 30 phút, không thương vong',
                'noi_dung_tin_bao': 'Công dân báo cháy qua 114',
                'luc_luong_tham_gia': '2 xe chữa cháy, 15 CBCS',
                'thong_tin_nan_nhan': 'Không có thương vong'
            },
            {
                'stt': 2,
                'mo_ta': 'Tai nạn giao thông',
                'dia_diem': 'QĐ Lê Văn Lương, Q. Thanh Xuân, Hà Nội',
                'thiet_hai': 'Hư hỏng 2 xe ô tô',
                'thoi_gian': '09:15',
                'ngay_xay_ra': '04/05/2025',
                'ket_qua_xu_ly': 'Xử lý xong, giao thông thông thoáng',
                'noi_dung_tin_bao': 'Tai nạn 2 xe ô tô va chạm',
                'luc_luong_tham_gia': '1 xe PCCC, 5 CBCS',
                'thong_tin_nan_nhan': 'Không có thương vong'
            }
        ]

        for i, event_data in enumerate(cnch_events):
            row = ReportRow(
                id=uuid.uuid4(),
                report_id=report.id,
                row_type=RowType.CNCH_EVENT,
                **event_data
            )
            report.rows.append(row)

        # Add other tasks
        other_tasks = [
            "Tập huấn PCCC cho nhân viên tòa nhà CT8A",
            "Kiểm tra PCCC chợ đầu mối Long Biên",
            "Phổ biến, hướng dẫn PCCC tại trường THCS Lê Quý Đôn",
            "Tổ chức thực tập phương án chữa cháy tại Bệnh viện 108"
        ]

        for noi_dung in other_tasks:
            row = ReportRow(
                id=uuid.uuid4(),
                report_id=report.id,
                row_type=RowType.OTHER_TASK,
                noi_dung=noi_dung
            )
            report.rows.append(row)

        # Add damaged vehicles
        damaged_vehicles = [
            {'bien_so': '29A-123.45', 'tinh_trang': 'Hư hỏng phần đầu xe do va chạm'},
            {'bien_so': '30B-456.78', 'tinh_trang': 'Cháy nổ lốp sau'}
        ]

        for vehicle_data in damaged_vehicles:
            row = ReportRow(
                id=uuid.uuid4(),
                report_id=report.id,
                row_type=RowType.VEHICLE,
                **vehicle_data
            )
            report.rows.append(row)

        # Add detailed operations
        detailed_ops = ReportRow(
            id=uuid.uuid4(),
            report_id=report.id,
            row_type=RowType.OPERATION,
            quan_so_truc=45,
            tong_bao_cao=180,
            chi_tiet_cnch="Thực hiện 5 thành công, 1 chưa đạt",
            tong_chi_vien=25,
            tong_cong_van=12,
            tong_ke_hoach=8,
            tong_so_vu_no=2,
            tong_so_vu_chay=5,
            tong_so_vu_cnch=10,
            tong_xe_hu_hong=2,
            cong_tac_an_ninh="Đảm bảo an ninh trật tự tại khu vực"
        )
        report.rows.append(detailed_ops)

        # Save to database
        db.add(report)
        db.commit()
        db.refresh(report)

        print(f"Created sample report with ID: {report.id}")
        print(f"Total rows: {len(report.rows)}")

        return report

    finally:
        db.close()

def test_export_and_render():
    """Test the full export and render pipeline."""
    print("=" * 60)
    print("TESTING REPORT EXPORT AND RENDER PIPELINE")
    print("=" * 60)

    # Create sample report
    report = create_sample_report()

    # Export to canonical JSON
    print("\n1. Exporting to canonical JSON...")
    json_data = ReportExporter.export(report)

    print(f"\nExported structure keys: {list(json_data.keys())}")
    print(f"  - Header: {json_data['header']}")
    print(f"  - Statistics count: {len(json_data['bang_thong_ke'])}")
    print(f"  - CNCH events count: {len(json_data['danh_sach_cnch'])}")
    print(f"  - Other tasks count: {len(json_data['danh_sach_cong_tac_khac'])}")
    print(f"  - Damaged vehicles count: {len(json_data['danh_sach_phuong_tien_hu_hong'])}")
    print(f"  - Detailed operations: {json_data['phan_I_va_II_chi_tiet_nghiep_vu']}")

    # Render to Word
    print("\n2. Rendering to Word document...")
    docx_bytes = ReportRenderer.render(json_data)

    print(f"\nRendered document size: {len(docx_bytes.getvalue())} bytes")

    # Save output file
    output_path = 'd:/exel/backend/output_kv30_report.docx'
    with open(output_path, 'wb') as f:
        f.write(docx_bytes.getvalue())

    print(f"Output saved to: {output_path}")
    print("\n" + "=" * 60)
    print("TEST COMPLETED SUCCESSFULLY!")
    print("=" * 60)

    # Show sample statistics
    print("\nSample statistics entries (first 5):")
    for i, stat in enumerate(json_data['bang_thong_ke'][:5]):
        print(f"  {stat['stt']}. {stat['noi_dung'][:50]}... = {stat['ket_qua']}")

if __name__ == '__main__':
    test_export_and_render()
