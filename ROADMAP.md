# İş planı

7 Ekim 2026'da güncellendi. Aşağıdaki sıralama gelecekteki geliştirme planıdır; bu liste güncellemesi uygulama, veri aktarımı veya otomasyon başlatmaz. Ayrıntılı gündem ve delta gereksinimleri aşağıdaki bölümlerde korunur.

## Uygulama sırası

1. **Eksik Metacritic kullanıcı puanları.** Son doğrulanan 1.323 oyunun 901'inde puan vardır; kalan 422 kayıt doğru oyun/sürüm/platform kimlikleriyle incelenir. Bulunabilen puanlar ve güvenilir değerlendirme sayıları kaynak tarihiyle kaydedilir; doğrulanamayan değerler üretilmez.
2. **Slider kapaklarının kalite sorunu.** Büyük öne çıkan alan için kart görselinden ayrı, yüksek çözünürlüklü ve doğru oyuna ait görsel seçilir. Küçük kapsüller büyütülmez; uygun resmî tanıtım görseli, büyük kapak veya ekran görüntüsü doğrulanır. Kırpma, mobil/masaüstü çözünürlükleri, güvenli alternatif ve önbellek birlikte ele alınır.
3. **Büyüyen katalog için veri altyapısı.** Kalıcı site/kaynak kimlikleri, benzersiz ve indeksli kayıtlar, veritabanından arama/filtreleme/sayfalama hazırlanır. Her istekte tüm katalog yüklenmez. Canlı veritabanı yedekleme ve geri yükleme yöntemi belirlenir; GitHub kod ve sürüm geçmişini tutar.
4. **Hesapsız ziyaret geçmişi.** Görülen ve tıklanan oyunlar tarayıcıda sınırlı bir geçmiş olarak tutulur; kullanıcı bu geçmişi temizleyebilir. Başlangıçta cihaz/tarayıcıya özeldir; hesap açıldığında birleştirme davranışı ayrıca belirlenir.
5. **Değerlendirme sayısına göre güven.** Görünen gerçek puan değiştirilmeden, güvenilir oy sayısı sıralamada hesaba katılır. Tek değerlendirmeyle çok yüksek puan alan oyun, yeterli değerlendirmesi olan oyunların önüne otomatik geçmez. Oy sayısı bilinmiyorsa tahmin üretilmez.
6. **Yenilenen keşif sıralaması.** Çoğunlukla görülmemiş oyunlar, biraz zevke yakın öneri, yeni eklenen oyunlar ve beklenmedik keşifler dengelenir. Kişisel liste aynı gün sayfalama sırasında kararlı kalır, ertesi gün yenilenir; oyun/tür çeşitliliği korunur. Gündem sinyali sonraki aşamada bu yapıya eklenir.
7. **Yalnızca yöneticiye açık panel.** Oyun açıklaması, etiket, görsel ve görünürlük yönetimi; kimlik/puan eşleşmesi incelemesi; görev durumları ve hatalar eklenir. Yetki sunucuda doğrulanır. Elle yapılan düzenlemeler otomatik aktarımla ezilmez.
8. **Delta ile haftalık katalog genişletme.** Yeni PC oyunları kademeli eklenir; yalnızca yeni/değişmiş adaylar işlenir. Son başarılı tarama ve devam imleci tutulur. Yeni oyun ekleme ile mevcut veri güncelleme ayrılır; başarısızlıkta tekrar deneme, yinelenen kayıt koruması ve görev raporları hazırlanır. Yeni oyunların açıklama, kapak, etiket ve benzerlik kapsamı da kontrol edilir.
9. **Gündemde yükselen oyunları yakalama.** Haftalık ekleme görevinden bağımsız oyuncu/liste hareketleri ve haber taraması kurulur. Oyunun kendi geçmişine göre yükseliş, bağımsız sinyaller ve ilginin devamlılığı birlikte değerlendirilir. Katalog dışındaki adaylar da bulunur; gündem ağırlığı zamanla azalır ve beklenmedik keşiften ayrı tutulur.
10. **Alan adı ve gerçek yayına hazırlık.** Kendi alan adı bağlanır veya seçilen barındırmaya geçilir. Kullanıcı girişinin ve koleksiyonların bu ortamda çalışması, yönetici erişimi, mobil web görünümü, güvenlik, yedekleme ve görevlerin canlıya veri yazması doğrulanır. Alan adı seçimi/satın alma ve servis tercihleri bu aşamada yapılır.
11. **Mobil uygulama — her durumda en son.** Önce telefona kurulabilen PWA seçeneği değerlendirilir; ardından gerekirse Android/iOS uygulaması hazırlanır. Web ile ortak API/katalog/koleksiyon altyapısı kullanılır; giriş, dokunmatik gezinme, medya ve mağaza yayını uyarlanır. Önceki web/veri işleri tamamlanmadan mobil geliştirme öne alınmaz.

Her tamamlanan geliştirme uygun kontrollerle doğrulanır, GitHub'a anlamlı bir commit olarak gönderilir. Yeni açıklamalar ve commit mesajları Türkçe yazılır. GitHub kaynak değişikliği ile canlı veritabanı değişikliği ayrı izlenir.

## Eksik puanların ayrıntısı

- [ ] Eksik Metacritic kullanıcı puanlarını tamamla. Son doğrulanan durumda 1.323 oyunun 901'inde puan var; 422 kayıt eksik. Kimliği doğrulanmamış oyunları, puan kaynağında sayısal değer bulunmayanları ve çelişkili ilişkileri ayrı incele. Puan bulunabilen doğru oyun ve PC platformu kayıtlarını kalıcı ID'lerle bağla. Puanı olmayan veya doğrulanamayan oyunlar için değer üretme. Kaynak yaşı ve puan türü ayrı korunsun.

Bu iş, kullanıcının 6 Ekim 2026 talebiyle mevcut gezinme ve sabit metin düzeltmelerinden sonraya bırakıldı. Bu arayüz değişikliği puan verisini değiştirmez.

## Planlanan gündem taraması

- [ ] Aniden ilgi gören PC oyunlarını yakalayan düzenli gündem taraması geliştir. Haftalık katalog genişletme görevinden ayrı çalışsın. Başlangıç önerisi: oyuncu sayıları ve liste hareketleri için 4–6 saatte bir veri toplama, oyun haberleri için günlük tarama. Kesin sıklık kaynak erişimi ve maliyet değerlendirmesinde belirlensin.
- [ ] Oyuncu sayısı geçmişini oyun ID'siyle tut; yükselişi oyunun kendi geçmişine ve karşılaştırılabilir saatlere göre değerlendir. Mutlak oyuncu sayısı, artışın büyüklüğü ve devamlılığı birlikte hesaba katılsın; çok küçük tabanlardan gelen yüzde artışı tek başına yeterli olmasın.
- [ ] Liste hareketleri, oyuncu artışı ve bağımsız haber kaynaklarıyla gündem adaylarını doğrula. Tek duyuru veya kopyalanan haberler bağımsız doğrulama sayılmasın. Yeni çıkış, büyük güncelleme ve ücretsiz etkinlik gibi nedenleri ayırt et; gündemde olmayı beğenilme veya kaliteyle eşitleme.
- [ ] Mevcut kataloğun dışındaki adayları da bul; doğru oyun kimliği ve PC platformu doğrulandıktan sonra katalog ekleme sürecine al.
- [ ] Güncel yükselişleri "beklenmedik keşif" önerilerinden ayrı değerlendir. İlgi azaldıkça gündem ağırlığı düşsün, veri tazeliği takip edilsin ve aynı oyunlar sürekli öne çıkmasın. Günlük keşif listesi ile gündem alanının yenilenme davranışı uygulamada netleştirilsin.

7 Ekim 2026: Kullanıcı bu çalışmanın iş listesine eklenmesini istedi. Bu kayıt yalnızca planı kalıcılaştırır; tarama sistemi uygulanmadı ve zamanlanmış görev kurulmadı. Eksik Metacritic puanlarını tamamlama işi ilk öncelik olarak kalır.

## Planlanan delta aktarımı ve büyüme

- [ ] İlk kurulumdan sonraki oyun ekleme görevlerini delta mantığıyla tasarla. Her kaynağın son başarılı tarama zamanı, devam imleci ve çalışma durumu kalıcı veritabanında saklansın; her çalışmada tüm katalog yeniden indirilmesin veya modele okutulmasın.
- [ ] Steam için `IStoreService/GetAppList` uç noktasının `if_modified_since` filtresiyle yeni ve değişmiş adayları al; aynı taramanın sonraki sayfalarında `last_appid` devam imlecini kullan. `last_appid` tek başına yeni oyun tespit kuralı değildir. Bu yol bir Steam Web API anahtarı gerektirir; anahtar kaynak koduna veya GitHub'a yazılmasın. Resmî belge: https://partner.steamgames.com/doc/webapi/IStoreService?l=english (7 Ekim 2026).
- [ ] Aday kimliklerini mevcut kayıtlarla indeksli sorgularla karşılaştır. Kaynak ve kaynak oyun ID'si için benzersizlik sağlayan bir kimlik tablosu kullan; kalıcı site oyun ID'sini koru. Başlık üzerinden eşleştirme veya tüm oyun listesini belleğe yükleme kullanma.
- [ ] Yeni oyun ekleme, mevcut oyun bilgisini yenileme ve gündem ölçümü ayrı görevler olsun. Yeni oyun ekleme görevi yalnızca yeni adayların ayrıntılarını indirsin; mevcut oyunlardaki ilgili değişiklikler ayrı güncelleme kuyruğunda işlensin. Değişmeyen alanlar ve yönetici tarafından düzenlenmiş içerikler korunmalı. Steam'in mağaza değişim zamanını tüm kaynakların puan, etiket veya oyuncu sayısı değişimi için genel bir işaret olarak kabul etme.
- [ ] Veriler güvenle kaydedilmeden son başarılı tarama sınırını ilerletme. Aynı çalışma yeniden denenince kayıtlar çoğalmasın. Sayfa ve hata durumunu sakla; başarısız kayıtları tekrar deneme kuyruğuna al. Eşzamanlı görevleri kilitle; çalışma sırasında ve geç ulaşan kayıtları kaçırmamak için küçük bir tarih örtüşmesi kullan.
- [ ] Henüz yayımlanmamış veya ayrıntısı doğrulanamamış oyunları bekleyen adaylar olarak sakla. Yayımlanma ve PC uygunluğu sonradan doğrulandığında mevcut kaynak ID'siyle işleyebil. Delta sunmayan kaynaklar için yöntem ve kapsamı açıkça belirlenmiş daha seyrek tutarlılık kontrolleri planla.
- [ ] 100 bin oyun ölçeğine geçmeden çalışma kataloğunu indeksli veritabanından sunucu tarafında sayfalama, arama ve filtrelemeye taşı. Mevcut derleme girdisi JSON dosyaları ve tüm kataloğu döndüren uç nokta bu ölçek için hazır değildir. GitHub kod, şema ve sürüm geçmişini tutsun; günlük canlı kayıtların ana deposu veritabanı olsun, yedekleme ayrıca tasarlansın.
- [ ] Yeni oyunların etiketlerine bağlı benzerlik sonuçlarını seçici olarak güncelle; tüm oyun çiftlerini yeniden hesaplama. Ekleme, güncelleme, atlama, hata ve API çağrısı sayılarıyla görev süresi raporlansın.

7 Ekim 2026: Kullanıcı gelecekteki görevlerin delta mantığıyla çalışmasını istedi. Yukarıdaki maddeler uygulama gereksinimleridir; delta aktarımı, ölçekleme ve otomasyon henüz uygulanmadı.

## Proje dili

GitHub'daki proje açıklamaları, yeni commit mesajları, iş kayıtları ve değişiklik notları Türkçe yazılsın. Teknik kimlikler, API/alan adları, komutlar ve üçüncü tarafların özgün lisans metinleri korunur. Mevcut commit geçmişi yeniden yazılmaz.
