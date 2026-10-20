(function () {
  'use strict';
  function enterResource() {
    var params=new URLSearchParams(location.search);
    if(params.get('from')!=='classroom')return;
    var routes={laws:{open:showDatabase,id:'dbView'},cases:{open:showCaseDatabase,id:'caseView'},quiz:{open:showQuizModule,id:'quizView'},documents:{open:showDocGen,id:'docView'},calculator:{open:showCalc,id:'calcView'}};
    var route=routes[params.get('resource')];
    if(!route)return;
    function returnToResources(){location.href='classroom.html?tab=resources';}
    route.open();
    // Top-level Home/Back leads to the new student space; detail back stays internal.
    window.goHome=returnToResources;
    var back=document.querySelector('#'+route.id+' .back');
    if(back)back.onclick=returnToResources;
    var link=document.createElement('a');link.href='classroom.html?tab=resources';link.textContent='← 返回学习资源';link.id='resourceReturn';
    link.style.cssText='position:fixed;right:16px;bottom:max(18px,env(safe-area-inset-bottom));z-index:9999;padding:12px 18px;border-radius:14px;background:#214f49;color:white;font-size:13px;text-decoration:none;box-shadow:0 4px 20px #173c5030';
    document.body.appendChild(link);
  }
  // Defer scripts run in the interactive state, before the legacy initApp listener.
  if(document.readyState!=='complete')document.addEventListener('DOMContentLoaded',enterResource);else enterResource();
})();
