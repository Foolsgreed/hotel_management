const { poolPromise } = require('../config/db');

class BillModel {
    static async getBillsByGuest(guestId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('GuestID', guestId)
                .query(`
                    SELECT 
                        b.InvoiceNo, 
                        b.TotalAmount, 
                        b.PaymentDate, 
                        b.PaymentMode, 
                        b.PaymentStatus,
                        STRING_AGG(bk.RoomNo, ', ') as RoomNo,
                        r.Rating,
                        r.Comment
                    FROM Bill b
                    INNER JOIN Booking bk ON b.InvoiceNo = bk.InvoiceNo
                    LEFT JOIN Review r ON b.InvoiceNo = r.InvoiceNo
                    WHERE b.GuestID = @GuestID
                    GROUP BY b.InvoiceNo, b.TotalAmount, b.PaymentDate, b.PaymentMode, b.PaymentStatus, r.Rating, r.Comment
                    ORDER BY b.InvoiceNo DESC
                `);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }

    static async payInvoice(invoiceNo, guestId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('InvoiceNo', invoiceNo)
                .input('GuestID', guestId)
                .query(`
                    DECLARE @TotalAmount DECIMAL(18,2);
                    
                    SELECT @TotalAmount = SUM(rt.RoomPrice * CASE WHEN DATEDIFF(day, b.ArrivalDate, b.DepartureDate) = 0 THEN 1 ELSE DATEDIFF(day, b.ArrivalDate, b.DepartureDate) END)
                    FROM Booking b
                    INNER JOIN Room r ON b.RoomNo = r.RoomNo
                    INNER JOIN RoomType rt ON r.RoomType = rt.RoomType
                    WHERE b.InvoiceNo = @InvoiceNo AND b.GuestID = @GuestID;

                    IF @TotalAmount IS NULL SET @TotalAmount = 0;

                    UPDATE Bill 
                    SET TotalAmount = @TotalAmount, PaymentStatus = 'Paid', PaymentDate = GETDATE(), PaymentMode = 'Credit Card'
                    WHERE InvoiceNo = @InvoiceNo AND GuestID = @GuestID;

                    UPDATE Booking 
                    SET BookingStatus = 'CheckedOut'
                    WHERE InvoiceNo = @InvoiceNo AND GuestID = @GuestID;
                `);
            
            return { success: true };
        } catch (error) {
            throw error;
        }
    }
    static async getAllBills() {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query(`
                SELECT 
                    b.InvoiceNo,
                    g.FirstName + ' ' + g.LastName AS GuestName,
                    b.TotalAmount,
                    b.PaymentDate,
                    b.PaymentMode,
                    b.PaymentStatus,
                    STRING_AGG(bk.RoomNo, ', ') as RoomNo
                FROM Bill b
                INNER JOIN Guest g ON b.GuestID = g.GuestID
                LEFT JOIN Booking bk ON b.InvoiceNo = bk.InvoiceNo
                GROUP BY b.InvoiceNo, g.FirstName, g.LastName, b.TotalAmount, b.PaymentDate, b.PaymentMode, b.PaymentStatus
                ORDER BY b.InvoiceNo DESC
            `);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = BillModel;
