import './service-request-badge.css';

const STATUS_CONFIG = {
  New: {
    label: 'Mới tạo',
    className: 'sr-status-pill sr-status-pill--new',
    icon: '●',
  },
  Quoted: {
    label: 'Đã báo giá',
    className: 'sr-status-pill sr-status-pill--quoted',
    icon: '✦',
  },
  Confirmed: {
    label: 'Đã xác nhận',
    className: 'sr-status-pill sr-status-pill--confirmed',
    icon: '✓',
  },
  InProgress: {
    label: 'Đang thực hiện',
    className: 'sr-status-pill sr-status-pill--progress',
    icon: '⚙',
  },
  Completed: {
    label: 'Hoàn thành',
    className: 'sr-status-pill sr-status-pill--completed',
    icon: '✔',
  },
  Cancelled: {
    label: 'Đã hủy',
    className: 'sr-status-pill sr-status-pill--cancelled',
    icon: '✕',
  },
};

function ServiceRequestStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Không xác định',
    className: 'sr-status-pill sr-status-pill--default',
    icon: '•',
  };

  return (
    <span className={config.className}>
      <span className="sr-status-icon" aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

export default ServiceRequestStatusBadge;

