import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Select from '../components/OptimizedSelect';
import { api, downloadCSV } from '../utils/api';

export default function ExplorerView({ drugs: initialDrugs, cells: initialCells, onSelectPrediction }) {
  const [drugList, setDrugList] = useState(initialDrugs || []);
  const [cellList, setCellList] = useState(initialCells || []);

  const [search,   setSearch]   = useState('');
  const [tissue,   setTissue]   = useState('');
  const [selDrug,  setSelDrug]  = useState(null);
  const [selCell,  setSelCell]  = useState(null);
  const [page,     setPage]     = useState(1);
  const [limit,    setLimit]    = useState(50);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [data,     setData]     = useState(null);

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

  const drugOptions = useMemo(() => {
    return (drugList || []).map(d => ({ value: d, label: d }));
  }, [drugList]);

  const cellOptions = useMemo(() => {
    return (cellList || []).map(c => ({
      value: c.id,
      label: `${c.id} — ${c.model_name && c.model_name !== c.id ? c.model_name + ' · ' : ''}${c.tissue || 'Cancer'}`,
    }));
  }, [cellList]);

  const tissues = useMemo(() => {
    return [...new Set((cellList || []).map(c => c.tissue))].filter(Boolean).sort();
  }, [cellList]);

  const selectStyles = {
    control: (b) => ({
      ...b,
      background: 'var(--bg)',
      borderColor: 'var(--line)',
      color: 'var(--text)',
      minHeight: 40,
      borderRadius: 11,
      fontSize: 13,
      boxShadow: 'none',
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
      fontSize: 12,
      cursor: 'pointer',
    }),
    singleValue: (b) => ({ ...b, color: 'var(--text)', fontSize: 13 }),
    input: (b) => ({ ...b, color: 'var(--text)', fontSize: 13 }),
    placeholder: (b) => ({ ...b, color: 'var(--muted)', fontSize: 13 }),
  };

  const fetchData = useCallback(async (pg = 1, dFilter = selDrug, cFilter = selCell, tFilter = tissue, sFilter = search, lim = limit) => {
    setLoading(true); setError('');
    try {
      const res = await api.explorer({
        search: sFilter,
        tissue: tFilter,
        drug: dFilter?.value || '',
        cell: cFilter?.value || '',
        page: pg,
        limit: lim,
      });
      setData(res);
      setPage(pg);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selDrug, selCell, tissue, search, limit]);

  // Initial load on mount
  useEffect(() => {
    fetchData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrugChange = (selected) => {
    setSelDrug(selected);
    fetchData(1, selected, selCell, tissue, search, limit);
  };

  const handleCellChange = (selected) => {
    setSelCell(selected);
    fetchData(1, selDrug, selected, tissue, search, limit);
  };

  const handleTissueChange = (e) => {
    const val = e.target.value;
    setTissue(val);
    fetchData(1, selDrug, selCell, val, search, limit);
  };

  const handleLimitChange = (e) => {
    const val = Number(e.target.value);
    setLimit(val);
    fetchData(1, selDrug, selCell, tissue, search, val);
  };

  const handleClear = () => {
    setSearch('');
    setTissue('');
    setSelDrug(null);
    setSelCell(null);
    fetchData(1, null, null, '', '', limit);
  };

  const handleCSV = () => {
    if (!data) return;
    downloadCSV(
      'PathDSP_Explorer.csv',
      ['Drug', 'Cell Line', 'Tissue', 'Cancer Type', 'Actual log-IC50'],
      data.results.map(r => [
        r.drug,
        r.cell,
        r.tissue,
        r.cancer_type,
        r.actual_ic50 != null ? r.actual_ic50.toFixed(4) : 'N/A',
      ]),
    );
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <section className="section active">
      <div className="head">
        <div>
          <h2>Prediction Explorer</h2>
          <p>Browse, filter and inspect all {data?.total?.toLocaleString() ?? '37,732'} drug–cell pairs from the GDSC benchmark dataset.</p>
        </div>
        <span className="pill">Real dataset</span>
      </div>

      <div className="stack">
        {/* filters */}
        <div className="panel">
          <h3>Filters & Search</h3>
          <div className="fields" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div className="field">
              <label>Filter by drug ({drugOptions.length > 0 ? `${drugOptions.length} available` : 'loading…'})</label>
              <Select
                options={drugOptions}
                value={selDrug}
                onChange={handleDrugChange}
                placeholder="All drugs (search 144)…"
                isClearable
                styles={selectStyles}
              />
            </div>

            <div className="field">
              <label>Filter by cell line ({cellOptions.length > 0 ? `${cellOptions.length} available` : 'loading…'})</label>
              <Select
                options={cellOptions}
                value={selCell}
                onChange={handleCellChange}
                placeholder="All cell lines (search 319)…"
                isClearable
                styles={selectStyles}
              />
            </div>

            <div className="field">
              <label>Filter by tissue</label>
              <select className="ctrl-select" value={tissue} onChange={handleTissueChange}>
                <option value="">All tissues ({tissues.length})</option>
                {tissues.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Keyword search</label>
              <input
                className="ctrl-input"
                placeholder="Gene, drug, cell, tissue…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchData(1)}
              />
            </div>

            <div className="field">
              <label>Results per page</label>
              <select className="ctrl-select" value={limit} onChange={handleLimitChange}>
                {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n} rows</option>)}
              </select>
            </div>
          </div>

          {error && <p style={{ color: 'var(--red)', margin: '8px 0' }}>⚠ {error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn" onClick={() => fetchData(1)} disabled={loading}>
              {loading ? '⏳ Loading…' : '🔍 Search'}
            </button>
            <button className="btn alt" onClick={handleClear} disabled={loading}>
              Reset filters
            </button>
          </div>
        </div>

        {data && (
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ margin: 0 }}>
                Matched: {data.total.toLocaleString()} pairs
                {data.total > 0 && ` (page ${page} of ${totalPages})`}
              </h3>
              <button className="btn alt small" onClick={handleCSV} disabled={data.results.length === 0}>
                ⬇ CSV (this page)
              </button>
            </div>

            {data.results.length === 0 ? (
              <p className="hint">No drug–cell pairs match your filter criteria.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 10, letterSpacing: '0.08em' }}>
                      {['Drug', 'Cell Line', 'Tissue', 'Cancer Type', 'Actual log-IC50', 'Action'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 6px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((r, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: '1px solid var(--line)', transition: 'background .2s', cursor: onSelectPrediction ? 'pointer' : 'default' }}
                        onClick={() => onSelectPrediction && onSelectPrediction(r.drug, r.cell)}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(140,80,255,.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--text)' }}>{r.drug}</td>
                        <td style={{ padding: '8px 6px', color: 'var(--muted)' }}>{r.cell}</td>
                        <td style={{ padding: '8px 6px' }}>{r.tissue}</td>
                        <td style={{ padding: '8px 6px', color: 'var(--muted)', fontSize: 11 }}>{r.cancer_type || '—'}</td>
                        <td style={{ padding: '8px 6px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {r.actual_ic50 != null ? r.actual_ic50.toFixed(3) : '—'}
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <button
                            className="btn alt small"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectPrediction) onSelectPrediction(r.drug, r.cell);
                            }}
                          >
                            Analyze →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center', alignItems: 'center' }}>
                <button className="btn alt small" onClick={() => fetchData(1)} disabled={page <= 1}>« First</button>
                <button className="btn alt small" onClick={() => fetchData(page - 1)} disabled={page <= 1}>‹ Prev</button>
                <span style={{ color: 'var(--muted)', fontSize: 12, padding: '0 6px' }}>
                  Page {page} of {totalPages}
                </span>
                <button className="btn alt small" onClick={() => fetchData(page + 1)} disabled={page >= totalPages}>Next ›</button>
                <button className="btn alt small" onClick={() => fetchData(totalPages)} disabled={page >= totalPages}>Last »</button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
