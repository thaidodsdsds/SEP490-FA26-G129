import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/sales', label: 'Tổng quan kinh doanh', icon: '▦' },
  { to: '/internal/sales/customers', label: 'Khách hàng', icon: '◎', soon: true },
  { to: '/internal/sales/service-requests', label: 'Yêu cầu dịch vụ', icon: '▤', soon: true },
  { to: '/internal/sales/quotations', label: 'Báo giá (Quotations)', icon: '₫', soon: true },
  { to: '/internal/sales/contracts', label: 'Hợp đồng cam kết', icon: '⌁', soon: true },
  { to: '/internal/sales/devices', label: 'Thiết bị & Sở hữu', icon: '◫', soon: true },
  { to: '/internal/sales/chat', label: 'Tin nhắn & Trao đổi', icon: '◌', soon: true },
  { to: '/internal', label: 'Khu vực nội bộ', icon: '⌂' },
];

function SalesLayout() {
  return (
    <RoleDashboardLayout
      description="Quản lý quan hệ khách hàng, lập báo giá, soạn hợp đồng và theo dõi dịch vụ."
      initials="SL"
      links={links}
      name="Nguyễn Hoàng Nam"
      role="Kinh doanh · Sales"
    />
  );
}

export default SalesLayout;
