import React, { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { testProducts } from '../utils/testData';

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Імітація завантаження з бекенду
    setTimeout(() => setProducts(testProducts), 500);
  }, []);

  const featured = products.slice(0, 8);
  const retroProducts = products.filter(p => p.isRetro).slice(0, 4);
  const newGenProducts = products.filter(p => !p.isRetro).slice(0, 4);
  const portableProducts = products.filter(p => p.category === 'PORTABLE').slice(0, 4);
  const accessories = products.filter(p => p.category === 'ACCESSORIES').slice(0, 4);

  return (
    <>
      {/* HERO */}
      <section>
        <div className="container">
          <div className="surface shimmer" style={{ padding: '32px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-neon)', position: 'relative', overflow: 'hidden' }}>
            <div className="grid grid-2" style={{ alignItems: 'center' }}>
              <div>
                <h1 className="h1 retro" style={{ color: 'var(--yellow)', textShadow: '0 0 8px var(--yellow)' }}>BiTZone – Твій Портал у Світ Консолей</h1>
                <p className="p" style={{ maxWidth: 560, marginBottom: 16 }}>
                  Від класичних NES та Sega до потужних PS5 та Xbox Series X. Ретро-ігри, аксесуари, картриджі – все для справжніх фанатів. Ностальгія та новинки в одному місці!
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                  <a href="/products" className="btn shimmer">Переглянути Каталог</a>
                  <a href="/cart" className="btn btn-green shimmer">Кошик</a>
                </div>
              </div>
              <div className="center">
                <img src="/assets/bitzone-logo1.png" alt="BitZone" style={{ width: '100%', imageRendering: 'pixelated', filter: 'drop-shadow(0 0 16px var(--turquoise))', animation: 'pulse 2s infinite' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section style={{ marginTop: 40 }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className="h2 mono" style={{ color: 'var(--turquoise)', textShadow: '0 0 6px var(--turquoise)' }}>Хіти Тижня</h2>
            <a href="/products" className="p" style={{ color: 'var(--pink)' }}>Увесь каталог →</a>
          </div>
          <div className="grid grid-4">
            {featured.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      </section>

      {/* RETRO SECTION */}
      <section style={{ marginTop: 40 }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className="h2 mono" style={{ color: 'var(--pink)' }}>Ретро Класика: Sega, NES, Dendy</h2>
            <a href="/products?category=RETRO" className="p">Більше ретро →</a>
          </div>
          <div className="grid grid-4">
            {retroProducts.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      </section>

      {/* NEW GEN SECTION */}
      <section style={{ marginTop: 40 }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className="h2 mono" style={{ color: 'var(--yellow)' }}>Нове Покоління: PS5, Xbox, Switch</h2>
            <a href="/products?category=NEW GEN" className="p">Більше новинок →</a>
          </div>
          <div className="grid grid-4">
            {newGenProducts.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      </section>

      {/* PORTABLE SECTION */}
      <section style={{ marginTop: 40 }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className="h2 mono" style={{ color: 'var(--orange)' }}>Портативні Консолі: GameBoy, PSP</h2>
            <a href="/products?category=PORTABLE" className="p">Більше портативних →</a>
          </div>
          <div className="grid grid-4">
            {portableProducts.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      </section>

      {/* ACCESSORIES SECTION */}
      <section style={{ marginTop: 40 }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className="h2 mono" style={{ color: 'var(--green)' }}>Аксесуари та Ігри</h2>
            <a href="/products?category=ACCESSORIES" className="p">Більше аксесуарів →</a>
          </div>
          <div className="grid grid-4">
            {accessories.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ marginTop: 40, marginBottom: 40 }}>
        <div className="container">
          <h2 className="h2 mono" style={{ color: 'var(--turquoise)', textAlign: 'center', marginBottom: 20 }}>Відгуки Наших Геймерів</h2>
          <div className="grid grid-3">
            {[
              { name: 'Олександр', text: 'Купив NES – ностальгія на повну! Доставка швидка.', rating: 5 },
              { name: 'Марія', text: 'PS5 з аксесуарами – все супер, рекомендую!', rating: 5 },
              { name: 'Іван', text: 'Ретро картриджі в ідеальному стані.', rating: 4 },
            ].map((rev, i) => (
              <div key={i} className="surface shimmer" style={{ padding: 20, borderRadius: 'var(--radius)' }}>
                <p className="p">{rev.text}</p>
                <div style={{ marginTop: 12, color: 'var(--yellow)' }}>{'★'.repeat(rev.rating)}</div>
                <div className="mono" style={{ fontSize: 12, opacity: .8, marginTop: 8 }}>- {rev.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}