const { poolPromise } = require('../config/db');

const bcrypt = require('bcryptjs');

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

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const result = await pool.request()
                .input('FirstName', firstName)
                .input('LastName', lastName)
                .input('Email', email)
                .input('Password', hashedPassword)
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
                .query('SELECT GuestID, FirstName, LastName, Email, Password, PhoneNo, DOB, Gender, PassportNo FROM Guest WHERE Email = @Email');
            
            if (result.recordset.length === 0) {
                return null;
            }
            
            const guest = result.recordset[0];
            const isValid = await bcrypt.compare(password, guest.Password);
            if (!isValid) return null;

            delete guest.Password;
            return guest;
        } catch (error) {
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('Email', email)
                .query('SELECT GuestID, FirstName, LastName, Email, PhoneNo, DOB, Gender, PassportNo FROM Guest WHERE Email = @Email');
            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (error) {
            throw error;
        }
    }

    static async updateGuest(guestId, data) {
        try {
            const pool = await poolPromise;
            
            let query = `
                UPDATE Guest
                SET FirstName = @FirstName,
                    LastName = @LastName,
                    PhoneNo = @PhoneNo,
                    DOB = @DOB,
                    Gender = @Gender,
                    PassportNo = @PassportNo
            `;
            
            const req = pool.request()
                .input('GuestID', guestId)
                .input('FirstName', data.FirstName)
                .input('LastName', data.LastName)
                .input('PhoneNo', data.PhoneNo || '')
                .input('DOB', data.DOB || null)
                .input('Gender', data.Gender || '')
                .input('PassportNo', data.PassportNo || '');


            query += `
                OUTPUT INSERTED.GuestID, INSERTED.Email, INSERTED.FirstName, INSERTED.LastName, INSERTED.PhoneNo, INSERTED.DOB, INSERTED.Gender, INSERTED.PassportNo
                WHERE GuestID = @GuestID
            `;

            const result = await req.query(query);
            
            if (result.recordset.length === 0) {
                throw new Error('Guest not found');
            }
            return result.recordset[0];
        } catch (error) {
            throw error;
        }
    }

    static async changePassword(guestId, currentPassword, newPassword) {
        try {
            const pool = await poolPromise;
            
            // Get current password hash
            const getResult = await pool.request()
                .input('GuestID', guestId)
                .query('SELECT Password FROM Guest WHERE GuestID = @GuestID');
                
            if (getResult.recordset.length === 0) {
                throw new Error('Guest not found');
            }
            
            const hashedCurrentPassword = getResult.recordset[0].Password;
            
            const bcrypt = require('bcryptjs');
            const isMatch = await bcrypt.compare(currentPassword, hashedCurrentPassword);
            if (!isMatch) {
                throw new Error('Incorrect current password');
            }
            
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            
            const updateResult = await pool.request()
                .input('GuestID', guestId)
                .input('Password', hashedNewPassword)
                .query(`
                    UPDATE Guest
                    SET Password = @Password
                    OUTPUT INSERTED.GuestID, INSERTED.Email, INSERTED.FirstName, INSERTED.LastName, INSERTED.PhoneNo, INSERTED.DOB, INSERTED.Gender, INSERTED.PassportNo
                    WHERE GuestID = @GuestID
                `);
                
            return updateResult.recordset[0];
        } catch (error) {
            console.error("GuestModel.changePassword Error:", error);
            throw error;
        }
    }
}

module.exports = GuestModel;
