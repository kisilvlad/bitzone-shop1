// src/pages/About.jsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

const AboutWrapper = styled(motion.div)`
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
`;
const Section = styled.section`
  margin-bottom: 40px;
  padding: 24px;
  border-radius: var(--radius);
  background: var(--surface-gradient); /* <-- ЗМІНЕНО */
  border: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
  box-shadow: var(--shadow-card); /* <-- ЗМІНЕНО */
`;
const SectionTitle = styled.h2`
  color: var(--accent-yellow); /* <-- ЗМІНЕНО */
  text-shadow: 0 0 10px var(--accent-yellow); /* <-- ЗМІНЕНО */
  margin-bottom: 16px;
`;
const MissionTitle = styled(SectionTitle)`
  color: var(--accent-turquoise); /* <-- ЗМІНЕНО */
  text-shadow: 0 0 10px var(--accent-turquoise); /* <-- ЗМІНЕНО */
`;
export default function About() {
  return (
    <AboutWrapper
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="h1 retro" style={{ marginBottom: '32px' }}>
        Про BiTZone
      </h1>

      <Section className="surface">
        <SectionTitle className="h2 mono">Наша Історія</SectionTitle>
        <p className="p" style={{ textAlign: 'left', lineHeight: 1.8, color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
          Все почалося з простої ідеї — створити місце, де кожен геймер, від новачка до ветерана, міг би знайти щось для себе. Ми, засновники BiTZone, самі виросли на класичних іграх 8-бітних та 16-бітних епох і хотіли поділитися цією пристрастю з іншими.
        </p>
        <p className="p" style={{ textAlign: 'left', lineHeight: 1.8, color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
          Наш магазин — це не просто бізнес, це спільнота. Ми віримо, що 
          кожна консоль, кожен картридж має свою історію, і наше завдання — допомогти цим історіям знайти новий дім.
        </p>
      </Section>

      <Section className="surface">
        <MissionTitle className="h2 mono">Наша Місія</MissionTitle>
        <p className="p" style={{ textAlign: 'left', lineHeight: 1.8, color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
          Наша місія — зробити світ геймінгу доступним для всіх.
          Ми прагнемо не просто продавати консолі та ігри, а й надавати чесний сервіс з викупу та обміну (Trade-In), даючи старим пристроям друге життя.
          Ми хочемо, щоб кожен міг доторкнутися як до гарячих новинок, так і до теплої ностальгії ретро-ігор.
        </p>
      </Section>
    </AboutWrapper>
  );
}