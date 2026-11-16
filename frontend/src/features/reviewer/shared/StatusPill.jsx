const tone = (status) => {
  const normalized = String(status).toLowerCase();
  if (['active', 'released', 'signed', 'valid', 'approve', 'đạt', 'inbound', 'approved'].includes(normalized)) return 'good';
  if (['pending', 'draft', 'pendingpayment', 'pendingapproval', 'unpaid', 'đang xử lý'].includes(normalized)) return 'waiting';
  if (['expired', 'revoked', 'failed', 'rejected', 'không đạt'].includes(normalized)) return 'bad';
  if (['obsolete', 'inactive'].includes(normalized)) return 'quiet';
  return 'neutral';
};

function StatusPill({ children }) {
  return <span className={`reviewer-status ${tone(children)}`}>{children}</span>;
}

export default StatusPill;
