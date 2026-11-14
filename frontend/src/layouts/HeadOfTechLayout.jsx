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
      { to: '/internal/head-of-tech/verification-logs', label: 'Lịch sử tra cứu tem' },
      { to: '/internal/head-of-tech/signatures', label: 'Chữ ký số' },
    ],
  },
  {
    id: 'workspace',
    icon: '💬',
    label: 'Liên lạc & kho',
    children: [
      { to: '/internal/head-of-tech/chat', label: 'Trao đổi kỹ thuật' },
      { to: '/internal/head-of-tech/notifications', label: 'Thông báo' },
      { to: '/internal/head-of-tech/warehouse', label: 'Lịch sử kho' },
    ],
  },
];

function HeadOfTechLayout() {
  return (
    <RoleDashboardLayout
      description="Không gian nghiệp vụ Reviewer: điều phối, quy trình, soát xét và truy vết."
      initials="HT"
      links={links}
      name="Nguyễn Thu Hương"
      profilePath="/internal/head-of-tech/profile"
      role="Reviewer · Head of Tech"
    />
  );
}

export default HeadOfTechLayout;
