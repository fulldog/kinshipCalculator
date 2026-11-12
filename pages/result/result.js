var K = require('../../core/index');
var R = require('../../core/render');
var ad = require('../../utils/ad');

Page({
  data: {
    selfSex: 'm',
    mainText: '',
    aliasText: '',
    note: '',
    options: [],
    showOptions: false,
    ageSwitch: false,
    ageHint: '',
    reverseText: '',
    reverseHint: '',
    forwardPath: [],
    reversePath: [],
    chainText: '',
    tierLabel: '',
    adBanner: ''
  },

  onLoad: function (options) {
    this.query = options || {};
    var sex = this.query.s === 'f' ? 'f' : 'm';
    var parsed = R.fromQuery(this.query);
    this.atoms = parsed.atoms;
    this.render(sex, '');
  },

  render: function (selfSex, ageHint) {
    var r = K.solve({
      atoms: this.atoms,
      selfSex: selfSex,
      ageHint: ageHint || null
    });

    var opts = r.forward.options || [];
    var ageType = opts.length === 2 && /[哥弟姐妹]$/.test(opts[1]);

    this.setData({
      selfSex: selfSex,
      ageHint: ageHint || '',
      mainText: r.forward.text,
      aliasText: R.aliasLine(r.forward),
      note: r.forward.note || '',
      options: opts,
      showOptions: opts.length > 0,
      ageSwitch: r.forward.tier === 'ambiguous' && ageType,
      reverseText: r.reverse.text,
      reverseHint: '你是' + (selfSex === 'm' ? '男生' : '女生') + '，按这层关系他该这么叫你',
      forwardPath: this.withIds(R.pathItems(r.atoms, '你')),
      reversePath: this.withIds(R.pathItems(r.revAtoms, '他')),
      chainText: r.chainText,
      tierLabel: this.tierLabel(r.forward.tier, r.forward.text),
      adBanner: ad.hasBanner() ? ad.CONFIG.bannerUnitId : ''
    });
  },

  withIds: function (items) {
    for (var i = 0; i < items.length; i++) items[i].id = i;
    return items;
  },

  tierLabel: function (tier, text) {
    if (tier === 'invalid') return '关系不成立';
    if (tier === 'descriptive') return '没有专门称呼';
    if (text && text.indexOf('远房') >= 0) return '远房亲戚';
    if (tier === 'ambiguous') return '有几种叫法';
    if (tier === 'variant') return '常见叫法';
    return '';
  },

  onAge: function (e) {
    var hint = e.currentTarget.dataset.hint;
    this.render(this.data.selfSex, hint === this.data.ageHint ? '' : hint);
  },

  onCopy: function () {
    var r = K.solve({
      atoms: this.atoms,
      selfSex: this.data.selfSex,
      ageHint: this.data.ageHint || null
    });
    wx.setClipboardData({
      data: R.copyText(r),
      success: function () {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  onAgain: function () {
    wx.navigateBack({
      fail: function () {
        wx.reLaunch({ url: '/pages/index/index' });
      }
    });
  },

  onShareAppMessage: function () {
    var q = R.toQuery(this.atoms, this.data.selfSex);
    return {
      title: '我该叫他' + this.data.mainText,
      path: '/pages/result/result?' + q
    };
  }
});
