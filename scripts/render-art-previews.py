"""Rebuild the embedded, first-paint miniatures from the game's production catalog."""
import base64
import io
import json
from math import ceil
from pathlib import Path
import subprocess

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "docs" / "production-art.css"
MARKER = "/* Embedded production miniatures"
END = "/* End embedded production miniatures. */"
SIDE = 24
COLUMNS = 7
CATALOG = """
import {UNIT_TYPES,BUILDINGS,IMPROVEMENTS} from './docs/rules.js';
import {illustrationPath} from './docs/illustrations.js';
import {RESOURCES} from './docs/resources.js';
import {SCIENCE_PROJECT} from './docs/victory-rules.js';
const items={...UNIT_TYPES,...BUILDINGS,...IMPROVEMENTS,...RESOURCES,[SCIENCE_PROJECT.id]:SCIENCE_PROJECT};
console.log(JSON.stringify(Object.keys(items).sort().map(id=>[id,illustrationPath(id)])));
"""

items = json.loads(subprocess.check_output(
    ["node", "--input-type=module", "--eval", CATALOG], cwd=ROOT, text=True
))
rows = ceil(len(items) / COLUMNS)
sheet = Image.new("RGB", (SIDE * COLUMNS, SIDE * rows))
positions = []
for index, (item, illustration) in enumerate(items):
    column, row = index % COLUMNS, index // COLUMNS
    with Image.open(ROOT / "docs" / illustration) as original:
        crop = ImageOps.fit(original.convert("RGB"), (SIDE, SIDE), method=Image.Resampling.LANCZOS)
        sheet.paste(crop, (column * SIDE, row * SIDE))
    x = 100 * column / max(1, COLUMNS - 1)
    y = 100 * row / max(1, rows - 1)
    positions.append(f'.item-illustration[data-art="{item}"] {{background-position:{x:g}% {y:g}%}}')

output = io.BytesIO()
sheet.save(output, "WEBP", quality=49, method=6)
payload = base64.b64encode(output.getvalue()).decode()
before, start, generated_and_after = CSS.read_text().partition(MARKER)
if not start or END not in generated_and_after:
    raise ValueError("Missing production miniature boundaries in production-art.css")
after = generated_and_after.split(END, 1)[1]
generated = f"""{MARKER}. Regenerate with scripts/render-art-previews.py. */
.item-illustration[data-art] {{
  background-image:url("data:image/webp;base64,{payload}");
  background-size:{COLUMNS * 100}% {rows * 100}%;
  background-repeat:no-repeat;
}}"""
CSS.write_text(before + generated + "\n" + "\n".join(positions) + "\n" + END + after)
