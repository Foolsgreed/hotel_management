const ReviewModel = require('../models/reviewModel');

exports.createReview = async (req, res) => {
    try {
        const { guestId, invoiceNo, rating, comment } = req.body;
        
        if (!guestId || !invoiceNo || !rating) {
            return res.status(400).json({ error: 'Thiếu thông tin đánh giá.' });
        }

        const review = await ReviewModel.createReview(guestId, invoiceNo, rating, comment);
        res.status(201).json({ message: 'Review submitted successfully', review });
    } catch (error) {
        if (error.message.includes('already reviewed')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
};

exports.getLatestReviews = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 5;
        const reviews = await ReviewModel.getLatestReviews(limit);
        res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getAverageRating = async (req, res) => {
    try {
        const rating = await ReviewModel.getAverageRating();
        res.status(200).json(rating);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
