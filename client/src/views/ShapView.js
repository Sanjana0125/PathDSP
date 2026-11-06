import React, { useState, useEffect } from 'react';
import Select from '../components/OptimizedSelect';
import { api } from '../utils/api';
import ShapChart from '../components/ShapChart';

export default function ShapView({ drugs, cells, initialSelection }) {
  const [selDrug, setSelDrug] = useState(null);
  const [selCell, setSelCell] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [shap,    setShap]    = useState(null);

  useEffect(() => {
    if (initialSelection?.cell) {
      const matchCell = cells.find(c => c.id === initialSelection.cell);
      setSelCell(matchCell ? { value: matchCell.id, label: `${matchCell.id} · ${matchCell.tissue}` } : { value: initialSelection.cell, label: initialSelection.cell });
    }
    if (initialSelection?.drug) {
      setSelDrug({ value: initialSelection.drug, label: initialSelection.drug });
    }
  }, [initialSelection, cells]);

  const ss = {
    control:    b => ({ ...b, background: 'var(--bg)', borderColor: 'var(--line)' }),
    menu:       b => ({ ...b, background: 'var(--panel2)' }),
    option:     (b, s) => ({ ...b, background: s.isFocused ? 'rgba(140,80,255,.2)' : 'transparent', color: 'var(--text)' }),
    singleValue:b => ({ ...b, color: 'var(--text)' }),
    input:      b => ({ ...b, color: 'var(--text)' }),
  };

  const drugOpts = drugs.map(d => ({ value: d, label: d }));
  const cellOpts = cells.map(c => ({ value: c.id, label: `${c.id} · ${c.tissue}` }));

  const handleExplain = async () => {
    if (!selDrug || !selCell) return;
    setLoading(true); setError(''); setShap(null);
    try {
      const data = await api.explain(selDrug.value, selCell.value, 100);
      setShap(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section active">
      <div className="head">
        <div><h2>SHAP Explainability</h2><p>How each feature moves the prediction away from the dataset average.</p></div>
        <span className="pill" id="shapctx">{selDrug && selCell ? `${selDrug.value} • ${selCell.value}` : '—'}</span>
      </div>

      <div className="stack">
        <div className="panel">
          <h3>Select drug & cell line</h3>
          <div className="fields">
            <div className="field">
              <label>Cancer cell line</label>
              <Select options={cellOpts} value={selCell} onChange={setSelCell}
                placeholder="Search cell line…" isClearable styles={ss} />
            </div>
            <div className="field">
              <label>Drug / compound</label>
              <Select options={drugOpts} value={selDrug} onChange={setSelDrug}
                placeholder="Search drug…" isClearable styles={ss} />
            </div>
          </div>
          {error && <p style={{ color: 'var(--red)', margin: '8px 0' }}>⚠ {error}</p>}
          <button className="btn" onClick={handleExplain} disabled={!selDrug || !selCell || loading}>
            {loading ? '⏳ Computing SHAP values…' : '✧ Explain prediction →'}
          </button>
          <p className="hint" style={{ marginTop: 10 }}>
            SHAP values are computed by the DeepExplainer against the pre-computed background distribution.
            All values are real model attributions.
          </p>
        </div>

        {shap && (
          <div className="panel">
            <h3>SHAP feature impact</h3>
            <p className="hint">
              <span style={{ color: 'var(--green)' }}>● Green</span> pushes toward <b>sensitivity</b> (lower IC50). &nbsp;
              <span style={{ color: 'var(--red)' }}>● Red</span> pushes toward <b>resistance</b> (higher IC50).
              Click a feature row for a biological explanation.
            </p>
            <ShapChart
              features={shap.features}
              baseValue={shap.base_value}
              predictedValue={shap.predicted_value}
            />
          </div>
        )}

        <div className="notice">
          SHAP values are computed by <b>shap.DeepExplainer</b> applied to the trained PathDSP FNN model,
          using a pre-built background sample dataset (<code>shap_background.pt</code>).
          All attributions are real model-derived values — not approximations or illustrative placeholders.
        </div>
      </div>
    </section>
  );
}

