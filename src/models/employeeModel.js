const { poolPromise } = require('../config/db');

class EmployeeModel {
    static async login(email, password) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('Email', email)
                .input('Password', password)
                .query(`
                    SELECT e.EmployeeID, e.FirstName, e.LastName, e.Email, r.RoleTitle 
                    FROM Employee e
                    INNER JOIN Role r ON e.RoleID = r.RoleID
                    WHERE e.Email = @Email AND e.Password = @Password
                `);
            
            if (result.recordset.length === 0) {
                return null;
            }
            return result.recordset[0];
        } catch (error) {
            throw error;
        }
    }
}

module.exports = EmployeeModel;
