import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/ui/DataTable.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import SectionCard from '../../../components/ui/SectionCard.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import { getMasterStandardsApi } from '../../../services/master-standard-service.js';
import { getWarehouseInventorySummaryApi } from '../../../services/warehouse-service.js';

function GeneralDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [standards, setStandards] = useState([]);
  const [warehouseSummary, setWarehouseSummary] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [standardsData, whSummary] = await Promise.all([
        getMasterStandardsApi().catch(() => []),
        getWarehouseInventorySummaryApi().catch(() => null),
      ]);
      setStandards(Array.isArray(standardsData) ? standardsData : []);
      setWarehouseSummary(whSummary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate metrics
  const expiredStandards = standards.filter((s) => s.is_expired);
  const expiringStandards = standards.filter((s) => s.expiring_soon);

  // Mock comprehensive data for orders, device expiry, and receivables
  const pendingOrders = [
    { id: 'SR-2026-089', customer: 'Samsung Electronics VN', field: 'Điện – Điện tử', count: 12, value: '45.000.000 ₫', status: 'Báo giá đã duyệt', tone: 'info' },
    { id: 'SR-2026-092', customer: 'Công ty Cổ phần Sữa Vinamilk', field: 'Nhiệt độ – Khối lượng', count: 8, value: '32.500.000 ₫', status: 'Đang đo In-lab', tone: 'warning' },
    { id: 'SR-2026-095', customer: 'Dược phẩm Sanofi Việt Nam', field: 'Áp suất – Nhiệt ẩm', count: 5, value: '18.200.000 ₫', status: 'Chờ soát xét', tone: 'purple' },
    { id: 'SR-2026-098', customer: 'Nhà máy Honda Việt Nam', field: 'Cơ – Lực – Kích thước', count: 15, value: '56.000.000 ₫', status: 'Đã hoàn thành', tone: 'success' },
  ];

  const dueDevices = [
    { id: 'DEV-0012', name: 'Máy hiệu chuẩn đa năng Fluke 5500A', serial: 'SN-5500-8812', customer: 'Samsung Electronics VN', dueDate: '2026-11-05', daysLeft: 7, priority: 'Khẩn cấp' },
    { id: 'DEV-0089', name: 'Cân phân tích Sartorius Secura 225D', serial: 'SN-SAR-9921', customer: 'Vinamilk Tiên Sơn', dueDate: '2026-11-12', daysLeft: 14, priority: 'Cao' },
    { id: 'DEV-0144', name: 'Áp kế chuẩn Fluke 700G08', serial: 'SN-700G-4410', customer: 'Sanofi Việt Nam', dueDate: '2026-11-25', daysLeft: 27, priority: 'Trung bình' },
    { id: 'DEV-0201', name: 'Nồi hấp tiệt trùng Yamato SM300', serial: 'SN-YM-1029', customer: 'Bệnh viện Bạch Mai', dueDate: '2026-12-01', daysLeft: 33, priority: 'Bình thường' },
  ];

  const debts = [
    { customer: 'Samsung Electronics VN', invoiceNo: 'INV-2026-042', amount: '45.000.000 ₫', due: '2026-11-15', status: 'Trong hạn', tone: 'info' },
    { customer: 'Tập đoàn Hòa Phát', invoiceNo: 'INV-2026-038', amount: '88.500.000 ₫', due: '2026-10-15', status: 'Quá hạn 14 ngày', tone: 'danger' },
    { customer: 'Vinamilk Tiên Sơn', invoiceNo: 'INV-2026-045', amount: '32.500.000 ₫', due: '2026-11-20', status: 'Trong hạn', tone: 'info' },
  ];

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="button button-secondary"
              onClick={() => navigate('/internal/head-of-tech/standards')}
              type="button"
            >
              Chuẩn đo lường
            </button>
            <button
              className="button button-primary"
              onClick={() => navigate('/internal/warehouse/transactions')}
              type="button"
            >
              Giao dịch kho
            </button>
          </div>
        }
        badge="Executive Overview · ISO/IEC 17025"
        description="Báo cáo tích hợp thời gian thực: Tình hình đơn hàng, hạn kiểm định thiết bị khách hàng, hạn chuẩn đo lường và công nợ tài chính."
        title="Dashboard Tổng quan Điều hành (General Dashboard)"
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard
          icon="⌁"
          label="Đơn dịch vụ tháng này"
          sub="Doanh thu dự kiến: 151.700.000 ₫"
          tone="blue"
          value="40 đơn"
        />
        <StatCard
          icon="◷"
          label="Thiết bị khách sắp đến hạn"
          sub="Cần gửi email nhắc tái hiệu chuẩn"
          tone="amber"
          value={`${dueDevices.length} thiết bị`}
        />
        <StatCard
          icon="◇"
          label="Chuẩn sắp / quá hạn"
          sub={expiredStandards.length > 0 ? `${expiredStandards.length} chuẩn quá hạn đo!` : 'Cần gửi kiểm định định kỳ'}
          tone={expiredStandards.length > 0 ? 'red' : 'amber'}
          value={`${expiredStandards.length + expiringStandards.length} chuẩn`}
        />
        <StatCard
          icon="📦"
          label="Thiết bị lưu kho In-lab"
          sub={`Nhập hôm nay: +${warehouseSummary?.todayInbound || 0} thiết bị`}
          tone="green"
          value={`${warehouseSummary?.currentInWarehouseEstimated ?? 18} thiết bị`}
        />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Section 1: Đơn dịch vụ trọng điểm */}
        <SectionCard
          action={
            <button
              onClick={() => navigate('/internal/head-of-tech/procedures')}
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Xem quy trình đo &rarr;
            </button>
          }
          eyebrow="TIẾN ĐỘ THỰC HIỆN"
          title="Tiến độ Đơn hiệu chuẩn & Thử nghiệm"
        >
          <DataTable
            columns={[
              { key: 'id', label: 'Mã đơn' },
              { key: 'customer', label: 'Khách hàng' },
              { key: 'field', label: 'Lĩnh vực' },
              { key: 'count', label: 'SL máy' },
              { key: 'value', label: 'Giá trị' },
              { key: 'status', label: 'Trạng thái' },
            ]}
            emptyMessage="Không có đơn nào."
            rows={pendingOrders.map((o) => [
              <strong key={o.id}>{o.id}</strong>,
              o.customer,
              o.field,
              o.count,
              o.value,
              <StatusBadge key={`${o.id}-st`} tone={o.tone}>{o.status}</StatusBadge>,
            ])}
          />
        </SectionCard>

        {/* Section 2: Cảnh báo chuẩn đối chứng */}
        <SectionCard
          action={
            <button
              onClick={() => navigate('/internal/head-of-tech/standards')}
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Quản lý chuẩn &rarr;
            </button>
          }
          eyebrow="ISO/IEC 17025 MỤC 6.4"
          title="Cảnh báo Chuẩn đo lường (Master Standards)"
        >
          {loading ? (
            <p style={{ color: '#64748b' }}>Đang tải danh sách chuẩn...</p>
          ) : (
            <DataTable
              columns={[
                { key: 'serial', label: 'Số Serial' },
                { key: 'name', label: 'Tên chuẩn' },
                { key: 'expiry', label: 'Hạn kiểm định' },
                { key: 'status', label: 'Cảnh báo' },
              ]}
              emptyMessage="Tất cả chuẩn đo lường đang trong hạn."
              rows={standards.slice(0, 4).map((s) => [
                <code key={s.id}>{s.serial_number}</code>,
                <strong key={`${s.id}-name`}>{s.name}</strong>,
                s.calibration_expiry ? new Date(s.calibration_expiry).toLocaleDateString('vi-VN') : '—',
                s.is_expired ? (
                  <StatusBadge key={`${s.id}-st`} tone="danger">Quá hạn</StatusBadge>
                ) : s.expiring_soon ? (
                  <StatusBadge key={`${s.id}-st`} tone="warning">Còn {s.days_until_expiry} ngày</StatusBadge>
                ) : (
                  <StatusBadge key={`${s.id}-st`} tone="success">Còn hạn</StatusBadge>
                ),
              ])}
            />
          )}
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 24 }}>
        {/* Section 3: Thiết bị khách hàng sắp hết hạn */}
        <SectionCard
          eyebrow="CHĂM SÓC KHÁCH HÀNG & TÁI HIỆU CHUẨN"
          title="Thiết bị khách hàng sắp hết hạn kiểm định (CRM)"
        >
          <DataTable
            columns={[
              { key: 'name', label: 'Thiết bị & Model' },
              { key: 'serial', label: 'Serial' },
              { key: 'customer', label: 'Khách hàng' },
              { key: 'due', label: 'Hạn tái chuẩn' },
              { key: 'left', label: 'Thời gian còn lại' },
            ]}
            emptyMessage="Không có thiết bị sắp hết hạn."
            rows={dueDevices.map((d) => [
              <strong key={d.id}>{d.name}</strong>,
              <code key={`${d.id}-sn`}>{d.serial}</code>,
              d.customer,
              d.dueDate,
              <span key={`${d.id}-left`} style={{ color: d.daysLeft <= 14 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                Còn {d.daysLeft} ngày
              </span>,
            ])}
          />
        </SectionCard>

        {/* Section 4: Theo dõi công nợ */}
        <SectionCard
          eyebrow="KẾ TOÁN & TÀI CHÍNH"
          title="Hóa đơn & Công nợ Khách hàng"
        >
          <DataTable
            columns={[
              { key: 'inv', label: 'Số hóa đơn' },
              { key: 'cust', label: 'Khách hàng' },
              { key: 'amount', label: 'Số tiền' },
              { key: 'due', label: 'Hạn thanh toán' },
              { key: 'status', label: 'Trạng thái' },
            ]}
            emptyMessage="Không có khoản nợ nào."
            rows={debts.map((item, idx) => [
              <code key={idx}>{item.invoiceNo}</code>,
              item.customer,
              <strong key={`amt-${idx}`}>{item.amount}</strong>,
              item.due,
              <StatusBadge key={`st-${idx}`} tone={item.tone}>{item.status}</StatusBadge>,
            ])}
          />
        </SectionCard>
      </div>
    </div>
  );
}

export default GeneralDashboardPage;
