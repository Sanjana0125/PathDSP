import React, { useState } from 'react';
import { GLOSSARY_TERMS } from '../utils/pathwayDictionary';

export default function GlossaryView() {
  const [search,  setSearch]  = useState('');
  const [cat,     setCat]     = useState('All');

  const categories = ['All', ...new Set(GLOSSARY_TERMS.map(t => t.category))];
  const filtered = GLOSSARY_TERMS.filter(t =>
    (cat === 'All' || t.category === cat) &&
    (!search || t.term.toLowerCase().includes(search.toLowerCase()) || t.definition.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <section className="section active">
      <div className="head">
        <div><h2>Model Info & Glossary</h2><p>PathDSP architecture details, dataset information, and an interactive glossary.</p></div>
      </div>

      <div className="stack">
        {/* model info */}
        <div className="panel">
          <h3>🔬 PathDSP Model Architecture</h3>
          <div className="metrics">
            {[
              ['Architecture',  'Feedforward Neural Network (FNN)'],
              ['Input Features','1,031 (EXP, MUT, CNV, CHEM, TARGET)'],
              ['Uncertainty',   'MC-Dropout (30 forward passes)'],
              ['Explainability','SHAP DeepExplainer + pre-computed background'],
            ].map(([k, v]) => (
              <div className="metric" key={k}>
                <small>{k}</small>
                <strong style={{ fontSize: 13 }}>{v}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>📊 Dataset — GDSC</h3>
          <div className="metrics">
            {[
              ['Dataset',    'GDSC (Genomics of Drug Sensitivity in Cancer)'],
              ['Drug pairs', '37,732 drug–cell line combinations'],
              ['Cell lines', '319+ cancer cell lines'],
              ['Drugs',      '144+ compounds tested'],
              ['Tissues',    '30+ cancer tissue types'],
              ['IC50 Range', 'log-IC50 from ~ −3 to +3'],
            ].map(([k, v]) => (
              <div className="metric" key={k}>
                <small>{k}</small>
                <strong style={{ fontSize: 12 }}>{v}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>📄 Reference</h3>
          <div className="node" style={{ marginBottom: 8 }}>
            <i className="dot" />
            <div>
              <b>Tang, Y. C., & Gottlieb, A. (2021).</b> Explainable drug sensitivity prediction through
              cancer pathway enrichment. <i>Scientific Reports, 11</i>, 3128.
              <a href="https://doi.org/10.1038/s41598-021-82612-7" target="_blank" rel="noreferrer"
                style={{ color: 'var(--cyan)', marginLeft: 6 }}>DOI ↗</a>
            </div>
          </div>
          <div className="node">
            <i className="dot" style={{ background: '#ad77ff' }} />
            <div>
              <b>Lundberg, S. M., & Lee, S. I. (2017).</b> A unified approach to interpreting model predictions.
              <i> NeurIPS, 30</i>. — Foundation for the SHAP explainability framework used here.
            </div>
          </div>
        </div>

        {/* glossary */}
        <div className="panel">
          <h3>📖 Interactive Glossary</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input
              className="ctrl-input"
              placeholder="Search terms…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            {categories.map(c => (
              <button key={c} className={`pill ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>

          {filtered.length === 0
            ? <p className="hint">No terms match your search.</p>
            : filtered.map((t, i) => (
              <details key={i} className="node" style={{ display: 'block', marginBottom: 8, cursor: 'pointer' }}>
                <summary style={{ display: 'flex', alignItems: 'center', gap: 10, listStyle: 'none' }}>
                  <i className="dot" style={{ flex: 'none' }} />
                  <b style={{ flex: 1 }}>{t.term}</b>
                  <span className="pill" style={{ background: 'var(--panel2)', fontSize: 9 }}>{t.category}</span>
                </summary>
                <p style={{ margin: '10px 0 0 19px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                  {t.definition}
                </p>
              </details>
            ))
          }
        </div>

        <div className="notice">
          <b>Disclaimer:</b> PathDSP predictions are computational, based on GDSC cell-line in-vitro data.
          They are for research and educational use only and do not constitute clinical diagnosis, prognosis,
          or treatment recommendations for individual patients.
        </div>
      </div>
    </section>
  );
}

