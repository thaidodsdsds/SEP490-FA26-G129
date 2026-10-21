import { useContext } from 'react';
import ReviewerWorkspaceContext from './ReviewerWorkspaceContext.js';

function useReviewerWorkspace() {
  const context = useContext(ReviewerWorkspaceContext);
  if (!context) throw new Error('Reviewer pages must be rendered inside ReviewerWorkspaceProvider.');
  return context;
}

export default useReviewerWorkspace;
