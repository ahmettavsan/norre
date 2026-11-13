/**
 * Writes the IKEA sample board (src/domain/template.ts) to public/seed-board.js, the board the app
 * starts with when this browser has none saved.
 *
 * Run with: npm run sample
 */
import { writeFileSync } from 'node:fs';
import { produce } from 'immer';
import { emptyBoard } from '../src/domain/board';
import { buildTemplate } from '../src/domain/template';

const board = produce(emptyBoard(), buildTemplate);
const today = new Date().toISOString().slice(0, 10);
const file = { app: 'norre', version: 1, exportedAt: today, ...board };

writeFileSync(
  'public/seed-board.js',
  `/* norre – IKEA ürünleriyle örnek pano (mock veri, ${today}).
   Uygulama ilk açılışta (tarayıcıda kayıtlı pano yoksa) bu verilerle başlar.
   Yeniden üretmek için: npm run sample. Boş bir panoyla başlamak istersen bu dosyayı silebilirsin. */
window.NORRE_SEED = ${JSON.stringify(file)};
`,
);

console.log(
  `${Object.keys(board.groups).length} oda, ${Object.keys(board.items).length} eşya → public/seed-board.js`,
);
