import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { initialWorkOrders, technicians } from './mockData.js';
import './operations.css';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const standards = [
  'Calibrator Fluke 5522A',
  'Bộ quả cân chuẩn F2',
  'Buồng nhiệt ẩm ESPEC',
  'Thước chuẩn Mitutoyo',
];

const formatSchedule = (value) => {
  if (!value) return 'Chưa xếp lịch';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

function HeadOfTechPage() {
  const [workOrders, setWorkOrders] = useState(initialWorkOrders);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [assignment, setAssignment] = useState(null);
  const [message, setMessage] = useState('');
  const assignmentModalRef = useRef(null);
  const assignmentOpen = Boolean(assignment);

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
    () => workOrders.flatMap((order) => order.items.map((item) => ({ ...item, order }))),
    [workOrders],
  );
  const assignedCount = flatItems.filter((item) => item.technician).length;
  const unassignedCount = flatItems.length - assignedCount;
  const filteredOrders = workOrders.map((order) => ({
    ...order,
    items: order.items.filter((item) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query
        || `${order.id} ${order.customer} ${item.device} ${item.serial}`.toLowerCase().includes(query);
      const matchesFilter = filter === 'all'
        || (filter === 'unassigned' && !item.technician)
        || (filter === 'assigned' && item.technician);
      return matchesSearch && matchesFilter;
    }),
  })).filter((order) => order.items.length > 0);

  const openAssignment = (order, item) => {
    setMessage('');
    setAssignment({
      orderId: order.id,
      itemId: item.id,
      device: item.device,
      customer: order.customer,
      technician: item.technician || '',
      standard: item.standard || '',
      scheduledStart: item.scheduledStart || '',
      scheduledEnd: item.scheduledEnd || '',
    });
  };

  const updateAssignment = (event) => {
    const { name, value } = event.target;
    setAssignment((current) => ({ ...current, [name]: value }));
  };

  const saveAssignment = (event) => {
    event.preventDefault();
    if (new Date(assignment.scheduledEnd) <= new Date(assignment.scheduledStart)) {
      setMessage('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    setWorkOrders((currentOrders) => currentOrders.map((order) => (
      order.id !== assignment.orderId
        ? order
        : {
            ...order,
            items: order.items.map((item) => (
              item.id !== assignment.itemId
                ? item
                : {
                    ...item,
                    technician: assignment.technician,
                    standard: assignment.standard,
                    scheduledStart: assignment.scheduledStart,
                    scheduledEnd: assignment.scheduledEnd,
                  }
            )),
          }
    )));
    setAssignment(null);
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
        <span className="demo-pill"><span /> Dữ liệu minh họa</span>
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
        </div>

        {filteredOrders.length ? (
          <div className="work-order-list">
            {filteredOrders.map((order) => (
              <article className="work-order-card" key={order.id}>
                <div className="work-order-heading">
                  <div className="work-order-id">
                    <span className="order-mark" aria-hidden="true">WO</span>
                    <div>
                      <strong>{order.id}</strong>
                      <span>{order.customer}</span>
                    </div>
                  </div>
                  <span className={`priority-tag ${order.priority === 'Ưu tiên' ? 'priority-high' : ''}`}>
                    {order.priority}
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
                        <strong>{item.device}</strong>
                        <span>{item.model} · SN {item.serial}</span>
                        <small>{item.service}</small>
                      </div>
                      <div className="assignment-person">
                        {item.technician ? (
                          <>
                            <span className="mini-avatar">
                              {item.technician.split(' ').slice(-2).map((part) => part[0]).join('')}
                            </span>
                            <span>{item.technician}</span>
                          </>
                        ) : <span className="muted-value">Chưa phân công</span>}
                      </div>
                      <div className="assignment-standard">
                        <strong>{item.standard || 'Chưa chọn chuẩn'}</strong>
                        <span>{item.field}</span>
                      </div>
                      <div className="assignment-date">
                        <strong>{formatSchedule(item.scheduledStart)}</strong>
                        <span>Hạn dự kiến: {item.due}</span>
                      </div>
                      <button
                        className={`button ${item.technician ? 'button-secondary' : 'button-primary'} assign-button`}
                        onClick={() => openAssignment(order, item)}
                        type="button"
                      >
                        {item.technician ? 'Điều chỉnh' : 'Phân công'}
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
          <strong>Lưu ý:</strong> Đây là dữ liệu mẫu. Thay đổi phân công chỉ được lưu trong phiên trình duyệt này.
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
                <p className="eyebrow">WORK ORDER {assignment.orderId}</p>
                <h2 id="assignment-modal-title">Phân công thiết bị</h2>
                <p>{assignment.device} · {assignment.customer}</p>
              </div>
              <button aria-label="Đóng" className="icon-button" onClick={() => setAssignment(null)} type="button">×</button>
            </div>
            <form className="assignment-form" onSubmit={saveAssignment}>
              <label htmlFor="assignee">Kỹ thuật viên <span>*</span></label>
              <select id="assignee" name="technician" onChange={updateAssignment} required value={assignment.technician}>
                <option value="">Chọn kỹ thuật viên</option>
                {technicians.map((technician) => (
                  <option key={technician.name} value={technician.name}>
                    {technician.name} · {technician.specialty}
                  </option>
                ))}
              </select>
              <label htmlFor="standard">Chuẩn đối chứng <span>*</span></label>
              <select id="standard" name="standard" onChange={updateAssignment} required value={assignment.standard}>
                <option value="">Chọn chuẩn còn hạn</option>
                {standards.map((standard) => <option key={standard} value={standard}>{standard}</option>)}
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
                <button className="button button-secondary" onClick={() => setAssignment(null)} type="button">Hủy</button>
                <button className="button button-primary" type="submit">Lưu phân công</button>
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
