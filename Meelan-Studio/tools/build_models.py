"""Build original closed, beveled glTF cursor meshes. No external assets."""
import json,struct,math,pathlib
root=pathlib.Path(__file__).resolve().parents[1]/'extension/assets/models'
poly=[(0,0),(0,-.82),(.22,-.61),(.39,-1),(.55,-.93),(.37,-.54),(.72,-.54)]
# Counterclockwise polygons as viewed from +Z.
if sum(poly[i][0]*poly[(i+1)%len(poly)][1]-poly[(i+1)%len(poly)][0]*poly[i][1] for i in range(len(poly)))<0:poly.reverse()
def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
def inside(p,a,b,c):return min(cross(a,b,p),cross(b,c,p),cross(c,a,p))>=-1e-10
def triangulate(points):
 ids=list(range(len(points)));out=[]
 while len(ids)>3:
  for j in range(len(ids)):
   a,b,c=ids[j-1],ids[j],ids[(j+1)%len(ids)]
   if cross(points[a],points[b],points[c])>1e-9 and not any(inside(points[k],points[a],points[b],points[c]) for k in ids if k not in [a,b,c]):
    out.append((a,b,c));ids.pop(j);break
  else:raise ValueError('Polygon triangulation failed')
 out.append(tuple(ids));return out
cx=sum(p[0] for p in poly)/len(poly);cy=sum(p[1] for p in poly)/len(poly)
def ring(scale,z):return [(cx+(x-cx)*scale,cy+(y-cy)*scale,z) for x,y in poly]
rings=[ring(.91,-.06),ring(1,-.035),ring(1,.035),ring(.91,.06)]
vertices=[];normals=[];indices=[]
def tri(a,b,c):
 u=[b[i]-a[i] for i in range(3)];v=[c[i]-a[i] for i in range(3)]
 n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];d=math.sqrt(sum(k*k for k in n));n=[k/d for k in n]
 for p in (a,b,c):indices.append(len(vertices));vertices.append(p);normals.append(n)
for a,b,c in triangulate(poly):tri(rings[-1][a],rings[-1][b],rings[-1][c]);tri(rings[0][c],rings[0][b],rings[0][a])
for r in range(3):
 for i in range(len(poly)):
  j=(i+1)%len(poly);tri(rings[r][i],rings[r][j],rings[r+1][j]);tri(rings[r][i],rings[r+1][j],rings[r+1][i])
# Keep the outer tip at the origin so rotation and landing share a contact point.
tip=min(rings[-2],key=lambda v:v[0]*v[0]+v[1]*v[1]);vertices=[tuple(v[i]-tip[i] for i in range(3)) for v in vertices]
positions=b''.join(struct.pack('<3f',*p) for p in vertices);norm=b''.join(struct.pack('<3f',*n) for n in normals);idx=struct.pack('<'+'H'*len(indices),*indices)
binary=positions+norm+idx
while len(binary)%4:binary+=b'\x00'
for name,color,metal,rough in [('pearl',[.93,.96,1,1],.18,.22),('violet',[.44,.2,.9,1],.3,.24),('graphite',[.07,.09,.14,1],.55,.24)]:
 doc={'asset':{'version':'2.0','generator':'Meelan Studio original mesh builder'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':'Cursor tip origin'}],'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1},'indices':2,'material':0}]}],'materials':[{'name':name,'pbrMetallicRoughness':{'baseColorFactor':color,'metallicFactor':metal,'roughnessFactor':rough},'doubleSided':False}],'buffers':[{'byteLength':len(binary)}],'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(positions),'target':34962},{'buffer':0,'byteOffset':len(positions),'byteLength':len(norm),'target':34962},{'buffer':0,'byteOffset':len(positions)+len(norm),'byteLength':len(idx),'target':34963}],'accessors':[{'bufferView':0,'componentType':5126,'count':len(vertices),'type':'VEC3','min':[min(v[i] for v in vertices) for i in range(3)],'max':[max(v[i] for v in vertices) for i in range(3)]},{'bufferView':1,'componentType':5126,'count':len(normals),'type':'VEC3'},{'bufferView':2,'componentType':5123,'count':len(indices),'type':'SCALAR'}]}
 data=json.dumps(doc,separators=(',',':')).encode();data+=b' ' *((-len(data))%4)
 out=struct.pack('<4sII',b'glTF',2,12+8+len(data)+8+len(binary))+struct.pack('<I4s',len(data),b'JSON')+data+struct.pack('<I4s',len(binary),b'BIN\0')+binary
 (root/('cursor-'+name+'.glb')).write_bytes(out)
print('Built three GLB cursor models;',len(indices)//3,'triangles per model.')
