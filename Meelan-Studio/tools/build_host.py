"""Bundle ES3 host modules; the installed CEP host has no runtime includes."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
core = (root / 'src/host/core.jsx').read_text()
modules = '\n'.join((root / ('src/host/' + name + '.jsx')).read_text() for name in ['comps', 'text'])
assert core.count('/* @addons */') == 1
(root / 'extension/host/studio.jsx').write_text(core.replace('/* @addons */', modules))
print('Built extension/host/studio.jsx')
