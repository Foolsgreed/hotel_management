require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// Khởi tạo sẵn kết nối DB để Vai trò 1 (Database) có thể test
const { poolPromise } = require('./config/db');

app.use(express.json()); // Để đọc được dữ liệu JSON gửi lên
app.use(express.urlencoded({ extended: true }));

// Phục vụ các file tĩnh trong thư mục public (RẤT QUAN TRỌNG: Giữ để team xem được UI)
app.use(express.static(path.join(__dirname, '../public')));

// ==============================================================================
// TODO: VAI TRÒ 2 (BACKEND) SẼ KHÔI PHỤC (UNCOMMENT) VÀ VIẾT TIẾP CODE Ở KHU VỰC NÀY
// ==============================================================================
const roomRoutes = require('./routes/roomRoutes');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

app.use('/api/rooms', roomRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
// ==============================================================================

// API test nhanh xem cấu hình kết nối DB trong db.js đã chuẩn chưa
app.get('/test-db', async (req, res) => {
    try {
        const pool = await poolPromise;
        // Đã sửa lại query thành lệnh SELECT cơ bản nhất để không phụ thuộc vào bảng Hotel.
        // Vai trò 1 tự tạo bảng xong thì tự vào đây đổi lại để test.
        const result = await pool.request().query('SELECT 1 AS DatabaseConnectionStatus');
        res.json({ message: "Kết nối Database thành công!", data: result.recordset });
    } catch (err) {
        res.status(500).send("Lỗi kết nối DB: " + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});