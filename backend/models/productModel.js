// backend/models/productModel.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    roappId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    category: {
      type: String,
    },
    description: { // <-- Поле для опису
      type: String,
      default: '',
    },
    image: {
      type: String,
    },
    images: [String],
    stock: {
      type: Number,
      default: 0,
    },
    lqip: {
      type: String,
    },
    createdAtRoapp: {
      type: Date,
    },
    // !!! ГОЛОВНА ЗМІНА ТУТ: Спрощуємо структуру характеристик !!!
    specs: [String], // Тепер це просто масив рядків
  },
  {
    timestamps: true,
  }
);

// Індекси для швидкої фільтрації та пошуку
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAtRoapp: -1 });
productSchema.index({ name: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;