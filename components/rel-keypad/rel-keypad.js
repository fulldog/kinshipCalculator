Component({
  properties: {
    /** { F: true, W: true } —— 值为 true 的键置灰不可点（点了会构成不存在的关系） */
    disabled: {
      type: Object,
      value: {}
    }
  },

  data: {
    groups: [
      { label: '长辈', keys: [{ k: 'F', name: '爸爸' }, { k: 'M', name: '妈妈' }] },
      { label: '平辈', keys: [{ k: 'OB', name: '哥哥' }, { k: 'YB', name: '弟弟' }, { k: 'OZ', name: '姐姐' }, { k: 'YZ', name: '妹妹' }] },
      { label: '晚辈', keys: [{ k: 'S', name: '儿子' }, { k: 'D', name: '女儿' }] },
      { label: '配偶', keys: [{ k: 'H', name: '老公' }, { k: 'W', name: '老婆' }] }
    ]
  },

  methods: {
    onPick: function (e) {
      var k = e.currentTarget.dataset.k;
      if (!k) return;
      if (this.data.disabled && this.data.disabled[k]) return;
      this.triggerEvent('pick', { k: k });
      try { wx.vibrateShort({ type: 'light', fail: function () {} }); } catch (err) {}
    }
  }
});
