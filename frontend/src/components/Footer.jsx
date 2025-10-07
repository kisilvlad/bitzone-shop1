import React from 'react';
import styled from 'styled-components';

const Wrap = styled.footer`
  margin-top: 48px;
  background: linear-gradient(180deg, #7B2CBF 0%, #0A0A0A 100%);
  border-top: 1px solid rgba(255,255,255,.06);
  padding: 40px 0; /* Збільшив падінг */
`;

const Grid = styled.div`
  display: grid; gap: 24px; grid-template-columns: 1.2fr 1fr 1fr 1fr; /* Додав колонку для соціальних */
  @media(max-width:820px){ grid-template-columns: 1fr; text-align: center }
`;

const Logo = styled.img`width: 120px; image-rendering: pixelated;`;

export default function Footer() {
  return (
    <Wrap className="footer">
      <div className="container">
        <Grid>
          <div>
            <Logo src="/assets/levelup.png" alt="LevelUp" style={{ width: 200, height: 100, imageRendering: 'pixelated' }} />
            <p className="p">BiTZone — портал у світ консолей: від NES до PS5. Ремонт, аксесуари, ігри. Ностальгія та новинки!</p>
          </div>
          <div>
            <h3 className="h2 mono" style={{ color: 'var(--yellow)' }}>Контакти</h3>
            <p className="p">Тел: </p>
            <p className="p">Київ • Доставка: Нова Пошта, Укр Пошта.</p>
          </div>
          <div>
            <h3 className="h2 mono" style={{ color: 'var(--turquoise)' }}>Соціальні Мережі</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li><a href="https://t.me/" className="p">Telegram</a></li>
              <li><a href="https://www.instagram.com/" className="p">Instagram</a></li>
              <li><a href="https://www.tiktok.com/" className="p">TikTok</a></li>
            </ul>
          </div>
          <div>
            <h3 className="h2 mono" style={{ color: 'var(--turquoise)' }}>Скануй QR для Telegram!</h3>
            <img src="/assets/qr-code.png" alt="QR" style={{ width: 200 }} />
          </div>
        </Grid>
        <div style={{ marginTop: 24, opacity: .7, fontSize: 12, textAlign: 'center' }}>
          © {new Date().getFullYear()} BiTZone by kysildev. Всі права захищено.
        </div>
      </div>
    </Wrap>
  );
}