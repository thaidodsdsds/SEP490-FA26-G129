import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function ReviewQueuePage() {
  const { records, matches, query, setQuery, feedback, setFeedback, setModal } = useReviewerWorkspace();
  const pending = records.filter((item) => item.status === 'Pending')
    .filter((item) => matches(`${item.id} ${item.device} ${item.customer} ${item.technician}`));
  return (
    <ReviewerPageShell title="Hàng chờ soát xét" description="Kiểm tra hồ sơ đo, môi trường và kết quả trước khi quyết định." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card">
        <div className="reviewer-card-heading"><div><h2>CalibrationRecord đang chờ</h2><p>Đối chiếu quy trình, môi trường, chuẩn và từng điểm đo.</p></div><span className="queue-counter">{pending.length} hồ sơ</span></div>
        <DataTable columns={[
          { key: 'id', label: 'Mã hồ sơ', render: (row) => <strong>{row.id}</strong> },
          { key: 'device', label: 'Thiết bị / serial' },
          { key: 'customer', label: 'Khách hàng' },
          { key: 'technician', label: 'Kỹ thuật viên' },
          { key: 'procedure', label: 'Quy trình áp dụng' },
          { key: 'environmentStatus', label: 'Môi trường', render: (row) => <StatusPill>{row.environmentStatus}</StatusPill> },
          { key: 'submittedAt', label: 'Trình lúc' },
          { key: 'action', label: '', render: (row) => <button className="button button-primary button-compact" onClick={() => setModal({ type: 'review', record: row })} type="button">Soát xét</button> },
        ]} rows={pending} empty="Hàng chờ đã được xử lý." />
        <p className="mock-note">Approve/Reject tạo ReviewLog. Khi Reject, bản ghi cũ được giữ nguyên và cần đo lại trên CalibrationRecord mới.</p>
      </section>
    </ReviewerPageShell>
  );
}

export default ReviewQueuePage;
