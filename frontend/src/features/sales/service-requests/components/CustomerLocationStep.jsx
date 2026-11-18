function CustomerLocationStep({
  customers,
  customerId,
  selectedCustomer,
  locationType,
  loadingCustomers,
  customerDevicesCount,
  onCustomerChange,
  onLocationTypeChange,
}) {
  return (
    <section className="sr-card" aria-labelledby="sr-customer-heading">
      <div className="sr-section-heading">
        <span className="sr-step">1</span>
        <div>
          <h2 id="sr-customer-heading">Thông tin khách hàng & hình thức</h2>
          <p>Chọn đơn vị sở hữu thiết bị và địa điểm thực hiện hiệu chuẩn / kiểm định.</p>
        </div>
      </div>

      <div className="sr-customer-grid">
        <label className="sr-field">
          <span>Khách hàng được gán phụ trách <b>*</b></span>
          <select
            disabled={loadingCustomers}
            value={customerId}
            onChange={(event) => onCustomerChange(event.target.value)}
            required
          >
            <option value="">
              {loadingCustomers
                ? 'Đang tải danh sách khách hàng được phân công...'
                : customers.length === 0
                  ? '-- Chưa có khách hàng nào được phân công cho bạn --'
                  : '-- Chọn khách hàng do bạn phụ trách --'}
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={String(customer.id)}>
                {customer.company_name}
                {customer.assigned_sales_name ? ` (Sales: ${customer.assigned_sales_name})` : ''}
              </option>
            ))}
          </select>
          <small style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
            ℹ Nhân viên Sales chỉ được phép tạo phiếu yêu cầu cho các khách hàng đã được Trưởng phòng Kinh doanh (HeadSales) phân công.
          </small>
        </label>

        {selectedCustomer ? (
          <div className="sr-customer-summary">
            <span className="sr-summary-label">ĐƠN VỊ ĐÃ CHỌN</span>
            <strong>{selectedCustomer.company_name}</strong>
            <div className="sr-customer-meta">
              <span className="sr-meta-pill">Mã KH: #{selectedCustomer.id}</span>
              <span className="sr-meta-pill">{customerDevicesCount} thiết bị trong danh mục</span>
            </div>
          </div>
        ) : (
          <div className="sr-customer-placeholder">
            <span aria-hidden="true">🏢</span>
            <span>Chọn khách hàng để tải danh sách thiết bị đo lường của đơn vị đó.</span>
          </div>
        )}
      </div>

      <fieldset className="sr-location-fieldset">
        <legend>Hình thức thực hiện <b>*</b></legend>
        <label className={`sr-location-option${locationType === 'In-lab' ? ' selected' : ''}`}>
          <input
            checked={locationType === 'In-lab'}
            name="locationType"
            onChange={() => onLocationTypeChange('In-lab')}
            type="radio"
          />
          <span className="sr-option-icon" aria-hidden="true">⌂</span>
          <span>
            <strong>Tại phòng Lab (In-lab)</strong>
            <small>Khách hàng gửi thiết bị đến phòng thí nghiệm ISOCAL</small>
          </span>
        </label>
        <label className={`sr-location-option${locationType === 'On-site' ? ' selected' : ''}`}>
          <input
            checked={locationType === 'On-site'}
            name="locationType"
            onChange={() => onLocationTypeChange('On-site')}
            type="radio"
          />
          <span className="sr-option-icon" aria-hidden="true">⌖</span>
          <span>
            <strong>Tại hiện trường (On-site)</strong>
            <small>Kỹ thuật viên mang chuẩn đến địa điểm của khách hàng</small>
          </span>
        </label>
      </fieldset>
    </section>
  );
}

export default CustomerLocationStep;

