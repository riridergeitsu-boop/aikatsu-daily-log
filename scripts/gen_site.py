#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regenerate docs/index.html from data/daily.md, data/weekly.md, data/monthly.md."""
import re
import html
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DOCS_DIR = ROOT / "docs"


def parse_md(path, has_date_field):
    """Parse a daily/weekly/monthly markdown file into an ordered list of
    (heading, [entries]) tuples, in FILE order (oldest first).
    Each entry is a dict with keys: title, desc, sources (list of (text,url)),
    date (optional), stars (int), rationale, none_note (optional str).
    """
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    sections = []
    current_heading = None
    current_entries = None
    current_entry = None

    def flush_entry():
        nonlocal current_entry
        if current_entry is not None and current_entries is not None:
            current_entries.append(current_entry)
        current_entry = None

    for raw in lines:
        line = raw.rstrip("\n")
        m_head = re.match(r"^## (.+)$", line)
        if m_head:
            flush_entry()
            if current_heading is not None:
                sections.append((current_heading, current_entries))
            current_heading = m_head.group(1).strip()
            current_entries = []
            continue

        m_title = re.match(r"^- \*\*(.+)\*\*\s*$", line)
        if m_title:
            flush_entry()
            current_entry = {"title": m_title.group(1).strip(), "sources": []}
            continue

        m_none = re.match(r"^- (本日は条件に合致する情報なし.*)$", line)
        if m_none and current_entries is not None:
            flush_entry()
            current_entries.append({"none_note": m_none.group(1).strip()})
            continue

        m_field = re.match(r"^\s*- (説明|出典|発生日|注目度|根拠): (.*)$", line)
        if m_field and current_entry is not None:
            key, val = m_field.group(1), m_field.group(2).strip()
            if key == "説明":
                current_entry["desc"] = val
            elif key == "出典":
                for mm in re.finditer(r"\[([^\]]+)\]\(([^)]+)\)", val):
                    current_entry["sources"].append((mm.group(1), mm.group(2)))
            elif key == "発生日":
                current_entry["date"] = val
            elif key == "注目度":
                m_star = re.search(r"\((\d+)\)", val)
                current_entry["stars"] = int(m_star.group(1)) if m_star else 0
            elif key == "根拠":
                current_entry["rationale"] = val
            continue

    flush_entry()
    if current_heading is not None:
        sections.append((current_heading, current_entries))

    return sections


def star_glyph(n):
    n = max(0, min(5, n))
    return "★" * n + "☆" * (5 - n)


def render_card(entry, with_date_row):
    if entry.get("none_note"):
        return (
            '      <article class="card">\n'
            '        <p class="empty-note">' + html.escape(entry["none_note"]) + "</p>\n"
            "      </article>"
        )

    title = html.escape(entry.get("title", ""))
    desc = html.escape(entry.get("desc", ""))
    stars = entry.get("stars", 0)
    glyph = star_glyph(stars)
    pct = stars * 20
    rationale = html.escape(entry.get("rationale", ""))

    sources_html = " / ".join(
        '<a href="{url}" target="_blank" rel="noopener noreferrer">{text}</a>'.format(
            url=html.escape(url, quote=True), text=html.escape(text)
        )
        for text, url in entry.get("sources", [])
    )

    date_row = ""
    if with_date_row and entry.get("date"):
        date_row = (
            '        <div class="topic-meta-row">🗓 ' + html.escape(entry["date"]) + "</div>\n"
        )

    return (
        '      <article class="card">\n'
        '        <div class="card-head">\n'
        "          <h4>{title}</h4>\n"
        '          <span class="stars" title="注目度 {stars}/5" aria-label="注目度 {stars} / 5">'
        '<span class="stars-glyph">{glyph}</span>'
        '<span class="stars-bar"><span class="stars-fill" style="width:{pct}%"></span></span></span>\n'
        "        </div>\n"
        '        <p class="topic-desc">{desc}</p>\n'
        "{date_row}"
        '        <div class="topic-sources">🔗 {sources}</div>\n'
        '        <div class="topic-rationale">根拠: {rationale}</div>\n'
        "      </article>"
    ).format(
        title=title, stars=stars, glyph=glyph, pct=pct, desc=desc,
        date_row=date_row, sources=sources_html, rationale=rationale,
    )


def slugify(prefix, heading, idx):
    base = re.sub(r"[^0-9A-Za-z぀-ヿ一-鿿]+", "-", heading)
    return "{}-{}-{}".format(prefix, base, idx)


def render_tab(prefix, sections, with_date_row):
    # sections are in file order (oldest first); display newest first.
    sections_rev = list(reversed(sections))
    if not sections_rev:
        nav_html = '<li class="nav-empty">データがありません</li>'
        content_html = '<p class="empty-note">データがありません</p>'
        return nav_html, content_html

    nav_items = []
    blocks = []
    for idx, (heading, entries) in enumerate(sections_rev):
        anchor = slugify(prefix, heading, idx)
        nav_items.append(
            '<li><a href="#{anchor}" class="nav-link">{heading}</a></li>'.format(
                anchor=anchor, heading=html.escape(heading)
            )
        )
        cards = "\n\n".join(render_card(e, with_date_row) for e in entries)
        if not cards:
            cards = '      <p class="empty-note">本日は該当情報なし</p>'
        block = (
            '      <section id="{anchor}" class="period-block">\n'
            "        <h3>{heading}</h3>\n"
            '        <div class="card-grid">\n'
            "{cards}</div>\n"
            "      </section>"
        ).format(anchor=anchor, heading=html.escape(heading), cards=cards + "\n" if cards else "")
        blocks.append(block)

    nav_html = "\n".join(nav_items)
    content_html = "\n\n".join(blocks)
    return nav_html, content_html


def main():
    if len(sys.argv) > 1:
        last_updated = sys.argv[1]
    else:
        last_updated = "更新日不明"

    daily_sections = parse_md(DATA_DIR / "daily.md", has_date_field=True)
    weekly_sections = parse_md(DATA_DIR / "weekly.md", has_date_field=False)
    monthly_sections = parse_md(DATA_DIR / "monthly.md", has_date_field=False)

    daily_nav, daily_content = render_tab("daily", daily_sections, with_date_row=True)
    weekly_nav, weekly_content = render_tab("weekly", weekly_sections, with_date_row=False)
    monthly_nav, monthly_content = render_tab("monthly", monthly_sections, with_date_row=False)

    template = (DOCS_DIR / "_template.html").read_text(encoding="utf-8")
    out = template
    out = out.replace("{{LAST_UPDATED}}", html.escape(last_updated))
    out = out.replace("{{DAILY_NAV}}", daily_nav)
    out = out.replace("{{DAILY_CONTENT}}", daily_content)
    out = out.replace("{{WEEKLY_NAV}}", weekly_nav)
    out = out.replace("{{WEEKLY_CONTENT}}", weekly_content)
    out = out.replace("{{MONTHLY_NAV}}", monthly_nav)
    out = out.replace("{{MONTHLY_CONTENT}}", monthly_content)

    (DOCS_DIR / "index.html").write_text(out, encoding="utf-8")
    print("Wrote", DOCS_DIR / "index.html")


if __name__ == "__main__":
    main()
