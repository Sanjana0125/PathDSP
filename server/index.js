const express  = require('express');
const cors     = require('cors');
const fs       = require('fs');
const readline = require('readline');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─── In-memory data stores ────────────────────────────────────────────────────
const pairMap        = new Map();   // "drug||cell" -> float[]  (1031 features)
const drugs          = new Set();
const cells          = new Set();
let   featureNames   = [];
const drugResponses  = new Map();   // drug -> { q25, q75, all: sorted [] }
const drugStats      = new Map();   // drug -> { mean, std }
const actualResponses = new Map();  // "drug||cell" -> actual log-IC50
const tissueMap      = new Map();   // SIDM... -> tissue name
const cancerTypeMap  = new Map();   // SIDM... -> cancer_type
const modelNameMap   = new Map();   // SIDM... -> model_name (friendly display name)
const drugsForCellMap = new Map();  // cell -> Set of tested drugs
const cellsForDrugMap = new Map();  // drug -> Set of tested cells

// ─── Data loader ─────────────────────────────────────────────────────────────
async function loadData() {
  console.log("Loading input.txt …");
  const rl = readline.createInterface({
    input: fs.createReadStream('../input.txt'),
    crlfDelay: Infinity,
  });

  let first = true;
  for await (const line of rl) {
    const parts = line.split('\t');
    if (first) {
      featureNames = parts.slice(2, 1033).map(n => n.trim());
      first = false;
      continue;
    }
    if (parts.length < 1034) continue;

    const drug  = parts[0].trim();
    const cell  = parts[1].trim();
    const features = parts.slice(2, 1033).map(Number);
    const resp  = Number(parts[1033]);

    pairMap.set(`${drug}||${cell}`, features);
    actualResponses.set(`${drug}||${cell}`, resp);
    drugs.add(drug);
    cells.add(cell);

    if (!drugsForCellMap.has(cell)) drugsForCellMap.set(cell, new Set());
    drugsForCellMap.get(cell).add(drug);

    if (!cellsForDrugMap.has(drug)) cellsForDrugMap.set(drug, new Set());
    cellsForDrugMap.get(drug).add(cell);

    if (!drugResponses.has(drug)) drugResponses.set(drug, []);
    drugResponses.get(drug).push(resp);
  }

  // Compute per-drug Q25 / Q75 for sensitivity labelling and mean / std for Z-score calculation
  drugResponses.forEach((arr, drug) => {
    arr.sort((a, b) => a - b);
    const q25 = arr[Math.floor(arr.length * 0.25)];
    const q75 = arr[Math.floor(arr.length * 0.75)];

    const n = arr.length;
    const mean = arr.reduce((sum, v) => sum + v, 0) / (n || 1);
    const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
    const std = Math.sqrt(variance) || 1e-6;

    drugStats.set(drug, { mean, std });
    drugResponses.set(drug, { q25, q75, all: arr });
  });

  console.log(`Loaded ${pairMap.size} pairs, ${drugs.size} drugs, ${cells.size} cells.`);

  // Load metadata.csv
  if (fs.existsSync('./metadata.csv')) {
    console.log("Loading metadata.csv …");
    const metaRl = readline.createInterface({
      input: fs.createReadStream('./metadata.csv'),
      crlfDelay: Infinity,
    });

    let isHeader = true;
    let idCol = -1, tissueCol = -1, typeCol = -1, nameCol = -1;

    for await (const line of metaRl) {
      const cols = line.split(',').map(c => c.replace(/"/g, '').trim());
      if (isHeader) {
        idCol      = cols.findIndex(c => c.toLowerCase() === 'model_id');
        tissueCol  = cols.findIndex(c => c.toLowerCase() === 'tissue');
        typeCol    = cols.findIndex(c => c.toLowerCase() === 'cancer_type');
        nameCol    = cols.findIndex(c => c.toLowerCase() === 'model_name');
        isHeader   = false;
        continue;
      }
      if (idCol !== -1 && cols[idCol]) {
        const id = cols[idCol];
        if (tissueCol !== -1 && cols[tissueCol]) tissueMap.set(id, cols[tissueCol]);
        if (typeCol   !== -1 && cols[typeCol])   cancerTypeMap.set(id, cols[typeCol]);
        if (nameCol   !== -1 && cols[nameCol])   modelNameMap.set(id, cols[nameCol]);
      }
    }
    console.log(`Metadata loaded: ${tissueMap.size} tissue entries.`);
  } else {
    console.warn("Warning: metadata.csv not found.");
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getSensitivityLabel(drug, ic50) {
  const t = drugResponses.get(drug);
  if (!t) return 'Unknown';
  if (ic50 <= t.q25) return 'Sensitive';
  if (ic50 >= t.q75) return 'Resistant';
  return 'Intermediate';
}

function cellMeta(cell) {
  return {
    tissue:      tissueMap.get(cell)     || 'Cancer',
    cancer_type: cancerTypeMap.get(cell) || '',
    model_name:  modelNameMap.get(cell)  || cell,
  };
}

function cleanFeatureName(rawName) {
  let type = 'Pathway';
  let name = rawName;
  if (rawName.startsWith('CHEM_'))             { type = 'Chemical';    name = rawName.replace('CHEM_', ''); }
  else if (rawName.startsWith('EXP_'))         { type = 'Expression';  name = rawName.replace('EXP_', ''); }
  else if (rawName.startsWith('MUT_'))         { type = 'Mutation';    name = rawName.replace('MUT_', ''); }
  else if (rawName.startsWith('CNV_'))         { type = 'Copy Number'; name = rawName.replace('CNV_', ''); }
  else if (rawName.startsWith('TARGETnNEIGHBOR_')) { type = 'Drug Target'; name = rawName.replace('TARGETnNEIGHBOR_', ''); }
  else if (rawName.startsWith('TARGET_'))      { type = 'Drug Target'; name = rawName.replace('TARGET_', ''); }
  name = name.replace(/_PATHWAY$/i, '').replace(/_/g, ' ').trim();
  return { name, type };
}

const PY_HOSTS = [
  'http://127.0.0.1:8000',
  'http://localhost:8000',
  'http://127.0.0.1:8001',
  'http://localhost:8001',
];

async function callPython(path, body) {
  let lastErr = null;
  for (const host of PY_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Python service error on ${path} (${res.status}): ${errText}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Python model service is not running. Please start it with: cd model_service && python main.py (Error: ${lastErr?.message || 'connection failed'})`);
}

async function checkPythonHealth() {
  for (const host of PY_HOSTS) {
    try {
      const res = await fetch(`${host}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch {}
  }
  return false;
}

// ─── API: metadata ────────────────────────────────────────────────────────────
app.get('/api/cells', (req, res) => {
  const data = [...cells].map(c => ({
    id:          c,
    tissue:      tissueMap.get(c)     || 'Cancer',
    cancer_type: cancerTypeMap.get(c) || '',
    model_name:  modelNameMap.get(c)  || c,
  })).sort((a, b) => a.id.localeCompare(b.id));
  res.json(data);
});

app.get('/api/drugs', (req, res) => res.json([...drugs].sort()));

app.get('/api/drugs-for-cell/:cell', (req, res) => {
  const cell = req.params.cell;
  const set = drugsForCellMap.get(cell);
  res.json(set ? [...set].sort() : []);
});

app.get('/api/cells-for-drug/:drug', (req, res) => {
  const drug = req.params.drug;
  const set = cellsForDrugMap.get(drug);
  res.json(set ? [...set].sort() : []);
});

app.get('/api/stats', async (req, res) => {
  const pyOnline = await checkPythonHealth();
  res.json({
    drugs: drugs.size,
    cells: cells.size,
    pairs: pairMap.size,
    python_online: pyOnline,
  });
});

// ─── API: single prediction ───────────────────────────────────────────────────
app.post('/api/predict', async (req, res) => {
  const { drug, cell } = req.body;
  if (!drug || !cell) return res.status(400).json({ error: 'drug and cell are required' });
  const features = pairMap.get(`${drug}||${cell}`);
  if (!features) return res.status(404).json({ error: `Pair "${drug} | ${cell}" not found in dataset` });

  try {
    const data = await callPython('/predict_with_confidence', { features });
    data.sensitivity_label = getSensitivityLabel(drug, data.mean);
    data.actual_ic50       = actualResponses.get(`${drug}||${cell}`) ?? null;
    data.thresholds        = drugResponses.get(drug);
    data.meta              = cellMeta(cell);
    res.json(data);
  } catch (err) {
    res.status(503).json({ error: 'Python model service is not running. Start it with: uvicorn main:app --port 8000' });
  }
});

// ─── API: SHAP explanation ────────────────────────────────────────────────────
app.post('/api/explain', async (req, res) => {
  const { drug, cell, limit = 100 } = req.body;
  if (!drug || !cell) return res.status(400).json({ error: 'drug and cell are required' });
  const features = pairMap.get(`${drug}||${cell}`);
  if (!features) return res.status(404).json({ error: 'Pair not found' });

  try {
    const data = await callPython('/explain', { features, limit });
    const enriched = data.top_features.map(item => {
      const rawName = featureNames[item.index] || `Feature_${item.index}`;
      const { name, type } = cleanFeatureName(rawName);
      return { name, type, raw_name: rawName, value: item.shap_value, index: item.index };
    });
    res.json({
      base_value:      data.base_value,
      predicted_value: data.predicted_value,
      features:        enriched,
    });
  } catch (err) {
    res.status(503).json({ error: 'Python model service is not running.' });
  }
});

// ─── API: rank drugs for a cell line (batch) ──────────────────────────────────
app.get('/api/rank/:cell', async (req, res) => {
  const cell       = req.params.cell;
  const limit      = parseInt(req.query.limit) || 10;
  const direction  = req.query.direction || 'sensitive'; // 'sensitive' | 'resistant'

  const pairs = [...pairMap.keys()].filter(k => k.endsWith(`||${cell}`));
  if (!pairs.length) return res.status(404).json({ error: 'No data for this cell line' });

  try {
    const featuresList = pairs.map(p => pairMap.get(p));
    const { predictions } = await callPython('/predict_batch', { features_list: featuresList });

    let results = pairs.map((p, i) => {
      const drug = p.split('||')[0];
      const ic50 = predictions[i];
      const stats = drugStats.get(drug) || { mean: 0, std: 1 };
      const z_score = stats.std > 0 ? (ic50 - stats.mean) / stats.std : 0;

      let label = 'Intermediate';
      if (z_score <= -1) {
        label = 'Sensitive';
      } else if (z_score >= 1) {
        label = 'Resistant';
      }

      return {
        drug,
        ic50,
        z_score,
        drug_mean:         stats.mean,
        drug_std:          stats.std,
        actual_ic50:       actualResponses.get(p) ?? null,
        sensitivity_label: label,
      };
    });

    results.sort((a, b) => direction === 'resistant' ? b.z_score - a.z_score : a.z_score - b.z_score);

    const topResults = results.slice(0, limit);
    res.json(topResults);
  } catch (err) {
    res.status(503).json({ error: 'Python model service is not running.' });
  }
});

// ─── API: rank cell lines for a drug (batch) ──────────────────────────────────
app.get('/api/rank-cells/:drug', async (req, res) => {
  const drug       = req.params.drug;
  const limit      = parseInt(req.query.limit) || 10;
  const direction  = req.query.direction || 'sensitive';

  const pairs = [...pairMap.keys()].filter(k => k.startsWith(`${drug}||`));
  if (!pairs.length) return res.status(404).json({ error: 'No data for this drug' });

  try {
    const featuresList = pairs.map(p => pairMap.get(p));
    const { predictions } = await callPython('/predict_batch', { features_list: featuresList });

    const t = drugResponses.get(drug);
    const sortedPreds = [...predictions].sort((a, b) => a - b);
    const q25 = t?.q25 ?? sortedPreds[Math.floor(sortedPreds.length * 0.25)];
    const q75 = t?.q75 ?? sortedPreds[Math.floor(sortedPreds.length * 0.75)];

    let results = pairs.map((p, i) => {
      const cell = p.split('||')[1];
      const ic50 = predictions[i];
      let label = 'Intermediate';
      if (ic50 <= q25) label = 'Sensitive';
      else if (ic50 >= q75) label = 'Resistant';

      return {
        cell,
        ic50,
        actual_ic50: actualResponses.get(p) ?? null,
        sensitivity_label: label,
        thresholds: { q25, q75 },
        ...cellMeta(cell),
      };
    });

    results.sort((a, b) => direction === 'resistant' ? b.ic50 - a.ic50 : a.ic50 - b.ic50);

    const topResults = results.slice(0, limit);

    res.json(topResults);
  } catch (err) {
    res.status(503).json({ error: 'Python model service is not running.' });
  }
});

// ─── API: compare multiple drugs on one cell line ─────────────────────────────
app.post('/api/compare', async (req, res) => {
  const { cell, drugs: drugList } = req.body;
  if (!cell || !Array.isArray(drugList) || drugList.length < 2)
    return res.status(400).json({ error: 'cell and at least 2 drugs required' });

  const valid = drugList.filter(d => pairMap.has(`${d}||${cell}`));
  if (!valid.length) return res.status(404).json({ error: 'No pairs found for given drugs/cell' });

  try {
    const featuresList = valid.map(d => pairMap.get(`${d}||${cell}`));
    const { predictions } = await callPython('/predict_batch', { features_list: featuresList });

    // MC Confidence for each
    const results = await Promise.all(valid.map(async (drug, i) => {
      try {
        const conf = await callPython('/predict_with_confidence', { features: featuresList[i] });
        return {
          drug,
          ...conf,
          sensitivity_label: getSensitivityLabel(drug, conf.mean),
          actual_ic50:       actualResponses.get(`${drug}||${cell}`) ?? null,
          thresholds:        drugResponses.get(drug),
        };
      } catch {
        return {
          drug,
          mean:              predictions[i],
          std:               null,
          lower_ci:          null,
          upper_ci:          null,
          confidence_label:  'unknown',
          sensitivity_label: getSensitivityLabel(drug, predictions[i]),
          actual_ic50:       actualResponses.get(`${drug}||${cell}`) ?? null,
          thresholds:        drugResponses.get(drug),
        };
      }
    }));

    res.json(results);
  } catch (err) {
    res.status(503).json({ error: 'Python model service is not running.' });
  }
});

// ─── API: compare multiple cell lines for one drug ────────────────────────────
app.post('/api/compare-cells', async (req, res) => {
  const { drug, cells: cellList } = req.body;
  if (!drug || !Array.isArray(cellList) || cellList.length < 2)
    return res.status(400).json({ error: 'drug and at least 2 cells required' });

  const valid = cellList.filter(c => pairMap.has(`${drug}||${c}`));
  if (!valid.length) return res.status(404).json({ error: 'No pairs found' });

  try {
    const featuresList = valid.map(c => pairMap.get(`${drug}||${c}`));
    const results = await Promise.all(valid.map(async (cell, i) => {
      try {
        const conf = await callPython('/predict_with_confidence', { features: featuresList[i] });
        return {
          cell,
          ...cellMeta(cell),
          ...conf,
          actual_ic50: actualResponses.get(`${drug}||${cell}`) ?? null,
          thresholds:  drugResponses.get(drug),
        };
      } catch {
        return { cell, ...cellMeta(cell), error: true };
      }
    }));
    res.json(results);
  } catch (err) {
    res.status(503).json({ error: 'Python model service is not running.' });
  }
});

// ─── API: Prediction Explorer (search / filter / paginate) ───────────────────
app.get('/api/explorer', (req, res) => {
  const { search = '', tissue = '', drug: drugFilter = '', cell: cellFilter = '', page = 1, limit = 50 } = req.query;
  const pg  = Math.max(1, parseInt(page));
  const lim = Math.min(200, Math.max(1, parseInt(limit)));

  const searchLc  = search.toLowerCase();
  const tissueLc  = tissue.toLowerCase();
  const drugFLc   = drugFilter.toLowerCase();
  const cellFLc   = cellFilter.toLowerCase();

  let results = [];
  for (const [key, ] of pairMap) {
    const [d, c] = key.split('||');
    const meta   = {
      tissue:      tissueMap.get(c)     || 'Cancer',
      cancer_type: cancerTypeMap.get(c) || '',
      model_name:  modelNameMap.get(c)  || c,
    };
    const actual = actualResponses.get(key);

    // Filters
    if (drugFLc && !d.toLowerCase().includes(drugFLc)) continue;
    if (cellFLc && !c.toLowerCase().includes(cellFLc)) continue;
    if (tissueLc && !meta.tissue.toLowerCase().includes(tissueLc)) continue;
    if (searchLc && !d.toLowerCase().includes(searchLc) && !c.toLowerCase().includes(searchLc) &&
        !meta.tissue.toLowerCase().includes(searchLc) && !meta.model_name.toLowerCase().includes(searchLc)) continue;

    results.push({ drug: d, cell: c, actual_ic50: actual ?? null, ...meta });
  }

  const total = results.length;
  const start = (pg - 1) * lim;
  const slice = results.slice(start, start + lim);

  res.json({ total, page: pg, limit: lim, results: slice });
});

// ─── API: distinct tissues for filter dropdowns ───────────────────────────────
app.get('/api/tissues', (req, res) => {
  const set = new Set();
  tissueMap.forEach(t => { if (t) set.add(t); });
  res.json([...set].sort());
});

// ─── Bootstrap ───────────────────────────────────────────────────────────────
loadData().then(() => {
  app.listen(5000, () => console.log('Node server → http://localhost:5000'));
});
