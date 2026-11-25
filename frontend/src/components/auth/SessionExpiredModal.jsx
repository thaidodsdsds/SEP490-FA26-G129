import { useEffect } from 'react';
import { isCustomerAccount } from '../../app/role-routing.js';
import '../../styles/auth-status.css';

export function SessionExpiredModal({ isOpen, user, onConfirm }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    // Prevent body scroll when modal is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isCustomer = isCustomerAccount(user);
  const currentPath = window.location.pathname + window.location.search;
  const encodedRedirect = encodeURIComponent(currentPath);

  const handleLoginAgain = () => {
    if (onConfirm) onConfirm();
    const loginTarget = isCustomer
      ? `/login?redirect=${encodedRedirect}&reason=session_expired`
      : `/staff-login?redirect=${encodedRedirect}&reason=session_expired`;
    window.location.href = loginTarget;
  };

  const handleGoHome = () => {
    if (onConfirm) onConfirm();
    window.location.href = '/';
  };

  return (
    <div
      aria-describedby="session-expired-desc"
      aria-labelledby="session-expired-title"
      aria-modal="true"
      className="auth-modal-overlay"
      role="alertdialog"
    >
      <div className="auth-modal-dialog">
        <div className="auth-state-icon-wrapper auth-state-icon-wrapper--expired" aria-hidden="true">
          ⌛
        </div>

        <span className="auth-state-badge auth-state-badge--warning">
          Hết phiên làm việc · Session Expired
        </span>

        <h2 className="auth-state-title" id="session-expired-title">
          Phiên đăng nhập đã hết hạn
        </h2>

        <p className="auth-state-desc" id="session-expired-desc">
          Để đảm bảo tính bảo mật và an toàn dữ liệu, phiên làm việc của bạn đã kết thúc.
          Vui lòng đăng nhập lại để tiếp tục các thao tác đang thực hiện.
        </p>

        <div className="auth-state-actions">
          <button
            className="auth-state-btn auth-state-btn--primary"
            onClick={handleLoginAgain}
            type="button"
          >
            ➔ Đăng nhập lại ngay
          </button>
          <button
            className="auth-state-btn auth-state-btn--outline"
            onClick={handleGoHome}
            type="button"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionExpiredModal;

