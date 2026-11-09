import React, { useState, useEffect } from 'react';
import Select from '../components/OptimizedSelect';
import { api, appendHistory } from '../utils/api';
import SemiCircularGauge from '../components/SemiCircularGauge';
import ShapChart from '../components/ShapChart';
import html2pdf from 'html2pdf.js';

export default function PredictionView({ drugs, cells, history, setHistory, initialSelection }) {
  const [selDrug, setSelDrug] = useState(null);
  const [selCell, setSelCell] = useState(null);
  const [validDrugs, setValidDrugs] = useState(null);
  const [validCells, setValidCells] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [shap, setShap] = useState(null);

  useEffect(() => {
    if (initialSelection?.cell) {
      const matchCell = cells.find(c => c.id === initialSelection.cell);
      if (matchCell) {
        setSelCell({
          value: matchCell.id,
          label: `${matchCell.id} — ${matchCell.model_name !== matchCell.id ? matchCell.model_name + ' · ' : ''}${matchCell.tissue}`,
        });
      } else {
        setSelCell({ value: initialSelection.cell, label: initialSelection.cell });
      }
    }
    if (initialSelection?.drug) {
      setSelDrug({ value: initialSelection.drug, label: initialSelection.drug });
    }
  }, [initialSelection, cells]);

  // When cell is selected, filter available drugs if no drug is selected yet
  useEffect(() => {
    if (selCell?.value && !selDrug) {
      api.getDrugsForCell(selCell.value)
        .then(list => setValidDrugs(list))
        .catch(() => setValidDrugs(null));
    } else if (!selCell) {
      setValidDrugs(null);
    }
  }, [selCell, selDrug]);

  // When drug is selected, filter available cell lines if no cell is selected yet
  useEffect(() => {
    if (selDrug?.value && !selCell) {
      api.getCellsForDrug(selDrug.value)
        .then(list => setValidCells(list))
        .catch(() => setValidCells(null));
    } else if (!selDrug) {
      setValidCells(null);
    }
  }, [selDrug, selCell]);

  const activeDrugs = validDrugs && validDrugs.length > 0 ? validDrugs : drugs;
  const drugOptions = activeDrugs.map(d => ({ value: d, label: d }));

  const activeCells = validCells && validCells.length > 0
    ? cells.filter(c => validCells.includes(c.id))
    : cells;
  const cellOptions = activeCells.map(c => ({
    value: c.id,
    label: `${c.id} — ${c.model_name !== c.id ? c.model_name + ' · ' : ''}${c.tissue}`,
  }));

  const selectStyles = {
    control: (b) => ({ ...b, background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }),
    menu: (b) => ({ ...b, background: 'var(--panel2)' }),
    option: (b, s) => ({ ...b, background: s.isFocused ? 'rgba(140,80,255,.2)' : 'transparent', color: 'var(--text)' }),
    singleValue: (b) => ({ ...b, color: 'var(--text)' }),
    input: (b) => ({ ...b, color: 'var(--text)' }),
  };

  const handlePredict = async () => {
    if (!selDrug || !selCell) return;
    setLoading(true); setError(''); setResult(null); setShap(null);
    try {
      const pred = await api.predict(selDrug.value, selCell.value);
      setResult(pred);
      setHistory(prev => appendHistory(prev, { drug: selDrug.value, cell: selCell.value, ...pred }));

      try {
        const shapData = await api.explain(selDrug.value, selCell.value, 100);
        setShap(shapData);
      } catch (shapErr) {
        console.warn('SHAP explanation error:', shapErr);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const el = document.getElementById('pdf-report');
    if (!el) return;
    el.style.display = 'block';
    html2pdf().set({
      margin: 0.5,
      filename: `PathDSP_${selDrug?.value}_${selCell?.value}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    }).from(el).save().then(() => { el.style.display = 'none'; });
  };

  const downloadCSVReport = () => {
    if (!result || !shap) return;
    const rows = [
      ['Drug', selDrug?.value],
      ['Cell Line', selCell?.value],
      ['Tissue', result.meta?.tissue],
      ['Predicted log-IC50', result.mean?.toFixed(4)],
      ['95% CI Lower', result.lower_ci?.toFixed(4)],
      ['95% CI Upper', result.upper_ci?.toFixed(4)],
      ['Confidence', result.confidence_label],
      ['Sensitivity', result.sensitivity_label],
      ['Actual log-IC50', result.actual_ic50?.toFixed(4) ?? 'N/A'],
      [''],
      ['Feature', 'Type', 'SHAP Value'],
      ...shap.features.slice(0, 20).map(f => [f.name, f.type, f.value.toFixed(5)]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `PathDSP_${selDrug?.value}_${selCell?.value}.csv`;
    a.click();
  };

  return (
    <section className="section active">
      <div className="head">
        <div><h2>Drug Sensitivity Prediction</h2><p>Explore the relationship between a selected drug, cell line and IC50 response.</p></div>
        <span className="pill">IC50 analysis</span>
      </div>

      <div className="stack">
        {/* inputs */}
        <div className="panel">
          <h3>Analysis inputs</h3>
          <div className="fields">
            <div className="field">
              <label>Drug / compound</label>
              <Select options={drugOptions} value={selDrug} onChange={setSelDrug}
                placeholder="Search drug…" isClearable styles={selectStyles} />
            </div>
            <div className="field">
              <label>Cancer cell line</label>
              <Select options={cellOptions} value={selCell} onChange={setSelCell}
                placeholder="Search cell line…" isClearable styles={selectStyles} />
            </div>
          </div>
          {error && (
            <div className="notice" style={{ borderColor: 'var(--red)', background: 'rgba(255,93,115,0.12)', color: 'var(--text)', margin: '10px 0' }}>
              <b style={{ color: 'var(--red)' }}>⚠ Service Error:</b> {error}
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
                To start the model, open a terminal in <code>model_service</code> and run: <code>python main.py</code> (or <code>uvicorn main:app --port 8000</code>).
              </div>
            </div>
          )}
          <button className="btn" onClick={handlePredict}
            disabled={!selDrug || !selCell || loading}>
            {loading ? '⏳ Running PathDSP model…' : 'Analyze drug response →'}
          </button>
        </div>

        {/* gauge */}
        <div className="panel">
          <SemiCircularGauge
            value={result?.mean ?? null}
            thresholds={result?.thresholds ?? null}
            label={result?.sensitivity_label ?? null}
            loading={loading}
          />
        </div>

        {/* numeric results */}
        {result && (
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Prediction results</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn alt small" onClick={downloadCSVReport}>⬇ CSV</button>
                <button className="btn alt small" onClick={downloadPDF}>📄 PDF</button>
              </div>
            </div>

            <div className="metrics">
              <div className="metric">
                <small>Predicted log-IC50</small>
                <strong>{result.mean.toFixed(3)}</strong>
              </div>
              <div className="metric">
                <small>Actual log-IC50 (GDSC)</small>
                <strong style={{ color: 'var(--cyan)' }}>
                  {result.actual_ic50 != null ? result.actual_ic50.toFixed(3) : 'N/A'}
                </strong>
              </div>
              <div className="metric">
                <small>AI Confidence</small>
                <strong>
                  <span className={`badge ${result.confidence_label === 'high' ? 'b-green' : 'b-yellow'}`}>
                    {result.confidence_label?.toUpperCase()}
                  </span>
                </strong>
              </div>
              <div className="metric">
                <small>Sensitivity</small>
                <strong style={{ color: result.sensitivity_label === 'Sensitive' ? 'var(--green)' : result.sensitivity_label === 'Resistant' ? 'var(--red)' : 'var(--yellow)' }}>
                  {result.sensitivity_label}
                </strong>
              </div>
            </div>

            <div className="metrics" style={{ marginTop: 10 }}>
              <div className="metric">
                <small>95% CI Lower</small>
                <strong>{result.lower_ci?.toFixed(3)}</strong>
              </div>
              <div className="metric">
                <small>95% CI Upper</small>
                <strong>{result.upper_ci?.toFixed(3)}</strong>
              </div>
              <div className="metric">
                <small>Std Dev (MC)</small>
                <strong>{result.std?.toFixed(3)}</strong>
              </div>
              <div className="metric">
                <small>Prediction Error</small>
                <strong>
                  {result.actual_ic50 != null ? `${Math.abs(result.mean - result.actual_ic50).toFixed(3)} log` : 'N/A'}
                </strong>
              </div>
            </div>

            {result.meta && (
              <div className="notice" style={{ marginTop: 14 }}>
                <b>Cell line:</b> {selCell?.value} &nbsp;·&nbsp;
                <b>Cancer type:</b> {result.meta.cancer_type || result.meta.tissue} &nbsp;·&nbsp;
                {result.actual_ic50 != null && <>
                  <b>Prediction error:</b> {Math.abs(result.mean - result.actual_ic50).toFixed(3)} log-units
                </>}
              </div>
            )}
          </div>
        )}

        {/* SHAP */}
        {shap && (
          <div className="panel">
            <h3>SHAP Explainability — Why did the AI predict this?</h3>
            <p className="hint">
              <span style={{ color: 'var(--green)' }}>● Green</span> pushes toward <b>sensitivity</b> (lower IC50).&nbsp;
              <span style={{ color: 'var(--red)' }}>● Red</span> pushes toward <b>resistance</b> (higher IC50).
              Click a row for a biological explanation.
            </p>
            <ShapChart
              features={shap.features}
              baseValue={shap.base_value}
              predictedValue={shap.predicted_value}
            />
          </div>
        )}

        {/* IC50 notice */}
        <div className="notice">
          <b>IC50 interpretation:</b> IC50 is the concentration required to inhibit a biological response by 50%.
          Lower IC50 generally indicates greater drug sensitivity. The sensitivity zones (Sensitive / Intermediate / Resistant)
          are set by the Q25/Q75 of observed IC50 values for each drug in the GDSC dataset.
          Results are for research purposes only and do not constitute clinical advice.
        </div>
      </div>

      {/* ── Hidden PDF Report ── */}
      {result && shap && (
        <div id="pdf-report" style={{ display: 'none', padding: 20, fontFamily: 'Arial, sans-serif', color: '#000' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ margin: '0 0 6px' }}>PathDSP – Drug Sensitivity Prediction Report</h1>
            <p style={{ margin: 0, fontSize: 11, color: '#666' }}>
              Explainable Drug Sensitivity Prediction Using Cancer Pathway Enrichment<br />
              Generated: {new Date().toLocaleString()} · Model: PathDSP FNN · Dataset: GDSC
            </p>
          </div>
          <hr style={{ marginBottom: 20 }} />
          <h3>1. Input Details</h3>
          <table style={{ width: '100%', fontSize: 13, marginBottom: 20 }}>
            <tbody>
              <tr><td style={{ width: 160, padding: '4px 0' }}><b>Drug Tested:</b></td><td>{selDrug?.value}</td></tr>
              <tr><td style={{ padding: '4px 0' }}><b>Cancer Cell Line:</b></td><td>{selCell?.value} · {result.meta?.tissue || 'Cancer'}</td></tr>
              <tr><td style={{ padding: '4px 0' }}><b>Cancer Type:</b></td><td>{result.meta?.cancer_type || 'N/A'}</td></tr>
            </tbody>
          </table>
          <h3>2. Prediction Results</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
            <tbody>
              {[
                ['Predicted log-IC50', result.mean.toFixed(4)],
                ['Sensitivity Status', result.sensitivity_label],
                ['AI Confidence', `${result.confidence_label?.toUpperCase()} (σ = ${result.std?.toFixed(3)})`],
                ['95% Confidence Interval', `[${result.lower_ci?.toFixed(3)}, ${result.upper_ci?.toFixed(3)}]`],
                ['Actual Dataset Value (GDSC)', result.actual_ic50 != null ? result.actual_ic50.toFixed(4) : 'N/A'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '8px', border: '1px solid #ddd', width: 240 }}><b>{k}</b></td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>3. AI Explanation (Top SHAP Features)</h3>
          <p style={{ fontSize: 11, color: '#666' }}>Positive values → higher IC50 (Resistance). Negative values → lower IC50 (Sensitivity).</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#2c3e50', color: '#fff' }}>
                <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Feature / Pathway</th>
                <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Category</th>
                <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>SHAP Value</th>
              </tr>
            </thead>
            <tbody>
              {shap.features.slice(0, 10).map((f, i) => (
                <tr key={i}>
                  <td style={{ padding: 8, border: '1px solid #ddd' }}>{f.name}</td>
                  <td style={{ padding: 8, border: '1px solid #ddd' }}>{f.type}</td>
                  <td style={{ padding: 8, border: '1px solid #ddd', color: f.value > 0 ? '#c0392b' : '#27ae60', fontWeight: 'bold' }}>
                    {f.value > 0 ? '+' : ''}{f.value.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 40, borderTop: '2px solid #ccc', paddingTop: 12, fontSize: 11, color: '#777' }}>
            <b>Disclaimer:</b> These results are computational predictions based on GDSC cell-line data.
            They are for research and educational purposes only and do not constitute clinical advice.<br /><br />
            <b>Reference:</b> Tang, Y. C., & Gottlieb, A. (2021). Explainable drug sensitivity prediction through
            cancer pathway enrichment. <i>Scientific Reports</i>, 11, 3128.
          </div>
        </div>
      )}
    </section>
  );
}

