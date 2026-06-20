import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setActor, type ListItem, type Trip } from './api';

interface Lists {
  people: ListItem[];
  meats: ListItem[];
  drinks: ListItem[];
  locations: ListItem[];
  bringItems: ListItem[];
  gearItems: ListItem[];
}

interface Store {
  trips: Trip[];
  currentTrip: Trip | null;
  setCurrentTripId: (id: number) => void;
  lists: Lists;
  loading: boolean;
  refreshTrips: () => Promise<void>;
  refreshLists: () => Promise<void>;
  // identity ("who am I")
  meId: number | null;
  me: ListItem | null;
  setMeId: (id: number | null) => void;
  showAll: boolean;
  setShowAll: (v: boolean) => void;
}

const emptyLists: Lists = {
  people: [],
  meats: [],
  drinks: [],
  locations: [],
  bringItems: [],
  gearItems: [],
};

const Ctx = createContext<Store>(null as any);
export const useStore = () => useContext(Ctx);

const LS_KEY = 'palatki.currentTripId';
const LS_ME = 'palatki.meId';
const LS_SHOW_ALL = 'palatki.showAll';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTripId, setCurrentTripIdState] = useState<number | null>(() => {
    const v = localStorage.getItem(LS_KEY);
    return v ? Number(v) : null;
  });
  const [lists, setLists] = useState<Lists>(emptyLists);
  const [loading, setLoading] = useState(true);
  const [meId, setMeIdState] = useState<number | null>(() => {
    const v = localStorage.getItem(LS_ME);
    return v ? Number(v) : null;
  });
  const [showAll, setShowAllState] = useState<boolean>(() => localStorage.getItem(LS_SHOW_ALL) === '1');

  const setCurrentTripId = (id: number) => {
    localStorage.setItem(LS_KEY, String(id));
    setCurrentTripIdState(id);
  };

  const setMeId = (id: number | null) => {
    if (id == null) localStorage.removeItem(LS_ME);
    else localStorage.setItem(LS_ME, String(id));
    setMeIdState(id);
  };

  const setShowAll = (v: boolean) => {
    localStorage.setItem(LS_SHOW_ALL, v ? '1' : '0');
    setShowAllState(v);
  };

  const refreshTrips = async () => {
    const t = await api.getTrips();
    setTrips(t);
    setCurrentTripIdState((cur) => {
      if (cur && t.some((x) => x.id === cur)) return cur;
      const first = t[0]?.id ?? null;
      if (first) localStorage.setItem(LS_KEY, String(first));
      return first;
    });
  };

  const refreshLists = async () => {
    const [people, meats, drinks, locations, bringItems, gearItems] = await Promise.all([
      api.getList('people'),
      api.getList('meats'),
      api.getList('drinks'),
      api.getList('locations'),
      api.getList('bring-items'),
      api.getList('gear-items'),
    ]);
    setLists({ people, meats, drinks, locations, bringItems, gearItems });
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([refreshTrips(), refreshLists()]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentTrip = trips.find((t) => t.id === currentTripId) ?? null;
  const me = lists.people.find((p) => p.id === meId) ?? null;

  // keep the API actor (for activity-log attribution) in sync with identity
  useEffect(() => {
    setActor(me ? me.name : 'Гост');
  }, [me?.id, me?.name]);

  return (
    <Ctx.Provider
      value={{
        trips,
        currentTrip,
        setCurrentTripId,
        lists,
        loading,
        refreshTrips,
        refreshLists,
        meId,
        me,
        setMeId,
        showAll,
        setShowAll,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
