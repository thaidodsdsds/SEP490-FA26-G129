import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/head-of-tech', label: 'Tổng quan điều phối', icon: '▦' },
  { to: '/internal/technician', label: 'Dashboard kỹ thuật viên', icon: '⌁' },
  { to: '/internal', label: 'Khu vực nội bộ', icon: '⌂' },
];

function HeadOfTechLayout() {
  return (
    <RoleDashboardLayout
      description="Quản lý Work Order và điều phối nguồn lực kỹ thuật."
      initials="HT"
      links={links}
      name="Trưởng phòng kỹ thuật"
      role="Head of Tech"
    />
  );
}

export default HeadOfTechLayout;
