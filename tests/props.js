/**
 * 属性测试：比逐个用例更能抓住归约规则互推、签名冲突这类系统性问题
 */
module.exports = function (eq, ok) {
  var K = require('../core/index');
  var A = require('../core/atoms');
  var SIG = require('../core/signature');
  var REDUCE = require('../core/reduce');
  var NAME = require('../core/name');
  var PF = require('../core/parse');

  /* ---------- P1 归约幂等 ---------- */
  (function () {
    var samples = [
      ['F', 'OB', 'S'], ['S', 'M'], ['F', 'S', 'F'], ['M', 'OB', 'W', 'M'],
      ['H', 'YB', 'W'], ['OB', 'YB', 'F'], ['F', 'F', 'OB', 'S', 'D']
    ];
    for (var i = 0; i < samples.length; i++) {
      var atoms = samples[i].map(function (k) { return A.mk(k); });
      var once = REDUCE.reduce(atoms, 'm');
      var twice = REDUCE.reduce(once, 'm');
      eq(SIG.sigKey(SIG.toSignature(once, 'm')), SIG.sigKey(SIG.toSignature(twice, 'm')),
        'P1 归约幂等：' + A.chainText(atoms));
    }
  })();

  /* ---------- P2 求逆对合：连求两次逆应回到原签名 ---------- */
  (function () {
    var INVERT = require('../core/invert');
    var samples = ['爸爸的哥哥', '老婆的弟弟的老婆', '姐姐的女儿', '儿子的妈妈', '妈妈'];
    for (var i = 0; i < samples.length; i++) {
      var base = K.solve({ text: samples[i], selfSex: 'm' });
      var sex1 = base.selfSex;

      var inv1 = INVERT.invertAtoms(base.atoms, sex1);
      var sexes1 = INVERT.chainSexes(base.atoms, sex1);
      var self1 = sexes1[sexes1.length - 1];

      var inv2 = INVERT.invertAtoms(inv1, self1);
      var sexes2 = INVERT.chainSexes(inv1, self1);
      var self2 = sexes2[sexes2.length - 1];

      var red2 = REDUCE.reduce(inv2, self2);
      var key2 = SIG.sigKey(SIG.toSignature(red2, self2));
      eq(key2, base.sigKey, 'P2 求逆对合：' + samples[i]);
    }
  })();

  /* ---------- P3 词表覆盖（生成式遍历，防止漏项） ---------- */
  (function () {
    function ups(n) {
      if (n === 0) return [[]];
      var prev = ups(n - 1);
      var out = [];
      for (var i = 0; i < prev.length; i++) {
        out.push(prev[i].concat(['m']));
        out.push(prev[i].concat(['f']));
      }
      return out;
    }
    var forks = [null,
      { sex: 'm', sen: 'elder' }, { sex: 'm', sen: 'younger' }, { sex: 'm', sen: 'unk' },
      { sex: 'f', sen: 'elder' }, { sex: 'f', sen: 'younger' }, { sex: 'f', sen: 'unk' }];
    var miss = 0;

    for (var a = 0; a <= 4; a++) {
      var upList = ups(a);
      for (var d = 0; d <= 4; d++) {
        for (var ui = 0; ui < upList.length; ui++) {
          for (var fi = 0; fi < forks.length; fi++) {
            var downs = [];
            for (var x = 0; x < d; x++) downs.push(x === 0 ? 'm' : 'f');
            var block = {
              type: 'blood',
              up: upList[ui],
              fork: forks[fi] ? { sex: forks[fi].sex, sen: forks[fi].sen, mi: false } : null,
              down: downs,
              spouse: null
            };
            var res = null;
            try {
              res = NAME.nameBlood(block, null);
            } catch (e) {
              ok(false, 'P3 命名抛错：a=' + a + ' d=' + d + ' fork=' + (forks[fi] ? forks[fi].sex + forks[fi].sen : 'null'));
            }
            if (!res && a > 0 && a <= 4 && d === 0 && !forks[fi]) miss++;
          }
        }
      }
    }
    eq(miss, 0, 'P3 直系长辈全覆盖（不应有缺口）');
  })();

  /* ---------- P4 同义路径一致 ---------- */
  (function () {
    var a = K.solve({ text: '爸爸的哥哥的儿子', selfSex: 'm' });
    var b = K.solve({ text: '伯父的儿子', selfSex: 'm' });
    eq(a.sigKey, b.sigKey, 'P4 同义路径签名一致（父之兄之子 vs 伯父之子）');
    eq(a.forward.text, b.forward.text, 'P4 同义路径称呼一致');

    var c = K.solve({ text: '爸爸的哥哥的儿子', selfSex: 'm' });
    var d = K.solve({ text: '爸爸的弟弟的儿子', selfSex: 'm' });
    eq(c.sigKey, d.sigKey, 'P4 父辈长幼不影响堂兄弟称呼');
    eq(c.forward.text, d.forward.text, 'P4 父之兄之子与父之弟之子称呼必须相同');
  })();

  /* ---------- P5 随机模糊 ---------- */
  (function () {
    var keys = A.KEYS;
    var bad = 0;
    var maxMs = 0;
    for (var n = 0; n < 300; n++) {
      var len = 1 + Math.floor(Math.random() * 6);
      var atoms = [];
      for (var i = 0; i < len; i++) {
        atoms.push(A.mk(keys[Math.floor(Math.random() * keys.length)], Math.random() < 0.2));
      }
      var t0 = Date.now();
      try {
        var r = K.solve({ atoms: atoms, selfSex: n % 2 ? 'm' : 'f' });
        var ms = Date.now() - t0;
        if (ms > maxMs) maxMs = ms;
        var validTier = ['exact', 'variant', 'ambiguous', 'descriptive', 'invalid'].indexOf(r.forward.tier) >= 0;
        var clean = r.forward.text && !/undefined|null/.test(r.forward.text) &&
                    (r.forward.tier === 'invalid' || (r.reverse.text && !/undefined|null/.test(r.reverse.text)));
        if (!validTier || !clean) bad++;
        if (r.forward.tier === 'exact' || r.forward.tier === 'variant') {
          if (!r.reverse.text) bad++;
        }
      } catch (e) {
        bad++;
      }
    }
    eq(bad, 0, 'P5 随机 300 条链全部无异常且档位合法');
    ok(maxMs <= 5, 'P5 单条链求解耗时 ≤ 5ms（实测 ' + maxMs + 'ms）');
  })();

  /* ---------- P6 单向可逆性 ---------- */
  (function () {
    var list = ['爸爸的哥哥', '老婆的弟弟', '姐姐的丈夫', '儿子的妻子', '妈妈的哥哥的妻子的妈妈'];
    for (var i = 0; i < list.length; i++) {
      var r = K.solve({ text: list[i], selfSex: 'm' });
      ok(!!r.reverse.text, 'P6 反向称呼不为空：' + list[i]);
    }
  })();

  /* ---------- 解析器专项 ---------- */
  (function () {
    eq(PF.parse('爷爷').atoms.length, 2, '解析：爷爷 = 两个原子');
    eq(PF.parse('爸爸的哥哥').atoms.length, 2, '解析：爸爸的哥哥 = 两个原子');
    eq(PF.parse('').atoms.length, 0, '解析：空串不抛错');

    var u = PF.parse('爸爸的表哥');
    ok(u.unsupported.length > 0, '解析：堂表类词必须整词拦下，不能切成"爸爸+哥"');
    ok(!u.ok, '解析：拦下时不能标记为可计算');
    eq(PF.toText(u.atoms), '爸爸', '解析：拦下后保留已识别部分');

    var p = PF.parse('姑姑');
    eq(p.pending.length, 1, '解析：姑姑的长幼未知需待确认');

    ok(PF.parse('太奶奶的哥哥').ok, '解析：曾祖母的别名能识别（太奶奶）');
    ok(PF.parse('太姥爷的哥哥').ok, '解析：外曾祖父的别名能识别（太姥爷）');
    ok(PF.parse('高爷爷的哥哥').ok, '解析：高祖父的别名能识别（高爷爷）');
    ok(PF.parse('爸爸的爸爸的爸爸的哥哥的玄孙').ok, '解析：玄孙能识别');

    var amb = PF.parse('舅公的儿子');
    eq(amb.ambiguous.length, 1, '解析：地区歧义词（舅公）被识别为待澄清');
    ok(!amb.ok, '解析：歧义词不许直接算');

    var bad1 = K.solve({ text: '爸爸的表哥', selfSex: 'm' });
    ok(bad1.blocked, '解析：有拦下的词时 solve 必须标记 blocked');
    var bad2 = K.solve({ text: '老祖宗的兄弟', selfSex: 'm' });
    ok(bad2.blocked, '解析：有认不出的字时 solve 必须标记 blocked');
    var good = K.solve({ text: '爸爸的哥哥的儿子', selfSex: 'm' });
    ok(!good.blocked, '解析：全部识别时不算 blocked');
  })();
};
