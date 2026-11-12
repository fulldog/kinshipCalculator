Page({
  data: {
    version: '1.0.0'
  },

  onCopyFeedback: function () {
    var tpl = '称呼有误反馈：\n关系：\n我以为该叫：\n实际应该叫：\n（把这条发给开发者即可）';
    wx.setClipboardData({
      data: tpl,
      success: function () {
        wx.showToast({ title: '模板已复制', icon: 'success' });
      }
    });
  }
});
