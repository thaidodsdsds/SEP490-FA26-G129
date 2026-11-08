import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWarehouseTransactionsApi } from '../../../../services/warehouse-service.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function WarehousePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWarehouseTransactionsApi({
        type: filter,
        search: query,
      });
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, query]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <ReviewerPageShell
      title="Lịch sử Kho vận (Warehouse Transaction)"
      description="Tra cứu phiếu nhập, xuất và tình trạng thiết bị bàn giao theo ISO/IEC 17025."
      query={query}
      onSearchChange={setQuery}
      feedback=""
      onFeedbackDismiss={() => {}}
    >
      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div>
            <h2>WarehouseTransaction</h2>
            <p>Nhật ký nhập/xuất thiết bị In-lab theo thời gian thực.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="button button-secondary"
              onClick={() => navigate('/internal/warehouse/inbound')}
              type="button"
            >
              + Phiếu Nhập (Inbound)
            </button>
            <button
              className="button button-primary"
              onClick={() => navigate('/internal/warehouse/outbound')}
              type="button"
            >
              + Phiếu Xuất (Outbound)
            </button>
          </div>
        </div>

        <div className="filter-row reviewer-filter">
          {['all', 'Inbound', 'Outbound'].map((type) => (
            <button
              key={type}
              aria-pressed={filter === type}
              className={`filter-chip${filter === type ? ' selected' : ''}`}
              onClick={() => setFilter(type)}
              type="button"
            >
              {type === 'all' ? 'Tất cả' : type}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b' }}>Đang tải nhật ký kho...</div>
        ) : (
          <DataTable
            columns={[
              { key: 'id', label: 'Mã phiếu', render: (row) => <strong>#{row.id}</strong> },
              { key: 'type', label: 'Loại phiếu', render: (row) => <StatusPill>{row.type}</StatusPill> },
              {
                key: 'device',
                label: 'Thiết bị',
                render: (row) => <span>{row.device?.name || `Thiết bị #${row.device_id}`}</span>,
              },
              {
                key: 'serial',
                label: 'Số Serial',
                render: (row) => <code>{row.device?.serial_number || '—'}</code>,
              },
              {
                key: 'customer',
                label: 'Khách hàng',
                render: (row) => <span>{row.device?.customer?.company_name || 'Khách hàng'}</span>,
              },
              {
                key: 'condition',
                label: 'Tình trạng ngoại quan / Ghi chú',
                render: (row) => <span style={{ fontSize: '0.85rem' }}>{row.condition_note || '—'}</span>,
              },
              {
                key: 'time',
                label: 'Thời điểm',
                render: (row) => (
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {row.transaction_at ? new Date(row.transaction_at).toLocaleString('vi-VN') : '—'}
                  </span>
                ),
              },
            ]}
            rows={transactions}
          />
        )}
      </section>
    </ReviewerPageShell>
  );
}

export default WarehousePage;
