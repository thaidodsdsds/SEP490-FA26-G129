import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/head-of-tech', label: 'Dashboard Reviewer', icon: '▦' },
  { to: '/internal/head-of-tech/work-orders', label: 'Work Order', icon: '▤' },
  { to: '/internal/head-of-tech/assignments', label: 'Phân công thiết bị', icon: '↗' },
  { to: '/internal/head-of-tech/service-types', label: 'Danh mục dịch vụ', icon: '◫' },
  { to: '/internal/head-of-tech/procedures', label: 'Quy trình kỹ thuật', icon: '≡' },
  { to: '/internal/head-of-tech/standards', label: 'Chuẩn đối chứng', icon: '◇' },
  { to: '/internal/head-of-tech/review-queue', label: 'Hàng chờ soát xét', icon: '✓' },
  { to: '/internal/head-of-tech/drift', label: 'Lịch sử & độ trôi', icon: '⌁' },
  { to: '/internal/head-of-tech/certificates', label: 'Chứng chỉ', icon: '▧' },
  { to: '/internal/head-of-tech/seals', label: 'Tem & thu hồi', icon: '◉' },
  { to: '/internal/head-of-tech/verification-logs', label: 'Lịch sử tra cứu tem', icon: '⌕' },
  { to: '/internal/head-of-tech/signatures', label: 'Chữ ký số', icon: '✎' },
  { to: '/internal/head-of-tech/chat', label: 'Trao đổi kỹ thuật', icon: '◌' },
  { to: '/internal/head-of-tech/notifications', label: 'Thông báo', icon: '♧' },
  { to: '/internal/head-of-tech/warehouse', label: 'Lịch sử kho', icon: '▣' },
  { to: '/internal/technician', label: 'Dashboard kỹ thuật viên', icon: '⌁' },
  { to: '/internal', label: 'Khu vực nội bộ', icon: '⌂' },
];

function HeadOfTechLayout() {
  return (
    <RoleDashboardLayout
      description="Không gian nghiệp vụ Reviewer: điều phối, quy trình, soát xét và truy vết."
      initials="HT"
      links={links}
      name="Nguyễn Thu Hương"
      role="Reviewer · Head of Tech"
    />
  );
}

export default HeadOfTechLayout;
