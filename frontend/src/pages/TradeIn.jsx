// src/pages/TradeIn.jsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const TradeInWrapper = styled(motion.div)`
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
  color: var(--accent-yellow); /* <-- ЗМІНЕНО */
  text-shadow: 0 0 10px var(--accent-yellow); /* <-- ЗМІНЕНО */
`;
const StepGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

const StepCard = styled.div`
  text-align: center;
  padding: 16px;
  border: 1px dashed var(--accent-turquoise); /* <-- ЗМІНЕНО */
  border-radius: var(--radius);
  background: var(--surface-input); /* <-- ЗМІНЕНО */
  
  h3 {
     color: var(--text-primary);
  }
  .p {
     color: var(--text-secondary);
  }
  a {
     color: var(--accent-turquoise);
  }
`;

const StepNumber = styled.div`
  font-size: 28px;
  font-weight: bold;
  color: var(--accent-turquoise); /* <-- ЗМІНЕНО */
  margin-bottom: 12px;
`;

export default function TradeIn() {
  return (
    <TradeInWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="h1 retro" style={{ textAlign: 'center', marginBottom: '32px' }}>
        Обмін (Trade-In)
      </h1>

      <Section className="surface">
        <SectionTitle className="h2 mono">Що таке Trade-In?</SectionTitle>
        <p className="p" style={{ textAlign: 'center', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto 24px' }}>
          Trade-In — це вигідна послуга, яка дозволяє тобі обміняти твої старі ігрові консолі, диски та аксесуари на **знижку** для покупки нових товарів у BiTZone!
        </p>
        <p className="p" style={{ textAlign: 'center', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto' }}>
          Не дозволяй своїм старим іграм припадати пилом. Перетвори їх на новий ігровий досвід!
        </p>
      </Section>

      <Section style={{ background: 'none', border: 'none', boxShadow: 'none'}}> {/* <-- ЗМІНЕНО */}
        <SectionTitle className="h2 mono" style={{color: 'var(--accent-green)', textShadow: '0 0 10px var(--accent-green)'}}>Як це працює?</SectionTitle> {/* <-- ЗМІНЕНО */}
        <StepGrid>
          <StepCard>
            <StepNumber className="retro">1</StepNumber>
            <h3 className="h2 mono" style={{ fontSize: '16px' }}>Оцінка</h3>
            <p className="p">Зв'яжися з нами через <Link to="/contacts">Telegram</Link>, опиши свій товар та надішли фото.
            Наш менеджер проведе попередню оцінку.</p>
          </StepCard>
          
          <StepCard>
            <StepNumber className="retro">2</StepNumber>
            <h3 className="h2 mono" style={{ fontSize: '16px' }}>Відправка</h3>
            <p className="p">Надішли нам свій товар "Новою Поштою" для фінальної перевірки.
            Ми оглянемо його стан та підтвердимо остаточну вартість.</p>
          </StepCard>

          <StepCard>
            <StepNumber className="retro">3</StepNumber>
            <h3 className="h2 mono" style={{ fontSize: '16px' }}>Обмін</h3>
            <p className="p">Отримай суму оцінки у вигляді **знижки** на будь-який товар з нашого каталогу.
            Обирай нову гру чи консоль і просто доплати різницю!</p>
          </StepCard>
        </StepGrid>
      </Section>

      <Section className="surface" style={{textAlign: 'center'}}>
        <SectionTitle className="h2 mono" style={{color: 'var(--accent-pink)', textShadow: '0 0 10px var(--accent-pink)'}}>Що ми приймаємо?</SectionTitle> {/* <-- ЗМІНЕНО */}
        <p className="p" style={{marginBottom: '16px'}}>Ми приймаємо широкий асортимент товарів.
        Детальніше про те, що саме підлягає викупу та обміну, читай на сторінці:</p>
        <Link to="/buyback" className="btn btn-wish">Умови викупу</Link>
      </Section>

    </TradeInWrapper>
  );
}