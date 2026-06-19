const { poolPromise } = require('../config/db');

class BookingModel {
    static async getAllBookings() {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query(`
                SELECT 
                    b.InvoiceNo AS BookingID, 
                    g.FirstName + ' ' + g.LastName AS GuestName, 
                    g.Email AS GuestEmail,
                    g.PhoneNo AS GuestPhone,
                    STRING_AGG(r.RoomType + ' (' + b.RoomNo + ')', ', ') AS RoomType, 
                    b.ArrivalDate, 
                    b.DepartureDate, 
                    b.BookingStatus,
                    MAX(b.NumAdults) AS NumAdults, 
                    MAX(b.NumChildren) AS NumChildren, 
                    MAX(b.SpecialReq) AS SpecialReq
                FROM Booking b
                INNER JOIN Guest g ON b.GuestID = g.GuestID
                INNER JOIN Room r ON b.RoomNo = r.RoomNo
                GROUP BY b.InvoiceNo, g.FirstName, g.LastName, g.Email, g.PhoneNo, b.ArrivalDate, b.DepartureDate, b.BookingStatus
                ORDER BY b.InvoiceNo DESC
            `);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }

    static async createBooking(guestID, roomType, arrivalDate, departureDate) {
        try {
            const pool = await poolPromise;
            
            // Find a room of this type that is NOT booked during these dates
            const roomQuery = await pool.request()
                .input('RoomType', roomType)
                .input('ArrivalDate', arrivalDate)
                .input('DepartureDate', departureDate)
                .query(`
                    SELECT TOP 1 RoomNo, HotelCode 
                    FROM Room 
                    WHERE RoomType = @RoomType
                    AND RoomNo NOT IN (
                        SELECT RoomNo FROM Booking 
                        WHERE ArrivalDate < @DepartureDate AND DepartureDate > @ArrivalDate
                    )
                `);

            if (roomQuery.recordset.length === 0) {
                throw new Error('No rooms available for this type during the selected dates.');
            }

            const roomNo = roomQuery.recordset[0].RoomNo;
            const hotelCode = roomQuery.recordset[0].HotelCode;

            // Insert Booking
            const result = await pool.request()
                .input('HotelCode', hotelCode)
                .input('GuestID', guestID)
                .input('RoomNo', roomNo)
                .input('BookingDate', new Date())
                .input('ArrivalDate', arrivalDate)
                .input('DepartureDate', departureDate)
                .query(`
                    INSERT INTO Booking (HotelCode, GuestID, RoomNo, BookingDate, ArrivalDate, DepartureDate)
                    OUTPUT INSERTED.BookingID
                    VALUES (@HotelCode, @GuestID, @RoomNo, @BookingDate, @ArrivalDate, @DepartureDate)
                `);

            return result.recordset[0];
        } catch (error) {
            throw error;
        }
    }

    static async updateBookingStatus(invoiceNo, status) {
        try {
            const pool = await poolPromise;
            
            // Start a transaction since we are updating both Booking and Room tables
            const transaction = pool.transaction();
            await transaction.begin();
            
            try {
                // Update Bookings by InvoiceNo
                const result = await transaction.request()
                    .input('InvoiceNo', invoiceNo)
                    .input('Status', status)
                    .query(`
                        UPDATE Booking
                        SET BookingStatus = @Status
                        WHERE InvoiceNo = @InvoiceNo
                    `);
                    
                // Auto-update Room Status based on Check-in/Check-out/Cancel
                let roomStatus = null;
                if (status === 'CheckedIn') roomStatus = 'Occupied';
                else if (status === 'CheckedOut') roomStatus = 'Cleaning';
                else if (status === 'Cancelled') roomStatus = 'Available';
                
                if (roomStatus) {
                    await transaction.request()
                        .input('InvoiceNo', invoiceNo)
                        .input('RoomStatus', roomStatus)
                        .query(`
                            UPDATE Room 
                            SET RoomStatus = @RoomStatus 
                            WHERE RoomNo IN (SELECT RoomNo FROM Booking WHERE InvoiceNo = @InvoiceNo)
                        `);
                }
                
                await transaction.commit();
                return result.rowsAffected[0] > 0;
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        } catch (error) {
            throw error;
        }
    }

    static async getBookingStatistics() {
        try {
            const pool = await poolPromise;
            // Get stats for current month as an example.
            const result = await pool.request().query(`
                SELECT 
                    COUNT(DISTINCT InvoiceNo) as TotalBookings,
                    SUM(CASE WHEN BookingStatus = 'Cancelled' THEN 1 ELSE 0 END) as Cancelled,
                    SUM(CASE WHEN BookingStatus = 'CheckedIn' THEN 1 ELSE 0 END) as CheckedIn,
                    SUM(CASE WHEN BookingStatus = 'CheckedOut' THEN 1 ELSE 0 END) as CheckedOut,
                    (SELECT ISNULL(SUM(TotalAmount), 0) FROM Bill 
                     WHERE MONTH(PaymentDate) = MONTH(GETDATE()) 
                       AND YEAR(PaymentDate) = YEAR(GETDATE()) 
                       AND PaymentStatus = 'Paid') as TotalRevenue
                FROM Booking
                WHERE MONTH(BookingDate) = MONTH(GETDATE()) 
                  AND YEAR(BookingDate) = YEAR(GETDATE())
            `);
            const row = result.recordset[0];
            const total = row.TotalBookings || 0;
            const cancelled = row.Cancelled || 0;
            const rate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
            
            return {
                TotalBookings: total,
                Cancelled: cancelled,
                CheckedIn: row.CheckedIn || 0,
                CheckedOut: row.CheckedOut || 0,
                CancellationRate: rate,
                TotalRevenue: row.TotalRevenue || 0
            };
        } catch (error) {
            throw error;
        }
    }

    static async createBookingOrder(guestID, comboParts, arrivalDate, departureDate, numAdults, numChildren, specialReq) {
        try {
            const pool = await poolPromise;
            const transaction = pool.transaction();
            await transaction.begin();

            try {
                // 1. Create Bill immediately to get InvoiceNo
                const billResult = await transaction.request()
                    .input('GuestID', guestID)
                    .query(`
                        INSERT INTO Bill (GuestID, TotalAmount, PaymentStatus)
                        OUTPUT INSERTED.InvoiceNo
                        VALUES (@GuestID, 0, 'Unpaid')
                    `);
                const invoiceNo = billResult.recordset[0].InvoiceNo;

                // 2. Iterate and create bookings for each room requested
                for (let part of comboParts) {
                    for (let i = 0; i < part.count; i++) {
                        const roomQuery = await transaction.request()
                            .input('RoomType', part.type)
                            .input('ArrivalDate', arrivalDate)
                            .input('DepartureDate', departureDate)
                            .query(`
                                SELECT TOP 1 RoomNo, HotelCode 
                                FROM Room 
                                WHERE RoomType = @RoomType
                                AND RoomNo NOT IN (
                                    SELECT RoomNo FROM Booking 
                                    WHERE ArrivalDate < @DepartureDate AND DepartureDate > @ArrivalDate
                                      AND BookingStatus != 'Cancelled'
                                )
                            `);

                        if (roomQuery.recordset.length === 0) {
                            throw new Error(`Not enough ${part.type} rooms available.`);
                        }

                        const roomNo = roomQuery.recordset[0].RoomNo;
                        const hotelCode = roomQuery.recordset[0].HotelCode;

                        await transaction.request()
                            .input('HotelCode', hotelCode)
                            .input('GuestID', guestID)
                            .input('RoomNo', roomNo)
                            .input('InvoiceNo', invoiceNo)
                            .input('ArrivalDate', arrivalDate)
                            .input('DepartureDate', departureDate)
                            .input('NumAdults', numAdults)
                            .input('NumChildren', numChildren)
                            .input('SpecialReq', specialReq || null)
                            .query(`
                                INSERT INTO Booking (HotelCode, GuestID, RoomNo, InvoiceNo, BookingDate, BookingTime, ArrivalDate, DepartureDate, NumAdults, NumChildren, SpecialReq, BookingStatus)
                                VALUES (@HotelCode, @GuestID, @RoomNo, @InvoiceNo, CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME), @ArrivalDate, @DepartureDate, @NumAdults, @NumChildren, @SpecialReq, 'Pending')
                            `);
                    }
                }

                // 3. Update Bill TotalAmount
                await transaction.request()
                    .input('InvoiceNo', invoiceNo)
                    .query(`
                        DECLARE @TotalAmount DECIMAL(18,2);
                        SELECT @TotalAmount = SUM(rt.RoomPrice * CASE WHEN DATEDIFF(day, b.ArrivalDate, b.DepartureDate) = 0 THEN 1 ELSE DATEDIFF(day, b.ArrivalDate, b.DepartureDate) END)
                        FROM Booking b
                        INNER JOIN Room r ON b.RoomNo = r.RoomNo
                        INNER JOIN RoomType rt ON r.RoomType = rt.RoomType
                        WHERE b.InvoiceNo = @InvoiceNo;

                        IF @TotalAmount IS NULL SET @TotalAmount = 0;

                        UPDATE Bill 
                        SET TotalAmount = @TotalAmount
                        WHERE InvoiceNo = @InvoiceNo;
                    `);

                await transaction.commit();
                return invoiceNo;
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        } catch (error) {
            throw error;
        }
    }

    static async getBookingsByGuest(guestId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('GuestID', guestId)
                .query(`
                    SELECT b.BookingID, b.RoomNo, r.RoomType, b.ArrivalDate, b.DepartureDate, b.BookingStatus, b.BookingDate, b.InvoiceNo, bill.PaymentStatus, bill.TotalAmount
                    FROM Booking b
                    INNER JOIN Room r ON b.RoomNo = r.RoomNo
                    LEFT JOIN Bill bill ON b.InvoiceNo = bill.InvoiceNo
                    WHERE b.GuestID = @GuestID
                    ORDER BY b.ArrivalDate DESC, b.BookingID DESC
                `);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }

    static async cancelBooking(bookingId, guestId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('BookingID', bookingId)
                .input('GuestID', guestId)
                .query(`
                    UPDATE Booking
                    SET BookingStatus = 'Cancelled'
                    WHERE BookingID = @BookingID 
                      AND GuestID = @GuestID 
                      AND (BookingStatus IS NULL OR (BookingStatus NOT IN ('Cancelled', 'CheckedIn', 'CheckedOut')))
                `);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = BookingModel;
