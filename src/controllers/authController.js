const GuestModel = require('../models/guestModel');
const EmployeeModel = require('../models/employeeModel');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phoneNo } = req.body;
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        
        const guest = await GuestModel.register(firstName, lastName, email, password, phoneNo);
        res.status(201).json({ message: 'Registration successful', guest });
    } catch (error) {
        if (error.message === 'Email already exists') {
            return res.status(409).json({ message: error.message });
        }
        console.error("Register Error:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        
        // Try Employee first
        const employee = await EmployeeModel.login(email, password);
        if (employee) {
            const token = jwt.sign(
                { EmployeeID: employee.EmployeeID, RoleTitle: employee.RoleTitle, Permissions: employee.Permissions },
                process.env.JWT_SECRET || 'hotel_secret_key_123',
                { expiresIn: '8h' }
            );
            return res.status(200).json({ message: 'Login successful', role: 'admin', user: employee, token });
        }
        
        // Try Guest
        const guest = await GuestModel.login(email, password);
        if (guest) {
            return res.status(200).json({ message: 'Login successful', role: 'guest', user: guest });
        }
        
        // If neither
        res.status(401).json({ message: 'Invalid credentials' });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { guestId, ...data } = req.body;
        if (!guestId) {
            return res.status(400).json({ message: 'Guest ID is required' });
        }
        
        const updatedGuest = await GuestModel.updateGuest(guestId, data);
        res.status(200).json({ message: 'Profile updated successfully', user: updatedGuest });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { guestId, currentPassword, newPassword } = req.body;
        if (!guestId || !currentPassword || !newPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        
        const updatedGuest = await GuestModel.changePassword(guestId, currentPassword, newPassword);
        res.status(200).json({ message: 'Password updated successfully', user: updatedGuest });
    } catch (error) {
        if (error.message === 'Incorrect current password' || error.message === 'Guest not found') {
            return res.status(400).json({ message: error.message });
        }
        console.error("Change Password Error:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
