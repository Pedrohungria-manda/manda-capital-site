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
    var tile = function(t, val, s, at){ return '<div class="tile'+(at?' at':'')+'"><span>'+t+'</span><b>'+val+'</b><small>'+s+'</small></div>'; };
    var tiles = '<div class="tiles">'+tile('Profissionais', L.length, 'lançamentos neste mês')+tile('Valor do mês', brl(v), 'a ser pedido à Amil')+
      tile('Solicitado', brl(sol), v ? Math.round(100*sol/v)+'% do valor' : '')+tile('Reembolsado', brl(re), sol ? Math.round(100*re/sol)+'% do solicitado' : '')+
      tile('Em aberto', ab, ab ? 'lançamentos com algo a fazer' : 'tudo fechado', ab>0)+tile('Mais antigo', maisAntigo===null ? '—' : maisAntigo+' d', 'solicitado e sem retorno')+'</div>';

    var familia = S.u.perfil==='familia', corpo = '', grupo = null;
    L.forEach(function(l){
      var p = P[l.profId]||{}, t = p.terapia||'', a = D.acao(l), ds = D.diasSolic(l);
      if(t!==grupo){ grupo = t; corpo += '<tr class="gh"><td colspan="11">'+esc(D.GRUPO_NOME[t])+'</td></tr>'; }
      corpo += '<tr class="clic" data-l="'+esc(l.id)+'"><td><b>'+esc(p.apelido||l.profId)+'</b>'+(l.parcela?' <small>parc. '+esc(l.parcela)+'</small>':'')+'</td><td class="n">'+brl(num(l.valor))+'</td>'+
        '<td>'+D.sim(l.nf)+'</td><td>'+D.sim(l.freq)+'</td><td>'+D.sim(l.comp)+'</td><td>'+dataBR(l.dtPagamento)+'</td>'+
        '<td>'+(l.dtEntrada ? dataBR(l.dtEntrada)+(ds ? ' <small>'+(ds.fechado ? ds.dias+' d até o reembolso' : 'há '+ds.dias+' d')+'</small>' : '') : '—')+'</td>'+
        '<td>'+(l.numProtocolo ? esc(l.numProtocolo) : '—')+'</td><td>'+D.statusChip(l.status)+'</td><td class="n">'+(num(l.vReembolsado)!==null ? brl(num(l.vReembolsado)) : '—')+'</td>'+
        '<td><span class="ac '+a.nivel+'">'+esc(a.texto)+'</span></td></tr>';
    });
    var tabela = L.length ? '<div class="tw"><table class="tb2" style="min-width:1180px"><thead><tr><th>Profissional</th><th class="n">Valor</th><th>NF</th><th>Lista</th><th>Comp.</th><th>Pago em</th><th>Solicitado em</th><th>Protocolo</th><th>Status na Amil</th><th class="n">Reembolsado</th><th>O que fazer</th></tr></thead><tbody>'+corpo+'</tbody></table></div>'
      : '<p class="sub">Nenhum lançamento em '+esc(S.ciclo)+'. '+(familia ? 'Use "Abrir ciclo" para criar um por profissional ativo.' : '')+'</p>';

    var nav = '<div class="tb"><button class="bt cl" id="cic-ant" aria-label="Mês anterior">‹</button><select id="cic-sel" aria-label="Competência">'+meses.concat(meses.indexOf(S.ciclo)<0?[S.ciclo]:[]).sort().reverse().map(function(c){ return '<option'+(c===S.ciclo?' selected':'')+'>'+esc(c)+'</option>'; }).join('')+'</select><button class="bt cl" id="cic-prox" aria-label="Próximo mês">›</button>'+
      (familia ? '<span class="gap"></span><button class="bt" id="cic-abrir">Abrir ciclo</button><button class="bt cl" id="cic-pasta">Criar pastas</button><button class="bt cl" id="cic-gerar">Gerar listas</button>' : '')+'</div><div id="cic-res"></div>';

    var cal = '<div class="cx"><h3>Calendário de '+esc(S.ciclo)+'</h3><p class="sub">Sessões (horas), pagamentos aos profissionais, solicitações na Amil e reembolsos recebidos neste mês. Toque num dia para ver os detalhes.</p>'+D.calendario(S.ciclo, D.ctx())+'</div>';
    var docs = familia ? '<div class="cx"><h3>Arquivos de '+esc(S.ciclo)+' no Drive</h3><p class="sub">Notas, listas assinadas e comprovantes de cada profissional neste mês.</p><button class="bt cl" id="cic-arq">Carregar arquivos do mês</button><div id="cic-arqs" style="margin-top:12px"></div></div>' : '';
    return nav+tiles+'<div class="cx"><div class="tb" style="margin:0 0 8px"><h3 style="margin:0">Profissionais de '+esc(S.ciclo)+'</h3><span class="gap"></span>'+(familia ? '<button class="bt cl" id="cic-novo">+ Lançamento avulso</button>' : '')+'</div>'+
      '<p class="sub">Toque numa linha para abrir o lançamento, registrar o protocolo da Amil e acompanhar.</p>'+tabela+'</div>'+cal+docs;
  }

  tela.depois = function(){
    var familia = S.u.perfil==='familia', res = $('#cic-res');
    $('#cic-sel').onchange = function(){ S.ciclo = this.value; App.ir('ciclo'); };
    $('#cic-ant').onclick = function(){ S.ciclo = D.cicloVizinho(S.ciclo, -1); App.ir('ciclo'); };
    $('#cic-prox').onclick = function(){ S.ciclo = D.cicloVizinho(S.ciclo, 1); App.ir('ciclo'); };
    D.ligarCalendario(D.ctx());
    if(S.msgCiclo){ res.innerHTML = '<div class="ban ok">'+esc(S.msgCiclo)+'</div>'; S.msgCiclo = null; }
    if(!familia) return;
    $$('tr.clic[data-l]').forEach(function(tr){ tr.onclick = function(){ abrirGaveta(tr.dataset.l); }; });
    $('#cic-novo').onclick = function(){ abrirGaveta(null); };
    var trava = function(on, b, txt){ $$('#cic-abrir,#cic-pasta,#cic-gerar').forEach(function(x){ x.disabled = on; }); if(b && txt) b.textContent = txt; };

    $('#cic-abrir').onclick = async function(){
      var b = this, t0 = b.textContent, tem = {}; doMes(S.ciclo).forEach(function(l){ tem[l.profId] = 1; });
      var faltam = ativos().filter(function(p){ return !tem[p.id]; });
      if(!faltam.length){ res.innerHTML = '<div class="ban ok">Todos os profissionais ativos já têm lançamento em '+esc(S.ciclo)+'.</div>'; return; }
      if(!confirm('Criar o lançamento de '+S.ciclo+' para '+faltam.length+' profissional(is)?\n\n'+faltam.map(function(p){ return '• '+(p.apelido||p.nome); }).join('\n')+'\n\nQuem não atende mais deve ser marcado como inativo em Profissionais.')) return;
      trava(true, b, 'Abrindo…');
      try{ var o = await api('abrirCiclo', { ciclo:S.ciclo, profIds:faltam.map(function(p){ return p.id; }) }); if(!o.ok) throw new Error(o.msg);
        S.M.lancamentos = S.M.lancamentos.concat(o.criados); S.msgCiclo = o.criados.length+' lançamento(s) criado(s) e pastas do mês prontas no Drive.'; App.ir('ciclo'); return; }
      catch(x){ res.innerHTML = '<div class="ban crit">'+esc(msgErro(x, 'Não foi possível abrir o ciclo.'))+'</div>'; }
      trava(false, b, t0);
    };
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
