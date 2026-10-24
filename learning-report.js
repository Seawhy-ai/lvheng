/* Evidence-based diagnosis and optional model-generated independent practice. */
window.createLearningReport=function(ctx){
 const tips={issue:"先明确争议的法律关系，再区分双方的具体请求。",fact:"按时间、主体、约定和履行结果整理事实，找出缺失条件。",evidence:"区分陈述与证据，检查来源、完整性以及相互印证关系。",law:"核对规则的适用条件与现行文本，避免仅凭条文名称判断。",path:"比较协商、投诉、仲裁或诉讼的条件、时效与成本。"};
 let currentReport=null;
 function point(p,i){
  const weak=p.correct<p.attempts;
  return '<article class="knowledge-point"><div class="knowledge-title"><span>'+ctx.esc(ctx.abilities[p.ability]||"知识点")+'</span><small>'+p.correct+'/'+p.attempts+' 次判断正确</small></div><h3>'+ctx.esc(p.label)+'</h3><p>'+ctx.esc(weak?tips[p.ability]||"对照解析重新梳理判断条件。":"本次记录表现良好，可换一个情境检验理解。")+'</p>'+
  (p.attempts<3?'<small class="sample-note">记录较少，仅作为下一步练习的线索。</small>':'')+
  (p.evidence||[]).map(e=>'<details class="knowledge-evidence"><summary>错题依据 · '+ctx.esc(e.taskTitle)+'</summary><p>你的选择：'+ctx.esc(e.selected)+'</p><p>参考答案：'+ctx.esc(e.answer)+'</p><div>'+ctx.esc(e.explain)+'</div></details>').join("")+
  '<button class="secondary" data-similar="'+i+'">✦ AI生成3道相似题</button></article>';
 }
 function render(report){
  currentReport=report;
  const d=report.diagnosis;
  if(!report.completed)return '<section class="panel knowledge-analysis"><h2>知识点分析</h2><p>完成第一份班级任务后，这里会根据逐题作答指出需要巩固的考点。</p></section>';
  if(!d)return '<section class="panel knowledge-analysis"><h2>知识点分析</h2><p>逐题分析暂时不可用，现有成绩仍可查看。请稍后重新打开报告。</p></section>';
  const points=d.points||[],weak=points.filter(p=>p.correct<p.attempts);
  return '<section class="panel knowledge-analysis"><div class="panel-head"><h2>知识点分析</h2><small>依据 '+d.questionCount+' 道作答记录</small></div><p class="knowledge-summary">'+(weak.length?'发现 '+weak.length+' 个需要回顾的考点，优先练习下面这些。':'现有记录中没有发现错题，可通过情境迁移继续巩固。')+'</p><p class="sample-note">按题目考点统计真实对错；五维分数含部分得分，不能当作正确率。分析不代表对知识掌握程度的最终判断。</p><div class="knowledge-grid">'+points.slice(0,3).map(point).join("")+'</div>'+(points.length>3?'<details class="knowledge-more"><summary>查看其余 '+(points.length-3)+' 个考点</summary><div class="knowledge-grid">'+points.slice(3).map((p,i)=>point(p,i+3)).join("")+'</div></details>':'')+'</section>';
 }
 function bind(){document.querySelectorAll("[data-similar]").forEach(b=>b.onclick=()=>generate(currentReport.diagnosis.points[Number(b.dataset.similar)]))}
 async function generate(point){
  const owner=ctx.user?.()?.id;
  ctx.showModal('<section id="similarPractice" class="practice-sheet"><small>针对考点巩固</small><h2>'+ctx.esc(point.label)+'</h2><p>生成三道新情境题，完成后查看逐题解析。自主练习不计入班级成绩。</p><div role="status" class="practice-status">正在设计相似题，请稍候…</div></section>');
  const target=document.getElementById("similarPractice");
  try{
   const result=await ctx.generate({taskId:point.taskId,questionIndex:point.questionIndex});
   if(!target.isConnected||(ctx.user&&ctx.user()?.id!==owner))return;
   const p=result.practice;
   if(!p||!Array.isArray(p.questions)||p.questions.length!==3)throw Error("题目返回不完整，请重试");
   target.innerHTML='<small>AI生成 · 自主巩固</small><h2>换个情境，再试一次</h2><p>'+ctx.esc(p.note)+'</p><form id="similarForm">'+p.questions.map((q,i)=>'<section class="question"><small>0'+(i+1)+' · '+["基础辨析","情境迁移","综合应用"][i]+'</small><h3>'+ctx.esc(q.prompt)+'</h3><div class="options">'+q.options.map((o,j)=>'<label><input type="radio" name="practice'+i+'" value="'+j+'" required><span>'+ctx.esc(o)+'</span></label>').join("")+'</div><fieldset class="practice-confidence"><legend>对这次判断，你有多大把握？</legend>'+[['low','不太确定'],['medium','有些把握'],['high','很有把握']].map(([value,label])=>'<label><input type="radio" name="confidence'+i+'" value="'+value+'" required>'+label+'</label>').join('')+'</fieldset></section>').join("")+'<button class="primary">完成练习，查看解析</button></form><div id="similarFeedback" aria-live="polite"></div>';
   target.querySelector("form").onsubmit=e=>{
    e.preventDefault();if(ctx.user&&ctx.user()?.id!==owner)return;const fd=new FormData(e.target);let correct=0;const calibration=[];
    const review=p.questions.map((q,i)=>{const selected=Number(fd.get("practice"+i)),ok=selected===q.answer;if(ok)correct++;calibration.push({prompt:q.prompt,correct:ok,confidence:fd.get("confidence"+i)});return '<article class="review-item '+(ok?'is-correct':'needs-review')+'"><small>第 '+(i+1)+' 题 · '+(ok?'判断正确':'需要巩固')+'</small><h3>'+ctx.esc(q.prompt)+'</h3><p>你的选择：'+ctx.esc(q.options[selected])+'</p><p class="review-answer">参考答案：'+ctx.esc(q.options[q.answer])+'</p><div class="review-explanation">'+ctx.esc(q.explain)+'</div></article>'}).join("");
    e.target.hidden=true;
    if(ctx.onPracticeComplete)ctx.onPracticeComplete(point,{correct,total:p.questions.length,calibration});
    target.querySelector("#similarFeedback").innerHTML='<h2>答对 '+correct+' / 3 题</h2><p class="calibration-feedback">很有把握但答错：'+calibration.filter(x=>x.confidence==='high'&&!x.correct).length+' 道。返回报告的「迁移记录」可查看判断校准。</p><p>'+(correct===3?'本组题表现良好，试着说明每题的判断理由。':'对照下面的解析，找出漏掉的条件，再回顾原考点。')+'</p>'+review+'<button type="button" class="secondary" id="practiceAgain">再生成一组</button>';
    target.querySelector("#practiceAgain").onclick=()=>generate(point);
    target.querySelector("#similarFeedback").scrollIntoView({block:"start",behavior:"smooth"});
   };
  }catch(error){
   if(!target.isConnected||(ctx.user&&ctx.user()?.id!==owner))return;
   target.querySelector(".practice-status").textContent="未能生成："+error.message;
   const retry=document.createElement("button");retry.className="secondary";retry.textContent="重新生成";retry.onclick=()=>generate(point);target.append(retry);
  }
 }
 return {render,bind,generate};
};
