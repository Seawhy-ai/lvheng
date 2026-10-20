(function(){
  const button=document.getElementById('installAppBtn');let promptEvent=null;
  const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(standalone()){button.hidden=true;return}
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event});
  window.addEventListener('appinstalled',()=>{button.hidden=true;document.getElementById('installGuide')?.close()});
  button.onclick=async()=>{
    if(promptEvent){await promptEvent.prompt();await promptEvent.userChoice;promptEvent=null;return}
    let dialog=document.getElementById('installGuide');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='installGuide';dialog.className='install-dialog';dialog.setAttribute('aria-labelledby','installTitle');
      const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
      dialog.innerHTML='<button class="install-close" aria-label="关闭安装说明">×</button><img src="apple-touch-icon.png" alt="律衡"><h2 id="installTitle">把律衡放到桌面</h2><p>轻点图标，就能回到你的学习空间。</p>'+(ios?'<ol><li>在 Safari 浏览器中打开此网站。</li><li>轻点浏览器的<strong>分享</strong>按钮（方框向上箭头）。</li><li>选择<strong>添加到主屏幕</strong>；若显示“作为网页 App 打开”，请将它开启，再点<strong>添加</strong>。</li></ol>':'<ol><li>iPhone / iPad：用 Safari 打开网站，点“分享 → 添加到主屏幕”。</li><li>安卓或电脑：在浏览器菜单中选择“安装应用”或“添加到主屏幕”。</li></ol>')+'<p>从主屏幕启动后，首次使用请登录学习账号。之后会保留登录状态。</p><button class="primary">我知道了</button>';document.body.append(dialog);dialog.querySelectorAll('button').forEach(b=>b.onclick=()=>dialog.close());dialog.onclick=e=>{if(e.target===dialog&&e.clientX<dialog.getBoundingClientRect().left)dialog.close()};}
    dialog.showModal();
  };
})();
