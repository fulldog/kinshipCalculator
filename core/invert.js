/**
 * 关系求逆
 *
 * 反向称呼不需要第二套词表：把原子链倒着逐级求逆，再用同一个命名函数算一遍即可。
 * 求逆只需要知道"该步起点那个人的性别"，而这个信息链上本来就有。
 */

var A = require('./atoms');

function chainSexes(atoms, selfSex) {
  var out = [selfSex];
  for (var i = 0; i < atoms.length; i++) out.push(A.sexOf(atoms[i].k));
  return out;
}

function invertAtoms(atoms, selfSex) {
  if (!atoms || !atoms.length) return [];
  var sexes = chainSexes(atoms, selfSex);
  var out = [];

  for (var i = atoms.length - 1; i >= 0; i--) {
    var k = atoms[i].k;
    var cs = sexes[i]; // 走这一步之前那个人的性别
    var inv;

    if (k === 'F' || k === 'M') {
      inv = cs === 'm' ? 'S' : 'D';
    } else if (k === 'S' || k === 'D') {
      // 儿子/女儿看我是什么，取决于"我"的性别，而非他/她自己的性别
      inv = cs === 'm' ? 'F' : 'M';
    } else if (k === 'H') {
      inv = 'W';
    } else if (k === 'W') {
      inv = 'H';
    } else if (k === 'OB') {
      inv = cs === 'm' ? 'YB' : 'YZ'; // 我的哥哥：我是他弟弟/妹妹
    } else if (k === 'YB') {
      inv = cs === 'm' ? 'OB' : 'OZ'; // 我的弟弟：我是他哥哥/姐姐
    } else if (k === 'OZ') {
      inv = cs === 'm' ? 'YB' : 'YZ'; // 我的姐姐：我是她弟弟/妹妹
    } else if (k === 'YZ') {
      inv = cs === 'm' ? 'OB' : 'OZ'; // 我的妹妹：我是她哥哥/姐姐
    } else if (k === 'BQ') {
      inv = cs === 'm' ? 'BQ' : 'ZQ';
    } else if (k === 'ZQ') {
      inv = cs === 'm' ? 'BQ' : 'ZQ';
    } else {
      inv = k;
    }

    out.push(A.mk(inv, atoms[i].mi));
  }

  return out;
}

module.exports = {
  invertAtoms: invertAtoms,
  chainSexes: chainSexes
};
