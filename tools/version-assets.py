"""Versionne le CSS et les modules JS référencés par index.html.

GitHub Pages impose un cache navigateur de 10 minutes : après une mise en ligne, un visiteur
revenu récemment gardait l'ancien code. Chaque fichier reçoit ici une empreinte de son contenu
(?v=xxxxxxxx) : dès qu'il change, son adresse change et le navigateur le télécharge à nouveau.

- css/style.css et js/main.js : directement dans les balises de index.html
- les autres modules (importés par main.js en "./os.js"…) : via l'importmap, qui redirige
  chaque adresse de module vers sa version

Lancé automatiquement avant chaque commit (hook git pre-commit), ou à la main :
    python tools/version-assets.py
"""
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
# bibliothèques externes, déjà versionnées par leur URL
EXTERNAL = {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
}


def stamp(rel: str) -> str:
    digest = hashlib.sha1((ROOT / rel).read_bytes()).hexdigest()[:8]
    return f"{rel}?v={digest}"


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")
    html = re.sub(r'href="css/style\.css(\?v=\w+)?"', f'href="{stamp("css/style.css")}"', html)
    html = re.sub(r'src="js/main\.js(\?v=\w+)?"', f'src="{stamp("js/main.js")}"', html)

    imports = dict(EXTERNAL)
    for f in sorted((ROOT / "js").glob("*.js")):
        if f.name != "main.js":
            rel = f"js/{f.name}"
            imports[f"./{rel}"] = f"./{stamp(rel)}"
    block = json.dumps({"imports": imports}, indent=2).replace("\n", "\n    ")
    html = re.sub(
        r'(<script type="importmap">\s*).*?(\s*</script>)',
        lambda m: m.group(1) + block + m.group(2),
        html,
        count=1,
        flags=re.S,
    )
    INDEX.write_text(html, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
