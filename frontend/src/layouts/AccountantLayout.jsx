import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/accountant', label: 'Tổng quan', icon: '▦' },
  { to: '/internal/accountant/invoices', label: 'Hoá đơn', icon: '▤', soon: true },
  { to: '/internal/accountant/payments', label: 'Thanh toán', icon: '⇄', soon: true },
  { to: '/internal/accountant/receivables', label: 'Công nợ', icon: '₫', soon: true },
  { to: '/internal/accountant/contracts', label: 'Hợp đồng', icon: '⌁', soon: true },
];

function AccountantLayout() {
  return (
    <RoleDashboardLayout
      description="Theo dõi doanh thu, hoá đơn, thanh toán và công nợ của khách hàng."
      initials="KT"
      links={links}
      name="Kế toán"
      profilePath="/internal/accountant/profile"
      role="Accountant"
    />
  );
}

export default AccountantLayout;
