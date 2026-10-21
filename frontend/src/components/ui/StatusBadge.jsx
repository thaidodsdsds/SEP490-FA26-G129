const TONES = new Set(['success', 'warning', 'danger', 'info', 'neutral']);

function StatusBadge({ tone = 'neutral', children }) {
  return (
    <span className={`dash-badge ${TONES.has(tone) ? tone : 'neutral'}`}>
      {children}
    </span>
  );
}

export default StatusBadge;
