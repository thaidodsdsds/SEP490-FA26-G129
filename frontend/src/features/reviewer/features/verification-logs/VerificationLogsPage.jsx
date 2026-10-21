import { sealVerificationLogs } from '../../mockData.js';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function VerificationLogsPage() {
  const { matches, query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const rows = sealVerificationLogs.filter((item) => matches(`${item.code} ${item.result} ${item.sourceIp}`));
  return (
    <ReviewerPageShell title="Lịch sử tra cứu tem" description="Theo dõi kết quả xác thực Seal Verification công khai." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card">
        <div className="reviewer-card-heading"><div><h2>SealVerificationLog</h2><p>Lịch sử tra cứu công khai theo seal_code và kết quả tại thời điểm tra cứu.</p></div></div>
        <DataTable columns={[
          { key: 'id', label: 'Mã lượt' },
          { key: 'code', label: 'Seal code', render: (row) => <strong>{row.code}</strong> },
          { key: 'verifiedAt', label: 'Thời điểm' },
          { key: 'result', label: 'Kết quả', render: (row) => <StatusPill>{row.result}</StatusPill> },
          { key: 'sourceIp', label: 'IP nguồn' },
        ]} rows={rows} />
      </section>
    </ReviewerPageShell>
  );
}

export default VerificationLogsPage;
