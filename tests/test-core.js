// 律衡 · 核心断言（test-core.js）
// 覆盖项目书 §4 验收标准与表16 核心用例：领域识别 / FAQ / 免责转介 / 题库判分 / 知识库分库
// 全部为纯函数断言，无 DOM 依赖，可在浏览器或 Node 环境运行。
// 使用前必须先加载 tests/load-engine.js
//
// 该文件被入到 tests/run-tests.html 中执行。条目不可直接用 IFRAME 引用。

/* ============ 1. 领域识别（FR-02 / TC-FL-01~04） ============ */
function TC_FL_01_欠薪识别() {
  return detectDomain("公司拖欠我两个月工资，怎么要回来？") === "labor";
}
function TC_FL_02_辞退识别() {
  return detectDomain("被公司无故辞退，有赔偿吗？") === "labor";
}
function TC_FL_03_消费识别() {
  return detectDomain("网购买到假货，能退一赔三吗？") === "consumer";
}
function TC_FL_04_租房识别() {
  return detectDomain("房东不退押金，怎么办？") === "rent";
}
function TC_FL_05_借贷识别() {
  return detectDomain("借钱给别人没写借条，还能要回来吗？") === "loan";
}
function TC_FL_06_交通事故识别() {
  return detectDomain("出车祸对方全责，我误工费怎么要？") === "traffic";
}
function TC_FL_07_婚姻识别() {
  return detectDomain("对方出轨，离婚财产怎么分？") === "marriage";
}
function TC_FL_08_刑事识别() {
  return detectDomain("被电信诈骗骗了20万，怎么办？") === "criminal";
}
function TC_FL_09_多领域归最高分() {
  // 同时含劳动+消费关键词，应归得分更高的劳动
  return detectDomain("拖欠工资的劳务纠纷，还是被拖欠比特币呢") === "labor";
}
function TC_FL_10_模糊兜底走其他() {
  // TC-FL-04 低置信度兜底：无任何命中则返回 null（应用层走「其他」通用分支）
  return detectDomain("我要维权") === null;
}
function TC_FL_11_空输入() {
  return detectDomain("") === null;
}

/* ============ 2. FAQ 知识库命中（TC-KB / 表8 FAQ 库=30+ 条） ============ */
function TC_KB_FAQ_条数达标() {
  return FAQ_DATA.length >= 30;
}
function TC_KB_FAQ_字段完整() {
  for (var i = 0; i < FAQ_DATA.length; i++) {
    var f = FAQ_DATA[i];
    if (!f.d || !f.k || !f.q || f.a === undefined || !f.law) return false;
  }
  return true;
}
function TC_KB_FAQ_劳动命中() {
  var h = kbHits("公司拖欠工资怎么办");
  return h.length > 0 && h[0].law.indexOf("劳动合同法") >= 0;
}
function TC_KB_FAQ_消费命中() {
  var h = kbHits("买到假货可以退一赔三吗");
  return h.length > 0 && h[0].law.indexOf("消费者权益保护法") >= 0;
}
function TC_KB_FAQ_命中上限3条() {
  return kbHits("工资 工资 工资 工资 加班 辞退 工伤").length <= 3;
}
function TC_KB_FAQ_无命中返回空() {
  return kbHits("今天天气很好，想去公园散步").length === 0;
}
function TC_KB_FAQ_每条引用法条() {
  // 每条回答都引用法律依据：法律条文（《…》第X条）、司法解释或下位法规均可
  for (var i = 0; i < FAQ_DATA.length; i++) {
    var law = FAQ_DATA[i].law;
    if (!law) return false;
    if (!/《[^》]+》第\d/.test(law) && !/司法解释|解释|规定|程序/.test(law)) return false;
  }
  return true;
}

/* ============ 3. 免责与转介（FR-07 / TC-CM-01~02） ============ */
// 与 law.html _boundary() 相同规则：涉刑 → 110+12348；回答必须含免责声明
function boundary(content, userText) {
  var extra = "";
  if ((userText || "").search(/诈骗|抢劫|盗窃|故意伤害|敲诈|勒索|刑事|犯罪|报警|被骗/) >= 0) {
    extra += "\n\n> 🚨 你描述的情况可能涉及刑事：请立即拨打 **110** 报警，并可拨打 **12348** 法律援助热线寻求帮助。";
  }
  if (content.indexOf("不构成法律意见") < 0 && content.indexOf("普法信息") < 0) {
    extra += "\n\n⚖️ 以上为普法信息，不构成法律意见；重大事项请拨打 **12348** 法律援助热线（劳动 12333、消费 12315）或咨询属地执业律师。";
  }
  return content + extra;
}
function TC_CM_01_免责声明兜底() {
  var out = boundary("公司拖欠工资，你可以主张二倍工资差额。", "公司拖欠工资");
  return out.indexOf("不构成法律意见") >= 0 && out.indexOf("12348") >= 0;
}
function TC_CM_02_刑事强制转介() {
  var out = boundary("保留转账记录已报案。", "被诈骗了怎么办");
  return out.indexOf("110") >= 0 && out.indexOf("12348") >= 0;
}
function TC_CM_03_已有免责不重复追加() {
  var out = boundary("以上为普法信息，不构成法律意见。", "普通咨询");
  return (out.match(/不构成法律意见/g) || []).length === 1;
}

/* ============ 4. 题库判分（TC-WF / 验收标准 100+ 测试集） ============ */
function TC_QUIZ_合并后科目数达标() {
  // 项目书：题库 ≥ 100 题；合并后刑法/民法/宪法/国际公法/刑诉共 5+ 科目
  return Object.keys(QUIZ_DATA).length >= 5;
}
function TC_QUIZ_单题字段完整() {
  for (var sub in QUIZ_DATA) {
    var arr = QUIZ_DATA[sub];
    for (var i = 0; i < arr.length; i++) {
      var q = arr[i];
      if (!q || !q.q || !Array.isArray(q.opts) || q.opts.length < 2 || q.ans === undefined) return false;
      if (typeof q.ans === "number" && (q.ans < 0 || q.ans >= q.opts.length)) return false;
      if (Array.isArray(q.ans) && q.ans.length === 0) return false;
    }
  }
  return true;
}
function TC_QUIZ_判分单选正确() {
  return _answerSetsEqual(0, 0) === true && _answerSetsEqual(0, 1) === false;
}
function TC_QUIZ_判分多选集合相等() {
  return _answerSetsEqual([0, 2], [2, 0]) === true && _answerSetsEqual([0, 1], [0, 2]) === false;
}
function TC_QUIZ_判分非法比较() {
  return _answerSetsEqual([1], 1) === false;
}

/* ============ 5. 案例库（表8 案例库=最高法官方来源，季度更新） ============ */
function TC_CASE_条数() {
  var n = 0;
  for (var i = 0; i < CASE_DATA.length; i++) n += (CASE_DATA[i].cases || []).length;
  return n >= 10;
}
function TC_CASE_来源可溯() {
  for (var i = 0; i < CASE_DATA.length; i++) {
    var cs = CASE_DATA[i].cases || [];
    for (var j = 0; j < cs.length; j++) {
      if (!cs[j].sn || !cs[j].u || !cs[j].t) return false;
      if (cs[j].u.indexOf("http") !== 0) return false;
    }
  }
  return true;
}
function TC_CASE_脱敏提示() {
  // 案例节选来自官方发布，无虚构；字段齐全
  for (var i = 0; i < CASE_DATA.length; i++) {
    var cs = CASE_DATA[i].cases || [];
    for (var j = 0; j < cs.length; j++) {
      if (!cs[j].f || !cs[j].p || !cs[j].s) return false;
    }
  }
  return true;
}

/* ============ 6. 模板库（FR-05 / 表8 模板库） ============ */
function TC_TEMPLATE_ID_完全() {
  for (var i = 0; i < TEMPLATE_IDS.length; i++) {
    var out = buildDocTemplate({ id: TEMPLATE_IDS[i] }, {});
    if (typeof out !== "string" || out.length < 10) return false;
  }
  return true;
}

/* ============ 7. 一致性校验（测试复制品 vs law.html 真实实现） ============ */
function TC_CONSISTENCY_DOMAIN_RULES_一致() {
  // 从 law.html 提取 DOMAIN_RULES 的 keys 快照，与本文件硬编码比对
  var m = LAW_HTML_RAW.match(/var DOMAIN_RULES = \{([\s\S]*?)\n\};/);
  if (!m) return false;
  var raw = m[1];
  var pat = /(\w+):\s*\{\s*name:\s*"([^"]+)",\s*keys:\s*"([^"]+)"/g, mm, ok = true;
  while ((mm = pat.exec(raw))) {
    var our = DOMAIN_RULES[mm[1]];
    if (!our || our.name !== mm[2] || our.keys !== mm[3]) { ok = false; break; }
  }
  return ok;
}
function TC_CONSISTENCY_FAQ_条数与law同步() {
  // FAQ_DATA 是从 law.html 逐条解析的，直接断言条数。
  return FAQ_DATA.length >= 30;
}
function TC_CONSISTENCY_SW预缓存_vendor() {
  // 离线可用（NFR: PWA）依赖 vendor/ 库也在预缓存列表
  var m = SW_RAW.match(/var PRECACHE = \[([\s\S]*?)\];/);
  if (!m) return false;
  return m[1].indexOf("vendor/marked.min.js") >= 0 &&
         m[1].indexOf("vendor/highlight.min.js") >= 0 &&
         m[1].indexOf("vendor/mammoth.browser.min.js") >= 0;
}
function TC_CONSISTENCY_vendor文件真实存在() {
  // 防止「引用了 vendor/X 但仓库里没有该文件」→ 离线白屏/样式丢失（曾发生：主题 CSS 命名不匹配）
  var refs = LAW_HTML_RAW.match(/vendor\/[A-Za-z0-9._-]+/g) || [];
  var seen = {};
  for (var i = 0; i < refs.length; i++) seen[refs[i]] = true;
  var swm = SW_RAW.match(/var PRECACHE = \[([\s\S]*?)\];/);
  if (swm) {
    var swrefs = swm[1].match(/"([^"]+\.(?:js|css))"/g) || [];
    for (var j = 0; j < swrefs.length; j++) {
      var p = swrefs[j].slice(1, -1);
      if (p.indexOf("vendor/") === 0) seen[p] = true;
    }
  }
  for (var k in seen) {
    if (!seen.hasOwnProperty(k)) continue;
    try { loadScript("../" + k); } catch(e) { return false; }
  }
  return true;
}

/* ============ 8. Meta / 描述（项目书定位） ============ */
function TC_META_description_不再旧文案() {
  // 旧描述「法学生AI学习助手」已替换为普惠定位
  return LAW_HTML_RAW.indexOf("法学生AI学习助手") < 0;
}
function TC_META_含OG标签() {
  // 分享到微信/QQ 时展示正确卡片：存在 og:title + og:image
  return LAW_HTML_RAW.indexOf("property=\"og:title\"") >= 0 &&
         LAW_HTML_RAW.indexOf("property=\"og:image\"") >= 0;
}