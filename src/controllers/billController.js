const BillModel = require('../models/billModel');

exports.getAllBills = async (req, res) => {
    try {
        const bills = await BillModel.getAllBills();
        res.status(200).json(bills);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getBillsByGuest = async (req, res) => {
    try {
        const guestId = req.params.guestId;
        const bills = await BillModel.getBillsByGuest(guestId);
        res.status(200).json(bills);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.payInvoice = async (req, res) => {
    try {
        const invoiceNo = req.params.invoiceNo;
        const paymentMode = req.body.paymentMode;

        if (!invoiceNo || !paymentMode) {
            return res.status(400).json({ message: 'Missing invoiceNo or paymentMode' });
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

exports.getBillDetails = async (req, res) => {
    try {
        const invoiceNo = req.params.invoiceNo;
        const details = await BillModel.getBillDetails(invoiceNo);
        res.json(details);
    } catch (error) {
        console.error("Error getting bill details:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
