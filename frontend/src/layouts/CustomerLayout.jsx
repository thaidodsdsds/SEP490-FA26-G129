import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/customer', label: 'Tổng quan', icon: '▦' },
  { to: '/internal/customer/devices', label: 'Thiết bị', icon: '▤', soon: true },
  { to: '/internal/customer/service-requests', label: 'Đơn dịch vụ', icon: '⌁', soon: true },
  { to: '/internal/customer/certificates', label: 'Chứng nhận & tem', icon: '✓', soon: true },
  { to: '/internal/customer/invoices', label: 'Công nợ', icon: '₫', soon: true },
];

function CustomerLayout() {
  return (
    <RoleDashboardLayout
      description="Theo dõi thiết bị, đơn dịch vụ, chứng nhận và công nợ của công ty."
      initials="KH"
      links={links}
      name="Khách hàng"
      profilePath="/internal/customer/profile"
      role="Customer"
    />
  );
}

export default CustomerLayout;
