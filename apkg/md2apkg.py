# -*- coding: utf-8 -*-
"""Convert `<topic>_面試八股文.md` files into Anki `.apkg` decks.

Markdown layout assumed:
    # Title
    > description (ignored)
    ## section header (ignored as boundary)
    ### Q<n>. Question?
    answer markdown ...
    ### Q<n+1>. Next question?
    ...

Usage:
    python3 md2apkg.py                    # convert every *_面試八股文.md in CWD
    python3 md2apkg.py path/to/file.md    # convert specific files
"""
import argparse
import hashlib
import re
import sys
from pathlib import Path

import genanki
import markdown


CSS = """
.card { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif;
        font-size: 16px; line-height: 1.7; text-align: left;
        color: #222; background: #fafafa; padding: 12px; }
.q { font-size: 20px; font-weight: 600; }
.a { margin-top: 4px; }
pre, code { background: #eee; border-radius: 3px;
            font-family: 'SF Mono', Consolas, monospace; }
code { padding: 2px 4px; }
pre { padding: 10px; display: block; overflow-x: auto; white-space: pre; }
pre code { background: transparent; padding: 0; }
ul, ol { padding-left: 22px; }
li { margin: 4px 0; }
b, strong { color: #0a58ca; }
table { border-collapse: collapse; margin: 8px 0; }
th, td { border: 1px solid #ccc; padding: 4px 8px; }
th { background: #eef; }
hr#answer { margin: 12px 0; border: 0; border-top: 1px solid #ccc; }
"""

Q_LINE = re.compile(r"^### (Q\d+\..*?)$", re.MULTILINE)
Q_PREFIX = re.compile(r"^Q\d+\.\s*")
ANSWER_TAG = re.compile(r"^\*\*答[：:]\*\*\s*", re.MULTILINE)
LIST_LINE = re.compile(r"^([-*+] |\d+\.\s)")


def normalize_md(md: str) -> str:
    """Insert blank line before list items that follow a paragraph, so
    python-markdown recognizes them. Skip lines inside fenced code blocks."""
    lines = md.split("\n")
    out: list[str] = []
    in_fence = False
    for i, line in enumerate(lines):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            out.append(line)
            continue
        if not in_fence and i > 0:
            curr = LIST_LINE.match(line.lstrip())
            prev_stripped = lines[i - 1].lstrip()
            prev_empty = not prev_stripped
            prev_is_list = bool(LIST_LINE.match(prev_stripped))
            if curr and not prev_empty and not prev_is_list:
                out.append("")
        out.append(line)
    return "\n".join(out)


def stable_id(seed: str, offset: int = 0) -> int:
    """Stable int ID derived from filename, so re-runs keep the same deck/model id."""
    h = hashlib.sha1(seed.encode("utf-8")).digest()
    n = int.from_bytes(h[:4], "big")
    # genanki wants a 32-bit-ish positive int; bias into 1..2 billion range.
    return (n % 1_000_000_000) + 1_000_000_000 + offset


def parse_md(path: Path) -> tuple[str, list[tuple[str, str]]]:
    text = path.read_text(encoding="utf-8")
    title_match = re.search(r"^# (.+)$", text, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else path.stem

    matches = list(Q_LINE.finditer(text))
    qa: list[tuple[str, str]] = []
    for i, m in enumerate(matches):
        question = Q_PREFIX.sub("", m.group(1).strip())
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end]

        # Trim everything after the next section break / horizontal rule.
        for stopper in ("\n## ", "\n---\n", "\n---"):
            idx = body.find(stopper)
            if idx != -1:
                body = body[:idx]

        answer = ANSWER_TAG.sub("", body.strip()).strip()
        if answer:
            qa.append((question, answer))
    return title, qa


def to_html(md: str) -> str:
    return markdown.markdown(
        normalize_md(md),
        extensions=["tables", "fenced_code", "sane_lists"],
        output_format="html",
    )


def build_apkg(md_path: Path) -> tuple[Path, int]:
    title, qa = parse_md(md_path)
    if not qa:
        raise ValueError(f"no Q blocks parsed from {md_path}")

    deck_id = stable_id(md_path.stem)
    model_id = stable_id(md_path.stem, offset=1)

    model = genanki.Model(
        model_id,
        f"{title} Model",
        fields=[{"name": "Question"}, {"name": "Answer"}],
        templates=[{
            "name": "Card 1",
            "qfmt": '<div class="q">{{Question}}</div>',
            "afmt": '{{FrontSide}}<hr id="answer"><div class="a">{{Answer}}</div>',
        }],
        css=CSS,
    )

    deck = genanki.Deck(deck_id, title)
    for q, a in qa:
        note = genanki.Note(
            model=model,
            fields=[to_html(q), to_html(a)],
            guid=genanki.guid_for(md_path.stem, q),
        )
        deck.add_note(note)

    out_path = md_path.with_suffix(".apkg")
    genanki.Package(deck).write_to_file(str(out_path))
    return out_path, len(qa)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="*", help="markdown files; defaults to *_面試八股文.md")
    args = parser.parse_args()

    if args.files:
        targets = [Path(f) for f in args.files]
    else:
        here = Path(__file__).parent
        targets = sorted(here.glob("*_面試八股文.md"))
        if not targets:
            print("No *_面試八股文.md files found", file=sys.stderr)
            return 1

    for path in targets:
        out, n = build_apkg(path)
        print(f"✓ {path.name} → {out.name} ({n} cards)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
