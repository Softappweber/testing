/* soloDS Box Pro | Modern Vertical Elegant — single-sidebar skin.
   Load AFTER the existing soloDS feature scripts. All CSS embedded.
   Does not modify the dashboard's original navigation, OAuth, or data logic. */
(()=>{'use strict';
if(window.__soloDSModernVerticalV1)return;
window.__soloDSModernVerticalV1=true;
const svg={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',cloud:'<path d="M7 19h11a4 4 0 0 0 .3-8 6 6 0 0 0-11.5-1.8A5 5 0 0 0 7 19z"/>',theatre:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 7 5 3h16l-2 4M7 3l4 4m3-4 4 4m-8 4 5 3-5 3z"/>',radio:'<rect x="3" y="9" width="18" height="12" rx="3"/><path d="m6 9 12-6M7 15h6m-6 3h4"/><circle cx="17" cy="16" r="2"/>',palette:'<path d="M12 3a9 9 0 0 0 0 18h2a2 2 0 0 0 1.5-3.3 2 2 0 0 1 1.4-3.4H19A3 3 0 0 0 22 11 9 9 0 0 0 12 3Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="11" cy="7" r="1"/><circle cx="16" cy="8" r="1"/>',wrench:'<path d="M14 7a5 5 0 0 0-6 6l-5 5a2 2 0 0 0 3 3l5-5a5 5 0 0 0 6-6l-3 3-3-3z"/>',learn:'<path d="m2 9 10-5 10 5-10 5zM6 12v5c4 3 8 3 12 0v-5M22 9v7"/>',news:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h6v5H7zm9 0h2M16 12h2M7 16h11"/>',music:'<path d="M9 18V5l12-2v13M9 8l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',scan:'<path d="M4 9V5a1 1 0 0 1 1-1h4m6 0h4a1 1 0 0 1 1 1v4M4 15v4a1 1 0 0 0 1 1h4m6 0h4a1 1 0 0 0 1-1v-4M3 12h18"/>',qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zm7 0v3h-3m0 4h3m-7 0v-2"/>',book:'<path d="M12 6C8 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-6-1-10 2zm0 0v15"/>',folder:'<path d="M3 6h7l2 3h9v11H3z"/>',code:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18m0-18c5 5 5 13 0 18"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0m-7 7v3m-4 0h8"/>',pdf:'<path d="M6 2h9l5 5v15H6zM15 2v5h5M9 13h8m-8 4h8"/>',share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 11 6-5M9 13l6 5"/>',camera:'<path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/>',notes:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',link:'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2m3 6a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>',photo:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',bookmark:'<path d="M5 3h14v18l-7-5-7 5z"/>',chevron:'<path d="m9 6 6 6-6 6"/>',collapse:'<path d="m15 6-6 6 6 6"/>',crown:'<path d="m2 8 5 4 5-8 5 8 5-4-2 12H4z"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'};
const icon=k=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${svg[k]||svg.grid}</svg>`;

const css=`
/* Hide only legacy addon launch docks; their buttons and handlers remain in DOM. */
#sds-side,#swr-float,#swr-side-btn,#sfd-launch{display:none!important}
#sds-modern-vertical{--sdnav-bg:#05152b;--sdnav-blue:#0788f7;position:fixed;left:20px;top:20px;bottom:20px;width:306px;z-index:9900;display:flex;flex-direction:column;box-sizing:border-box;border-radius:24px;border:1px solid #086fb0;background:linear-gradient(164deg,#061a35 0%,#05142b 48%,#031026 100%);box-shadow:0 22px 55px #00102870, inset 0 1px 0 #ffffff0b;color:#eef6ff;font:500 15px/1.35 Inter,system-ui,-apple-system,'Segoe UI',sans-serif;isolation:isolate;overflow:hidden}
#sds-modern-vertical *,#sds-modern-vertical *::before,#sds-modern-vertical *::after{box-sizing:border-box}
#sds-modern-vertical .sdv-head{display:flex;align-items:center;gap:14px;padding:21px 18px 19px;flex:0 0 auto;min-height:79px}
#sds-modern-vertical .sdv-logo{width:46px;height:46px;flex:0 0 46px;filter:drop-shadow(0 5px 12px #0072ff30)}
#sds-modern-vertical .sdv-brand{min-width:0;flex:1;line-height:1.12}
#sds-modern-vertical .sdv-brand strong{display:block;font-size:21px;font-weight:800;letter-spacing:-.7px;color:#f7fbff}
#sds-modern-vertical .sdv-brand strong span{color:#11d4ff}
#sds-modern-vertical .sdv-brand small{display:block;font-size:15px;font-weight:450;color:#d7e3f3;margin-top:4px}
#sds-modern-vertical .sdv-collapse{width:30px;height:30px;flex:0 0 30px;display:grid;place-items:center;border:0;border-radius:50%;color:#dbeaff;background:#143254;cursor:pointer}
#sds-modern-vertical .sdv-collapse svg{width:17px;height:17px}
#sds-modern-vertical .sdv-list{padding:0 15px 8px;min-height:0;flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#23547c transparent}
#sds-modern-vertical .sdv-link{width:100%;height:45px;display:flex;align-items:center;gap:14px;text-align:left;padding:0 13px;margin:0 0 2px;border:1px solid transparent;border-radius:12px;background:transparent;color:#eaf2ff;font:inherit;cursor:pointer;transition:background .17s,border-color .17s,box-shadow .17s;white-space:nowrap}
#sds-modern-vertical .sdv-link:hover,#sds-modern-vertical .sdv-link:focus-visible{background:#12385b;border-color:#28608d;outline:none}
#sds-modern-vertical .sdv-link.sdv-active{background:linear-gradient(98deg,#0489fa 0%,#065ab8 72%,#064b99 100%);border-color:#12b1ff;box-shadow:0 4px 17px #006fd744,inset 0 1px 0 #9be7ff42;color:#fff}
#sds-modern-vertical .sdv-icon{width:27px;height:27px;flex:0 0 27px;display:grid;place-items:center;color:var(--sdv-icon,#71d7ff)}
#sds-modern-vertical .sdv-icon svg{width:26px;height:26px;stroke-width:2.15;filter:drop-shadow(0 1px 4px currentColor)}
#sds-modern-vertical .sdv-link.sdv-active .sdv-icon{color:#82ddff}
#sds-modern-vertical .sdv-name{flex:1;overflow:hidden;text-overflow:ellipsis;font-size:15px;letter-spacing:.05px}
#sds-modern-vertical .sdv-arrow{width:15px;height:15px;flex:0 0 15px;color:#8ba7c9}
#sds-modern-vertical .sdv-foot{flex:0 0 auto;padding:12px 15px 16px;background:linear-gradient(0deg,#041127 65%,transparent)}
#sds-modern-vertical .sdv-pro{display:flex;align-items:center;gap:13px;width:100%;padding:13px 11px;border-radius:15px;background:linear-gradient(120deg,#292b30 0%,#14253c 65%,#0c1b32 100%);border:1px solid #2b3d54;color:white;text-align:left}
#sds-modern-vertical .sdv-pro svg{width:38px;height:38px;flex:0 0 38px;fill:#ffcb29;stroke:#f8ad06;filter:drop-shadow(0 2px 6px #f7b9004a)}
#sds-modern-vertical .sdv-pro strong{display:block;font-size:14px;font-weight:800;white-space:nowrap}
#sds-modern-vertical .sdv-pro small{display:block;color:#c7d5e6;font-size:11px;line-height:1.25;margin-top:3px}
body.sdv-sidebar-present{padding-left:346px!important}
#sds-modern-vertical.sdv-compact{width:78px}
#sds-modern-vertical.sdv-compact .sdv-head{padding:18px 15px;flex-wrap:wrap;justify-content:center;gap:7px}
#sds-modern-vertical.sdv-compact .sdv-brand,#sds-modern-vertical.sdv-compact .sdv-name,#sds-modern-vertical.sdv-compact .sdv-arrow,#sds-modern-vertical.sdv-compact .sdv-pro-copy{display:none}
#sds-modern-vertical.sdv-compact .sdv-list{padding:4px 9px}
#sds-modern-vertical.sdv-compact .sdv-link{padding:0;justify-content:center}
#sds-modern-vertical.sdv-compact .sdv-pro{justify-content:center;padding:9px 0}
body.sdv-sidebar-compact{padding-left:118px!important}
#sdv-mobile-toggle{display:none;position:fixed;bottom:17px;left:17px;z-index:9900;background:linear-gradient(130deg,#008fff,#07479c);color:white;border:1px solid #5dc5ff;border-radius:16px;padding:13px;box-shadow:0 10px 30px #001b5c99}
#sdv-mobile-toggle svg{width:25px;height:25px}
#sdv-mobile-shade{display:none}
@media(max-width:900px){body.sdv-sidebar-present,body.sdv-sidebar-compact{padding-left:0!important}#sds-modern-vertical,#sds-modern-vertical.sdv-compact{top:0;bottom:0;left:0;width:min(320px,88vw);border-radius:0 23px 23px 0;transform:translateX(-105%);transition:transform .24s;z-index:10012}#sds-modern-vertical.sdv-mobile-open{transform:translateX(0)}#sds-modern-vertical.sdv-compact .sdv-brand,#sds-modern-vertical.sdv-compact .sdv-name,#sds-modern-vertical.sdv-compact .sdv-arrow,#sds-modern-vertical.sdv-compact .sdv-pro-copy{display:block}#sds-modern-vertical.sdv-compact .sdv-head{padding:21px 18px 19px;flex-wrap:nowrap;justify-content:initial}#sds-modern-vertical.sdv-compact .sdv-list{padding:0 15px 8px}#sds-modern-vertical.sdv-compact .sdv-link{justify-content:flex-start;padding:0 13px}#sds-modern-vertical.sdv-compact .sdv-pro{justify-content:flex-start;padding:13px 11px}#sdv-mobile-toggle{display:grid;place-items:center}#sdv-mobile-shade.sdv-open{display:block;position:fixed;inset:0;z-index:10011;background:#000b;backdrop-filter:blur(4px)}}
@media(prefers-reduced-motion:reduce){#sds-modern-vertical,#sds-modern-vertical .sdv-link{transition:none}}
`;
const menuItems=[
['Dashboard','home','#67caff','dashboard'],
['File Drop','cloud','#57aaff','filedrop'],
['Theatre World','theatre','#fa66c7','theatre'],
['World Radio','radio','#ff6c51','radio'],
['Themes','palette','#ffcc37','themes'],
['Utility Studio','wrench','#1de5ce','utility'],
['Learning World','learn','#4fc8ff','learning'],
['Global News','news','#c3b2ff','news'],
['Music World','music','#f84b9d','music'],
['Scan Pro','scan','#48d5fa','scan'],
['QR Studio','qr','#e8d4ff','qr'],
['Digital Library','book','#ffa6bf','library'],
['File Toolkit','folder','#ffc74d','toolkit'],
['Developer World','code','#1ee2c7','developer'],
['World Explorer','globe','#20dbd3','explorer'],
['Personal Workspace','grid','#55c9ff','workspace']
];
const apiNames={filedrop:'soloDSFileDrop',theatre:'soloDSTheater',radio:'soloDSWorldRadio',themes:'soloDSThemeAtelier',utility:'soloDSUtility',learning:'soloDSLearning',news:'soloDSNews',music:'soloDSMusic',scan:'soloDSScanner',qr:'soloDSQR',library:'soloDSLibrary',toolkit:'soloDSFileToolkit',developer:'soloDSDeveloper',explorer:'soloDSExplorer',workspace:'soloDSWorkspace'};
const oldLabels={theatre:'soloDS Theater',filedrop:'File Drop',radio:'soloDS World Radio',themes:'Themes'};
function openFeature(id){
 if(id==='dashboard') {window.scrollTo({top:0,behavior:'smooth'});return true;}
 const api=window[apiNames[id]];
 if(api&&typeof api.open==='function'){api.open();return true;}
 // Existing original addon buttons remain hidden, but their original event listeners are usable.
 const old=[...document.querySelectorAll('#sds-side button,#swr-side-btn,#swr-float,#sfd-launch')].find(b=>{
  const t=(b.title||b.getAttribute('aria-label')||b.textContent||'').toLowerCase();
  return t.includes((oldLabels[id]||'___').toLowerCase());
 });
 if(old){old.click();return true;}
 return false;
}
function init(){
 if(document.getElementById('sds-modern-vertical'))return;
 // Remove previously injected premium-sidebar adapter if present, but never the original dashboard.
 const oldPremium=document.getElementById('sds-elegant');if(oldPremium)oldPremium.remove();
 ['se-mobile-open','se-backdrop'].forEach(id=>document.getElementById(id)?.remove());
 document.body.classList.remove('se-sidebar-desktop','se-sidebar-mini');
 const style=document.createElement('style');style.id='sdv-modern-vertical-css';style.textContent=css;document.head.append(style);
 const aside=document.createElement('aside');aside.id='sds-modern-vertical';aside.setAttribute('aria-label','soloDS Box Pro feature navigation');
 const cube=`<svg class="sdv-logo" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="sdv-a" x2="1" y2="1"><stop stop-color="#ffcb24"/><stop offset="1" stop-color="#ff632f"/></linearGradient><linearGradient id="sdv-b" x2="1" y2="1"><stop stop-color="#fc5db5"/><stop offset="1" stop-color="#7254ff"/></linearGradient><linearGradient id="sdv-c" x2="1" y2="1"><stop stop-color="#2ddcff"/><stop offset="1" stop-color="#3771ff"/></linearGradient></defs><path fill="url(#sdv-a)" d="M24 2 44 13 24 24 4 13Z"/><path fill="url(#sdv-b)" d="M4 13 24 24 24 46 4 35Z"/><path fill="url(#sdv-c)" d="M44 13 24 24 24 46 44 35Z"/><path fill="#ffffff3a" d="M24 24 44 13 39 22 24 31Z"/></svg>`;
 aside.innerHTML=`<div class="sdv-head">${cube}<div class="sdv-brand"><strong>solo<span>DS</span></strong><small>Box Pro</small></div><button type="button" class="sdv-collapse" aria-label="Collapse navigation" title="Collapse navigation">${icon('collapse')}</button></div><div class="sdv-list" role="navigation"></div><div class="sdv-foot"><div class="sdv-pro">${icon('crown')}<div class="sdv-pro-copy"><strong>soloDS Box Pro</strong><small>Your Digital World<br>In One Place</small></div></div></div>`;
 const shade=document.createElement('div');shade.id='sdv-mobile-shade';
 const mobile=document.createElement('button');mobile.id='sdv-mobile-toggle';mobile.type='button';mobile.setAttribute('aria-label','Open soloDS sidebar');mobile.innerHTML=icon('menu');
 document.body.append(aside,shade,mobile);document.body.classList.add('sdv-sidebar-present');
 let compact=false;try{compact=localStorage.getItem('sdv-compact')==='1'}catch{}
 function setCompact(v){compact=v;aside.classList.toggle('sdv-compact',v);document.body.classList.toggle('sdv-sidebar-compact',v);try{localStorage.setItem('sdv-compact',v?'1':'0')}catch{}}
 setCompact(compact);
 function close(){aside.classList.remove('sdv-mobile-open');shade.classList.remove('sdv-open');mobile.setAttribute('aria-expanded','false')}
 mobile.addEventListener('click',()=>{aside.classList.add('sdv-mobile-open');shade.classList.add('sdv-open');mobile.setAttribute('aria-expanded','true')});shade.addEventListener('click',close);
 aside.querySelector('.sdv-collapse').addEventListener('click',()=>{if(matchMedia('(max-width:900px)').matches)close();else setCompact(!compact)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 const list=aside.querySelector('.sdv-list');let active='dashboard';
 menuItems.forEach(([label,ic,color,id])=>{
  const b=document.createElement('button');b.type='button';b.className='sdv-link'+(id==='dashboard'?' sdv-active':'');b.title=label;b.setAttribute('aria-label',label);b.style.setProperty('--sdv-icon',color);
  b.innerHTML=`<span class="sdv-icon">${icon(ic)}</span><span class="sdv-name"></span>${icon('chevron').replace('<svg','<svg class="sdv-arrow"')}`;
  b.querySelector('.sdv-name').textContent=label;
  b.addEventListener('click',()=>{
   if(!openFeature(id)){
    // Not a fake action: this entry is reserved for a future independent add-on.
    console.info('soloDS: '+label+' module is not installed yet.');return;
   }
   active=id;list.querySelectorAll('.sdv-link').forEach(x=>x.classList.toggle('sdv-active',x===b));close();
  });list.append(b);
 });
 window.soloDSModernVertical={open:()=>mobile.click(),close,activate:(id)=>openFeature(id)};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
