function Modal({ eyebrow, title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-modal="true" className="assignment-modal reviewer-modal" role="dialog">
        <div className="modal-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button aria-label="Đóng" className="icon-button" onClick={onClose} type="button">×</button></div>
        <div className="reviewer-modal-body">{children}</div>
      </section>
    </div>
  );
}

export default Modal;
