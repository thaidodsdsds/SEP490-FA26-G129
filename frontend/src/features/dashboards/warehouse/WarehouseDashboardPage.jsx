import { useEffect, useState } from 'react';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import SectionCard from '../../../components/ui/SectionCard.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import Toast from '../../../components/ui/Toast.jsx';
import { BarChart, ProgressBar } from '../../../components/ui/Charts.jsx';
import {
  pendingLabTransfer,
  readyToReturnDevices,
  recentWarehouseTransactions,
  warehouseKpis,
  warehouseNotifications,
  warehouseProfile,
  warehouseStatusDistribution,
  weeklyThroughput,
} from './mockData.js';

const transactionColumns = [
  { key: 'id', label: 'Mã phiếu' },
  { key: 'type', label: 'Loại GD' },
  { key: 'device', label: 'Thiết bị & Model' },
  { key: 'serial', label: 'Số Serial' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'ref', label: 'Đơn hiệu chuẩn' },
  { key: 'condition', label: 'Tình trạng ngoại quan ban đầu' },
  { key: 'handledBy', label: 'Thủ kho' },
  { key: 'time', label: 'Thời gian' },
];

const readyColumns = [
  { key: 'device', label: 'Thiết bị & Model' },
  { key: 'serial', label: 'Số Serial' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'location', label: 'Vị trí lưu kho' },
  { key: 'cert', label: 'Giấy chứng nhận / Tem' },
  { key: 'payment', label: 'Thanh toán' },
  { key: 'days', label: 'Thời gian lưu' },
  { key: 'action', label: 'Thao tác' },
];

const pendingColumns = [
  { key: 'device', label: 'Thiết bị & Model' },
  { key: 'serial', label: 'Số Serial' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'kind', label: 'Dịch vụ yêu cầu' },
  { key: 'inbound', label: 'Thời điểm nhập' },
  { key: 'tech', label: 'Kỹ thuật viên' },
  { key: 'shelf', label: 'Vị trí chờ' },
  { key: 'action', label: 'Bàn giao' },
];

function WarehouseDashboardPage() {
  const [toast, setToast] = useState(null);

  const notify = (message, tone = 'info') => setToast({ message, tone });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const transactionRows = recentWarehouseTransactions.map((tx) => [
    <strong className="dash-cell-title" key={`${tx.id}-id`}>{tx.id}</strong>,
    (
      <StatusBadge key={`${tx.id}-type`} tone={tx.tone}>
        {tx.type === 'Inbound' ? '↓ Nhập kho' : '↑ Xuất kho'}
      </StatusBadge>
    ),
    (
      <div key={`${tx.id}-dev`}>
        <span className="dash-cell-title">{tx.device}</span>
        <span className="dash-cell-sub">{tx.model}</span>
      </div>
    ),
    <span className="dash-cell-sub dash-nowrap" key={`${tx.id}-sn`}>{tx.serial}</span>,
    <span className="dash-cell-title" key={`${tx.id}-cust`}>{tx.customer}</span>,
    <span className="dash-cell-sub" key={`${tx.id}-ref`}>{tx.serviceRequestRef}</span>,
    <span className="dash-cell-sub" key={`${tx.id}-note`}>{tx.conditionNote}</span>,
    <span key={`${tx.id}-by`}>{tx.handledBy}</span>,
    <span className="dash-nowrap dash-cell-sub" key={`${tx.id}-time`}>{tx.transactionAt}</span>,
  ]);

  const readyRows = readyToReturnDevices.map((item) => [
    (
      <div key={`${item.id}-dev`}>
        <span className="dash-cell-title">{item.device}</span>
        <span className="dash-cell-sub">{item.model}</span>
      </div>
    ),
    <span className="dash-cell-sub dash-nowrap" key={`${item.id}-sn`}>{item.serial}</span>,
    <span className="dash-cell-title" key={`${item.id}-cust`}>{item.customer}</span>,
    <span className="dash-meta-chip" key={`${item.id}-loc`}>📍 {item.shelfLocation}</span>,
    (
      <div key={`${item.id}-cert`}>
        <span className="dash-cell-title">{item.certificateNo}</span>
        <span className="dash-cell-sub">Mã tem: <strong>{item.sealCode}</strong></span>
      </div>
    ),
    (
      <StatusBadge key={`${item.id}-pay`} tone={item.paymentStatus === 'Đã thanh toán' ? 'success' : 'warning'}>
        {item.paymentStatus}
      </StatusBadge>
    ),
    (
      <div key={`${item.id}-days`}>
        <span className={`dash-cell-title${item.daysInWarehouse > 7 ? ' dash-text-danger' : ''}`}>
          {item.daysInWarehouse} ngày
        </span>
        {item.overdueNotice && (
          <span className="dash-cell-sub dash-text-danger" style={{ display: 'block', fontSize: '0.68rem' }}>
            {item.overdueNotice}
          </span>
        )}
      </div>
    ),
    (
      <button
        className="button button-primary"
        key={`${item.id}-btn`}
        onClick={() => notify(`Mở biên bản bàn giao & lập phiếu xuất kho cho thiết bị ${item.serial} (${item.customer})`)}
        style={{ padding: '3px 8px', minHeight: 28, fontSize: '0.72rem' }}
        type="button"
      >
        Xuất kho & Bàn giao
      </button>
    ),
  ]);

  const pendingRows = pendingLabTransfer.map((p) => [
    (
      <div key={`${p.id}-dev`}>
        <span className="dash-cell-title">{p.device}</span>
        <span className="dash-cell-sub">{p.model}</span>
      </div>
    ),
    <span className="dash-cell-sub dash-nowrap" key={`${p.id}-sn`}>{p.serial}</span>,
    <span className="dash-cell-title" key={`${p.id}-cust`}>{p.customer}</span>,
    <span className="dash-meta-chip" key={`${p.id}-knd`}>{p.serviceKind}</span>,
    <span className="dash-cell-sub" key={`${p.id}-in`}>{p.inboundTime}</span>,
    <span key={`${p.id}-tech`}><strong>{p.assignedTech}</strong></span>,
    <span className="dash-cell-sub" key={`${p.id}-sh`}>{p.shelfLocation}</span>,
    (
      <button
        className="button button-secondary"
        key={`${p.id}-btn`}
        onClick={() => notify(`Đã xác nhận bàn giao thiết bị ${p.serial} cho KTV ${p.assignedTech} vào phòng Lab`)}
        style={{ padding: '3px 8px', minHeight: 28, fontSize: '0.72rem' }}
        type="button"
      >
        Chuyển vào Lab
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
              onClick={() => notify('Bật máy quét mã vạch / QR để tra cứu nhanh thiết bị trong kho...')}
              type="button"
            >
              ⌕ Quét QR / Serial
            </button>
            <button
              className="button button-secondary"
              onClick={() => notify('Đang xuất báo cáo kiểm kê tồn kho thiết bị (Excel)...')}
              type="button"
            >
              Báo cáo tồn kho
            </button>
            <button
              className="button button-secondary"
              onClick={() => notify('Mở màn hình Lập phiếu xuất kho & Biên bản bàn giao (Outbound)...')}
              type="button"
            >
              + Phiếu xuất kho (Outbound)
            </button>
            <button
              className="button button-primary"
              onClick={() => notify('Mở màn hình Tiếp nhận & Lập phiếu nhập kho In-lab (Inbound)...')}
              type="button"
            >
              + Phiếu nhập kho (Inbound)
            </button>
          </>
        )}
        description={`${warehouseProfile.warehouseName} · ${warehouseProfile.location}. Quản lý tiếp nhận, kiểm tra ngoại quan ban đầu và xuất trả thiết bị hình thức In-lab.`}
        eyebrow="KHÔNG GIAN LÀM VIỆC KHO VẬN (WAREHOUSE) · TIẾP NHẬN & BÀN GIAO"
        meta={[
          <span className="dash-meta-chip" key="keeper">Thủ kho: {warehouseProfile.name} ({warehouseProfile.code})</span>,
          <span className="dash-meta-chip" key="capacity">Sức chứa kệ: {warehouseProfile.occupiedSlots}/{warehouseProfile.totalSlots} vị trí</span>,
          <span className="dash-meta-chip" key="hotline">Nội bộ kho: {warehouseProfile.phone}</span>,
        ]}
        title="Tổng quan kho thiết bị In-lab"
      />

      <section aria-label="Chỉ số kho vận" className="dash-kpi-grid">
        {warehouseKpis.map((kpi) => (
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

      <SectionCard
        action={(
          <button
            className="button button-secondary"
            onClick={() => notify('Chuyển tới danh mục thiết bị đã có kết quả đo kiểm sẵn sàng trả.')}
            type="button"
          >
            Xem tất cả (12)
          </button>
        )}
        subtitle="Thiết bị đã hoàn tất hiệu chuẩn/kiểm định, đã được cấp Certificate & dán Tem Seal số, sẵn sàng lập phiếu xuất kho kèm biên bản bàn giao."
        title="Thiết bị sẵn sàng xuất trả khách (Ready to Return)"
      >
        <DataTable
          columns={readyColumns}
          emptyText="Không có thiết bị nào đang chờ xuất kho"
          rows={readyRows}
        />
      </SectionCard>

      <div className="dash-grid-2">
        <SectionCard
          action={(
            <button
              className="button button-secondary"
              onClick={() => notify('Chuyển tới danh sách toàn bộ thiết bị đang chờ đưa vào phòng thí nghiệm.')}
              type="button"
            >
              Xem danh sách
            </button>
          )}
          subtitle="Thiết bị In-lab vừa tiếp nhận và kiểm tra ngoại quan xong, chờ Kỹ thuật viên nhận đo."
          title="Thiết bị chờ chuyển vào Lab đo kiểm"
        >
          <DataTable
            columns={pendingColumns}
            emptyText="Tất cả thiết bị đã được chuyển vào phòng Lab"
            rows={pendingRows}
          />
        </SectionCard>

        <SectionCard
          subtitle="Tỷ lệ phân bổ trạng thái và vị trí của các thiết bị đo lường trong kho."
          title="Tình trạng phân bổ thiết bị trong kho"
        >
          <div style={{ display: 'grid', gap: '14px', padding: '12px 6px' }}>
            {warehouseStatusDistribution.map((item) => (
              <div key={item.label} style={{ display: 'grid', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#4a6072', fontWeight: 600 }}>{item.label}</span>
                  <strong style={{ color: '#1f3a4d' }}>{item.value} thiết bị</strong>
                </div>
                <ProgressBar
                  label={`${item.value}`}
                  max={38}
                  tone={item.tone}
                  value={item.value}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        action={(
          <button
            className="button button-secondary"
            onClick={() => notify('Xem toàn bộ lịch sử phiếu nhập/xuất kho thiết bị.')}
            type="button"
          >
            Lịch sử kho
          </button>
        )}
        subtitle="Nhật ký các phiếu Inbound / Outbound gắn với từng đơn hiệu chuẩn (service_request_item_id), lưu vết nhân viên thực hiện (handled_by) và tình trạng vật lý ban đầu."
        title="Giao dịch nhập / xuất kho gần đây (Warehouse Transactions)"
      >
        <DataTable
          columns={transactionColumns}
          emptyText="Chưa có giao dịch kho nào"
          rows={transactionRows}
        />
      </SectionCard>

      <div className="dash-grid-2">
        <SectionCard
          subtitle="Số lượt thiết bị luân chuyển qua kho trong tuần (Thứ 2 đến Chủ nhật)."
          title="Lưu lượng giao dịch kho trong tuần"
        >
          <div style={{ padding: '8px 4px 16px' }}>
            <BarChart
              ariaLabel="Lưu lượng nhập xuất kho trong tuần"
              data={weeklyThroughput}
            />
          </div>
        </SectionCard>

        <SectionCard
          subtitle="Thông báo thiết bị mới từ đơn vị vận chuyển và cảnh báo lưu kho quá hạn theo chuẩn ISO/IEC 17025."
          title="Thông báo vận hành kho"
        >
          <ul className="dash-notice-list">
            {warehouseNotifications.map((notice) => (
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
      </div>

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </div>
  );
}

export default WarehouseDashboardPage;
