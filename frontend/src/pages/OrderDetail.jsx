// src/pages/OrderDetail.jsx
// !!! ОНОВЛЕНО URL-адреси для деплою !!!

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { motion } from 'framer-motion';
import formatPrice from '../utils/formatPrice';

export default function OrderDetail() {
    const { id: orderId } = useParams();
    const navigate = useNavigate();
    const { token, isAuthenticated } = useSelector(state => state.auth);

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const fetchOrderDetail = async () => {
            try {
                const config = {
                     headers: { Authorization: `Bearer ${token}` }
                };
                
                // !!! ВИПРАВЛЕННЯ URL ТУТ !!!
                const { data } = await axios.get(`https://bitzone-shop1.onrender.com/api/orders/${orderId}`, config);
                
                setOrder(data);
            } catch (err) {
                setError('Не вдалося завантажити деталі замовлення. Можливо, у вас немає доступу.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetail();
    }, [orderId, token, isAuthenticated, navigate]);

    // --- ОНОВЛЕНО СТИЛІ ЗАВАНТАЖЕННЯ ТА ПОМИЛОК ---
    if (loading) return <p className="p center" style={{ color: 'var(--text-secondary)' }}>Завантаження деталей замовлення...</p>;
    if (error) return <p className="p center" style={{ color: 'var(--accent-pink)' }}>{error}</p>;
    if (!order) return <p className="p center" style={{ color: 'var(--text-secondary)' }}>Замовлення не знайдено.</p>;
    
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container">
            <Link to="/account" className="p" style={{ color: 'var(--accent-turquoise)', marginBottom: '24px', display: 'inline-block' }}>
                &larr; Назад до профілю
            </Link>

            <div className="surface" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '16px' }}> {/* <-- ЗМІНЕНО */}
                    <div>
                        <h1 className="h2 retro" style={{ margin: 0, color: 'var(--accent-yellow)' }}>Замовлення #{order.id}</h1>
                        <p className="p" style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
                            від {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p className="p order-status" style={{ backgroundColor: `${order.statusColor || '#555'}20`, color: order.statusColor || '#ccc' }}>
                            {order.status}
                        </p>
                        <p className="p" style={{ margin: '4px 0 0', fontWeight: 'bold', color: 'var(--accent-green)', fontSize: '18px' }}>
                            {formatPrice(order.total)}
                        </p>
                    </div>
                </div>

                <h3 className="h2 mono" style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>Склад замовлення</h3> {/* <-- ЗМІНЕНО */}
                <div style={{ display: 'grid', gap: '16px' }}>
                    {order.items.map(item => (
                        <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '16px', alignItems: 'center' }}>
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              style={{ 
                                width: '80px', 
                                height: '80px', 
                                objectFit: 'contain', 
                                background: 'var(--surface-input)', /* <-- ЗМІНЕНО */
                                borderRadius: '8px', 
                                imageRendering: 'pixelated' 
                              }} 
                            />
                            <div>
                                <p className="p" style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.name}</p> {/* <-- ЗМІНЕНО */}
                                <p className="p" style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
                                    {item.quantity} шт. x {formatPrice(item.price)}
                                </p>
                            </div>
                            <p className="p mono" style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', textAlign: 'right', color: 'var(--text-primary)' }}> {/* <-- ЗМІНЕНО */}
                                {formatPrice(item.quantity * item.price)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}