import { useAppContext } from '../app/providers.jsx';
import { getUserInitials } from '../app/role-routing.js';
import HeadOfTechLayout from './HeadOfTechLayout.jsx';
import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/warehouse', label: 'Tổng quan kho', icon: '▦' },
  {
    id: 'warehouse-ops',
    icon: '📦',
    label: 'Xuất nhập kho',
    children: [
      { to: '/internal/warehouse/inbound', label: 'Phiếu nhập kho (Inbound)' },
      { to: '/internal/warehouse/outbound', label: 'Phiếu xuất kho (Outbound)' },
      { to: '/internal/warehouse/transactions', label: 'Lịch sử phiếu kho' },
    ],
  },
  {
    id: 'warehouse-devices',
    icon: '🏷️',
    label: 'Quản lý thiết bị',
    children: [
      { to: '/internal/warehouse/devices', label: 'Danh sách thiết bị' },
    ],
  },
  {
    id: 'warehouse-comms',
    icon: '💬',
    label: 'Liên lạc & Thông báo',
    children: [
      { to: '/internal/warehouse/chat', label: 'Trao đổi kỹ thuật' },
      { to: '/internal/warehouse/notifications', label: 'Thông báo' },
    ],
  },
];

function WarehouseLayout() {
  const { session } = useAppContext();
  const rawRole = (session?.user?.role?.name || session?.user?.role || '').toLowerCase();
  const isReviewer = ['reviewer', 'headtechnician', 'head of tech', 'headoftech'].includes(rawRole);

  if (isReviewer) {
    return <HeadOfTechLayout />;
  }

  const userName = session?.user?.full_name || 'Trần Văn Khoa';

  return (
    <RoleDashboardLayout
      description="Tiếp nhận thiết bị In-lab, kiểm tra tình trạng vật lý ban đầu và xuất trả bàn giao."
      initials={getUserInitials(userName)}
      links={links}
      name={userName}
      profilePath="/internal/warehouse/profile"
      role="Kho vận · Warehouse"
    />
  );
}

export default WarehouseLayout;
