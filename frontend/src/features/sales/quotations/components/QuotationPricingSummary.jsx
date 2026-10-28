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
  formError,
  onExtraDiscountChange,
  onTravelFeeChange,
  onSubmitWithStatus,
}) {
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
      </ul>

      {formError && (
        <p className="qt-form-error" role="alert">
          {formError}
        </p>
      )}

      <div className="qt-submit-row">
        <span>
          Báo giá có thể được lưu ở trạng thái <strong>Draft</strong> (nháp) hoặc chuyển sang <strong>Sent</strong> để gửi khách hàng phê duyệt.
        </span>
        <div className="qt-submit-actions">
          <button
            className="button button-secondary"
            disabled={!canSubmit}
            onClick={() => onSubmitWithStatus('Draft')}
            type="button"
          >
            Lưu bản nháp (Draft)
          </button>
          <button
            className="button button-primary"
            disabled={!canSubmit}
            onClick={() => onSubmitWithStatus('Sent')}
            type="button"
          >
            Tạo & Gửi báo giá (Sent)
          </button>
        </div>
      </div>
    </section>
  );
}

export default QuotationPricingSummary;

