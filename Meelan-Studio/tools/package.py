"""Reproducible payload inventory and installable source ZIP."""
import hashlib,json,pathlib,zipfile,xml.etree.ElementTree as ET,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(root/'tools/build_host.py')],check=True)
ET.parse(root/'extension/CSXS/manifest.xml')
for p in root.glob('*.command'):p.chmod(0o755)
files=sorted(p for p in (root/'extension').rglob('*') if p.is_file())
checks=[{'path':p.relative_to(root).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
(root/'checksums.json').write_text(json.dumps(checks,indent=2)+'\n')
(root/'checksums.sha256').write_text(''.join(v['sha256']+'  '+v['path']+'\n' for v in checks))
excluded={'node_modules','.git','__pycache__','.DS_Store'}
output=root.parent/'Meelan-Studio-2.1.0-RC3.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(root.rglob('*')):
  if p.is_file() and not excluded.intersection(p.relative_to(root).parts) and p.suffix not in {'.pyc','.zip'}:
   z.write(p,root.name+'/'+p.relative_to(root).as_posix())
with zipfile.ZipFile(output) as z:
 bad=z.testzip()
 if bad:raise RuntimeError('Corrupt ZIP member: '+bad)
 for v in checks:
  if hashlib.sha256(z.read(root.name+'/'+v['path'])).hexdigest()!=v['sha256']:raise RuntimeError('Payload hash mismatch: '+v['path'])
print(json.dumps({'file':str(output),'bytes':output.stat().st_size,'payload_files':len(checks),'sha256':hashlib.sha256(output.read_bytes()).hexdigest()},indent=2))
