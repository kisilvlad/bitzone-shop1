// backend/models/RoappCategory.js
const mongoose = require('mongoose');

const roappCategorySchema = new mongoose.Schema(
  {
    roappId: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parentId: {
      // roappId батьківської категорії
      type: Number,
      default: null,
    },
    type: {
      // product / service (на майбутнє, якщо захочеш тягнути й сервісні категорії)
      type: String,
      enum: ['product', 'service'],
      default: 'product',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // можна буде використовувати для красивих URL
    slug: {
      type: String,
      trim: true,
    },
    // шлях предків: [rootId, ..., parentId]
    path: {
      type: [Number],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoappCategory', roappCategorySchema);
