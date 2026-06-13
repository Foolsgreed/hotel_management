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

app.get('/test-db', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Hotel');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});