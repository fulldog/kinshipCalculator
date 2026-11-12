var K = require('../../core/index');
var A = require('../../core/atoms');
var P = require('../../core/parse');
var R = require('../../core/render');
var store = require('../../utils/storage');

Page({
  data: {
    selfSex: 'm',
    atoms: [],
    chips: [],
    preview: '',
    previewNote: '',
    inputValue: '',
    inputOpen: false,
    inputFocused: false,
    warn: '',
    warnSource: '',
    pending: null,
    pendingQuestion: '',
    hasPending: false,
    keyDisabled: {},
    invalid: false,
    recent: [],
    loreOpen: false,
    loreTitle: '',
    loreText: ''
  },

  onLoad: function () {
    var sex = store.getSex();
    this.data.selfSex = sex;
    this.setData({
      selfSex: sex,
      recent: store.getRecent()
    });
    this.refresh(this.data.atoms || []);
  },

  onShow: function () {
    var sex = store.getSex();
    this.data.selfSex = sex;
    this.setData({ recent: store.getRecent(), selfSex: sex });
    this.refresh(this.data.atoms || []);
  },

  onSex: function (e) {
    var v = e.currentTarget.dataset.v;
    store.setSex(v);
    this.data.selfSex = v;
    this.setData({ selfSex: v });
    this.refresh(this.data.atoms);
  },

  onPick: function (e) {
    var k = e.detail.k;
    this.setData({ warn: '', warnSource: '' });
    var atoms = this.data.atoms.concat([A.mk(k, false)]);
    var bad = K.check(atoms, this.data.selfSex);
    if (bad) {
      var msg = bad.type === 'self'
        ? (this.data.selfSex === 'm' ? '男生没有「' + bad.word + '」' : '女生没有「' + bad.word + '」')
        : '没有这种关系：「' + bad.word + '」。现实中不存在，看看是不是点错了';
      this.setData({ warn: msg, warnSource: 'key' });
      return;
    }
    this.refresh(atoms);
  },

  onRemove: function (e) {
    var atoms = this.data.atoms.slice();
    atoms.splice(e.detail.index, 1);
    this.refresh(atoms);
  },

  onUndo: function () {
    var atoms = this.data.atoms.slice();
    atoms.pop();
    this.refresh(atoms);
  },

  onClear: function () {
    this.refresh([]);
  },

  onReset: function () {
    this.setData({ inputValue: '', warn: '', warnSource: '', inputOpen: false });
    this.refresh([]);
  },

  onLore: function () {
    var lore = this.data.previewLore;
    if (!lore) return;
    this.setData({
      loreOpen: true,
      loreTitle: lore.title,
      loreText: lore.text
    });
  },

  onLoreClose: function () {
    this.setData({ loreOpen: false });
  },

  refresh: function (atoms) {
    var chips = [];
    for (var i = 0; i < atoms.length; i++) {
      chips.push({ id: i + '_' + atoms[i].k, name: A.nameOf(atoms[i].k) });
    }

    var data = {
      atoms: atoms,
      chips: chips,
      preview: '',
      previewNote: '',
      previewLore: null,
      pending: null,
      pendingQuestion: '',
      hasPending: false,
      keyDisabled: {},
      invalid: false
    };

    var kd = {};
    for (var i = 0; i < A.KEYS.length; i++) {
      if (!K.canAppend(atoms, A.KEYS[i], this.data.selfSex)) kd[A.KEYS[i]] = true;
    }
    data.keyDisabled = kd;

    if (atoms.length) {
      var r = K.solve({ atoms: atoms, selfSex: this.data.selfSex });
      data.preview = r.forward.text;
      data.previewNote = r.forward.note || '';
      data.previewLore = r.forward.lore || null;
      data.invalid = !!r.invalid;

      var pend = P.pendingOf(atoms);
      if (pend.length) {
        var p = pend[0];
        var prevName = p.index > 0 ? A.nameOf(atoms[p.index - 1].k) : '你';
        data.pending = { index: p.index, sex: p.sex };
        data.pendingQuestion = '「' + prevName + '」的' +
          (p.sex === 'm' ? '兄弟' : '姐妹') + '，是年长的还是年幼的？';
        data.hasPending = true;
      }
    }

    this.setData(data);
  },

  onPending: function (e) {
    var sen = e.currentTarget.dataset.sen;
    var p = this.data.pending;
    if (!p) return;
    var atoms = this.data.atoms.slice();
    atoms[p.index] = A.mk(A.sibCode(p.sex, sen), false);
    this.refresh(atoms);
  },

  onToggleInput: function () {
    this.setData({ inputOpen: !this.data.inputOpen });
  },

  onInputFocus: function () {
    this.setData({ inputFocused: true });
  },

  onInputBlur: function () {
    this.setData({ inputFocused: false });
  },

  onInput: function (e) {
    this.setData({ inputValue: e.detail.value });
  },

  onExample: function (e) {
    var text = e.currentTarget.dataset.text;
    this.parseText(text);
  },

  onParse: function () {
    this.parseText(this.data.inputValue);
  },

  parseText: function (text) {
    if (!text) return;
    var res = P.parse(text);

    if (!res.atoms.length && !res.unsupported.length) {
      this.setData({
        warn: '没认出「' + text + '」，试试「爸爸的哥哥」这样的写法',
        warnSource: 'input',
        inputOpen: true
      });
      return;
    }

    if (res.unsupported.length) {
      this.setData({
        warn: '「' + res.unsupported.join('、') +
          '」不含方向信息，要先说清是哪边的亲戚。换成「舅舅的儿子」「爸爸的哥哥的儿子」这类写法，或者直接用下面的键盘点选。',
        warnSource: 'input',
        inputOpen: true
      });
      return;
    }

    if (res.ambiguous.length) {
      var amb = res.ambiguous[0];
      this.setData({
        warn: '「' + amb.word + '」各地指的不是同一个人（' + amb.hint + '）。说清是哪一边再算，或者直接点选。',
        warnSource: 'input',
        inputOpen: true
      });
      return;
    }

    if (res.unknown.length) {
      this.setData({
        warn: '没认出「' + res.unknown.join('、') + '」，这句没敢算。改一下再试，或者直接点选。',
        warnSource: 'input',
        inputOpen: true
      });
      return;
    }

    this.setData({ warn: '', warnSource: '', inputValue: '', inputOpen: false });
    this.refresh(res.atoms);
  },

  onGo: function () {
    if (!this.data.atoms.length) return;
    if (this.data.invalid) {
      this.setData({ warn: '这个关系不成立，先删掉几步再查', warnSource: 'key' });
      return;
    }
    var q = R.toQuery(this.data.atoms, this.data.selfSex);
    store.addRecent({
      query: q,
      text: this.data.preview,
      chain: A.chainText(this.data.atoms)
    });
    wx.navigateTo({ url: '/pages/result/result?' + q });
  },

  onRecent: function (e) {
    var q = e.currentTarget.dataset.query;
    if (!q) return;
    wx.navigateTo({ url: '/pages/result/result?' + q });
  },

  onAbout: function () {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  onShareAppMessage: function () {
    return {
      title: '亲戚称呼计算器 · 三秒算出该叫啥',
      path: '/pages/index/index'
    };
  }
});
