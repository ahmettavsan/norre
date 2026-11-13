# norre – Ev eşyası panosu

Yeni eve taşınırken ya da evlenirken alınacak eşyaları oda oda planlamak için Freeform tarzı bir pano. Odaları çerçeve olarak çizer, eşyaları kart olarak içine bırakırsın; neyin alındığını, neyin yolda olduğunu ve ne kadar harcadığını tek bakışta görürsün.

Herkes Google ya da e-posta/şifreyle giriş yapıp kendi panosunu kullanır. React + TypeScript + Vite ile yazılmıştır; hesaplar ve veriler Supabase'te durur.

## Çalıştırma

Node.js 20 veya üstü gerekir.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Komut             | Ne yapar                                          |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Geliştirme sunucusu                               |
| `npm run build`   | Tip kontrolü + `dist/` klasörüne production build |
| `npm run preview` | Build çıktısını yerelde açar                      |
| `npm test`        | Birim testleri (Vitest)                           |
| `npm run lint`    | ESLint                                            |
| `npm run format`  | Prettier                                          |

## Klasör yapısı

```
src/
  domain/      Saf iş mantığı: tipler, geometri, alternatif yığınları, istatistik, düzenleme, örnek pano (+ testler)
  assets/ikea/ Örnek panodaki ürün fotoğrafları
  auth/        Giriş, kayıt ve şifre yenileme ekranları
  store/       Uygulama durumu (Zustand + Immer), kullanıcı işlemleri, yakınlaştırma/kaydırma,
               oturum ve kaydetme (session.ts), Supabase okuma/yazma (cloud.ts)
  canvas/      Sonsuz pano: odalar, kartlar, sürükle/bırak/pinch hareketleri
  components/  Üst çubuk, filtre paneli, alt bilgi çubuğu, boş ekran, bildirim, sağ panel (drawer)
  hooks/       Klavye kısayolları, yapıştırma, ortak türetilmiş veriler
  styles/      Global CSS (tasarımın kendisi)
supabase/
  schema.sql       Veritabanı tabloları ve erişim kuralları
legacy/
  index.html       Uygulamanın tek dosyalık ilk (React öncesi) sürümü, referans için
  pano-verisi.js   Önceki başlangıç verisi (13 Kasım 2026 kopyası)
```

Pano verisi yalnızca `store/appStore.ts` içindeki `updateBoard` üzerinden değişir; her değişiklik bir saniye içinde kullanıcının hesabına kaydedilir.

## Veriler nerede duruyor?

Hesaplar Supabase Auth'ta, panolar Supabase veritabanında durur (`supabase/schema.sql`):

- `boards`: kullanıcı başına bir satır, panonun tamamı JSON olarak.
- `photos`: eşya fotoğrafları ve küpürler, her biri bir kez. Pano onlara `photo:<anahtar>` diye başvurur.
- Satır güvenliği (RLS) kuralları sayesinde herkes yalnızca kendi panosunu ve fotoğraflarını okuyup yazabilir.

Üst çubuktaki noktanın rengi kaydı gösterir: yeşil kaydedildi, gri kaydediliyor, kırmızı kaydedilemedi (birkaç saniye sonra yeniden denenir).

Hesaplardan önce bu tarayıcıda tutulan bir pano varsa, ilk girişte hesaba aktarılır.

## Supabase kurulumu

Proje adresi ve yayınlanabilir (publishable) anahtar `.env` dosyasındadır; ikisi de tarayıcıya giden herkese açık değerlerdir. `service_role` / secret anahtarı asla bu dosyaya ya da repoya girmemelidir.

1. Supabase panelinde **SQL Editor → New query** aç, `supabase/schema.sql` dosyasının içeriğini yapıştırıp çalıştır.
2. **Authentication → URL Configuration**: Site URL `https://ahmettavsan.github.io/norre/`; Redirect URLs'e `https://ahmettavsan.github.io/norre/**` ve `http://localhost:5173/**` ekle.
3. Google ile giriş için Google Cloud Console'da bir OAuth istemcisi oluşturup **Authentication → Providers → Google**'a gir.

## Örnek pano (IKEA)

Örnek veriler ikea.com.tr'den alınmış gerçek ürünlerdir (ad, fiyat, ürün linki ve fotoğraf; 13 Kasım 2026 fiyatlarıyla). Ödeme, teslimat ve taksit bilgileri uydurmadır. Boş panodaki **Örnek odalarla başla** butonuyla yüklenir; ürünleri değiştirmek için `src/domain/template.ts` dosyasını düzenle.

## İnternette yayınlama (GitHub Pages)

`main` dalına her push'ta `.github/workflows/deploy.yml` testleri çalıştırır, uygulamayı derler ve `dist/` klasörünü `gh-pages` dalına koyar. Site https://ahmettavsan.github.io/norre/ adresinde yayınlanır. Build göreli yollarla üretildiği için bu alt yolda sorunsuz çalışır.

## Gizlilik ve telif notu

- `legacy/pano-verisi.js` önceki panonun kopyasıdır. Repo'yu herkese açık yapacaksan bu dosyayı kaldır.
- Örnek panodaki ürün fotoğrafları ve adları IKEA'ya aittir; yerel kullanım ve deneme için eklendi. Uygulamayı herkese açık yayınlayacaksan bu görselleri kendi görsellerinle değiştir ya da örnek veriyi kaldır.

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
