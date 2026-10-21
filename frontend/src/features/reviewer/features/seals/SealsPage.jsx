import { useState } from 'react';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function SealsPage() {
  const { seals, matches, query, setQuery, feedback, setFeedback, setModal } = useReviewerWorkspace();
  const [selected, setSelected] = useState(null);
  const rows = seals.filter((item) => matches(`${item.id} ${item.code} ${item.device} ${item.serial}`));
  return (
    <ReviewerPageShell title="Tem & thu hồi" description="Theo dõi trạng thái tem và gửi yêu cầu thu hồi khi cần." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card">
        <div className="reviewer-card-heading"><div><h2>Tem số theo thiết bị</h2><p>Tra cứu trạng thái, ngày hiệu lực và yêu cầu thu hồi.</p></div></div>
        <DataTable columns={[
          { key: 'id', label: 'Mã Seal', render: (row) => <button className="text-action" onClick={() => setSelected(row)} type="button">{row.id}</button> },
          { key: 'code', label: 'Seal code' }, { key: 'device', label: 'Thiết bị' }, { key: 'serial', label: 'Serial' },
          { key: 'certificate', label: 'Certificate' }, { key: 'calDate', label: 'Ngày hiệu chuẩn' }, { key: 'dueDate', label: 'Hạn đến' },
          { key: 'status', label: 'Trạng thái', render: (row) => <StatusPill>{row.status}</StatusPill> },
          { key: 'action', label: '', render: (row) => <button className="small-action" disabled={row.status === 'Revoked' || row.status === 'Expired' || row.revocation} onClick={() => setModal({ type: 'revocation', seal: row })} type="button">{row.revocation ? 'Đang chờ duyệt' : 'Yêu cầu thu hồi'}</button> },
        ]} rows={rows} />
        {selected && <div className="inline-detail"><strong>{selected.code} · {selected.device}</strong><p>Trạng thái {selected.status}; hiệu lực {selected.calDate}–{selected.dueDate}. {selected.revocation ? `Yêu cầu thu hồi: ${selected.revocation.reason} (${selected.revocation.status}).` : 'Chưa có yêu cầu thu hồi.'}</p><button className="small-action" onClick={() => setSelected(null)} type="button">Đóng chi tiết</button></div>}
        <p className="mock-note">Reviewer chỉ tạo yêu cầu; Signatory quyết định thu hồi và ký số ở bước tiếp theo.</p>
      </section>
    </ReviewerPageShell>
  );
}

export default SealsPage;
