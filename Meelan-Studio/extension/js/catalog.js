(function(){
const field=(key,label,value,min,max,step)=>({key,label,value,min,max,step:step||1,type:'number'});
const duration=field('duration','Duration · seconds',.8,.1,10,.05);
const catalog=[
{id:'cursor-pearl',name:'3D cursor',category:'Cursors',kind:'cursor',subtitle:'A real model. A live target.',action:'cursor',description:'An original beveled GLB model travels to your selected layer. The button scales and changes color on contact.',tip:'Select one target. Change MS Start and MS Duration on the controller to retime the arrival and button together. Model import may show AE’s Model Settings dialog.',fields:[{key:'finish',label:'Material',type:'select',value:'pearl',choices:[['pearl','Pearl'],['violet','Violet'],['graphite','Graphite']]},{key:'style',label:'Movement',type:'select',value:'float',choices:[['float','Lift + land'],['sweep','Soft sweep'],['direct','Direct approach']]},{...duration,value:.85},field('size','Model scale',100,10,1000),field('lift','Lift · pixels',160,0,1000),field('click','Button press · %',7,0,40),{key:'color',label:'Click accent',type:'color',value:'#a276f2'}]},
{id:'carousel-orbit',name:'3D carousel',category:'Carousel',kind:'carousel',subtitle:'Set your work in motion.',action:'carousel',description:'Arrange selected cards around a 3D orbit with an adjustable radius, tilt, scale and depth fade.',tip:'Select at least two layers. The tool rigs copies and disables the originals. Set Speed to zero and keyframe Angle for manual timing.',fields:[field('radius','Radius · pixels',460,50,3000),field('width','Card width · pixels',340,20,3000),field('speed','Speed · °/second',20,-180,180),field('tiltX','Tilt X · degrees',18,-85,85),field('tiltY','Tilt Y · degrees',-14,-85,85),field('tiltZ','Tilt Z · degrees',-10,-180,180),field('farOpacity','Back card opacity',55,0,100)]}
];
window.MSCatalog=catalog;
window.MSColors={rgb:hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)};
})();
