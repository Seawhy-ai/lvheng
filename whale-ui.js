/* Student experience: visual learning atlas and a floating whale companion. */
window.createWhaleExperience = function (ctx) {
  const whale = `<svg viewBox="0 0 240 190" fill="none" aria-hidden="true"><defs><linearGradient id="whaleBlue" x2="1" y2="1"><stop stop-color="#73d7dc"/><stop offset="1" stop-color="#147b9b"/></linearGradient></defs><ellipse cx="117" cy="173" rx="69" ry="9" fill="#123f62" opacity=".12"/><path d="M173 93c18 9 24-4 21-21 20 2 30-10 32-25 10 33-2 64-30 69-8 40-51 58-100 47-44-9-69-34-64-65 4-34 34-53 74-49 34 3 52 20 67 44Z" fill="url(#whaleBlue)" stroke="#164657" stroke-width="3"/><path d="M38 118c28 20 58 13 80 5 26-9 48 7 61 13-22 27-63 33-99 15-21-10-35-20-42-33Z" fill="#e1f5e8"/><rect x="51" y="76" width="97" height="50" rx="24" fill="#143f52"/><path d="M71 100q7-12 14 0m35 0q7-12 14 0" stroke="#b4f7e9" stroke-width="5" stroke-linecap="round"/><path d="M93 109q8 8 17 0" stroke="#b4f7e9" stroke-width="3" stroke-linecap="round"/><path d="M117 138q8 32 38 19l-22-28" fill="#309db2" stroke="#164657" stroke-width="3"/><path d="M98 48V29" stroke="#164657" stroke-width="3"/><circle cx="98" cy="22" r="8" fill="#f5c968"/><path d="M55 58l-7-10m96 11 7-9" stroke="#a9e4df" stroke-width="5" stroke-linecap="round"/></svg>`;
  const icons = ['<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>','<path d="M4 4h16v17H4zM8 8h8M8 12h8M8 16h4"/>','<path d="M4 20V10m8 10V4m8 16v-7"/>','<path d="M3 5q5-2 9 1 4-3 9-1v15q-5-2-9 0-4-2-9 0ZM12 6v14"/>'];
  const icon = i => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[i]+'</svg>';
  let owner = '', dragCleanup = null, mode = 'quick';
  const fresh=()=>({messages:[],draft:'',busy:false});
  let conversations={quick:fresh(),guided:fresh()};
  function bubble(text, user) { const log=document.getElementById('whaleMessages');if(!log)return;const item=document.createElement('div');item.className='whale-message '+(user?'from-user':'');item.textContent=text;log.append(item);log.scrollTop=log.scrollHeight; }
  function renderMessages(){
    const log=document.getElementById('whaleMessages');if(!log)return;log.replaceChildren();
    bubble(mode==='quick'?'想问什么，直接告诉我。我会先给你清楚的回答。':'一起慢慢理清楚。我会每次问一个关键问题，陪你找到下一步。');
    conversations[mode].messages.forEach(m=>bubble(m.content,m.role==='user'));
    if(conversations[mode].busy)bubble('小衡正在回复…');
  }
  function updateControls(){
    const input=document.getElementById('whaleInput'),button=document.querySelector('#whaleForm button');if(!input)return;
    input.placeholder=mode==='quick'?'直接提问，例如：什么是劳动仲裁？':'告诉我事情经过，我们一步一步梳理';
    button.disabled=conversations[mode].busy;button.textContent=conversations[mode].busy?'…':'↑';
    document.querySelectorAll('[data-whale-mode]').forEach(b=>{const active=b.dataset.whaleMode===mode;b.classList.toggle('on',active);b.setAttribute('aria-pressed',String(active))});
    document.getElementById('whaleModeHint').textContent=mode==='quick'?'先给回答，再按需展开':'一次一个问题，逐步梳理';
  }
  function switchMode(nextMode){
    if(nextMode===mode)return;
    conversations[mode].draft=document.getElementById('whaleInput').value;mode=nextMode;
    document.getElementById('whaleInput').value=conversations[mode].draft;
    renderMessages();updateControls();
  }
  function open(prompt) { const panel=document.getElementById('whaleDialog');panel.hidden=false;document.getElementById('whaleFloat').setAttribute('aria-expanded','true');if(prompt)document.getElementById('whaleInput').value=prompt;document.getElementById('whaleInput').focus(); }
  function mount() {
    if(document.getElementById('whaleLayer') && owner===ctx.user().id)return;
    if(dragCleanup)dragCleanup();document.getElementById('whaleLayer')?.remove();
    if(owner!==ctx.user().id){conversations={quick:fresh(),guided:fresh()};mode='quick';owner=ctx.user().id;}
    const layer=document.createElement('div');layer.id='whaleLayer';layer.innerHTML=`<button id="whaleFloat" aria-label="打开鲸鱼学习助手" aria-expanded="false"><span>问问小衡</span>${whale}<i></i></button><section id="whaleDialog" role="dialog" aria-label="小衡学习助手" hidden><header><div>${whale}<span><span class="whale-title"><b>小衡 · 学习搭子</b><button type="button" id="whaleHelpBtn" aria-label="查看小衡使用教程" aria-controls="whaleHelp" aria-expanded="false">?</button></span><small>陪你把问题想清楚</small></span></div><button id="whaleClose" aria-label="关闭助手">×</button></header><div class="whale-mode-bar"><div role="group" aria-label="回答模式"><button type="button" data-whale-mode="quick">即问即答</button><button type="button" data-whale-mode="guided">循循善导</button></div><small id="whaleModeHint"></small></div><div id="whaleMessages" role="log" aria-live="polite"></div><form id="whaleForm"><label class="sr-only" for="whaleInput">你的问题</label><textarea id="whaleInput" rows="2" placeholder="告诉我，你卡在哪一步？" required></textarea><button aria-label="发送问题">↑</button></form><footer><span>从一个好问题开始。</span><button type="button" id="whalePrivacy">使用与隐私</button></footer><section id="whaleHelp" tabindex="-1" class="whale-help" aria-label="小衡使用教程" hidden><small>小衡使用指南</small><h2>选一种适合你的交流方式</h2><h3>即问即答</h3><p>想了解概念或得到建议时，直接提问。小衡先回答，再根据你的追问展开。</p><p class="help-example">试试：劳动仲裁是什么意思？</p><h3>循循善导</h3><p>面对复杂情境时，从事情经过开始。小衡一次问一个关键问题，陪你整理事实、证据和行动步骤。</p><p class="help-example">试试：我做完兼职，老板一直拖欠工资。</p><h3>怎么使用</h3><ol><li>选择模式，输入问题后点击发送箭头。</li><li>可以简短提问，也可以详细描述；输入框没有固定字数限制。超出服务处理能力时会提示失败。</li><li>本次打开页面期间，两种模式分别保留对话和草稿，切换不会混在一起。</li><li>鲸鱼可以拖动位置；遇到不确定的法律结论，请核验依据或向教师请教。</li></ol><button type="button" class="primary" id="whaleHelpDone">知道了，开始交流</button></section></section>`;document.body.append(layer);
    renderMessages();updateControls();
    document.querySelectorAll('[data-whale-mode]').forEach(b=>b.onclick=()=>switchMode(b.dataset.whaleMode));
    const help=document.getElementById('whaleHelp'),helpButton=document.getElementById('whaleHelpBtn');
    function closeHelp(){help.hidden=true;helpButton.setAttribute('aria-expanded','false');helpButton.focus()}
    helpButton.onclick=()=>{help.hidden=false;helpButton.setAttribute('aria-expanded','true');help.scrollTop=0;help.focus({preventScroll:true})};
    document.getElementById('whaleHelpDone').onclick=closeHelp;
    bindDrag(document.getElementById('whaleFloat'));
    document.getElementById('whalePrivacy').onclick=()=>{document.getElementById('whaleDialog').hidden=true;document.getElementById('whaleFloat').setAttribute('aria-expanded','false');ctx.privacy();};
    const close=()=>{document.getElementById('whaleDialog').hidden=true;document.getElementById('whaleFloat').setAttribute('aria-expanded','false');document.getElementById('whaleFloat').focus();};
    document.getElementById('whaleClose').onclick=close;layer.onkeydown=e=>{if(e.key==='Escape'){if(!help.hidden)closeHelp();else close();}};
    document.getElementById('whaleForm').onsubmit=async e=>{
      e.preventDefault();const state=conversations[mode],requestMode=mode,requestOwner=owner;
      const input=document.getElementById('whaleInput'),message=input.value.trim();
      if(state.busy||!message)return;
      const history=state.messages.filter(m=>!m.error).slice(-6).map(m=>({role:m.role,content:m.content}));
      state.busy=true;state.messages.push({role:'user',content:message});state.draft='';input.value='';
      renderMessages();updateControls();
      try{
        const r=await ctx.api('aiCoach',{mode:requestMode,message,history}),c=r.coach;
        if(!ctx.user()||ctx.user().id!==requestOwner||owner!==requestOwner)return;
        let answer;
        if(requestMode==='quick'){
          if(!c||typeof c.answer!=='string'||!c.answer.trim())throw Error('即问即答暂不可用，请稍后重试或切换到循循善导');
          answer=c.answer;
        }else answer=[c.source==='local-demo'?'［本地规则提示］':'',c.diagnosis,c.nextQuestion].filter(Boolean).join('\n\n');
        state.messages.push({role:'assistant',content:answer});
      }catch(err){
        state.messages.push({role:'assistant',content:'这次未能回复：'+err.message,error:true});
      }finally{
        state.busy=false;
        if(ctx.user()&&ctx.user().id===requestOwner&&owner===requestOwner&&mode===requestMode&&document.getElementById('whaleLayer')){renderMessages();updateControls()}
      }
    };
  }
  function bindDrag(button) {
    const key='lvheng_whale_position_v1';let moved=false,start=null,suppressUntil=0;
    const clamp=(v,min,max)=>Math.max(min,Math.min(v,Math.max(min,max)));
    function place(x,y,save){const r=button.getBoundingClientRect();x=clamp(x,8,innerWidth-r.width-8);y=clamp(y,12,innerHeight-r.height-100);Object.assign(button.style,{left:x+'px',top:y+'px',right:'auto',bottom:'auto'});if(save)try{localStorage.setItem(key,JSON.stringify({x:x/innerWidth,y:y/innerHeight}))}catch(e){}}
    function restore(){try{const p=JSON.parse(localStorage.getItem(key));if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))place(p.x*innerWidth,p.y*innerHeight,false)}catch(e){}}
    restore();button.title='点击对话，拖动调整位置';button.onpointerdown=e=>{if(e.button!==0)return;const r=button.getBoundingClientRect();start={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};moved=false;button.setPointerCapture(e.pointerId)};
    button.onpointermove=e=>{if(!start||e.pointerId!==start.id)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>6)moved=true;if(moved){button.classList.add('dragging');place(start.left+dx,start.top+dy,false)}};
    function end(e){if(!start||e.pointerId!==start.id)return;if(moved){const r=button.getBoundingClientRect();place(r.left,r.top,true);suppressUntil=Date.now()+400}button.classList.remove('dragging');start=null}
    button.onpointerup=end;button.onpointercancel=end;button.onclick=()=>{if(Date.now()>suppressUntil)open()};
    button.addEventListener('keydown',e=>{const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];if(delta){e.preventDefault();const r=button.getBoundingClientRect();place(r.left+delta[0],r.top+delta[1],true)}});
    window.addEventListener('resize',restore);dragCleanup=()=>window.removeEventListener('resize',restore);
  }
  function decorate(tab, tasks = []) {
    tab=tab||'home';
    if(tab==='home'){
      const completed=tasks.filter(t=>t.submissionId).length,next=tasks.find(t=>!t.submissionId);
      document.querySelector('.student-v2').innerHTML=`<header class="atlas-greeting"><div><small>YOUR LEARNING SPACE</small><h1>嗨，${ctx.esc(ctx.user().name)}<span>今天也有新发现。</span></h1></div><button id="atlasLogout" aria-label="切换身份">${icon(0)}</button></header><section class="atlas-hero"><div class="atlas-copy"><span class="atlas-label"><i></i> 律衡 · 法律素养实验室</span><h2>生活里的难题，<br>一起<span>拆解。</span></h2><p>先试着判断，再和小衡聊聊。</p><button id="atlasAsk">和小衡聊一聊 <span>↗</span></button></div><div class="atlas-ocean"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="orbit-note">FACTS / EVIDENCE / ACTION</span>${whale}<span class="ocean-star">✦</span><span class="ocean-dot"></span></div><div class="atlas-wave"></div></section><section class="atlas-progress"><div class="progress-ring" style="--progress:${tasks.length?completed/tasks.length*100:0}%"><span>${completed}<small>/${tasks.length}</small></span></div><div><small>我的班级旅程</small><h3>${next?ctx.esc(next.title):tasks.length?'任务全部完成':'等待第一份任务'}</h3><p>${next?'五步判断，练习解决问题。':tasks.length?'去报告看看这次的收获。':'教师发布后，来这里开启学习。'}</p></div><button id="atlasContinue" aria-label="查看班级任务">↗</button></section><div class="atlas-section-title"><h2>进入一个真实情境</h2><span>01 — 03</span></div><section class="atlas-scenarios"><button data-scenario="labor" class="scene-labor"><span class="scene-index">01 / 工作与成长</span><div class="scene-art"><span class="paper">PAY<br><b>¥ 2,000</b><i>待支付</i></span><span class="paper-stamp">?</span></div><h3>小林发来消息：<br>工资还没到账。</h3><footer>打开这封来信 <span>↗</span></footer></button><button data-scenario="consumer" class="scene-consumer"><span class="scene-index">02 / 消费与选择</span><div class="scene-art"><span class="parcel"></span><span class="parcel-tag">≠</span></div><h3>收到的，<br>不是想买的。</h3><footer>网购纠纷 <span>↗</span></footer></button><button data-scenario="rent" class="scene-rent"><span class="scene-index">03 / 租住与生活</span><div class="scene-art"><span class="house">⌂</span><span class="key">⚿</span></div><h3>搬走了，<br>押金还没回来。</h3><footer>租房押金 <span>↗</span></footer></button></section><div class="atlas-resource"><span>法律不只是书上的条文。</span><button id="atlasResources">去资源馆看看 ${icon(3)}</button></div>`;
      document.getElementById('atlasLogout').onclick=ctx.logout;
      document.getElementById('atlasContinue').onclick=()=>ctx.navigate('class');
      document.getElementById('atlasResources').onclick=()=>ctx.navigate('resources');
      document.getElementById('atlasAsk').onclick=()=>open();
      document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>{if(b.dataset.scenario==='labor'&&window.openStoryRoom){window.openStoryRoom(ctx)}else open(ctx.templates[b.dataset.scenario].scenario)});
    }
    document.querySelectorAll('.student-bottom button').forEach((b,i)=>{b.querySelector('i').innerHTML=icon(i);b.setAttribute('aria-current',b.classList.contains('on')?'page':'false');});
    if(tab==='resources'){
      const resources=[['laws','法律法规库','检索现行法条与全文'],['cases','指导案例库','查看权威裁判规则'],['quiz','题库练习','章节练习与错题巩固'],['documents','法律文书','按类型查阅文书模板'],['calculator','法律计算器','利息、补偿与诉讼费用']];
      const art={laws:'<path d="M5 4h11a3 3 0 0 1 3 3v14H7a3 3 0 0 1-3-3V5a1 1 0 0 1 1-1Z"/><path d="M4 17h15M9 8h6M9 12h4"/>',cases:'<path d="M12 3v17M5 21h14M4 7h16M6 7l-4 7h8L6 7Zm12 0-4 7h8l-4-7Z"/><path d="M2 14a4 4 0 0 0 8 0m4 0a4 4 0 0 0 8 0"/>',quiz:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 9 2 2 5-5M8 16h8"/>',documents:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',calculator:'<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8M8 11h1m6 0h1M8 15h1m6 0h1M8 19h1m6 0h1"/>'};
      document.querySelector('.resource-grid').innerHTML=resources.map(([route,title,desc],i)=>'<a class="resource-card resource-'+route+'" href="law.html?resource='+route+'&from=classroom"><div class="resource-card-top"><i class="resource-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+art[route]+'</svg></i><span class="resource-label">'+['查依据','读案例','练能力','用模板','算费用'][i]+'</span></div><b>'+title+'</b><span class="resource-description">'+desc+'</span><div class="resource-card-foot"><small>进入探索</small><i aria-hidden="true">↗</i></div></a>').join('');
      const coachButton=document.createElement('button');coachButton.className='secondary';coachButton.textContent='和小衡梳理问题';coachButton.style.marginTop='20px';coachButton.onclick=()=>open();document.querySelector('.resource-grid').after(coachButton);
    }
    mount();window.scrollTo({top:0});
  }
  return {decorate};
};
