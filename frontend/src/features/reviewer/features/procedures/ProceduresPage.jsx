import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  cloneProcedureApi,
  getProceduresApi,
  getServiceTypesApi,
  publishProcedureApi,
} from '../../../../services/procedure-service.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function ProceduresPage() {
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [procs, sts] = await Promise.all([
        getProceduresApi({
          status: filter,
          service_type_id: serviceFilter !== 'all' ? Number(serviceFilter) : undefined,
          search: query,
        }),
        getServiceTypesApi(),
      ]);
      setProcedures(Array.isArray(procs) ? procs : []);
      setServiceTypes(Array.isArray(sts) ? sts : []);
    } catch {
      setError('Không thể tải danh sách quy trình kỹ thuật.');
    } finally {
      setLoading(false);
    }
  }, [filter, serviceFilter, query]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublish = async (proc) => {
    if (
      !window.confirm(
        `Xác nhận phát hành "${proc.version}" của "${proc.service_type?.name}" thành ACTIVE?`
      )
    ) {
      return;
    }
    try {
      await publishProcedureApi(proc.id);
      setFeedback(`Đã phát hành Active phiên bản ${proc.version}.`);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Lỗi khi phát hành quy trình.');
    }
  };

  const handleClone = async (proc) => {
    try {
      const cloned = await cloneProcedureApi(proc.id);
      setFeedback(`Đã tạo bản nháp mới ${cloned.version} từ ${proc.version}.`);
      navigate(`/internal/head-of-tech/procedures/${cloned.id}/edit`);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Lỗi khi nhân bản quy trình.');
    }
  };

  return (
    <ReviewerPageShell
      description="Quản lý các phiên bản quy trình hiệu chuẩn/kiểm định theo chuẩn ISO/IEC 17025. Quy trình Active là bất biến; thay đổi bằng cách tạo phiên bản mới."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      onSearchChange={setQuery}
      query={query}
      title="Quy trình kỹ thuật (CalibrationProcedure)"
    >
      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div>
            <h2>Danh sách quy trình kỹ thuật</h2>
            <p>Quy trình gồm 3 cấp: CalibrationProcedure → ProcedureStep → ProcedureParameter → ProcedureTestPoint.</p>
          </div>
          <Link className="button button-primary" to="/internal/head-of-tech/procedures/new">
            + Tạo quy trình mới
          </Link>
        </div>

        {error && <div className="reviewer-feedback error">{error}</div>}

        {/* BỘ LỌC */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '14px 0' }}>
          <div className="filter-row reviewer-filter" style={{ margin: 0 }}>
            {['all', 'Draft', 'Active', 'Obsolete'].map((status) => (
              <button
                aria-pressed={filter === status}
                className={`filter-chip${filter === status ? ' selected' : ''}`}
                key={status}
                onClick={() => setFilter(status)}
                type="button"
              >
                {status === 'all' ? 'Tất cả trạng thái' : status}
              </button>
            ))}
          </div>

          <select
            className="filter-chip"
            onChange={(e) => setServiceFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #dce5eb' }}
            value={serviceFilter}
          >
            <option value="all">Tất cả loại dịch vụ (ServiceType)</option>
            {serviceTypes.map((st) => (
              <option key={st.id} value={st.id}>
                [{st.standard_code}] {st.name}
              </option>
            ))}
          </select>
        </div>

        {/* DANH SÁCH CARDS */}
        {loading ? (
          <p style={{ padding: 20 }}>Đang tải danh sách quy trình...</p>
        ) : (
          <div className="procedure-cards">
            {procedures.map((proc) => {
              const isDraft = proc.status === 'Draft';
              const isActive = proc.status === 'Active';

              return (
                <article className="procedure-card" key={proc.id}>
                  <div className="procedure-card-top">
                    <span className="procedure-icon">≡</span>
                    <div>
                      <strong>{proc.service_type?.name}</strong>
                      <small>{proc.service_type?.standard_code} · {proc.service_type?.field}</small>
                    </div>
                    <StatusPill tone={isActive ? 'success' : isDraft ? 'neutral' : 'warning'}>
                      {proc.status}
                    </StatusPill>
                  </div>

                  <div className="procedure-meta">
                    <span>
                      Phiên bản <strong>{proc.version}</strong>
                    </span>
                    <span>
                      Hiệu lực: <strong>{proc.effective_from || 'Chưa công bố'}</strong>
                    </span>
                  </div>

                  <div className="procedure-structure">
                    <span>{proc.steps?.length || 0} bước thao tác</span>
                    <span>{proc.parameters?.length || 0} thông số đo</span>
                  </div>

                  <div className="procedure-requirements">
                    <span>
                      <small>Môi trường</small>
                      {proc.environment_requirement?.temperature || '20–26 °C'},{' '}
                      {proc.environment_requirement?.humidity || '30–70 %RH'}
                    </span>
                    <span>
                      <small>Chuẩn / Thiết bị</small>
                      {proc.required_equipment?.description || 'Theo danh mục chuẩn phòng Lab'}
                    </span>
                  </div>

                  <div className="procedure-card-actions">
                    {isDraft ? (
                      <>
                        <Link
                          className="button button-secondary"
                          to={`/internal/head-of-tech/procedures/${proc.id}/steps`}
                        >
                          Cấu hình bước & thông số
                        </Link>
                        <Link
                          className="button button-primary"
                          to={`/internal/head-of-tech/procedures/${proc.id}/preview`}
                        >
                          Xem trước & Phát hành
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          className="button button-secondary"
                          to={`/internal/head-of-tech/procedures/${proc.id}`}
                        >
                          Xem chi tiết
                        </Link>
                        <button
                          className="button button-secondary"
                          onClick={() => handleClone(proc)}
                          type="button"
                        >
                          Tạo phiên bản mới
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}

            {procedures.length === 0 && (
              <div className="reviewer-empty">Không có quy trình nào phù hợp với bộ lọc hiện tại.</div>
            )}
          </div>
        )}

        <p className="mock-note">
          Bản cũ được tự động chuyển sang trạng thái Obsolete nhằm phục vụ truy vết hồ sơ kiểm định ISO 17025.
        </p>
      </section>
    </ReviewerPageShell>
  );
}

export default ProceduresPage;
