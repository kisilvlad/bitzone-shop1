// backend/models/reviewModel.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    // ID товару з Roapp, до якого прив'язаний відгук
    roappId: {
      type: Number,
      required: true,
      index: true, // Індекс для швидкого пошуку відгуків по товару
    },
    // ID користувача з Roapp, який залишив відгук
    authorId: {
      type: Number,
      required: true,
    },
    // Ім'я користувача (дублюємо для зручності)
    authorName: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      required: true,
    },
    // --- ДОДАНО НОВІ ПОЛЯ ---
    productName: {
      type: String,
      required: true,
    },
    productImage: {
      type: String,
      required: true,
    },
  },
  {
    // Автоматично додає поля createdAt і updatedAt
    timestamps: true,
  }
);

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
