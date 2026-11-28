import RoleDashboardLayout from './RoleDashboardLayout.jsx';

const links = [
  { to: '/internal/accountant', label: 'Tổng quan', icon: '▦' },
  {
    id: 'accountant-finance',
    icon: '💰',
    label: 'Tài chính & Công nợ',
    children: [
      { to: '/internal/accountant/contracts', label: 'Hợp đồng' },
      { to: '/internal/accountant/invoices', label: 'Hoá đơn', soon: true },
      { to: '/internal/accountant/payments', label: 'Thanh toán', soon: true },
      { to: '/internal/accountant/receivables', label: 'Công nợ', soon: true },
    ],
  },
];

function AccountantLayout() {
  return (
    <RoleDashboardLayout
      initials="KT"
      links={links}
      name="Kế toán"
      profilePath="/internal/accountant/profile"
      role="Accountant"
    />
  );
}

export default AccountantLayout;
