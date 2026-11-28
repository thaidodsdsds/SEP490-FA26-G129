import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/customer', label: 'Tổng quan', icon: '▦' },
  {
    id: 'customer-devices-requests',
    icon: '⚙️',
    label: 'Thiết bị & Yêu cầu',
    children: [
      { to: '/internal/customer/devices', label: 'Hồ sơ thiết bị' },
      { to: '/internal/customer/service-requests/new', label: 'Tạo yêu cầu dịch vụ' },
      { to: '/internal/customer/service-requests', label: 'Đơn dịch vụ đã gửi' },
    ],
  },
  {
    id: 'customer-records',
    icon: '📜',
    label: 'Hồ sơ & Chứng nhận',
    children: [
      { to: '/internal/customer/contracts', label: 'Hợp đồng' },
      { to: '/internal/customer/certificates', label: 'Chứng nhận' },
      { to: '/internal/customer/seals', label: 'Tem hiệu chuẩn' },
    ],
  },
  {
    id: 'customer-finance',
    icon: '💰',
    label: 'Tài chính & Thanh toán',
    children: [
      { to: '/internal/customer/invoices', label: 'Công nợ', soon: true },
    ],
  },
];

function CustomerLayout() {
  return (
    <RoleDashboardLayout
      description="Theo dõi thiết bị, đăng ký hiệu chuẩn, chứng nhận và công nợ của công ty."
      initials="KH"
      links={links}
      name="Khách hàng"
      profilePath="/internal/customer/profile"
      role="Customer"
    />
  );
}

export default CustomerLayout;
