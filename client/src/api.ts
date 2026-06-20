// Typed fetch client for the Палатки API.

export type Attending = 'yes' | 'no' | 'unknown';
export type DrinkCategory = 'alcohol' | 'carbonated' | 'noncarbonated';
export type GearCategory = 'mandatory' | 'recommended' | 'optional';
export type ShopCategory = 'fruit_veg' | 'other_food' | 'consumables';
export type ShopStatus = 'active' | 'taken' | 'discuss';

export interface ListItem {
  id: number;
  name: string;
  sort_order: number;
  active: number;
  category?: string;
  url?: string | null;
  note?: string | null;
}

export interface Trip {
  id: number;
  name: string;
  date_start: string | null;
  date_end: string | null;
  location_id: number | null;
  notes: string | null;
  location_name?: string | null;
  location_url?: string | null;
}

export interface Participant {
  id: number;
  trip_id: number;
  person_id: number;
  person_name: string;
  attending: Attending;
  nights: number | null;
  bring_note: string | null;
  beer_note: string | null;
  juice_note: string | null;
  updated_at: string;
  meats: { night1: number[]; night2: number[]; other: number[] };
  drink_ids: number[];
  bring_item_ids: number[];
}

export interface ShoppingItem {
  id: number;
  trip_id: number;
  category: ShopCategory;
  name: string;
  quantity: string | null;
  status: ShopStatus;
  sort_order: number;
}

export interface Tally {
  meats: { id: number; name: string; count: number }[];
  drinks: { id: number; name: string; category: DrinkCategory; count: number }[];
  bring: { id: number; name: string; count: number }[];
  attendance: { yes: number; no: number; unknown: number; total_nights: number };
  noResponse: string[];
  lastUpdated: string | null;
}

const BASE = '/api';

// Current actor ("me") name, attached to every request so the server can
// attribute activity-log entries. Set from the store when identity changes.
let actorName: string | null = null;
export function setActor(name: string | null) {
  actorName = name;
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options?.headers as any) };
  // Header values must be ASCII-safe — Cyrillic names are URI-encoded.
  if (actorName) headers['X-Actor'] = encodeURIComponent(actorName);
  const res = await fetch(BASE + path, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // lists
  getList: (list: string, onlyActive = false) =>
    req<ListItem[]>(`/lists/${list}${onlyActive ? '?active=1' : ''}`),
  createListItem: (list: string, data: Partial<ListItem>) =>
    req<ListItem>(`/lists/${list}`, { method: 'POST', body: JSON.stringify(data) }),
  updateListItem: (list: string, id: number, data: Partial<ListItem>) =>
    req<ListItem>(`/lists/${list}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteListItem: (list: string, id: number) =>
    req<void>(`/lists/${list}/${id}`, { method: 'DELETE' }),

  // trips
  getTrips: () => req<Trip[]>(`/trips`),
  getTrip: (id: number) => req<Trip>(`/trips/${id}`),
  createTrip: (data: Partial<Trip> & { addAllPeople?: boolean }) =>
    req<Trip>(`/trips`, { method: 'POST', body: JSON.stringify(data) }),
  updateTrip: (id: number, data: Partial<Trip>) =>
    req<Trip>(`/trips/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTrip: (id: number) => req<void>(`/trips/${id}`, { method: 'DELETE' }),

  // participants
  getParticipants: (tripId: number) => req<Participant[]>(`/trips/${tripId}/participants`),
  addParticipant: (tripId: number, data: { person_id?: number; name?: string }) =>
    req<Participant>(`/trips/${tripId}/participants`, { method: 'POST', body: JSON.stringify(data) }),
  updateParticipant: (id: number, data: Partial<Participant>) =>
    req<Participant>(`/participants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeParticipant: (id: number) => req<void>(`/participants/${id}`, { method: 'DELETE' }),

  // shopping
  getShopping: (tripId: number) => req<ShoppingItem[]>(`/trips/${tripId}/shopping`),
  addShopping: (tripId: number, data: { category: ShopCategory; name: string; quantity?: string }) =>
    req<ShoppingItem>(`/trips/${tripId}/shopping`, { method: 'POST', body: JSON.stringify(data) }),
  updateShopping: (id: number, data: Partial<ShoppingItem>) =>
    req<ShoppingItem>(`/shopping/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteShopping: (id: number) => req<void>(`/shopping/${id}`, { method: 'DELETE' }),
  importShopping: (tripId: number, from_trip_id: number) =>
    req<{ imported: number; skipped: number; items: ShoppingItem[] }>(
      `/trips/${tripId}/shopping/import`,
      { method: 'POST', body: JSON.stringify({ from_trip_id }) },
    ),

  // tally
  getTally: (tripId: number) => req<Tally>(`/trips/${tripId}/tally`),

  // shopping wheel
  getWheel: (tripId: number) => req<Wheel>(`/trips/${tripId}/wheel`),
  getWheelHistory: (tripId: number) => req<DutyRecord[]>(`/trips/${tripId}/wheel/history`),
  pickDuty: (tripId: number, person_id: number) =>
    req<{ id: number }>(`/trips/${tripId}/wheel/pick`, {
      method: 'POST',
      body: JSON.stringify({ person_id }),
    }),
  undoDuty: (id: number) => req<void>(`/wheel/duty/${id}`, { method: 'DELETE' }),

  // activity log
  getLog: (limit = 300) => req<LogEntry[]>(`/log?limit=${limit}`),
  logEvent: (action: string, actor?: string, trip_id?: number) =>
    req<LogEntry>(`/log`, { method: 'POST', body: JSON.stringify({ action, actor, trip_id }) }),
  clearLog: () => req<void>(`/log`, { method: 'DELETE' }),
};

export interface LogEntry {
  id: number;
  at: string;
  actor: string | null;
  method: string;
  path: string | null;
  action: string;
  trip_id: number | null;
}

export interface WheelPerson {
  person_id: number;
  name: string;
}
export interface SafePerson extends WheelPerson {
  chosen_at: string;
  safe_until: string;
}
export interface Wheel {
  eligible: WheelPerson[];
  safe: SafePerson[];
  windowMonths: number;
}
export interface DutyRecord {
  id: number;
  person_id: number;
  name: string;
  chosen_at: string;
  trip_id: number | null;
}
