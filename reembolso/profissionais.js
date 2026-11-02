/* Profissionais: agrupados por terapia, cada um com o histórico completo da relação
   (horas, notas, pagamentos, reembolsos, o que está devendo, documentos e calendário). */
(window.__mods = window.__mods || []).push(function(App){
  var D = App.D, $ = App.$, $$ = App.$$, esc = App.esc, brl = App.brl, num = App.num, S = App.S, hh = App.hh, dataBR = App.dataBR, bool = App.bool, api = App.api, msgErro = App.msgErro;
  var ABAS = [['cad','Cadastro'], ['hist','Histórico'], ['sess','Sessões e calendário'], ['docs','Documentos']];

  // ------------------------------------------------------------ lista: uma linha por profissional, com filtro
  var COLS = [['nome','Profissional','l'], ['terapia','Terapia','l'], ['pagoTotal','Pago (histórico)','n'], ['pagoAno','Pago no ano','n'], ['reembAno','Reembolsado no ano','n'], ['horas','Horas (no app)','n'], ['abertos','Em aberto','n']];
  function linhasProf(P){
    var ano = App.hojeISO().slice(0,4);
    return P.map(function(p){
      var r = D.resumoProf(p), pagoAno = 0, reembAno = 0, valAberto = 0;
      r.lan.forEach(function(l){ if(l.ciclo.slice(0,4)===ano){ pagoAno += num(l.valor)||0; reembAno += num(l.vReembolsado)||0; } });
      r.abertos.forEach(function(x){ valAberto += num(x.l.valor)||0; });
      return { p:p, r:r, nome:p.nome||p.apelido, terapia:p.terapia||'', pagoTotal:r.pago, pagoAno:pagoAno, reembAno:reembAno, horas:r.horas, abertos:r.abertos.length, valAberto:valAberto, pend:D.pendCadastro(p, P).length };
    });
  }
  function corpoTabela(){
    var P = S.M.profissionais, q = App.digitos(''), txt = String(S.pfQ||'').trim().toLowerCase(), ft = S.pfT||'', sit = S.pfSit||'ativos';
    var semAc = function(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); };
    var L = linhasProf(P).filter(function(x){
      if(ft!=='' && (x.terapia||'x')!==ft) return false;
      if(sit==='ativos' && !bool(x.p.ativo)) return false;
      if(sit==='inativos' && bool(x.p.ativo)) return false;
      if(sit==='abertos' && !x.abertos) return false;
      if(txt && semAc(x.p.nome+' '+x.p.apelido+' '+x.p.docFiscal+' '+x.p.email).indexOf(semAc(txt))<0) return false;
      return true;
    });
    var so = S.pfSort || { k:'nome', d:1 };
    var cmp = function(a,b){ var x = a[so.k], y = b[so.k]; return (typeof x==='number' ? x-y : String(x).localeCompare(String(y),'pt-BR')) * so.d; };
    var h = '';
    D.TERAPIAS.forEach(function(t){
      var G = L.filter(function(x){ return x.terapia===t; }).sort(cmp); if(!G.length) return;
      var soma = function(k){ return G.reduce(function(s,x){ return s+x[k]; }, 0); };
      h += '<tr class="gh"><td colspan="7">'+esc(D.GRUPO_NOME[t])+' · '+G.length+'</td></tr>';
      G.forEach(function(x){
        h += '<tr class="clic" data-id="'+esc(x.p.id)+'"><td class="l"><b>'+esc(x.p.nome)+'</b>'+(bool(x.p.ativo) ? '' : ' <span class="chip neutro">inativo</span>')+(x.pend ? ' <span class="chip" title="Pendências de cadastro">'+x.pend+'</span>' : '')+'</td><td class="l">'+esc(D.SIGLA[x.terapia||'x']==='S/T' ? '—' : App.TERAPIA_NOME[x.terapia])+'</td>'+
          '<td class="n">'+brl(x.pagoTotal)+'</td><td class="n">'+brl(x.pagoAno)+'</td><td class="n">'+brl(x.reembAno)+'</td><td class="n">'+hh(x.horas)+' h</td>'+
          '<td class="n">'+(x.abertos ? '<span class="chip">'+x.abertos+' · '+brl(x.valAberto)+'</span>' : '<span class="chip ok">em dia</span>')+'</td></tr>';
      });
      h += '<tr class="sub-tot"><td class="l">Subtotal</td><td></td><td class="n">'+brl(soma('pagoTotal'))+'</td><td class="n">'+brl(soma('pagoAno'))+'</td><td class="n">'+brl(soma('reembAno'))+'</td><td class="n">'+hh(soma('horas'))+' h</td><td class="n">'+soma('abertos')+'</td></tr>';
    });
    return { html: h || '<tr><td colspan="7" class="l">Nenhum profissional com esse filtro.</td></tr>', n:L.length };
  }
  function lista(){
    var P = S.M.profissionais, ano = App.hojeISO().slice(0,4), so = S.pfSort || { k:'nome', d:1 };
    var cab = COLS.map(function(c){ var on = so.k===c[0]; return '<th class="ord'+(on?' on':'')+'" data-k="'+c[0]+'" role="button" tabindex="0" aria-sort="'+(on ? (so.d>0?'ascending':'descending') : 'none')+'">'+(c[0]==='pagoAno' ? 'Pago em '+ano : c[0]==='reembAno' ? 'Reembolsado em '+ano : c[1])+(on ? (so.d>0?' ▲':' ▼') : '')+'</th>'; }).join('');
    var ter = '<select id="pf-ft" aria-label="Terapia"><option value="">Todas as terapias</option>'+D.TERAPIAS.map(function(t){ return '<option value="'+(t||'x')+'"'+((S.pfT||'')===(t||'x')?' selected':'')+'>'+esc(D.GRUPO_NOME[t])+'</option>'; }).join('')+'</select>';
    var sit = '<select id="pf-fs" aria-label="Situação">'+[['ativos','Ativos'],['todos','Todos'],['inativos','Inativos'],['abertos','Com algo em aberto']].map(function(o){ return '<option value="'+o[0]+'"'+((S.pfSit||'ativos')===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select>';
    var c = corpoTabela();
    return '<div class="tb"><input id="pf-q" type="search" placeholder="Buscar por nome, CPF ou e-mail" value="'+esc(S.pfQ||'')+'" aria-label="Buscar profissional" class="busca">'+ter+sit+'<span class="gap"></span><button class="bt" id="pr-novo">+ Novo profissional</button></div>'+
      '<p class="sub" style="margin-top:-4px"><span id="pf-n">'+c.n+'</span> de '+P.length+' profissionais. Toque numa linha para abrir a ficha completa. Cadastre só o nome e os dados: o app cria a pasta no Drive e abre o lançamento do mês.</p>'+
      '<div class="tw"><table class="tb2 tprof" style="min-width:900px"><thead><tr>'+cab+'</tr></thead><tbody id="pf-tb">'+c.html+'</tbody></table></div>';
  }
  function ligaLista(){
    var rep = function(){ var c = corpoTabela(); $('#pf-tb').innerHTML = c.html; $('#pf-n').textContent = c.n; ligaLinhas(); };
    var ligaLinhas = function(){ $$('#pf-tb tr.clic').forEach(function(tr){ tr.onclick = function(){ S.prof = tr.dataset.id; S.profTab = 'cad'; App.ir('profissionais'); }; }); };
    $('#pf-q').oninput = function(){ S.pfQ = this.value; rep(); };
    $('#pf-ft').onchange = function(){ S.pfT = this.value; rep(); };
    $('#pf-fs').onchange = function(){ S.pfSit = this.value; rep(); };
    $$('th.ord').forEach(function(th){ var go = function(){ var k = th.dataset.k, so = S.pfSort || { k:'nome', d:1 }; S.pfSort = { k:k, d: so.k===k ? -so.d : (k==='nome'||k==='terapia' ? 1 : -1) }; App.ir('profissionais'); };
      th.onclick = go; th.onkeydown = function(e){ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); go(); } }; });
    ligaLinhas();
  }
  // ------------------------------------------------------------ cadastro (formulário)
  function formCad(p){
    var novo = !p.id, campo = function(id, rot, val, extra){ return '<label class="campo"><span>'+rot+'</span><input id="pf-'+id+'" value="'+esc(val)+'" '+(extra||'')+'></label>'; };
    var terap = '<option value="">— a definir —</option>'+Object.keys(App.TERAPIA_NOME).map(function(k){ return '<option value="'+k+'"'+(p.terapia===k?' selected':'')+'>'+App.TERAPIA_NOME[k]+'</option>'; }).join('');
    return '<div class="duas">'+campo('nome','Nome completo (como na nota fiscal)',p.nome||'','maxlength="120"')+campo('apelido','Apelido',p.apelido||'','maxlength="60"')+'</div>'+
      '<div class="duas"><label class="campo"><span>Terapia</span><select id="pf-terapia">'+terap+'</select></label>'+'<label class="campo"><span>Função</span><select id="pf-papel"><option value="">— a definir —</option>'+D.PAPEIS.concat(p.papel && D.PAPEIS.indexOf(p.papel)<0 ? [p.papel] : []).map(function(o){ return '<option'+(p.papel===o?' selected':'')+'>'+esc(o)+'</option>'; }).join('')+'</select></label></div>'+
      '<div class="duas">'+campo('conselho','Conselho (CRP, CRFa, CREFITO)',p.conselho||'','maxlength="20"')+campo('registro','Registro',p.registro||'','maxlength="30"')+'</div>'+
      '<div class="duas">'+campo('doc','CPF ou CNPJ',p.docFiscal||'','maxlength="20" inputmode="numeric"')+campo('email','E-mail (também é o login)',p.email||'','type="email" inputmode="email" autocapitalize="none"')+'</div>'+
      campo('end','Endereço onde atende',p.endereco||'','maxlength="240"')+
      '<div class="duas">'+campo('tel','Telefone / WhatsApp',p.telefone||'','inputmode="tel" maxlength="30"')+campo('pix','Chave Pix ou conta para pagamento',p.pix||'','maxlength="120"')+'</div>'+
      '<label class="campo" style="max-width:360px"><span>Local de atendimento padrão (vem preenchido na agenda)</span><select id="pf-localp"><option value="">— nenhum —</option>'+App.V.LOCAIS.map(function(l){ return '<option'+(p.localPadrao===l?' selected':'')+'>'+esc(l)+'</option>'; }).join('')+'</select></label>'+
      '<div class="duas">'+campo('vh','Valor/hora (R$)',p.valorHora||'','inputmode="decimal"')+campo('act','Validade do atestado de capacidade técnica',p.actValidade||'','type="date"')+'</div>'+
      '<label class="campo"><span>Alerta de cadastro (nota interna; apague quando resolver)</span><textarea id="pf-alerta" rows="2" maxlength="300">'+esc(p.alerta||'')+'</textarea></label>'+
      '<label class="tgl"><input type="checkbox" id="pf-ativo"'+(novo||bool(p.ativo)?' checked':'')+'> Ativo (entra no "Abrir ciclo")</label>'+
      '<button class="bt" id="pf-salvar">'+(novo ? 'Cadastrar' : 'Salvar')+'</button>'+
      (!novo && S.u.admin ? ' <button class="bt cl" id="pf-conv">Gerar convite de acesso</button>' : '')+'<span class="msg" id="pf-msg"></span><div id="pf-convbox"></div>';
  }

  // ------------------------------------------------------------ ficha de um profissional
  function ficha(p, novo){
    if(novo) return '<div class="tb"><button class="bt cl" id="pf-voltar">‹ Profissionais</button></div><div class="cx"><h3>Novo profissional</h3><p class="sub">Depois de salvar, o app cria a pasta no Drive e o lançamento do mês.</p>'+formCad({})+'</div>';
    var P = S.M.profissionais, r = D.resumoProf(p), pend = D.pendCadastro(p, P), tab = S.profTab || 'cad';
    var tile = function(t, v, s, at){ return '<div class="tile'+(at?' at':'')+'"><span>'+t+'</span><b>'+v+'</b><small>'+s+'</small></div>'; };
    var dif = r.valorComReemb - r.reemb;
    var tiles = '<div class="tiles">'+tile('Horas atendidas', hh(r.horas)+' h', r.nSess+' sessões registradas no app')+tile('Valor pago', brl(r.pago), r.lan.length+' lançamentos'+(r.ultimo ? ', último '+D.mmaa(r.ultimo) : ''))+
      tile('Reembolsado', brl(r.reemb), r.glosa===null ? 'sem reembolso registrado' : (r.glosa>0.005 ? Math.round(r.glosa*100)+'% abaixo do pago (diferença '+brl(dif)+')' : 'integral'))+
      tile('Notas fiscais', r.nNF+' de '+r.lan.length, r.lan.length-r.nNF ? (r.lan.length-r.nNF)+' faltando' : 'todas recebidas', r.lan.length-r.nNF>0)+
      tile('Listas assinadas', r.nLista+' de '+r.lan.length, r.lan.length-r.nLista ? (r.lan.length-r.nLista)+' faltando' : 'todas recebidas', r.lan.length-r.nLista>0)+
      tile('Em aberto', r.abertos.length, r.abertos.length ? 'lançamentos com algo a fazer' : 'nada pendente', r.abertos.length>0)+'</div>';
    var devendo = '';
    if(r.deve.length || r.abertos.length || pend.length){
      devendo = '<div class="cx"><h3>O que está pendente com '+esc(p.apelido||p.nome)+'</h3>'+
        (r.deve.length ? '<h4>Documentos que ele(a) me deve</h4><p>'+r.deve.map(function(x){ return '<span class="chip crit">'+esc(x)+'</span>'; }).join('')+'</p>' : '')+
        (r.abertos.length ? '<h4>Lançamentos em aberto</h4><ul class="lst">'+r.abertos.sort(function(a,b){ return b.l.ciclo.localeCompare(a.l.ciclo); }).map(function(x){
          return '<li><button class="lk3" data-l="'+esc(x.l.id)+'" data-c="'+esc(x.l.ciclo)+'"><b>'+D.mmaa(x.l.ciclo)+'</b></button><span class="ac '+x.a.nivel+'">'+esc(x.a.texto)+'</span></li>'; }).join('')+'</ul>' : '')+
        (pend.length ? '<h4>Cadastro</h4><p>'+D.chips(pend)+'</p>' : '')+'</div>';
    }
    var abas = '<div class="abas" role="tablist">'+ABAS.map(function(a){ return '<button role="tab" class="aba'+(a[0]===tab?' on':'')+'" data-aba="'+a[0]+'" aria-selected="'+(a[0]===tab)+'">'+a[1]+'</button>'; }).join('')+'</div>';
    return '<div class="tb"><button class="bt cl" id="pf-voltar">‹ Profissionais</button><span class="gap"></span>'+(bool(p.ativo)?'':'<span class="tag">inativo</span>')+'</div>'+
      '<div class="cx cab-prof"><h3>'+esc(p.nome)+'</h3><p class="sub">'+esc(D.GRUPO_NOME[p.terapia||''])+(p.papel ? ' · '+esc(p.papel) : '')+(p.conselho ? ' · '+esc(p.conselho+' '+p.registro) : '')+'</p><p class="sub dados">'+
        [p.docFiscal ? (App.digitos(p.docFiscal).length===14 ? 'CNPJ ' : 'CPF ')+esc(p.docFiscal) : '', p.email ? esc(p.email) : '', p.telefone ? esc(p.telefone) : '', p.pix ? 'Pix: '+esc(p.pix) : '', p.localPadrao ? 'Local: '+esc(p.localPadrao) : ''].filter(Boolean).join(' · ')+'</p></div>'+
      tiles+devendo+abas+'<div class="cx" id="aba-corpo">'+abaCorpo(p, r, tab)+'</div>';
  }

  function abaCorpo(p, r, tab){
    if(tab==='cad') return formCad(p);
    if(tab==='hist'){
      var L = r.lan.slice().sort(function(a,b){ return b.ciclo.localeCompare(a.ciclo) || String(b.parcela).localeCompare(String(a.parcela)); });
      if(!L.length) return '<p class="sub">Sem lançamentos ainda.</p>';
      return '<div class="tw"><table class="tb2" style="min-width:1000px"><thead><tr><th>Mês</th><th class="n">Valor</th><th>NF</th><th>Lista</th><th>Comp.</th><th>Pago em</th><th>Solicitado</th><th>Protocolo</th><th>Status</th><th class="n">Reembolsado</th><th>Situação</th></tr></thead><tbody>'+
        L.map(function(l){ var a = D.acao(l), ds = D.diasSolic(l);
          return '<tr class="clic" data-l="'+esc(l.id)+'" data-c="'+esc(l.ciclo)+'"><td><b>'+D.mmaa(l.ciclo)+'</b>'+(l.parcela?' <small>p'+esc(l.parcela)+'</small>':'')+'</td><td class="n">'+brl(num(l.valor))+'</td><td>'+D.sim(l.nf)+'</td><td>'+D.sim(l.freq)+'</td><td>'+D.sim(l.comp)+'</td><td>'+dataBR(l.dtPagamento)+'</td>'+
            '<td>'+(l.dtEntrada ? dataBR(l.dtEntrada)+(ds ? ' <small>'+ds.dias+' d</small>' : '') : '—')+'</td><td>'+esc(l.numProtocolo||'—')+'</td><td>'+D.statusChip(l.status)+'</td><td class="n">'+(num(l.vReembolsado)!==null ? brl(num(l.vReembolsado)) : '—')+'</td><td><span class="ac '+a.nivel+'">'+esc(a.texto)+'</span></td></tr>'; }).join('')+'</tbody></table></div>';
    }
    if(tab==='sess'){
      var meses = Object.keys(r.porMes).sort().reverse(), mc = S.profMes || meses[0] || App.hojeISO().slice(0,7);
      var linhas = meses.map(function(m){ return '<tr class="clic" data-m="'+m+'"><td><b>'+D.mmaa(m)+'</b></td><td class="n">'+r.porMes[m].n+'</td><td class="n">'+hh(r.porMes[m].h)+' h</td></tr>'; }).join('');
      return (meses.length ? '<div class="tw"><table class="tb2" style="min-width:0"><thead><tr><th>Mês</th><th class="n">Sessões</th><th class="n">Horas</th></tr></thead><tbody>'+linhas+'</tbody></table></div>' : '<p class="sub">Nenhuma sessão registrada no app ainda. As horas de antes do app não estão no histórico.</p>')+
        '<h4 style="margin-top:18px">Horas por semana (últimas 12)</h4>'+semanasProf(p)+
        '<h4 style="margin-top:18px">Atendimentos de '+esc(mc)+'</h4>'+D.calendario(mc, D.ctx(p.id), 'atend')+
        '<h4 style="margin-top:18px">Horas por semana do ciclo</h4>'+D.tabelaSemanas(D.horasDoCiclo(mc, S.M.sessoes, App.mapaProf(), p.id))+
        '<div class="ups"><button class="bt cl peq" id="pf-agenda">Marcar atendimentos na agenda</button></div>';
    }
    if(tab==='docs'){
      var opt = D.meses().map(function(m){ return '<option>'+esc(m)+'</option>'; }).join('');
      return '<div class="up-card"><h4>Enviar documento para a pasta de '+esc(p.apelido||p.nome)+'</h4><div class="duas"><label class="campo"><span>Tipo</span><select id="dc-tipo"><option value="ato">Atestado / certificado (pasta do profissional)</option><option value="nf">Nota fiscal do mês</option><option value="lista">Lista assinada do mês</option><option value="comp">Comprovante de pagamento do mês</option><option value="outro">Outro documento do mês</option></select></label>'+
        '<label class="campo"><span>Mês (quando for do mês)</span><select id="dc-mes">'+opt+'</select></label></div><button class="bt cl" id="dc-up">Escolher arquivo</button><span class="msg" id="info-dc"></span><div class="bar" id="barra-dc" hidden><i style="width:4%;background:var(--az)"></i></div></div>'+
        '<div id="dc-lista"><p class="sub">Carregando arquivos do Drive…</p></div>';
    }
    return '';
  }

  function semanasProf(p){
    var sem = D.ultimasSemanas(12), t = p.terapia||'x', h = {};
    S.M.sessoes.forEach(function(s){ if(s.profId===p.id){ var w = D.segundaDe(s.data); h[w] = (h[w]||0) + (num(s.horas)||0); } });
    return D.chartStack(sem.map(function(w){ return { k:w, rot:D.rotSemana(w) }; }), [{ k:'h', nome:p.apelido||p.nome, cor:D.CORES[t] }], function(c){ return h[c]; });
  }

  function tela(){
    if(S.prof==='novo') return ficha(null, true);
    var P = S.M.profissionais, p = S.prof ? P.filter(function(x){ return x.id===S.prof; })[0] : null;
    return p ? ficha(p, false) : lista();
  }

  tela.depois = function(){
    var voltar = $('#pf-voltar'); if(voltar) voltar.onclick = function(){ S.prof = null; S.profTab = null; S.profMes = null; App.ir('profissionais'); };
    if(S.msgProf){ var m0 = $('#pf-msg'); if(m0){ m0.className = 'msg ok'; m0.textContent = S.msgProf; } S.msgProf = null; }
    if(!S.prof || S.prof==='novo'){
      if($('#pr-novo')) $('#pr-novo').onclick = function(){ S.prof = 'novo'; App.ir('profissionais'); };
      if(S.prof!=='novo'){ ligaLista(); return; }
    }
    var atual = S.prof==='novo' ? null : S.M.profissionais.filter(function(x){ return x.id===S.prof; })[0];
    $$('.aba').forEach(function(b){ b.onclick = function(){ S.profTab = b.dataset.aba; App.ir('profissionais'); }; });
    $$('.lk3[data-l]').forEach(function(x){ x.onclick = function(){ S.ciclo = x.dataset.c; S.lanSel = x.dataset.l; App.ir('ciclo'); }; });
    $$('tr.clic[data-l]').forEach(function(x){ x.onclick = function(){ S.ciclo = x.dataset.c; S.lanSel = x.dataset.l; App.ir('ciclo'); }; });
    $$('tr.clic[data-m]').forEach(function(x){ x.onclick = function(){ S.profMes = x.dataset.m; App.ir('profissionais'); }; });
    if(atual && (S.profTab||'cad')==='sess'){
      D.ligarCalendario(D.ctx(atual.id));
      if($('#pf-agenda')) $('#pf-agenda').onclick = function(){ S.agProf = atual.id; S.sesMes = S.profMes || App.hojeISO().slice(0,7); S.sesTab = 'agenda'; S.agSel = {}; S.agFoco = null; S.agMsg = ''; App.ir('sessoes'); };
    }

    if($('#pf-salvar')) $('#pf-salvar').onclick = async function(){
      var b = this, mg = $('#pf-msg'), v = function(i){ return $('#pf-'+i).value; };
      var o = { id: atual ? atual.id : '', nome:v('nome'), apelido:v('apelido'), terapia:v('terapia'), papel:v('papel'), conselho:v('conselho'), registro:v('registro'),
        docFiscal:v('doc'), email:v('email'), endereco:v('end'), telefone:v('tel'), pix:v('pix'), localPadrao:v('localp'), valorHora:v('vh'), actValidade:v('act'), alerta:v('alerta'), ativo:$('#pf-ativo').checked };
      b.disabled = true; mg.className = 'msg'; mg.textContent = 'Salvando…';
      try{
        var r = await api('salvarProfissional', { p:o }); if(!r.ok) throw new Error(r.msg);
        var i = -1; S.M.profissionais.forEach(function(x, k){ if(x.id===r.profissional.id) i = k; });
        if(i>=0) S.M.profissionais[i] = r.profissional; else S.M.profissionais.push(r.profissional);
        if(r.lancamentos) S.M.lancamentos = S.M.lancamentos.concat(r.lancamentos);
        S.prof = r.profissional.id; S.profTab = 'cad';
        S.msgProf = (atual ? 'Salvo.' : 'Cadastrado. Pasta criada no Drive'+(r.lancamentos && r.lancamentos.length ? ' e lançamento do mês aberto.' : '.'))+' '+(r.avisos||[]).join(' ');
        App.ir('profissionais');
      }catch(x){ mg.className = 'msg er'; mg.textContent = msgErro(x, 'Não foi possível salvar.'); b.disabled = false; }
    };
    var cv = $('#pf-conv');
    if(cv) cv.onclick = async function(){
      var mg = $('#pf-msg'); mg.className = 'msg'; mg.textContent = 'Gerando…';
      try{
        var o = await api('convidarProfissional', { profId:S.prof }); if(!o.ok) throw new Error(o.msg);
        mg.textContent = '';
        var txt = 'Seu acesso ao app de reembolso: abra mandacap.com.br/reembolso, toque em "Primeiro acesso", use o e-mail '+o.email+' e o código '+o.codigo+' (vale até '+o.validade+') e crie a sua senha.';
        $('#pf-convbox').innerHTML = '<div class="conv">Código de primeiro acesso: <span class="cod">'+esc(o.codigo)+'</span><br><span class="sub">Vale até '+esc(o.validade)+'.</span><div style="margin-top:8px"><button class="bt cl" id="cv-cp">Copiar mensagem</button></div></div>';
        $('#cv-cp').onclick = function(){ try{ navigator.clipboard.writeText(txt); this.textContent = 'Copiado'; }catch(_){} };
      }catch(x){ mg.className = 'msg er'; mg.textContent = msgErro(x, 'Não foi possível gerar.'); }
    };

    if(atual && S.profTab==='docs'){
      var box = $('#dc-lista');
      api('listarArquivos', { escopo:'profissional', profId:atual.id }).then(function(o){ if(!o.ok) throw new Error(o.msg); box.innerHTML = D.arquivosHtml(o.grupos); })
        .catch(function(x){ box.innerHTML = '<p class="msg er">'+esc(msgErro(x, 'Não foi possível listar.'))+'</p>'; });
      var inp = $('#env-arq');
      if(!inp){ inp = document.createElement('input'); inp.id = 'env-arq'; inp.type = 'file'; inp.accept = 'application/pdf,image/jpeg,image/png'; inp.multiple = true; inp.hidden = true; document.body.appendChild(inp); }
      $('#dc-up').onclick = function(){
        inp.onchange = function(){ var files = [].slice.call(inp.files); inp.value = ''; var tipo = $('#dc-tipo').value;
          if(files.length) App.enviarLote(tipo, files, { ciclo:$('#dc-mes').value, profId:atual.id }, $('#barra-dc'), $('#info-dc'), function(){ S.profTab = 'docs'; App.ir('profissionais'); var m = $('#info-dc'); if(m){ m.className = 'msg ok'; m.textContent = 'Arquivo recebido e salvo no Drive.'; } }); };
        inp.click(); };
    }
  };
  App.TELAS.profissionais = tela;
});
