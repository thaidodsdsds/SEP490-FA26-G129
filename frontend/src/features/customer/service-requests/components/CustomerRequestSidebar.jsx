function CustomerRequestSidebar({
  locationType,
  preferredDate,
  selectedDevices,
  selectedServicesByDevice,
  serviceTypesById,
  attachmentsCount,
  hasCompanyLinked,
  hasAllDevicesAssigned,
  canSubmit,
  submittingRequest,
  formError,
  onRemoveDevice,
  onClearSelection,
  onSubmit,
}) {
  const totalItemsCount = selectedDevices.reduce(
    (sum, device) => sum + (selectedServicesByDevice[device.id]?.length || 0),
    0,
  );

  return (
    <aside className="csr-sidebar" aria-label="Tóm tắt phiếu yêu cầu dịch vụ">
      <div className="csr-summary-card">
        <div className="csr-summary-head">
          <div>
            <span className="csr-mini-label">TÓM TẮT PHIẾU ĐĂNG KÝ</span>
            <h3>Yêu cầu dịch vụ của bạn</h3>
          </div>
          {selectedDevices.length > 0 && (
            <button
              className="csr-clear-link"
              onClick={onClearSelection}
              type="button"
            >
              Bỏ chọn hết
            </button>
          )}
        </div>

        <div className="csr-summary-metrics">
          <div className="csr-metric-box">
            <span>Thiết bị</span>
            <strong>{selectedDevices.length}</strong>
          </div>
          <div className="csr-metric-box">
            <span>Hạng mục DV</span>
            <strong>{totalItemsCount}</strong>
          </div>
          <div className="csr-metric-box">
            <span>Hình thức</span>
            <strong>{locationType === 'On-site' ? 'On-site' : 'In-lab'}</strong>
          </div>
        </div>

        {preferredDate && (
          <div className="csr-summary-date">
            <span>Ngày dự kiến bàn giao / thực hiện:</span>
            <strong>{preferredDate}</strong>
          </div>
        )}

        {selectedDevices.length === 0 ? (
          <div className="csr-summary-empty">
            Chưa có thiết bị nào được chọn. Hãy chọn ít nhất 1 thiết bị ở danh sách bên trái.
          </div>
        ) : (
          <ul className="csr-selected-list">
            {selectedDevices.map((device) => {
              const serviceIds = selectedServicesByDevice[device.id] || [];
              return (
                <li className="csr-selected-item" key={device.id}>
                  <div className="csr-selected-item-top">
                    <div>
                      <strong>{device.name}</strong>
                      <small>{device.internal_code || device.serial_number || device.model}</small>
                    </div>
                    <button
                      aria-label={`Bỏ chọn ${device.name}`}
                      onClick={() => onRemoveDevice(device.id)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                  {serviceIds.length === 0 ? (
                    <span className="csr-selected-missing">⚠ Chưa chọn dịch vụ</span>
                  ) : (
                    <div className="csr-selected-services">
                      {serviceIds.map((serviceId) => {
                        const service = serviceTypesById.get(serviceId);
                        return (
                          <span className="csr-selected-service-chip" key={serviceId}>
                            {service ? service.name : `Dịch vụ #${serviceId}`}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {attachmentsCount > 0 && (
          <div className="csr-summary-files">
            📎 Đính kèm <strong>{attachmentsCount}</strong> tệp tài liệu kỹ thuật
          </div>
        )}

        <ul className="csr-checklist">
          <li className={hasCompanyLinked ? 'done' : ''}>
            <span aria-hidden="true">{hasCompanyLinked ? '✓' : '○'}</span>
            Đã liên kết thông tin doanh nghiệp
          </li>
          <li className={selectedDevices.length > 0 ? 'done' : ''}>
            <span aria-hidden="true">{selectedDevices.length > 0 ? '✓' : '○'}</span>
            Đã chọn ít nhất 1 thiết bị ({selectedDevices.length} thiết bị)
          </li>
          <li className={selectedDevices.length > 0 && hasAllDevicesAssigned ? 'done' : ''}>
            <span aria-hidden="true">
              {selectedDevices.length > 0 && hasAllDevicesAssigned ? '✓' : '○'}
            </span>
            Mỗi thiết bị đã gắn ít nhất 1 dịch vụ
          </li>
        </ul>

        {formError && (
          <p className="csr-inline-error" role="alert">
            {formError}
          </p>
        )}

        <button
          className="button button-primary csr-submit-btn"
          disabled={!canSubmit || submittingRequest}
          onClick={onSubmit}
          type="button"
        >
          {submittingRequest
            ? 'Đang gửi yêu cầu dịch vụ...'
            : `Gửi yêu cầu dịch vụ (${totalItemsCount} hạng mục) →`}
        </button>

        <div className="csr-process-steps">
          <span className="csr-mini-label">QUY TRÌNH XỬ LÝ TỰ ĐỘNG</span>
          <ol>
            <li>
              <b>1. Khởi tạo mã đơn (New):</b> Cấp mã <code>SR-2026-XXX</code> ngay sau khi gửi.
            </li>
            <li>
              <b>2. Nhận báo giá (Quoted):</b> ISOCAL gửi báo giá để bạn phê duyệt trực tuyến.
            </li>
            <li>
              <b>3. Hiệu chuẩn & Chứng nhận:</b> Theo dõi tiến độ từng máy và tải giấy chứng nhận số.
            </li>
          </ol>
        </div>
      </div>
    </aside>
  );
}

export default CustomerRequestSidebar;

