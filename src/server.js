require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const { poolPromise } = require('./config/db');

app.use(express.json()); // Для đọc được dữ liệu JSON gửi lên
app.use(express.urlencoded({ extended: true }));

// Phục vụ các file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, '../public')));

// Đăng ký API Routes
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