import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/admin', label: 'Tổng quan', icon: '▦' },
  {
    id: 'admin-users',
    icon: '👥',
    label: 'Người dùng & Quyền',
    children: [
      { to: '/internal/admin/accounts', label: 'Tài khoản' },
      { to: '/internal/admin/roles', label: 'Vai trò & quyền' },
    ],
  },
  {
    id: 'admin-records',
    icon: '📑',
    label: 'Hồ sơ & Dịch vụ',
    children: [
      { to: '/internal/admin/contracts', label: 'Hợp đồng' },
      { to: '/internal/admin/certificates', label: 'Chứng nhận' },
      { to: '/internal/admin/seals', label: 'Tem & thu hồi' },
      { to: '/internal/admin/service-types', label: 'Danh mục dịch vụ', soon: true },
    ],
  },
  {
    id: 'admin-system',
    icon: '⚙️',
    label: 'Hệ thống & Cấu hình',
    children: [
      { to: '/internal/admin/audit-log', label: 'Nhật ký hệ thống', soon: true },
      { to: '/internal/admin/settings', label: 'Cấu hình', soon: true },
    ],
  },
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
