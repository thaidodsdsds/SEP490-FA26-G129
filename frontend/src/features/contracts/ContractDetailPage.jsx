import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  approveContractApi,
  cancelContractApi,
  extractApiErrorMessage,
  getContractDetailApi,
  liquidateContractApi,
  submitContractApi,
} from '../../services/contract-service.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { getStatusClass, getStatusLabel } from './contractConstants.js';
import './contracts.css';

const formatLongDate = (value) => {
  if (!value) return '...';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return formatDate(value);
  return `ngày ${day} tháng ${month} năm ${year}`;
};

const PartyBlock = ({ title, party, showBudgetCode = false }) => (
  <div className="ct-party-block">
    <h4>{title}</h4>
    <dl>
      <dt>Tên đơn vị:</dt>
      <dd>{party.name || '—'}</dd>
      {party.representative ? (
        <>
          <dt>Đại diện:</dt>
          <dd>
            {party.representative}
            {party.position ? ` — ${party.position}` : ''}
          </dd>
        </>
      ) : null}
      <dt>Địa chỉ:</dt>
      <dd>{party.address || '—'}</dd>
      {party.tax_code ? (
        <>
          <dt>Mã số thuế:</dt>
          <dd>{party.tax_code}</dd>
        </>
      ) : null}
      {party.phone || party.fax ? (
        <>
          <dt>Điện thoại:</dt>
          <dd>{[party.phone, party.fax ? `Fax: ${party.fax}` : null].filter(Boolean).join(' · ')}</dd>
        </>
      ) : null}
      {party.bank_account || party.bank_name ? (
        <>
          <dt>Tài khoản:</dt>
          <dd>{[party.bank_account, party.bank_name].filter(Boolean).join(' — ')}</dd>
        </>
      ) : null}
      {showBudgetCode && party.budget_code ? (
        <>
          <dt>Mã QHNS:</dt>
          <dd>{party.budget_code}</dd>
        </>
      ) : null}
    </dl>
  </div>
);

function ContractDetailPage({ basePath }) {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const detail = await getContractDetailApi(id);
      setContract(detail);
    } catch (loadError) {
      setError(extractApiErrorMessage(loadError, 'Không tải được hợp đồng.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (action, confirmMessage) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    setActionError('');
    try {
      const updated = await action(contract.id);
      setContract(updated);
    } catch (actionFailure) {
      setActionError(extractApiErrorMessage(actionFailure, 'Thao tác không thành công.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="dash-page ct-page ct-empty">Đang tải hợp đồng…</div>;
  }

  if (error || !contract) {
    return (
      <div className="dash-page ct-page">
        <div className="ct-error-banner">{error || 'Hợp đồng không tồn tại.'}</div>
        <Link className="ct-back-link" to={basePath}>
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const travelFee = Number(contract.travel_fee) || 0;
  const travelTax = Math.round((travelFee * 8) / 100);
  const travelAmount = travelFee + travelTax;

  return (
    <div className="dash-page ct-page">
      <div className="ct-action-bar ct-no-print">
        <div className="ct-action-left">
          <Link className="ct-back-link" to={basePath}>
            ← Quay lại
          </Link>
          <span className={`ct-status ${getStatusClass(contract.status)}`}>
            {getStatusLabel(contract.status)}
          </span>
        </div>

        <div className="ct-action-right">
          <button className="button button-secondary" onClick={() => window.print()} type="button">
            In / Xuất PDF
          </button>

          {contract.can_edit && (
            <Link className="button button-secondary" to={`${basePath}/${contract.id}/edit`}>
              Chỉnh sửa
            </Link>
          )}

          {contract.can_submit && (
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() =>
                runAction(submitContractApi, 'Gửi hợp đồng cho Admin/CEO duyệt? Sau khi gửi, Sales không thể chỉnh sửa.')
              }
              type="button"
            >
              Gửi duyệt
            </button>
          )}

          {contract.can_approve && (
            <button
              className="button button-success"
              disabled={busy}
              onClick={() => runAction(approveContractApi, 'Duyệt hợp đồng này?')}
              type="button"
            >
              Duyệt hợp đồng
            </button>
          )}

          {contract.can_liquidate && (
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => runAction(liquidateContractApi, 'Xác nhận thanh lý hợp đồng?')}
              type="button"
            >
              Thanh lý
            </button>
          )}

          {contract.can_cancel && (
            <button
              className="button button-danger"
              disabled={busy}
              onClick={() =>
                runAction(
                  cancelContractApi,
                  'Huỷ hợp đồng này? Hợp đồng đã huỷ không thể khôi phục; hãy tạo hợp đồng mới nếu cần.',
                )
              }
              type="button"
            >
              Huỷ hợp đồng
            </button>
          )}
        </div>
      </div>

      {actionError && <div className="ct-error-banner ct-no-print">{actionError}</div>}

      <article className="ct-document">
        <div className="ct-doc-top">
          <div className="ct-doc-org">
            <strong>{contract.party_b.name}</strong>
            {contract.party_b.address && <span>{contract.party_b.address}</span>}
            <span>
              {[
                contract.party_b.phone ? `ĐT: ${contract.party_b.phone}` : null,
                contract.party_b.fax ? `Fax: ${contract.party_b.fax}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <span>
              {[
                contract.party_b.tax_code ? `MST: ${contract.party_b.tax_code}` : null,
                contract.party_b.bank_account ? `TK: ${contract.party_b.bank_account}` : null,
                contract.party_b.bank_name,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>

          <div className="ct-doc-national">
            <strong>Cộng hoà xã hội chủ nghĩa Việt Nam</strong>
            <em>Độc lập — Tự do — Hạnh phúc</em>
            <span>———— o0o ————</span>
          </div>
        </div>

        <h1 className="ct-doc-title">Hợp đồng cung cấp dịch vụ</h1>
        <p className="ct-doc-subtitle">{contract.title}</p>
        <div className="ct-doc-number">
          Số: {contract.contract_code}
          {contract.quotation_id ? ` · Báo giá nguồn #${contract.quotation_id}` : ''}
        </div>

        <p className="ct-doc-date-line">
          {contract.location ? `${contract.location}, ` : ''}
          {formatLongDate(contract.sign_date)}
        </p>

        {contract.legal_basis && <p className="ct-doc-legal">Căn cứ: {contract.legal_basis}</p>}

        <div className="ct-party-grid">
          <PartyBlock party={contract.party_a} showBudgetCode title="Bên A — Bên thuê dịch vụ" />
          <PartyBlock party={contract.party_b} title="Bên B — Bên cung cấp dịch vụ" />
        </div>

        <div className="ct-doc-article">
          <h3>Điều 1. Nội dung công việc</h3>
          <p>Bên B thực hiện kiểm định, hiệu chuẩn các thiết bị đo lường theo danh mục sau:</p>
          <table className="ct-doc-table">
            <thead>
              <tr>
                <th style={{ width: 34 }}>STT</th>
                <th>Tên thiết bị / nội dung</th>
                <th style={{ width: 58 }}>ĐVT</th>
                <th style={{ width: 46 }}>SL</th>
                <th style={{ width: 90 }}>Đơn giá</th>
                <th style={{ width: 80 }}>Chiết khấu</th>
                <th style={{ width: 48 }}>VAT</th>
                <th style={{ width: 96 }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {contract.items.map((item) => (
                <tr key={item.id || item.line_no}>
                  <td className="center">{item.line_no}</td>
                  <td>
                    <strong>{item.name}</strong>
                    {item.description ? <div style={{ color: '#4a5568' }}>{item.description}</div> : null}
                    {item.location ? <div style={{ color: '#718096' }}>{item.location}</div> : null}
                  </td>
                  <td className="center">{item.unit || '—'}</td>
                  <td className="center">{item.quantity}</td>
                  <td className="num">{formatCurrency(item.unit_price)}</td>
                  <td className="num">{formatCurrency(item.discount_amount)}</td>
                  <td className="center">{item.tax_rate}%</td>
                  <td className="num">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              {travelFee > 0 && (
                <tr>
                  <td className="center">{contract.items.length + 1}</td>
                  <td>
                    <strong>Chi phí đi lại</strong>
                  </td>
                  <td className="center">Lần</td>
                  <td className="center">1</td>
                  <td className="num">{formatCurrency(travelFee)}</td>
                  <td className="num">0 ₫</td>
                  <td className="center">8%</td>
                  <td className="num">{formatCurrency(travelAmount)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="label" colSpan={7}>
                  Tổng trước thuế
                </td>
                <td className="num">{formatCurrency(contract.subtotal)}</td>
              </tr>
              <tr>
                <td className="label" colSpan={7}>
                  Chiết khấu
                </td>
                <td className="num">-{formatCurrency(contract.discount_amount)}</td>
              </tr>
              <tr>
                <td className="label" colSpan={7}>
                  Chi phí đi lại
                </td>
                <td className="num">{formatCurrency(travelFee)}</td>
              </tr>
              <tr>
                <td className="label" colSpan={7}>
                  Thuế GTGT
                </td>
                <td className="num">{formatCurrency(contract.tax_amount)}</td>
              </tr>
              <tr>
                <td className="label" colSpan={7}>
                  <strong>Tổng cộng</strong>
                </td>
                <td className="num">
                  <strong>{formatCurrency(contract.total_amount)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="ct-doc-note">
            Bằng chữ: <strong>{contract.total_in_words}</strong>
          </p>
        </div>

        <div className="ct-doc-article">
          <h3>Điều 2. Thời gian và địa điểm thực hiện</h3>
          <ul>
            <li>
              Thời gian thực hiện:{' '}
              {[contract.start_date ? `từ ${formatDate(contract.start_date)}` : null, contract.end_date ? `đến ${formatDate(contract.end_date)}` : null]
                .filter(Boolean)
                .join(' ') || 'Theo thoả thuận của hai bên'}
              {contract.duration_days ? ` (${contract.duration_days} ngày)` : ''}.
            </li>
            <li>Địa điểm: {contract.location || 'Theo thoả thuận của hai bên'}.</li>
            <li>Kết quả bàn giao: giấy chứng nhận kiểm định/hiệu chuẩn kèm thiết bị sau khi hoàn thành.</li>
          </ul>
        </div>

        <div className="ct-doc-article">
          <h3>Điều 3. Giá trị hợp đồng và phương thức thanh toán</h3>
          <ul>
            <li>
              Tổng giá trị hợp đồng: <strong>{formatCurrency(contract.total_amount)}</strong> (bằng chữ:{' '}
              {contract.total_in_words}).
            </li>
            <li>
              Hình thức thanh toán: chuyển khoản trong vòng {contract.payment_term_days} ngày kể từ ngày nhận đủ
              hồ sơ và hoá đơn.
            </li>
            <li>
              Thông tin thanh toán Bên B: {contract.party_b.bank_account || '—'} —{' '}
              {contract.party_b.bank_name || '—'}.
            </li>
            <li>Đồng tiền thanh toán: Việt Nam đồng (VND).</li>
          </ul>
        </div>

        <div className="ct-doc-article">
          <h3>Điều 4. Quyền và nghĩa vụ của Bên A</h3>
          <ul>
            <li>Cung cấp đầy đủ thiết bị, hồ sơ kỹ thuật và tạo điều kiện để Bên B thực hiện công việc.</li>
            <li>Thanh toán đầy đủ, đúng hạn theo Điều 3 của hợp đồng.</li>
            <li>
              Được quyền yêu cầu kiểm tra chất lượng công việc và nhận kết quả kiểm định, hiệu chuẩn theo quy định.
            </li>
            <li>Chịu trách nhiệm về tính xác thực của thông tin thiết bị do mình cung cấp.</li>
          </ul>
        </div>

        <div className="ct-doc-article">
          <h3>Điều 5. Quyền và nghĩa vụ của Bên B</h3>
          <ul>
            <li>Thực hiện dịch vụ đúng tiêu chuẩn, quy trình và thời gian đã thoả thuận.</li>
            <li>Bảo quản thiết bị trong quá trình thực hiện và bàn giao đầy đủ sau khi hoàn tất.</li>
            <li>Bảo mật thông tin của Bên A và chỉ sử dụng cho mục đích thực hiện hợp đồng.</li>
            <li>Xuất hoá đơn theo quy định hiện hành và phối hợp giải quyết khiếu nại về kết quả dịch vụ.</li>
          </ul>
        </div>

        <div className="ct-doc-article">
          <h3>Điều 6. Điều khoản chung</h3>
          <ul>
            <li>
              Hợp đồng có hiệu lực kể từ ngày ký và được lập thành 02 (hai) bản, mỗi bên giữ 01 (một) bản có giá
              trị pháp lý như nhau.
            </li>
            <li>
              Các tranh chấp phát sinh được giải quyết trước hết bằng thương lượng; nếu không đạt kết quả sẽ được
              giải quyết theo quy định của pháp luật Việt Nam.
            </li>
            <li>Hợp đồng này thay thế các thoả thuận trước đó giữa hai bên về cùng nội dung.</li>
            {contract.notes ? <li>Ghi chú: {contract.notes}</li> : null}
          </ul>
        </div>

        <div className="ct-signature-grid">
          <div className="ct-signature-box">
            <strong>Đại diện Bên A</strong>
            <small>(Ký, ghi rõ họ tên, đóng dấu)</small>
            <div className="ct-signature-space" />
            <div className="ct-signature-name">{contract.party_a.representative || '........................................'}</div>
            {contract.party_a.position ? <small>{contract.party_a.position}</small> : null}
          </div>
          <div className="ct-signature-box">
            <strong>Đại diện Bên B</strong>
            <small>(Ký, ghi rõ họ tên, đóng dấu)</small>
            <div className="ct-signature-space" />
            <div className="ct-signature-name">{contract.party_b.representative || '........................................'}</div>
            {contract.party_b.position ? <small>{contract.party_b.position}</small> : null}
          </div>
        </div>
      </article>
    </div>
  );
}

export default ContractDetailPage;
