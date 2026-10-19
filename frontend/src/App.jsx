import { AppProviders } from './app/providers.jsx';
import { AppRouter } from './app/router.jsx';

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
