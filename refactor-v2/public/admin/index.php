<?php
declare(strict_types=1);
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
?><!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>CharacterMaker - AI Admin</title>
  <style>
    :root{color-scheme:dark;--bg:#0b0c10;--panel:#13151b;--panel2:#191c24;--line:#2a2e39;--text:#f4f5f7;--muted:#9da3af;--accent:#8b7cf6;--good:#59c98b;--warn:#e7b45b;--bad:#ef6b73;--radius:18px}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    a{color:inherit}.shell{width:min(1120px,100%);margin:auto;padding:20px 14px 80px}.top{display:flex;gap:14px;align-items:center;justify-content:space-between;margin-bottom:20px}.title{font-size:24px;font-weight:760;letter-spacing:-.03em}.sub{color:var(--muted);font-size:13px;margin-top:4px}.back,.button{min-height:44px;border:1px solid var(--line);border-radius:13px;background:var(--panel2);color:var(--text);padding:0 14px;font-weight:650;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px}.button.primary{background:var(--accent);border-color:transparent;color:white}.button.danger{color:#ff9ca1}.button:disabled{opacity:.5;cursor:not-allowed}.grid{display:grid;gap:14px}.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:16px}.card h2{font-size:16px;margin:0 0 4px}.desc{color:var(--muted);font-size:12px;margin-bottom:14px}.modes{grid-template-columns:repeat(3,minmax(0,1fr))}.models{grid-template-columns:repeat(2,minmax(0,1fr))}.field{display:grid;gap:6px}.field label,.label{font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.08em}.input,.select{width:100%;min-height:44px;border:1px solid var(--line);border-radius:12px;background:#0f1117;color:var(--text);padding:9px 11px;outline:none}.input:focus,.select:focus{border-color:var(--accent)}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.credential{border:1px solid var(--line);border-radius:15px;background:var(--panel2);padding:13px;display:grid;gap:11px}.credential-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.credential-title{font-weight:720}.pill{font-size:11px;border-radius:99px;padding:4px 8px;background:#232735;color:var(--muted)}.pill.good{background:rgba(89,201,139,.12);color:var(--good)}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.actions{display:flex;flex-wrap:wrap;gap:9px;align-items:center}.status{font-size:12px;color:var(--muted);min-height:18px}.status.good{color:var(--good)}.status.bad{color:var(--bad)}.provider{display:grid;gap:10px}.provider-title{display:flex;align-items:center;justify-content:space-between;gap:10px}.sticky{position:sticky;bottom:10px;z-index:10;margin-top:18px;padding:10px;border:1px solid var(--line);border-radius:16px;background:rgba(19,21,27,.93);backdrop-filter:blur(12px);display:flex;gap:9px;justify-content:flex-end;align-items:center}.save-status{margin-right:auto;color:var(--muted);font-size:12px}.note{border:1px solid rgba(231,180,91,.28);background:rgba(231,180,91,.07);color:#e8c984;border-radius:14px;padding:11px 12px;font-size:12px}.empty{color:var(--muted);font-size:12px;padding:8px 0}
    @media(max-width:760px){.modes,.models,.row{grid-template-columns:1fr}.top{align-items:flex-start}.title{font-size:21px}.shell{padding-top:14px}.sticky{justify-content:stretch}.sticky .button{flex:1}.save-status{display:none}}
  </style>
</head>
<body>
<div class="shell">
  <div class="top">
    <div><div class="title">AI провайдеры и модели</div><div class="sub">Серверная конфигурация CharacterMaker DEV. Ключ вводится один раз и дальше используется генератором автоматически.</div></div>
    <a class="back" href="../">Назад в CharacterMaker</a>
  </div>

  <div class="grid">
    <section class="card">
      <h2>Режимы генерации</h2>
      <div class="desc">Логический режим выбирает конкретную модель. Модель сама определяет provider и adapter.</div>
      <div class="grid modes" id="modes"></div>
    </section>

    <section class="card">
      <h2>Модели</h2>
      <div class="desc">Можно отключать модели и задавать API model override. BodyDNA normalizer остается общим.</div>
      <div class="grid models" id="models"></div>
    </section>

    <section class="card">
      <h2>Credentials</h2>
      <div class="desc">Cloudflare хранится парами Account ID + Token. Несколько активных credentials одного provider образуют fallback pool.</div>
      <div class="note">Секретные ключи сервер не возвращает в браузер. Если ключ уже сохранен, поле будет пустым. Оставьте его пустым, чтобы сохранить существующее значение, или введите новый для замены.</div>
      <div class="grid" id="providers" style="margin-top:14px"></div>
    </section>
  </div>

  <div class="sticky">
    <div class="save-status" id="saveStatus">Загрузка конфигурации...</div>
    <button class="button" id="reloadBtn" type="button">Перезагрузить</button>
    <button class="button primary" id="saveBtn" type="button">Сохранить на сервере</button>
  </div>
</div>
<script>
(() => {
  if (location.search || location.hash) history.replaceState(null, '', location.pathname.endsWith('/') ? location.pathname : location.pathname + '/');

  const SETTINGS_URL = '../api/ai-settings.php';
  const IMAGE_API = '../api/ai-image-server.php';
  const providersMeta = {
    cloudflare: {label:'Cloudflare Workers AI', desc:'Пары Account ID + API Token. Порядок карточек - порядок fallback.'},
    aihorde: {label:'AI Horde', desc:'API key. Для бесплатного zero-kudos режима CharacterMaker автоматически уменьшает запрос до допустимого размера.'},
    pollinations: {label:'Pollinations AI', desc:'Server-side API key для image generation.'}
  };
  const modelMeta = {
    'cloudflare-flux-2-klein-4b': {label:'Cloudflare - FLUX.2 Klein 4B', provider:'cloudflare', adapter:'flux2-klein', apiModel:'@cf/black-forest-labs/flux-2-klein-4b'},
    'cloudflare-flux-2-klein-9b': {label:'Cloudflare - FLUX.2 Klein 9B', provider:'cloudflare', adapter:'flux2-klein', apiModel:'@cf/black-forest-labs/flux-2-klein-9b'},
    'cloudflare-flux-2-dev': {label:'Cloudflare - FLUX.2 Dev', provider:'cloudflare', adapter:'flux2-dev', apiModel:'@cf/black-forest-labs/flux-2-dev'},
    'pollinations-klein': {label:'Pollinations - Klein', provider:'pollinations', adapter:'pollinations-klein', apiModel:'klein'},
    'pollinations-nanobanana-2': {label:'Pollinations - Nano Banana 2', provider:'pollinations', adapter:'pollinations-klein', apiModel:'nanobanana-2'},
    'pollinations-gptimage': {label:'Pollinations - GPT Image', provider:'pollinations', adapter:'pollinations-klein', apiModel:'gptimage'},
    'aihorde-auto': {label:'AI Horde - Auto / active model', provider:'aihorde', adapter:'aihorde-sd', apiModel:''}
  };
  const modeMeta = {fast:'Быстро',quality:'Качество',experimental:'Экспериментальный'};
  let settings = null;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = (provider) => provider + '-' + Date.now() + '-' + Math.random().toString(36).slice(2,9);

  async function jsonFetch(url, options={}) {
    const res = await fetch(url, {...options, cache:'no-store'});
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
    return body;
  }

  async function load() {
    setSaveStatus('Загрузка...', '');
    try {
      const body = await jsonFetch(SETTINGS_URL + '?action=get');
      settings = body.settings;
      render();
      setSaveStatus('Серверная конфигурация загружена.', 'good');
    } catch (e) {
      setSaveStatus('Ошибка загрузки: ' + e.message, 'bad');
    }
  }

  function render() {
    renderModes(); renderModels(); renderProviders();
  }

  function renderModes() {
    const keys = Object.keys(modelMeta);
    $('modes').innerHTML = Object.keys(modeMeta).map(mode => `<div class="field"><label>${esc(modeMeta[mode])}</label><select class="select" data-mode="${mode}">${keys.map(key => `<option value="${key}" ${settings.modeModels?.[mode]===key?'selected':''}>${esc(modelMeta[key].label)}</option>`).join('')}</select></div>`).join('');
    document.querySelectorAll('[data-mode]').forEach(el => el.addEventListener('change', () => {settings.modeModels[el.dataset.mode]=el.value; dirty();}));
  }

  function renderModels() {
    $('models').innerHTML = Object.entries(modelMeta).map(([key,m]) => `<div class="credential">
      <div class="credential-head"><div><div class="credential-title">${esc(m.label)}</div><div class="sub">provider=${esc(m.provider)} - adapter=${esc(m.adapter)}</div></div><label class="pill"><input type="checkbox" data-model-enabled="${key}" ${settings.enabledModels?.[key]!==false?'checked':''}> Включена</label></div>
      <div class="field"><label>API model override</label><input class="input mono" data-model-override="${key}" value="${esc(settings.modelOverrides?.[key] || '')}" placeholder="${esc(m.apiModel || 'auto')}"></div>
    </div>`).join('');
    document.querySelectorAll('[data-model-enabled]').forEach(el => el.addEventListener('change',()=>{settings.enabledModels[el.dataset.modelEnabled]=el.checked;dirty();}));
    document.querySelectorAll('[data-model-override]').forEach(el => el.addEventListener('input',()=>{settings.modelOverrides[el.dataset.modelOverride]=el.value;dirty();}));
  }

  function renderProviders() {
    $('providers').innerHTML = Object.entries(providersMeta).map(([provider,meta]) => {
      const rows = (settings.credentials||[]).filter(c=>c.provider===provider);
      return `<div class="provider"><div class="provider-title"><div><div class="credential-title">${esc(meta.label)}</div><div class="sub">${esc(meta.desc)}</div></div><button class="button" data-add="${provider}" type="button">Добавить</button></div><div class="grid">${rows.length?rows.map(credentialHtml).join(''):'<div class="empty">Нет credentials.</div>'}</div></div>`;
    }).join('');

    document.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click',()=>addCredential(btn.dataset.add)));
    document.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click',()=>removeCredential(btn.dataset.remove)));
    document.querySelectorAll('[data-verify]').forEach(btn => btn.addEventListener('click',()=>verifyCredential(btn.dataset.verify)));
    document.querySelectorAll('[data-cred-field]').forEach(el => el.addEventListener('input',()=>patchCredential(el.dataset.id, el.dataset.credField, el.type==='checkbox'?el.checked:el.value)));
    document.querySelectorAll('[data-cred-enabled]').forEach(el => el.addEventListener('change',()=>patchCredential(el.dataset.id,'enabled',el.checked)));
  }

  function credentialHtml(c) {
    const saved = c.hasApiKey === true;
    return `<div class="credential" data-card="${esc(c.id)}">
      <div class="credential-head"><div><div class="credential-title">${esc(c.label || c.id)}</div><span class="pill ${saved?'good':''}">${saved?'Ключ сохранен':'Ключ не задан'}</span></div><label class="pill"><input type="checkbox" data-cred-enabled data-id="${esc(c.id)}" ${c.enabled!==false?'checked':''}> Fallback</label></div>
      <div class="row">
        <div class="field"><label>Название</label><input class="input" data-cred-field="label" data-id="${esc(c.id)}" value="${esc(c.label||'')}"></div>
        ${c.provider==='cloudflare'?`<div class="field"><label>Account ID</label><input class="input mono" data-cred-field="accountId" data-id="${esc(c.id)}" value="${esc(c.accountId||'')}" placeholder="32 hex символа"></div>`:'<div></div>'}
      </div>
      <div class="field"><label>${c.provider==='cloudflare'?'API Token':'API Key'}</label><input class="input mono" type="password" autocomplete="off" data-cred-field="apiKey" data-id="${esc(c.id)}" value="" placeholder="${saved?'Сохранен на сервере - оставьте пустым':'Введите ключ'}"></div>
      <div class="actions"><button class="button" type="button" data-verify="${esc(c.id)}">Проверить</button><button class="button danger" type="button" data-remove="${esc(c.id)}">Удалить</button><div class="status" id="status-${esc(c.id)}"></div></div>
    </div>`;
  }

  function addCredential(provider) {
    settings.credentials.push({id:uid(provider),provider,label:providersMeta[provider].label,enabled:true,apiKey:'',hasApiKey:false,accountId:''}); renderProviders(); dirty();
  }
  function removeCredential(id) {settings.credentials=settings.credentials.filter(c=>c.id!==id);renderProviders();dirty();}
  function patchCredential(id,field,value) {const c=settings.credentials.find(x=>x.id===id);if(!c)return;c[field]=value;dirty();}
  function dirty(){setSaveStatus('Есть несохраненные изменения.','');}
  function setSaveStatus(text,cls){$('saveStatus').textContent=text;$('saveStatus').className='save-status '+(cls||'');}

  async function save() {
    setSaveStatus('Сохранение...', ''); $('saveBtn').disabled=true;
    try {
      const payload = JSON.parse(JSON.stringify(settings));
      const body = await jsonFetch(SETTINGS_URL+'?action=save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      settings=body.settings;render();setSaveStatus('Сохранено на сервере. Повторно вводить ключи при генерации не нужно.','good');
    } catch(e){setSaveStatus('Ошибка сохранения: '+e.message,'bad');}
    finally{$('saveBtn').disabled=false;}
  }

  async function verifyCredential(id) {
    const c=settings.credentials.find(x=>x.id===id); if(!c)return;
    const status=$('status-'+id); status.textContent='Проверка...'; status.className='status';
    const form=new FormData(); form.append('provider',c.provider);
    if(c.apiKey && c.apiKey.trim()) { form.append('api_key',c.apiKey.trim()); if(c.accountId) form.append('account_id',c.accountId.trim()); }
    else form.append('credential_id',c.id);
    try {
      const body=await jsonFetch(IMAGE_API+'?action=verify',{method:'POST',body:form});
      status.textContent=body.message+(body.details?(' - '+Object.entries(body.details).filter(([,v])=>v!==null&&v!=='').map(([k,v])=>k+': '+v).join(' - ')):''); status.className='status good';
    } catch(e){status.textContent=e.message;status.className='status bad';}
  }

  $('saveBtn').addEventListener('click',save); $('reloadBtn').addEventListener('click',load); load();
})();
</script>
</body>
</html>
