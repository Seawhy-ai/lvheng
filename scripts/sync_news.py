"""Collect headline links only; do not republish article bodies or invent case facts."""
import concurrent.futures, datetime as dt, hashlib, html, json, re, urllib.request
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
UTC=dt.timezone.utc
KEYWORDS=re.compile(r'纠纷|侵权|判决|判赔|获赔|索赔|维权|诈骗|起诉|诉讼|欠薪|拖欠工资|侵犯|退费|退款|造谣|违法解除|高空抛物|劳动仲裁')
EXCLUDE=re.compile(r'会议|座谈|培训|宣传活动|工作报告|工作会议|审结.*件|蓝图|优选地|呈增长态势|有什么特点')
TOPICS=[('消费维权',r'消费|退款|退费|商家|网购|直播|预付|食品|产品'),('劳动权益',r'劳动|工资|欠薪|加班|解雇|辞退|员工|职场'),('数字与人格权',r'AI|人工智能|肖像|声音|隐私|个人信息|造谣|名誉|网暴|平台'),('财产与合同',r'合同|租|房|物业|财产|投资|银行|借款|理财'),('公共安全',r'诈骗|高空|交通|刑|伤害')]
def classify(title):
 return next((name for name,pattern in TOPICS if re.search(pattern,title)),'法律争议')
def parse_archive(raw, now):
 rows=[]
 for url,title in re.findall(r'<div class="dd_bt">\s*<a href="([^"]+)"[^>]*>(.*?)</a>',raw,re.S):
  title=html.unescape(re.sub('<[^>]+>','',title)).strip()
  m=re.fullmatch(r'/(?:sh|cj|gn|fz|life)/(?P<year>\d{4})/(?P<month>\d{2})-(?P<day>\d{2})/\d+\.shtml',url)
  if not m or not KEYWORDS.search(title) or EXCLUDE.search(title):continue
  date=dt.date(int(m['year']),int(m['month']),int(m['day']))
  if not 0 <= (now.date()-date).days <=90:continue
  link='https://www.chinanews.com.cn'+url
  rows.append(dict(id='cn-'+hashlib.sha256(link.encode()).hexdigest()[:20],title=title[:180],category=classify(title),publishedAt=date.isoformat(),source='中国新闻网',url=link,summary='',eventNote='日期为报道日期，事件发生时间和案件进展请查看原文。',question='争议双方各自主张什么？还需要哪些事实和证据才能作出判断？',curation='headline'))
 return rows

def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'LvHeng-News/1.0 (+https://seawhy-ai.github.io/lvheng/)'})
 with urllib.request.urlopen(req,timeout=25) as res:return res.read(2500000).decode('utf-8','replace')

def run():
 now=dt.datetime.now(UTC); local=now.astimezone(dt.timezone(dt.timedelta(hours=8)))
 path=BASE/'data/legal-news.json'
 previous=json.loads(path.read_text()) if path.exists() else {'articles':[]}
 # A rolling fortnight captures missed items and survives several days of scheduler delays.
 urls=['https://www.chinanews.com.cn/scroll-news/'+(local-dt.timedelta(days=i)).strftime('%Y/%m%d')+'/news.shtml' for i in range(14)]
 articles={a['id']:a for a in previous['articles']};errors=[];success=0
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  futures={pool.submit(fetch,url):url for url in urls}
  for task in concurrent.futures.as_completed(futures):
   try:
    raw=task.result()
    if 'dd_bt' not in raw:raise ValueError('news list missing')
    for article in parse_archive(raw,local):articles[article['id']]=article
    success+=1
   except Exception as exc:errors.append(futures[task]+': '+str(exc))
 if not success:raise RuntimeError('All sources failed; previous news retained. '+str(errors))
 rows=sorted((a for a in articles.values() if not EXCLUDE.search(a['title']) and 0 <= (local.date()-dt.date.fromisoformat(a['publishedAt'])).days<=90),key=lambda a:(a['publishedAt'],a['id']),reverse=True)[:120]
 if not rows:raise RuntimeError('No relevant news; previous news retained')
 result={'updatedAt':now.isoformat(),'intervalMinutes':30,'sources':[{'name':'中国新闻网','url':'https://www.chinanews.com.cn/scroll-news/news1.html'}],'partial':bool(errors),'failedPages':len(errors),'articles':rows}
 path.parent.mkdir(exist_ok=True);path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(f'{len(rows)} articles; {success}/{len(urls)} archive pages fetched')
 if errors:print('\n'.join(errors))
if __name__=='__main__':run()
