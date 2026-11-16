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
  const { session } = useAppContext();
  const currentUserId = session?.user?.id || 'guest';
  const currentUserName = session?.user?.full_name || session?.user?.name || 'Kỹ thuật viên ISOCAL';

  const tasksCacheKey = getTasksCacheKey(currentUserId);
  const queueCacheKey = getQueueCacheKey(currentUserId);
  const lastSyncCacheKey = getLastSyncCacheKey(currentUserId);

  // ─── Network & Offline States ─────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const effectiveOnline = isOnline && !simulatedOffline;

  const [syncQueue, setSyncQueue] = useState(() => {
    try {
      const cached = localStorage.getItem(queueCacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [lastSynced, setLastSynced] = useState(() => {
    return localStorage.getItem(lastSyncCacheKey) || null;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [lanIp, setLanIp] = useState('192.168.1.7');

  useEffect(() => {
    fetch('/api/v1/system/lan-ip')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.lanIp) {
          setLanIp(data.data.lanIp);
        }
      })
      .catch(() => {});
  }, []);

  // ─── Mobile View State ────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768,
  );
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── Online / Offline Event Listeners ─────────────────────────────────
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Tasks State with LocalStorage Caching ───────────────────────────
  const [tasks, setTasks] = useState(() => {
    try {
      const cached = localStorage.getItem(tasksCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((t) => t.id !== 'task-osc-sample-01');
        }
      }
    } catch (err) {
      console.warn('Lỗi đọc cache nhiệm vụ ngoại tuyến:', err);
    }
    return [];
  });

  const [selectedId, setSelectedId] = useState(() => tasks[0]?.id || '');
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
              <button
                onClick={() => setOfflineModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Connection Status Box */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  background: effectiveOnline ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${effectiveOnline ? '#bbf7d0' : '#fde68a'}`,
                  borderRadius: '10px',
                  padding: '12px',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>TÌNH TRẠNG KẾT NỐI</div>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: effectiveOnline ? '#166534' : '#b45309',
                    marginTop: '2px',
                  }}
                >
                  {effectiveOnline ? '● Đang có mạng' : '● Ngoại tuyến (Offline)'}
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>CHỜ ĐỒNG BỘ</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                  {pendingSyncCount} hồ sơ thay đổi
                </div>
              </div>
            </div>

            {/* Offline simulation toggle (For field testing) */}
            <div
              style={{
                background: '#f1f5f9',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                  Chế độ mô phỏng mất mạng (Field Test)
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                  Bật công tắc này để kiểm thử thao tác như đang làm việc tại hầm/phòng kín không sóng
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  checked={simulatedOffline}
                  onChange={(e) => setSimulatedOffline(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  type="checkbox"
                />
              </label>
            </div>

            {/* Details of Cached Storage */}
            <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '16px', lineHeight: 1.6 }}>
              <div>• <strong>Bộ nhớ cục bộ:</strong> Đang lưu trữ {tasks.length} nhiệm vụ và ảnh minh chứng.</div>
              <div>• <strong>Đồng bộ lần cuối:</strong> {lastSynced || 'Chưa thực hiện trong phiên này'}.</div>
              <div>• <strong>Bảo mật:</strong> Dữ liệu được mã hóa trong Local Storage của trình duyệt di động.</div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="small-action"
                onClick={async () => {
                  if (window.confirm('Bạn có chắc muốn xóa bộ nhớ ngoại tuyến và tải lại danh sách từ máy chủ?')) {
                    localStorage.removeItem(tasksCacheKey);
                    localStorage.removeItem(queueCacheKey);
                    setSyncQueue([]);
                    if (effectiveOnline) {
                      try {
                        const remote = await getTechnicianTasksApi();
                        saveTasks(Array.isArray(remote) ? remote : []);
                      } catch {
                        saveTasks([]);
                      }
                    } else {
                      saveTasks([]);
                    }
                    setNotice('Đã làm mới danh sách nhiệm vụ từ máy chủ.');
                    setOfflineModalOpen(false);
                  }
                }}
                style={{ color: '#ef4444' }}
                type="button"
              >
                Làm mới từ máy chủ
              </button>

              <button
                className="small-action"
                onClick={() => setOfflineModalOpen(false)}
                type="button"
              >
                Đóng
              </button>

              <button
                className="button button-primary"
                disabled={!effectiveOnline || isSyncing}
                onClick={handleSyncNow}
                style={{ padding: '8px 18px', fontWeight: 700 }}
                type="button"
              >
                {isSyncing ? 'Đang gửi dữ liệu...' : 'Đồng bộ ngay lên máy chủ ⟳'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Mobile App Installation Guide (QR Code) ────────── */}
      {installGuideOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setInstallGuideOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                  📱 Hướng dẫn cài đặt Ứng dụng ISOCAL Tech lên Điện thoại
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Cài đặt dưới dạng Progressive Web App (PWA) — Chạy offline như app tải từ App Store / CH Play
                </p>
              </div>
              <button
                onClick={() => setInstallGuideOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}
                type="button"
              >
                ✕
              </button>
            </div>

            {/* QR Code & Direct Link */}
            <div
              style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <img
                  alt="QR Code"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                    typeof window !== 'undefined'
                      ? `${window.location.protocol}//${window.location.hostname === 'localhost' ? lanIp : window.location.hostname}:${window.location.port}/mobile/technician`
                      : `http://${lanIp}:5173/mobile/technician`,
                  )}`}
                  style={{ width: '130px', height: '130px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                />
                <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700, marginTop: '4px' }}>
                  Quét bằng Camera điện thoại
                </div>
              </div>
              <p className="measurement-disclaimer">
                {selectedTask.kind === 'Kiểm định'
                  ? 'Gợi ý đạt/không đạt chỉ dựa trên dung sai minh họa; kết luận kiểm định cuối cùng phải được xác nhận theo quy trình áp dụng.'
                  : 'Độ lệch được tính để tham khảo; đánh giá kết quả cần được xác nhận theo quy trình hiệu chuẩn áp dụng.'}
              </p>
            </section>

            <div className="submit-review-bar">
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  1. Mở liên kết trên điện thoại (Cùng mạng Wifi):
                </div>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#0284c7',
                    fontWeight: 700,
                    wordBreak: 'break-all',
                    marginBottom: '8px',
                  }}
                >
                  {typeof window !== 'undefined'
                    ? `${window.location.protocol}//${window.location.hostname === 'localhost' ? lanIp : window.location.hostname}:${window.location.port}/mobile/technician`
                    : `http://${lanIp}:5173/mobile/technician`}
                </div>
                <button
                  onClick={() => {
                    const url = typeof window !== 'undefined'
                      ? `${window.location.protocol}//${window.location.hostname === 'localhost' ? lanIp : window.location.hostname}:${window.location.port}/mobile/technician`
                      : `http://${lanIp}:5173/mobile/technician`;
                    navigator.clipboard?.writeText(url);
                    alert('Đã sao chép liên kết vào bộ nhớ tạm!');
                  }}
                  style={{
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#334155',
                  }}
                  type="button"
                >
                  📋 Sao chép liên kết
                </button>
              </div>
            </div>

            {/* Step-by-step for Android & iOS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              {/* Android */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '0.75rem',
                  color: '#166534',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🤖</span> Điện thoại Android (Chrome)
                </div>
                <ol style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.6 }}>
                  <li>Mở link bằng <strong>Google Chrome</strong>.</li>
                  <li>Bấm vào biểu tượng <strong>ba chấm (⋮)</strong> ở góc trên bên phải.</li>
                  <li>Chọn <strong>"Cài đặt ứng dụng"</strong> (hoặc "Thêm vào màn hình chính").</li>
                  <li>Bấm <strong>Cài đặt</strong> để đưa biểu tượng app ra Home Screen.</li>
                </ol>
              </div>

              {/* iPhone iOS */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '0.75rem',
                  color: '#1e293b',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🍎</span> Điện thoại iPhone (Safari)
                </div>
                <ol style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.6 }}>
                  <li>Mở link bằng trình duyệt <strong>Safari</strong>.</li>
                  <li>Bấm nút <strong>Chia sẻ (hình vuông có mũi tên ↑)</strong> ở thanh dưới.</li>
                  <li>Cuộn xuống chọn <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.</li>
                  <li>Bấm <strong>Thêm (Add)</strong> ở góc trên bên phải.</li>
                </ol>
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
