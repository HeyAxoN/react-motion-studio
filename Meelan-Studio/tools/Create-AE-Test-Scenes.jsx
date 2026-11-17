/* Optional desktop smoke test. Creates new demo comps; never saves or opens projects. */
(function () {
    var base=new File($.fileName).parent.parent,host=new File(base.fsName+'/extension/host/studio.jsx');
    if(!host.exists){alert('Keep this file inside the tools folder of the extracted Meelan Studio package.');return;}
    $.evalFile(host);
    var report=[],folder=app.project.items.addFolder('Meelan Studio - Test Scenes');
    function comp(name,w,h){var c=app.project.items.addComp('MS TEST - '+name,w||1920,h||1080,1,6,30);c.parentFolder=folder;c.time=0;return c;}
    function select(c,layers){c.openInViewer();for(var i=1;i<=c.numLayers;i++)c.layer(i).selected=false;for(i=0;i<layers.length;i++)layers[i].selected=true;}
    function label(c,s,size,pos){var l=c.layers.addText(s),p=l.property('ADBE Text Properties').property('ADBE Text Document'),d=p.value;d.fontSize=size;d.fillColor=[1,1,1];d.applyFill=true;p.setValue(d);l.property('ADBE Transform Group').property('ADBE Position').setValue(pos);return l;}
    function quote(s){return '"'+s.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';}
    function run(action,opts){var r=MeelanStudioHost.dispatch('{"action":'+quote(action)+',"options":'+opts+'}');report.push(action+': '+r);}
    app.beginUndoGroup('Create Meelan Studio test scenes');
    try {
        var i;
        var orbit=comp('Carousel'),cards=[],palette=[[.28,.16,.47],[.2,.32,.44],[.36,.22,.38],[.15,.37,.32],[.37,.25,.18]];
        for(i=0;i<5;i++){var card=comp('Card '+(i+1),560,340);card.layers.addSolid(palette[i],'Card base',560,340,1,6);label(card,'PRODUCT '+(i+1),36,[40,80]);label(card,'Your next scene',22,[40,240]);cards.push(orbit.layers.add(card));}
        select(orbit,cards);run('carousel','{}');
        var marks=comp('Five Text Marks',1280,1080),styles=['underline','strike','highlight','half','scribble'];
        for(i=0;i<styles.length;i++){var mt=label(marks,'Make it matter · '+styles[i],55,[140,150+i*180]);select(marks,[mt]);run('markText','{"markStyle":'+quote(styles[i])+',"duration":0.8}');}
        var motion=comp('Text Motion'),motions=['soft-rise','flutter','random-drift'];
        for(i=0;i<motions.length;i++){var ml=label(motion,'Original motion · '+motions[i],80,[200,280+i*250]);select(motion,[ml]);run('textWorkshop','{"operation":"motion","motion":'+quote(motions[i])+',"duration":0.8,"stagger":0.05}');}
        var colors=comp('Character Colors'),patterns=['alternate','random','gradient'];
        for(i=0;i<patterns.length;i++){var cl=label(colors,'A little color. A lot of possibility.',66,[100,260+i*260]);select(colors,[cl]);run('textWorkshop','{"operation":"colors","colorMode":'+quote(patterns[i])+'}');}
        var outlines=comp('Linked Text Outlines'),ol=label(outlines,'MAKE IT MOVE',150,[180,570]);select(outlines,[ol]);run('textWorkshop','{"operation":"outlines","outlines":3,"thickness":4}');
        var stroke=comp('Stroke Reveal'),sl=label(stroke,'MAKE IT MOVE',150,[180,570]);select(stroke,[sl]);run('textWorkshop','{"operation":"stroke","strokeMode":"wave","strokeLook":"neon","duration":1.2,"stagger":0.12}');
        var editing=comp('Text Editing and Report'),et=label(editing,'  Your text here  ',72,[700,540]);select(editing,[et]);run('textWorkshop','{"operation":"inspect"}');run('textWorkshop','{"operation":"trim"}');run('textWorkshop','{"operation":"case","caseMode":"title"}');
        var inner=comp('Extract Source',640,360),innerArt=inner.layers.addSolid([.32,.2,.5],'Card',640,360,1,6),innerText=label(inner,'Editable inside',48,[100,190]);innerText.property('ADBE Transform Group').property('ADBE Opacity').setValueAtTime(0,0);innerText.property('ADBE Transform Group').property('ADBE Opacity').setValueAtTime(1,100);
        var extracted=comp('Extracted Result'),pre=extracted.layers.add(inner);pre.startTime=.4;pre.stretch=150;pre.property('ADBE Transform Group').property('ADBE Position').setValueAtTime(0,[600,500]);pre.property('ADBE Transform Group').property('ADBE Position').setValueAtTime(3,[1200,600]);select(extracted,[pre]);run('extractComp','{"prefixNames":"yes"}');
        var graph=comp('Duplicate Source'),g1=graph.layers.add(inner),g2=graph.layers.add(inner);g1.property('ADBE Transform Group').property('ADBE Position').setValue([550,540]);g2.property('ADBE Transform Group').property('ADBE Position').setValue([1300,540]);select(graph,[g1,g2]);run('deepDuplicate','{"copies":2,"suffix":" Student","folders":"hierarchy"}');
        var cursor=comp('3D Cursor'),button=comp('Button',420,110);button.layers.addSolid([.38,.2,.62],'Button',420,110,1,6);label(button,'Start creating',38,[76,69]);var target=cursor.layers.add(button);target.property('ADBE Transform Group').property('ADBE Position').setValue([960,540]);select(cursor,[target]);
        run('cursor','{"extensionPath":'+quote(base.fsName+'/extension')+',"size":100,"duration":1.2,"style":"float"}');
        var checkComps=[orbit,marks,motion,colors,outlines,stroke,editing,extracted,cursor];
        for(i=0;i<checkComps.length;i++){checkComps[i].openInViewer();report.push('EXPRESSION AUDIT: '+checkComps[i].name);run('audit','{}');}
        report.push('For the Store test, save the Carousel composition, then import it into a different project.');
    } catch(e){report.push('Test scene creation stopped: '+e.toString()+' at line '+e.line);}
    finally{app.endUndoGroup();}
    var log=new File(Folder.desktop.fsName+'/Meelan-Studio-AE-Test-Report.txt');log.encoding='UTF-8';if(log.open('w')){log.write(report.join('\n\n'));log.close();}
    alert('Test scenes created in the Project panel.\nPreview each from 0 to 4 seconds, then test the Store from the extension.\n\nReport: '+log.fsName+'\nThe report records script responses; visually inspect the renders too.');
})();
