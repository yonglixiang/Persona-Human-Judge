const API_BASE=(window.STUDY_CONFIG?.apiBaseUrl||'').replace(/\/$/,'');
const TOKEN_KEY='persona-study-access-v1';
async function apiFetch(path,options={}){
 if(!API_BASE)throw Error('后端尚未部署。请研究负责人先完成仓库中的部署配置。');
 const headers=new Headers(options.headers||{});const token=localStorage.getItem(TOKEN_KEY);if(token)headers.set('Authorization','Bearer '+token);
 return fetch(API_BASE+path,{...options,headers});
}
async function signInStudy(code){const r=await apiFetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});const data=await r.json();if(!r.ok)throw Error(data.error||'登录失败');localStorage.setItem(TOKEN_KEY,data.token);}
