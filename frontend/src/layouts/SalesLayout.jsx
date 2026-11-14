import { useAppContext } from '../app/providers.jsx';
import { getUserInitials, isHeadSalesAccount } from '../app/role-routing.js';
import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const baseLinks = [
  { to: '/internal/sales', label: 'Tổng quan kinh doanh', icon: '▦' },
  { to: '/internal/sales/customers', label: 'Khách hàng', icon: '◎' },
  { to: '/internal/sales/service-requests', label: 'Đơn dịch vụ', icon: '⌁' },
  { to: '/internal/sales/service-requests/new', label: 'Tạo yêu cầu dịch vụ', icon: '＋' },
  { to: '/internal/sales/quotations', label: 'Lập báo giá (Quotations)', icon: '₫' },
  { to: '/internal/sales/contracts', label: 'Hợp đồng', icon: '▤' },
  { to: '/internal/sales/work-orders', label: 'Lệnh thực hiện (Work Orders)', icon: '📋' },
  { to: '/internal/sales/devices', label: 'Thiết bị & Sở hữu', icon: '◫' },
];

const headSalesLinks = [
  { to: '/internal/sales/customer-assignments', label: 'Phân công khách cho Sales', icon: '👥' },
  { to: '/internal/sales/quotation-approvals', label: 'Duyệt báo giá (HeadSales)', icon: '✓' },
];

function SalesLayout() {
  const { session } = useAppContext() || {};
  const user = session?.user;
  const isHeadSales = isHeadSalesAccount(user);

  const navLinks = isHeadSales
    ? [
        baseLinks[0],
        ...headSalesLinks,
        ...baseLinks.slice(1),
      ]
    : baseLinks;

  return (
    <RoleDashboardLayout
      description={
        isHeadSales
          ? 'Trưởng phòng Kinh doanh (HeadSales): Phân công khách hàng cho nhân viên Sales và xét duyệt báo giá trước khi gửi khách hàng.'
          : 'Quản lý khách hàng được phân công, tạo yêu cầu dịch vụ và lập báo giá trình Trưởng phòng Kinh doanh phê duyệt.'
      }
      initials={getUserInitials(user, isHeadSales ? 'HS' : 'SL')}
      links={navLinks}
      name={user?.full_name || (isHeadSales ? 'Lê Hoàng Bách' : 'Nguyễn Văn An')}
      profilePath="/internal/sales/profile"
      role={isHeadSales ? 'Trưởng phòng KD · HeadSales' : 'Nhân viên KD · Sales'}
    />
  );
}

export default SalesLayout;
