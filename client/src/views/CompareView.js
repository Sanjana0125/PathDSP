import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Select from '../components/OptimizedSelect';
import { api, logToMicro, downloadCSV } from '../utils/api';

export default function CompareView({ drugs: initialDrugs, cells: initialCells, initialMode = 'drugs' }) {
  const [mode,              setMode]              = useState(initialMode);  // 'drugs' | 'cells'
  const [drugList,          setDrugList]          = useState(initialDrugs || []);
  const [cellList,          setCellList]          = useState(initialCells || []);
  const [selCell,           setSelCell]           = useState(null);
  const [selDrug,           setSelDrug]           = useState(null);
  const [selDrugs,          setSelDrugs]          = useState([]);
  const [selCells,          setSelCells]          = useState([]);
  const [validDrugs,        setValidDrugs]        = useState([]);
  const [validCells,        setValidCells]        = useState([]);
  const [loadingValidDrugs, setLoadingValidDrugs] = useState(false);
  const [loadingValidCells, setLoadingValidCells] = useState(false);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState('');
  const [results,           setResults]           = useState(null);

  // Sync mode if initialMode prop updates
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  // Load drugs & cells if not provided via props
  useEffect(() => {
    if (initialDrugs && initialDrugs.length > 0) {
      setDrugList(initialDrugs);
    } else {
      api.getDrugs().then(setDrugList).catch(() => {});
    }
  }, [initialDrugs]);

  useEffect(() => {
    if (initialCells && initialCells.length > 0) {
      setCellList(initialCells);
    } else {
      api.getCells().then(setCellList).catch(() => {});
    }
  }, [initialCells]);

  // Full lists for the single selectors
  const allDrugOpts = useMemo(() => {
    return (drugList || []).map(d => ({ value: d, label: d }));
  }, [drugList]);

  const allCellOpts = useMemo(() => {
    return (cellList || []).map(c => ({
      value: c.id,
      label: `${c.id} — ${c.model_name && c.model_name !== c.id ? c.model_name + ' · ' : ''}${c.tissue || 'Cancer'}`,
    }));
  }, [cellList]);

  // Dynamically filtered options for multi-select (ONLY items with data in GDSC benchmark)
  const testedDrugOpts = useMemo(() => {
    if (!selCell) return [];
    return validDrugs.map(d => ({ value: d, label: d }));
  }, [selCell, validDrugs]);

  const testedCellOpts = useMemo(() => {
    if (!selDrug) return [];
    const validSet = new Set(validCells);
    return (cellList || [])
      .filter(c => validSet.has(c.id))
      .map(c => ({
        value: c.id,
        label: `${c.id} — ${c.model_name && c.model_name !== c.id ? c.model_name + ' · ' : ''}${c.tissue || 'Cancer'}`,
      }));
  }, [selDrug, validCells, cellList]);

  // When a user selects or changes a Cancer Cell Line:
  // Fetch valid drugs tested on that cell line, and CLEAR currently selected drugs.
  const handleCellSelect = useCallback((selected) => {
    setSelCell(selected);
    setSelDrugs([]);      // Clear selected drugs as requested
    setResults(null);
    setError('');

    if (selected?.value) {
      setLoadingValidDrugs(true);
      api.getDrugsForCell(selected.value)
        .then(list => setValidDrugs(list || []))
        .catch(() => setValidDrugs([]))
        .finally(() => setLoadingValidDrugs(false));
    } else {
      setValidDrugs([]);
    }
  }, []);

  // When a user selects or changes a Drug:
  // Fetch valid cell lines tested with that drug, and CLEAR currently selected cell lines.
  const handleDrugSelect = useCallback((selected) => {
    setSelDrug(selected);
    setSelCells([]);      // Clear selected cell lines as requested
    setResults(null);
    setError('');

    if (selected?.value) {
      setLoadingValidCells(true);
      api.getCellsForDrug(selected.value)
        .then(list => setValidCells(list || []))
        .catch(() => setValidCells([]))
        .finally(() => setLoadingValidCells(false));
    } else {
      setValidCells([]);
    }
  }, []);

  const ss = {
    control: (b, state) => ({
      ...b,
      background: 'var(--bg)',
      borderColor: state.isDisabled ? 'rgba(255,255,255,.05)' : 'var(--line)',
      color: 'var(--text)',
      minHeight: 42,
      borderRadius: 11,
      fontSize: 13,
      boxShadow: 'none',
      opacity: state.isDisabled ? 0.6 : 1,
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      '&:hover': { borderColor: 'rgba(140,80,255,.5)' },
    }),
    menu: (b) => ({
      ...b,
      background: 'var(--panel2)',
      border: '1px solid var(--line)',
      borderRadius: 10,
      zIndex: 9999,
      boxShadow: '0 12px 32px rgba(0,0,0,.6)',
    }),
    option: (b, s) => ({
      ...b,
      background: s.isSelected ? 'rgba(140,80,255,.4)' : s.isFocused ? 'rgba(140,80,255,.2)' : 'transparent',
      color: 'var(--text)',
      fontSize: 13,
      cursor: 'pointer',
    }),
    multiValue: (b) => ({
      ...b,
      background: 'rgba(140,80,255,.3)',
      borderRadius: 6,
      margin: '3px 4px 3px 0',
      border: '1px solid rgba(140,80,255,.4)',
    }),
    multiValueLabel: (b) => ({
      ...b,
      color: 'var(--text)',
      fontWeight: 600,
      fontSize: 12,
      padding: '3px 6px',
    }),
    multiValueRemove: (b) => ({
      ...b,
      color: 'var(--text)',
      cursor: 'pointer',
      borderRadius: '0 5px 5px 0',
      ':hover': { background: 'rgba(255,93,115,.5)', color: '#fff' },
    }),
    singleValue: (b) => ({ ...b, color: 'var(--text)', fontSize: 13 }),
    input: (b) => ({ ...b, color: 'var(--text)', fontSize: 13 }),
    placeholder: (b) => ({ ...b, color: 'var(--muted)', fontSize: 13 }),
  };

  const handleDrugsChange = (selected) => {
    const list = Array.isArray(selected) ? selected : selected ? [selected] : [];
    if (list.length <= 6) {
      setSelDrugs(list);
    }
  };

  const handleCellsChange = (selected) => {
    const list = Array.isArray(selected) ? selected : selected ? [selected] : [];
    if (list.length <= 6) {
      setSelCells(list);
    }
  };

  const handleCompare = async () => {
    setLoading(true); setError(''); setResults(null);
    try {
      if (mode === 'drugs') {
        if (!selCell) {
          setError('Please select a cancer cell line first.');
          setLoading(false);
          return;
        }
        if (selDrugs.length < 2) {
          setError('Please select at least 2 drugs to compare (up to 6).');
          setLoading(false);
          return;
        }
        const data = await api.compareDrugs(selCell.value, selDrugs.map(d => d.value));
        setResults(data);
      } else {
        if (!selDrug) {
          setError('Please select a drug / compound first.');
          setLoading(false);
          return;
        }
        if (selCells.length < 2) {
          setError('Please select at least 2 cancer cell lines to compare (up to 6).');
          setLoading(false);
          return;
        }
        const data = await api.compareCells(selDrug.value, selCells.map(c => c.value));
        setResults(data);
      }
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
        `Compare_Drugs_${selCell?.value}.csv`,
        ['Drug', 'Predicted log-IC50', 'IC50 (µM)', '95% CI', 'Actual log-IC50', 'Sensitivity', 'Confidence'],
        results.map(r => [
          r.drug,
          r.mean?.toFixed(4),
          logToMicro(r.mean),
          `[${r.lower_ci?.toFixed(2)},${r.upper_ci?.toFixed(2)}]`,
          r.actual_ic50?.toFixed(4) ?? 'N/A',
          r.sensitivity_label,
          r.confidence_label,
        ]),
      );
    } else {
      downloadCSV(
        `Compare_Cells_${selDrug?.value}.csv`,
        ['Cell', 'Tissue', 'Predicted log-IC50', 'IC50 (µM)', '95% CI', 'Actual log-IC50', 'Confidence'],
        results.map(r => [
          r.cell,
          r.tissue,
          r.mean?.toFixed(4),
          logToMicro(r.mean),
          `[${r.lower_ci?.toFixed(2)},${r.upper_ci?.toFixed(2)}]`,
          r.actual_ic50?.toFixed(4) ?? 'N/A',
          r.confidence_label,
        ]),
      );
    }
  };

  const maxIC50 = results ? Math.max(...results.map(r => r.mean ?? 0)) : 1;

  return (
    <section className="section active">
      <div className="head">
        <div>
          <h2>Drug and Cell Comparison</h2>
          <p>Side-by-side real model predictions for multiple drugs or cell lines.</p>
        </div>
        <span className="pill">Real predictions</span>
      </div>

      <div className="stack">
        <div className="panel">
          <div className="btn-group" style={{ marginBottom: 16 }}>
            <button
              className={`btn ${mode === 'drugs' ? '' : 'alt'}`}
              onClick={() => { setMode('drugs'); setResults(null); setError(''); }}
            >
              ⚖️ Compare Drugs
            </button>
            <button
              className={`btn ${mode === 'cells' ? '' : 'alt'}`}
              onClick={() => { setMode('cells'); setResults(null); setError(''); }}
            >
              🧬 Compare Cell Lines
            </button>
          </div>

          {mode === 'drugs' ? (
            <>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Cancer cell line</label>
                <Select
                  options={allCellOpts}
                  value={selCell}
                  onChange={handleCellSelect}
                  placeholder="Select a cell line (319 available)…"
                  isClearable
                  isSearchable={true}
                  styles={ss}
                />
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label>
                  Drugs to compare ({selDrugs.length}/6 selected
                  {selCell ? ` — ${testedDrugOpts.length} tested drugs available for this cell line` : ' — select a cell line first'}
                  )
                </label>
                <Select
                  isMulti={true}
                  isSearchable={true}
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  isDisabled={!selCell || loadingValidDrugs}
                  options={testedDrugOpts}
                  value={selDrugs}
                  onChange={handleDrugsChange}
                  placeholder={
                    !selCell
                      ? "Select a cancer cell line above first…"
                      : loadingValidDrugs
                      ? "Loading tested drugs…"
                      : testedDrugOpts.length > 0
                      ? `Type to search & select from ${testedDrugOpts.length} tested drugs (choose 2–6)…`
                      : "No tested drugs found for this cell line in the dataset."
                  }
                  isOptionDisabled={(opt) => selDrugs.length >= 6 && !selDrugs.some(d => d.value === opt.value)}
                  styles={ss}
                />
              </div>
            </>
          ) : (
            <>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Drug / compound</label>
                <Select
                  options={allDrugOpts}
                  value={selDrug}
                  onChange={handleDrugSelect}
                  placeholder="Select a drug / compound (144 available)…"
                  isClearable
                  isSearchable={true}
                  styles={ss}
                />
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label>
                  Cell lines to compare ({selCells.length}/6 selected
                  {selDrug ? ` — ${testedCellOpts.length} tested cell lines available for this drug` : ' — select a drug first'}
                  )
                </label>
                <Select
                  isMulti={true}
                  isSearchable={true}
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  isDisabled={!selDrug || loadingValidCells}
                  options={testedCellOpts}
                  value={selCells}
                  onChange={handleCellsChange}
                  placeholder={
                    !selDrug
                      ? "Select a drug / compound above first…"
                      : loadingValidCells
                      ? "Loading tested cell lines…"
                      : testedCellOpts.length > 0
                      ? `Type to search & select from ${testedCellOpts.length} tested cell lines (choose 2–6)…`
                      : "No tested cell lines found for this drug in the dataset."
                  }
                  isOptionDisabled={(opt) => selCells.length >= 6 && !selCells.some(c => c.value === opt.value)}
                  styles={ss}
                />
              </div>
            </>
          )}

          {error && <p style={{ color: 'var(--red)', margin: '8px 0' }}>⚠ {error}</p>}

          <button className="btn" onClick={handleCompare} disabled={loading || (mode === 'drugs' ? selDrugs.length < 2 : selCells.length < 2)}>
            {loading ? '⏳ Computing…' : 'Compare →'}
          </button>
        </div>

        {results && (
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ margin: 0 }}>
                {mode === 'drugs'
                  ? `Drug comparison for ${selCell?.label || selCell?.value}`
                  : `Cell line comparison for ${selDrug?.value}`}
              </h3>
              <button className="btn alt small" onClick={handleCSV}>⬇ CSV</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 11 }}>
                    <th style={{ textAlign: 'left', padding: '8px 4px' }}>{mode === 'drugs' ? 'Drug' : 'Cell Line'}</th>
                    {mode === 'cells' && <th style={{ textAlign: 'left', padding: '8px 4px' }}>Tissue</th>}
                    <th style={{ textAlign: 'left', padding: '8px 4px' }}>Predicted</th>
                    <th style={{ textAlign: 'left', padding: '8px 4px' }}>95% CI</th>
                    <th style={{ textAlign: 'left', padding: '8px 4px' }}>Actual</th>
                    <th style={{ textAlign: 'left', padding: '8px 4px' }}>Sensitivity</th>
                    <th style={{ textAlign: 'left', padding: '8px 4px' }}>Response bar</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const z = r.sensitivity_label;
                    const pct = Math.max(5, Math.min(100, ((r.mean - (maxIC50 - 2)) / 2.5) * 100));
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px 4px', fontWeight: 700 }}>{mode === 'drugs' ? r.drug : r.cell}</td>
                        {mode === 'cells' && <td style={{ padding: '10px 4px', color: 'var(--muted)', fontSize: 11 }}>{r.tissue}</td>}
                        <td style={{ padding: '10px 4px' }}>{r.mean?.toFixed(3)} <span style={{ color: 'var(--muted)', fontSize: 10 }}>log</span></td>
                        <td style={{ padding: '10px 4px', color: 'var(--muted)', fontSize: 11 }}>[{r.lower_ci?.toFixed(2)}, {r.upper_ci?.toFixed(2)}]</td>
                        <td style={{ padding: '10px 4px', color: 'var(--cyan)', fontSize: 11 }}>{r.actual_ic50?.toFixed(3) ?? 'N/A'}</td>
                        <td style={{ padding: '10px 4px' }}>
                          <span className={`badge ${z === 'Sensitive' ? 'b-green' : z === 'Resistant' ? 'b-red' : 'b-yellow'}`}>{z}</span>
                        </td>
                        <td style={{ padding: '10px 4px', minWidth: 120 }}>
                          <div className="track">
                            <div className="fill" style={{ width: `${pct}%`, background: z === 'Sensitive' ? 'var(--green)' : z === 'Resistant' ? 'var(--red)' : 'var(--yellow)' }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
