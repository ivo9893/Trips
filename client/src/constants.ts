import type { Attending, DrinkCategory, GearCategory, ShopCategory, ShopStatus } from './api';

export const ATTENDING_LABEL: Record<Attending, string> = {
  yes: 'Да',
  no: 'Не',
  unknown: 'Без отговор',
};

export const DRINK_CATEGORY_LABEL: Record<DrinkCategory, string> = {
  alcohol: 'Алкохол',
  carbonated: 'Газирано',
  noncarbonated: 'Негазирано',
};

export const GEAR_CATEGORY_LABEL: Record<GearCategory, string> = {
  mandatory: 'Задължително',
  recommended: 'Препоръчително',
  optional: 'Допълнително',
};

export const SHOP_CATEGORY_LABEL: Record<ShopCategory, string> = {
  fruit_veg: 'Плодове / Зеленчуци',
  other_food: 'Друго хранително',
  consumables: 'Консумативи',
};

export const SHOP_STATUS_LABEL: Record<ShopStatus, string> = {
  active: 'Активно',
  taken: 'Взето',
  discuss: 'Да се обсъди',
};

export const MEAT_SLOT_LABEL = {
  night1: 'Месо 1-ва нощ',
  night2: 'Месо 2-ра нощ',
  other: 'Друго месо',
} as const;
