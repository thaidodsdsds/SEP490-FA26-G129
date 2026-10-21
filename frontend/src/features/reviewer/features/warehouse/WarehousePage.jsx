import { warehouseTransactions } from '../../mockData.js';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function WarehousePage() {
  const { matches, query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const rows = warehouseTransactions.filter((row) => matches(`${row.id} ${row.device} ${row.serial} ${row.workOrder} ${row.handledBy}`));
  return (
    <ReviewerPageShell title="Lịch sử kho" description="Tra cứu phiếu nhập, xuất và tình trạng thiết bị bàn giao." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card">
        <div className="reviewer-card-heading"><div><h2>WarehouseTransaction</h2><p>Nhật ký nhập/xuất thiết bị In-lab theo Work Order.</p></div></div>
        <DataTable columns={[
          { key: 'id', label: 'Mã phiếu' },
          { key: 'type', label: 'Loại phiếu', render: (row) => <StatusPill>{row.type}</StatusPill> },
          { key: 'device', label: 'Thiết bị' }, { key: 'serial', label: 'Serial' }, { key: 'workOrder', label: 'Work Order' },
          { key: 'condition', label: 'Tình trạng / biên bản' }, { key: 'handledBy', label: 'Nhân viên kho' }, { key: 'time', label: 'Thời điểm' },
        ]} rows={rows} />
      </section>
    </ReviewerPageShell>
  );
}

export default WarehousePage;
