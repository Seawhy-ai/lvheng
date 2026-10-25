window.createLawNews=function(ctx){
 const esc=ctx.esc,fallback=window.LVHENG_NEWS||[];
 function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:'#'}catch{return '#'}}
 function cards(items,teacher){return items.map(item=>{const a=item.article||item;return '<article class="law-news-card"><div class="news-meta"><span>'+esc(a.category)+'</span><time>'+esc(a.publishedAt)+'</time></div><h3>'+esc(a.title)+'</h3>'+(a.summary?'<p>'+esc(a.summary)+'</p>':'<p class="news-event">新闻线索 · 阅读原文了解事实与案件进展</p>')+'<div class="news-question"><small>课堂讨论提示 · 非报道结论</small><b>'+esc(a.question)+'</b></div><p class="news-event">'+esc(a.eventNote)+'</p>'+(item.className?'<small class="news-sender">'+esc(item.className)+' · 教师分享</small>':'')+'<footer><a href="'+esc(safeUrl(a.url))+'" target="_blank" rel="noopener noreferrer">'+esc(a.source)+' · 阅读原文 ↗</a>'+(teacher?'<button class="secondary" data-share-news="'+esc(a.id)+'" disabled>检查转发状态…</button>':'')+'</footer></article>'}).join('')}
 async function teacher(target,classroom){
  let catalog=fallback.slice(),sent=new Set(),ready=false,limit=12,loading=false,loaded=false;
  const pending=new Set();
  target.innerHTML='<div class="news-page-head"><div><small>法律争议 · 新闻线索</small><h2>法律新闻</h2><p class="news-updated" role="status">正在读取最新新闻…</p></div><button class="secondary" id="refreshNews">检查新闻更新</button></div><div class="news-filters"><label>关键词<input type="search" id="newsSearch" placeholder="搜索事件、权益或来源"></label><label>类别<select id="newsCategory"><option value="">全部类别</option></select></label><label>报道时间<select id="newsPeriod"><option value="30">近30天</option><option value="7">近7天</option><option value="90">近90天</option></select></label></div><p class="news-count"></p><p class="news-feedback" role="status"></p><div class="law-news-grid"></div><button class="secondary news-more" hidden>加载更多</button>';
  const feedback=target.querySelector('.news-feedback'),status=target.querySelector('.news-updated'),grid=target.querySelector('.law-news-grid'),search=target.querySelector('#newsSearch'),category=target.querySelector('#newsCategory'),period=target.querySelector('#newsPeriod'),more=target.querySelector('.news-more'),refresh=target.querySelector('#refreshNews');
  function draw(){
   const query=search.value.trim().toLowerCase(),cutoff=new Date();cutoff.setDate(cutoff.getDate()-Number(period.value));const date=cutoff.toLocaleDateString('sv-SE');
   const filtered=catalog.filter(a=>a.publishedAt>=date&&(!category.value||a.category===category.value)&&(!query||(a.title+' '+a.category+' '+a.source+' '+(a.summary||'')).toLowerCase().includes(query)));
   target.querySelector('.news-count').textContent='共 '+filtered.length+' 条 · '+(classroom?'转发至：'+classroom.name:'创建班级后可转发');
   grid.innerHTML=filtered.length?cards(filtered.slice(0,limit),true):'<p class="news-empty">暂无匹配新闻，请调整关键词或时间范围。</p>';more.hidden=filtered.length<=limit;
   grid.querySelectorAll('[data-share-news]').forEach(button=>{const id=button.dataset.shareNews;button.disabled=!classroom||!ready||sent.has(id)||pending.has(id);button.textContent=!classroom?'请先创建班级':sent.has(id)?'已转发至本班':pending.has(id)?'正在转发…':ready?'转发给本班学生':'暂不可转发';button.onclick=async()=>{pending.add(id);draw();try{await ctx.api('shareNews',{classId:classroom.id,newsId:id});sent.add(id);feedback.textContent='已发送。学生可在「班级」页查看这则新闻。'}catch(error){feedback.textContent='转发失败：'+error.message}finally{pending.delete(id);if(target.isConnected)draw()}}});
  }
  async function load(){
   if(loading)return;loading=true;refresh.disabled=true;refresh.textContent='正在刷新…';const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
   try{const response=await fetch('data/legal-news.json?t='+Date.now(),{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('读取失败');const data=await response.json();if(!Array.isArray(data.articles)||!data.updatedAt)throw Error('数据不完整');if(!target.isConnected)return;
    catalog=data.articles;loaded=true;const selected=category.value;category.innerHTML='<option value="">全部类别</option>'+Array.from(new Set(catalog.map(a=>a.category))).sort().map(c=>'<option>'+esc(c)+'</option>').join('');category.value=selected;
    const when=new Date(data.updatedAt),stale=Date.now()-when.getTime()>2*60*60*1000; const newest=catalog.reduce((v,a)=>a.publishedAt>v?a.publishedAt:v,'');
    status.textContent='最近采集：'+when.toLocaleString('zh-CN')+' · 最新报道：'+newest+' · '+catalog.length+' 条'+(Number.isInteger(data.newArticleCount)?' · 本轮新增 '+data.newArticleCount+' 条':'')+(stale?'。采集已延迟，当前保留上次内容。':'。')+(data.partial?'部分来源暂不可用。':'')+'此按钮检查已采集内容，不会即时抓取新闻源。';draw();
   }catch(error){if(target.isConnected){status.textContent=loaded?'刷新失败，保留已加载新闻，请稍后重试。':'自动新闻暂不可用，当前显示原有精选案例。';draw()}}finally{clearTimeout(timeout);loading=false;if(target.isConnected){refresh.disabled=false;refresh.textContent='检查新闻更新'}}
  }
  [search,category,period].forEach(control=>control.addEventListener(control===search?'input':'change',()=>{limit=12;draw()}));more.onclick=()=>{limit+=12;draw()};refresh.onclick=load;
  async function shares(){if(!classroom)return;try{const result=await ctx.api('newsShares',{classId:classroom.id});if(!target.isConnected)return;sent=new Set((result.shares||[]).map(s=>s.newsId));ready=true;draw()}catch(error){if(!target.isConnected)return;feedback.textContent='暂时无法读取班级分享：'+error.message;const retry=document.createElement('button');retry.className='text-btn';retry.textContent='重新连接';retry.onclick=()=>{feedback.textContent='';shares()};feedback.append(retry)}}
  draw();await Promise.all([load(),shares()]);
  // Refresh an open news view without discarding its filters; stop when its class view is replaced.
  const timer=setInterval(()=>{if(!target.isConnected){clearInterval(timer);return}if(!target.hidden&&!document.hidden)load()},5*60*1000);
 }
 async function student(target){
  target.innerHTML='<h2>老师分享的法律新闻</h2><p class="drama-note">这里只显示老师主动转发的内容，新闻库更新不会自动转发。</p><p role="status">正在读取班级分享…</p>';
  try{const result=await ctx.api('newsShares',{});if(!target.isConnected)return;target.innerHTML='<h2>老师分享的法律新闻</h2><p class="drama-note">这里只显示老师主动转发的内容，新闻库更新不会自动转发。</p>'+(result.shares?.length?'<div class="law-news-grid">'+cards(result.shares,false)+'</div>':'<p class="news-empty">老师转发新闻后，会出现在这里。</p>')}
  catch(error){if(!target.isConnected)return;target.innerHTML='<h2>老师分享的法律新闻</h2><p class="drama-note">这里只显示老师主动转发的内容，新闻库更新不会自动转发。</p><p>新闻暂未加载成功，不影响完成班级任务。</p><button class="text-btn">重试</button>';target.querySelector('button').onclick=()=>student(target)}
 }
 return{teacher,student};
};
