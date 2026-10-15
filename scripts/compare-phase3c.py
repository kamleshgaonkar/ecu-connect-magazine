"""Render exported pages and create consistently scaled review comparisons."""
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.tools/python'))
import pymupdf as fitz
from PIL import Image, ImageDraw
out = root / 'docs/previews/phase3c'
pdf = fitz.open(root / 'public/previews/ecu-phase3c-editorial.pdf')
assert len(pdf) == 4
for index, volume, page, name in [(2,20,4,'full-width'),(3,17,12,'two-column')]:
    p = pdf[index]
    assert abs(p.rect.width - 595.28) < 1 and abs(p.rect.height - 841.89) < 1
    p.get_pixmap(matrix=fitz.Matrix(1.3,1.3),alpha=False).save(out / f'pdf-{name}.png')
    reference = Image.open(out / f'reference-v{volume}-p{page}.png').convert('RGB')
    generated = Image.open(out / f'pdf-{name}.png').convert('RGB').resize(reference.size)
    sheet = Image.new('RGB', (reference.width * 2, reference.height + 45), 'white')
    draw = ImageDraw.Draw(sheet)
    draw.text((12,12),f'Original V{volume} PDF p{page}',fill='black')
    draw.text((reference.width+12,12),f'T04 proof / {name} (not visually approved)',fill='black')
    sheet.paste(reference,(0,45))
    sheet.paste(generated,(reference.width,45))
    sheet.save(out / f'comparison-{name}.png')
print('Verified 4 A4 pages; rendered T04 PDF pages and comparison sheets.')
