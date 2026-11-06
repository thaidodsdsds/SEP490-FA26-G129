import { AnimatePresence, motion } from 'motion/react';

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
  const message = typeof feedback === 'string' ? feedback : feedback?.message;
  const tone = typeof feedback === 'string' ? 'success' : feedback?.tone || 'success';
  const isError = tone === 'error';

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
      <AnimatePresence initial={false}>
        {message && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={`reviewer-feedback ${tone}`}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.14 } }}
            initial={{ opacity: 0, y: -6 }}
            key={`${tone}-${message}`}
            role={isError ? 'alert' : 'status'}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <span aria-hidden="true">{isError ? '!' : '✓'}</span>{message}
            <button aria-label="Đóng thông báo" onClick={onFeedbackDismiss} type="button">×</button>
          </motion.div>
        )}
      </AnimatePresence>
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
