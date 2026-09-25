"""Versionne le CSS et les modules JS référencés par index.html, et tient à jour sa sécurité.

GitHub Pages impose un cache navigateur de 10 minutes : après une mise en ligne, un visiteur
revenu récemment gardait l'ancien code. Chaque fichier reçoit ici une empreinte de son contenu
(?v=xxxxxxxx) : dès qu'il change, son adresse change et le navigateur le télécharge à nouveau.

- css/style.css et js/main.js : directement dans les balises de index.html
- les autres modules (importés par main.js en "./os.js"…) : via l'importmap, qui redirige
  chaque adresse de module vers sa version

Sécurité :
- Three.js vient d'un CDN : l'importmap donne l'empreinte (SRI) de chaque fichier chargé,
  le navigateur refuse un fichier modifié
- la politique de sécurité (CSP) d'index.html n'autorise que les scripts du site, du CDN et
  cette importmap précise (par son empreinte sha256, recalculée ici à chaque modification)

Lancé automatiquement avant chaque commit (hook git pre-commit), ou à la main :
    python tools/version-assets.py
"""
import base64
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
THREE = "https://cdn.jsdelivr.net/npm/three@0.170.0"
# bibliothèques externes, déjà versionnées par leur URL
EXTERNAL = {
    "three": f"{THREE}/build/three.module.js",
    "three/addons/": f"{THREE}/examples/jsm/",
}
# empreintes SRI des fichiers Three.js réellement chargés (à recalculer si la version change) :
#   curl -s URL | openssl dgst -sha384 -binary | openssl base64 -A
INTEGRITY = {
    f"{THREE}/build/three.module.js": "sha384-GY5FqjttLCFRt/McQbyaVdCk2O1IQtOeX8Py6NfD89BIAsIyJFRl4UgSXrk2vXAk",
    f"{THREE}/examples/jsm/loaders/GLTFLoader.js": "sha384-Lq1Wl94so5JCKGDvezrdVMJhdeKQkwb8iwRo59QrPPd61CnrCJZLxYmFlQ8ZuOKR",
    f"{THREE}/examples/jsm/environments/RoomEnvironment.js": "sha384-9ItPPH2vgKbkvgrqTKq7ptGYe+WuAnqlZtlqleJW4/CJjnM5R7C+efD6iS7ADPJ9",
    f"{THREE}/examples/jsm/utils/BufferGeometryUtils.js": "sha384-wOjwauvHlJO7K6APr7FmMGH2nupQa3Ndzas9bJZhsAMOK055efJud8ns4aYmASKv",
}
# politique de sécurité ; {importmap} est remplacé par l'empreinte du bloc importmap
CSP = (
    "default-src 'self'; "
    "script-src 'self' https://cdn.jsdelivr.net '{importmap}'; "
    "style-src 'self'; "
    "img-src 'self' data: blob:; "
    "font-src 'self'; "
    "connect-src 'self' https://cdn.jsdelivr.net data: blob:; "
    "object-src 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests"
)


def stamp(rel: str) -> str:
    # fins de ligne normalisées : même empreinte quelle que soit la copie locale
    digest = hashlib.sha1((ROOT / rel).read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:8]
    return f"{rel}?v={digest}"


def main() -> None:
    html = INDEX.read_text(encoding="utf-8").replace("\r\n", "\n")
    html = re.sub(r'href="css/style\.css(\?v=\w+)?"', f'href="{stamp("css/style.css")}"', html)
    html = re.sub(r'src="js/main\.js(\?v=\w+)?"', f'src="{stamp("js/main.js")}"', html)

    imports = dict(EXTERNAL)
    for f in sorted((ROOT / "js").glob("*.js")):
        if f.name != "main.js":
            rel = f"js/{f.name}"
            imports[f"./{rel}"] = f"./{stamp(rel)}"
    block = json.dumps({"imports": imports, "integrity": INTEGRITY}, indent=2).replace("\n", "\n    ")
    html = re.sub(
        r'(<script type="importmap">\s*).*?(\s*</script>)',
        lambda m: m.group(1) + block + m.group(2),
        html,
        count=1,
        flags=re.S,
    )

    # CSP : empreinte exacte du contenu de la balise importmap (tel que le navigateur le lit)
    content = re.search(r'<script type="importmap">(.*?)</script>', html, re.S).group(1)
    digest = base64.b64encode(hashlib.sha256(content.encode("utf-8")).digest()).decode()
    meta = f'<meta http-equiv="Content-Security-Policy" content="{CSP.replace("{importmap}", "sha256-" + digest)}">'
    if 'http-equiv="Content-Security-Policy"' in html:
        html = re.sub(r'<meta http-equiv="Content-Security-Policy" content="[^"]*">', meta, html, count=1)
    else:  # juste après le charset, avant toute ressource
        html = html.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n  ' + meta + "\n", 1)
    INDEX.write_text(html, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
