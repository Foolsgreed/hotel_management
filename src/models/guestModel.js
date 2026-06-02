const { poolPromise } = require('../config/db');

class GuestModel {
    static async register(firstName, lastName, email, password) {
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
                .query(`
                    INSERT INTO Guest (FirstName, LastName, Email, Password)
                    OUTPUT INSERTED.GuestID, INSERTED.Email, INSERTED.FirstName, INSERTED.LastName
                    VALUES (@FirstName, @LastName, @Email, @Password)
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
                .query('SELECT GuestID, FirstName, LastName, Email FROM Guest WHERE Email = @Email AND Password = @Password');
            
            if (result.recordset.length === 0) {
                return null;
            }
            return result.recordset[0];
        } catch (error) {
            throw error;
        }
    }
}

module.exports = GuestModel;
