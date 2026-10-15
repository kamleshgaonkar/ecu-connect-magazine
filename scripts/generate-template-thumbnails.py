"""Rasterize complete original reference pages for the UI library. Never extract fonts."""
import sys, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.tools/python'))
import pymupdf
from PIL import Image
references = [(20,1),(20,2),(20,3),(20,4),(15,9),(20,6),(20,13),(20,11),(20,12),(20,16),(19,13),(17,5),(20,17),(20,18),(20,19),(17,23),(20,20)]
out = root / 'public/template-thumbnails'
out.mkdir(parents=True, exist_ok=True)
manifest = []
for index, (volume, number) in enumerate(references, 1):
    source = root / f'references/ECU Connect - Vol {volume} (2026).pdf'
    with pymupdf.open(source) as doc:
        page = doc[number - 1]
        pix = page.get_pixmap(matrix=pymupdf.Matrix(500 / page.rect.width,500 / page.rect.width), alpha=False)
        image = Image.frombytes('RGB', [pix.width,pix.height],pix.samples)
        name = f't{index:02d}.webp'
        image.save(out / name, quality=86, method=6)
        manifest.append({'id':f't{index:02d}', 'volume':volume, 'pdfPage':number,'source':source.name,'thumbnail':name,'width':pix.width,'height':pix.height})
(out / 'sources.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(f'Generated {len(manifest)} whole-page reference thumbnails.')
