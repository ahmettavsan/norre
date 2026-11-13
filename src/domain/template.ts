import { createGroup, createItem } from './board';
import { CARD_H, CARD_W, GAP, HEAD, PAD } from './constants';
import type { Board, Item } from './types';

/*
 * Sample board shown by "Örnek odalarla başla" (and used to generate public/seed-board.js).
 * Products, prices and photos were taken from ikea.com.tr on 13 November 2026; they are mock data.
 */

const photos = import.meta.glob<string>('../assets/ikea/*.jpg', {
  query: '?inline',
  import: 'default',
  eager: true,
});
const photo = (sku: string) => photos[`../assets/ikea/${sku}.jpg`];
const link = (slug: string) => `https://www.ikea.com.tr/urun/${slug}`;

type SampleFields = Pick<Item, 'name' | 'note' | 'price' | 'status'> &
  Partial<
    Pick<
      Item,
      | 'qty'
      | 'priority'
      | 'delivery'
      | 'deliveryDate'
      | 'purchaseDate'
      | 'payment'
      | 'card'
      | 'installments'
      | 'firstInstallment'
    >
  >;

interface SampleItem extends SampleFields {
  sku: string;
  slug: string;
  /** Another option for the same need, stacked behind this card. */
  alt?: SampleItem;
}

const ROOMS: { name: string; color: string; items: SampleItem[] }[] = [
  {
    name: 'Salon',
    color: '#FF4FB8',
    items: [
      {
        sku: '49440597',
        slug: 'kivik-tibbleby-bej-gri-3-lu-kanepe-49440597',
        name: "KIVIK 3'lü kanepe",
        note: 'tibbleby bej-gri',
        price: 27999,
        status: 'looking',
        priority: 'urgent',
        alt: {
          sku: '39509040',
          slug: 'ektorp-kilanda-acik-bej-uzanma-koltuklu-3-lu-kanepe-39509040',
          name: "EKTORP 3'lü kanepe",
          note: 'Uzanma koltuklu, kilanda açık bej',
          price: 36999,
          status: 'looking',
          priority: 'urgent',
        },
      },
      {
        sku: '89299539',
        slug: 'hemnes-beyaz-vernik-245x197-cm-tv-unitesi-89299539',
        name: 'HEMNES TV ünitesi',
        note: 'Beyaz vernik, 245x197 cm',
        price: 45997,
        status: 'bought',
        delivery: 'shipped',
        deliveryDate: '2026-11-20',
        purchaseDate: '2026-11-02',
        payment: 'installments',
        card: 'Bonus',
        installments: 9,
        firstInstallment: '2026-12-02',
      },
      {
        sku: '90449905',
        slug: 'lack-beyaz-90x55-cm-orta-sehpa-90449905',
        name: 'LACK orta sehpa',
        note: 'Beyaz, 90x55 cm',
        price: 1299,
        status: 'todo',
        priority: 'later',
      },
      {
        sku: '30426836',
        slug: 'stoense-orta-gri-200x300-cm-buyuk-hali-30426836',
        name: 'STOENSE halı',
        note: 'Orta gri, 200x300 cm',
        price: 6999,
        status: 'todo',
      },
      {
        sku: '40629310',
        slug: 'matilda-beyaz-145x300-cm-tul-perde-2-kanat-40629310',
        name: 'MATILDA tül perde',
        note: 'Beyaz, 145x300 cm, 2 kanat',
        price: 1299,
        qty: 2,
        status: 'bought',
        delivery: 'delivered',
        purchaseDate: '2026-10-25',
        payment: 'full',
      },
      {
        sku: '29502039',
        slug: 'poang-gunnared-bej-hus-sallanan-koltuk-29502039',
        name: 'POÄNG sallanan koltuk',
        note: 'gunnared bej, huş',
        price: 11199,
        status: 'bought',
        delivery: 'delivered',
        purchaseDate: '2026-10-25',
        payment: 'installments',
        card: 'World',
        installments: 3,
        firstInstallment: '2026-11-25',
      },
      {
        sku: '20393600',
        slug: 'hektar-koyu-gri-yer-ve-okuma-lambasi-20393600',
        name: 'HEKTAR yer lambası',
        note: 'Koyu gri, okuma lambalı',
        price: 9999,
        status: 'todo',
        priority: 'later',
      },
    ],
  },
  {
    name: 'Yatak odası',
    color: '#8A63FF',
    items: [
      {
        sku: '09536832',
        slug: 'malm-luroy-vesteroy-agartilmis-mese-kaplama-160x200-cm-cift-kisilik-yatakli-karyola-09536832',
        name: 'MALM karyola',
        note: 'Ağartılmış meşe, 160x200 cm, LURÖY baza ve VESTERÖY yatakla',
        price: 30298,
        status: 'bought',
        delivery: 'delivered',
        priority: 'urgent',
        purchaseDate: '2026-10-18',
        payment: 'installments',
        card: 'Bonus',
        installments: 12,
        firstInstallment: '2026-11-18',
      },
      {
        sku: '40407922',
        slug: 'brimnes-beyaz-117x190-cm-gardirop-40407922',
        name: 'BRIMNES gardırop',
        note: 'Beyaz, 117x190 cm',
        price: 10999,
        status: 'looking',
        priority: 'urgent',
      },
      {
        sku: '80242627',
        slug: 'hemnes-beyaz-vernik-54x66-cm-komodin-80242627',
        name: 'HEMNES komodin',
        note: 'Beyaz vernik, 54x66 cm',
        price: 7299,
        qty: 2,
        status: 'todo',
      },
      {
        sku: '70608900',
        slug: 'angslilja-beyaz-240x220-50x60-cm-cift-kisilik-nevresim-seti-70608900',
        name: 'ÄNGSLILJA nevresim',
        note: 'Beyaz, çift kişilik nevresim seti, 240x220 cm',
        price: 2299,
        qty: 2,
        status: 'bought',
        delivery: 'delivered',
        purchaseDate: '2026-10-25',
        payment: 'full',
      },
      {
        sku: '40460368',
        slug: 'lapptatel-beyaz-50x60-cm-yogun-dolgulu-yastik-40460368',
        name: 'LAPPTÅTEL yastık',
        note: 'Beyaz, 50x60 cm, yoğun dolgulu',
        price: 319,
        qty: 4,
        status: 'todo',
      },
    ],
  },
  {
    name: 'Mutfak',
    color: '#FFC21A',
    items: [
      {
        sku: '40416498',
        slug: 'lisabo-disbudak-kaplama-4-kisilik-yuvarlak-mutfak-masasi-40416498',
        name: 'LISABO yemek masası',
        note: 'Dişbudak kaplama, yuvarlak, 4 kişilik',
        price: 12499,
        status: 'bought',
        delivery: 'pending',
        deliveryDate: '2026-11-24',
        priority: 'urgent',
        purchaseDate: '2026-11-08',
        payment: 'full',
      },
      {
        sku: '90350937',
        slug: 'teodores-beyaz-plastik-sandalye-90350937',
        name: 'TEODORES sandalye',
        note: 'Beyaz, plastik',
        price: 2399,
        qty: 4,
        status: 'looking',
        alt: {
          sku: '90339233',
          slug: 'stefan-beyaz-ahsap-sandalye-90339233',
          name: 'STEFAN sandalye',
          note: 'Beyaz, ahşap',
          price: 2599,
          qty: 4,
          status: 'todo',
        },
      },
      {
        sku: '60484250',
        slug: 'ikea-365--paslanmaz-celik-5-lt-celik-tencere-60484250',
        name: 'IKEA 365+ tencere',
        note: 'Paslanmaz çelik, 5 lt',
        price: 1499,
        status: 'looking',
      },
      {
        sku: '70014999',
        slug: 'fornuft-paslanmaz-celik-6-kisilik-catal-bicak-takimi-70014999',
        name: 'FÖRNUFT çatal bıçak',
        note: 'Paslanmaz çelik, 6 kişilik takım',
        price: 999,
        status: 'todo',
        priority: 'later',
      },
      {
        sku: '70277354',
        slug: 'vardera-beyaz-yemek-takimi-70277354',
        name: 'VÄRDERA yemek seti',
        note: 'Beyaz yemek takımı',
        price: 2999,
        status: 'todo',
      },
    ],
  },
  {
    name: 'Banyo',
    color: '#16B8E8',
    items: [
      {
        sku: '49546834',
        slug: 'hemnes-rutsjon-beyaz-62x49x95-cm-lavabo-dolabi-kombinasyonu-49546834',
        name: 'HEMNES lavabo dolabı',
        note: 'Beyaz, RUTSJÖN lavabo ile, 62x49x95 cm',
        price: 24998,
        status: 'bought',
        delivery: 'shipped',
        deliveryDate: '2026-11-18',
        priority: 'urgent',
        purchaseDate: '2026-11-05',
        payment: 'installments',
        card: 'Maximum',
        installments: 6,
        firstInstallment: '2026-12-05',
      },
      {
        sku: '60609132',
        slug: 'vagsjon-beyaz-70x140-cm-banyo-havlusu-60609132',
        name: 'VÅGSJÖN havlu',
        note: 'Beyaz banyo havlusu, 70x140 cm',
        price: 399,
        qty: 4,
        status: 'todo',
      },
      {
        sku: '80611855',
        slug: 'toftbo-gri-beyaz-40x60-cm-banyo-paspasi-80611855',
        name: 'TOFTBO banyo paspası',
        note: 'Gri-beyaz, 40x60 cm',
        price: 349,
        status: 'todo',
      },
      {
        sku: '30553607',
        slug: 'jall-beyaz-50-lt-camasir-sepeti-30553607',
        name: 'JÄLL çamaşır sepeti',
        note: 'Beyaz, 50 lt',
        price: 279,
        status: 'todo',
        priority: 'later',
      },
    ],
  },
];

const toItem = ({ sku, slug, alt, ...fields }: SampleItem): Partial<Item> => ({
  ...fields,
  store: 'IKEA',
  link: link(slug),
  img: photo(sku),
});

/** Fills the board with the sample rooms shown on the empty-state screen. */
export function buildTemplate(board: Board): void {
  const W = PAD * 2 + CARD_W * 3 + GAP * 2;
  const colY = [0, 0];
  for (const { name, color, items } of ROOMS) {
    const col = colY[0] <= colY[1] ? 0 : 1;
    const rows = Math.ceil(items.length / 3);
    const h = HEAD + PAD * 2 + rows * CARD_H + (rows - 1) * GAP;
    const gx = col * (W + 110);
    const gy = colY[col];
    createGroup(board, gx, gy, W, h, name, color);
    items.forEach((sample, j) => {
      const ix = gx + PAD + (j % 3) * (CARD_W + GAP);
      const iy = gy + HEAD + PAD + Math.floor(j / 3) * (CARD_H + GAP);
      const fid = createItem(board, ix, iy, { ...toItem(sample), ...(sample.alt ? { so: 0 } : {}) });
      if (sample.alt) {
        board.items[fid].stack = fid;
        createItem(board, ix, iy, { ...toItem(sample.alt), stack: fid, so: 1 });
      }
    });
    colY[col] += h + 90;
  }
}
