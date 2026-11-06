import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../components/ui/DataTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { extractApiErrorMessage, listContractsApi } from '../../services/contract-service.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { getStatusLabel, getStatusTone } from './contractConstants.js';
import './contracts.css';

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Draft', label: 'Bản nháp' },
  { value: 'PendingApproval', label: 'Chờ duyệt' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Signed', label: 'Đã ký' },
  { value: 'Liquidated', label: 'Đã thanh lý' },
  { value: 'Cancelled', label: 'Đã huỷ' },
];

function ContractListPage({ basePath, canCreate = false }) {
  const [contracts, setContracts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await listContractsApi();
        if (!cancelled) setContracts(data);
      } catch (loadError) {
        if (!cancelled) setError(extractApiErrorMessage(loadError, 'Không tải được danh sách hợp đồng.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? contracts : contracts.filter((contract) => contract.status === filter)),
    [contracts, filter],
  );

  const columns = [
    { key: 'code', label: 'Mã hợp đồng' },
    { key: 'customer', label: 'Khách hàng' },
    { key: 'sign_date', label: 'Ngày ký' },
    { key: 'total', label: 'Giá trị' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'actions', label: '' },
  ];

  const rows = filtered.map((contract) => [
    <Link className="ct-code-link" key={`code-${contract.id}`} to={`${basePath}/${contract.id}`}>
      {contract.contract_code}
    </Link>,
    contract.customer_name || '—',
    formatDate(contract.sign_date),
    formatCurrency(contract.total_amount),
    <StatusBadge key={`status-${contract.id}`} tone={getStatusTone(contract.status)}>
      {getStatusLabel(contract.status)}
    </StatusBadge>,
    <Link
      className="button button-secondary"
      key={`view-${contract.id}`}
      to={`${basePath}/${contract.id}`}
    >
      Xem
    </Link>,
  ]);

  return (
    <div className="dash-page ct-page">
      <PageHeader
        eyebrow="Hợp đồng"
        title="Danh sách hợp đồng"
        description="Hợp đồng dịch vụ được lập từ báo giá đã được khách hàng chấp thuận. Bản đã duyệt/ký không chỉnh sửa — hãy huỷ và tạo hợp đồng mới nếu cần thay đổi."
        meta={[`${contracts.length} hợp đồng`]}
        actions={
          canCreate ? (
            <Link className="button button-primary" to={`${basePath}/new`}>
              + Tạo hợp đồng
            </Link>
          ) : null
        }
      />

      <div className="ct-filter-row ct-no-print">
        {FILTERS.map((item) => (
          <button
            className={`ct-filter-chip${filter === item.value ? ' active' : ''}`}
            key={item.value}
            onClick={() => setFilter(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <div className="ct-error-banner">{error}</div>}

      {loading ? (
        <div className="ct-empty">Đang tải danh sách hợp đồng…</div>
      ) : (
        <DataTable
          columns={columns}
          emptyText="Chưa có hợp đồng nào. Hãy tạo hợp đồng từ một báo giá đã được duyệt."
          rows={rows}
        />
      )}
    </div>
  );
}

export default ContractListPage;
