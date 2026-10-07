# Günlük keşif ve mağaza medyası

6 Ekim 2026'da uygulandı. Özgün PC kataloğu ve tarihli Metacritic puanlarının kaynak bilgisi değişmedi.

## Günlük öne çıkan oyunlar

`data/spotlight-pool.json`, tek tek seçilmiş 125 Steam katalog kimliği ve özgün Türkçe editoryal açıklama içerir. Genişletilmiş havuza, mevcut katalogdan keşif, mücadele, hikâye, rahatlama ve bulmaca/strateji deneyimleri sunan 100 aday eklenmiştir. Bunlar editoryal keşif önerileridir; her oyunun az bilindiğine ilişkin ölçülmüş bir iddia değildir. Bu değişiklik için yeni oyun, oyun bilgisi veya kaynak taraması gerekmedi.

Europe/Istanbul saat diliminde her takvim günü (00.00 / UTC+03) beş oyun döndürülür. `lib/spotlight-rotation.ts`, havuzu sırası karıştırılan bir tur olarak ele alır: 125 oyunun tamamı, herhangi biri tekrar kullanılmadan önce, 25 ardışık günlük seçime birer kez atanır.

Her yeni turun sabit başlangıç değerinden üretilen sırası farklıdır; beşli gruplar kalıcı olarak sabit değildir. Tur sınırındaki düzenleme, yeni turun ilk on oyununun önceki turun son on oyununu tekrar etmesini önler. Başlangıç gününde yayımlanmış beş oyun ilk turun başında kalır; sonraki kayıtların sırası karıştırılır. Havuz üyeliği sürümlenen kaynakta sabittir; aktarımlar yayımlanmış bir günün seçimini değiştiremez.

Dizi, sunucu tarihini ve tur başına sabit bir başlangıç değerini kullanır. Aynı tarih, her ziyaretçiye ve sayfa yenilemesinde aynı oyun grubunu verir. Sistem, bir kişinin siteyi gerçekten açıp açmadığını değil, takvimde planlanan günlük gösterimleri izler: ziyaret edilmeyen günlerde de dizi ilerler. Gece yarısından sonraki ziyaret, site kapalı olsa bile sonraki grubu getirir; açık sayfa gün sınırında yenilenir. Ayrı bulut görevi veya katalog yazımı gerekmez.

Seçim kesintisiz bir konum dizisini kullanır. Gelecekte havuz sayısı beşe tam bölünmezse kalan kayıtlar korunur ve sonraki karıştırılmış tura devam edilir; aynı gün içinde yinelenen kart oluşmaz. Kaynak kimlik doğrulaması, uyuşmayan seçilmiş kaydı reddeder; havuzu sessizce küçültüp son kayıtlarını atlamaz. Arayüzün 7,5 saniyelik otomatik geçişi, gezinme, duraklatma, gizli sekme ve azaltılmış hareket davranışı korunur.

## Medya kaynağı ve eşleştirme

Sunucu, resmî Steam mağaza `https://store.steampowered.com/api/appdetails?appids={appid}&l=english` uç noktasını yalnızca mevcut bir PC katalog kaydı için çağırır. Medyayı göstermeden önce yayımlanmış Windows oyun türünü, döndürülen Steam kimliğini ve normalleştirilmiş başlığı doğrular. Ziyaretçinin verdiği bir URL'yi çağırmaz.

`movies` ve `screenshots`, tam kaynak URL'lerini sağlar; URL üretilmez. Kaynaklar HTTPS Steam CDN dosyalarıdır. Küçük görselin yolu, oyun kimliği yerine video kimliği içerebilir; modern tanıtım videosu yolu gerçek uygulama kimliğiyle uyuşmalıdır. Ekran görüntüleri oyunun uygulama yoluyla uyuşmalıdır.

6 Ekim 2026'da birincil yanıtlar Kenshi (233860; 4 video/6 ekran görüntüsü), Rain World (312520; 2/9) ve DREDGE (1562430; 5/12) için doğrulandı. Modern yanıtlar `hls_h264`, `dash_h264`, `dash_av1` ve `thumbnail` sağlar; test edilen yanıtlarda eski MP4/WebM alanları yoktur.

Uygulama H.264 HLS kullanır; eski kayıtlarda sağlandığında MP4/WebM desteği de vardır. Test edilen HLS akış listeleri, video kapakları ve tam ekran görüntüleri HTTP 200 ve CORS `*` yanıtı verdi. Kenshi'nin ilk kısa video parçası HTTP 206 döndürdü ve H.264 video olarak çözümlendi. Bunlar HTTP/video kapsayıcısı kontrolleridir; tarayıcıda oynatma kanıtı değildir.

Medya JSON'u, D1'in mevcut `catalog_cache` tablosunda ayrı `steam-media-v1:` alanı altında 24 saat önbelleğe alınır. Yenileme başarısız olduğunda, güncel olmadığı açıkça işaretlenmiş son geçerli kayıt döndürülebilir. Aynı uygulama için eşzamanlı istekler, aynı çalışma birimi içinde birleştirilir.

Galeri, oyun ayrıntısı açıldığında yüklenir. Video verisi ve yerel oynatıcı paketi yalnızca oynatma isteğinden sonra yüklenir. Ayrıntı penceresi kapatıldığında veya başka içerik seçildiğinde HLS oynatıcısı kapatılır ve video kaynağı temizlenir.

Yayıncı medyası Steam CDN üzerinde kalır. Uygulama videoları veya ekran görüntüsü dosyalarını indirip kendi sunucusunda barındırmaz. Hakları sahiplerinde kalır. Gizlilik bilgisi dış dosya isteklerini açıklar; ayrı lisans sayfası sağlayıcı bilgisini ve oynatıcı lisansını korur.

## Oynatıcı ve ikonlar

- Resmî oynatıcı deposu: https://github.com/video-dev/hls.js
- Sabitlenmiş sürüm: https://github.com/video-dev/hls.js/releases/tag/v1.7.3
- hls.js 1.7.3 yerel UMD paketi ve Apache-2.0 lisansı `public/vendor/` altında tutulur. `scripts/prepare-media-vendor.mjs`, bunları sabitlenmiş bağımlılıktan yeniden üretir.
- Önce HLS.js MediaSource desteği tercih edilir; destekleyen tarayıcılarda tarayıcının kendi HLS desteği alternatif olur. Oynatma ve kodek desteği ziyaretçinin gerçek tarayıcısına bağlıdır.
- `public/ui.js` içindeki ortak SVG çizgi ikonları özgün kaynak kodudur. 24 piksel görünüm alanı, yuvarlak çizgi uçları/birleşimleri ve 1,7 piksel çizgi kalınlığı kullanırlar. İşletim sistemi emojisi, ikon yazı tipi veya dış ikon CDN'i kullanılmaz.

## Doğrulama sınırları

Gün sınırı ve dönüşüm sırası, kaynak kimliği/URL güvenliği, medya önbelleği ve alternatif davranışı, galeri seçimi/oynatma isteği/temizleme, keşif filtrelerinin birlikte kullanımı, temalar ve hesap/koleksiyon işlemleri otomatik kaynak, API ve sanal makine DOM testleriyle kontrol edilir.

Gerçek tarayıcıda oynatma, giriş ve mobil görsel inceleme için ortamda bulunmayan tarayıcı kalite kontrol yeteneği gerekir. Bunların test edildiği iddia edilmez.

## Benzer oyun kartları ve Steam kaynakları

Bölüm, üçlü küçük gruplarda en fazla 20 oyun gösterir. `lib/related.ts`, herkese açık ve anonim Steam `recommended/morelike/app/{appid}/?l=english` sayfasını ihtiyaç anında çağırır. Başlıktaki Steam uygulama kimliğini ve normalleştirilmiş oyun adını doğrular; yalnızca resmî Steam uygulama bağlantısıyla uyuşan, yayımlanmış öneri kartlarını okur ve verilen sırayı korur.

Başlık/başka oyun/kendisi/yinelenen kayıt/yakında çıkacak oyun girişleri dışarıda bırakılır. Aday Steam kimliklerinin tamamı katalog üyeliğinden bağımsız olarak D1'de bir saat önbelleğe alınır. Eşzamanlı istekler birleştirilir; son geçerli yanıt alternatif olarak döndürülürse güncel olmadığı açıkça belirtilir. Böylece yeni katalog kaydı, yeniden yayın veya oyun başına elle liste düzenlemesi gerektirmeden önceden alınmış kaynak listesine katılabilir.

İstemci kaynak yanıtlarını beş dakika önbelleğe alır; farklı bir oyun açıldıktan sonra gelen eski sonuçları dikkate almaz.

Arayüz, Steam listesindeki güncel PC katalog kayıtlarını kaynağın sırasıyla gösterir; boş kalan yerleri ayrıntılı etiket benzerliğiyle tamamlar. Ziyaretçinin Steam'deki sahip olduğu, yok saydığı oyunları veya kişisel tercihlerini aktarmaz. Herkese açık sayfanın temel sırası, giriş yapmış bir kullanıcının gördüğü Steam sırasından farklı olabilir. Valve'ın açıklanmamış sıralama formülünün yeniden üretildiğini iddia etmek yerine, mevcut olduğunda Steam'in verdiği öneriler kullanılır.

`data/steam-tags.json`, uygulama kimliği/başlıkla eşleştirilmiş etiket profillerini tutar. Aktarım raporunda 1.323 profil ve 24.986 etiket gözlemi vardır:

- 1.102 doğrudan herkese açık mağaza profili.
- 135 herkese açık SteamSpy profili.
- 23 tarihli leinstay/steamdb profili.
- Mağaza aramasından alınmış, yedi etiketle sınırlı 63 profil.

1.080 profilde kullanılabilir 20 etiket bulunur; diğer doğrudan kaynaklar doğal olarak daha az etiket sağlayabilir. Yalnızca arama kaynağı olan profiller `complete:false` olarak işaretlenir ve sınırlı gösterilir; tam 20 etiketli profil uydurulmaz. Bu işlem kataloğu genişletmedi, puan toplamadı veya Metacritic kaynak bilgisini değiştirmedi.

Mağazanın `InitAppTagModal` verisi etiket kimliklerini, İngilizce adlarını ve etkin sayıları/ağırlıkları sağlar. Ayrıştırıcı tam oyun kimliğini doğrular, yinelenen kimlikleri temizler, geçersiz/göz atılamayan değerleri eler ve en yüksek 20 ağırlığı seçer.

SteamSpy'ın belgelenmiş herkese açık uç noktası etiket oy sayılarını sağlar; uygulama kimliği ve normalleştirilmiş başlık uyuşmalıdır. Ara kayıtlarla devam edebilen toplu veri toplamada, saniyede en fazla bir istek sınırına uyulmuştur.

Tarihli GPL alt kümesi sıralı etiket adları sağlar; sayısal oy sayıları sağlamaz. Bu alanlar uydurma kaynak ağırlığı yerine null kalır. Türkçe etiketler, Steam'in herkese açık `tagdata/populartags/turkish` verisinden gelir. GPL alt kümesini çıkaran kaynak kodu ve lisans, ayrı lisans sayfasında bulunur.

Yerel tamamlama algoritması, her profilin yalnızca ilk 20 Steam etiket kimliğini kullanır:

- Sayısal değer varsa kaynak gücü `sqrt(count / maximum_count)` olur; yoksa eşit güç kullanılır.
- Bu güç, etiketin nadirlik değeri `1 + log((catalog_profile_count + 1) / (tag_profile_frequency + 1))` ile çarpılır.
- Sıralama ağırlıklı Jaccard benzerliğini kullanır: ortak ağırlıkların minimumları toplamının, birleşimdeki maksimum ağırlıklar toplamına oranı.
- Normalde en az iki ortak etiket gerekir. Yalnızca geniş etiketler eşleşmeye yeterli değildir. Kaynağın özgün adlarıyla bunlar: Action, Adventure, Indie, Singleplayer, Multiplayer, Casual, Early Access ve Free to Play.
- Sınırlı arama profillerinde `sqrt(tag_count/20)` kapsam güven katsayısı uygulanır.
- Eşitlikte ortak etiket sayısı, ardından sabit başlık/kimlik sırası kullanılır.

Bunlar açıkça yerel tercihlerdir; Valve'ın yayımladığı katsayılar değildir. Metacritic puanı, site görüntüleme sayısı ve eklenme tarihi sıralamayı etkilemez. Eklenme tarihi yalnızca küçük yeni oyun etiketini sağlar.

Gelecekteki Steam aktarımları ve mağaza yenilemeleri, oyun bilgisini ve herkese açık etiket sayfasını eşzamanlı çağırır. Başarılı ve doğrulanmış etiket profilleri mevcut D1 oyun verisinde kalıcı tutulur. Başarısız etiket isteği önceki geçerli profili silmez. Steam kaynaklı öneri yolu, yeni eklenmiş katalog kimliklerini de destekler. Her öneri gösterimi güncel kataloğa göre filtrelenir; oyun başına sabit kimlik eşleştirme listesi kullanılmaz.

Kartlar mevcut güvenli kapak yardımcısını, tarihli Metacritic kullanıcı puanını (veya `Veri yok`), çevrilmiş ortak etiket açıklamalarını, farklı ekranlara uyumlu kaydırma/sayfa gezinmesini ve eski oynatıcının kapatılmasıyla oyun ayrıntısına geçişi korur.

Açılıp kapanabilen panel yalnızca çevrilmiş oynanış/dünya etiketlerini gösterir. Kaynak adları, ağırlıklar ve dışarıdaki benzer oyun bağlantısı oyun ekranlarından kaldırılmıştır. Kaynak/tarih bilgisi veri kayıtlarında ve lisans sayfasında kalır. Kaynaktan gelen güncellemeler yalnızca öneri alt bölümünü değiştirir; aktif video ve kaydedilmemiş notlar korunur.

Doğrulama; kaynak sırası/kimlik/bağlantı güvenliğini, yalnızca yayımlanmış kayıtların alınmasını, D1 önbelleğini/eşzamanlı istek birleştirmesini/eski yanıt alternatifini, en yüksek 20 etiket seçimini, ilk 20 sınırını, genel etiketlerin elenmesini, yeni katalog eklemelerini, yeni oyunun zorla öne çıkarılmamasını, puan bağımsızlığını, bilgi yenilemesinde mevcut verilerin korunmasını ve sanal makine arayüz/medya işlemlerini kapsar. Gerçek tarayıcıda görsel kalite kontrol hâlâ yapılamamıştır.
