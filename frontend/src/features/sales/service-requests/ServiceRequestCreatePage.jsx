import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import {
  createCustomerDeviceApi,
  createServiceRequestApi,
  extractApiErrorMessage,
  getCustomerDevicesApi,
  getCustomersApi,
  getServiceTypesApi,
} from '../../../services/service-request-service.js';
import AddDevicePanel from './components/AddDevicePanel.jsx';
import CustomerLocationStep from './components/CustomerLocationStep.jsx';
import DeviceServiceCard from './components/DeviceServiceCard.jsx';
import RequestSummaryCard from './components/RequestSummaryCard.jsx';
import './service-requests.css';

function ServiceRequestCreatePage() {
  const [customers, setCustomers] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [devices, setDevices] = useState([]);

  const [customerId, setCustomerId] = useState('');
  const [locationType, setLocationType] = useState('In-lab');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [selectedServices, setSelectedServices] = useState({});
  const [deviceQuery, setDeviceQuery] = useState('');

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [submittingDevice, setSubmittingDevice] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [deviceFormError, setDeviceFormError] = useState('');
  const [formError, setFormError] = useState('');
  const [createdRequest, setCreatedRequest] = useState(null);

  const fetchCatalogs = useCallback(async () => {
    try {
      const [customerList, serviceTypeList] = await Promise.all([
        getCustomersApi(),
        getServiceTypesApi(),
      ]);
      setCustomers(Array.isArray(customerList) ? customerList : []);
      setServiceTypes(Array.isArray(serviceTypeList) ? serviceTypeList : []);
    } catch (error) {
      setFormError(
        extractApiErrorMessage(error, 'Không thể tải danh mục khách hàng và dịch vụ từ máy chủ.'),
      );
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  const handleRefreshCatalogs = () => {
    setLoadingInitial(true);
    setFormError('');
    fetchCatalogs();
  };

  const loadDevicesForCustomer = useCallback(async (targetCustomerId) => {
    if (!targetCustomerId) {
      setDevices([]);
      return;
    }

    setLoadingDevices(true);
    setFormError('');
    try {
      const deviceList = await getCustomerDevicesApi(targetCustomerId);
      setDevices(Array.isArray(deviceList) ? deviceList : []);
    } catch (error) {
      setDevices([]);
      setFormError(
        extractApiErrorMessage(error, 'Không thể tải danh sách thiết bị của khách hàng.'),
      );
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer.id) === String(customerId)) || null,
    [customerId, customers],
  );

  const serviceTypesById = useMemo(
    () => new Map(serviceTypes.map((service) => [service.id, service])),
    [serviceTypes],
  );

  const filteredDevices = useMemo(() => {
    const query = deviceQuery.trim().toLowerCase();
    if (!query) return devices;
    return devices.filter((device) => {
      const text = `${device.name} ${device.manufacturer || ''} ${device.model || ''} ${device.serial_number || ''} ${device.internal_code || ''}`.toLowerCase();
      return text.includes(query);
    });
  }, [deviceQuery, devices]);

  const selectedDevices = useMemo(
    () => devices.filter((device) => selectedDeviceIds.includes(device.id)),
    [devices, selectedDeviceIds],
  );

  const selectedItemCount = useMemo(
    () =>
      selectedDevices.reduce(
        (count, device) => count + (selectedServices[device.id]?.length || 0),
        0,
      ),
    [selectedDevices, selectedServices],
  );

  const canSubmit = Boolean(
    selectedCustomer
    && selectedDevices.length > 0
    && selectedItemCount > 0
    && selectedDevices.every((device) => (selectedServices[device.id] || []).length > 0),
  );

  const handleCustomerChange = (nextCustomerId) => {
    setCustomerId(nextCustomerId);
    setSelectedDeviceIds([]);
    setSelectedServices({});
    setDeviceQuery('');
    setShowDeviceForm(false);
    setDeviceFormError('');
    setFormError('');
    loadDevicesForCustomer(nextCustomerId);
  };

  const handleToggleDevice = (deviceId) => {
    setSelectedDeviceIds((current) => {
      const isAlreadySelected = current.includes(deviceId);
      if (isAlreadySelected) {
        setSelectedServices((services) => {
          const next = { ...services };
          delete next[deviceId];
          return next;
        });
        return current.filter((id) => id !== deviceId);
      }
      return [...current, deviceId];
    });
    setFormError('');
  };

  const handleToggleService = (deviceId, serviceId) => {
    const service = serviceTypesById.get(serviceId);
    if (service && !service.is_valid) {
      return;
    }

    setSelectedServices((current) => {
      const currentServices = current[deviceId] || [];
      const nextServices = currentServices.includes(serviceId)
        ? currentServices.filter((id) => id !== serviceId)
        : [...currentServices, serviceId];
      return { ...current, [deviceId]: nextServices };
    });
    setFormError('');
  };

  const handleCreateDevice = async (payload) => {
    if (!selectedCustomer) return false;
    setSubmittingDevice(true);
    setDeviceFormError('');

    try {
      const createdDevice = await createCustomerDeviceApi(selectedCustomer.id, payload);
      if (createdDevice) {
        setDevices((current) => [createdDevice, ...current]);
        setSelectedDeviceIds((current) =>
          current.includes(createdDevice.id) ? current : [...current, createdDevice.id],
        );
      }
      setShowDeviceForm(false);
      return true;
    } catch (error) {
      setDeviceFormError(
        extractApiErrorMessage(error, 'Không thể thêm thiết bị mới. Vui lòng kiểm tra lại thông tin.'),
      );
      return false;
    } finally {
      setSubmittingDevice(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || !selectedCustomer) {
      setFormError('Vui lòng chọn khách hàng, ít nhất một thiết bị và dịch vụ hợp lệ cho từng thiết bị.');
      return;
    }

    setSubmittingRequest(true);
    setFormError('');

    try {
      const itemsPayload = selectedDevices.map((device) => ({
        device_id: device.id,
        service_type_ids: selectedServices[device.id] || [],
      }));

      const result = await createServiceRequestApi({
        customer_id: Number(selectedCustomer.id),
        location_type: locationType,
        items: itemsPayload,
      });

      setCreatedRequest({
        id: result?.request_code || (result?.id ? `SR-2026-${String(result.id).padStart(3, '0')}` : 'SR-NEW'),
        rawId: result?.id,
        customer: selectedCustomer.company_name,
        devices: selectedDevices.length,
        items: result?.items?.length || selectedItemCount,
        locationType: result?.location_type || locationType,
      });

      setSelectedDeviceIds([]);
      setSelectedServices({});
    } catch (error) {
      setFormError(
        extractApiErrorMessage(error, 'Không thể tạo phiếu yêu cầu dịch vụ. Vui lòng thử lại.'),
      );
    } finally {
      setSubmittingRequest(false);
    }
  };

  const validServiceCount = useMemo(
    () => serviceTypes.filter((service) => service.is_valid).length,
    [serviceTypes],
  );

  return (
    <div className="dash-page sales-request-page">
      <PageHeader
        actions={(
          <div className="sr-header-actions">
            <button
              className="button button-secondary"
              disabled={loadingInitial}
              onClick={handleRefreshCatalogs}
              type="button"
            >
              ↻ Làm mới danh mục
            </button>
            <Link className="button button-secondary" to="/internal/sales">
              ← Quay lại tổng quan
            </Link>
          </div>
        )}
        description="Chọn khách hàng, quản lý thiết bị đo lường và đăng ký dịch vụ hiệu chuẩn / kiểm định. Hệ thống tự động kiểm tra trạng thái Active của dịch vụ và quy trình kỹ thuật."
        eyebrow="SALES · SERVICE REQUEST"
        title="Tạo phiếu yêu cầu dịch vụ"
      />

      <div className="sr-stats-strip" aria-label="Thống kê danh mục hiện tại">
        <div className="sr-stat-pill">
          <span>Khách hàng hệ thống</span>
          <strong>{loadingInitial ? '...' : customers.length}</strong>
        </div>
        <div className="sr-stat-pill">
          <span>Tổng danh mục dịch vụ</span>
          <strong>{loadingInitial ? '...' : serviceTypes.length}</strong>
        </div>
        <div className="sr-stat-pill sr-stat-pill--ready">
          <span>Dịch vụ đủ điều kiện (Active + Quy trình)</span>
          <strong>{loadingInitial ? '...' : validServiceCount}</strong>
        </div>
      </div>

      {createdRequest && (
        <div className="sr-success" role="status">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Đã lưu thành công phiếu yêu cầu {createdRequest.id}</strong>
            <p>
              Khách hàng: <b>{createdRequest.customer}</b> · Hình thức: <b>{createdRequest.locationType}</b> ·{' '}
              {createdRequest.devices} thiết bị · {createdRequest.items} hạng mục dịch vụ.
            </p>
            <div style={{ marginTop: '0.5rem' }}>
              <Link
                className="button button-primary"
                to={`/internal/sales/quotations/new?requestId=${encodeURIComponent(createdRequest.id)}`}
              >
                Lập báo giá cho phiếu {createdRequest.id} →
              </Link>
            </div>
          </div>
          <button
            aria-label="Đóng thông báo"
            onClick={() => setCreatedRequest(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <form className="sr-form" onSubmit={handleSubmit}>
        <CustomerLocationStep
          customerDevicesCount={devices.length}
          customerId={customerId}
          customers={customers}
          loadingCustomers={loadingInitial}
          locationType={locationType}
          onCustomerChange={handleCustomerChange}
          onLocationTypeChange={setLocationType}
          selectedCustomer={selectedCustomer}
        />

        <section className="sr-card" aria-labelledby="sr-devices-heading">
          <div className="sr-section-heading sr-devices-heading">
            <span className="sr-step">2</span>
            <div>
              <h2 id="sr-devices-heading">Thiết bị đo lường & dịch vụ yêu cầu</h2>
              <p>
                Chọn thiết bị thuộc khách hàng (hoặc thêm mới), sau đó chọn ít nhất một dịch vụ hợp lệ cho mỗi thiết bị.
              </p>
            </div>
            <button
              className="button button-secondary sr-add-device-button"
              disabled={!selectedCustomer}
              onClick={() => {
                setDeviceFormError('');
                setShowDeviceForm((shown) => !shown);
              }}
              type="button"
            >
              {showDeviceForm ? 'Đóng biểu mẫu' : '+ Thêm thiết bị mới'}
            </button>
          </div>

          {showDeviceForm && selectedCustomer && (
            <AddDevicePanel
              customerName={selectedCustomer.company_name}
              errorMessage={deviceFormError}
              onCancel={() => {
                setShowDeviceForm(false);
                setDeviceFormError('');
              }}
              onCreateDevice={handleCreateDevice}
              submitting={submittingDevice}
            />
          )}

          {!selectedCustomer && (
            <div className="sr-empty-state">
              Vui lòng chọn khách hàng ở <strong>Bước 1</strong> để tải danh sách thiết bị đo lường.
            </div>
          )}

          {selectedCustomer && loadingDevices && (
            <div className="sr-empty-state">
              Đang tải danh sách thiết bị của <strong>{selectedCustomer.company_name}</strong>...
            </div>
          )}

          {selectedCustomer && !loadingDevices && devices.length === 0 && !showDeviceForm && (
            <div className="sr-empty-state">
              <p>Khách hàng <strong>{selectedCustomer.company_name}</strong> chưa có thiết bị nào trong danh mục.</p>
              <button
                className="button button-primary sr-empty-action"
                onClick={() => setShowDeviceForm(true)}
                type="button"
              >
                + Thêm thiết bị đầu tiên
              </button>
            </div>
          )}

          {selectedCustomer && !loadingDevices && devices.length > 0 && (
            <>
              <div className="sr-device-toolbar">
                <input
                  className="sr-device-search"
                  onChange={(event) => setDeviceQuery(event.target.value)}
                  placeholder="Tìm nhanh thiết bị theo tên, hãng, model, số serial hoặc mã nội bộ..."
                  type="search"
                  value={deviceQuery}
                />
                <span className="sr-device-counter">
                  Đang chọn <strong>{selectedDevices.length}</strong> / {devices.length} thiết bị
                </span>
              </div>

              {filteredDevices.length === 0 ? (
                <div className="sr-empty-state">
                  Không có thiết bị nào khớp với từ khóa &ldquo;{deviceQuery}&rdquo;.
                </div>
              ) : (
                <div className="sr-device-list">
                  {filteredDevices.map((device) => (
                    <DeviceServiceCard
                      device={device}
                      isSelected={selectedDeviceIds.includes(device.id)}
                      key={device.id}
                      onToggleDevice={handleToggleDevice}
                      onToggleService={handleToggleService}
                      selectedServiceIds={selectedServices[device.id] || []}
                      serviceTypes={serviceTypes}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <RequestSummaryCard
          canSubmit={canSubmit}
          formError={formError}
          locationType={locationType}
          onRemoveServiceFromDevice={handleToggleService}
          selectedCustomer={selectedCustomer}
          selectedDevices={selectedDevices}
          selectedItemCount={selectedItemCount}
          selectedServices={selectedServices}
          serviceTypesById={serviceTypesById}
          submittingRequest={submittingRequest}
        />
      </form>
    </div>
  );
}

export default ServiceRequestCreatePage;
