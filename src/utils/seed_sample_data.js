require('dotenv').config();
const { poolPromise } = require('../config/db');

async function seedSampleData() {
    try {
        const pool = await poolPromise;

        console.log("Seeding sample Guests...");

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM Guest WHERE Email = 'john.doe@example.com')
            BEGIN
                INSERT INTO Guest (
                    FirstName,
                    LastName,
                    Email,
                    Password,
                    PhoneNo,
                    City,
                    Country
                )
                VALUES
                ('John', 'Doe', 'john.doe@example.com', 'password123', '0901111111', 'Hanoi', 'Vietnam'),
                ('Jane', 'Smith', 'jane.smith@example.com', 'password123', '0902222222', 'Ho Chi Minh City', 'Vietnam'),
                ('Carlos', 'Nguyen', 'carlos.nguyen@example.com', 'password123', '0903333333', 'Da Nang', 'Vietnam'),
                ('Emily', 'Tran', 'emily.tran@example.com', 'password123', '0904444444', 'Hue', 'Vietnam'),
                ('Akira', 'Yamamoto', 'akira.yamamoto@example.com', 'password123', '0905555555', 'Tokyo', 'Japan')
            END
        `);

        const guests = await pool.request().query(`
            SELECT GuestID, Email
            FROM Guest
            WHERE Email IN (
                'john.doe@example.com',
                'jane.smith@example.com',
                'carlos.nguyen@example.com',
                'emily.tran@example.com',
                'akira.yamamoto@example.com'
            )
        `);

        const rooms = await pool.request().query(`SELECT RoomNo, HotelCode FROM Room ORDER BY CAST(RoomNo AS INT)`);

        if (guests.recordset.length === 0) {
            console.log("⚠️ No guests found.");
            process.exit(1);
        }

        if (rooms.recordset.length < 6) {
            console.log(`⚠️ Found only ${rooms.recordset.length} room(s), need at least 6.`);
            process.exit(1);
        }

        const g = guests.recordset;
        const r = rooms.recordset;

        console.log("Seeding sample Bookings...");

        await pool.request().query(`
            IF NOT EXISTS (
                SELECT *
                FROM Booking
                WHERE BookingDate = '2026-01-01'
            )
            BEGIN
                INSERT INTO Booking (
                    HotelCode,
                    GuestID,
                    RoomNo,
                    BookingDate,
                    ArrivalDate,
                    DepartureDate,
                    NumAdults,
                    NumChildren,
                    BookingStatus
                )
                VALUES
                (${r[0].HotelCode}, ${g[0].GuestID}, '${r[0].RoomNo}', '2026-01-01', '2026-05-01', '2026-05-04', 2, 0, 'CheckedOut'),
                (${r[1].HotelCode}, ${g[1].GuestID}, '${r[1].RoomNo}', '2026-01-02', '2026-06-10', '2026-06-13', 1, 0, 'CheckedOut'),
                (${r[2].HotelCode}, ${g[2].GuestID}, '${r[2].RoomNo}', '2026-01-03', '2026-07-01', '2026-07-05', 2, 1, 'Confirmed'),
                (${r[3].HotelCode}, ${g[3].GuestID}, '${r[3].RoomNo}', '2026-01-04', '2026-07-15', '2026-07-18', 4, 0, 'Confirmed'),
                (${r[4].HotelCode}, ${g[4].GuestID}, '${r[4].RoomNo}', '2026-01-05', '2026-06-20', '2026-06-22', 2, 0, 'CheckedIn'),
                (${r[5].HotelCode}, ${g[0].GuestID}, '${r[5].RoomNo}', '2026-01-06', '2026-05-20', '2026-05-22', 2, 0, 'Cancelled')
            END
        `);

        const checkedOut = await pool.request().query(`
            SELECT BookingID, GuestID
            FROM Booking
            WHERE BookingStatus = 'CheckedOut'
            AND InvoiceNo IS NULL
            ORDER BY BookingID
        `);

        if (checkedOut.recordset.length > 0) {
            console.log("Seeding sample Bills...");

            for (const booking of checkedOut.recordset) {
                const billResult = await pool.request()
                    .input('GuestID', booking.GuestID)
                    .query(`
                        INSERT INTO Bill (
                            GuestID,
                            TotalAmount,
                            RoomService,
                            RestaurantCharges,
                            BarCharges,
                            MiscCharges,
                            IfLateCheckout,
                            PaymentDate,
                            PaymentMode,
                            PaymentStatus
                        )
                        OUTPUT INSERTED.InvoiceNo
                        VALUES (
                            @GuestID,
                            355.00,
                            30.00,
                            45.00,
                            20.00,
                            10.00,
                            0,
                            GETDATE(),
                            'CreditCard',
                            'Paid'
                        )
                    `);

                const invoiceNo = billResult.recordset[0].InvoiceNo;

                await pool.request()
                    .input('BookingID', booking.BookingID)
                    .input('InvoiceNo', invoiceNo)
                    .query(`
                        UPDATE Booking
                        SET InvoiceNo = @InvoiceNo
                        WHERE BookingID = @BookingID
                    `);
            }
        }

        console.log("Seeding sample Reviews...");

        await pool.request().query(`
            INSERT INTO Review (
                GuestID,
                InvoiceNo,
                Rating,
                Comment
            )
            SELECT
                b.GuestID,
                b.InvoiceNo,
                5,
                'Excellent stay and service.'
            FROM Bill b
            WHERE b.InvoiceNo IS NOT NULL
            AND NOT EXISTS (
                SELECT 1
                FROM Review r
                WHERE r.InvoiceNo = b.InvoiceNo
            )
        `);

        console.log("✅ Sample data seeding completed successfully.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Sample data seeding failed:", error);
        process.exit(1);
    }
}

seedSampleData();