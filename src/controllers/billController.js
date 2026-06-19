const BillModel = require('../models/billModel');

exports.getBillsByGuest = async (req, res) => {
    try {
        const guestId = req.params.guestId;
        const bills = await BillModel.getBillsByGuest(guestId);
        res.status(200).json(bills);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.payInvoice = async (req, res) => {
    try {
        const invoiceNo = req.params.invoiceNo;
        const paymentMode = req.body.paymentMode || 'Credit Card';

        if (!invoiceNo) {
            return res.status(400).json({ message: 'Missing invoiceNo' });
        }

        const result = await BillModel.payInvoice(invoiceNo, paymentMode);
        if (result.success) {
            res.status(200).json({ message: 'Payment successful' });
        } else {
            res.status(400).json({ message: result.message || 'Payment failed' });
        }
    } catch (error) {
        console.error("Error paying invoice:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getAllBills = async (req, res) => {
    try {
        const bills = await BillModel.getAllBills();
        res.status(200).json(bills);
    } catch (error) {
        console.error("Error getting all bills:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
