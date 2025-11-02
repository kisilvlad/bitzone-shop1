// backend/models/categoryModel.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  roappId: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true },
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
