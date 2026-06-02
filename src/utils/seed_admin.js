require('dotenv').config();
const { poolPromise } = require('../config/db');

async function seedAdmin() {
    try {
        const pool = await poolPromise;

        console.log("Seeding Admin Employee...");
        
        // Ensure Hotel exists and get its ID
        const hotelResult = await pool.request().query('SELECT TOP 1 HotelCode FROM Hotel');
        const hotelCode = hotelResult.recordset[0]?.HotelCode;

        // Ensure Role exists and get ID of 'Admin'
        const roleResult = await pool.request().query("SELECT TOP 1 RoleID FROM Role WHERE RoleTitle = 'Admin'");
        let roleID = roleResult.recordset[0]?.RoleID;
        
        if(!roleID) {
            console.log("Admin role missing, inserting...");
            const newRole = await pool.request().query("INSERT INTO Role (RoleTitle, RoleDesc) OUTPUT INSERTED.RoleID VALUES ('Admin', 'System Administrator')");
            roleID = newRole.recordset[0].RoleID;
        }

        if (hotelCode && roleID) {
            await pool.request()
                .input('HotelCode', hotelCode)
                .input('RoleID', roleID)
                .query(`
                IF NOT EXISTS (SELECT * FROM Employee WHERE Email = 'admin@grandpalace.com')
                BEGIN
                    INSERT INTO Employee (HotelCode, RoleID, FirstName, LastName, Email, Password, Salary) 
                    VALUES (@HotelCode, @RoleID, 'System', 'Admin', 'admin@grandpalace.com', 'admin123', 5000)
                END
            `);
            console.log("✅ Admin Employee seeded Successfully: admin@grandpalace.com / admin123");
        } else {
            console.log("❌ Could not resolve HotelCode or RoleID");
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding Failed: ", error);
        process.exit(1);
    }
}

seedAdmin();
