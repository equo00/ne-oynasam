import fs from 'node:fs';
const version=JSON.parse(fs.readFileSync('node_modules/hls.js/package.json','utf8')).version;
if(version!=='1.7.3')throw new Error('Review the playback bundle version before replacing it.');
fs.mkdirSync('public/vendor',{recursive:true});
fs.copyFileSync('node_modules/hls.js/dist/hls.min.js','public/vendor/hls-1.7.3.min.js');
fs.copyFileSync('node_modules/hls.js/LICENSE','public/vendor/hls-LICENSE.txt');
