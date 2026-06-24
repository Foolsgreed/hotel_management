const { poolPromise } = require('../config/db');

class ReviewModel {
    static async createReview(guestId, invoiceNo, rating, comment) {
        try {
            const pool = await poolPromise;

            // Check if already reviewed
            const checkQuery = await pool.request()
                .input('InvoiceNo', invoiceNo)
                // Kiểm tra xem Hóa đơn này đã được khách hàng đánh giá hay chưa để tránh tình trạng spam đánh giá (Mỗi hóa đơn chỉ được đánh giá 1 lần).
                .query(`SELECT * FROM Review WHERE InvoiceNo = @InvoiceNo`);

            if (checkQuery.recordset.length > 0) {
                throw new Error('You have already reviewed this invoice.');
            }

            const result = await pool.request()
                // Xác minh xem khách hàng đang đăng nhập có thực sự là chủ của Hóa đơn này không, và trạng thái đơn đã là 'CheckedOut' (Trả phòng) chưa thì mới cho phép đánh giá.
                .query(`
                    SELECT b.BookingStatus
                    FROM Booking b
                    WHERE b.InvoiceNo = @InvoiceNo AND b.GuestID = @GuestID
                `);
            // Lưu bài đánh giá của khách hàng vào hệ thống.
            await pool.request()
                .input('GuestID', guestId)
                .input('InvoiceNo', invoiceNo)
                .input('Rating', rating)
                .input('Comment', comment)
                .query(`
                    INSERT INTO Review (GuestID, InvoiceNo, Rating, Comment, ReviewDate)
                    OUTPUT INSERTED.ReviewID
                    VALUES (@GuestID, @InvoiceNo, @Rating, @Comment, GETDATE())
                `);

            // Tính toán lại điểm số trung bình của toàn bộ khách sạn
            await pool.request().query(`
                UPDATE Hotel 
                SET StarRating = (SELECT ROUND(AVG(CAST(Rating AS FLOAT)), 1) FROM Review)
            `);

            return result.recordset[0];
        } catch (error) {
            throw error;
        }
    }

    static async getLatestReviews(limit = 5) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('Limit', limit)
                // Lấy danh sách các bài đánh giá mới nhất
                .query(`
                    SELECT TOP (@Limit) r.ReviewID, r.Rating, r.Comment, r.ReviewDate, g.FirstName, g.LastName
                    FROM Review r
                    INNER JOIN Guest g ON r.GuestID = g.GuestID
                    ORDER BY r.ReviewDate DESC, r.ReviewID DESC
                `);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }

    static async getAverageRating() {
        try {
            const pool = await poolPromise;
            // Tính điểm đánh giá trung bình
            const result = await pool.request().query(`
                SELECT ROUND(AVG(CAST(Rating AS FLOAT)), 1) as AvgRating 
                FROM Review
            `);
            return result.recordset[0];
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ReviewModel;
