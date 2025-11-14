// src/pages/OrderDetails.jsx

import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { motion } from "framer-motion";
import formatPrice from "../utils/formatPrice";

const mapStatus = (statusRaw) => {
  const s = (statusRaw || "").toLowerCase();

  if (s.includes("робот") || s.includes("processing")) return { label: "В роботі", color: "#28a745" };
  if (s.includes("оплач")) return { label: "Оплачено", color: "#00CED1" };
  if (s.includes("достав") || s.includes("complete")) return { label: "Доставлено", color: "#1fbf64" };
  if (s.includes("скас")) return { label: "Скасовано", color: "#dc3545" };
  return { label: statusRaw || "Статус", color: "#999" };
};

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { token, user, isAuthenticated } = useSelector((s) => s.auth);

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        // 1) основні дані замовлення
        const { data } = await axios.get(`/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setOrder(data);

        // 2) окремо підтягуємо ITEMS
        const itemsRes = await axios.get(`/api/orders/${orderId}/items`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const mapped = (itemsRes.data || []).map((it, index) => ({
          id: it.id || index,
          name: it.title || it.name || it.product_name || "Товар",
          quantity: it.quantity || 1,
          price: it.price || 0,
          image:
            it.image ||
            it.image_url ||
            (it.product && it.product.image) ||
            "/assets/images/placeholder-product.png",
        }));

        setItems(mapped);
        setState({ loading: false, error: "" });
      } catch (err) {
        console.error("Помилка завантаження:", err);
        setState({
          loading: false,
          error: "Не вдалося завантажити замовлення.",
        });
      }
    };

    load();
  }, [orderId, token]);

  if (state.loading)
    return (
      <div className="container" style={{ padding: "30px 0" }}>
        <div className="surface" style={{ padding: 20 }}>
          Завантаження замовлення...
        </div>
      </div>
    );

  if (state.error)
    return (
      <div className="container" style={{ padding: "30px 0" }}>
        <div className="surface" style={{ padding: 20 }}>{state.error}</div>
      </div>
    );

  if (!order) return null;

  const customerName =
    `${order.customer_first_name || user.firstName || ""} ${order.customer_last_name || user.lastName || ""}`.trim();

  const total =
    order.total ||
    items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const statusInfo = mapStatus(order.status?.title || order.status);

  return (
    <motion.div
      className="page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: "20px 0 40px" }}
    >
      <div className="container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Навігація */}
        <Link to="/account" style={{ color: "var(--turquoise-2)", fontSize: 14 }}>
          ← назад до акаунта
        </Link>

        {/* Хедер */}
        <div className="surface" style={{ padding: 20, borderRadius: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--yellow)" }}>
                Замовлення #{orderId}
              </div>
              <div style={{ fontSize: 14, color: "var(--text-3)", marginTop: 4 }}>
                {customerName || "Клієнт"}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  padding: "5px 14px",
                  borderRadius: 999,
                  border: `1px solid ${statusInfo.color}`,
                  color: statusInfo.color,
                  fontSize: 12,
                  textTransform: "uppercase",
                }}
              >
                {statusInfo.label}
              </span>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800 }}>
                {formatPrice(total)}
              </div>
            </div>
          </div>
        </div>

        {/* Склад */}
        <div className="surface" style={{ padding: 20, borderRadius: 18 }}>
          <h2 style={{ margin: 0, marginBottom: 12, fontSize: 18, fontWeight: 800 }}>
            Склад замовлення
          </h2>

          {items.map((item) => {
            const lineTotal = item.price * item.quantity;

            return (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Фото */}
                <div
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "var(--surface-2)",
                  }}
                >
                  <img
                    src={item.image}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    alt={item.name}
                  />
                </div>

                {/* Назва + кількість */}
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 14, color: "var(--text-3)" }}>
                    {item.quantity} шт × {formatPrice(item.price)}
                  </div>
                </div>

                {/* Сума */}
                <div style={{ fontWeight: 700 }}>
                  {formatPrice(lineTotal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
