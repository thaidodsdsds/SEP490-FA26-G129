function ServiceRequestSelectorStep({
  serviceRequests,
  loadingRequests,
  selectedRequestId,
  selectedRequest,
  estimatedCompletionDate,
  onSelectRequest,
  onDateChange,
  onRefreshRequests,
}) {
  return (
    <section className="qt-card" aria-labelledby="qt-step1-heading">
      <div className="qt-section-heading qt-heading-between">
        <div className="qt-heading-left">
          <span className="qt-step">1</span>
          <div>
            <h2 id="qt-step1-heading">Chọn phiếu yêu cầu dịch vụ & thời gian dự kiến</h2>
            <p>
              Mỗi báo giá (Quotation) liên kết trực tiếp với một phiếu yêu cầu dịch vụ và tự động tải thông tin công ty, mã số thuế, địa chỉ cùng danh sách hạng mục.
            </p>
          </div>
        </div>

        {onRefreshRequests && (
          <button
            className="button button-secondary qt-reset-btn"
            disabled={loadingRequests}
            onClick={onRefreshRequests}
            type="button"
          >
            {loadingRequests ? 'Đang tải...' : '↻ Làm mới danh sách'}
          </button>
        )}
      </div>

      <div className="qt-top-grid">
        <label className="qt-field">
          <span>Phiếu yêu cầu dịch vụ (Service Request) <b>*</b></span>
          <select
            disabled={loadingRequests}
            onChange={(event) => onSelectRequest(event.target.value)}
            required
            value={selectedRequestId}
          >
            <option value="">
              {loadingRequests
                ? '-- Đang tải danh sách phiếu yêu cầu từ máy chủ... --'
                : '-- Chọn phiếu yêu cầu cần lập báo giá --'}
            </option>
            {serviceRequests.map((request) => (
              <option key={request.id} value={String(request.id)}>
                {request.request_code} · {request.customer_name} ({request.items.length} hạng mục · {request.location_type} · {request.status})
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
            <span className="qt-summary-label">
              MÃ PHIẾU YÊU CẦU: #{selectedRequest.request_code}
            </span>
            <strong>{selectedRequest.customer_name}</strong>
            <p>
              Mã số thuế: <b>{selectedRequest.tax_code || 'Chưa cập nhật'}</b> · Địa chỉ:{' '}
              <b>{selectedRequest.address || 'Chưa cập nhật'}</b>
            </p>
          </div>
          <div className="qt-request-badges">
            <span className={`qt-badge ${selectedRequest.location_type === 'On-site' ? 'qt-badge--onsite' : 'qt-badge--inlab'}`}>
              {selectedRequest.location_type === 'On-site' ? '⌖ Thực hiện On-site' : '⌂ Thực hiện In-lab'}
            </span>
            <span className="qt-badge qt-badge--neutral">
              Trạng thái đơn: {selectedRequest.status || 'New'}
            </span>
            <span className="qt-badge qt-badge--neutral">
              {selectedRequest.items.length} hạng mục dịch vụ
            </span>
          </div>
        </div>
      ) : (
        <div className="qt-request-placeholder">
          <span aria-hidden="true">📋</span>
          <span>
            {loadingRequests
              ? 'Đang tải danh sách phiếu yêu cầu dịch vụ từ hệ thống...'
              : 'Chọn một phiếu yêu cầu dịch vụ để hệ thống tự động hiển thị thông tin công ty, mã số thuế, địa chỉ và khởi tạo các dòng báo giá.'}
          </span>
        </div>
      )}
    </section>
  );
}

export default ServiceRequestSelectorStep;
