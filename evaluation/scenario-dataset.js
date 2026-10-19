/*
 * 律衡决赛评测集 v1.0
 * 21个基础情境 × 5种自然语言表达 = 105条；标签由人工按法律领域标注。
 * 与生产代码分离，用于复现领域识别评测，不参与模型提示词。
 */
var LVHENG_EVAL_BASE = [
  ["labor","公司连续两个月没有发工资"],["labor","领导口头通知我明天不用来上班"],["labor","单位一直不和我签劳动合同"],
  ["consumer","网购买到的商品是假货"],["consumer","商家宣传的功能实际完全没有"],["consumer","预付卡门店突然跑路"],
  ["rent","退租后房东拒绝退押金"],["rent","租住的房屋甲醛严重超标"],["rent","租期内房东突然要求涨租"],
  ["loan","借给朋友的钱一直不还"],["loan","只有转账记录没有写借条"],["loan","借款利息约定得特别高"],
  ["traffic","发生追尾后对方拒绝赔偿"],["traffic","交通事故受伤如何主张误工费"],["traffic","电动车与汽车碰撞怎么定责"],
  ["marriage","准备离婚但不知道财产怎么分"],["marriage","对方长期不支付孩子抚养费"],["marriage","遭遇家庭暴力想申请保护令"],
  ["criminal","被电信诈骗转走十万元"],["criminal","有人持刀抢走我的手机"],["criminal","遭到敲诈勒索并被威胁"]
];
var LVHENG_EVAL_PREFIX=["","我想咨询：","请帮家里人看看，","事情很着急，","想知道依法该怎么办，"];
var LVHENG_EVAL_DATA=[];
LVHENG_EVAL_BASE.forEach(function(x,bi){LVHENG_EVAL_PREFIX.forEach(function(p,pi){LVHENG_EVAL_DATA.push({id:"E"+String(bi*5+pi+1).padStart(3,"0"),domain:x[0],text:p+x[1]});});});
