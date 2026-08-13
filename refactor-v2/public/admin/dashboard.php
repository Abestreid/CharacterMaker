<?php
declare(strict_types=1);
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive">
<title>CharacterMaker - AI настройки</title>
<style>
:root{color-scheme:dark;--bg:#0b0c10;--panel:#13151b;--line:#2a2e39;--text:#f4f5f7;--muted:#9da3af;--accent:#8b7cf6;--good:#59c98b;--warn:#e7b45b;--bad:#ef6b73}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 Inter,system-ui,sans-serif}.shell{width:min(1000px,100%);margin:auto;padding:20px 14px 70px}.top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}.title{font-size:24px;font-weight:760}.sub{font-size:12px;color:var(--muted)}.btn{min-height:42px;border:1px solid var(--line);border-radius:12px;background:#191c24;color:var(--text);padding:0 13px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;font-weight:650}.grid{display:grid;gap:14px}.card{background:var(--panel);border:1px solid var(--line);border-radius:17px;padding:15px}.providers{grid-template-columns:repeat(2,minmax(0,1fr))}.provider{border:1px solid var(--line);border-radius:14px;background:#191c24;padding:13px}.provider h3{margin:0 0 4px;font-size:15px}.pill{display:inline-block;margin-top:8px;border-radius:99px;padding:4px 8px;font-size:11px;background:#232735;color:var(--muted)}.pill.good{background:rgba(89,201,139,.12);color:var(--good)}.models{grid-template-columns:repeat(3,minmax(0,1fr))}.model{border:1px solid var(--line);border-radius:13px;background:#191c24;padding:11px}.model b{display:block}.status{padding:11px 12px;border:1px solid var(--line);border-radius:13px;color:var(--muted)}.status.bad{color:var(--bad)}@media(max-width:720px){.providers,.models{grid-template-columns:1fr}.top{display:block}.top .btn{margin-top:12px}}
</style>
</head>
<body><div class="shell">
<div class="top"><div><div class="title">AI настройки</div><div class="sub">Рабочие провайдеры, подключения и модели CharacterMaker DEV.</div></div><div style="display:flex;gap:8px"><a class="btn" href="../">В CharacterMaker</a><a class="btn" href="index.php">Управление ключами</a></div></div>
<div class="grid">
<section class="card"><h2 style="margin-top:0">Провайдеры</h2><div class="grid providers" id="providers"><div class="status">Загрузка...</div></div></section>
<section class="card"><h2 style="margin-top:0">Модели</h2><div class="grid models" id="models"><div class="status">Загрузка...</div></div></section>
</div></div>
<script>
const SB='https://kszybiwhchwekpmramxn.supabase.co';
const KEY='sb_publishable_tA5m2UZGdHzPmjw_vC8c0A_HMCz4A8O';
const H={apikey:KEY,Authorization:'Bearer '+KEY};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{try{
 const [catalog,settingsRes]=await Promise.all([
   fetch(SB+'/rest/v1/catalog_options?select=catalog_id,id,label,value_text,metadata,sort_order,is_active&catalog_id=in.(ai_provider,ai_model)&is_active=eq.true&order=sort_order.asc',{headers:H}).then(r=>{if(!r.ok)throw new Error('Supabase '+r.status);return r.json()}),
   fetch('../api/ai-settings.php?action=get',{cache:'no-store'}).then(r=>r.json())
 ]);
 const providers=catalog.filter(x=>x.catalog_id==='ai_provider');
 const active=new Set(providers.map(x=>x.value_text||x.id));
 const credentials=settingsRes?.settings?.credentials||[];
 document.getElementById('providers').innerHTML=providers.map(p=>{
   const id=p.value_text||p.id;const rows=credentials.filter(c=>c.provider===id);const ready=rows.filter(c=>c.enabled!==false&&c.hasApiKey===true).length;
   return `<div class="provider"><h3>${esc(p.label)}</h3><div class="sub">${ready} активных подключений</div><span class="pill ${ready?'good':''}">${ready?'Готов':'Не настроен'}</span></div>`
 }).join('')||'<div class="status bad">Нет активных провайдеров.</div>';
 const models=catalog.filter(x=>x.catalog_id==='ai_model'&&active.has(x.metadata?.provider));
 document.getElementById('models').innerHTML=models.map(m=>`<div class="model"><span class="sub">${esc(providers.find(p=>(p.value_text||p.id)===m.metadata?.provider)?.label||m.metadata?.provider)}</span><b>${esc(m.label)}</b></div>`).join('')||'<div class="status">Нет моделей.</div>';
}catch(e){document.getElementById('providers').innerHTML=`<div class="status bad">${esc(e.message)}</div>`;document.getElementById('models').innerHTML='<div class="status bad">Не удалось загрузить каталог.</div>'}})();
</script></body></html>
