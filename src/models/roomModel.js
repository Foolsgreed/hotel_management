const { poolPromise } = require('../config/db');

class RoomModel {
    static async getAllRooms() {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query(`
                SELECT r.RoomNo, r.Occupancy, rt.RoomType, rt.RoomPrice, rt.RoomDesc, rt.RoomImg
                FROM Room r
                JOIN RoomType rt ON r.RoomType = rt.RoomType
            `);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = RoomModel;
