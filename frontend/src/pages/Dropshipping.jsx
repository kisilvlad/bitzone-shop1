// src/pages/Dropshipping.jsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const DropshippingWrapper = styled(motion.div)`
  max-width: 800px;
  margin: 0 auto;
`;

const Section = styled.section`
  margin-bottom: 32px;
  padding: 24px;
  text-align: center;
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
  margin-bottom: 24px;
  color: var(--accent-yellow); /* <-- ЗМІНЕНО */
  text-shadow: 0 0 10px var(--accent-yellow); /* <-- ЗМІНЕНО */
`;
const StepGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 32px;
  @media (min-width: 820px) {
    grid-template-columns: repeat(4, 1fr);
  }
  @media (min-width: 540px) and (max-width: 819px) {
    grid-template-columns: 1fr 1fr;
  }
`;
const StepCard = styled.div`
  padding: 16px;
  border: 1px dashed var(--accent-purple); /* <-- ЗМІНЕНО */
  border-radius: var(--radius);
  background: var(--surface-input); /* <-- ЗМІНЕНО */
  
  h3 {
    color: var(--text-primary); /* <-- ЗМІНЕНО */
  }
  .p {
    color: var(--text-secondary); /* <-- ЗМІНЕНО */
  }
`;
const StepIcon = styled.div`
  font-size: 28px;
  margin-bottom: 12px;
  color: var(--accent-purple-dark); /* <-- ЗМІНЕНО */
`;
export default function Dropshipping() {
  return (
    <DropshippingWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="h1 retro" style={{ textAlign: 'center', marginBottom: '32px' }}>
        Співпраця по Дропшипінгу
      </h1>

      <Section className="surface">
        <SectionTitle className="h2 mono">Продавай, не купуючи!</SectionTitle>
        <p className="p" style={{ lineHeight: 1.7, maxWidth: '600px', margin: '0 auto' }}>
          BiTZone запрошує до співпраці інтернет-магазини, продавців на маркетплейсах та всіх, хто хоче заробляти на продажі ігрових товарів. З дропшипінгом вам не потрібен склад — ви продаєте наш товар, а ми відправляємо його напряму вашому клієнту!
        </p>

        <StepGrid>
          <StepCard>
            <StepIcon>🛒</StepIcon>
            <h3 className="h2 mono" style={{ fontSize: '14px' }}>Вибір товару</h3>
            <p className="p" style={{fontSize: '11px'}}>Ви розміщуєте наші товари у себе на платформі.</p>
          </StepCard>
          
          <StepCard>
            <StepIcon>📦</StepIcon>
            <h3 className="h2 mono" style={{ fontSize: '14px' }}>Замовлення</h3>
            <p className="p" style={{fontSize: '11px'}}>Клієнт робить замовлення у вас, ви передаєте його нам.</p>
          </StepCard>

          <StepCard>
            <StepIcon>🚚</StepIcon>
            <h3 className="h2 mono" style={{ fontSize: '14px' }}>Відправка</h3>
            <p className="p" style={{fontSize: '11px'}}>Ми пакуємо та відправляємо замовлення напряму вашому клієнту.</p>
          </StepCard>
          
          <StepCard>
            <StepIcon>💸</StepIcon>
            <h3 className="h2 mono" style={{ fontSize: '14px' }}>Прибуток</h3>
            <p className="p" style={{fontSize: '11px'}}>Ви отримуєте свій прибуток — різницю між вашою ціною та нашою.</p>
          </StepCard>
        </StepGrid>
      </Section>
      
      <Section style={{textAlign: 'center', background: 'none', border: 'none', boxShadow: 'none'}}> {/* <-- ЗМІНЕНО */}
        <h3 className="h2 mono" style={{color: 'var(--accent-turquoise)', marginBottom: '16px'}}>Готові почати?</h3> {/* <-- ЗМІНЕНО */}
        <p className="p">
          Щоб отримати прайс-лист та обговорити умови співпраці, зв'яжіться з нами через <Link to="/contacts" style={{color: 'var(--accent-pink)'}}>сторінку контактів</Link>. {/* <-- ЗМІНЕНО */}
        </p>
      </Section>
    </DropshippingWrapper>
  );
}