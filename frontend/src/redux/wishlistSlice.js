import { createSlice } from '@reduxjs/toolkit';

const loadWishlist = () => {
  try {
    const raw = localStorage.getItem('bitzone_wishlist');
    return raw ? JSON.parse(raw) : { items: [], totalQty: 0 };
  } catch {
    return { items: [], totalQty: 0 };
  }
};
const saveWishlist = (state) => {
  try {
    localStorage.setItem('bitzone_wishlist', JSON.stringify(state));
  } catch {}
};

const initialState = loadWishlist();

const recalc = (state) => {
  state.totalQty = Array.isArray(state.items) ? state.items.length : 0;
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    toggleWishlistItem: (state, { payload }) => {
      const { id, name, price, image } = payload;
      const idx = state.items.findIndex(i => i.id === id);
      if (idx >= 0) {
        state.items.splice(idx, 1);
      } else {
        state.items.push({ id, name, price, image: image || '' });
      }
      recalc(state);
      saveWishlist(state);
    },
    removeFromWishlist: (state, { payload }) => {
      state.items = state.items.filter(i => i.id !== payload);
      recalc(state);
      saveWishlist(state);
    },
    clearWishlist: (state) => {
      state.items = [];
      recalc(state);
      saveWishlist(state);
    }
  }
});

export const { toggleWishlistItem, removeFromWishlist, clearWishlist } = wishlistSlice.actions;

export const selectWishlistItems = (state) => state.wishlist.items;
export const selectWishlistQty = (state) => (state.wishlist ? state.wishlist.items.length : 0);

export default wishlistSlice.reducer;
