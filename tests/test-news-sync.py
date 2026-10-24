import importlib.util,datetime as dt,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('sync_news',Path(__file__).resolve().parents[1]/'scripts/sync_news.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class NewsTests(unittest.TestCase):
 def test_filter_and_escape(self):
  rows=m.parse_archive('<div class="dd_bt"><a href="/sh/2026/10-23/123.shtml">商家拒绝退款引发纠纷 &amp; 维权</a></div><div class="dd_bt"><a href="https://evil.test/sh/2026/10-23/123.shtml">退款纠纷</a></div><div class="dd_bt"><a href="/sh/2026/10-25/124.shtml">退款纠纷</a></div><div class="dd_bt"><a href="/sh/2026/10-23/125.shtml">反诈骗宣传活动</a></div>',dt.datetime(2026,10,24))
  self.assertEqual(len(rows),1);self.assertEqual(rows[0]['category'],'消费维权');self.assertIn('&',rows[0]['title']);self.assertEqual(rows[0]['summary'],'');self.assertEqual(rows,m.parse_archive('<div class="dd_bt"><a href="/sh/2026/10-23/123.shtml">商家拒绝退款引发纠纷 &amp; 维权</a></div>',dt.datetime(2026,10,24)))
if __name__=='__main__':unittest.main()
