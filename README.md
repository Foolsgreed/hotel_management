# 🏨 Quản Lý Khách Sạn (Hotel Management)

## 1. Giới thiệu và Mô tả bài toán
**Bài toán/Vấn đề:** 
Trong thời đại công nghệ số, việc quản lý khách sạn theo phương pháp truyền thống (ghi chép sổ sách, file excel) gặp nhiều khó khăn như: dễ sai sót thông tin, khó quản lý trạng thái phòng theo thời gian thực, khó khăn trong việc thống kê doanh thu và tốn nhiều thời gian cho thủ tục nhận/trả phòng.

**Tại sao chọn đề tài này?** 
Đề tài "Quản Lý Khách Sạn" được lựa chọn nhằm xây dựng một hệ thống phần mềm giúp số hóa toàn bộ quy trình vận hành. Hệ thống không chỉ giúp tự động hóa các tác vụ quản lý thủ công mà còn mang lại trải nghiệm đặt phòng trực tuyến tiện lợi cho khách hàng.

**Đối tượng sử dụng hệ thống:**
* **Khách hàng (Guest):** Những người có nhu cầu tìm kiếm, tham khảo thông tin phòng và thực hiện đặt phòng trực tuyến.
* **Nhân viên / Quản lý (Employee/Admin):** Những người vận hành hệ thống, quản lý thông tin đặt phòng, quản lý phòng ốc, tiếp nhận khách và xử lý hóa đơn (Bill).

**Hệ thống sẽ có những chức năng gì?**
* **Dành cho Khách hàng:** Đăng ký, Đăng nhập, Xem danh sách phòng, Đặt phòng trực tuyến.
* **Dành cho Nhân viên:** Đăng nhập hệ thống quản lý, Quản lý trạng thái phòng (trống, đang phục vụ, bảo trì), Quản lý đặt phòng, và Thanh toán (xuất hóa đơn).

---

## 2. Mục lục
- [2.1 Công nghệ và thư viện sử dụng](#21-công-nghệ-và-thư-viện-sử-dụng)
- [2.2 Tính năng chính](#22-tính-năng-chính)
- [2.3 Cấu trúc dự án](#23-cấu-trúc-dự-án)
- [2.4 Yêu cầu hệ thống](#24-yêu-cầu-hệ-thống)
- [2.5 Cách tải và chạy web](#25-cách-tải-và-chạy-web)
- [2.6 Hạn chế hiện tại](#26-hạn-chế-hiện-tại)
- [2.7 Hướng phát triển](#27-hướng-phát-triển)
- [2.8 Trạng thái dự án](#28-trạng-thái-dự-án)

---

### 2.1 Công nghệ và thư viện sử dụng
* **Frontend:** HTML, CSS, JavaScript (Vanilla)
* **Backend:** Node.js, Express.js
* **Database:** Microsoft SQL Server (T-SQL)
* **Thư viện chính (Dependencies):**
  * `express` (^5.2.1): Web framework cho Node.js
  * `mssql` (^12.2.1) & `msnodesqlv8` (^5.1.9): Kết nối và truy vấn SQL Server
  * `dotenv` (^17.4.2): Quản lý biến môi trường

### 2.2 Tính năng chính
* Xác thực người dùng (Đăng nhập / Đăng ký) phân quyền cho Khách hàng và Nhân viên.
* Hiển thị danh sách phòng và loại phòng (Room Types).
* Cho phép khách hàng tìm kiếm và đặt phòng.
* Dashboard dành cho nhân viên để quản lý đặt phòng và thông tin phòng.

### 2.3 Cấu trúc dự án
```text
📦 hotel_management
 ┣ 📂 public         # Chứa các file tĩnh Frontend (HTML, CSS, JS, Images)
 ┣ 📂 sql            # Chứa các script khởi tạo Database (T-SQL)
 ┃ ┗ 📂 mysql        # (Lưu ý: Các script bên trong viết bằng SQL Server)
 ┣ 📂 src            # Mã nguồn Backend (Node.js)
 ┃ ┣ 📂 config       # Cấu hình kết nối DB (db.js)
 ┃ ┣ 📂 controllers  # Xử lý logic nghiệp vụ
 ┃ ┣ 📂 models       # Tương tác với CSDL (truy vấn SQL)
 ┃ ┣ 📂 routes       # Định nghĩa các API endpoints
 ┃ ┣ 📂 utils        # Các hàm tiện ích dùng chung
 ┃ ┗ 📜 server.js    # File chạy server chính
 ┣ 📜 .env           # Biến môi trường (DB Credentials)
 ┣ 📜 package.json   # Quản lý dependencies
 ┗ 📜 README.md      # Tài liệu hướng dẫn
```

### 2.4 Yêu cầu hệ thống
* **Node.js** (Khuyến nghị phiên bản 18.x trở lên)
* **Microsoft SQL Server** (Đang chạy tại máy bộ hoặc máy chủ từ xa)
* Trình duyệt web hiện đại (Chrome, Edge, Firefox...)

### 2.5 Cách tải và chạy web
**Bước 1: Clone dự án và Cài đặt thư viện**
```bash
git clone <url-repository>
cd hotel_management
npm install
```

**Bước 2: Cấu hình cơ sở dữ liệu**
1. Mở Microsoft SQL Server Management Studio (SSMS).
2. Chạy các script trong thư mục `sql/mysql/` theo thứ tự ưu tiên .
3. Đổi tên file `.env.example` thành `.env` ở thư mục gốc của dự án và điền thông tin tương ứng.

**Bước 3: Khởi chạy Server**
```bash
node src/server.js
# Hoặc npm start (nếu đã cấu hình trong package.json)
```

**Bước 4: Trải nghiệm hệ thống**
Mở trình duyệt và truy cập: `http://localhost:3000`
TK Admin: admin@hotel.com, mk:123456

### 2.6 Hạn chế hiện tại
* Chưa tích hợp cổng thanh toán trực tuyến thực tế (Stripe, VNPay, Momo).
* Giao diện frontend hiện tại là HTML/CSS tĩnh, chưa tối ưu hóa Single Page Application (SPA).
* Chưa có tính năng tự động gửi email/SMS thông báo trạng thái đặt phòng.

### 2.7 Hướng phát triển
* Tích hợp cổng thanh toán điện tử.
* Cải thiện UI/UX, hỗ trợ Responsive đầy đủ trên các thiết bị di động.
* Phát triển Dashboard báo cáo thống kê doanh thu dạng biểu đồ trực quan.
* Thêm chức năng đánh giá, bình luận khách sạn dành cho Guest.

### 2.8 Trạng thái dự án
* **Đang trong giai đoạn phát triển và tích hợp (In Progress)**
* Hệ thống đã hoàn thiện thiết kế Database, Frontend UI tĩnh và Server cơ bản. Hiện tại đang trong quá trình lắp ráp (uncomment) các Controller và Route xử lý nghiệp vụ chính.
