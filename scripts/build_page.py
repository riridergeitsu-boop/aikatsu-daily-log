#!/usr/bin/env python3
"""
data/daily.md, data/weekly.md, data/monthly.md を読み込み、
docs/index.html （GitHub Pages公開用の単一HTMLページ）を再生成する。

想定するMarkdown書式（見出しの下に箇条書きのトピックが並ぶ）:

## 2026年7月25日

- **見出し**
  - 説明: ...
  - 出典: [text](url) / [text2](url2)
  - 発生日: 2026年7月23日 (または「現在開催中」等)
  - 注目度: ★★★☆☆ (3)
  - 根拠: ...

情報が無い日は見出しの下に「本日は条件に合致する情報なし」のような一文のみが入る。
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUT_PATH = ROOT / "docs" / "index.html"

HEADING_RE = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)
TOPIC_TITLE_RE = re.compile(r"^-\s+\*\*(.+?)\*\*\s*$")
FIELD_RE = re.compile(r"^\s*-\s+(説明|出典|発生日|注目度|根拠):\s*(.*)$")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
STAR_RE = re.compile(r"[★☆]+\s*\((\d+)\)|\((\d+)\)")


def parse_sections(text):
    """見出し(## ...)ごとにブロックへ分割し、[(heading, body_text), ...] を返す。"""
    sections = []
    matches = list(HEADING_RE.finditer(text))
    for i, m in enumerate(matches):
        heading = m.group(1).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end]
        sections.append((heading, body))
    return sections


def parse_topics(body):
    lines = body.splitlines()
    topics = []
    current = None
    plain_notes = []

    for line in lines:
        if not line.strip():
            continue
        title_m = TOPIC_TITLE_RE.match(line)
        if title_m:
            if current:
                topics.append(current)
            current = {
                "title": title_m.group(1).strip(),
                "desc": "",
                "sources": [],
                "occurred": "",
                "stars": 0,
                "rationale": "",
            }
            continue
        field_m = FIELD_RE.match(line)
        if field_m and current is not None:
            key, val = field_m.group(1), field_m.group(2).strip()
            if key == "説明":
                current["desc"] = val
            elif key == "出典":
                current["sources"] = LINK_RE.findall(val)
                if not current["sources"] and val:
                    current["sources"] = [(val, "")]
            elif key == "発生日":
                current["occurred"] = val
            elif key == "注目度":
                sm = STAR_RE.search(val)
                if sm:
                    current["stars"] = int(sm.group(1) or sm.group(2))
            elif key == "根拠":
                current["rationale"] = val
            continue
        if current is None and line.strip().startswith("-"):
            plain_notes.append(line.strip().lstrip("- ").strip())
        elif current is None:
            plain_notes.append(line.strip())

    if current:
        topics.append(current)

    note = " ".join(plain_notes).strip()
    return topics, note


def load(name):
    path = DATA_DIR / name
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    out = []
    for heading, body in parse_sections(text):
        topics, note = parse_topics(body)
        out.append({"heading": heading, "topics": topics, "note": note})
    out.reverse()  # 最新が先頭
    return out


def esc(s):
    return html.escape(s or "", quote=True)


def star_bar(n):
    n = max(0, min(5, n))
    filled = "★" * n
    empty = "☆" * (5 - n)
    pct = n / 5 * 100
    return (
        f'<span class="stars" title="注目度 {n}/5" aria-label="注目度 {n} / 5">'
        f'<span class="stars-glyph">{filled}{empty}</span>'
        f'<span class="stars-bar"><span class="stars-fill" style="width:{pct:.0f}%"></span></span>'
        f"</span>"
    )


def render_sources(sources):
    if not sources:
        return ""
    parts = []
    for text, url in sources:
        text = esc(text)
        if url:
            parts.append(f'<a href="{esc(url)}" target="_blank" rel="noopener noreferrer">{text}</a>')
        else:
            parts.append(text)
    return " / ".join(parts)


def render_topic_card(topic, show_occurred=True):
    stars = topic.get("stars", 0)
    occurred = topic.get("occurred", "")
    occurred_html = (
        f'<div class="topic-meta-row">🗓 {esc(occurred)}</div>' if (show_occurred and occurred) else ""
    )
    sources_html = render_sources(topic.get("sources", []))
    sources_row = f'<div class="topic-sources">🔗 {sources_html}</div>' if sources_html else ""
    rationale = topic.get("rationale", "")
    rationale_html = f'<div class="topic-rationale">根拠: {esc(rationale)}</div>' if rationale else ""
    return f"""
      <article class="card">
        <div class="card-head">
          <h4>{esc(topic.get('title',''))}</h4>
          {star_bar(stars)}
        </div>
        <p class="topic-desc">{esc(topic.get('desc',''))}</p>
        {occurred_html}
        {sources_row}
        {rationale_html}
      </article>"""


def render_empty_card(note):
    text = note or "本日は条件に合致する情報なし"
    return f'<p class="empty-note">{esc(text)}</p>'


def slugify(heading):
    return re.sub(r"[^0-9a-zA-Z一-龥ぁ-んァ-ヶ]+", "-", heading).strip("-")


def render_period_section(period_id, entries, show_occurred=True):
    if not entries:
        return (
            f'<div id="{period_id}-nav" class="side-nav"><p class="nav-empty">まだデータがありません。</p></div>',
            f'<div id="{period_id}-content"><p class="empty-note">まだデータがありません。</p></div>',
        )

    nav_items = []
    content_items = []
    for i, entry in enumerate(entries):
        heading = entry["heading"]
        anchor = f"{period_id}-{slugify(heading)}-{i}"
        nav_items.append(f'<li><a href="#{anchor}" class="nav-link">{esc(heading)}</a></li>')

        topics = entry["topics"]
        if topics:
            # 注目度が高い順（週次・月次は元々整列済みだが、念のためソートを保証）
            topics_sorted = sorted(topics, key=lambda t: -t.get("stars", 0))
            cards = "\n".join(render_topic_card(t, show_occurred=show_occurred) for t in topics_sorted)
        else:
            cards = render_empty_card(entry.get("note", ""))

        content_items.append(f"""
      <section id="{anchor}" class="period-block">
        <h3>{esc(heading)}</h3>
        <div class="card-grid">{cards}</div>
      </section>""")

    nav_html = f'<ul class="side-nav" id="{period_id}-nav">' + "\n".join(nav_items) + "</ul>"
    content_html = f'<div id="{period_id}-content">' + "\n".join(content_items) + "</div>"
    return nav_html, content_html


def build():
    daily = load("daily.md")
    weekly = load("weekly.md")
    monthly = load("monthly.md")

    daily_nav, daily_content = render_period_section("daily", daily, show_occurred=True)
    weekly_nav, weekly_content = render_period_section("weekly", weekly, show_occurred=False)
    monthly_nav, monthly_content = render_period_section("monthly", monthly, show_occurred=False)

    last_updated = daily[0]["heading"] if daily else "-"

    template_path = ROOT / "scripts" / "template.html"
    template = template_path.read_text(encoding="utf-8")
    out = (
        template.replace("__LAST_UPDATED__", esc(last_updated))
        .replace("__DAILY_NAV__", daily_nav)
        .replace("__DAILY_CONTENT__", daily_content)
        .replace("__WEEKLY_NAV__", weekly_nav)
        .replace("__WEEKLY_CONTENT__", weekly_content)
        .replace("__MONTHLY_NAV__", monthly_nav)
        .replace("__MONTHLY_CONTENT__", monthly_content)
    )
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(out, encoding="utf-8")
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    build()
