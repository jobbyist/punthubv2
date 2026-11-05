#!/usr/bin/env python3
"""Builds PFIE-Product-Technical-Blueprint.pdf from the markdown file and the SVG diagrams.

Usage (from docs/pfie): python3 build/build_pdf.py
Needs: python-markdown, playwright (chromium), pdftotext and qpdf.
Two passes: the first finds the page of each section, the second fills the table of contents.
Page 1 is the cover (its own PDF), so page numbers in the footer match the real page of the merged file.
"""
import html, os, re, subprocess, sys, tempfile
import markdown
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MD = os.path.join(ROOT, "PFIE-Product-Technical-Blueprint.md")
OUT = os.path.join(ROOT, "PFIE-Product-Technical-Blueprint.pdf")
LOGO = os.path.join(HERE, "assets", "puntr-logo-white.png")

VERSION = "1.0"
DATE = "5 November 2026"

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');
:root{--ink:#0D0D0D;--panel:#141715;--line:#2A2F2C;--text:#E9EEEB;--muted:#9AA6A0;--green:#16A34A;--green2:#1E9752}
@page{size:A4;margin:20mm 16mm 22mm 16mm;background:#0D0D0D}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html{background:var(--ink)}
body{margin:0;background:var(--ink);color:var(--text);font-family:Inter,Arial,sans-serif;font-size:10pt;line-height:1.5}
.mono{font-family:'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
h1,h2,h3,h4{font-family:Montserrat,Arial,sans-serif;font-weight:800;color:#fff;line-height:1.15}
h2{font-size:22pt;margin:0 0 6mm;padding-top:2mm;border-top:3px solid var(--green);break-before:page;letter-spacing:-.01em}
h2 .num{color:var(--green)}
h3{font-size:12.5pt;margin:7mm 0 2.5mm;color:#fff;break-after:avoid}
h4{font-size:10.5pt;margin:5mm 0 2mm;break-after:avoid}
p{margin:0 0 3mm}
a{color:var(--green)}
strong{color:#fff}
ul,ol{margin:0 0 4mm;padding-left:5mm}
li{margin:0 0 1.3mm}
li.task{list-style:none;margin-left:-5mm}
.cb{display:inline-block;width:3mm;height:3mm;border:1.2px solid var(--green);margin-right:2mm;vertical-align:-.5mm}
.cb.on{background:var(--green)}
code{font-family:'JetBrains Mono',monospace;font-size:8pt;background:#1B1F1D;border:1px solid var(--line);padding:0 1.2mm}
pre{background:#101312;border:1px solid var(--line);border-left:3px solid var(--green);padding:3mm;font-size:6.6pt;white-space:pre-wrap;word-break:break-all;margin:0 0 4mm}
pre code{background:none;border:0;padding:0}
blockquote{margin:0 0 5mm;padding:3.5mm 4.5mm;background:var(--panel);border-left:3px solid var(--green);color:var(--text)}
blockquote p{margin:0}
table{width:100%;border-collapse:collapse;margin:0 0 5mm;font-size:8.2pt;line-height:1.38;break-inside:auto}
thead th{background:#1B211E;color:#fff;text-align:left;font-family:Montserrat,Arial,sans-serif;font-weight:700;font-size:7.8pt;padding:2mm 2.2mm;border-bottom:2px solid var(--green)}
td{padding:1.8mm 2.2mm;border-bottom:1px solid var(--line);vertical-align:top}
tbody tr:nth-child(even) td{background:#101311}
tr{break-inside:avoid}
figure{margin:2mm 0 5mm;padding:3mm;background:#0D0D0D;border:1px solid var(--line);break-inside:avoid;text-align:center}
figure img{max-width:100%;max-height:200mm}
figcaption{font-size:7.5pt;color:var(--muted);margin-top:2mm}
hr{display:none}
.tag{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:6.6pt;font-weight:500;padding:0 1.3mm;border:1px solid;vertical-align:.3mm;letter-spacing:.02em;white-space:nowrap}
.tag.v{color:#4ADE80;border-color:#166534;background:#0F2A19}
.tag.p{color:#93C5FD;border-color:#1E3A5F;background:#0E1B2C}
.tag.c{color:#FBBF24;border-color:#6B4E0B;background:#2A210B}
.tag.a{color:#F9A8D4;border-color:#6B2150;background:#2A0F20}
/* contents */
.toc{break-after:page}
.toc h2{break-before:auto}
.toc-row{display:flex;align-items:baseline;gap:2mm;padding:1.6mm 0;border-bottom:1px solid var(--line);font-size:10.5pt}
.toc-row .t{font-weight:600;color:#fff}
.toc-row .dots{flex:1;border-bottom:1px dotted #3A423E;transform:translateY(-1mm)}
.toc-row .n{font-family:'JetBrains Mono',monospace;color:var(--green);font-size:9.5pt}
.doc-meta{display:flex;gap:8mm;margin:0 0 6mm;color:var(--muted);font-size:8.5pt}
.doc-meta b{color:#fff;font-weight:600}
.firstpage{page-break-after:always}
.spacer{height:10mm}
"""

def tagify(h):
    # badges outside <code> and <pre>
    parts = re.split(r'(<pre.*?</pre>|<code.*?</code>)', h, flags=re.S)
    def f(seg):
        seg = re.sub(r'\[V\]', '<span class="tag v">VERIFIED</span>', seg)
        seg = re.sub(r'\[P\]', '<span class="tag p">PROPOSED</span>', seg)
        seg = re.sub(r'\[C\]', '<span class="tag c">CONFIRM</span>', seg)
        seg = re.sub(r'\[attorney review\]', '<span class="tag a">ATTORNEY REVIEW</span>', seg)
        return seg
    return ''.join(p if p.startswith(('<pre', '<code')) else f(p) for p in parts)

def checkboxes(h):
    h = re.sub(r'<li>\s*\[ \]\s*', '<li class="task"><span class="cb"></span>', h)
    h = re.sub(r'<li>\s*\[x\]\s*', '<li class="task"><span class="cb on"></span>', h)
    return h

def images(h):
    def rep(m):
        src, alt = m.group(1), m.group(2)
        return f'<figure><img src="file://{os.path.join(ROOT, src)}" alt="{alt}"><figcaption>{alt}</figcaption></figure>'
    return re.sub(r'<p><img alt="([^"]*)" src="([^"]+)"\s*/?></p>', lambda m: rep(type('M', (), {'group': lambda s, i: [None, m.group(2), m.group(1)][i]})()), h)

def md_to_html(text):
    h = markdown.markdown(text, extensions=['tables', 'fenced_code', 'sane_lists'])
    return images(checkboxes(tagify(h)))

def load_sections():
    raw = open(MD, encoding='utf-8').read()
    head, *rest = raw.split('\n---\n')
    body = '\n---\n'.join(rest)
    note = re.search(r'^> (.*)$', head, flags=re.M)
    secs = re.split(r'(?m)^## ', body)
    out = []
    for s in secs:
        s = s.strip()
        if not s:
            continue
        title, _, content = s.partition('\n')
        out.append((title.strip(), content))
    return note.group(1) if note else '', out

def section_html(title, content):
    m = re.match(r'(\d+)\.\s+(.*)', title)
    if m:
        t = f'<span class="num">{m.group(1)}</span> {html.escape(m.group(2))}'
    else:
        t = html.escape(title)
    return f'<section><h2>{t}</h2>{md_to_html(content)}</section>'

def toc_html(titles, pages):
    rows = []
    for t in titles:
        n = pages.get(t, '')
        rows.append(f'<div class="toc-row"><span class="t">{html.escape(t)}</span><span class="dots"></span><span class="n">{n}</span></div>')
    return '\n'.join(rows)

def body_html(note, secs, pages):
    titles = [t for t, _ in secs]
    note_html = md_to_html('> ' + note) if note else ''
    toc = f'''<div class="toc"><div class="mono" style="color:var(--green);font-size:8pt;margin-bottom:2mm">Puntr Football Intelligence Engine</div>
<h2 style="border-top:0;padding-top:0">Contents</h2>
<div class="doc-meta"><span>Version <b>{VERSION}</b></span><span>Date <b>{DATE}</b></span><span>Status <b>Draft for owner review</b></span></div>
{note_html}
{toc_html(titles, pages)}</div>'''
    placeholder = '<div class="firstpage"><div class="spacer">cover</div></div>'
    return f'<!doctype html><html lang="en-ZA"><head><meta charset="utf-8"><title>PFIE Product and Technical Blueprint</title><style>{CSS}</style></head><body>{placeholder}{toc}' + ''.join(section_html(t, c) for t, c in secs) + '</body></html>'

def cover_html():
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');
@page{{size:A4;margin:0}}
*{{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
html,body{{margin:0;background:#0D0D0D}}
.page{{width:210mm;height:297mm;position:relative;overflow:hidden;background:
 radial-gradient(60% 40% at 78% 18%, rgba(22,163,74,.28), rgba(22,163,74,0) 70%),
 radial-gradient(50% 35% at 10% 95%, rgba(22,163,74,.12), rgba(22,163,74,0) 70%), #0D0D0D;
 color:#fff;font-family:Inter,Arial,sans-serif;padding:22mm 20mm}}
.grid{{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:14mm 14mm}}
.bar{{position:absolute;left:0;top:0;bottom:0;width:6mm;background:#16A34A}}
.in{{position:relative;height:100%;display:flex;flex-direction:column}}
img{{height:15mm;width:auto;align-self:flex-start}}
.mono{{font-family:'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;font-weight:500}}
h1{{font-family:Montserrat,Arial,sans-serif;font-weight:800;font-size:46pt;line-height:1;letter-spacing:-.03em;margin:0}}
h1 span{{color:#16A34A}}
.sub{{font-size:15pt;color:#D4D9D6;margin-top:7mm;max-width:130mm;line-height:1.4}}
.meta{{margin-top:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;border-top:1px solid #2A2F2C;padding-top:6mm}}
.meta div b{{display:block;font-size:11pt;margin-top:1.5mm}}
.meta .mono{{font-size:7pt;color:#9AA6A0}}
.foot{{margin-top:8mm;font-size:8pt;color:#9AA6A0}}
</style></head><body><div class="page"><div class="grid"></div><div class="bar"></div><div class="in">
<img src="file://{LOGO}" alt="Puntr">
<div style="margin-top:62mm"><div class="mono" style="color:#16A34A;font-size:9pt;margin-bottom:6mm">Product and technical blueprint</div>
<h1>Puntr Football<br>Intelligence<br>Engine<span>.</span></h1>
<div class="sub">Verified football data for Puntr: AI extracts, code validates, independent sources corroborate.</div></div>
<div class="meta">
<div><span class="mono">Version</span><b>{VERSION}</b></div>
<div><span class="mono">Date</span><b>{DATE}</b></div>
<div><span class="mono">Status</span><b>Draft for owner review</b></div>
<div><span class="mono">Technical completion</span><b>9 November 2026</b></div>
<div><span class="mono">Public launch</span><b>1 December 2026</b></div>
<div><span class="mono">Site</span><b>puntr.co.za</b></div></div>
<div class="foot">Fixtures and results only. No live scores or betting odds. 18+ · Gamble responsibly: 0800 006 008</div>
</div></div></body></html>'''

FOOTER = f'''<div style="width:100%;font-size:7.5px;font-family:Inter,Arial,sans-serif;color:#9AA6A0;padding:0 16mm;display:flex;justify-content:space-between;-webkit-print-color-adjust:exact">
<span>Puntr Football Intelligence Engine · v{VERSION} · {DATE}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>'''

def render(pw_page, html_text, path, footer):
    f = os.path.join(tempfile.gettempdir(), 'pfie_tmp.html')
    open(f, 'w', encoding='utf-8').write(html_text)
    pw_page.goto('file://' + f)
    pw_page.evaluate('document.fonts.ready')
    pw_page.wait_for_timeout(1200)
    kw = dict(path=path, format='A4', print_background=True, prefer_css_page_size=True)
    if footer:
        kw.update(display_header_footer=True, header_template='<div></div>', footer_template=FOOTER, margin=dict(top='20mm', bottom='22mm', left='0', right='0'))
    pw_page.pdf(**kw)

def find_pages(pdf, titles):
    n = int(re.search(r'Pages:\s+(\d+)', subprocess.check_output(['pdfinfo', pdf], text=True)).group(1))
    pages = {}
    for i in range(3, n + 1):  # skip cover and contents
        txt = subprocess.check_output(['pdftotext', '-f', str(i), '-l', str(i), '-layout', pdf, '-'], text=True)
        flat = re.sub(r'\s+', ' ', txt)
        for t in titles:
            if t in pages:
                continue
            m = re.match(r'(\d+)\.\s+(.*)', t)
            probe = (m.group(1) + ' ' + m.group(2)) if m else t
            if flat.strip().startswith(probe) or (' ' + probe + ' ') in flat[:300]:
                pages[t] = i
    return pages, n

def main():
    note, secs = load_sections()
    titles = [t for t, _ in secs]
    tmp = tempfile.gettempdir()
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        page = b.new_page()
        render(page, cover_html(), os.path.join(tmp, 'pfie_cover.pdf'), footer=False)
        body_pdf = os.path.join(tmp, 'pfie_body.pdf')
        render(page, body_html(note, secs, {}), body_pdf, footer=True)
        pages, n = find_pages(body_pdf, titles)
        render(page, body_html(note, secs, pages), body_pdf, footer=True)
        pages2, n2 = find_pages(body_pdf, titles)
        if pages2 != pages:
            print('page numbers moved after filling the contents; re-rendering once more')
            render(page, body_html(note, secs, pages2), body_pdf, footer=True)
            pages2, n2 = find_pages(body_pdf, titles)
        b.close()
    missing = [t for t in titles if t not in pages2]
    if missing:
        print('WARNING: sections not located:', missing)
    subprocess.check_call(['qpdf', '--empty', '--pages', os.path.join(tmp, 'pfie_cover.pdf'), os.path.join(tmp, 'pfie_body.pdf'), '2-z', '--', OUT])
    print('wrote', OUT, 'pages', n2, pages2)

if __name__ == '__main__':
    main()
