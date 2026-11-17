import { useEffect, useState } from 'react';
import { getVerificationLogsApi } from '../../../../services/verification-service.js';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function VerificationLogsPage() {
  const { query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getVerificationLogsApi({ q: query, limit: 100 })
      .then((data) => {
        if (!isMounted) return;
        setRows(data.items || []);
        // Query mới thành công → dọn banner lỗi của lần trước.
        setFeedback('');
      })
      .catch((error) => {
        if (!isMounted) return;
        setRows([]);
        setFeedback(
          error?.response?.data?.error?.message ||
            'Không tải được lịch sử tra cứu tem.',
          'error',
        );
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // setFeedback được tạo lại mỗi render, không đưa vào dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <ReviewerPageShell
      title="Lịch sử tra cứu tem"
      description="Theo dõi kết quả xác thực Seal Verification công khai."
      query={query}
      onSearchChange={setQuery}
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
    >
      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div>
            <h2>SealVerificationLog</h2>
            <p>Lịch sử tra cứu công khai theo seal_code và kết quả tại thời điểm tra cứu.</p>
          </div>
          {loading && <span className="reviewer-muted">Đang tải…</span>}
        </div>
        <DataTable
          columns={[
            { key: 'id', label: 'Mã lượt' },
            { key: 'seal_code', label: 'Seal code', render: (row) => <strong>{row.seal_code}</strong> },
            { key: 'verified_at_formatted', label: 'Thời điểm' },
            {
              key: 'verification_result',
              label: 'Kết quả',
              render: (row) => <StatusPill>{row.verification_result}</StatusPill>,
            },
            { key: 'source_ip', label: 'IP nguồn' },
          ]}
          rows={rows}
        />
      </section>
    </ReviewerPageShell>
  );
}

export default VerificationLogsPage;
