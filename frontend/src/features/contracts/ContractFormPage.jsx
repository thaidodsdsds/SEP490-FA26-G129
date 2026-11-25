import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SectionCard from '../../components/ui/SectionCard.jsx';
import {
  createContractApi,
  extractApiErrorMessage,
  getContractDetailApi,
  getContractPrefillApi,
  getNextContractCodeApi,
  listAvailableQuotationsApi,
  updateContractApi,
} from '../../services/contract-service.js';
import { formatCurrency } from '../../utils/formatters.js';
import { numberToVietnameseWords } from '../../utils/number-to-words.js';
import './contracts.css';

const emptyParty = () => ({
  name: '',
  representative: '',
  position: '',
  address: '',
  phone: '',
  fax: '',
  tax_code: '',
  bank_account: '',
  bank_name: '',
  budget_code: '',
});

const emptyItem = () => ({
  name: '',
  description: '',
  location: '',
  execution_time: '',
  quantity: 1,
  unit: 'Thiết bị',
  unit_price: 0,
  discount_amount: 0,
  tax_rate: 5,
  service_request_item_id: null,
  quotation_line_item_id: null,
});

const todayIso = () => new Date().toISOString().slice(0, 10);

const Field = ({ label, hint, children }) => (
  <label className="ct-field">
    <span>{label}</span>
    {children}
    {hint ? <small className="ct-hint">{hint}</small> : null}
  </label>
);

const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const round = (value) => Math.round(Number(value) || 0);

function ContractFormPage({ basePath }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    quotation_id: '',
    contract_code: '',
    title: 'Hợp đồng cung cấp dịch vụ kiểm định, hiệu chuẩn thiết bị đo lường',
    sign_date: todayIso(),
    start_date: '',
    end_date: '',
    duration_days: '',
    location: '',
    payment_term_days: 30,
    legal_basis: '',
    notes: '',
    travel_fee: 0,
    party_a: emptyParty(),
    party_b: emptyParty(),
  });
  const [items, setItems] = useState([emptyItem()]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const applyPrefill = useCallback((prefill) => {
    setForm({
      quotation_id: prefill.quotation_id,
      contract_code: prefill.suggested_code || '',
      title: prefill.title || '',
      sign_date: prefill.sign_date || todayIso(),
      start_date: prefill.start_date || '',
      end_date: prefill.end_date || '',
      duration_days: prefill.duration_days ?? '',
      location: prefill.location || '',
      payment_term_days: prefill.payment_term_days ?? 30,
      legal_basis: prefill.legal_basis || '',
      notes: prefill.notes || '',
      travel_fee: prefill.travel_fee ?? 0,
      party_a: { ...emptyParty(), ...(prefill.party_a || {}) },
      party_b: { ...emptyParty(), ...(prefill.party_b || {}) },
    });
    setItems(
      (prefill.items || []).map((item) => ({
        ...emptyItem(),
        ...item,
        quantity: Number(item.quantity ?? 1),
        unit_price: Number(item.unit_price ?? 0),
        discount_amount: Number(item.discount_amount ?? 0),
        tax_rate: Number(item.tax_rate ?? 5),
      })),
    );
  }, []);

  const loadQuotation = useCallback(
    async (quotationId) => {
      if (!quotationId) return;
      setLoadingPrefill(true);
      setError('');
      try {
        const prefill = await getContractPrefillApi(quotationId);
        applyPrefill(prefill);
      } catch (loadError) {
        setError(extractApiErrorMessage(loadError, 'Không tải được dữ liệu báo giá.'));
      } finally {
        setLoadingPrefill(false);
      }
    },
    [applyPrefill],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (isEdit) {
          const detail = await getContractDetailApi(id);
          if (cancelled) return;
          setForm({
            quotation_id: detail.quotation_id ?? '',
            contract_code: detail.contract_code,
            title: detail.title,
            sign_date: detail.sign_date || '',
            start_date: detail.start_date || '',
            end_date: detail.end_date || '',
            duration_days: detail.duration_days ?? '',
            location: detail.location || '',
            payment_term_days: detail.payment_term_days,
            legal_basis: detail.legal_basis || '',
            notes: detail.notes || '',
            travel_fee: detail.travel_fee,
            party_a: { ...emptyParty(), ...(detail.party_a || {}) },
            party_b: { ...emptyParty(), ...(detail.party_b || {}) },
          });
          setItems(
            (detail.items || []).map((item) => ({
              ...emptyItem(),
              ...item,
              quantity: Number(item.quantity ?? 1),
              unit_price: Number(item.unit_price ?? 0),
              discount_amount: Number(item.discount_amount ?? 0),
              tax_rate: Number(item.tax_rate ?? 5),
            })),
          );
          return;
        }

        const [availableQuotations, nextCode] = await Promise.all([
          listAvailableQuotationsApi(),
          getNextContractCodeApi().catch(() => ''),
        ]);
        if (cancelled) return;

        setQuotations(availableQuotations);
        setForm((previous) => ({
          ...previous,
          contract_code: nextCode || previous.contract_code,
        }));

        const queryQuotationId = searchParams.get('quotationId');
        if (queryQuotationId) {
          await loadQuotation(queryQuotationId);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(extractApiErrorMessage(loadError, 'Không tải được dữ liệu hợp đồng.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let itemTax = 0;

    items.forEach((item) => {
      const gross = round(toNumber(item.quantity) * toNumber(item.unit_price));
      const discount = Math.min(round(toNumber(item.discount_amount)), gross);
      const tax = round(((gross - discount) * toNumber(item.tax_rate)) / 100);
      subtotal += gross;
      discountTotal += discount;
      itemTax += tax;
    });

    const travelFee = round(toNumber(form.travel_fee));
    const travelTax = round((travelFee * 8) / 100);
    const taxAmount = itemTax + travelTax;
    const totalAmount = subtotal - discountTotal + travelFee + taxAmount;

    return { subtotal, discountTotal, taxAmount, totalAmount, travelFee };
  }, [items, form.travel_fee]);

  const updateForm = (patch) => setForm((previous) => ({ ...previous, ...patch }));

  const updateParty = (side, field, value) => {
    setForm((previous) => ({
      ...previous,
      [side]: { ...previous[side], [field]: value },
    }));
  };

  const updateItem = (index, patch) => {
    setItems((previous) =>
      previous.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (index) => {
    setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');

    if (!isEdit && !form.quotation_id) {
      setError('Vui lòng chọn báo giá nguồn (chỉ báo giá đã được duyệt mới lập được hợp đồng).');
      return;
    }

    if (!form.contract_code.trim()) {
      setError('Mã hợp đồng là bắt buộc.');
      return;
    }

    if (items.length === 0) {
      setError('Hợp đồng phải có ít nhất một hạng mục.');
      return;
    }

    const invalidItem = items.find((item) => !String(item.name || '').trim());
    if (invalidItem) {
      setError('Mỗi hạng mục phải có tên thiết bị/nội dung.');
      return;
    }

    if (!form.party_a.name.trim() || !form.party_b.name.trim()) {
      setError('Thiếu tên pháp lý của Bên A hoặc Bên B.');
      return;
    }

    const payload = {
      quotation_id: Number(form.quotation_id),
      contract_code: form.contract_code.trim(),
      title: form.title.trim(),
      sign_date: form.sign_date || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      duration_days: form.duration_days === '' ? null : Number(form.duration_days),
      location: form.location,
      payment_term_days: Number(form.payment_term_days ?? 30),
      legal_basis: form.legal_basis,
      notes: form.notes,
      travel_fee: toNumber(form.travel_fee),
      party_a: form.party_a,
      party_b: form.party_b,
      items: items.map((item) => ({
        name: item.name,
        description: item.description,
        location: item.location,
        execution_time: item.execution_time,
        quantity: toNumber(item.quantity),
        unit: item.unit,
        unit_price: toNumber(item.unit_price),
        discount_amount: toNumber(item.discount_amount),
        tax_rate: toNumber(item.tax_rate),
        service_request_item_id: item.service_request_item_id ?? null,
        quotation_line_item_id: item.quotation_line_item_id ?? null,
      })),
    };

    setSaving(true);
    try {
      const saved = isEdit
        ? await updateContractApi(id, payload)
        : await createContractApi(payload);
      navigate(`${basePath}/${saved.id}`, { replace: true });
    } catch (saveError) {
      setError(extractApiErrorMessage(saveError, 'Không lưu được hợp đồng.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="dash-page ct-page ct-empty">Đang tải dữ liệu hợp đồng…</div>;
  }

  return (
    <div className="dash-page ct-page">
      <PageHeader
        eyebrow="Hợp đồng"
        title={isEdit ? `Chỉnh sửa ${form.contract_code || 'hợp đồng'}` : 'Tạo hợp đồng dịch vụ'}
        description={
          isEdit
            ? 'Chỉ hợp đồng ở trạng thái Bản nháp hoặc Chờ duyệt mới được chỉnh sửa. Sau khi duyệt, hãy huỷ và tạo hợp đồng mới nếu cần thay đổi.'
            : 'Hợp đồng được lập từ báo giá đã được khách hàng chấp thuận; giá trị và hạng mục được sao chép tại thời điểm lập.'
        }
        actions={
          <Link className="button button-secondary" to={`${basePath}/${isEdit ? id : ''}`.replace(/\/$/, '')}>
            Huỷ
          </Link>
        }
      />

      {error && <div className="ct-error-banner">{error}</div>}

      <form className="ct-form" onSubmit={handleSave}>
        <SectionCard title="Thông tin hợp đồng" subtitle="Mã hợp đồng có thể chỉnh sửa trước khi lưu (tối đa 50 ký tự).">
          <div className="ct-section">
            {!isEdit && (
              <Field label="Báo giá nguồn (đã duyệt)" hint="Chỉ hiển thị báo giá Approved chưa có hợp đồng hiệu lực.">
                <select
                  disabled={loadingPrefill}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) {
                      updateForm({ quotation_id: '' });
                      return;
                    }
                    loadQuotation(value);
                  }}
                  value={form.quotation_id}
                >
                  <option value="">— Chọn báo giá —</option>
                  {quotations.map((quotation) => (
                    <option key={quotation.id} value={quotation.id}>
                      {quotation.quotation_code} · {quotation.customer.company_name} ·{' '}
                      {formatCurrency(quotation.total_amount)}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="ct-grid-3">
              <Field label="Mã hợp đồng">
                <input
                  maxLength={50}
                  onChange={(event) => updateForm({ contract_code: event.target.value })}
                  required
                  value={form.contract_code}
                />
              </Field>
              <Field label="Ngày ký">
                <input
                  onChange={(event) => updateForm({ sign_date: event.target.value })}
                  type="date"
                  value={form.sign_date}
                />
              </Field>
              <Field label="Thời hạn thanh toán (ngày)">
                <input
                  min="0"
                  onChange={(event) => updateForm({ payment_term_days: event.target.value })}
                  type="number"
                  value={form.payment_term_days}
                />
              </Field>
            </div>

            <Field label="Tên hợp đồng">
              <input
                onChange={(event) => updateForm({ title: event.target.value })}
                value={form.title}
              />
            </Field>

            <div className="ct-grid-3">
              <Field label="Ngày bắt đầu">
                <input
                  onChange={(event) => updateForm({ start_date: event.target.value })}
                  type="date"
                  value={form.start_date}
                />
              </Field>
              <Field label="Ngày kết thúc">
                <input
                  onChange={(event) => updateForm({ end_date: event.target.value })}
                  type="date"
                  value={form.end_date}
                />
              </Field>
              <Field label="Số ngày thực hiện">
                <input
                  min="0"
                  onChange={(event) => updateForm({ duration_days: event.target.value })}
                  type="number"
                  value={form.duration_days}
                />
              </Field>
            </div>

            <div className="ct-grid-2">
              <Field label="Địa điểm thực hiện">
                <input
                  onChange={(event) => updateForm({ location: event.target.value })}
                  value={form.location}
                />
              </Field>
              <Field label="Căn cứ pháp lý (tuỳ chọn)">
                <input
                  onChange={(event) => updateForm({ legal_basis: event.target.value })}
                  placeholder="VD: Báo giá QT-2026-001 đã được chấp thuận"
                  value={form.legal_basis}
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Bên A — Khách hàng" subtitle="Thông tin được sao chép vào hợp đồng tại thời điểm lập.">
          <div className="ct-grid-3">
            <Field label="Tên đơn vị">
              <input
                onChange={(event) => updateParty('party_a', 'name', event.target.value)}
                required
                value={form.party_a.name}
              />
            </Field>
            <Field label="Người đại diện">
              <input
                onChange={(event) => updateParty('party_a', 'representative', event.target.value)}
                value={form.party_a.representative}
              />
            </Field>
            <Field label="Chức vụ">
              <input
                onChange={(event) => updateParty('party_a', 'position', event.target.value)}
                value={form.party_a.position}
              />
            </Field>
            <Field label="Mã số thuế">
              <input
                onChange={(event) => updateParty('party_a', 'tax_code', event.target.value)}
                value={form.party_a.tax_code}
              />
            </Field>
            <Field label="Điện thoại">
              <input
                onChange={(event) => updateParty('party_a', 'phone', event.target.value)}
                value={form.party_a.phone}
              />
            </Field>
            <Field label="Fax">
              <input
                onChange={(event) => updateParty('party_a', 'fax', event.target.value)}
                value={form.party_a.fax}
              />
            </Field>
          </div>
          <div className="ct-grid-2">
            <Field label="Địa chỉ">
              <input
                onChange={(event) => updateParty('party_a', 'address', event.target.value)}
                value={form.party_a.address}
              />
            </Field>
            <Field label="Mã QHNS (tuỳ chọn)">
              <input
                onChange={(event) => updateParty('party_a', 'budget_code', event.target.value)}
                value={form.party_a.budget_code}
              />
            </Field>
            <Field label="Số tài khoản">
              <input
                onChange={(event) => updateParty('party_a', 'bank_account', event.target.value)}
                value={form.party_a.bank_account}
              />
            </Field>
            <Field label="Ngân hàng">
              <input
                onChange={(event) => updateParty('party_a', 'bank_name', event.target.value)}
                value={form.party_a.bank_name}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Bên B — Đơn vị cung cấp dịch vụ" subtitle="Lấy từ hồ sơ công ty (company_profiles), có thể chỉnh riêng cho hợp đồng này.">
          <div className="ct-grid-3">
            <Field label="Tên đơn vị">
              <input
                onChange={(event) => updateParty('party_b', 'name', event.target.value)}
                required
                value={form.party_b.name}
              />
            </Field>
            <Field label="Người đại diện">
              <input
                onChange={(event) => updateParty('party_b', 'representative', event.target.value)}
                value={form.party_b.representative}
              />
            </Field>
            <Field label="Chức vụ">
              <input
                onChange={(event) => updateParty('party_b', 'position', event.target.value)}
                value={form.party_b.position}
              />
            </Field>
            <Field label="Mã số thuế">
              <input
                onChange={(event) => updateParty('party_b', 'tax_code', event.target.value)}
                value={form.party_b.tax_code}
              />
            </Field>
            <Field label="Điện thoại">
              <input
                onChange={(event) => updateParty('party_b', 'phone', event.target.value)}
                value={form.party_b.phone}
              />
            </Field>
            <Field label="Fax">
              <input
                onChange={(event) => updateParty('party_b', 'fax', event.target.value)}
                value={form.party_b.fax}
              />
            </Field>
          </div>
          <div className="ct-grid-2">
            <Field label="Địa chỉ">
              <input
                onChange={(event) => updateParty('party_b', 'address', event.target.value)}
                value={form.party_b.address}
              />
            </Field>
            <Field label="Số tài khoản">
              <input
                onChange={(event) => updateParty('party_b', 'bank_account', event.target.value)}
                value={form.party_b.bank_account}
              />
            </Field>
            <Field label="Ngân hàng">
              <input
                onChange={(event) => updateParty('party_b', 'bank_name', event.target.value)}
                value={form.party_b.bank_name}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Hạng mục hợp đồng"
          subtitle="Đơn giá và chiết khấu lấy từ báo giá; VAT mặc định 5% cho dịch vụ, có thể chỉnh từng dòng."
          action={
            <button
              className="button button-secondary"
              onClick={() => setItems((previous) => [...previous, emptyItem()])}
              type="button"
            >
              + Thêm dòng
            </button>
          }
        >
          <div className="ct-items-scroll">
            <table className="ct-items-table">
              <thead>
                <tr>
                  <th className="ct-col-index">STT</th>
                  <th>Tên thiết bị / nội dung</th>
                  <th>ĐVT</th>
                  <th>SL</th>
                  <th>Đơn giá</th>
                  <th>Chiết khấu</th>
                  <th>VAT %</th>
                  <th>Thành tiền</th>
                  <th className="ct-col-actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const gross = round(toNumber(item.quantity) * toNumber(item.unit_price));
                  const discount = Math.min(round(toNumber(item.discount_amount)), gross);
                  const tax = round(((gross - discount) * toNumber(item.tax_rate)) / 100);
                  const amount = gross - discount + tax;

                  return (
                    <tr key={`item-${index}`}>
                      <td className="ct-col-index">{index + 1}</td>
                      <td>
                        <input
                          onChange={(event) => updateItem(index, { name: event.target.value })}
                          placeholder="Tên thiết bị"
                          value={item.name}
                        />
                        <input
                          onChange={(event) => updateItem(index, { description: event.target.value })}
                          placeholder="Model / hãng / serial…"
                          style={{ marginTop: 4 }}
                          value={item.description || ''}
                        />
                        <input
                          onChange={(event) => updateItem(index, { location: event.target.value })}
                          placeholder="Địa điểm thực hiện"
                          style={{ marginTop: 4 }}
                          value={item.location || ''}
                        />
                      </td>
                      <td style={{ width: 84 }}>
                        <input
                          onChange={(event) => updateItem(index, { unit: event.target.value })}
                          value={item.unit || ''}
                        />
                      </td>
                      <td style={{ width: 78 }}>
                        <input
                          min="0"
                          onChange={(event) => updateItem(index, { quantity: event.target.value })}
                          step="0.001"
                          type="number"
                          value={item.quantity}
                        />
                      </td>
                      <td style={{ width: 128 }}>
                        <input
                          min="0"
                          onChange={(event) => updateItem(index, { unit_price: event.target.value })}
                          step="1000"
                          type="number"
                          value={item.unit_price}
                        />
                      </td>
                      <td style={{ width: 118 }}>
                        <input
                          min="0"
                          onChange={(event) => updateItem(index, { discount_amount: event.target.value })}
                          step="1000"
                          type="number"
                          value={item.discount_amount}
                        />
                      </td>
                      <td style={{ width: 74 }}>
                        <input
                          max="100"
                          min="0"
                          onChange={(event) => updateItem(index, { tax_rate: event.target.value })}
                          step="0.5"
                          type="number"
                          value={item.tax_rate}
                        />
                      </td>
                      <td style={{ width: 128, textAlign: 'right', fontWeight: 700, paddingTop: 12 }}>
                        {formatCurrency(amount)}
                      </td>
                      <td className="ct-col-actions">
                        <button
                          aria-label="Xoá dòng"
                          className="ct-row-remove"
                          onClick={() => removeItem(index)}
                          type="button"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="ct-grid-3">
            <Field label="Chi phí đi lại (chưa VAT)" hint="VAT 8% được tính tự động khi in hợp đồng.">
              <input
                min="0"
                onChange={(event) => updateForm({ travel_fee: event.target.value })}
                step="1000"
                type="number"
                value={form.travel_fee}
              />
            </Field>
            <Field label="Ghi chú hợp đồng">
              <input
                onChange={(event) => updateForm({ notes: event.target.value })}
                value={form.notes}
              />
            </Field>
          </div>

          <div className="ct-totals">
            <div className="ct-total-row">
              <span>Tổng trước thuế</span>
              <strong>{formatCurrency(totals.subtotal)}</strong>
            </div>
            <div className="ct-total-row">
              <span>Chiết khấu</span>
              <strong>-{formatCurrency(totals.discountTotal)}</strong>
            </div>
            <div className="ct-total-row">
              <span>Chi phí đi lại</span>
              <strong>{formatCurrency(totals.travelFee)}</strong>
            </div>
            <div className="ct-total-row">
              <span>Thuế GTGT (dịch vụ 5% · đi lại 8%)</span>
              <strong>{formatCurrency(totals.taxAmount)}</strong>
            </div>
            <div className="ct-total-row ct-total-row--grand">
              <span>Tổng cộng</span>
              <strong>{formatCurrency(totals.totalAmount)}</strong>
            </div>
            <p className="ct-in-words">Bằng chữ: {numberToVietnameseWords(totals.totalAmount)}</p>
          </div>
        </SectionCard>

        <div className="ct-action-right ct-no-print">
          <Link className="button button-secondary" to={isEdit ? `${basePath}/${id}` : basePath}>
            Quay lại
          </Link>
          <button className="button button-primary" disabled={saving} type="submit">
            {saving ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Lưu hợp đồng'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ContractFormPage;
