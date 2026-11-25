import { Link } from 'react-router-dom';
import '../../styles/auth-status.css';

export function AuthRequiredState({ targetPath = '' }) {
  const encodedRedirect = encodeURIComponent(targetPath || window.location.pathname);
  const loginUrl = `/login?redirect=${encodedRedirect}&reason=unauthenticated`;

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
          Trang bạn đang truy cập thuộc khu vực làm việc của <strong>ISOCAL</strong> và yêu cầu tài khoản đã được xác thực danh tính.
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
          <Link className="auth-state-btn auth-state-btn--primary" to={loginUrl}>
            <span>➔</span> Đến trang Đăng nhập
          </Link>

          <Link className="auth-state-btn auth-state-btn--outline" to="/">
            ← Quay về trang chủ ISOCAL
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AuthRequiredState;

