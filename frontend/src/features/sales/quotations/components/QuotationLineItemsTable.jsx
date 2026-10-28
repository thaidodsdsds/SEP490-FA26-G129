import { formatCurrency } from '../../../../utils/formatters.js';

const DISCOUNT_PRESETS = [0, 5, 10, 15];

function QuotationLineItemsTable({
  lineItems,
  onUpdateLineItem,
  onApplyPresetDiscount,
  onResetSuggestedPrices,
}) {
  return (
    <section className="qt-card" aria-labelledby="qt-step2-heading">
      <div className="qt-section-heading qt-heading-between">
        <div className="qt-heading-left">
          <span className="qt-step">2</span>
          <div>
            <h2 id="qt-step2-heading">Chi tiết dòng báo giá (Quotation Line Items)</h2>
            <p>
              Nhập nội dung diễn giải, đơn giá (`unit_price`) và mức giảm giá trực tiếp trên từng hạng mục thiết bị – dịch vụ.
            </p>
          </div>
        </div>

        {lineItems.length > 0 && (
          <button
            className="button button-secondary qt-reset-btn"
            onClick={onResetSuggestedPrices}
            type="button"
          >
            ↻ Khôi phục đơn giá gợi ý
          </button>
        )}
      </div>

      {lineItems.length === 0 ? (
        <div className="qt-empty-state">
          Vui lòng chọn Phiếu yêu cầu dịch vụ ở <strong>Bước 1</strong> để hiển thị danh sách hạng mục cần báo giá.
        </div>
      ) : (
        <div className="qt-lines-list">
          {lineItems.map((line, index) => {
            const unitPrice = Number(line.unit_price) || 0;
            const discountAmount = Number(line.discount_amount) || 0;
            const isDiscountInvalid = discountAmount < 0 || discountAmount > unitPrice;
            const isPriceInvalid = unitPrice <= 0;
            const isDescriptionEmpty = !line.description || !line.description.trim();
            const lineTotal = Math.max(0, unitPrice - discountAmount);
            const discountPercent = unitPrice > 0 ? Math.round((discountAmount / unitPrice) * 100) : 0;

            return (
              <article
                className={`qt-line-card${isDiscountInvalid || isPriceInvalid || isDescriptionEmpty ? ' qt-line-card--error' : ''}`}
                key={line.service_request_item_id}
              >
                <div className="qt-line-header">
                  <div className="qt-line-index">#{index + 1}</div>
                  <div className="qt-line-device">
                    <strong>{line.device_name}</strong>
                    <small>
                      {[line.manufacturer, line.model].filter(Boolean).join(' · ')} · Mã TB: <b>{line.internal_code}</b>
                      {line.serial_number ? ` · S/N: ${line.serial_number}` : ''}
                    </small>
                  </div>
                  <div className="qt-line-service-tag">
                    <span className="qt-service-pill">
                      {line.service_kind === 'Calibration' ? 'Hiệu chuẩn' : 'Kiểm định'}: {line.service_type_name}
                    </span>
                    <small>Mã hạng mục: #{line.service_request_item_id} · {line.standard_code}</small>
                  </div>
                </div>

                <div className="qt-line-body">
                  <label className="qt-field qt-field--description">
                    <span>Mô tả dòng báo giá (description) <b>*</b></span>
                    <input
                      onChange={(event) =>
                        onUpdateLineItem(line.service_request_item_id, 'description', event.target.value)
                      }
                      placeholder="Nhập nội dung hiển thị trên bảng báo giá gửi khách hàng..."
                      required
                      value={line.description}
                    />
                    {isDescriptionEmpty && (
                      <small className="qt-field-error">Mô tả dòng báo giá không được để trống.</small>
                    )}
                  </label>

                  <div className="qt-line-pricing-grid">
                    <label className="qt-field">
                      <span>Đơn giá (unit_price - VNĐ) <b>*</b></span>
                      <input
                        min="0"
                        onChange={(event) =>
                          onUpdateLineItem(
                            line.service_request_item_id,
                            'unit_price',
                            event.target.value === '' ? '' : Number(event.target.value),
                          )
                        }
                        placeholder="0"
                        step="50000"
                        type="number"
                        value={line.unit_price}
                      />
                      <small className="qt-field-hint">
                        Hiển thị: <strong>{formatCurrency(unitPrice)}</strong>
                      </small>
                      {isPriceInvalid && (
                        <small className="qt-field-error">Đơn giá phải lớn hơn 0 ₫.</small>
                      )}
                    </label>

                    <div className="qt-field">
                      <div className="qt-discount-label-row">
                        <span>Giảm giá dòng (discount_amount - VNĐ)</span>
                        <div className="qt-preset-chips" aria-label="Chọn nhanh phần trăm giảm giá">
                          {DISCOUNT_PRESETS.map((pct) => (
                            <button
                              className={`qt-preset-chip${discountPercent === pct && (pct > 0 || discountAmount === 0) ? ' active' : ''}`}
                              key={pct}
                              onClick={() => onApplyPresetDiscount(line.service_request_item_id, pct)}
                              type="button"
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        min="0"
                        max={unitPrice}
                        onChange={(event) =>
                          onUpdateLineItem(
                            line.service_request_item_id,
                            'discount_amount',
                            event.target.value === '' ? '' : Number(event.target.value),
                          )
                        }
                        placeholder="0"
                        step="10000"
                        type="number"
                        value={line.discount_amount}
                      />
                      <small className="qt-field-hint">
                        Giảm: <strong>{formatCurrency(discountAmount)}</strong> ({discountPercent}%)
                      </small>
                      {isDiscountInvalid && (
                        <small className="qt-field-error">
                          Giảm giá dòng phải từ 0 ₫ và không vượt quá đơn giá ({formatCurrency(unitPrice)}).
                        </small>
                      )}
                    </div>

                    <div className="qt-line-net-box">
                      <span>Thành tiền sau giảm</span>
                      <strong>{formatCurrency(lineTotal)}</strong>
                      <small>
                        = {formatCurrency(unitPrice)} − {formatCurrency(discountAmount)}
                      </small>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default QuotationLineItemsTable;

