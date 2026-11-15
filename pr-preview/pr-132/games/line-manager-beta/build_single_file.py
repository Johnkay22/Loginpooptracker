"""Create an offline playable HTML file using only the Python standard library."""
from pathlib import Path
import base64
import mimetypes
import re
import sys

root = Path(__file__).resolve().parent
out = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / 'Line-Manager-Beta.html'

def uri(path):
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode()

# Embed references in CSS, HTML and JavaScript. Atlas assets are cached by the browser.
def embed(text):
    return re.sub(r"assets/[a-zA-Z0-9_-]+\.(?:png|webp)", lambda m: uri(root / m.group()), text)

html = embed((root / 'index.html').read_text())
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + embed((root / 'style.css').read_text()) + '</style>')
for name in ['core', 'audio', 'office', 'app']:
    code = embed((root / 'js' / (name + '.js')).read_text())
    html = re.sub(r'<script src="js/' + name + r'\.js(?:\?[^"\s]*)?"></script>', lambda _: '<script>\n' + code + '\n</script>', html)
if re.search(r'<script[^>]+src=|href="style.css"|(?:src=|url\()[\"\']?assets/', html):
    raise RuntimeError('External dependency remains')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)
print(str(out))
