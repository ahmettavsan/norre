# norre – Ev eşyası panosu

Yeni eve taşınırken ya da evlenirken alınacak eşyaları oda oda planlamak için Freeform tarzı bir pano. Odaları çerçeve olarak çizer, eşyaları kart olarak içine bırakırsın; neyin alındığını, neyin yolda olduğunu ve ne kadar harcadığını tek bakışta görürsün.

React + TypeScript + Vite ile yazılmıştır.

## Çalıştırma

Node.js 20 veya üstü gerekir.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Komut             | Ne yapar                                                           |
| ----------------- | ------------------------------------------------------------------ |
| `npm run dev`     | Geliştirme sunucusu                                                |
| `npm run build`   | Tip kontrolü + `dist/` klasörüne production build                  |
| `npm run preview` | Build çıktısını yerelde açar                                       |
| `npm test`        | Birim testleri (Vitest)                                            |
| `npm run lint`    | ESLint                                                             |
| `npm run format`  | Prettier                                                           |
| `npm run sample`  | IKEA örnek panosunu `public/seed-board.js` dosyasına yeniden yazar |

## Klasör yapısı

```
src/
  domain/      Saf iş mantığı: tipler, geometri, alternatif yığınları, istatistik, düzenleme, örnek pano (+ testler)
  assets/ikea/ Örnek panodaki ürün fotoğrafları
  store/       Uygulama durumu (Zustand + Immer), kullanıcı işlemleri, yakınlaştırma/kaydırma, kalıcılık
  canvas/      Sonsuz pano: odalar, kartlar, sürükle/bırak/pinch hareketleri
  components/  Üst çubuk, filtre paneli, alt bilgi çubuğu, boş ekran, bildirim, sağ panel (drawer)
  hooks/       Klavye kısayolları, yapıştırma, ortak türetilmiş veriler
  styles/      Global CSS (tasarımın kendisi)
scripts/
  build-sample-board.ts  Örnek panoyu dosyaya yazar (npm run sample)
public/
  seed-board.js    Başlangıç verisi: IKEA ürünleriyle örnek pano (isteğe bağlı)
legacy/
  index.html       Uygulamanın tek dosyalık ilk (React öncesi) sürümü, referans için
  pano-verisi.js   Önceki başlangıç verisi (13 Kasım 2026 kopyası)
```

Pano verisi yalnızca `store/appStore.ts` içindeki `updateBoard` üzerinden değişir; tarayıcıya kaydetme `store/persistence.ts` içinde toplanmıştır.

## Veriler nerede duruyor?

Pano, tarayıcının kendi deposunda (localStorage, `norre-board-v1` anahtarı) saklanır. Yani:

- Aynı tarayıcıda sayfayı kapatıp açınca her şey yerinde durur.
- Başka bir tarayıcıda ya da bilgisayarda pano boş görünür.
- Tarayıcıda kayıtlı pano yoksa `public/seed-board.js` ile başlar. Bu dosyayı silersen uygulama boş panoyla açılır.

## Örnek pano (IKEA)

Örnek veriler ikea.com.tr'den alınmış gerçek ürünlerdir (ad, fiyat, ürün linki ve fotoğraf; 13 Kasım 2026 fiyatlarıyla). Ödeme, teslimat ve taksit bilgileri uydurmadır. İki yerde kullanılır:

- Boş panodaki **Örnek odalarla başla** butonu
- `public/seed-board.js` (tarayıcıda kayıtlı pano yoksa açılışta yüklenir)

Ürünleri değiştirmek için `src/domain/template.ts` dosyasını düzenleyip `npm run sample` çalıştır.

## İnternette yayınlama (GitHub Pages)

`main` dalına her push'ta `.github/workflows/deploy.yml` testleri çalıştırır, uygulamayı derler ve `dist/` klasörünü `gh-pages` dalına koyar. Site https://ahmettavsan.github.io/norre/ adresinde yayınlanır. Build göreli yollarla üretildiği için bu alt yolda sorunsuz çalışır.

## Gizlilik ve telif notu

- `legacy/pano-verisi.js` önceki panonun kopyasıdır. Repo'yu herkese açık yapacaksan bu dosyayı kaldır.
- Örnek panodaki ürün fotoğrafları ve adları IKEA'ya aittir; yerel kullanım ve deneme için eklendi. Uygulamayı herkese açık yayınlayacaksan bu görselleri kendi görsellerinle değiştir ya da örnek veriyi kaldır.

## Eşinle ortak kullanım

Bu sürümde her tarayıcı kendi panosunu tutar; iki kişi aynı panoyu canlı olarak düzenleyemez. Ortak pano için uygulamaya Firebase ya da Supabase gibi bir arka uç bağlanabilir. Okuma/yazma `src/store/persistence.ts` içinde toplandığı için değişiklik tek bir yere yapılır.

## Kısayollar

| Tuş                                             | İşlev                                                           |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `V`                                             | Seç ve taşı                                                     |
| `H`                                             | Kaydır                                                          |
| `Boşluk` (basılı)                               | Geçici olarak kaydır                                            |
| `N`                                             | Eşya ekle                                                       |
| `R`                                             | Oda çiz                                                         |
| `Shift + 1`                                     | Tümünü göster                                                   |
| `+` / `-`                                       | Yakınlaştır / uzaklaştır                                        |
| `⌘ / Ctrl + X`, sağ tık ya da çift tık (kartta) | Eşyanın fotoğrafını küpür olarak kes; tıkladığın yere bırakılır |
| `Delete`                                        | Seçili eşyayı ya da küpürü sil                                  |
| `Esc`                                           | Seçimi bırak, küpür bırakmaktan vazgeç                          |
