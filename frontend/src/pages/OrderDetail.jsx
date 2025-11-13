// src/pages/OrderDetail.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { motion } from 'framer-motion';
import formatPrice from '../utils/formatPrice';

const getOptimizedOrderImageUrl = (originalUrl, width = 320, quality = 82) => {
    if (!originalUrl) return '/assets/bitzone-logo1.png';
    return `/api/images?url=${encodeURIComponent(originalUrl)}&w=${width}&q=${quality}`;
};

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

        const fetchOrder = async () => {
            try {
                const { data } = await axios.get(`/api/orders/${orderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setOrder(data);
                setLoading(false);
            } catch (err) {
                console.error('Помилка завантаження замовлення:', err?.response?.data || err.message);
                setError(
                    err?.response?.data?.message ||
                    'Не вдалося завантажити деталі замовлення. Спробуйте пізніше.'
                );
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId, token, isAuthenticated, navigate]);

    if (loading) {
        return (
            <div className="container" style={{ padding: '40px 0' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Завантаження замовлення…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container" style={{ padding: '40px 0' }}>
                <p style={{ color: 'var(--danger)' }}>{error}</p>
                <button
                    className="btn"
                    style={{ marginTop: 16 }}
                    onClick={() => navigate('/account')}
                >
                    Повернутися в профіль
                </button>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="container" style={{ padding: '40px 0' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Замовлення не знайдено.</p>
                <button
                    className="btn"
                    style={{ marginTop: 16 }}
                    onClick={() => navigate('/account')}
                >
                    Повернутися в профіль
                </button>
            </div>
        );
    }

    const date = order.createdAt || order.created_at || order.date || '';
    const formattedDate = date
        ? new Date(date).toLocaleDateString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
        : '';

    const statusTitle =
        order.status?.title ||
        order.status?.name ||
        order.statusTitle ||
        order.statusText ||
        'В обробці';

    const isPaid =
        statusTitle === 'Оплачено' ||
        statusTitle === 'Виконано' ||
        statusTitle === 'Paid' ||
        statusTitle === 'Completed';

    const statusColor = isPaid ? 'var(--accent-green)' : 'var(--accent-yellow)';

    return (
        <motion.div
            className="page order-detail-page"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
        >
            <div className="container" style={{ paddingTop: 24, paddingBottom: 32 }}>
                <div style={{ marginBottom: 16 }}>
                    <Link
                        to="/account"
                        style={{
                            color: 'var(--link)',
                            fontSize: 14,
                            textDecoration: 'none',
                        }}
                    >
                        ← Назад до профілю
                    </Link>
                </div>

                <div
                    className="surface"
                    style={{
                        borderRadius: 18,
                        padding: 20,
                        marginBottom: 24,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            marginBottom: 12,
                        }}
                    >
                        <h1
                            className="h2 mono"
                            style={{
                                margin: 0,
                                color: 'var(--text-primary)',
                            }}
                        >
                            Замовлення #{order.id || order._id}
                        </h1>
                        {formattedDate && (
                            <p
                                className="p"
                                style={{
                                    margin: 0,
                                    fontSize: 14,
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                від {formattedDate}
                            </p>
                        )}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 8,
                        }}
                    >
                        <p
                            className="p"
                            style={{
                                margin: 0,
                                fontSize: 14,
                                padding: '4px 10px',
                                borderRadius: 999,
                                border: `1px solid ${statusColor}`,
                                color: statusColor,
                                textTransform: 'uppercase',
                                letterSpacing: 0.06,
                                background: 'rgba(255,255,255,0.02)',
                            }}
                        >
                            {statusTitle}
                        </p>
                        <p
                            className="p"
                            style={{
                                margin: 0,
                                fontWeight: 'bold',
                                color: 'var(--accent-green)',
                                fontSize: 18,
                            }}
                        >
                            {formatPrice(order.total)}
                        </p>
                    </div>
                </div>

                <h3
                    className="h2 mono"
                    style={{
                        marginTop: 32,
                        marginBottom: 16,
                        color: 'var(--text-primary)',
                    }}
                >
                    Склад замовлення
                </h3>

                <div style={{ display: 'grid', gap: 16 }}>
                    {order.items?.map(item => (
                        <div
                            key={item.id}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '80px 1fr auto',
                                gap: 16,
                                alignItems: 'center',
                            }}
                        >
                            <img
                                src={
                                    item.image
                                        ? getOptimizedOrderImageUrl(item.image, 480, 82)
                                        : '/assets/bitzone-logo1.png'
                                }
                                alt={item.name}
                                style={{
                                    width: 80,
                                    height: 80,
                                    objectFit: 'contain',
                                    background: 'var(--surface-input)',
                                    borderRadius: 8,
                                    imageRendering: 'pixelated',
                                }}
                            />
                            <div>
                                <p
                                    className="p"
                                    style={{
                                        margin: 0,
                                        fontWeight: 500,
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    {item.name}
                                </p>
                                <p
                                    className="p"
                                    style={{
                                        margin: '4px 0 0',
                                        fontSize: 11,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    {item.quantity} шт. x {formatPrice(item.price)}
                                </p>
                            </div>
                            <p
                                className="p mono"
                                style={{
                                    margin: 0,
                                    textAlign: 'right',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                {formatPrice(item.quantity * item.price)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
