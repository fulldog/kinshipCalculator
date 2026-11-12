var K = require('../core/index');
var A = require('../core/atoms');
var keys = A.KEYS;
var bad = 0, slow = 0, maxms = 0;
var tiers = {};
for (var n = 0; n < 1000; n++) {
  var len = 1 + Math.floor(Math.random() * 6);
  var atoms = [];
  for (var i = 0; i < len; i++) atoms.push(A.mk(keys[Math.floor(Math.random() * keys.length)], Math.random() < 0.2));
  var sex = Math.random() < 0.5 ? 'm' : 'f';
  var t0 = Date.now();
  try {
    var r = K.solve({ atoms: atoms, selfSex: sex });
    var ms = Date.now() - t0;
    if (ms > maxms) maxms = ms;
    if (ms > 5) slow++;
    tiers[r.forward.tier] = (tiers[r.forward.tier] || 0) + 1;
    ['exact','variant','ambiguous','descriptive','invalid'].indexOf(r.forward.tier) < 0 && (console.log('BAD TIER', r.forward), bad++);
    if (!r.forward.text || /undefined|null/.test(r.forward.text)) { console.log('BAD TEXT', A.chainText(atoms), JSON.stringify(r.forward)); bad++; }
    if (!r.reverse.text || /undefined|null/.test(r.reverse.text)) { console.log('BAD REV', A.chainText(atoms), JSON.stringify(r.reverse)); bad++; }
  } catch (e) {
    bad++;
    console.log('THROW', A.chainText(atoms), e.message);
  }
}
console.log('bad=', bad, 'slow=', slow, 'maxms=', maxms, 'tiers=', JSON.stringify(tiers));
