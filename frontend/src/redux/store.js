// src/redux/store.js

import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './cartSlice';
import wishlistReducer from './wishlistSlice';
import authReducer from './authSlice'; // <-- Додай цей рядок

const store = configureStore({
  reducer: { 
    cart: cartReducer,
    wishlist: wishlistReducer,
    auth: authReducer, // <-- І цей
  },
  devTools: true,
});

export default store;