/**
 * 文字链解析
 * "爸爸的哥哥" → [F, OB]
 * 支持一词多原子（爷爷 = F,F）、分隔符容错、"我"前缀剥离。
 *
 * 两条铁律：
 *   1. 未识别的字必须报出来，绝不整段丢弃后假装算出了答案。
 *   2. 「堂/表」开头的词不含方向信息（取决于父系母系），整词拦下提示用户，
 *      否则"爸爸的表哥"会被贪婪切成"爸爸 + 哥"，静默算出个"伯父"。
 */

var A = require('./atoms');

var WORDS = {
  // 父母
  '爸爸': ['F'], '父亲': ['F'], '老爸': ['F'], '爹': ['F'],
  '妈妈': ['M'], '母亲': ['M'], '老妈': ['M'], '娘': ['M'],
  // 兄弟姐妹
  '哥哥': ['OB'], '大哥': ['OB'], '哥': ['OB'],
  '弟弟': ['YB'], '弟': ['YB'],
  '姐姐': ['OZ'], '大姐': ['OZ'], '姐': ['OZ'],
  '妹妹': ['YZ'], '妹': ['YZ'],
  // 配偶
  '丈夫': ['H'], '老公': ['H'], '先生': ['H'], '爱人': ['H'],
  '妻子': ['W'], '老婆': ['W'], '太太': ['W'],
  // 子女
  '儿子': ['S'], '女儿': ['D'],
  // 祖辈
  '爷爷': ['F', 'F'], '祖父': ['F', 'F'],
  '奶奶': ['F', 'M'], '祖母': ['F', 'M'],
  '外公': ['M', 'F'], '姥爷': ['M', 'F'], '外祖父': ['M', 'F'],
  '外婆': ['M', 'M'], '姥姥': ['M', 'M'], '外祖母': ['M', 'M'],
  // 曾祖辈
  '曾祖父': ['F', 'F', 'F'], '太爷爷': ['F', 'F', 'F'],
  '曾祖母': ['F', 'F', 'M'], '太奶奶': ['F', 'F', 'M'],
  '曾外祖父': ['M', 'M', 'F'], '太姥爷': ['M', 'M', 'F'], '太外公': ['M', 'M', 'F'],
  '曾外祖母': ['M', 'M', 'M'], '太姥姥': ['M', 'M', 'M'], '太外婆': ['M', 'M', 'M'],
  // 高祖辈
  '高祖父': ['F', 'F', 'F', 'F'], '高祖': ['F', 'F', 'F', 'F'],
  '老太爷': ['F', 'F', 'F', 'F'], '高爷爷': ['F', 'F', 'F', 'F'],
  '高祖母': ['F', 'F', 'F', 'M'], '老太奶': ['F', 'F', 'F', 'M'], '高奶奶': ['F', 'F', 'F', 'M'],
  // 父母的兄弟姐妹
  '伯父': ['F', 'OB'], '伯伯': ['F', 'OB'], '大伯': ['F', 'OB'], '大爷': ['F', 'OB'],
  '叔叔': ['F', 'YB'], '叔父': ['F', 'YB'],
  '姑妈': ['F', 'ZQ'], '姑姑': ['F', 'ZQ'], '姑母': ['F', 'ZQ'],
  '舅舅': ['M', 'BQ'], '舅父': ['M', 'BQ'],
  '姨妈': ['M', 'ZQ'], '姨母': ['M', 'ZQ'], '阿姨': ['M', 'ZQ'],
  // 姻亲
  '嫂子': ['OB', 'W'], '嫂嫂': ['OB', 'W'],
  '弟媳': ['YB', 'W'], '弟妹': ['YB', 'W'],
  '姐夫': ['OZ', 'H'], '妹夫': ['YZ', 'H'],
  '儿媳': ['S', 'W'], '女婿': ['D', 'H'],
  '公公': ['H', 'F'], '婆婆': ['H', 'M'],
  '岳父': ['W', 'F'], '岳母': ['W', 'M'],
  '大伯子': ['H', 'OB'], '小叔子': ['H', 'YB'],
  '大姑子': ['H', 'OZ'], '小姑子': ['H', 'YZ'],
  '大舅子': ['W', 'OB'], '小舅子': ['W', 'YB'],
  '大姨子': ['W', 'OZ'], '小姨子': ['W', 'YZ'],
  // 侄甥孙
  '侄子': ['BQ', 'S'], '侄女': ['BQ', 'D'],
  '外甥': ['ZQ', 'S'], '外甥女': ['ZQ', 'D'],
  '孙子': ['S', 'S'], '孙女': ['S', 'D'],
  '外孙': ['D', 'S'], '外孙女': ['D', 'D'],
  '曾孙': ['S', 'S', 'S'], '曾孙女': ['S', 'S', 'D'],
  '玄孙': ['S', 'S', 'S', 'S'], '玄孙女': ['S', 'S', 'S', 'D'],
  '外曾孙': ['D', 'S', 'S'], '外曾孙女': ['D', 'S', 'D'],
  '侄孙': ['BQ', 'S', 'S'], '侄孙女': ['BQ', 'S', 'D'],
  '外甥孙': ['ZQ', 'S', 'S'], '外甥孙女': ['ZQ', 'S', 'D'],
  // 长幼未知
  '兄弟': ['BQ'], '姐妹': ['ZQ']
};

var SEPARATORS = '的之→>-—,，、/　 ';

// 「堂/表」后面可能跟的辈分字，用于整词拦截
var COUSIN_TAILS = '哥弟姐妹伯叔姑舅姨侄甥外祖爷奶公婆兄嫂弟媳父';

/**
 * 各地指的不是同一个人的词。不能猜，猜错就是给用户一个错亲戚。
 * 值里写清可能的几种含义，让用户自己说清是哪一边。
 */
var AMBIGUOUS = {
  '舅公': '外婆的哥哥，或奶奶的哥哥',
  '舅爷': '外婆的哥哥，或奶奶的哥哥',
  '舅爷爷': '外婆的哥哥，或奶奶的哥哥',
  '姑婆': '爷爷的姐姐，或外公的姐姐',
  '姑奶奶': '爷爷的姐姐，或外公的姐姐',
  '伯公': '爷爷的哥哥，或外公的哥哥',
  '叔公': '爷爷的弟弟，或外公的弟弟',
  '伯爷爷': '爷爷的哥哥，或外公的哥哥',
  '叔爷爷': '爷爷的弟弟，或外公的弟弟',
  '媳妇': '老婆，有些地方指儿媳妇',
  '丈人': '岳父，有些地方指公公'
};

function matchAmbiguous(s, i) {
  for (var len = 3; len >= 2; len--) {
    var w = s.substr(i, len);
    if (w.length === len && AMBIGUOUS.hasOwnProperty(w)) return w;
  }
  return '';
}

/**
 * 吃掉一个「堂/表」开头的称谓词，如 堂哥、表舅、表外甥女。
 * 返回整词（至少含"堂"或"表"本身），由调用方记为不支持。
 */
function matchCousinWord(s, i) {
  var ch = s.charAt(i);
  if (ch !== '堂' && ch !== '表') return '';
  var n = 1;
  while (n < 4 && i + n < s.length && COUSIN_TAILS.indexOf(s.charAt(i + n)) >= 0) n++;
  return s.substr(i, n);
}

function parse(text) {
  var s = String(text === undefined || text === null ? '' : text);
  s = s.replace(/\s/g, '');
  s = s.replace(/我的|我家|本人|俺/g, '');

  var atoms = [];
  var unknown = [];
  var unsupported = [];
  var ambiguous = [];
  var i = 0;

  while (i < s.length) {
    var ch = s.charAt(i);
    if (SEPARATORS.indexOf(ch) >= 0) { i++; continue; }

    var amb = matchAmbiguous(s, i);
    if (amb) {
      ambiguous.push({ word: amb, hint: AMBIGUOUS[amb] });
      i += amb.length;
      continue;
    }

    var blocked = matchCousinWord(s, i);
    if (blocked) {
      unsupported.push(blocked);
      i += blocked.length;
      continue;
    }

    var matched = '';
    var maxLen = Math.min(5, s.length - i);
    for (var len = maxLen; len >= 1; len--) {
      var w = s.substr(i, len);
      if (WORDS.hasOwnProperty(w)) { matched = w; break; }
    }

    if (matched) {
      var codes = WORDS[matched];
      for (var c = 0; c < codes.length; c++) atoms.push(A.mk(codes[c], false));
      i += matched.length;
    } else {
      unknown.push(ch);
      i++;
    }
  }

  return {
    atoms: atoms,
    unknown: unknown,
    unsupported: unsupported,
    ambiguous: ambiguous,
    ok: atoms.length > 0 && unknown.length === 0 && unsupported.length === 0 && ambiguous.length === 0,
    pending: pendingOf(atoms),
    raw: text
  };
}

/** 找出需要用户确认长幼的原子位置 */
function pendingOf(atoms) {
  var out = [];
  for (var i = 0; i < atoms.length; i++) {
    var k = atoms[i].k;
    if (k === 'BQ' || k === 'ZQ') {
      out.push({
        index: i,
        sex: A.sexOf(k),
        prev: i > 0 ? A.nameOf(atoms[i - 1].k) : '你',
        label: k === 'BQ' ? '兄弟' : '姐妹'
      });
    }
  }
  return out;
}

/** 原子数组 → 可读文本（用于回显） */
function toText(atoms) {
  if (!atoms || !atoms.length) return '';
  var parts = [];
  for (var i = 0; i < atoms.length; i++) parts.push(A.nameOf(atoms[i].k));
  return parts.join('的');
}

module.exports = {
  parse: parse,
  toText: toText,
  pendingOf: pendingOf,
  matchCousinWord: matchCousinWord,
  WORDS: WORDS
};
