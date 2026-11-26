import { useAppContext } from '../app/providers.jsx';
import { getUserInitials, isHeadOfWarehouseAccount } from '../app/role-routing.js';
import HeadOfTechLayout from './HeadOfTechLayout.jsx';
import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/warehouse', label: 'Tổng quan kho', icon: '▦' },
  { to: '/internal/warehouse/devices', label: 'Quản lý thiết bị', icon: '◫' },
  { to: '/internal/warehouse/inbound', label: 'Phiếu nhập kho (Inbound)', icon: '↓' },
  { to: '/internal/warehouse/outbound', label: 'Phiếu xuất kho (Outbound)', icon: '↑' },
  { to: '/internal/warehouse/transactions', label: 'Lịch sử phiếu kho', icon: '≡' },
  { to: '/internal/warehouse/chat', label: 'Trao đổi kỹ thuật', icon: '💬' },
  { to: '/internal/warehouse/notifications', label: 'Thông báo', icon: '🔔' },
];

function WarehouseLayout() {
  const { session } = useAppContext();
  const rawRole = (session?.user?.role?.name || session?.user?.role || '').toLowerCase();
  const isReviewer = ['reviewer', 'headtechnician', 'head of tech', 'headoftech'].includes(rawRole);

  if (isReviewer) {
    return <HeadOfTechLayout />;
  }

  const isHeadOfWarehouse = isHeadOfWarehouseAccount(session?.user);
  const roleDisplay = isHeadOfWarehouse ? 'Trưởng phòng kho · Head of Warehouse' : 'Kho vận · Warehouse';
  const descriptionDisplay = isHeadOfWarehouse
    ? 'Trưởng phòng Kho vận: Quản lý, điều phối kho In-lab, giám sát quy trình tiếp nhận và xuất trả bàn giao theo ISO/IEC 17025.'
    : 'Tiếp nhận thiết bị In-lab, kiểm tra tình trạng vật lý ban đầu và xuất trả bàn giao.';

  const userName = session?.user?.full_name || (isHeadOfWarehouse ? 'Trần Văn Khoa (Head of Warehouse)' : 'Nguyễn Văn Kho');

  return (
    <RoleDashboardLayout
      description={descriptionDisplay}
      initials={getUserInitials({ full_name: userName }, isHeadOfWarehouse ? 'HW' : 'WH')}
      links={links}
      name={userName}
      profilePath="/internal/warehouse/profile"
      role={roleDisplay}
    />
  );
}

export default WarehouseLayout;
