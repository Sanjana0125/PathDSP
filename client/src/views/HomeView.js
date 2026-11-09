import React from 'react';

export default function HomeView({ onNavigate }) {
  const cards = [
    { icon: '◎', title: 'Command Center',           desc: 'System status, quick actions and your recent predictions.',   page: 'command' },
    { icon: '💊', title: 'Drug Sensitivity',         desc: 'Pick a cell line and drug, then read the IC50 gauge.',        page: 'prediction' },
    { icon: '🏆', title: 'Drug & Cell Ranking',      desc: 'Rank drugs for a cell line, or rank cell lines for a drug by predicted IC50.', page: 'ranking' },
    { icon: '🕸️', title: 'Pathway Enrichment',      desc: 'Explore cancer-related pathway activity and feature scores.', page: 'pathways' },
    { icon: '⚖️', title: 'Drug & Cell Comparison',   desc: 'Compare drugs side-by-side on a cell line or cell lines on a drug.', page: 'compare' },
    { icon: '🔭', title: 'Prediction Explorer',      desc: 'Browse and filter the full dataset of 37,000+ pairs.',       page: 'explorer' },
    { icon: '📊', title: 'Results Dashboard',        desc: 'Metrics, response profile and recent prediction history.',   page: 'results' },
    { icon: '📖', title: 'Model Info & Glossary',    desc: 'Architecture, dataset info, and an interactive glossary.',   page: 'glossary' },
  ];

  return (
    <section className="section active">
      <div className="stack">
        {/* hero */}
        <div className="hero">
          <div id="dna3d" />
          <div className="hero-content">
            <div className="eyebrow">WELCOME TO PATHDSP</div>
            <h1>Explainable Drug Sensitivity<br />Through Cancer Pathway Enrichment</h1>
            <h1 className="gradient">PathDSP</h1>
            <p>
              Discover how cancer-related pathways influence drug response through transparent,
              interpretable AI. Explore predictions, drug rankings and SHAP explanations —
              all powered by real GDSC data.
            </p>
            <button className="btn" onClick={() => onNavigate('command')}>Open Command Center →</button>
          </div>
        </div>

        {/* module cards */}
        <div className="head" style={{ marginBottom: 0 }}>
          <div>
            <h2>Explore PathDSP</h2>
            <p>Select any module to open its workspace.</p>
          </div>
        </div>

        {cards.map(c => (
          <article className="card" key={c.page}>
            <div className="card-icon">{c.icon}</div>
            <div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>
            <button className="btn alt" onClick={() => onNavigate(c.page)}>Open →</button>
          </article>
        ))}

        <footer>Smarter Insights. More Effective Treatments. • PathDSP</footer>
      </div>
    </section>
  );
}

