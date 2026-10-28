import { KIND_LABELS } from '../constants.js';

function RequestSummaryCard({
  selectedCustomer,
  locationType,
  selectedDevices,
  selectedServices,
  serviceTypesById,
  selectedItemCount,
  canSubmit,
  submittingRequest,
  formError,
  onRemoveServiceFromDevice,
}) {
  const allDevicesHaveService =
    selectedDevices.length > 0
    && selectedDevices.every((device) => (selectedServices[device.id] || []).length > 0);

  return (
    <section className="sr-card sr-review-card" aria-labelledby="sr-review-heading">
      <div className="sr-section-heading">
        <span className="sr-step">3</span>
        <div>
          <h2 id="sr-review-heading">Kiểm tra & xác nhận tạo phiếu</h2>
          <p>Rà soát danh sách thiết bị và dịch vụ hợp lệ trước khi lưu vào hệ thống.</p>
        </div>
      </div>

      <div className="sr-review-summary">
        <div>
          <span>Khách hàng</span>
          <strong>{selectedCustomer?.company_name || 'Chưa chọn'}</strong>
        </div>
        <div>
          <span>Thiết bị đã chọn</span>
          <strong>{selectedDevices.length} thiết bị</strong>
        </div>
        <div>
          <span>Tổng hạng mục dịch vụ</span>
          <strong>{selectedItemCount} dịch vụ</strong>
        </div>
        <div>
          <span>Hình thức thực hiện</span>
          <strong>{locationType === 'In-lab' ? 'Tại phòng Lab (In-lab)' : 'Tại hiện trường (On-site)'}</strong>
        </div>
      </div>

      {selectedDevices.length > 0 && (
        <div className="sr-selected-breakdown">
          <span className="sr-summary-label">CHI TIẾT HẠNG MỤC ĐÃ CHỌN</span>
          <div className="sr-breakdown-list">
            {selectedDevices.map((device) => {
              const serviceIds = selectedServices[device.id] || [];
              return (
                <div className="sr-breakdown-item" key={device.id}>
                  <div className="sr-breakdown-device">
                    <strong>{device.name}</strong>
                    <small>Mã: {device.internal_code}{device.serial_number ? ` · S/N: ${device.serial_number}` : ''}</small>
                  </div>
                  <div className="sr-breakdown-services">
                    {serviceIds.length === 0 ? (
                      <span className="sr-breakdown-missing">Chưa chọn dịch vụ nào cho thiết bị này</span>
                    ) : (
                      serviceIds.map((serviceId) => {
                        const service = serviceTypesById.get(serviceId);
                        if (!service) return null;
                        return (
                          <span className="sr-selected-chip" key={serviceId}>
                            <span>
                              {service.name} ({KIND_LABELS[service.kind] || service.kind})
                            </span>
                            <button
                              aria-label={`Bỏ dịch vụ ${service.name}`}
                              onClick={() => onRemoveServiceFromDevice(device.id, serviceId)}
                              type="button"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ul className="sr-validation-list">
        <li className={selectedCustomer ? 'passed' : ''}>
          <span aria-hidden="true">{selectedCustomer ? '✓' : '○'}</span>
          Đã chọn khách hàng sở hữu thiết bị
        </li>
        <li className={selectedDevices.length > 0 ? 'passed' : ''}>
          <span aria-hidden="true">{selectedDevices.length > 0 ? '✓' : '○'}</span>
          Đã chọn ít nhất một thiết bị đo lường
        </li>
        <li className={allDevicesHaveService ? 'passed' : ''}>
          <span aria-hidden="true">{allDevicesHaveService ? '✓' : '○'}</span>
          Mỗi thiết bị đã chọn đều gắn ít nhất một dịch vụ đang Active và có quy trình Active
        </li>
      </ul>

      {formError && (
        <p className="sr-form-error" role="alert">
          {formError}
        </p>
      )}

      <div className="sr-submit-row">
        <span>
          Phiếu yêu cầu sẽ được lưu vào hệ thống ở trạng thái <strong>New</strong> để chuyển sang bước lập báo giá.
        </span>
        <button
          className="button button-primary"
          disabled={!canSubmit || submittingRequest}
          type="submit"
        >
          {submittingRequest ? 'Đang tạo phiếu yêu cầu...' : 'Tạo phiếu yêu cầu dịch vụ'}
        </button>
      </div>
    </section>
  );
}

export default RequestSummaryCard;

