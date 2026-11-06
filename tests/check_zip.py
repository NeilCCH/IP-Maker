"""檢查素材包 ZIP：完整性、PNG/JPEG 尺寸、JSON 可解析、LINE 選單 ≤1MB。用法：python3 -I check_zip.py a.zip b.zip"""
import io
import json
import sys
import zipfile

from PIL import Image

EXPECT = {
    "avatar": None, "cover": (1640, 624), "post1": (1080, 1350), "post2": (1080, 1350), "og": (1200, 630),
    "reels": (1080, 1920), "hl1": (1080, 1920), "welcome": (1040, 1040), "quote": (1080, 1350),
    "richmenu-page-1": (2500, 1686), "richmenu-page-2": (2500, 1686), "clickmap-page-1": (2500, 1686), "clickmap-page-2": (2500, 1686),
}

ok = True
for path in sys.argv[1:]:
    z = zipfile.ZipFile(path)
    bad = z.testzip()
    names = z.namelist()
    line = [path.rsplit("/", 1)[-1], f"{len(names)} 個檔案"]
    if bad:
        ok = False
        line.append(f"ERROR 損壞：{bad}")
    for n in names:
        base = n.rsplit("/", 1)[-1]
        stem, _, ext = base.rpartition(".")
        data = z.read(n)
        if ext in ("png", "jpg"):
            im = Image.open(io.BytesIO(data))
            im.verify()
            im = Image.open(io.BytesIO(data))
            exp = EXPECT.get(stem)
            if exp and im.size != exp:
                ok = False
                line.append(f"ERROR {base} 尺寸 {im.size} != {exp}")
            if stem.startswith("richmenu") and len(data) > 1024 * 1024:
                ok = False
                line.append(f"ERROR {base} 超過 1MB（{len(data)}）")
            if stem.startswith("richmenu"):
                line.append(f"{base} {len(data) // 1024}KB")
        elif ext == "json":
            json.loads(data.decode("utf-8"))
        elif ext in ("txt", "html", "sh"):
            text = data.decode("utf-8")
            if not text.strip():
                ok = False
                line.append(f"ERROR {base} 是空的")
    for must in ("文案.txt", "提示詞.txt", "設定引導.txt"):
        if not any(n.endswith(must) for n in names):
            ok = False
            line.append(f"ERROR 缺少 {must}")
    print("｜".join(line))
print("ALL OK" if ok else "ERROR")
