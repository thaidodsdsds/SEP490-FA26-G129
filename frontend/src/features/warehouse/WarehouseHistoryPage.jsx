import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getWarehouseInventorySummaryApi,
  getWarehouseTransactionsApi,
} from '../../services/warehouse-service.js';

function WarehouseHistoryPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txList, summaryData] = await Promise.all([
        getWarehouseTransactionsApi({
          type: typeFilter,
          search: query,
        }),
        getWarehouseInventorySummaryApi().catch(() => null),
      ]);
      setTransactions(Array.isArray(txList) ? txList : []);
      if (summaryData) setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load warehouse data', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
            Nhật ký Giao dịch Kho (Warehouse Transactions)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Quản lý và tra cứu toàn bộ lịch sử nhập kho Inbound, xuất kho Outbound thiết bị In-lab theo ISO/IEC 17025.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/internal/warehouse/inbound')}
            style={{
              padding: '10px 18px',
              borderRadius: 6,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            + Lập phiếu Nhập kho (Inbound)
          </button>
          <button
            onClick={() => navigate('/internal/warehouse/outbound')}
            style={{
              padding: '10px 18px',
              borderRadius: 6,
              border: 'none',
              background: '#16a34a',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            + Lập phiếu Xuất kho (Outbound)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Thiết bị đang lưu trong kho</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
              {summary.currentInWarehouseEstimated}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0ea5e9', marginTop: 4 }}>Ước tính theo giao dịch In/Out</div>
          </div>

          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Tổng lượt nhập kho (Inbound)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
              {summary.totalInbound}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Hôm nay: +{summary.todayInbound}</div>
          </div>

          <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Tổng lượt xuất kho (Outbound)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
              {summary.totalOutbound}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Hôm nay: +{summary.todayOutbound}</div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'Inbound', 'Outbound'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: '1px solid',
                  borderColor: typeFilter === t ? '#2563eb' : '#cbd5e1',
                  background: typeFilter === t ? '#eff6ff' : '#fff',
                  color: typeFilter === t ? '#1d4ed8' : '#475569',
                  fontWeight: typeFilter === t ? 600 : 400,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                {t === 'all' ? 'Tất cả phiếu' : t === 'Inbound' ? 'Phiếu Nhập (Inbound)' : 'Phiếu Xuất (Outbound)'}
              </button>
            ))}
          </div>

          <div style={{ minWidth: 260 }}>
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, thiết bị, serial..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
              }}
            />
          </div>
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Đang tải lịch sử giao dịch...</div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>Chưa có giao dịch kho nào phù hợp.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Mã phiếu</th>
                  <th style={{ padding: '12px 14px' }}>Loại</th>
                  <th style={{ padding: '12px 14px' }}>Thiết bị</th>
                  <th style={{ padding: '12px 14px' }}>Số Serial</th>
                  <th style={{ padding: '12px 14px' }}>Khách hàng</th>
                  <th style={{ padding: '12px 14px' }}>Tình trạng / Ghi chú</th>
                  <th style={{ padding: '12px 14px' }}>Thời gian</th>
                  <th style={{ padding: '12px 14px' }}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                      #{tx.id}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 99,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          background: tx.type === 'Inbound' ? '#dbeafe' : '#dcfce7',
                          color: tx.type === 'Inbound' ? '#1e40af' : '#166534',
                        }}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                      {tx.device?.name || `Thiết bị #${tx.device_id}`}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <code>{tx.device?.serial_number || '—'}</code>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {tx.device?.customer?.company_name || 'Khách hàng'}
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tx.condition_note || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.85rem' }}>
                      {tx.transaction_at ? new Date(tx.transaction_at).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => setSelectedTx(tx)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 10, maxWidth: 640, width: '100%', padding: 28, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Chi tiết phiếu giao dịch</span>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Phiếu {selectedTx.type} #{selectedTx.id}</h2>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.9rem', marginBottom: 20 }}>
              <div><strong>Loại giao dịch:</strong> {selectedTx.type}</div>
              <div><strong>Thời điểm:</strong> {new Date(selectedTx.transaction_at).toLocaleString('vi-VN')}</div>
              <div><strong>Thiết bị:</strong> {selectedTx.device?.name || `#${selectedTx.device_id}`}</div>
              <div><strong>Số Serial:</strong> {selectedTx.device?.serial_number || 'N/A'}</div>
              <div><strong>Chủ sở hữu:</strong> {selectedTx.device?.customer?.company_name || 'Khách hàng'}</div>
              <div><strong>Thủ kho thao tác:</strong> {selectedTx.handler?.name || `ID #${selectedTx.handled_by}`}</div>
            </div>

            <div style={{ marginBottom: 16, background: '#f8fafc', padding: 14, borderRadius: 6, fontSize: '0.9rem' }}>
              <strong>Tình trạng ngoại quan & Ghi chú bàn giao:</strong>
              <p style={{ margin: '6px 0 0', color: '#334155', whiteSpace: 'pre-wrap' }}>
                {selectedTx.condition_note || 'Không có ghi chú.'}
              </p>
            </div>

            {selectedTx.photo_url && (
              <div style={{ marginBottom: 20 }}>
                <strong>Ảnh chụp tiếp nhận / bàn giao:</strong>
                <div style={{ marginTop: 8 }}>
                  <img
                    src={selectedTx.photo_url}
                    alt="Evidence"
                    style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6, border: '1px solid #cbd5e1' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <a
                    href={selectedTx.photo_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'block', fontSize: '0.8rem', color: '#2563eb', marginTop: 4 }}
                  >
                    Mở ảnh gốc trong tab mới &rarr;
                  </a>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <button
                onClick={() => setSelectedTx(null)}
                style={{ padding: '8px 18px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WarehouseHistoryPage;
