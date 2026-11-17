(function () {
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  let category = 'All', current = null, entries = [], host = null, lastFocus, toastTimer, dragEntry, previewPaused = false;
  let report = null, styleCache = [], workshopGroup = 'Inspect';
  let preferences = {}; try { preferences = JSON.parse(localStorage.getItem('meelan-studio-presets-v2') || '{}'); } catch(e) {}
  function el(tag, cls, value) { const n = document.createElement(tag); if (cls) n.className = cls; if (value !== undefined) n.textContent = value; return n; }
  function notify(message, error = false) { const t = $('#toast'); clearTimeout(toastTimer); t.textContent = message; t.classList.remove('hidden'); t.classList.toggle('error', error); toastTimer = setTimeout(() => t.classList.add('hidden'), error ? 15000 : 7000); }
  function busy(title, detail) { $('#busy-title').textContent = title; $('#busy-detail').textContent = detail || 'Keep After Effects open. A native AE dialog may need your attention.'; $('#busy-overlay').classList.remove('hidden'); }
  function unbusy() { $('#busy-overlay').classList.add('hidden'); }
  async function action(fn, title, detail) { if (MSBridge.busy()) return notify('Wait for the current operation to finish.', true); busy(title || 'Building your scene…', detail); try { return await fn(); } catch (e) { MSBridge.log({ time: new Date().toISOString(), error: String(e) }); notify(e.message, true); } finally { unbusy(); } }
  function closeAll() { MSPreviews.detach($('#large-canvas')); $$('.overlay').forEach(n => n.classList.add('hidden')); document.body.style.overflow = ''; if (lastFocus && lastFocus.isConnected) lastFocus.focus(); }
  function open(id) { const origin = document.activeElement; closeAll(); lastFocus = origin; $(id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; const target = $(id).querySelector('input,button,select'); if (target) target.focus(); }
  $$('.close').forEach(b => b.addEventListener('click', closeAll));
  $$('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeAll(); }));
  document.addEventListener('keydown', e => {
    if (!$('#busy-overlay').classList.contains('hidden')) return;
    const modal = $$('.overlay').find(n => !n.classList.contains('hidden'));
    if (e.key === 'Escape') closeAll();
    if (modal && e.key === 'Tab') { const nodes = Array.from(modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')); const first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    if (!modal && e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); ($('#tools-view').classList.contains('hidden') ? $('#store-search') : $('#search')).focus(); }
  });
  function renderCatalog() {
    const grid = $('#preset-grid'); grid.querySelectorAll('canvas').forEach(c => MSPreviews.detach(c)); grid.replaceChildren(); const query = $('#search').value.trim().toLowerCase();
    const presets = MSCatalog.filter(p => (category === 'All' || p.category === category) && (p.name + ' ' + p.category + ' ' + p.description).toLowerCase().includes(query));
    for (const p of presets) { const card = el('button', 'preset-card'); card.dataset.preset = p.id; card.setAttribute('aria-label', p.name + ': ' + p.subtitle); const c = el('canvas', 'card-canvas'); c.width = 420; c.height = 250; c.setAttribute('aria-hidden', 'true'); const bottom = el('div', 'card-bottom'), label = el('div'); label.append(el('strong', '', p.name), el('small', '', p.subtitle)); bottom.append(label, el('span', 'card-arrow', '↗')); card.append(c, bottom); card.addEventListener('click', () => choose(p)); grid.append(card); MSPreviews.attach(c, p, preferences[p.id]); }
    $('#no-results').classList.toggle('hidden', !!presets.length);
  }
  for (const name of ['All'].concat(Array.from(new Set(MSCatalog.map(p => p.category))))) { const b = el('button', name === 'All' ? 'active' : '', name); b.setAttribute('aria-pressed', String(name === 'All')); b.addEventListener('click', () => { category = name; $$('#filters button').forEach(v => { v.classList.toggle('active', v === b); v.setAttribute('aria-pressed', String(v === b)); }); renderCatalog(); }); $('#filters').append(b); }
  $('#search').addEventListener('input', renderCatalog);
  function renderFields(reset) {
    $('#preset-fields').replaceChildren();
    for (const f of current.fields) {
      const label = el('label', '', f.label); const n = el(f.type === 'select' ? 'select' : 'input'); n.id = 'field-' + f.key; n.dataset.key = f.key;
      const choices = f.key === 'savedStyle' && styleCache.length ? styleCache.map(v => [v.name, v.name]) : f.choices;
      if (f.type === 'select') for (const [val, text] of choices) { const o = el('option', '', text); o.value = val; n.append(o); }
      else { n.type = f.type; if (f.type === 'number') { n.min = f.min; n.max = f.max; n.step = f.step; n.required = true; } }
      const old = preferences[current.id]; n.value = !reset && old && old[f.key] !== undefined ? old[f.key] : f.value; label.append(n); $('#preset-fields').append(label);
      if (f.type === 'select' && n.selectedIndex < 0) n.selectedIndex = 0;
    }
    renderWorkshop();
  }
  function renderWorkshop() {
    const nav = $('#workshop-nav'); nav.replaceChildren(); nav.classList.toggle('hidden', !current.operations);
    const operation = $('#field-operation') ? $('#field-operation').value : '';
    for (const f of current.fields) { const n = $('#field-' + f.key), hidden = (f.key === 'operation' && !!current.operations) || (f.when && !f.when.includes(operation)); n.closest('label').classList.toggle('hidden', !!hidden); n.disabled = !!hidden; }
    $('#apply-preset').textContent = 'Apply to composition ↗';
    if (!current.operations) return;
    const selected = current.operations.find(o => o.id === operation) || current.operations[0];
    workshopGroup = selected.group;
    const tabs = el('div', 'workshop-tabs');
    for (const group of ['Inspect', 'Edit', 'Style', 'Motion']) { const b=el('button', group === workshopGroup ? 'active' : '', group); b.type='button'; b.setAttribute('aria-pressed',String(group===workshopGroup)); b.addEventListener('click',()=>setOperation(current.operations.find(o=>o.group===group).id)); tabs.append(b); }
    const list=el('div','operation-grid');
    for (const op of current.operations.filter(o=>o.group===workshopGroup)) { const b=el('button',op.id===operation?'active':'',op.label); b.type='button'; b.setAttribute('aria-pressed',String(op.id===operation)); b.addEventListener('click',()=>setOperation(op.id)); list.append(b); }
    nav.append(tabs,list,el('p','operation-detail',selected.detail)); $('#apply-preset').textContent=selected.apply+' ↗';
  }
  function setOperation(id) { $('#field-operation').value=id; renderWorkshop(); updatePreview(); MSPreviews.restart($('#large-canvas')); }
  function previewValues() {
    const values = {}; if (!current) return values;
    for (const f of current.fields) values[f.key] = $('#field-' + f.key).value;
    return values;
  }
  function updatePreview() { if (current) MSPreviews.update($('#large-canvas'), previewValues()); }
  function choose(p) {
    current = p; $('#preset-category').textContent = p.category; $('#preset-title').textContent = p.name;
    $('#preset-description').textContent = p.description; $('#preset-tip').textContent = p.tip;
    $('#preview-context').textContent = p.previewContext || (p.kind === 'carousel' ? 'Six sample cards · automatic framing' : 'Original cursor mesh · sample button');
    renderFields(false); open('#preset-overlay'); MSPreviews.attach($('#large-canvas'), p, previewValues());
    if (p.operations && MSBridge.connected && !MSBridge.busy()) MSBridge.call('textStyles').then(r => { styleCache=r.styles||[]; if(current===p){const n=$('#field-savedStyle'),before=n.value;n.replaceChildren(); for(const v of styleCache){const opt=el('option','',v.name);opt.value=v.name;n.append(opt);}if(!styleCache.length){const opt=el('option','','Save a style first');opt.value='';n.append(opt);}if(styleCache.some(v=>v.name===before))n.value=before;} }).catch(e=>notify(e.message,true));
  }
  $('#preset-fields').addEventListener('input', updatePreview);
  $('#preset-fields').addEventListener('change', updatePreview);
  $('#large-canvas').addEventListener('ms-preview-state', e => {
    const state = e.detail; previewPaused = state.paused;
    $('#pause-preview').textContent = previewPaused ? '▶ Play' : 'Ⅱ Pause';
    $('#pause-preview').setAttribute('aria-label', previewPaused ? 'Play preview' : 'Pause preview');
    $('#preview-scrub').max = state.duration;
    $('#preview-scrub').value = state.time;
    $('#preview-time').textContent = state.time.toFixed(1) + ' / ' + state.duration.toFixed(1) + 's';
    $('#preview-error').textContent = state.error || '';
    $('#preview-error').classList.toggle('hidden', !state.error);
  });
  $('#reset-preset').addEventListener('click', () => { delete preferences[current.id]; localStorage.setItem('meelan-studio-presets-v2', JSON.stringify(preferences)); renderFields(true); updatePreview(); });
  $('#pause-preview').addEventListener('click', () => MSPreviews.pause(!previewPaused, $('#large-canvas')));
  $('#restart-preview').addEventListener('click', () => MSPreviews.restart($('#large-canvas')));
  $('#preview-scrub').addEventListener('input', e => {
    const t = Number(e.target.value); MSPreviews.pause(true, $('#large-canvas')); MSPreviews.seek($('#large-canvas'), t);
  });
  function options() {
    const o = { name: current.name, style: current.style, layout: current.layout, radial: current.radial }, raw = {};
    for (const f of current.fields) { const n = $('#field-' + f.key); if (!n.disabled && !n.checkValidity()) { n.reportValidity(); throw Error('Check the highlighted field.'); } raw[f.key] = n.value; if (n.disabled && f.key !== 'operation') continue; o[f.key] = f.type === 'number' ? Number(n.value) : f.type === 'color' ? MSColors.rgb(n.value) : n.value; }
    preferences[current.id] = raw; localStorage.setItem('meelan-studio-presets-v2', JSON.stringify(preferences)); return o;
  }
  $('#apply-preset').addEventListener('click', async () => {
    let o; try { o = options(); } catch (e) { return notify(e.message, true); }
    await action(async () => {
      const result = await MSBridge.call(current.action, o);
      if (result) { closeAll(); if ((result.rows&&result.rows.length)||(result.warnings&&result.warnings.length)) showReport(result); else notify(result.message); await refresh(); }
    }, current && current.id === 'text-workshop' && o.operation === 'inspect' ? 'Inspecting your text…' : 'Applying your tool…');
  });
  function showReport(data) {
    report=data;$('#result-message').textContent=data.message;const warnings=$('#result-warnings');warnings.replaceChildren();for(const w of Array.from(new Set(data.warnings||[])))warnings.append(el('p','',w));warnings.classList.toggle('hidden',!warnings.childElementCount);
    const rows=$('#result-rows');rows.replaceChildren();
    for(const row of data.rows||[]){const card=el('article','report-row'),head=el('div','report-row-head');head.append(el('strong','',row.layer||row.source||row.composition||'Result'));if(row.compId){const b=el('button','text-button','Locate in AE ↗');b.addEventListener('click',()=>action(()=>MSBridge.call('locateResult',{compId:row.compId,layerId:row.layerId}),'Locating result…'));head.append(b);}card.append(head);if(row.text!==undefined)card.append(el('p','report-text',row.text));const dl=el('dl');for(const [k,v] of Object.entries(row)){if(['layer','source','text','compId','layerId'].includes(k))continue;dl.append(el('dt','',k.replace(/([A-Z])/g,' $1')),el('dd','',String(v)));}card.append(dl);rows.append(card);}
    $('#export-report').disabled=!(data.rows&&data.rows.length);open('#result-overlay');
  }
  $('.close-result').addEventListener('click',closeAll);
  $('#export-report').addEventListener('click',()=>{if(!report)return;const rows=report.rows||[],keys=Array.from(new Set(rows.flatMap(r=>Object.keys(r))));const quote=v=>'"'+String(v===undefined?'':v).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const csv='\uFEFF'+[keys.map(quote).join(','),...rows.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n');const name='meelan-report-'+Date.now()+'.csv';try{if(MSBridge.fs){const p=MSBridge.path.join(MSStore.ensure(),name);MSBridge.fs.writeFileSync(p,csv,'utf8');notify('Report saved in your collection folder: '+name);}else{const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=el('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}}catch(e){notify(e.message,true);}});
  async function refresh() {
    if (!MSBridge.connected) { $('#connection-label').textContent = 'Interface preview · open in After Effects'; $('#selection-label').textContent = 'AE tools run inside the installed extension'; return; }
    try { host = await MSBridge.call('info'); $('#connection-label').textContent = 'After Effects ' + host.ae + ' · connected'; $('#connection-dot').classList.add('connected'); $('#selection-label').textContent = host.comp ? host.comp + ' · ' + host.selected + ' layer' + (host.selected === 1 ? '' : 's') + ' selected' : 'Open a composition to begin'; } catch (e) { $('#connection-label').textContent = 'After Effects connection needs attention'; $('#connection-dot').classList.remove('connected'); notify(e.message, true); }
  }
  $('#refresh').addEventListener('click', refresh);
  $$('.main-tabs button').forEach(b => b.addEventListener('click', () => { $$('.main-tabs button').forEach(n => n.classList.toggle('active', n === b)); const store = b.dataset.tab === 'store'; $('#tools-view').classList.toggle('hidden', store); $('#store-view').classList.toggle('hidden', !store); if (store) renderStore(); }));
  function renderStore() {
    try { entries = MSStore.list(); } catch (e) { return notify(e.message, true); }
    $('#store-count').textContent = entries.length; $('#store-location').textContent = entries.length + ' saved composition' + (entries.length === 1 ? '' : 's');
    const query = $('#store-search').value.trim().toLowerCase(); const shown = entries.filter(d => (d.name + ' ' + (d.tags || []).join(' ')).toLowerCase().includes(query));
    $('#store-grid').replaceChildren(); $('#store-empty').classList.toggle('hidden', entries.length > 0);
    for (const d of shown) {
      const card = el('article', 'preset-card store-card'); card.draggable = true; card.dataset.entry = d.id;
      if (d.coverPath) { const img = el('img'); img.src = MSStore.fileURL(d.coverPath); img.alt = d.name + ' thumbnail'; img.onerror = () => { img.replaceWith(placeholder(d)); }; card.append(img); } else card.append(placeholder(d));
      const bottom = el('div', 'card-bottom'), label = el('div'); label.append(el('strong', '', d.name), el('small', '', d.width + ' × ' + d.height + ' · ' + Number(d.duration).toFixed(1) + 's')); bottom.append(label); card.append(bottom);
      if (d.tags && d.tags.length) card.append(el('div', 'store-tags', d.tags.join(' · ')));
      const actions = el('div', 'store-actions'), add = el('button', 'primary', 'Import ↗'), remove = el('button', 'icon-button', '×'); remove.title = 'Hide from collection'; remove.setAttribute('aria-label', 'Hide ' + d.name + ' from collection');
      add.addEventListener('click', () => importEntry(d)); remove.addEventListener('click', () => { if (confirm('Hide “' + d.name + '” from your collection? Its project and media will stay in place for existing projects.')) { try { MSStore.trash(d); renderStore(); notify('Hidden from collection. Its files remain in place.'); } catch (e) { notify(e.message, true); } } });
      actions.append(add, remove); card.append(actions);
      card.addEventListener('dragstart', e => { dragEntry = d; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('application/x-meelan-comp', d.id); document.body.classList.add('dragging'); });
      card.addEventListener('dragend', () => { dragEntry = null; document.body.classList.remove('dragging'); dz.classList.remove('over'); }); $('#store-grid').append(card);
    }
    if (entries.length && !shown.length) $('#store-grid').append(el('p', 'empty', 'No compositions match your search.'));
  }
  function placeholder(d) { const p = el('div', 'store-placeholder'); p.append(el('span', '', '✳'), el('small', '', (d.width || '') + ' × ' + (d.height || ''))); return p; }
  async function importEntry(d) { await action(async () => { const r = await MSBridge.call('importComp', { entryPath: d.entryPath }); notify(r.message); await refresh(); }, 'Importing your composition…'); }
  const dz = $('#dropzone'); dz.addEventListener('dragover', e => { if (dragEntry) { e.preventDefault(); dz.classList.add('over'); } }); dz.addEventListener('dragleave', () => dz.classList.remove('over')); dz.addEventListener('drop', e => { e.preventDefault(); if (dragEntry) importEntry(dragEntry); dragEntry = null; document.body.classList.remove('dragging'); dz.classList.remove('over'); });
  $('#store-search').addEventListener('input', renderStore);
  async function saveDialog() { await refresh(); $('#comp-name').value = host && host.comp ? host.comp : ''; $('#comp-tags').value = ''; $('#save-consent').checked = false; open('#save-overlay'); $('#comp-name').focus(); }
  $('#save-comp').addEventListener('click', saveDialog); $('#save-first').addEventListener('click', saveDialog);
  $('#confirm-save').addEventListener('click', () => {
    const name = $('#comp-name').value.trim(); if (!name) return notify('Give this composition a name.', true); if (!$('#save-consent').checked) return notify('Confirm saving your project before the archive is created.', true);
    action(async () => { const entry = MSStore.entry(), tags = $('#comp-tags').value.split(',').map(t => t.trim()).filter(Boolean).slice(0,20); const r = await MSBridge.call('archive', { ...entry, name, tags, saveProjectConsent: true }); closeAll(); renderStore(); notify(r.message + (r.warnings.length ? '\n' + r.warnings.join('\n') : '')); await refresh(); }, 'Saving your composition…', 'AE saves your project, collects the composition into a separate project, then reopens your original. Please let it finish.');
  });
  $('#settings').addEventListener('click', () => { $('#folder-path').value = MSStore.root(); open('#settings-overlay'); });
  $('#choose-folder').addEventListener('click', () => action(async () => { const r = await MSBridge.call('chooseFolder'); if (r.path) { MSStore.setRoot(r.path); $('#folder-path').value = r.path; renderStore(); notify('Collection folder updated. Existing entries stay in their original folder.'); } }, 'Choose a collection folder…'));
  $('#restore-hidden').addEventListener('click', () => { try { const n = MSStore.restore(); renderStore(); notify(n + ' hidden compositions restored.'); } catch(e) { notify(e.message, true); } });
  $('#store-folder').addEventListener('click', () => action(() => MSBridge.call('openFolder', { path: MSStore.ensure() }), 'Opening your collection…'));
  $('#audit').addEventListener('click', () => action(async () => { const r = await MSBridge.call('audit'); $('#diagnostic-result').textContent = r.message + '\n' + r.checked + ' expressions checked.\n' + r.errors.join('\n'); }, 'Checking expressions…'));
  $('#save-log').addEventListener('click', () => { try { const b = MSBridge; if (!b.fs) throw Error('Open the extension in After Effects to save diagnostics.'); const p = b.path.join(MSStore.ensure(), 'meelan-diagnostic-' + Date.now() + '.json'); b.fs.writeFileSync(p, JSON.stringify({ version: '2.1.0', host, log: b.logs }, null, 2)); notify('Diagnostic log saved to your collection folder.'); } catch (e) { notify(e.message, true); } });
  window.addEventListener('focus', () => { if (!MSBridge.busy() && $('#busy-overlay').classList.contains('hidden')) refresh(); });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { previewPaused = true; MSPreviews.pause(true); $('#pause-preview').textContent = '▶ Play'; $('#pause-preview').setAttribute('aria-label', 'Play preview'); }
  renderCatalog(); renderStore(); refresh();
})();
