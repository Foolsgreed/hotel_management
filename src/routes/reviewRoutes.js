const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// POST /api/reviews
router.post('/', reviewController.createReview);

// GET /api/reviews/latest
router.get('/latest', reviewController.getLatestReviews);

// GET /api/reviews/average
router.get('/average', reviewController.getAverageRating);

module.exports = router;
