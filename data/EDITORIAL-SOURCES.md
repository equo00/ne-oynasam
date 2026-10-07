# Oyuna özgü Türkçe keşif metinleri — 6 Ekim 2026

`public/editorial.json`, mevcut PC kataloğundaki 1.323 oyun kimliğinin tamamını kapsar. Her katalog kartı, oyunun gerçek konusu, mekaniği veya dünyasına bağlı, farklı ve özgün bir Türkçe keşif cümlesine sahiptir. Kenshi, Valheim, Cyberpunk 2077 ve Stardew Valley dahil güncel katalog adlarıyla eşleşen, önceden yazılmış 37 merak uyandırıcı cümle korunmuştur. Uzun açıklaması bulunmayan kayıtlarda genel bir katalog paragrafı yerine mevcut keşif cümlesi kullanılır; yeni araştırılmış kayıtlarda özgün kısa açıklama bulunur.

Araştırmada oyun adı/uygulama kimliğiyle eşleştirilmiş 1.323 bilgi profili kullanıldı: önceden indirilmiş 4 Ekim 2026 leinstay/steamdb veri kopyasından 1.215 açıklama ve yayıncıların herkese açık mağaza yanıtlarından başarıyla eşleştirilmiş 108 açıklama. Kısa slogan veya güncelleme duyurusu içeren kayıtlar için yayıncılardan 90 daha kapsamlı açıklama alındı. Super Hexagon'un engel mekaniği, Apple'ın resmî App Store yazısıyla da kontrol edildi: https://apps.apple.com/us/mac/story/id1467792429 .

Araştırma girdileri, yayıncı metinlerinin toplu kopyası olarak yeniden yayımlanmaz. `editorial-provenance.json` her oyunun asıl kimliğini, araştırma URL'sini/tarihini ve sitenin mevcut keşif cümlesinin korunup korunmadığını saklar. `EDITORIAL-REPORT.json` kapsam ve yinelenen metin kontrollerini kaydeder.

İçerik, uygulama kimliği ve normalleştirilmiş asıl oyun adıyla eşleştirilir; özgün alternatif adlar için bir başlık indeksi bulunur. Mağaza bilgileri yenilenirken editoryal katman kullanılmaya devam eder; ham tür listeleri bu metni ezemez. JSON isteğinde yayına özel önbellek anahtarı vardır. Gelecekte onaylı metni bulunmayan bir oyun için otomatik üretilmiş genel tür cümlesi yerine açıklamanın eksik olduğu belirtilir.

Oyun ekranlarında dünya/oynanış etiketleri, galeri yükleme, öneri sayfaları ve olumlu mağaza değerlendirme yüzdeleri için tarafsız ürün ifadeleri kullanılır. Teknik kaynak adları, kaynak ağırlığı ipuçları ve dışarıdaki benzer oyunlara giden bağlantı oyun ekranlarından kaldırılmıştır. Steam kaynaklı öneri sıralaması, tarihli Metacritic kullanıcı puanları ve medya istekleri mevcut davranışını korur.

Sağlayıcının açıkça belirtilmesi, GPL alt kümesinin lisans/kaynak indirmeleri ve oynatıcı lisansı `/lisanslar.html` sayfasında tutulur. Gizlilik bilgisi, dış kaynaklara yapılan medya isteklerini açıklar.

Doğrulama; kataloğun tam kapsamını, asıl kimlikleri, farklı keşif cümlelerini, önceki genel tür şablonunun kaldırılmasını, ekranda tarafsız ifadeleri, site içi öneri gezinmesini, karşılaştırmayı, not/koleksiyon işlemlerini, medya seçimini ve güvenli metin gösterimini kontrol eder. Mevcut API/kaynak/öneri testleri de geçerlidir. Yönetilen ortamda tarayıcıyla kalite kontrol yeteneği bulunmadığından gerçek tarayıcıda görsel inceleme yapıldığı iddia edilmez.
