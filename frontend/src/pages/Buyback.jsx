// src/pages/Buyback.jsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const BuybackWrapper = styled(motion.div)`
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
`;

const SectionTitle = styled.h2`
  text-align: center;
  margin-bottom: 24px;
  color: var(--accent-turquoise); /* <-- ЗМІНЕНО */
  text-shadow: 0 0 10px var(--accent-turquoise); /* <-- ЗМІНЕНО */
`;
const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const CategoryCard = styled.div`
  padding: 16px;
  border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
  border-radius: var(--radius);
  background: var(--surface-input); /* <-- ЗМІНЕНО */
`;

const CategoryTitle = styled.h3`
  font-size: 16px;
  text-align: center;
  color: var(--accent-yellow); /* <-- ЗМІНЕНО */
  margin-bottom: 16px;
`;

const ConditionList = styled.ul`
  padding-left: 20px;
  list-style-type: '✓ ';
`;
const ConditionItem = styled.li`
  font-size: 11px;
  line-height: 1.6;
  margin-bottom: 8px;
  padding-left: 8px;
  color: var(--text-secondary); /* <-- ЗМІНЕНО */
  opacity: 1; /* <-- ЗМІНЕНО */
`;
export default function Buyback() {
  return (
    <BuybackWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="h1 retro" style={{ textAlign: 'center', marginBottom: '32px' }}>
        Викуп консолей та ігор
      </h1>

      <Section className="surface">
        <SectionTitle className="h2 mono">Що ми викуповуємо?</SectionTitle>
        <p className="p" style={{ textAlign: 'center', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto 32px', color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
          Ми купуємо широкий спектр ігрових товарів — від ретро-класики до сучасних консолей. Головна умова — робочий стан та товарний вигляд. Нижче наведено основні категорії та вимоги до них.
        </p>
        <CategoryGrid>
          <CategoryCard>
            <CategoryTitle className="mono">Консолі</CategoryTitle>
            <ConditionList>
              <ConditionItem>PlayStation (PS1-PS5)</ConditionItem>
              <ConditionItem>Xbox (Original-Series X/S)</ConditionItem>
              <ConditionItem>Nintendo (NES-Switch)</ConditionItem>
              <ConditionItem>Sega, Atari, PSP, PS Vita</ConditionItem>
              <ConditionItem>Повна комплектація (кабелі, геймпад)</ConditionItem>
              <ConditionItem>Без серйозних пошкоджень корпусу</ConditionItem>
            </ConditionList>
          </CategoryCard>
          
          <CategoryCard>
            <CategoryTitle className="mono">Аксесуари</CategoryTitle>
            <ConditionList>
              <ConditionItem>Оригінальні геймпади</ConditionItem>
              <ConditionItem>Kinect, PS Move, VR-гарнітури</ConditionItem>
              <ConditionItem>Карти пам'яті</ConditionItem>
              <ConditionItem>Специфічні кабелі та блоки живлення</ConditionItem>
              <ConditionItem>Повністю робочий стан</ConditionItem>
            </ConditionList>
          </CategoryCard>

          <CategoryCard>
            <CategoryTitle className="mono">Ігри на дисках</CategoryTitle>
            <ConditionList>
              <ConditionItem>Ігри для PlayStation, Xbox, Nintendo</ConditionItem>
              <ConditionItem>Ліцензійні диски</ConditionItem>
              <ConditionItem>Без глибоких подряпин</ConditionItem>
              <ConditionItem>Бажано з оригінальною коробкою та поліграфією</ConditionItem>
            </ConditionList>
          </CategoryCard>
        </CategoryGrid>
      </Section>
      
      <Section style={{textAlign: 'center', background: 'none', border: 'none', boxShadow: 'none'}}> {/* <-- ЗМІНЕНО */}
        <p className="p" style={{ color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
          Для оцінки вашого товару, будь ласка, напишіть нам у <Link to="/contacts" style={{color: 'var(--accent-turquoise)'}}>Telegram</Link>, додавши фото та детальний опис.
        </p>
      </Section>
    </BuybackWrapper>
  );
}