const { poolPromise } = require('../config/db');

class BillModel {
    static async getBillsByGuest(guestId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('GuestID', guestId)
                // Lấy danh sách các hóa đơn của một khách hàng cụ thể kèm theo nội dung đánh giá (nếu có).
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
                      AND b.PaymentStatus != 'Cancelled'
                      AND b.TotalAmount > 0
                      AND (b.PaymentStatus = 'Paid' OR EXISTS (SELECT 1 FROM Booking WHERE Booking.InvoiceNo = b.InvoiceNo AND Booking.BookingStatus = 'CheckedOut'))
                    GROUP BY b.InvoiceNo, b.TotalAmount, b.PaymentDate, b.PaymentMode, b.PaymentStatus, r.Rating, r.Comment
                    ORDER BY b.InvoiceNo DESC
                `);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }

    static async getAllBills() {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                // Lấy danh sách toàn bộ các hóa đơn hợp lệ trên toàn hệ thống để hiển thị lên bảng quản lý hóa đơn của Lễ tân.
                .query(`
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
                    WHERE b.PaymentStatus != 'Cancelled'
                       AND b.TotalAmount > 0
                       AND (b.PaymentStatus = 'Paid' OR EXISTS (SELECT 1 FROM Booking WHERE Booking.InvoiceNo = b.InvoiceNo AND Booking.BookingStatus = 'CheckedOut'))
                    GROUP BY b.InvoiceNo, g.FirstName, g.LastName, b.TotalAmount, b.PaymentDate, b.PaymentMode, b.PaymentStatus
                    ORDER BY b.InvoiceNo DESC
                `);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }

    static async payInvoice(invoiceNo, paymentMode) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('InvoiceNo', invoiceNo)
                .input('PaymentMode', paymentMode)
                // Tính toán lại tổng tiền lần cuối, cập nhật trạng thái hóa đơn thành 'Paid' (Đã thanh toán) và chuyển tất cả các phòng trong đơn sang trạng thái 'CheckedOut'.
                .query(`
                    DECLARE @TotalAmount DECIMAL(18,2);
                    
                    SELECT @TotalAmount = SUM(rt.RoomPrice * CASE WHEN DATEDIFF(day, b.ArrivalDate, b.DepartureDate) = 0 THEN 1 ELSE DATEDIFF(day, b.ArrivalDate, b.DepartureDate) END)
                    FROM Booking b
                    INNER JOIN RoomType rt ON b.RoomType = rt.RoomType
                    WHERE b.InvoiceNo = @InvoiceNo;

                    IF @TotalAmount IS NULL SET @TotalAmount = 0;

                    UPDATE Bill 
                    SET TotalAmount = @TotalAmount, PaymentStatus = 'Paid', PaymentDate = GETDATE(), PaymentMode = @PaymentMode
                    WHERE InvoiceNo = @InvoiceNo;

                    UPDATE Booking 
                    SET BookingStatus = 'CheckedOut'
                    WHERE InvoiceNo = @InvoiceNo;
                `);
            
            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    static async getBillDetails(invoiceNo) {
        try {
            const pool = await poolPromise;
            
            // Get Bill info
            const billQuery = await pool.request()
                .input('InvoiceNo', invoiceNo)
                // Lấy thông tin chi tiết của một hóa đơn cụ thể (Thông tin thanh toán, thông tin khách hàng) để hiển thị chi tiết hoặc in hóa đơn.
                .query(`
                    SELECT b.InvoiceNo, b.TotalAmount, b.PaymentStatus, b.PaymentMode, b.PaymentDate,
                           g.FirstName + ' ' + g.LastName AS GuestName, g.PhoneNo, g.Email
                    FROM Bill b
                    INNER JOIN Guest g ON b.GuestID = g.GuestID
                    WHERE b.InvoiceNo = @InvoiceNo
                `);
                
            if (billQuery.recordset.length === 0) {
                return null;
            }
            
            const bill = billQuery.recordset[0];
            
            // Get Bookings attached to this Bill
            const bookingsQuery = await pool.request()
                .input('InvoiceNo', invoiceNo)
                // Lấy danh sách các phòng chi tiết nằm trong hóa đơn đang được xem để hiển thị trên biên lai.
                .query(`
                    SELECT BookingID, RoomType, RoomNo, ArrivalDate, DepartureDate, NumAdults, NumChildren
                    FROM Booking
                    WHERE InvoiceNo = @InvoiceNo
                `);
                
            bill.bookings = bookingsQuery.recordset;
            
            return bill;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = BillModel;
