(function(){
const b=MSBridge,{fs,path,os}=b;const key='meelan-studio-store-v2';
let root=localStorage.getItem(key)||(os?path.join(os.homedir(),'Documents','Meelan Studio','Precomps'):'');
function ensure(){if(!fs)throw Error('Composition storage is available inside After Effects.');fs.mkdirSync(root,{recursive:true});return root;}
function list(includeHidden){if(!fs||!root)return[];ensure();const out=[];for(const ent of fs.readdirSync(root,{withFileTypes:true})){if(!ent.isDirectory())continue;const dir=path.join(root,ent.name),meta=path.join(dir,'entry.json');if(fs.existsSync(meta))try{const d=JSON.parse(fs.readFileSync(meta,'utf8'));if(!d.id||typeof d.name!=='string'||(d.hidden&&!includeHidden))continue;if(!Array.isArray(d.tags))d.tags=[];d.entryPath=dir;if(d.cover&&path.basename(d.cover)===d.cover)d.coverPath=path.join(dir,d.cover);out.push(d);}catch(e){b.log({store:meta,error:String(e)});}}return out.sort((a,b)=>b.created-a.created);}
function setRoot(p){if(!p)return;fs.mkdirSync(p,{recursive:true});root=p;localStorage.setItem(key,p);}
function entry(){const id='comp-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),entryPath=path.join(ensure(),id);return {entryId:id,entryPath};}
function hide(d,hidden){const checked=path.resolve(d.entryPath);if(path.dirname(checked)!==path.resolve(root))throw Error('Invalid store entry path.');const meta=path.join(checked,'entry.json'),data=JSON.parse(fs.readFileSync(meta,'utf8'));data.hidden=hidden;fs.writeFileSync(meta+'.tmp',JSON.stringify(data,null,2));fs.renameSync(meta+'.tmp',meta);}
function trash(d){hide(d,true);}
function restore(){const a=list(true).filter(d=>d.hidden);a.forEach(d=>hide(d,false));return a.length;}
function fileURL(p){if(!p)return '';return 'file://'+(p[0]==='/'?'':'/')+p.replace(/\\/g,'/').split('/').map(encodeURIComponent).join('/').replace(/%3A/g,':');}
window.MSStore={list,setRoot,entry,trash,restore,fileURL,root:()=>root,ensure};
})();
