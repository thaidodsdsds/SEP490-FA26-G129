import { useEffect, useId, useRef } from 'react';
import { motion } from 'motion/react';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Modal({ eyebrow, title, onClose, children }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="modal-backdrop"
      exit={{ opacity: 0, transition: { duration: 0.14 } }}
      initial={{ opacity: 0 }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      transition={{ duration: 0.16 }}
    >
      <motion.section
        animate={{ opacity: 1, scale: 1, y: 0 }}
        aria-labelledby={titleId}
        aria-modal="true"
        className="assignment-modal reviewer-modal"
        exit={{ opacity: 0, scale: 0.98, y: 6, transition: { duration: 0.14 } }}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button">×</button>
        </div>
        <div className="reviewer-modal-body">{children}</div>
      </motion.section>
    </motion.div>
  );
}

export default Modal;
