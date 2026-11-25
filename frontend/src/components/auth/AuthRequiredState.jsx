import { Link } from 'react-router-dom';
import '../../styles/auth-status.css';

export function AuthRequiredState({ targetPath = '', portalHint = 'auto' }) {
  const isCustomerPath = portalHint === 'customer' || targetPath.includes('/internal/customer');
  const encodedRedirect = encodeURIComponent(targetPath || window.location.pathname);

  const customerLoginUrl = `/login?redirect=${encodedRedirect}&reason=unauthenticated`;
  const staffLoginUrl = `/staff-login?redirect=${encodedRedirect}&reason=unauthenticated`;

  return (
    <div className="auth-state-container" role="alert" aria-live="polite">
      <div className="auth-state-card">
        <div className="auth-state-icon-wrapper auth-state-icon-wrapper--lock" aria-hidden="true">
          🔒
        </div>

        <span className="auth-state-badge auth-state-badge--primary">
          Bảo mật hệ thống · Yêu cầu xác thực
        </span>

        <h1 className="auth-state-title">Bạn chưa đăng nhập</h1>

        <p className="auth-state-desc">
          Trang bạn đang truy cập thuộc khu vực làm việc nội bộ của <strong>ISOCAL</strong> và yêu cầu tài khoản đã được xác thực danh tính.
        </p>

        {targetPath && (
          <div className="auth-state-meta">
            <div className="auth-state-meta-row">
              <span>Đường dẫn yêu cầu:</span>
              <strong>{targetPath}</strong>
            </div>
            <div className="auth-state-meta-row">
              <span>Trạng thái:</span>
              <span style={{ color: '#096dd9', fontWeight: 600 }}>Chưa đăng nhập (Unauthenticated)</span>
            </div>
          </div>
        )}

        <div className="auth-state-actions">
          {isCustomerPath ? (
            <>
              <Link className="auth-state-btn auth-state-btn--primary" to={customerLoginUrl}>
                <span>➔</span> Đăng nhập Khách hàng (Customer Login)
              </Link>
              <Link className="auth-state-btn auth-state-btn--secondary" to={staffLoginUrl}>
                Bạn là nhân viên ISOCAL? Đăng nhập cổng Nhân viên
              </Link>
            </>
          ) : (
            <>
              <Link className="auth-state-btn auth-state-btn--primary" to={staffLoginUrl}>
                <span>➔</span> Đăng nhập Nhân viên (Staff Login)
              </Link>
              <Link className="auth-state-btn auth-state-btn--secondary" to={customerLoginUrl}>
                Bạn là khách hàng doanh nghiệp? Đăng nhập cổng Khách hàng
              </Link>
            </>
          )}

          <Link className="auth-state-btn auth-state-btn--outline" to="/">
            ← Quay về trang chủ ISOCAL
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AuthRequiredState;

