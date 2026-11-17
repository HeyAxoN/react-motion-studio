const {spawnSync}=require('child_process'),path=require('path'),fs=require('fs');
const check=require('./check-extendscript-syntax.cjs');
check(fs.readFileSync(path.resolve(__dirname,'../tools/Create-AE-Test-Scenes.jsx'),'utf8'));
for(const f of ['addons-tests.cjs','host-tests.cjs','store-tests.cjs','assets-tests.cjs','bridge-tests.cjs']){const r=spawnSync(process.execPath,[path.join(__dirname,f)],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)}
