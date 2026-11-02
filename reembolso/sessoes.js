/* Sessões: agenda (marcar os atendimentos de cada profissional num calendário), gráficos de horas por semana
   e a validação do laudo (tela original, agora numa aba). Só a família usa as abas; o profissional vê o registro simples. */
(window.__mods = window.__mods || []).push(function(App){
  var D = App.D, $ = App.$, $$ = App.$$, esc = App.esc, S = App.S, V = App.V, num = App.num, hh = App.hh, bool = App.bool, api = App.api, msgErro = App.msgErro, hojeISO = App.hojeISO, dataBR = App.dataBR;
  var laudo = App.TELAS.sessoes;
  var ABAS = [['agenda','Agenda'], ['graficos','Gráficos'], ['laudo','Validação do laudo']];
  var ciclo = function(){ return S.sesMes || hojeISO().slice(0,7); };
  var ativos = function(){
    var P = S.M.profissionais.filter(function(p){ return bool(p.ativo); });
    return P.sort(function(a,b){ return (D.TERAPIAS.indexOf(a.terapia||'')-D.TERAPIAS.indexOf(b.terapia||'')) || String(a.apelido||a.nome).localeCompare(String(b.apelido||b.nome),'pt-BR'); });
  };
  var optProfs = function(sel, comTodos){
    var h = comTodos ? '<option value="">Todos os profissionais</option>' : '', g = null;
    ativos().forEach(function(p){ var t = p.terapia||''; if(t!==g){ if(g!==null) h += '</optgroup>'; g = t; h += '<optgroup label="'+esc(D.GRUPO_NOME[t])+'">'; }
      h += '<option value="'+esc(p.id)+'"'+(p.id===sel?' selected':'')+'>'+esc(p.apelido||p.nome)+'</option>'; });
    return h + (g!==null ? '</optgroup>' : '');
  };

  function tela(){
    if(S.u.perfil!=='familia') return laudo();
    var tab = S.sesTab || 'agenda';
    var barra = '<div class="abas" role="tablist">'+ABAS.map(function(a){ return '<button role="tab" class="aba'+(a[0]===tab?' on':'')+'" data-aba="'+a[0]+'" aria-selected="'+(a[0]===tab)+'">'+a[1]+'</button>'; }).join('')+'</div>';
    return barra + (tab==='agenda' ? agenda() : tab==='graficos' ? graficos() : laudo());
  }
  tela.depois = function(){
    if(S.u.perfil!=='familia') return laudo.depois();
    $$('.aba').forEach(function(b){ b.onclick = function(){ S.sesTab = b.dataset.aba; App.ir('sessoes'); }; });
    var tab = S.sesTab || 'agenda';
    if(tab==='agenda') agendaDepois(); else if(tab==='graficos') grafDepois(); else laudo.depois();
  };

  // ------------------------------------------------------------ agenda
  function agenda(){
    var c = ciclo(), P = App.mapaProf(); if(S.agProf && !P[S.agProf]) S.agProf = '';
    var meses = D.meses(); if(meses.indexOf(c)<0) meses.push(c); meses.sort().reverse();
    return '<div class="tb"><button class="bt cl" id="ag-ant" aria-label="Mês anterior">‹</button><select id="ag-mes" aria-label="Mês">'+meses.map(function(m){ return '<option'+(m===c?' selected':'')+'>'+esc(m)+'</option>'; }).join('')+'</select><button class="bt cl" id="ag-prox" aria-label="Próximo mês">›</button>'+
      '<select id="ag-prof" aria-label="Profissional">'+optProfs(S.agProf, true)+'</select></div><div id="ag-corpo">'+corpo()+'</div>';
  }

  function corpo(){
    var c = ciclo(), P = App.mapaProf(), pid = S.agProf || '';
    if(!pid) return corpoTodos(c, P);
    var p = P[pid], n = V.diasDoMes(c), pri = V.diaSemana(c+'-01'), hoje = hojeISO(), sel = S.agSel = S.agSel || {}, por = {};
    S.M.sessoes.forEach(function(s){ if(s.profId===pid && s.data.slice(0,7)===c) (por[s.data] = por[s.data] || []).push(s); });
    var g = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(function(d){ return '<div class="cdh">'+d+'</div>'; }).join('');
    for(var i = 0; i < pri; i++) g += '<div class="cd vazio"></div>';
    for(var d = 1; d <= n; d++){
      var iso = c+'-'+(d<10?'0':'')+d, ses = (por[iso]||[]).sort(function(a,b){ return a.horaIni.localeCompare(b.horaIni); }), fut = iso > hoje;
      g += '<button type="button" class="cd'+(sel[iso]?' sel2':'')+(fut?' fut':'')+(ses.length?' tem':'')+(iso===hoje?' hoje':'')+'" data-d="'+iso+'"'+(fut?' disabled title="Data futura"':'')+'><b>'+d+'</b>'+
        ses.map(function(s){ return '<i class="m s" title="'+esc(s.local)+'">'+esc(s.horaIni)+'–'+esc(s.horaFim)+'</i>'; }).join('')+'</button>';
    }
    var f = S.agForm = S.agForm || {}, locais = V.LOCAIS.map(function(l){ var def = f.local || p.localPadrao || 'Clínica/consultório'; return '<option'+(l===def?' selected':'')+'>'+esc(l)+'</option>'; }).join('');
    var nSel = Object.keys(sel).length;
    var foco = S.agFoco && por[S.agFoco] ? '<h4>'+dataBR(S.agFoco)+'</h4><ul class="lst">'+por[S.agFoco].map(function(s){ return '<li><span>'+esc(s.horaIni)+'–'+esc(s.horaFim)+' · '+hh(num(s.horas)||0)+' h · '+esc(s.local)+'</span><button class="x2" data-delss="'+esc(s.id)+'" aria-label="Excluir sessão" title="Excluir">×</button></li>'; }).join('')+'</ul>' : '';
    var r = D.horasDoCiclo(c, S.M.sessoes, P, pid);
    return '<div class="cx"><h3>'+esc(p.apelido||p.nome)+' · '+esc(c)+'</h3><p class="sub">'+esc(D.GRUPO_NOME[p.terapia||''])+'. Toque nos dias em que houve atendimento (ou nos que ainda não têm). Dias com horário já aparecem preenchidos; toque em outro dia para marcar de novo.</p><div class="cal marcar" id="cal-m">'+g+'</div>'+
      '<div id="ag-foco">'+foco+'</div></div>'+
      '<div class="cx"><h3>Registrar atendimento</h3><p class="sub"><b id="ag-n">'+nSel+'</b> dia(s) selecionado(s). O mesmo horário e local vale para todos eles.</p>'+
      '<div class="ups"><button class="bt cl peq" id="ag-uteis">Todos os dias úteis sem sessão</button><button class="bt cl peq" id="ag-limpa">Limpar seleção</button></div>'+
      '<div class="reg"><label class="campo"><span>Início</span><input type="time" id="ag-ini" value="'+esc(f.ini||'')+'"></label><label class="campo"><span>Fim</span><input type="time" id="ag-fim" value="'+esc(f.fim||'')+'"></label>'+
      '<label class="campo"><span>Local</span><select id="ag-local">'+locais+'</select></label></div>'+
      '<div style="margin-top:14px"><button class="bt" id="ag-salvar">Registrar nos dias selecionados</button><span class="msg" id="ag-msg">'+esc(S.agMsg||'')+'</span></div></div>'+
      '<div class="cx"><h3>Horas por semana do ciclo</h3>'+D.tabelaSemanas(r)+'</div>';
  }

  function corpoTodos(c, P){
    var r = D.horasDoCiclo(c, S.M.sessoes, P), ctx = D.ctx(), linhas = '', ids = {};
    S.M.sessoes.forEach(function(s){ if(s.data.slice(0,7)===c) ids[s.profId] = 1; });
    ativos().filter(function(p){ return ids[p.id]; }).forEach(function(p){
      var x = D.horasDoCiclo(c, S.M.sessoes, P, p.id);
      linhas += '<tr class="clic" data-p="'+esc(p.id)+'"><td><b>'+esc(p.apelido||p.nome)+'</b> <small>'+D.SIGLA[p.terapia||'x']+'</small></td>'+x.jan.map(function(w){ return '<td class="n">'+(w.tot ? hh(w.tot) : '—')+'</td>'; }).join('')+'<td class="n"><b>'+hh(x.tot)+' h</b></td></tr>'; });
    return '<div class="cx"><h3>Atendimentos de '+esc(c)+' · todos</h3><p class="sub">Horas de cada dia, por terapia. Escolha um profissional acima para marcar os atendimentos dele.</p>'+D.calendario(c, ctx, 'atend')+'</div>'+
      '<div class="cx"><h3>Horas por semana e terapia</h3>'+D.tabelaSemanas(r)+'</div>'+
      '<div class="cx"><h3>Por profissional</h3>'+(linhas ? '<div class="tw"><table class="tb2 ctr" style="min-width:0"><thead><tr><th>Profissional</th><th>S1</th><th>S2</th><th>S3</th><th>S4</th><th>Total</th></tr></thead><tbody>'+linhas+'</tbody></table></div>' : '<p class="sub">Nenhum atendimento registrado neste mês. Escolha um profissional e marque os dias.</p>')+'</div>';
  }

  function agPintar(){ $('#ag-corpo').innerHTML = corpo(); agBind(); }

  function agBind(){
    var c = ciclo(), pid = S.agProf || '', P = App.mapaProf();
    if(!pid){
      D.ligarCalendario(D.ctx());
      $$('tr.clic[data-p]').forEach(function(tr){ tr.onclick = function(){ S.agProf = tr.dataset.p; S.agSel = {}; App.ir('sessoes'); }; });
      return;
    }
    var sel = S.agSel = S.agSel || {}, f = S.agForm = S.agForm || {};
    $$('#cal-m .cd[data-d]').forEach(function(b){ b.onclick = function(){ var d = b.dataset.d; if(sel[d]) delete sel[d]; else sel[d] = 1; S.agFoco = d; S.agMsg = ''; agPintar(); }; });
    var atu = function(){ f.ini = $('#ag-ini').value; f.fim = $('#ag-fim').value; f.local = $('#ag-local').value; };
    ['ag-ini','ag-fim','ag-local'].forEach(function(i){ $('#'+i).onchange = atu; });
    $('#ag-limpa').onclick = function(){ S.agSel = {}; agPintar(); };
    $('#ag-uteis').onclick = function(){
      atu(); var n = V.diasDoMes(c), hoje = hojeISO(), tem = {}; S.M.sessoes.forEach(function(s){ if(s.profId===pid) tem[s.data] = 1; });
      for(var d = 1; d <= n; d++){ var iso = c+'-'+(d<10?'0':'')+d, w = V.diaSemana(iso); if(iso<=hoje && w>=1 && w<=5 && !tem[iso]) sel[iso] = 1; }
      agPintar(); };
    $$('[data-delss]').forEach(function(b){ b.onclick = async function(){
      if(!confirm('Excluir esta sessão?')) return;
      try{ var o = await api('excluirSessao', { id:b.dataset.delss }); if(!o.ok) throw new Error(o.msg); S.M.sessoes = S.M.sessoes.filter(function(x){ return x.id!==b.dataset.delss; }); S.agMsg = 'Sessão excluída.'; agPintar(); }
      catch(x){ $('#ag-msg').className = 'msg er'; $('#ag-msg').textContent = msgErro(x, 'Não foi possível excluir.'); } }; });
    $('#ag-salvar').onclick = async function(){
      atu(); var b = this, mg = $('#ag-msg'), datas = Object.keys(sel).sort();
      if(!datas.length){ mg.className = 'msg er'; mg.textContent = 'Selecione pelo menos um dia.'; return; }
      if(V.horasDaSessao(f.ini, f.fim)===null){ mg.className = 'msg er'; mg.textContent = 'Confira início e fim: o fim precisa ser depois do início.'; return; }
      b.disabled = true; mg.className = 'msg'; mg.textContent = 'Registrando…';
      try{
        var o = await api('salvarSessoesLote', { profId:pid, datas:datas, horaIni:f.ini, horaFim:f.fim, local:f.local || $('#ag-local').value }); if(!o.ok) throw new Error(o.msg);
        S.M.sessoes = S.M.sessoes.concat(o.criadas); S.agSel = {};
        var h = o.criadas.reduce(function(t,s){ return t + (num(s.horas)||0); }, 0);
        S.agMsg = o.criadas.length+' dia(s) registrado(s), '+hh(h)+' h.'+(o.ignoradas.length ? ' Ignorados: '+o.ignoradas.map(function(i){ return dataBR(i.data)+' ('+i.motivo+')'; }).join(', ')+'.' : '');
        agPintar();
      }catch(x){ mg.className = 'msg er'; mg.textContent = msgErro(x, 'Não foi possível registrar.'); b.disabled = false; }
    };
  }

  function agendaDepois(){
    var troca = function(){ S.agSel = {}; S.agFoco = null; S.agMsg = ''; App.ir('sessoes'); };
    $('#ag-mes').onchange = function(){ S.sesMes = this.value; troca(); };
    $('#ag-ant').onclick = function(){ S.sesMes = D.cicloVizinho(ciclo(), -1); troca(); };
    $('#ag-prox').onclick = function(){ S.sesMes = D.cicloVizinho(ciclo(), 1); troca(); };
    $('#ag-prof').onchange = function(){ S.agProf = this.value; troca(); };
    agBind();
  }

  // ------------------------------------------------------------ gráficos
  function graficos(){
    var n = S.grN || 12, ter = S.grTer || '', P = App.mapaProf(), sem = D.ultimasSemanas(n), cats = sem.map(function(w){ return { k:w, rot:D.rotSemana(w) }; });
    var porT = {}, porP = {}, totP = {}, nomeP = {}, temAlgo = false;
    S.M.sessoes.forEach(function(s){
      var w = D.segundaDe(s.data); if(w < sem[0] || w > sem[n-1]) return;
      var h = num(s.horas)||0, t = D.terapiaDe(P, s.profId); temAlgo = true;
      porT[w+'|'+t] = (porT[w+'|'+t]||0) + h;
      if(!ter || t===ter){ porP[w+'|'+s.profId] = (porP[w+'|'+s.profId]||0) + h; totP[s.profId] = (totP[s.profId]||0) + h; }
    });
    var ctrl = '<div class="tb"><select id="gr-n" aria-label="Período">'+[8,12,26].map(function(x){ return '<option value="'+x+'"'+(x===n?' selected':'')+'>Últimas '+x+' semanas</option>'; }).join('')+'</select>'+
      '<select id="gr-ter" aria-label="Terapia"><option value="">Todas as terapias</option>'+['aba','fono','to','psicomot'].map(function(t){ return '<option value="'+t+'"'+(t===ter?' selected':'')+'>'+esc(D.GRUPO_NOME[t])+'</option>'; }).join('')+'</select></div>';
    if(!temAlgo) return ctrl+'<div class="cx"><h3>Gráficos</h3><p class="sub">Nenhum atendimento registrado neste período. Marque os atendimentos na aba Agenda e os gráficos aparecem aqui.</p></div>';
    var serT = ['aba','fono','to','psicomot','x'].filter(function(t){ return sem.some(function(w){ return porT[w+'|'+t]; }); }).map(function(t){ return { k:t, nome:D.GRUPO_NOME[t==='x'?'':t], cor:D.CORES[t] }; });
    var ids = Object.keys(totP).sort(function(a,b){ return totP[b]-totP[a]; });
    var serP = ids.map(function(id, i){ var p = P[id]||{}; return { k:id, nome:(p.apelido||id)+' ('+D.SIGLA[p.terapia||'x']+')', cor:D.PALETA[i % D.PALETA.length] }; });
    var maxT = Math.max.apply(null, ids.map(function(i){ return totP[i]; }).concat([1]));
    var barras = serP.map(function(x){ return '<div class="hb"><span>'+esc(x.nome)+'</span><div><i style="width:'+(100*totP[x.k]/maxT)+'%;background:'+x.cor+'"></i></div><b>'+hh(totP[x.k])+' h</b></div>'; }).join('');
    return ctrl+
      '<div class="cx"><h3>Horas por semana, por terapia</h3><p class="sub">Semanas de segunda a domingo. Cada barra soma as horas de todos os profissionais da terapia.</p>'+D.chartStack(cats, serT, function(c,k){ return porT[c+'|'+k]; })+'</div>'+
      '<div class="cx"><h3>Horas por semana, por profissional'+(ter ? ' · '+esc(D.GRUPO_NOME[ter]) : '')+'</h3>'+D.chartStack(cats, serP, function(c,k){ return porP[c+'|'+k]; })+'</div>'+
      '<div class="cx"><h3>Total no período, por profissional</h3><div class="hbs">'+barras+'</div></div>';
  }
  function grafDepois(){
    $('#gr-n').onchange = function(){ S.grN = +this.value; App.ir('sessoes'); };
    $('#gr-ter').onchange = function(){ S.grTer = this.value; App.ir('sessoes'); };
  }

  App.TELAS.sessoes = tela;
});
