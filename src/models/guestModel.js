const { poolPromise } = require('../config/db');

class GuestModel {
    static async register(firstName, lastName, email, password, phoneNo = '') {
        try {
            const pool = await poolPromise;
            // Basic validation
            const check = await pool.request()
                .input('Email', email)
                .query('SELECT GuestID FROM Guest WHERE Email = @Email');
            
            if (check.recordset.length > 0) {
                throw new Error('Email already exists');
            }

            // Insert new guest. Normally password should be hashed with bcrypt!
            // Storing plain text for simplicity per constraints unless requested otherwise.
            const result = await pool.request()
                .input('FirstName', firstName)
                .input('LastName', lastName)
                .input('Email', email)
                .input('Password', password)
                .input('PhoneNo', phoneNo)
                .query(`
                    INSERT INTO Guest (FirstName, LastName, Email, Password, PhoneNo)
                    OUTPUT INSERTED.GuestID, INSERTED.Email, INSERTED.FirstName, INSERTED.LastName, INSERTED.PhoneNo, INSERTED.DOB, INSERTED.Gender, INSERTED.PassportNo
                    VALUES (@FirstName, @LastName, @Email, @Password, @PhoneNo)
                `);

            return result.recordset[0];
        } catch (error) {
            throw error;
        }
    }

    static async login(email, password) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('Email', email)
                .input('Password', password)
                .query('SELECT GuestID, FirstName, LastName, Email, PhoneNo, DOB, Gender, PassportNo FROM Guest WHERE Email = @Email AND Password = @Password');
            
            if (result.recordset.length === 0) {
                return null;
            }
            return result.recordset[0];
        } catch (error) {
            throw error;
        }
    }

    static async updateGuest(guestId, data) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('GuestID', guestId)
                .input('FirstName', data.FirstName)
                .input('LastName', data.LastName)
                .input('PhoneNo', data.PhoneNo || '')
                .input('DOB', data.DOB || null)
                .input('Gender', data.Gender || '')
                .input('PassportNo', data.PassportNo || '')
                .query(`
                    UPDATE Guest
                    SET FirstName = @FirstName,
                        LastName = @LastName,
                        PhoneNo = @PhoneNo,
                        DOB = @DOB,
                        Gender = @Gender,
                        PassportNo = @PassportNo
                    OUTPUT INSERTED.GuestID, INSERTED.Email, INSERTED.FirstName, INSERTED.LastName, INSERTED.PhoneNo, INSERTED.DOB, INSERTED.Gender, INSERTED.PassportNo
                    WHERE GuestID = @GuestID
                `);
            
            if (result.recordset.length === 0) {
                throw new Error('Guest not found');
            }
            return result.recordset[0];
        } catch (error) {
            throw error;
        }
    }
}

module.exports = GuestModel;
