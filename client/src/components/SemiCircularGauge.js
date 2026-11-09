import React, { useEffect, useRef } from 'react';

/**
 * Semi-circular drug response gauge.
 * Props:
 *   value       – log-IC50 mean (number | null)
 *   thresholds  – { q25, q75 } from backend (or null)
 *   label       – sensitivity label string
 *   loading     – boolean
 */
export default function SemiCircularGauge({ value, thresholds, label, loading }) {
  const needleRef = useRef(null);

  // Gauge numeric range (extend beyond Q25/Q75 so the arc shows full context)
  const minV = thresholds ? Math.floor(thresholds.q25 - 1) : -2;
  const maxV = thresholds ? Math.ceil(thresholds.q75 + 1)  :  3;
  const q25  = thresholds ? thresholds.q25 : (minV + (maxV - minV) / 3);
  const q75  = thresholds ? thresholds.q75 : (minV + (maxV - minV) * 2 / 3);

  const toAngle = (v) => {
    const pct = Math.max(0, Math.min(1, (v - minV) / (maxV - minV)));
    return -90 + pct * 180; // −90° = far left, +90° = far right
  };

  useEffect(() => {
    if (!needleRef.current) return;
    if (value == null) {
      needleRef.current.style.transform = 'rotate(-90deg)';
      return;
    }
    const angle = toAngle(value);
    needleRef.current.style.transform = `rotate(${angle}deg)`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, thresholds]);

  // Center (140, 135), Radius 105
  const CX = 140, CY = 135, R = 105;
  const polar = (t) => [
    CX - R * Math.cos(Math.PI * t),
    CY - R * Math.sin(Math.PI * t),
  ];
  const arcPath = (t1, t2) => {
    const [ax, ay] = polar(t1);
    const [bx, by] = polar(t2);
    return `M${ax.toFixed(1)} ${ay.toFixed(1)} A${R} ${R} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}`;
  };

  // Map Q25/Q75 to arc fractions (0 = left, 1 = right)
  const sensEnd = Math.max(0.05, Math.min(0.9, (q25 - minV) / (maxV - minV)));
  const intEnd  = Math.max(sensEnd + 0.05, Math.min(0.95, (q75 - minV) / (maxV - minV)));

  const labelColor =
    label === 'Sensitive'    ? 'var(--green)'  :
    label === 'Resistant'    ? 'var(--red)'    :
    label === 'Intermediate' ? 'var(--yellow)' : 'var(--muted)';

  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 280 165" className="gauge-svg">
        {/* Color Arcs with rounded styling */}
        <path d={arcPath(0, sensEnd)} stroke="var(--green)"  strokeWidth="22" fill="none" strokeLinecap="round" />
        <path d={arcPath(sensEnd, intEnd)} stroke="var(--yellow)" strokeWidth="22" fill="none" strokeLinecap="butt" />
        <path d={arcPath(intEnd, 1)}  stroke="var(--red)"    strokeWidth="22" fill="none" strokeLinecap="round" />

        {/* Major Tick Marks & Labels */}
        {[
          [0, minV.toFixed(1)],
          [sensEnd, q25.toFixed(1)],
          [intEnd, q75.toFixed(1)],
          [1, maxV.toFixed(1)]
        ].map(([t, lbl], idx) => {
          const [tx, ty] = polar(t);
          const nx = CX + (tx - CX) * 1.25;
          const ny = CY + (ty - CY) * 1.25;
          return (
            <text
              key={idx}
              x={nx}
              y={ny + 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="var(--muted)"
            >
              {lbl}
            </text>
          );
        })}

        <text x={CX} y={160} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--muted)" letterSpacing="0.05em">
          LOG-IC50 SCALE
        </text>

        {/* Animated Needle */}
        <g
          ref={needleRef}
          style={{
            transformOrigin: `${CX}px ${CY}px`,
            transform: 'rotate(-90deg)',
            transition: loading ? 'none' : 'transform 1.4s cubic-bezier(.3,1.5,.5,1)',
          }}
        >
          <polygon points={`${CX - 5},${CY} ${CX + 5},${CY} ${CX},${CY - 96}`} fill="var(--text)" />
        </g>
        <circle cx={CX} cy={CY} r="10"   fill="var(--text)" />
        <circle cx={CX} cy={CY} r="4"    fill="var(--bg)"   />
      </svg>

      {/* Main Result Display - Placed clearly below the gauge */}
      <div className="gval" style={{ marginTop: '16px', textAlign: 'center' }}>
        {loading ? (
          <span className="shimmer" style={{ width: 140, height: 44, display: 'inline-block', borderRadius: 10 }} />
        ) : value != null ? (
          <>
            <strong style={{ fontSize: '46px', fontWeight: '800', color: labelColor, display: 'block', lineHeight: 1.1 }}>
              {value.toFixed(3)}
            </strong>
            <small style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px', display: 'block', fontWeight: '600', letterSpacing: '0.04em' }}>
              PREDICTED LOG-IC50
            </small>
          </>
        ) : (
          <strong style={{ fontSize: '36px', color: 'var(--muted)' }}>—</strong>
        )}
      </div>

      {/* Sensitivity Status Banner */}
      <div style={{ marginTop: '10px', textAlign: 'center' }}>
        {label ? (
          <span
            className={`badge ${label === 'Sensitive' ? 'b-green' : label === 'Resistant' ? 'b-red' : 'b-yellow'}`}
            style={{ fontSize: '12px', padding: '6px 16px', letterSpacing: '0.04em' }}
          >
            ● {label.toUpperCase()} RESPONSE
          </span>
        ) : (
          <span className="hint" style={{ fontSize: '12px' }}>
            Choose inputs and run analysis to calculate drug sensitivity.
          </span>
        )}
      </div>

      {/* Spacious Legend */}
      <div className="gauge-legend" style={{ marginTop: '18px', gap: '20px' }}>
        <span>
          <i style={{ background: 'var(--green)' }} />
          Sensitive (Q₂₅ = {thresholds ? thresholds.q25.toFixed(2) : '—'})
        </span>
        <span>
          <i style={{ background: 'var(--yellow)' }} />
          Intermediate
        </span>
        <span>
          <i style={{ background: 'var(--red)' }} />
          Resistant (Q₇₅ = {thresholds ? thresholds.q75.toFixed(2) : '—'})
        </span>
      </div>
    </div>
  );
}
