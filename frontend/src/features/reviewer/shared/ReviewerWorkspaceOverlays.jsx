import { AnimatePresence } from 'motion/react';
import useReviewerWorkspace from '../useReviewerWorkspace.js';
import ProcedureModal from '../features/procedures/ProcedureModal.jsx';
import ReviewModal from '../features/review-queue/ReviewModal.jsx';
import RevocationModal from '../features/seals/RevocationModal.jsx';
import StandardModal from '../features/standards/StandardModal.jsx';

function ReviewerWorkspaceOverlays() {
  const {
    modal,
    setModal,
    handleApprove,
    handleReject,
    saveProcedure,
    saveStandard,
    requestRevocation,
  } = useReviewerWorkspace();
  return (
    <AnimatePresence mode="wait">
      {modal?.type === 'review' && (
        <ReviewModal
          key="review"
          onApprove={(signOptions) => handleApprove(modal.record, signOptions)}
          onClose={() => setModal(null)}
          onReject={handleReject}
          error={modal.error}
          record={modal.record}
        />
      )}
      {modal?.type === 'procedure' && <ProcedureModal key="procedure" onClose={() => setModal(null)} onSave={saveProcedure} procedure={modal.procedure} />}
      {modal?.type === 'standard' && <StandardModal key="standard" onClose={() => setModal(null)} onSave={saveStandard} standard={modal.standard} />}
      {modal?.type === 'revocation' && <RevocationModal key="revocation" onClose={() => setModal(null)} onSubmit={requestRevocation} seal={modal.seal} />}
    </AnimatePresence>
  );
}

export default ReviewerWorkspaceOverlays;
