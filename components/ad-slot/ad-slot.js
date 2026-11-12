/**
 * 广告槽
 * unit-id 为空时整个节点不渲染 —— 审核会检查"无效元素/空白占位"。
 */
Component({
  properties: {
    unitId: { type: String, value: '' }
  },

  data: {
    ready: false
  },

  lifetimes: {
    attached: function () {
      this.setData({ ready: !!this.data.unitId });
    }
  },

  methods: {
    onAdError: function () {
      // 无网络或未开通时静默降级，不打扰用户
      this.setData({ ready: false });
    }
  }
});
