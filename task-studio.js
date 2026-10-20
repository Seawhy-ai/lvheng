(function(){
"use strict";
window.createTaskStudio=function(ctx){
  const {api,esc,showModal,toast,templates,abilities}=ctx;
  const keys=Object.keys(abilities);
  const clone=v=>JSON.parse(JSON.stringify(v));
  const label=t=>t.status==="draft"?"草稿":t.status==="closed"?"已结束":expired(t)?"已截止":"进行中";
  const expired=t=>!!t.settings?.dueAt&&Date.parse(t.settings.dueAt)<=Date.now();
  const dateLabel=d=>d?new Date(d).toLocaleString("zh-CN",{hour12:false}):"不限截止时间";
  const localDate=d=>{if(!d)return"";const x=new Date(d);return new Date(x-x.getTimezoneOffset()*60000).toISOString().slice(0,16)};
  function row(t){
    return '<div class="studio-task-row"><div><span class="studio-status '+esc(t.status)+'">'+label(t)+'</span><b>'+esc(t.title)+'</b><small>'+esc(dateLabel(t.settings?.dueAt))+'</small></div><div class="studio-task-count"><strong>'+Number(t.submissionCount||0)+'</strong><small>份提交</small></div><button class="secondary" data-manage="'+esc(t.id)+'">'+(t.status==="draft"?"继续设计":"查看进度")+' →</button></div>';
  }
  function bind(){
    document.querySelectorAll("[data-manage]").forEach(b=>b.onclick=()=>manage(b.dataset.manage));
  }
  async function edit(classId,taskId,aiFirst=false){
    let task;
    try{
      task=taskId?(await api("task",{id:taskId})).task:null;
      if(task&&task.status!=="draft")throw Error("已发布任务已锁定，请创建新的补充练习");
    }catch(e){toast(e.message);return}
    let draft=task?clone(task):{title:templates.labor.title,scenario:templates.labor.scenario,
      content:{questions:clone(templates.labor.questions),settings:{goal:"训练大学生识别关键事实、证据与合法行动路径",audience:"大学生",difficulty:"进阶",duration:"20分钟",dueAt:null}}};
    draft.content.settings=Object.assign({goal:"",audience:"大学生",difficulty:"进阶",duration:"20分钟",dueAt:null},draft.content.settings);
    let current=-1,preview=false,busy=false,reviewed=false,dirty=false,source=task?"已保存草稿":"情境模板";
    const settings=()=>draft.content.settings;
    const root=()=>document.getElementById("taskStudio");
    const input=(id,value,max=500)=>'<input id="'+id+'" maxlength="'+max+'" value="'+esc(value||"")+'">';
    const field=(name,html)=>'<label class="studio-field"><span>'+name+'</span>'+html+'</label>';
    function sync(){
      const get=id=>document.getElementById(id);
      if(!get("studioTitle"))return;
      draft.title=get("studioTitle").value;draft.scenario=get("studioScenario").value;
      settings().goal=get("studioGoal").value;
      settings().audience=get("studioAudience").value;
      settings().difficulty=get("studioDifficulty").value;
      settings().duration=get("studioDuration").value;
      settings().dueAt=get("studioDue").value?new Date(get("studioDue").value).toISOString():null;
      if(current>=0&&!preview){
        const q=draft.content.questions[current];
        q.prompt=get("studioPrompt").value;q.explain=get("studioExplain").value;
        q.options=q.options.map((_,i)=>get("studioOption"+i).value);
        q.answer=Number(get("studioAnswer").value);
      }
    }
    function valid(){
      if(draft.title.trim().length<2||draft.scenario.trim().length<10)throw Error("请填写至少2字标题和10字情境");
      draft.content.questions.forEach((q,i)=>{
        if(q.prompt.trim().length<5||q.options.some(o=>!o.trim())||q.explain.trim().length<2)
          throw Error("第"+(i+1)+"题的题干、选项或解析未填写完整");
        if(!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)throw Error("请选择正确答案");
      });
      if(settings().dueAt&&Date.parse(settings().dueAt)<=Date.now())throw Error("截止时间应晚于当前时间");
    }
    function previewHtml(){
      return '<article class="studio-paper"><small>学生视角 · 不显示答案与解析</small><h2>'+esc(draft.title)+'</h2><p>'+esc(draft.scenario)+'</p><div class="studio-due">'+esc(dateLabel(settings().dueAt))+' · 每人提交一次</div>'+draft.content.questions.map((q,i)=>'<section><small>0'+(i+1)+' / '+esc(abilities[q.ability])+'</small><h3>'+esc(q.prompt)+'</h3>'+q.options.map((o,j)=>'<label><input type="radio" name="preview-'+i+'"> '+String.fromCharCode(65+j)+'. '+esc(o)+'</label>').join('')+'</section>').join('')+'<p class="studio-muted">这是预览，不会产生学生提交记录。</p></article>';
    }
    function render(){
      const q=current>=0?draft.content.questions[current]:null;
      showModal('<section id="taskStudio" class="task-studio"><header class="studio-heading"><div><small>律衡 / 教学设计工作台</small><h2>让任务有目标，让学习可观察</h2><p>设计 → 审核 → 发布 → 观察 · '+esc(source)+'</p></div><span class="studio-save-state">'+(dirty?"有未保存修改":taskId?"草稿已保存":"尚未保存")+'</span></header>'+
        '<div class="studio-layout"><aside class="studio-nav"><button data-step="-1" class="'+(current===-1?'active':'')+'"><em>01</em><span>教学设计<small>情境与发布设置</small></span></button>'+
        keys.map((k,i)=>'<button data-step="'+i+'" class="'+(current===i?'active':'')+'"><em>0'+(i+2)+'</em><span>'+abilities[k]+'<small>第 '+(i+1)+' 个学习环节</small></span></button>').join('')+
        '<div class="studio-coach"><img src="whale-mascot.png" alt="小衡"><b>小衡设计助手</b><p>我起草，你把关。发布后锁定题目，保证评价标准一致。</p></div></aside>'+
        '<main class="studio-editor"><div class="studio-toolbar"><b>'+(preview?'学生预览':current<0?'教学目标与情境':abilities[q.ability])+'</b><button id="studioPreview" class="secondary">'+(preview?"返回编辑":"学生视角预览 ↗")+'</button></div>'+
        '<div class="studio-basics" '+(preview||current>=0?'hidden':'')+'><div class="studio-entry-tabs"><button data-template="labor">兼职欠薪</button><button data-template="consumer">网购纠纷</button><button data-template="rent">租房押金</button><button id="studioBlank">自主创建</button></div>'+
        field("任务标题",input("studioTitle",draft.title,80))+field("教学目标",'<textarea id="studioGoal" maxlength="500" rows="2">'+esc(settings().goal)+'</textarea>')+
        field("情境描述",'<textarea id="studioScenario" maxlength="1500" rows="5">'+esc(draft.scenario)+'</textarea>')+
        '<div class="studio-fields">'+field("学习对象",input("studioAudience",settings().audience,80))+field("预计时长",input("studioDuration",settings().duration,30))+
        field("难度",'<select id="studioDifficulty">'+["基础","进阶","挑战"].map(x=>'<option '+(settings().difficulty===x?'selected':'')+'>'+x+'</option>').join('')+'</select>')+
        field("截止时间（本地时间，可留空）",'<input type="datetime-local" id="studioDue" value="'+localDate(settings().dueAt)+'">')+'</div>'+
        '<div class="studio-policy"><b>提交规则</b><span>每名学生提交一次；截止后禁止提交；客观题按答案评分。</span></div><button class="primary" id="studioGenerate">✦ 按目标生成整份草稿</button><p class="studio-muted">生成内容不会自动发布；法条及答案需要教师核验。</p>'+
        (settings().teacherNote?'<div class="studio-policy"><b>小衡的审核提醒</b><span>'+esc(settings().teacherNote)+'</span></div>':'')+'</div>'+
        (preview?previewHtml():q?'<div class="studio-question">'+field("题干",'<textarea id="studioPrompt" maxlength="500" rows="3">'+esc(q.prompt)+'</textarea>')+
        q.options.map((o,i)=>field(String.fromCharCode(65+i)+" · 选项",input("studioOption"+i,o,200))).join('')+
        field("正确答案",'<select id="studioAnswer">'+q.options.map((o,i)=>'<option value="'+i+'" '+(q.answer===i?'selected':'')+'>'+String.fromCharCode(65+i)+'</option>').join('')+'</select>')+
        field("答案解析 / 待核验依据",'<textarea id="studioExplain" maxlength="500" rows="4">'+esc(q.explain)+'</textarea>')+
        field("给小衡的修改要求",input("studioInstruction","",500))+'<button class="secondary" id="studioRegenerate">✦ 只重写这一题</button><p class="studio-muted">其他题目保持不变。新内容仍需审核。</p></div>':'')+
        '</main><aside class="studio-summary"><small>任务结构</small><h3>五步，完成一次判断。</h3><ol>'+keys.map(k=>'<li>'+abilities[k]+'</li>').join('')+'</ol><hr><p>面向 '+esc(settings().audience||"待填写")+'</p><p>'+esc(settings().duration)+' · '+esc(settings().difficulty)+'</p><p>'+esc(dateLabel(settings().dueAt))+'</p><p>答案与解析仅在教师编辑界面显示。</p></aside></div>'+
        '<footer class="studio-footer"><label><input type="checkbox" id="studioReviewed" '+(reviewed?'checked':'')+'> 我已核验题目、答案与法律依据</label><div><button id="studioSave" class="secondary">保存草稿</button><button id="studioPublish" class="primary">保存并发布 →</button></div></footer><p id="studioMessage" role="status" aria-live="polite"></p></section>');
      root().querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>{sync();current=Number(b.dataset.step);preview=false;render()});
      document.getElementById("studioPreview").onclick=()=>{sync();preview=!preview;render()};
      root().querySelectorAll("[data-template]").forEach(b=>b.onclick=()=>{
        if(dirty&&!confirm("切换模板将替换当前题目和情境，继续吗？"))return;
        sync();const t=templates[b.dataset.template];draft.title=t.title;draft.scenario=t.scenario;draft.content.questions=clone(t.questions);
        dirty=true;reviewed=false;source="情境模板";render();
      });
      document.getElementById("studioBlank").onclick=()=>{
        if(dirty&&!confirm("清空当前题目并自主创建，继续吗？"))return;
        sync();draft.title="";draft.scenario="";draft.content.questions=keys.map(ability=>({ability,prompt:"",options:["","","",""],answer:0,explain:""}));
        dirty=true;reviewed=false;source="自主创建";render();
      };
      root().querySelectorAll("input,textarea,select").forEach(el=>el.addEventListener("input",()=>{
        if(el.id==="studioReviewed"){reviewed=el.checked;return}
        if(el.name.startsWith("preview-")||el.id==="studioInstruction")return;
        dirty=true;reviewed=false;document.getElementById("studioReviewed").checked=false;
        root().querySelector(".studio-save-state").textContent="有未保存修改";
      }));
      document.getElementById("studioGenerate").onclick=()=>generate();
      const regen=document.getElementById("studioRegenerate");if(regen)regen.onclick=()=>generate(true);
      document.getElementById("studioSave").onclick=()=>save(false);
      document.getElementById("studioPublish").onclick=()=>save(true);
      if(aiFirst){aiFirst=false;document.getElementById("studioGoal").focus()}
    }
    function working(on,message=""){
      busy=on;root()?.querySelectorAll("button,input,textarea,select").forEach(el=>el.disabled=on);
      const status=document.getElementById("studioMessage");if(status)status.textContent=message;
    }
    async function generate(single=false){
      if(busy)return;sync();
      if(!ctx.online()){toast("当前预览不支持生成内容，请返回正式学习空间");return}
      const index=current;
      const instruction=document.getElementById("studioInstruction")?.value||"";
      working(true,single?"小衡正在重写这一题…":"小衡正在设计完整任务，请稍候…");
      try{
        if(single){
          const r=await api("questionDraft",{index,scenario:draft.scenario,content:draft.content,instruction});
          draft.content.questions[index]=r.question;
        }else{
          const r=await api("aiTaskDraft",{goal:settings().goal,audience:settings().audience,duration:settings().duration,difficulty:settings().difficulty});
          draft.title=r.draft.title;draft.scenario=r.draft.scenario;draft.content.questions=r.draft.content.questions;
          settings().teacherNote=r.draft.teacherNote;current=0;
        }
        source="小衡辅助草稿 · 待教师核验";dirty=true;reviewed=false;render();
      }catch(e){toast(e.message)}finally{working(false)}
    }
    async function save(publish){
      if(busy)return;
      try{
        sync();valid();
        if(publish&&!reviewed)throw Error("请先勾选教师审核确认");
        working(true,publish?"保存并发布中…":"保存草稿中…");
        const r=await api(taskId?"updateTask":"createTask",{id:taskId,classId,title:draft.title,scenario:draft.scenario,content:draft.content});
        taskId=taskId||r.task.id;dirty=false;
        if(publish){await api("publish",{id:taskId});ctx.closeModal();await ctx.refresh();toast("已发布，学生现在可以进入任务");return}
        render();toast("草稿已保存，可随时继续编辑");
        // Keep teacher task list in sync without closing the editor.
        await ctx.refresh();
      }catch(e){toast(e.message)}finally{working(false)}
    }
    render();
  }
  async function manage(id){
    try{
      const t=(await api("task",{id})).task;
      if(t.status==="draft"){await edit(t.classId||ctx.classId(),id);return}
      const x=(await api("taskOverview",{id})).overview,submitted=x.students.filter(s=>s.submissionId);
      showModal('<section id="taskStudio" class="task-studio studio-manage"><header class="studio-heading"><div><small>发布后管理 / '+(x.expired?"已截止":label(x.task))+'</small><h2>'+esc(t.title)+'</h2><p>'+esc(dateLabel(x.task.settings.dueAt))+' · 题目已锁定</p></div><strong>'+submitted.length+' / '+x.students.length+'<small> 已提交</small></strong></header><div class="studio-manage-grid"><section><h3>学生进度</h3><p class="studio-muted">仅展示本班成员的任务提交，不包含自主咨询。</p><div class="studio-table-wrap"><table><thead><tr><th>学生</th><th>状态</th><th>得分</th><th>提交时间</th></tr></thead><tbody>'+x.students.map(s=>'<tr><td>'+esc(s.name)+'</td><td>'+(s.submissionId?"已提交":"未提交")+'</td><td>'+(s.submissionId?Number(s.total):"—")+'</td><td>'+esc(s.submittedAt?dateLabel(s.submittedAt):"—")+'</td></tr>').join('')+'</tbody></table></div>'+(!x.students.length?'<p>还没有学生加入班级。</p>':'')+'</section><section><h3>哪一步需要再讲一次？</h3>'+x.questions.map((q,i)=>'<div class="studio-question-stat"><small>0'+(i+1)+' · '+esc(abilities[q.ability])+'</small><p>'+esc(q.prompt)+'</p><progress max="100" value="'+(q.answered?Math.round(q.correct/q.answered*100):0)+'"></progress><span>'+(q.answered?Math.round(q.correct/q.answered*100)+"% 正确":"暂无作答")+'</span></div>').join('')+'<p class="studio-muted">这是客观题作答统计，不代表完整法律能力评估。</p></section></div><footer class="studio-footer"><span>已发布内容不可修改；可另建补充练习。</span>'+(t.status==="published"?'<button class="secondary" id="studioCloseTask">结束任务</button>':'')+'</footer></section>');
      const close=document.getElementById("studioCloseTask");
      if(close)close.onclick=async()=>{
        if(!confirm("结束后学生不能再提交，已有记录保留。确认结束？"))return;
        close.disabled=true;
        try{await api("closeTask",{id});await manage(id);await ctx.refresh()}catch(e){toast(e.message);close.disabled=false}
      };
    }catch(e){toast(e.message)}
  }
  return{edit,manage,row,bind};
};
})();
