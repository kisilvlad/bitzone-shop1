// src/pages/Installment.jsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const InstallmentWrapper = styled(motion.div)`
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
  color: var(--accent-green); /* <-- ЗМІНЕНО */
  text-shadow: 0 0 10px var(--accent-green); /* <-- ЗМІНЕНО */
`;
const BankGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const BankCard = styled.div`
  padding: 24px;
  border-radius: var(--radius);
  background: var(--surface-input); /* <-- ЗМІНЕНО */
  border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  
  .p {
    color: var(--text-secondary);
  }
`;
const BankLogo = styled.img`
  max-height: 50px;
  max-width: 180px;
  margin-bottom: 20px;
  
  /* Робимо логотипи видимими на світлому фоні */
  [data-theme="light"] & {
    filter: invert(1);
    &[alt*="ПриватБанк"] { /* Це SVG, він краще виглядає без інверсії */
       filter: none;
    }
  }
`;
export default function Installment() {
  return (
    <InstallmentWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="h1 retro" style={{ textAlign: 'center', marginBottom: '32px' }}>
        Розстрочка від Monobank та ПриватБанк
      </h1>

      <Section className="surface">
        <SectionTitle className="h2 mono">Купуй зараз — плати потім!</SectionTitle>
        <p className="p" style={{ textAlign: 'center', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto 32px' }}>
          У BiTZone ти можеш придбати будь-який товар, розділивши платіж на зручну кількість частин за допомогою сервісів від Monobank та ПриватБанк.
        </p>
        <BankGrid>
          {/* Картка Monobank */}
          <BankCard>
            <BankLogo src={process.env.PUBLIC_URL + '/assets/icons/monobank.jpeg'} alt="Monobank" />
            <h3 className="h2 mono" style={{ fontSize: '18px', color: 'var(--accent-yellow)' }}>Покупка частинами</h3> {/* <-- ЗМІНЕНО */}
            <p className="p" style={{ flexGrow: 1, marginTop: '16px' }}>
              Розділяй суму покупки на строк до 4 місяців без жодних комісій та переплат.
              Все, що потрібно — бути клієнтом Monobank.
            </p>
            <p className="p" style={{ marginTop: '16px' }}>
              <strong>Як скористатись:</strong> при оформленні замовлення вибери спосіб оплати "Розстрочка" та підтвердь покупку в додатку Monobank.
            </p>
          </BankCard>
          
          {/* Картка ПриватБанк */}
          <BankCard>
            <BankLogo src={process.env.PUBLIC_URL + '/assets/icons/PrivatBank.svg'} alt="ПриватБанк" />
            <h3 className="h2 mono" style={{ fontSize: '18px', color: 'var(--accent-turquoise)' }}>Оплата частинами</h3> {/* <-- ЗМІНЕНО */}
            <p className="p" style={{ flexGrow: 1, marginTop: '16px' }}>
              Класичний сервіс, що дозволяє розбити платіж на рівні частини.
              Потрібна лише картка "Універсальна" від ПриватБанку.
            </p>
            <p className="p" style={{ marginTop: '16px' }}>
              <strong>Як скористатись:</strong> вибери відповідний спосіб оплати на сайті та вкажи бажану кількість платежів.
            </p>
          </BankCard>
        </BankGrid>
        <p className="p" style={{ textAlign: 'center', marginTop: '32px' }}>
          За детальною інформацією звертайтесь до наших <Link to="/contacts" style={{color: 'var(--accent-pink)'}}>менеджерів</Link>. {/* <-- ЗМІНЕНО */}
        </p>
      </Section>
    </InstallmentWrapper>
  );
}