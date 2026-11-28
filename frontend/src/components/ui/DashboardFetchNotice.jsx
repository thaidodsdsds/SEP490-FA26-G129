export default function DashboardFetchNotice({ error, loading, onRetry }) {
  if (!error && !loading) return null;

  return (
    <div
      aria-live="polite"
      className="dash-fetch-notice"
      style={{
        borderRadius: 10,
        marginBottom: 16,
        padding: '12px 16px',
        fontSize: '.82rem',
        background: error ? '#fff3f3' : '#f2f7fb',
        border: `1px solid ${error ? '#f0c9c9' : '#d9e6f0'}`,
        color: error ? '#a84242' : '#4e6c85',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span>{error ? `⚠ ${error}` : 'Đang tải dữ liệu tổng quan…'}</span>
      {error && onRetry ? (
        <button className="dash-btn-xs" onClick={onRetry} type="button">
          Thử lại
        </button>
      ) : null}
    </div>
  );
}
