/**
 * 一致性审计（不是单元测试，跑得比 run.js 慢，用来防系统性退化）
 *
 *   node tests/audit.js
 *
 * 三件事：
 *   1. 穷举 4 层以内的关系链，检查「正反互还原」——A 叫我 X，从 X 的角度再算一遍必须回到同一句
 *   2. 统计纯血亲（归约后不含配偶）里退化成描述式的比例
 *   3. 检查任何一条链都不会抛错、不会产出 undefined
 */

var K = require('../core/index');
var A = require('../core/atoms');

var SET = ['F', 'M', 'OB', 'YB', 'OZ', 'YZ', 'S', 'D', 'H', 'W'];
var MAX_DEPTH = 4;

var total = 0;
var desc = 0;
var pureBloodDesc = [];
var broken = [];
var crashed = [];

function check(atoms) {
  total++;
  var r;
  try {
    r = K.solve({ atoms: atoms, selfSex: 'm' });
  } catch (e) {
    crashed.push([A.chainText(atoms), e.message]);
    return;
  }

  if (!r.forward.text || !r.reverse.text ||
      /undefined|null/.test(r.forward.text) || /undefined|null/.test(r.reverse.text)) {
    crashed.push([A.chainText(atoms), '文本异常']);
    return;
  }

  if (r.invalid) {
    // 现实中不存在的关系：只需保证不抛错、文本干净，不参与正反互还原
    if (!r.forward.text || /undefined|null/.test(r.forward.text)) {
      crashed.push([A.chainText(atoms), 'invalid 文本异常']);
    }
    return;
  }

  var back = K.solve({ atoms: r.revAtoms, selfSex: r.revSelfSex });
  if (back.forward.text !== r.reverse.text) {
    broken.push([A.chainText(atoms), r.forward.text, r.reverse.text, back.forward.text]);
  }

  if (r.forward.tier === 'descriptive') {
    desc++;
    var inLaw = r.atoms.some(function (a) { return a.k === 'H' || a.k === 'W'; });
    if (!inLaw) pureBloodDesc.push([A.chainText(r.atoms), r.forward.text]);
  }
}

function walk(atoms, depth) {
  if (atoms.length === depth) { check(atoms); return; }
  for (var i = 0; i < SET.length; i++) {
    atoms.push(A.mk(SET[i]));
    walk(atoms, depth);
    atoms.pop();
  }
}

var t0 = Date.now();
for (var d = 1; d <= MAX_DEPTH; d++) walk([], d);
var ms = Date.now() - t0;

console.log('枚举 ' + total + ' 条链，耗时 ' + ms + 'ms');
console.log('  描述式（无标准称呼）: ' + desc + ' 条，占 ' + (desc / total * 100).toFixed(1) + '%');
console.log('  其中纯血亲: ' + pureBloodDesc.length + ' 条');
console.log('  正反不一致: ' + broken.length + ' 条');
console.log('  异常: ' + crashed.length + ' 条');

if (pureBloodDesc.length) {
  console.log('\n纯血亲无称呼（应尽量清零）：');
  var seen = {};
  pureBloodDesc.forEach(function (x) {
    if (seen[x[0]]) return;
    seen[x[0]] = 1;
    console.log('  ' + x[0] + '  =>  ' + x[1]);
  });
}

if (broken.length) {
  console.log('\n正反不一致：');
  broken.slice(0, 20).forEach(function (b) {
    console.log('  ' + b[0] + ' => ' + b[1] + ' | 反: ' + b[2] + ' | 再反: ' + b[3]);
  });
}

if (crashed.length) {
  console.log('\n异常：');
  crashed.slice(0, 20).forEach(function (c) { console.log('  ' + c[0] + ' -> ' + c[1]); });
}

var fail = broken.length + crashed.length + pureBloodDesc.length;
process.exit(fail ? 1 : 0);
