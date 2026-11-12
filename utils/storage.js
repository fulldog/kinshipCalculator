/**
 * 本地存储：最近查询 + 性别偏好
 * 全部存本机，不上传、不收集，免隐私指引。
 */

var KEY_SEX = 'kc_sex';
var KEY_RECENT = 'kc_recent';
var MAX_RECENT = 5;

function getSex() {
  try {
    var s = wx.getStorageSync(KEY_SEX);
    return s === 'f' ? 'f' : 'm';
  } catch (e) {
    return 'm';
  }
}

function setSex(sex) {
  try { wx.setStorageSync(KEY_SEX, sex === 'f' ? 'f' : 'm'); } catch (e) {}
}

function getRecent() {
  try {
    var list = wx.getStorageSync(KEY_RECENT);
    return Object.prototype.toString.call(list) === '[object Array]' ? list : [];
  } catch (e) {
    return [];
  }
}

function addRecent(item) {
  if (!item || !item.query) return getRecent();
  var list = getRecent();
  var out = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].query !== item.query) out.push(list[i]);
  }
  out.unshift(item);
  if (out.length > MAX_RECENT) out = out.slice(0, MAX_RECENT);
  try { wx.setStorageSync(KEY_RECENT, out); } catch (e) {}
  return out;
}

module.exports = {
  getSex: getSex,
  setSex: setSex,
  getRecent: getRecent,
  addRecent: addRecent,
  MAX_RECENT: MAX_RECENT
};
