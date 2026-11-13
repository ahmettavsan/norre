export type Status = 'todo' | 'looking' | 'bought';
export type Delivery = 'pending' | 'shipped' | 'delivered';
export type Priority = 'urgent' | 'normal' | 'later';
export type Payment = 'full' | 'installments';

export interface Item {
  name: string;
  price: number;
  qty: number;
  store: string;
  link: string;
  note: string;
  priority: Priority;
  status: Status;
  /** Empty until the item is marked as bought. */
  delivery: Delivery | '';
  deliveryDate: string;
  /* Payment details, filled in once the item is bought. Optional so older boards still load. */
  /** Purchase date, YYYY-MM-DD. */
  purchaseDate?: string;
  /** Missing means paid in full. */
  payment?: Payment;
  /** Credit card used for the installments, e.g. "Bonus". */
  card?: string;
  installments?: number;
  /** First installment date, YYYY-MM-DD. */
  firstInstallment?: string;
  x: number;
  y: number;
  createdAt: number;
  updatedAt?: number;
  img?: string;
  imgId?: string;
  /** Id of the alternatives stack this card belongs to ('' or missing = none). */
  stack?: string;
  /** Stack order; lower values are closer to the front. */
  so?: number;
}

export interface Group {
  name: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A cut-out of a product photo, placed freely on the board (a mood board "clipping"). */
export interface Clip {
  /** Cut-out image (transparent background), as a data URL. */
  img: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Rotation in degrees, around the center. */
  rot: number;
  /** Mirrored horizontally. */
  flip?: boolean;
  /** Stacking order; higher is on top. */
  z: number;
}

export interface Meta {
  budget: number;
}

/** The persisted board. Record key order is the creation order and matters (same as the original Map). */
export interface Board {
  groups: Record<string, Group>;
  items: Record<string, Item>;
  /** Photo cut-outs. Independent of the cards they were cut from. */
  clips: Record<string, Clip>;
  meta: Meta;
}

export type Filter = 'all' | 'todo' | 'looking' | 'bought' | 'awaiting' | 'delivered';
export type Tool = 'select' | 'hand' | 'item' | 'room';

export interface View {
  x: number;
  y: number;
  k: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
