'use strict';
// Ne Oynasam's original 24px outline set. Shared stroke, caps and proportions.
const iconPaths={
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
 leaf:'<path d="M20 4c0 8-3 14-9 14a7 7 0 0 1-7-7C4 5 12 4 20 4Z"/><path d="M4 20 15 9"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
 flame:'<path d="M13 3c1 5 6 6 6 11a7 7 0 0 1-14 0c0-3 2-6 5-8 0 3 1 4 2 4 2-2 1-5 1-7Z"/><path d="M12 13c-2 2-3 3-3 5a3 3 0 0 0 6 0c0-2-1-3-3-5Z"/>',
 book:'<path d="M12 6v15M3 4c3-1 6 0 9 2 3-2 6-3 9-2v15c-3-1-6 0-9 2-3-2-6-3-9-2Z"/><path d="M6 8c1 0 2 .3 3 1M15 9c1-.7 2-1 3-1"/>',
 puzzle:'<path d="M4 8h5c-1-3 0-5 2-5s3 2 2 5h7v5c-3-1-5 0-5 2s2 3 5 2v3h-7c1-3 0-5-2-5s-3 2-2 5H4Z"/>',
 sparkle:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
 shuffle:'<path d="M3 6h3c6 0 6 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4"/>',
 moon:'<path d="M20.5 13A9 9 0 1 1 11 3a7 7 0 0 0 9.5 10Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 external:'<path d="M9 4H4v16h16v-5M13 4h7v7M10 14 20 4"/>',
 upRight:'<path d="M6 18 18 6M6 6h12v12"/>',
 left:'<path d="m14 5-7 7 7 7"/>',right:'<path d="m10 5 7 7-7 7"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12 4 4L19 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
 refresh:'<path d="M20 9a8 8 0 1 0 0 6M20 3v6h-6"/>',
 compare:'<path d="M12 3v18M3 7h6v10H3Zm12 0h6v10h-6Z"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 play:'<path d="m8 4 12 8-12 8Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
function icon(name){return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconPaths[name]||iconPaths.compass}</svg>`;}
function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
