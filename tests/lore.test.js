/**
 * 典故库测试：查找规则必须准确，不该出的不能硬凑
 */
module.exports = function (eq, ok) {
  var LORE = require('../core/lore');

  function hit(text, key) {
    var l = LORE.lookup(text);
    ok(!!l, '典故：' + text + ' 应有典故');
    if (l) eq(l.title.indexOf(key) >= 0, true, '典故：' + text + ' 命中「' + key + '」条目');
  }

  function miss(text) {
    eq(LORE.lookup(text), null, '典故：' + text + ' 不该有典故，不能硬凑');
  }

  // 精确命中
  hit('伯父', '伯');
  hit('叔父', '叔');
  hit('姑妈', '姑');
  hit('舅舅', '舅');
  hit('堂哥', '堂');
  hit('表哥', '表');
  hit('侄子', '侄');
  hit('孙子', '孙');
  hit('儿媳', '息妇');
  hit('女婿', '东床');
  hit('嫂子', '嫂');
  hit('外公', '外');
  hit('外孙', '外');
  hit('公公', '舅姑');
  hit('婆婆', '舅姑');

  // "／"分隔的双候选：取第一个
  hit('伯父／叔父', '伯');
  hit('堂哥／堂弟', '堂');

  // "远房"前缀剥离
  hit('远房堂哥／远房堂弟', '堂');
  hit('远房堂伯', '堂');

  // 关键词规则（词条本身没直接收录）
  hit('曾伯祖父', '曾');
  hit('玄孙', '玄');
  hit('外祖母', '外');
  hit('堂伯母', '堂');
  hit('表舅妈', '表');

  // 确实没有典故的：描述式、以及若干普通词
  miss('你舅妈的妈妈');
  miss('妈妈');
  miss('亲家公');
  miss('没有这种亲戚关系');
  miss('');

  // solve 挂载：正向结果带 lore，反向不强制
  var K = require('../core/index');
  var r = K.solve({ text: '爸爸的哥哥', selfSex: 'm' });
  ok(!!r.forward.lore, 'solve：伯父结果挂载典故');
  eq(r.forward.lore.title.indexOf('伯') >= 0, true, 'solve：典故内容正确');

  var r2 = K.solve({ text: '妈妈的哥哥的妻子', selfSex: 'm' });
  eq(r2.forward.text, '舅妈', 'solve：舅妈正常');
  eq(r2.forward.lore === null || r2.forward.lore === undefined, false, 'solve：舅妈走"舅"词条');
};
