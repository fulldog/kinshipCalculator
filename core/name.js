/**
 * 称呼命名
 *
 * 血亲只有一个入口 nameBlood，靠三个量分派：
 *   a = up.length（上行几级）、d = down.length（下行几级）、fork（那一次旁分）
 * 世代差 g = a - d 决定"辈分"，a/d 决定"远近"，堂/表由血统路线决定。
 */

var A = require('./atoms');
var T = require('./terms.blood');
var AF = require('./terms.affine');

function term(text, tier, alias, note, options) {
  return {
    text: text,
    tier: tier || 'exact',
    alias: alias || [],
    note: note || '',
    options: options || []
  };
}

/** 祖先/后代链里，除最后一级外出现过女性 → 加"外" */
function hasWai(seq) {
  if (seq.length < 2) return false;
  return seq.slice(0, seq.length - 1).indexOf('f') >= 0;
}

/** 旁系长辈走的是父系还是母系：路径上出现过女性就算母系 */
function lineSide(up) {
  return up.indexOf('f') >= 0 ? 'f' : 'm';
}

function fromEntry(entry, tier, note) {
  if (!entry) return null;
  return term(entry[0], tier || 'exact', entry[1], note);
}

/* ---------------- 直系 ---------------- */

function nameAscend(up) {
  var a = up.length;
  if (a < 1 || a > 5) return null;
  var g = up[a - 1];
  if (a === 1) return fromEntry(T.ANCESTOR[1][g], 'exact');
  var tbl = hasWai(up) ? T.ANCESTOR_WAI[a] : T.ANCESTOR[a];
  return fromEntry(tbl && tbl[g], a >= 4 ? 'variant' : 'exact');
}

function nameDescend(down) {
  var d = down.length;
  if (d < 1 || d > 5) return null;
  var g = down[d - 1];
  if (d === 1) return fromEntry(T.DESCEND[1][g], 'exact');
  // 与长辈同理：除最后一级外，途中经过女性就要加"外"（儿子的女儿的儿子 = 外曾孙）
  var tbl = hasWai(down) ? T.DESCEND_WAI[d] : T.DESCEND[d];
  return fromEntry(tbl && tbl[g], d >= 4 ? 'variant' : (d === 2 ? 'exact' : 'variant'));
}

/* ---------------- 平辈 ---------------- */

function nameSiblings(fork) {
  var t = fromEntry(T.SIB[fork.sex][fork.sen], 'exact');
  if (t && fork.mi) t.note = '也可能是你自己';
  return t;
}

function nameNephew(fork, down) {
  var d = down.length;
  if (d > 4) return null;
  var g = down[d - 1];
  return fromEntry(T.NEPHEW[fork.sex][d][g], d === 1 ? 'exact' : 'variant');
}

/* ---------------- 旁系长辈 ---------------- */

// 祖先的别称，用于"也可能是你的X"提示
var ANC_SPOKEN = {
  1: { m: '爸爸', f: '妈妈' },
  2: { m: '爷爷', f: '奶奶' },
  3: { m: '太爷爷', f: '太奶奶' },
  4: { m: '高祖父', f: '高祖母' },
  5: { m: '天祖父', f: '天祖母' }
};

function nameAncSibling(a, up, fork) {
  var tbl = T.ANC_SIB[a];
  if (!tbl) return null;

  var entry = tbl[lineSide(up)][fork.sex][fork.sen];
  var t = fromEntry(entry, a === 1 ? 'exact' : 'variant');
  if (!t) return null;

  if (fork.mi) {
    var sp = ANC_SPOKEN[a] && ANC_SPOKEN[a][up[a - 1]];
    if (sp) t.note = '也可能就是你的' + sp;
  }

  if (t.text.indexOf('／') >= 0) {
    t.tier = 'ambiguous';
    t.options = t.text.split('／');
  }
  return t;
}

/* ---------------- 堂 / 表 ---------------- */

/**
 * 父系男性血统：起点是父亲，旁分点是男性，上行全程不经过女性。
 * 只判到旁分点为止 —— 下行是否经过女性由调用方按需追加（见 isTang）。
 */
function isTangLine(up, fork) {
  if (up[0] !== 'm' || fork.sex !== 'm') return false;
  return up.indexOf('f') < 0;
}

/**
 * 堂 / 表 的完整判定
 * 堂 = 全程走父系男性：起点是父亲、旁分点是男性，上下行中间都不经过女性。
 * 中间任一环经过女性就降为表 —— 否则「表姑」反过来会变成「堂侄」，自相矛盾。
 */
function isTang(up, fork, down) {
  if (!isTangLine(up, fork)) return false;
  return down.slice(0, Math.max(0, down.length - 1)).indexOf('f') < 0;
}

/**
 * 是否加"远房"。
 * 用 min(a,d) 当亲疏度数：正反两个方向算出来的度数相同，保证
 * 「远房堂伯」反过来一定是「远房堂侄」，不会一边远房一边不远房。
 * 祖辈及以上不加（"堂祖父"本身已经说明不近）。
 */
function isFar(a, d, g) {
  if (g >= 2) return false;
  return Math.min(a, d) >= 2;
}

function prefixes(far, tang) {
  var plain = tang ? '堂' : '表';
  return { far: far ? '远房' + plain : plain, plain: plain };
}

function far_tier(pf) {
  return pf.far === pf.plain ? 'exact' : 'variant';
}

/** 平辈：哥/弟/姐/妹 */
function nameCousinPeer(pf, sex, ageHint) {
  var pair = T.COUSIN[0][sex];
  if (ageHint === 'elder') {
    return term(pf.far + pair[0], far_tier(pf), pf.far === pf.plain ? [] : [pf.plain + pair[0]]);
  }
  if (ageHint === 'younger') {
    return term(pf.far + pair[1], far_tier(pf), pf.far === pf.plain ? [] : [pf.plain + pair[1]]);
  }
  var alias = pf.far === pf.plain ? [] : [pf.plain + pair[0], pf.plain + pair[1]];
  var t = term(pf.far + pair[0] + '／' + pf.far + pair[1], 'ambiguous', alias);
  t.options = [pf.far + pair[0], pf.far + pair[1]];
  return t;
}

/** 长一辈及以上：伯/叔/姑/舅/姨，再往上用祖父/曾祖父 */
function nameCousinElder(g, up, fork, down, far) {
  var d = down.length;
  var sex = down[d - 1];
  var maternal = up[0] === 'f';
  var pf = prefixes(far, isTang(up, fork, down));

  if (g === 1) {
    if (sex === 'f') return term(pf.far + (maternal ? '姨' : '姑'), 'variant', far ? [pf.plain + (maternal ? '姨' : '姑')] : []);
    if (maternal) return term(pf.far + '舅', 'variant', far ? [pf.plain + '舅'] : []);
    var t = term(pf.far + '伯／' + pf.far + '叔', 'ambiguous',
      far ? [pf.plain + '伯', pf.plain + '叔'] : []);
    t.options = [pf.far + '伯', pf.far + '叔'];
    return t;
  }

  var base = T.ELDER_BASE[g];
  if (!base) return null;
  var key = sex === 'm' ? (maternal ? 'mw' : 'm') : (maternal ? 'fw' : 'f');
  var text = pf.far + base[key];
  var out = term(text, 'variant');
  var sp = T.ELDER_SPOKEN[base[key]];
  var alias = [];
  if (far) alias.push(pf.plain + base[key]);
  if (sp) alias.push(pf.far + sp);
  if (alias.length) out.alias = alias;
  return out;
}

/** 晚一辈及以下：侄/甥（+孙） */
function nameCousinJunior(g, up, fork, down, far) {
  if (g < -2) return null;
  var d = down.length;
  var sex = down[d - 1];
  // 走女性的后代称"甥"，走男性称"侄"：看的是"他/她的父亲这一代"是谁
  var sheng = down[0] === 'f';
  var tang = isTangLine(up, fork);
  var pf = prefixes(far, tang);
  var tbl = sheng ? T.JUNIOR.sheng : T.JUNIOR.zhi;
  var e = tbl[g] && tbl[g][sex];
  if (!e) return null;
  var alias = (e[1] || []).slice();
  if (far) alias.unshift(pf.plain + e[0]);
  return term(pf.far + e[0], far ? 'variant' : 'exact', alias);
}

function nameCousin(a, up, fork, down, ageHint) {
  var d = down.length;
  if (d < 1 || a < 1 || a > 4) return null;
  var g = a - d;
  if (g > 3 || g < -2) return null;

  var far = isFar(a, d, g);

  if (g === 0) return nameCousinPeer(prefixes(far, isTang(up, fork, down)), down[d - 1], ageHint);
  if (g > 0) return nameCousinElder(g, up, fork, down, far);
  return nameCousinJunior(g, up, fork, down, far);
}

/* ---------------- 血亲总入口 ---------------- */

function nameBlood(block, ageHint) {
  var a = block.up.length;
  var d = block.down.length;
  var f = block.fork;

  if (!f) {
    if (a === 0 && d === 0) return null;      // "自己"由上层处理
    if (a > 0 && d === 0) return nameAscend(block.up);
    if (a === 0 && d > 0) return nameDescend(block.down);
    return null;
  }

  if (a === 0 && d === 0) return nameSiblings(f);
  if (a === 0 && d > 0) return nameNephew(f, block.down);
  if (a > 0 && d === 0) return nameAncSibling(a, block.up, f);
  return nameCousin(a, block.up, f, block.down, ageHint);
}

/* ---------------- 姻亲 ---------------- */

/**
 * 组合式配偶称谓：当查表没有收录时，按词尾推导。
 * 堂哥→堂嫂、远房堂叔→远房堂婶、表舅→表舅妈…
 * 只做能确定的一步推导，推不出来就交给描述式，不硬凑。
 * 顺序敏感：长词在前（外甥女 必须先于 外甥 匹配）。
 */
var SPOUSE_COMPOSE = [
  ['祖父', 'W', '祖母'], ['祖母', 'H', '祖父'],
  ['侄女', 'H', '侄女婿'], ['侄子', 'W', '侄媳'],
  ['外甥女', 'H', '外甥女婿'], ['外甥', 'W', '外甥媳妇'],
  ['外孙女', 'H', '外孙女婿'], ['外孙', 'W', '外孙媳'],
  ['孙女', 'H', '孙女婿'], ['孙子', 'W', '孙媳'],
  ['伯', 'W', '伯母'], ['叔', 'W', '婶'],
  ['姑', 'H', '姑父'], ['舅', 'W', '舅妈'], ['姨', 'H', '姨父'],
  ['哥', 'W', '嫂'], ['弟', 'W', '弟媳'],
  ['姐', 'H', '姐夫'], ['妹', 'H', '妹夫']
];

function composeOne(text, sp) {
  for (var i = 0; i < SPOUSE_COMPOSE.length; i++) {
    var r = SPOUSE_COMPOSE[i];
    if (r[1] !== sp) continue;
    var suf = r[0];
    if (text.length > suf.length && text.slice(text.length - suf.length) === suf) {
      return text.slice(0, text.length - suf.length) + r[2];
    }
  }
  return null;
}

function composeSpouse(text, sp) {
  if (text.indexOf('／') >= 0) {
    var parts = text.split('／');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var c = composeOne(parts[i], sp);
      if (!c) return null;
      out.push(c);
    }
    var t = term(out.join('／'), 'ambiguous');
    t.options = out;
    return t;
  }
  var one = composeOne(text, sp);
  return one ? term(one, 'variant') : null;
}

function nameWithSpouse(block, ageHint) {
  var sp = block.spouse;
  var a = block.up.length;
  var d = block.down.length;
  var f = block.fork;

  // 直系长辈 + 配偶 = 同位置的异性长辈（爸爸的老婆=妈妈由归约处理，这里管爷爷的老婆）
  if (!f && a >= 1 && d === 0) {
    var want = sp === 'W' ? 'f' : 'm';
    if (block.up[a - 1] !== want) {
      var up2 = block.up.slice();
      up2[a - 1] = want;
      var anc = nameAscend(up2);
      if (anc) return anc;
    }
  }

  var bare = { up: block.up, fork: f, down: block.down, spouse: null, type: block.type };
  var base = nameBlood(bare, ageHint);
  if (!base) return null;

  var map = null;
  if (a === 0 && d === 0 && f) {
    map = AF.SIB_SPOUSE[A.sibCode(f.sex, f.sen)];
  } else if (a === 1 && d === 0 && f) {
    map = AF.PARENT_SIB_SPOUSE[base.text];
  } else if (a === 2 && d === 0 && f) {
    map = AF.GRAND_SIB_SPOUSE[base.text];
  } else if (a === 0 && d === 1 && !f) {
    map = AF.CHILD_SPOUSE[block.down[0] === 'm' ? 'S' : 'D'];
  } else if (a === 0 && d === 1 && f) {
    map = AF.NEPHEW_SPOUSE[base.text];
  } else if (a === 0 && d === 2) {
    map = AF.GRAND_SPOUSE[base.text];
  }

  var entry = map && map[sp];
  if (entry) {
    var t = term(entry[0], base.tier, entry[1]);
    if (t.text.indexOf('／') >= 0) {
      t.tier = 'ambiguous';
      t.options = t.text.split('／');
    }
    return t;
  }

  return composeSpouse(base.text, sp);
}

/** 单块命名（含自己、含配偶） */
function nameBlock(block, ageHint) {
  if (block.type === 'self' && block.spouse) {
    var e = AF.SELF_SPOUSE[block.spouse];
    return term(e[0], 'exact', e[1]);
  }

  if (block.spouse) {
    var t = nameWithSpouse(block, ageHint);
    if (t) return t;
    var base = nameBlood(block, ageHint);
    if (base) {
      return term(base.text + (block.spouse === 'W' ? '的老婆' : '的老公'), 'descriptive', [], '', []);
    }
    return null;
  }

  if (block.type === 'self') return term('自己', 'exact', ['我']);
  return nameBlood(block, ageHint);
}

module.exports = {
  term: term,
  hasWai: hasWai,
  lineSide: lineSide,
  isTang: isTang,
  isTangLine: isTangLine,
  isFar: isFar,
  nameBlood: nameBlood,
  nameBlock: nameBlock,
  nameWithSpouse: nameWithSpouse,
  nameAscend: nameAscend,
  nameDescend: nameDescend,
  nameCousin: nameCousin,
  nameAncSibling: nameAncSibling
};
