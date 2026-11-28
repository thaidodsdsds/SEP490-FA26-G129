import { useAppContext } from '../app/providers.jsx';
import { getUserInitials, isHeadSalesAccount } from '../app/role-routing.js';
import RoleDashboardLayout from './RoleDashboardLayout.jsx';

function SalesLayout() {
  const { session } = useAppContext() || {};
  const user = session?.user;
  const isHeadSales = isHeadSalesAccount(user);

  const navLinks = [
    { to: '/internal/sales', label: 'Tổng quan kinh doanh', icon: '▦' },

    // Nhóm Quản trị & Phê duyệt (chỉ dành cho Trưởng phòng Sales - HeadSales)
    ...(isHeadSales
      ? [
          {
            id: 'sales-admin',
            icon: '👑',
            label: 'Quản trị & Phê duyệt',
            children: [
              { to: '/internal/sales/customer-assignments', label: 'Phân công khách cho Sales' },
              { to: '/internal/sales/quotation-approvals', label: 'Duyệt báo giá (HeadSales)' },
            ],
          },
        ]
      : []),

    // Nhóm Khách hàng & Thiết bị
    {
      id: 'sales-customers',
      icon: '👥',
      label: 'Khách hàng & Thiết bị',
      children: [
        { to: '/internal/sales/customers', label: 'Khách hàng' },
        { to: '/internal/sales/devices', label: 'Thiết bị & Sở hữu' },
      ],
    },

    // Nhóm Yêu cầu & Dịch vụ
    {
      id: 'sales-requests',
      icon: '📋',
      label: 'Yêu cầu & Dịch vụ',
      children: [
        { to: '/internal/sales/service-requests', label: 'Đơn dịch vụ' },
        { to: '/internal/sales/service-requests/new', label: 'Tạo yêu cầu dịch vụ' },
        { to: '/internal/sales/work-orders', label: 'Lệnh thực hiện (Work Orders)' },
      ],
    },

    // Nhóm Báo giá & Hợp đồng
    {
      id: 'sales-commercial',
      icon: '📑',
      label: 'Báo giá & Hợp đồng',
      children: [
        { to: '/internal/sales/quotations', label: 'Lập báo giá (Quotations)' },
        { to: '/internal/sales/contracts', label: 'Hợp đồng' },
      ],
    },
  ];

  return (
    <RoleDashboardLayout
      description={
        isHeadSales
          ? 'Không gian làm việc Trưởng phòng Kinh doanh: điều phối khách hàng, phê duyệt báo giá và giám sát tiến độ.'
          : 'Không gian làm việc Nhân viên Kinh doanh: quản lý khách hàng, tiếp nhận yêu cầu, tạo báo giá và theo dõi hợp đồng.'
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
