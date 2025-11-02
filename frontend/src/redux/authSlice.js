// src/redux/authSlice.js

import { createSlice } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';

const initialState = {
    token: localStorage.getItem('bitzone_token') || null,
    isAuthenticated: !!localStorage.getItem('bitzone_token'),
    user: null,
};

// Спробуємо розшифрувати токен при першому завантаженні
if (initialState.token) {
    try {
        const decoded = jwtDecode(initialState.token);
        initialState.user = { name: decoded.name, id: decoded.id };
    } catch (e) {
        // Якщо токен недійсний, чистимо все
        localStorage.removeItem('bitzone_token');
        initialState.token = null;
        initialState.isAuthenticated = false;
    }
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginSuccess(state, action) {
            const { token } = action.payload;
            state.token = token;
            state.isAuthenticated = true;
            localStorage.setItem('bitzone_token', token);

            const decoded = jwtDecode(token);
            state.user = { name: decoded.name, id: decoded.id };
        },
        logout(state) {
            state.token = null;
            state.isAuthenticated = false;
            state.user = null;
            localStorage.removeItem('bitzone_token');
        },
    },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;