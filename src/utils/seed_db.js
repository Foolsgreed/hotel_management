require('dotenv').config();
const { poolPromise } = require('../config/db');

async function seedData() {
    try {
        const pool = await poolPromise;

        console.log("Seeding Roles...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM Role)
            BEGIN
                INSERT INTO Role (RoleTitle, RoleDesc) VALUES 
                ('Manager', 'Hotel Manager'),
                ('Receptionist', 'Front Desk Staff'),
                ('Admin', 'System Administrator')
            END
        `);

        console.log("Seeding Hotel...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM Hotel)
            BEGIN
                INSERT INTO Hotel (HotelName, Address, Postcode, City, Country, NumRooms, PhoneNo, StarRating) 
                VALUES ('Grand Palace Hotel', '123 Main St', '10000', 'Hanoi', 'Vietnam', 100, '0123456789', 5)
            END
        `);

        console.log("Seeding Room Types...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM RoomType)
            BEGIN
                INSERT INTO RoomType (RoomType, RoomPrice, DefaultRoomPrice, RoomImg, RoomDesc) 
                VALUES 
                ('Standard', 50.00, 50.00, 'standard.jpg', 'Standard Room with Basic Amenities'),
                ('Deluxe', 100.00, 100.00, 'deluxe.jpg', 'Deluxe Room with City View'),
                ('Suite', 250.00, 250.00, 'suite.jpg', 'Luxury Suite with Ocean View')
            END
        `);

        console.log("Seeding Rooms...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM Room)
            BEGIN
                INSERT INTO Room (RoomNo, RoomType, HotelCode, Occupancy) 
                VALUES 
                ('101', 'Standard', 1, 2),
                ('102', 'Standard', 1, 2),
                ('201', 'Deluxe', 1, 2),
                ('202', 'Deluxe', 1, 2),
                ('301', 'Suite', 1, 4)
            END
        `);

        console.log("✅ Database Seeding Completed Successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Database Seeding Failed: ", error);
        process.exit(1);
    }
}

seedData();
