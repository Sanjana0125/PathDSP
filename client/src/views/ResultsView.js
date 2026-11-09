import React from 'react';
import { zoneOf, downloadCSV, clearHistory } from '../utils/api';

export default function ResultsView({ history, setHistory, onNavigate, onSelectPrediction }) {
  const userRuns = history.filter(r => !r.demo);
  const lastRun  = userRuns[0];

  const topSens = [...userRuns].sort((a, b) => (a.mean ?? 99) - (b.mean ?? 99))[0];
  const topRes  = [...userRuns].sort((a, b) => (b.mean ?? -99) - (a.mean ?? -99))[0];
  const avgIC50 = userRuns.length
    ? (userRuns.reduce((s, r) => s + (r.mean ?? 0), 0) / userRuns.length).toFixed(3)
    : '—';

  const handleCSV = () => {
    if (!userRuns.length) return;
    downloadCSV(
      'PathDSP_History.csv',
      ['Timestamp', 'Drug', 'Cell', 'Tissue', 'Predicted log-IC50', '95% CI', 'Sensitivity', 'Confidence'],
      userRuns.map(r => [
        new Date(r.timestamp).toISOString(), r.drug, r.cell, r.meta?.tissue ?? '',
        r.mean?.toFixed(4),
        `[${r.lower_ci?.toFixed(2)},${r.upper_ci?.toFixed(2)}]`,
        r.sensitivity_label, r.confidence_label,
      ]),
    );
  };

  return (
    <section className="section active">
      <div className="head">
        <div><h2>Results Dashboard</h2><p>Summary of your PathDSP prediction history.</p></div>
        <button className="btn alt" onClick={() => onNavigate('prediction')}>New analysis</button>
      </div>

      <div className="stack">
        {/* summary metrics */}
        <div className="metrics">
          <div className="metric">
            <small>Total predictions</small>
            <strong>{userRuns.length}</strong>
          </div>
          <div className="metric">
            <small>Unique drugs</small>
            <strong>{new Set(userRuns.map(r => r.drug)).size}</strong>
          </div>
          <div className="metric">
            <small>Unique cell lines</small>
            <strong>{new Set(userRuns.map(r => r.cell)).size}</strong>
          </div>
          <div className="metric">
            <small>Avg log-IC50</small>
            <strong>{avgIC50}</strong>
          </div>
        </div>

        {/* highlights */}
        {userRuns.length > 0 && (
          <div className="metrics">
            <div className="metric">
              <small>Most sensitive run</small>
              <strong style={{ fontSize: 14, color: 'var(--green)' }}>{topSens?.drug}</strong>
              <small style={{ color: 'var(--muted)' }}>{topSens?.cell} · {topSens?.mean?.toFixed(3)} log-IC50</small>
            </div>
            <div className="metric">
              <small>Most resistant run</small>
              <strong style={{ fontSize: 14, color: 'var(--red)' }}>{topRes?.drug}</strong>
              <small style={{ color: 'var(--muted)' }}>{topRes?.cell} · {topRes?.mean?.toFixed(3)} log-IC50</small>
            </div>
            <div className="metric">
              <small>Last log-IC50</small>
              <strong style={{ color: 'var(--cyan)' }}>{lastRun ? lastRun.mean.toFixed(3) : '—'}</strong>
            </div>
            <div className="metric">
              <small>Last sensitivity</small>
              <strong style={{ color: zoneOf(lastRun?.sensitivity_label) }}>
                {lastRun?.sensitivity_label ?? '—'}
              </strong>
            </div>
          </div>
        )}

        {/* history table */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>Prediction history</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn alt small" onClick={handleCSV} disabled={!userRuns.length}>⬇ CSV</button>
              <button className="btn alt small" onClick={() => setHistory(clearHistory())}>Clear</button>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="hint">No predictions yet. <span style={{ color: 'var(--cyan)', cursor: 'pointer' }} onClick={() => onNavigate('prediction')}>Run an analysis →</span></p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 10 }}>
                    {['Time', 'Drug', 'Cell Line', 'Tissue', 'Predicted log-IC50', '95% CI', 'Sensitivity', 'Confidence'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 6px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((r, i) => {
                    const z = r.sensitivity_label;
                    return (
                      <tr
                        key={i}
                        style={{ borderBottom: '1px solid var(--line)', cursor: onSelectPrediction ? 'pointer' : 'default' }}
                        onClick={() => onSelectPrediction && onSelectPrediction(r.drug, r.cell)}
                        title="Click to view prediction"
                      >
                        <td style={{ padding: '8px 6px', color: 'var(--muted)', fontSize: 10 }}>
                          {new Date(r.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '8px 6px', fontWeight: 700 }}>{r.drug}</td>
                        <td style={{ padding: '8px 6px', color: 'var(--muted)' }}>{r.cell}</td>
                        <td style={{ padding: '8px 6px', fontSize: 11 }}>{r.meta?.tissue ?? '—'}</td>
                        <td style={{ padding: '8px 6px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.mean?.toFixed(3) ?? '—'}</td>
                        <td style={{ padding: '8px 6px', color: 'var(--muted)', fontSize: 10 }}>
                          [{r.lower_ci?.toFixed(2)}, {r.upper_ci?.toFixed(2)}]
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <span className={`badge ${z === 'Sensitive' ? 'b-green' : z === 'Resistant' ? 'b-red' : 'b-yellow'}`}>{z ?? '—'}</span>
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <span className={`badge ${r.confidence_label === 'high' ? 'b-green' : 'b-yellow'}`}>{r.confidence_label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

