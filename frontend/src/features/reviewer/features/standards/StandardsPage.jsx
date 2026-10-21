import { useState } from 'react';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function StandardsPage() {
  const { standards, matches, query, setQuery, feedback, setFeedback, setModal } = useReviewerWorkspace();
  const [filter, setFilter] = useState('all');
  const visible = standards.filter((item) => matches(`${item.id} ${item.name} ${item.serial} ${item.field}`))
    .filter((item) => filter === 'all' || item.status === filter);
  return (
    <ReviewerPageShell title="Chuẩn đối chứng" description="Theo dõi thiết bị chuẩn và hạn hiệu chuẩn." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card">
        <div className="reviewer-card-heading"><div><h2>Master Standard</h2><p>Chuẩn quá hạn không được dùng để phân công.</p></div><button className="button button-primary" onClick={() => setModal({ type: 'standard' })} type="button">+ Thêm chuẩn</button></div>
        <div className="filter-row reviewer-filter">
          {['all', 'Active', 'Expired'].map((status) => <button aria-pressed={filter === status} className={`filter-chip${filter === status ? ' selected' : ''}`} key={status} onClick={() => setFilter(status)} type="button">{status === 'all' ? 'Tất cả' : status}</button>)}
        </div>
        <DataTable columns={[
          { key: 'id', label: 'Mã chuẩn' },
          { key: 'name', label: 'Chuẩn đối chứng', render: (row) => <strong>{row.name}</strong> },
          { key: 'serial', label: 'Serial' },
          { key: 'accuracy', label: 'Cấp chính xác' },
          { key: 'field', label: 'Lĩnh vực' },
          { key: 'expiry', label: 'Hạn hiệu chuẩn', render: (row) => <span className={row.status === 'Expired' ? 'text-danger' : ''}>{row.expiry}</span> },
          { key: 'status', label: 'Trạng thái', render: (row) => <StatusPill>{row.status}</StatusPill> },
          { key: 'action', label: '', render: (row) => <button className="small-action" onClick={() => setModal({ type: 'standard', standard: row })} type="button">Sửa</button> },
        ]} rows={visible} />
        <p className="mock-note">Ngày hết hạn chuẩn cần bao phủ toàn bộ scheduled_end của phân công.</p>
      </section>
    </ReviewerPageShell>
  );
}

export default StandardsPage;
