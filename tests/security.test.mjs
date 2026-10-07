import {strict as assert} from 'node:assert';import {normalize,validateLibrary,checkOrigin,safeUrl} from '../lib/security.ts';
assert.equal(normalize('KENSHI'),normalize('Kenshi'));assert.equal(normalize('İSTANBUL'),normalize('istanbul'));
assert.equal(safeUrl('javascript:alert(1)'),null);assert.equal(safeUrl('https://name:pass@example.com'),null);
assert.equal(checkOrigin(new Request('https://example.com/api',{headers:{origin:'https://evil.com'}})),false);
assert.equal(checkOrigin(new Request('https://example.com/api',{headers:{origin:'https://example.com'}})),true);
assert.throws(()=>validateLibrary({gameId:'valid-id',status:'admin',note:'',rating:null}));assert.throws(()=>validateLibrary({gameId:'../bad',status:'planned',note:'',rating:null}));assert.throws(()=>validateLibrary({gameId:'valid-id',status:'planned',note:'',rating:100}));assert.throws(()=>validateLibrary({gameId:'valid-id',status:'planned',note:'x'.repeat(1201),rating:null}));
assert.deepEqual(validateLibrary({gameId:'kenshi',status:'completed',note:'Harika',rating:5}),{gameId:'kenshi',status:'completed',note:'Harika',rating:5});console.log('Security validation passed.');
