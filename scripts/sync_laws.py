# -*- coding: utf-8 -*-
"""律衡法律资源库自动同步脚本

依据 laws-catalog.json 的角色化目录，从国家法律法规数据库（flk.npc.gov.cn）同步：
  1. 元数据（版本标识 bbbs、公布/施行日期、制定机关、时效性）——用于检测法律修订；
  2. 全文文本（尽力抓取 docx 并解析为 txt，抓取失败时保留本地已有文本）。

产物：
  laws/<file>.txt      全文文本（仅成功抓取或已有文本时存在）
  laws-index.json      资源库索引（角色映射、版本信息、同步状态）
  docs/laws-sync-report.md  本次同步报告

用法：
  python scripts/sync_laws.py --check    # 仅校验元数据，发现修订时退出码为 2（供 CI 判断）
  python scripts/sync_laws.py --fetch    # 元数据 + 尽力抓取全文（默认）
  python scripts/sync_laws.py --offline  # 不联网，仅重建索引与报告
"""
import argparse
import datetime
import io
import json
import re
import sys
import time
import zipfile
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "laws-catalog.json"
LAWS_DIR = ROOT / "laws"
INDEX = ROOT / "laws-index.json"
REPORT = ROOT / "docs" / "laws-sync-report.md"

BASE = "https://flk.npc.gov.cn"
UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Referer": BASE + "/",
    "Content-Type": "application/json",
}
# flk 新版检索接口（POST）与详情接口（GET），2025-09 实测可用；站点改版时仅需调整此处
SEARCH_URL = BASE + "/law-search/search/list"
DETAIL_URL = BASE + "/law-search/search/flfgDetails"
PREVIEW_URL = BASE + "/law-search/amazonFile/previewLink"
VALID_FLXZ = {"法律", "行政法规", "部门规章", "司法解释"}
RETRY, TIMEOUT, GAP = 3, 20, 1.5


def strip_tags(s):
    return re.sub(r"\s+", "", re.sub(r"<[^>]+>", "", s or ""))


def flk_search(title):
    body = {
        "searchRange": 1, "sxrq": [], "gbrq": [], "searchType": 2, "sxx": [],
        "gbrqYear": [], "flfgCodeId": [], "zdjgCodeId": [],
        "searchContent": title,
        "orderByParam": {"order": "-1", "sort": ""},
        "pageNum": 1, "pageSize": 20,
    }
    for i in range(RETRY):
        try:
            r = requests.post(SEARCH_URL, json=body, headers=UA, timeout=TIMEOUT)
            rows = r.json().get("rows") or []
            want = strip_tags(title)
            for row in rows:  # 先精确匹配中央层级
                if strip_tags(row.get("title")) == want and row.get("flxz") in VALID_FLXZ:
                    return row
            for row in rows:
                if want in strip_tags(row.get("title")) and row.get("flxz") in VALID_FLXZ:
                    return row
            return None
        except Exception as e:
            if i == RETRY - 1:
                print(f"  [search-fail] {title}: {e}")
            time.sleep(2 * (i + 1))
    return None


def flk_detail(bbbs):
    for i in range(RETRY):
        try:
            r = requests.get(DETAIL_URL, params={"bbbs": bbbs}, headers=UA, timeout=TIMEOUT)
            d = r.json().get("data") or {}
            oss = d.get("ossFile") or {}
            return {
                "gbrq": d.get("gbrq"), "sxrq": d.get("sxrq"), "sxx": d.get("sxx"),
                "zdjg": d.get("zdjgName"), "flxz": d.get("flxz"),
                "word_path": oss.get("ossWordPath"),
                "url": f"{BASE}/detail?id={bbbs}",
            }
        except Exception as e:
            if i == RETRY - 1:
                print(f"  [detail-fail] {bbbs}: {e}")
            time.sleep(2 * (i + 1))
    return None


def docx_to_text(blob):
    """最小 docx 解析：word/document.xml 按段落抽文本"""
    z = zipfile.ZipFile(io.BytesIO(blob))
    xml = z.read("word/document.xml").decode("utf-8", "ignore")
    paras = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", xml, re.S):
        t = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p))
        t = t.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
        if t.strip():
            paras.append(t.strip())
    return "\n\n".join(paras) + "\n"


def fetch_text(bbbs, word_path):
    """尽力抓取全文：docx 预览链 -> 解析；失败返回 None（保留本地文本）"""
    if not word_path:
        return None
    try:
        r = requests.get(PREVIEW_URL, params={"bbbs": bbbs, "filePath": word_path},
                         headers=UA, timeout=TIMEOUT)
        data = r.json().get("data") or {}
        signed = data.get("url") or data.get("urlIn") or ""
        # 签名链指向内网转换服务，尝试改写为公网入口直接取文件
        m = re.search(r"file=([^&]+)", signed)
        if not m:
            return None
        inner = m.group(1).replace("http://172.16.220.27:38080", BASE)
        for attempt in range(RETRY):
            try:
                r2 = requests.get(inner, headers=UA, timeout=TIMEOUT * 2)
                if r2.content[:2] == b"PK":  # docx/ofd 均为 zip；docx 才能抽文本
                    try:
                        return docx_to_text(r2.content)
                    except KeyError:
                        return None  # OFD 等非 docx 包
                return None
            except Exception:
                time.sleep(2 * (attempt + 1))
    except Exception:
        return None
    return None


def header_of(entry, meta):
    lines = [entry["title"]]
    if meta.get("gbrq"):
        lines.append(f"公布日期：{meta['gbrq']}　制定机关：{meta.get('zdjg') or '—'}")
    if meta.get("sxrq"):
        lines.append(f"施行日期：{meta['sxrq']}")
    lines.append("来源：国家法律法规数据库（flk.npc.gov.cn）· 律衡法律资源库自动同步")
    lines.append("提示：以最新法律法规为准，本文件仅供公益普法学习")
    return "\n".join(lines) + "\n\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="仅校验元数据，发现修订退出码 2")
    ap.add_argument("--fetch", action="store_true", help="尽力抓取全文（默认行为）")
    ap.add_argument("--offline", action="store_true", help="不联网重建索引")
    args = ap.parse_args()

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    old_index = json.loads(INDEX.read_text(encoding="utf-8")) if INDEX.exists() else {}
    old_by_file = {e["file"]: e for e in old_index.get("entries", [])}
    LAWS_DIR.mkdir(exist_ok=True)
    (ROOT / "docs").mkdir(exist_ok=True)

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    entries, updates, log = [], 0, []
    for ent in catalog["entries"]:
        file, title = ent["file"], ent["title"]
        print(f"[{file}] {title}")
        item = {
            "file": file, "title": title, "flxz": ent["flxz"], "roles": ent["roles"],
            "note": ent.get("note", ""), "synced_at": now, "source": "flk.npc.gov.cn",
        }
        txt_path = LAWS_DIR / f"{file}.txt"
        has_text = txt_path.exists()

        if args.offline:
            prev = old_by_file.get(file, {})
            item.update({"flk": prev.get("flk", {}), "text_status": "full" if has_text else "pending"})
            entries.append(item)
            continue

        row = flk_search(title)
        time.sleep(GAP)
        meta, changed = {}, False
        if row:
            meta = flk_detail(row["bbbs"]) or {}
            time.sleep(GAP)
            prev = old_by_file.get(file, {})
            prev_bbbs = (prev.get("flk") or {}).get("bbbs")
            changed = bool(prev_bbbs and prev_bbbs != row["bbbs"])
            item["flk"] = {"bbbs": row["bbbs"], "gbrq": meta.get("gbrq"),
                           "sxrq": meta.get("sxrq"), "zdjg": meta.get("zdjg"),
                           "url": meta.get("url")}
        else:
            log.append(f"⚠ {title}：检索未命中（站点限流或标题变更），保留现有状态")

        if args.check:
            status = "full" if has_text else "pending"
            if changed:
                status, updates = "revision-detected", updates + 1
                log.append(f"⬆ {title}：检测到新版本（bbbs 变更），需更新全文")
            item["text_status"] = status
            entries.append(item)
            continue

        # --fetch：无文本或检测到修订时尝试抓取
        if meta.get("word_path") and (not has_text or changed):
            text = fetch_text(row["bbbs"], meta["word_path"])
            if text:
                txt_path.write_text(header_of(ent, meta) + text, encoding="utf-8")
                item["text_status"] = "full"
                log.append(f"✔ {title}：全文已更新（{len(text)} 字）")
            elif has_text:
                item["text_status"] = "kept"
                log.append(f"○ {title}：全文抓取未成功，保留本地文本")
            else:
                item["text_status"] = "pending"
                log.append(f"… {title}：全文待同步（目录与元数据已收录）")
        else:
            item["text_status"] = "full" if has_text else "pending"

        entries.append(item)

    INDEX.write_text(json.dumps({
        "name": "律衡法律资源库", "source": catalog["source"], "updated_at": now,
        "total": len(entries),
        "full_text": sum(1 for e in entries if e["text_status"] == "full"),
        "entries": entries}, ensure_ascii=False, indent=2), encoding="utf-8")

    n_full = sum(1 for e in entries if e["text_status"] == "full")
    n_pending = sum(1 for e in entries if e["text_status"] == "pending")
    roles = sorted({r for e in entries for r in e["roles"]})
    rep = ["# 法律资源库同步报告", "",
           f"- 同步时间：{now}",
           f"- 数据来源：{catalog['source']}",
           f"- 收录总量：{len(entries)} 部（法律法规 + 司法解释）",
           f"- 全文就绪：{n_full} 部　待同步：{n_pending} 部",
           f"- 覆盖角色：{'、'.join(roles)}", "", "## 本次同步明细", ""]
    rep += [f"- {l}" for l in log] or ["- 无变更"]
    REPORT.write_text("\n".join(rep) + "\n", encoding="utf-8")

    print(f"\n完成：{len(entries)} 部，全文 {n_full}，待同步 {n_pending}，修订 {updates}")
    if args.check and updates:
        sys.exit(2)


if __name__ == "__main__":
    main()
