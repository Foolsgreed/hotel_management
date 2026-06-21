const { poolPromise } = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getAllEmployees = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT e.EmployeeID, e.FirstName, e.LastName, e.Email, e.PhoneNo, r.RoleTitle
            FROM Employee e
            INNER JOIN Role r ON e.RoleID = r.RoleID
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getRoles = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Role');
        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.addEmployee = async (req, res) => {
    try {
        const { firstName, lastName, email, phoneNo, roleId, password } = req.body;
        if (!firstName || !lastName || !email || !roleId || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const pool = await poolPromise;
        
        // check if email exists
        const check = await pool.request()
            .input('Email', email)
            .query('SELECT 1 FROM Employee WHERE Email = @Email');
            
        if (check.recordset.length > 0) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.request()
            .input('FirstName', firstName)
            .input('LastName', lastName)
            .input('Email', email)
            .input('PhoneNo', phoneNo || '')
            .input('Password', hashedPassword)
            .input('RoleID', roleId)
            .query(`
                INSERT INTO Employee (FirstName, LastName, Email, PhoneNo, Password, RoleID)
                VALUES (@FirstName, @LastName, @Email, @PhoneNo, @Password, @RoleID)
            `);

        res.status(201).json({ message: 'Employee added successfully' });
    } catch (error) {
        console.error("Error adding employee:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterRole = req.user.RoleTitle;
        
        const pool = await poolPromise;

        // Fetch target employee's role
        const targetQuery = await pool.request()
            .input('EmployeeID', id)
            .query(`
                SELECT r.RoleTitle 
                FROM Employee e 
                INNER JOIN Role r ON e.RoleID = r.RoleID 
                WHERE e.EmployeeID = @EmployeeID
            `);

        if (targetQuery.recordset.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const targetRole = targetQuery.recordset[0].RoleTitle;

        if (targetRole === 'Manager' && requesterRole !== 'Admin') {
            return res.status(403).json({ message: 'Only Admin can delete a Manager' });
        }
        if (targetRole === 'Admin' && requesterRole !== 'Admin') {
            return res.status(403).json({ message: 'Only Admin can delete an Admin' });
        }

        await pool.request()
            .input('EmployeeID', id)
            .query('DELETE FROM Employee WHERE EmployeeID = @EmployeeID');
        res.status(200).json({ message: 'Employee deleted' });
    } catch (error) {
        console.error("Error deleting employee:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
