import { useState } from 'react';
import DataTable from '../../shared/DataTable.jsx';
import Modal from '../../shared/Modal.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function ReviewModal({ record, onClose, onApprove, onReject, error }) {
  const [twoFactorVerified, setTwoFactorVerified] = useState(false);
  return (
    <Modal title="Soát xét hồ sơ đo" onClose={onClose} eyebrow={record.id}>
      <div className="review-record-summary">
        <div><small>Thiết bị</small><strong>{record.device}</strong></div>
        <div><small>Khách hàng</small><strong>{record.customer}</strong></div>
        <div><small>Kỹ thuật viên · Trình lúc</small><strong>{record.technician} · {record.submittedAt}</strong></div>
        <div><small>Dịch vụ / quy trình</small><strong>{record.type} · {record.procedure}</strong></div>
        <div><small>Chuẩn đối chứng</small><strong>{record.standard}</strong></div>
        <div><small>Môi trường</small><strong>{record.environment} · {record.environmentStatus}</strong></div>
      </div>
      <h3 className="modal-subheading">Chi tiết MeasurementDetail</h3>
      <DataTable columns={[
        { key: 'point', label: 'Điểm đo' }, { key: 'reference', label: 'Giá trị chuẩn' },
        { key: 'measured', label: 'Giá trị đo' }, { key: 'deviation', label: 'Độ lệch' },
        { key: 'uncertainty', label: 'Độ KĐB' },
        { key: 'result', label: 'Đánh giá', render: (row) => <StatusPill>{row.result}</StatusPill> },
      ]} rows={record.measurements} />
      <form className="reject-form" onSubmit={onReject}>
        <label htmlFor="reject-reason">Lý do Reject <span>chỉ bắt buộc khi từ chối</span></label>
        <textarea id="reject-reason" name="reason" placeholder="Ví dụ: sai lệch bất thường, môi trường ngoài yêu cầu, thiếu thông số..." rows="2" />
        {error && <p className="reviewer-inline-error" role="alert">{error}</p>}
        <label className="two-factor-confirm">
          <input checked={twoFactorVerified} onChange={(event) => setTwoFactorVerified(event.target.checked)} type="checkbox" />
          Đã xác thực 2FA cho phiên soát xét này
        </label>
        <div className="modal-actions">
          <button className="button button-secondary" onClick={onClose} type="button">Đóng</button>
          <button className="button button-danger" type="submit">Reject & yêu cầu đo lại</button>
          <button className="button button-primary" disabled={!twoFactorVerified} onClick={onApprove} type="button">Approve</button>
        </div>
      </form>
    </Modal>
  );
}

export default ReviewModal;
