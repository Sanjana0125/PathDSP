/** Shared fetch wrapper – surfaces backend error messages cleanly */
export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const BASE = 'http://localhost:5000/api';

export const api = {
  getCells:        ()            => apiFetch(`${BASE}/cells`),
  getDrugs:        ()            => apiFetch(`${BASE}/drugs`),
  getDrugsForCell: (cell)        => apiFetch(`${BASE}/drugs-for-cell/${encodeURIComponent(cell)}`),
  getCellsForDrug: (drug)        => apiFetch(`${BASE}/cells-for-drug/${encodeURIComponent(drug)}`),
  getStats:        ()            => apiFetch(`${BASE}/stats`),
  getTissues:      ()            => apiFetch(`${BASE}/tissues`),

  predict: (drug, cell) =>
    apiFetch(`${BASE}/predict`, { method: 'POST', body: JSON.stringify({ drug, cell }) }),

  explain: (drug, cell, limit = 100) =>
    apiFetch(`${BASE}/explain`, { method: 'POST', body: JSON.stringify({ drug, cell, limit }) }),

  rankDrugs: (cell, limit = 10, direction = 'sensitive') =>
    apiFetch(`${BASE}/rank/${encodeURIComponent(cell)}?limit=${limit}&direction=${direction}`),

  rankCells: (drug, limit = 10, direction = 'sensitive') =>
    apiFetch(`${BASE}/rank-cells/${encodeURIComponent(drug)}?limit=${limit}&direction=${direction}`),

  compareDrugs: (cell, drugs) =>
    apiFetch(`${BASE}/compare`, { method: 'POST', body: JSON.stringify({ cell, drugs }) }),

  compareCells: (drug, cells) =>
    apiFetch(`${BASE}/compare-cells`, { method: 'POST', body: JSON.stringify({ drug, cells }) }),

  explorer: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`${BASE}/explorer?${q}`);
  },
};

/** Download a CSV string as a file */
export function downloadCSV(filename, headers, rows) {
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** History helpers using localStorage */
const HIST_KEY = 'pathdsp_history_v2';
export function loadHistory()       { try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; } catch { return []; } }
export function saveHistory(arr)    { try { localStorage.setItem(HIST_KEY, JSON.stringify(arr.slice(0, 100))); } catch {} }
export function appendHistory(arr, entry) {
  const next = [{ ...entry, timestamp: Date.now() }, ...arr].slice(0, 100);
  saveHistory(next);
  return next;
}
export function clearHistory()      { localStorage.removeItem(HIST_KEY); return []; }

/** Utility: convert log-IC50 to µM string */
export function logToMicro(logVal, dp = 3) {
  if (logVal == null) return 'N/A';
  const v = Math.pow(10, logVal);
  return v < 10 ? v.toFixed(dp) : v.toFixed(1);
}

/** Zone colour classes */
export function zoneOf(label) {
  if (!label) return 'var(--muted)';
  if (label === 'Sensitive')     return 'var(--green)';
  if (label === 'Resistant')     return 'var(--red)';
  return 'var(--yellow)';
}

