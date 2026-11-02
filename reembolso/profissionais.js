/* Profissionais: agrupados por terapia, cada um com o histórico completo da relação
   (horas, notas, pagamentos, reembolsos, o que está devendo, documentos e calendário). */
(window.__mods = window.__mods || []).push(function(App){
  var D = App.D, $ = App.$, $$ = App.$$, esc = App.esc, brl = App.brl, num = App.num, S = App.S, hh = App.hh, dataBR = App.dataBR, bool = App.bool, api = App.api, msgErro = App.msgErro;
  var ABAS = [['cad','Cadastro'], ['hist','Histórico'], ['sess','Sessões e calendário'], ['docs','Documentos']];

  // ------------------------------------------------------------ lista, por terapia
  function lista(){
    var P = S.M.profissionais.slice().sort(function(a,b){ return (bool(b.ativo)-bool(a.ativo)) || String(a.apelido||a.nome).localeCompare(String(b.apelido||b.nome),'pt-BR'); });
    var ativos = P.filter(function(p){ return bool(p.ativo); }).length, h = '';
    D.TERAPIAS.forEach(function(t){
      var G = P.filter(function(p){ return (p.terapia||'')===t; }); if(!G.length) return;
      var R = G.map(function(p){ return D.resumoProf(p); });
      var pago = R.reduce(function(s,r){ return s+r.pago; }, 0), re = R.reduce(function(s,r){ return s+r.reemb; }, 0), hs = R.reduce(function(s,r){ return s+r.horas; }, 0);
      h += '<div class="gh2"><h3>'+esc(D.GRUPO_NOME[t])+' <small>'+G.length+'</small></h3><span>Pago '+brl(pago)+' · Reembolsado '+brl(re)+' · '+hh(hs)+' h no app</span></div><div class="pl">';
      G.forEach(function(p, i){
        var r = R[i], pend = D.pendCadastro(p, P);
        var deve = r.deve.length ? '<span class="chip crit">Deve: '+esc(r.deve.slice(-2).join(', '))+(r.deve.length>2 ? ' +'+(r.deve.length-2) : '')+'</span>' : '';
        h += '<button class="pi" data-id="'+esc(p.id)+'"><span class="nm">'+esc(p.apelido||p.nome)+' <small>'+esc(p.nome!==p.apelido ? p.nome : '')+'</small></span>'+
          '<span>'+(p.papel ? '<span class="tag">'+esc(p.papel)+'</span> ' : '')+(bool(p.ativo) ? '' : '<span class="tag">inativo</span>')+'</span>'+
          '<span class="pc stats"><span><b>'+brl(r.pago)+'</b> pago</span><span><b>'+brl(r.reemb)+'</b> reembolsado</span><span><b>'+hh(r.horas)+' h</b> no app</span><span><b>'+r.nNF+'/'+r.lan.length+'</b> notas</span>'+
          (r.abertos.length ? '<span><b>'+r.abertos.length+'</b> em aberto</span>' : '<span>sem pendência</span>')+'</span>'+
          '<span class="pc">'+deve+(pend.length ? '<span class="chip">'+pend.length+' pendência'+(pend.length>1?'s':'')+' de cadastro</span>' : '')+'</span></button>';
      });
      h += '</div>';
    });
    return '<div class="tb"><div><b>'+P.length+'</b> profissionais · <b>'+ativos+'</b> ativos</div><span class="gap"></span><button class="bt" id="pr-novo">+ Novo profissional</button></div>'+
      '<p class="sub" style="margin-top:-6px">Cadastre só o nome e os dados. O app já cria a pasta do profissional no Drive e abre o lançamento do mês.</p>'+(h || '<div class="cx"><p class="sub">Nenhum profissional ainda.</p></div>');
  }

  // ------------------------------------------------------------ cadastro (formulário)
  function formCad(p){
    var novo = !p.id, campo = function(id, rot, val, extra){ return '<label class="campo"><span>'+rot+'</span><input id="pf-'+id+'" value="'+esc(val)+'" '+(extra||'')+'></label>'; };
    var terap = '<option value="">— a definir —</option>'+Object.keys(App.TERAPIA_NOME).map(function(k){ return '<option value="'+k+'"'+(p.terapia===k?' selected':'')+'>'+App.TERAPIA_NOME[k]+'</option>'; }).join('');
    return '<div class="duas">'+campo('nome','Nome completo (como na nota fiscal)',p.nome||'','maxlength="120"')+campo('apelido','Apelido',p.apelido||'','maxlength="60"')+'</div>'+
      '<div class="duas"><label class="campo"><span>Terapia</span><select id="pf-terapia">'+terap+'</select></label>'+campo('papel','Papel (opcional)',p.papel||'','maxlength="40"')+'</div>'+
      '<div class="duas">'+campo('conselho','Conselho (CRP, CRFa, CREFITO)',p.conselho||'','maxlength="20"')+campo('registro','Registro',p.registro||'','maxlength="30"')+'</div>'+
      '<div class="duas">'+campo('doc','CPF ou CNPJ',p.docFiscal||'','maxlength="20" inputmode="numeric"')+campo('email','E-mail (também é o login)',p.email||'','type="email" inputmode="email" autocapitalize="none"')+'</div>'+
      campo('end','Endereço onde atende',p.endereco||'','maxlength="240"')+
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
      '<div class="cx cab-prof"><h3>'+esc(p.nome)+'</h3><p class="sub">'+esc(D.GRUPO_NOME[p.terapia||''])+(p.papel ? ' · '+esc(p.papel) : '')+(p.conselho ? ' · '+esc(p.conselho+' '+p.registro) : '')+(p.email ? ' · '+esc(p.email) : '')+'</p></div>'+
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
        '<h4 style="margin-top:18px">Calendário de '+esc(mc)+'</h4>'+D.calendario(mc, D.ctx(p.id));
    }
    if(tab==='docs'){
      var opt = D.meses().map(function(m){ return '<option>'+esc(m)+'</option>'; }).join('');
      return '<div class="up-card"><h4>Enviar documento para a pasta de '+esc(p.apelido||p.nome)+'</h4><div class="duas"><label class="campo"><span>Tipo</span><select id="dc-tipo"><option value="ato">Atestado / certificado (pasta do profissional)</option><option value="nf">Nota fiscal do mês</option><option value="lista">Lista assinada do mês</option><option value="comp">Comprovante de pagamento do mês</option><option value="outro">Outro documento do mês</option></select></label>'+
        '<label class="campo"><span>Mês (quando for do mês)</span><select id="dc-mes">'+opt+'</select></label></div><button class="bt cl" id="dc-up">Escolher arquivo</button><span class="msg" id="info-dc"></span><div class="bar" id="barra-dc" hidden><i style="width:4%;background:var(--az)"></i></div></div>'+
        '<div id="dc-lista"><p class="sub">Carregando arquivos do Drive…</p></div>';
    }
    return '';
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
      $$('.pi').forEach(function(b){ b.onclick = function(){ S.prof = b.dataset.id; S.profTab = 'cad'; App.ir('profissionais'); }; });
      if(S.prof!=='novo') return;
    }
    var atual = S.prof==='novo' ? null : S.M.profissionais.filter(function(x){ return x.id===S.prof; })[0];
    $$('.aba').forEach(function(b){ b.onclick = function(){ S.profTab = b.dataset.aba; App.ir('profissionais'); }; });
    $$('.lk3[data-l]').forEach(function(x){ x.onclick = function(){ S.ciclo = x.dataset.c; S.lanSel = x.dataset.l; App.ir('ciclo'); }; });
    $$('tr.clic[data-l]').forEach(function(x){ x.onclick = function(){ S.ciclo = x.dataset.c; S.lanSel = x.dataset.l; App.ir('ciclo'); }; });
    $$('tr.clic[data-m]').forEach(function(x){ x.onclick = function(){ S.profMes = x.dataset.m; App.ir('profissionais'); }; });
    if(atual && (S.profTab||'cad')==='sess'){ D.ligarCalendario(D.ctx(atual.id)); }

    if($('#pf-salvar')) $('#pf-salvar').onclick = async function(){
      var b = this, mg = $('#pf-msg'), v = function(i){ return $('#pf-'+i).value; };
      var o = { id: atual ? atual.id : '', nome:v('nome'), apelido:v('apelido'), terapia:v('terapia'), papel:v('papel'), conselho:v('conselho'), registro:v('registro'),
        docFiscal:v('doc'), email:v('email'), endereco:v('end'), valorHora:v('vh'), actValidade:v('act'), alerta:v('alerta'), ativo:$('#pf-ativo').checked };
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
