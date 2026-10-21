import { serviceTypes } from '../../mockData.js';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function ServiceTypesPage() {
  const { matches, query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const rows = serviceTypes.filter((row) => matches(`${row.name} ${row.kind} ${row.field} ${row.standardCode}`));
  return (
    <ReviewerPageShell title="Danh mục dịch vụ" description="Tra cứu ServiceType theo lĩnh vực, loại dịch vụ và trạng thái." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card">
        <div className="reviewer-card-heading"><div><h2>ServiceType</h2><p>Reviewer có thể tra cứu danh mục; quyền tạo/chỉnh sửa thuộc Admin.</p></div></div>
        <DataTable columns={[
          { key: 'id', label: 'Mã' },
          { key: 'name', label: 'Dịch vụ', render: (row) => <strong>{row.name}</strong> },
          { key: 'kind', label: 'Loại dịch vụ', render: (row) => <StatusPill>{row.kind}</StatusPill> },
          { key: 'field', label: 'Lĩnh vực' },
          { key: 'standardCode', label: 'Mã tiêu chuẩn' },
          { key: 'procedures', label: 'Số quy trình' },
          { key: 'status', label: 'Trạng thái', render: (row) => <StatusPill>{row.status}</StatusPill> },
        ]} rows={rows} />
      </section>
    </ReviewerPageShell>
  );
}

export default ServiceTypesPage;
