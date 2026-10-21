import { useState } from 'react';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function CertificatesPage() {
  const { certificateList, matches, query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const [selected, setSelected] = useState(null);
  const rows = certificateList.filter((item) => matches(`${item.id} ${item.record} ${item.device} ${item.customer}`));
  return (
    <ReviewerPageShell title="Chứng chỉ" description="Tra cứu chứng chỉ, hồ sơ đo và quy trình áp dụng." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card">
        <div className="reviewer-card-heading"><div><h2>Danh sách Certificate</h2><p>Chứng chỉ liên kết bản ghi Approved và phiên bản quy trình đã áp dụng.</p></div></div>
        <DataTable columns={[
          { key: 'id', label: 'Số chứng chỉ', render: (row) => <button className="text-action" onClick={() => setSelected(row)} type="button">{row.id}</button> },
          { key: 'device', label: 'Thiết bị' }, { key: 'customer', label: 'Khách hàng' },
          { key: 'service', label: 'Dịch vụ' }, { key: 'procedure', label: 'Quy trình / phiên bản' },
          { key: 'issuedAt', label: 'Ngày phát hành' },
          { key: 'status', label: 'Trạng thái', render: (row) => <StatusPill>{row.status}</StatusPill> },
        ]} rows={rows} />
        {selected && <div className="inline-detail"><strong>{selected.id} · {selected.record}</strong><p>{selected.device} · {selected.service} · áp dụng {selected.procedure}. Chữ ký số phát hành Certificate được lưu trong DigitalSignature.</p><button className="small-action" onClick={() => setSelected(null)} type="button">Đóng chi tiết</button></div>}
      </section>
    </ReviewerPageShell>
  );
}

export default CertificatesPage;
