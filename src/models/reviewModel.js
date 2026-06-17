const { poolPromise } = require('../config/db');

class ReviewModel {
    static async createReview(guestId, invoiceNo, rating, comment) {
        try {
            const pool = await poolPromise;

            // Check if already reviewed
            const checkQuery = await pool.request()
                .input('InvoiceNo', invoiceNo)
                .query(`SELECT * FROM Review WHERE InvoiceNo = @InvoiceNo`);

            if (checkQuery.recordset.length > 0) {
                throw new Error('You have already reviewed this invoice.');
            }

            const result = await pool.request()
                .input('GuestID', guestId)
                .input('InvoiceNo', invoiceNo)
                .input('Rating', rating)
                .input('Comment', comment)
                .query(`
                    INSERT INTO Review (GuestID, InvoiceNo, Rating, Comment, ReviewDate)
                    OUTPUT INSERTED.ReviewID
                    VALUES (@GuestID, @InvoiceNo, @Rating, @Comment, GETDATE())
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
