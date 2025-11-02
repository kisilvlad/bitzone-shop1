// src/pages/Returns.jsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const ReturnsWrapper = styled(motion.div)`
  max-width: 800px;
  margin: 0 auto;
`;

const Section = styled.section`
  margin-bottom: 32px;
  padding: 24px;
  /* Додаємо стилі .surface */
  background: var(--surface-gradient); 
  border: 1px solid var(--border-primary); 
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  
  .p {
    color: var(--text-secondary);
  }
`;

const SectionTitle = styled.h2`
  text-align: center;
  margin-bottom: 24px;
  color: var(--accent-pink); /* <-- ЗМІНЕНО */
  text-shadow: 0 0 10px var(--accent-pink); /* <-- ЗМІНЕНО */
`;
const ListItem = styled.li`
  font-family: 'Press Start 2P', cursive;
  font-size: 12px;
  color: var(--text-secondary); /* <-- ЗМІНЕНО */
  opacity: 1; /* <-- ЗМІНЕНО */
  margin-bottom: 12px;
  line-height: 1.7;
`;

export default function Returns() {
  return (
    <ReturnsWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="h1 retro" style={{ textAlign: 'center', marginBottom: '32px' }}>
        Повернення та обмін
      </h1>

      <Section className="surface">
        <SectionTitle className="h2 mono">Умови повернення</SectionTitle>
        <p className="p" style={{ marginBottom: '24px' }}>
          Ми дбаємо про наших клієнтів і дотримуємося Закону України "Про захист прав споживачів". Ви можете повернути або обміняти товар протягом **14 днів** з моменту покупки.
        </p>

        <h3 className="h2 mono" style={{ fontSize: '16px', color: 'var(--accent-yellow)', marginBottom: '16px' }}>Поверненню підлягає:</h3> {/* <-- ЗМІНЕНО */}
        <ul style={{ paddingLeft: '20px' }}>
          <ListItem>Товар, який не був у використанні та не має слідів експлуатації (подряпин, сколів, потертостей).</ListItem>
          <ListItem>Збережено повну комплектацію товару та цілісність упаковки.</ListItem>
          <ListItem>Збережено всі ярлики та заводське маркування.</ListItem>
        </ul>

        <h3 className="h2 mono" style={{ fontSize: '16px', color: 'var(--accent-yellow)', marginTop: '24px', marginBottom: '16px' }}>Поверненню не підлягають:</h3> {/* <-- ЗМІНЕНО */}
        <ul style={{ paddingLeft: '20px' }}>
          <ListItem>Диски з іграми, якщо їх упаковка була відкрита (блістер пошкоджено).</ListItem>
          <ListItem>Карти поповнення, цифрові коди та інші товари з одноразовою активацією.</ListItem>
          <ListItem>Товари, що мають сліди втручання або ремонту.</ListItem>
        </ul>

        <p className="p" style={{ marginTop: '24px' }}>
          Для оформлення повернення, будь ласка, зв'яжіться з нами через сторінку <Link to="/contacts" style={{color: 'var(--accent-turquoise)'}}>Контакти</Link>, вказавши номер вашого замовлення.
        </p>
      </Section>
    </ReturnsWrapper>
  );
}