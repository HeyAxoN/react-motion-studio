const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../extension');
for(const name of ['pearl','violet','graphite']){
 const bytes=fs.readFileSync(path.join(root,'assets/models/cursor-'+name+'.glb'));assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);const length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.toString('utf8',20,20+length));assert.equal(doc.asset.version,'2.0');assert(doc.materials[0].pbrMetallicRoughness);assert(!doc.buffers[0].uri);const bin=bytes.subarray(28+length);const positions=doc.accessors[0],view=doc.bufferViews[positions.bufferView];assert.equal(positions.count%3,0);const verts=[];
 for(let i=0;i<positions.count;i++){verts.push([0,1,2].map(k=>bin.readFloatLE(view.byteOffset+i*12+k*4)))}
 const edges=new Map();let volume=0;const key=v=>v.map(x=>x.toFixed(6)).join(',');
 for(let i=0;i<verts.length;i+=3){const [a,b,c]=verts.slice(i,i+3);volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;for(const [x,y] of [[a,b],[b,c],[c,a]]){const k=[key(x),key(y)].sort().join('|');edges.set(k,(edges.get(k)||0)+1)}}
 assert(volume>0,'Outward triangle winding');assert([...edges.values()].every(v=>v===2),'Closed mesh edges');assert(verts.some(v=>v.every(x=>Math.abs(x)<1e-6)),'Contact tip at the origin');
}
assert(fs.statSync(path.join(root,'js/cursor-mesh.js')).size>1000);
assert(!fs.existsSync(path.join(root,'assets/depth/model.onnx')));
console.log('PASS Three original GLB models: closed meshes, outward winding, tip origin, embedded materials; preview mesh present.');
