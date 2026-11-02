/* Ciclo: o fechamento do mês, um profissional por vez. Lista todos os lançamentos do mês com a situação
   de cada um, mostra o que fazer, e abre uma gaveta para editar datas, protocolo e status. */
(window.__mods = window.__mods || []).push(function(App){
  var D = App.D, $ = App.$, $$ = App.$$, esc = App.esc, brl = App.brl, num = App.num, S = App.S, hh = App.hh, dataBR = App.dataBR, hojeISO = App.hojeISO, api = App.api, msgErro = App.msgErro;

  var ativos = function(){ return S.M.profissionais.filter(function(p){ return App.bool(p.ativo); }); };
  var porTerapia = function(P, a, b){
    var ia = D.TERAPIAS.indexOf((P[a.profId]||{}).terapia||''), ib = D.TERAPIAS.indexOf((P[b.profId]||{}).terapia||'');
    return (ia-ib) || String((P[a.profId]||{}).apelido||'').localeCompare(String((P[b.profId]||{}).apelido||''), 'pt-BR') || String(a.parcela).localeCompare(String(b.parcela));
  };
  var doMes = function(c){ return S.M.lancamentos.filter(function(l){ return l.ciclo===c; }); };

  function cicloInicial(){
    var meses = D.meses();
    var comAberto = meses.filter(function(c){ return doMes(c).some(function(l){ return D.acao(l).cat!=='ok'; }); })[0];
    return comAberto || meses[0];
  }

  function tela(){
    var P = App.mapaProf(), meses = D.meses();
    if(!S.ciclo) S.ciclo = cicloInicial();
    var L = doMes(S.ciclo).sort(function(a,b){ return porTerapia(P, a, b); });
    var v = 0, sol = 0, re = 0, ab = 0, maisAntigo = null;
    L.forEach(function(l){
      var x = num(l.valor)||0, rv = num(l.vReembolsado), a = D.acao(l), ds = D.diasSolic(l); v += x; if(l.dtEntrada) sol += x; if(rv!==null) re += rv;
      if(a.cat!=='ok') ab++; if(ds && !ds.fechado && (maisAntigo===null || ds.dias>maisAntigo)) maisAntigo = ds.dias;
    });
    var pct = function(a, b){ return b ? Math.min(100, Math.round(100*a/b)) : 0; };
    var mini = function(t, val, s, p, at){ return '<div class="mini'+(at?' at':'')+'"><span>'+t+'</span><b>'+val+'</b>'+(p===undefined ? '' : '<div class="pg" role="img" aria-label="'+p+'%"><i style="width:'+p+'%"></i></div>')+'<small>'+s+'</small></div>'; };
    var tiles = '<div class="minis">'+mini('Profissionais', L.length, 'neste mês')+mini('Valor do mês', brl(v), 'a pedir à Amil')+
      mini('Solicitado', brl(sol), pct(sol, v)+'% do valor', pct(sol, v))+mini('Reembolsado', brl(re), pct(re, sol)+'% do solicitado', pct(re, sol))+
      mini('Em aberto', ab, ab ? 'com algo a fazer' : 'tudo fechado', undefined, ab>0)+mini('Mais antigo', maisAntigo===null ? '—' : maisAntigo+' d', 'sem retorno')+'</div>';

    var familia = S.u.perfil==='familia', corpo = '', grupo = null, nSel = 0;
    L.forEach(function(l){
      var p = P[l.profId]||{}, t = p.terapia||'', ds = D.diasSolic(l), v = num(l.valor)||0, rv = num(l.vReembolsado), saldo = v - (rv||0), tem = Math.abs(saldo) > 0.005;
      if(t!==grupo){ grupo = t; corpo += '<tr class="gh"><td colspan="10">'+esc(D.GRUPO_NOME[t])+'</td></tr>'; }
      if(tem) nSel++;
      corpo += '<tr class="clic" data-l="'+esc(l.id)+'"><td class="ck"><input type="checkbox" class="sel" data-id="'+esc(l.id)+'" data-saldo="'+saldo+'"'+(tem && familia ? '' : ' disabled')+' aria-label="Selecionar '+esc(p.apelido||l.profId)+'"></td>'+
        '<td class="nm" data-r="Profissional"><b>'+esc(String(p.nome||l.profId).split(' ')[0])+'</b>'+(l.parcela ? ' <small>parc. '+esc(l.parcela)+'</small>' : '')+'</td>'+
        '<td data-r="Valor">'+D.moeda(v)+'</td><td data-r="Pago em">'+D.dataCurta(l.dtPagamento)+'</td><td data-r="Solicitado em">'+D.dataCurta(l.dtEntrada)+'</td>'+
        '<td data-r="Protocolo">'+(l.numProtocolo ? esc(l.numProtocolo) : '—')+'</td><td data-r="Status">'+(l.status ? '<span class="chip '+(l.status==='Pagamento Confirmado' ? 'ok' : (l.status==='Indeferido'||l.status==='Reembolso Devolvido') ? 'crit' : 'neutro')+'" title="'+esc(l.status)+'">'+esc(D.STATUS_CURTO[l.status]||l.status)+'</span>' : '—')+'</td><td data-r="Reembolsado">'+(rv!==null ? D.moeda(rv) : '—')+'</td>'+
        '<td data-r="Dias" title="'+(ds ? (ds.fechado ? 'dias da solicitação até o reembolso' : 'em aberto: contando até hoje') : '')+'">'+(ds ? '<span class="'+(ds.fechado ? '' : 'dab')+'">'+ds.dias+'</span>' : '—')+'</td>'+
        '<td data-r="Saldo" class="'+(tem ? 'sdo' : 'zero')+'">'+(tem ? D.moeda(saldo) : '—')+'</td></tr>';
    });
    var tabela = L.length ? '<div class="barra-sel" id="sel-bar" hidden><span id="sel-txt"></span><button class="bt" id="sel-email">Montar e-mail para a Amil</button><button class="bt cl peq" id="sel-limpa">Limpar</button></div>'+
        '<table class="tb2 tcic ctr"><thead><tr><th class="ck">'+(familia ? '<input type="checkbox" id="sel-todos" aria-label="Selecionar todos com saldo"'+(nSel ? '' : ' disabled')+'>' : '')+'</th><th>Profissional</th><th>Valor (R$)</th><th>Pago em</th><th>Solicitado em</th><th>Protocolo</th><th>Status</th><th>Reembolsado (R$)</th><th>Dias</th><th>Saldo (R$)</th></tr></thead><tbody>'+corpo+'</tbody></table>'
      : '<p class="sub">Nenhum lançamento em '+esc(S.ciclo)+'. '+(familia ? 'Use "Abrir ciclo" para criar um por profissional ativo.' : '')+'</p>';

    var nav = '<div class="tb"><button class="bt cl" id="cic-ant" aria-label="Mês anterior">‹</button><select id="cic-sel" aria-label="Competência">'+meses.concat(meses.indexOf(S.ciclo)<0?[S.ciclo]:[]).sort().reverse().map(function(c){ return '<option'+(c===S.ciclo?' selected':'')+'>'+esc(c)+'</option>'; }).join('')+'</select><button class="bt cl" id="cic-prox" aria-label="Próximo mês">›</button>'+
      (familia ? '<span class="gap"></span><button class="bt" id="cic-abrir">Abrir ciclo</button><button class="bt cl" id="cic-pasta">Criar pastas</button><button class="bt cl" id="cic-gerar">Gerar listas</button>' : '')+'</div><div id="cic-res"></div>';

    var cal = '<div class="cx"><h3>Atendimentos '+esc(S.ciclo)+'</h3><p class="sub">O mês inteiro numa linha só, com os horários de 30 em 30 minutos. Fim de semana fica cinza e estreito; o horário escolar aparece em vermelho claro. Para marcar horários de um profissional, use a Agenda em Sessões.</p>'+
      D.gradeMensal(S.ciclo, D.ctx(), {})+'<h4>Horas por semana</h4>'+D.tabelaSemanas(D.horasDoCiclo(S.ciclo, S.M.sessoes, App.mapaProf()))+'</div>';
    var docs = familia ? '<div class="cx"><h3>Arquivos de '+esc(S.ciclo)+' no Drive</h3><p class="sub">Notas, listas assinadas e comprovantes de cada profissional neste mês.</p><button class="bt cl" id="cic-arq">Carregar arquivos do mês</button><div id="cic-arqs" style="margin-top:12px"></div></div>' : '';
    return nav+tiles+'<div class="cx"><div class="tb" style="margin:0 0 8px"><h3 style="margin:0">Profissionais de '+esc(S.ciclo)+'</h3><span class="gap"></span>'+(familia ? '<button class="bt cl" id="cic-novo">+ Lançamento avulso</button>' : '')+'</div>'+
      '<p class="sub">Toque numa linha para abrir o lançamento. Quem tem saldo pode ser marcado para montar o e-mail à Amil.</p>'+tabela+'</div>'+cal+docs;
  }
  tela.depois = function(){
    var familia = S.u.perfil==='familia', res = $('#cic-res');
    $('#cic-sel').onchange = function(){ S.ciclo = this.value; App.ir('ciclo'); };
    $('#cic-ant').onclick = function(){ S.ciclo = D.cicloVizinho(S.ciclo, -1); App.ir('ciclo'); };
    $('#cic-prox').onclick = function(){ S.ciclo = D.cicloVizinho(S.ciclo, 1); App.ir('ciclo'); };
    if(S.msgCiclo){ res.innerHTML = '<div class="ban ok">'+esc(S.msgCiclo)+'</div>'; S.msgCiclo = null; }
    if(!familia) return;
    $$('tr.clic[data-l]').forEach(function(tr){ tr.onclick = function(e){ if(e.target.closest('input,button,a')) return; abrirGaveta(tr.dataset.l); }; });
    ligarSelecao();
    $('#cic-novo').onclick = function(){ abrirGaveta(null); };
    var trava = function(on, b, txt){ $$('#cic-abrir,#cic-pasta,#cic-gerar').forEach(function(x){ x.disabled = on; }); if(b && txt) b.textContent = txt; };

    $('#cic-abrir').onclick = abrirDialogo;
    $('#cic-pasta').onclick = async function(){
      var b = this, t0 = b.textContent; trava(true, b, 'Criando…');
      try{ var o = await api('pastaCiclo', { ciclo:S.ciclo }); if(!o.ok) throw new Error(o.msg);
        res.innerHTML = '<div class="ban ok">Pasta de '+esc(S.ciclo)+' pronta, com '+o.profissionais+' subpastas. <a href="'+esc(o.url)+'" target="_blank" rel="noopener noreferrer">Abrir no Drive</a></div>'; }
      catch(x){ res.innerHTML = '<div class="ban crit">'+esc(msgErro(x, 'Não foi possível criar as pastas.'))+'</div>'; }
      trava(false, b, t0);
    };
    $('#cic-gerar').onclick = async function(){
      var b = this, t0 = b.textContent; trava(true, b, 'Gerando…'); res.innerHTML = '<div class="ban">Gerando as listas de frequência. Pode levar alguns segundos por profissional.</div>';
      try{ var o = await api('gerarListaFrequencia', { ciclo:S.ciclo }); if(!o.ok) throw new Error(o.msg);
        var okN = o.resultados.filter(function(r){ return r.ok; }).length;
        res.innerHTML = '<div class="ban '+(okN===o.resultados.length?'ok':'')+'"><b>'+okN+' de '+o.resultados.length+' listas geradas</b> em '+esc(S.ciclo)+'. <a href="'+esc(o.pasta)+'" target="_blank" rel="noopener noreferrer">Abrir a pasta do mês</a><ul class="lst">'+
          o.resultados.map(function(r){ return '<li><span>'+esc(r.apelido)+'</span><span>'+(r.ok ? r.sessoes+' sessões, '+hh(r.horas)+' h · <a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">abrir</a>' : esc(r.msg))+'</span></li>'; }).join('')+'</ul></div>'; }
      catch(x){ res.innerHTML = '<div class="ban crit">'+esc(msgErro(x, 'Não foi possível gerar as listas.'))+'</div>'; }
      trava(false, b, t0);
    };
    $('#cic-arq').onclick = async function(){
      var b = this, box = $('#cic-arqs'); b.disabled = true; box.innerHTML = '<p class="sub">Carregando…</p>';
      try{ var o = await api('listarArquivos', { escopo:'ciclo', ciclo:S.ciclo }); if(!o.ok) throw new Error(o.msg); box.innerHTML = D.arquivosHtml(o.grupos, o.aviso); }
      catch(x){ box.innerHTML = '<p class="msg er">'+esc(msgErro(x, 'Não foi possível listar.'))+'</p>'; }
      b.disabled = false;
    };
    if(S.lanSel){ var id = S.lanSel; S.lanSel = null; abrirGaveta(id); }
  };

  /** Marcar quem tem saldo e montar o e-mail para a Amil (rascunho no Gmail, nunca enviado). */
  function ligarSelecao(){
    var barra = $('#sel-bar'); if(!barra) return;
    var marcados = function(){ return $$('input.sel:checked'); };
    var atu = function(){
      var cs = marcados(), s = cs.reduce(function(t, c){ return t + (+c.dataset.saldo||0); }, 0);
      barra.hidden = !cs.length; $('#sel-txt').textContent = cs.length+' selecionado(s) · saldo '+D.moeda(s);
      var td = $('#sel-todos'), hab = $$('input.sel:not(:disabled)'); if(td) td.checked = hab.length>0 && hab.every(function(c){ return c.checked; });
    };
    $$('input.sel').forEach(function(c){ c.onchange = atu; });
    if($('#sel-todos')) $('#sel-todos').onchange = function(){ var on = this.checked; $$('input.sel:not(:disabled)').forEach(function(c){ c.checked = on; }); atu(); };
    $('#sel-limpa').onclick = function(){ $$('input.sel').forEach(function(c){ c.checked = false; }); atu(); };
    $('#sel-email').onclick = async function(){
      var ids = marcados().map(function(c){ return c.dataset.id; }), b = this, res = $('#cic-res'); if(!ids.length) return;
      if(!confirm('Montar o e-mail para a Amil com '+ids.length+' item(ns)?\n\nVai ser criado um RASCUNHO no Gmail, com os arquivos de cada mês e os documentos do processo em anexo. Nada é enviado.')) return;
      b.disabled = true; b.textContent = 'Montando…'; res.innerHTML = '<div class="ban">Juntando os arquivos e montando o rascunho. Pode levar um minuto.</div>';
      try{
        var o = await api('montarEmail', { ids:ids }); if(!o.ok) throw new Error(o.msg);
        res.innerHTML = '<div class="ban ok"><b>Rascunho criado</b> com '+o.itens+' item(ns) e '+o.anexos+' anexo(s). <a href="'+esc(o.url)+'" target="_blank" rel="noopener noreferrer">Abrir os rascunhos no Gmail</a>'+(o.faltando.length ? '<br><b>Atenção:</b> '+o.faltando.map(esc).join('; ') : '')+'</div>';
      }catch(x){ res.innerHTML = '<div class="ban crit">'+esc(msgErro(x, 'Não foi possível montar o e-mail.'))+'</div>'; }
      b.disabled = false; b.textContent = 'Montar e-mail para a Amil'; res.scrollIntoView({ block:'center' });
    };
  }

  function irAgenda(profId, ciclo){ S.agProf = profId; S.sesMes = ciclo; S.sesTab = 'agenda'; S.agSel = {}; S.agFoco = null; S.agMsg = ''; App.ir('sessoes'); }

  // ------------------------------------------------------------ abrir o ciclo: primeiro, quem são os profissionais
  function abrirDialogo(){
    fecharGaveta();
    var tem = {}; doMes(S.ciclo).forEach(function(l){ tem[l.profId] = 1; });
    var anterior = {}, ant = D.cicloVizinho(S.ciclo, -1); doMes(ant).forEach(function(l){ anterior[l.profId] = 1; });
    var comSessao = {}; S.M.sessoes.forEach(function(s){ if(s.data.slice(0,7)===S.ciclo) comSessao[s.profId] = 1; });
    var P = ativos().sort(function(a,b){ return (D.TERAPIAS.indexOf(a.terapia||'')-D.TERAPIAS.indexOf(b.terapia||'')) || String(a.apelido||a.nome).localeCompare(String(b.apelido||b.nome),'pt-BR'); });
    var h = '', g = null;
    P.forEach(function(p){
      var t = p.terapia||''; if(t!==g){ g = t; h += '<h4>'+esc(D.GRUPO_NOME[t])+'</h4>'; }
      var ja = !!tem[p.id], marca = ja || anterior[p.id] || comSessao[p.id];
      h += '<label class="tgl esc-p"><input type="checkbox" data-p="'+esc(p.id)+'"'+(marca?' checked':'')+(ja?' disabled':'')+'> <b>'+esc(p.apelido||p.nome)+'</b> <small>'+(ja ? 'já tem lançamento neste mês' : anterior[p.id] ? 'teve lançamento em '+D.mmaa(ant) : comSessao[p.id] ? 'tem sessões neste mês' : 'sem lançamento recente')+'</small></label>';
    });
    document.body.insertAdjacentHTML('beforeend', '<div class="dr" id="dr"><div class="dr-bg" id="dr-bg"></div><div class="dr-in" role="dialog" aria-label="Abrir ciclo"><div class="dr-top"><div><h3>Abrir ciclo de '+esc(S.ciclo)+'</h3><p class="sub">Escolha quem entra neste mês. Para cada um, o app cria o lançamento e a pasta no Drive; depois você marca os atendimentos na agenda.</p></div><button class="x" id="dr-x" aria-label="Fechar">×</button></div>'+
      (P.length ? h : '<p class="sub">Nenhum profissional ativo. Cadastre em Profissionais.</p>')+
      '<div class="dr-bt"><button class="bt" id="ab-ok">Criar lançamentos</button><button class="bt cl" id="ab-todos">Marcar todos</button><span class="msg" id="ab-msg"></span></div></div></div>');
    document.addEventListener('keydown', escFecha);
    $('#dr-x').onclick = $('#dr-bg').onclick = fecharGaveta;
    $('#ab-todos').onclick = function(){ $$('#dr input[data-p]:not(:disabled)').forEach(function(c){ c.checked = true; }); };
    $('#ab-ok').onclick = async function(){
      var ids = $$('#dr input[data-p]:not(:disabled)').filter(function(c){ return c.checked; }).map(function(c){ return c.dataset.p; }), mg = $('#ab-msg');
      if(!ids.length){ mg.className = 'msg er'; mg.textContent = 'Marque pelo menos um profissional.'; return; }
      $$('.dr-bt button').forEach(function(x){ x.disabled = true; }); mg.className = 'msg'; mg.textContent = 'Criando…';
      try{ var o = await api('abrirCiclo', { ciclo:S.ciclo, profIds:ids }); if(!o.ok) throw new Error(o.msg);
        S.M.lancamentos = S.M.lancamentos.concat(o.criados); fecharGaveta(); S.msgCiclo = o.criados.length+' lançamento(s) criado(s) e pastas prontas no Drive. Agora marque os atendimentos de cada um com o botão "Agenda".'; App.ir('ciclo'); }
      catch(x){ mg.className = 'msg er'; mg.textContent = msgErro(x, 'Não foi possível abrir o ciclo.'); $$('.dr-bt button').forEach(function(y){ y.disabled = false; }); }
    };
  }

  // ------------------------------------------------------------ gaveta de edição do lançamento
  function fecharGaveta(){ var d = $('#dr'); if(d) d.remove(); document.removeEventListener('keydown', escFecha); }
  function escFecha(e){ if(e.key==='Escape') fecharGaveta(); }

  function proximoAberto(atualId){
    var P = App.mapaProf(), L = doMes(S.ciclo).sort(function(a,b){ return porTerapia(P, a, b); }), i = -1;
    L.forEach(function(l, k){ if(l.id===atualId) i = k; });
    for(var k = 1; k <= L.length; k++){ var l = L[(i+k) % L.length]; if(l.id!==atualId && D.acao(l).cat!=='ok') return l.id; }
    return null;
  }

  function abrirGaveta(id){
    fecharGaveta();
    var P = App.mapaProf(), l = id ? S.M.lancamentos.filter(function(x){ return x.id===id; })[0] : null;
    if(id && !l) return;
    var novo = !l; l = l || { ciclo:S.ciclo, profId:'', parcela:'', valor:'', nf:'', freq:'', comp:'', dtPagamento:'', status:'Preparando', dtEntrada:'', numSolicitacao:'', numProtocolo:'', dtReembolso:'', vReembolsado:'', obs:'' };
    var p = P[l.profId] || {}, a = novo ? null : D.acao(l);
    var campo = function(i, rot, val, extra){ return '<label class="campo"><span>'+rot+'</span><input id="lf-'+i+'" value="'+esc(val)+'" '+(extra||'')+'></label>'; };
    var chk = function(i, rot, on){ return '<label class="tgl"><input type="checkbox" id="lf-'+i+'"'+(on==='Sim'?' checked':'')+'> '+rot+'</label>'; };
    var optProf = ativos().map(function(q){ return '<option value="'+esc(q.id)+'">'+esc(q.apelido||q.nome)+'</option>'; }).join('');
    var optSt = D.STATUS.map(function(s){ return '<option'+(l.status===s?' selected':'')+'>'+esc(s)+'</option>'; }).join('');
    var up = function(t, rot){ return '<button class="bt cl peq" data-up="'+t+'">'+rot+'</button>'; };
    var html = '<div class="dr" id="dr"><div class="dr-bg" id="dr-bg"></div><div class="dr-in" role="dialog" aria-label="Lançamento">'+
      '<div class="dr-top"><div><h3>'+(novo ? 'Novo lançamento' : esc(p.apelido||l.profId)+' · '+D.mmaa(l.ciclo)+(l.parcela?' · parcela '+esc(l.parcela):''))+'</h3>'+
      (a ? '<div class="ac '+a.nivel+'">'+esc(a.texto)+'</div>' : '<p class="sub">Para um segundo envio do mesmo mês, use outra parcela.</p>')+'</div><button class="x" id="dr-x" aria-label="Fechar">×</button></div>'+
      (novo ? '<label class="campo"><span>Profissional</span><select id="lf-prof"><option value="">— escolha —</option>'+optProf+'</select></label>' : '')+
      '<h4>1. Documentos do profissional</h4><div class="duas"><div>'+chk('nf','Nota fiscal recebida', l.nf)+chk('freq','Lista de frequência assinada recebida', l.freq)+'</div><div>'+chk('comp','Comprovante de pagamento anexado', l.comp)+'</div></div>'+
      (novo ? '' : '<div class="ups">'+up('nf','Enviar NF')+up('lista','Enviar lista assinada')+up('comp','Enviar comprovante')+up('outro','Outro documento')+'</div><div class="bar" id="barra-up" hidden><i style="width:4%;background:var(--az)"></i></div><span class="msg" id="info-up"></span>')+
      (novo ? '' : '<h4>Atendimentos</h4><div class="ups"><button class="bt cl peq" id="lf-agenda">Marcar atendimentos de '+esc(p.apelido||l.profId)+' em '+esc(l.ciclo)+'</button></div>')+
      '<h4>2. Pagamento ao profissional</h4><div class="duas">'+campo('valor','Valor do mês (R$)', l.valor, 'inputmode="decimal"')+campo('parcela','Parcela (se dividir o envio)', l.parcela, 'inputmode="numeric" maxlength="2"')+'</div>'+
      campo('dtPagamento','Pago em', l.dtPagamento, 'type="date"')+
      '<h4>3. Solicitação na Amil</h4><div class="duas">'+campo('dtEntrada','Data da solicitação', l.dtEntrada, 'type="date"')+campo('numSolicitacao','Nº da solicitação', l.numSolicitacao)+'</div>'+
      campo('numProtocolo','Protocolo de acompanhamento', l.numProtocolo, 'autocomplete="off"')+
      '<label class="campo"><span>Status na Amil</span><select id="lf-status">'+optSt+'</select></label>'+
      '<div class="ups"><button class="bt cl peq" id="lf-hoje-sol" type="button">Protocolei hoje</button><button class="bt cl peq" id="lf-hoje-pag" type="button">Paguei hoje</button><span class="msg" id="lf-dias"></span></div>'+
      '<h4>4. Reembolso</h4><div class="duas">'+campo('dtReembolso','Reembolso recebido em', l.dtReembolso, 'type="date"')+campo('vReembolsado','Valor reembolsado (R$)', l.vReembolsado, 'inputmode="decimal"')+'</div>'+
      '<label class="campo"><span>Observações</span><textarea id="lf-obs" rows="2" maxlength="400">'+esc(l.obs)+'</textarea></label>'+
      '<div class="dr-bt"><button class="bt" id="lf-salvar">Salvar</button>'+(novo ? '' : '<button class="bt cl" id="lf-prox">Salvar e ir para o próximo em aberto</button>')+(novo ? '' : '<button class="bt cl perigo" id="lf-excluir">Excluir</button>')+'<span class="msg" id="lf-msg"></span></div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.addEventListener('keydown', escFecha);
    $('#dr-x').onclick = $('#dr-bg').onclick = fecharGaveta;
    if($('#lf-agenda')) $('#lf-agenda').onclick = function(){ fecharGaveta(); irAgenda(l.profId, l.ciclo); };

    var v = function(i){ return $('#lf-'+i).value; }, ck = function(i){ return $('#lf-'+i).checked ? 'Sim' : ''; };
    var dias = function(){ var e = v('dtEntrada'), r = v('dtReembolso'); $('#lf-dias').textContent = e ? (r ? 'Reembolsado '+D.dias(e, r)+' dias após a solicitação' : 'Solicitado há '+D.dias(e, hojeISO())+' dias (prazo normal da Amil: '+D.PRAZO_AMIL+')') : ''; };
    ['dtEntrada','dtReembolso'].forEach(function(i){ $('#lf-'+i).onchange = dias; }); dias();
    $('#lf-hoje-sol').onclick = function(){ if(!v('dtEntrada')) $('#lf-dtEntrada').value = hojeISO();
      var s = $('#lf-status'); if(['Preparando','Aguardando Documentação','Liberado para Pagamento'].indexOf(s.value)>=0) s.value = 'Em processamento'; dias(); $('#lf-numProtocolo').focus(); };
    $('#lf-hoje-pag').onclick = function(){ $('#lf-dtPagamento').value = hojeISO(); };

    async function salvar(depois){
      var b = $('#lf-salvar'), mg = $('#lf-msg'); var o = { id:l.id||'', ciclo:l.ciclo, profId: novo ? v('prof') : l.profId, parcela:v('parcela'), valor:v('valor'),
        nf:ck('nf'), freq:ck('freq'), comp:ck('comp'), dtPagamento:v('dtPagamento'), status:v('status'), dtEntrada:v('dtEntrada'), numSolicitacao:v('numSolicitacao'),
        numProtocolo:v('numProtocolo'), dtReembolso:v('dtReembolso'), vReembolsado:v('vReembolsado'), obs:v('obs') };
      if(!o.profId){ mg.className = 'msg er'; mg.textContent = 'Escolha o profissional.'; return; }
      $$('.dr-bt button').forEach(function(x){ x.disabled = true; }); mg.className = 'msg'; mg.textContent = 'Salvando…';
      try{ var r = await api('salvarLancamento', { l:o }); if(!r.ok) throw new Error(r.msg);
        S.M.lancamentos = S.M.lancamentos.filter(function(x){ return x.id!==r.lancamento.id; }).concat([r.lancamento]);
        var prox = depois ? proximoAberto(r.lancamento.id) : null; fecharGaveta(); S.msgCiclo = 'Lançamento salvo.'; S.lanSel = prox; App.ir('ciclo'); }
      catch(x){ mg.className = 'msg er'; mg.textContent = msgErro(x, 'Não foi possível salvar.'); $$('.dr-bt button').forEach(function(y){ y.disabled = false; }); }
    }
    $('#lf-salvar').onclick = function(){ salvar(false); };
    if($('#lf-prox')) $('#lf-prox').onclick = function(){ salvar(true); };
    if($('#lf-excluir')) $('#lf-excluir').onclick = async function(){
      if(!confirm('Excluir o lançamento de '+(p.apelido||l.profId)+' em '+l.ciclo+'? Isso não apaga os arquivos do Drive.')) return;
      try{ var r = await api('excluirLancamento', { id:l.id }); if(!r.ok) throw new Error(r.msg);
        S.M.lancamentos = S.M.lancamentos.filter(function(x){ return x.id!==l.id; }); fecharGaveta(); S.msgCiclo = 'Lançamento excluído.'; App.ir('ciclo'); }
      catch(x){ $('#lf-msg').className = 'msg er'; $('#lf-msg').textContent = msgErro(x, 'Não foi possível excluir.'); } };

    var inp = $('#env-arq');
    if(!inp){ inp = document.createElement('input'); inp.id = 'env-arq'; inp.type = 'file'; inp.accept = 'application/pdf,image/jpeg,image/png'; inp.multiple = true; inp.hidden = true; document.body.appendChild(inp); }
    $$('#dr [data-up]').forEach(function(b){ b.onclick = function(){
      inp.onchange = function(){ var files = [].slice.call(inp.files); inp.value = '';
        if(files.length) App.enviarLote(b.dataset.up, files, { ciclo:l.ciclo, profId:l.profId }, $('#barra-up'), $('#info-up'), function(){
          var atual = S.M.lancamentos.filter(function(x){ return x.ciclo===l.ciclo && x.profId===l.profId && x.id===l.id; })[0];
          S.msgCiclo = 'Arquivo recebido e salvo na pasta de '+(p.apelido||l.profId)+' no Drive.'; S.lanSel = l.id; App.ir('ciclo'); }); };
      inp.click(); }; });
  }
  App.D.abrirGaveta = abrirGaveta;
  App.TELAS.ciclo = tela;
});
