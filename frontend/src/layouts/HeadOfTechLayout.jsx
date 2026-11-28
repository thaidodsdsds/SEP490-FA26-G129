import { useAppContext } from '../app/providers.jsx';
import { getUserInitials } from '../app/role-routing.js';
import RoleDashboardLayout from './RoleDashboardLayout.jsx';

// Menu 2 cấp: chỉ mở nhóm mới thấy mục con (tránh sidebar quá dài với 15 mục)
const links = [
  {
    id: 'dispatch',
    icon: '🧭',
    label: 'Điều phối',
    children: [
      { to: '/internal/head-of-tech', label: 'Dashboard Reviewer' },
      { to: '/internal/head-of-tech/work-orders', label: 'Work Order' },
      { to: '/internal/head-of-tech/assignments', label: 'Phân công thiết bị' },
    ],
  },
  {
    id: 'catalog',
    icon: '🗂️',
    label: 'Danh mục & quy trình',
    children: [
      { to: '/internal/head-of-tech/service-types', label: 'Danh mục dịch vụ' },
      { to: '/internal/head-of-tech/procedures', label: 'Quy trình kỹ thuật' },
      { to: '/internal/head-of-tech/standards', label: 'Chuẩn đối chứng' },
      { to: '/internal/head-of-tech/drift', label: 'Lịch sử & độ trôi' },
    ],
  },
  {
    id: 'certification',
    icon: '🏅',
    label: 'Chứng nhận & ký số',
    children: [
      { to: '/internal/head-of-tech/review-queue', label: 'Hàng chờ soát xét' },
      { to: '/internal/head-of-tech/certificates', label: 'Chứng chỉ' },
      { to: '/internal/head-of-tech/seals', label: 'Tem & thu hồi' },
    ],
  },
  {
    id: 'workspace',
    icon: '💬',
    label: 'Liên lạc & kho',
    children: [
      { to: '/internal/head-of-tech/warehouse/inbound', label: 'Phiếu nhập kho (Inbound)' },
      { to: '/internal/head-of-tech/warehouse/outbound', label: 'Phiếu xuất kho (Outbound)' },
      { to: '/internal/head-of-tech/warehouse', label: 'Lịch sử kho' },
      { to: '/internal/head-of-tech/chat', label: 'Trao đổi kỹ thuật' },
      { to: '/internal/head-of-tech/notifications', label: 'Thông báo' },
    ],
  },
];

function HeadOfTechLayout() {
  const { session } = useAppContext();
  const userName = session?.user?.full_name || 'Nguyễn Thu Hương';

  return (
    <RoleDashboardLayout
      initials={getUserInitials(userName)}
      links={links}
      name={userName}
      profilePath="/internal/head-of-tech/profile"
      role="Reviewer · Head of Tech"
    />
  );
}

export default HeadOfTechLayout;
