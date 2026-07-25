#!/usr/bin/env python3
"""Generate page/aikatsu_digest.html from data/daily.md, data/weekly.md, data/monthly.md.

Markdown entry format (repeated for each topic under a "## <date heading>" section):

- **見出し**
  - 説明: ...
  - 出典: [text](url) / [text](url) ...
  - 注目度: ★★★★★ (5) — 根拠: ...
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "page" / "aikatsu_digest.html"

SECTION_RE = re.compile(r"^## (.+)$", re.MULTILINE)
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def parse_topics(block_text):
    topics = []
    current = None
    for line in block_text.splitlines():
        m = re.match(r"^- \*\*(.+?)\*\*\s*$", line)
        if m:
            if current:
                topics.append(current)
            current = {"title": m.group(1), "desc": "", "links": [], "score": 0, "reason": ""}
            continue
        if current is None:
            continue
        m = re.match(r"^\s*- 説明:\s*(.+)$", line)
        if m:
            current["desc"] = m.group(1).strip()
            continue
        m = re.match(r"^\s*- 出典:\s*(.+)$", line)
        if m:
            current["links"] = [{"text": t, "url": u} for t, u in LINK_RE.findall(m.group(1))]
            continue
        m = re.match(r"^\s*- 注目度:\s*[★☆]+\s*\((\d+)\)\s*—\s*根拠:\s*(.+)$", line)
        if m:
            current["score"] = int(m.group(1))
            current["reason"] = m.group(2).strip()
            continue
    if current:
        topics.append(current)
    return topics


def parse_file(path):
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    matches = list(SECTION_RE.finditer(text))
    sections = []
    for i, m in enumerate(matches):
        heading = m.group(1).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end]
        topics = parse_topics(body)
        if topics:
            sections.append({"heading": heading, "topics": topics})
    return sections


def slugify(s, prefix):
    h = 0
    for ch in s:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return f"{prefix}-{h:x}"


def main():
    daily = parse_file(DATA / "daily.md")
    weekly = parse_file(DATA / "weekly.md")
    monthly = parse_file(DATA / "monthly.md")

    # daily: newest first, keep topic order as written
    daily = list(reversed(daily))
    # weekly / monthly: newest section first; topics within each section sorted by score desc
    for coll in (weekly, monthly):
        coll.reverse()
        for sec in coll:
            sec["topics"].sort(key=lambda t: -t["score"])

    for prefix, coll in (("d", daily), ("w", weekly), ("m", monthly)):
        for sec in coll:
            sec["slug"] = slugify(sec["heading"], prefix)

    data = {"daily": daily, "weekly": weekly, "monthly": monthly}
    data_json = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")

    template = (ROOT / "scripts" / "template.html").read_text(encoding="utf-8")
    out_html = template.replace("__AIKATSU_DATA_JSON__", data_json)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(out_html, encoding="utf-8")
    print(f"wrote {OUT} ({len(daily)} daily, {len(weekly)} weekly, {len(monthly)} monthly sections)")


if __name__ == "__main__":
    main()
