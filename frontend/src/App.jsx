import { MotionConfig } from 'motion/react';
import { AppProviders } from './app/providers.jsx';
import { AppRouter } from './app/router.jsx';

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </MotionConfig>
  );
}

export default App;
