# Tasks: 亲戚称呼计算器 UI 升级

## Task 1: 抽出视觉 token

**Description:** 把已经在用的纸色、朱砂、字号和间距收成一份 token，页面和组件用 `@import` 引用。这一步不改布局，避免边换样式边改结构。

**Acceptance criteria:**
- [ ] `styles/tokens.wxss` 包含颜色、字号、圆角、间距，取值来自现在的 `app.wxss`，不引入新色板
- [ ] `app.wxss` 和四个组件的 wxss 改为使用这些 token
- [ ] 首页、结果页、关于页的结构和文案与现在一致

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Manual check: 三页打开后，背景、主按钮、卡片边框仍是原来的纸色和朱砂

**Dependencies:** None

**Files likely touched:**
- `styles/tokens.wxss`
- `app.wxss`
- `components/rel-keypad/rel-keypad.wxss`
- `components/chain-editor/chain-editor.wxss`
- `components/path-graph/path-graph.wxss`

**Estimated scope:** Medium: 5 files

## Task 2: 重排首页，主按钮贴底

**Description:** 首页改成一条工作流：性别一行、关系链、当前称呼、键盘。文字输入默认收成「直接打字」。`查看称呼` 和 `重置` 固定在底部并留出安全区。空链时给出两个可点示例，点下去走现有解析。

**Acceptance criteria:**
- [ ] 不滚动时能同时看到关系链、当前称呼和键盘的第一排
- [ ] 未选关系时主按钮不可用；选出后可进入结果页
- [ ] 文字解析默认收起，展开后仍能解析「爸爸的哥哥的妻子」
- [ ] 点选产生的警告出现在键盘附近，解析产生的警告出现在输入框下
- [ ] 窄屏上「我是 / 男生 / 女生」不和提示挤在同一行里溢出

**Verification:**
- [ ] Tests pass: `node tests/ui-smoke.js`
- [ ] Manual check: 点「爸爸」再点「哥哥」，预览为「伯父」，底部按钮进入结果页

**Dependencies:** Task 1

**Files likely touched:**
- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/index/index.js`

**Estimated scope:** Medium: 3 files

## Task 3: 键盘、关系链和长幼确认

**Description:** 键盘按键加大到容易点中，置灰键保持不可点并看得出是禁用。关系链上每一步的删除热区扩大。出现长幼问题时，问题紧贴在链下面，键盘暂时弱化，选完再恢复。

**Acceptance criteria:**
- [ ] 四个分组（长辈、平辈、晚辈、配偶）的按键高度不小于 88rpx
- [ ] 置灰键点了没有反应，颜色明显淡于可点键
- [ ] 链上每一步可删除，`删一步` 和 `清空` 的可点区域不小于 88rpx 高
- [ ] 解析「姑姑」后先出现年长 / 年幼，确认年长后预览仍是「姑妈」

**Verification:**
- [ ] Tests pass: `node tests/ui-smoke.js`
- [ ] Manual check: 男生点「老婆」可点，切到女生后「老婆」置灰；长幼二选一完成后键盘恢复

**Dependencies:** Task 2

**Files likely touched:**
- `components/rel-keypad/rel-keypad.wxml`
- `components/rel-keypad/rel-keypad.wxss`
- `components/chain-editor/chain-editor.wxml`
- `components/chain-editor/chain-editor.wxss`
- `pages/index/index.wxml`

**Estimated scope:** Medium: 5 files

## Checkpoint: 首页

- [ ] `node tests/ui-smoke.js` 通过
- [ ] 空状态、点选、打字、长幼、非法关系、重置都走过
- [ ] 等人确认首页后再做结果页

## Task 4: 结果页按字数排主称呼

**Description:** 结果页以「你该叫他」为唯一主答案。两个字到六个字保持大标题；更长的描述缩小字号并取消大字距。别称、备注、要比大小的选择收在主答案下面。反向称呼降成一块辅助信息，不再用第二套超大字号。底部操作分清主次：再查一个是主操作，复制和分享是次操作。

**Acceptance criteria:**
- [ ] 「伯父」一类短称呼仍是页面上最大的字
- [ ] 超过 6 个字的结果不再使用 `104rpx` 和 `8rpx` 字距，完整可见、不横向溢出
- [ ] 「比我大 / 比我小」仍能切换，再次点中可取消
- [ ] 分享按钮仍是 `open-type="share"` 的 button
- [ ] 有广告时广告区有固定占位，不把按钮顶出屏幕外

**Verification:**
- [ ] Tests pass: `node tests/ui-smoke.js`
- [ ] Manual check: 打开「伯父」和一条「没有专门称呼」的描述结果，对比字号；切换比我大 / 比我小后称呼变化

**Dependencies:** Task 1

**Files likely touched:**
- `pages/result/result.wxml`
- `pages/result/result.wxss`
- `pages/result/result.js`
- `components/ad-slot/ad-slot.wxss`

**Estimated scope:** Medium: 4 files

## Task 5: 关系路径在窄屏可读

**Description:** 短路径保持现在的横向节点。节点多到一行放不下时，改成纵向步骤，避免只能横滑才看得完。两条路径（你的视角、他的视角）标题保留。

**Acceptance criteria:**
- [ ] 三步以内仍是横向节点，起点「你」或「他」和其他节点可区分
- [ ] 超过一行时改为纵向，每步都能读到，不要求横滑
- [ ] 路径文案仍来自现有 `pathItems`，不改计算

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Manual check: 「爸爸的哥哥」为横向；一条四步以上的链为纵向或可完整读完

**Dependencies:** Task 4

**Files likely touched:**
- `components/path-graph/path-graph.wxml`
- `components/path-graph/path-graph.wxss`
- `components/path-graph/path-graph.js`
- `pages/result/result.wxml`

**Estimated scope:** Medium: 4 files

## Task 6: 关于页改成可折叠

**Description:** 关于页保留全部原文。默认展开「怎么用」，其余小节收成标题，点开再看正文。反馈按钮和版本文案留在页尾。

**Acceptance criteria:**
- [ ] 八节标题都在，正文一个字不改
- [ ] 进入页面时只有「怎么用」展开
- [ ] 点标题可展开和收起，复制反馈模板仍可用

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Manual check: 展开「关于堂和表」，段落与现在的文案一致；复制后 toast 为「模板已复制」

**Dependencies:** Task 1

**Files likely touched:**
- `pages/about/about.wxml`
- `pages/about/about.wxss`
- `pages/about/about.js`

**Estimated scope:** Small: 3 files

## Checkpoint: 三页

- [ ] `npm test` 通过
- [ ] `node tests/ui-smoke.js` 通过
- [ ] 短称呼、长描述、远房、别称、要比大小五种结果看过
- [ ] 首页底部、结果页操作、关于页末尾都不贴着 Home Indicator
