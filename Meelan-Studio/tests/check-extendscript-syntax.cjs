// Conservative source checks, not an Adobe ExtendScript runtime.
const fs = require('fs');
let acorn;
try { acorn = require('acorn'); } catch (_) {
  // Node 24 embeds Acorn. No download is needed in the development environment.
  const source = process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'];
  if (!source) throw Error('Install the acorn dev dependency to run syntax checks on this Node build.');
  const mod = {exports: {}};
  new Function('exports', 'module', source)(mod.exports, mod);
  acorn = mod.exports;
}
function check(source) {
  const tokens = [];
  acorn.parse(source, {ecmaVersion: 3, locations: true, onToken: tokens});
  for (const token of tokens) {
    if (token.type.label !== 'regexp') continue;
    const pattern = token.value.pattern;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '\\') { i++; continue; }
      if (pattern[i] === '/') {
        throw Error('ExtendScript compatibility: unescaped regex slash at line ' + token.loc.start.line);
      }
    }
  }
  return true;
}
module.exports = check;
if (require.main === module) {
  check(fs.readFileSync(process.argv[2], 'utf8'));
  console.log('PASS ES3 grammar and conservative regex delimiter check (not desktop AE).');
}
