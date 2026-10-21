function PageHeader({ eyebrow, title, description, meta = [], actions }) {
  return (
    <header className="dash-page-header">
      <div className="dash-page-heading">
        {eyebrow && <p className="dash-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="dash-description">{description}</p>}
        {meta.length > 0 && (
          <div className="dash-header-meta">
            {meta.map((item) => (
              <span className="dash-meta-chip" key={item}>{item}</span>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="dash-header-actions">{actions}</div>}
    </header>
  );
}

export default PageHeader;
