import { AnimatePresence, motion } from 'motion/react';

const ICONS = {
  success: '✓',
  error: '!',
  info: 'i',
};

function Toast({ toast, onDismiss }) {
  const tone = toast?.tone || 'info';

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={`dash-toast ${tone}`}
          exit={{ opacity: 0, scale: 0.98, y: 12, transition: { duration: 0.14 } }}
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          key={toast.message}
          role={tone === 'error' ? 'alert' : 'status'}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span aria-hidden="true">{ICONS[tone] || ICONS.info}</span>
          <span>{toast.message}</span>
          <button aria-label="Đóng thông báo" onClick={onDismiss} type="button">×</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Toast;
