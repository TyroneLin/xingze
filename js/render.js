/* Renders CMS-editable lists from /data/*.json. Static HTML stays as no-JS / SEO fallback. */
(function(){
 var s=document.currentScript,base=s.getAttribute('data-base')||'',list=s.getAttribute('data-list');
 var PH='待 Leanne 素材';
 function e(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
 function img(src,alt){return src?'<img src="'+base+e(src.replace(/^\//,''))+'" alt="'+e(alt)+'" loading="lazy">':'<div class="ph" role="img" aria-label="'+PH+'"><span class="ph-t">'+PH+'</span>'+(alt&&alt!==PH?'<span class="ph-c">'+e(alt)+'</span>':'')+'</div>'}
 function orig(t,o){return e(t).replace(/\{(o\d)\}/g,function(m,k){return '<span class="swap" data-swap="origin" title="产地名待 Leanne 确认">'+e(o[k])+'</span>'})}
 function tags(a,o){return '<div class="tags">'+a.map(function(t){return '<span class="tag">'+orig(t,o||{})+'</span>'}).join('')+'</div>'}
 function filters(){document.querySelectorAll('.chips').forEach(function(c){c.addEventListener('click',function(ev){var b=ev.target.closest('.chip');if(!b)return;c.querySelectorAll('.chip').forEach(function(x){x.classList.toggle('on',x===b)});var f=b.getAttribute('data-filter'),g=c.nextElementSibling;g&&g.querySelectorAll('[data-cat]').forEach(function(n){n.hidden=!(f==='all'||n.getAttribute('data-cat')===f)})})})}
 var R={
  products:function(d){var o=d.origins||{};document.querySelectorAll('[data-render=products]').forEach(function(g){var lim=+g.getAttribute('data-limit')||1e9;g.innerHTML=d.items.slice(0,lim).map(function(i){return '<article class="card" data-cat="'+e(i.category)+'">'+img(i.image,i.imageAlt)+'<div class="card-b">'+tags(i.tags,o)+'<p class="meta">'+orig(i.spec,o)+' · 编号 '+e(i.id)+'</p><h3>'+e(i.title)+'</h3><p>'+e(i.desc)+'</p><div class="card-f"><span class="muted">纯私域交流 · 无线上标价</span><a class="btn sm" href="#wechat">'+e(i.cta)+' →</a></div></div></article>'}).join('')})},
  finds:function(d){var g=document.querySelector('[data-render=finds]');if(!g)return;g.innerHTML=d.items.map(function(i){return '<article class="post" data-cat="'+e(i.category)+'"><header><span class="avatar" aria-hidden="true">泽</span><div><strong>Leanne @星泽</strong> <span class="tag">主理人</span><p class="meta">'+e(i.location)+' · '+e(i.time)+'</p></div></header><p>'+e(i.text)+'</p><div class="post-im n'+i.images.length+'">'+i.images.map(function(m){return img(m.src,m.alt)}).join('')+'</div>'+tags(i.tags)+'<a class="btn ghost sm" href="#wechat">与 Leanne 聊聊</a></article>'}).join('')},
  'hk-agent':function(d){function set(k,h){var n=document.querySelector('[data-render='+k+']');if(n)n.innerHTML=h}
   set('hk-badges',d.badges.map(function(b){return '<span class="tag">'+e(b)+'</span>'}).join(''));
   set('hk-steps',d.steps.map(function(s){return '<div class="box step"><span class="num">'+e(s.n)+'</span><h3><span class="swap" data-swap="hk-step-title" title="文案待 Leanne 确认">'+e(s.title)+'</span></h3><p>'+e(s.text)+'</p></div>'}).join(''));
   set('hk-standards',d.standards.map(function(s){return '<div class="box"><h3>'+e(s.title)+'</h3><p>'+e(s.text)+'</p><span class="meta">'+e(s.tag)+'</span></div>'}).join(''));
   set('hk-faq',d.faq.map(function(f){return '<details><summary>'+e(f.q)+'</summary><p>'+e(f.a)+'</p></details>'}).join(''))}
 };
 filters();
 if(!list||!window.fetch)return;
 fetch(base+'data/'+list+'.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw r;return r.json()}).then(function(d){R[list](d)}).catch(function(){/* keep static fallback */});
})();
