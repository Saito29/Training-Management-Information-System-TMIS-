document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const modules = { dashboard:'Dashboard', participants:'Participants', training:'Training', evaluation:'Evaluation', administration:'Administration', users:'My account', system:'System' };
  const icons = { view:'bi-eye', create:'bi-plus-circle', update:'bi-pencil-square', status:'bi-arrow-left-right', delete:'bi-trash3', restore:'bi-arrow-counterclockwise', approve:'bi-check-circle', reject:'bi-x-circle', attachment:'bi-paperclip', export:'bi-download', refresh:'bi-arrow-clockwise', filter:'bi-funnel' };
  const filters = ['logSearch','logModule','logAction','logResult','logFrom','logTo'];
  let records = [], filtered = [], page = 1, size = '20';
  const make = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const date = value => new Intl.DateTimeFormat('en-PH', { dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila' }).format(window.TmisDate.parse(value));
  const day = value => {
    const parts = new Intl.DateTimeFormat('en-CA', { year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Manila' }).formatToParts(window.TmisDate.parse(value));
    return ['year','month','day'].map(type => parts.find(part => part.type === type).value).join('-');
  };
  function feedback(message, error = false) { $('journalFeedback').textContent = message; $('journalFeedback').hidden = !message; $('journalFeedback').dataset.type = error ? 'error' : 'info'; }
  let selectedReference = '';
  function details(entry) {
    $('activityDetailsTitle').textContent = entry.title;
    $('activityDetailsDescription').textContent = entry.description || 'No additional description was recorded for this event.';
    $('activityDetailsArea').textContent = modules[entry.module] || entry.module;
    const status = ['success','info','warning','error'].includes(entry.status) ? entry.status : 'info';
    $('activityDetailsResult').className = `journal-result ${status}`;
    $('activityDetailsResult').textContent = status === 'info' ? 'Information' : status.charAt(0).toUpperCase() + status.slice(1);
    $('activityDetailsIcon').replaceChildren(make('i', `bi ${icons[entry.action] || 'bi-activity'}`));
    $('activityDetailsActor').textContent = entry.actor || 'Actor not recorded';
    $('activityDetailsAvatar').textContent = String(entry.actor || 'User').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part.charAt(0)).join('').toUpperCase();
    $('activityDetailsWhen').textContent = date(entry.date);
    const groups = [
      ['Event context', 'bi-journal-text', [['Action', entry.action.charAt(0).toUpperCase()+entry.action.slice(1)], ['Reference', entry.reference || 'Not recorded'], ['Account email', entry.account_email || 'Not recorded'], ['Source', 'Server-recorded activity']]],
      ['Record information', 'bi-fingerprint', [['Date & time', date(entry.date)]]],
    ];
    $('activityDetailsFields').replaceChildren(...groups.map(([title,icon,fields])=>{
      const section=make('section','journal-modal-group'),heading=make('h3','');
      const symbol=make('i',`bi ${icon}`);symbol.setAttribute('aria-hidden','true');heading.append(symbol,document.createTextNode(title));
      const list=make('dl','');
      fields.forEach(([label,value])=>{const row=make('div','');row.append(make('dt','',label),make('dd','',value));list.append(row);});
      section.append(heading,list);return section;
    }));
    const changes=make('section','journal-modal-group journal-modal-changes');
    changes.append(make('h3','','Changed fields'));
    const list=make('div','journal-field-tags');
    if(entry.fields?.length) entry.fields.forEach(field=>list.append(make('span','',field.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' '))));
    else list.append(make('p','','No field-level changes were recorded for this activity.'));
    changes.append(list);$('activityDetailsFields').append(changes);
    $('activityDetailsNote').textContent = 'This event was recorded by the TMIS server.';
    selectedReference=entry.reference || '';
    $('copyActivityReference').disabled=!selectedReference;
    $('activityCopyFeedback').textContent='';
    $('activityDetailsDialog').showModal();
  }
  $('copyActivityReference').addEventListener('click', async()=>{
    if(!selectedReference)return;
    try { await navigator.clipboard.writeText(selectedReference); $('activityCopyFeedback').textContent='Reference copied.'; }
    catch { $('activityCopyFeedback').textContent='Copy unavailable. Select the reference text to copy it.'; }
  });
  function render() {
    const query = $('logSearch').value.trim().toLowerCase(), from = $('logFrom').value, to = $('logTo').value;
    const invalidDates = from && to && from > to;
    if (invalidDates) feedback('The From date must be on or before the To date.',true);
    filtered = records.filter(entry => !invalidDates && (!$('logModule').value || entry.module === $('logModule').value)
      && (!$('logAction').value || entry.action === $('logAction').value) && (!$('logResult').value || entry.status === $('logResult').value)
      && (!from || day(entry.date) >= from) && (!to || day(entry.date) <= to)
      && (!query || [entry.title,entry.description,entry.reference,entry.actor,entry.action,modules[entry.module]].join(' ').toLowerCase().includes(query)));
    const pageSize = size === 'all' ? Math.max(1,filtered.length) : Number(size), pages = Math.max(1,Math.ceil(filtered.length / pageSize));
    page = Math.min(page,pages);
    $('activityLogTableBody').replaceChildren(...filtered.slice((page-1)*pageSize,page*pageSize).map(entry => {
      const row=make('tr',''), activity=make('td',''), identity=make('div','journal-activity'), symbol=make('span',`journal-entry-icon ${entry.action}`);
      const icon=make('i',`bi ${icons[entry.action] || 'bi-activity'}`);icon.setAttribute('aria-hidden','true');symbol.append(icon);
      const text=make('div','');text.append(make('strong','',entry.title),make('p','',entry.description));identity.append(symbol,text);activity.append(identity);row.append(activity);
      row.append(make('td','',modules[entry.module] || entry.module),make('td','journal-reference',entry.reference || '-'));
      const result=make('td',''), badge=make('span',`journal-result ${['success','info','warning','error'].includes(entry.status)?entry.status:'info'}`,entry.status === 'info' ? 'Information' : entry.status.charAt(0).toUpperCase()+entry.status.slice(1));result.append(badge);row.append(result,make('td','journal-date',date(entry.date)));
      const action=make('td',''), button=make('button','btn journal-detail-button');button.type='button';button.title='View log details';button.setAttribute('aria-label',`View log details: ${entry.title}`);
      const eye=make('i','bi bi-eye');eye.setAttribute('aria-hidden','true');button.append(eye);button.addEventListener('click',()=>details(entry));action.append(button);row.append(action);return row;
    }));
    $('logResultCount').textContent=`${filtered.length} matching ${filtered.length===1?'activity':'activities'}`;
    $('journalEmpty').hidden=filtered.length>0;
    $('journalEmptyText').textContent=records.length?'Change the search or filters to see more activity.':'No server-recorded activity is available for your account.';
    for(const suffix of ['', 'Top']) {
      $(`logPageSize${suffix}`).value=size;
      $(`logPageText${suffix}`).textContent=`Page ${page} of ${pages}`;
      $(`logPrevious${suffix}`).disabled=page<=1;$(`logNext${suffix}`).disabled=page>=pages;
    }
  }
  function refresh() {
    try {
      const server = window.TMIS_LOG_DATA;
      const entries = Array.isArray(server?.entries) ? server.entries : [];
      const user = server?.actor;
      $('journalIdentity').textContent = user
        ? `Showing server-recorded activity for ${user.navigationName || user.name || 'your account'}.`
        : 'Sign in to view server-recorded activity.';
      records=entries.filter(entry=>entry && (entry.date || entry.created_at) && !Number.isNaN(Date.parse(entry.date || entry.created_at))).map(entry=>({
        title:String(entry.title || entry.event || 'Recorded activity'),
        description:String(entry.description || ''),
        date:entry.date || entry.created_at,
        module:String(entry.module || 'system'),
        action:String(entry.action || 'update'),
        status:['success','info','warning','error'].includes(entry.status) ? entry.status : entry.outcome === 'success' ? 'success' : 'info',
        actor:String(entry.actor || user?.navigationName || user?.name || 'System / guest'),
        reference:String(entry.reference || ''),
        source:'server',
        fields:Array.isArray(entry.fields) ? entry.fields.map(String) : [],
      })).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
      $('logTotalCount').textContent=records.length;
      $('logTodayCount').textContent=records.filter(entry=>Date.parse(entry.date)>=Date.now()-86400000).length;
      $('logChangeCount').textContent=records.filter(entry=>entry.status==='success' && ['create','update','status','delete','restore','approve','reject','attachment'].includes(entry.action)).length;
      $('logDeleteCount').textContent=records.filter(entry=>entry.action==='delete').length;
      render();
    } catch { feedback('Server activity could not be loaded.',true); }
  }
  filters.forEach(id=>$(id).addEventListener(id==='logSearch'?'input':'change',()=>{page=1;feedback('');render();}));
  $('clearLogFilters').addEventListener('click',()=>{filters.forEach(id=>{$(id).value='';});page=1;feedback('');render();});
  $('refreshActivityLogs').addEventListener('click',()=>location.reload());
  for(const suffix of ['', 'Top']) {
    $(`logPageSize${suffix}`).addEventListener('change',event=>{size=event.target.value;page=1;render();});
    $(`logPrevious${suffix}`).addEventListener('click',()=>{if(page>1)page--;render();});
    $(`logNext${suffix}`).addEventListener('click',()=>{page++;render();});
  }
  function exportLogs(format) {
    if(!filtered.length){feedback('There are no matching activities to export.');return;}
    let contents, filename, mimeType;
    if (format === 'txt') {
      contents = filtered.map((entry,index)=>[
        `Activity ${index + 1}`,
        `Title: ${entry.title}`,
        `Description: ${entry.description || 'No description recorded'}`,
        `System area: ${modules[entry.module] || entry.module}`,
        `Action: ${entry.action}`,
        `Reference: ${entry.reference || 'Not recorded'}`,
        `Result: ${entry.status}`,
        `Actor: ${entry.actor}`,
        `Date & time: ${date(entry.date)}`,
      ].join('\r\n')).join('\r\n\r\n----------------------------------------\r\n\r\n');
      filename = 'my-activity-logs.txt';
      mimeType = 'text/plain;charset=utf-8';
    } else {
      const cell=value=>{let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
      const rows=[['Activity','Description','System area','Action','Reference','Result','Actor','Date & time'],...filtered.map(entry=>[entry.title,entry.description,modules[entry.module]||entry.module,entry.action,entry.reference,entry.status,entry.actor,date(entry.date)])];
      contents = '\uFEFF' + rows.map(row=>row.map(cell).join(',')).join('\r\n');
      filename = 'my-activity-logs.csv';
      mimeType = 'text/csv;charset=utf-8';
    }
    const url=URL.createObjectURL(new Blob([contents],{type:mimeType}));
    const link=make('a','');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    feedback(`The filtered activity was exported to ${format.toUpperCase()}.`);
  }
  $('exportActivityLogs').addEventListener('click',()=>exportLogs('csv'));
  $('exportActivityLogsTxt').addEventListener('click',()=>exportLogs('txt'));
  refresh();
  if (window.TMIS_LOG_DATA?.next) {
    (async () => {
      try {
        while (window.TMIS_LOG_DATA.next) {
          const response = await fetch(window.TMIS_LOG_DATA.next, {headers:{Accept:'application/json'}, credentials:'same-origin'});
          if (!response.ok) throw new Error('History unavailable');
          const history = await response.json();
          window.TMIS_LOG_DATA.entries.push(...history.data);
          window.TMIS_LOG_DATA.next = history.next_page_url;
        }
        refresh();
      } catch { feedback('Some older server activity could not be loaded. Use Refresh to try again.', true); }
    })();
  }
});
