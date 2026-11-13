import type { Delivery, Filter, Payment, Priority, Status } from './types';

/** Wide enough for the "Alındı" + "Teslim edildi" pills side by side. */
export const CARD_W = 196;
export const CARD_H = 176;
/** Height reserved at the top of a room for its title and summary line. */
export const HEAD = 96;
export const PAD = 20;
export const GAP = 32;
/** Smallest space allowed between two cards that are not alternatives of each other. */
export const MIN_GAP = 16;

export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 2.5;

export const CHIPS = ['#FF4FB8', '#FFC21A', '#16B8E8', '#8A63FF', '#2DBE6C', '#FF7A1A', '#E5484D', '#8E8E93'];

export const STATUS: Record<Status, string> = {
  todo: 'Alınacak',
  looking: 'Bakılıyor',
  bought: 'Alındı',
};
export const DELIV_SHORT: Record<Delivery, string> = {
  pending: 'Bekleniyor',
  shipped: 'Yolda',
  delivered: 'Teslim edildi',
};
export const PAYMENT: Record<Payment, string> = { full: 'Peşin', installments: 'Taksitli' };
export const PRI: Record<Priority, string> = { urgent: 'Öncelikli', normal: 'Normal', later: 'Sonra' };

export const STATUS_ORDER: Status[] = ['todo', 'looking', 'bought'];
export const DELIVERY_ORDER: Delivery[] = ['pending', 'shipped', 'delivered'];

export const FILTER_LABEL: Record<Filter, string> = {
  all: 'Hepsi',
  todo: 'Alınacak',
  looking: 'Bakılıyor',
  bought: 'Alındı',
  awaiting: 'Teslimat bekleyen',
  delivered: 'Teslim edildi',
};

/** Offsets of the cards peeking out behind the front card of a stack. */
export const STACK_OFFSETS = [0, 24, 40];
