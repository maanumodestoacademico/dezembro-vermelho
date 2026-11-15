/* Dezembro Vermelho · contas, dados individuais e administração (Supabase) */
const DV={ready:false,mode:'entrar',user:null,profile:null,err:''};
const T=p=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('Tempo esgotado: o Supabase não respondeu. Verifique a internet e tente de novo.')),20000))]);
const isAdm=()=>DV.profile?.role==='admin';
(()=>{const s=document.createElement('style');s.textContent='body:not(.is-admin) [href^="#editor"],body:not(.is-admin) [data-action="export-all"],body:not(.is-admin) .tabs,body:not(.is-admin) .save-state,body:not(.is-admin) .admin-only{display:none!important}#toast{z-index:60!important}.auth{max-width:520px}.auth>.button{width:100%;margin-top:18px}.check{display:flex;gap:10px;align-items:flex-start;margin-top:16px;font-size:12px}.check input{width:auto;min-height:0;margin-top:3px}.link{background:none;border:0;color:var(--red);text-decoration:underline;padding:0;font-size:12px}';document.head.append(s)})();

DV.init=async()=>{
  const c=window.DV_CONFIG||{};
  if(!c.url||c.url.includes('SEU-PROJETO')||!window.supabase){DV.ready=true;DV.err='Preencha assets/config.js com a URL e a chave pública do Supabase (veja o README).';return route()}
  try{DV.sb=supabase.createClient(c.url,c.key);
  $('#participant').onclick=()=>{if(!DV.profile){location.hash='#entrar';return}
    openDialog('Minha conta',`<p><b>${esc(DV.profile.nome)}</b><br>${esc(DV.profile.faixa_etaria||'')}</p><button class="button" data-dv="out">Sair da conta</button>`)};
  await DV.load()}catch(e){DV.err='Erro ao conectar ao Supabase: '+(e.message||e)}
  DV.ready=true;route();
};
DV.load=async()=>{
  const{data:{session}}=await DV.sb.auth.getSession();
  DV.user=session?.user||null;DV.profile=null;if(!DV.user)return;
  const{data:p,error:pe}=await DV.sb.from('profiles').select('*').eq('id',DV.user.id).maybeSingle();
  if(pe)throw pe;
  DV.profile=p;if(!p)return;
  const adm=p.role==='admin';
  document.body.classList.toggle('is-admin',adm);
  participant=p.nome;
  $('#whoami').textContent=adm?'Administração':p.nome.split(' ')[0];
  if(adm&&!$('[data-nav=admin]'))$('nav').insertAdjacentHTML('beforeend','<a href="#admin" data-nav="admin"><span>⚙</span> Administração</a>');
  // Conteúdo dos jogos: participantes sempre recebem a versão publicada pelo admin (ou a padrão)
  const{data:c}=await DV.sb.from('config').select('conteudo').eq('id',1).maybeSingle();
  if(!(adm&&localStorage.getItem('dv-studio-v1'))){
    games=clone(DEFAULT);
    try{(c?.conteudo?.games||[]).forEach(r=>{const i=games.findIndex(g=>g.id===r.id);if(i>=0)games[i]=cleanGame(r)})}catch(e){games=clone(DEFAULT)}
  }
  const{data:rs}=await DV.sb.from('resultados').select('*').eq('user_id',DV.user.id).order('created_at',{ascending:false});
  results=(rs||[]).map(r=>({game:r.jogo,score:r.pontos,attempts:r.tentativas,time:r.tempo_s,completed:r.concluido,participant:p.nome,date:r.created_at}));
};
DV.save=async r=>{
  if(!DV.user||isAdm())return;
  const g=games.find(x=>x.title===r.game);
  const{error}=await DV.sb.from('resultados').insert({jogo_id:g?.id||selected,jogo:r.game,pontos:r.score,tentativas:r.attempts,tempo_s:r.time,concluido:r.completed});
  if(error)toast('Não foi possível salvar seu resultado. Verifique a conexão e jogue novamente.');
};

const show=h=>{$('#main').innerHTML=h;const v=location.hash.slice(1).split('/')[0];$$('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===v));$('#main').focus();return true};
const gateShow=h=>{document.body.classList.remove('dv-ok');$('#dvgate').innerHTML='<div class="dvbox">'+h+'</div>';return true};
function DVgate(){
  const v=location.hash.slice(1).split('/')[0]||'biblioteca';
  if(!DV.ready)return gateShow('<p class="muted">Carregando…</p>');
  if(DV.err)return gateShow(`<div class="empty"><h2>Configuração pendente</h2><p class="muted">${esc(DV.err)}</p></div>`);
  if(!DV.profile)return DV.user?gateShow('<div class="empty"><h2>Perfil não encontrado</h2><p class="muted">Saia e entre novamente ou fale com a equipe da pesquisa.</p><button class="button" data-dv="out">Sair</button></div>'):authView();
  document.body.classList.add('dv-ok');
  if(v==='admin')return isAdm()?adminView():(location.hash='#biblioteca',true);
  if(v==='editor'&&!isAdm())return location.hash='#jogar/'+(location.hash.split('/')[1]||'pares'),true;
  return false;
}

const slug=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'').slice(0,60);
const loginEmail=t=>{t=t.trim();if(t.includes('@'))return t;const k=slug(t);return k?`${k}@${(window.DV_CONFIG||{}).dominio||'gmail.com'}`:''};

function authView(){
  const n=DV.mode==='novo',tcle=(window.DV_CONFIG||{}).tcle;
  gateShow(`<div class="page-heading"><div><p class="eyebrow">DEZEMBRO VERMELHO · UNILEÃO</p><h1>${n?'Criar meu acesso':'Entrar'}</h1><p>${n?'Informe seu nome completo, sua faixa etária e crie uma senha. Pesquisa para maiores de 18 anos.':'Entre com seu nome completo e sua senha.'}</p></div></div>
  <form class="panel form-fields auth" id="auth">
  <label for="a-nome">Nome completo</label><input id="a-nome" required maxlength="120" autocomplete="username">
  ${n?`<label for="a-faixa">Faixa etária</label><select id="a-faixa"><option>18 a 24 anos</option><option>25 a 34 anos</option><option>35 a 44 anos</option><option>45 anos ou mais</option></select>`:''}
  <label for="a-pass">Senha${n?' (mínimo 8 caracteres)':''}</label><input id="a-pass" type="password" required minlength="${n?8:1}" autocomplete="${n?'new-password':'current-password'}">
  ${n?`<label class="check"><input id="a-ok" type="checkbox" required><span>Tenho 18 anos ou mais, li ${tcle?`<a href="${esc(tcle)}" target="_blank" rel="noopener">o Termo de Consentimento (TCLE)</a>`:'o Termo de Consentimento (TCLE)'} e concordo em participar voluntariamente. Não informo CPF, telefone ou dados de saúde.</span></label>`:''}
  <p id="a-msg" class="tiny" role="alert" style="color:var(--red);margin-top:12px"></p>
  <button class="button primary">${n?'Criar acesso':'Entrar'}</button>
  <p class="tiny" style="margin-top:14px">${n?'Já tem acesso?':'Primeira vez aqui?'} <button type="button" class="link" data-dv="mode" data-m="${n?'entrar':'novo'}">${n?'Entrar':'Criar acesso'}</button></p></form>`);
  $('#auth').onsubmit=async e=>{
    e.preventDefault();const btn=e.target.querySelector('button.primary');btn.disabled=true;$('#a-msg').textContent='';
    const nome=$('#a-nome').value.trim().replace(/\s+/g,' '),password=$('#a-pass').value,email=loginEmail(nome);
    try{
      if(!email||(n&&nome.includes('@')))throw new Error(n?'Digite seu nome completo, sem @.':'Informe seu nome.');
      if(n){
        const{data,error}=await T(DV.sb.auth.signUp({email,password,options:{data:{nome,faixa:$('#a-faixa').value,consent:$('#a-ok').checked}}}));
        if(error)throw error;
        if(!data.session){gateShow('<div class="empty"><h2>Quase lá</h2><p class="muted">O Supabase está exigindo confirmação por e-mail. A equipe precisa desativar “Confirm email” em Authentication &gt; Sign In / Providers &gt; Email.</p></div>');return}
      }else{const{error}=await T(DV.sb.auth.signInWithPassword({email,password}));if(error)throw error}
      await T(DV.load());location.hash='#biblioteca';route();
    }catch(err){console.error(err);$('#a-msg').textContent=/Invalid login/i.test(err.message)?'Nome ou senha incorretos.':/already registered/i.test(err.message)?'Já existe um acesso com esse nome. Se é você, use Entrar; se não, acrescente um sobrenome.':err.message;btn.disabled=false}
  };
}

async function adminView(){
  show('<p class="muted">Carregando dados…</p>');
  const[p,r]=await Promise.all([DV.sb.from('profiles').select('*').order('created_at').range(0,9999),DV.sb.from('resultados').select('*').order('created_at').range(0,9999)]);
  const er=p.error||r.error;
  if(er)return show(`<div class="empty"><h2>Não foi possível carregar</h2><p class="muted">${esc(er.message)}</p></div>`);
  const P=DV.P=p.data.filter(x=>x.role!=='admin'),R=DV.R=r.data,agg=DV.agg={};
  R.forEach(x=>{const a=agg[x.user_id]||(agg[x.user_id]={n:0,c:0,pts:0});a.n++;a.c+=x.concluido?1:0;a.pts+=x.pontos});
  const elig=P.filter(x=>agg[x.id]?.c);
  show(`<div class="page-heading"><div><p class="eyebrow">ADMINISTRAÇÃO</p><h1>Pesquisa Dezembro Vermelho</h1><p>Dados individuais de cada participante. Visível apenas para administradores.</p></div></div>
  <div class="overview"><div class="stat"><div><b>${P.length}</b><small>Participantes</small></div></div><div class="stat"><div><b>${elig.length}</b><small>Com jogo concluído</small></div></div><div class="stat"><div><b>${R.length}</b><small>Rodadas registradas</small></div></div></div>
  <div class="editor-actions" style="margin:0 0 20px"><button class="button primary" data-dv="csvp">↓ CSV participantes</button><button class="button primary" data-dv="csvr">↓ CSV resultados</button><button class="button" data-dv="draw">Sortear entre elegíveis</button><button class="button" data-dv="pub">Publicar jogos aos participantes</button></div>
  <div class="panel results-table"><table><thead><tr><th>Participante</th><th>Faixa</th><th>Rodadas</th><th>Concluídas</th><th>Pontos</th></tr></thead><tbody>${P.map(x=>{const a=agg[x.id]||{n:0,c:0,pts:0};return`<tr><td><b>${esc(x.nome)}</b></td><td>${esc(x.faixa_etaria)}</td><td>${a.n}</td><td>${a.c}</td><td>${a.pts}</td></tr>`}).join('')||'<tr><td colspan="5">Nenhum participante ainda.</td></tr>'}</tbody></table></div>
  <div class="note">Pontuação e tempo são calculados no navegador do participante. Os jogos editados por você só chegam aos participantes depois de “Publicar jogos”.</div>`);
}

function csv(rows,cols,name){
  const q=v=>{v=v==null?'':String(v);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return'"'+v.replace(/"/g,'""')+'"'};
  const t='\ufeff'+[cols.map(c=>q(c[0])).join(';'),...rows.map(r=>cols.map(c=>q(c[1](r))).join(';'))].join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-dv]');if(!b)return;const k=b.dataset.dv;
  if(k==='mode'){DV.mode=b.dataset.m;authView()}
  if(k==='out'){await DV.sb.auth.signOut();sessionStorage.clear();location.hash='';location.reload()}
  if(!isAdm())return;
  const by=Object.fromEntries((DV.P||[]).map(x=>[x.id,x]));
  if(k==='csvp')csv(DV.P,[['id',x=>x.id],['nome',x=>x.nome],['faixa_etaria',x=>x.faixa_etaria],['consentimento_em',x=>x.consentimento_em],['cadastro_em',x=>x.created_at],['rodadas',x=>DV.agg[x.id]?.n||0],['concluidas',x=>DV.agg[x.id]?.c||0],['pontos',x=>DV.agg[x.id]?.pts||0]],'participantes.csv');
  if(k==='csvr')csv(DV.R.filter(x=>by[x.user_id]),[['user_id',x=>x.user_id],['nome',x=>by[x.user_id].nome],['faixa_etaria',x=>by[x.user_id].faixa_etaria],['jogo',x=>x.jogo],['pontos',x=>x.pontos],['tentativas',x=>x.tentativas],['tempo_s',x=>x.tempo_s],['concluido',x=>x.concluido?'sim':'não'],['data',x=>x.created_at]],'resultados.csv');
  if(k==='draw'){const el=DV.P.filter(x=>DV.agg[x.id]?.c);if(!el.length)return toast('Ninguém concluiu um jogo ainda.');
    const w=el[crypto.getRandomValues(new Uint32Array(1))[0]%el.length];
    openDialog('Sorteio',`<p><b>${esc(w.nome)}</b><br>${esc(w.faixa_etaria)}</p><p class="tiny">${el.length} participantes elegíveis (ao menos um jogo concluído). O resultado não é gravado.</p>`)}
  if(k==='pub'){const{error}=await DV.sb.from('config').upsert({id:1,conteudo:{games},atualizado_em:new Date().toISOString()});toast(error?'Erro ao publicar: '+error.message:'Jogos publicados para os participantes.')}
});
window.addEventListener('load',()=>DV.init());
