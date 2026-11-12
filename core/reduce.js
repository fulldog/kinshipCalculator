/**
 * 关系链归约：栈式 shift-reduce
 *
 * 从左到右压栈，每次只看栈顶两个原子，压完立刻约到不动点。
 * 关键：规则匹配前必须算出"当前位置这个人的性别"（sexBefore），
 * 因为「儿子的爸爸」是我还是我老公，取决于更早的那个人的性别。
 */

var A = require('./atoms');

function foldSex(stack, selfSex) {
  var s = selfSex;
  for (var i = 0; i < stack.length; i++) s = A.sexOf(stack[i].k);
  return s;
}

/**
 * 尝试对栈顶两个原子做一次归约。
 * 返回 true 表示栈已被修改，调用方需要重新尝试。
 * 返回 'invalid' 表示出现了现实中不存在的关系（如 老婆的老婆）。
 */
function tryReduce(st, selfSex) {
  var n = st.length;
  if (n < 2) return false;

  var y = st[n - 1];
  var x = st[n - 2];
  var xk = x.k;
  var yk = y.k;
  var sexBefore = foldSex(st.slice(0, n - 2), selfSex);

  // R1 配偶抵消：老公的老婆 = 自己
  if ((xk === 'H' && yk === 'W') || (xk === 'W' && yk === 'H')) {
    st.length = n - 2;
    return true;
  }

  // R2 父之妻 = 母 / 母之夫 = 父
  if (xk === 'F' && yk === 'W') { st.splice(n - 2, 2, A.mk('M')); return true; }
  if (xk === 'M' && yk === 'H') { st.splice(n - 2, 2, A.mk('F')); return true; }

  // R3 子女再上行：儿子的爸爸（我是男=自己 / 我是女=老公）
  if (A.isDown(xk) && A.isUp(yk)) {
    var want = yk === 'F' ? 'm' : 'f';
    if (sexBefore === want) {
      st.length = n - 2;
    } else {
      st.splice(n - 2, 2, A.mk(want === 'm' ? 'H' : 'W'));
    }
    return true;
  }

  // R4 上行再下行：爸爸的儿子 = 兄弟（我是男的时"可能是自己"）
  if (A.isUp(xk) && A.isDown(yk)) {
    var tgtSex = yk === 'S' ? 'm' : 'f';
    var mi = (tgtSex === sexBefore);
    st.splice(n - 2, 2, A.mk(A.sibCode(tgtSex, 'unk'), mi));
    return true;
  }

  // R5 兄弟姐妹再兄弟姐妹：兄之兄=兄、兄之弟=兄弟
  if (A.isSib(xk) && A.isSib(yk)) {
    var sen = A.composeSen(A.senOf(xk), A.senOf(yk));
    var sSex = A.sexOf(yk);
    var miS = (sen === 'unk' && sSex === sexBefore);
    st.splice(n - 2, 2, A.mk(A.sibCode(sSex, sen), miS));
    return true;
  }

  // R6 子女再兄弟姐妹：儿子的哥哥 = 我儿子
  if (A.isDown(xk) && A.isSib(yk)) {
    st.splice(n - 2, 2, A.mk(A.sexOf(yk) === 'm' ? 'S' : 'D'));
    return true;
  }

  // R7 兄弟姐妹再上行：哥哥的爸爸 = 爸爸
  if (A.isSib(xk) && A.isUp(yk)) {
    st.splice(n - 2, 2, A.mk(yk));
    return true;
  }

  // R8 现实性校验：配偶的性别必须与"被配的人"相反。
  // 走到这里说明 R1/R2 都没吃掉这对 —— 剩下的配偶组合里，
  // 性别对得上的（儿子的老婆、女儿的老公）留给签名阶段做块处理，
  // 对不上的（老婆的老婆、女儿的老公、爸爸的老公）现实中不存在，直接判死。
  if (A.isSpouse(yk)) {
    var want = yk === 'H' ? 'f' : 'm'; // H 的持有者必须是女性，W 的持有者必须是男性
    if (A.sexOf(xk) !== want) return 'invalid';
  }

  // 其余情形（R9 配偶块）不归约，留给签名阶段按"块"处理
  return false;
}

/** 归约整条链。返回新的原子数组（不修改入参）。出现不存在的关系时带 invalid 标记。 */
function reduce(atoms, selfSex) {
  var st = [];
  for (var i = 0; i < atoms.length; i++) {
    st.push(atoms[i]);
    var guard = 0;
    while (true) {
      var res = tryReduce(st, selfSex);
      if (res === 'invalid') { st.invalid = true; return st; }
      if (!res) break;
      guard++;
      if (guard > 64) throw new Error('归约未收敛，规则互推：' + A.chainText(atoms));
    }
  }
  return st;
}

/**
 * 校验整条链是否现实可行。返回 null 或失败原因：
 *   { type: 'self',    word }  第一个配偶原子和自身性别冲突（男生点「老公」）
 *   { type: 'spouse',  word }  链中出现性别对不上的配偶（老婆的老婆）
 */
function validate(atoms, selfSex) {
  if (atoms.length && A.isSpouse(atoms[0].k)) {
    var want = atoms[0].k === 'H' ? 'f' : 'm';
    if (selfSex !== want) {
      return { type: 'self', word: A.nameOf(atoms[0].k) };
    }
  }
  var red = reduce(atoms, selfSex);
  if (red.invalid) {
    var n = red.length;
    var word = n >= 2
      ? A.nameOf(red[n - 2].k) + '的' + A.nameOf(red[n - 1].k)
      : A.chainText(red);
    return { type: 'spouse', word: word };
  }
  return null;
}

/** 归约后是否等价于"自己" */
function isSelf(atoms, selfSex) {
  return reduce(atoms, selfSex).length === 0;
}

module.exports = {
  reduce: reduce,
  tryReduce: tryReduce,
  foldSex: foldSex,
  isSelf: isSelf,
  validate: validate
};
