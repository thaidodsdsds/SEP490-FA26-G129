import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  extractApiErrorMessage,
  getWorkOrderDetailApi,
  getWorkOrderLookupsApi,
  listWorkOrdersApi,
  updateWorkOrderAssignmentApi,
} from '../../services/work-order-service.js';
import './operations.css';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const formatSchedule = (value) => {
  if (!value) return 'Chưa xếp lịch';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa xếp lịch';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const initials = (name) => (name || '?')
  .split(' ')
  .slice(-2)
  .map((part) => part[0])
  .join('');

function HeadOfTechPage() {
  const [workOrders, setWorkOrders] = useState([]);
  const [lookups, setLookups] = useState({ technicians: [], standards: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [assignment, setAssignment] = useState(null);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const assignmentModalRef = useRef(null);
  const assignmentOpen = Boolean(assignment);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [summaries, lookupData] = await Promise.all([
        listWorkOrdersApi(),
        getWorkOrderLookupsApi(),
      ]);
      const details = await Promise.all(
        summaries.map((order) => getWorkOrderDetailApi(order.id)),
      );
      setWorkOrders(details);
      setLookups(lookupData ?? { technicians: [], standards: [] });
    } catch (loadFailure) {
      setLoadError(extractApiErrorMessage(loadFailure, 'Không tải được dữ liệu phân công.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
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

  const flatItems = useMemo(
    () => workOrders.flatMap((order) => (order.assignments ?? []).map((item) => ({ ...item, order }))),
    [workOrders],
  );
  const assignedCount = flatItems.filter((item) => item.technician_id).length;
  const unassignedCount = flatItems.length - assignedCount;
  const filteredOrders = workOrders.map((order) => ({
    ...order,
    items: (order.assignments ?? []).filter((item) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query
        || `${order.work_order_code} ${order.customer_name} ${order.contract_code} ${item.device_name}`.toLowerCase().includes(query);
      const matchesFilter = filter === 'all'
        || (filter === 'unassigned' && !item.technician_id)
        || (filter === 'assigned' && item.technician_id);
      return matchesSearch && matchesFilter;
    }),
  })).filter((order) => order.items.length > 0);

  const openAssignment = (order, item) => {
    setMessage('');
    setNotice('');
    setAssignment({
      orderId: order.id,
      orderCode: order.work_order_code,
      assignmentId: item.id,
      device: item.device_name,
      customer: order.customer_name,
      technicianId: item.technician_id ? String(item.technician_id) : '',
      standard: item.standard_name || '',
      scheduledStart: toDateTimeLocal(item.scheduled_start),
      scheduledEnd: toDateTimeLocal(item.scheduled_end),
    });
  };

  const updateAssignment = (event) => {
    const { name, value } = event.target;
    setAssignment((current) => ({ ...current, [name]: value }));
  };

  const saveAssignment = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!assignment.technicianId) {
      setMessage('Vui lòng chọn kỹ thuật viên phụ trách.');
      return;
    }
    if (!assignment.standard) {
      setMessage('Vui lòng chọn chuẩn đối chứng.');
      return;
    }
    if (!assignment.scheduledStart || !assignment.scheduledEnd) {
      setMessage('Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc.');
      return;
    }
    if (new Date(assignment.scheduledEnd) <= new Date(assignment.scheduledStart)) {
      setMessage('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateWorkOrderAssignmentApi(
        assignment.orderId,
        assignment.assignmentId,
        {
          technician_id: Number(assignment.technicianId),
          standard_name: assignment.standard,
          scheduled_start: new Date(assignment.scheduledStart).toISOString(),
          scheduled_end: new Date(assignment.scheduledEnd).toISOString(),
        },
      );
      setWorkOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      setAssignment(null);
      setNotice(`Đã lưu phân công cho ${updated.work_order_code}.`);
    } catch (saveFailure) {
      setMessage(extractApiErrorMessage(saveFailure, 'Không lưu được phân công.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="operations-page">
      <div className="operations-heading">
        <div>
          <p className="eyebrow">ĐIỀU PHỐI KỸ THUẬT</p>
          <h1>Phân công công việc</h1>
          <p className="operations-subtitle">
            Phân công kỹ thuật viên, chuẩn đối chứng và lịch hẹn cho từng thiết bị trong Work Order.
          </p>
        </div>
        <span className="demo-pill"><span /> Đồng bộ từ Work Order</span>
      </div>

      <div className="operations-stats">
        <article className="stat-card">
          <span className="stat-icon blue" aria-hidden="true">▤</span>
          <div><span>Tổng thiết bị</span><strong>{flatItems.length}</strong></div>
          <small>Trong các lệnh đang mở</small>
        </article>
        <article className="stat-card">
          <span className="stat-icon amber" aria-hidden="true">◷</span>
          <div><span>Chờ phân công</span><strong>{unassignedCount}</strong></div>
          <small>Cần sắp xếp kỹ thuật</small>
        </article>
        <article className="stat-card">
          <span className="stat-icon green" aria-hidden="true">✓</span>
          <div><span>Đã phân công</span><strong>{assignedCount}</strong></div>
          <small>Có kỹ thuật viên phụ trách</small>
        </article>
      </div>

      <section className="work-panel">
        <div className="panel-toolbar">
          <div>
            <h2>Work Order cần điều phối</h2>
            <p>{filteredOrders.length} lệnh phù hợp với bộ lọc</p>
          </div>
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Tìm Work Order, khách hàng hoặc thiết bị"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm mã lệnh, khách hàng, thiết bị..."
              value={search}
            />
          </label>
        </div>

        <div className="filter-row" aria-label="Lọc thiết bị">
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
          <button className="filter-chip" disabled={loading} onClick={load} type="button">
            Làm mới
          </button>
        </div>

        {notice && <div className="operations-feedback" role="status">{notice}</div>}
        {loadError && <div className="operations-feedback error" role="alert">{loadError}</div>}

        {loading ? (
          <div className="empty-panel">
            <span aria-hidden="true">⌛</span>
            <strong>Đang tải dữ liệu phân công</strong>
            <p>Danh sách Work Order sẽ hiển thị sau ít giây.</p>
          </div>
        ) : filteredOrders.length ? (
          <div className="work-order-list">
            {filteredOrders.map((order) => (
              <article className="work-order-card" key={order.id}>
                <div className="work-order-heading">
                  <div className="work-order-id">
                    <span className="order-mark" aria-hidden="true">WO</span>
                    <div>
                      <strong>{order.work_order_code}</strong>
                      <span>{order.customer_name} · Hợp đồng {order.contract_code || '—'}</span>
                    </div>
                  </div>
                  <span className={`priority-tag ${order.status === 'Assigned' ? '' : 'priority-high'}`}>
                    {order.status === 'Assigned' ? 'Đã phân công' : 'Chờ điều phối'}
                  </span>
                </div>

                <div className="assignment-table">
                  <div className="assignment-table-head">
                    <span>Thiết bị / dịch vụ</span>
                    <span>Kỹ thuật viên</span>
                    <span>Chuẩn đối chứng</span>
                    <span>Lịch hẹn</span>
                    <span aria-label="Thao tác" />
                  </div>
                  {order.items.map((item) => (
                    <div className="assignment-row" key={item.id}>
                      <div className="device-cell">
                        <strong>{item.device_name}</strong>
                        <span>{item.technician_id ? 'Đã phân công kỹ thuật' : 'Chưa có kỹ thuật viên'}</span>
                        <small>Dòng phân công #{item.id}</small>
                      </div>
                      <div className="assignment-person">
                        {item.technician_id ? (
                          <>
                            <span className="mini-avatar">{initials(item.technician_name)}</span>
                            <span>{item.technician_name}</span>
                          </>
                        ) : <span className="muted-value">Chưa phân công</span>}
                      </div>
                      <div className="assignment-standard">
                        <strong>{item.standard_name || 'Chưa chọn chuẩn'}</strong>
                        <span>{item.standard_name ? 'Đã chọn chuẩn đối chứng' : 'Cần bổ sung'}</span>
                      </div>
                      <div className="assignment-date">
                        <strong>{formatSchedule(item.scheduled_start)}</strong>
                        <span>Kết thúc: {formatSchedule(item.scheduled_end)}</span>
                      </div>
                      <button
                        className={`button ${item.technician_id ? 'button-secondary' : 'button-primary'} assign-button`}
                        onClick={() => openAssignment(order, item)}
                        type="button"
                      >
                        {item.technician_id ? 'Điều chỉnh' : 'Phân công'}
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <span aria-hidden="true">⌕</span>
            <strong>Không tìm thấy thiết bị phù hợp</strong>
            <p>Thử thay đổi từ khóa hoặc bộ lọc.</p>
          </div>
        )}
        <p className="mock-note">
          <strong>Lưu ý:</strong> Dữ liệu phân công được lưu trực tiếp vào Work Order. Thay đổi sẽ được giữ lại
          khi tải lại trang.
        </p>
      </section>

      <AnimatePresence>
        {assignment && (
        <motion.div
          animate={{ opacity: 1 }}
          className="modal-backdrop"
          exit={{ opacity: 0, transition: { duration: 0.14 } }}
          initial={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAssignment(null);
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
            tabIndex={-1}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">WORK ORDER {assignment.orderCode}</p>
                <h2 id="assignment-modal-title">Phân công thiết bị</h2>
                <p>{assignment.device} · {assignment.customer}</p>
              </div>
              <button aria-label="Đóng" className="icon-button" onClick={() => setAssignment(null)} type="button">×</button>
            </div>
            <form className="assignment-form" onSubmit={saveAssignment}>
              <label htmlFor="assignee">Kỹ thuật viên <span>*</span></label>
              <select id="assignee" name="technicianId" onChange={updateAssignment} required value={assignment.technicianId}>
                <option value="">Chọn kỹ thuật viên</option>
                {lookups.technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.full_name} · {technician.role === 'HeadTechnician' ? 'Trưởng nhóm kỹ thuật' : 'Kỹ thuật viên'}
                  </option>
                ))}
              </select>
              <label htmlFor="standard">Chuẩn đối chứng <span>*</span></label>
              <select id="standard" name="standard" onChange={updateAssignment} required value={assignment.standard}>
                <option value="">Chọn chuẩn còn hạn</option>
                {lookups.standards.map((standard) => <option key={standard} value={standard}>{standard}</option>)}
              </select>
              <div className="form-grid-two">
                <div>
                  <label htmlFor="scheduled-start">Bắt đầu <span>*</span></label>
                  <input
                    id="scheduled-start"
                    name="scheduledStart"
                    onChange={updateAssignment}
                    required
                    type="datetime-local"
                    value={assignment.scheduledStart}
                  />
                </div>
                <div>
                  <label htmlFor="scheduled-end">Kết thúc <span>*</span></label>
                  <input
                    id="scheduled-end"
                    name="scheduledEnd"
                    onChange={updateAssignment}
                    required
                    type="datetime-local"
                    value={assignment.scheduledEnd}
                  />
                </div>
              </div>
              <div className="assignment-hint">
                <span aria-hidden="true">i</span>
                <p>Đảm bảo chuẩn đối chứng còn hạn đến hết lịch hẹn và phù hợp với lĩnh vực dịch vụ.</p>
              </div>
              {message && <p className="inline-error" role="alert">{message}</p>}
              <div className="modal-actions">
                <button className="button button-secondary" disabled={saving} onClick={() => setAssignment(null)} type="button">Hủy</button>
                <button className="button button-primary" disabled={saving} type="submit">
                  {saving ? 'Đang lưu…' : 'Lưu phân công'}
                </button>
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
