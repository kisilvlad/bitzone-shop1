// src/App.js

import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import PaymentResult from './pages/PaymentResult';


// !!! ПОКРАЩЕННЯ: Компонент-завантажувач винесено за межі 'App' !!!
// Це запобігає його повторному створенню при кожному рендері App
const PageLoader = () => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
    <p className="p" style={{ color: 'var(--text-secondary)' }}>Завантаження сторінки...</p>
  </div>
);

// Динамічно імпортуємо ВСІ сторінки
const Home = React.lazy(() => import('./pages/Home'));
const Products = React.lazy(() => import('./pages/Products'));
const ProductDetail = React.lazy(() => import('./pages/ProductDetail'));
const Cart = React.lazy(() => import('./pages/Cart'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Wishlist = React.lazy(() => import('./pages/Wishlist'));
const Account = React.lazy(() => import('./pages/Account')); // Ваш фікс вже тут
const OrderDetail = React.lazy(() => import('./pages/OrderDetail'));
const Contacts = React.lazy(() => import('./pages/Contacts'));
const About = React.lazy(() => import('./pages/About'));
const Delivery = React.lazy(() => import('./pages/Delivery'));
const Returns = React.lazy(() => import('./pages/Returns'));
const TradeIn = React.lazy(() => import('./pages/TradeIn'));
const Buyback = React.lazy(() => import('./pages/Buyback'));
const Installment = React.lazy(() => import('./pages/Installment'));
const Dropshipping = React.lazy(() => import('./pages/Dropshipping'));

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="container" style={{ minHeight: '70vh' }}>
        {/* Загортаємо Routes в Suspense */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/payment-result" element={<PaymentResult />} />
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/orders/:orderId" element={<OrderDetail />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/about" element={<About />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/trade-in" element={<TradeIn />} />
            <Route path="/buyback" element={<Buyback />} />
            <Route path="/installment" element={<Installment />} />
            <Route path="/dropshipping" element={<Dropshipping />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}