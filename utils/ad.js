/**
 * 广告能力占位
 *
 * 本轮不接入流量主。开关为关时，任何广告 API 都不会被调用：
 * 未开通流量主而调用 wx.createRewardedVideoAd 会直接抛错，白屏就是这么来的。
 */

var CONFIG = {
  bannerUnitId: '',    // 开通流量主后填入
  rewardedUnitId: ''
};

function hasBanner() { return !!CONFIG.bannerUnitId; }
function hasRewarded() { return !!CONFIG.rewardedUnitId; }

/** 返回广告实例；开关关闭时返回 null，调用方需判空 */
function createRewarded(onClose) {
  if (!CONFIG.rewardedUnitId) return null;
  var ad = null;
  try {
    ad = wx.createRewardedVideoAd({ adUnitId: CONFIG.rewardedUnitId });
    ad.onClose(function (res) {
      var ok = res && res.isEnded;
      if (typeof onClose === 'function') onClose(ok);
    });
  } catch (e) {
    return null;
  }
  return ad;
}

function showRewarded(onClose) {
  var ad = createRewarded(onClose);
  if (!ad) {
    if (typeof onClose === 'function') onClose(false);
    return;
  }
  ad.show().catch(function () {
    ad.load().then(function () { return ad.show(); }).catch(function () {
      if (typeof onClose === 'function') onClose(false);
    });
  });
}

module.exports = {
  CONFIG: CONFIG,
  hasBanner: hasBanner,
  hasRewarded: hasRewarded,
  createRewarded: createRewarded,
  showRewarded: showRewarded
};
