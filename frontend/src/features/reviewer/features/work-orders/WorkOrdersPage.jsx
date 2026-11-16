import { useState } from 'react';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';

const workOrders = [
  { id: 'WO-2026-014', customer: 'Công ty TNHH Thiết bị Minh Long', devices: '2 thiết bị', status: 'Assigned', type: 'Order-based', created: '20/10/2026' },
  { id: 'WO-2026-015', customer: 'Công ty Điện lực Đông Thành', devices: '1 thiết bị', status: 'InProgress', type: 'Order-based', created: '20/10/2026' },
  { id: 'WO-2026-012', customer: 'Nhà máy Thực phẩm An Phú', devices: '1 thiết bị', status: 'Open', type: 'Contract-based', created: '18/10/2026' },
  { id: 'WO-2026-009', customer: 'Trung tâm Y tế Đông Thành', devices: '1 thiết bị', status: 'Done', type: 'Order-based', created: '16/10/2026' },
];

function WorkOrdersPage() {
  const { normalizedQuery, query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const [selected, setSelected] = useState(null);
  const rows = workOrders.filter((row) => !normalizedQuery || `${row.id} ${row.customer} ${row.status}`.toLowerCase().includes(normalizedQuery));
  return (
    <ReviewerPageShell title="Work Order" description="Theo dõi trạng thái lệnh và tiến độ xử lý theo từng thiết bị." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card">
        <div className="reviewer-card-heading"><div><h2>Danh sách Work Order</h2><p>Liên kết hợp đồng/báo giá và tiến độ điều phối</p></div></div>
        <DataTable columns={[
          { key: 'id', label: 'Mã Work Order', render: (row) => <button className="text-action" onClick={() => setSelected(row)} type="button">{row.id}</button> },
          { key: 'customer', label: 'Khách hàng' },
          { key: 'devices', label: 'Thiết bị' },
          { key: 'type', label: 'Luồng' },
          { key: 'created', label: 'Ngày tạo' },
          { key: 'status', label: 'Trạng thái', render: (row) => <StatusPill>{row.status}</StatusPill> },
          { key: 'action', label: '', render: (row) => <button className="small-action" onClick={() => setSelected(row)} type="button">Chi tiết</button> },
        ]} rows={rows} />
        {selected && <div className="inline-detail"><strong>{selected.id} · {selected.customer}</strong><p>{selected.devices} · {selected.type} · Trạng thái {selected.status}. Mở phần Phân công thiết bị để cập nhật lịch và kỹ thuật viên.</p><button className="small-action" onClick={() => setSelected(null)} type="button">Đóng chi tiết</button></div>}
        <p className="mock-note">Chọn mã Work Order để xem tóm tắt. Chi tiết phân công theo từng thiết bị nằm ở màn hình “Phân công thiết bị”.</p>
      </section>
    </ReviewerPageShell>
  );
}

export default WorkOrdersPage;
