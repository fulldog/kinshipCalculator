/**
 * 四档降级管线
 *
 *   1. 单块 → 直接命名（exact / variant / ambiguous）
 *   2. 双块且首块是"我+配偶" → 姻亲前缀表（公公/岳父/小舅子…）
 *   3. 多块 → 逐块拼接"A的B"
 *   4. 命名失败 → 上层用逐字展开兜底（你舅妈的妈妈）
 *
 * 原则：宁可给描述，绝不给可能错的术语。
 */

var SIG = require('./signature');
var NAME = require('./name');
var AF = require('./terms.affine');

// 拼接时优先用口语形式，避免"你老婆的祖父"这种书面感
var SPOKEN = {
  '祖父': '爷爷', '祖母': '奶奶',
  '外祖父': '外公', '外祖母': '外婆',
  '曾祖父': '太爷爷', '曾祖母': '太奶奶',
  '外曾祖父': '太姥爷', '外曾祖母': '太姥姥',
  '高祖父': '高祖父', '高祖母': '高祖母',
  '外高祖父': '外高祖父', '外高祖母': '外高祖母'
};

function spoken(text) {
  return SPOKEN[text] || text;
}

function renderJoin(block, index, ageHint) {
  if (index === 0) {
    var t = NAME.nameBlock(block, ageHint);
    return t ? t.text : null;
  }

  // 第二块起：带配偶的一律展开成「血亲 + 的老婆/老公」，
  // 否则「你老婆的弟媳」会被误读成"你的弟媳"
  if (block.spouse) {
    var base = NAME.nameBlood(block, null);
    if (!base) return null;
    return spoken(base.text) + (block.spouse === 'W' ? '的老婆' : '的老公');
  }

  var b = NAME.nameBlock(block, null);
  return b ? spoken(b.text) : null;
}

function describe(sig, opts) {
  opts = opts || {};
  var ageHint = opts.ageHint || null;
  var blocks = sig.blocks;

  if (!blocks || !blocks.length) return null;

  if (blocks.length === 1) {
    return NAME.nameBlock(blocks[0], ageHint);
  }

  if (blocks.length === 2 && blocks[0].type === 'self' && blocks[0].spouse) {
    var b1 = blocks[1];

    // 配偶的晚辈血亲，姻亲与血亲同称：老公的侄子 = 侄子
    if (b1.down.length > 0 && b1.up.length === 0) {
      var inherit = NAME.nameBlock(b1, null);
      if (inherit) return inherit;
    }

    // 配偶的直系与兄弟姐妹：公公/岳父/大伯子/小舅子…
    var step = SIG.simpleStep(b1);
    if (step) {
      var tbl = AF.SPOUSE_PREFIX[blocks[0].spouse] || {};
      var e = tbl[step];
      if (e) {
        var t = NAME.term(e[0], 'exact', e[1]);
        if (t.text.indexOf('／') >= 0) {
          t.tier = 'ambiguous';
          t.options = t.text.split('／');
        }
        return t;
      }
    }
  }

  // 亲家：儿媳/女婿的父母
  if (blocks.length === 2 &&
      blocks[0].spouse && blocks[0].down.length === 1 && blocks[0].up.length === 0 && !blocks[0].fork &&
      blocks[1].up.length === 1 && blocks[1].down.length === 0 && !blocks[1].fork && !blocks[1].spouse) {
    var isMother = blocks[1].up[0] === 'f';
    return NAME.term(isMother ? '亲家母' : '亲家公', 'exact', []);
  }

  var parts = [];
  for (var i = 0; i < blocks.length; i++) {
    var p = renderJoin(blocks[i], i, ageHint);
    if (!p) return null;
    parts.push(p);
  }

  return NAME.term('你' + parts.join('的'), 'descriptive');
}

module.exports = {
  describe: describe,
  renderJoin: renderJoin,
  spoken: spoken
};
