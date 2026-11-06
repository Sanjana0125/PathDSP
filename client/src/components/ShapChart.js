import React, { useState } from 'react';
import { getPathwayAnnotation } from '../utils/pathwayDictionary';

/**
 * SHAP Feature Importance chart – waterfall + signed-impact bars + category filter.
 *
 * Props:
 *   features       – array { name, type, value, raw_name }
 *   baseValue      – float (E[f(x)])
 *   predictedValue – float (f(x))
 */
export default function ShapChart({ features, baseValue, predictedValue }) {
  const [view,       setView]       = useState('bars');      // 'bars' | 'waterfall'
  const [topN,       setTopN]       = useState(10);          // 5 | 10 | 20 | 'all'
  const [catFilter,  setCatFilter]  = useState('All');
  const [expanded,   setExpanded]   = useState(null);

  if (!features || features.length === 0) return null;

  const CATEGORIES = ['All', 'Expression', 'Drug Target', 'Mutation', 'Copy Number', 'Chemical'];

  const filtered = features
    .filter(f => catFilter === 'All' || f.type === catFilter)
    .slice(0, topN === 'all' ? undefined : topN);

  /* Waterfall cumulative */
  const waterfallRows = (() => {
    const slice = filtered;
    let cum = baseValue;
    return slice.map(f => {
      const from = cum;
      cum += f.value;
      return { ...f, from, to: cum };
    });
  })();

  const allVals = [baseValue, ...waterfallRows.map(r => r.to), ...waterfallRows.map(r => r.from)];
  const mn = Math.min(...allVals) - 0.1;
  const mx = Math.max(...allVals) + 0.1;
  const sc = v => ((v - mn) / (mx - mn)) * 100;

  const maxAbs = Math.max(...filtered.map(f => Math.abs(f.value)), 0.001);

  return (
    <div className="shap-panel">
      {/* Controls */}
      <div className="shap-controls">
        {/* view toggle */}
        <div className="btn-group">
          <button className={`btn small ${view === 'bars' ? '' : 'alt'}`} onClick={() => setView('bars')}>📊 Impact Bars</button>
          <button className={`btn small ${view === 'waterfall' ? '' : 'alt'}`} onClick={() => setView('waterfall')}>🌊 Waterfall</button>
        </div>

        {/* top-N selector */}
        <select
          className="ctrl-select"
          value={topN}
          onChange={e => setTopN(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
          <option value={20}>Top 20</option>
          <option value="all">All features</option>
        </select>

        {/* category filter */}
        <div className="cat-tabs">
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`pill ${catFilter === c ? 'active' : ''}`}
              onClick={() => setCatFilter(c)}
            >{c}</button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="shap-sum">
        <span>Baseline E[f(x)] = <b>{baseValue.toFixed(3)}</b></span>
        <span>Prediction f(x) = <b>{predictedValue.toFixed(3)}</b></span>
        <span>Δ = <b style={{ color: predictedValue - baseValue > 0 ? 'var(--red)' : 'var(--green)' }}>
          {predictedValue - baseValue > 0 ? '+' : ''}{(predictedValue - baseValue).toFixed(3)}
        </b></span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>Showing {filtered.length} of {features.length} features</span>
      </div>

      {/* ── IMPACT BARS ── */}
      {view === 'bars' && (
        <div className="shap-bars-list">
          {filtered.map((f, i) => {
            const pct  = (Math.abs(f.value) / maxAbs) * 50;
            const left = f.value >= 0 ? 50 : 50 - pct;
            const ann  = getPathwayAnnotation(f.name);
            return (
              <div key={i}>
                <div
                  className="shap-row"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  style={{ cursor: ann ? 'pointer' : 'default' }}
                >
                  <span className="shap-name" title={f.raw_name}>
                    <span className={`type-badge type-${f.type.replace(/\s+/g,'-').toLowerCase()}`}>{f.type.charAt(0)}</span>
                    {f.name}
                    {ann && <span className="shap-info">ⓘ</span>}
                  </span>
                  <div className="shap-track">
                    <div className="shap-zero" style={{ left: '50%' }} />
                    <div
                      className={`shap-bar ${f.value >= 0 ? 'pos' : 'neg'}`}
                      style={{ left: `${left}%`, width: `${Math.max(pct, 0.5)}%` }}
                    />
                  </div>
                  <span className={`shap-val ${f.value >= 0 ? 'pos' : 'neg'}`}>
                    {f.value >= 0 ? '+' : ''}{f.value.toFixed(3)}
                  </span>
                </div>
                {expanded === i && ann && (
                  <div className="shap-annotation">
                    <strong>{ann.full}</strong>
                    <p>{ann.summary}</p>
                  </div>
                )}
              </div>
            );
          })}
          <div className="shap-axis-label">
            <span style={{ color: 'var(--green)' }}>◄ Lower IC50 (Sensitivity)</span>
            <span style={{ color: 'var(--muted)' }}>0</span>
            <span style={{ color: 'var(--red)' }}>Higher IC50 (Resistance) ►</span>
          </div>
        </div>
      )}

      {/* ── WATERFALL ── */}
      {view === 'waterfall' && (
        <div className="shap-bars-list">
          {/* baseline */}
          <div className="shap-row wf-baseline">
            <span className="shap-name">E[f(x)] baseline</span>
            <div className="shap-track">
              <div className="shap-zero" style={{ left: `${sc(baseValue)}%`, background: 'var(--purple)', width: 2, height: '100%', top: 0 }} />
            </div>
            <span className="shap-val" style={{ color: 'var(--muted)' }}>{baseValue.toFixed(3)}</span>
          </div>

          {waterfallRows.map((r, i) => {
            const a = sc(Math.min(r.from, r.to));
            const b = sc(Math.max(r.from, r.to));
            return (
              <div className="shap-row" key={i}>
                <span className="shap-name" title={r.raw_name}>
                  <span className={`type-badge type-${r.type.replace(/\s+/g,'-').toLowerCase()}`}>{r.type.charAt(0)}</span>
                  {r.name}
                </span>
                <div className="shap-track">
                  <div className="shap-zero" style={{ left: `${sc(baseValue)}%` }} />
                  <div
                    className={`shap-bar ${r.value >= 0 ? 'pos' : 'neg'}`}
                    style={{ left: `${a}%`, width: `${Math.max(b - a, 0.5)}%` }}
                  />
                </div>
                <span className={`shap-val ${r.value >= 0 ? 'pos' : 'neg'}`}>
                  {r.value >= 0 ? '+' : ''}{r.value.toFixed(3)}
                </span>
              </div>
            );
          })}

          {/* prediction marker */}
          <div className="shap-row wf-baseline">
            <span className="shap-name">f(x) prediction</span>
            <div className="shap-track">
              <div className="shap-zero" style={{ left: `${sc(predictedValue)}%`, background: 'var(--cyan)', width: 2, height: '100%', top: 0 }} />
            </div>
            <span className="shap-val" style={{ color: 'var(--cyan)' }}>{predictedValue.toFixed(3)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

