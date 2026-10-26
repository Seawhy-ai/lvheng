import fs from 'node:fs/promises';import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.cwd(),file=path.join(root,'data/legal-news.json'),data=JSON.parse(await fs.readFile(file,'utf8'));await fs.mkdir(path.join(root,'data/news-images'),{recursive:true});
const browser=await chromium.launch({headless:true});let completed=0;
for(const a of data.articles){
 const relative='data/news-images/'+a.id+'.jpg',dest=path.join(root,relative);
 try{await fs.access(a.thumbnail?path.join(root,a.thumbnail):dest);a.thumbnail=a.thumbnail||relative;a.thumbnailKind=a.thumbnailKind||(a.imageUrl?'photo':'article');continue}catch{}
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
 try{
  if(a.imageUrl){
   const r=await page.request.get(a.imageUrl,{timeout:20000});if(!r.ok())throw Error('image HTTP '+r.status());const body=await r.body();
   // Keep the source file bytes, preserving its actual MIME extension.
   const mime=r.headers()['content-type']||'',ext=mime.includes('png')?'png':mime.includes('webp')?'webp':'jpg';const target='data/news-images/'+a.id+'.'+ext;await fs.writeFile(path.join(root,target),body);a.thumbnail=target;a.thumbnailKind='photo';
  }else{
   await page.goto(a.url,{waitUntil:'domcontentloaded',timeout:25000});
   const title=page.locator('h1:visible').first();await title.waitFor({timeout:8000});await title.scrollIntoViewIfNeeded();const box=await title.boundingBox();
   await page.screenshot({path:dest,type:'jpeg',quality:75,clip:{x:Math.max(0,box.x-12),y:Math.max(0,box.y-8),width:Math.min(800,box.width+24),height:Math.min(270,900-box.y+8)}});
   a.thumbnail=relative;a.thumbnailKind='article';
  }
  a.imageSourceUrl=a.url;completed++;
 }catch(e){console.log('Thumbnail pending',a.id,e.message)}finally{await page.close()}
}
await browser.close();await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');console.log('Created',completed,'total',data.articles.filter(a=>a.thumbnail).length);
