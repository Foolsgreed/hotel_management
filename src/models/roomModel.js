const { poolPromise } = require('../config/db');

class RoomModel {
    static async getAllRooms() {
        try {
            const pool = await poolPromise;
            // Lấy danh sách toàn bộ phòng kèm theo loại phòng, giá, hình ảnh và trạng thái hiện tại (Dùng để hiển thị danh sách phòng chung).
            const result = await pool.request().query(`
                SELECT r.RoomNo, r.Occupancy, rt.RoomType, rt.RoomPrice, rt.RoomImg, rt.RoomDesc, h.HotelName, r.RoomStatus
                FROM Room r
                INNER JOIN RoomType rt ON r.RoomType = rt.RoomType
                INNER JOIN Hotel h ON r.HotelCode = h.HotelCode
            `);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }

    static async getAvailableSpecificRooms(arrivalDate, departureDate) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('ArrivalDate', arrivalDate)
                .input('DepartureDate', departureDate)
                // Tìm danh sách các mã phòng (RoomNo) cụ thể còn trống trong một khoảng thời gian (loại trừ các phòng đã được đặt hoặc đang bảo trì).
                .query(`
                    SELECT r.RoomNo, r.RoomType, rt.RoomPrice, r.Occupancy
                    FROM Room r
                    INNER JOIN RoomType rt ON r.RoomType = rt.RoomType
                    WHERE (r.RoomStatus IS NULL OR r.RoomStatus != 'Maintenance')
                    AND r.RoomNo NOT IN (
                        SELECT RoomNo FROM Booking 
                        WHERE RoomNo IS NOT NULL 
                        AND BookingStatus != 'Cancelled'
                        AND (ArrivalDate < @DepartureDate AND DepartureDate > @ArrivalDate)
                    )
                    ORDER BY r.RoomNo ASC
                `);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }

    static async searchRooms(arrivalDate, departureDate, guests, numRooms) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('ArrivalDate', arrivalDate)
                .input('DepartureDate', departureDate)
                // Truy vấn cốt lõi trang chủ. Gom nhóm và đếm số lượng phòng TRỐNG của từng Hạng Phòng (RoomType) trong thời gian khách yêu cầu, loại trừ các phòng đã có người đặt hoặc đang bảo trì.
                .query(`
                    SELECT r.RoomType, rt.RoomPrice, rt.RoomImg, rt.RoomDesc, r.Occupancy, 
                           (COUNT(r.RoomNo) - ISNULL(MAX(b.BookedCount), 0)) as AvailableCount
                    FROM Room r
                    INNER JOIN RoomType rt ON r.RoomType = rt.RoomType
                    LEFT JOIN (
                        SELECT COALESCE(bk.RoomType, rm.RoomType) as RoomType, COUNT(*) as BookedCount
                        FROM Booking bk
                        LEFT JOIN Room rm ON bk.RoomNo = rm.RoomNo
                        WHERE (bk.ArrivalDate < @DepartureDate AND bk.DepartureDate > @ArrivalDate)
                          AND bk.BookingStatus != 'Cancelled'
                        GROUP BY COALESCE(bk.RoomType, rm.RoomType)
                    ) b ON r.RoomType = b.RoomType
                    WHERE (r.RoomStatus IS NULL OR r.RoomStatus != 'Maintenance')
                    GROUP BY r.RoomType, rt.RoomPrice, rt.RoomImg, rt.RoomDesc, r.Occupancy
                    HAVING (COUNT(r.RoomNo) - ISNULL(MAX(b.BookedCount), 0)) > 0
                `);

            const availableRooms = result.recordset;
            let combinations = [];

            function backtrack(index, currentCombo, currentOccupancy, currentPrice) {
                if (currentOccupancy >= guests) {
                    combinations.push({
                        rooms: currentCombo.map(r => ({ ...r })),
                        totalOccupancy: currentOccupancy,
                        totalPrice: currentPrice
                    });
                    return;
                }

                if (index >= availableRooms.length) return;

                const room = availableRooms[index];
                const currentTotalRooms = currentCombo.reduce((sum, r) => sum + r.count, 0);
                if (currentTotalRooms >= 5) return;

                for (let count = 0; count <= room.AvailableCount; count++) {
                    if (currentTotalRooms + count > 5) break;

                    if (count > 0) {
                        currentCombo.push({ ...room, count });
                    }

                    backtrack(index + 1, currentCombo, currentOccupancy + (count * room.Occupancy), currentPrice + (count * room.RoomPrice));

                    if (count > 0) {
                        currentCombo.pop();
                    }
                }
            }

            backtrack(0, [], 0, 0);

            // Filter out non-minimal combinations
            combinations = combinations.filter(combo => {
                for (let r of combo.rooms) {
                    if (combo.totalOccupancy - r.Occupancy >= guests) {
                        return false; // Can drop a room and still satisfy guests
                    }
                }
                return true;
            });

            combinations.sort((a, b) => a.totalPrice - b.totalPrice);

            return combinations.slice(0, 10).map(c => ({
                isCombo: true,
                comboString: c.rooms.map(r => r.RoomType + ':' + r.count).join(','),
                comboName: c.rooms.map(r => r.count + ' x ' + r.RoomType).join(' + '),
                RoomType: c.rooms[0].RoomType, // Fallback
                RoomDesc: c.rooms.length > 1 ? 'Gói kết hợp nhiều phòng để đáp ứng đủ số lượng khách của bạn với chi phí tối ưu nhất.' : c.rooms[0].RoomDesc,
                RoomImg: c.rooms[0].RoomImg,
                totalPrice: c.totalPrice,
                Occupancy: c.totalOccupancy,
                roomsNeeded: 1,
                AvailableCount: 99
            }));
        } catch (error) {
            throw error;
        }
    }
    static async getAllRoomsWithStatus() {
        try {
            const pool = await poolPromise;
            // Lấy danh sách tất cả các phòng để hiển thị trên bảng lưới quản lý (Dashboard), bao gồm cả số tầng và trạng thái phòng hiện tại.
            const result = await pool.request().query(`
                SELECT r.RoomNo, r.RoomType, r.Occupancy, r.FloorNo, ISNULL(r.RoomStatus, 'Available') AS RoomStatus, rt.RoomPrice
                FROM Room r
                INNER JOIN RoomType rt ON r.RoomType = rt.RoomType
                ORDER BY r.FloorNo, r.RoomNo
            `);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }

    static async updateRoomStatus(roomNo, status) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('RoomNo', roomNo)
                .input('Status', status)
                // Cập nhật trạng thái bảo trì/sẵn sàng của một phòng cụ thể (Hỗ trợ nghiệp vụ dọn phòng / bảo trì).
                .query(`
                    UPDATE Room SET RoomStatus = @Status WHERE RoomNo = @RoomNo
                `);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            throw error;
        }
    }
    static async getRoomTypes() {
        try {
            const pool = await poolPromise;
            // Lấy danh sách các loại phòng (RoomType) và giá tiền (RoomPrice) hiện tại để load vào giao diện quản lý giá.
            const result = await pool.request()
                .query(`SELECT RoomType, RoomPrice FROM RoomType`);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }

    static async updateRoomPrice(type, price) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('RoomType', type)
                .input('Price', price)
                // Cập nhật giá mới cho một loại phòng cụ thể (Dành cho chức năng quản lý giá của Admin).
                .query(`
                    UPDATE RoomType SET RoomPrice = @Price WHERE RoomType = @RoomType
                `);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = RoomModel;
