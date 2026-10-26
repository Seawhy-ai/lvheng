import importlib.util, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('sync',Path(__file__).parents[1]/'scripts/sync_news.py');sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)
class Images(unittest.TestCase):
 def test_body_only(self):
  raw='<img src="/logo.jpg"><div class="left_zw"><p><img src="//i2.chinanews.com.cn/photo.jpg"></p></div><img src="/advert.jpg">'
  self.assertEqual(sync.extract_article_image(raw,'https://www.chinanews.com.cn/news.shtml'),'https://i2.chinanews.com.cn/photo.jpg')
 def test_no_substitute(self):
  self.assertEqual(sync.extract_article_image('<div class="left_zw"><p>text</p></div><img src="/advert.jpg">','https://www.chinanews.com.cn/a.shtml'),'')
 def test_nested_and_unsafe(self):
  raw='<div class="left_zw"><div><img src="javascript:bad"><img src="https://evil.invalid/x.jpg"></div><img src="/2026/real.jpg"></div>'
  self.assertEqual(sync.extract_article_image(raw,'https://www.chinanews.com.cn/a.shtml'),'https://www.chinanews.com.cn/2026/real.jpg')
if __name__=='__main__':unittest.main()
