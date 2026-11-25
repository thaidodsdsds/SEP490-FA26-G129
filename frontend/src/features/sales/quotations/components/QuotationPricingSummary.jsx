import { formatCurrency } from '../../../../utils/formatters.js';
import { TRAVEL_FEE_PRESETS } from '../mockData.js';

function QuotationPricingSummary({
  selectedRequest,
  subtotal,
  lineDiscountTotal,
  extraDiscount,
  totalDiscountAmount,
  travelFee,
  totalAmount,
  hasValidLineItems,
  isDiscountValid,
  canSubmit,
  activeDraftQuotation,
  lockedQuotation,
  submittingStatus,
  formError,
  isHeadSales = false,
  salesSubmissionNote = '',
  onSalesSubmissionNoteChange,
  onExtraDiscountChange,
  onTravelFeeChange,
  onSubmitWithStatus,
}) {
  const isUnchangedFromRejection = Boolean(
    activeDraftQuotation
      && activeDraftQuotation.head_sales_decision === 'Rejected'
      && activeDraftQuotation.last_rejected_total != null
      && Math.abs(Number(totalAmount) - Number(activeDraftQuotation.last_rejected_total)) < 0.01
      && Math.abs(
        Number(totalDiscountAmount) - Number(activeDraftQuotation.last_rejected_discount || 0),
      ) < 0.01,
  );
  return (
    <section className="qt-card qt-summary-card" aria-labelledby="qt-step3-heading">
      <div className="qt-section-heading">
        <span className="qt-step">3</span>
        <div>
          <h2 id="qt-step3-heading">Chiết khấu, phí di chuyển & tổng hợp báo giá</h2>
          <p>
            Hệ thống tự động kiểm tra ràng buộc <code>discount_amount &lt;= subtotal</code> và công thức{' '}
            <code>total_amount = subtotal - discount_amount + travel_fee</code>.
          </p>
        </div>
      </div>

      <div className="qt-adjustments-grid">
        <div className="qt-adjustment-box">
          <div className="qt-adjustment-header">
            <strong>Chiết khấu / Giảm giá (discount_amount)</strong>
            <span>Tổng hợp giảm giá từng dòng và chiết khấu thêm trên toàn báo giá</span>
          </div>

          <div className="qt-discount-breakdown">
            <div>
              <span>Tổng giảm giá trên các dòng hạng mục:</span>
              <strong>{formatCurrency(lineDiscountTotal)}</strong>
            </div>

            <label className="qt-field">
              <span>Chiết khấu thương mại cộng thêm (VNĐ)</span>
              <input
                min="0"
                onChange={(event) =>
                  onExtraDiscountChange(event.target.value === '' ? 0 : Number(event.target.value))
                }
                placeholder="0"
                step="50000"
                type="number"
                value={extraDiscount || ''}
              />
            </label>

            <div className="qt-discount-total-row">
              <span>Tổng giảm giá báo giá (discount_amount):</span>
              <strong className={!isDiscountValid ? 'qt-text-danger' : ''}>
                -{formatCurrency(totalDiscountAmount)}
              </strong>
            </div>

            {!isDiscountValid && (
              <small className="qt-field-error">
                Tổng giảm giá ({formatCurrency(totalDiscountAmount)}) không được vượt quá Tạm tính ({formatCurrency(subtotal)}).
              </small>
            )}
          </div>
        </div>

        <div className="qt-adjustment-box">
          <div className="qt-adjustment-header">
            <strong>Phí di chuyển / công tác (travel_fee)</strong>
            <span>
              {selectedRequest?.location_type === 'On-site'
                ? 'Đơn thực hiện On-site tại địa điểm khách hàng — khuyến nghị nhập phí di chuyển.'
                : 'Đơn thực hiện In-lab tại phòng thí nghiệm — mặc định 0 ₫ (có thể thêm nếu có phí vận chuyển).'}
            </span>
          </div>

          <div className="qt-travel-presets">
            {TRAVEL_FEE_PRESETS.map((preset) => (
              <button
                className={`qt-preset-chip${Number(travelFee) === preset.value ? ' active' : ''}`}
                key={preset.value}
                onClick={() => onTravelFeeChange(preset.value)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="qt-field">
            <span>Số tiền phí di chuyển (travel_fee - VNĐ)</span>
            <input
              min="0"
              onChange={(event) =>
                onTravelFeeChange(event.target.value === '' ? 0 : Number(event.target.value))
              }
              placeholder="0"
              step="100000"
              type="number"
              value={travelFee === 0 ? 0 : travelFee || ''}
            />
            <small className="qt-field-hint">
              Phí di chuyển áp dụng: <strong>+{formatCurrency(Number(travelFee) || 0)}</strong>
            </small>
          </label>
        </div>
      </div>

      <div className="qt-formula-panel" aria-label="Bảng tính tổng tiền báo giá">
        <div className="qt-formula-item">
          <span>Tạm tính (subtotal)</span>
          <strong>{formatCurrency(subtotal)}</strong>
        </div>
        <div className="qt-formula-operator">−</div>
        <div className="qt-formula-item qt-formula-item--discount">
          <span>Tổng giảm giá (discount_amount)</span>
          <strong>{formatCurrency(totalDiscountAmount)}</strong>
        </div>
        <div className="qt-formula-operator">+</div>
        <div className="qt-formula-item qt-formula-item--travel">
          <span>Phí di chuyển (travel_fee)</span>
          <strong>{formatCurrency(Number(travelFee) || 0)}</strong>
        </div>
        <div className="qt-formula-operator">=</div>
        <div className="qt-formula-item qt-formula-item--total">
          <span>Tổng thanh toán (total_amount)</span>
          <strong>{formatCurrency(totalAmount)}</strong>
        </div>
      </div>

      <ul className="qt-validation-list">
        <li className={selectedRequest ? 'passed' : ''}>
          <span aria-hidden="true">{selectedRequest ? '✓' : '○'}</span>
          Đã chọn Phiếu yêu cầu dịch vụ ({selectedRequest?.code || 'Chưa chọn'})
        </li>
        <li className={hasValidLineItems ? 'passed' : ''}>
          <span aria-hidden="true">{hasValidLineItems ? '✓' : '○'}</span>
          Tất cả dòng báo giá có mô tả, đơn giá hợp lệ và giảm giá dòng không vượt đơn giá
        </li>
        <li className={isDiscountValid && Number(travelFee) >= 0 ? 'passed' : ''}>
          <span aria-hidden="true">{isDiscountValid && Number(travelFee) >= 0 ? '✓' : '○'}</span>
          Thỏa mãn ràng buộc CSDL: <code>discount_amount &lt;= subtotal</code> và <code>travel_fee &gt;= 0</code>
        </li>
        <li className={!lockedQuotation ? 'passed' : ''}>
          <span aria-hidden="true">{!lockedQuotation ? '✓' : '✕'}</span>
          {lockedQuotation
            ? `Đơn đã có báo giá hiệu lực (${lockedQuotation.quotation_code} · ${lockedQuotation.status}) — không tạo trùng`
            : activeDraftQuotation
              ? `Đang chỉnh sửa trực tiếp bản nháp ${activeDraftQuotation.quotation_code} (không sinh bản ghi thừa)`
              : 'Đơn chưa có báo giá hiệu lực — đủ điều kiện khởi tạo'}
        </li>
        {activeDraftQuotation?.head_sales_decision === 'Rejected' && (
          <li className={!isUnchangedFromRejection ? 'passed' : ''}>
            <span aria-hidden="true">{!isUnchangedFromRejection ? '✓' : '✕'}</span>
            {!isUnchangedFromRejection
              ? 'Đã thay đổi tổng tiền hoặc chiết khấu so với lúc bị HeadSales từ chối'
              : `Cảnh báo chống spam: Chưa điều chỉnh tổng tiền hoặc mức chiết khấu (${formatCurrency(totalAmount)})`}
          </li>
        )}
      </ul>

      {activeDraftQuotation?.head_sales_decision === 'Rejected' && (
        <div
          style={{
            margin: '16px 0',
            padding: '14px 18px',
            borderRadius: '8px',
            background: '#fffbeb',
            border: '1px solid #fcd34d',
          }}
        >
          <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>
            📝 Giải trình chỉnh sửa theo yêu cầu HeadSales (Bắt buộc khi trình lại) *
          </div>
          {isUnchangedFromRejection && (
            <div
              style={{
                marginBottom: '10px',
                padding: '8px 12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#991b1b',
                fontSize: '0.84rem',
              }}
            >
              ⚠️ <strong>Cảnh báo chống spam:</strong> Bạn chưa hề thay đổi tổng giá trị ({formatCurrency(totalAmount)}) hoặc mức chiết khấu so với lúc bị Trưởng phòng từ chối. Vui lòng điều chỉnh lại phương án giá trước khi trình duyệt lại.
            </div>
          )}
          <textarea
            disabled={Boolean(submittingStatus)}
            onChange={(e) => onSalesSubmissionNoteChange?.(e.target.value)}
            placeholder="Nêu rõ các thay đổi bạn đã thực hiện theo yêu cầu của Trưởng phòng..."
            rows={2}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
            }}
            value={salesSubmissionNote || ''}
          />
        </div>
      )}

      {formError && (
        <p className="qt-form-error" role="alert">
          {formError}
        </p>
      )}

      <div className="qt-submit-row">
        <span>
          {lockedQuotation ? (
            <>
              Phiếu yêu cầu này đã có báo giá <strong>{lockedQuotation.quotation_code}</strong> ở trạng thái{' '}
              <strong>{lockedQuotation.status}</strong>. Chỉ được lập báo giá mới khi báo giá cũ bị <strong>Rejected</strong>.
            </>
          ) : activeDraftQuotation ? (
            <>
              Đang làm việc trên báo giá <strong>{activeDraftQuotation.quotation_code}</strong> ({activeDraftQuotation.status}): mọi thay đổi sẽ cập nhật trực tiếp lên bản ghi này.
            </>
          ) : (
            <>
              Báo giá sau khi lập sẽ được lưu nháp (<strong>Draft</strong>) hoặc trình <strong>Trưởng phòng Kinh doanh (HeadSales)</strong> phê duyệt trước khi gửi tới tay khách hàng.
            </>
          )}
        </span>
        <div className="qt-submit-actions">
          <button
            className="button button-secondary"
            disabled={!canSubmit || Boolean(submittingStatus) || Boolean(lockedQuotation)}
            onClick={() => onSubmitWithStatus('Draft')}
            type="button"
          >
            {submittingStatus === 'Draft'
              ? 'Đang lưu bản nháp...'
              : activeDraftQuotation
                ? 'Cập nhật bản nháp (Draft)'
                : 'Lưu bản nháp (Draft)'}
          </button>
          <button
            className="button button-primary"
            disabled={
              !canSubmit
              || Boolean(submittingStatus)
              || Boolean(lockedQuotation)
              || (!isHeadSales && isUnchangedFromRejection)
            }
            onClick={() => onSubmitWithStatus(isHeadSales ? 'Sent' : 'PendingApproval')}
            type="button"
          >
            {submittingStatus === 'PendingApproval' || submittingStatus === 'Sent'
              ? 'Đang xử lý...'
              : isHeadSales
                ? activeDraftQuotation
                  ? '✓ Duyệt & Gửi khách hàng (Sent)'
                  : '✓ Tạo, Duyệt & Gửi khách hàng (Sent)'
                : activeDraftQuotation
                  ? '📤 Cập nhật & Trình HeadSales duyệt'
                  : '📤 Tạo & Trình HeadSales duyệt'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default QuotationPricingSummary;

