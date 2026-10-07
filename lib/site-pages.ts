import html from '../public/index.html?raw';

export function sitePage(view: 'discover' | 'library') {
  if (view === 'discover') return html;
  const intro = `<section class="collection-intro" aria-labelledby="collectionHeading"><a class="collection-back" href="/">← Keşfete dön</a><h1 id="collectionHeading">Koleksiyonum.</h1><p>Oynayacakların, bitirdiklerin ve kendi notların. Hepsi sana ait bir yerde.</p></section>`;
  return html
    .replace('data-page="discover"', 'data-page="library"')
    .replace('<title>Ne Oynasam? — Bir sonraki dünyanı bul.</title>', '<title>Koleksiyonum · Ne Oynasam?</title>')
    .replace('id="discover" class="nav active" aria-current="page"', 'id="discover" class="nav"')
    .replace('id="mylist" class="nav"', 'id="mylist" class="nav active" aria-current="page"')
    .replace(/<!-- discovery:start -->[\s\S]*?<!-- discovery:end -->/, intro)
    .replace(/<!-- home-promo:start -->[\s\S]*?<!-- home-promo:end -->/, '')
    .replace('id="sectionEyebrow">PC KEŞİF RADARI', 'id="sectionEyebrow">SANA AİT DÜNYALAR')
    .replace('id="listTitle">Oynayacak bir şey var.', 'id="listTitle">Kaydettiğin oyunlar.')
    .replace('placeholder="Oyun, tür veya geliştirici ara…"', 'placeholder="Koleksiyonunda ara…"')
    .replaceAll('data-discovery-only', 'data-discovery-only hidden');
}

export function siteResponse(view: 'discover' | 'library') {
  return new Response(sitePage(view), {headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-cache',
  }});
}
