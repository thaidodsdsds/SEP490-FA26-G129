import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/admin', label: 'Tổng quan', icon: '▦' },
  { to: '/internal/admin/accounts', label: 'Tài khoản', icon: '◉' },
  { to: '/internal/admin/roles', label: 'Vai trò & quyền', icon: '⌘' },
  { to: '/internal/admin/service-types', label: 'Danh mục dịch vụ', icon: '▤', soon: true },
  { to: '/internal/admin/audit-log', label: 'Nhật ký hệ thống', icon: '≡', soon: true },
  { to: '/internal/admin/settings', label: 'Cấu hình', icon: '⚙', soon: true },
];

function AdminLayout() {
  return (
    <RoleDashboardLayout
      description="Quản lý tài khoản, vai trò, danh mục và cấu hình hệ thống."
      initials="AD"
      links={links}
      name="Quản trị"
      profilePath="/internal/admin/profile"
      role="Admin"
    />
  );
}

export default AdminLayout;
