/**
 * 页面逻辑冒烟测试：用最小 wx/Page 垫片在 Node 里跑页面逻辑（不渲染 WXML）
 */
var assert = require('assert');
var lastNav = null;

var lastModal = null;
global.wx = {
  getStorageSync: function () { return ''; },
  setStorageSync: function () {},
  vibrateShort: function () {},
  navigateTo: function (o) { lastNav = o.url; },
  navigateBack: function () {},
  reLaunch: function () {},
  setClipboardData: function (o) { if (o.success) o.success(); },
  showToast: function () {},
  showModal: function (o) { lastModal = o; if (o.success) o.success(); }
};

var captured = null;
global.Page = function (def) { captured = def; };
global.Component = function (def) { captured = def; };

function makePage(path) {
  captured = null;
  delete require.cache[require.resolve(path)];
  require(path);
  var def = captured;
  var inst = {};
  for (var k in def) if (k !== 'data') inst[k] = def[k];
  inst.data = JSON.parse(JSON.stringify(def.data));
  inst.setData = function (patch) {
    for (var key in patch) inst.data[key] = patch[key];
  };
  return inst;
}

var okCount = 0;
function is(actual, expected, desc) {
  assert.strictEqual(actual, expected, desc);
  okCount++;
}

/* ---------- 首页 ---------- */
var idx = makePage('../pages/index/index.js');
idx.onLoad();

idx.onPick({ detail: { k: 'F' } });
is(idx.data.preview, '爸爸', '首页：点爸爸出「爸爸」');

idx.onPick({ detail: { k: 'OB' } });
is(idx.data.preview, '伯父', '首页：爸爸+哥哥 = 伯父');

idx.onRemove({ detail: { index: 1 } });
is(idx.data.preview, '爸爸', '首页：删除一步回到「爸爸」');

idx.onUndo();
is(idx.data.preview, '', '首页：撤销到底后无预览');

idx.setData({ inputValue: '爸爸的哥哥的妻子' });
idx.onParse();
is(idx.data.preview, '伯母', '首页：文字解析出「伯母」');

idx.setData({ inputValue: '姑姑' });
idx.onParse();
is(!!idx.data.pending, true, '首页：姑姑需要确认长幼');
is(idx.data.hasPending, true, '首页：长幼未确认时锁住键盘');
idx.onPending({ currentTarget: { dataset: { sen: 'elder' } } });
is(idx.data.preview, '姑妈', '首页：确认年长后仍为姑妈');
is(!!idx.data.pending, false, '首页：确认后待确认项消失');
is(idx.data.hasPending, false, '首页：确认后键盘锁解除');

idx.setData({ inputValue: '爸爸的表哥' });
idx.onParse();
is(!!idx.data.warn, true, '首页：堂表词给出提示而不是静默算错');
is(idx.data.warnSource, 'input', '首页：解析失败的提示归到输入');
is(idx.data.warn.indexOf('表哥') >= 0, true, '首页：提示里点名具体是哪几个词');
is(idx.data.preview, '姑妈', '首页：拦下后保持上一次结果，不拿半截链去算');

idx.setData({ inputValue: '太奶奶的哥哥' });
idx.onParse();
is(idx.data.preview, '外曾伯祖父', '首页：曾祖辈旁系能算出来了');

idx.setData({ inputValue: '老祖宗' });
idx.onParse();
is(!!idx.data.warn, true, '首页：认不出的字整句不算');
is(idx.data.preview, '外曾伯祖父', '首页：认不出时也不覆盖上一次结果');

idx.onClear();
idx.onPick({ detail: { k: 'M' } });
idx.onPick({ detail: { k: 'OZ' } });
idx.onGo();
is(lastNav, '/pages/result/result?c=M,OZ&s=m', '首页：跳转参数正确');

/* ---------- 结果页 ---------- */
var res = makePage('../pages/result/result.js');
res.onLoad({ c: 'F,OB', s: 'm' });
is(res.data.mainText, '伯父', '结果页：F,OB = 伯父');
is(res.data.mainLong, false, '结果页：短称呼保持大字');
is(res.data.reverseText, '侄子', '结果页：反向 侄子');
is(res.data.chainText, '爸爸的哥哥', '结果页：链路文本');
is(res.data.forwardPath.length, 3, '结果页：正向路径 3 个节点');
is(res.data.ageSwitch, false, '结果页：伯父不需要年龄消歧');

var res2 = makePage('../pages/result/result.js');
res2.onLoad({ c: 'F,OB,S', s: 'm' });
is(res2.data.mainText, '堂哥／堂弟', '结果页：堂兄弟双候选');
is(res2.data.ageSwitch, true, '结果页：堂兄弟需要年龄消歧');
res2.onAge({ currentTarget: { dataset: { hint: 'elder' } } });
is(res2.data.mainText, '堂哥', '结果页：选「比我大」后确定堂哥');
is(res2.data.reverseText, '堂弟', '结果页：反向同步翻转为堂弟');
res2.onAge({ currentTarget: { dataset: { hint: 'elder' } } });
is(res2.data.mainText, '堂哥／堂弟', '结果页：再点一次取消消歧');

var res3 = makePage('../pages/result/result.js');
res3.onLoad({ c: 'M,OB,W,M', s: 'm' });
is(res3.data.mainText, '你舅妈的妈妈', '结果页：无标准称呼时逐字描述');
is(res3.data.tierLabel, '没有专门称呼', '结果页：档位标签');
is(res3.data.mainLong, false, '结果页：六个字仍用大标题');

var res4 = makePage('../pages/result/result.js');
res4.onLoad({ c: 'F,OB~,S', s: 'm' });
is(res4.data.mainText, '堂哥／堂弟', '结果页：mi 标记解析正确');

var res5 = makePage('../pages/result/result.js');
res5.onLoad({ c: '', s: 'f' });
is(res5.data.mainText, '自己', '结果页：空链 = 自己');

var res6 = makePage('../pages/result/result.js');
res6.onLoad({ c: 'F,F,OB,S,S', s: 'm' });
is(res6.data.mainText, '远房堂哥／远房堂弟', '结果页：再从兄弟标为远房');
is(res6.data.tierLabel, '远房亲戚', '结果页：远房用独立档位标签');
is(res6.data.aliasText, '堂哥 · 堂弟', '结果页：远房同时给出日常叫法');
is(res6.data.mainLong, true, '结果页：超过六个字改成正文排版');

var res7 = makePage('../pages/result/result.js');
res7.onLoad({ c: 'F,F,F,OB', s: 'm' });
is(res7.data.mainText, '曾伯祖父', '结果页：曾祖辈旁系');

/* ---------- 不存在的关系（病态链拦截） ---------- */
var idx2 = makePage('../pages/index/index.js');
idx2.onLoad();

idx2.onPick({ detail: { k: 'W' } });
is(idx2.data.preview, '老婆', '拦截：老婆正常');

idx2.onPick({ detail: { k: 'W' } });
is(idx2.data.atoms.length, 1, '拦截：老婆的老婆不会被加进链里');
is(idx2.data.warn.indexOf('没有这种关系') >= 0, true, '拦截：给出明确提示');
is(idx2.data.warn.indexOf('老婆的老婆') >= 0, true, '拦截：提示里点名是哪一步');
is(idx2.data.warnSource, 'key', '拦截：点选错误的提示归到键盘');

is(idx2.data.keyDisabled.W, true, '置灰：老婆之后再点老婆被禁用');
is(!idx2.data.keyDisabled.S, true, '置灰：老婆之后儿子仍可点（儿媳）');
is(!idx2.data.keyDisabled.H, true, '置灰：老婆之后老公仍可点（老婆的老公=自己，合法归约）');

// 女生切换后，已选的「老婆」链失效，查看按钮要拦住
idx2.onSex({ currentTarget: { dataset: { v: 'f' } } });
is(idx2.data.invalid, true, '拦截：切性别后链失效');
idx2.onGo();
is(idx2.data.warn.indexOf('不成立') >= 0, true, '拦截：失效链不能跳结果页');

/* ---------- 重置按钮 ---------- */
idx2.setData({ inputValue: '随便打的字', warn: '旧提示' });
var sexBefore = idx2.data.selfSex;
idx2.onReset();
is(idx2.data.atoms.length, 0, '重置：清空关系链');
is(idx2.data.inputValue, '', '重置：清空输入框');
is(idx2.data.warn, '', '重置：清空提示');
is(idx2.data.preview, '', '重置：清空预览');
is(idx2.data.invalid, false, '重置：失效标记一并清除');
is(idx2.data.selfSex, sexBefore, '重置：保留「我是」性别选择');
lastNav = null;
idx2.onGo();
is(lastNav, null, '重置：空链不会跳结果页');

/* ---------- 称呼典故问号 ---------- */
idx2.onSex({ currentTarget: { dataset: { v: 'm' } } }); // 切回男生
idx2.onClear();
idx2.onPick({ detail: { k: 'F' } });
is(idx2.data.previewLore, null, '典故：爸爸没有典故，不显示问号');

idx2.onPick({ detail: { k: 'OB' } });
is(idx2.data.preview, '伯父', '典故：伯父正常');
is(idx2.data.previewLore && idx2.data.previewLore.title.indexOf('伯') >= 0, true, '典故：伯父挂载排行典故');

idx2.onLore();
is(idx2.data.loreOpen, true, '典故：点击问号弹出弹窗');
is(idx2.data.loreTitle.indexOf('伯') >= 0, true, '典故：弹窗标题点出伯');
is(idx2.data.loreText.indexOf('伯、仲、叔、季') >= 0, true, '典故：弹窗内容包含伯仲叔季');
idx2.onLoreClose();
is(idx2.data.loreOpen, false, '典故：关闭弹窗');

var res9 = makePage('../pages/result/result.js');
res9.onLoad({ c: 'M,OB', s: 'm' });
is(res9.data.mainLore && res9.data.mainLore.title.indexOf('舅') >= 0, true, '典故：结果页舅父挂载典故');
res9.onLore();
is(res9.data.loreOpen, true, '典故：结果页点击弹窗');
is(res9.data.loreTitle.indexOf('舅') >= 0, true, '典故：结果页弹窗标题');

var res10 = makePage('../pages/result/result.js');
res10.onLoad({ c: 'F', s: 'm' });
is(res10.data.mainLore, null, '典故：爸爸无典故，图标不渲染');

var res8 = makePage('../pages/result/result.js');
res8.onLoad({ c: 'W,W', s: 'm' });
is(res8.data.mainText, '没有这种亲戚关系', '结果页：病态链明确拒绝');
is(res8.data.tierLabel, '关系不成立', '结果页：关系不成立档位');
is(res8.data.note.indexOf('老婆的老婆') >= 0, true, '结果页：备注点名问题在哪');

console.log('页面冒烟测试 ' + okCount + '/' + okCount + ' 通过');
