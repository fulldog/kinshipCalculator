/**
 * 统一入口
 * solve({ atoms | text, selfSex, ageHint }) → 正向 + 反向 + 路径数据
 */

var A = require('./atoms');
var REDUCE = require('./reduce');
var SIG = require('./signature');
var INVERT = require('./invert');
var DESCRIBE = require('./describe');
var NAME = require('./name');
var LORE = require('./lore');
var PARSER = require('./parse');

function literal(atoms) {
  if (!atoms || !atoms.length) return NAME.term('自己', 'exact', ['我']);
  return NAME.term('你' + A.chainText(atoms), 'descriptive');
}

/** 现实中不存在的关系（老婆的老婆、男生点老公）：给出明确拒绝，绝不念胡话 */
function invalidResult(word, note, red, selfSex, ageHint, parsed) {
  var t = NAME.term('没有这种亲戚关系', 'invalid');
  t.note = note;
  return {
    selfSex: selfSex,
    ageHint: ageHint,
    atoms: red,
    chainText: red ? A.chainText(red) : '',
    sigKey: '',
    forward: t,
    reverse: t,
    revAtoms: [],
    revChainText: '他',
    revSelfSex: selfSex,
    parsed: parsed,
    invalid: true,
    invalidWord: word,
    blocked: false,
    blockedWords: [],
    ambiguousWords: []
  };
}

function spouseWord(red) {
  var n = red.length;
  return n >= 2
    ? A.nameOf(red[n - 2].k) + '的' + A.nameOf(red[n - 1].k)
    : A.chainText(red);
}

function flipHint(h) {
  if (h === 'elder') return 'younger';
  if (h === 'younger') return 'elder';
  return null;
}

function solve(input) {
  input = input || {};
  var selfSex = input.selfSex === 'f' ? 'f' : 'm';
  var parsed = null;
  var atoms = input.atoms;

  if (!atoms) {
    parsed = PARSER.parse(input.text);
    atoms = parsed.atoms;
  }

  var ageHint = input.ageHint || null;

  // 第一位是配偶且与自身性别冲突：男生没有「老公」，女生没有「老婆」
  if (atoms.length && A.isSpouse(atoms[0].k)) {
    var want0 = atoms[0].k === 'H' ? 'f' : 'm';
    if (selfSex !== want0) {
      var w0 = A.nameOf(atoms[0].k);
      return invalidResult(
        w0,
        (selfSex === 'm' ? '男生' : '女生') + '没有「' + w0 + '」。要查对方那边的亲戚，先把「我是」换一下',
        null, selfSex, ageHint, parsed
      );
    }
  }

  var red = REDUCE.reduce(atoms, selfSex);
  if (red.invalid) {
    var w = spouseWord(red);
    return invalidResult(w, '「' + w + '」在现实中不存在，检查一下是不是点错了', red, selfSex, ageHint, parsed);
  }
  var sig = SIG.toSignature(red, selfSex);
  var forward = DESCRIBE.describe(sig, { ageHint: ageHint }) || literal(red);
  forward.lore = LORE.lookup(forward.text);

  var sexes = INVERT.chainSexes(red, selfSex);
  var revSelfSex = sexes[sexes.length - 1] || selfSex;
  var revAtoms = INVERT.invertAtoms(red, selfSex);
  var revRed = REDUCE.reduce(revAtoms, revSelfSex);
  var revSig = SIG.toSignature(revRed, revSelfSex);
  var reverse = DESCRIBE.describe(revSig, { ageHint: flipHint(ageHint) }) || literal(revRed);

  return {
    selfSex: selfSex,
    ageHint: ageHint,
    atoms: red,
    chainText: red.length ? A.chainText(red) : '你',
    sigKey: SIG.sigKey(sig),
    forward: forward,
    reverse: reverse,
    revAtoms: revRed,
    revChainText: revRed.length ? A.chainText(revRed) : '他',
    revSelfSex: revSelfSex,
    parsed: parsed,
    // 文字里有认不出/故意拦下的词时，这个答案只是"能识别那一部分"的结果，
    // 页面必须先拦下，不能拿它当结论。
    blocked: !!(parsed && !parsed.ok),
    blockedWords: parsed ? parsed.unknown.concat(parsed.unsupported) : [],
    ambiguousWords: parsed ? parsed.ambiguous : []
  };
}

/** 追加一个原子后链是否仍然现实可行（供键盘置灰用） */
function canAppend(atoms, k, selfSex) {
  return !REDUCE.validate(atoms.concat([A.mk(k, false)]), selfSex);
}

/** 校验链是否现实可行。返回 null 或 { type, word } */
function check(atoms, selfSex) {
  return REDUCE.validate(atoms, selfSex);
}

module.exports = {
  solve: solve,
  literal: literal,
  flipHint: flipHint,
  canAppend: canAppend,
  check: check
};
