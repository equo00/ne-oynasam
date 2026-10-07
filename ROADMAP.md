# Sıradaki çalışma

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
