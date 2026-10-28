function ServiceRequestSelectorStep({
  serviceRequests,
  selectedRequestId,
  selectedRequest,
  estimatedCompletionDate,
  onSelectRequest,
  onDateChange,
}) {
  return (
    <section className="qt-card" aria-labelledby="qt-step1-heading">
      <div className="qt-section-heading">
        <span className="qt-step">1</span>
        <div>
          <h2 id="qt-step1-heading">Chọn phiếu yêu cầu dịch vụ & thời gian dự kiến</h2>
          <p>
            Mỗi báo giá (Quotation) liên kết trực tiếp với một phiếu yêu cầu dịch vụ và tự động tải danh sách hạng mục cần báo giá.
          </p>
        </div>
      </div>

      <div className="qt-top-grid">
        <label className="qt-field">
          <span>Phiếu yêu cầu dịch vụ (Service Request) <b>*</b></span>
          <select
            onChange={(event) => onSelectRequest(event.target.value)}
            required
            value={selectedRequestId}
          >
            <option value="">-- Chọn phiếu yêu cầu cần lập báo giá --</option>
            {serviceRequests.map((request) => (
              <option key={request.id} value={String(request.id)}>
                {request.code} · {request.customer_name} ({request.items.length} hạng mục · {request.location_type})
              </option>
            ))}
          </select>
        </label>

        <label className="qt-field">
          <span>Ngày dự kiến hoàn thành (estimated_completion_date)</span>
          <input
            onChange={(event) => onDateChange(event.target.value)}
            type="date"
            value={estimatedCompletionDate}
          />
        </label>
      </div>

      {selectedRequest ? (
        <div className="qt-request-banner">
          <div className="qt-request-banner-main">
            <span className="qt-summary-label">THÔNG TIN PHIẾU YÊU CẦU #{selectedRequest.code}</span>
            <strong>{selectedRequest.customer_name}</strong>
            <p>
              MST: <b>{selectedRequest.tax_code}</b> · Liên hệ: <b>{selectedRequest.contact}</b> · Địa chỉ: {selectedRequest.address}
            </p>
          </div>
          <div className="qt-request-badges">
            <span className={`qt-badge ${selectedRequest.location_type === 'On-site' ? 'qt-badge--onsite' : 'qt-badge--inlab'}`}>
              {selectedRequest.location_type === 'On-site' ? '⌖ Thực hiện On-site' : '⌂ Thực hiện In-lab'}
            </span>
            <span className="qt-badge qt-badge--neutral">
              {selectedRequest.items.length} hạng mục dịch vụ
            </span>
          </div>
        </div>
      ) : (
        <div className="qt-request-placeholder">
          <span aria-hidden="true">📋</span>
          <span>Chọn một phiếu yêu cầu dịch vụ để hệ thống tự động khởi tạo các dòng báo giá (Quotation Line Items).</span>
        </div>
      )}
    </section>
  );
}

export default ServiceRequestSelectorStep;

