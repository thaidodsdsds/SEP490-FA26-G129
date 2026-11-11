import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/technician', label: 'Dashboard công việc', icon: '▦' },
  { to: '/mobile/technician', label: '📱 App di động (Offline)', icon: '📱' },
];

function TechnicianLayout() {
  return (
    <RoleDashboardLayout
      description="Theo dõi lịch được giao và hoàn tất hồ sơ đo."
      initials="KT"
      links={links}
      name="Kỹ thuật viên"
      profilePath="/internal/technician/profile"
      role="Technician"
    />
  );
}

export default TechnicianLayout;
