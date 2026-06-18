require('dotenv').config();
const { poolPromise } = require('../config/db');

const PERMISSIONS = [
    { key: 'view_bookings', desc: 'See booking list' },
    { key: 'manage_bookings', desc: 'Create/check-in/check-out/cancel bookings' },
    { key: 'view_rooms', desc: 'See room list/status' },
    { key: 'manage_rooms', desc: 'Change room status' },
    { key: 'view_bills', desc: 'See bills/invoices' },
    { key: 'manage_bills', desc: 'Generate bills, update payment status' },
    { key: 'manage_bar_charges', desc: 'Add bar charges to a bill' },
    { key: 'manage_restaurant_charges', desc: 'Add restaurant charges to a bill' },
    { key: 'view_guests', desc: 'See guest list/info' },
    { key: 'manage_employees', desc: 'Add/edit/remove staff accounts' },
    { key: 'manage_roles', desc: 'Edit role permissions' },
    { key: 'view_statistics', desc: 'See dashboard stats/analytics' },
    { key: 'system_settings', desc: 'Hotel-wide settings' },
];

const ROLE_PERMISSIONS = {
    'Admin': PERMISSIONS.map(p => p.key),
    'Manager': ['view_bookings', 'manage_bookings', 'view_rooms', 'manage_rooms', 'view_bills', 'manage_bills', 'view_guests', 'view_statistics'],
    'Receptionist': ['view_bookings', 'manage_bookings', 'view_rooms', 'view_guests'],
    'Housekeeping': ['view_rooms', 'manage_rooms'],
    'Maintenance': ['view_rooms', 'manage_rooms'],
    'Accountant': ['view_bills', 'manage_bills', 'view_bookings'],
    'Concierge': ['view_bookings', 'view_guests'],
    'Bartender': ['view_bills', 'manage_bar_charges'],
    'Cashier': ['view_bills', 'manage_restaurant_charges'],
};

async function seedData() {
    try {
        const pool = await poolPromise;

        console.log("Seeding Roles...");
        const roleList = [
            { title: 'Manager', desc: 'Hotel Manager' },
            { title: 'Receptionist', desc: 'Front Desk Staff' },
            { title: 'Admin', desc: 'System Administrator' },
            { title: 'Housekeeping', desc: 'Cleans and maintains room status' },
            { title: 'Maintenance', desc: 'Handles repairs and room maintenance requests' },
            { title: 'Accountant', desc: 'Manages billing, invoices and financial records' },
            { title: 'Concierge', desc: 'Assists guests with bookings, requests and local information' },
            { title: 'Bartender', desc: 'Manages bar service and bar charges on guest bills' },
            { title: 'Cashier', desc: 'Manages restaurant charges and processes guest payments' },
        ];
        for (const role of roleList) {
            await pool.request()
                .input('Title', role.title)
                .input('Desc', role.desc)
                .query(`
                    IF NOT EXISTS (SELECT * FROM Role WHERE RoleTitle = @Title)
                    BEGIN
                        INSERT INTO Role (RoleTitle, RoleDesc) VALUES (@Title, @Desc)
                    END
                `);
        }

        console.log("Seeding Permissions...");
        for (const p of PERMISSIONS) {
            await pool.request()
                .input('Key', p.key)
                .input('Desc', p.desc)
                .query(`
                    IF NOT EXISTS (SELECT * FROM Permission WHERE PermissionKey = @Key)
                    BEGIN
                        INSERT INTO Permission (PermissionKey, PermissionDesc) VALUES (@Key, @Desc)
                    END
                `);
        }

        console.log("Mapping Roles to Permissions...");
        const roles = await pool.request().query('SELECT RoleID, RoleTitle FROM Role');
        const permissions = await pool.request().query('SELECT PermissionID, PermissionKey FROM Permission');

        const roleMap = {};
        roles.recordset.forEach(r => roleMap[r.RoleTitle] = r.RoleID);
        const permMap = {};
        permissions.recordset.forEach(p => permMap[p.PermissionKey] = p.PermissionID);

        for (const [roleTitle, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
            const roleID = roleMap[roleTitle];
            if (!roleID) continue;

            for (const key of permKeys) {
                const permID = permMap[key];
                if (!permID) continue;

                await pool.request()
                    .input('RoleID', roleID)
                    .input('PermissionID', permID)
                    .query(`
                        IF NOT EXISTS (SELECT * FROM RolePermission WHERE RoleID = @RoleID AND PermissionID = @PermissionID)
                        BEGIN
                            INSERT INTO RolePermission (RoleID, PermissionID) VALUES (@RoleID, @PermissionID)
                        END
                    `);
            }
        }

        console.log("Seeding Hotel...");
        await pool.request()
            .input('HotelName', 'Grand Palace Hotel')
            .query(`
                IF NOT EXISTS (SELECT * FROM Hotel WHERE HotelName = @HotelName)
                BEGIN
                    INSERT INTO Hotel (HotelName, Address, Postcode, City, Country, NumRooms, PhoneNo, StarRating) 
                    VALUES (@HotelName, '123 Main St', '10000', 'Hanoi', 'Vietnam', 100, '0123456789', 5)
                END
            `);

        console.log("Seeding Room Types...");
        const roomTypes = [
            { type: 'Standard Twin', price: 60.00, img: 'standard.jpg', desc: 'Standard Room with 2 Single Beds (Max 2 pax)' },
            { type: 'Standard Double', price: 75.00, img: 'standard.jpg', desc: 'Standard Room with 2 Double Beds (Max 4 pax)' },
            { type: 'Deluxe', price: 120.00, img: 'deluxe.jpg', desc: 'Premium Deluxe Room (Max 4 pax)' },
            { type: 'Suite', price: 350.00, img: 'suite.jpg', desc: 'Luxury Large Suite (Up to 16 pax)' },
        ];

        for (const rt of roomTypes) {
            await pool.request()
                .input('Type', rt.type)
                .input('Price', rt.price)
                .input('Img', rt.img)
                .input('Desc', rt.desc)
                .query(`
                    IF NOT EXISTS (SELECT * FROM RoomType WHERE RoomType = @Type)
                    BEGIN
                        INSERT INTO RoomType (RoomType, RoomPrice, DefaultRoomPrice, RoomImg, RoomDesc) 
                        VALUES (@Type, @Price, @Price, @Img, @Desc)
                    END
                `);
        }

        console.log("✅ Database Seeding Completed Successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Database Seeding Failed: ", error);
        process.exit(1);
    }
}

seedData();