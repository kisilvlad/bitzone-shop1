// src/pages/Delivery.jsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

const DeliveryWrapper = styled(motion.div)`
  max-width: 900px;
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
`;

const SectionTitle = styled.h2`
  text-align: center;
  margin-bottom: 24px;
  color: var(--accent-yellow); /* <-- ЗМІНЕНО */
  text-shadow: 0 0 10px var(--accent-yellow); /* <-- ЗМІНЕНО */
`;
const MethodGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  @media (min-width: 540px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (min-width: 820px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;
const PaymentGrid = styled(MethodGrid)`
  @media (min-width: 820px) {
    grid-template-columns: 1fr 1fr;
  }
`;
const MethodCard = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
  border-radius: var(--radius);
  background: var(--surface-input); /* <-- ЗМІНЕНО */
  
  .p { /* Специфічно для .p всередині */
     color: var(--text-secondary);
  }
`;

// --- ЗМІНА №1: Створюємо контейнер для іконок ---
const IconWrapper = styled.div`
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  
  /* Фільтр для світлої теми */
  [data-theme="light"] & img {
     /* Інвертуємо логотипи, які є темними/чорними */
    &[alt*="Нова Пошта"], &[alt*="Meest Express"] {
       filter: invert(1);
    }
    /* Укрпошта вже інвертована, повертаємо її */
    &[alt*="Укрпошта"] {
       filter: invert(0);
    }
  }
`;
const Icon = styled.img`
  max-height: 100%; // Логотип вписується в контейнер
  max-width: 150px;
  object-fit: contain;
`;
const PaymentIcon = styled.div`
  font-size: 32px;
  margin-bottom: 12px;
`;
export default function Delivery() {
  return (
    <DeliveryWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="h1 retro" style={{ textAlign: 'center', marginBottom: '32px' }}>
        Доставка та оплата
      </h1>

      <Section className="surface">
        <SectionTitle className="h2 mono">Способи доставки</SectionTitle>
        <MethodGrid>
          {/* Картка Нової Пошти */}
          <MethodCard>
            <IconWrapper>
              <Icon src={process.env.PUBLIC_URL + '/assets/icons/nova-poshta.svg'} alt="Нова Пошта" />
            </IconWrapper>
            <h3 className="h2 mono" style={{ fontSize: '16px', color: 'var(--accent-turquoise)' }}>Нова Пошта</h3>
            <p className="p" style={{marginTop: 'auto'}}>Доставка у відділення або поштомат. Вартість за тарифами перевізника. Терміни: 1-3 дні.</p>
          </MethodCard>
          
          {/* Картка Укрпошти */}
          <MethodCard>
            <IconWrapper>
              {/* --- ЗМІНА №2: Додаємо CSS-фільтр для інверсії кольорів (ТІЛЬКИ для темної) --- */}
              <Icon 
                src={process.env.PUBLIC_URL + '/assets/icons/ukrposhta.svg'} 
                alt="Укрпошта" 
                style={{ filter: 'invert(1)' }} // Цей стиль перезапишеться селектором в IconWrapper
              />
            </IconWrapper>
            <h3 className="h2 mono" style={{ fontSize: '16px', color: 'var(--accent-turquoise)' }}>Укрпошта</h3>
            <p className="p" style={{marginTop: 'auto'}}>Доставка у відділення по всій Україні. Найдешевший спосіб доставки. Терміни: 3-7 днів.</p>
          </MethodCard>

          {/* Картка Meest Express */}
          <MethodCard>
            <IconWrapper>
              <Icon src={process.env.PUBLIC_URL + '/assets/icons/meest.svg'} alt="Meest Express" />
            </IconWrapper>
            <h3 className="h2 mono" style={{ fontSize: '16px', color: 'var(--accent-turquoise)' }}>Meest Express</h3>
            <p className="p" style={{marginTop: 'auto'}}>Доставка у відділення або кур'єром. Альтернативний варіант. Терміни: 2-5 днів.</p>
          </MethodCard>
        </MethodGrid>
      </Section>

      <Section className="surface">
        <SectionTitle className="h2 mono" style={{color: 'var(--accent-green)', textShadow: '0 0 10px var(--accent-green)'}}>Варіанти оплати</SectionTitle> {/* <-- ЗМІНЕНО */}
        <PaymentGrid>
          <MethodCard>
            <PaymentIcon>💰</PaymentIcon>
            <h3 className="h2 mono" style={{ fontSize: '16px', color: 'var(--accent-pink)' }}>Накладений платіж</h3> {/* <-- ЗМІНЕНО */}
            <p className="p" style={{marginTop: 'auto'}}>Оплата готівкою або карткою при отриманні товару у відділенні перевізника.</p>
          </MethodCard>
          
          <MethodCard>
            <PaymentIcon>💳</PaymentIcon>
            <h3 className="h2 mono" style={{ fontSize: '16px', color: 'var(--accent-pink)' }}>Оплата онлайн</h3> {/* <-- ЗМІНЕНО */}
            <p className="p" style={{marginTop: 'auto'}}>Оплата карткою Visa/MasterCard одразу на сайті через безпечну платіжну систему.</p>
          </MethodCard>
        </PaymentGrid>
      </Section>
    </DeliveryWrapper>
  );
}