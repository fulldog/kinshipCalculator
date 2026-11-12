/**
 * 展示层数据构造：页面参数编解码、路径节点、复制文案
 * 分享用原子码而非中文，避免 URL 编码膨胀与歧义。
 */

var A = require('./atoms');

function toQuery(atoms, selfSex) {
  var parts = [];
  for (var i = 0; i < atoms.length; i++) {
    parts.push(atoms[i].k + (atoms[i].mi ? '~' : ''));
  }
  return 'c=' + parts.join(',') + '&s=' + selfSex;
}

function fromQuery(q) {
  q = q || {};
  var raw = q.c ? String(q.c).split(',') : [];
  var atoms = [];
  for (var i = 0; i < raw.length; i++) {
    var s = raw[i];
    if (!s) continue;
    var mi = s.charAt(s.length - 1) === '~';
    if (mi) s = s.substr(0, s.length - 1);
    if (A.ATOM[s]) atoms.push(A.mk(s, mi));
  }
  return { atoms: atoms, selfSex: q.s === 'f' ? 'f' : 'm' };
}

/** 关系路径节点：你 › 爸爸 › 哥哥 */
function pathItems(atoms, startLabel) {
  var out = [{ label: startLabel || '你' }];
  for (var i = 0; i < atoms.length; i++) {
    out.push({ label: A.nameOf(atoms[i].k) });
  }
  return out;
}

function aliasLine(term) {
  if (!term.alias || !term.alias.length) return '';
  return term.alias.join(' · ');
}

function copyText(result) {
  var lines = [];
  lines.push('我该叫他：' + result.forward.text + (aliasLine(result.forward) ? '（' + aliasLine(result.forward) + '）' : ''));
  lines.push('他该叫我：' + result.reverse.text);
  lines.push('关系：' + result.chainText);
  lines.push('（来自「亲戚称呼计算器」小程序）');
  return lines.join('\n');
}

module.exports = {
  toQuery: toQuery,
  fromQuery: fromQuery,
  pathItems: pathItems,
  aliasLine: aliasLine,
  copyText: copyText
};
