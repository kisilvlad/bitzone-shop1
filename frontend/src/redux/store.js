import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './cartSlice';
import wishlistReducer from './wishlistSlice';

const store = configureStore({
  reducer: { 
    cart: cartReducer,
    wishlist: wishlistReducer,
  },
  devTools: true,
});

export default store;