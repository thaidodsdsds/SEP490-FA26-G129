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
    <>
      {modal?.type === 'review' && (
        <ReviewModal
          onApprove={() => handleApprove(modal.record)}
          onClose={() => setModal(null)}
          onReject={handleReject}
          error={modal.error}
          record={modal.record}
        />
      )}
      {modal?.type === 'procedure' && <ProcedureModal onClose={() => setModal(null)} onSave={saveProcedure} procedure={modal.procedure} />}
      {modal?.type === 'standard' && <StandardModal onClose={() => setModal(null)} onSave={saveStandard} standard={modal.standard} />}
      {modal?.type === 'revocation' && <RevocationModal onClose={() => setModal(null)} onSubmit={requestRevocation} seal={modal.seal} />}
    </>
  );
}

export default ReviewerWorkspaceOverlays;
