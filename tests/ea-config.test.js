// Checks that every JSON path the Universal EA reads exists in the strategy file
// (so app and EA always use the same config). Run: node tests/ea-config.test.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const eaFile = fs.readdirSync(path.join(root, 'ea')).filter(f => /^SAMU Universal EA v[\d.]+\.mq5$/.test(f)).sort().pop();
const src = fs.readFileSync(path.join(root, 'ea', eaFile), 'utf8');
const st = JSON.parse(fs.readFileSync(path.join(root, 'strategies/step-basket.json'), 'utf8'));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  → ' + info : '')); if (!cond) fails++; };
const has = (o, p) => p.split('.').reduce((a, k) => (a != null && Object.prototype.hasOwnProperty.call(a, k)) ? a[k] : undefined, o) !== undefined;

// fixed paths: JStr/JNum/JBool/JHas(root, "a.b")
const fixed = [...src.matchAll(/J(?:Str|Num|Bool|Has)\(root,\s*"([^"]+)"/g)].map(m => m[1]);
const missing = fixed.filter(p => !has(st, p));
ok('EA (' + eaFile + ') ke ' + fixed.length + ' fixed JSON paths strategy file mein hain', missing.length === 0, missing.join(', '));
// preset paths: pp + ".x"
const presetKeys = [...src.matchAll(/pp \+ "\.([^"]+)"/g)].map(m => m[1]);
Object.entries(st.basket.presets).forEach(([k, p]) => {
  const miss = presetKeys.filter(x => !(x.split('.')[0] in p));
  ok('Preset ' + k + ' mein EA ke saare keys', miss.length === 0, miss.join(', '));
});
// lot rows
ok('Lot rows: from/to/lot', st.lots.every(r => 'from' in r && 'to' in r && 'lot' in r));
// EA version in file name == EA_VERSION define
const v = (src.match(/#define EA_VERSION "([^"]+)"/) || [])[1];
ok('File name version = EA_VERSION', eaFile.includes(v + '.mq5'), v);
// built-in strategy inside the EA == strategies/step-basket.json
{
  const body = (src.split('string BuiltinStrategy()')[1] || '').split('return s;')[0];
  const lits = [...body.matchAll(/s \+= "((?:\\.|[^"\\])*)";/g)].map(m => m[1]);
  let built = null;
  try { built = JSON.parse(lits.map(x => JSON.parse('"' + x + '"')).join('')); } catch (e) {}
  ok('EA ki built-in strategy = strategies/step-basket.json', built && JSON.stringify(built) === JSON.stringify(st), built ? '' : 'parse fail');
}
// source must stay ASCII (MetaEditor encoding safe)
ok('EA source sirf ASCII', !/[^\x00-\x7F]/.test(src));
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
