// src/pages/Contacts.jsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

// Створюємо стилізовані компоненти для кращого вигляду
const ContactWrapper = styled(motion.div)`
  max-width: 800px;
  margin: 0 auto;
`;
const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
  /* Додаємо стилі .surface */
  background: var(--surface-gradient); 
  border: 1px solid var(--border-primary); 
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
`;

const InfoBlock = styled.div`
  padding: 24px;
  text-align: center;
  .p { /* Специфічно для .p всередині */
     color: var(--text-secondary);
  }
  a { /* Специфічно для посилань всередині */
    color: var(--accent-turquoise);
  }
`;

const Icon = styled.span`
  font-size: 28px;
  margin-bottom: 12px;
  display: block;
`;
export default function Contacts() {
  return (
    <ContactWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="h1 retro" style={{ textAlign: 'center', marginBottom: '32px' }}>
        Контакти та графік роботи
      </h1>

      <InfoGrid className="surface">
        <InfoBlock>
          <Icon>📞</Icon>
          <h3 className="h2 mono" style={{ color: 'var(--accent-yellow)', margin: '0 0 8px 0' }}> {/* <-- ЗМІНЕНО */}
            Як з нами зв'язатись?
          </h3>
          <p className="p">Телефон: <a href="tel:+380505812852">+38 (050) 581-28-52</a></p>
          <p className="p">Email: <a href="mailto:support@bitzone.com">support@bitzone.com</a></p>
          <p className="p">Telegram: <a href="https://t.me/BITZone_Shop" target="_blank" rel="noopener noreferrer">@bitzone_support</a></p>
        </InfoBlock>

        <InfoBlock style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '24px' }}> {/* <-- ЗМІНЕНО */}
          <Icon>🕒</Icon>
          <h3 className="h2 mono" style={{ color: 'var(--accent-turquoise)', margin: '0 0 8px 0' }}> {/* <-- ЗМІНЕНО */}
            Графік роботи
          </h3>
          <p className="p">Прийом замовлень на сайті: <strong>Цілодобово</strong></p>
          <p className="p">Консультації та підтримка:</p>
          <p className="p"><strong>Пн-Нд:</strong> 10:00 - 21:00</p>
        </InfoBlock>
      </InfoGrid>
    </ContactWrapper>
  );
}