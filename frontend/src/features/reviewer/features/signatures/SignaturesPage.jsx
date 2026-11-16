import { digitalSignatures } from '../../mockData.js';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function SignaturesPage() {
  const { matches, query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const rows = digitalSignatures.filter((item) => matches(`${item.id} ${item.purpose} ${item.reference} ${item.signer} ${item.status}`));
  return (
    <ReviewerPageShell title="Nhật ký chữ ký số" description="Đối chiếu mục đích ký, người ký, hash và trạng thái nhà cung cấp." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card">
        <div className="reviewer-card-heading"><div><h2>DigitalSignature</h2><p>Nhật ký băm tài liệu và giao dịch qua nhà cung cấp chữ ký số.</p></div></div>
        <DataTable columns={[
          { key: 'id', label: 'Mã ký' }, { key: 'purpose', label: 'Mục đích' },
          { key: 'reference', label: 'Hồ sơ liên kết' }, { key: 'signer', label: 'Người ký' },
          { key: 'hash', label: 'Document hash', render: (row) => <code>{row.hash}</code> },
          { key: 'transaction', label: 'Provider transaction' }, { key: 'signedAt', label: 'Thời gian ký' },
          { key: 'status', label: 'Trạng thái', render: (row) => <StatusPill>{row.status}</StatusPill> },
        ]} rows={rows} />
      </section>
    </ReviewerPageShell>
  );
}

export default SignaturesPage;
