require('dotenv').config();
const { poolPromise } = require('../config/db');

async function seedStaff() {
    try {
        const pool = await poolPromise;
        console.log("Seeding Staff...");

        const hotelResult = await pool.request().query('SELECT TOP 1 HotelCode FROM Hotel');
        const hotelCode = hotelResult.recordset[0]?.HotelCode;

        if (!hotelCode) {
            console.log("❌ No Hotel found — run seed_db.js first.");
            process.exit(1);
        }

        const staff = [
            { firstName: 'System', lastName: 'Admin', dob: '1990-01-01', gender: 'Other', phone: '0900000001', email: 'admin@grandpalace.com', password: 'admin123', salary: 5000.00, role: 'Admin' },
            { firstName: 'Hoang', lastName: 'Le', dob: '1985-03-12', gender: 'Male', phone: '0900000002', email: 'manager@grandpalace.com', password: 'manager123', salary: 3500.00, role: 'Manager' },
            { firstName: 'Mai', lastName: 'Pham', dob: '1995-07-22', gender: 'Female', phone: '0900000003', email: 'reception@grandpalace.com', password: 'reception123', salary: 1800.00, role: 'Receptionist' },
            { firstName: 'Linh', lastName: 'Vo', dob: '1992-11-05', gender: 'Female', phone: '0900000004', email: 'housekeeping@grandpalace.com', password: 'housekeeping123', salary: 1500.00, role: 'Housekeeping' },
            { firstName: 'Duc', lastName: 'Tran', dob: '1988-09-18', gender: 'Male', phone: '0900000005', email: 'accountant@grandpalace.com', password: 'accountant123', salary: 2200.00, role: 'Accountant' },
            { firstName: 'Tuan', lastName: 'Nguyen', dob: '1991-04-30', gender: 'Male', phone: '0900000006', email: 'maintenance@grandpalace.com', password: 'maintenance123', salary: 1600.00, role: 'Maintenance' },
            { firstName: 'Anh', lastName: 'Dang', dob: '1993-02-14', gender: 'Female', phone: '0900000007', email: 'concierge@grandpalace.com', password: 'concierge123', salary: 1700.00, role: 'Concierge' },
            { firstName: 'Khanh', lastName: 'Bui', dob: '1996-08-09', gender: 'Male', phone: '0900000008', email: 'bartender@grandpalace.com', password: 'bartender123', salary: 1400.00, role: 'Bartender' },
            { firstName: 'Phuong', lastName: 'Hoang', dob: '1994-06-25', gender: 'Female', phone: '0900000009', email: 'cashier@grandpalace.com', password: 'cashier123', salary: 1400.00, role: 'Cashier' },
        ];

        for (const s of staff) {
            const roleResult = await pool.request()
                .input('RoleTitle', s.role)
                .query('SELECT TOP 1 RoleID FROM Role WHERE RoleTitle = @RoleTitle');

            const roleID = roleResult.recordset[0]?.RoleID;
            if (!roleID) {
                console.log(`⚠️ Role '${s.role}' not found, skipping ${s.email}`);
                continue;
            }

            await pool.request()
                .input('HotelCode', hotelCode)
                .input('RoleID', roleID)
                .input('FirstName', s.firstName)
                .input('LastName', s.lastName)
                .input('DOB', s.dob)
                .input('Gender', s.gender)
                .input('PhoneNo', s.phone)
                .input('Email', s.email)
                .input('Password', s.password)
                .input('Salary', s.salary)
                .query(`
                    IF NOT EXISTS (SELECT * FROM Employee WHERE Email = @Email)
                    BEGIN
                        INSERT INTO Employee (HotelCode, RoleID, FirstName, LastName, DOB, Gender, PhoneNo, Email, Password, Salary)
                        VALUES (@HotelCode, @RoleID, @FirstName, @LastName, @DOB, @Gender, @PhoneNo, @Email, @Password, @Salary)
                    END
                `);

            console.log(`✅ Seeded ${s.role}: ${s.email} / ${s.password}`);
        }

        console.log("✅ Staff seeding completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Staff Seeding Failed: ", error);
        process.exit(1);
    }
}

seedStaff();