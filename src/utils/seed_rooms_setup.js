require('dotenv').config();
const { poolPromise } = require('../config/db');

async function setupSmartRooms() {
    try {
        const pool = await poolPromise;
        const transaction = pool.transaction();
        
        await transaction.begin();

        try {
            console.log("Cleaning up old bookings and rooms...");
            await transaction.request().query('DELETE FROM Bill');
            // Cannot delete Guest if BookingID FK is enforced both ways, let's just null it or delete Guest
            await transaction.request().query('ALTER TABLE Guest NOCHECK CONSTRAINT ALL');
            await transaction.request().query('DELETE FROM Booking');
            await transaction.request().query('ALTER TABLE Guest CHECK CONSTRAINT ALL');
            await transaction.request().query('DELETE FROM Room');
            await transaction.request().query('DELETE FROM RoomType');

            console.log("Seeding new Room Types...");
            await transaction.request().query(`
                INSERT INTO RoomType (RoomType, RoomPrice, DefaultRoomPrice, RoomImg, RoomDesc) 
                VALUES 
                ('Standard Twin', 60.00, 60.00, 'standard.jpg', 'Standard Room with 2 Single Beds (Max 2 pax)'),
                ('Standard Double', 75.00, 75.00, 'standard.jpg', 'Standard Room with 2 Double Beds (Max 4 pax)'),
                ('Deluxe', 120.00, 120.00, 'deluxe.jpg', 'Premium Deluxe Room (Max 4 pax)'),
                ('Suite', 350.00, 350.00, 'suite.jpg', 'Luxury Large Suite (Up to 16 pax)')
            `);

            console.log("Seeding exactly 20 Rooms...");
            const hotelResult = await transaction.request().query('SELECT TOP 1 HotelCode FROM Hotel');
            let hotelCode = hotelResult.recordset[0]?.HotelCode || 1;

            let roomQuery = 'INSERT INTO Room (RoomNo, RoomType, HotelCode, Occupancy) VALUES ';
            let values = [];

            // 6 Standard Twin (101-106)
            for(let i=1; i<=6; i++) values.push(`('10${i}', 'Standard Twin', ${hotelCode}, 2)`);
            // 6 Standard Double (201-206)
            for(let i=1; i<=6; i++) values.push(`('20${i}', 'Standard Double', ${hotelCode}, 4)`);
            // 6 Deluxe (301-306)
            for(let i=1; i<=6; i++) values.push(`('30${i}', 'Deluxe', ${hotelCode}, 4)`);
            // 2 Suite (401-402)
            values.push(`('401', 'Suite', ${hotelCode}, 16)`);
            values.push(`('402', 'Suite', ${hotelCode}, 16)`);

            await transaction.request().query(roomQuery + values.join(','));

            await transaction.commit();
            console.log("✅ Successfully setup smart rooms for Phase 3!");
            process.exit(0);
        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (error) {
        console.error("❌ Smart Setup Failed: ", error);
        process.exit(1);
    }
}

setupSmartRooms();
