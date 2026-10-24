/* soloDS Theatre launcher v1 — independent companion to solods-sidebar.js. */
(()=>{'use strict';
if(window.__soloDSTheaterLauncher)return;window.__soloDSTheaterLauncher=true;
const platforms=[
 ['YouTube','https://www.youtube.com/','#ff0033','YT','Videos & music'],
 ['OK.ru','https://ok.ru/','#f7931e','OK','Videos & communities'],
 ['Vimeo','https://vimeo.com/','#1ab7ea','V','Creative videos'],
 ['Dailymotion','https://www.dailymotion.com/','#2563eb','D','Videos & news'],
 ['PeerTube','https://joinpeertube.org/','#f1680d','P','Independent video'],
 ['Twitch','https://www.twitch.tv/','#9146ff','T','Live streaming'],
 ['Odysee','https://odysee.com/','#e63d6f','O','Video discovery'],
 ['Rumble','https://rumble.com/','#68b42e','R','Videos & livestreams'],
 ['VK Video','https://vkvideo.ru/','#0077ff','VK','Videos & creators'],
 ['Rutube','https://rutube.ru/','#161b32','Ru','Video entertainment']
];
const css=`
#sdt-overlay{position:fixed;inset:0;z-index:2147483600;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(6,10,25,.76);backdrop-filter:blur(10px);font-family:system-ui,-apple-system,Segoe UI,sans-serif;box-sizing:border-box}
#sdt-overlay.sdt-open{display:flex}
#sdt-overlay *{box-sizing:border-box}
#sdt-panel{width:min(870px,100%);max-height:min(90vh,850px);overflow:auto;background:linear-gradient(135deg,#18243e,#10172b 58%,#161d36);color:#f8fafc;border:1px solid #ffffff24;border-radius:25px;box-shadow:0 35px 90px #0009;padding:clamp(20px,4vw,34px);position:relative}
#sdt-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
#sdt-kicker{color:#9ab2e8;font-size:12px;letter-spacing:.15em;text-transform:uppercase;font-weight:750}
#sdt-panel h2{font-size:clamp(24px,4vw,33px);letter-spacing:-.04em;margin:7px 0 7px;line-height:1.15;color:#fff}
#sdt-panel p{font-size:14px;color:#afbed8;line-height:1.5;margin:0}
#sdt-close{flex:none;background:#ffffff15;border:1px solid #ffffff24;color:#fff;border-radius:12px;width:41px;height:41px;cursor:pointer;font-size:22px}
#sdt-close:hover{background:#ffffff2b}
#sdt-search{width:100%;margin:16px 0 19px;padding:14px 17px;background:#ffffff0c;border:1px solid #ffffff29;border-radius:13px;color:#fff;font:inherit;outline:none}
#sdt-search:focus{border-color:#a5b4fc;box-shadow:0 0 0 3px #a5b4fc22}
#sdt-search::placeholder{color:#a8b6cc}
#sdt-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.sdt-item{display:flex;flex-direction:column;align-items:center;text-align:center;gap:9px;text-decoration:none!important;background:#ffffff0a;border:1px solid #ffffff1b;border-radius:16px;padding:19px 6px 16px;min-height:146px;color:#fff!important;transition:transform .16s,background .16s,border-color .16s;cursor:pointer}
.sdt-item:hover,.sdt-item:focus-visible{transform:translateY(-3px);background:#ffffff18;border-color:#8ba5e7;outline:none}
.sdt-icon{height:58px;width:58px;border-radius:17px;display:grid;place-items:center;background:var(--sdt-color);color:#fff;font-size:21px;font-weight:850;letter-spacing:-.07em;box-shadow:0 8px 20px #0003}
.sdt-name{font-size:13px;font-weight:750;line-height:1.2}
.sdt-desc{font-size:11px;color:#aebbd2;line-height:1.3}
#sdt-footer{margin-top:18px;display:flex;align-items:center;gap:8px;font-size:12px;color:#9cabc8}
#sdt-empty{display:none;text-align:center;padding:20px;color:#b9c5d9}
@media(max-width:690px){#sdt-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.sdt-item{min-height:133px;padding:13px 5px}.sdt-icon{width:49px;height:49px}}
@media(max-width:380px){#sdt-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){.sdt-item{transition:none}}
`;
const style=document.createElement('style');style.id='sdt-styles';style.textContent=css;document.head.append(style);
const overlay=document.createElement('div');overlay.id='sdt-overlay';overlay.setAttribute('aria-hidden','true');
overlay.innerHTML=`<section id="sdt-panel" role="dialog" aria-modal="true" aria-labelledby="sdt-title"><header id="sdt-head"><div><div id="sdt-kicker">soloDS Box Pro</div><h2 id="sdt-title">Theatre <span aria-hidden="true">✦</span></h2><p>Choose your platform. Opens in a new browser tab.</p></div><button id="sdt-close" type="button" aria-label="Close Theatre">×</button></header><input id="sdt-search" type="search" placeholder="Search video platforms…" aria-label="Search video platforms"><div id="sdt-grid"></div><div id="sdt-empty">No matching platform found.</div><footer id="sdt-footer">↗ Opens the official platform website in a new tab. Availability varies by region.</footer></section>`;
const grid=overlay.querySelector('#sdt-grid');
for(const [name,url,color,initial,description] of platforms){const a=document.createElement('a');a.className='sdt-item';a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',`Open ${name} in new tab`);a.dataset.search=(name+' '+description).toLowerCase();a.style.setProperty('--sdt-color',color);const ico=document.createElement('span');ico.className='sdt-icon';ico.textContent=initial;const n=document.createElement('span');n.className='sdt-name';n.textContent=name;const d=document.createElement('span');d.className='sdt-desc';d.textContent=description;a.append(ico,n,d);grid.append(a)}
let previousFocus=null;
function close(){overlay.classList.remove('sdt-open');overlay.setAttribute('aria-hidden','true');previousFocus?.focus?.()}
function open(){previousFocus=document.activeElement;const old=document.getElementById('sds-modal');if(old){old.classList.remove('open');const oldBody=old.querySelector('#sds-body');if(oldBody)oldBody.replaceChildren()}overlay.classList.add('sdt-open');overlay.setAttribute('aria-hidden','false');const search=overlay.querySelector('#sdt-search');search.value='';filter('');overlay.querySelector('#sdt-close').focus()}
function filter(q){let visible=0;for(const a of grid.children){const show=a.dataset.search.includes(q.trim().toLowerCase());a.hidden=!show;if(show)visible++}overlay.querySelector('#sdt-empty').style.display=visible?'none':'block'}
overlay.querySelector('#sdt-search').addEventListener('input',e=>filter(e.target.value));overlay.querySelector('#sdt-close').addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});document.addEventListener('keydown',e=>{if(!overlay.classList.contains('sdt-open'))return;if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const items=[...overlay.querySelectorAll('button,input,a:not([hidden])')];const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
function isTheaterButton(button){return button?.closest?.('#sds-side')&&(button.getAttribute('aria-label')==='soloDS Theater'||button.title==='soloDS Theater')}
// Capture before the existing sidebar's onclick handler, so the original Theatre modal is never shown.
document.addEventListener('click',e=>{const button=e.target.closest?.('button');if(!isTheaterButton(button))return;e.preventDefault();e.stopImmediatePropagation();open()},true);
function init(){document.body.append(overlay)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.soloDSTheater={open,close};
})();
