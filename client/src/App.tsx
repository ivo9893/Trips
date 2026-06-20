import { Routes, Route } from 'react-router-dom';
import { StoreProvider, useStore } from './store';
import Layout from './components/Layout';
import IdentityGate from './components/IdentityGate';
import { Spinner } from './components/ui';
import TripsPage from './pages/TripsPage';
import RosterPage from './pages/RosterPage';
import DrinksPage from './pages/DrinksPage';
import ShoppingPage from './pages/ShoppingPage';
import GearPage from './pages/GearPage';
import TallyPage from './pages/TallyPage';
import WheelPage from './pages/WheelPage';
import LogPage from './pages/LogPage';
import ListsPage from './pages/ListsPage';

function Shell() {
  const { loading, meId, showAll } = useStore();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="card">
          <Spinner label="Зареждане на лагера…" />
        </div>
      </div>
    );
  }
  // First run: ask who the user is (unless they chose to just browse).
  if (meId == null && !showAll) return <IdentityGate />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TripsPage />} />
        <Route path="roster" element={<RosterPage />} />
        <Route path="drinks" element={<DrinksPage />} />
        <Route path="shopping" element={<ShoppingPage />} />
        <Route path="gear" element={<GearPage />} />
        <Route path="tally" element={<TallyPage />} />
        <Route path="wheel" element={<WheelPage />} />
        <Route path="log" element={<LogPage />} />
        <Route path="lists" element={<ListsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
