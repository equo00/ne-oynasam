# Katalog veri altyapısı

Bu belge, iş planının ikinci adımının API ve veri taşıma sözleşmesini açıklar. Yeni oyun taraması, eksik puan tamamlama, yönetici paneli ve zamanlanmış görevler sonraki adımlardır.

## Kalıcı kimlik ve kaynaklar

Oyunun mevcut `id` değeri kalıcıdır. Ad değişikliği yeni oyun oluşturmaz; koleksiyonlar, notlar, kişisel puanlar ve doğrudan bağlantılar aynı ID'yi kullanır. Kaynak kimlikleri kaynak adı ve dış ID ile benzersiz eşleştirilir. Steam App ID, Wikidata QID ve Metacritic kayıt kimlikleri metin benzerliğiyle otomatik birleştirilmez. Sürüm kimliği ayrı tutulur; yeniden düzenlenmiş sürümler birleştirilmez.

Katalog için eklenen tablolar eski kullanıcı tablolarından ayrıdır. Türler, ayrıntılı etiketler, PC işletim sistemleri ve kaynak ilişkileri ayrı indekslenir. Sunucu sorgularında sayısal puan, yayın yılı, ruh hali ve sıralama alanları JSON içinden bütün katalog okunarak çıkarılmaz.

Mevcut 901 Metacritic kullanıcı puanı korunur. Platformu bilinmeyen 881 kayıt görünmeye devam eder ve PC olarak etiketlenmez. Bilinmeyen puan/değerlendirme sayısı/tarih `null` kalır. Metacritic kullanıcı puanı, eleştirmen puanı, mağaza yorum yüzdesi ve kişisel puan ayrı ölçülerdir. Kaynak kaydı ile yönetici tarafından seçilen gösterim değeri aynı kavram değildir.

Elle değiştirilen alanlar ayrı öncelikli kayıt olarak tutulur. Sonraki kaynak yenilemesi bunları ezmez. Yönetici paneli ve bu kayıtları değiştirme yetkisi 9. adımda eklenecektir; bu aşama herkese açık bir düzenleme paneli oluşturmaz.

## Sınırlı API ve tarayıcı belleği

`GET /api/catalog` arama, filtre ve sıralamayı sunucuda uygular; varsayılan sayfa 24 oyundur. Yanıt toplam sonuç sayısını, sayfa bilgisini ve katalog özetlerini içerir. Tür, detaylı etiket ve oynanış koşulları sunucuda VE mantığıyla birleşir; çoklu seçim ve aranabilir etiket arayüzü mevcuttur. Tekrarlanan `genre`, `tag` ve `play` parametreleri kullanılır. Doğrulanmış oynanış özellikleri `catalog_game_features` tablosunda indekslenir; bilinmeyen destek tahmin edilmez.

`GET /api/games?ids=...` belirli oyunları getirir. Ayrıntı, sayfa dışındaki karşılaştırma kayıtları ve günlük seçki tüm kataloğu yüklemez. Kişisel koleksiyon sorgusu sunucuda oturum sahibiyle sınırlandırılır. Arşiv kayıtları keşifte gösterilmez, eski kişisel listeler ve doğrudan bağlantılardan erişilebilir kalır.

Benzer oyunların adayları kaynak sırası ve ortak etiket indekslerinden alınır, en fazla 20 sonuç döner. Yeni kayıtlar veritabanı üzerinden eşleşmelere girer. Medya bağlantıları ihtiyaç halinde getirilir; video/görseller veritabanına ikili dosya olarak yüklenmez.

API'nin ikinci sürümü `apiVersion: 2` ile belirtilir. Eski tüm-katalog JSON yanıtı mobil veya yeni istemci için sözleşme değildir. Arama, Türkçe karakterleri normalize ederek kelime başlangıcını eşleştirir (`kens` → `Kenshi`); birden fazla arama kelimesinin hepsi karşılanır. Eski kelime ortası alt dize davranışı yerine indeksli kelime araması kullanılır. Geçerli filtre/sıralama parametreleri doğrulanır; SQL sıralama alanları izin listesinden seçilir. Filtre değişirken geç gelen eski yanıt yeni seçimi değiştiremez.

## Taşıma ve geri dönüş

Şema değişiklikleri yalnızca ek tablo/indeks oluşturur. Yayımlanmış migration dosyaları değiştirilmez. Başlangıç kataloğu ve eski `source_games` kayıtları devam noktalarıyla küçük gruplar halinde taşınır. Seed veri migration SQL dosyalarına gömülmez. Taşıma tamamlandığında devam kaydı `done` olur; sonraki kaynak kodu yayınları başlangıç JSON dosyalarını yeniden uygulamaz. Puan tamamlama ve gelecekteki yeni oyun görevleri, yalnızca dosya değişikliği yerine `ingestGames` üzerinden kimliği doğrulanmış kayıtları kalıcı veritabanına yazmalıdır. Doğrudan `source_games` yazımı da tek başına yeni katalog görünümünü güncellemez. İşlem yarıda kesilirse tamamlanan gruplar yeniden baştan yüklenmez; tekrar deneme aynı oyunu çoğaltmaz.

Eski kaynak tabloları ve kişisel veri tabloları silinmez. Eski kod sürümüne dönmek yeni eklenen katalog tablolarını silmeyi gerektirmez. Kod geri alma ile veri yedeğini geri yükleme ayrı işlemlerdir. Yeni yazımların eski kaynak kayıtlarıyla uyumu ayrıca kontrol edilir.

Tam SQLite yedeği ve geri yükleme araçları katalogla birlikte kişisel tabloları da kapsar; geri yükleme öncesi doğrulama ve mevcut veritabanının yedeği gerekir. Yerel geri yükleme testi, canlı D1 yedeğinin alındığını veya canlıda geri yükleme yapıldığını göstermez. Sites'in mevcut araçları canlı tablo okumalarını sağlar; bu çalışmada canlı kişisel kayıtları silen veya geri yükleyen bir işlem yapılmaz. Kendi barındırmaya geçmeden önce sağlayıcının tam dışa aktarma/geri yükleme erişimi ve saklama politikası ayrıca doğrulanmalıdır.

## Barındırma, giriş ve görev ortamı

Bugünkü ortam Sites üzerinde Cloudflare Worker ve D1'dir. Mevcut ChatGPT giriş akışı korunur; kullanıcı ID'si başka bir Site'a taşındığında aynı olacağı varsayılmaz. Kendi alan adı veya başka barındırmaya geçişte hesap eşlemesi, koleksiyon verisi ve yetki modeli için açık geçiş planı gerekir.

İlk tercih, mevcut Worker/D1 yapısını kullanan bir barındırma hedefini değerlendirmektir. Büyük katalog ve sorgu maliyetleri ölçüm gerektirirse PostgreSQL gibi bir sunucu veritabanı değerlendirilebilir; API ve kalıcı oyun ID'leri aynı kalmalıdır. Bu adımda servis veya alan adı satın alınmaz.

Haftalık delta, eski katalog doldurma ve gündem taraması ayrı devam imleçleri kullanmalıdır. Görevlerin tek yazıcıyla yetkili sunucu ortamında çalışması, tekrar denemede aynı kaydı çoğaltmaması ve manuel alanları koruması gerekir. Tarayıcının açık olması veya bu sohbetin sürmesi görev çalıştırma koşulu değildir. Bu adım zamanlanmış bir görev kurmaz.

## Kapasiteyi yorumlama

140 bin oyun, 2,8 milyon etiket ilişkisi ve 280 bin kaynak kimliğiyle yerel SQLite üzerinde sentetik ölçüm yapıldı. Gösterim ve ham kaynak JSON kayıtları birlikte depolandığında veritabanı yaklaşık 1,32 GB, en büyük varsayılan sayfa yanıtı yaklaşık 81 KB oldu. Ölçüm ortamında 27 katalog sorgusunun ortancası yaklaşık 81 ms, yüzde 95 değeri yaklaşık 551 ms idi; geniş kelime aramaları en yavaş gruptu.

Etiketleri değişken olan 140 bin kayıtta benzer oyun hesabı yaklaşık 543 ms sürdü. Tüm 140 bin oyunun iki özel etiketi paylaştığı uç durumda tüm adayları doğru sıralamak yaklaşık 7,81 saniye aldı; yalnızca son 20 oyunun JSON kaydı getirildi. Sorgu planı optimizasyonu bu testi 30 saniyelik tanı sınırının altına indirdi, fakat 3 saniyelik etkileşim hedefini karşılamıyor. Bu yoğunluğa büyümeden önce normalize ağırlık/ara toplamlar veya sürüme bağlı öneri önbelleği gibi ek iyileştirmeler ve canlı ölçüm gerekir. Mevcut 1.323 oyunla yayın, 140 bin oyun için hazır olunduğu anlamına gelmez.

Bu örnek depolama boyutu 500 MB sınırını aşar. Kademeli büyüme sırasında ücretli kapasite veya başka veri deposu gereksinimi gerçek katalogla yeniden ölçülmelidir. Ayrıntılı ölçüm kaydı [KAPASITE-OLCUMU.json](KAPASITE-OLCUMU.json) dosyasındadır. Bu test sorgu ve yanıt boyutunu değerlendirir; gerçek 140 bin oyun toplandığı, canlı D1 gecikmesi veya aynı anda kullanıcı kapasitesi anlamına gelmez. Kapak/video dosyaları sağlayıcı CDN'lerinde kalır. Büyük açıklama ve etiket kayıtları, indeksler, kişisel veri ve görüntülenme geçmişi de toplam depolamaya dahildir.

Cloudflare'ın resmî D1 sınırlarına göre veritabanı boyutu Free için 500 MB, Workers Paid için 10 GB; sorgu başına en fazla 100 bağlı parametre vardır. Sites hesabının sağlayıcı planı bu çalışmada doğrulanmadığından bu sınırlar mevcut Site'a verilmiş bir kapasite garantisi değildir. Büyük arka plan taşıma işlemleri küçük gruplara bölünmelidir.

Kaynak: https://developers.cloudflare.com/d1/platform/limits/ (7 Ekim 2026'da kontrol edildi).

### Kademeli büyümenin kontrol ölçütleri

Yerel sentetik testte varsayılan katalog yanıtı 200 KB altında, ölçülen katalog sorguları 3 saniye altında kalmalı; kimlik/etiket/kelime ve keşif sırası sorguları indeks kullanmalıdır. Bunlar test ortamının tanı eşikleridir. Canlı büyüme basamaklarında gerçek veriyle, ağ dahil katalog API yüzde 95 süresi 1 saniye, sıcak benzer oyun yanıtı 3 saniye hedeflenir. Dış kaynağın ilk yanıt süresi ayrıca ölçülür. Canlı ölçüm henüz bu hedefleri doğrulamamıştır.

Bir sonraki basamağa çıkmadan önce yinelenen kimlik ve kayıp mevcut kayıt sayısı sıfır olmalı; sayfa başına oyun ve yanıt boyutu sınırları korunmalı, yedek geri yükleme denemesi geçmeli ve depolama/sorgu bütçesinde en az yüzde 30 pay kalmalıdır. Gerçek ortam ölçümü hedefi aşarsa büyüme bekletilir; sorgu, önbellek veya barındırma kapasitesi düzeltilir. Bu kontrol otomatik bir aktarım görevi etkinleştirmez.

## Yerel yedekleme komutları

Node.js 24 ile, uygulama kapalıyken yerel veya sağlayıcıdan dışa aktarılmış tam SQLite dosyası için:

```bash
node scripts/catalog-backup.mjs --database /guvenli-yol/veritabani.sqlite --output /guvenli-yol/yedek.sqlite
node scripts/catalog-restore.mjs --database /guvenli-yol/veritabani.sqlite --backup /guvenli-yol/yedek.sqlite --dry-run
node scripts/catalog-restore.mjs --database /guvenli-yol/veritabani.sqlite --backup /guvenli-yol/yedek.sqlite --apply
```

Yedek manifesti dosya özeti ve tablo adetlerini içerir. Araç mevcut yedeğin üzerine yazmaz; `--apply` öncesinde hedefin ayrı bir tam yedeğini alır. Bu komutlar Sites'in canlı D1 veritabanına uzaktan yazmaz. Yedek kişisel notları içerebilir; GitHub deposuna veya genel site varlıklarına koyma. Geri yükleme sırasında hedefi kullanan uygulama durdurulmalıdır.
