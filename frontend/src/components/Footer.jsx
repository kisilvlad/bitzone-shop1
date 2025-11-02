import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

// ——— ОНОВЛЕНІ СТИЛІ ———
const Wrap = styled.footer`
  margin-top: 48px;
  background: var(--surface-footer-bg); /* <-- ЗМІНЕНО */
  border-top: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
  padding: 40px 0;
`;

const Grid = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  @media(max-width: 820px) {
    grid-template-columns: 1fr 1fr;
  }
  @media(max-width: 540px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const FooterColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FooterLink = styled(Link)`
  color: var(--text-secondary); /* <-- ЗМІНЕНО */
  opacity: 1; /* <-- ЗМІНЕНО */
  text-decoration: none;
  font-size: 12px;
  transition: all 0.2s ease;
  &:hover {
    opacity: 1;
    color: var(--accent-turquoise);
    text-shadow: 0 0 8px var(--accent-turquoise);
    transform: translateX(3px);
  }
  @media(max-width: 540px) {
    &:hover {
      transform: translateX(0) scale(1.05);
    }
  }
`;
// ——— КІНЕЦЬ ОНОВЛЕНИХ СТИЛІВ ———

const Logo = styled.img`
  width: 200px;
  height: 100px;
  image-rendering: pixelated;
  @media(max-width: 540px) {
    margin: 0 auto;
  }
`;

export default function Footer() {
  return (
    <Wrap className="footer">
      <div className="container">
        <Grid>
          {/* Колонка 1: Лого та інформація */}
          <FooterColumn>
            {/* --- ВИПРАВЛЕННЯ ТУТ --- */}
            <Logo src={process.env.PUBLIC_URL + '/assets/levelup.png'} alt="LevelUp Logo" />
            
            <p className="p">BiTZone — портал у світ консолей. Купуй, продавай та обмінюй ігрові скарби з нами!</p> {/* [cite: 47] */}
          </FooterColumn>

          {/* Колонка 2: Послуги */}
          <FooterColumn>
            <h3 className="h2 mono" style={{ color: 'var(--accent-yellow)' }}>Послуги</h3> {/* <-- ЗМІНЕНО */}
            <FooterLink to="/trade-in">Обмін (Trade-In)</FooterLink>
            <FooterLink to="/buyback">Викуп консолей та ігор</FooterLink>
            <FooterLink to="/installment">Розстрочка</FooterLink>
            <FooterLink to="/dropshipping">Дропшипінг</FooterLink>
          </FooterColumn>

          {/* Колонка 3: Інформація */}
          <FooterColumn>
            <h3 className="h2 mono" style={{ color: 'var(--accent-turquoise)' }}>Інформація</h3> {/* <-- ЗМІНЕНО */}
            <FooterLink to="/about">Історія та місія</FooterLink>
            <FooterLink to="/delivery">Доставка та оплата</FooterLink>
            <FooterLink to="/returns">Повернення та обмін</FooterLink>
            <FooterLink to="/contacts">Контакти та графік</FooterLink>
          </FooterColumn>

          {/* Колонка 4: Соціальні мережі */}
          <FooterColumn style={{ alignItems: 'center', gap: 8 }}>
            <h3 className="h2 mono" style={{ color: 'var(--accent-pink)' }}>Ми в мережі</h3> {/* <-- ЗМІНЕНО */}
     
            {/* --- І ВИПРАВЛЕННЯ ТУТ --- */}
            <img src={process.env.PUBLIC_URL + '/assets/qr-code.png'} alt="QR code for Telegram" style={{ width: 120, height: 120, maxWidth: '100%' }} />
            <p className='p' style={{fontSize: 10, textAlign: 'center'}}>Скануй для зв'язку!</p>
          </FooterColumn>
        </Grid>
        <div style={{ marginTop: 32, opacity: .7, fontSize: 12, textAlign: 'center', color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
    
          © {new Date().getFullYear()} BiTZone by kysildev. Всі права захищено.
        </div>
      </div>
    </Wrap>
  );
}