
import { createSlice } from '@reduxjs/toolkit';

const loadCart = () => {
  try {
    const raw = localStorage.getItem('bitzone_cart');
    return raw ? JSON.parse(raw) : { items: [] };
  } catch {
    return { items: [] };
  }
};
const saveCart = (state) => {
  try {
    localStorage.setItem('bitzone_cart', JSON.stringify(state));
  } catch {}
};

const initialState = loadCart();

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, { payload }) => {
      const { id, name, price, image } = payload;
      const item = state.items.find((i) => i.id === id);
      if (item) {
        item.qty += 1;
      } else {
        state.items.push({ id, name, price, image: image || '', qty: 1 });
      }
      saveCart(state);
    },
    removeFromCart: (state, { payload }) => {
      state.items = state.items.filter((i) => i.id !== payload);
      saveCart(state);
    },
    increaseQty: (state, { payload }) => {
      const item = state.items.find((i) => i.id === payload);
      if (item) item.qty += 1;
      saveCart(state);
    },
    decreaseQty: (state, { payload }) => {
      const item = state.items.find((i) => i.id === payload);
      if (item && item.qty > 1) {
        item.qty -= 1;
      } else {
        state.items = state.items.filter((i) => i.id !== payload);
      }
      saveCart(state);
    },
    changeQty: (state, { payload }) => {
      const { id, qty } = payload;
      const item = state.items.find((i) => i.id === id);
      if (item) item.qty = qty;
      saveCart(state);
    },
    clearCart: (state) => {
      state.items = [];
      saveCart(state);
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  increaseQty,
  decreaseQty,
  changeQty,
  clearCart,
} = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartQty = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.qty, 0);
export const selectCartTotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);

export default cartSlice.reducer;
