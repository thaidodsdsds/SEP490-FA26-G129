import { useEffect, useState } from 'react';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import SectionCard from '../../../components/ui/SectionCard.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import Toast from '../../../components/ui/Toast.jsx';
import {
  activityLog,
  adminKpis,
  adminProfile,
  recentLogins,
  roleSummary,
  systemHealth,
} from './mockData.js';
import { formatDate } from '../../../utils/formatters.js';

const loginColumns = [
  { key: 'account', label: 'Tài khoản' },
  { key: 'role', label: 'Vai trò' },
  { key: 'time', label: 'Thời gian' },
  { key: 'client', label: 'Thiết bị / IP' },
  { key: 'status', label: 'Trạng thái' },
];

const roleColumns = [
  { key: 'role', label: 'Vai trò' },
  { key: 'accounts', label: 'Tài khoản' },
  { key: 'scope', label: 'Phạm vi' },
  { key: 'status', label: 'Trạng thái' },
];

function AdminDashboardPage() {
  const [toast, setToast] = useState(null);

  const notify = (message, tone = 'info') => setToast({ message, tone });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const loginRows = recentLogins.map((login) => [
    (
      <div key={`${login.id}-account`}>
        <span className="dash-cell-title">{login.name}</span>
        <span className="dash-cell-sub">{login.email}</span>
      </div>
    ),
    login.role,
    <span className="dash-nowrap" key={`${login.id}-time`}>
      {formatDate(login.date)} · {login.time}
    </span>,
    login.client,
    <StatusBadge key={`${login.id}-status`} tone={login.tone}>{login.status}</StatusBadge>,
  ]);

  const roleRows = roleSummary.map((role) => [
    (
      <div key={`${role.code}-role`}>
        <span className="dash-cell-title">{role.role}</span>
        <span className="dash-cell-sub">{role.code}</span>
      </div>
    ),
    <span className="dash-cell-amount" key={`${role.code}-accounts`}>{role.accounts}</span>,
    role.scope,
    <StatusBadge key={`${role.code}-status`} tone={role.tone}>{role.status}</StatusBadge>,
  ]);

  return (
    <div className="dash-page">
      <PageHeader
        actions={(
          <>
            <button
              className="button button-secondary"
              onClick={() => notify('Đang chuẩn bị báo cáo quản trị (demo).')}
              type="button"
            >
              Xuất báo cáo
            </button>
            <button
              className="button button-primary"
              onClick={() => document.getElementById('admin-activity-log')?.scrollIntoView({ behavior: 'smooth' })}
              type="button"
            >
              Xem nhật ký
            </button>
          </>
        )}
        description="Theo dõi tài khoản, phân quyền, hoạt động và tình trạng vận hành của toàn hệ thống."
        eyebrow="TỔNG QUAN QUẢN TRỊ"
        meta={[
          `Cập nhật ${formatDate(adminProfile.updatedAt)} · ${adminProfile.updatedTime}`,
          `${adminProfile.accountCount} tài khoản`,
          `${adminProfile.roleCount} vai trò`,
          `${adminProfile.alertCount} cảnh báo`,
        ]}
        title="Quản trị hệ thống"
      />

      <section aria-label="Chỉ số quản trị" className="dash-kpi-grid">
        {adminKpis.map(({ key, ...kpi }) => (
          <StatCard key={key} {...kpi} />
        ))}
      </section>

      <SectionCard
        action={(
          <button
            className="dash-btn-xs"
            onClick={() => notify('Màn nhật ký đăng nhập đầy đủ sẽ có ở giai đoạn sau (demo).')}
            type="button"
          >
            Xem tất cả
          </button>
        )}
        subtitle={`${recentLogins.length} phiên mới nhất · Ghi nhận cả phiên thất bại`}
        title="Đăng nhập gần đây"
      >
        <DataTable columns={loginColumns} rows={loginRows} />
      </SectionCard>

      <div className="dash-grid split">
        <SectionCard
          action={(
            <button
              className="dash-btn-xs"
              onClick={() => notify('Màn vai trò & phân quyền đầy đủ sẽ có ở giai đoạn sau (demo).')}
              type="button"
            >
              Xem tất cả
            </button>
          )}
          subtitle="Tổng hợp tài khoản theo vai trò"
          title="Vai trò & phân quyền"
        >
          <DataTable columns={roleColumns} rows={roleRows} />
        </SectionCard>

        <SectionCard
          subtitle={`Cập nhật lúc ${adminProfile.updatedTime}`}
          title="Tình trạng hệ thống"
        >
          <ul className="dash-invoice-list">
            {systemHealth.map((item) => (
              <li className="dash-invoice-item" key={item.label}>
                <div className="dash-invoice-main">
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </div>
                <div className="dash-invoice-side">
                  <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div id="admin-activity-log">
        <SectionCard
          action={(
            <button
              className="dash-btn-xs"
              onClick={() => notify('Màn nhật ký hoạt động đầy đủ sẽ có ở giai đoạn sau (demo).')}
              type="button"
            >
              Xem tất cả
            </button>
          )}
          subtitle="Thao tác và sự kiện mới nhất trên hệ thống"
          title="Nhật ký hoạt động gần đây"
        >
          <ul className="dash-notice-list">
            {activityLog.map((activity) => (
              <li className="dash-notice-item" key={activity.id}>
                <span className={`dash-notice-icon ${activity.tone}`} aria-hidden="true">
                  {activity.icon}
                </span>
                <div>
                  <p>{activity.text}</p>
                  <small>{activity.time}</small>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </div>
  );
}

export default AdminDashboardPage;
