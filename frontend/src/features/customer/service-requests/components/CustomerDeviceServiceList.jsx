import { useMemo, useState } from 'react';
import { evaluateDeviceDueState } from '../mockData.js';
import CustomerAddDeviceModal from './CustomerAddDeviceModal.jsx';

const FIELD_LABELS = {
  ALL: 'Tất cả lĩnh vực',
  DIEN: 'Điện – Điện tử',
  KHOILUONG: 'Khối lượng',
  NHIET: 'Nhiệt – Độ ẩm',
  APSUAT: 'Áp suất',
  DODAI: 'Độ dài – Kích thước',
  DUNGTICH: 'Dung tích – Lưu lượng',
  HOAHOC: 'Hóa lý – Quang học',
  LUCLUC: 'Lực – Độ cứng',
};

function CustomerDeviceServiceList({
  hasCompanyLinked,
  loadingDevices,
  submittingDevice,
  deviceFormError,
  devices,
  serviceTypes,
  selectedDeviceIds,
  selectedServicesByDevice,
  onToggleDevice,
  onToggleServiceForDevice,
  onSelectUrgentDevices,
  onAddNewDevice,
  onClearDeviceFormError,
}) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [fieldFilterByDevice, setFieldFilterByDevice] = useState({});

  const dynamicFields = useMemo(() => {
    const uniqueKeys = [...new Set(serviceTypes.map((st) => st.field).filter(Boolean))];
    return [
      { key: 'ALL', label: FIELD_LABELS.ALL },
      ...uniqueKeys.map((key) => ({
        key,
        label: FIELD_LABELS[key] || key,
      })),
    ];
  }, [serviceTypes]);

  const urgentDevices = devices.filter(
    (device) => evaluateDeviceDueState(device.next_due_date).isUrgent,
  );
  const unselectedUrgentCount = urgentDevices.filter(
    (device) => !selectedDeviceIds.includes(device.id),
  ).length;

  const filteredDevices = devices.filter((device) => {
    const dueState = evaluateDeviceDueState(device.next_due_date);
    if (activeTab === 'URGENT' && !dueState.isUrgent) return false;
    if (activeTab === 'GROUP2' && !device.is_group2) return false;
    if (activeTab === 'SELECTED' && !selectedDeviceIds.includes(device.id)) return false;

    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return true;
    const haystack = `${device.name} ${device.manufacturer || ''} ${device.model || ''} ${device.serial_number || ''} ${device.internal_code || ''}`.toLowerCase();
    return haystack.includes(keyword);
  });

  const handleSetFieldFilter = (deviceId, fieldKey) => {
    setFieldFilterByDevice((prev) => ({ ...prev, [deviceId]: fieldKey }));
  };

  return (
    <section className="csr-card" aria-labelledby="csr-step2-heading">
      <div className="csr-step-header csr-step-header--between">
        <div className="csr-step-header-left">
          <span className="csr-step-badge">2</span>
          <div>
            <h2 id="csr-step2-heading">Chọn thiết bị & Dịch vụ Hiệu chuẩn / Kiểm định</h2>
            <p>
              Đánh dấu các thiết bị cần thực hiện, sau đó chọn một hoặc nhiều dịch vụ đủ điều kiện cho từng thiết bị.
            </p>
          </div>
        </div>

        <button
          className="button button-secondary"
          disabled={!hasCompanyLinked}
          onClick={() => {
            onClearDeviceFormError?.();
            setShowAddDevice((prev) => !prev);
          }}
          type="button"
        >
          {showAddDevice ? 'Đóng khai báo' : '+ Khai báo thiết bị mới'}
        </button>
      </div>

      {!hasCompanyLinked ? (
        <div className="csr-empty-box">
          <p>
            Vui lòng lưu <strong>Thông tin doanh nghiệp</strong> ở Bước 1 trước để quản lý thiết bị và đăng ký dịch vụ.
          </p>
        </div>
      ) : (
        <>
          {showAddDevice && (
            <CustomerAddDeviceModal
              onAddDevice={async (newDevicePayload) => {
                const ok = await onAddNewDevice(newDevicePayload);
                if (ok) {
                  setShowAddDevice(false);
                }
                return ok;
              }}
              onCancel={() => {
                onClearDeviceFormError?.();
                setShowAddDevice(false);
              }}
              serverError={deviceFormError}
              submitting={submittingDevice}
            />
          )}

          {urgentDevices.length > 0 && (
            <div className="csr-urgent-callout">
              <div className="csr-urgent-callout-text">
                <span className="csr-urgent-dot" aria-hidden="true">!</span>
                <div>
                  <strong>
                    Phát hiện {urgentDevices.length} thiết bị đã quá hạn hoặc sắp đến hạn trong 30 ngày tới
                  </strong>
                  <p>Nhấn chọn nhanh để đưa toàn bộ thiết bị đến hạn vào danh sách yêu cầu.</p>
                </div>
              </div>
              {unselectedUrgentCount > 0 ? (
                <button
                  className="button button-primary csr-btn-sm"
                  onClick={onSelectUrgentDevices}
                  type="button"
                >
                  ⚡ Chọn nhanh ({unselectedUrgentCount} thiết bị)
                </button>
              ) : (
                <span className="csr-urgent-done">✓ Đã chọn đủ thiết bị đến hạn</span>
              )}
            </div>
          )}

          <div className="csr-toolbar">
            <div className="csr-filter-tabs" role="tablist" aria-label="Bộ lọc thiết bị">
              <button
                className={`csr-filter-tab${activeTab === 'ALL' ? ' active' : ''}`}
                onClick={() => setActiveTab('ALL')}
                role="tab"
                type="button"
              >
                Tất cả ({devices.length})
              </button>
              <button
                className={`csr-filter-tab${activeTab === 'URGENT' ? ' active' : ''}`}
                onClick={() => setActiveTab('URGENT')}
                role="tab"
                type="button"
              >
                Sắp / Quá hạn ({urgentDevices.length})
              </button>
              <button
                className={`csr-filter-tab${activeTab === 'GROUP2' ? ' active' : ''}`}
                onClick={() => setActiveTab('GROUP2')}
                role="tab"
                type="button"
              >
                Nhóm 2 ({devices.filter((d) => d.is_group2).length})
              </button>
              <button
                className={`csr-filter-tab${activeTab === 'SELECTED' ? ' active' : ''}`}
                onClick={() => setActiveTab('SELECTED')}
                role="tab"
                type="button"
              >
                Đã chọn ({selectedDeviceIds.length})
              </button>
            </div>

            <div className="csr-search-box">
              <input
                aria-label="Tìm kiếm thiết bị"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm theo tên máy, hãng, model, số S/N, mã nội bộ..."
                type="search"
                value={searchQuery}
              />
            </div>
          </div>

          {loadingDevices ? (
            <div className="csr-empty-box">
              <p>Đang tải danh sách thiết bị của doanh nghiệp từ máy chủ...</p>
            </div>
          ) : devices.length === 0 ? (
            <div className="csr-empty-box">
              <p>Doanh nghiệp của bạn chưa có thiết bị đo lường nào trong hệ thống.</p>
              <button
                className="button button-primary csr-btn-sm"
                onClick={() => setShowAddDevice(true)}
                type="button"
              >
                + Khai báo thiết bị đầu tiên
              </button>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="csr-empty-box">
              <p>Không tìm thấy thiết bị phù hợp với bộ lọc hiện tại.</p>
              <button
                className="button button-secondary csr-btn-sm"
                onClick={() => {
                  setActiveTab('ALL');
                  setSearchQuery('');
                }}
                type="button"
              >
                Xem toàn bộ thiết bị
              </button>
            </div>
          ) : (
            <div className="csr-device-list">
              {filteredDevices.map((device) => {
                const isSelected = selectedDeviceIds.includes(device.id);
                const chosenServiceIds = selectedServicesByDevice[device.id] || [];
                const dueState = evaluateDeviceDueState(device.next_due_date);
                const activeField = fieldFilterByDevice[device.id] || 'ALL';

                const visibleServices = serviceTypes.filter((service) =>
                  activeField === 'ALL' ? true : service.field === activeField,
                );

                return (
                  <article
                    className={`csr-device-card${isSelected ? ' is-selected' : ''}${isSelected && chosenServiceIds.length === 0 ? ' is-missing-service' : ''}`}
                    key={device.id}
                  >
                    <div
                      className="csr-device-card-head"
                      onClick={() => onToggleDevice(device.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onToggleDevice(device.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span
                        aria-hidden="true"
                        className={`csr-check-box${isSelected ? ' checked' : ''}`}
                      >
                        {isSelected ? '✓' : ''}
                      </span>

                      <div className="csr-device-info">
                        <div className="csr-device-title-row">
                          <strong>{device.name}</strong>
                          {device.is_group2 && (
                            <span className="csr-pill--group2" title="Phương tiện đo nhóm 2 bắt buộc kiểm định">
                              Nhóm 2 · Kiểm định bắt buộc
                            </span>
                          )}
                        </div>
                        <p className="csr-device-meta">
                          {[device.manufacturer, device.model].filter(Boolean).join(' · ') || 'Chưa cập nhật hãng/model'}
                          {device.serial_number ? ` · S/N: ${device.serial_number}` : ''}
                          {device.internal_code ? ` · Mã TB: ${device.internal_code}` : ''}
                        </p>
                      </div>

                      <div className="csr-device-badges">
                        <span className={`csr-due-badge csr-due-badge--${dueState.code.toLowerCase()}`}>
                          {dueState.label}
                        </span>
                        {isSelected && (
                          <span className={`csr-count-badge${chosenServiceIds.length === 0 ? ' warn' : ''}`}>
                            {chosenServiceIds.length > 0
                              ? `${chosenServiceIds.length} dịch vụ`
                              : 'Chưa chọn dịch vụ'}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="csr-service-drawer">
                        <div className="csr-service-drawer-top">
                          <span>Chọn dịch vụ thực hiện cho thiết bị này:</span>
                          <div className="csr-field-pills">
                            {dynamicFields.map((field) => (
                              <button
                                className={`csr-field-pill${activeField === field.key ? ' active' : ''}`}
                                key={field.key}
                                onClick={() => handleSetFieldFilter(device.id, field.key)}
                                type="button"
                              >
                                {field.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {visibleServices.length === 0 ? (
                          <p className="csr-inline-warning">
                            Chưa có dịch vụ nào trong lĩnh vực này.
                          </p>
                        ) : (
                          <div className="csr-service-grid">
                            {visibleServices.map((service) => {
                              const isValid = service.is_valid !== false;
                              const checked = chosenServiceIds.includes(service.id);

                              return (
                                <button
                                  className={`csr-service-option${checked ? ' is-checked' : ''}${!isValid ? ' is-disabled' : ''}`}
                                  disabled={!isValid}
                                  key={service.id}
                                  onClick={() => isValid && onToggleServiceForDevice(device.id, service.id)}
                                  title={!isValid ? service.blocked_reason || 'Dịch vụ tạm ngưng hoặc chưa có quy trình' : ''}
                                  type="button"
                                >
                                  <div className="csr-service-option-head">
                                    <span className={`csr-kind-tag ${service.kind === 'Verification' ? 'verify' : 'cal'}`}>
                                      {service.kind === 'Verification' ? 'Kiểm định' : 'Hiệu chuẩn'}
                                    </span>
                                    {service.active_procedure?.version && (
                                      <span className="csr-rec-tag">
                                        Quy trình {service.active_procedure.version}
                                      </span>
                                    )}
                                    <span className="csr-service-check" aria-hidden="true">
                                      {checked ? '✓' : isValid ? '+' : '✕'}
                                    </span>
                                  </div>
                                  <strong>{service.name}</strong>
                                  <small>
                                    {service.standard_code ? <>Tiêu chuẩn: <b>{service.standard_code}</b></> : 'Tiêu chuẩn ISOCAL'}
                                    {service.measuring_range ? ` · Dải đo: ${service.measuring_range}` : ''}
                                  </small>
                                  {!isValid && (
                                    <small className="csr-blocked-reason">
                                      ⚠ {service.blocked_reason || 'Dịch vụ chưa sẵn sàng đăng ký'}
                                    </small>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {chosenServiceIds.length === 0 && (
                          <p className="csr-inline-warning" role="alert">
                            Vui lòng chọn ít nhất 1 dịch vụ hợp lệ cho thiết bị này.
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default CustomerDeviceServiceList;
