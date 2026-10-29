import { useEffect, useState } from 'react';

function CustomerLocationModeStep({
  companyInfo,
  accountEmail,
  loadingInitial,
  savingCompany,
  companySaveError,
  locationType,
  onsiteAddress,
  onsiteContact,
  preferredDate,
  onSaveCompany,
  onLocationTypeChange,
  onOnsiteAddressChange,
  onOnsiteContactChange,
  onPreferredDateChange,
}) {
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    tax_code: '',
    address: '',
    industry: '',
  });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (companyInfo) {
      setCompanyForm({
        company_name: companyInfo.company_name || '',
        tax_code: companyInfo.tax_code || '',
        address: companyInfo.address || '',
        industry: companyInfo.industry || '',
      });
      setEditingCompany(false);
    }
  }, [companyInfo]);

  const showCompanyForm = !loadingInitial && (!companyInfo || editingCompany);

  const handleCompanySubmit = async () => {
    if (!companyForm.company_name.trim() || !companyForm.address.trim()) {
      setLocalError('Vui lòng nhập đầy đủ Tên doanh nghiệp và Địa chỉ.');
      return;
    }
    setLocalError('');
    const ok = await onSaveCompany({
      company_name: companyForm.company_name.trim(),
      tax_code: companyForm.tax_code.trim() || null,
      address: companyForm.address.trim(),
      industry: companyForm.industry.trim() || null,
    });
    if (ok) {
      setEditingCompany(false);
    }
  };

  return (
    <section className="csr-card" aria-labelledby="csr-step1-heading">
      <div className="csr-step-header">
        <span className="csr-step-badge">1</span>
        <div>
          <h2 id="csr-step1-heading">Hình thức thực hiện & Thông tin đơn vị</h2>
          <p>
            Chọn phương thức gửi thiết bị tới phòng Lab hoặc đăng ký kỹ thuật viên ISOCAL đến trực tiếp nhà máy của bạn.
          </p>
        </div>
      </div>

      {loadingInitial ? (
        <div className="csr-company-banner">
          <div className="csr-company-icon" aria-hidden="true">⏳</div>
          <div className="csr-company-details">
            <strong>Đang tải thông tin doanh nghiệp từ hệ thống...</strong>
            <p>Vui lòng đợi trong giây lát.</p>
          </div>
        </div>
      ) : showCompanyForm ? (
        <div className="csr-add-device-panel" role="region" aria-label="Cập nhật thông tin doanh nghiệp">
          <div className="csr-add-device-header">
            <h3>
              {companyInfo
                ? 'Cập nhật thông tin doanh nghiệp'
                : 'Khai báo thông tin doanh nghiệp (Bắt buộc cho lần đầu tạo đơn)'}
            </h3>
            <p>
              Thông tin này được lưu vào hồ sơ khách hàng để xuất báo giá, hợp đồng và giấy chứng nhận hiệu chuẩn.
            </p>
          </div>

          <div className="csr-add-device-grid">
            <label className="csr-field">
              <span>Tên công ty / đơn vị <b>*</b></span>
              <input
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, company_name: e.target.value }))}
                placeholder="VD: Công ty TNHH Thiết bị Minh Long"
                type="text"
                value={companyForm.company_name}
              />
            </label>
            <label className="csr-field">
              <span>Mã số thuế (tax_code)</span>
              <input
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, tax_code: e.target.value }))}
                placeholder="VD: 0312456789"
                type="text"
                value={companyForm.tax_code}
              />
            </label>
            <label className="csr-field">
              <span>Địa chỉ đăng ký / nhà máy <b>*</b></span>
              <input
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Nhập địa chỉ doanh nghiệp..."
                type="text"
                value={companyForm.address}
              />
            </label>
            <label className="csr-field">
              <span>Lĩnh vực hoạt động (industry)</span>
              <input
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, industry: e.target.value }))}
                placeholder="VD: Sản xuất điện tử, Cơ khí chính xác..."
                type="text"
                value={companyForm.industry}
              />
            </label>
          </div>

          {(localError || companySaveError) && (
            <p className="csr-inline-error" role="alert">
              {localError || companySaveError}
            </p>
          )}

          <div className="csr-add-device-actions">
            {companyInfo && (
              <button
                className="button button-secondary"
                disabled={savingCompany}
                onClick={() => {
                  setEditingCompany(false);
                  setLocalError('');
                }}
                type="button"
              >
                Hủy
              </button>
            )}
            <button
              className="button button-primary"
              disabled={savingCompany}
              onClick={handleCompanySubmit}
              type="button"
            >
              {savingCompany ? 'Đang lưu...' : 'Lưu thông tin doanh nghiệp'}
            </button>
          </div>
        </div>
      ) : (
        <div className="csr-company-banner">
          <div className="csr-company-icon" aria-hidden="true">🏢</div>
          <div className="csr-company-details">
            <div className="csr-company-top">
              <strong>{companyInfo.company_name}</strong>
              <span className="csr-verified-pill">✓ Đã liên kết hồ sơ doanh nghiệp</span>
            </div>
            <p>
              MST: <b>{companyInfo.tax_code || 'Chưa cập nhật'}</b> · Địa chỉ: <b>{companyInfo.address}</b>
              {companyInfo.industry ? ` · Ngành: ${companyInfo.industry}` : ''}
            </p>
            {accountEmail && (
              <small>Tài khoản gửi yêu cầu: {accountEmail}</small>
            )}
          </div>
          <button
            className="button button-secondary csr-btn-sm"
            onClick={() => setEditingCompany(true)}
            type="button"
          >
            Sửa thông tin
          </button>
        </div>
      )}

      <div className="csr-location-grid" role="radiogroup" aria-label="Hình thức thực hiện dịch vụ">
        <button
          aria-checked={locationType === 'In-lab'}
          className={`csr-location-option${locationType === 'In-lab' ? ' is-selected' : ''}`}
          onClick={() => onLocationTypeChange('In-lab')}
          role="radio"
          type="button"
        >
          <div className="csr-location-option-top">
            <span className="csr-location-icon" aria-hidden="true">⌂</span>
            <span className="csr-radio-indicator" aria-hidden="true" />
          </div>
          <strong>Tại Phòng Lab ISOCAL (In-lab)</strong>
          <p>
            Quý khách gửi hoặc bàn giao thiết bị tới trung tâm hiệu chuẩn ISOCAL. Không phát sinh phí di chuyển kỹ thuật viên.
          </p>
          <span className="csr-location-tag">Tiết kiệm chi phí · Chuẩn ISO/IEC 17025</span>
        </button>

        <button
          aria-checked={locationType === 'On-site'}
          className={`csr-location-option${locationType === 'On-site' ? ' is-selected' : ''}`}
          onClick={() => onLocationTypeChange('On-site')}
          role="radio"
          type="button"
        >
          <div className="csr-location-option-top">
            <span className="csr-location-icon" aria-hidden="true">⌖</span>
            <span className="csr-radio-indicator" aria-hidden="true" />
          </div>
          <strong>Tận nơi tại Nhà máy / Cơ sở (On-site)</strong>
          <p>
            Đoàn kỹ thuật ISOCAL mang chuẩn đo lường đến thực hiện trực tiếp tại hiện trường, hạn chế tối đa dừng máy sản xuất.
          </p>
          <span className="csr-location-tag csr-location-tag--onsite">
            Thuận tiện cho dây chuyền & máy cố định
          </span>
        </button>
      </div>

      <div className="csr-logistics-box">
        {locationType === 'In-lab' ? (
          <div className="csr-inlab-guide">
            <div>
              <span className="csr-mini-label">ĐỊA ĐIỂM TIẾP NHẬN THIẾT BỊ ISOCAL</span>
              <strong>Trung tâm Đo lường & Hiệu chuẩn ISOCAL — Quầy Tiếp nhận Mẫu</strong>
              <p>Tầng 1, Khu Công nghệ cao, TP. Thủ Đức, TP. Hồ Chí Minh · Giờ nhận mẫu: 08:00 – 17:00 (Thứ 2 – Thứ 7)</p>
            </div>
            <label className="csr-field csr-field--compact">
              <span>Ngày dự kiến gửi thiết bị</span>
              <input
                onChange={(event) => onPreferredDateChange(event.target.value)}
                type="date"
                value={preferredDate}
              />
            </label>
          </div>
        ) : (
          <div className="csr-onsite-fields">
            <label className="csr-field">
              <span>Địa chỉ thực hiện On-site</span>
              <input
                onChange={(event) => onOnsiteAddressChange(event.target.value)}
                placeholder="Nhập địa chỉ nhà máy / phân xưởng thực hiện..."
                type="text"
                value={onsiteAddress}
              />
            </label>
            <label className="csr-field">
              <span>Người liên hệ đón tiếp tại nhà máy</span>
              <input
                onChange={(event) => onOnsiteContactChange(event.target.value)}
                placeholder="Họ tên & số điện thoại liên hệ..."
                type="text"
                value={onsiteContact}
              />
            </label>
            <label className="csr-field">
              <span>Ngày mong muốn thực hiện</span>
              <input
                onChange={(event) => onPreferredDateChange(event.target.value)}
                type="date"
                value={preferredDate}
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
}

export default CustomerLocationModeStep;
