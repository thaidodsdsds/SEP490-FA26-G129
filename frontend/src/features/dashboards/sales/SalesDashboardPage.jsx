import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import SectionCard from '../../../components/ui/SectionCard.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import Toast from '../../../components/ui/Toast.jsx';
import { BarChart, ProgressBar } from '../../../components/ui/Charts.jsx';
import {
  activeContracts,
  expiringCustomerDevices,
  pendingQuotations,
  quotationFunnel,
  recentServiceRequests,
  salesKpis,
  salesNotifications,
  salesProfile,
  serviceFieldDistribution,
} from './mockData.js';
import { formatCurrency, formatCurrencyShort, formatDate, formatDueHint } from '../../../utils/formatters.js';

const requestColumns = [
  { key: 'id', label: 'Mã yêu cầu' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'devices', label: 'Quy mô' },
  { key: 'field', label: 'Lĩnh vực kỹ thuật' },
  { key: 'location', label: 'Hình thức' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'value', label: 'Giá trị dự kiến' },
  { key: 'action', label: 'Thao tác' },
];

const quotationColumns = [
  { key: 'id', label: 'Mã báo giá' },
  { key: 'requestRef', label: 'Đơn liên kết' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'subtotal', label: 'Tạm tính' },
  { key: 'discount', label: 'Chiết khấu' },
  { key: 'travel', label: 'Phí On-site' },
  { key: 'total', label: 'Tổng tiền' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'expiry', label: 'Hiệu lực đến' },
];

const contractColumns = [
  { key: 'code', label: 'Mã hợp đồng' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'title', label: 'Tiêu đề thỏa thuận' },
  { key: 'value', label: 'Giá trị cam kết/năm' },
  { key: 'term', label: 'Thời hạn' },
  { key: 'credit', label: 'Hạn mức nợ' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'note', label: 'Ghi chú phê duyệt' },
];

const deviceCareColumns = [
  { key: 'device', label: 'Thiết bị & Model' },
  { key: 'serial', label: 'Số Serial / Mã nội bộ' },
  { key: 'customer', label: 'Khách hàng sở hữu' },
  { key: 'kind', label: 'Dịch vụ yêu cầu' },
  { key: 'dueDate', label: 'Hạn kiểm định / hiệu chuẩn' },
  { key: 'action', label: 'Chăm sóc' },
];

function SalesDashboardPage() {
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const notify = (message, tone = 'info') => setToast({ message, tone });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const requestRows = recentServiceRequests.map((req) => [
    <strong className="dash-cell-title" key={`${req.id}-id`}>{req.id}</strong>,
    (
      <div key={`${req.id}-cust`}>
        <span className="dash-cell-title">{req.customer}</span>
        <span className="dash-cell-sub">Tạo ngày: {formatDate(req.createdAt)}</span>
      </div>
    ),
    <span key={`${req.id}-dev`}>{req.deviceCount} thiết bị</span>,
    <span className="dash-cell-sub" key={`${req.id}-fld`}>{req.serviceField}</span>,
    (
      <span className="dash-cell-sub" key={`${req.id}-loc`}>
        {req.locationType === 'In-lab' ? '🏢 In-lab (Tại phòng Lab)' : '🚗 On-site (Tại hiện trường)'}
      </span>
    ),
    (
      <div key={`${req.id}-st`}>
        <StatusBadge tone={req.tone}>{req.status}</StatusBadge>
        <span className="dash-cell-sub" style={{ display: 'block', marginTop: 3 }}>{req.progress}</span>
      </div>
    ),
    <span className="dash-nowrap" key={`${req.id}-val`}><strong>{formatCurrency(req.estimatedValue)}</strong></span>,
    (
      <button
        className="button button-secondary"
        key={`${req.id}-btn`}
        onClick={() => navigate(`/internal/sales/quotations?requestId=${encodeURIComponent(req.id)}`)}
        style={{ padding: '3px 8px', minHeight: 28, fontSize: '0.72rem' }}
        type="button"
      >
        Lập báo giá
      </button>
    ),
  ]);

  const quotationRows = pendingQuotations.map((q) => [
    <strong className="dash-cell-title" key={`${q.id}-id`}>{q.id}</strong>,
    <span className="dash-cell-sub" key={`${q.id}-ref`}>{q.requestRef}</span>,
    <span className="dash-cell-title" key={`${q.id}-cust`}>{q.customer}</span>,
    formatCurrencyShort(q.subtotal),
    q.discountAmount > 0 ? `-${formatCurrencyShort(q.discountAmount)}` : '—',
    q.travelFee > 0 ? formatCurrencyShort(q.travelFee) : '—',
    <strong className="dash-nowrap dash-text-primary" key={`${q.id}-tot`}>{formatCurrency(q.totalAmount)}</strong>,
    <StatusBadge key={`${q.id}-st`} tone={q.tone}>{q.status}</StatusBadge>,
    <span className="dash-cell-sub" key={`${q.id}-exp`}>{formatDate(q.expiryDate)}</span>,
  ]);

  const contractRows = activeContracts.map((c) => [
    <strong className="dash-cell-title" key={`${c.id}-code`}>{c.contractCode}</strong>,
    <span className="dash-cell-title" key={`${c.id}-cust`}>{c.customer}</span>,
    <span className="dash-cell-sub" key={`${c.id}-title`}>{c.title}</span>,
    <strong className="dash-nowrap" key={`${c.id}-val`}>{formatCurrency(c.contractValue)}</strong>,
    <span key={`${c.id}-term`}>{c.committedYears} năm (Hạn TT: {c.paymentTermDays} ngày)</span>,
    formatCurrencyShort(c.creditLimit),
    <StatusBadge key={`${c.id}-st`} tone={c.tone}>{c.status}</StatusBadge>,
    <span className="dash-cell-sub" key={`${c.id}-hint`}>{c.hint}</span>,
  ]);

  const deviceCareRows = expiringCustomerDevices.map((d) => [
    (
      <div key={`${d.id}-dev`}>
        <span className="dash-cell-title">{d.name}</span>
        <span className="dash-cell-sub">{d.model}</span>
      </div>
    ),
    <span className="dash-cell-sub dash-nowrap" key={`${d.id}-sn`}>{d.serial}</span>,
    <span className="dash-cell-title" key={`${d.id}-cust`}>{d.customer}</span>,
    (
      <span
        className={`dash-meta-chip${d.isGroup2 ? ' dash-text-danger' : ''}`}
        key={`${d.id}-knd`}
        style={{ fontWeight: 600 }}
      >
        {d.serviceKind}
      </span>
    ),
    (
      <div key={`${d.id}-due`}>
        <span className={`dash-cell-title${d.tone === 'danger' ? ' dash-text-danger' : ''}`}>
          {formatDate(d.nextDueDate)}
        </span>
        <span className="dash-cell-sub">{formatDueHint(d.nextDueDate)}</span>
      </div>
    ),
    (
      <button
        className="button button-primary"
        key={`${d.id}-act`}
        onClick={() => notify(`Tạo đơn gia hạn dịch vụ cho thiết bị ${d.serial} (${d.customer})`)}
        style={{ padding: '3px 8px', minHeight: 28, fontSize: '0.72rem' }}
        type="button"
      >
        Tạo đơn tái ký
      </button>
    ),
  ]);

  return (
    <div className="dash-page">
      <PageHeader
        actions={(
          <>
            <button
              className="button button-secondary"
              onClick={() => notify('Đang xuất báo cáo tiến độ kinh doanh quý (PDF/Excel)...')}
              type="button"
            >
              Xuất báo cáo
            </button>
            <button
              className="button button-secondary"
              onClick={() => notify('Mở màn hình Thêm khách hàng pháp nhân mới (Customer + Account).')}
              type="button"
            >
              + Khách hàng
            </button>
            <button
              className="button button-secondary"
              onClick={() => notify('Mở biểu mẫu Soạn thảo Hợp đồng dài hạn (Contract)...')}
              type="button"
            >
              + Soạn hợp đồng
            </button>
            <button
              className="button button-primary"
              onClick={() => navigate('/internal/sales/service-requests/new')}
              type="button"
            >
              + Tạo yêu cầu dịch vụ
            </button>
          </>
        )}
        description={`${salesProfile.department} · Phụ trách ${salesProfile.assignedCustomers} doanh nghiệp. Chỉ tiêu quý: ${formatCurrencyShort(salesProfile.quarterAchieved)} / ${formatCurrencyShort(salesProfile.quarterTarget)}.`}
        eyebrow="KHÔNG GIAN LÀM VIỆC KINH DOANH (SALES) · CRM & BÁO GIÁ"
        meta={[
          <span className="dash-meta-chip" key="agent">Nhân viên: {salesProfile.name} ({salesProfile.code})</span>,
          <span className="dash-meta-chip" key="target">Đạt chỉ tiêu: {Math.round((salesProfile.quarterAchieved / salesProfile.quarterTarget) * 100)}%</span>,
          <span className="dash-meta-chip" key="support">Đường dây hỗ trợ: {salesProfile.phone}</span>,
        ]}
        title="Tổng quan kinh doanh & Báo giá"
      />

      <section aria-label="Chỉ số hiệu quả kinh doanh" className="dash-kpi-grid">
        {salesKpis.map((kpi) => (
          <StatCard
            hint={kpi.hint}
            hintTone={kpi.hintTone}
            icon={kpi.icon}
            key={kpi.key}
            label={kpi.label}
            tone={kpi.tone}
            value={kpi.value}
          />
        ))}
      </section>

      <div className="dash-grid-2">
        <SectionCard
          action={(
            <button
              className="button button-secondary"
              onClick={() => notify('Chuyển tới danh sách tất cả Yêu cầu dịch vụ.')}
              type="button"
            >
              Xem tất cả
            </button>
          )}
          subtitle="Các yêu cầu dịch vụ từ khách hàng hoặc Sales tạo cần xử lý báo giá và kích hoạt WorkOrder."
          title="Yêu cầu dịch vụ gần đây"
        >
          <DataTable
            columns={requestColumns}
            emptyText="Chưa có yêu cầu dịch vụ nào"
            rows={requestRows}
          />
        </SectionCard>

        <SectionCard
          action={(
            <button
              className="button button-secondary"
              onClick={() => navigate('/internal/sales/quotations')}
              type="button"
            >
              Xem tất cả
            </button>
          )}
          subtitle="Theo dõi các bản báo giá đã gửi khách hàng chờ phản hồi hoặc cần điều chỉnh chiết khấu."
          title="Báo giá chờ chốt (Quotations)"
        >
          <DataTable
            columns={quotationColumns}
            emptyText="Không có báo giá nào chờ xử lý"
            rows={quotationRows}
          />
        </SectionCard>
      </div>

      <div className="dash-grid-2">
        <SectionCard
          action={(
            <button
              className="button button-secondary"
              onClick={() => notify('Chuyển tới danh mục Hợp đồng cam kết dài hạn.')}
              type="button"
            >
              Quản lý hợp đồng
            </button>
          )}
          subtitle="Hợp đồng 1–3 năm giữ giá bình ổn. Hợp đồng sau khi CEO ký số sẽ tự động sinh WorkOrder và mở phát hành Invoice."
          title="Hợp đồng cam kết dài hạn (Contracts)"
        >
          <DataTable
            columns={contractColumns}
            emptyText="Chưa có hợp đồng nào"
            rows={contractRows}
          />
        </SectionCard>

        <SectionCard
          action={(
            <button
              className="button button-secondary"
              onClick={() => notify('Mở danh sách toàn bộ thiết bị khách hàng sắp hết hạn.')}
              type="button"
            >
              Lọc theo khách
            </button>
          )}
          subtitle="Cơ hội tái ký: Thiết bị sắp đến hạn next_due_date trong 30 ngày (đặc biệt lưu ý thiết bị Nhóm 2 bắt buộc kiểm định)."
          title="Thiết bị khách hàng sắp đến hạn"
        >
          <DataTable
            columns={deviceCareColumns}
            emptyText="Không có thiết bị nào sắp hết hạn"
            rows={deviceCareRows}
          />
        </SectionCard>
      </div>

      <div className="dash-grid-2">
        <SectionCard
          subtitle="Tỷ lệ cơ cấu dịch vụ theo 8 Lĩnh vực đo lường theo chuẩn đặc tả SRS v1.5."
          title="Cơ cấu dịch vụ theo Lĩnh vực"
        >
          <div style={{ padding: '8px 4px 16px' }}>
            <BarChart
              ariaLabel="Cơ cấu 8 lĩnh vực đo lường"
              data={serviceFieldDistribution}
              horizontal
            />
          </div>
        </SectionCard>

        <SectionCard
          subtitle="Tiến độ chuyển đổi từ bước Tạo báo giá nháp đến kích hoạt WorkOrder đo kiểm."
          title="Phễu chuyển đổi Báo giá"
        >
          <div style={{ display: 'grid', gap: '14px', padding: '12px 6px' }}>
            {quotationFunnel.map((step) => (
              <div key={step.label} style={{ display: 'grid', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#4a6072', fontWeight: 600 }}>{step.label}</span>
                  <strong style={{ color: '#1f3a4d' }}>{step.value} hồ sơ</strong>
                </div>
                <ProgressBar
                  label={`${step.value}`}
                  max={20}
                  tone={step.tone}
                  value={step.value}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        subtitle="Cập nhật nhanh từ hệ thống, phản hồi báo giá của khách và chữ ký số phê duyệt từ CEO."
        title="Thông báo kinh doanh & Hoạt động gần đây"
      >
        <ul className="dash-notice-list">
          {salesNotifications.map((notice) => (
            <li className="dash-notice-item" key={notice.id}>
              <span className={`dash-notice-icon ${notice.tone}`} aria-hidden="true">
                {notice.icon}
              </span>
              <div>
                <p>{notice.text}</p>
                <small>{notice.time}</small>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </div>
  );
}

export default SalesDashboardPage;
