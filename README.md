# Ne Oynasam? — PC oyun keşfi

Ruh haline ve tercihlerine göre oyun bulmanı sağlayan Türkçe oyun keşif sitesi. Oyunları karşılaştırabilir, kendi koleksiyonuna ekleyebilir, durumlarını ve notlarını kaydedebilirsin.

[Canlı site](https://ne-oynasam-samet.sameteskibag-se.chatgpt.site) · [İş listesi](ROADMAP.md)

## Katalog

- Yayımlanmış, benzersiz 1.323 Windows/PC oyunu. Katalog oluşturulurken DLC, paket ve henüz çıkmamış kayıtlar elenir. Önceden doğrulanmış oyunların kalıcı kimlikleri korunur.
- 1.323 oyunun yayıncıya ait gerçek kapak görseli bağlantısı. İlk aktarımda 905 görselin yanıtı ayrıca doğrulanmıştır. Diğer bağlantılar mağaza kayıtlarından alınmıştır. Kapak yüklenemezse aynı oyunun alternatif mağaza görseli denenir; o da yüklenemezse görselin bulunamadığı belirtilir.
- Kaynakta oyun kimliğiyle eşleştirilmiş 901 Metacritic kullanıcı puanı korunur. Bunların 20'sinin PC platformu doğrulanmıştır ve sitede yalnızca bu puanlar gösterilir; platformu belirtilmeyen 881 kayıt PC puanı sayılmaz. Bu puanlar eleştirmen puanlarından, mağazadaki olumlu değerlendirme yüzdesinden ve kullanıcının kendi puanından ayrı tutulur. CS2/CS:GO ve yeniden düzenlenmiş sürüm gibi yanlış eşleşmeler kabul edilmez. Puanı olmayan 422 kayıt ile platformu doğrulanmamış 881 kayıt [iş listesinde](ROADMAP.md) ayrıca incelenir; bulunamayan puanlar üretilmez.
- Gerektiğinde ikincil kaynak bilgisiyle birlikte 1.216 geliştirici kaydı.
- Güncel kapağı bulunmayan üç eski kayıt kişisel koleksiyonlarda erişilebilir kalır; katalog sayısına eklenmez. Disco Elysium'un The Final Cut sürümüne taşınması dahil, kişisel listelerde kullanılan oyun kimlikleri korunur.

## Özellikler

- Oyun arama; ruh hali, tür, PC işletim sistemi, çıkış dönemi, Türkçe arayüz ve birlikte oynama filtreleri.
- Yalnızca doğrulanmış PC Metacritic kullanıcı puanına göre eşik ve sıralama; mağazadaki olumlu değerlendirmelere göre ayrı sıralama. Doğrulanmış puanı olmayan kayıtlar boş bırakılır.
- Üç oyunu karşılaştırma. Puanın kaynağı, tarihi, platformu, PC işletim sistemleri, dil ve birlikte oynama bilgileri ayrı gösterilir.
- Gerçek kapaklar, ihtiyaca göre görsel yükleme, farklı ekranlara uyumlu kartlar, krem/yeşil tasarım, karanlık mod, sayfalama ve doğrudan oyun bağlantıları.
- Ayrıntılı oyun etiketlerine göre 20 benzer oyun; video ve ekran görüntüsü galerisi; günlük öne çıkan keşif oyunları.
- ChatGPT ile giriş; D1 veritabanında kişisel oyunlar, durumlar, notlar, puanlar ve adlandırılmış koleksiyonlar.
- Ayrı keşfet (`/`) ve koleksiyon (`/koleksiyonum`) sayfaları. Giriş sonrası koleksiyon sayfasına dönülür. Eski `/?tab=library` bağlantıları oyun ve koleksiyon parametreleri korunarak yönlendirilir.
- JSON ile dışa ve içe aktarma. Kayıtlar kullanıcı yetkisi kontrol edilerek gruplar halinde işlenir. Aynı adla mevcut koleksiyon varsa tekrar kullanılır; tekrar aktarım kayıtları çoğaltmaz.
- Seçili sayfadaki kaynak bilgilerinin dörderli gruplarla yenilenmesi. Başarısız kayıtların mevcut verisi korunur; tarihsel Metacritic puanı bu işlemle değiştirilmez.
- Wikidata üzerinden yalnızca PC oyunlarının aranması ve eklenmesi. Kaynak oyun kimliği aynı oyunun tekrar eklenmesini önler.
- Gerçek oyun ayrıntısı görüntüleme sayıları. Aynı hesap/oyun/UTC günü için tekrarlar tek sayılır.

## Geliştirme planı

Site yalnızca PC oyunlarının keşfine odaklanır. İş planının 1. adımı tamamlandı: diğer platform filtresi kaldırıldı, hızlı öneri formu Windows/macOS/Linux seçimine taşındı. Kartlar, puan eşikleri/sıralama, karşılaştırma, PC mağaza bağlantıları ve benzer oyunlar aynı odağı kullanır. Diğer platformlar yalnızca oyun ayrıntısında yardımcı bilgi olarak kalır. Eski platform parametreli bağlantılar kalan filtreleri koruyarak çalışır. Konsol ve mobil katalogları genişletme hedefi iş planından çıkarılmıştır. Sitenin mobil uygulaması aynı PC kataloğuna erişim sağlayacak ve en son aşama olarak kalacaktır.

İşler bağımlılık sırasıyla yürütülecektir: PC kapsamından sonra kalıcı veri/sunucu sorgusu altyapısı, ardından eksik Metacritic kullanıcı puanları ve arayüz geliştirmeleri. Gündem taraması, kademeli katalog büyümesi ve yeni oyun aktarımı [iş listesinde](ROADMAP.md) planlanmıştır; zamanlanmış görevler henüz kurulmamıştır.

Oyun kartlarında kısa video önizlemesi de planlanmıştır: kısa beklemeden sonra sessiz oynatma, karttan ayrılınca durdurma, yalnızca ihtiyaç halinde medya yükleme ve kullanıcıya kapatma seçeneği. Bu özellik henüz uygulanmamıştır.

Uzun vadeli hedef, kaynak kapsamı ve doğrulamalar elverirse 140 bin benzersiz PC oyunudur. Önerilen büyüme basamakları 5 bin, 10 bin, 25 bin, 50 bin, 100 bin ve mümkünse 140 bindir; her basamağa küçük, devam ettirilebilir aktarım gruplarıyla ulaşılır. İlk katalog doldurma ile haftalık delta aktarımı ayrı süreçlerdir. Bu bir hedef olup mevcut kapasite veya ulaşılabilir oyun sayısı garantisi değildir.

Yönetici denetimi ve ortak aktarım/delta akışı, büyük katalog doldurulmadan önce hazırlanacaktır. Gündem sinyalleri ve ziyaret geçmişi, son kişisel keşif sıralamasından önce kurulacaktır. İlk katalog büyüme basamağı doğrulanınca sonraki geliştirmelere geçilir; 140 bin hedefi yayın veya diğer işleri bekleten koşul değildir. Her adımda mevcut kimlikler, koleksiyonlar ve API sözleşmeleri korunur; ilgili geriye dönük davranışlar ve veri geçişinin geri dönüşü kontrol edilir. Bu sıralama değişikliği geliştirme veya aktarım başlatmaz.

Gelecekteki oyun ekleme görevleri delta mantığıyla çalışmalıdır: son başarılı taramadan itibaren yeni ve değişmiş adaylar alınır, kaynak kimlikleri indeksli sorgularla karşılaştırılır, yalnızca gerekli kayıtlar işlenir. Büyük kataloğun tamamını her çalışmada indirmek veya modele okutmak hedeflenen yöntem değildir. Mevcut uygulama 100 bin oyun ölçeği için henüz uyarlanmış değildir; veritabanından sayfalama ve katalog aktarımının yeniden düzenlenmesi gerekir.

GitHub proje açıklamaları, yeni commit mesajları, iş kayıtları ve değişiklik notları Türkçe yazılır. API adları, teknik kimlikler, komutlar ve üçüncü tarafların özgün lisans metinleri korunur.

## Veri kaynakları, tarihler ve kullanım hakları

[PC kaynakları](data/PC-SOURCES.md), [ilk Wikidata verisinin kökeni](data/PROVENANCE.md), [PC aktarım raporu](data/PC-IMPORT-REPORT.json) ve [Metacritic kaynakları](data/METACRITIC-SOURCES.md) veri kökenini ve kapsamını açıklar.

Kapak görselleri oyun yayıncılarına ve diğer hak sahiplerine aittir; Steam CDN üzerinden yüklenir. Wikidata'nın CC0 kapsamına girmezler. Mağaza açıklamaları, değerlendirme metinleri veya üçüncü taraf kapak dosyaları depoya kopyalanmaz. Valve, Steam veya Metacritic ile resmî bir bağlantı iddia edilmez.

Metacritic kullanıcı puanları tarihsel veri kayıtlarıdır; tamamı güncel olarak doğrulanmış canlı puanlar değildir. GPL-3.0 kapsamındaki ikincil veri kümesi, her puanın platformunu veya ölçüm tarihini tek başına belirlemez. 4 Ekim 2026 veri kopyası tarihi, puanın doğrulandığı tarih olarak sunulmaz. Açıkça PC platformuna ait Wikidata değerlendirme kayıtlarının gerçek tarihleri korunur. Bilinmeyen veya yanlış eşleşen kullanıcı puanlarının yerine eleştirmen puanı, olumlu değerlendirme yüzdesi ya da uydurma değer konmaz.

Herkese açık veri alt kümeleri, lisans metni ve ilgili kaynak kodu sitedeki kaynak bilgisi alanından indirilebilir. Kaynak veri lisansı, alttaki tüm içeriklerin kullanım haklarını tek başına belirlemez.

Reklam hesabı, ücretli abonelik, özel alan adı veya düzenli çalışan görev yapılandırılmamıştır.

## Çalışma ortamı

Sites/Vinext derleme entegrasyonu, Cloudflare Worker ve `DB` adlı D1 bağlantısı kullanılır. `drizzle/` altındaki mevcut veritabanı geçiş dosyaları korunur. Yenilenen ortak kayıtlar `source_games` tablosunda tutulur; katalog aktarımı kullanıcıya ait tabloları değiştirmez.

Aktarım betikleri `scripts/` klasöründedir. `data/wikidata-seed.json` ilk kimlik eşleştirme verisini içerir. `data/catalog.json`, `data/legacy-catalog.json` ve ayrı lisans kapsamındaki `data/metacritic-users.json` derleme girdileridir.

Bu GitHub deposu kaynak kodunu, şemayı, katalog veri kopyalarını ve değişiklik geçmişini içerir. Canlı D1 veritabanının veya kişisel koleksiyonların yedeği değildir. Veritabanı yedekleme ayrıca tasarlanmalıdır.

## Doğrulama

- `node tests/pc-scope.test.mjs`: Eski platform bağlantıları, PC işletim sistemi formu/filtreleri, yalnızca PC puanı, karşılaştırma, doğru PC mağaza bağlantısı, yardımcı platform bilgisi, benzer oyun kapsamı ve gerçek katalog işleyicisi.

- `node tests/data.test.mjs`: En az 1.000 benzersiz PC/Windows oyunu, kapak kaynakları, eski kimliklerin korunması ve puan kimliği/platform/tarih kuralları.
- `node tests/security.test.mjs`: Alan doğrulama, istek kaynağı kontrolü ve güvenli olmayan URL'lerin reddedilmesi.
- `node tests/source.test.mjs`: Çok dilli Wikidata adları, oyun doğrulama ve URL işlemleri.
- `node tests/api.test.mjs`: Gerçek SQLite ve uygulama işleyicileriyle kayıt işlemleri, kullanıcı verisi ayrımı, liste sahipliği, görüntüleme tekrarları ve gruplu aktarım. Giriş kimliği testte taklit edilir.
- `node tests/frontend.test.cjs`: DOM modeliyle katalog yükleme, PC/puan/Türkçe filtreleri, sayfa atlama, görseller, güvenli metin gösterimi, koleksiyon kayıtları, notlar ve karşılaştırma.
- `node tests/collection-page.test.mjs`: Sayfa işleyicileri, ayrı koleksiyon sayfası, gezinme, doğrudan bağlantılar, giriş yapılmamış durum ve eski bağlantı yönlendirmeleri.
- `node node_modules/typescript/bin/tsc --noEmit`: TypeScript kontrolü. Yayın öncesi Sites derleme yardımcısı da çalıştırılır.

Önceki doğrulamalarda tarayıcı üzerinden görsel/mobil kontrol ve gerçek giriş denemesi yapılamamıştır. Taklit kimlikle çalışan testler, gerçek tarayıcı girişini doğrulamaz. `/api/health` canlı D1 bağlantısını; `?source=steam` gerçek mağaza bilgisi çağrısını; `?source=1` kişisel verilere yazmadan Wikidata çağrısını kontrol eder.
