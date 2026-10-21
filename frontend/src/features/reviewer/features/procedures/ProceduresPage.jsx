import { useState } from 'react';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function ProceduresPage() {
  const { procedures, matches, query, setQuery, feedback, setFeedback, publishProcedure, setModal } = useReviewerWorkspace();
  const [filter, setFilter] = useState('all');
  const visible = procedures.filter((item) => matches(`${item.code} ${item.serviceType} ${item.status}`))
    .filter((item) => filter === 'all' || item.status === filter);
  const newVersion = (procedure) => {
    const [major = 1, minor = 0] = procedure.version.replace(/^V/i, '').split('.').map(Number);
    setModal({ type: 'procedure', procedure: { ...procedure, id: '', version: `V${major}.${minor + 1}`, status: 'Draft' } });
  };
  return (
    <ReviewerPageShell title="Quy trình kỹ thuật" description="Quản lý phiên bản quy trình và cấu hình các bước đo." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div><h2>CalibrationProcedure</h2><p>Quy trình Active chỉ được thay đổi bằng cách tạo phiên bản mới.</p></div>
          <button className="button button-primary" onClick={() => setModal({ type: 'procedure' })} type="button">+ Tạo quy trình</button>
        </div>
        <div className="filter-row reviewer-filter">
          {['all', 'Draft', 'Active', 'Obsolete'].map((status) => (
            <button aria-pressed={filter === status} className={`filter-chip${filter === status ? ' selected' : ''}`} key={status} onClick={() => setFilter(status)} type="button">
              {status === 'all' ? 'Tất cả phiên bản' : status}
            </button>
          ))}
        </div>
        <div className="procedure-cards">
          {visible.map((procedure) => (
            <article className="procedure-card" key={procedure.id}>
              <div className="procedure-card-top">
                <span className="procedure-icon">≡</span>
                <div><strong>{procedure.serviceType}</strong><small>{procedure.code}</small></div>
                <StatusPill>{procedure.status}</StatusPill>
              </div>
              <div className="procedure-meta"><span>Phiên bản <strong>{procedure.version}</strong></span><span>Hiệu lực từ <strong>{procedure.effectiveFrom}</strong></span></div>
              <div className="procedure-structure">
                <span>{procedure.steps.length} bước</span><span>{procedure.parameters.length} thông số</span>
                <span>{procedure.parameters.reduce((sum, item) => sum + (Array.isArray(item.points) ? item.points.length : item.points), 0)} điểm đo</span>
              </div>
              <div className="procedure-requirements"><span><small>Môi trường</small>{procedure.environment}</span><span><small>Chuẩn / thiết bị</small>{procedure.requiredEquipment}</span></div>
              <div className="procedure-card-actions">
                {procedure.status === 'Draft' ? (
                  <>
                    <button className="button button-secondary" onClick={() => setModal({ type: 'procedure', procedure })} type="button">Chỉnh sửa bản nháp</button>
                    <button className="button button-primary" onClick={() => publishProcedure(procedure)} type="button">Phát hành</button>
                  </>
                ) : <button className="button button-secondary" onClick={() => newVersion(procedure)} type="button">Tạo phiên bản mới</button>}
              </div>
            </article>
          ))}
          {!visible.length && <div className="reviewer-empty">Không có quy trình phù hợp với bộ lọc.</div>}
        </div>
        <p className="mock-note">Bản cũ được giữ ở trạng thái Obsolete để truy vết CalibrationRecord đã áp dụng.</p>
      </section>
    </ReviewerPageShell>
  );
}

export default ProceduresPage;
