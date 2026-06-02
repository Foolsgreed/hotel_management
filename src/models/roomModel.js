const { poolPromise } = require('../config/db');

class RoomModel {
    static async getAllRooms() {
        try {
            const pool = await poolPromise;
            // JOIN Room and RoomType to get complete info
            const result = await pool.request().query(`
                SELECT r.RoomNo, r.Occupancy, rt.RoomType, rt.RoomPrice, rt.RoomImg, rt.RoomDesc, h.HotelName
                FROM Room r
                INNER JOIN RoomType rt ON r.RoomType = rt.RoomType
                INNER JOIN Hotel h ON r.HotelCode = h.HotelCode
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
                .query(`
                    SELECT r.RoomType, rt.RoomPrice, rt.RoomImg, rt.RoomDesc, r.Occupancy, COUNT(r.RoomNo) as AvailableCount
                    FROM Room r
                    INNER JOIN RoomType rt ON r.RoomType = rt.RoomType
                    WHERE r.RoomNo NOT IN (
                        SELECT RoomNo FROM Booking 
                        WHERE (ArrivalDate < @DepartureDate AND DepartureDate > @ArrivalDate)
                    )
                    GROUP BY r.RoomType, rt.RoomPrice, rt.RoomImg, rt.RoomDesc, r.Occupancy
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
}

module.exports = RoomModel;
