import { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import {
  extractApiErrorMessage,
  getWorkOrderDetailApi,
  listWorkOrdersApi,
} from '../../../../services/work-order-service.js';
import { formatDate } from '../../../../utils/formatters.js';

const STATUS_LABELS = {
  Open: 'Chờ phân công',
  Assigned: 'Đã phân công',
  InProgress: 'Đang thực hiện',
  Done: 'Hoàn thành',
  Cancelled: 'Đã hủy',
};

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

function WorkOrdersPage() {
  const { normalizedQuery, query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listWorkOrdersApi();
      setWorkOrders(data);
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError, 'Không tải được danh sách Work Order.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(
    () =>
      workOrders.filter((row) => {
        if (!normalizedQuery) return true;
        const haystack = [
          row.work_order_code,
          row.customer_name,
          row.contract_code,
          row.status,
          STATUS_LABELS[row.status],
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('vi-VN');
        return haystack.includes(normalizedQuery);
      }),
    [normalizedQuery, workOrders],
  );

  const openDetail = async (row) => {
    setSelected({ ...row, assignments: [] });
    setDetailLoading(true);
    try {
      const detail = await getWorkOrderDetailApi(row.id);
      setSelected(detail);
    } catch (detailError) {
      setFeedback(extractApiErrorMessage(detailError, 'Không tải được chi tiết Work Order.'), 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      key: 'work_order_code',
      label: 'Mã Work Order',
      render: (row) => (
        <button className="text-action" onClick={() => openDetail(row)} type="button">
          {row.work_order_code}
        </button>
      ),
    },
    { key: 'customer_name', label: 'Khách hàng' },
    { key: 'contract_code', label: 'Hợp đồng' },
    {
      key: 'device_count',
      label: 'Thiết bị',
      render: (row) => `${row.device_count} thiết bị`,
    },
    {
      key: 'assigned_count',
      label: 'Đã phân công',
      render: (row) => `${row.assigned_count}/${row.device_count}`,
    },
    {
      key: 'created_at',
      label: 'Ngày tạo',
      render: (row) => formatDate(row.created_at),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <StatusPill>{STATUS_LABELS[row.status] || row.status}</StatusPill>,
    },
    {
      key: 'action',
      label: '',
      render: (row) => (
        <button className="small-action" onClick={() => openDetail(row)} type="button">
          Chi tiết
        </button>
      ),
    },
  ];

  return (
    <ReviewerPageShell
      title="Work Order"
      description="Theo dõi trạng thái lệnh và tiến độ xử lý theo từng thiết bị."
      query={query}
      onSearchChange={setQuery}
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      badge="Đồng bộ từ hợp đồng đã ký"
    >
      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div>
            <h2>Danh sách Work Order</h2>
            <p>Lệnh công việc được tạo tự động khi hợp đồng hoàn tất ký số hai bên</p>
          </div>
          <button className="small-action" disabled={loading} onClick={load} type="button">
            Làm mới
          </button>
        </div>

        {error && <div className="reviewer-card-alert" role="alert">{error}</div>}

        {loading ? (
          <div className="reviewer-empty">Đang tải danh sách Work Order…</div>
        ) : (
          <DataTable
            columns={columns}
            empty="Chưa có Work Order nào. Work Order sẽ xuất hiện sau khi hợp đồng được ký đủ hai bên."
            rows={rows}
          />
        )}

        {selected && (
          <div className="inline-detail">
            <strong>
              {selected.work_order_code} · {selected.customer_name}
            </strong>
            <p>
              Hợp đồng {selected.contract_code || '—'} · {selected.device_count} thiết bị ·{' '}
              {selected.assigned_count}/{selected.device_count} đã phân công
            </p>

            {detailLoading ? (
              <p>Đang tải chi tiết phân công…</p>
            ) : (
              <div className="work-order-assignment-list">
                {(selected.assignments ?? []).map((assignment) => (
                  <div className="work-order-assignment-item" key={assignment.id}>
                    <div>
                      <strong>{assignment.device_name}</strong>
                      <span>{assignment.standard_name || 'Chưa chọn chuẩn đối chứng'}</span>
                    </div>
                    <div>
                      <strong>{assignment.technician_name || 'Chưa phân công'}</strong>
                      <span>
                        {formatSchedule(assignment.scheduled_start)} —{' '}
                        {assignment.scheduled_end ? formatSchedule(assignment.scheduled_end) : 'Chưa xếp lịch'}
                      </span>
                    </div>
                  </div>
                ))}
                {!selected.assignments?.length && <p>Lệnh công việc chưa có dòng phân công nào.</p>}
              </div>
            )}

            <button className="small-action" onClick={() => setSelected(null)} type="button">
              Đóng chi tiết
            </button>
          </div>
        )}
      </section>
    </ReviewerPageShell>
  );
}

export default WorkOrdersPage;
