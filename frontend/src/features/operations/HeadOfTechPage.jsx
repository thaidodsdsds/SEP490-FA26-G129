import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  deleteWorkOrderAssignmentApi,
  getAssignmentResourcesApi,
  getWorkOrderAssignmentsListApi,
  saveWorkOrderAssignmentApi,
} from '../../services/work-order-service.js';
import './operations.css';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const toInputDateTime = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatSchedule = (startVal, endVal) => {
  if (!startVal) return 'Chưa xếp lịch';
  const start = new Date(startVal);
  if (Number.isNaN(start.getTime())) return 'Chưa xếp lịch';
  const startStr = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(start);
  if (!endVal) return startStr;
  const end = new Date(endVal);
  const endStr = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(end);
  return `${startStr} – ${endStr}`;
};

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

function HeadOfTechPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({
    total_devices: 0,
    assigned_devices: 0,
    unassigned_devices: 0,
  });
  const [resources, setResources] = useState({
    technicians: [],
    master_standards: [],
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [assignment, setAssignment] = useState(null);
  const [formError, setFormError] = useState('');
  const assignmentModalRef = useRef(null);
  const assignmentOpen = Boolean(assignment);

  // Load assignments and resources from Backend API
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentsRes, resourcesRes] = await Promise.all([
        getWorkOrderAssignmentsListApi(),
        getAssignmentResourcesApi(),
      ]);
      setOrders(assignmentsRes.orders || []);
      setSummary(
        assignmentsRes.summary || {
          total_devices: 0,
          assigned_devices: 0,
          unassigned_devices: 0,
        },
      );
      setResources(resourcesRes || { technicians: [], master_standards: [] });
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Không thể tải dữ liệu phân công công việc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Modal accessibility & focus management
  useEffect(() => {
    if (!assignmentOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    assignmentModalRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setAssignment(null);
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = assignmentModalRef.current;
      if (!dialog) return;

      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('disabled') && element.offsetParent !== null,
      );
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [assignmentOpen]);

  // Filter & Search logic
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .map((order) => {
        const matchingItems = order.items.filter((item) => {
          const matchQuery =
            !q ||
            `${order.work_order_code} ${order.customer_name} ${item.device_name} ${item.model || ''} ${item.serial_number || ''} ${item.assignment?.technician?.name || ''}`
              .toLowerCase()
              .includes(q);

          const isAssigned = Boolean(item.assignment);
          const matchFilter =
            filter === 'all' ||
            (filter === 'unassigned' && !isAssigned) ||
            (filter === 'assigned' && isAssigned);

          return matchQuery && matchFilter;
        });

        return { ...order, items: matchingItems };
      })
      .filter((order) => order.items.length > 0);
  }, [orders, search, filter]);

  // Open modal for a specific device item
  const openAssignment = (order, item) => {
    setFormError('');

    // Default start/end: tomorrow at 08:30 to 11:30 if not already set
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() + 1);
    defaultStart.setHours(8, 30, 0, 0);

    const defaultEnd = new Date(defaultStart);
    defaultEnd.setHours(11, 30, 0, 0);

    setAssignment({
      orderId: order.work_order_id,
      orderCode: order.work_order_code,
      serviceRequestItemId: item.service_request_item_id,
      device: item.device_name,
      model: item.model,
      serial: item.serial_number,
      customer: order.customer_name,
      technicianId: item.assignment?.technician?.id ? String(item.assignment.technician.id) : '',
      masterStandardId: item.assignment?.master_standard?.id
        ? String(item.assignment.master_standard.id)
        : '',
      scheduledStart: item.assignment?.scheduled_start
        ? toInputDateTime(item.assignment.scheduled_start)
        : toInputDateTime(defaultStart),
      scheduledEnd: item.assignment?.scheduled_end
        ? toInputDateTime(item.assignment.scheduled_end)
        : toInputDateTime(defaultEnd),
      assignmentId: item.assignment?.id || null,
    });
  };

  const updateAssignmentField = (event) => {
    const { name, value } = event.target;
    setAssignment((current) => ({ ...current, [name]: value }));
  };

  // Find currently selected master standard for instant validation feedback
  const selectedStandard = useMemo(() => {
    if (!assignment?.masterStandardId) return null;
    return (
      resources.master_standards.find((s) => String(s.id) === String(assignment.masterStandardId)) ||
      null
    );
  }, [assignment?.masterStandardId, resources.master_standards]);

  // Calculate schedule duration in hours & minutes
  const scheduleDurationText = useMemo(() => {
    if (!assignment?.scheduledStart || !assignment?.scheduledEnd) return null;
    const start = new Date(assignment.scheduledStart);
    const end = new Date(assignment.scheduledEnd);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return null;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours > 0 ? `${hours} giờ ` : ''}${mins > 0 ? `${mins} phút` : ''}`.trim();
  }, [assignment?.scheduledStart, assignment?.scheduledEnd]);

  // Save Assignment
  const handleSaveAssignment = async (event) => {
    event.preventDefault();
    setFormError('');

    const start = new Date(assignment.scheduledStart);
    const end = new Date(assignment.scheduledEnd);

    if (end <= start) {
      setFormError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    if (!selectedStandard) {
      setFormError('Vui lòng chọn chuẩn đối chứng.');
      return;
    }

    // CHECK CHUẨN CÒN HẠN
    const expiry = new Date(selectedStandard.calibration_expiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!selectedStandard.is_valid || expiry < today) {
      setFormError(
        `Chuẩn "${selectedStandard.name}" đã hết hạn vào ngày ${formatDate(
          selectedStandard.calibration_expiry,
        )}. Không thể sử dụng để phân công hiệu chuẩn!`,
      );
      return;
    }

    const scheduleEndDate = new Date(end);
    scheduleEndDate.setHours(0, 0, 0, 0);
    if (expiry < scheduleEndDate) {
      setFormError(
        `Chuẩn "${selectedStandard.name}" sẽ hết hạn vào ngày ${formatDate(
          selectedStandard.calibration_expiry,
        )}, trước khi kết thúc lịch hẹn. Vui lòng chọn chuẩn có hạn dài hơn!`,
      );
      return;
    }

    setSaving(true);
    try {
      await saveWorkOrderAssignmentApi({
        work_order_id: assignment.orderId,
        service_request_item_id: assignment.serviceRequestItemId,
        technician_id: Number(assignment.technicianId),
        master_standard_id: Number(assignment.masterStandardId),
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
      });

      setFeedback({
        message: `Đã phân công thành công thiết bị "${assignment.device}" trong lệnh ${assignment.orderCode}.`,
        tone: 'success',
      });
      setAssignment(null);
      await loadData();
    } catch (err) {
      setFormError(err?.response?.data?.error?.message || 'Không thể lưu phân công thiết bị.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Assignment (Hủy phân công)
  const handleDeleteAssignment = async () => {
    if (!assignment?.assignmentId) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy phân công cho thiết bị này?')) return;

    setSaving(true);
    try {
      await deleteWorkOrderAssignmentApi(assignment.assignmentId);
      setFeedback({
        message: `Đã hủy phân công cho thiết bị "${assignment.device}".`,
        tone: 'success',
      });
      setAssignment(null);
      await loadData();
    } catch (err) {
      setFormError(err?.response?.data?.error?.message || 'Không thể hủy phân công.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="operations-page reviewer-page">
      {/* ─── Heading ────────────────────────────────────────────── */}
      <div className="operations-heading">
        <div>
          <p className="eyebrow">ĐIỀU PHỐI KỸ THUẬT</p>
          <h1>Phân công theo từng thiết bị</h1>
          <p className="operations-subtitle">
            Chỉ định kỹ thuật viên phụ trách, kiểm tra chuẩn đối chứng còn hạn và ấn định lịch hẹn đo kiểm cho từng thiết bị trong Work Order.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="filter-chip"
            onClick={loadData}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            title="Tải lại dữ liệu"
            type="button"
          >
            <span>↻</span> Làm mới
          </button>
        </div>
      </div>

      {/* ─── Feedback Toast / Alert ─────────────────────────────── */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={`reviewer-feedback ${feedback.tone}`}
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: -6 }}
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              background: feedback.tone === 'success' ? '#f0fdf4' : '#fef2f2',
              color: feedback.tone === 'success' ? '#15803d' : '#b91c1c',
              border: `1px solid ${feedback.tone === 'success' ? '#bbf7d0' : '#fecaca'}`,
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <span>{feedback.message}</span>
            <button
              aria-label="Đóng"
              onClick={() => setFeedback(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
              type="button"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Stats Cards ────────────────────────────────────────── */}
      <div className="operations-stats">
        <article className="stat-card" onClick={() => setFilter('all')} style={{ cursor: 'pointer' }}>
          <span aria-hidden="true" className="stat-icon blue">
            ▤
          </span>
          <div>
            <span>Tổng thiết bị</span>
            <strong>{summary.total_devices}</strong>
          </div>
          <small>Trong các lệnh cần xử lý</small>
        </article>

        <article className="stat-card" onClick={() => setFilter('unassigned')} style={{ cursor: 'pointer' }}>
          <span aria-hidden="true" className="stat-icon amber">
            ◷
          </span>
          <div>
            <span>Chờ phân công</span>
            <strong style={{ color: '#d97706' }}>{summary.unassigned_devices}</strong>
          </div>
          <small>Chưa chỉ định KTV / Chuẩn</small>
        </article>

        <article className="stat-card" onClick={() => setFilter('assigned')} style={{ cursor: 'pointer' }}>
          <span aria-hidden="true" className="stat-icon green">
            ✓
          </span>
          <div>
            <span>Đã phân công</span>
            <strong style={{ color: '#16a34a' }}>{summary.assigned_devices}</strong>
          </div>
          <small>Đã có KTV & Lịch hẹn</small>
        </article>
      </div>

      {/* ─── Main Work Panel ────────────────────────────────────── */}
      <section className="work-panel">
        <div className="panel-toolbar">
          <div>
            <h2>Work Order & Hạng mục thiết bị</h2>
            <p>
              {filteredOrders.length} Work Order · {filteredOrders.reduce((sum, o) => sum + o.items.length, 0)} thiết bị phù hợp
            </p>
          </div>
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Tìm Work Order, khách hàng hoặc thiết bị"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm mã lệnh, khách hàng, thiết bị, serial, KTV..."
              value={search}
            />
          </label>
        </div>

        {/* Filter Chips */}
        <div aria-label="Lọc thiết bị" className="filter-row">
          {[
            ['all', 'Tất cả thiết bị'],
            ['unassigned', 'Chờ phân công'],
            ['assigned', 'Đã phân công'],
          ].map(([value, label]) => (
            <button
              aria-pressed={filter === value}
              className={`filter-chip${filter === value ? ' selected' : ''}`}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Work Orders List */}
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            Đang tải danh sách thiết bị và tiến độ phân công...
          </div>
        ) : error ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#dc2626' }}>
            {error}
            <div style={{ marginTop: '12px' }}>
              <button className="button button-secondary" onClick={loadData} type="button">
                Thử lại
              </button>
            </div>
          </div>
        ) : filteredOrders.length ? (
          <div className="work-order-list">
            {filteredOrders.map((order) => (
              <article className="work-order-card" key={order.work_order_id}>
                {/* Work Order Header */}
                <div className="work-order-heading">
                  <div className="work-order-id">
                    <span aria-hidden="true" className="order-mark">
                      WO
                    </span>
                    <div>
                      <strong style={{ fontSize: '0.92rem' }}>{order.work_order_code}</strong>
                      <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{order.customer_name}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.67rem',
                        fontWeight: 700,
                        background: order.location_type === 'In-lab' ? '#eef7ee' : '#fdf3e7',
                        color: order.location_type === 'In-lab' ? '#2e7d32' : '#b25e09',
                      }}
                    >
                      {order.location_type === 'In-lab' ? 'Lab ISOCAL' : 'Tại hiện trường'}
                    </span>
                    <span
                      className={`priority-tag ${
                        order.priority === 'Ưu tiên' ? 'priority-high' : ''
                      }`}
                    >
                      {order.priority}
                    </span>
                  </div>
                </div>

                {/* Table of Devices */}
                <div className="assignment-table">
                  <div className="assignment-table-head">
                    <span>Thiết bị & Dịch vụ</span>
                    <span>Kỹ thuật viên</span>
                    <span>Chuẩn đối chứng</span>
                    <span>Lịch hẹn đo kiểm</span>
                    <span aria-label="Thao tác" />
                  </div>

                  {order.items.map((item) => {
                    const asg = item.assignment;
                    return (
                      <div className="assignment-row" key={item.service_request_item_id}>
                        {/* Device Info */}
                        <div className="device-cell">
                          <strong>{item.device_name}</strong>
                          <span>
                            {item.model ? `Model: ${item.model} · ` : ''}
                            {item.serial_number ? `SN: ${item.serial_number}` : 'Chưa có SN'}
                          </span>
                          <small style={{ color: '#2563eb' }}>{item.service_name}</small>
                        </div>

                        {/* Technician */}
                        <div className="assignment-person">
                          {asg?.technician ? (
                            <>
                              <span className="mini-avatar">
                                {asg.technician.name
                                  .trim()
                                  .split(/\s+/)
                                  .slice(-2)
                                  .map((p) => p[0])
                                  .join('')
                                  .toUpperCase()}
                              </span>
                              <div>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                  {asg.technician.name}
                                </span>
                                {asg.technician.phone && (
                                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                                    {asg.technician.phone}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <span
                              style={{
                                color: '#d97706',
                                background: '#fffbeb',
                                border: '1px solid #fef3c7',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                              }}
                            >
                              Chờ phân công
                            </span>
                          )}
                        </div>

                        {/* Master Standard */}
                        <div className="assignment-standard">
                          {asg?.master_standard ? (
                            <div>
                              <strong style={{ fontSize: '0.78rem', color: '#1e293b' }}>
                                {asg.master_standard.name}
                              </strong>
                              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                                SN: {asg.master_standard.serial_number} · Cấp {asg.master_standard.accuracy_class}
                              </div>
                              <div style={{ marginTop: '3px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    fontSize: '0.64rem',
                                    fontWeight: 700,
                                    background: asg.master_standard.is_valid ? '#ecfdf5' : '#fef2f2',
                                    color: asg.master_standard.is_valid ? '#065f46' : '#991b1b',
                                    border: `1px solid ${
                                      asg.master_standard.is_valid ? '#a7f3d0' : '#fecaca'
                                    }`,
                                  }}
                                >
                                  {asg.master_standard.is_valid ? '✓ Còn hạn' : '✕ Hết hạn'}:{' '}
                                  {formatDate(asg.master_standard.calibration_expiry)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="muted-value">Chưa chọn chuẩn</span>
                          )}
                        </div>

                        {/* Scheduled Appointment */}
                        <div className="assignment-date">
                          {asg?.scheduled_start ? (
                            <div>
                              <strong style={{ fontSize: '0.76rem', color: '#0f172a' }}>
                                {formatSchedule(asg.scheduled_start, asg.scheduled_end)}
                              </strong>
                              <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '2px' }}>
                                Hạn trả SLA: {formatDate(item.due_date)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="muted-value">Chưa xếp lịch</span>
                              <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '2px' }}>
                                Hạn trả SLA: {formatDate(item.due_date)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        <button
                          className={`button ${asg ? 'button-secondary' : 'button-primary'} assign-button`}
                          onClick={() => openAssignment(order, item)}
                          type="button"
                        >
                          {asg ? 'Điều chỉnh' : 'Phân công'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <span aria-hidden="true">⌕</span>
            <strong>Không tìm thấy thiết bị phù hợp</strong>
            <p>Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p>
          </div>
        )}
      </section>

      {/* ─── Modal Phân công thiết bị (Technician + Chuẩn còn hạn + Lịch hẹn) ─── */}
      <AnimatePresence>
        {assignment && (
          <motion.div
            animate={{ opacity: 1 }}
            className="modal-backdrop"
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
            initial={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) setAssignment(null);
            }}
            transition={{ duration: 0.16 }}
          >
            <motion.section
              animate={{ opacity: 1, scale: 1, y: 0 }}
              aria-labelledby="assignment-modal-title"
              aria-modal="true"
              className="assignment-modal"
              exit={{ opacity: 0, scale: 0.98, y: 6, transition: { duration: 0.14 } }}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              ref={assignmentModalRef}
              role="dialog"
              style={{ maxWidth: '640px', width: '100%', padding: '24px 28px' }}
              tabIndex={-1}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {/* Modal Header */}
              <div className="modal-heading">
                <div>
                  <p className="eyebrow">WORK ORDER {assignment.orderCode}</p>
                  <h2 id="assignment-modal-title" style={{ fontSize: '1.3rem', margin: '4px 0' }}>
                    Phân công thiết bị
                  </h2>
                  <p style={{ color: '#475569', fontSize: '0.82rem' }}>
                    <strong>{assignment.device}</strong>
                    {assignment.model ? ` (Model: ${assignment.model})` : ''} · {assignment.customer}
                  </p>
                </div>
                <button
                  aria-label="Đóng"
                  className="icon-button"
                  disabled={saving}
                  onClick={() => setAssignment(null)}
                  type="button"
                >
                  ×
                </button>
              </div>

              {/* Form */}
              <form className="assignment-form" onSubmit={handleSaveAssignment}>
                {/* 1. Chọn Kỹ thuật viên */}
                <div style={{ marginBottom: '14px' }}>
                  <label htmlFor="assignee">
                    1. Kỹ thuật viên phụ trách <span>*</span>
                  </label>
                  <select
                    id="assignee"
                    name="technicianId"
                    onChange={updateAssignmentField}
                    required
                    value={assignment.technicianId}
                  >
                    <option value="">-- Chọn kỹ thuật viên phụ trách --</option>
                    {resources.technicians.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.full_name} · {t.role_name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Chọn Chuẩn đối chứng (Bắt buộc còn hạn) */}
                <div style={{ marginBottom: '14px' }}>
                  <label htmlFor="standard">
                    2. Chuẩn đối chứng (Chỉ chấp nhận chuẩn còn hạn) <span>*</span>
                  </label>
                  <select
                    id="standard"
                    name="masterStandardId"
                    onChange={updateAssignmentField}
                    required
                    value={assignment.masterStandardId}
                  >
                    <option value="">-- Chọn chuẩn đối chứng còn hạn hiệu chuẩn --</option>
                    {resources.master_standards.map((s) => (
                      <option
                        disabled={!s.is_valid}
                        key={s.id}
                        style={{ color: s.is_valid ? '#0f172a' : '#94a3b8' }}
                        value={String(s.id)}
                      >
                        {s.name} (SN: {s.serial_number}) · Cấp {s.accuracy_class} —{' '}
                        {s.is_valid
                          ? `[Còn hạn đến ${formatDate(s.calibration_expiry)}]`
                          : `[HẾT HẠN từ ${formatDate(s.calibration_expiry)}]`}
                      </option>
                    ))}
                  </select>

                  {/* Standard Expiry Banner */}
                  {selectedStandard && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: selectedStandard.is_valid ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${selectedStandard.is_valid ? '#bbf7d0' : '#fecaca'}`,
                        fontSize: '0.76rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong>{selectedStandard.name}</strong> (SN: {selectedStandard.serial_number})
                        <div style={{ color: '#475569', marginTop: '2px' }}>
                          Cấp chính xác: <strong>{selectedStandard.accuracy_class}</strong>
                        </div>
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          color: selectedStandard.is_valid ? '#166534' : '#991b1b',
                          background: selectedStandard.is_valid ? '#dcfce7' : '#fee2e2',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {selectedStandard.is_valid
                          ? `✓ Hạn hiệu chuẩn: ${formatDate(selectedStandard.calibration_expiry)} (còn ${
                              selectedStandard.days_remaining
                            } ngày)`
                          : `✕ ĐÃ HẾT HẠN từ ${formatDate(selectedStandard.calibration_expiry)}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Lịch hẹn (Bắt đầu & Kết thúc) */}
                <div style={{ marginBottom: '14px' }}>
                  <label>
                    3. Lịch hẹn thực hiện đo kiểm <span>*</span>
                  </label>
                  <div className="form-grid-two">
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Bắt đầu:</span>
                      <input
                        id="scheduled-start"
                        name="scheduledStart"
                        onChange={updateAssignmentField}
                        required
                        type="datetime-local"
                        value={assignment.scheduledStart}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Kết thúc:</span>
                      <input
                        id="scheduled-end"
                        name="scheduledEnd"
                        onChange={updateAssignmentField}
                        required
                        type="datetime-local"
                        value={assignment.scheduledEnd}
                      />
                    </div>
                  </div>

                  {scheduleDurationText && (
                    <div
                      style={{
                        marginTop: '6px',
                        fontSize: '0.72rem',
                        color: '#0369a1',
                        background: '#f0f9ff',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        display: 'inline-block',
                      }}
                    >
                      ⏱ Thời lượng đo kiểm: <strong>{scheduleDurationText}</strong>
                    </div>
                  )}
                </div>

                <div className="assignment-hint">
                  <span aria-hidden="true">i</span>
                  <p>
                    Hệ thống tự động kiểm tra tính hợp lệ của chuẩn đối chứng. Chuẩn phải còn hạn trong suốt thời gian diễn ra lịch hẹn.
                  </p>
                </div>

                {formError && (
                  <p className="inline-error" role="alert" style={{ marginTop: '12px' }}>
                    {formError}
                  </p>
                )}

                {/* Actions */}
                <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: '20px' }}>
                  <div>
                    {assignment.assignmentId && (
                      <button
                        className="button"
                        disabled={saving}
                        onClick={handleDeleteAssignment}
                        style={{
                          background: '#fff1f2',
                          borderColor: '#fecdd3',
                          color: '#e11d48',
                          fontSize: '0.75rem',
                        }}
                        type="button"
                      >
                        Hủy phân công này
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="button button-secondary"
                      disabled={saving}
                      onClick={() => setAssignment(null)}
                      type="button"
                    >
                      Đóng
                    </button>
                    <button className="button button-primary" disabled={saving} type="submit">
                      {saving ? 'Đang lưu...' : 'Lưu phân công'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HeadOfTechPage;
