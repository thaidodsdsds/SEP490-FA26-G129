export const CONTRACT_STATUS_LABELS = {
  Draft: 'Bản nháp',
  PendingApproval: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Signed: 'Đã ký',
  Liquidated: 'Đã thanh lý',
  Cancelled: 'Đã huỷ',
};

export const CONTRACT_STATUS_TONES = {
  Draft: 'warning',
  PendingApproval: 'info',
  Approved: 'success',
  Signed: 'info',
  Liquidated: 'neutral',
  Cancelled: 'danger',
};

export const CONTRACT_STATUS_CLASSES = {
  Draft: 'ct-status--draft',
  PendingApproval: 'ct-status--pending',
  Approved: 'ct-status--approved',
  Signed: 'ct-status--signed',
  Liquidated: 'ct-status--liquidated',
  Cancelled: 'ct-status--cancelled',
};

export const getStatusLabel = (status) => CONTRACT_STATUS_LABELS[status] ?? status ?? '—';

export const getStatusTone = (status) => CONTRACT_STATUS_TONES[status] ?? 'neutral';

export const getStatusClass = (status) => CONTRACT_STATUS_CLASSES[status] ?? 'ct-status--draft';
