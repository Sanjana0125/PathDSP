import React from 'react';
import { zoneOf } from '../utils/api';

export default function CommandCenterView({ history, stats, onNavigate, onClearHistory, onSelectPrediction }) {
  const userRuns = history.filter(r => !r.demo);

  const lastIC50 = userRuns[0] ? userRuns[0].mean.toFixed(3) : '—';
  const totalDrugs = new Set(userRuns.map(r => r.drug)).size;
  const totalCells = new Set(userRuns.map(r => r.cell)).size;

  const pyOnline = Boolean(stats?.python_online);

  const pipelines = [
    { color: 'var(--cyan)',   label: 'Input dataset (input.txt)',                    status: stats ? 'ok' : 'loading', statusLabel: stats ? `${stats.pairs?.toLocaleString()} pairs` : '…' },
    { color: '#ad77ff',       label: 'Pathway features (ssGSEA / CHEM / MUT / CNV)', status: 'ok', statusLabel: 'Loaded' },
    { color: '#ef79dc',       label: 'PathDSP FNN model',                            status: pyOnline ? 'ok' : 'demo', statusLabel: pyOnline ? 'Connected' : 'Offline (Port 8000)' },
    { color: '#f3c55b',       label: 'SHAP DeepExplainer',                           status: pyOnline ? 'ok' : 'demo', statusLabel: pyOnline ? 'Ready' : 'Offline (Port 8000)' },
    { color: 'var(--green)',  label: 'React interface',                              status: 'ok', statusLabel: 'Online' },
  ];

  return (
    <section className="section active">
      <div className="head">
        <div><h2>PathDSP Command Center</h2><p>Mission control for your analyses.</p></div>
        <span className="pill">{stats ? 'Connected' : 'Demo mode'}</span>
      </div>

      <div className="stack">
        {/* metrics */}
        <div className="metrics">
          <div className="metric"><small>Your predictions</small><strong>{userRuns.length}</strong></div>
          <div className="metric"><small>Drugs in dataset</small><strong>{stats ? stats.drugs?.toLocaleString() : '…'}</strong></div>
          <div className="metric"><small>Cell lines</small><strong>{stats ? stats.cells?.toLocaleString() : '…'}</strong></div>
          <div className="metric"><small>Last log-IC50</small><strong>{lastIC50}</strong></div>
        </div>

        {/* quick actions */}
        <div className="panel">
          <h3>Quick actions</h3>
          <div className="qa">
            <button className="btn"      onClick={() => onNavigate('prediction')}>New prediction</button>
            <button className="btn alt"  onClick={() => onNavigate('ranking')}>Rank drugs</button>
            <button className="btn alt"  onClick={() => onNavigate('compare')}>Compare drugs</button>
            <button className="btn alt"  onClick={() => onNavigate('explorer')}>Explorer</button>
          </div>
        </div>

        {/* pipeline status */}
        <div className="panel">
          <h3>Pipeline status</h3>
          <div className="ccgrid">
            {pipelines.map((p, i) => (
              <div className="pipe" key={i}>
                <i className="dot" style={{ background: p.color }} />
                {p.label}
                <span className={`st ${p.status === 'ok' ? 'ok' : 'demo'}`}>{p.statusLabel}</span>
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            Start the Python service with <code>uvicorn main:app --port 8000</code> and the Node
            server with <code>node index.js</code> before running predictions.
          </p>
        </div>

        {/* recent predictions */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Recent predictions</h3>
            <button className="btn alt small" onClick={onClearHistory}>Clear</button>
          </div>
          {history.length === 0 ? (
            <p className="hint">No predictions yet. Run an analysis to see it here.</p>
          ) : (
            history.slice(0, 8).map((r, i) => {
              const z = r.sensitivity_label;
              return (
                <div
                  className="rrow"
                  key={i}
                  onClick={() => onSelectPrediction && onSelectPrediction(r.drug, r.cell)}
                  style={{ cursor: onSelectPrediction ? 'pointer' : 'default' }}
                  title="Click to view this prediction"
                >
                  <div>
                    <b>{r.drug}</b>
                    <small>{r.cell} {r.meta?.tissue ? `· ${r.meta.tissue}` : ''}</small>
                  </div>
                  <div className="c2">
                    {new Date(r.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    <small>log-IC50</small>
                  </div>
                  <div className="ic c3">{r.mean?.toFixed(3) ?? '—'}</div>
                  <div className={`badge c4 ${z === 'Sensitive' ? 'b-green' : z === 'Resistant' ? 'b-red' : 'b-yellow'}`}>
                    {z || '—'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

