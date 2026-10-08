# Metacritic kimlik eşleştirmesi — 6 Ekim 2026

Puan bulma işlemi artık görünen oyun adı üzerinden birleştirme veya doğrulama yapmaz. Sitenin oyun kimlikleri korunur; her oyun açık bir Steam uygulama kimliğine ve incelenmiş Metacritic kaynak kimliğine bağlanır.

Wikidata P12078 tarafından açıkça sağlanan değişmez sayısal Metacritic kimlikleri de eklenir; P12054 üzerindeki niteleyiciler buna dahildir. Sayısal kimlikler, URL'deki alternatif kaynak kimliklerini doğrulamaya yardımcı olur. Yaklaşık başlık, noktalama, sürüm eki veya Roma rakamı eşleştirmesi yapılmaz. URL kimliği gerçek bir kaynak bağlantısından okunur; oyun adından üretilmez.

## Yeniden üretim dosyaları

- `metacritic-score-input.json`: leinstay/steamdb'nin 5 Ekim 2026 sürümünden sayısal veriler ve kaynak kayıt kimlikleri. Yalnızca ilgili sayısal veriler yeniden dağıtılır; GPL-3.0 lisansı ve kaynak bilgisi korunur. Kaynak kaydın güncelleme zamanı, puanın ne zaman ölçüldüğünü göstermez. Eleştirmen puanları bu alt kümeye alınmaz.
- `metacritic-identity-evidence.json`: Geçiş öncesi onaylı kimlik ilişkileri, herkese açık mağaza `appdetails` bağlantıları, Wikidata kimlik bilgileri, elle onaylanan alternatif kimlikler, sürüm incelemesi ve beş ek GOG kaynak kaydı bağlantısı. Başlangıçta eksik olan 546 Steam uygulamasının tamamı başarıyla sorgulandı. İlişkili 491 Wikidata varlığındaki açıkça kaynaklandırılmış kullanıcı puanları da incelendi; uygun ek veri bulunmadı.
- `game-identities.json`: Mevcut 1.323 katalog kimliğinin her biri için bir ilişki. Durum, sürüm kapsamı, kanıt, varsa sayısal kimlik, puan kayıt kimliği ve puan platformu içerir. Görünen oyun adları uygulamanın puan bulma işlemine katılmaz.
- `metacritic-users.json`: Sabit kaynak kayıt kimliği (`mc-user:steamdb:<sourceRecordId>`) veya açık tarihsel Wikidata kayıt kimliğiyle anahtarlanan veriler. Her kayıt Metacritic kaynağını, ölçüyü, platformu, tarihi ve veri kökenini saklar.
- `METACRITIC-REPORT.json`: Kalan her eksik kayıt ve tamamlanan her kayıt. Toplamlar, başlangıçtaki 777 puan ve 546 eksik oyunla tutarlıdır.

Depo kökünde `node scripts/refresh-metacritic-scores.mjs` çalıştırılarak saklanan girdiden puan alt kümesi, kimlik ilişkileri ve rapor aynı sonuçla yeniden üretilebilir. Bu işlem PC kataloğunu, editoryal açıklamaları, etiketleri, medyayı veya hesap verilerini yeniden işlemez ve değiştirmez. Eski PC sonlandırma betiği de bu kimlik temelli puan oluşturucuyu çağırır; başlık üzerinden puan birleştirmesi kaldırılmıştır.

İndirilebilir `score-data-source.tar.gz` dosyası puan oluşturucunun tamamını, çözümleyiciyi, katalog kimliği girdisini, kaynak veri alt kümesini, kimlik kanıtlarını, rapor şablonunu ve lisansı içerir. Dosyayı açıp kökünden aynı komut çalıştırılabilir. Kaynak erişim bilgisi veya kullanıcıların özel verileri dahil değildir.

## Kimlik kontrolleri ve sınırlamalar

Herkese açık mağaza `appdetails` uç noktası tam uygulama kimliğiyle sorgulandı; yanıttaki `steam_appid` ve oyun türü kontrol edildi. Metacritic eleştirmen bağlantısı yalnızca kimlik kanıtıdır; sayısal kullanıcı puanının veya kullanıcı puanı platformunun kaynağı değildir.

Mağaza bağlantıları ve Wikidata, başlıkları eşitlemeden kimlikleri bağlar. Alternatif kaynak kimliklerini doğrularken değişmez sayısal Metacritic kimliği P12078 tercih edilir. Bazı kaynakların yayımlanmış sayısal kimliği yoktur; bunların onaylanmış dış kaynak kimliği doğrudan saklanır.

Steam uygulama kimlikleri, devam oyunu ve sürüm değişikliklerinde aynı kalabilir. Bilinen CS2/CS:GO, Witcher Remastered/özgün oyun, Call of Duty ana uygulaması/tekil oyun, sezon/bölüm, genişleme/ana oyun ve Rocksmith Learn & Play/eski Remastered ilişkileri dışarıda bırakılır.

Yanlış FF X/X-2 ve LEGO Complete Saga kaynak bağlantıları doğru kimliklerle değiştirildi; yanlış oyuna ait sayısal veriler düzeltilmiş kaynağa taşınmadı. HITMAN World of Assassination ve Hunt 1896 kendi kaynaklarına sahiptir; tarihsel ana sürüm puanları güncellenmiş sürümün puanı olarak sunulmaz.

Eksik, uygulamaya özgü sayısal veri yalnızca açıkça incelenmiş bir kaynak kaydıyla tamamlanabilir. Beş GOG ürün kimliği, herkese açık `api.gog.com/products/<id>` uç noktası üzerinden kontrol edildi. Örneğin Bannerlord'un Steam kaydında kullanıcı puanı bulunmasa da Steam ve GOG kaynak kayıtları doğrulanmış Metacritic eser kimliğiyle bağlanabilir. Aynı genel URL'ye sahip farklı bir Steam kaydı yeterli değildir; farklı Marathon ürünü veya Guild Wars ana oyunu/üçleme ayrımı buna örnektir.

İkincil puanların platformu bilinmez. Windows desteği, mağazadaki eleştirmen bağlantısının `/pc/` yolu veya kullanıcının PS5 ekran görüntüsü, PC kullanıcı puanını kanıtlamaz. Önceden doğrulanmış iki tarihsel CC0 PC kaydı açık platformlarını ve tarihsel tarihlerini korur. İkincil kaynak, canlı Metacritic veri akışı değildir.

Ek birincil sayısal gözlemler aşağıda ayrı ele alınır. Aktarılan veride puan bulunmaması, Metacritic'te puan olmadığı anlamına gelmez.

Uygulamadaki kontroller; katalog oyun kimliği, Steam uygulama kimliği, onaylı Metacritic kaynak kimliği, varsa sayısal kimlik, puan kayıt kimliği, ölçü ve platformun uyuşmasını gerektirir. İncelenmiş ilişki, görünen ad değiştiğinde korunur. Bu, gelecekteki tüm sürüm değişikliklerini otomatik saptama garantisi değildir; dış kaynak ilişkileri değiştiğinde yeni kimlik incelemesi gerekir.

Birincil kimlik şeması kaynakları: https://www.wikidata.org/wiki/Property:P1733 ; https://www.wikidata.org/wiki/Property:P12054 ; https://www.wikidata.org/wiki/Property:P12078 . Wikidata yapılandırılmış verileri CC0 kapsamındadır. Lisanslı kaynak: https://github.com/leinstay/steamdb/releases/tag/2026-10-05 . Kaynak bilgisi ve tam kod/veri indirmeleri ayrı lisans sayfasında korunur.

## Birincil sayısal kapsamın düzeltilmesi — 6 Ekim 2026

Başarılı bir dış kimlik eşleştirmesi, veri kümesinde olmayan bir puanı sağlayamaz. İkincil/tarihsel verilerle 883 puana ulaşılan aşamada, 440 katalog oyununun aktarılmış puanı hâlâ yoktu. Bunların 421'inde kaynakta sayısal değer yoktu; 19'unda ise ilişki kullanılamıyor veya belirsizdi.

Mortal Shell II, doğru Steam uygulama kimliği 2584270 / Metacritic sayısal kimliği 1300689309 ilişkisine zaten sahipti; ancak seçilmiş kaynak sürümünde kaydı yoktu.

`metacritic-reviewed-facts.json`, ayrı girdi olarak incelenmiş 18 birincil PC gözlemi sağlar. Mortal Shell II'nin 7,8 ortalaması ve 507 değerlendirmesi, kullanıcının sağladığı PC görüntüsünden gelir; özgün ekran görüntüsü yeniden yayımlanmaz. Diğer gözlemler, herkese açık ve önbelleğe alınmış Metacritic PC kullanıcı değerlendirmesi sayfalarından gelir; tarayıcının belirttiği göreli kaynak yaşı korunur.

`snapshotDate` gözlem/aktarım tarihi, `retrievedAt` alınma zamanıdır. Gerçek ölçüm zamanı bilinmiyorsa `scoreDate` null kalır. Eski bir önbellek ortalamasını bugün almak, onu canlı puan yapmaz. Kesin değerlendirme sayısı, aynı gözlemdeki üç değerlendirme grubunun toplamından elde edilebilir; kısaltılmış toplamlar veya yazılı yorum sayıları kesin toplam değerlendirme sayısı olarak uydurulmaz.

İncelenen veriler; katalog oyun kimliği, Steam uygulama kimliği, onaylı kaynak kimliği ve biliniyorsa sayısal kimlikle birleştirilir. Bilinmeyen ürünler, yinelenen veri kimlikleri, çelişkili eser kimlikleri, yanlış ölçüler, PC dışı platformlar, çelişkili kaynak URL'leri, eksik görüntü/önbellek kanıtı ve geçersiz ortalamalar reddedilir.

Bu girdi, ikincil kaynağın her yeniden oluşturulmasında korunur; kaynakta null bulunması onu sessizce silemez. Açıkça incelenmiş PC gözlemi, platformu belirtilmemiş ikincil değere tercih edilir. Bu, tekrar üretilebilir ve incelenmiş bir aktarım yoludur; gözetimsiz veri toplama veya canlı API entegrasyonu değildir.

İki alternatif kaynak kimliği açıkça incelendi:

- Workers & Resources: Eski mağaza URL'si ve güncel Wikidata kaynağı, aynı Steam uygulama kimliği 784150 üzerinden bağlanır.
- STALKER 2: Güncel `chornobyl` kaynağı; mevcut uygulama 1643320, Wikidata Q10865101 ve sayısal kimlik 1300083333 ile incelenmiştir. Birincil yayıncı ve çıkış bilgileri, eserin kimliğini destekler.

Bunlar saklanan kimlik ilişkileridir; genel başlık veya harf dönüştürme kuralları değildir. Doki Doki Plus'ın noktalama farkı ve incelenmemiş diğer alternatifler onaylı değildir.

Sonuçta katalogda 901 puan ve 422 eksik kalmıştır: 311 doğrulanmamış kimlik, aktarılmış sayısal veri bulunmayan 104 onaylı kimlik ve 7 çelişki. Kapsam raporu, eksik kaynak değerlerini kullanılamayan ilişkilerden ayırır; gerçek Metacritic puanı bulunup bulunmadığı konusunda kesin sonuç vermez.

Önceki 883 puanın tamamı korunur. Görüntülenen toplamı üç kaynak grubu oluşturur: 881 ikincil veri, iki tarihsel Wikidata verisi ve 18 incelenmiş birincil PC verisi.

Birincil sayısal gözlemler kaynak haklarını korur; GPL veya CC0 olarak etiketlenmez. Bu puan girdisine yayıncı açıklamaları, kullanıcı yorumu metinleri, görseller veya ekran görüntüsü dosyaları dahil değildir. Lisans sayfasında ayrı kaynak bilgisi bulunur.

Herkese açık birincil sayfalar engellenebilir veya yalnızca eski önbellek gözlemleri olarak bulunabilir. Engellenen istek, belgelenmemiş dahili API veya giriş/bot kısıtlaması aşılmaz. İncelenen ITAD yüzdesi olumlu değerlendirme payıdır; 0–10 Metacritic ortalaması değildir ve aktarılmamıştır. Bu incelemede, bütün kataloğu kapsayan, anonim erişilebilen ve belgelenmiş, tekrar kullanılabilir bir sayısal ortalama kaynağı belirlenemedi.

Açık PC veri bağlantıları, varsayılan konsol görünümü yerine PC platform görünümünü açar. Uygulamanın puan çözümlemesi, aynı URL'de PC/konsol parametrelerinin birlikte bulunması dahil çelişkili platform sorgularını reddeder. Platformu belirtilmemiş ikincil kayıtlar, belirtilmemiş olarak kalır.


## 3. adımın kaynak incelemesi — 8 Ekim 2026

1.323 oyun içindeki 422 puansız ve platformu belirsiz 881 kayıt, toplam 1.303 oyun inceleme kuyruğuna alındı. Kimliği onaylı 985 kaynak için açık PC kullanıcı sayfaları arandı; kimliği bulunmayan/çelişkili 318 oyun için kaynak keşfi yapıldı. İkinci arama motoruyla seçili kapsam kontrolü ve 339 erişilemeyen/eksik sayfa için doğrudan açık PC görünümü kontrolü yapıldı. Doğrudan Metacritic istekleri engellendi; yalnızca erişilebilir, yaşı açık birincil önbellekler kullanıldı. Engeller aşılmadı. İnceleme girişimleri kalan kayıt raporuna işlendi.

57 puansız oyunda doğru PC kullanıcı ortalaması bulundu. Önceden platformu belirsiz 629 kayıt da açık PC gözlemleriyle doğrulandı. Sonuç: **958 puan, bunların 706'sı doğrulanmış PC, 252'si platformu belirsiz; 365 oyunda kabul edilebilir puan hâlâ yok**. 365 açık kayıt, 291 doğrulanmamış kimlik, 67 kimliği doğru fakat erişilebilir sayısal PC olgusu bulunmayan kaynak ve 7 kimlik çatışmasıdır. Bu durumlar Metacritic'te puan olmadığı anlamına gelmez; kalan işler kapatılmadı.

20 ürün için mağaza uygulama ID'si ile Metacritic eser kaynağı, geliştirici/yayıncı, sürüm ve çıkış bilgileri birlikte elle incelenerek açık bir ilişki kaydedildi. Doki Doki Plus, Dragon Ball: Sparking! Zero ve Denshattack için üç belirli URL alias'ı ayrıca incelendi; genel noktalama/ad dönüşümü kuralı eklenmedi. The Wolf Among Us'ın bölüm 1 ile sezon/eser kaydı birbirine otomatik bağlanmadı. Milo ve Cleo'nun genel ayrıntı sayfasındaki mobil/konsol çıkış tarihleri PC puan kanıtı sayılmadı; sayısal gözlemler açık PC başlığından alındı.

`metacritic-score-history.json`, bu çalışma öncesindeki **901 tam puan kaydını ve 1.323 kimlik ilişkisini** tutar. Canlı katalogdan alınan değişiklik öncesi kopya, bu kayıtlarla birebir karşılaştırıldı. Yeni PC puanının seçilmesi önceki tarihsel kaydı silmez. Canlı `catalog_scores` geçmişi de korunur; platformu doğrulanamayan 252 kayıt görünmeye devam eder.

`METACRITIC-STEP3-REPORT.json`, yeni bulunan ve platformu doğrulanan oyunları, kalan kayıtları ve girişimlerini içerir. Yorum metinleri veya sayfa görüntüleri rapora konmaz. `lib/metacritic-observation.mjs` yalnız açık PC başlığındaki sayısal kullanıcı ortalamasını ayırır. Üç tam değerlendirme grubunun toplamı kesin oy sayısıdır; 1.2k gibi kısaltmalar ve yazılı yorum sayısı kesin toplam yapılmaz. Eksik sayılar null kalır.

`node scripts/import-reviewed-metacritic.mjs <gözlem-JSON>` yalnız önceden onaylı dış kimlik ilişkileriyle sayısal gözlemleri aktarır. Yeni kimlik adaylarını başlık üzerinden otomatik onaylamaz. Önce bütün olgular doğrulanır; ardından tekrar üretilebilir puan/kimlik dosyaları ve `metacritic-score-updates.json` hazırlanır. İkinci çalıştırma kabul edilen gözlemleri çoğaltmaz veya yeni puan tarihi üretmez.

Canlı v2 kataloğu için `lib/metacritic-sync.ts`, paketi veritabanına onar kayıtlık atomik parçalarla `ingestGames(..., {scoreOnly:true})` üzerinden uygular. Veri dosyasını değiştirmenin canlı kataloğu güncellediği varsayılmaz. Paket parmak izi, devam imleci ve süreli kilit, yarım kalmış işlemin tekrar denenmesini sağlar. Yeni oyun oluşturulmaz; puan dışındaki ham alanlar, manuel düzenlemeler, kaynak önceliği, sıra, kişisel tablolar ve görüntülenme sayacı korunur. Eşzamanlı kaynak değişiminde eski bir hazırlık bu kaydı ezmez veya eski kod tablosuna çelişkili veri yazmaz. Mevcut doğrulanmış PC gözlemi, özellikle sonradan yapılan bir düzenleme, korunur. İşlem tamamlanınca tekrar veri taranmaz; bu bir zamanlanmış Metacritic toplama işi değildir.

Önceki mevcut PC puanları, Mortal Shell II'nin 7,8 / 507 kaydı dahil, değiştirilmedi. Yeni puanlar **canlı puan olarak sunulmaz**; alınma tarihi ve kaynak önbellek yaşı korunur. Bu çalışma tüm eksiklerin kapandığı veya kesintisiz bir Metacritic beslemesi bulunduğu iddiası değildir.

## Birincil Metacritic ve platform yedeği — 8 Ekim 2026

Metacritic sayfası artık Steam bağlantısından bağımsız bulunur. İncelenmiş kaynak/sürüm kimliği ve açık kullanıcı puanı kanıtı gereklidir; başlık benzerliği tek başına yeterli değildir. Öncelik incelenmiş PC gözlemidir. Erişilebilir PC puanı yoksa aynı oyun/sürümün başka platform puanı kullanılabilir; platform kaydı, bağlantısı, filtre/sıralama indeksi, kart/ayrıntı/karşılaştırma birlikte korunur. Bu diğer platform puanı PC gözlemi olarak yeniden etiketlenmez. Platformu belirsiz 252 mevcut kayıt görünmeye devam eder.

`scripts/import-direct-metacritic.mjs` küçük incelenmiş grupları kabul eder; tüm mevcut seçilmiş puanları ve içerik kimliklerini korur. `data/metacritic-direct-score-updates.json` yalnızca eksik puanlar için ayrı eklemeli pakettir. Önceki 686 değişiklik paketi ve canlı devam kaydı değişmez; yeni paket ayrı imleçle işlenir. Canlıda bu arada eklenmiş puan varsa korunur. Kaynak yaşı ve ekran görüntüsü kanıtının parmak izi saklanır; erişim engeli/tbd/kimlik sorunu `METACRITIC-DIRECT-REPORT.json` içinde ayrı raporlanır.
