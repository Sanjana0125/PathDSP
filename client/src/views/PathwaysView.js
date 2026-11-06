import React from 'react';

export default function PathwaysView() {
  const pathways = [
    { name: 'PI3K–AKT–mTOR Signalling',  color: 'var(--cyan)',   score: 0.88, desc: 'Key survival and proliferation axis. Hyperactivation drives resistance to cytotoxic drugs.' },
    { name: 'MAPK / ERK Signalling',       color: '#ad77ff',       score: 0.73, desc: 'Mitogenic cascade downstream of EGFR and RAS. Commonly mutated in lung and colorectal cancers.' },
    { name: 'Apoptosis Pathway',           color: '#ef79dc',       score: 0.62, desc: 'Programmed cell death. Defects allow cancer cells to evade cytotoxic treatment.' },
    { name: 'Cell Cycle Regulation',       color: '#f3c55b',       score: 0.49, desc: 'Controls G1/S and G2/M checkpoints. CDK4/6 inhibitors target this pathway.' },
    { name: 'WNT / β-Catenin',            color: 'var(--green)',  score: 0.41, desc: 'Developmental signalling; promotes cancer stem cell maintenance and metastasis.' },
    { name: 'JAK–STAT Signalling',         color: '#ff7a5c',       score: 0.36, desc: 'Mediates cytokine responses; frequently activated in haematological malignancies.' },
  ];

  const categories = [
    { label: 'Expression (EXP)',         count: 187, desc: 'Single-sample GSEA pathway enrichment scores from RNA-seq expression data.' },
    { label: 'Drug Targets (TARGET)',    count: 196, desc: "Graph-based proximity scores from the drug's known targets in the PPI network." },
    { label: 'Mutations (MUT)',          count: 196, desc: 'Somatic point mutation binary indicators from COSMIC / GDSC cell-line sequencing.' },
    { label: 'Copy Number (CNV)',        count: 196, desc: 'DNA copy-number alteration values indicating gene amplifications or deletions.' },
    { label: 'Chemical (CHEM)',          count: 256, desc: "Morgan circular fingerprint bits encoding the drug's molecular structure." },
  ];

  return (
    <section className="section active">
      <div className="head">
        <div><h2>Pathway Enrichment</h2><p>Cancer-related pathway activity and feature category overview.</p></div>
      </div>

      <div className="stack">
        {/* pathway landscape */}
        <div className="panel">
          <h3>Pathway landscape</h3>
          <p className="hint">
            These example pathway scores reflect the types of biological signals captured by the PathDSP feature set.
            Individual ssGSEA scores vary per cell line and are retrieved from the GDSC gene expression data.
          </p>
          {pathways.map((p, i) => (
            <div key={i} className="node" style={{ marginBottom: 8 }}>
              <i className="dot" style={{ background: p.color }} />
              <div style={{ flex: 1 }}>
                <b style={{ display: 'block' }}>{p.name}</b>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.desc}</span>
              </div>
              <span style={{ fontSize: 11, color: p.color, fontWeight: 700 }}>{(p.score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>

        {/* bar chart */}
        <div className="panel">
          <h3>Example pathway enrichment scores</h3>
          <div className="bars">
            {pathways.map((p, i) => (
              <div className="barline" key={i}>
                <span>{p.name.split(' ')[0]}</span>
                <div className="track">
                  <div className="fill" style={{ width: `${p.score * 100}%`, background: p.color }} />
                </div>
                <b>{p.score.toFixed(2)}</b>
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 14 }}>
            Run a Drug Sensitivity prediction to see the SHAP contribution of each actual
            ssGSEA pathway score for your selected cell line.
          </p>
        </div>

        {/* feature categories */}
        <div className="panel">
          <h3>PathDSP feature categories (1,031 total)</h3>
          <div className="metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            {categories.map((c, i) => (
              <div className="metric" key={i}>
                <small>{c.label}</small>
                <strong>{c.count}</strong>
                <span style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>{c.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="notice">
          <b>Note:</b> The pathway enrichment scores displayed above are representative examples from the PathDSP
          feature set. SHAP values computed by the explainability module show actual per-sample feature contributions
          for each drug–cell prediction. Use the <b>SHAP Explainability</b> tab after running a prediction to see real values.
        </div>
      </div>
    </section>
  );
}

