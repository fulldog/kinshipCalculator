/**
 * 零依赖断言器。node tests/run.js
 */

var total = 0;
var failed = [];

function pad(s, n) {
  s = String(s);
  var w = 0;
  for (var i = 0; i < s.length; i++) w += s.charCodeAt(i) > 255 ? 2 : 1;
  var out = s;
  while (w < n) { out += ' '; w++; }
  return out;
}

function eq(actual, expected, desc) {
  total++;
  if (actual !== expected) {
    failed.push('  ✗ ' + desc + '\n      期望: ' + expected + '\n      实际: ' + actual);
  }
}

function ok(cond, desc) {
  total++;
  if (!cond) failed.push('  ✗ ' + desc);
}

var K = require('../core/index');

/**
 * 用例格式：[关系链, 自身性别, 期望正称, 期望反称, 期望档位]
 */
function runCases(list, label) {
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    var r = K.solve({ text: c[0], selfSex: c[1] });
    var tag = '[' + label + '] ' + c[0] + '（我是' + (c[1] === 'm' ? '男' : '女') + '）';
    eq(r.forward.text, c[2], tag + ' 正称');
    if (c[3]) eq(r.reverse.text, c[3], tag + ' 反称');
    if (c[4]) eq(r.forward.tier, c[4], tag + ' 档位');
  }
}

runCases(require('./cases.blood'), '血亲');
runCases(require('./cases.affine'), '姻亲');
runCases(require('./cases.reverse'), '反向');
runCases(require('./cases.fallback'), '回退');
runCases(require('./cases.parse'), '解析');
runCases(require('./cases.far'), '远房');
runCases(require('./cases.invalid'), '不存在');
require('./props')(eq, ok);
require('./lore.test')(eq, ok);

console.log('\n' + (total - failed.length) + '/' + total + ' 通过');
if (failed.length) {
  console.log('\n失败用例：\n' + failed.join('\n'));
  process.exit(1);
}
