"""Render reference contact sheets without extracting fonts or changing originals."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.tools/python'))
import fitz
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1]
out = root / 'tmp/pdfs/phase3c'
out.mkdir(parents=True, exist_ok=True)
for volume in [15, 17, 19, 20]:
    doc = fitz.open(root / f'references/ECU Connect - Vol {volume} (2026).pdf')
    for start in range(2, len(doc), 6):
        sheet = Image.new('RGB', (1200, 1160), 'white')
        draw = ImageDraw.Draw(sheet)
        for offset in range(6):
            index = start + offset
            if index >= len(doc): break
            pix = doc[index].get_pixmap(matrix=fitz.Matrix(.65, .65), alpha=False)
            image = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
            x, y = (offset % 3) * 400, (offset // 3) * 580
            sheet.paste(image, (x, y + 22))
            draw.text((x + 10, y + 4), f'V{volume} PDF p{index + 1}', fill='black')
        sheet.save(out / f'v{volume}-{start+1}.png')
    pages = {15: [5, 9], 17: [12], 19: [4], 20: [4, 5]}[volume]
    for number in pages:
        doc[number-1].get_pixmap(matrix=fitz.Matrix(1.3,1.3), alpha=False).save(out / f'v{volume}-p{number}.png')
        if number in [5, 12, 4]:
            (out / f'v{volume}-p{number}.txt').write_text(doc[number-1].get_text(), encoding='utf-8')
