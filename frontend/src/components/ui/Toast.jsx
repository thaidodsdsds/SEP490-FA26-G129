const ICONS = {
  success: '✓',
  error: '!',
  info: 'i',
};

function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  return (
    <div className={`dash-toast ${toast.tone || 'info'}`} role="status">
      <span aria-hidden="true">{ICONS[toast.tone] || ICONS.info}</span>
      <span>{toast.message}</span>
      <button aria-label="Đóng thông báo" onClick={onDismiss} type="button">×</button>
    </div>
  );
}

export default Toast;
