import { Link } from 'react-router-dom';
import { getRoleDashboardPath } from '../../app/role-routing.js';
import '../../styles/auth-status.css';

export function AccessDeniedState({
  user,
  userRole = 'Người dùng',
  allowedRoles = [],
  targetPath = '',
  onLogout,
}) {
  const displayName = user?.full_name || user?.name || user?.email || 'Người dùng';
  const email = user?.email || '';
  const myDashboardPath = getRoleDashboardPath(user) || '/';

  const roleTextMap = {
    customer: 'Khách hàng',
    sales: 'Nhân viên Kinh doanh (Sales)',
    admin: 'Quản trị viên (Admin)',
    accountant: 'Kế toán (Accountant)',
    warehouse: 'Thủ kho / Giao nhận (Warehouse)',
    reviewer: 'Trưởng phòng kỹ thuật / Thẩm định',
    headoftech: 'Trưởng phòng kỹ thuật / Thẩm định',
    technician: 'Kỹ thuật viên đo lường',
  };

  const formattedAllowedRoles = allowedRoles
    .map((r) => roleTextMap[r.toLowerCase()] || r)
    .join(', ');

  return (
    <div className="auth-state-container" role="alert" aria-live="polite">
      <div className="auth-state-card">
        <div className="auth-state-icon-wrapper auth-state-icon-wrapper--denied" aria-hidden="true">
          🚫
        </div>

        <span className="auth-state-badge auth-state-badge--danger">
          403 · Không có quyền truy cập
        </span>

        <h1 className="auth-state-title">Truy cập bị từ chối</h1>

        <p className="auth-state-desc">
          Tài khoản của bạn không được phân quyền để truy cập vào trang hoặc chức năng này.
          Vui lòng kiểm tra lại quyền hạn hoặc liên hệ Quản trị viên nếu đây là sự nhầm lẫn.
        </p>

        <div className="auth-state-meta">
          <div className="auth-state-meta-row">
            <span>Tài khoản hiện tại:</span>
            <strong>{displayName} {email ? `(${email})` : ''}</strong>
          </div>
          <div className="auth-state-meta-row">
            <span>Vai trò (Role) của bạn:</span>
            <span style={{ color: '#cf1322', fontWeight: 600 }}>{userRole}</span>
          </div>
          {formattedAllowedRoles && (
            <div className="auth-state-meta-row">
              <span>Yêu cầu vai trò:</span>
              <span style={{ color: '#096dd9', fontWeight: 600 }}>{formattedAllowedRoles}</span>
            </div>
          )}
          {targetPath && (
            <div className="auth-state-meta-row">
              <span>Đường dẫn yêu cầu:</span>
              <span>{targetPath}</span>
            </div>
          )}
        </div>

        <div className="auth-state-actions">
          <Link className="auth-state-btn auth-state-btn--primary" to={myDashboardPath}>
            ➔ Về trang làm việc của bạn ({userRole})
          </Link>

          {onLogout && (
            <button
              className="auth-state-btn auth-state-btn--secondary"
              onClick={onLogout}
              type="button"
            >
              Đăng xuất &amp; Đổi tài khoản khác
            </button>
          )}

          <Link className="auth-state-btn auth-state-btn--outline" to="/">
            ← Quay về trang chủ ISOCAL
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AccessDeniedState;

