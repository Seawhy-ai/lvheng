/* Classwork first. Independent practice never changes class grades. */
window.createReportJournal=function(ctx){
 const e=ctx.esc;
 const practiceRuns=new Map();
 let activeReport=null;
 function key(taskId,index){return JSON.stringify([ctx.user()?.id,taskId,index])}
 function date(value){const d=new Date(value);return value&&!Number.isNaN(d.getTime())?d.toLocaleDateString('zh-CN'):'日期未记录'}
 function progress(taskId,index){const run=practiceRuns.get(key(taskId,index));return run?'<span class="journey-done">已完成本次巩固</span><p>相似题 '+run.correct+'/'+run.total+' 题正确 · '+e(date(run.at))+'<br>这是一次练习结果，不等同于已经掌握。仅保留在本次页面会话，不同步教师端。</p>':'<span>待巩固</span><p>换一个情境，再检查是否能识别相同条件。</p>'}
 function task(t,i){
  const review=t.review||[],weak=review.filter(q=>!q.correct),good=review.filter(q=>q.correct),next=weak[0]||review[0];
  return '<article class="journal-task"><div class="journal-task-rail"><span>'+String(i+1).padStart(2,'0')+'</span></div><div class="journal-task-body"><header><div><small>'+e(t.className||'班级任务')+' · '+e(date(t.submittedAt))+'</small><h2>'+e(t.taskTitle)+'</h2></div><span class="journal-result">'+(review.length?t.correct+'/'+t.questionCount+' 题正确':'已提交')+'</span></header>'+
   (review.length?'<div class="journal-findings"><div><span>这次判断正确</span><p>'+e(good.length?[...new Set(good.map(q=>q.label))].join('、'):'这份任务的已记录题目还需要逐项回顾。')+'</p></div><div><span>下一步关注</span><p>'+e(weak.length?[...new Set(weak.map(q=>q.label))].join('、'):'本次已记录题目均判断正确，可以换个情境再验证。')+'</p></div></div><details class="journal-evidence"><summary>展开作答依据 · '+review.length+' 道题</summary>'+review.map(q=>'<section class="journal-question"><small>第 '+(q.questionIndex+1)+' 题 · '+(q.correct?'判断正确':'需要回顾')+'</small><h3>'+e(q.prompt)+'</h3><div class="journal-answer-pair"><p><span>你的选择</span>'+e(q.selected)+'</p><p><span>参考答案</span>'+e(q.answer)+'</p></div><p class="journal-explanation">'+e(q.explain)+'</p><button class="text-btn" data-task-practice="'+i+'" data-question="'+q.questionIndex+'">围绕这道题，再练一次 ↗</button></section>').join('')+'</details>':'<p class="journal-unavailable">这份记录暂未提供逐题数据，不能据此推断薄弱点。成绩保留在下方。</p>')+
   (next?'<div class="journal-path"><div><small>01 / 班级任务</small><b>'+e(weak.length?'找到需要回顾的题目':'完成本次判断')+'</b></div><div><small>02 / 针对性练习</small><button data-task-practice="'+i+'" data-question="'+next.questionIndex+'">生成相似题 ↗</button></div><div data-practice-status="'+i+'" data-question="'+next.questionIndex+'"><small>03 / 再次检查</small>'+progress(t.taskId,next.questionIndex)+'</div></div>':'')+'</div></article>';
 }
 function render(report){activeReport=report;const reviews=report.taskReviews||[],fallback=(report.recent||[]).map(t=>({...t,review:[]}));const tasks=reviews.length?reviews:fallback;
  const count=reviews.reduce((n,t)=>n+t.questionCount,0),wrong=reviews.reduce((n,t)=>n+t.questionCount-t.correct,0);
  return '<section class="report-journal"><header class="journal-cover"><div><small>学习手记 / CLASSROOM FIRST</small><h2>让每一次判断，<br>都有下一步。</h2><p>'+e(count?'从 '+count+' 道实际作答中，'+(wrong?'找到 '+wrong+' 道值得再想一步的题。':'暂未发现错误判断，继续检验理解。'):'从老师布置的任务出发，看清依据，再练一次。')+'</p></div><div class="journal-seal"><b>'+Number(report.completed||0)+'</b><span>份班级任务已完成</span></div></header><div class="journal-section-title"><h2>我的班级学习</h2><span>记录 → 依据 → 巩固</span></div>'+(tasks.length?'<div class="journal-timeline">'+tasks.map(task).join('')+'</div>':'<div class="journal-empty"><h3>第一篇手记，等你来写。</h3><p>完成一份教师发布的任务，这里就会留下具体作答与下一步练习线索。</p></div>')+'<details class="journal-grades"><summary>查看班级成绩摘要</summary><p>平均分 '+e(report.average==null?'—':report.average)+' · 分数含部分得分，不等同于正确率。</p>'+tasks.map(t=>'<div><span>'+e(t.taskTitle)+'</span><b>'+e(t.total==null?'—':t.total)+'</b></div>').join('')+'</details><aside class="journal-boundary"><b>自主探索，单独记录</b><p>小林、小禾和阿澈的故事不计入班级成绩；当前尚未接入这份报告。相似题属于自主巩固，模型解析需核验，不代替教师评价。</p></aside></section>';
 }
 function bind(){document.querySelectorAll('[data-task-practice]').forEach(b=>b.onclick=()=>{const t=activeReport?.taskReviews?.[Number(b.dataset.taskPractice)];const q=t?.review.find(x=>x.questionIndex===Number(b.dataset.question));if(t&&q)ctx.practice({taskId:t.taskId,questionIndex:q.questionIndex,label:q.label})})}
 function record(point,result){practiceRuns.set(key(point.taskId,point.questionIndex),{...result,at:new Date().toISOString()});document.querySelectorAll('[data-practice-status]').forEach(el=>{const t=activeReport?.taskReviews?.[Number(el.dataset.practiceStatus)];if(t&&t.taskId===point.taskId&&Number(el.dataset.question)===point.questionIndex)el.innerHTML='<small>03 / 再次检查</small>'+progress(point.taskId,point.questionIndex)})}
 function teacher(dash,tasks){
  const available=Array.isArray(dash.questionInsights),insights=(dash.questionInsights||[]).map((q,index)=>({...q,index})).filter(q=>q.attempts>0&&q.wrong>0).sort((a,b)=>b.wrong/b.attempts-a.wrong/a.attempts||b.wrong-a.wrong);
  const top=insights[0],stats=dash.stats||{},published=tasks.filter(t=>t.status==='published');
  const rate=q=>Math.round(q.wrong/q.attempts*100);
  const question=(q,i)=>'<article class="teaching-question priority-question"><div><div class="priority-meta"><span>关注 '+String(i+1).padStart(2,'0')+'</span><small>'+e(q.taskTitle)+' · 第 '+(q.questionIndex+1)+' 题</small></div><h3>'+e(q.label)+'</h3><p>'+e(q.prompt)+'</p><div class="mistake-meter"><i style="width:'+rate(q)+'%"></i></div><div class="priority-numbers"><b>'+rate(q)+'% 错误率</b><span>'+Number(q.wrong)+' / '+Number(q.attempts)+' 份作答错误</span></div><details><summary>展开选项分布与参考解析</summary>'+(q.wrongChoices||[]).map(c=>'<p>'+e(c.text)+' <b>· '+Number(c.count)+' 次</b></p>').join('')+'<p>参考答案：'+e(q.answer)+'</p><p>'+e(q.explain)+'</p></details><button class="secondary" data-teaching-focus="'+q.index+'">围绕此考点备课 ↗</button></div></article>';
  return '<section class="teaching-evidence teaching-brief"><header class="insight-hero"><div><small>本班教学观察</small><h2>'+e(top?'下一堂课，先讲「'+top.label+'」':!stats.submissions?'先收集作答，再判断学情':available?'已记录题目暂未发现错误':'逐题数据尚未就绪')+'</h2><p>'+e(top?'这道题有 '+top.wrong+' / '+top.attempts+' 份作答出错。建议先追问判断依据，再安排针对练习。':!stats.submissions?'发布任务并邀请学生完成，提交后会形成具体的教学线索。':available?'可以用新情境检验迁移能力；当前结果不代表所有知识均已掌握。':'目前仅展示提交统计，不推断学生的薄弱点。')+'</p></div><div class="insight-hero-number"><b>'+ (top?rate(top)+'%':Number(stats.submissions||0))+'</b><span>'+(top?'优先关注题的错误率':'有效提交')+'</span></div></header><div class="insight-summary-strip"><div><small>班级学生</small><b>'+Number(stats.students||0)+'<em> 人</em></b></div><div><small>有效提交</small><b>'+Number(stats.submissions||0)+'<em> 份</em></b></div><div><small>已发布任务</small><b>'+published.length+'<em> 项</em></b></div></div>'+(top?'<div class="insight-section-heading"><h3>优先回顾的题目</h3><span>按错误率排序 · 注意样本量</span></div><div class="priority-grid">'+insights.slice(0,3).map(question).join('')+'</div>'+(insights.length>3?'<details class="insight-more"><summary>其余 '+(insights.length-3)+' 道错题</summary>'+insights.slice(3).map((q,i)=>question(q,i+3)).join('')+'</details>':''):'<div class="insight-empty">'+(available?'有真实作答后，这里会呈现需要关注的具体题目。':'逐题错误分布暂不可用，提交统计仍可查看。')+'</div>')+'<details class="insight-more"><summary>任务提交进度 · '+published.length+' 项</summary><div class="teaching-completion">'+(published.length?published.map(t=>'<div><b>'+e(t.title)+'</b><span>'+Number(t.submissionCount||0)+' / '+Number(stats.students||0)+' 人已提交</span></div>').join(''):'<p>暂无已发布任务。</p>')+'</div></details><p class="insight-footnote">错误分布来自已记录作答；错误原因需通过课堂追问确认，不据此给学生贴标签。</p></section>';
 }
 function focusedRender(report){
  const template=document.createElement('template');template.innerHTML=render(report);
  const reviews=report.taskReviews||[],points=reviews.flatMap((t,i)=>(t.review||[]).map(q=>({...q,taskIndex:i})));
  const weak=points.filter(q=>!q.correct),next=weak[0]||points[0];
  const ability={issue:'问题识别',fact:'事实判断',evidence:'证据选择',law:'依据核验',path:'路径选择'};
  const topic=q=>ability[q.ability]||q.label||'本次错题';
  const cover=template.content.querySelector('.journal-cover');
  cover.innerHTML='<div><small>你的下一步 / NEXT STEP</small><h2>'+e(next?(weak.length?'先练一练：'+topic(next):'答得不错，换个情境试试'):'从第一份班级任务开始')+'</h2><p>'+e(next?(weak.length?'根据已记录的作答，先从这道题重新理解依据，再用相似题检验。':'已记录题目均答对。尝试相似情境，看看能否独立作出判断。'):'提交任务后，这里会告诉你先回顾什么、接着练什么。')+'</p>'+(next?'<div class="journal-actions"><button class="journal-primary" data-task-practice="'+next.taskIndex+'" data-question="'+next.questionIndex+'">'+(weak.length?'开始针对练习':'挑战相似情境')+' ↗</button><button class="journal-review-link" data-review-task="'+next.taskIndex+'">先看作答依据 ↓</button></div>':'')+'</div><div class="journal-seal"><b>'+Number(report.completed||0)+'</b><span>份任务已完成</span></div>';
  const focus=document.createElement('div');focus.className='journal-focus';
  focus.innerHTML='<div><small>需要回顾</small><h3>'+ (weak.length?weak.length+' 道题，逐个解决':'暂未发现错题')+'</h3><p>'+e(weak.length?[...new Set(weak.map(topic))].slice(0,3).join(' · '):points.length?'继续用新情境检验理解。':'暂无逐题数据，不推断薄弱点。')+'</p></div><div><small>已有基础</small><h3>'+points.filter(q=>q.correct).length+' 道题判断正确</h3><p>查看任务记录，可以找到你的选择与参考解析。</p></div>';
  cover.after(focus);
  template.content.querySelectorAll('.journal-task').forEach((article,i)=>{
   const body=article.querySelector('.journal-task-body'),header=body.querySelector('header');
   const details=document.createElement('details');details.className='journal-task-fold';details.dataset.taskIndex=i;
   const summary=document.createElement('summary');summary.innerHTML=header.innerHTML+'<span class="journal-open-label">查看记录 ＋</span>';header.remove();
   details.append(summary);while(body.firstChild)details.append(body.firstChild);body.append(details);
  });
  return template.innerHTML;
 }
 function focusedBind(){bind();document.querySelectorAll('[data-review-task]').forEach(b=>b.onclick=()=>{
  const fold=document.querySelector('[data-task-index="'+b.dataset.reviewTask+'"]');if(!fold)return;
  fold.open=true;const evidence=fold.querySelector('.journal-evidence');if(evidence)evidence.open=true;
  fold.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 })}
 return {render:focusedRender,bind:focusedBind,record,teacher};
};
