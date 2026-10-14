"""Reference-only proof artwork. Never seeds uploads or production issues.
Run from repository root; requires PyMuPDF and Pillow. Extracts images, not fonts.
"""
import base64, io, json, tempfile
from pathlib import Path
import fitz
from PIL import Image

doc = fitz.open('references/ECU Connect - Vol 20 (2026).pdf')
assets = []
for name, page in [('cover-reference', 0), ('contents-reference', 1), ('opener-reference', 2)]:
    xref = doc[page].get_images()[0][0]
    image = Image.open(io.BytesIO(doc.extract_image(xref)['image'])).convert('RGB')
    out = io.BytesIO(); image.save(out, format='JPEG', quality=85)
    data = out.getvalue()
    assets.append({'asset': {'id': name, 'name': name+'.jpg', 'mimeType': 'image/jpeg', 'width': image.width, 'height': image.height, 'byteLength': len(data)}, 'dataUrl': 'data:image/jpeg;base64,'+base64.b64encode(data).decode()})
# Rasterized reference artwork for this proof only; not an approved distributable logo.
pix = doc[0].get_pixmap(matrix=fitz.Matrix(2,2), clip=fitz.Rect(429,18,540,56))
image = Image.frombytes('RGB', [pix.width,pix.height], pix.samples)
out = io.BytesIO(); image.save(out, format='PNG'); data=out.getvalue()
assets.append({'asset': {'id': 'logo-reference', 'name': 'logo-reference.png', 'mimeType': 'image/png', 'width':image.width,'height':image.height,'byteLength':len(data)}, 'dataUrl':'data:image/png;base64,'+base64.b64encode(data).decode()})
Path(tempfile.gettempdir(), 'ecu-phase3b-proof-assets.json').write_text(json.dumps(assets))
print('Reference proof assets prepared; no embedded fonts extracted.')
