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
      trim: true,
    },

    price: {
      type: Number,
      default: 0,
    },

    // Старе текстове поле категорії (назва)
    category: {
      type: String,
      default: 'Різне',
    },

    // 🔥 НОВЕ: ID категорії з ROAPP
    roappCategoryId: {
      type: Number,
      index: true,
      default: null,
    },

    description: {
      type: String,
      default: '',
    },

    image: {
      type: String,
      default: null,
    },

    images: {
      type: [String],
      default: [],
    },

    stock: {
      type: Number,
      default: 0,
    },

    createdAtRoapp: {
      type: Date,
    },

    lqip: {
      type: String,
      default: null,
    },

    specs: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
