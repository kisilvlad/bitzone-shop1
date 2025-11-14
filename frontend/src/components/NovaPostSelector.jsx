import React, { useState, useEffect } from "react";
import axios from "axios";

export default function NovaPostSelector({ onChange }) {
  const [cities, setCities] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  // Пошук міст (autocomplete)
  useEffect(() => {
    if (cityQuery.length < 2) return;

    const load = async () => {
      const { data } = await axios.get("/api/novapost/cities", {
        params: { search: cityQuery },
      });
      setCities(data);
    };

    load();
  }, [cityQuery]);

  // Підтягуємо відділення після вибору міста
  useEffect(() => {
    if (!selectedCity) return;

    const load = async () => {
      const { data } = await axios.get(
        `/api/novapost/warehouses/${selectedCity.ref}`
      );
      setWarehouses(data);
    };

    load();
  }, [selectedCity]);

  // Передаємо наверх (в Checkout) дані про доставку
  useEffect(() => {
    onChange({
      city: selectedCity?.name || "",
      cityRef: selectedCity?.ref || "",
      office: selectedWarehouse?.name || "",
      officeRef: selectedWarehouse?.ref || "",
    });
  }, [selectedCity, selectedWarehouse]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* Поле для пошуку міста */}
      <input
        type="text"
        className="input"
        placeholder="Місто (Нова Пошта)"
        value={cityQuery}
        onChange={(e) => setCityQuery(e.target.value)}
      />

      {/* Випадаючий список міст */}
      {cities.length > 0 && (
        <div
          className="dropdown"
          style={{
            border: "1px solid #1c1c1c",
            borderRadius: 8,
            background: "white",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {cities.map((c) => (
            <div
              key={c.ref}
              className="dropdown-item"
              onClick={() => {
                setSelectedCity(c);
                setCityQuery(c.name);
                setCities([]);
              }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}

      {/* Вибір відділення */}
      {selectedCity && (
        <select
          className="input"
          onChange={(e) =>
            setSelectedWarehouse(
              warehouses.find((w) => w.ref === e.target.value)
            )
          }
          style={{ padding: 12 }}
        >
          <option value="">Оберіть відділення</option>
          {warehouses.map((w) => (
            <option key={w.ref} value={w.ref}>
              {w.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
