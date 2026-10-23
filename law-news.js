window.createLawNews=function(ctx){
 const esc=ctx.esc,catalog=window.LVHENG_NEWS||[];
 function cards(items,teacher){return items.map(item=>{const a=item.article||item;return '<article class="law-news-card"><div class="news-meta"><span>'+esc(a.category)+'</span><time>'+esc(a.publishedAt)+'</time></div><h3>'+esc(a.title)+'</h3><p>'+esc(a.summary)+'</p><div class="news-question"><small>课堂讨论</small><b>'+esc(a.question)+'</b></div><p class="news-event">'+esc(a.eventNote)+'</p>'+(item.className?'<small class="news-sender">'+esc(item.className)+' · 教师分享</small>':'')+'<footer><a href="'+esc(a.url)+'" target="_blank" rel="noopener noreferrer">'+esc(a.source)+' · 阅读原文 ↗</a>'+(teacher?'<button class="secondary" data-share-news="'+esc(a.id)+'" disabled>检查转发状态…</button>':'')+'</footer></article>'}).join('')}
 async function teacher(target,classroom){
  target.innerHTML='<div class="news-page-head"><div><small>真实案例 · 课堂讨论</small><h2>法律新闻</h2><p>精选更新于 2026-10-23。按报道日期排序；并非实时新闻流。</p></div><span>'+esc(classroom?'转发至：'+classroom.name:'请先创建班级')+'</span></div><p class="news-feedback" role="status"></p><div class="law-news-grid">'+cards(catalog,true)+'</div>';
  if(!classroom){target.querySelectorAll('button').forEach(b=>b.textContent='请先创建班级');return}
  const feedback=target.querySelector('.news-feedback');
  try{
   const result=await ctx.api('newsShares',{classId:classroom.id});if(!target.isConnected)return;
   const sent=new Set((result.shares||[]).map(s=>s.newsId));
   target.querySelectorAll('[data-share-news]').forEach(button=>{
    const id=button.dataset.shareNews;button.disabled=sent.has(id);button.textContent=sent.has(id)?'已转发至本班':'转发给本班学生';
    button.onclick=async()=>{button.disabled=true;button.textContent='正在转发…';try{await ctx.api('shareNews',{classId:classroom.id,newsId:id});button.textContent='已转发至本班';feedback.textContent='已发送。学生可在「班级」页查看这则新闻。'}catch(error){button.disabled=false;button.textContent='重试转发';feedback.textContent=error.message}};
   });
  }catch(error){feedback.textContent='暂时无法读取班级分享：'+error.message;target.querySelectorAll('button').forEach(b=>b.textContent='暂不可转发');const retry=document.createElement('button');retry.className='text-btn';retry.textContent='重新连接';retry.onclick=()=>teacher(target,classroom);feedback.append(retry)}
 }
 async function student(target){
  target.innerHTML='<h2>老师分享的法律新闻</h2><p role="status">正在读取班级分享…</p>';
  try{const result=await ctx.api('newsShares',{});if(!target.isConnected)return;target.innerHTML='<h2>老师分享的法律新闻</h2>'+(result.shares?.length?'<div class="law-news-grid">'+cards(result.shares,false)+'</div>':'<p class="news-empty">老师转发新闻后，会出现在这里。</p>')}
  catch(error){if(!target.isConnected)return;target.innerHTML='<h2>老师分享的法律新闻</h2><p>新闻暂未加载成功，不影响完成班级任务。</p><button class="text-btn">重试</button>';target.querySelector('button').onclick=()=>student(target)}
 }
 return{teacher,student};
};
