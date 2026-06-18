const { poolPromise } = require('../config/db');

const bcrypt = require('bcryptjs');

class EmployeeModel {
    static async login(email, password) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('Email', email)
                .query(`
                    SELECT e.EmployeeID, e.FirstName, e.LastName, e.Email, e.Password, r.RoleTitle 
                    FROM Employee e
                    INNER JOIN Role r ON e.RoleID = r.RoleID
                    WHERE e.Email = @Email
                `);
            
            if (result.recordset.length === 0) {
                return null;
            }
            
            const employee = result.recordset[0];
            const isValid = await bcrypt.compare(password, employee.Password);
            if (!isValid) return null;

            delete employee.Password;
            return employee;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = EmployeeModel;
