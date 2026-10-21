function SectionCard({ title, subtitle, action, className = '', children }) {
  const hasHeading = Boolean(title || subtitle || action);

  return (
    <section className={`dash-section-card${className ? ` ${className}` : ''}`}>
      {hasHeading && (
        <div className="dash-section-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action && <div className="dash-section-action">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export default SectionCard;
