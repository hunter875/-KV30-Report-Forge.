"""
Test script for the Word document rendering system.
Tests the full pipeline: JSON data -> docx rendering.
"""
import sys
from io import BytesIO

sys.path.insert(0, 'd:/exel/backend')

from app.modules.reports.renderer import ReportRenderer

def get_sample_json():
    """Return a sample canonical JSON structure."""
    return {
        "header": {
            "so_bao_cao": "BC-001/2025",
            "ngay_bao_cao": "05/05/2025",
            "don_vi_bao_cao": "Phòng PCCC Q. Hai Bà Trưng",
            "thoi_gian_tu_den": "01/05/2025 - 05/05/2025"
        },
        "bang_thong_ke": [
            {"stt": "1", "noi_dung": "I. TÌNH HÌNH CHÁY, NỖ, SỰ CỐ TAI NẠN", "ket_qua": 0},
            {"stt": "2", "noi_dung": "1. Tổng số vụ cháy", "ket_qua": 5},
            {"stt": "3", "noi_dung": "Số người chết", "ket_qua": 0},
            {"stt": "4", "noi_dung": "Số người bị thương", "ket_qua": 2},
            {"stt": "5", "noi_dung": "Số người cứu được", "ket_qua": 10},
            {"stt": "6", "noi_dung": "Tài sản thiệt hại (ước tính triệu đồng)", "ket_qua": 150},
            {"stt": "7", "noi_dung": "Tài sản cứu được (ước tính triệu đồng)", "ket_qua": 80},
            {"stt": "8", "noi_dung": "2. Tổng số vụ nổ", "ket_qua": 2},
            {"stt": "9", "noi_dung": "Số người chết", "ket_qua": 0},
            {"stt": "10", "noi_dung": "Số người bị thương", "ket_qua": 1},
            {"stt": "11", "noi_dung": "Số người cứu được", "ket_qua": 5},
            {"stt": "12", "noi_dung": "Tài sản thiệt hại (ước tính triệu đồng)", "ket_qua": 50},
            {"stt": "13", "noi_dung": "Tài sản cứu được (ước tính triệu đồng)", "ket_qua": 30},
            {"stt": "14", "noi_dung": "3. Tổng số vụ tai nạn, sự cố", "ket_qua": 3},
            {"stt": "15", "noi_dung": "Số người cứu được (=STT 16+STT 17)", "ket_qua": 8},
            {"stt": "16", "noi_dung": "Trong đó, số người trực tiếp cứu được", "ket_qua": 5},
            {"stt": "17", "noi_dung": "Trong đó, số người tổ chức hướng dẫn tự thoát nạn", "ket_qua": 3},
            {"stt": "18", "noi_dung": "Số thi thể nạn nhân tìm được", "ket_qua": 0},
            {"stt": "19", "noi_dung": "Số tài sản cứu được (ước tính triệu đồng)", "ket_qua": 25},
            {"stt": "20", "noi_dung": "II. KẾT QUẢ CÔNG TÁC PCCC VÀ CNCH", "ket_qua": 0},
            {"stt": "21", "noi_dung": "1. Tuyên truyền về PCCC và CNCH", "ket_qua": 0},
            {"stt": "22", "noi_dung": "1.1. Tuyên truyền qua MXH", "ket_qua": 0},
            {"stt": "23", "noi_dung": "Số tin, bài đã đăng phát", "ket_qua": 45},
            {"stt": "24", "noi_dung": "Số hình ảnh được đăng tải", "ket_qua": 120},
            {"stt": "25", "noi_dung": "1.2. Tuyên truyền trực tiếp", "ket_qua": 0},
            {"stt": "26", "noi_dung": "Số cuộc", "ket_qua": 15},
            {"stt": "27", "noi_dung": "Số người tham dự", "ket_qua": 500},
            {"stt": "28", "noi_dung": "Số khuyến cáo, tờ rơi đã phát hành", "ket_qua": 2000},
            {"stt": "29", "noi_dung": "2. Hướng dẫn, kiểm tra", "ket_qua": 0},
            {"stt": "30", "noi_dung": "Số cơ sở được kiểm", "ket_qua": 50},
            {"stt": "31", "noi_dung": "Kiểm tra định kỳ", "ket_qua": 30},
            {"stt": "32", "noi_dung": "Kiểm tra đột xuất", "ket_qua": 20},
            {"stt": "33", "noi_dung": "Số vi phạm được phát hiện", "ket_qua": 12},
            {"stt": "34", "noi_dung": "Tổng số cơ sở bị xử phạt", "ket_qua": 5},
            {"stt": "35", "noi_dung": "Trong đó, phạt cảnh cáo", "ket_qua": 2},
            {"stt": "36", "noi_dung": "Trong đó, tạm đình chỉ", "ket_qua": 1},
            {"stt": "37", "noi_dung": "Trong đó, đình chỉ", "ket_qua": 0},
            {"stt": "38", "noi_dung": "Trong đó, phạt tiền", "ket_qua": 4},
            {"stt": "39", "noi_dung": "Số tiền phạt thu được (triệu đồng)", "ket_qua": 50},
            {"stt": "40", "noi_dung": "3. Xây dựng, thực tập phương án", "ket_qua": 0},
            {"stt": "41", "noi_dung": "Phương án cơ sở - xây dựng", "ket_qua": 25},
            {"stt": "42", "noi_dung": "Phương án cơ sở - thực tập", "ket_qua": 20},
            {"stt": "43", "noi_dung": "Phương án phương tiện - xây dựng", "ket_qua": 10},
            {"stt": "44", "noi_dung": "Phương án phương tiện - thực tập", "ket_qua": 8},
            {"stt": "45", "noi_dung": "Phương án CA - xây dựng", "ket_qua": 5},
            {"stt": "46", "noi_dung": "Phương án CA - thực tập", "ket_qua": 4},
            {"stt": "47", "noi_dung": "Phương án CNCH CA - xây dựng", "ket_qua": 3},
            {"stt": "48", "noi_dung": "Phương án CNCH CA - thực tập", "ket_qua": 2},
            {"stt": "49", "noi_dung": "4. Công tác huấn luyện", "ket_qua": 0},
            {"stt": "50", "noi_dung": "Tổng số CBCS tham gia", "ket_qua": 150},
            {"stt": "51", "noi_dung": "Chỉ huy phòng", "ket_qua": 10},
            {"stt": "52", "noi_dung": "Chỉ huy Đội", "ket_qua": 15},
            {"stt": "53", "noi_dung": "Cán bộ tiểu đội", "ket_qua": 25},
            {"stt": "54", "noi_dung": "Chiến sỹ CC và CNCH", "ket_qua": 90},
            {"stt": "55", "noi_dung": "Lái tàu CC và CNCH", "ket_qua": 10}
        ][:61],  # Ensure only 61 rows
        "danh_sach_cnch": [
            {
                "stt": 1,
                "mo_ta": "Cháy nhà dân",
                "dia_diem": "P. Hòa Thuận, Q. Hai Bà Trưng, Hà Nội",
                "thiet_hai": "Tài sản ước tính 50 triệu đồng",
                "thoi_gian": "14:30",
                "ngay_xay_ra": "05/05/2025",
                "ket_qua_xu_ly": "Dập tắt sau 30 phút, không thương vong",
                "noi_dung_tin_bao": "Công dân báo cháy qua 114",
                "luc_luong_tham_gia": "2 xe chữa cháy, 15 CBCS",
                "thong_tin_nan_nhan": "Không có thương vong"
            },
            {
                "stt": 2,
                "mo_ta": "Tai nạn giao thông",
                "dia_diem": "QL ĐL Văn Lương, Q. Thanh Xuân",
                "thiet_hai": "Hư hỏng 2 xe ô tô",
                "thoi_gian": "09:15",
                "ngay_xay_ra": "04/05/2025",
                "ket_qua_xu_ly": "Xử lý xong, giao thông thông thoáng",
                "noi_dung_tin_bao": "Tai nạn 2 xe ô tô va chạm",
                "luc_luong_tham_gia": "1 xe PCCC, 5 CBCS",
                "thong_tin_nan_nhan": "Không có thương vong"
            }
        ],
        "danh_sach_cong_tac_khac": [
            "Tập huấn PCCC cho nhân viên tòa nhà CT8A",
            "Kiểm tra PCCC chợ đầu mối Long Biên",
            "Phổ biến, hướng dẫn PCCC tại trường THCS Lê Quý Đôn",
            "Tổ chức thực tập phương án chữa cháy tại Bệnh viện 108"
        ],
        "danh_sach_cong_van_tham_muu": [],
        "danh_sach_phuong_tien_hu_hong": [
            {"bien_so": "29A-123.45", "tinh_trang": "Hư hỏng phần đầu xe do va chạm"},
            {"bien_so": "30B-456.78", "tinh_trang": "Cháy nổ lốp sau"}
        ],
        "phan_I_va_II_chi_tiet_nghiep_vu": {
            "quan_so_truc": 45,
            "tong_bao_cao": 180,
            "chi_tiet_cnch": "Thực hiện 5 thành công, 1 chưa đạt",
            "tong_chi_vien": 25,
            "tong_cong_van": 12,
            "tong_ke_hoach": 8,
            "tong_so_vu_no": 2,
            "tong_so_vu_chay": 5,
            "tong_so_vu_cnch": 10,
            "tong_xe_hu_hong": 2,
            "cong_tac_an_ninh": "Đảm bảo an ninh trật tự tại khu vực"
        }
    }

def test_render():
    """Test the rendering pipeline."""
    print("=" * 60)
    print("TESTING WORD DOCUMENT RENDERING")
    print("=" * 60)

    # Get sample JSON data
    print("\n1. Loading sample JSON data...")
    json_data = get_sample_json()
    print(f"   - Header: {json_data['header']}")
    print(f"   - Statistics entries: {len(json_data['bang_thong_ke'])}")
    print(f"   - CNCH events: {len(json_data['danh_sach_cnch'])}")
    print(f"   - Other tasks: {len(json_data['danh_sach_cong_tac_khac'])}")
    print(f"   - Damaged vehicles: {len(json_data['danh_sach_phuong_tien_hu_hong'])}")

    # Render to Word
    print("\n2. Rendering Word document...")
    try:
        docx_bytes = ReportRenderer.render(json_data)
        print(f"   - Rendered size: {len(docx_bytes.getvalue())} bytes")
    except Exception as e:
        print(f"   - ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Save output
    output_path = 'd:/exel/backend/test_output_kv30.docx'
    with open(output_path, 'wb') as f:
        f.write(docx_bytes.getvalue())
    print(f"   - Saved to: {output_path}")

    print("\n" + "=" * 60)
    print("RENDER TEST COMPLETED SUCCESSFULLY!")
    print("=" * 60)

    # Show sample statistics values
    print("\nSample statistics with non-zero ket_qua:")
    for stat in json_data['bang_thong_ke']:
        if stat['ket_qua'] > 0:
            print(f"   STT {stat['stt']}: {stat['noi_dung'][:40]}... = {stat['ket_qua']}")

    return True

if __name__ == '__main__':
    success = test_render()
    sys.exit(0 if success else 1)
