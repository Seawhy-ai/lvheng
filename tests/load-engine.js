// 律衡 · 测试套件 数据加载器
// 让 tests/ 目录下的断言文件能独立于浏览器直接加载 law.html 的知识库与判分逻辑。
// 用法：
//   <script src="tests/load-engine.js"></script>
// 加载后全局提供：DOMAIN_RULES / detectDomain / FAQ_DATA / kbHits / RIGHTS_DATA /
//   QUIZ_DATA(已合并扩展) / QUIZ_EXTRA_ADD / CASE_DATA / TEMPLATE_IDS / buildDocTemplate
//   _answerSetsEqual（判分函数）

// ---------- 从 law.html 抽取纯逻辑片段（不改动源文件） ----------
// FAQ 库条目前缀行（每行恰好一个 { d: ... }，q/a/law 同一对象内）
var FAQ_SRC = [];
try {
  (function() {
    var x = new XMLHttpRequest();
    x.open("GET", "../law.html", false);
    x.send(null);
    var lines = x.responseText.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();
      if (t.indexOf("{ d:") !== 0) continue;
      FAQ_SRC.push(t);
    }
  })();
} catch(e) { throw new Error("无法读取 law.html: " + e.message); }

function evalFaqObject(src) {
  var obj = {};
  var d = src.match(/\bd:\s*"([^"]*)"/); if (d) obj.d = d[1];
  var k = src.match(/\bk:\s*"([^"]*)"/); if (k) obj.k = k[1];
  var q = src.match(/\bq:\s*"([^"]*)"/); if (q) obj.q = q[1];
  var a = src.match(/\ba:\s*"([^"]*)"/); if (a) obj.a = a[1];
  var law = src.match(/\blaw:\s*"([^"]*)"/); if (law) obj.law = law[1];
  return obj;
}

// 逐条取出（对象里可能含换行，但每个 FAQ_DATA 条目以 { d: 开头、以 "}, 结尾）
var FAQ_DATA = [];
for (var fi = 0; fi < FAQ_SRC.length; fi++) {
  var src = FAQ_SRC[fi];
  // 合并从当前 { 到下一个 { 之前的全部文本（处理跨行条目）
  var buf = src;
  var j = fi + 1;
  while (j < FAQ_SRC.length && buf.indexOf("q:") < 0) { buf += " " + FAQ_SRC[j]; j++; }
  FAQ_DATA.push(evalFaqObject(buf));
}

// ---------- 领域识别（与 law.html DOMAIN_RULES 同步硬编码，见 §7 一致性校验） ----------
var DOMAIN_RULES = {
  labor: { name: "劳动纠纷", keys: "拖欠工资 欠薪 讨薪 工资 兼职工资 辞退 开除 裁员 劳动合同 实习 工伤 社保 加班 五险一金 劳动仲裁 劳动监察 灵活就业 外卖骑手" },
  consumer: { name: "消费维权", keys: "假货 退款 退货 退一赔三 七天无理由 网购 淘宝 拼多多 京东 外卖 商家 欺诈 保修 三包 12315 预付卡 跑路 定金" },
  rent: { name: "租房纠纷", keys: "租房 房东 租客 押金 退租 转租 中介 房租 腾房 租赁合同 甲醛 维修 涨租 二房东" },
  loan: { name: "民间借贷", keys: "借钱 借款 借条 欠条 民间借贷 利息 LPR 还钱 讨债 高利贷 转账 担保 保证人 支付令" },
  traffic: { name: "交通事故", keys: "交通事故 车祸 全责 碰撞 追尾 保险 理赔 交强险 定损 误工费 私了 碰瓷 电动车" },
  marriage: { name: "婚姻家庭", keys: "离婚 抚养 抚养费 彩礼 婚内财产 家暴 出轨 共同财产 探望 冷静期" },
  criminal: { name: "刑事", keys: "诈骗 抢劫 盗窃 故意伤害 敲诈 勒索 刑事 犯罪 报警 110 被骗" }
};
function detectDomain(text) {
  if (!text) return null;
  var best = null, bestScore = 0;
  for (var k in DOMAIN_RULES) {
    var ks = DOMAIN_RULES[k].keys.split(" "), s = 0;
    for (var i = 0; i < ks.length; i++) if (ks[i] && text.indexOf(ks[i]) >= 0) s++;
    if (s > bestScore) { bestScore = s; best = k; }
  }
  return bestScore > 0 ? best : null;
}

// ---------- FAQ 检索（与 law.html kbHits 同逻辑，限 3 条） ----------
function kbHits(text) {
  var out = [];
  for (var i = 0; i < FAQ_DATA.length && out.length < 3; i++) {
    var f = FAQ_DATA[i], ks = f.k.split(" "), hit = false;
    for (var j = 0; j < ks.length; j++) if (ks[j] && text.indexOf(ks[j]) >= 0) { hit = true; break; }
    if (hit) out.push({ q: f.q, a: f.a, law: f.law });
  }
  return out;
}

// ---------- 渠道库（源自 law.html RIGHTS_DATA 的 key + hotline 硬编码快照） ----------
var RIGHTS_DATA = [
  { key: "labor", hotline: "12333" },
  { key: "consumer", hotline: "12315" },
  { key: "rent", hotline: "12345" },
  { key: "loan", hotline: "12348" },
  { key: "traffic", hotline: "122" },
  { key: "marriage", hotline: "12348" }
];

// ---------- 题库（加载真实数据文件并执行合并逻辑，与 law.html 2035-2041 一致） ----------
var QUIZ_DATA = {};
var QUIZ_EXTRA_ADD = {};
var CASE_DATA = [];
var buildDocTemplate = null;

function loadScript(url) {
  var x = new XMLHttpRequest();
  x.open("GET", url, false);
  x.send(null);
  if (x.status !== 200 && x.status !== 0) throw new Error("加载失败: " + url + " (" + x.status + ")");
  return x.responseText;
}

function execInto(url, globalName) {
  var src = loadScript(url);
  var fn = new Function(src + "\n;return " + globalName + ";");
  return fn();
}

// 与 law.html 2021-2029 相同的数据文件引入顺序（相对 tests/ 目录，前缀 ../）
QUIZ_DATA = execInto("../quiz_data.js", "QUIZ_DATA");
QUIZ_EXTRA_ADD = execInto("../quiz_extra.js", "QUIZ_EXTRA_ADD");
CASE_DATA = execInto("../case_data.js", "CASE_DATA");
buildDocTemplate = execInto("../templates.js", "buildDocTemplate");

// 合并扩展（对应 law.html 2035-2041）
if (QUIZ_EXTRA_ADD && typeof QUIZ_EXTRA_ADD === "object") {
  for (var __ek in QUIZ_EXTRA_ADD) {
    if (QUIZ_EXTRA_ADD.hasOwnProperty(__ek)) {
      QUIZ_DATA[__ek] = (QUIZ_DATA[__ek] || []).concat(QUIZ_EXTRA_ADD[__ek]);
    }
  }
}

// 判分（对应 law.html answerSetsEqual）
function _answerSetsEqual(a, b) {
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every(function(x) { return b.indexOf(x) >= 0; });
  }
  return a === b;
}

// 模板 ID 快照（源自 templates.js buildDocTemplate 分支，与真实分支保持一致）
var TEMPLATE_IDS = ["purchase", "loan", "employment", "lease", "civilcomplaint", "laborarb", "consumercomplaint"];

// 由断言文件调用：loadScript 原始文本按需提供
var LAWH_PATH = "../law.html";
var LAW_HTML_RAW = (function() { try { return loadScript(LAWH_PATH); } catch(e) { return ""; } })();
var SW_PATH = "../sw.js";
var SW_RAW = (function() { try { return loadScript(SW_PATH); } catch(e) { return ""; } })();
