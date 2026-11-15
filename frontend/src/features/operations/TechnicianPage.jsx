import { useMemo, useState } from 'react';
import { initialTechnicianTasks } from './mockData.js';
import './operations.css';

const inspectionCanProceed = (task) => Boolean(task.inspection === 'Pass'
  || (task.inspection === 'Fail'
    && task.consent
    && task.defectNote.trim()
    && task.inspectionPhoto));

const isTaskReady = (task) => inspectionCanProceed(task)
  && task.steps.every((step) => step.done && (!step.evidence || step.file))
  && task.measurements.every((measurement) => measurement.measured !== '');

const getDeviation = (measurement) => {
  if (measurement.measured === '') return null;
  return (Number(measurement.measured) - Number(measurement.reference)).toFixed(3);
};

const getVerificationHint = (measurement) => {
  if (measurement.measured === '') return null;
  const tolerance = Number(measurement.tolerance.replace(/[^\d.-]/g, ''));
  const deviation = Number(measurement.measured) - Number(measurement.reference);
  return Math.abs(deviation) <= tolerance ? 'Gợi ý đạt' : 'Cần xem xét';
};

function TechnicianPage() {
  const [tasks, setTasks] = useState(initialTechnicianTasks);
  const [selectedId, setSelectedId] = useState(initialTechnicianTasks[0].id);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query
      || `${task.workOrder} ${task.device} ${task.serial} ${task.customer}`.toLowerCase().includes(query);
    const matchesFilter = filter === 'all'
      || (filter === 'in-progress' && !task.submitted && task.inspection)
      || (filter === 'new' && !task.submitted && !task.inspection)
      || (filter === 'submitted' && task.submitted);
    return matchesSearch && matchesFilter;
  }), [filter, search, tasks]);

  const selectedTask = tasks.find((task) => task.id === selectedId);
  const completedCount = tasks.filter((task) => task.submitted).length;
  const activeCount = tasks.length - completedCount;
  const updateTask = (taskId, update) => {
    setTasks((currentTasks) => currentTasks.map((task) => (
      task.id === taskId ? update(task) : task
    )));
    setNotice('');
  };

  const toggleStep = (stepId) => updateTask(selectedTask.id, (task) => ({
    ...task,
    steps: task.steps.map((step) => step.id === stepId ? { ...step, done: !step.done } : step),
  }));

  const setEvidenceFile = (stepId, file) => updateTask(selectedTask.id, (task) => ({
    ...task,
    steps: task.steps.map((step) => step.id === stepId ? { ...step, file: file?.name || '' } : step),
  }));

  const setMeasurement = (measurementId, value) => updateTask(selectedTask.id, (task) => ({
    ...task,
    measurements: task.measurements.map((measurement) => (
      measurement.id === measurementId ? { ...measurement, measured: value } : measurement
    )),
  }));

  const submitRecord = () => {
    if (!selectedTask || !isTaskReady(selectedTask)) {
      setNotice('Vui lòng hoàn tất kiểm tra, các bước quy trình, minh chứng và số liệu trước khi trình.');
      return;
    }
    updateTask(selectedTask.id, (task) => ({ ...task, signed: true, submitted: true }));
    setNotice('Đã ký số mô phỏng và trình hồ sơ tới Reviewer.');
  };

  return (
    <div className="operations-page technician-page">
      <div className="operations-heading">
        <div>
          <p className="eyebrow">KHU VỰC KỸ THUẬT VIÊN</p>
          <h1>Công việc của tôi</h1>
          <p className="operations-subtitle">Thực hiện kiểm tra, ghi kết quả đo và trình hồ sơ soát xét.</p>
        </div>
        <span className="demo-pill"><span /> Dữ liệu minh họa</span>
      </div>

      <div className="operations-stats technician-stats">
        <article className="stat-card">
          <span className="stat-icon blue" aria-hidden="true">▤</span>
          <div><span>Được phân công</span><strong>{tasks.length}</strong></div>
          <small>Thiết bị cần thực hiện</small>
        </article>
        <article className="stat-card">
          <span className="stat-icon amber" aria-hidden="true">◷</span>
          <div><span>Đang thực hiện</span><strong>{activeCount}</strong></div>
          <small>Hồ sơ chưa trình soát xét</small>
        </article>
        <article className="stat-card">
          <span className="stat-icon green" aria-hidden="true">✓</span>
          <div><span>Đã trình</span><strong>{completedCount}</strong></div>
          <small>Chờ Reviewer xử lý</small>
        </article>
      </div>

      <div className="technician-workspace">
        <aside className="task-panel">
          <div className="task-panel-heading">
            <div>
              <h2>Lịch công việc</h2>
              <p>{visibleTasks.length} thiết bị</p>
            </div>
          </div>
          <label className="search-field task-search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Tìm trong lịch công việc"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm thiết bị, số serial..."
              value={search}
            />
          </label>
          <div className="task-filters">
            {[
              ['all', 'Tất cả'],
              ['new', 'Mới'],
              ['in-progress', 'Đang làm'],
              ['submitted', 'Đã trình'],
            ].map(([value, label]) => (
              <button
                aria-pressed={filter === value}
                className={`task-filter${filter === value ? ' active' : ''}`}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="task-list">
            {visibleTasks.map((task) => (
              <button
                aria-current={selectedId === task.id ? 'true' : undefined}
                className={`task-list-item${selectedId === task.id ? ' current' : ''}`}
                key={task.id}
                onClick={() => { setSelectedId(task.id); setNotice(''); }}
                type="button"
              >
                <span className="task-device-icon" aria-hidden="true">⌁</span>
                <span className="task-list-copy">
                  <strong>{task.device}</strong>
                  <small>{task.model} · {task.serial}</small>
                  <small>{task.scheduled}</small>
                  <span className={`status-badge ${task.submitted ? 'status-submitted' : task.inspection ? 'status-progress' : 'status-new'}`}>
                    {task.submitted ? 'Đã trình soát xét' : task.inspection ? 'Đang thực hiện' : 'Chưa bắt đầu'}
                  </span>
                </span>
              </button>
            ))}
            {!visibleTasks.length && (
              <div className="task-empty">
                <strong>Không có công việc</strong>
                <span>Thử thay đổi từ khóa hoặc bộ lọc.</span>
              </div>
            )}
          </div>
        </aside>

        {selectedTask ? (
          <section aria-label="Chi tiết công việc" className="task-detail">
            <div className="task-detail-heading">
              <div>
                <div className="detail-meta"><span>{selectedTask.workOrder}</span><i>·</i><span>{selectedTask.scheduled}</span></div>
                <h2>{selectedTask.device}</h2>
                <p>{selectedTask.customer}</p>
              </div>
              <span className={`status-badge detail-status ${selectedTask.submitted ? 'status-submitted' : selectedTask.inspection ? 'status-progress' : 'status-new'}`}>
                {selectedTask.submitted ? 'Đã trình soát xét' : selectedTask.inspection ? 'Đang thực hiện' : 'Chưa bắt đầu'}
              </span>
            </div>

            <div className="device-summary">
              <div><span>Mã thiết bị</span><strong>{selectedTask.model}</strong><small>Serial: {selectedTask.serial}</small></div>
              <div><span>Dịch vụ</span><strong>{selectedTask.kind}</strong><small>{selectedTask.service}</small></div>
              <div><span>Địa điểm</span><strong>{selectedTask.location}</strong><small>Quy trình: {selectedTask.procedure}</small></div>
            </div>

            {notice && (
              <div className={`task-notice${selectedTask.submitted ? ' success' : ''}`} role={selectedTask.submitted ? 'status' : 'alert'}>
                <span aria-hidden="true">{selectedTask.submitted ? '✓' : 'i'}</span>{notice}
              </div>
            )}

            <section className="workflow-section">
              <div className="section-title">
                <span className={`workflow-number ${selectedTask.inspection ? 'step-complete' : ''}`}>1</span>
                <div><h3>Kiểm tra ban đầu</h3><p>Cổng kiểm tra trước khi bắt đầu đo</p></div>
                {selectedTask.inspection && (
                  <span className={`status-badge ${selectedTask.inspection === 'Pass' ? 'status-submitted' : 'status-progress'}`}>
                    {selectedTask.inspection === 'Pass' ? 'Đạt' : 'Không đạt'}
                  </span>
                )}
              </div>
              <p className="inspection-prompt">Ghi nhận tình trạng thiết bị sau khi kiểm tra ngoại quan và chức năng cơ bản.</p>
              <div className="inspection-options" role="group" aria-label="Kết quả kiểm tra ban đầu">
                <button
                  aria-pressed={selectedTask.inspection === 'Pass'}
                  className={`inspection-option${selectedTask.inspection === 'Pass' ? ' chosen pass' : ''}`}
                  disabled={selectedTask.submitted}
                  onClick={() => updateTask(selectedTask.id, (task) => ({ ...task, inspection: 'Pass', consent: false }))}
                  type="button"
                >
                  <span className="option-check">✓</span><span><strong>Đạt</strong><small>Thiết bị đủ điều kiện thực hiện</small></span>
                </button>
                <button
                  aria-pressed={selectedTask.inspection === 'Fail'}
                  className={`inspection-option${selectedTask.inspection === 'Fail' ? ' chosen fail' : ''}`}
                  disabled={selectedTask.submitted}
                  onClick={() => updateTask(selectedTask.id, (task) => ({ ...task, inspection: 'Fail', consent: false }))}
                  type="button"
                >
                  <span className="option-check">!</span><span><strong>Không đạt</strong><small>Cần ghi nhận lỗi và xử lý tiếp</small></span>
                </button>
              </div>
              {selectedTask.inspection === 'Fail' && (
                <div className="consent-box">
                  <p>Ghi nhận lỗi và ảnh minh chứng. Chỉ tiếp tục hiệu chuẩn khi có xác nhận bằng văn bản của khách hàng.</p>
                  <label className="defect-note-label" htmlFor={`defect-note-${selectedTask.id}`}>Mô tả lỗi <span>*</span></label>
                  <textarea
                    disabled={selectedTask.submitted}
                    id={`defect-note-${selectedTask.id}`}
                    onChange={(event) => updateTask(selectedTask.id, (task) => ({ ...task, defectNote: event.target.value }))}
                    placeholder="Mô tả tình trạng bất thường của thiết bị..."
                    rows="2"
                    value={selectedTask.defectNote}
                  />
                  <label className="file-picker inspection-file-picker">
                    <input
                      accept="image/*"
                      disabled={selectedTask.submitted}
                      onChange={(event) => updateTask(selectedTask.id, (task) => ({
                        ...task,
                        inspectionPhoto: event.target.files?.[0]?.name || '',
                      }))}
                      type="file"
                    />
                    <span aria-hidden="true">＋</span>
                    {selectedTask.inspectionPhoto ? 'Đổi ảnh tình trạng' : 'Đính kèm ảnh tình trạng *'}
                  </label>
                  {selectedTask.inspectionPhoto && <span className="file-name">{selectedTask.inspectionPhoto}</span>}
                  <label>
                    <input
                      checked={selectedTask.consent}
                      disabled={selectedTask.submitted}
                      onChange={(event) => updateTask(selectedTask.id, (task) => ({ ...task, consent: event.target.checked }))}
                      type="checkbox"
                    />
                    Đã nhận được xác nhận của khách hàng đồng ý tiếp tục hiệu chuẩn
                  </label>
                </div>
              )}
            </section>

            <section className={`workflow-section${!inspectionCanProceed(selectedTask) ? ' section-locked' : ''}`}>
              <div className="section-title">
                <span className={`workflow-number ${selectedTask.steps.every((step) => step.done) ? 'step-complete' : ''}`}>2</span>
                <div><h3>Thực hiện quy trình</h3><p>{selectedTask.procedure}</p></div>
              </div>
              <div className="environment-callout">
                <span aria-hidden="true">⌂</span>
                <div><strong>Yêu cầu môi trường</strong><span>{selectedTask.environment}</span></div>
                <span className="environment-value">Ghi nhận tại phòng đo</span>
              </div>
              {!inspectionCanProceed(selectedTask) && (
                <p className="locked-hint">
                  {selectedTask.inspection === 'Fail'
                    ? 'Cần mô tả lỗi, ảnh minh chứng và xác nhận của khách hàng trước khi tiếp tục.'
                    : 'Chọn kết quả kiểm tra ban đầu để mở các bước thực hiện.'}
                </p>
              )}
              <div className="procedure-steps">
                {selectedTask.steps.map((step, index) => (
                  <article className={`procedure-step${step.done ? ' done' : ''}`} key={step.id}>
                    <span className="procedure-step-number">{step.done ? '✓' : String(index + 1).padStart(2, '0')}</span>
                    <div className="procedure-step-content">
                      <div className="procedure-step-title">
                        <strong>{step.title}</strong>
                        {step.evidence && <span className="evidence-required">Cần minh chứng</span>}
                      </div>
                      {step.evidence && (
                        <div className="evidence-control">
                          <label className="file-picker">
                            <input
                              accept="image/*,.pdf"
                              disabled={selectedTask.submitted || !inspectionCanProceed(selectedTask)}
                              onChange={(event) => setEvidenceFile(step.id, event.target.files?.[0])}
                              type="file"
                            />
                            <span aria-hidden="true">＋</span>{step.file ? 'Đổi tệp minh chứng' : 'Đính kèm ảnh / biên bản'}
                          </label>
                          {step.file && <span className="file-name">{step.file}</span>}
                        </div>
                      )}
                    </div>
                    <label className="step-done-control">
                      <input
                        checked={step.done}
                        disabled={selectedTask.submitted || !inspectionCanProceed(selectedTask) || (step.evidence && !step.file)}
                        onChange={() => toggleStep(step.id)}
                        type="checkbox"
                      />
                      <span>{step.done ? 'Hoàn tất' : 'Đánh dấu xong'}</span>
                    </label>
                  </article>
                ))}
              </div>
            </section>

            <section className={`workflow-section${!inspectionCanProceed(selectedTask) ? ' section-locked' : ''}`}>
              <div className="section-title">
                <span className={`workflow-number ${selectedTask.measurements.every((measurement) => measurement.measured !== '') ? 'step-complete' : ''}`}>3</span>
                <div><h3>Kết quả đo</h3><p>Nhập số đọc thực tế cho từng điểm đo</p></div>
                <span className="measurement-unit-note">Độ lệch = Giá trị đo − Giá trị chuẩn</span>
              </div>
              <div className="measurement-table-wrap">
                <table className="measurement-table">
                  <thead>
                    <tr>
                      <th>Điểm đo</th><th>Giá trị chuẩn</th><th>Giá trị đo</th><th>Dung sai</th><th>Độ lệch</th>
                      {selectedTask.kind === 'Kiểm định' && <th>Gợi ý</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTask.measurements.map((measurement) => (
                      <tr key={measurement.id}>
                        <td><strong>{measurement.point}</strong></td>
                        <td>{measurement.reference} <small>{measurement.unit}</small></td>
                        <td>
                          <label className="measurement-input">
                            <input
                              aria-label={`Giá trị đo ${measurement.point}`}
                              disabled={selectedTask.submitted || !inspectionCanProceed(selectedTask)}
                              inputMode="decimal"
                              onChange={(event) => setMeasurement(measurement.id, event.target.value)}
                              placeholder="Nhập số đo"
                              type="number"
                              value={measurement.measured}
                            />
                            <span>{measurement.unit}</span>
                          </label>
                        </td>
                        <td>{measurement.tolerance}</td>
                        <td className={getDeviation(measurement) === null ? 'deviation-empty' : 'deviation-value'}>
                          {getDeviation(measurement) === null ? '—' : `${getDeviation(measurement)} ${measurement.unit}`}
                        </td>
                        {selectedTask.kind === 'Kiểm định' && (
                          <td>
                            {getVerificationHint(measurement) ? (
                              <span className={`evaluation-hint ${getVerificationHint(measurement) === 'Gợi ý đạt' ? 'within-limit' : 'outside-limit'}`}>
                                {getVerificationHint(measurement)}
                              </span>
                            ) : <span className="deviation-empty">—</span>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="measurement-disclaimer">
                {selectedTask.kind === 'Kiểm định'
                  ? 'Gợi ý đạt/không đạt chỉ dựa trên dung sai minh họa; kết luận kiểm định cuối cùng phải được xác nhận theo quy trình áp dụng.'
                  : 'Độ lệch được tính để tham khảo; đánh giá kết quả cần được xác nhận theo quy trình hiệu chuẩn áp dụng.'}
              </p>
            </section>

            <div className="submit-review-bar">
              <div>
                <strong>{selectedTask.submitted ? 'Hồ sơ đã được trình' : 'Hoàn tất và trình soát xét'}</strong>
                <span>
                  {selectedTask.submitted
                    ? 'Bản ghi đã ký số mô phỏng và đang chờ Reviewer.'
                    : 'Hệ thống sẽ ký số mô phỏng bản ghi đo trước khi trình Reviewer.'}
                </span>
              </div>
              <button
                className="button button-primary"
                disabled={selectedTask.submitted || !isTaskReady(selectedTask)}
                onClick={submitRecord}
                type="button"
              >
                {selectedTask.submitted ? 'Đã trình soát xét' : 'Ký số & trình soát xét'}
              </button>
            </div>
            <p className="mock-note">
              <strong>Lưu ý:</strong> Dữ liệu, minh chứng và thao tác ký số chỉ mô phỏng trên giao diện; chưa lưu lên máy chủ.
            </p>
          </section>
        ) : (
          <section aria-label="Chi tiết công việc" className="task-detail task-detail-empty">
            <span aria-hidden="true">▤</span>
            <h2>Chọn công việc để bắt đầu</h2>
            <p>Chọn một thiết bị trong lịch công việc để xem quy trình và nhập kết quả.</p>
          </section>
        )}
      </div>
    </div>
  );
}

export default TechnicianPage;
