import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/warehouse', label: 'Tổng quan kho', icon: '▦' },
  { to: '/internal/warehouse/inbound', label: 'Phiếu nhập kho (Inbound)', icon: '↓' },
  { to: '/internal/warehouse/outbound', label: 'Phiếu xuất kho (Outbound)', icon: '↑' },
  { to: '/internal/warehouse/transactions', label: 'Lịch sử phiếu kho', icon: '≡' },
];

function WarehouseLayout() {
  return (
    <RoleDashboardLayout
      description="Tiếp nhận thiết bị In-lab, kiểm tra tình trạng vật lý ban đầu và xuất trả bàn giao."
      initials="WH"
      links={links}
      name="Trần Văn Khoa"
      profilePath="/internal/warehouse/profile"
      role="Kho vận · Warehouse"
    />
  );
}

export default WarehouseLayout;
