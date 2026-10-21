import { serviceTypes } from '../../mockData.js';
import Modal from '../../shared/Modal.jsx';

function ProcedureModal({ procedure, onClose, onSave }) {
  return (
    <Modal eyebrow={procedure ? `${procedure.code} · ${procedure.version}` : 'CALIBRATION PROCEDURE'} title={procedure ? 'Chỉnh sửa bản nháp' : 'Tạo quy trình mới'} onClose={onClose}>
      {procedure?.status === 'Active' && <div className="modal-hint">Quy trình Active không thể sửa. Hãy tạo phiên bản mới để bảo toàn lịch sử truy vết.</div>}
      <form className="reviewer-form" onSubmit={onSave}>
        <div className="form-grid-two">
          <label>ServiceType<select defaultValue={procedure?.serviceType || ''} name="serviceType" required><option value="">Chọn dịch vụ</option>{serviceTypes.filter((item) => item.status === 'Active').map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label>Standard code<input defaultValue={procedure?.code || ''} name="code" placeholder="ISOCAL-HC-DIEN-01" required /></label>
        </div>
        <div className="form-grid-two">
          <label>Ngày hiệu lực<input defaultValue={procedure?.effectiveFrom || '2026-10-21'} name="effectiveFrom" required type="date" /></label>
          <label>Thiết bị / chuẩn yêu cầu<input defaultValue={procedure?.requiredEquipment || ''} name="requiredEquipment" placeholder="Ví dụ: Calibrator Fluke 5522A" required /></label>
        </div>
        <label>Yêu cầu môi trường<input defaultValue={procedure?.environment || ''} name="environment" placeholder="Nhiệt độ, độ ẩm..." required /></label>
        <label>Các bước thao tác <small>Mỗi dòng là một bước; thêm [evidence] nếu cần minh chứng.</small><textarea defaultValue={procedure?.steps.map((item) => `${item.instruction}${item.evidence ? ' [evidence]' : ''}`).join('\n') || ''} name="steps" placeholder={'Kiểm tra ngoại quan\nĐo tại các điểm quy định [evidence]'} required rows="4" /></label>
        <div className="form-grid-two">
          <label>Thông số đo<input defaultValue={procedure?.parameters[0]?.name || ''} name="parameter" placeholder="Điện áp DC" required /></label>
          <label>Đơn vị<input defaultValue={procedure?.parameters[0]?.unit || ''} name="unit" placeholder="V" required /></label>
        </div>
        <div className="form-grid-two">
          <label>Số lần lặp<input defaultValue={procedure?.parameters[0]?.repeat || 3} min="1" name="repeat" required type="number" /></label>
          <label>Phương pháp tính<select defaultValue={procedure?.parameters[0]?.method || 'mean'} name="method"><option value="mean">mean</option><option value="stdev">stdev</option><option value="max">max</option><option value="min">min</option><option value="sum">sum</option></select></label>
        </div>
        <label>Điểm đo <small>Mỗi dòng: giá trị danh định | dung sai | độ không đảm bảo tối đa.</small>
          <textarea
            defaultValue={procedure?.testPointConfig || (
              Array.isArray(procedure?.parameters[0]?.points)
                ? procedure.parameters[0].points.map((point) => `${point.nominalValue} | ${point.tolerance} | ${point.maxUncertainty}`).join('\n')
                : Array.from({ length: procedure?.parameters[0]?.points || 1 }, (_, index) => `${index + 1} | ±0.02 | 0.01`).join('\n')
            )}
            name="testPoints"
            placeholder={'10 | ±0.02 | 0.01\n50 | ±0.08 | 0.02'}
            required
            rows="3"
          />
        </label>
        <p className="form-footnote">Bản demo dùng các hàm tính an toàn đã cho phép; không thực thi công thức/mã tùy ý.</p>
        <div className="modal-actions"><button className="button button-secondary" onClick={onClose} type="button">Hủy</button><button className="button button-primary" type="submit">Lưu bản nháp</button></div>
      </form>
    </Modal>
  );
}

export default ProcedureModal;
