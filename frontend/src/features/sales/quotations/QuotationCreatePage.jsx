import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import { formatCurrency } from '../../../utils/formatters.js';
import QuotationLineItemsTable from './components/QuotationLineItemsTable.jsx';
import QuotationPricingSummary from './components/QuotationPricingSummary.jsx';
import ServiceRequestSelectorStep from './components/ServiceRequestSelectorStep.jsx';
import { serviceRequestsForQuotation } from './mockData.js';
import './quotations.css';

const getDefaultCompletionDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

const buildLineItemsFromRequest = (serviceRequest) => {
  if (!serviceRequest) return [];
  return serviceRequest.items.map((item) => ({
    service_request_item_id: item.service_request_item_id,
    device_id: item.device_id,
    device_name: item.device_name,
    manufacturer: item.manufacturer,
    model: item.model,
    serial_number: item.serial_number,
    internal_code: item.internal_code,
    service_type_id: item.service_type_id,
    service_type_name: item.service_type_name,
    service_kind: item.service_kind,
    standard_code: item.standard_code,
    description: item.default_description,
    unit_price: item.suggested_unit_price,
    discount_amount: 0,
  }));
};

function QuotationCreatePage() {
  const [searchParams] = useSearchParams();
  const initialRequestId = searchParams.get('requestId') || String(serviceRequestsForQuotation[0]?.id || '');
  const initialRequest = serviceRequestsForQuotation.find(
    (req) => String(req.id) === String(initialRequestId) || req.code === initialRequestId,
  ) || serviceRequestsForQuotation[0];

  const [selectedRequestId, setSelectedRequestId] = useState(
    initialRequest ? String(initialRequest.id) : '',
  );
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState(getDefaultCompletionDate);
  const [lineItems, setLineItems] = useState(() => buildLineItemsFromRequest(initialRequest));
  const [extraDiscount, setExtraDiscount] = useState(0);
  const [travelFee, setTravelFee] = useState(initialRequest?.suggested_travel_fee ?? 0);
  const [formError, setFormError] = useState('');
  const [createdQuotation, setCreatedQuotation] = useState(null);

  const selectedRequest = useMemo(
    () =>
      serviceRequestsForQuotation.find((req) => String(req.id) === String(selectedRequestId)) || null,
    [selectedRequestId],
  );

  const handleSelectRequest = (nextRequestId) => {
    setSelectedRequestId(nextRequestId);
    const targetRequest =
      serviceRequestsForQuotation.find((req) => String(req.id) === String(nextRequestId)) || null;
    setLineItems(buildLineItemsFromRequest(targetRequest));
    setExtraDiscount(0);
    setTravelFee(targetRequest?.suggested_travel_fee ?? 0);
    setFormError('');
    setCreatedQuotation(null);
  };

  const handleUpdateLineItem = (serviceRequestItemId, field, value) => {
    setLineItems((current) =>
      current.map((item) =>
        item.service_request_item_id === serviceRequestItemId
          ? { ...item, [field]: value }
          : item,
      ),
    );
    setFormError('');
  };

  const handleApplyPresetDiscount = (serviceRequestItemId, percentage) => {
    setLineItems((current) =>
      current.map((item) => {
        if (item.service_request_item_id !== serviceRequestItemId) return item;
        const unitPrice = Number(item.unit_price) || 0;
        const calculatedDiscount = Math.round((unitPrice * percentage) / 100);
        return {
          ...item,
          discount_amount: calculatedDiscount,
        };
      }),
    );
    setFormError('');
  };

  const handleResetSuggestedPrices = () => {
    if (!selectedRequest) return;
    setLineItems(buildLineItemsFromRequest(selectedRequest));
    setExtraDiscount(0);
    setTravelFee(selectedRequest.suggested_travel_fee ?? 0);
    setFormError('');
  };

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + (Number(item.unit_price) || 0), 0),
    [lineItems],
  );

  const lineDiscountTotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + (Number(item.discount_amount) || 0), 0),
    [lineItems],
  );

  const totalDiscountAmount = useMemo(
    () => lineDiscountTotal + (Number(extraDiscount) || 0),
    [extraDiscount, lineDiscountTotal],
  );

  const numericTravelFee = Math.max(0, Number(travelFee) || 0);
  const totalAmount = Math.max(0, subtotal - totalDiscountAmount + numericTravelFee);

  const hasValidLineItems = useMemo(
    () =>
      lineItems.length > 0
      && lineItems.every((item) => {
        const unitPrice = Number(item.unit_price);
        const discount = Number(item.discount_amount) || 0;
        return (
          typeof item.description === 'string'
          && item.description.trim().length > 0
          && Number.isFinite(unitPrice)
          && unitPrice > 0
          && discount >= 0
          && discount <= unitPrice
        );
      }),
    [lineItems],
  );

  const isDiscountValid = totalDiscountAmount >= 0 && totalDiscountAmount <= subtotal;
  const canSubmit = Boolean(selectedRequest && hasValidLineItems && isDiscountValid && numericTravelFee >= 0);

  const handleSubmitWithStatus = (status = 'Draft') => {
    if (!canSubmit || !selectedRequest) {
      setFormError('Vui lòng kiểm tra lại đơn giá, mô tả dòng báo giá và mức chiết khấu hợp lệ trước khi lưu.');
      return;
    }

    const sequence = String(Date.now()).slice(-4);
    const payloadPreview = {
      id: `QT-2026-${sequence}`,
      service_request_id: selectedRequest.id,
      service_request_code: selectedRequest.code,
      customer_name: selectedRequest.customer_name,
      subtotal,
      discount_amount: totalDiscountAmount,
      travel_fee: numericTravelFee,
      total_amount: totalAmount,
      estimated_completion_date: estimatedCompletionDate || null,
      status,
      line_items: lineItems.map((line) => ({
        service_request_item_id: line.service_request_item_id,
        description: line.description.trim(),
        unit_price: Number(line.unit_price),
        discount_amount: Number(line.discount_amount) || 0,
      })),
    };

    setCreatedQuotation(payloadPreview);
    setFormError('');
  };

  return (
    <div className="dash-page sales-quotation-page">
      <PageHeader
        actions={(
          <div className="qt-header-actions">
            <Link className="button button-secondary" to="/internal/sales/service-requests/new">
              + Tạo phiếu yêu cầu mới
            </Link>
            <Link className="button button-secondary" to="/internal/sales">
              ← Quay lại tổng quan
            </Link>
          </div>
        )}
        description="Lập bảng báo giá chi tiết cho từng hạng mục thiết bị – dịch vụ, cấu hình giảm giá thương mại và phí di chuyển On-site theo chuẩn công thức kế toán ISOCAL."
        eyebrow="SALES · QUOTATION BUILDER"
        title="Tạo báo giá dịch vụ (Quotation)"
      />

      <div className="qt-demo-banner" role="note">
        <span aria-hidden="true">ⓘ</span>
        <p>
          <strong>Chế độ giao diện mẫu (Ready for API):</strong> Dữ liệu báo giá tuân thủ đúng cấu trúc bảng{' '}
          <code>quotations</code> và <code>quotation_line_items</code>, sẵn sàng kết nối API backend.
        </p>
      </div>

      {createdQuotation && (
        <div className="qt-success-banner" role="status">
          <span aria-hidden="true">✓</span>
          <div className="qt-success-body">
            <strong>
              Đã khởi tạo báo giá {createdQuotation.id} ({createdQuotation.status === 'Sent' ? 'Đã gửi khách hàng' : 'Bản nháp Draft'})
            </strong>
            <p>
              Đơn liên kết: <b>{createdQuotation.service_request_code}</b> ({createdQuotation.customer_name}) ·{' '}
              Tạm tính: <b>{formatCurrency(createdQuotation.subtotal)}</b> · Giảm giá:{' '}
              <b>-{formatCurrency(createdQuotation.discount_amount)}</b> · Phí di chuyển:{' '}
              <b>+{formatCurrency(createdQuotation.travel_fee)}</b> → Tổng cộng:{' '}
              <strong>{formatCurrency(createdQuotation.total_amount)}</strong>
            </p>
          </div>
          <button
            aria-label="Đóng thông báo"
            onClick={() => setCreatedQuotation(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <div className="qt-form">
        <ServiceRequestSelectorStep
          estimatedCompletionDate={estimatedCompletionDate}
          onDateChange={setEstimatedCompletionDate}
          onSelectRequest={handleSelectRequest}
          selectedRequest={selectedRequest}
          selectedRequestId={selectedRequestId}
          serviceRequests={serviceRequestsForQuotation}
        />

        <QuotationLineItemsTable
          lineItems={lineItems}
          onApplyPresetDiscount={handleApplyPresetDiscount}
          onResetSuggestedPrices={handleResetSuggestedPrices}
          onUpdateLineItem={handleUpdateLineItem}
        />

        <QuotationPricingSummary
          canSubmit={canSubmit}
          extraDiscount={extraDiscount}
          formError={formError}
          hasValidLineItems={hasValidLineItems}
          isDiscountValid={isDiscountValid}
          lineDiscountTotal={lineDiscountTotal}
          onExtraDiscountChange={(val) => {
            setExtraDiscount(Math.max(0, val));
            setFormError('');
          }}
          onSubmitWithStatus={handleSubmitWithStatus}
          onTravelFeeChange={(val) => {
            setTravelFee(Math.max(0, val));
            setFormError('');
          }}
          selectedRequest={selectedRequest}
          subtotal={subtotal}
          totalAmount={totalAmount}
          totalDiscountAmount={totalDiscountAmount}
          travelFee={travelFee}
        />
      </div>
    </div>
  );
}

export default QuotationCreatePage;

