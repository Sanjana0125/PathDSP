import React, { useState } from 'react';
import Select from '../components/OptimizedSelect';
import { api, logToMicro, downloadCSV } from '../utils/api';

export default function RankingView({ drugs, cells, onSelectPrediction }) {
  const [selCell,    setSelCell]    = useState(null);
  const [selDrug,    setSelDrug]    = useState(null);
  const [limit,      setLimit]      = useState(10);
  const [mode,       setMode]       = useState('drugs');      // 'drugs' | 'cells'
  const [direction,  setDirection]  = useState('sensitive');  // 'sensitive' | 'resistant'
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [results,    setResults]    = useState(null);

  const selectStyles = {
    control:    b => ({ ...b, background: 'var(--bg)', borderColor: 'var(--line)' }),
    menu:       b => ({ ...b, background: 'var(--panel2)' }),
    option:     (b, s) => ({ ...b, background: s.isFocused ? 'rgba(140,80,255,.2)' : 'transparent', color: 'var(--text)' }),
    singleValue:b => ({ ...b, color: 'var(--text)' }),
    input:      b => ({ ...b, color: 'var(--text)' }),
  };

  const cellOptions = cells.map(c => ({ value: c.id, label: `${c.id} · ${c.tissue}` }));
  const drugOptions = drugs.map(d => ({ value: d, label: d }));

  const handleRank = async () => {
    if (mode === 'drugs'  && !selCell) return;
    if (mode === 'cells'  && !selDrug) return;
    setLoading(true); setError(''); setResults(null);
    try {
      const data = mode === 'drugs'
        ? await api.rankDrugs(selCell.value, limit, direction)
        : await api.rankCells(selDrug.value, limit, direction);
      setResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCSV = () => {
    if (!results) return;
    if (mode === 'drugs') {
      downloadCSV(
        `Top${limit}_Drugs_${selCell?.value}_${direction}.csv`,
        ['Rank', 'Drug', 'Predicted log-IC50', 'IC50 (µM)', 'Actual log-IC50', 'Sensitivity'],
        results.map((r, i) => [i + 1, r.drug, r.ic50.toFixed(4), logToMicro(r.ic50), r.actual_ic50?.toFixed(4) ?? 'N/A', r.sensitivity_label]),
      );
    } else {
      downloadCSV(
        `Top${limit}_Cells_${selDrug?.value}_${direction}.csv`,
        ['Rank', 'Cell Line', 'Tissue', 'Predicted log-IC50', 'IC50 (µM)', 'Actual log-IC50'],
        results.map((r, i) => [i + 1, r.cell, r.tissue, r.ic50.toFixed(4), logToMicro(r.ic50), r.actual_ic50?.toFixed(4) ?? 'N/A']),
      );
    }
  };

  const dirLabel = direction === 'sensitive' ? '↓ Most Sensitive' : '↑ Most Resistant';

  return (
    <section className="section active">
      <div className="head">
        <div><h2>Drug Ranking</h2><p>Rank drugs or cell lines by predicted IC50 — real PathDSP model output.</p></div>
        <span className="pill">Click a row to analyze</span>
      </div>

      <div className="stack">
        <div className="panel">
          {/* mode toggle */}
          <div className="btn-group" style={{ marginBottom: 16 }}>
            <button className={`btn ${mode === 'drugs' ? '' : 'alt'}`} onClick={() => { setMode('drugs'); setResults(null); }}>
              💊 Top Drugs for Cell Line
            </button>
            <button className={`btn ${mode === 'cells' ? '' : 'alt'}`} onClick={() => { setMode('cells'); setResults(null); }}>
              🧬 Top Cell Lines for Drug
            </button>
          </div>

          <div className="fields">
            {mode === 'drugs'
              ? <div className="field">
                  <label>Cancer cell line</label>
                  <Select options={cellOptions} value={selCell} onChange={setSelCell}
                    placeholder="Search cell line…" isClearable styles={selectStyles} />
                </div>
              : <div className="field">
                  <label>Drug / compound</label>
                  <Select options={drugOptions} value={selDrug} onChange={setSelDrug}
                    placeholder="Search drug…" isClearable styles={selectStyles} />
                </div>
            }

            <div className="field">
              <label>Show top</label>
              <select className="ctrl-select" value={limit} onChange={e => setLimit(Number(e.target.value))}>
                {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Direction</label>
              <select className="ctrl-select" value={direction} onChange={e => setDirection(e.target.value)}>
                <option value="sensitive">Most Sensitive (lowest IC50)</option>
                <option value="resistant">Most Resistant (highest IC50)</option>
              </select>
            </div>
          </div>

          {error && <p style={{ color: 'var(--red)', margin: '8px 0' }}>⚠ {error}</p>}

          <button className="btn" onClick={handleRank}
            disabled={loading || (mode === 'drugs' ? !selCell : !selDrug)}>
            {loading ? '⏳ Computing…' : `Rank ${mode === 'drugs' ? 'Drugs' : 'Cell Lines'} (${dirLabel})`}
          </button>
        </div>

        {results && (
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>
                {mode === 'drugs'
                  ? `${dirLabel} drugs for ${selCell?.value}`
                  : `${dirLabel} cell lines for ${selDrug?.value}`
                }
              </h3>
              <button className="btn alt small" onClick={handleCSV}>⬇ CSV</button>
            </div>

            {results.map((r, i) => {
              const z = r.sensitivity_label || (r.ic50 < (r.thresholds?.q25 ?? 0) ? 'Sensitive' : r.ic50 > (r.thresholds?.q75 ?? 2) ? 'Resistant' : 'Intermediate');
              const q25 = r.thresholds?.q25 ?? -2;
              const q75 = r.thresholds?.q75 ??  2;
              const pct = Math.max(5, Math.min(100, ((r.ic50 - q25) / (q75 - q25 + 0.001)) * 100));

              return (
                <div
                  className="rank"
                  key={i}
                  onClick={() => {
                    if (onSelectPrediction) {
                      if (mode === 'drugs' && selCell) onSelectPrediction(r.drug, selCell.value);
                      else if (mode === 'cells' && selDrug) onSelectPrediction(selDrug.value, r.cell);
                    }
                  }}
                  title="Click to analyze this prediction"
                >
                  <div className="rk">{i + 1}</div>
                  <div>
                    <b>{mode === 'drugs' ? r.drug : r.cell}</b>
                    {mode === 'cells' && r.tissue && <small style={{ display: 'block', color: 'var(--muted)', fontSize: 11 }}>{r.tissue}</small>}
                    <div className="track" style={{ marginTop: 6 }}>
                      <div className="fill" style={{ width: `${pct}%`, background: z === 'Sensitive' ? 'var(--green)' : z === 'Resistant' ? 'var(--red)' : 'var(--yellow)' }} />
                    </div>
                  </div>
                  <div className="ic">{logToMicro(r.ic50)} µM</div>
                  <div className={`badge ${z === 'Sensitive' ? 'b-green' : z === 'Resistant' ? 'b-red' : 'b-yellow'}`}>{z}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

