import Modal from '../../shared/Modal.jsx';

function StandardModal({ standard, onClose, onSave }) {
  return (
    <Modal eyebrow="MASTER STANDARD" title={standard ? 'Cập nhật chuẩn đối chứng' : 'Thêm chuẩn đối chứng'} onClose={onClose}>
      <form className="reviewer-form" onSubmit={onSave}>
        <label>Tên chuẩn<input defaultValue={standard?.name || ''} name="name" required /></label>
        <div className="form-grid-two">
          <label>Số serial<input defaultValue={standard?.serial || ''} name="serial" required /></label>
          <label>Cấp chính xác<input defaultValue={standard?.accuracy || ''} name="accuracy" required /></label>
        </div>
        <div className="form-grid-two">
          <label>Lĩnh vực<select defaultValue={standard?.field || 'Điện – Điện tử'} name="field"><option>Điện – Điện tử</option><option>Khối lượng – Lực</option><option>Nhiệt độ – Độ ẩm</option><option>Độ dài – Dung tích</option></select></label>
          <label>Hạn hiệu chuẩn<input defaultValue={standard?.expiry || '2027-10-21'} name="expiry" required type="date" /></label>
        </div>
        <label>Trạng thái<select defaultValue={standard?.status || 'Active'} name="status"><option>Active</option><option>Inactive</option><option>Expired</option></select></label>
        <div className="modal-actions"><button className="button button-secondary" onClick={onClose} type="button">Hủy</button><button className="button button-primary" type="submit">Lưu chuẩn</button></div>
      </form>
    </Modal>
  );
}

export default StandardModal;
