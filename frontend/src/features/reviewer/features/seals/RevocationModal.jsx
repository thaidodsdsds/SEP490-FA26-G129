import Modal from '../../shared/Modal.jsx';

function RevocationModal({ seal, onClose, onSubmit }) {
  return (
    <Modal eyebrow={seal.code} title="Yêu cầu thu hồi Seal" onClose={onClose}>
      <div className="modal-hint">Yêu cầu sẽ được chuyển đến Signatory để quyết định. Seal chưa đổi trạng thái trước khi quyết định được ký số.</div>
      <div className="revocation-device"><strong>{seal.device}</strong><span>{seal.serial} · {seal.certificate}</span></div>
      <form className="reviewer-form" onSubmit={onSubmit}>
        <label>Lý do thu hồi <span className="required-star">*</span><select defaultValue="" name="reason" required><option disabled value="">Chọn lý do</option><option value="Sai sót nghiêm trọng trên kết quả">Sai sót nghiêm trọng trên kết quả</option><option value="Thiết bị cần thu hồi để đo lại">Thiết bị cần thu hồi để đo lại</option><option value="Seal phát hành nhầm thông tin">Seal phát hành nhầm thông tin</option><option value="Khác">Khác</option></select></label>
        <label>Ghi chú<textarea name="note" placeholder="Bổ sung mô tả và thông tin cần thiết..." rows="3" /></label>
        <div className="modal-actions"><button className="button button-secondary" onClick={onClose} type="button">Hủy</button><button className="button button-danger" type="submit">Gửi yêu cầu</button></div>
      </form>
    </Modal>
  );
}

export default RevocationModal;
