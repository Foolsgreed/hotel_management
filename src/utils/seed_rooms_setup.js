require('dotenv').config();
const { poolPromise } = require('../config/db');

async function setupSmartRooms() {
    try {
        const pool = await poolPromise;
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            console.log("Cleaning up old bookings and rooms...");
            await transaction.request().query('DELETE FROM Review');
            await transaction.request().query('ALTER TABLE Guest NOCHECK CONSTRAINT ALL');
            await transaction.request().query('DELETE FROM Booking');
            await transaction.request().query('DELETE FROM Bill');
            await transaction.request().query('ALTER TABLE Guest CHECK CONSTRAINT ALL');
            await transaction.request().query('DELETE FROM Room');

            console.log("Seeding exactly 20 Rooms...");
            const hotelResult = await transaction.request().query('SELECT TOP 1 HotelCode FROM Hotel');
            const hotelCode = hotelResult.recordset[0]?.HotelCode || 1;

            const roomDefs = [];
            for (let i = 1; i <= 6; i++) roomDefs.push({ no: `10${i}`, type: 'Standard Twin', occ: 2, floor: 1 });
            for (let i = 1; i <= 6; i++) roomDefs.push({ no: `20${i}`, type: 'Standard Double', occ: 4, floor: 2 });
            for (let i = 1; i <= 6; i++) roomDefs.push({ no: `30${i}`, type: 'Deluxe', occ: 4, floor: 3 });
            roomDefs.push({ no: '401', type: 'Suite', occ: 16, floor: 4 });
            roomDefs.push({ no: '402', type: 'Suite', occ: 16, floor: 4 });

            const values = roomDefs.map(r =>
                `('${r.no}', '${r.type}', ${hotelCode}, ${r.occ}, ${r.floor}, 'Available')`
            ).join(',');

            await transaction.request().query(
                `INSERT INTO Room (RoomNo, RoomType, HotelCode, Occupancy, FloorNo, RoomStatus) VALUES ${values}`
            );

            await transaction.commit();
            console.log("✅ Successfully setup 20 rooms with floor numbers and status!");
            process.exit(0);
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        console.error("❌ Room Setup Failed: ", error);
        process.exit(1);
    }
}

setupSmartRooms();