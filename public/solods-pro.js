/* soloDS Box Pro extension v1.0 — load AFTER dashboard's original inline script.
   No original functions, OAuth settings, or files are modified. */
(()=>{'use strict';
if(window.SoloDSPro)return;
const ID='sdp-', META='solods-box-metadata.json', FOLDER='soloDS Box Pro';
const state={files:[],meta:{notes:[],bookmarks:[],links:[]},folder:null,metaId:null,ready:false,record:null,recChunks:[],timer:null,tab:'files',query:'',pinOpen:false};
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=s=>{try{let u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
const key=s=>'solods_pro_'+(typeof userName!=='undefined'?userName:'default')+'_'+s;
function token(){try{return typeof accessToken!=='undefined'?accessToken:''}catch{return ''}}
function isAuthError(e){return /Drive 401|Upload failed \(401\)|invalid authentication credentials|Connect Google Drive first/i.test(String(e?.message||e))}
async function reconnect(){
  if(!window.google?.accounts?.oauth2)throw Error('Google Identity is not loaded. Refresh the page and try again.');
  if(typeof GOOGLE_CLIENT_ID==='undefined'||typeof GOOGLE_SCOPES==='undefined')throw Error('Original dashboard OAuth settings unavailable');
  return new Promise((resolve,reject)=>{
    const client=google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:GOOGLE_SCOPES,callback:response=>{
      if(response.error||!response.access_token){reject(Error(response.error_description||response.error||'Google connection cancelled'));return}
      accessToken=response.access_token;
      localStorage.setItem('box_token_'+userName,response.access_token);
      resolve(response.access_token);
    }});
    client.requestAccessToken({prompt:''});
  });
}

function toast(message,type='info'){let box=$('#sdp-toasts');if(!box)return;let el=document.createElement('div');el.className='sdp-toast '+type;el.textContent=message;box.append(el);setTimeout(()=>el.remove(),3500)}
async function api(path,opts={}){let t=token();if(!t)throw Error('Connect Google Drive first');let h=new Headers(opts.headers||{});h.set('Authorization','Bearer '+t);let r=await fetch('https://www.googleapis.com/drive/v3/'+path,{...opts,headers:h});if(!r.ok){let detail=await r.text();throw Error('Drive '+r.status+': '+detail.slice(0,160))}return opts.raw?r: r.status===204?null:r.json()}
async function upload(name,blob,parent,mime){let metadata={name,mimeType:mime||blob.type||'application/octet-stream',parents:parent?[parent]:undefined};let form=new FormData();form.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));form.append('file',blob,name);let t=token();let r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,parents',{method:'POST',headers:{Authorization:'Bearer '+t},body:form});if(!r.ok)throw Error('Upload failed ('+r.status+'): '+(await r.text()).slice(0,150));return r.json()}
async function replace(id,blob,mime='application/json'){let r=await fetch('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media&fields=id,name',{method:'PATCH',headers:{Authorization:'Bearer '+token(),'Content-Type':mime},body:blob});if(!r.ok)throw Error('Metadata update failed: '+r.status);return r.json()}
async function blobOf(id){return (await api('files/'+encodeURIComponent(id)+'?alt=media',{raw:true})).blob()}
async function list(q){let all=[],next;do{let params=new URLSearchParams({q,fields:'nextPageToken,files(id,name,mimeType,size,createdTime,webViewLink,parents)',pageSize:'1000'});if(next)params.set('pageToken',next);let r=await api('files?'+params);all.push(...r.files);next=r.nextPageToken}while(next);return all}
async function initDrive(){let folders=await list("name = '"+FOLDER+"' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");if(!folders.length){let r=await api('files?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:FOLDER,mimeType:'application/vnd.google-apps.folder'})});state.folder=r.id}else state.folder=folders[0].id;await refresh()}
async function refresh(){let fs=await list("'"+state.folder+"' in parents and trashed = false");state.files=fs.filter(f=>f.name!==META);let mf=fs.find(f=>f.name===META);state.metaId=mf?.id||null;if(mf){try{let b=await blobOf(mf.id);let m=JSON.parse(await b.text());for(let k of ['notes','bookmarks','links'])state.meta[k]=Array.isArray(m[k])?m[k]:[]}catch(e){toast('Metadata read failed; existing data was not overwritten','error');throw e}}else state.meta={notes:[],bookmarks:[],links:[]};render();storage()}
async function saveMeta(){let b=new Blob([JSON.stringify(state.meta,null,2)],{type:'application/json'});if(state.metaId)await replace(state.metaId,b);else{let f=await upload(META,b,state.folder,'application/json');state.metaId=f.id}}
async function mutate(kind,action,id){let a=state.meta[kind];if(action==='delete'){if(!confirm('Delete this item?'))return;state.meta[kind]=a.filter(x=>x.id!==id)}else{let old=a.find(x=>x.id===id),title=prompt('Title',old?.title||'');if(title===null||!title.trim())return;let data={id:old?.id||crypto.randomUUID(),title:title.trim(),updated:new Date().toISOString()};if(kind==='notes'){let body=prompt('Note',old?.body||'');if(body===null)return;data.body=body}else{let url=prompt('URL (https://...)',old?.url||'https://');if(url===null)return;data.url=safeURL(url);if(!data.url){toast('Enter a valid http(s) URL','error');return}}if(old)Object.assign(old,data);else a.unshift(data)}await saveMeta();render();toast('Saved','success')}
function row(f){let kind=f.mimeType.startsWith('image/')?'🖼️':f.mimeType.startsWith('audio/')?'🎤':f.mimeType==='application/vnd.google-apps.folder'?'📁':'📄';return `<div class="sdp-item"><span>${kind} ${esc(f.name)}</span><small>${f.size?Math.round(f.size/1024)+' KB':''}</small><div class="sdp-actions"><button data-act="preview" data-id="${esc(f.id)}">Preview</button><button data-act="download" data-id="${esc(f.id)}">Download</button><button data-act="share" data-id="${esc(f.id)}">Share</button><button data-act="protect" data-id="${esc(f.id)}">${protectedIds().includes(f.id)?"🔒 Protected":"🔓 Protect"}</button></div></div>`}
function render(){let list=$('#sdp-results');if(!list)return;let q=state.query.toLowerCase();let arr=state.tab==='files'?state.files:state.tab==='photos'?state.files.filter(x=>x.mimeType.startsWith('image/')):state.tab==='voice'?state.files.filter(x=>x.mimeType.startsWith('audio/')):state.meta[state.tab]||[];arr=arr.filter(x=>[x.name,x.title,x.body,x.url].some(v=>String(v||'').toLowerCase().includes(q)));list.innerHTML=arr.length?arr.map(x=>state.meta[state.tab]?`<div class="sdp-item"><strong>${esc(x.title)}</strong><small>${esc(x.body||x.url||'')}</small><div class="sdp-actions"><button data-act="edit" data-id="${esc(x.id)}">Edit</button><button data-act="delete" data-id="${esc(x.id)}">Delete</button>${x.url?`<button data-act="open" data-id="${esc(x.id)}">Open</button><button data-act="copy" data-id="${esc(x.id)}">Copy</button>`:''}</div></div>`:row(x)).join('') :'<p class="sdp-muted">No additional Pro-managed items.</p>';
}
async function download(f){let b=await blobOf(f.id),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
async function preview(f){if(f.mimeType.startsWith('audio/')||f.mimeType.startsWith('image/')){let url=URL.createObjectURL(await blobOf(f.id));modal(`<h3>${esc(f.name)}</h3>${f.mimeType.startsWith('audio/')?`<audio controls src="${url}"></audio>`:`<img alt="Preview" style="max-width:100%;max-height:65vh" src="${url}">`}`,()=>URL.revokeObjectURL(url));return}modal(`<h3>${esc(f.name)}</h3><iframe title="Drive preview" style="width:100%;height:65vh;border:0" src="https://drive.google.com/file/d/${encodeURIComponent(f.id)}/preview"></iframe><p class="sdp-muted">Preview may be unavailable for private files; use Download instead.</p>`)}
function modal(html,onClose){let el=$('#sdp-modal');el.innerHTML=`<div class="sdp-dialog"><button id="sdp-close" aria-label="Close">✕</button>${html}</div>`;el.hidden=false;$('#sdp-close').onclick=()=>{el.hidden=true;el.innerHTML='';onClose?.()}}
async function share(f){if(!confirm('Make this file accessible to anyone with its link?'))return;await api('files/'+encodeURIComponent(f.id)+'/permissions?fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'reader',type:'anyone'})});await navigator.clipboard.writeText('https://drive.google.com/file/d/'+f.id+'/view');toast('Public link copied','success')}
async function compress(file){if(!file.type.startsWith('image/')||file.type==='image/gif'||file.type==='image/svg+xml')return file;let img=await createImageBitmap(file);let scale=Math.min(1,1920/Math.max(img.width,img.height));let canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);img.close();let b=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.85));return new File([b],file.name.replace(/\.[^.]+$/, '')+'.jpg',{type:'image/jpeg'})}
async function selected(files,photos=false){if(!files?.length)return;for(let f of files){try{let file=photos?await compress(f):f;await upload(file.name,file,state.folder,file.type);toast('Uploaded '+file.name,'success')}catch(e){toast(e.message,'error')}}await refresh()}
async function storage(){try{let a=await api('about?fields=storageQuota');let used=Number(a.storageQuota?.usage||0),limit=Number(a.storageQuota?.limit||0);$('#sdp-meter').textContent=limit?`${(used/1073741824).toFixed(2)} / ${(limit/1073741824).toFixed(2)} GB used`:`${(used/1073741824).toFixed(2)} GB used`;$('#sdp-progress').value=limit?100*used/limit:0}catch{$('#sdp-meter').textContent='Storage information unavailable with current permissions'}}
async function pdf(){let title=prompt('PDF filename','note.pdf');if(!title)return;let text=prompt('Text to convert to PDF');if(text===null)return;await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');let doc=new window.jspdf.jsPDF();let lines=doc.splitTextToSize(text,180),y=15;for(let line of lines){if(y>275){doc.addPage();y=15}doc.text(line,15,y);y+=7}let b=doc.output('blob');await upload(title.endsWith('.pdf')?title:title+'.pdf',b,state.folder,'application/pdf');await refresh();toast('PDF saved','success')}
function loadScript(url){return new Promise((resolve,reject)=>{let s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(Error('Library unavailable'));document.head.append(s)})}
async function zip(){let files=state.files.slice(0,20);if(!files.length)return toast('No Pro files to ZIP','info');await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');let z=new JSZip();for(let f of files){try{z.file(f.name,await blobOf(f.id))}catch(e){toast('Skipped '+f.name,'error')}}let b=await z.generateAsync({type:'blob'});await upload('solods-pro-bundle.zip',b,state.folder,'application/zip');await refresh();toast('ZIP saved','success')}
async function voice(){if(state.record?.state==='recording'){state.record.stop();return}if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Recording unavailable in this browser');let stream=await navigator.mediaDevices.getUserMedia({audio:true});let rec=new MediaRecorder(stream);state.recChunks=[];state.record=rec;rec.ondataavailable=e=>{if(e.data.size)state.recChunks.push(e.data)};rec.onstop=async()=>{clearInterval(state.timer);$('#sdp-voice').textContent='🎤 Record';stream.getTracks().forEach(t=>t.stop());try{let b=new Blob(state.recChunks,{type:rec.mimeType||'audio/webm'});let ext=b.type.includes('mp4')?'m4a':'webm';await upload('Voice-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+ext,b,state.folder,b.type);await refresh();toast('Recording saved','success')}catch(e){toast(e.message,'error')}};rec.start();let start=Date.now();state.timer=setInterval(()=>{$('#sdp-voice').textContent='■ Stop '+Math.floor((Date.now()-start)/60000).toString().padStart(2,'0')+':'+(Math.floor((Date.now()-start)/1000)%60).toString().padStart(2,'0')},500)}
const themes={default:['#0a0a0f','#131318','#8b5cf6'],light:['#f8f9fc','#ffffff','#7c3aed'],ocean:['#0c1a2d','#10233d','#0ea5e9'],sunset:['#1a0f0f','#261414','#f97316'],forest:['#0d1a12','#132619','#22c55e'],candy:['#281326','#381a36','#ff65c3'],gold:['#1a140a','#261d0f','#f59e0b'],midnight:['#0a0a1a','#12122a','#8b5cf6'],rose:['#1a0f14','#261418','#ec4899'],mint:['#08221e','#11332c','#2dd4bf'],lavender:['#1d1531','#291e40','#a78bfa']};
function theme(id){let c=themes[id];if(!c)return;let root=$('#sdp-root');root.style.setProperty('--sdp-bg',c[0]);root.style.setProperty('--sdp-surface',c[1]);root.style.setProperty('--sdp-accent',c[2]);document.documentElement.setAttribute('data-theme',id==='default'?'dark':id);localStorage.setItem('theme',id==='default'?'dark':id);localStorage.setItem(key('theme'),id)}
function pinId(){return key('pin_hash')}
async function hash(pin){let data=new TextEncoder().encode(key('pin_salt')+':'+pin);let h=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('')}
async function pin(){if(state.pinOpen)return;state.pinOpen=true;let existing=localStorage.getItem(pinId());let overlay=document.createElement('div');overlay.id='sdp-lock';overlay.innerHTML=`<div class="sdp-lock-card"><h2>🔐 soloDS Box Pro</h2><p id="sdp-pin-hint">${existing?'Enter your 4-digit PIN':'Create a 4-digit PIN'}</p><div id="sdp-dots">○ ○ ○ ○</div><div id="sdp-pad">${['1','2','3','4','5','6','7','8','9','⌫','0','↵'].map(n=>`<button type="button" data-key="${n}">${n}</button>`).join('')}</div><button id="sdp-forgot">${existing?'Reset PIN (requires Google reconnection)':'Skip PIN setup for now'}</button><p class="sdp-muted">PIN is a local convenience lock, not Drive encryption.</p></div>`;document.body.append(overlay);let buffer='',first=null;let update=()=>$('#sdp-dots').textContent='● '.repeat(buffer.length)+'○ '.repeat(4-buffer.length);function finish(){document.removeEventListener('keydown',keys);overlay.remove();state.pinOpen=false}async function accept(){if(buffer.length!==4)return;let v=buffer;buffer='';update();if(existing){if(await hash(v)===existing)finish();else toast('Incorrect PIN','error')}else if(first===null){first=v;$('#sdp-pin-hint').textContent='Confirm your PIN'}else if(v===first){localStorage.setItem(pinId(),await hash(v));finish()}else{first=null;$('#sdp-pin-hint').textContent='PINs did not match; create PIN again'}}function keys(e){if(!state.pinOpen)return;if(e.key>='0'&&e.key<='9'&&buffer.length<4){buffer+=e.key;update();if(buffer.length===4)accept()}else if(e.key==='Backspace'){buffer=buffer.slice(0,-1);update()}else if(e.key==='Enter')accept()}document.addEventListener('keydown',keys);$('#sdp-pad').onclick=e=>{let v=e.target.dataset.key;if(!v)return;if(v==='⌫')buffer=buffer.slice(0,-1);else if(v==='↵')accept();else if(buffer.length<4){buffer+=v;if(buffer.length===4)accept()}update()};$('#sdp-forgot').onclick=()=>{if(existing){if(!confirm('This removes only the local Pro PIN. Google sign-in must be completed again; this does not revoke existing tokens. Continue?'))return;localStorage.removeItem(pinId());try{localStorage.removeItem('box_token_'+userName);localStorage.removeItem('box_token')}catch{}location.reload()}else finish()}}
function css(){let s=document.createElement('style');s.textContent=`#sdp-root{--sdp-bg:#0a0a0f;--sdp-surface:#131318;--sdp-accent:#8b5cf6;background:var(--sdp-bg);color:#f5f5f7;border:1px solid #5555;border-radius:18px;padding:18px;margin:18px 0;font:14px system-ui}#sdp-root button{background:var(--sdp-surface);color:inherit;border:1px solid #7775;border-radius:9px;padding:9px 12px;cursor:pointer}#sdp-root button:hover{border-color:var(--sdp-accent)}#sdp-root button[hidden]{display:none}#sdp-root input,#sdp-root select{background:var(--sdp-surface);color:inherit;border:1px solid #7775;border-radius:8px;padding:9px;max-width:100%}#sdp-root .sdp-head,#sdp-root .sdp-actions,#sdp-root .sdp-tabs,#sdp-root .sdp-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}#sdp-root .sdp-tabs button.active{background:var(--sdp-accent);color:white}#sdp-root .sdp-item{padding:13px 0;border-top:1px solid #7774;overflow-wrap:anywhere}#sdp-root .sdp-item small{display:block;color:#aaa;margin-top:4px}#sdp-root .sdp-muted{color:#aaa;font-size:12px}#sdp-root progress{width:100%;accent-color:var(--sdp-accent)}#sdp-modal[hidden],#sdp-root[hidden],#sdp-auth[hidden]{display:none}#sdp-auth{padding:12px;border:1px solid #eab308;border-radius:10px;margin:10px 0}#sdp-modal{position:fixed;inset:0;z-index:99999;background:#000b;display:grid;place-items:center;padding:12px}#sdp-modal .sdp-dialog{position:relative;background:var(--sdp-surface);color:white;padding:20px;border-radius:14px;width:min(700px,96vw);max-height:90vh;overflow:auto}#sdp-close{float:right}#sdp-toasts{position:fixed;right:15px;bottom:15px;z-index:100002}.sdp-toast{background:#26233b;color:white;border:1px solid #8b5cf6;border-radius:10px;padding:12px;margin-top:8px;max-width:300px}.sdp-toast.error{border-color:#ef4444}.sdp-toast.success{border-color:#22c55e}#sdp-lock{position:fixed;inset:0;z-index:100001;background:#090910;display:grid;place-items:center;color:white;padding:20px;font:16px system-ui}#sdp-lock .sdp-lock-card{width:min(350px,100%);text-align:center;background:#181824;padding:24px;border-radius:18px}#sdp-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:20px 0}#sdp-pad button{font-size:22px;padding:15px;background:#28283a;color:white;border:0;border-radius:12px}#sdp-forgot{background:none;border:0;color:#c4b5fd;cursor:pointer}#sdp-dots{font-size:26px;letter-spacing:8px}@media(max-width:650px){#sdp-root{padding:12px}#sdp-root .sdp-head{align-items:stretch}#sdp-root .sdp-tools button{flex:1}}`;document.head.append(s)}

function ui(){
 css();
 const root=document.createElement('div');
 root.id='sdp-root';
 root.innerHTML=`<div class="sdp-head"><input id="sdp-search" type="search" placeholder="Search Pro items..." aria-label="Search"><button type="button" id="sdp-theme">🎨 20 Themes</button></div>
 <div id="sdp-auth" hidden><span id="sdp-auth-msg"></span> <button type="button" id="sdp-reconnect">Connect Google Drive for Pro tools</button></div>
 <div class="sdp-tools"><button id="sdp-add">＋ New</button><button id="sdp-upload">⬆ Upload</button><input type="file" id="sdp-picker" multiple hidden>
 <button id="sdp-camera">📷 Camera</button><input type="file" id="sdp-camera-input" accept="image/*" capture="environment" hidden>
 <button id="sdp-voice">🎤 Record</button><button id="sdp-pdf">Text → PDF</button><button id="sdp-zip">Create ZIP</button><button id="sdp-refresh">↻ Refresh</button></div>
 <details id="sdp-extra"><summary>Additional Pro-managed items</summary><div id="sdp-results"></div></details>
 <div id="sdp-meter" class="sdp-muted"></div><progress id="sdp-progress" max="100" value="0" hidden></progress>
 <div id="sdp-modal" hidden></div>`;
 const t=document.createElement('div');t.id='sdp-toasts';document.body.append(t);
 const nav=document.querySelector('#mainContent > nav');
 const panels=['photos','bookmarks','notes','links','files'];
 function mount(tab){
   state.tab=tab;
   const panel=document.getElementById(tab);
   if(!panel)return;
   panel.insertBefore(root,panel.children[1]||null);
   $('#sdp-add').hidden=!['notes','bookmarks','links'].includes(tab);
   $('#sdp-upload').hidden=!['files','photos'].includes(tab);
   $('#sdp-camera').hidden=tab!=='photos';
   $('#sdp-voice').hidden=tab!=='voice';
   render();
 }
 for(const b of nav.querySelectorAll('button[data-tab]')){
   b.addEventListener('click',()=>mount(b.dataset.tab));
 }
 const voicePanel=document.createElement('section');voicePanel.id='voice';voicePanel.className='panel';voicePanel.innerHTML='<h2>🎤 Voice Notes</h2>';
 document.querySelector('#mainContent').append(voicePanel);
 const voiceBtn=document.createElement('button');voiceBtn.textContent='🎤 Voice';voiceBtn.dataset.tab='voice';nav.append(voiceBtn);
 voiceBtn.onclick=()=>{currentTab='voice';nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===voiceBtn));document.querySelectorAll('#mainContent > .panel').forEach(p=>p.classList.toggle('active',p===voicePanel));mount('voice')};
 mount('photos');
 $('#sdp-reconnect').onclick=()=>run(reconnectAndStart);
 $('#sdp-search').oninput=e=>{state.query=e.target.value;render()};
 $('#sdp-add').onclick=()=>run(()=>withDrive(()=>mutate(state.tab,'add')));
 $('#sdp-upload').onclick=()=>$('#sdp-picker').click();
 $('#sdp-picker').onchange=e=>run(()=>withDrive(()=>selected(e.target.files,state.tab==='photos')));
 $('#sdp-camera').onclick=()=>$('#sdp-camera-input').click();
 $('#sdp-camera-input').onchange=e=>run(()=>withDrive(()=>selected(e.target.files,true)));
 $('#sdp-refresh').onclick=()=>run(()=>withDrive(refresh));
 $('#sdp-pdf').onclick=()=>run(()=>pdf());
 $('#sdp-zip').onclick=()=>run(()=>zip());
 $('#sdp-voice').onclick=()=>run(()=>withDrive(voice));
 $('#sdp-theme').onclick=showThemes;
 $('#sdp-results').onclick=e=>run(async()=>{
   const b=e.target.closest('button[data-act]');if(!b)return;
   const f=state.files.find(x=>x.id===b.dataset.id),a=state.meta[state.tab]?.find(x=>x.id===b.dataset.id);
   if(f && ['preview','download','share'].includes(b.dataset.act)){
     if(!(await checkProtected(f.id)))return;
     return withDrive(()=>b.dataset.act==='preview'?preview(f):b.dataset.act==='download'?download(f):share(f));
   }
   if(b.dataset.act==='protect'&&f){await toggleProtected(f.id);render();return}
   if(b.dataset.act==='edit'||b.dataset.act==='delete')return withDrive(()=>mutate(state.tab,b.dataset.act,b.dataset.id));
   if(b.dataset.act==='open'&&a)return window.open(a.url,'_blank','noopener,noreferrer');
   if(b.dataset.act==='copy'&&a){await navigator.clipboard.writeText(a.url);toast('Copied','success')}
 });
 // PIN prompts are shown only when opening explicitly protected files.
 document.querySelector('#mainContent').addEventListener('click',async e=>{
   const btn=e.target.closest('button[onclick^="openInDrive"]');
   if(!btn)return;
   const id=btn.closest('.item')?.dataset.fileId;
   if(!id || !protectedIds().includes(id))return;
   e.preventDefault();e.stopImmediatePropagation();
   if(await checkProtected(id))window.open('https://drive.google.com/file/d/'+encodeURIComponent(id)+'/view','_blank','noopener,noreferrer');
 },true);
}
async function withDrive(fn){
 if(!state.ready){
   if(!token()){showReconnect('Browsing is available. Connect Google only to use additional Pro Drive tools.');return}
   try{await initDrive();state.ready=true}catch(e){showReconnect('Pro Drive tools need renewed Google authorization.');return}
 }
 return fn();
}
function protectedIds(){try{return JSON.parse(localStorage.getItem(key('protected'))||'[]')}catch{return []}}
async function pinHash(value){let bytes=new TextEncoder().encode(key('pin')+':'+value);let hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function verifyPIN(){
 const stored=localStorage.getItem(key('pin_hash'));
 if(!stored){
   const a=prompt('Create a 4-digit PIN for protected items (this browser only):');
   if(a===null)return false;
   if(!/^\d{4}$/.test(a)){toast('PIN must contain four digits','error');return false}
   const b=prompt('Confirm your new PIN:');if(a!==b){toast('PIN confirmation did not match','error');return false}
   localStorage.setItem(key('pin_hash'),await pinHash(a));return true;
 }
 const entered=prompt('Enter your 4-digit PIN to access this protected item:');
 return entered!==null && await pinHash(entered)===stored;
}
async function checkProtected(id){if(!protectedIds().includes(id))return true;const ok=await verifyPIN();if(!ok)toast('Incorrect PIN','error');return ok}
async function toggleProtected(id){
 if(!await verifyPIN())return;
 let ids=protectedIds();ids=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];
 localStorage.setItem(key('protected'),JSON.stringify(ids));
 toast(ids.includes(id)?'PIN prompt enabled on this browser':'PIN prompt removed','success');
}
window.SoloDSProShowThemes=showThemes;
function showThemes(){
 const existing=document.getElementById('solods-theme-dialog');if(existing){existing.remove();return}
 const d=document.createElement('div');d.id='solods-theme-dialog';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','Choose theme');
 const cards=Object.entries(window.SoloDSThemePalette||{}).map(([name,colors])=>`<button type="button" data-theme-id="${esc(name)}" style="--swatch:${colors[2]}"><span class="sdp-swatch"></span>${esc(name)}</button>`).join('');
 d.innerHTML=`<div class="solods-theme-box"><div class="solods-theme-top"><h2>Choose your theme</h2><button type="button" id="solods-theme-close">✕</button></div><div class="solods-theme-grid">${cards}</div></div>`;
 document.body.append(d);d.querySelector('#solods-theme-close').onclick=()=>d.remove();d.onclick=e=>{if(e.target===d)d.remove();const b=e.target.closest('[data-theme-id]');if(b){window.SoloDSApplyTheme(b.dataset.themeId);d.remove()}};
}
async function run(fn){try{await fn()}catch(e){console.error('[soloDS Pro]',e);if(isAuthError(e)){showReconnect('Your Google Drive session has expired. Reconnect to continue.')}else toast(e.message||'Operation failed','error')}}
function showReconnect(message){let el=$('#sdp-auth');if(!el)return;el.hidden=false;$('#sdp-auth-msg').textContent=message||'Connect Google Drive to use Pro features.'}
async function reconnectAndStart(){try{await reconnect();$('#sdp-auth').hidden=true;state.ready=false;await start();if(state.ready)toast('Google Drive connected','success')}catch(e){showReconnect(e.message);toast(e.message,'error')}}

let starting=false;async function start(){return} 
function boot(){if(!$('#mainContent'))return;ui();window.SoloDSPro={refresh:()=>run(refresh),version:'1.0.0',state}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
