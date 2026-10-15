"""Reference-only proof data. Never installs historical artwork into user issues."""
import sys, json, base64, shutil
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.tools/python'))
import pymupdf as fitz
out = root / 'tmp/pdfs/phase3c'
out.mkdir(parents=True, exist_ok=True)
page = fitz.open(root / 'references/ECU Connect - Vol 20 (2026).pdf')[3]
pix = page.get_pixmap(matrix=fitz.Matrix(1.4,1.4), clip=fitz.Rect(42.52,70.87,552.76,355.5), alpha=False)
raw = pix.tobytes('jpg', jpg_quality=85)
blocks = [b for b in page.get_text('blocks') if b[6] == 0]
clean = lambda text: ' '.join(text.split())
selected = []
for b in blocks:
    y = b[1]
    if 490 < y < 780:
        selected.append({'type': 'heading' if 490 < y < 515 or 645 < y < 666 else 'paragraph', 'text': clean(b[4])})
data = {'figureCaption': clean(next(b[4] for b in blocks if 360 < b[1] < 400)),
        'callout': clean(' '.join(b[4] for b in blocks if 420 < b[1] < 470)), 'blocks':selected,
        'asset': {'asset': {'id':'v20-chart-reference','name':'V20 p4 chart, comparison only','mimeType':'image/jpeg','width':pix.width,'height':pix.height,'byteLength':len(raw)},'dataUrl':'data:image/jpeg;base64,'+base64.b64encode(raw).decode()}}
(out / 'reference-data.json').write_text(json.dumps(data), encoding='utf-8')
target = root / 'docs/previews/phase3c'
target.mkdir(parents=True, exist_ok=True)
for v, n in [(20,4),(17,12)]:
    shutil.copyfile(out / f'v{v}-p{n}.png',target / f'reference-v{v}-p{n}.png')
