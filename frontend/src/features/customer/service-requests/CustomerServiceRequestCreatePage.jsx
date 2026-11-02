import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../../app/providers.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import {
  createCustomerDeviceApi,
  createServiceRequestApi,
  extractApiErrorMessage,
  getCustomerDevicesApi,
  getMyProfileApi,
  getServiceTypesApi,
  upsertMyCompanyApi,
} from '../../../services/service-request-service.js';
import CustomerAttachmentStep from './components/CustomerAttachmentStep.jsx';
import CustomerDeviceServiceList from './components/CustomerDeviceServiceList.jsx';
import CustomerLocationModeStep from './components/CustomerLocationModeStep.jsx';
import CustomerRequestSidebar from './components/CustomerRequestSidebar.jsx';
import { evaluateDeviceDueState } from './mockData.js';
import './customer-service-requests.css';

const getDefaultPreferredDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return date.toISOString().slice(0, 10);
};

function CustomerServiceRequestCreatePage() {
  const { session } = useAppContext();

  const [profile, setProfile] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [devices, setDevices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySaveError, setCompanySaveError] = useState('');
  const [submittingDevice, setSubmittingDevice] = useState(false);
  const [deviceFormError, setDeviceFormError] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const [locationType, setLocationType] = useState('In-lab');
  const [onsiteAddress, setOnsiteAddress] = useState('');
  const [onsiteContact, setOnsiteContact] = useState('');
  const [preferredDate, setPreferredDate] = useState(getDefaultPreferredDate);

  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [selectedServicesByDevice, setSelectedServicesByDevice] = useState({});

  const [attachments, setAttachments] = useState([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [accessoriesNote, setAccessoriesNote] = useState('');

  const [formError, setFormError] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState(null);

  const loadCustomerDevices = useCallback(async (targetCustomerId) => {
    if (!targetCustomerId) {
      setDevices([]);
      return;
    }

    setLoadingDevices(true);
    try {
      const list = await getCustomerDevicesApi(targetCustomerId);
      setDevices(Array.isArray(list) ? list : []);
    } catch (error) {
      setFormError(
        extractApiErrorMessage(error, 'Không thể tải danh sách thiết bị của doanh nghiệp.'),
      );
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoadingInitial(true);
    setFormError('');
    try {
      const [profileData, serviceTypeList] = await Promise.all([
        getMyProfileApi(),
        getServiceTypesApi(),
      ]);

      setProfile(profileData);
      setServiceTypes(Array.isArray(serviceTypeList) ? serviceTypeList : []);

      const resolvedCustomer = profileData?.customer || null;
      const resolvedCustomerId = resolvedCustomer?.id || profileData?.customer_id || null;

      setCompanyInfo(resolvedCustomer);
      if (resolvedCustomer?.address) {
        setOnsiteAddress((prev) => prev || resolvedCustomer.address);
      }
      if (profileData) {
        const contactParts = [profileData.full_name, profileData.phone].filter(Boolean).join(' · ');
        setOnsiteContact((prev) => prev || contactParts || profileData.email || '');
      }

      if (resolvedCustomerId) {
        await loadCustomerDevices(resolvedCustomerId);
      } else {
        setDevices([]);
      }
    } catch (error) {
      setFormError(
        extractApiErrorMessage(error, 'Không thể kết nối dữ liệu từ máy chủ.'),
      );
    } finally {
      setLoadingInitial(false);
    }
  }, [loadCustomerDevices]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const accountEmail = useMemo(() => {
    if (profile?.full_name && profile?.email) {
      return `${profile.full_name} (${profile.email})`;
    }
    return profile?.email || session?.user?.email || '';
  }, [profile, session]);

  const serviceTypesById = useMemo(
    () => new Map(serviceTypes.map((service) => [service.id, service])),
    [serviceTypes],
  );

  const selectedDevices = useMemo(
    () => devices.filter((device) => selectedDeviceIds.includes(device.id)),
    [devices, selectedDeviceIds],
  );

  const hasCompanyLinked = Boolean(companyInfo?.id);

  const hasAllDevicesAssigned = useMemo(
    () =>
      selectedDevices.length > 0
      && selectedDevices.every(
        (device) => (selectedServicesByDevice[device.id]?.length || 0) > 0,
      ),
    [selectedDevices, selectedServicesByDevice],
  );

  const canSubmit = Boolean(
    hasCompanyLinked && selectedDevices.length > 0 && hasAllDevicesAssigned,
  );

  const handleSaveCompany = async (companyPayload) => {
    setSavingCompany(true);
    setCompanySaveError('');
    try {
      const result = await upsertMyCompanyApi(companyPayload);
      const savedCustomer = result?.customer || null;
      setCompanyInfo(savedCustomer);
      if (savedCustomer?.address) {
        setOnsiteAddress(savedCustomer.address);
      }
      if (savedCustomer?.id) {
        await loadCustomerDevices(savedCustomer.id);
      }
      return true;
    } catch (error) {
      setCompanySaveError(
        extractApiErrorMessage(error, 'Không thể lưu thông tin doanh nghiệp.'),
      );
      return false;
    } finally {
      setSavingCompany(false);
    }
  };

  const handleToggleDevice = (deviceId) => {
    setFormError('');
    setSelectedDeviceIds((current) =>
      current.includes(deviceId)
        ? current.filter((id) => id !== deviceId)
        : [...current, deviceId],
    );
  };

  const handleToggleServiceForDevice = (deviceId, serviceTypeId) => {
    setFormError('');
    setSelectedServicesByDevice((current) => {
      const existing = current[deviceId] || [];
      const next = existing.includes(serviceTypeId)
        ? existing.filter((id) => id !== serviceTypeId)
        : [...existing, serviceTypeId];
      return {
        ...current,
        [deviceId]: next,
      };
    });
  };

  const handleSelectUrgentDevices = () => {
    setFormError('');
    const urgentIds = devices
      .filter((device) => evaluateDeviceDueState(device.next_due_date).isUrgent)
      .map((device) => device.id);

    setSelectedDeviceIds((current) => [...new Set([...current, ...urgentIds])]);
  };

  const handleAddNewDevice = async (newDevicePayload) => {
    if (!companyInfo?.id) return false;

    setSubmittingDevice(true);
    setDeviceFormError('');
    try {
      const createdDevice = await createCustomerDeviceApi(companyInfo.id, newDevicePayload);
      if (createdDevice) {
        setDevices((current) => [createdDevice, ...current]);
        setSelectedDeviceIds((current) => [createdDevice.id, ...current]);
      }
      return true;
    } catch (error) {
      setDeviceFormError(
        extractApiErrorMessage(error, 'Không thể thêm thiết bị mới.'),
      );
      return false;
    } finally {
      setSubmittingDevice(false);
    }
  };

  const handleAddFiles = (fileList) => {
    const mapped = fileList.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${file.name}`,
      file_name: file.name,
      size: file.size,
      file_url: `client-upload://${encodeURIComponent(file.name)}`,
    }));
    setAttachments((current) => [...current, ...mapped]);
  };

  const handleRemoveAttachment = (attachmentId) => {
    setAttachments((current) => current.filter((item) => item.id !== attachmentId));
  };

  const handleRemoveDevice = (deviceId) => {
    setSelectedDeviceIds((current) => current.filter((id) => id !== deviceId));
  };

  const handleClearSelection = () => {
    setSelectedDeviceIds([]);
    setSelectedServicesByDevice({});
    setFormError('');
  };

  const handleSubmitRequest = async () => {
    if (!canSubmit || !companyInfo?.id) {
      setFormError(
        'Vui lòng liên kết thông tin doanh nghiệp, chọn ít nhất một thiết bị và gán đầy đủ dịch vụ cần thực hiện.',
      );
      return;
    }

    if (locationType === 'On-site' && !onsiteAddress.trim()) {
      setFormError('Vui lòng nhập địa chỉ nhà máy / cơ sở thực hiện On-site.');
      return;
    }

    setSubmittingRequest(true);
    setFormError('');

    try {
      const payload = {
        customer_id: Number(companyInfo.id),
        location_type: locationType,
        preferred_date: preferredDate ? preferredDate.trim() : null,
        items: selectedDevices.map((device) => ({
          device_id: Number(device.id),
          service_type_ids: (selectedServicesByDevice[device.id] || []).map((id) => Number(id)),
        })),
        ...(attachments.length > 0
          ? {
              attachments: attachments.map((att) => ({
                file_name: att.file_name,
                file_url: att.file_url,
              })),
            }
          : {}),
      };

      const created = await createServiceRequestApi(payload);

      setSubmittedOrder({
        id: created.id,
        request_code: created.request_code || `SR-2026-${String(created.id).padStart(3, '0')}`,
        company_name: companyInfo.company_name,
        location_type: created.location_type || locationType,
        preferred_date: preferredDate,
        devices_count: selectedDevices.length,
        items_count: Array.isArray(created.items) ? created.items.length : 0,
        attachments_count: Array.isArray(created.attachments)
          ? created.attachments.length
          : attachments.length,
        status: created.status || 'New',
      });

      setSelectedDeviceIds([]);
      setSelectedServicesByDevice({});
      setAttachments([]);
      setSpecialNotes('');
      setAccessoriesNote('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setFormError(
        extractApiErrorMessage(
          error,
          'Không thể gửi phiếu yêu cầu dịch vụ. Vui lòng kiểm tra lại dữ liệu.',
        ),
      );
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="dash-page customer-sr-page">
      <PageHeader
        actions={(
          <div className="csr-header-actions">
            <button
              className="button button-secondary"
              disabled={loadingInitial || loadingDevices}
              onClick={fetchInitialData}
              type="button"
            >
              ↻ Làm mới dữ liệu
            </button>
            <Link className="button button-secondary" to="/internal/customer">
              ← Quay lại Tổng quan
            </Link>
          </div>
        )}
        description="Đăng ký hiệu chuẩn và kiểm định thiết bị đo lường trực tuyến. Chọn nhanh thiết bị sắp đến hạn, đính kèm hồ sơ kỹ thuật và nhận báo giá trực tiếp trên cổng khách hàng."
        eyebrow="CỔNG KHÁCH HÀNG · ĐĂNG KÝ DỊCH VỤ"
        title="Tạo yêu cầu dịch vụ hiệu chuẩn / kiểm định"
      />

      {submittedOrder && (
        <section className="csr-receipt-card" role="status" aria-live="polite">
          <div className="csr-receipt-icon" aria-hidden="true">✓</div>
          <div className="csr-receipt-body">
            <div className="csr-receipt-top">
              <strong>
                Đã gửi yêu cầu dịch vụ thành công — Mã phiếu: {submittedOrder.request_code}
              </strong>
              <span className="csr-status-new">Trạng thái: Mới tạo ({submittedOrder.status})</span>
            </div>
            <p>
              Đơn vị: <b>{submittedOrder.company_name}</b> · Hình thức:{' '}
              <b>{submittedOrder.location_type === 'On-site' ? 'On-site tại nhà máy' : 'In-lab tại ISOCAL'}</b> ·{' '}
              <b>{submittedOrder.devices_count} thiết bị</b> ({submittedOrder.items_count} hạng mục dịch vụ)
              {submittedOrder.attachments_count > 0 ? ` · ${submittedOrder.attachments_count} tệp đính kèm` : ''}.
            </p>
            <p className="csr-receipt-hint">
              Phiếu yêu cầu đã được lưu vào hệ thống ISOCAL. Bộ phận Kinh doanh sẽ lập Báo giá chi tiết và gửi phản hồi cho quý khách.
            </p>
            <div className="csr-receipt-actions">
              <Link className="button button-primary csr-btn-sm" to="/internal/customer">
                Về trang Tổng quan theo dõi đơn
              </Link>
              <button
                className="button button-secondary csr-btn-sm"
                onClick={() => setSubmittedOrder(null)}
                type="button"
              >
                Tạo thêm phiếu yêu cầu khác
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="csr-layout-grid">
        <div className="csr-main-column">
          <CustomerLocationModeStep
            accountEmail={accountEmail}
            companyInfo={companyInfo}
            companySaveError={companySaveError}
            loadingInitial={loadingInitial}
            locationType={locationType}
            onLocationTypeChange={setLocationType}
            onOnsiteAddressChange={setOnsiteAddress}
            onOnsiteContactChange={setOnsiteContact}
            onPreferredDateChange={setPreferredDate}
            onSaveCompany={handleSaveCompany}
            onsiteAddress={onsiteAddress}
            onsiteContact={onsiteContact}
            preferredDate={preferredDate}
            savingCompany={savingCompany}
          />

          <CustomerDeviceServiceList
            deviceFormError={deviceFormError}
            devices={devices}
            hasCompanyLinked={hasCompanyLinked}
            loadingDevices={loadingDevices || loadingInitial}
            onAddNewDevice={handleAddNewDevice}
            onClearDeviceFormError={() => setDeviceFormError('')}
            onSelectUrgentDevices={handleSelectUrgentDevices}
            onToggleDevice={handleToggleDevice}
            onToggleServiceForDevice={handleToggleServiceForDevice}
            selectedDeviceIds={selectedDeviceIds}
            selectedServicesByDevice={selectedServicesByDevice}
            serviceTypes={serviceTypes}
            submittingDevice={submittingDevice}
          />

          <CustomerAttachmentStep
            accessoriesNote={accessoriesNote}
            attachments={attachments}
            onAccessoriesNoteChange={setAccessoriesNote}
            onAddFiles={handleAddFiles}
            onRemoveAttachment={handleRemoveAttachment}
            onSpecialNotesChange={setSpecialNotes}
            specialNotes={specialNotes}
          />
        </div>

        <CustomerRequestSidebar
          attachmentsCount={attachments.length}
          canSubmit={canSubmit}
          formError={formError}
          hasAllDevicesAssigned={hasAllDevicesAssigned}
          hasCompanyLinked={hasCompanyLinked}
          locationType={locationType}
          onClearSelection={handleClearSelection}
          onRemoveDevice={handleRemoveDevice}
          onSubmit={handleSubmitRequest}
          preferredDate={preferredDate}
          selectedDevices={selectedDevices}
          selectedServicesByDevice={selectedServicesByDevice}
          serviceTypesById={serviceTypesById}
          submittingRequest={submittingRequest}
        />
      </div>
    </div>
  );
}

export default CustomerServiceRequestCreatePage;
