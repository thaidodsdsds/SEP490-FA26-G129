function StatCard({ icon, tone = 'info', label, value, hint, hintTone = '' }) {
  return (
    <article className="dash-kpi-card">
      <span className={`dash-kpi-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="dash-kpi-label">{label}</span>
      <strong className="dash-kpi-value">{value}</strong>
      {hint && <span className={`dash-kpi-hint${hintTone ? ` ${hintTone}` : ''}`}>{hint}</span>}
    </article>
  );
}

export default StatCard;
