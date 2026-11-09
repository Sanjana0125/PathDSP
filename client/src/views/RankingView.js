import React, { useState, useMemo } from 'react';
import Select from '../components/OptimizedSelect';
import { api, downloadCSV } from '../utils/api';

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

  // Scientifically rigorous sorting logic:
  // - Drug Ranking (mode === 'drugs'): Sort by standardized Z-score.
  //   Lowest Z-score = Most Sensitive (relative to drug baseline across cell lines).
  //   Highest Z-score = Most Resistant.
  // - Cell Line Ranking (mode === 'cells'): Sort by raw predicted log-IC50 (drug is constant).
  //   Lowest log-IC50 = Most Sensitive.
  //   Highest log-IC50 = Most Resistant.
  const sortedResults = useMemo(() => {
    if (!results || !Array.isArray(results) || results.length === 0) return [];
    const list = [...results];
    if (mode === 'drugs') {
      if (direction === 'sensitive') {
        list.sort((a, b) => (a.z_score ?? 0) - (b.z_score ?? 0));
      } else {
        list.sort((a, b) => (b.z_score ?? 0) - (a.z_score ?? 0));
      }
    } else {
      if (direction === 'sensitive') {
        list.sort((a, b) => (a.ic50 ?? a.mean ?? 0) - (b.ic50 ?? b.mean ?? 0));
      } else {
        list.sort((a, b) => (b.ic50 ?? b.mean ?? 0) - (a.ic50 ?? a.mean ?? 0));
      }
    }
    return list;
  }, [results, direction, mode]);

  // Badge assignment logic:
  // - Drug Ranking: Z <= -1 is Sensitive, Z >= 1 is Resistant, in-between is Intermediate.
  // - Cell Line Ranking: raw log-IC50 compared to global drug thresholds (Q25 / Q75).
  const getBadgeInfo = (r) => {
    if (mode === 'drugs') {
      const z = r.z_score ?? 0;
      let label = 'Intermediate';
      if (z <= -1) {
        label = 'Sensitive';
      } else if (z >= 1) {
        label = 'Resistant';
      }
      const badgeClass = label === 'Sensitive' ? 'b-green' : label === 'Resistant' ? 'b-red' : 'b-yellow';
      return { label, badgeClass };
    } else {
      const q25 = r.thresholds?.q25 ?? -1;
      const q75 = r.thresholds?.q75 ?? 1;
      const ic50 = r.ic50 ?? 0;

      let label = 'Intermediate';
      if (ic50 <= q25) {
        label = 'Sensitive';
      } else if (ic50 >= q75) {
        label = 'Resistant';
      }
      const badgeClass = label === 'Sensitive' ? 'b-green' : label === 'Resistant' ? 'b-red' : 'b-yellow';
      return { label, badgeClass };
    }
  };

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
    if (!sortedResults.length) return;
    if (mode === 'drugs') {
      downloadCSV(
        `Top${limit}_Drugs_${selCell?.value}_${direction}.csv`,
        ['Rank', 'Drug', 'Z-score', 'Predicted log-IC50', 'Actual log-IC50', 'Sensitivity'],
        sortedResults.map((r, i) => [
          i + 1,
          r.drug,
          r.z_score != null ? r.z_score.toFixed(2) : 'N/A',
          r.ic50?.toFixed(4),
          r.actual_ic50?.toFixed(4) ?? 'N/A',
          getBadgeInfo(r).label,
        ]),
      );
    } else {
      downloadCSV(
        `Top${limit}_Cells_${selDrug?.value}_${direction}.csv`,
        ['Rank', 'Cell Line', 'Tissue', 'Predicted log-IC50', 'Actual log-IC50', 'Sensitivity'],
        sortedResults.map((r, i) => [
          i + 1,
          r.cell,
          r.tissue,
          r.ic50?.toFixed(4),
          r.actual_ic50?.toFixed(4) ?? 'N/A',
          getBadgeInfo(r).label,
        ]),
      );
    }
  };

  const dirLabel = direction === 'sensitive' ? '↓ Most Sensitive' : '↑ Most Resistant';

  return (
    <section className="section active">
      <div className="head">
        <div>
          <h2>Drug & Cell Ranking</h2>
          <p>
            {mode === 'drugs'
              ? 'Rank drugs by standardized Z-score relative to drug response across all cell lines.'
              : 'Rank cell lines by predicted log-IC50 response for the selected drug.'}
          </p>
        </div>
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
                <option value="sensitive">
                  {mode === 'drugs' ? 'Most Sensitive (lowest Z-score)' : 'Most Sensitive (lowest IC50)'}
                </option>
                <option value="resistant">
                  {mode === 'drugs' ? 'Most Resistant (highest Z-score)' : 'Most Resistant (highest IC50)'}
                </option>
              </select>
            </div>
          </div>

          {error && <p style={{ color: 'var(--red)', margin: '8px 0' }}>⚠ {error}</p>}

          <button className="btn" onClick={handleRank}
            disabled={loading || (mode === 'drugs' ? !selCell : !selDrug)}>
            {loading ? '⏳ Computing…' : `Rank ${mode === 'drugs' ? 'Drugs' : 'Cell Lines'} (${dirLabel})`}
          </button>
        </div>

        {sortedResults.length > 0 && (
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

            {sortedResults.map((r, i) => {
              const { label, badgeClass } = getBadgeInfo(r);
              const pct = Math.max(8, Math.min(100, direction === 'sensitive'
                ? Math.max(12, 100 - (i * (75 / Math.max(1, sortedResults.length - 1))))
                : Math.max(12, 25 + (i * (75 / Math.max(1, sortedResults.length - 1))))
              ));

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
                      <div
                        className="fill"
                        style={{
                          width: `${pct}%`,
                          background: label === 'Sensitive' ? 'var(--green)' : label === 'Resistant' ? 'var(--red)' : 'var(--yellow)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="ic">
                    {mode === 'drugs' ? (
                      <>
                        Z-score: {r.z_score != null ? (r.z_score > 0 ? `+${r.z_score.toFixed(2)}` : r.z_score.toFixed(2)) : '—'}
                      </>
                    ) : (
                      <>
                        {r.ic50?.toFixed(3)} <small style={{ fontSize: 10, color: 'var(--muted)' }}>log-IC50</small>
                      </>
                    )}
                  </div>
                  <div className={`badge ${badgeClass}`}>{label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
