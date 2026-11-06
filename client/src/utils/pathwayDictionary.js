/**
 * Biological annotation dictionary for PathDSP features.
 * Keys are partial feature names (case-insensitive match).
 */
export const PATHWAY_ANNOTATIONS = {
  'PI3K': {
    full: 'PI3K–AKT–mTOR Signalling',
    summary: 'A key survival and proliferation axis. Hyperactivation is common in many cancers and can drive resistance to cytotoxic drugs.',
  },
  'MAPK': {
    full: 'MAPK / ERK Signalling',
    summary: 'Mitogenic signalling cascade downstream of receptor tyrosine kinases (e.g. EGFR, RAS). Frequently mutated in lung, colorectal, and melanoma.',
  },
  'APOPTOSIS': {
    full: 'Apoptosis Pathway',
    summary: 'Programmed cell death. Defects allow cancer cells to evade cytotoxic drugs; activation increases drug sensitivity.',
  },
  'CELL_CYCLE': {
    full: 'Cell Cycle Regulation',
    summary: 'Controls progression through G1/S and G2/M checkpoints. Dysregulation allows unlimited proliferation.',
  },
  'TP53': {
    full: 'TP53 / p53 Tumour Suppressor',
    summary: 'The guardian of the genome. Mutant TP53 impairs apoptosis and DNA damage responses, often correlating with drug resistance.',
  },
  'BRCA': {
    full: 'BRCA1/2 DNA Repair',
    summary: 'Homologous recombination repair genes. Loss creates synthetic lethality with PARP inhibitors.',
  },
  'EGFR': {
    full: 'EGFR Receptor Signalling',
    summary: 'Epidermal growth factor receptor. Mutations or amplifications drive oncogenesis; targeted by erlotinib, gefitinib, etc.',
  },
  'WNT': {
    full: 'WNT / β-Catenin Pathway',
    summary: 'Developmental signalling pathway; dysregulation promotes cancer stem cell maintenance and metastasis.',
  },
  'NOTCH': {
    full: 'NOTCH Signalling',
    summary: 'Controls cell fate decisions; often dysregulated in haematological malignancies.',
  },
  'VEGF': {
    full: 'VEGF Angiogenesis',
    summary: 'Promotes new blood vessel formation, enabling tumour growth beyond diffusion limits.',
  },
  'JAK': {
    full: 'JAK–STAT Signalling',
    summary: 'Mediates cytokine and growth factor responses; frequently activated in blood cancers.',
  },
  'PARP': {
    full: 'PARP-mediated DNA Repair',
    summary: 'Base excision repair enzyme; inhibited by PARP inhibitors for synthetic lethality in BRCA-deficient tumours.',
  },
  'ATM': {
    full: 'ATM / DNA Damage Response',
    summary: 'Key sensor of double-strand breaks; activates p53 and cell cycle checkpoints.',
  },
  'CDK': {
    full: 'Cyclin-Dependent Kinase Activity',
    summary: 'Drives G1→S and G2→M cell-cycle transitions; targeted by CDK4/6 inhibitors in breast cancer.',
  },
  'MYC': {
    full: 'MYC Transcription Factor',
    summary: 'Master regulator of cell growth; amplified or over-expressed in many aggressive tumours.',
  },
  'RAS': {
    full: 'RAS Oncogene Signalling',
    summary: 'Upstream activator of MAPK and PI3K pathways; mutated in ~30% of human cancers.',
  },
};

/**
 * Returns a human-readable annotation for a feature name, or null.
 * @param {string} featureName
 * @returns {{ full: string, summary: string } | null}
 */
export function getPathwayAnnotation(featureName) {
  if (!featureName) return null;
  const upper = featureName.toUpperCase();
  for (const [key, val] of Object.entries(PATHWAY_ANNOTATIONS)) {
    if (upper.includes(key)) return val;
  }
  return null;
}

export const GLOSSARY_TERMS = [
  {
    category: 'Pharmacology',
    term: 'IC50',
    definition: 'The concentration of a drug required to inhibit a biological response by 50%. Lower IC50 = higher cell sensitivity; higher IC50 = lower sensitivity (resistance).',
  },
  {
    category: 'Pharmacology',
    term: 'Log-IC50',
    definition: 'IC50 expressed on a base-10 logarithmic scale. This normalises the wide range of drug concentrations. The PathDSP model predicts log-IC50 directly.',
  },
  {
    category: 'Pharmacology',
    term: 'Sensitive',
    definition: 'Cells whose predicted IC50 falls in the bottom quartile (Q25) of all responses to that drug. The cancer is likely responsive at clinically relevant concentrations.',
  },
  {
    category: 'Pharmacology',
    term: 'Resistant',
    definition: 'Cells whose predicted IC50 falls above the top quartile (Q75). The cancer requires very high drug concentrations for 50% inhibition, suggesting poor response.',
  },
  {
    category: 'Deep Learning',
    term: 'FNN',
    definition: 'Feedforward Neural Network. The PathDSP model architecture — a stack of fully connected layers with dropout regularisation trained on GDSC data.',
  },
  {
    category: 'Deep Learning',
    term: 'MC-Dropout',
    definition: 'Monte-Carlo Dropout. Dropout is left active during inference; running 30 forward passes produces a distribution of predictions from which mean and standard deviation (uncertainty) are calculated.',
  },
  {
    category: 'Deep Learning',
    term: '95% Confidence Interval',
    definition: 'The range [μ − 1.96σ, μ + 1.96σ] derived from the MC-Dropout distribution. With high probability (95%) the true prediction lies within this interval.',
  },
  {
    category: 'Explainability',
    term: 'SHAP',
    definition: 'SHapley Additive exPlanations. A game-theory-based method that attributes the prediction of each sample to its individual input features, satisfying efficiency, symmetry, and linearity axioms.',
  },
  {
    category: 'Explainability',
    term: 'Base Value E[f(x)]',
    definition: 'The average model output over the SHAP background dataset. This is the starting point of the waterfall chart; individual feature contributions are added on top of it.',
  },
  {
    category: 'Explainability',
    term: 'SHAP Waterfall',
    definition: 'A chart showing cumulative feature contributions from the base value to the final prediction. Each bar extends the running total by one feature\'s SHAP value.',
  },
  {
    category: 'Genomics',
    term: 'ssGSEA',
    definition: 'Single-sample Gene Set Enrichment Analysis. Computes per-sample pathway enrichment scores by ranking all genes and projecting them onto a gene set. PathDSP uses ssGSEA EXP scores as features.',
  },
  {
    category: 'Genomics',
    term: 'CNV',
    definition: 'Copy Number Variation. Genomic regions where the number of gene copies differs from the diploid norm (2 copies). Amplifications and deletions are captured as CNV features.',
  },
  {
    category: 'Genomics',
    term: 'Mutation (MUT)',
    definition: 'A binary indicator of whether a somatic point mutation exists in a specific gene for a given cell line, based on GDSC / COSMIC data.',
  },
  {
    category: 'Genomics',
    term: 'Drug Target Proximity',
    definition: 'Graph-based scores quantifying how close each gene (pathway) is to the drug\'s known molecular targets in the protein–protein interaction network.',
  },
  {
    category: 'Dataset',
    term: 'GDSC',
    definition: 'Genomics of Drug Sensitivity in Cancer. A large-scale pharmacogenomics database providing IC50 measurements for hundreds of drugs across hundreds of cancer cell lines.',
  },
  {
    category: 'Dataset',
    term: 'Cell Line',
    definition: 'An in-vitro cancer cell population propagated indefinitely. GDSC covers >1,000 human cancer cell lines from 30+ tissue types.',
  },
];

