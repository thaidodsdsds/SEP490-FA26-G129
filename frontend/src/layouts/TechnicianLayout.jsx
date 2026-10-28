import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/technician', label: 'Dashboard công việc', icon: '▦' },
];

function TechnicianLayout() {
  return (
    <RoleDashboardLayout
      description="Theo dõi lịch được giao và hoàn tất hồ sơ đo."
      initials="NQ"
      links={links}
      name="Nguyễn Minh Quân"
      role="Technician"
    />
  );
}

export default TechnicianLayout;
