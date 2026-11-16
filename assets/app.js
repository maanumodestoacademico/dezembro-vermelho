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
    openDialog('Minha conta',`<p><b>${esc(DV.profile.nome)}</b><br>${esc(DV.profile.campus||'')}</p><button class="button" data-dv="out">Sair da conta</button>`)};
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
  if(!$('[data-nav=guia]'))$('nav').insertAdjacentHTML('afterbegin','<a href="#guia" data-nav="guia"><span>?</span> Como funciona</a>');
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
  if(v==='guia')return guiaView();
  if(v==='admin')return isAdm()?adminView():(location.hash='#biblioteca',true);
  if(v==='editor'&&!isAdm())return location.hash='#jogar/'+(location.hash.split('/')[1]||'pares'),true;
  return false;
}

const slug=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'').slice(0,60);
const loginEmail=t=>{t=t.trim();if(t.includes('@'))return t;const k=slug(t);return k?`${k}@${(window.DV_CONFIG||{}).dominio||'gmail.com'}`:''};


function guiaView(){
  const card=(t,h,b)=>`<article class="content-card"><span class="tag">${t}</span><h2>${h}</h2>${b}</article>`;
  const grid='display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:28px';
  const h2=t=>`<h2 style="margin:8px 0 14px">${t}</h2>`;
  return show(`<div class="page-heading"><div><p class="eyebrow">BEM-VINDO(A)</p><h1>Olá, ${esc(DV.profile.nome.split(' ')[0])}!</h1><p>Esta pesquisa usa quatro jogos curtos sobre prevenção, testagem e cuidado em saúde. Jogue no seu ritmo: não há resposta secreta nem julgamento, e a participação é voluntária.</p></div></div>
  ${h2('Como usar a página')}
  <div style="${grid}">
  ${card('Menu','Menu lateral','<p><b>Biblioteca de jogos</b>: escolha um jogo.<br><b>Conteúdos educativos</b>: leituras sobre os temas.<br><b>Resultados</b>: suas rodadas.<br><b>Informações e serviços</b>: onde buscar atendimento e glossário.<br><b>Como funciona</b>: esta tela.</p>')}
  ${card('Resultados','O que fica salvo','<p>Cada rodada guarda sua pontuação, tentativas, tempo e se você concluiu. Você pode jogar de novo quando quiser. Só você e a equipe da pesquisa veem esses dados, e não há ranking público.</p>')}
  ${card('Conta','Sua conta','<p>Clique no círculo <b>DV</b>, no canto superior, para ver seu nome e sair. Para voltar, entre com seu nome completo e sua senha.</p>')}
  </div>
  ${h2('Como jogar')}
  <div style="${grid}">
  ${card('Memória','Encontre os pares','<p>Vire duas cartas por vez. Se forem iguais, o par fica aberto e revela uma informação sobre o cuidado. Se forem diferentes, tente outra combinação. O jogo termina quando todos os pares forem encontrados.</p>')}
  ${card('Busca visual','Encontre os detalhes','<p>Leia as dicas abaixo da cena: cada uma descreve um objeto. Encontre e toque nos nove objetos escondidos no campus. Cada acerto abre uma explicação e marca a dica como concluída. Tocar fora dos objetos conta como tentativa.</p>')}
  ${card('Caça-palavras','Caça-palavras do cuidado','<p>Procure na grade as palavras da lista. Toque nas letras <b>uma a uma</b>, em linha reta (horizontal, vertical ou diagonal), da primeira à última letra. Ao completar uma palavra da lista, ela é marcada. Tocar de novo na última letra desfaz, e o botão <b>Limpar seleção</b> recomeça. Você também pode digitar a palavra no campo abaixo da grade.</p>')}
  ${card('Roleta','Mito ou Verdade','<p>Gire a roleta, leia a afirmação e responda. Cada resposta libera uma explicação, sem julgamento.</p>')}
  </div>
  <a class="button primary" href="#biblioteca">Começar a jogar</a>`);
}

function authView(){
  const n=DV.mode==='novo',tcle=(window.DV_CONFIG||{}).tcle;
  gateShow(`<div class="page-heading"><div><p class="eyebrow">DEZEMBRO VERMELHO · UNILEÃO</p><h1>${n?'Criar meu acesso':'Entrar'}</h1><p>${n?'Informe seu nome completo, seu campus e crie uma senha. Pesquisa para maiores de 18 anos.':'Entre com seu nome completo e sua senha.'}</p></div></div>
  <form class="panel form-fields auth" id="auth">
  <label for="a-nome">Nome completo</label><input id="a-nome" required maxlength="120" autocomplete="username">
  ${n?`<label for="a-campus">Campus</label><input id="a-campus" required maxlength="60">`:''}
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
        const{data,error}=await T(DV.sb.auth.signUp({email,password,options:{data:{nome,campus:$('#a-campus').value.trim(),consent:$('#a-ok').checked}}}));
        if(error)throw error;
        if(!data.session){gateShow('<div class="empty"><h2>Quase lá</h2><p class="muted">O Supabase está exigindo confirmação por e-mail. A equipe precisa desativar “Confirm email” em Authentication &gt; Sign In / Providers &gt; Email.</p></div>');return}
      }else{const{error}=await T(DV.sb.auth.signInWithPassword({email,password}));if(error)throw error}
      await T(DV.load());location.hash='#guia';route();
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
  const by0=Object.fromEntries(P.map(x=>[x.id,x])),RR=R.filter(x=>by0[x.user_id]).reverse();
  const jogos=[...new Set(RR.map(x=>x.jogo))].sort(),fmt=t=>Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
  const nrm=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const resumo=jogos.map(j=>{const L=RR.filter(x=>x.jogo===j);return`<tr><td><b>${esc(j)}</b></td><td>${new Set(L.map(x=>x.user_id)).size}</td><td>${L.length}</td><td>${L.filter(x=>x.concluido).length}</td><td>${Math.round(L.reduce((a,x)=>a+x.pontos,0)/L.length)}</td></tr>`}).join('')||'<tr><td colspan="5">Sem rodadas ainda.</td></tr>';
  show(`<div class="page-heading"><div><p class="eyebrow">ADMINISTRAÇÃO</p><h1>Pesquisa Dezembro Vermelho</h1><p>Dados individuais de cada participante. Visível apenas para administradores.</p></div></div>
  <div class="overview"><div class="stat"><div><b>${P.length}</b><small>Participantes</small></div></div><div class="stat"><div><b>${elig.length}</b><small>Com jogo concluído</small></div></div><div class="stat"><div><b>${R.length}</b><small>Rodadas registradas</small></div></div></div>
  <div class="editor-actions" style="margin:0 0 20px"><button class="button primary" data-dv="csvp">↓ CSV participantes</button><button class="button primary" data-dv="csvw">↓ CSV consolidado (1 linha por pessoa)</button><button class="button primary" data-dv="csvr">↓ CSV todas as rodadas</button><button class="button primary" data-dv="csvf">↓ CSV do filtro atual</button><button class="button" data-dv="draw">Sortear entre elegíveis</button><button class="button" data-dv="pub">Publicar jogos aos participantes</button></div>
  <div class="panel results-table"><table><thead><tr><th>Participante</th><th>Campus</th><th>Rodadas</th><th>Concluídas</th><th>Pontos</th></tr></thead><tbody>${P.map(x=>{const a=agg[x.id]||{n:0,c:0,pts:0};return`<tr><td><b>${esc(x.nome)}</b></td><td>${esc(x.campus||'')}</td><td>${a.n}</td><td>${a.c}</td><td>${a.pts}</td></tr>`}).join('')||'<tr><td colspan="5">Nenhum participante ainda.</td></tr>'}</tbody></table></div>
  <h2 style="margin:28px 0 12px">Resumo por jogo</h2>
  <div class="panel results-table"><table><thead><tr><th>Jogo</th><th>Participantes</th><th>Rodadas</th><th>Concluídas</th><th>Pontos (média)</th></tr></thead><tbody>${resumo}</tbody></table></div>
  <h2 style="margin:28px 0 12px">Resultados de todos</h2>
  <div class="panel"><div class="two-fields form-fields"><div><label for="f-jogo">Jogo</label><select id="f-jogo"><option value="">Todos</option>${jogos.map(j=>`<option>${esc(j)}</option>`).join('')}</select></div><div><label for="f-nome">Participante</label><input id="f-nome" placeholder="Buscar pelo nome"></div></div><p class="tiny" id="f-count"></p></div>
  <div class="panel results-table"><table><thead><tr><th>Data</th><th>Participante</th><th>Campus</th><th>Jogo</th><th>Pontos</th><th>Tentativas</th><th>Tempo</th><th>Concluído</th></tr></thead><tbody id="f-body"></tbody></table></div>
  <div class="note">Pontuação e tempo são calculados no navegador do participante. Os jogos editados por você só chegam aos participantes depois de “Publicar jogos”.</div>`);
  const redraw=()=>{const j=$('#f-jogo').value,q=nrm($('#f-nome').value.trim());
    DV.F=RR.filter(x=>(!j||x.jogo===j)&&nrm(by0[x.user_id].nome).includes(q));
    $('#f-count').textContent=DV.F.length+' rodada(s)'+(DV.F.length>300?' — mostrando as 300 mais recentes; o CSV leva todas.':'');
    $('#f-body').innerHTML=DV.F.slice(0,300).map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('pt-BR')}</td><td>${esc(by0[x.user_id].nome)}</td><td>${esc(by0[x.user_id].campus||'')}</td><td>${esc(x.jogo)}</td><td>${x.pontos}</td><td>${x.tentativas}</td><td>${fmt(x.tempo_s)}</td><td>${x.concluido?'sim':'não'}</td></tr>`).join('')||'<tr><td colspan="8">Nenhuma rodada encontrada.</td></tr>'};
  $('#f-jogo').onchange=redraw;$('#f-nome').oninput=redraw;redraw();
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
  if(k==='csvp')csv(DV.P,[['id',x=>x.id],['nome',x=>x.nome],['campus',x=>x.campus],['consentimento_em',x=>x.consentimento_em],['cadastro_em',x=>x.created_at],['rodadas',x=>DV.agg[x.id]?.n||0],['concluidas',x=>DV.agg[x.id]?.c||0],['pontos',x=>DV.agg[x.id]?.pts||0]],'participantes.csv');
  if(k==='csvr'||k==='csvf')csv(k==='csvf'?DV.F:DV.R.filter(x=>by[x.user_id]),[['user_id',x=>x.user_id],['nome',x=>by[x.user_id].nome],['campus',x=>by[x.user_id].campus],['jogo',x=>x.jogo],['pontos',x=>x.pontos],['tentativas',x=>x.tentativas],['tempo_s',x=>x.tempo_s],['concluido',x=>x.concluido?'sim':'não'],['data',x=>x.created_at]],k==='csvf'?'resultados-filtrados.csv':'resultados.csv');
  if(k==='csvw'){const jg=[...new Set(DV.R.map(x=>x.jogo))].sort(),m={};
    DV.R.forEach(x=>{const a=m[x.user_id+'|'+x.jogo]||(m[x.user_id+'|'+x.jogo]={n:0,best:0,ok:false});a.n++;a.best=Math.max(a.best,x.pontos);a.ok=a.ok||x.concluido});
    csv(DV.P,[['nome',x=>x.nome],['campus',x=>x.campus],['cadastro_em',x=>x.created_at],...jg.flatMap(j=>[[j+' · rodadas',x=>m[x.id+'|'+j]?.n||0],[j+' · melhor pontuação',x=>m[x.id+'|'+j]?.best||0],[j+' · concluído',x=>m[x.id+'|'+j]?.ok?'sim':'não']])],'consolidado.csv')}
  if(k==='draw'){const el=DV.P.filter(x=>DV.agg[x.id]?.c);if(!el.length)return toast('Ninguém concluiu um jogo ainda.');
    const w=el[crypto.getRandomValues(new Uint32Array(1))[0]%el.length];
    openDialog('Sorteio',`<p><b>${esc(w.nome)}</b><br>${esc(w.campus||'')}</p><p class="tiny">${el.length} participantes elegíveis (ao menos um jogo concluído). O resultado não é gravado.</p>`)}
  if(k==='pub'){const{error}=await DV.sb.from('config').upsert({id:1,conteudo:{games},atualizado_em:new Date().toISOString()});toast(error?'Erro ao publicar: '+error.message:'Jogos publicados para os participantes.')}
});
window.addEventListener('load',()=>DV.init());
