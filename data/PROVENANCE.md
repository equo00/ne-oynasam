# İlk oyun kataloğunun veri kökeni

Veriler 5 Ekim 2026'da alındı. Bu ilk katalog, Wikidata üzerinden web arama/sayfa açma/metin bulma işlemleriyle alınmış 78 farklı gerçek video oyunu içerir. Katalogda kopyalanmış açıklamalar, değerlendirmeler, ekran görüntüleri veya üçüncü taraf görselleri bulunmaz.

`game-catalog-source.json` son ve sabit aktarım dosyasıdır. `sourceUrl` her Wikidata varlığına bağlantı verir; `sourceRetrievedAt` verinin alınma tarihini kaydeder. `sourceGenreValues` ve `sourcePlatformValues`, genel Türkçe tür etiketlerinin ve gruplanmış platformların türetildiği özgün İngilizce değerleri korur. Genel tür çevirisi, editoryal bir normalleştirmedir; ayrı bir kaynak iddiası değildir. Konsol nesilleri PlayStation/Xbox/Switch altında, Windows/macOS/Linux ise PC altında gruplanır.

`yearSource` yılın nasıl elde edildiğini belirtir. Yılların çoğu Wikidata varlığının açıklamasına dayanır; erken erişimi veya tam çıkışı temsil edebilir. Bu sütun kesin ilk çıkış veya satışa sunulma tarihi olarak etiketlenmemelidir.

RimWorld'ün 2018 yılı, alınan 17 Ekim 2018 tarihli 1.0 sürümü yayımlanma kaydından gelir; kullanımdan kaldırılmış 2016 kaydı dışarıda bırakılmıştır. Valheim için alınan güncel varlık açıklaması 2026 yılını belirtir; önceki 2021 erken erişim tarihi de kanıtlarda bulunur. Hades II'nin 2024 yılı erken erişimi temsil eder; kanıtlarda 25 Eylül 2025 tam çıkış tarihi de yer alır.

Platformlar alınan varlıktaki ifadeleri yansıtır ve duyurulmuş uyarlamaları da içerebilir. Mağazada şu anda satışta olunduğunu kanıtlamaz. Alınan metinler bazı değerleri içermiyorsa gruplanmış platform listeleri sınırlı kalır. `studio`, alınan ilk geliştirici adıdır; varlıkta birden fazla geliştirici bulunduğunda uyarlamayı yapan geliştirici olabilir (örneğin Terraria). Bazı Wikidata varlıklarında `Development Studio` gibi genel adlar görüntülenir; bunlardan marka adı çıkarımı yapılmamış veya ad uydurulmamıştır.

Resmî URL'ler varlıkların `official website` özelliğinden alınmıştır. Bazıları güncel satış sayfası yerine stüdyoya veya eski bir sayfaya gider. Erişilebilirlik ve fiyatlar test edilmemiştir. İlk katalogdaki 78 resmî URL alanının tamamı doludur.

Wikidata yapılandırılmış verileri CC0 kapsamındadır. İlgili lisans sayfası: https://www.wikidata.org/wiki/Wikidata:Licensing . Bu kapsam burada kullanılan yapılandırılmış bilgiler için geçerlidir; oyunları, görselleri, ekran görüntülerini, tanıtım metinlerini veya bağlantı verilen siteleri kapsamaz.

Kanıt dosyaları:

- `game-catalog-final-evidence.json`: Son alınan varlık sayfası metinleri; Abzu/Dave the Diver için alternatif arama sonuçları.
- `game-catalog-official-evidence.json`: Resmî web sitesi alanının alınmasına ait kayıtlar.
- `game-catalog-verified-pages.json`, `game-catalog-evidence.json`, `game-catalog-evidence2.json` ve `game-catalog-evidence3.json`: İnceleme için saklanan önceki veri alma girişimleri. İlk dosyalardaki oyun dışı sonuçlar ve yönlendirmeler, son aktarım öncesinde dışarıda bırakılmış veya düzeltilmiştir.
- `build_game_catalog.py`: Ayrıştırma/çeviri mantığı. Elle yapılan RimWorld tarih düzeltmesini ve resmî URL tamamlamasını, bu adımlar yeniden uygulanmadan tek başına üretmez.
