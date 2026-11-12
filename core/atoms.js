/**
 * 关系原子定义
 * 12 个原子覆盖全部中文亲属关系的构建块。
 * BQ / ZQ 用于表达「长幼未知」的兄弟/姐妹（文字输入"姑姑""舅舅""兄弟"时必然出现）。
 */

var ATOM = {
  F:  { k: 'F',  sex: 'm', sen: null,      rel: 'up',     sib: false, name: '爸爸', alias: ['父亲', '爹', '老爸', '父'] },
  M:  { k: 'M',  sex: 'f', sen: null,      rel: 'up',     sib: false, name: '妈妈', alias: ['母亲', '娘', '老妈', '母'] },
  S:  { k: 'S',  sex: 'm', sen: null,      rel: 'down',   sib: false, name: '儿子', alias: ['儿'] },
  D:  { k: 'D',  sex: 'f', sen: null,      rel: 'down',   sib: false, name: '女儿', alias: ['闺女'] },
  H:  { k: 'H',  sex: 'm', sen: null,      rel: 'spouse', sib: false, name: '老公', alias: ['丈夫', '先生', '爱人'] },
  W:  { k: 'W',  sex: 'f', sen: null,      rel: 'spouse', sib: false, name: '老婆', alias: ['妻子', '太太'] },
  OB: { k: 'OB', sex: 'm', sen: 'elder',   rel: 'sib',    sib: true,  name: '哥哥', alias: ['哥', '兄长'] },
  YB: { k: 'YB', sex: 'm', sen: 'younger', rel: 'sib',    sib: true,  name: '弟弟', alias: ['弟', '兄弟'] },
  OZ: { k: 'OZ', sex: 'f', sen: 'elder',   rel: 'sib',    sib: true,  name: '姐姐', alias: ['姐', '姐' ] },
  YZ: { k: 'YZ', sex: 'f', sen: 'younger', rel: 'sib',    sib: true,  name: '妹妹', alias: ['妹'] },
  BQ: { k: 'BQ', sex: 'm', sen: 'unk',     rel: 'sib',    sib: true,  name: '兄弟', alias: [] },
  ZQ: { k: 'ZQ', sex: 'f', sen: 'unk',     rel: 'sib',    sib: true,  name: '姐妹', alias: [] }
};

var KEYS = ['F', 'M', 'S', 'D', 'H', 'W', 'OB', 'YB', 'OZ', 'YZ', 'BQ', 'ZQ'];

/** 构造一个链上原子。mi = mayBeIdentical，标记"这一步有可能是同一个人" */
function mk(k, mi) {
  return { k: k, mi: !!mi };
}

function sexOf(k) { return ATOM[k] ? ATOM[k].sex : null; }
function senOf(k) { return ATOM[k] ? ATOM[k].sen : null; }
function nameOf(k) { return ATOM[k] ? ATOM[k].name : ''; }

function isUp(k) { return k === 'F' || k === 'M'; }
function isDown(k) { return k === 'S' || k === 'D'; }
function isSib(k) { return k === 'OB' || k === 'YB' || k === 'OZ' || k === 'YZ' || k === 'BQ' || k === 'ZQ'; }
function isSpouse(k) { return k === 'H' || k === 'W'; }

/** 性别 + 长幼 → 兄弟姐妹原子码 */
function sibCode(sex, sen) {
  if (sex === 'm') {
    if (sen === 'elder') return 'OB';
    if (sen === 'younger') return 'YB';
    return 'BQ';
  }
  if (sen === 'elder') return 'OZ';
  if (sen === 'younger') return 'YZ';
  return 'ZQ';
}

/** 长幼合成：兄之兄=兄、弟之弟=弟，其余无法确定 */
function composeSen(a, b) {
  if (a && b && a === b && a !== 'unk') return a;
  return 'unk';
}

/** 链上原子序列 → 中文链文本，如 ['F','OB'] → '爸爸的哥哥' */
function chainText(atoms) {
  if (!atoms || !atoms.length) return '你';
  var parts = [];
  for (var i = 0; i < atoms.length; i++) parts.push(nameOf(atoms[i].k));
  return parts.join('的');
}

module.exports = {
  ATOM: ATOM,
  KEYS: KEYS,
  mk: mk,
  sexOf: sexOf,
  senOf: senOf,
  nameOf: nameOf,
  isUp: isUp,
  isDown: isDown,
  isSib: isSib,
  isSpouse: isSpouse,
  sibCode: sibCode,
  composeSen: composeSen,
  chainText: chainText
};
