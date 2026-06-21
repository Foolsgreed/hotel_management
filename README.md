# 🏨 Quản Lý Khách Sạn (Grand Palace Hotel Management)

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

## 2. Công nghệ và Thư viện sử dụng
* **Frontend:** HTML, CSS, JavaScript (Vanilla)
* **Backend:** Node.js, Express.js
* **Database:** Microsoft SQL Server (T-SQL)
* **Thư viện chính (Dependencies):**
  * `express` (^5.2.1): Web framework cho Node.js
  * `mssql` (^12.2.1) & `msnodesqlv8` (^5.1.9): Kết nối và truy vấn SQL Server
  * `dotenv` (^17.4.2): Quản lý biến môi trường
  * `jsonwebtoken` (^9.0.2): Xác thực người dùng (JWT)
  * `bcrypt` (^5.1.1): Mã hóa mật khẩu

## 3. Tính năng chính
* Xác thực người dùng (Đăng nhập / Đăng ký) sử dụng JWT, phân quyền cho Khách hàng, Lễ tân, Quản lý và Admin.
* Quản lý trạng thái phòng và loại phòng (Room Types).
* Cho phép khách hàng tìm kiếm và đặt phòng trực tuyến (Booking).
* Dashboard mạnh mẽ dành cho nhân viên để Check-in, Check-out, quản lý hóa đơn (Bill) và thống kê.

## 4. Cấu trúc dự án
```text
📦 hotel_management
 ┣ 📂 public         # Chứa các file tĩnh Frontend (HTML, CSS, JS, Images)
 ┣ 📂 sql            # Chứa các script khởi tạo Database (T-SQL)
 ┃ ┗ 📂 mysql        # (Lưu ý: Các script bên trong viết bằng SQL Server)
 ┣ 📂 src            # Mã nguồn Backend (Node.js)
 ┃ ┣ 📂 config       # Cấu hình kết nối DB (db.js)
 ┃ ┣ 📂 controllers  # Xử lý logic nghiệp vụ
 ┃ ┣ 📂 middleware   # Middleware (xác thực Token, kiểm tra phân quyền)
 ┃ ┣ 📂 models       # Tương tác với CSDL (truy vấn SQL)
 ┃ ┣ 📂 routes       # Định nghĩa các API endpoints
 ┃ ┣ 📂 utils        # Các tool/script hỗ trợ (ví dụ: tạo tài khoản Admin gốc)
 ┃ ┗ 📜 server.js    # File chạy server chính khởi động Express
 ┣ 📜 .env.example   # File mẫu khai báo Biến môi trường (DB Credentials)
 ┣ 📜 .gitignore     # Cấu hình bỏ qua các file khi đẩy lên Git
 ┣ 📜 package.json   # Quản lý thư viện NPM (dependencies)
 ┗ 📜 README.md      # Tài liệu hướng dẫn dự án này
```

## 5. Yêu cầu hệ thống
* **Node.js** (Khuyến nghị phiên bản 18.x trở lên)
* **Microsoft SQL Server** (Đang chạy tại máy bộ hoặc máy chủ từ xa)
* Trình duyệt web hiện đại (Chrome, Edge, Safari...)

## 6. Hướng dẫn Tải và Chạy dự án
**Bước 1: Clone dự án và Cài đặt thư viện**
```bash
git clone <url-repository>
cd hotel_management
npm install
```

**Bước 2: Cấu hình cơ sở dữ liệu**
1. Mở Microsoft SQL Server Management Studio (SSMS).
2. Chạy các script trong thư mục `sql/mysql/` để tạo Database và các Bảng.
3. Đổi tên file `.env.example` thành `.env` ở thư mục gốc của dự án và điền thông tin DB của bạn.

**Bước 3: Tạo tài khoản Admin mặc định**
Vì mật khẩu được mã hóa an toàn, bạn không thể thêm trực tiếp mật khẩu thô vào Database. Hãy chạy lệnh sau:
```bash
node src/utils/seed_admin.js
```

**Bước 4: Khởi chạy Server**
```bash
npm start
```
*(Server sẽ khởi chạy tại `http://localhost:3000`)*

**Bước 5: Trải nghiệm hệ thống**
Mở trình duyệt và truy cập: `http://localhost:3000`
- **Tài khoản Admin quản lý:** `admin@grandpalace.com`
- **Mật khẩu:** `admin123`

## 7. Trạng thái dự án
* **Hoàn thành (Completed)**
* Hệ thống đã hoàn thiện toàn bộ các tính năng từ Backend đến Frontend, đầy đủ Database, API và giao diện Dashboard. Có thể mang ra chạy thực tế hoặc bảo vệ đồ án môn học.
