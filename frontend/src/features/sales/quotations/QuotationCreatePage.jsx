import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import {
  createQuotationApi,
  extractApiErrorMessage,
  getServiceRequestsForQuotationApi,
  sendDraftQuotationApi,
} from '../../../services/quotation-service.js';
import { formatCurrency } from '../../../utils/formatters.js';
import QuotationLineItemsTable from './components/QuotationLineItemsTable.jsx';
import QuotationPricingSummary from './components/QuotationPricingSummary.jsx';
import ServiceRequestSelectorStep from './components/ServiceRequestSelectorStep.jsx';
import './quotations.css';

const NON_QUOTABLE_STATUSES = new Set([
  'Quoted',
  'Confirmed',
  'InProgress',
  'Completed',
  'Cancelled',
]);

const getDefaultCompletionDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

const normalizeServiceRequest = (rawRequest) => {
  const requestCode = rawRequest.request_code || rawRequest.code || `SR-${rawRequest.id}`;
  const customer = rawRequest.customer || {};
  const locationType = rawRequest.location_type || 'In-lab';
  const rawItems = Array.isArray(rawRequest.items) ? rawRequest.items : [];

  return {
    id: rawRequest.id,
    code: requestCode,
    request_code: requestCode,
    customer_id: customer.id ?? rawRequest.customer_id ?? null,
    customer_name: customer.company_name ?? rawRequest.customer_name ?? 'Khách hàng',
    tax_code: customer.tax_code ?? rawRequest.tax_code ?? 'Chưa cập nhật',
    address: customer.address ?? rawRequest.address ?? 'Chưa cập nhật',
    location_type: locationType,
    status: rawRequest.status || 'New',
    latest_quotation: rawRequest.latest_quotation || null,
    suggested_travel_fee:
      rawRequest.suggested_travel_fee ?? (locationType === 'On-site' ? 1500000 : 0),
    items: rawItems.map((item) => {
      const itemId = item.service_request_item_id ?? item.id;
      const serviceName = item.service_type_name || `Dịch vụ #${item.service_type_id}`;
      const deviceName = item.device_name || `Thiết bị #${item.device_id}`;
      const modelPart = [item.manufacturer, item.model].filter(Boolean).join(' ');
      const standardPart = item.standard_code ? ` theo ${item.standard_code}` : '';

      return {
        service_request_item_id: itemId,
        device_id: item.device_id,
        device_name: deviceName,
        manufacturer: item.manufacturer || '',
        model: item.model || '',
        serial_number: item.serial_number || '',
        internal_code: item.internal_code || `TB-${item.device_id}`,
        service_type_id: item.service_type_id,
        service_type_name: serviceName,
        service_kind: item.service_kind || 'Calibration',
        standard_code: item.standard_code || 'Quy trình ISOCAL',
        default_description:
          item.default_description
          || `${serviceName} - ${deviceName}${modelPart ? ` (${modelPart})` : ''}${standardPart}`,
        suggested_unit_price: item.suggested_unit_price ?? 1000000,
      };
    }),
  };
};

const buildLineItemsFromRequest = (serviceRequest) => {
  if (!serviceRequest || !Array.isArray(serviceRequest.items)) return [];
  const savedLinesMap = new Map(
    (serviceRequest.latest_quotation?.line_items || []).map((li) => [
      Number(li.service_request_item_id),
      li,
    ]),
  );

  return serviceRequest.items.map((item) => {
    const savedLine = savedLinesMap.get(Number(item.service_request_item_id));
    return {
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
      description: savedLine?.description ?? item.default_description,
      unit_price: savedLine?.unit_price ?? item.suggested_unit_price,
      discount_amount: savedLine?.discount_amount ?? 0,
    };
  });
};

function QuotationCreatePage() {
  const [searchParams] = useSearchParams();
  const queryRequestId = searchParams.get('requestId');

  const [serviceRequests, setServiceRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState(getDefaultCompletionDate);
  const [lineItems, setLineItems] = useState([]);
  const [extraDiscount, setExtraDiscount] = useState(0);
  const [travelFee, setTravelFee] = useState(0);

  const [submittingStatus, setSubmittingStatus] = useState('');
  const [sendingDraft, setSendingDraft] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdQuotation, setCreatedQuotation] = useState(null);

  const applySelectedRequest = useCallback((targetRequest) => {
    if (!targetRequest) {
      setSelectedRequestId('');
      setLineItems([]);
      setExtraDiscount(0);
      setTravelFee(0);
      return;
    }

    setSelectedRequestId(String(targetRequest.id));
    const builtLines = buildLineItemsFromRequest(targetRequest);
    setLineItems(builtLines);

    const latestQuote = targetRequest.latest_quotation;
    if (latestQuote) {
      const sumLineDiscount = builtLines.reduce(
        (sum, li) => sum + (Number(li.discount_amount) || 0),
        0,
      );
      const restoredExtra = Math.max(
        0,
        (Number(latestQuote.discount_amount) || 0) - sumLineDiscount,
      );
      setExtraDiscount(restoredExtra);
      setTravelFee(Number(latestQuote.travel_fee) || 0);
      setEstimatedCompletionDate(
        latestQuote.estimated_completion_date || getDefaultCompletionDate(),
      );
    } else {
      setExtraDiscount(0);
      setTravelFee(targetRequest.suggested_travel_fee ?? 0);
      setEstimatedCompletionDate(getDefaultCompletionDate());
    }
  }, []);

  const fetchServiceRequests = useCallback(async () => {
    setLoadingRequests(true);
    setFormError('');
    try {
      const rawList = await getServiceRequestsForQuotationApi();
      const normalizedList = (Array.isArray(rawList) ? rawList : []).map(normalizeServiceRequest);
      setServiceRequests(normalizedList);

      if (normalizedList.length > 0) {
        const matchedFromParam = queryRequestId
          ? normalizedList.find(
              (req) =>
                String(req.id) === String(queryRequestId)
                || req.request_code === queryRequestId
                || req.code === queryRequestId,
            )
          : null;
        const firstQuotable = normalizedList.find(
          (req) =>
            req.status === 'New'
            || req.latest_quotation?.status === 'Draft'
            || req.latest_quotation?.status === 'Rejected',
        );
        const target = matchedFromParam || firstQuotable || normalizedList[0];
        applySelectedRequest(target);
      } else {
        applySelectedRequest(null);
      }
    } catch (error) {
      setFormError(
        extractApiErrorMessage(
          error,
          'Không thể tải danh sách phiếu yêu cầu dịch vụ từ máy chủ.',
        ),
      );
    } finally {
      setLoadingRequests(false);
    }
  }, [applySelectedRequest, queryRequestId]);

  useEffect(() => {
    fetchServiceRequests();
  }, [fetchServiceRequests]);

  const selectedRequest = useMemo(
    () =>
      serviceRequests.find((req) => String(req.id) === String(selectedRequestId)) || null,
    [selectedRequestId, serviceRequests],
  );

  const activeDraftQuotation = useMemo(() => {
    if (!selectedRequest?.latest_quotation) return null;
    return selectedRequest.latest_quotation.status === 'Draft'
      ? selectedRequest.latest_quotation
      : null;
  }, [selectedRequest]);

  const lockedQuotation = useMemo(() => {
    if (!selectedRequest) return null;
    const latest = selectedRequest.latest_quotation;
    if (latest && (latest.status === 'Sent' || latest.status === 'Approved')) {
      return latest;
    }
    if (
      NON_QUOTABLE_STATUSES.has(selectedRequest.status)
      && latest?.status !== 'Rejected'
    ) {
      return (
        latest || {
          quotation_code: `Đơn ${selectedRequest.request_code}`,
          status: selectedRequest.status,
        }
      );
    }
    return null;
  }, [selectedRequest]);

  const handleSelectRequest = (nextRequestId) => {
    const targetRequest =
      serviceRequests.find((req) => String(req.id) === String(nextRequestId)) || null;
    applySelectedRequest(targetRequest);
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
    setLineItems(
      selectedRequest.items.map((item) => ({
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
      })),
    );
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
  const canSubmit = Boolean(
    selectedRequest
      && !lockedQuotation
      && hasValidLineItems
      && isDiscountValid
      && numericTravelFee >= 0,
  );

  const handleSubmitWithStatus = async (status = 'Draft') => {
    if (!canSubmit || !selectedRequest) {
      setFormError(
        lockedQuotation
          ? 'Phiếu yêu cầu này đã có báo giá hiệu lực gửi khách hàng. Không thể tạo thêm bản ghi trùng.'
          : 'Vui lòng kiểm tra lại phiếu yêu cầu, đơn giá, mô tả dòng báo giá và mức chiết khấu hợp lệ trước khi lưu.',
      );
      return;
    }

    setSubmittingStatus(status);
    setFormError('');

    try {
      const payload = {
        service_request_id: Number(selectedRequest.id),
        status,
        extra_discount: Number(extraDiscount) || 0,
        discount_amount: totalDiscountAmount,
        travel_fee: numericTravelFee,
        estimated_completion_date: estimatedCompletionDate || null,
        line_items: lineItems.map((line) => ({
          service_request_item_id: Number(line.service_request_item_id),
          description: line.description.trim(),
          unit_price: Number(line.unit_price),
          discount_amount: Number(line.discount_amount) || 0,
        })),
      };

      const saved = await createQuotationApi(payload);
      const quotationCode =
        saved.quotation_code || `QT-2026-${String(saved.id).padStart(3, '0')}`;

      const updatedQuotationSummary = {
        id: saved.id,
        quotation_code: quotationCode,
        subtotal: saved.subtotal,
        discount_amount: saved.discount_amount,
        travel_fee: saved.travel_fee,
        total_amount: saved.total_amount,
        estimated_completion_date: saved.estimated_completion_date,
        status: saved.status,
        line_items: saved.line_items || [],
      };

      setCreatedQuotation({
        ...saved,
        quotation_code: quotationCode,
        service_request_code: selectedRequest.request_code,
        customer_name: selectedRequest.customer_name,
      });

      setServiceRequests((current) =>
        current.map((req) =>
          req.id === selectedRequest.id
            ? {
                ...req,
                status: saved.service_request_status || req.status,
                latest_quotation: updatedQuotationSummary,
              }
            : req,
        ),
      );
    } catch (error) {
      setFormError(
        extractApiErrorMessage(error, 'Không thể lưu báo giá. Vui lòng kiểm tra lại dữ liệu.'),
      );
    } finally {
      setSubmittingStatus('');
    }
  };

  const handleSendSavedDraft = async () => {
    const draftToSend =
      createdQuotation?.status === 'Draft' ? createdQuotation : activeDraftQuotation;
    if (!draftToSend) return;

    setSendingDraft(true);
    setFormError('');
    try {
      const updated = await sendDraftQuotationApi(draftToSend.id);
      const quotationCode =
        updated.quotation_code || `QT-2026-${String(updated.id).padStart(3, '0')}`;

      setCreatedQuotation({
        ...updated,
        quotation_code: quotationCode,
        service_request_code: selectedRequest?.request_code || '',
        customer_name: selectedRequest?.customer_name || '',
        status: updated.status || 'Sent',
      });

      setServiceRequests((current) =>
        current.map((req) =>
          req.id === updated.service_request_id
            ? {
                ...req,
                status: updated.service_request_status || 'Quoted',
                latest_quotation: {
                  id: updated.id,
                  quotation_code: quotationCode,
                  subtotal: updated.subtotal,
                  discount_amount: updated.discount_amount,
                  travel_fee: updated.travel_fee,
                  total_amount: updated.total_amount,
                  estimated_completion_date: updated.estimated_completion_date,
                  status: updated.status || 'Sent',
                  line_items: updated.line_items || [],
                },
              }
            : req,
        ),
      );
    } catch (error) {
      setFormError(
        extractApiErrorMessage(error, 'Không thể gửi bản nháp báo giá cho khách hàng.'),
      );
    } finally {
      setSendingDraft(false);
    }
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

      {lockedQuotation && !createdQuotation && (
        <div className="qt-demo-banner" role="status">
          <span aria-hidden="true">🔒</span>
          <p>
            <strong>Đơn đã gửi báo giá ({lockedQuotation.quotation_code} · {lockedQuotation.status}):</strong>{' '}
            Phiếu yêu cầu <b>{selectedRequest?.request_code}</b> hiện đã có báo giá hiệu lực
            {lockedQuotation.total_amount !== undefined
              ? ` với tổng tiền ${formatCurrency(lockedQuotation.total_amount)}`
              : ''}
            . Hệ thống đã khóa tạo trùng bản ghi mới — chỉ mở lập lại báo giá khi báo giá hiện tại bị khách hàng <b>Rejected</b>.
          </p>
        </div>
      )}

      {activeDraftQuotation && !createdQuotation && (
        <div className="qt-demo-banner" role="note">
          <span aria-hidden="true">✎</span>
          <p>
            <strong>Đang khôi phục bản nháp {activeDraftQuotation.quotation_code}:</strong>{' '}
            Mọi chỉnh sửa đơn giá, chiết khấu hoặc gửi báo giá bên dưới sẽ <b>cập nhật trực tiếp</b> trên bản ghi nháp này, không sinh thêm bản ghi thừa trong CSDL.
          </p>
        </div>
      )}

      {selectedRequest?.latest_quotation?.status === 'Rejected' && !createdQuotation && (
        <div className="qt-demo-banner" role="note">
          <span aria-hidden="true">↻</span>
          <p>
            <strong>Báo giá trước ({selectedRequest.latest_quotation.quotation_code}) đã bị Từ chối (Rejected):</strong>{' '}
            Bạn có thể điều chỉnh lại đơn giá / mức chiết khấu bên dưới để gửi báo giá thương lượng mới cho khách hàng.
          </p>
        </div>
      )}

      {createdQuotation && (
        <div className="qt-success-banner" role="status">
          <span aria-hidden="true">✓</span>
          <div className="qt-success-body">
            <strong>
              {createdQuotation.is_updated_draft ? 'Đã cập nhật báo giá' : 'Đã lưu báo giá'}{' '}
              #{createdQuotation.quotation_code} (
              {createdQuotation.status === 'Sent'
                ? 'Đã gửi khách hàng · Phiếu chuyển sang Quoted'
                : 'Bản nháp Draft'}
              )
            </strong>
            <p>
              Phiếu yêu cầu: <b>{createdQuotation.service_request_code}</b> ({createdQuotation.customer_name}) ·{' '}
              Tạm tính: <b>{formatCurrency(createdQuotation.subtotal)}</b> · Giảm giá:{' '}
              <b>-{formatCurrency(createdQuotation.discount_amount)}</b> · Phí di chuyển:{' '}
              <b>+{formatCurrency(createdQuotation.travel_fee)}</b> → Tổng cộng:{' '}
              <strong>{formatCurrency(createdQuotation.total_amount)}</strong>
            </p>
            {createdQuotation.status === 'Draft' && (
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  className="button button-primary"
                  disabled={sendingDraft}
                  onClick={handleSendSavedDraft}
                  type="button"
                >
                  {sendingDraft
                    ? 'Đang gửi cho khách hàng...'
                    : '✉ Gửi ngay bản nháp này cho khách hàng (Chuyển sang Sent)'}
                </button>
              </div>
            )}
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
          loadingRequests={loadingRequests}
          onDateChange={setEstimatedCompletionDate}
          onRefreshRequests={fetchServiceRequests}
          onSelectRequest={handleSelectRequest}
          selectedRequest={selectedRequest}
          selectedRequestId={selectedRequestId}
          serviceRequests={serviceRequests}
        />

        <QuotationLineItemsTable
          lineItems={lineItems}
          onApplyPresetDiscount={handleApplyPresetDiscount}
          onResetSuggestedPrices={handleResetSuggestedPrices}
          onUpdateLineItem={handleUpdateLineItem}
        />

        <QuotationPricingSummary
          activeDraftQuotation={activeDraftQuotation}
          canSubmit={canSubmit}
          extraDiscount={extraDiscount}
          formError={formError}
          hasValidLineItems={hasValidLineItems}
          isDiscountValid={isDiscountValid}
          lineDiscountTotal={lineDiscountTotal}
          lockedQuotation={lockedQuotation}
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
          submittingStatus={submittingStatus}
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
