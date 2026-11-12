/**
 * 规范化签名
 *
 * 归约后的原子序列只能包含四类动作：上行(父/母)、下行(子/女)、一次旁分(兄弟姐妹)、配偶。
 * 因此可以切成有限的"血亲块"序列：
 *   血亲块 = { up:[祖先性别...], fork:{旁分}, down:[后代性别...], spouse }
 * 这是全系统唯一的身份表示：任何链只要归约到同一签名，称呼必然相同。
 */

var A = require('./atoms');

function newBlock(type) {
  return { type: type || 'blood', up: [], fork: null, down: [], spouse: null };
}

function toSignature(atoms, selfSex) {
  var blocks = [];
  var cur = newBlock('self');

  for (var i = 0; i < atoms.length; i++) {
    var k = atoms[i].k;

    if (A.isUp(k)) {
      cur.up.push(A.sexOf(k));
      cur.type = 'blood';
    } else if (A.isDown(k)) {
      cur.down.push(A.sexOf(k));
      cur.type = 'blood';
    } else if (A.isSpouse(k)) {
      cur.spouse = k;
      // 配偶之后还有原子 → 关掉当前块，以该配偶为起点开新块
      if (i < atoms.length - 1) {
        blocks.push(cur);
        cur = newBlock('blood');
      }
    } else {
      cur.fork = { sex: A.sexOf(k), sen: A.senOf(k), mi: !!atoms[i].mi };
      cur.type = 'blood';
    }
  }

  blocks.push(cur);
  return { blocks: blocks, selfSex: selfSex };
}

/**
 * 签名身份键。
 * 刻意不含 fork.sen 与 mi —— 因为"我父亲的哥哥"和"我父亲的弟弟"的儿子，
 * 对"我"来说是属于同一类人（堂兄弟），不能因为父辈长幼而分叉出不同称呼。
 */
function sigKey(sig) {
  var parts = [];
  for (var i = 0; i < sig.blocks.length; i++) {
    var b = sig.blocks[i];
    parts.push([
      b.up.join(''),
      b.fork ? b.fork.sex : '-',
      b.down.join(''),
      b.spouse || '-'
    ].join('|'));
  }
  return parts.join('>>');
}

/** 单块是否是"干净的直系/单步"——用于配偶前缀表查表 */
function simpleStep(block) {
  if (block.fork && block.up.length === 0 && block.down.length === 0 && !block.spouse) {
    return A.sibCode(block.fork.sex, block.fork.sen);
  }
  if (!block.fork && block.up.length === 1 && block.down.length === 0 && !block.spouse) {
    return block.up[0] === 'm' ? 'F' : 'M';
  }
  return null;
}

module.exports = {
  toSignature: toSignature,
  sigKey: sigKey,
  simpleStep: simpleStep,
  newBlock: newBlock
};
