const PALETTE = ['#2f7f9e', '#4c9f70', '#d99a3d', '#c25b5b', '#7a8fa6', '#8b6fb0'];

export function BarChart({ data, ariaLabel = 'Biểu đồ cột', horizontal = false }) {
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1);

  if (horizontal) {
    return (
      <div className="dash-hbar-chart" role="img" aria-label={ariaLabel}>
        {data.map((item) => {
          const width = item.value ? Math.max((Number(item.value) / max) * 100, 3) : 0;
          return (
            <div className="dash-hbar-row" key={item.label}>
              <span className="dash-hbar-label">{item.label}</span>
              <div className="dash-hbar-track">
                <div
                  className={`dash-hbar-fill ${item.tone || 'info'}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <strong className="dash-hbar-value">{item.displayValue ?? item.value}</strong>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="dash-bar-chart" role="img" aria-label={ariaLabel}>
      {data.map((item) => {
        const height = item.value ? Math.max((Number(item.value) / max) * 100, 5) : 0;
        return (
          <div className="dash-bar-col" key={item.label}>
            <span className="dash-bar-value">{item.displayValue ?? item.value}</span>
            <div className="dash-bar-track">
              <div
                className={`dash-bar-fill ${item.tone || 'info'}`}
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="dash-bar-label">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function LineChart({ data, ariaLabel = 'Biểu đồ đường' }) {
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  const xFor = (index) => (data.length === 1 ? 50 : 8 + (index / (data.length - 1)) * 84);
  const yFor = (value) => 84 - ((Number(value) || 0) / max) * 62;
  const points = data.map((item, index) => ({
    ...item,
    x: xFor(index),
    y: yFor(item.value),
  }));
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = `${points[0]?.x ?? 0},84 ${linePoints} ${points[points.length - 1]?.x ?? 100},84`;

  return (
    <div className="dash-line-chart" role="img" aria-label={ariaLabel}>
      <div className="dash-line-plot">
        <div className="dash-line-grid" aria-hidden="true">
          {[22, 42, 62, 82].map((top) => (
            <span key={top} style={{ top: `${top}%` }} />
          ))}
        </div>
        <svg
          aria-hidden="true"
          className="dash-line-svg"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <polygon className="dash-line-area" points={areaPoints} />
          <polyline
            className="dash-line-path"
            points={linePoints}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {points.map((point) => (
          <div
            className="dash-line-point"
            key={point.label}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            <span className="dash-line-value">{point.displayValue ?? point.value}</span>
            <span className={`dash-line-dot${point.tone ? ` ${point.tone}` : ''}`} />
          </div>
        ))}
      </div>
      <div className="dash-line-labels" aria-hidden="true">
        {points.map((point) => (
          <span key={point.label} style={{ left: `${point.x}%` }}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ data, totalLabel = 'đơn', totalDisplay, ariaLabel = 'Biểu đồ tròn' }) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  let cursor = 0;
  const segments = data.map((item, index) => {
    const start = cursor;
    const size = total ? (Number(item.value) / total) * 100 : 0;
    cursor += size;
    return `${item.color || PALETTE[index % PALETTE.length]} ${start}% ${cursor}%`;
  });
  const background = total
    ? `conic-gradient(${segments.join(', ')})`
    : 'conic-gradient(#eef3f6 0% 100%)';

  return (
    <div className="dash-donut-wrap">
      <div className="dash-donut" style={{ background }} role="img" aria-label={ariaLabel}>
        <div className="dash-donut-center">
          <strong>{totalDisplay ?? total}</strong>
          <span>{totalLabel}</span>
        </div>
      </div>
      <ul className="dash-donut-legend">
        {data.map((item, index) => (
          <li key={item.label}>
            <span
              className="dash-legend-dot"
              style={{ background: item.color || PALETTE[index % PALETTE.length] }}
            />
            <span>{item.label}</span>
            <strong>{item.displayValue ?? item.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProgressBar({ value, max = 100, label, tone = 'info' }) {
  const percent = Math.min(100, Math.round((Number(value) / (Number(max) || 1)) * 100));

  return (
    <div className="dash-progress">
      <div className="dash-progress-track">
        <div className={`dash-progress-fill ${tone}`} style={{ width: `${percent}%` }} />
      </div>
      {label && <span className="dash-progress-label">{label}</span>}
    </div>
  );
}
