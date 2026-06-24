const { poolPromise } = require('../config/db');

class BookingModel {
    static async getAllBookings() {
        try {
            const pool = await poolPromise;
            // Lấy danh sách toàn bộ các Đơn đặt phòng (Booking) kết hợp với thông tin khách (Guest) và phòng (Room). Nhóm lại theo Mã hóa đơn (InvoiceNo) để hiển thị gọn gàng trên bảng Quản lý.
            const result = await pool.request().query(`
                SELECT 
                    COALESCE(b.InvoiceNo, b.BookingID) AS BookingID, 
                    g.FirstName + ' ' + g.LastName AS GuestName, 
                    g.Email AS GuestEmail,
                    g.PhoneNo AS GuestPhone,
                    STRING_AGG(COALESCE(r.RoomType, b.RoomType) + COALESCE(' (' + b.RoomNo + ')', ' (Unassigned)'), ', ') AS RoomType, 
                    MIN(b.ArrivalDate) AS ArrivalDate, 
                    MAX(b.DepartureDate) AS DepartureDate, 
                    MAX(b.BookingStatus) AS BookingStatus,
                    MAX(b.NumAdults) AS NumAdults, 
                    MAX(b.NumChildren) AS NumChildren, 
                    MAX(b.SpecialReq) AS SpecialReq,
                    MAX(CAST(b.CancelReason AS VARCHAR(MAX))) AS CancelReason
                FROM Booking b
                INNER JOIN Guest g ON b.GuestID = g.GuestID
                LEFT JOIN Room r ON b.RoomNo = r.RoomNo
                GROUP BY 
                    COALESCE(b.InvoiceNo, b.BookingID), 
                    g.FirstName, 
                    g.LastName,
                    g.Email,
                    g.PhoneNo
                ORDER BY COALESCE(b.InvoiceNo, b.BookingID) DESC
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

    static async updateBookingStatus(invoiceNo, status, cancelReason = null) {
        try {
            const pool = await poolPromise;
            const transaction = pool.transaction();
            await transaction.begin();

            try {
                let updateQuery = `
                    UPDATE Booking
                    SET BookingStatus = @Status
                `;
                if (status === 'Cancelled' && cancelReason) {
                    updateQuery += `, CancelReason = @CancelReason `;
                }
                updateQuery += ` WHERE InvoiceNo = @InvoiceNo `;

                const request = transaction.request()
                    .input('InvoiceNo', invoiceNo)
                    .input('Status', status);

                if (status === 'Cancelled' && cancelReason) {
                    request.input('CancelReason', cancelReason);
                }

                const result = await request.query(updateQuery);

                if (status === 'CheckedOut') {
                    await transaction.request()
                        .input('InvoiceNo', invoiceNo)
                        .query(`
                            UPDATE Room
                            SET RoomStatus = 'Cleaning'
                            WHERE RoomNo IN (
                                SELECT RoomNo FROM Booking
                                WHERE InvoiceNo = @InvoiceNo AND RoomNo IS NOT NULL
                            )
                        `);
                } else if (status === 'Cancelled') {
                    await transaction.request()
                        .input('InvoiceNo', invoiceNo)
                        .query(`
                            UPDATE Room
                            SET RoomStatus = 'Available'
                            WHERE RoomNo IN (
                                SELECT RoomNo FROM Booking
                                WHERE InvoiceNo = @InvoiceNo AND RoomNo IS NOT NULL
                            )
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
            // Get stats for current month based on BookingDate
            // Thống kê số liệu tháng hiện tại: Tổng số lượng đơn, số đơn đã hủy (Cancelled) và số đơn thành công (CheckedOut) để vẽ biểu đồ Dashboard.
            const result = await pool.request().query(`
                SELECT 
                    COUNT(DISTINCT InvoiceNo) as TotalBookings,
                    COUNT(DISTINCT CASE WHEN BookingStatus = 'Cancelled' THEN InvoiceNo END) as Cancelled,
                    COUNT(DISTINCT CASE WHEN BookingStatus = 'CheckedOut' THEN InvoiceNo END) as CheckedOut
                FROM Booking
                WHERE MONTH(BookingDate) = MONTH(GETDATE()) 
                  AND YEAR(BookingDate) = YEAR(GETDATE())
            `);

            // Tính tổng doanh thu (TotalRevenue) từ tất cả các hóa đơn (Bill) có trạng thái đã thanh toán (Paid).
            const revenueResult = await pool.request().query(`
                SELECT SUM(TotalAmount) as TotalRevenue
                FROM Bill
                WHERE PaymentStatus = 'Paid'
            `);

            const row = result.recordset[0];
            const total = row.TotalBookings || 0;
            const cancelled = row.Cancelled || 0;
            const checkedOut = row.CheckedOut || 0;
            const rate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

            return {
                TotalBookings: total,
                Cancelled: cancelled,
                CheckedOut: checkedOut,
                CancellationRate: rate,
                TotalRevenue: revenueResult.recordset[0].TotalRevenue || 0
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
                // Tạo trước một Hóa đơn (Bill) rỗng với tổng tiền bằng 0 để lấy mã InvoiceNo tự tăng. Mã này dùng để gộp nhiều phòng khách đặt vào chung một hóa đơn.
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
                    const countQuery = await transaction.request()
                        .input('RoomType', part.type)
                        .input('ArrivalDate', arrivalDate)
                        .input('DepartureDate', departureDate)
                        .query(`
                            SELECT COUNT(*) as AvailableCount, MAX(HotelCode) as HotelCode 
                            FROM Room 
                            WHERE RoomType = @RoomType
                            AND RoomNo NOT IN (
                                SELECT RoomNo FROM Booking 
                                WHERE RoomNo IS NOT NULL
                                  AND ArrivalDate < @DepartureDate AND DepartureDate > @ArrivalDate
                                  AND BookingStatus != 'Cancelled'
                            )
                        `);

                    const availableCount = countQuery.recordset[0].AvailableCount;
                    if (availableCount < part.count) {
                        // We also need to subtract unassigned rooms of this type!
                        // Actually, a simpler way is to just let them book if there's inventory.
                        throw new Error(`Not enough ${part.type} rooms available.`);
                    }

                    const hotelCode = countQuery.recordset[0].HotelCode || 1;

                    // Additionally, count how many UNASSIGNED bookings exist for this room type during these dates
                    const unassignedQuery = await transaction.request()
                        .input('RoomType', part.type)
                        .input('ArrivalDate', arrivalDate)
                        .input('DepartureDate', departureDate)
                        .query(`
                            SELECT COUNT(*) as UnassignedCount
                            FROM Booking
                            WHERE RoomNo IS NULL AND RoomType = @RoomType
                              AND ArrivalDate < @DepartureDate AND DepartureDate > @ArrivalDate
                              AND BookingStatus != 'Cancelled'
                        `);

                    const unassignedCount = unassignedQuery.recordset[0].UnassignedCount;
                    if (availableCount - unassignedCount < part.count) {
                        throw new Error(`Not enough ${part.type} rooms available (some are pending assignment).`);
                    }

                    for (let i = 0; i < part.count; i++) {
                        await transaction.request()
                            .input('HotelCode', hotelCode)
                            .input('GuestID', guestID)
                            .input('RoomType', part.type)
                            .input('InvoiceNo', invoiceNo)
                            .input('ArrivalDate', arrivalDate)
                            .input('DepartureDate', departureDate)
                            .input('NumAdults', numAdults)
                            .input('NumChildren', numChildren)
                            .input('SpecialReq', specialReq || null)
                            // Thêm từng phòng khách đã chọn vào bảng Booking, tất cả đều được gán chung cái InvoiceNo vừa tạo phía trên. Trạng thái ban đầu là 'Pending' (chưa xếp số phòng cụ thể).
                            .query(`
                                INSERT INTO Booking (HotelCode, GuestID, RoomNo, RoomType, InvoiceNo, BookingDate, BookingTime, ArrivalDate, DepartureDate, NumAdults, NumChildren, SpecialReq, BookingStatus)
                                VALUES (@HotelCode, @GuestID, NULL, @RoomType, @InvoiceNo, CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME), @ArrivalDate, @DepartureDate, @NumAdults, @NumChildren, @SpecialReq, 'Pending')
                            `);
                    }
                }

                // 3. Update Bill TotalAmount
                // Cập nhật lại Tổng tiền (TotalAmount) của hóa đơn (Bill) sau khi đã nhân Giá phòng với Số đêm ở của toàn bộ các phòng nằm trong InvoiceNo đó.
                await transaction.request()
                    .input('InvoiceNo', invoiceNo)
                    .query(`
                        DECLARE @TotalAmount DECIMAL(18,2);
                        SELECT @TotalAmount = SUM(rt.RoomPrice * CASE WHEN DATEDIFF(day, b.ArrivalDate, b.DepartureDate) = 0 THEN 1 ELSE DATEDIFF(day, b.ArrivalDate, b.DepartureDate) END)
                        FROM Booking b
                        INNER JOIN RoomType rt ON b.RoomType = rt.RoomType
                        WHERE b.InvoiceNo = @InvoiceNo AND b.BookingStatus != 'Cancelled';

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

    static async createWalkinBookingDirect(guestID, roomNos, arrivalDate, departureDate, numAdults, numChildren, specialReq) {
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
                for (let roomNo of roomNos) {
                    const roomInfoQuery = await transaction.request()
                        .input('RoomNo', roomNo)
                        .input('ArrivalDate', arrivalDate)
                        .input('DepartureDate', departureDate)
                        .query(`
                            SELECT r.HotelCode, r.RoomType 
                            FROM Room r
                            WHERE r.RoomNo = @RoomNo
                            AND r.RoomNo NOT IN (
                                SELECT RoomNo FROM Booking 
                                WHERE RoomNo IS NOT NULL
                                  AND ArrivalDate < @DepartureDate AND DepartureDate > @ArrivalDate
                                  AND BookingStatus != 'Cancelled'
                            )
                        `);

                    if (roomInfoQuery.recordset.length === 0) {
                        throw new Error(`Room ${roomNo} is not available for the selected dates.`);
                    }

                    const roomInfo = roomInfoQuery.recordset[0];

                    await transaction.request()
                        .input('HotelCode', roomInfo.HotelCode)
                        .input('GuestID', guestID)
                        .input('RoomNo', roomNo)
                        .input('RoomType', roomInfo.RoomType)
                        .input('InvoiceNo', invoiceNo)
                        .input('ArrivalDate', arrivalDate)
                        .input('DepartureDate', departureDate)
                        .input('NumAdults', numAdults)
                        .input('NumChildren', numChildren)
                        .input('SpecialReq', specialReq || '')
                        .query(`
                            INSERT INTO Booking (HotelCode, GuestID, RoomNo, RoomType, InvoiceNo, BookingDate, BookingTime, ArrivalDate, DepartureDate, NumAdults, NumChildren, BookingStatus, SpecialReq)
                            VALUES (@HotelCode, @GuestID, @RoomNo, @RoomType, @InvoiceNo, CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME), @ArrivalDate, @DepartureDate, @NumAdults, @NumChildren, 'CheckedIn', @SpecialReq)
                        `);
                }

                // 3. Update Bill TotalAmount
                await transaction.request()
                    .input('InvoiceNo', invoiceNo)
                    .query(`
                        DECLARE @TotalAmount DECIMAL(18,2);
                        SELECT @TotalAmount = SUM(rt.RoomPrice * CASE WHEN DATEDIFF(day, b.ArrivalDate, b.DepartureDate) = 0 THEN 1 ELSE DATEDIFF(day, b.ArrivalDate, b.DepartureDate) END)
                        FROM Booking b
                        INNER JOIN RoomType rt ON b.RoomType = rt.RoomType
                        WHERE b.InvoiceNo = @InvoiceNo AND b.BookingStatus != 'Cancelled';

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
                    SELECT b.BookingID, b.RoomNo, COALESCE(r.RoomType, b.RoomType) AS RoomType, b.ArrivalDate, b.DepartureDate, b.BookingStatus, b.BookingDate, b.InvoiceNo, bill.PaymentStatus, bill.TotalAmount
                    FROM Booking b
                    LEFT JOIN Room r ON b.RoomNo = r.RoomNo
                    LEFT JOIN Bill bill ON b.InvoiceNo = bill.InvoiceNo
                    WHERE b.GuestID = @GuestID
                    ORDER BY b.InvoiceNo DESC, b.BookingID DESC
                `);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }

    static async cancelBooking(bookingId, guestId, cancelReason = null) {
        try {
            const pool = await poolPromise;
            const transaction = pool.transaction();
            await transaction.begin();

            try {
                // Update Booking status
                const updateRes = await transaction.request()
                    .input('BookingID', bookingId)
                    .input('GuestID', guestId)
                    .input('CancelReason', cancelReason)
                    .query(`
                        UPDATE Booking
                        SET BookingStatus = 'Cancelled', CancelReason = @CancelReason
                        WHERE BookingID = @BookingID 
                          AND GuestID = @GuestID 
                          AND (BookingStatus IS NULL OR (BookingStatus NOT IN ('Cancelled', 'CheckedIn', 'CheckedOut')))
                    `);

                if (updateRes.rowsAffected[0] === 0) {
                    await transaction.rollback();
                    return false;
                }

                // Get InvoiceNo
                const invoiceRes = await transaction.request()
                    .input('BookingID', bookingId)
                    .query(`SELECT InvoiceNo FROM Booking WHERE BookingID = @BookingID`);
                const invoiceNo = invoiceRes.recordset[0].InvoiceNo;

                // Recalculate Bill
                await transaction.request()
                    .input('InvoiceNo', invoiceNo)
                    .query(`
                        DECLARE @TotalAmount DECIMAL(18,2);
                        SELECT @TotalAmount = SUM(rt.RoomPrice * CASE WHEN DATEDIFF(day, b.ArrivalDate, b.DepartureDate) = 0 THEN 1 ELSE DATEDIFF(day, b.ArrivalDate, b.DepartureDate) END)
                        FROM Booking b
                        INNER JOIN RoomType rt ON b.RoomType = rt.RoomType
                        WHERE b.InvoiceNo = @InvoiceNo AND b.BookingStatus != 'Cancelled';

                        IF @TotalAmount IS NULL SET @TotalAmount = 0;

                        UPDATE Bill 
                        SET TotalAmount = @TotalAmount,
                            PaymentStatus = CASE WHEN @TotalAmount = 0 THEN 'Cancelled' ELSE PaymentStatus END
                        WHERE InvoiceNo = @InvoiceNo;
                    `);

                // Release Room
                await transaction.request()
                    .input('BookingID', bookingId)
                    .query(`
                        UPDATE Room
                        SET RoomStatus = 'Available'
                        WHERE RoomNo = (SELECT RoomNo FROM Booking WHERE BookingID = @BookingID)
                    `);

                await transaction.commit();
                return true;
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        } catch (error) {
            throw error;
        }
    }

    static async getBookingDetailsByInvoice(invoiceNo) {
        try {
            const pool = await poolPromise;
            // Get all bookings in this invoice
            const bookingsResult = await pool.request()
                .input('InvoiceNo', invoiceNo)
                .query(`
                    SELECT b.BookingID, b.RoomNo, b.RoomType, b.ArrivalDate, b.DepartureDate, b.BookingStatus, b.CancelReason
                    FROM Booking b
                    WHERE b.InvoiceNo = @InvoiceNo
                `);
            const bookings = bookingsResult.recordset;

            if (bookings.length === 0) return { bookings: [], availableRooms: {} };

            // Find available rooms for each distinct RoomType + date range combination
            // For simplicity, we just fetch available rooms for the dates of the first booking (usually they are all the same)
            const arrivalDate = bookings[0].ArrivalDate;
            const departureDate = bookings[0].DepartureDate;

            const availableRoomsQuery = await pool.request()
                .input('ArrivalDate', arrivalDate)
                .input('DepartureDate', departureDate)
                .query(`
                    SELECT RoomNo, RoomType
                    FROM Room
                    WHERE (RoomStatus = 'Available' OR RoomStatus IS NULL)
                      AND RoomNo NOT IN (
                          SELECT RoomNo FROM Booking 
                          WHERE RoomNo IS NOT NULL
                            AND ArrivalDate < @DepartureDate AND DepartureDate > @ArrivalDate
                            AND BookingStatus != 'Cancelled'
                      )
                `);

            const availableRooms = {};
            availableRoomsQuery.recordset.forEach(r => {
                if (!availableRooms[r.RoomType]) availableRooms[r.RoomType] = [];
                availableRooms[r.RoomType].push(r.RoomNo);
            });

            return {
                bookings,
                availableRooms
            };
        } catch (error) {
            throw error;
        }
    }

    static async checkInBooking(invoiceNo, assignments) {
        try {
            const pool = await poolPromise;
            const transaction = pool.transaction();
            await transaction.begin();

            try {
                // assignments is an array: [{ bookingId: 123, roomNo: '101' }, ...]
                for (let assignment of assignments) {
                    const roomTypeRes = await transaction.request()
                        .input('RoomNo', assignment.roomNo)
                        .query(`SELECT RoomType FROM Room WHERE RoomNo = @RoomNo`);

                    const newRoomType = roomTypeRes.recordset[0] ? roomTypeRes.recordset[0].RoomType : null;

                    const updateQuery = newRoomType
                        ? `UPDATE Booking SET RoomNo = @RoomNo, RoomType = @RoomType WHERE BookingID = @BookingID`
                        : `UPDATE Booking SET RoomNo = @RoomNo WHERE BookingID = @BookingID`;

                    const req = transaction.request()
                        .input('BookingID', assignment.bookingId)
                        .input('RoomNo', assignment.roomNo);

                    if (newRoomType) req.input('RoomType', newRoomType);

                    await req.query(updateQuery);
                }

                // Update Booking Status
                await transaction.request()
                    .input('InvoiceNo', invoiceNo)
                    .query(`
                        UPDATE Booking
                        SET BookingStatus = 'CheckedIn'
                        WHERE InvoiceNo = @InvoiceNo
                    `);

                // Update Room Status
                await transaction.request()
                    .input('InvoiceNo', invoiceNo)
                    .query(`
                        UPDATE Room
                        SET RoomStatus = 'Occupied'
                        WHERE RoomNo IN (
                            SELECT RoomNo FROM Booking
                            WHERE InvoiceNo = @InvoiceNo AND RoomNo IS NOT NULL
                        )
                    `);

                // Recalculate Bill TotalAmount for room type changes
                await transaction.request()
                    .input('InvoiceNo', invoiceNo)
                    .query(`
                        DECLARE @TotalAmount DECIMAL(18,2);
                        SELECT @TotalAmount = SUM(rt.RoomPrice * CASE WHEN DATEDIFF(day, b.ArrivalDate, b.DepartureDate) = 0 THEN 1 ELSE DATEDIFF(day, b.ArrivalDate, b.DepartureDate) END)
                        FROM Booking b
                        INNER JOIN RoomType rt ON b.RoomType = rt.RoomType
                        WHERE b.InvoiceNo = @InvoiceNo AND b.BookingStatus != 'Cancelled';

                        IF @TotalAmount IS NULL SET @TotalAmount = 0;

                        UPDATE Bill 
                        SET TotalAmount = @TotalAmount
                        WHERE InvoiceNo = @InvoiceNo;
                    `);

                await transaction.commit();
                return true;
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports = BookingModel;
