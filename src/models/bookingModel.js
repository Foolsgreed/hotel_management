const { poolPromise } = require('../config/db');

class BookingModel {
    static async getAllBookings() {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query(`
                SELECT b.BookingID, g.FirstName + ' ' + g.LastName AS GuestName, 
                       b.RoomNo, r.RoomType, b.ArrivalDate, b.DepartureDate, b.BookingStatus
                FROM Booking b
                INNER JOIN Guest g ON b.GuestID = g.GuestID
                INNER JOIN Room r ON b.RoomNo = r.RoomNo
                ORDER BY b.BookingID DESC
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

    static async updateBookingStatus(bookingId, status) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('BookingID', bookingId)
                .input('Status', status)
                .query(`
                    UPDATE Booking
                    SET BookingStatus = @Status
                    WHERE BookingID = @BookingID
                `);
            return result.rowsAffected[0] > 0;
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
                    COUNT(*) as TotalBookings,
                    SUM(CASE WHEN BookingStatus = 'Cancelled' THEN 1 ELSE 0 END) as Cancelled,
                    SUM(CASE WHEN BookingStatus = 'CheckedIn' THEN 1 ELSE 0 END) as CheckedIn,
                    SUM(CASE WHEN BookingStatus = 'CheckedOut' THEN 1 ELSE 0 END) as CheckedOut
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
                CancellationRate: rate
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = BookingModel;
