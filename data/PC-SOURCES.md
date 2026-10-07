# PC kataloğu kaynak incelemesi — 5 Ekim 2026

## Steam kataloğu ve görseller

Giriş gerektirmeyen resmî mağaza uç noktaları `https://store.steampowered.com/api/appdetails?appids=570&l=english` ve `https://store.steampowered.com/search/results/?query&start=0&count=100&dynamic_data=&sort_by=_ASC&category1=998&supportedlang=english&snr=1_7_7_230_7&infinite=1`, Node 24 ve `--use-env-proxy` ile HTTP 200 yanıtı verecek şekilde doğrulandı.

Arama yanıtı `results_html`, `total_count` ve `start` alanlarını içerir. Kayıtlarda uygulama kimlikleri, yayıncının yüklediği görsellerin bağlantıları, olumlu kullanıcı değerlendirmelerine ait bilgi ve desteklenen bilgisayar işletim sistemleri bulunur.

`appdetails` yanıtı `type`, `steam_appid`, `platforms`, `genres`, `release_date`, resmî Steam CDN üzerindeki `header_image` ve varsa 100 üzerinden Metacritic eleştirmen puanı (`score`) sağlar. Bu son değer Metacritic kullanıcı puanı değildir.

Resmî belgelerde açıklanan `IStoreService/GetAppList` bir API anahtarı gerektirir. Herkese açık mağaza uç noktaları bu anahtarı gerektirmez.

Steam görsellerinin hakları yayıncılara/platformlara aittir; görseller CC0 kapsamında değildir. Ayrı lisans sayfasında sağlayıcı açıkça belirtilmeli, tüm içeriklerin kamu malı olduğu iddia edilmemelidir. Steam Web API koşulları, uygulamalar aracılığıyla kişisel kullanım için veri sunumuna izin verirken haklar, resmî bağlantı ve erişilebilirlik konusunda sınırlamalar içerir; belgelerde günlük 100.000 çağrı sınırı yer alır. Mağazanın robots dosyasında arama/API için genel bir engelleme bulunmaz.

Birincil belgeler: https://partner.steamgames.com/doc/webapi/IStoreService ; https://partner.steamgames.com/doc/store/assets/standard ; https://steamcommunity.com/dev/apiterms ; https://store.steampowered.com/legal/ ; https://store.steampowered.com/robots.txt

## Metacritic

Resmî `https://www.metacritic.com/robots.txt` dosyası, GPTBot ve OAI-SearchBot için tüm yolları açıkça engeller. Gizli/dahili API erişimi veya bot engelini aşma girişimi yapılmadı. Metascore ile kullanıcı puanı farklı ölçülerdir: https://metacritichelp.zendesk.com/hc/en-us/articles/14482674768791-Are-user-votes-included-in-the-METASCORE-calculations .

https://developer.origin.fabricdata.com/origin/apis-all/metacritic-api-docs adresindeki lisanslama belgeleri, ücretli ve onaylanmış abonelik gerektirir; ücretsiz denemede bu veri bulunmaz. İncelenen belgelerde film/dizi uç noktaları listelenir. Oyun verilerinin lisans kapsamı sağlayıcıdan doğrulanmalıdır; oyunlar için hazır bir çözüm olduğu vaat edilmemelidir.

## Wikidata: CC0 kapsamındaki sınırlı kullanıcı puanı verileri

`wikidata-verified-pc-user-scores.json`, Steam uygulama kimliği, P444 puanı, açık bir `/user-reviews/` bağlantısı, `platform=pc` veya `/game/pc/` kaynak URL'si ve PC platform niteleyicisiyle eşleştirilmiş beş kayıt içerir. Hepsi tarihsel kayıtlardır; OneShot puanının tarihi bilinmez. Canlı Metacritic doğrulaması yapılmadı.

`wikidata-pc-user-scores-entities.json` tam kaynak varlıklarını, `wikidata-metacritic-ref10.json` ise sorguyu ve sonucunu saklar. Q16338 kişisel bilgisayarı, Q1406 Microsoft Windows'u temsil eder. Tek başına `/10` ifadesi kullanıcı puanı kanıtı değildir. P459 Q108403540, Rotten Tomatoes ortalamasıdır; güvenilir bir kullanıcı puanı seçicisi değildir. Hogwarts'ın konsol puanları ve Steam Deck donanımının eleştirmen puanları dışarıda bırakıldı.

Wikidata yapılandırılmış verileri, https://www.wikidata.org/wiki/Property:P444 sayfasının alt bilgisinde belirtilen CC0 kapsamındadır.

## GPL lisanslı ikincil puan desteği

https://github.com/leinstay/steamdb deposu, birleştirilmiş GameGauntlets veri kopyasını günlük olarak GPL-3.0 altında yayımlar. Oyun adları, görselleri, açıklama metinleri ve kaynaklar üzerindeki sahiplerin haklarını saklı tutar.

Sabit veri kopyası: https://github.com/leinstay/steamdb/releases/download/2026-10-04/steamdb.min.json.gz . Dosya 56.037.578 bayttır ve yerelde `steamdb-2026-10-04.min.json.gz` adıyla indirilmiştir.

`steamdb-user-score-facts.json` yalnızca uygulama kimliği, ad, sayısal Metacritic kullanıcı puanı, kaynak bağlantısı, kayıt güncelleme zamanı ve işletim sistemi alanlarını çıkarır. Açıklama veya görsel aktarılmaz. Kaynakta 0–100 aralığında tanımlanan tamsayı puanlar, 10'a bölünerek dönüştürülür. Eksik olmayan 12.296 puan vardır; gözlenen aralık 2–100'dür, sıfır değer yoktur, 177.497 puan null'dır. Veri kümesinde toplam 189.793 kayıt bulunur.

Önemli sınırlamalar:

- `updated_at` tüm oyun kaydının güncellenmesini gösterir; puanın toplandığı tarih değildir. Veri kopyası tarihi, puanın doğrulandığı tarih olarak sunulmamalıdır.
- `platforms` bilgisayar işletim sistemi uygunluğunu gösterir; Metacritic puanının platformunu göstermez.
- Bağlantıların çoğunda platform parametresi bulunmadığından puan platformu bilinmez.
- CS2 uygulama kimliği 730, tarihsel CS:GO bağlantısına sahiptir; bu yanlış eşleşme dışarıda bırakılmalıdır.
- Witcher 3 uygulama kimliği 292030 olan kayıt Remastered adı taşırken genel özgün oyun URL'sine bağlanır; sürüm çıkarımı yapılmamalıdır.
- Kullanıcı değerlendirme sayıları mevcut değildir.

Örnekler: özgün Counter-Strike 7,9; Portal 8,8; Dota 2 6,5; Kenshi 8,2; Hades 8,5; Cyberpunk 2077 7,3. Bunlar ikincil veri kümesinin değerleridir; güncel olarak doğrulanmış Metacritic değerleri değildir.

Yeniden dağıtılan alt kümede `steamdb-GPL-3.0-LICENSE.txt`, kaynak depo bilgisi, sürüm URL'si/tarihi ve lisans uyumluluğu korunmalıdır. Bu veri CC0 olarak etiketlenmemeli veya hak sahiplerinden lisans izninin ayrıca doğrulandığı iddia edilmemelidir.

## Ayrıntılı etiketler ve kaynağın kendi önerileri — 6 Ekim 2026

Profil kapsamı ve kaynak sayıları için `STEAM-TAGS-REPORT.json` dosyasına; yerel tamamlama formülü ve Steam önerilerinin alınma yöntemi için `DISCOVERY-MEDIA-SOURCES.md` dosyasına bak.

Herkese açık Steam mağaza sayfaları etiket ağırlıklarını sağlar. SteamSpy, belgelerinde belirtilen saniyede bir istek sınırıyla herkese açık etiket oy bilgilerini sağlar. Yaş doğrulama ekranları aşılmadı. Tarihsel ve sınırlı kaynaklar, veri kayıtlarında ve kaynak bilgilerinde ayrı tutulur. Sınırlı bir etiket profili, oyun ayrıntısında tarafsız bir kapsam notuyla gösterilir.

Herkese açık, anonim benzer oyun kaynağı `https://store.steampowered.com/recommended/morelike/app/{appid}/?l=english` adresidir. Kenshi, Valheim ve Portal 2 örnekleri, uygulamada kullanılan ayrıştırıcıyla kontrol edildi. Kişisel Steam oturumuna veya giriş bilgilerine erişilmez.

## Kimlik temelli puan geçişi — 6 Ekim 2026

Tüm katalog incelemesi ve puan kapsamı için `METACRITIC-SOURCES.md` ve `METACRITIC-REPORT.json` dosyalarına bak.

Mevcut puanlar, 5 Ekim 2026 sayısal alt kümesini; kalıcı oyun/mağaza/Metacritic/kaynak kayıt kimliklerini; varsa değişmez sayısal Metacritic kimliklerini ve açık sürüm kontrollerini kullanır. Eski başlık eşleştirmesi artık puan aramasında veya aktarımında kullanılmaz. Veri kopyası tarihi ile gerçek puan tarihi ayrıdır; bilinmeyen puan platformları bilinmeyen olarak kalır. 4 Ekim 2026 tarihli eski etiket ve oyun bilgisi alt kümeleri kendi kaynak bilgilerini korur.

## Birincil puan kapsamının tamamlanması — 6 Ekim 2026

Kimlik eşleştirme tablosu, `metacritic-reviewed-facts.json` dosyasındaki incelenmiş PC ortalamalarını da kabul eder. Kullanıcının sağladığı Mortal Shell II görüntüsü dahil 18 kaynağa dayalı gözlem eklenmiş, kapsam 1.323 oyunun 901'ine ulaşmıştır.

Birincil kaynağın yaşı, platformu ve yöntemi, lisanslı ikincil alt kümeden bağımsız tutulur. Aktarılan veride puan bulunmaması, Metacritic'te puan olmadığı anlamına gelmez. Bu incelenmiş aktarım, otomatik bir canlı veri akışı değildir. Doğrulama ve kalan eksikler için `METACRITIC-SOURCES.md` dosyasına bak.
