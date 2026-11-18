import { useEffect, useState } from 'react';
import { getDigitalSignaturesApi } from '../../../../services/work-order-service.js';
import { digitalSignatures } from '../../mockData.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';

function SignaturesPage() {
  const { matches, query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const [dbSignatures, setDbSignatures] = useState([]);

  useEffect(() => {
    let active = true;
    getDigitalSignaturesApi()
      .then((list) => {
        if (!active || !Array.isArray(list)) return;
        const mapped = list.map((item) => ({
          id: `DS-${item.id}`,
          purpose: item.purpose,
          reference: item.calibration_record_id
            ? `CR-${item.calibration_record_id}${item.device_name ? ` (${item.device_name})` : ''}`
            : item.contract_id
              ? `CT-${item.contract_id}`
              : 'Hồ sơ kỹ thuật',
          signer: item.signer_name || `KTV #${item.signer_id}`,
          hash: item.document_hash || '',
          transaction: item.provider_transaction_id || item.provider || 'ISOCAL-PKI-SHA256',
          signedAt: item.signed_at ? new Date(item.signed_at).toLocaleString('vi-VN') : '—',
          status: item.status || 'Signed',
          signedFileUrl: item.signed_file_url || '',
        }));
        setDbSignatures(mapped);
      })
      .catch(() => {
        // Fallback to mock if offline
      });
    return () => {
      active = false;
    };
  }, []);

  const combinedSignatures = [...dbSignatures, ...digitalSignatures];
  const rows = combinedSignatures.filter((item) =>
    matches(`${item.id} ${item.purpose} ${item.reference} ${item.signer} ${item.status} ${item.hash}`),
  );

  return (
    <ReviewerPageShell
      description="Đối chiếu mục đích ký, người ký, mã băm SHA-256 và trạng thái nhà cung cấp."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      onSearchChange={setQuery}
      query={query}
      title="Nhật ký chữ ký số"
    >
      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div>
            <h2>DigitalSignature</h2>
            <p>Nhật ký băm tài liệu (SHA-256) và giao dịch qua hệ thống chứng thư số nội bộ & CA.</p>
          </div>
        </div>
        <DataTable
          columns={[
            { key: 'id', label: 'Mã ký' },
            { key: 'purpose', label: 'Mục đích' },
            { key: 'reference', label: 'Hồ sơ liên kết' },
            { key: 'signer', label: 'Người ký' },
            {
              key: 'hash',
              label: 'Document hash',
              render: (row) => (
                <code style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{row.hash}</code>
              ),
            },
            { key: 'transaction', label: 'Provider transaction' },
            { key: 'signedAt', label: 'Thời gian ký' },
            {
              key: 'status',
              label: 'Trạng thái',
              render: (row) => <StatusPill>{row.status}</StatusPill>,
            },
          ]}
          rows={rows}
        />
      </section>
    </ReviewerPageShell>
  );
}

export default SignaturesPage;
