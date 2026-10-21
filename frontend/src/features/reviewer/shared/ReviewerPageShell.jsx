function ReviewerPageShell({
  title,
  description,
  children,
  feedback,
  onFeedbackDismiss,
  query,
  onSearchChange,
  hideSearch = false,
}) {
  return (
    <div className="reviewer-page">
      <header className="reviewer-page-heading">
        <div>
          <p className="eyebrow">REVIEWER WORKSPACE</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <span className="demo-pill"><span /> Dữ liệu minh họa</span>
      </header>
      {feedback && (
        <div className="reviewer-feedback" role="status">
          <span aria-hidden="true">✓</span>{feedback}
          <button aria-label="Đóng thông báo" onClick={onFeedbackDismiss} type="button">×</button>
        </div>
      )}
      {!hideSearch && (
        <label className="search-field reviewer-search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Tìm trong màn hình hiện tại"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo mã, thiết bị, khách hàng..."
            value={query}
          />
        </label>
      )}
      {children}
    </div>
  );
}

export default ReviewerPageShell;
