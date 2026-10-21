import { useEffect, useState } from 'react';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import SectionCard from '../../../components/ui/SectionCard.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import Toast from '../../../components/ui/Toast.jsx';
import { DonutChart, LineChart, ProgressBar } from '../../../components/ui/Charts.jsx';
import {
  accountantKpis,
  accountantProfile,
  agingBuckets,
  contractDebts,
  creditLimits,
  invoicesToIssue,
  overdueByCustomer,
  overdueSummary,
  pendingPayments,
  recentInvoices,
  revenueByMonth,
} from './mockData.js';
import { formatCurrency, formatCurrencyShort, formatDate } from '../../../utils/formatters.js';

const invoiceColumns = [
  { key: 'id', label: 'Mã hoá đơn' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'issuedAt', label: 'Ngày phát hành' },
  { key: 'amount', label: 'Số tiền' },
  { key: 'dueAt', label: 'Hạn thanh toán' },
  { key: 'status', label: 'Trạng thái' },
];

const overdueColumns = [
  { key: 'customer', label: 'Khách hàng' },
  { key: 'invoices', label: 'Số HĐ' },
  { key: 'd1', label: '1 – 30 ngày' },
  { key: 'd31', label: '31 – 60 ngày' },
  { key: 'd61', label: '61 – 90 ngày' },
  { key: 'd90', label: '> 90 ngày' },
  { key: 'total', label: 'Tổng' },
];

const contractColumns = [
  { key: 'contract', label: 'Hợp đồng' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'value', label: 'Giá trị' },
  { key: 'collected', label: 'Đã thu' },
  { key: 'remaining', label: 'Còn lại' },
  { key: 'status', label: 'Trạng thái' },
];

const shortOrDash = (value) => (value ? formatCurrencyShort(value) : '—');

function AccountantDashboardPage() {
  const [toast, setToast] = useState(null);

  const notify = (message, tone = 'info') => setToast({ message, tone });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const pendingTotal = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const issueTotal = invoicesToIssue.reduce((sum, invoice) => sum + invoice.amount, 0);

  const invoiceRows = recentInvoices.map((invoice) => [
    <span className="dash-cell-title" key={`${invoice.id}-id`}>{invoice.id}</span>,
    invoice.customer,
    formatDate(invoice.issuedAt),
    <span className="dash-cell-amount" key={`${invoice.id}-amount`}>{formatCurrency(invoice.amount)}</span>,
    formatDate(invoice.dueAt),
    <StatusBadge key={`${invoice.id}-status`} tone={invoice.tone}>{invoice.status}</StatusBadge>,
  ]);

  const overdueRows = overdueByCustomer.map((row) => {
    const total = row.d1 + row.d31 + row.d61 + row.d90;
    return [
      <span className="dash-cell-title" key={`${row.customer}-customer`}>{row.customer}</span>,
      row.invoices,
      shortOrDash(row.d1),
      shortOrDash(row.d31),
      shortOrDash(row.d61),
      shortOrDash(row.d90),
      <span className="dash-cell-amount" key={`${row.customer}-total`}>{formatCurrencyShort(total)}</span>,
    ];
  });

  const contractRows = contractDebts.map((contract) => [
    <span className="dash-cell-title" key={`${contract.contract}-id`}>{contract.contract}</span>,
    contract.customer,
    <span className="dash-cell-amount" key={`${contract.contract}-value`}>{formatCurrency(contract.value)}</span>,
    formatCurrency(contract.collected),
    <span className="dash-cell-amount" key={`${contract.contract}-remaining`}>
      {formatCurrency(contract.value - contract.collected)}
    </span>,
    <StatusBadge key={`${contract.contract}-status`} tone={contract.tone}>{contract.status}</StatusBadge>,
  ]);

  return (
    <div className="dash-page">
      <PageHeader
        actions={(
          <>
            <button
              className="button button-secondary"
              onClick={() => notify('Đang chuẩn bị báo cáo tài chính (demo).')}
              type="button"
            >
              Xuất báo cáo
            </button>
            <button
              className="button button-primary"
              onClick={() => notify('Đã bắt đầu đối soát giao dịch ngân hàng (demo).', 'success')}
              type="button"
            >
              Đối soát giao dịch
            </button>
          </>
        )}
        description="Theo dõi doanh thu, hoá đơn, thanh toán và công nợ của toàn bộ khách hàng."
        eyebrow="TỔNG QUAN KẾ TOÁN"
        meta={[
          `Kỳ: ${accountantProfile.period}`,
          `Đối soát đến ${formatDate(accountantProfile.reconciledAt)}`,
          `${accountantProfile.customerCount} khách hàng`,
          `${accountantProfile.overdueCustomerCount} khách hàng quá hạn`,
        ]}
        title="Tài chính & công nợ"
      />

      <section aria-label="Chỉ số tài chính" className="dash-kpi-grid">
        {accountantKpis.map(({ key, ...kpi }) => (
          <StatCard key={key} {...kpi} />
        ))}
      </section>

      <div className="dash-grid two">
        <SectionCard
          subtitle="Đơn vị: triệu đồng"
          title="Doanh thu 6 tháng gần nhất"
        >
          <LineChart
            ariaLabel="Doanh thu 6 tháng gần nhất, đơn vị triệu đồng"
            data={revenueByMonth}
          />
        </SectionCard>
        <SectionCard
          subtitle={`Tổng ${formatCurrencyShort(accountantProfile.totalReceivable)} · ${accountantProfile.overdueCustomerCount} khách hàng quá hạn`}
          title="Phân bổ công nợ phải thu"
        >
          <DonutChart
            ariaLabel="Phân bổ công nợ phải thu theo tuổi nợ"
            data={agingBuckets}
            totalDisplay="1,84 tỷ"
            totalLabel="phải thu"
          />
        </SectionCard>
      </div>

      <SectionCard
        action={(
          <button
            className="dash-btn-xs"
            onClick={() => notify('Danh sách hoá đơn đầy đủ sẽ có ở màn Hoá đơn (demo).')}
            type="button"
          >
            Xem tất cả
          </button>
        )}
        subtitle={`${recentInvoices.length} hoá đơn mới nhất`}
        title="Hoá đơn gần đây"
      >
        <DataTable columns={invoiceColumns} rows={invoiceRows} />
      </SectionCard>

      <div className="dash-grid split">
        <SectionCard
          subtitle={`${pendingPayments.length} giao dịch · Tổng ${formatCurrencyShort(pendingTotal)}`}
          title="Thanh toán chờ xác nhận"
        >
          <div className="dash-quote-list">
            {pendingPayments.map((payment) => (
              <article className="dash-quote-item" key={payment.id}>
                <div className="dash-quote-top">
                  <div>
                    <strong>{payment.id}</strong>
                    <small>{payment.customer}</small>
                    <small>{formatDate(payment.paidAt)} · {payment.method}</small>
                  </div>
                  <span className="dash-quote-amount">{formatCurrency(payment.amount)}</span>
                </div>
                <div className="dash-quote-actions">
                  <button
                    className="dash-btn-xs primary"
                    onClick={() => notify(`Đã xác nhận thanh toán ${payment.id} (demo).`, 'success')}
                    type="button"
                  >
                    Xác nhận
                  </button>
                  <button
                    className="dash-btn-xs"
                    onClick={() => notify(`Đã từ chối thanh toán ${payment.id} (demo).`, 'error')}
                    type="button"
                  >
                    Từ chối
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          subtitle={`${invoicesToIssue.length} hồ sơ ưu tiên · Tổng ${formatCurrencyShort(issueTotal)}`}
          title="Hoá đơn cần phát hành"
        >
          <div className="dash-quote-list">
            {invoicesToIssue.map((invoice) => (
              <article className="dash-quote-item" key={invoice.id}>
                <div className="dash-quote-top">
                  <div>
                    <strong>{invoice.id}</strong>
                    <small>{invoice.customer}</small>
                    <small>Hoàn tất {formatDate(invoice.completedAt)}</small>
                  </div>
                  <span className="dash-quote-amount">{formatCurrency(invoice.amount)}</span>
                </div>
                <div className="dash-quote-actions">
                  <button
                    className="dash-btn-xs primary"
                    onClick={() => notify(`Đã phát hành hoá đơn cho ${invoice.id} (demo).`, 'success')}
                    type="button"
                  >
                    Phát hành hoá đơn
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="dash-grid split">
        <SectionCard
          action={(
            <button
              className="dash-btn-xs"
              onClick={() => notify('Danh sách công nợ đầy đủ sẽ có ở màn Công nợ (demo).')}
              type="button"
            >
              Xem tất cả
            </button>
          )}
          subtitle={`Tổng ${formatCurrencyShort(overdueSummary.total)} · ${overdueByCustomer.length} khách hàng`}
          title="Công nợ quá hạn theo khách hàng"
        >
          <DataTable columns={overdueColumns} rows={overdueRows} />
        </SectionCard>

        <SectionCard
          subtitle="Top 5 khách hàng có dư nợ cao nhất"
          title="Hạn mức công nợ"
        >
          <div className="dash-credit-list">
            {creditLimits.map((credit) => {
              const usage = Math.round((credit.used / credit.limit) * 100);
              const tone = usage >= 90 ? 'danger' : usage >= 75 ? 'warning' : 'info';

              return (
                <div className="dash-credit-row" key={credit.customer}>
                  <div className="dash-credit-head">
                    <span>{credit.customer}</span>
                    <strong>{usage}%</strong>
                  </div>
                  <ProgressBar
                    label={`${formatCurrencyShort(credit.used)} / ${formatCurrencyShort(credit.limit)}`}
                    max={credit.limit}
                    tone={tone}
                    value={credit.used}
                  />
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        action={(
          <button
            className="dash-btn-xs"
            onClick={() => notify('Danh sách hợp đồng đầy đủ sẽ có ở màn Hợp đồng (demo).')}
            type="button"
          >
            Xem tất cả
          </button>
        )}
        subtitle="Các hợp đồng còn dư nợ"
        title="Công nợ theo hợp đồng"
      >
        <DataTable columns={contractColumns} rows={contractRows} />
      </SectionCard>

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </div>
  );
}

export default AccountantDashboardPage;
