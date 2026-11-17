    // Text Marks and Text Workshop: native editable AE layers, no purchased presets.
    function textProperty(l) {var g=l.property('ADBE Text Properties');return g?g.property('ADBE Text Document'):null;}
    function textLayers(o) {
        var out=[],i,j,c,a;
        if(o.scope==='project'){for(i=1;i<=app.project.numItems;i++){c=app.project.item(i);if(c instanceof CompItem)for(j=1;j<=c.numLayers;j++)if(textProperty(c.layer(j)))out.push(c.layer(j));}}
        else{c=active();a=o.scope==='comp'?null:c.selectedLayers;if(a){for(i=0;i<a.length;i++)if(textProperty(a[i]))out.push(a[i]);}else for(i=1;i<=c.numLayers;i++)if(textProperty(c.layer(i)))out.push(c.layer(i));}
        if(!out.length)fail('No text layers in this scope. Select text or choose a wider scope.');return out;
    }
    function markText(o) {
        var c=active(),a=selected(c),created=[],i,style=o.markStyle||'underline';
        if(!contains(['underline','strike','highlight','half','scribble'],style))fail('Unknown mark style.');
        for(i=0;i<a.length;i++)if(!textProperty(a[i]))fail('Select text layers for Text Marks.');
        try{for(i=0;i<a.length;i++){
            var target=a[i],l=c.layers.addShape();created.push(l);l.name=unique(c,target.name+' · '+style);l.threeDLayer=target.threeDLayer;l.setParentWithJump(target);
            prop(l,'ADBE Anchor Point').setValue(l.threeDLayer?[0,0,0]:[0,0]);prop(l,'ADBE Position').setValue(l.threeDLayer?[0,0,0]:[0,0]);l.moveAfter(target);l.inPoint=target.inPoint;l.outPoint=target.outPoint;
            timeControls(l,c.time,number(o.duration,.65,.05,10));ctrl(l,'Color',o.color||[.76,.59,1],'ADBE Color Control');ctrl(l,'Thickness',number(o.thickness,7,.5,200));ctrl(l,'Padding X',number(o.padX,12,0,400));ctrl(l,'Padding Y',number(o.padY,6,0,400));ctrl(l,'Offset Y',number(o.offset,5,-500,500));ctrl(l,'Roundness',number(o.roundness,6,0,200));ctrl(l,'Progress',number(o.progress,100,0,100));ctrl(l,'Animate',o.animate==='no'?0:1,'ADBE Checkbox Control');
            ex(prop(l,'ADBE Opacity'),'parent.transform.opacity;');
            var g=l.property('ADBE Root Vectors Group'),base='var r=parent.sourceRectAtTime(time,false);var px=effect("Padding X")(1),py=effect("Padding Y")(1),y=effect("Offset Y")(1);';
            var progress='var d=Math.max(.001,effect("MS Duration")(1));var u=clamp((time-effect("MS Start")(1))/d,0,1);var q=(effect("Animate")(1)>0?1-Math.pow(1-u,3):1)*clamp(effect("Progress")(1)/100,0,1);';
            if(style==='highlight'||style==='half'){
                var rect=g.addProperty('ADBE Vector Shape - Rect');
                ex(rect.property('ADBE Vector Rect Size'),base+progress+'[Math.max(.001,(r.width+2*px)*q),Math.max(.001,r.height*'+(style==='half'?'.5':'1')+'+2*py)];');
                ex(rect.property('ADBE Vector Rect Position'),base+progress+'[r.left-px+(r.width+2*px)*q/2,r.top+r.height*'+(style==='half'?'.75':'.5')+'+y];');
                ex(rect.property('ADBE Vector Rect Roundness'),'effect("Roundness")(1);');
                var fill=g.addProperty('ADBE Vector Graphic - Fill');ex(fill.property('ADBE Vector Fill Color'),'effect("Color")(1);');
            }else{
                var path=g.addProperty('ADBE Vector Shape - Group'),code=base+'var x=r.left-px,w=r.width+2*px;var yy=r.top+r.height*'+(style==='strike'?'.52':'1')+'+y;';
                if(style==='scribble')code+='var pts=[],ins=[],outs=[];for(var i=0;i<9;i++){pts.push([x+w*i/8,yy+Math.sin(i*2.4)*effect("Thickness")(1)*.7]);ins.push([-w/32,0]);outs.push([w/32,0]);}createPath(pts,ins,outs,false);';
                else code+='createPath([[x,yy],[x+w,yy]],[],[],false);';
                ex(path.property('ADBE Vector Shape'),code);
                var stroke=g.addProperty('ADBE Vector Graphic - Stroke');ex(stroke.property('ADBE Vector Stroke Color'),'effect("Color")(1);');ex(stroke.property('ADBE Vector Stroke Width'),'effect("Thickness")(1);');stroke.property('ADBE Vector Stroke Line Cap').setValue(2);
                var trim=g.addProperty('ADBE Vector Filter - Trim');ex(trim.property('ADBE Vector Trim End'),progress+'q*100;');
            }tag(l,'text-mark');
        }}catch(e){cleanCreated(created);fail('Text Marks stopped; new marks were removed. '+e.toString());}
        return result(a.length+' live '+style+' mark(s) created.',[],['Marks follow the full text bounding box. Multiline text is treated as one block; individual word selection and per-line marks are not included.']);
    }
    function editableDocs(a) {
        var out=[],i,p,docs,k;
        for(i=0;i<a.length;i++){if(a[i].locked)fail('Unlock '+a[i].name+' first.');p=textProperty(a[i]);if(p.expression)fail(a[i].name+': source text has an expression. Bake or remove it before editing the text.');docs=[];if(p.numKeys){for(k=1;k<=p.numKeys;k++)docs.push({key:k,original:p.keyValue(k),value:p.keyValue(k)});}else docs.push({key:0,original:p.value,value:p.value});out.push({layer:a[i],property:p,docs:docs});}return out;
    }
    function commitDocs(items) {
        var i,j,d;try{for(i=0;i<items.length;i++)for(j=0;j<items[i].docs.length;j++){d=items[i].docs[j];if(d.key)items[i].property.setValueAtKey(d.key,d.value);else items[i].property.setValue(d.value);}}
        catch(e){for(i=0;i<items.length;i++)for(j=0;j<items[i].docs.length;j++){d=items[i].docs[j];try{if(d.key)items[i].property.setValueAtKey(d.key,d.original);else items[i].property.setValue(d.original);}catch(ignore){}}fail('Text changes were rolled back: '+e.toString());}
    }
    function changeCase(d,mode) {
        var s=d.text,i,ch,v,wordStart=true,sentenceStart=true;
        var changes=[];
        for(i=0;i<s.length;i++){ch=s.charAt(i);v=ch;
            if(mode==='upper')v=ch.toUpperCase();else if(mode==='lower')v=ch.toLowerCase();
            else if(mode==='title')v=wordStart?ch.toUpperCase():ch.toLowerCase();
            else if(mode==='sentence')v=sentenceStart?ch.toUpperCase():ch.toLowerCase();
            else if(mode==='vowels')v=/[aeiou]/i.test(ch)?ch.toUpperCase():ch.toLowerCase();
            else if(mode==='consonants')v=/[a-z]/i.test(ch)&&!/[aeiou]/i.test(ch)?ch.toUpperCase():ch.toLowerCase();
            else if(mode==='edges')v=wordStart||i===s.length-1||/\s/.test(s.charAt(i+1))?ch.toUpperCase():ch.toLowerCase();
            else if(mode==='alternating')v=i%2?ch.toLowerCase():ch.toUpperCase();
            if(/[a-z\u00c0-\uffff]/i.test(ch))sentenceStart=false;if(/[.!?\r\n]/.test(ch))sentenceStart=true;wordStart=/\s/.test(ch);
            if(v!==ch)changes.push({i:i,v:v});
        }
        for(i=changes.length-1;i>=0;i--)d.characterRange(changes[i].i,changes[i].i+1).text=changes[i].v;
    }
    function trimText(d) {
        var s=d.text,matches=[],re=/[ \t]+(?=[\r\n]|$)|(^|[\r\n])[ \t]+/g,m,start;
        while((m=re.exec(s))!==null){start=m.index+(m[1]?m[1].length:0);matches.push([start,m.index+m[0].length]);}
        for(var i=matches.length-1;i>=0;i--)if(matches[i][1]>matches[i][0])d.characterRange(matches[i][0],matches[i][1]).text='';
    }
    function replaceText(d,find,replacement) {if(!find)fail('Enter the text to find.');var positions=[],i=0,s=d.text;while((i=s.indexOf(find,i))>=0){positions.push(i);i+=find.length;}for(i=positions.length-1;i>=0;i--)d.characterRange(positions[i],positions[i]+find.length).text=replacement;}
    function allStyle(d,name,v) {if(d.text.length)d.characterRange(0,d.text.length)[name]=v;else d[name]=v;}
    function styleFile() {return new File(mkdir(Folder.userData.fsName+'/MeelanStudio').fsName+'/text-styles.json');}
    function loadStyles() {var f=styleFile();if(!f.exists)return [];var data=parseJSON(readFile(f));if(!(data instanceof Array))fail('Text style file is invalid.');return data;}
    function saveStyles(styles) {var f=styleFile(),backup=new File(f.fsName+'.bak'),temp=new File(f.fsName+'.tmp');if(f.exists&&!f.copy(backup.fsName))fail('Cannot back up existing text styles.');try{writeFile(temp,json(styles));parseJSON(readFile(temp));if(!temp.copy(f.fsName))fail('Could not save text styles.');}catch(e){if(backup.exists)backup.copy(f.fsName);throw e;}finally{if(temp.exists)temp.remove();}}
    function textStyles() {return {styles:loadStyles()};}
    function styleFrom(d) {var names=['font','fontSize','applyFill','fillColor','applyStroke','strokeColor','strokeWidth','strokeOverFill','tracking','autoLeading','leading'],s={},i;for(i=0;i<names.length;i++)try{s[names[i]]=d[names[i]];}catch(ignore){}return s;}
    function styleApply(d,s) {var names=['font','fontSize','fillColor','strokeColor','strokeWidth','strokeOverFill','tracking','leading','autoLeading','applyFill','applyStroke'];for(var i=0;i<names.length;i++)if(s[names[i]]!==undefined)allStyle(d,names[i],s[names[i]]);}
    function point2D(l,p,t) {
        var guard=0;
        while(l){if(l.threeDLayer)fail('3D layer bounds need a rendered camera view.');if(++guard>100)fail('Parent chain exceeds 100 layers.');var a=prop(l,'ADBE Anchor Point').valueAtTime(t,false),s=prop(l,'ADBE Scale').valueAtTime(t,false),pos=prop(l,'ADBE Position').valueAtTime(t,false),r=prop(l,'ADBE Rotate Z').valueAtTime(t,false)*Math.PI/180,x=(p[0]-a[0])*s[0]/100,y=(p[1]-a[1])*s[1]/100;p=[pos[0]+x*Math.cos(r)-y*Math.sin(r),pos[1]+x*Math.sin(r)+y*Math.cos(r)];l=l.parent;}return p;
    }
    function layerBounds(l,t) {var r=l.sourceRectAtTime(t,true),pts=[[r.left,r.top],[r.left+r.width,r.top],[r.left+r.width,r.top+r.height],[r.left,r.top+r.height]],b=[Infinity,Infinity,-Infinity,-Infinity],i,p;for(i=0;i<pts.length;i++){p=point2D(l,pts[i],t);b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);}return b;}
    function contrast(a,b) {function lum(v){var out=0,weights=[.2126,.7152,.0722];for(var i=0;i<3;i++)out+=weights[i]*(v[i]<=.04045?v[i]/12.92:Math.pow((v[i]+.055)/1.055,2.4));return out;}var x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
    function textInspect(o,a) {
        var rows=[],i,l,c,p,d,s,flags,ratios=[['9:16',9/16],['16:9',16/9],['1:1',1],['4:5',4/5],['2:3',2/3],['3:4',3/4]],fonts={},sizes={};
        for(i=0;i<a.length;i++){d=textProperty(a[i]).value;fonts['$'+d.font]=(fonts['$'+d.font]||0)+1;sizes['$'+Math.round(d.fontSize)]=(sizes['$'+Math.round(d.fontSize)]||0)+1;}
        function common(m){var best='',count=0,k;for(k in m)if(m.hasOwnProperty(k)&&m[k]>count){best=k;count=m[k];}return best;}
        var mainFont=common(fonts),mainSize=common(sizes);
        for(i=0;i<a.length;i++){
            l=a[i];c=l.containingComp;p=textProperty(l);d=p.valueAtTime(c.time,false);s=String(d.text);flags=[];var expressions=0,fx=l.property('ADBE Effect Parade'),scale=prop(l,'ADBE Scale').value,b=null,safe=[];
            visitLayer(l,function(v){if(v.canSetExpression&&v.expressionEnabled)expressions++;});
            if(/(^|[\r\n])[ \t]|[ \t]($|[\r\n])/.test(s))flags.push('edge whitespace');if(/lorem ipsum|placeholder|your text|text here/i.test(s))flags.push('placeholder');
            if(scale[0]!==100||scale[1]!==100)flags.push('scaled text');if(a.length>2&&'$'+d.font!==mainFont)flags.push('font differs');if(a.length>2&&'$'+Math.round(d.fontSize)!==mainSize)flags.push('size differs');
            try{b=layerBounds(l,c.time);}catch(ignore){flags.push('3D bounds unavailable');}
            if(b)for(var ri=0;ri<ratios.length;ri++){var ratio=ratios[ri][1],w=Math.min(c.width,c.height*ratio),h=w/ratio,margin=number(o.safeMargin,5,0,40)/100,x=(c.width-w)/2+w*margin,y=(c.height-h)/2+h*margin;safe.push(ratios[ri][0]+': '+(b[0]>=x&&b[1]>=y&&b[2]<=c.width-x&&b[3]<=c.height-y?'inside':'outside'));}
            var words=s.replace(/^\s+|\s+$/g,'').split(/\s+/).length;if(!s.replace(/\s/g,''))words=0;
            var fill=null;try{if(d.applyFill)fill=d.fillColor;}catch(ignore2){}
            rows.push({composition:c.name,layer:l.name,text:s,font:d.font,size:d.fontSize,scale:scale.join(' / '),words:words,readingSeconds:Math.round(words/number(o.wpm,180,60,500)*600)/10,contrast:fill?Math.round(contrast(fill,o.background||[.06,.05,.08])*100)/100:'no fill',effects:fx?fx.numProperties:0,expressions:expressions,safeCrops:safe.join(' | '),notes:flags.join(', ')||'No basic issues',compId:c.id,layerId:l.id});
        }
        return result(rows.length+' text layers inspected at each comp’s current time.',rows,['Font and color statistics use the first character; mixed runs, text animators, effects, masks and layer-style extents are not evaluated. Contrast uses your chosen solid background. Safe zones are centered aspect-ratio crops, not platform UI overlays.']);
    }
    function makeAnimator(l,name,values,amount,based) {
        var g=l.property('ADBE Text Properties').property('ADBE Text Animators'),a=g.addProperty('ADBE Text Animator'),idx=a.propertyIndex,k;a.name=name;
        for(k in values)if(values.hasOwnProperty(k))g.property(idx).property('ADBE Text Animator Properties').addProperty(k).setValue(values[k]);
        var selectors=g.property(idx).property('ADBE Text Selectors');while(selectors.numProperties)selectors.property(selectors.numProperties).remove();
        var selector=selectors.addProperty('ADBE Text Expressible Selector');selector.property('ADBE Text Range Type2').setValue(based||1);ex(selector.property('ADBE Text Expressible Amount'),amount);return g.property(idx);
    }
    var motionPresets={
        'fade':{opacity:0},'scale':{scale:0,opacity:0},'up':{y:70,opacity:0},'down':{y:-70,opacity:0},'left':{x:90,opacity:0},'right':{x:-90,opacity:0},'pop':{scale:0,opacity:0,spring:true},'blur':{blur:35,opacity:0},
        'soft-rise':{y:35,blur:10,opacity:0},'editorial':{y:90,rotation:6,opacity:0},'kinetic':{x:100,rotation:-12,opacity:0},'elastic':{scale:0,opacity:0,spring:true},'focus':{scale:125,blur:35,opacity:0},'cascade':{y:-100,rotation:-8,opacity:0},'flutter':{y:45,rotation:35,opacity:0,spring:true},'wide':{x:55,scale:140,opacity:0},'whisper':{y:12,blur:8,opacity:0},'swing':{rotation:-70,scale:80,opacity:0,spring:true},'slide-soft':{x:-60,blur:12,opacity:0},'type-on':{opacity:0,step:true},'random-pop':{scale:0,opacity:0,spring:true,random:true},'random-drift':{y:65,rotation:20,blur:12,opacity:0,random:true},'word-lift':{y:45,opacity:0,words:true}
    };
    function rigCheckpoint(a) {var out=[];for(var i=0;i<a.length;i++)out.push({layer:a[i],effects:a[i].property('ADBE Effect Parade').numProperties,animators:a[i].property('ADBE Text Properties').property('ADBE Text Animators').numProperties,motionBlur:a[i].motionBlur});return out;}
    function rollbackRigs(a) {for(var i=0;i<a.length;i++){var l=a[i].layer,g=l.property('ADBE Effect Parade');while(g.numProperties>a[i].effects)g.property(g.numProperties).remove();g=l.property('ADBE Text Properties').property('ADBE Text Animators');while(g.numProperties>a[i].animators)g.property(g.numProperties).remove();l.motionBlur=a[i].motionBlur;}}
    function motionText(o,a) {
        var spec=motionPresets[o.motion||'soft-rise'];if(!spec)fail('Unknown motion preset.');var i,created=[];
        for(i=0;i<a.length;i++)if(a[i].locked)fail('Unlock '+a[i].name+' first.');
        var checkpoint=rigCheckpoint(a);try{for(i=0;i<a.length;i++){
            var l=a[i],p={},suffix=' '+new Date().getTime()+' '+i,label='MS Motion'+suffix;
            // Individual runs get individual controls, so applying another preset never retimes an earlier animator.
            ctrl(l,label+' Start',l.containingComp.time);ctrl(l,label+' Duration',number(o.duration,.65,.05,10));ctrl(l,label+' Stagger',number(o.stagger,.035,0,1));
            p['ADBE Text Opacity']=0;if(spec.x||spec.y)p['ADBE Text Position 3D']=[spec.x||0,spec.y||0,0];if(spec.scale!==undefined)p['ADBE Text Scale 3D']=[spec.scale,spec.scale,spec.scale];if(spec.rotation)p['ADBE Text Rotation']=spec.rotation;if(spec.blur)p['ADBE Text Blur']=[spec.blur,spec.blur];
            var amount='var ix=textIndex-1;'+(spec.random?'seedRandom(textIndex+17,true);ix=Math.floor(random(0,textTotal));':'')+(o.order==='reverse'?'ix=textTotal-1-ix;':'')+'var u=clamp((time-effect('+json(label+' Start')+')(1)-ix*effect('+json(label+' Stagger')+')(1))/Math.max(.001,effect('+json(label+' Duration')+')(1)),0,1);';
            amount+=spec.step?'u>=1?0:100;':spec.spring?'u>=1?0:(Math.exp(-7*u)*Math.cos(u*10)*100);':o.easing==='linear'?'(1-u)*100;':'Math.pow(1-u,3)*100;';
            makeAnimator(l,'MS · '+o.motion,p,amount,spec.words||o.units==='words'?3:o.units==='lines'?4:1);l.motionBlur=true;
        }}catch(e){rollbackRigs(checkpoint);fail('Text motion stopped; new animators and controls removed. '+e.toString());}return result(a.length+' editable text motion animator(s) created.');
    }
    function colorText(o,a) {
        var colors=[o.color||[.76,.59,1],o.color2||[.4,.85,.9],o.color3||[1,.7,.5]],i,j;
        for(i=0;i<a.length;i++)if(a[i].locked)fail('Unlock '+a[i].name+' first.');
        var checkpoint=rigCheckpoint(a);try{for(i=0;i<a.length;i++)for(j=0;j<3;j++){
            var amount,p={'ADBE Text Fill Color':colors[j]},shift=Math.round(number(o.offset,0,0,100));
            if(o.colorMode==='gradient')amount=j===0?'100;':j===1?'clamp((textIndex-1)/Math.max(1,textTotal-1)*2,0,1)*100;':'clamp((textIndex-1)/Math.max(1,textTotal-1)*2-1,0,1)*100;';
            else if(o.colorMode==='random')amount='seedRandom(textIndex+'+shift+',true);Math.floor(random(0,3))==='+j+'?100:0;';
            else amount='(textIndex-1+'+shift+')%3==='+j+'?100:0;';
            makeAnimator(a[i],'MS Color '+(j+1),p,amount,1);
        }}catch(e){rollbackRigs(checkpoint);fail('Character Colors stopped; new animators removed. '+e.toString());}return result(a.length+' text layers colored with editable character selectors.');
    }
    function outlineText(o,a) {
        var created=[],i,j,n=Math.round(number(o.outlines,2,1,3)),colors=[o.color||[.76,.59,1],o.color2||[.4,.85,.9],o.color3||[1,.7,.5]];
        for(i=0;i<a.length;i++)if(a[i].locked)fail('Unlock '+a[i].name+' first.');
        try{for(i=0;i<a.length;i++)for(j=n;j>=1;j--){var src=a[i],c=src.containingComp,l=src.duplicate();created.push(l);l.locked=false;l.name=unique(c,src.name+' · Outline '+j);l.moveAfter(src);l.setParentWithJump(src);var dims=l.threeDLayer?3:2;clear(prop(l,'ADBE Anchor Point'));clear(prop(l,'ADBE Position'));if(prop(l,'ADBE Position').dimensionsSeparated)prop(l,'ADBE Position').dimensionsSeparated=false;prop(l,'ADBE Anchor Point').setValue(dims===3?[0,0,0]:[0,0]);prop(l,'ADBE Position').setValue(dims===3?[0,0,0]:[0,0]);clear(prop(l,'ADBE Scale'));prop(l,'ADBE Scale').setValue(dims===3?[100,100,100]:[100,100]);var rotations=['ADBE Rotate Z'];if(dims===3)rotations=rotations.concat(['ADBE Rotate X','ADBE Rotate Y','ADBE Orientation']);for(var ri=0;ri<rotations.length;ri++){clear(prop(l,rotations[ri]));prop(l,rotations[ri]).setValue(rotations[ri]==='ADBE Orientation'?[0,0,0]:0);}clear(prop(l,'ADBE Opacity'));ex(prop(l,'ADBE Opacity'),'parent.transform.opacity;');
            layerLink(l,'MS Outline Source',src);ctrl(l,'MS Outline Color',colors[j-1],'ADBE Color Control');ctrl(l,'MS Outline Width',number(o.thickness,4,.5,100)*j*2);
            var p=textProperty(l);clear(p);ex(p,'var L=effect("MS Outline Source")(1);text.sourceText.style.setText(L.text.sourceText.toString()).setApplyFill(false).setApplyStroke(true).setStrokeColor(effect("MS Outline Color")(1)).setStrokeWidth(effect("MS Outline Width")(1));');tag(l,'text-outline');
        }}catch(e){cleanCreated(created);fail('Outlines stopped; new outline layers were removed. '+e.toString());}
        return result(created.length+' linked outline layer(s) created.',[],['Outline content and transforms follow the original. Styling is uniform per outline. Later text animator, effect and mixed-style edits on the original do not automatically propagate to its outline copies.']);
    }
    function strokeReveal(o) {
        var c=active(),a=selected(c),created=[],i,converted=0,command=0;
        for(i=0;i<a.length;i++){if(!a[i].property('ADBE Root Vectors Group')&&!textProperty(a[i]))fail('Select text or shape layers.');if(textProperty(a[i])){command=app.findMenuCommandId('Create Shapes from Text');if(!command)fail('AE’s Create Shapes from Text command is unavailable in this UI language. Convert text to shapes in AE first, then run Stroke Reveal.');}}
        var enabled=[];for(i=0;i<a.length;i++)enabled.push(a[i].enabled);
        try{for(i=0;i<a.length;i++){
            var src=a[i],l=null,ids={},j;
            if(textProperty(src)){for(j=1;j<=c.numLayers;j++)ids[c.layer(j).id]=true;pick(c,src);app.executeCommand(command);for(j=1;j<=c.numLayers;j++)if(!ids[c.layer(j).id]&&c.layer(j).property('ADBE Root Vectors Group')){l=c.layer(j);created.push(l);break;}if(!l)fail('AE did not create a shape layer.');converted++;}
            else{l=src.duplicate();created.push(l);}
            l.locked=false;l.name=unique(c,src.name+' · Stroke');timeControls(l,c.time,number(o.duration,1,.05,10));ctrl(l,'MS Stroke Stagger',number(o.stagger,.06,0,1));ctrl(l,'MS Stroke Width',number(o.thickness,3,.5,100));ctrl(l,'MS Stroke Color',o.color||[.76,.59,1],'ADBE Color Control');
            var groupIndex=0;
            function prepare(g){var k,p,hasPath=false;
                for(k=g.numProperties;k>=1;k--){p=g.property(k);if(p.matchName==='ADBE Vector Graphic - Fill'||p.matchName==='ADBE Vector Graphic - G-Fill'||p.matchName==='ADBE Vector Graphic - Stroke'||p.matchName==='ADBE Vector Graphic - G-Stroke'||p.matchName==='ADBE Vector Filter - Trim')p.remove();}
                for(k=1;k<=g.numProperties;k++){p=g.property(k);if(p.matchName==='ADBE Vector Group')prepare(p.property('ADBE Vectors Group'));else if(/^ADBE Vector Shape/.test(p.matchName))hasPath=true;}
                if(!hasPath)return;
                var index=groupIndex++,st=g.addProperty('ADBE Vector Graphic - Stroke');ex(st.property('ADBE Vector Stroke Color'),'effect("MS Stroke Color")(1);');ex(st.property('ADBE Vector Stroke Width'),'effect("MS Stroke Width")(1);');st.property('ADBE Vector Stroke Line Cap').setValue(2);
                var tr=g.addProperty('ADBE Vector Filter - Trim'),base='var u=clamp((time-effect("MS Start")(1)-'+(o.strokeMode==='sync'?0:index)+'*effect("MS Stroke Stagger")(1))/Math.max(.001,effect("MS Duration")(1)),0,1);';
                ex(tr.property('ADBE Vector Trim End'),base+'(1-Math.pow(1-u,3))*100;');if(o.strokeMode==='travel')ex(tr.property('ADBE Vector Trim Start'),base+'clamp((u-.28)/.72,0,1)*100;');
            }prepare(l.property('ADBE Root Vectors Group'));if(!groupIndex)fail(src.name+': no supported vector paths found.');
            if(o.strokeLook==='neon'){var halo=l.duplicate();created.push(halo);halo.name=l.name+' · Halo';halo.moveAfter(l);var blur=effect(halo,'ADBE Gaussian Blur 2','MS Halo');blur.property(1).setValue(number(o.thickness,3,.5,100)*3);halo.blendingMode=BlendingMode.ADD;}
            if(o.strokeLook==='trail'){for(j=1;j<=2;j++){var trail=l.duplicate();created.push(trail);trail.name=l.name+' · Trail '+j;trail.moveAfter(l);ctrl(trail,'MS Start',c.time+.08*j);clear(prop(trail,'ADBE Opacity'));prop(trail,'ADBE Opacity').setValue(35/j);}}
            src.enabled=false;tag(l,'stroke-reveal');
        }}catch(e){cleanCreated(created);for(i=0;i<a.length;i++)a[i].enabled=enabled[i];fail('Stroke Reveal stopped; originals restored. '+e.toString());}
        return result(a.length+' stroke reveal(s) created.',[],[converted?'Converted text is an outline snapshot; originals are retained disabled.':'Original shape layers are retained disabled.','Stroke Reveal draws glyph contours, not handwriting centerlines. Wave order follows shape-group order. Preview the result in AE.']);
    }
    function centerAnchor(a) {
        var i;for(i=0;i<a.length;i++){var l=a[i],p=prop(l,'ADBE Position'),anchor=prop(l,'ADBE Anchor Point');if(l.locked||l.threeDLayer||p.expression||anchor.expression||p.dimensionsSeparated)fail(l.name+': centering needs unlocked 2D text with unseparated position and no position/anchor expressions.');}
        for(i=0;i<a.length;i++){l=a[i];p=prop(l,'ADBE Position');anchor=prop(l,'ADBE Anchor Point');var r=l.sourceRectAtTime(l.containingComp.time,false),v=anchor.value,dx=r.left+r.width/2-v[0],dy=r.top+r.height/2-v[1];if(anchor.numKeys){for(var k=1;k<=anchor.numKeys;k++){v=anchor.keyValue(k);anchor.setValueAtKey(k,[v[0]+dx,v[1]+dy]);}}else anchor.setValue([v[0]+dx,v[1]+dy]);ex(p,'var d=['+dx+','+dy+'];var s=transform.scale/100;var r=degreesToRadians(transform.rotation);var x=d[0]*s[0],y=d[1]*s[1];value+[x*Math.cos(r)-y*Math.sin(r),x*Math.sin(r)+y*Math.cos(r)];');}
        return result(a.length+' anchors centered; position compensation follows animated scale and rotation.');
    }
    function normalizeText(a) {
        var docs=editableDocs(a),scales=[],i,j,k,l,p,v,d;
        for(i=0;i<a.length;i++){l=a[i];p=prop(l,'ADBE Scale');v=p.value;if(l.threeDLayer||p.numKeys||p.expression||v[0]<=0||Math.abs(v[0]-v[1])>.0001||prop(l,'ADBE Anchor Point').expression||l.property('ADBE Text Properties').property('ADBE Text Animators').numProperties||l.property('ADBE Effect Parade').numProperties)fail(l.name+': normalize needs point text with uniform static positive scale, no effects, animators or anchor expressions.');for(j=1;j<=l.containingComp.numLayers;j++)if(l.containingComp.layer(j).parent===l)fail(l.name+': Normalize Scale cannot change a text layer that parents other layers.');scales.push(v[0]/100);for(j=0;j<docs[i].docs.length;j++){d=docs[i].docs[j].value;if(d.boxText)fail(l.name+': paragraph box text is not supported by Normalize Scale.');for(k=0;k<d.text.length;k++){var range=d.characterRange(k,k+1);range.fontSize*=scales[i];if(range.strokeWidth)range.strokeWidth*=scales[i];if(range.baselineShift)range.baselineShift*=scales[i];if(!range.autoLeading&&range.leading)range.leading*=scales[i];}}}
        commitDocs(docs);
        for(i=0;i<a.length;i++){p=prop(a[i],'ADBE Anchor Point');if(p.numKeys){for(k=1;k<=p.numKeys;k++){v=p.keyValue(k);p.setValueAtKey(k,[v[0]*scales[i],v[1]*scales[i]]);}}else{v=p.value;p.setValue([v[0]*scales[i],v[1]*scales[i]]);}prop(a[i],'ADBE Scale').setValue([100,100]);}
        return result(a.length+' point-text layer(s) normalized to 100% scale.');
    }
    function fitTextComp(o) {
        var c=active(),a=selected(c),b=[Infinity,Infinity,-Infinity,-Infinity],i,j,l,r,p,roots=[];
        for(i=0;i<a.length;i++){if(!textProperty(a[i])&&!a[i].property('ADBE Root Vectors Group'))fail('Fit Comp accepts selected text and shape layers.');r=layerBounds(a[i],c.time);b=[Math.min(b[0],r[0]),Math.min(b[1],r[1]),Math.max(b[2],r[2]),Math.max(b[3],r[3])];}
        for(i=1;i<=c.numLayers;i++){l=c.layer(i);if(l.threeDLayer||l instanceof CameraLayer||l instanceof LightLayer)fail('Fit Comp needs a 2D composition.');if(!l.parent){p=prop(l,'ADBE Position');if(l.locked||p.expression||p.dimensionsSeparated)fail(l.name+': unlock root layers and bake position expressions/separated position before fitting.');roots.push(l);}}
        var padding=number(o.padding,40,0,2000),dx=padding-b[0],dy=padding-b[1],w=Math.ceil(b[2]-b[0]+padding*2),h=Math.ceil(b[3]-b[1]+padding*2);
        if(w<4||h<4||w>30000||h>30000)fail('Resulting composition dimensions are outside AE’s range.');
        for(i=0;i<roots.length;i++){p=prop(roots[i],'ADBE Position');if(p.numKeys){for(j=1;j<=p.numKeys;j++){r=p.keyValue(j);p.setValueAtKey(j,[r[0]+dx,r[1]+dy]);}}else{r=p.value;p.setValue([r[0]+dx,r[1]+dy]);}}
        c.width=w;c.height=h;return result('Composition fitted to '+w+' × '+h+'.',[],['Bounds are sampled at the current frame. Masks, raster effects, layer styles, animation beyond this frame and downstream uses of comp dimensions require visual review.']);
    }
    function textWorkshop(o) {
        var op=o.operation||'inspect';if(op==='stroke')return strokeReveal(o);if(op==='fit')return fitTextComp(o);
        var a=textLayers(o),i,j,items,d,styles,name,found;
        if(op==='inspect')return textInspect(o,a);
        if(op==='motion')return motionText(o,a);if(op==='colors')return colorText(o,a);if(op==='outlines')return outlineText(o,a);if(op==='anchor')return centerAnchor(a);if(op==='normalize')return normalizeText(a);
        if(op==='rename'){for(i=0;i<a.length;i++)if(a[i].locked)fail('Unlock '+a[i].name+' first.');for(i=0;i<a.length;i++)a[i].name=String(textProperty(a[i]).value.text).replace(/\s+/g,' ').substring(0,90)||'Empty text';return result(a.length+' text layers renamed.');}
        if(op==='saveStyle'){if(a.length!==1)fail('Select exactly one text layer to capture its style.');name=String(o.styleName||'').replace(/^\s+|\s+$/g,'');if(!name)fail('Enter a style name.');styles=loadStyles();for(i=0;i<styles.length;i++)if(styles[i].name===name)fail('That style name already exists. Use a new name to keep both styles.');styles.push({name:name,style:styleFrom(textProperty(a[0]).value),created:new Date().getTime()});saveStyles(styles);return result('Style “'+name+'” saved.',[],['A saved style captures first-character typography, fill and stroke settings. It does not capture text animators, effects or mixed style runs.']);}
        if(!contains(['trim','case','replace','size','applyStyle'],op))fail('Unknown Text Workshop operation.');
        items=editableDocs(a);
        if(op==='applyStyle'){styles=loadStyles();for(i=0;i<styles.length;i++)if(styles[i].name===o.savedStyle)found=styles[i].style;if(!found)fail('Choose an existing saved style.');}
        for(i=0;i<items.length;i++)for(j=0;j<items[i].docs.length;j++){d=items[i].docs[j].value;if(op==='trim')trimText(d);else if(op==='case')changeCase(d,o.caseMode||'upper');else if(op==='replace')replaceText(d,String(o.find||''),String(o.replace||''));else if(op==='size')allStyle(d,'fontSize',number(o.fontSize,72,.1,1296));else if(op==='applyStyle')styleApply(d,found);}
        commitDocs(items);return result(a.length+' text layer(s) updated; Source Text keyframe times retained.');
    }
    function locateResult(o) {var c=findComp(o.compId);if(!c)fail('That composition no longer exists.');c.openInViewer();if(o.layerId){for(var i=1;i<=c.numLayers;i++)if(c.layer(i).id===Number(o.layerId)){pick(c,c.layer(i));return {message:'Layer selected.'};}fail('That layer no longer exists.');}return {message:'Composition opened.'};}
