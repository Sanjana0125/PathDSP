import React, { useState, useEffect, useRef } from 'react';
import './App.css';

import HomeView           from './views/HomeView';
import CommandCenterView  from './views/CommandCenterView';
import PredictionView     from './views/PredictionView';
import RankingView        from './views/RankingView';
import PathwaysView       from './views/PathwaysView';
import ShapView           from './views/ShapView';
import CompareView        from './views/CompareView';
import ExplorerView       from './views/ExplorerView';
import ResultsView        from './views/ResultsView';
import GlossaryView       from './views/GlossaryView';
import { api, loadHistory, appendHistory, clearHistory } from './utils/api';

const NAV_ITEMS = [
  { icon: '⌂',   label: 'Home',              page: 'home'         },
  { icon: '◎',   label: 'Command Center',     page: 'command'      },
  { icon: '💊',  label: 'Drug Sensitivity',   page: 'prediction'   },
  { icon: '🏆',  label: 'Drug Ranking',       page: 'ranking'      },
  { icon: '🕸',  label: 'Pathway Enrichment', page: 'pathways'     },
  { icon: '✧',   label: 'SHAP Explainability',      page: 'explain'    },
  { icon: '⚖️',  label: 'Drug and Cell Comparison',  page: 'compare'    },
  { icon: '🔭',  label: 'Prediction Explorer',       page: 'explorer'   },
  { icon: '▥',   label: 'Results',            page: 'results'      },
  { icon: '📖',  label: 'Model & Glossary',   page: 'glossary'     },
];

export default function App() {
  const [page,     setPage]    = useState('home');
  const [theme,    setTheme]   = useState('dark');
  const [drugs,    setDrugs]   = useState([]);
  const [cells,    setCells]   = useState([]);
  const [stats,    setStats]   = useState(null);
  const [history,  setHistory] = useState(() => loadHistory());
  const [activeSelection, setActiveSelection] = useState(null);
  const mainRef = useRef(null);

  // Apply theme to body
  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Load metadata on mount and poll pipeline health every 30 seconds (reduces CPU usage)
  useEffect(() => {
    api.getDrugs().then(setDrugs).catch(() => {});
    api.getCells().then(setCells).catch(() => {});
    api.getStats().then(setStats).catch(() => {});

    const timer = setInterval(() => {
      api.getStats().then(setStats).catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const navigate = (p) => {
    setPage(p);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPrediction = (drug, cell) => {
    setActiveSelection({ drug, cell });
    setPage('prediction');
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearHistory = () => setHistory(clearHistory());

  // Light mode cursor glow on cards
  useEffect(() => {
    const handler = (e) => {
      if (theme !== 'light') return;
      const el = e.target.closest?.('.card,.panel,.metric,.rank,.node,.rrow');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
      el.style.setProperty('--h', `${Math.round(e.clientX / window.innerWidth * 200 + 270) % 360}`);
    };
    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, [theme]);

  const renderPage = () => {
    switch (page) {
      case 'home':          return <HomeView onNavigate={navigate} />;
      case 'command':       return <CommandCenterView history={history} stats={stats} onNavigate={navigate} onClearHistory={handleClearHistory} onSelectPrediction={handleSelectPrediction} />;
      case 'prediction':    return <PredictionView drugs={drugs} cells={cells} history={history} setHistory={setHistory} initialSelection={activeSelection} />;
      case 'ranking':       return <RankingView drugs={drugs} cells={cells} onSelectPrediction={handleSelectPrediction} />;
      case 'pathways':      return <PathwaysView />;
      case 'explain':       return <ShapView drugs={drugs} cells={cells} initialSelection={activeSelection} />;
      case 'compare':
      case 'compare-cells': return <CompareView drugs={drugs} cells={cells} initialMode={page === 'compare-cells' ? 'cells' : 'drugs'} />;
      case 'explorer':      return <ExplorerView drugs={drugs} cells={cells} onSelectPrediction={handleSelectPrediction} />;
      case 'results':       return <ResultsView history={history} setHistory={setHistory} onNavigate={navigate} onSelectPrediction={handleSelectPrediction} />;
      case 'glossary':      return <GlossaryView />;
      default:              return <HomeView onNavigate={navigate} />;
    }
  };

  return (
    <div className="layout">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="brand">
            <div className="logo">🧬</div>
            <div>
              <b>PathDSP</b>
              <small>Pathways. Predictions. Better Therapies.</small>
            </div>
          </div>

          <div className="nav-label">MAIN MENU</div>
          <nav className="nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.page}
                className={page === item.page ? 'active' : ''}
                onClick={() => navigate(item.page)}
                data-page={item.page}
              >
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-foot">
            ✦ <b>AI for Precision Oncology</b><br />
            Understand how cancer pathways influence drug response.
            {stats && (
              <div style={{ marginTop: 10, fontSize: 10, opacity: 0.75 }}>
                {stats.drugs} drugs · {stats.cells} cell lines<br />
                {stats.pairs?.toLocaleString()} feature pairs loaded
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main ref={mainRef}>
          {/* topbar */}
          <div className="topbar">
            <div className="eyebrow">CANCER RESEARCH • AI PLATFORM</div>
            <div className="actions">
              <span
                className="status"
                style={{
                  color: stats?.python_online ? 'var(--green)' : stats ? 'var(--yellow)' : 'var(--red)',
                  borderColor: stats?.python_online ? '#3ddc9777' : stats ? '#f5c84b77' : '#ff5d7377',
                }}
              >
                {stats?.python_online
                  ? '● AI Service Online'
                  : stats
                  ? '● Node Online (Python Service Offline)'
                  : '● Offline'}
              </span>
              <button
                className="theme"
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? '☀ Light mode' : '🌙 Dark mode'}
              </button>
              <div className="avatar">✦</div>
            </div>
          </div>

          {renderPage()}
        </main>
      </div>
    );
}
