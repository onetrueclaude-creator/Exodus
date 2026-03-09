"""Generate v1.1 whitepaper PDF from vault/whitepaper.md (markdown → PDF)."""
import re
from fpdf import FPDF


class WhitepaperPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 10, "ZK Agentic Chain - AGNTC Whitepaper v1.1", align="C")
            self.ln(3)
            self.set_draw_color(200, 200, 200)
            self.line(20, self.get_y(), 190, self.get_y())
            self.ln(5)

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
    pdf.cell(0, 7, "Version 1.1  |  March 2026", align="C")
    pdf.ln(7)
    pdf.cell(0, 7, "zkagentic.ai", align="C")


def render_table(pdf, table_lines):
    """Render a markdown table."""
    if len(table_lines) < 2:
        return

    # Parse header
    header_cells = [c.strip() for c in table_lines[0].split('|')[1:-1]]
    # Skip separator row (index 1)
    data_rows = []
    for row_line in table_lines[2:]:
        cells = [c.strip() for c in row_line.split('|')[1:-1]]
        data_rows.append(cells)

    num_cols = len(header_cells)
    if num_cols == 0:
        return

    # Calculate column widths
    usable_width = 170
    col_width = usable_width / num_cols

    # Header row
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(0, 0, 0)
    pdf.set_fill_color(235, 235, 235)
    for hcell in header_cells:
        pdf.cell(col_width, 6, clean_inline(hcell)[:40], border=1, fill=True)
    pdf.ln()

    # Data rows
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(40, 40, 40)
    for row in data_rows:
        max_h = 6
        # Use multi_cell for potentially long content
        x_start = pdf.get_x()
        y_start = pdf.get_y()

        for j, cell in enumerate(row):
            if j < num_cols:
                pdf.set_xy(x_start + j * col_width, y_start)
                cell_text = clean_inline(cell)[:60]
                pdf.cell(col_width, 6, cell_text, border=1)
        pdf.ln()

    pdf.ln(3)


def render_blocks(pdf, blocks):
    """Render parsed blocks to PDF."""
    skip_until_toc_end = False

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

        # Skip "Abstract" as h2 since we render it inline
        # Skip blockquote that is the subtitle

        if btype == 'h2':
            # Part headers (e.g., "Part I: Vision and Context")
            if content.startswith('Part '):
                pdf.add_page()
                pdf.ln(10)
                pdf.set_font("Helvetica", "B", 16)
                pdf.set_text_color(0, 0, 0)
                pdf.cell(0, 12, content, align="C")
                pdf.ln(15)
                continue
            # Regular section
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 14)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(4)
            pdf.multi_cell(0, 8, content)
            pdf.ln(4)

        elif btype == 'h3':
            pdf.ln(6)
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(0, 0, 0)
            pdf.multi_cell(0, 7, content)
            pdf.ln(3)

        elif btype == 'h4':
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
            pdf.ln(3)
            pdf.set_draw_color(200, 200, 200)
            pdf.line(20, pdf.get_y(), 190, pdf.get_y())
            pdf.ln(5)


def main():
    whitepaper_path = "./ vault/whitepaper.md"
    output_path = "./ ZkAgentic/projects/web/zkagentic-deploy/AGNTC-Whitepaper-v1.1.pdf"

    print("Parsing whitepaper markdown...")
    blocks = parse_markdown(whitepaper_path)
    print(f"  Parsed {len(blocks)} blocks")

    pdf = WhitepaperPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    # Title page
    pdf.add_page()
    render_title_page(pdf)

    # Content
    render_blocks(pdf, blocks)

    # Footer disclaimer
    pdf.ln(10)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(5)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, "AGNTC Whitepaper v1.1  |  March 2026", align="C")
    pdf.ln(5)
    pdf.cell(0, 5, "Copyright 2026 ZK Agentic Chain. All rights reserved.", align="C")

    pdf.output(output_path)
    print(f"PDF generated: {output_path} ({pdf.page_no()} pages)")


if __name__ == "__main__":
    main()
