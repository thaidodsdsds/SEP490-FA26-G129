import { useMemo, useState } from 'react';
import { FIELD_LABELS, KIND_LABELS } from '../constants.js';

function DeviceServiceCard({
  device,
  isSelected,
  selectedServiceIds,
  serviceTypes,
  onToggleDevice,
  onToggleService,
}) {
  const [selectedField, setSelectedField] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [hideBlocked, setHideBlocked] = useState(false);

  const availableFields = useMemo(() => {
    const fields = new Set(serviceTypes.map((service) => service.field).filter(Boolean));
    return ['ALL', ...fields];
  }, [serviceTypes]);

  const filteredServices = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return serviceTypes.filter((service) => {
      if (selectedField !== 'ALL' && service.field !== selectedField) {
        return false;
      }
      if (hideBlocked && !service.is_valid) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const searchable = `${service.name} ${service.standard_code || ''} ${service.field || ''}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [hideBlocked, searchTerm, selectedField, serviceTypes]);

  const selectedCount = selectedServiceIds.length;

  return (
    <article className={`sr-device-card${isSelected ? ' selected' : ''}`}>
      <label className="sr-device-select">
        <input
          checked={isSelected}
          onChange={() => onToggleDevice(device.id)}
          type="checkbox"
        />
        <span className="sr-device-icon" aria-hidden="true">▣</span>
        <span className="sr-device-info">
          <strong>{device.name}</strong>
          <small>
            {[device.manufacturer, device.model].filter(Boolean).join(' · ') || 'Chưa cập nhật hãng / model'}
          </small>
        </span>
        <span className="sr-device-identifiers">
          {device.serial_number && <small>S/N: <b>{device.serial_number}</b></small>}
          <small>Mã TB: <b>{device.internal_code}</b></small>
        </span>
        <span
          className={`sr-device-badge${
            !isSelected
              ? ''
              : selectedCount > 0
                ? ' sr-device-badge--active'
                : ' sr-device-badge--warning'
          }`}
        >
          {!isSelected
            ? 'Chưa chọn'
            : selectedCount > 0
              ? `Đã chọn ${selectedCount} dịch vụ`
              : 'Cần chọn dịch vụ'}
        </span>
      </label>

      {isSelected && (
        <div className="sr-service-picker">
          <div className="sr-service-picker-toolbar">
            <div className="sr-service-picker-heading">
              <strong>Chọn dịch vụ thực hiện cho thiết bị này</strong>
              <span>Chỉ các dịch vụ đang Active và có quy trình kỹ thuật Active mới có thể được chọn.</span>
            </div>

            <div className="sr-service-filters">
              <input
                className="sr-service-search"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm tên dịch vụ hoặc mã văn bản ĐLVN..."
                type="search"
                value={searchTerm}
              />
              <label className="sr-filter-checkbox">
                <input
                  checked={hideBlocked}
                  onChange={(event) => setHideBlocked(event.target.checked)}
                  type="checkbox"
                />
                <span>Chỉ hiện dịch vụ khả dụng</span>
              </label>
            </div>

            {availableFields.length > 2 && (
              <div className="sr-field-tabs" role="tablist" aria-label="Lọc theo lĩnh vực đo">
                {availableFields.map((fieldKey) => (
                  <button
                    className={`sr-field-tab${selectedField === fieldKey ? ' active' : ''}`}
                    key={fieldKey}
                    onClick={() => setSelectedField(fieldKey)}
                    type="button"
                  >
                    {FIELD_LABELS[fieldKey] || fieldKey}
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredServices.length === 0 ? (
            <div className="sr-service-empty">
              Không tìm thấy dịch vụ nào khớp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="sr-service-grid">
              {filteredServices.map((service) => {
                const disabled = !service.is_valid;
                const isChecked = selectedServiceIds.includes(service.id);
                const kindLabel = KIND_LABELS[service.kind] || service.kind;
                const fieldLabel = FIELD_LABELS[service.field] || service.field;
                const blockedMessage =
                  service.blocked_reason
                  || (Array.isArray(service.errors) && service.errors[0])
                  || 'Dịch vụ hiện không đủ điều kiện thực hiện.';

                return (
                  <label
                    className={`sr-service-option${disabled ? ' disabled' : ''}${isChecked ? ' checked' : ''}`}
                    key={service.id}
                    title={disabled ? blockedMessage : `${kindLabel} · Quy trình ${service.procedure_version}`}
                  >
                    <input
                      checked={isChecked}
                      disabled={disabled}
                      onChange={() => onToggleService(device.id, service.id)}
                      type="checkbox"
                    />
                    <span className="sr-service-option-body">
                      <span className="sr-service-title-row">
                        <strong>{service.name}</strong>
                        <span className="sr-kind-tag">{kindLabel}</span>
                      </span>

                      <span className="sr-service-meta-row">
                        {fieldLabel && <span>{fieldLabel}</span>}
                        {service.standard_code && <span>Tiêu chuẩn: {service.standard_code}</span>}
                      </span>

                      {disabled ? (
                        <small className="sr-service-blocked" role="note">
                          ⚠ {blockedMessage}
                        </small>
                      ) : (
                        <small className="sr-service-ready">
                          ✓ Quy trình kỹ thuật {service.procedure_version || 'Active'}
                          {service.measuring_range ? ` · Dải đo: ${service.measuring_range}` : ''}
                        </small>
                      )}
                    </span>

                    <span className={`sr-status-pill${disabled ? ' blocked' : ' active'}`}>
                      {disabled ? 'Không khả dụng' : 'Sẵn sàng'}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default DeviceServiceCard;

