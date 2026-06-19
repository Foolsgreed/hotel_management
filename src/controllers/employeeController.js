const EmployeeModel = require('../models/employeeModel');
const bcrypt = require('bcryptjs');

exports.getAllEmployees = async (req, res) => {
    try {
        const employees = await EmployeeModel.getAllEmployees();
        res.status(200).json(employees);
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.createEmployee = async (req, res) => {
    try {
        const { roleId, firstName, lastName, email, password } = req.body;
        
        if (!roleId || !firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Use a default HotelCode of 1 since we only have one hotel
        const hotelCode = 1;

        const employee = await EmployeeModel.createEmployee(hotelCode, roleId, firstName, lastName, email, hashedPassword);
        res.status(201).json({ message: 'Employee created successfully', employee });
    } catch (error) {
        if (error.message.includes('Violation of UNIQUE KEY constraint')) {
            return res.status(409).json({ message: 'Email already exists' });
        }
        console.error("Error creating employee:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.deleteEmployee = async (req, res) => {
    try {
        const employeeId = req.params.id;
        
        // Prevent deleting the main admin account (optional safety)
        if (employeeId == 1) {
            return res.status(403).json({ message: 'Cannot delete the main system administrator' });
        }

        await EmployeeModel.deleteEmployee(employeeId);
        res.status(200).json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error("Error deleting employee:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getAllRoles = async (req, res) => {
    try {
        const roles = await EmployeeModel.getAllRoles();
        res.status(200).json(roles);
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
