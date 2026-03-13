"""Generate v1.2 whitepaper PDF from vault/whitepaper.md (markdown → PDF)."""
import re
from fpdf import FPDF


class WhitepaperPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 8, "ZK Agentic Chain - AGNTC Whitepaper v1.2", align="C", new_x="LEFT", new_y="NEXT")
            self.ln(2)
            self.set_draw_color(200, 200, 200)
            self.line(20, self.get_y(), 190, self.get_y())
            self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


def clean_inline(text):
    """Strip markdown inline formatting (bold, italic, links, code) to plain text."""
    # Links: [text](url) → text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Bold+italic: ***text*** or ___text___
    text = re.sub(r'\*{3}(.+?)\*{3}', r'\1', text)
    text = re.sub(r'_{3}(.+?)_{3}', r'\1', text)
    # Bold: **text** or __text__
    text = re.sub(r'\*{2}(.+?)\*{2}', r'\1', text)
    text = re.sub(r'_{2}(.+?)_{2}', r'\1', text)
    # Italic: *text* or _text_
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'(?<!\w)_(.+?)_(?!\w)', r'\1', text)
    # Inline code: `text`
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # Unicode → ASCII safe replacements
    text = text.replace('\u2014', ' - ')  # em dash
    text = text.replace('\u2013', '-')     # en dash
    text = text.replace('\u2018', "'").replace('\u2019', "'")  # curly single quotes
    text = text.replace('\u201c', '"').replace('\u201d', '"')  # curly double quotes
    text = text.replace('\u2026', '...')   # ellipsis
    text = text.replace('\u00d7', 'x')     # multiplication sign
    text = text.replace('\u2265', '>=')    # >=
    text = text.replace('\u2264', '<=')    # <=
    text = text.replace('\u2260', '!=')    # !=
    text = text.replace('\u03b1', 'alpha') # alpha
    text = text.replace('\u03b2', 'beta')  # beta
    text = text.replace('\u03b3', 'gamma') # gamma
    text = text.replace('\u221e', 'inf')   # infinity
    text = text.replace('\u2192', '->')    # right arrow
    text = text.replace('\u2190', '<-')    # left arrow
    text = text.replace('\u00b2', '^2')    # superscript 2
    text = text.replace('\u2022', '-')     # bullet
    text = text.replace('\u00b7', '.')     # middle dot
    text = text.replace('\u2248', '~=')   # approximately equal
    text = text.replace('\u00b0', ' deg')  # degree
    # Strip any remaining non-latin-1 chars
    text = text.encode('latin-1', errors='replace').decode('latin-1')
    return text


def parse_markdown(filepath):
    """Parse markdown into a list of blocks: (type, content)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    blocks = []
    i = 0
    while i < len(lines):
        line = lines[i].rstrip('\n')

        # Horizontal rule
        if re.match(r'^---+\s*$', line):
            blocks.append(('hr', ''))
            i += 1
            continue

        # Code block
        if line.startswith('```'):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].rstrip('\n').startswith('```'):
                code_lines.append(lines[i].rstrip('\n'))
                i += 1
            i += 1  # skip closing ```
            blocks.append(('code', '\n'.join(code_lines)))
            continue

        # Table
        if line.startswith('|'):
            table_lines = []
            while i < len(lines) and lines[i].rstrip('\n').startswith('|'):
                table_lines.append(lines[i].rstrip('\n'))
                i += 1
            blocks.append(('table', table_lines))
            continue

        # Headers
        m = re.match(r'^(#{1,4})\s+(.+)$', line)
        if m:
            level = len(m.group(1))
            blocks.append((f'h{level}', clean_inline(m.group(2))))
            i += 1
            continue

        # Blockquote
        if line.startswith('>'):
            quote_lines = []
            while i < len(lines) and (lines[i].rstrip('\n').startswith('>') or lines[i].rstrip('\n') == ''):
                l = lines[i].rstrip('\n')
                if l == '' and (i + 1 >= len(lines) or not lines[i + 1].rstrip('\n').startswith('>')):
                    break
                quote_lines.append(re.sub(r'^>\s?', '', l))
                i += 1
            blocks.append(('quote', clean_inline(' '.join(quote_lines))))
            continue

        # Bullet list
        if re.match(r'^[-*]\s', line):
            blocks.append(('bullet', clean_inline(line[2:].strip())))
            i += 1
            continue

        # Numbered list
        m = re.match(r'^(\d+)\.\s(.+)$', line)
        if m:
            blocks.append(('numbered', clean_inline(m.group(2).strip())))
            i += 1
            continue

        # Empty line
        if line.strip() == '':
            i += 1
            continue

        # Regular paragraph (collect consecutive non-empty lines)
        para_lines = []
        while i < len(lines):
            l = lines[i].rstrip('\n')
            if l.strip() == '' or l.startswith('#') or l.startswith('```') or l.startswith('|') or l.startswith('>') or re.match(r'^[-*]\s', l) or re.match(r'^\d+\.\s', l) or re.match(r'^---+\s*$', l):
                break
            para_lines.append(l)
            i += 1
        if para_lines:
            blocks.append(('para', clean_inline(' '.join(para_lines))))

    return blocks


def render_title_page(pdf):
    """Render the title page."""
    pdf.ln(40)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 15, "AGNTC Whitepaper", align="C")
    pdf.ln(18)
    pdf.set_font("Helvetica", "", 16)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 10, "ZK Agentic Chain", align="C")
    pdf.ln(12)
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 8, "A Privacy-Preserving Blockchain with", align="C")
    pdf.ln(8)
    pdf.cell(0, 8, "AI-Powered Verification", align="C")
    pdf.ln(20)
    pdf.set_draw_color(180, 180, 180)
    pdf.line(70, pdf.get_y(), 140, pdf.get_y())
    pdf.ln(15)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 7, "Version 1.2  |  March 2026", align="C")
    pdf.ln(7)
    pdf.cell(0, 7, "zkagentic.ai", align="C")


def render_table(pdf, table_lines):
    """Render a markdown table with auto-sized columns and proper pagination."""
    if len(table_lines) < 2:
        return

    # Parse header
    header_cells = [clean_inline(c.strip()) for c in table_lines[0].split('|')[1:-1]]
    # Skip separator row (index 1)
    data_rows = []
    for row_line in table_lines[2:]:
        cells = [clean_inline(c.strip()) for c in row_line.split('|')[1:-1]]
        data_rows.append(cells)

    num_cols = len(header_cells)
    if num_cols == 0:
        return

    usable_width = 170

    # Scale font for wide tables
    if num_cols >= 7:
        header_font_size = 6
        data_font_size = 5.5
        row_height = 4.5
    elif num_cols >= 5:
        header_font_size = 7
        data_font_size = 6.5
        row_height = 5
    else:
        header_font_size = 9
        data_font_size = 8
        row_height = 6

    # Calculate proportional column widths based on max content length
    all_rows = [header_cells] + data_rows
    max_lens = [0] * num_cols
    for row in all_rows:
        for j, cell in enumerate(row):
            if j < num_cols:
                max_lens[j] = max(max_lens[j], len(cell))

    # Ensure minimum width and compute proportional widths
    min_col_chars = 4
    max_lens = [max(ml, min_col_chars) for ml in max_lens]
    total_chars = sum(max_lens)
    col_widths = [(ml / total_chars) * usable_width for ml in max_lens]

    # Clamp: no column wider than 50% or narrower than 10mm
    for j in range(num_cols):
        col_widths[j] = max(col_widths[j], 10)
        col_widths[j] = min(col_widths[j], usable_width * 0.5)
    # Normalize to fit usable_width
    scale = usable_width / sum(col_widths)
    col_widths = [w * scale for w in col_widths]

    def draw_header_row(continued=False):
        """Draw the table header row."""
        if continued:
            pdf.set_font("Helvetica", "I", max(data_font_size - 1, 5))
            pdf.set_text_color(140, 140, 140)
            pdf.cell(usable_width, row_height, "(continued)", align="R")
            pdf.ln()
        pdf.set_font("Helvetica", "B", header_font_size)
        pdf.set_text_color(0, 0, 0)
        pdf.set_fill_color(235, 235, 235)
        for j, hcell in enumerate(header_cells):
            pdf.cell(col_widths[j], row_height, hcell[:50], border=1, fill=True)
        pdf.ln()

    # Disable auto page break during table rendering (we handle it manually)
    pdf.set_auto_page_break(auto=False)
    page_bottom = pdf.h - 20  # match the margin=20

    # If the entire table fits on the current page, render in place.
    # Otherwise, if we can't even fit header + 2 rows, start a new page.
    total_table_height = (len(data_rows) + 1) * row_height + 6
    remaining = page_bottom - pdf.get_y()
    min_start_height = row_height * 3  # header + 2 data rows minimum

    if total_table_height <= remaining:
        # Whole table fits — render here
        pass
    elif remaining < min_start_height:
        # Not even room for header + 2 rows — start fresh page
        pdf.add_page()

    # Draw initial header
    draw_header_row()

    # Data rows
    pdf.set_font("Helvetica", "", data_font_size)
    pdf.set_text_color(40, 40, 40)

    for row in data_rows:
        # Check if there's room for this row; if not, new page + re-draw header
        if pdf.get_y() + row_height > page_bottom:
            pdf.add_page()
            draw_header_row(continued=True)
            pdf.set_font("Helvetica", "", data_font_size)
            pdf.set_text_color(40, 40, 40)

        x_start = pdf.get_x()
        y_start = pdf.get_y()
        for j in range(num_cols):
            cell_text = row[j] if j < len(row) else ''
            # Truncate to fit column width (approx chars that fit)
            max_chars = int(col_widths[j] / (data_font_size * 0.22))
            if len(cell_text) > max_chars:
                cell_text = cell_text[:max_chars - 1] + '.'
            pdf.set_xy(x_start + sum(col_widths[:j]), y_start)
            pdf.cell(col_widths[j], row_height, cell_text, border=1)
        pdf.ln()

    # Re-enable auto page break
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.ln(3)


def render_toc(pdf, toc_entries):
    """Render a Table of Contents page with section titles and page numbers."""
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 12, "Table of Contents", align="C")
    pdf.ln(8)

    row_h = 5  # compact row height

    for level, title, page_num in toc_entries:
        if level == 'part':
            pdf.ln(2.5)
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(0, 0, 0)
            indent = 0
        elif level == 'h2':
            pdf.ln(0.5)
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(30, 30, 30)
            indent = 0
        elif level == 'h3':
            pdf.set_font("Helvetica", "", 8.5)
            pdf.set_text_color(60, 60, 60)
            indent = 8
        else:
            continue  # skip h4 in TOC

        x = pdf.get_x() + indent
        usable = 170 - indent
        # Title on the left, page number on the right, dots in between
        title_w = pdf.get_string_width(title)
        page_str = str(page_num)
        page_w = pdf.get_string_width(page_str)
        dot_w = usable - title_w - page_w - 4
        if dot_w < 10:
            # Title too long, truncate
            while dot_w < 10 and len(title) > 10:
                title = title[:-2] + '.'
                title_w = pdf.get_string_width(title)
                dot_w = usable - title_w - page_w - 4

        num_dots = max(int(dot_w / pdf.get_string_width('.')), 3)
        dots = ' ' + '.' * num_dots + ' '

        pdf.set_x(x)
        pdf.cell(title_w + 2, row_h, title)
        pdf.set_text_color(180, 180, 180)
        pdf.cell(dot_w, row_h, dots)
        # Page number in dark color
        pdf.set_text_color(60, 60, 60)
        pdf.cell(page_w + 2, row_h, page_str, align="R")
        pdf.ln()

        # Page break if TOC itself overflows
        if pdf.get_y() > pdf.h - 25:
            pdf.add_page()


def render_blocks(pdf, blocks, collect_toc=None):
    """Render parsed blocks to PDF. If collect_toc is a list, append (level, title, page) entries."""
    skip_until_toc_end = False
    page_bottom = lambda: pdf.h - 20  # margin=20

    def needs_page_break(min_space_mm):
        """Check if we need a page break to fit min_space_mm below current Y."""
        return pdf.get_y() + min_space_mm > page_bottom()

    for i, (btype, content) in enumerate(blocks):
        # Skip the title (h1) — we already have a title page
        if btype == 'h1':
            continue

        # Skip Table of Contents section
        if btype == 'h2' and 'Table of Contents' in content:
            skip_until_toc_end = True
            continue
        if skip_until_toc_end:
            if btype == 'hr':
                skip_until_toc_end = False
            continue

        # Skip blockquote that is the subtitle (already on title page)
        if btype == 'quote' and 'ZK Agentic Chain' in content and 'Version' in content:
            continue

        if btype == 'h2':
            # Part headers (e.g., "Part I: Vision and Context")
            if content.startswith('Part '):
                pdf.add_page()
                if collect_toc is not None:
                    collect_toc.append(('part', content, pdf.page_no()))
                pdf.ln(10)
                pdf.set_font("Helvetica", "B", 16)
                pdf.set_text_color(0, 0, 0)
                pdf.cell(0, 12, content, align="C")
                pdf.ln(15)
                continue
            # Regular section — always starts a new page
            pdf.add_page()
            if collect_toc is not None:
                collect_toc.append(('h2', content, pdf.page_no()))
            pdf.set_font("Helvetica", "B", 14)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(4)
            pdf.multi_cell(0, 8, content)
            pdf.ln(4)

        elif btype == 'h3':
            # Keep-with-next: heading with spacing (~16mm) + at least 3 lines
            # of paragraph content below (~30mm) = ~46mm minimum
            if needs_page_break(46):
                pdf.add_page()
            if collect_toc is not None:
                collect_toc.append(('h3', content, pdf.page_no()))
            pdf.ln(6)
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(0, 0, 0)
            pdf.multi_cell(0, 7, content)
            pdf.ln(3)

        elif btype == 'h4':
            # Keep-with-next: heading with spacing (~10mm) + at least 3 lines
            # of paragraph content below (~20mm) = ~30mm minimum
            if needs_page_break(30):
                pdf.add_page()
            pdf.ln(4)
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(30, 30, 30)
            pdf.multi_cell(0, 6, content)
            pdf.ln(2)

        elif btype == 'quote':
            pdf.set_font("Helvetica", "I", 9)
            pdf.set_text_color(80, 80, 80)
            pdf.set_fill_color(245, 245, 245)
            x = pdf.get_x()
            pdf.set_x(x + 5)
            pdf.multi_cell(160, 5, content, fill=True)
            pdf.set_text_color(40, 40, 40)
            pdf.ln(3)

        elif btype == 'para':
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(40, 40, 40)
            pdf.multi_cell(0, 5.5, content)
            pdf.ln(3)

        elif btype == 'bullet':
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(40, 40, 40)
            x = pdf.get_x()
            pdf.set_x(x + 5)
            # Use bullet character
            pdf.cell(5, 5.5, "-")
            pdf.multi_cell(155, 5.5, content)
            pdf.ln(1)

        elif btype == 'numbered':
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(40, 40, 40)
            x = pdf.get_x()
            pdf.set_x(x + 5)
            pdf.cell(5, 5.5, "-")
            pdf.multi_cell(155, 5.5, content)
            pdf.ln(1)

        elif btype == 'code':
            pdf.set_font("Courier", "", 9)
            pdf.set_fill_color(245, 245, 245)
            pdf.set_text_color(0, 80, 120)
            x = pdf.get_x()
            pdf.set_x(x + 5)
            # Clean the code content
            code_text = clean_inline(content.replace('\t', '    '))
            pdf.multi_cell(160, 5, code_text, fill=True)
            pdf.set_text_color(40, 40, 40)
            pdf.ln(3)

        elif btype == 'table':
            render_table(pdf, content)

        elif btype == 'hr':
            # Skip hr if next block is a heading (would create blank page)
            next_type = blocks[i + 1][0] if i + 1 < len(blocks) else None
            if next_type in ('h1', 'h2', 'h3'):
                continue
            pdf.ln(3)
            pdf.set_draw_color(200, 200, 200)
            pdf.line(20, pdf.get_y(), 190, pdf.get_y())
            pdf.ln(5)


def main():
    whitepaper_path = "./ vault/whitepaper.md"
    output_path = "./ ZkAgentic/projects/web/zkagentic-deploy/AGNTC-Whitepaper-v1.2.pdf"

    print("Parsing whitepaper markdown...")
    blocks = parse_markdown(whitepaper_path)
    print(f"  Parsed {len(blocks)} blocks")

    # --- Pass 1: Render to collect TOC page numbers ---
    print("Pass 1: collecting TOC entries...")
    toc_entries = []
    pdf1 = WhitepaperPDF()
    pdf1.alias_nb_pages()
    pdf1.set_auto_page_break(auto=True, margin=20)
    pdf1.add_page()  # title page
    render_title_page(pdf1)
    pdf1.add_page()  # placeholder for TOC (1 page assumed)
    render_blocks(pdf1, blocks, collect_toc=toc_entries)
    # Check if TOC needs 2 pages (>40 entries)
    toc_page_count = 1 if len(toc_entries) <= 40 else 2
    print(f"  {len(toc_entries)} TOC entries, {toc_page_count} TOC page(s)")

    # Adjust page numbers: pass 1 assumed 1 TOC page, correct if 2
    if toc_page_count == 2:
        toc_entries = [(lvl, title, pg + 1) for lvl, title, pg in toc_entries]

    # --- Pass 2: Final render with real TOC ---
    print("Pass 2: rendering final PDF...")
    toc_entries_final = []
    pdf = WhitepaperPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    # Title page
    pdf.add_page()
    render_title_page(pdf)

    # Table of Contents
    render_toc(pdf, toc_entries)

    # Content
    render_blocks(pdf, blocks, collect_toc=toc_entries_final)

    # Footer disclaimer
    pdf.ln(10)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(5)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, "AGNTC Whitepaper v1.2  |  March 2026", align="C")
    pdf.ln(5)
    pdf.cell(0, 5, "Copyright 2026 ZK Agentic Chain. All rights reserved.", align="C")

    pdf.output(output_path)
    print(f"PDF generated: {output_path} ({pdf.page_no()} pages)")


if __name__ == "__main__":
    main()
