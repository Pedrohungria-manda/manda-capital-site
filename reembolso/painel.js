/* Painel: visão geral por ano e mês, pendências, análise por terapia e por profissional. */
(window.__mods = window.__mods || []).push(function(App){
  var D = App.D, $ = App.$, $$ = App.$$, esc = App.esc, brl = App.brl, num = App.num, S = App.S, hh = App.hh;
  var ABAS = [['painel','Painel'], ['pend','Pendências'], ['terapia','Por terapia'], ['prof','Por profissional']];

  function mediana(v){ if(!v.length) return null; v = v.slice().sort(function(a,b){ return a-b; }); var m = v.length>>1; return v.length%2 ? v[m] : Math.round((v[m-1]+v[m])/2); }
  function media(v){ return v.length ? Math.round(v.reduce(function(s,x){ return s+x; }, 0)/v.length) : null; }
  var ano0 = function(){ return App.hojeISO().slice(0,4); };

  function anos(){ var u = {}; S.M.lancamentos.forEach(function(l){ u[l.ciclo.slice(0,4)] = 1; }); S.M.sessoes.forEach(function(s){ u[s.data.slice(0,4)] = 1; }); u[ano0()] = 1; u['2025'] = 1; return Object.keys(u).sort(); }
  function periodo(){
    var a = anos(); if(!S.pnAno || a.indexOf(S.pnAno)<0) S.pnAno = a.indexOf(ano0())>=0 ? ano0() : a[a.length-1];
    return { ano:S.pnAno, mes: S.pnMes && S.pnMes.slice(0,4)===S.pnAno ? S.pnMes : '' };
  }
  var lancs = function(per){ return S.M.lancamentos.filter(function(l){ return per.mes ? l.ciclo===per.mes : l.ciclo.slice(0,4)===per.ano; }); };
  var sess = function(per){ return S.M.sessoes.filter(function(s){ return per.mes ? s.data.slice(0,7)===per.mes : s.data.slice(0,4)===per.ano; }); };
  var rotPer = function(per){ return per.mes ? D.MESES[+per.mes.slice(5)-1]+' de '+per.ano : 'ano de '+per.ano; };

  function calc(L){
    var P = App.mapaProf();
    var r = { fat:0, solic:0, reemb:0, falta:0, nunca:0, nFalta:0, nNunca:0, nAbertos:0, meses:{}, fazer:{}, dA:[], dT:[], emAberto:0 };
    Object.keys(D.CATS).forEach(function(k){ r.fazer[k] = []; });
    L.forEach(function(l){
      var v = num(l.valor)||0, rv = num(l.vReembolsado), a = D.acao(l);
      var m = r.meses[l.ciclo] = r.meses[l.ciclo] || { fat:0, solic:0, reemb:0, n:0, abertos:0, st:{ proc:0, conf:0, rean:0, rec:0, out:0 }, d:[], profs:{} };
      r.fat += v; m.fat += v; m.n++; m.profs[l.profId] = 1; m.st[D.STATUS_COL(l.status)]++;
      if(l.dtEntrada){ r.solic += v; m.solic += v; }
      if(rv!==null){ r.reemb += rv; m.reemb += rv; }
      if(l.dtReembolso && l.dtEntrada){ var d = D.dias(l.dtEntrada, l.dtReembolso); if(d!==null && d>=0) m.d.push(d); }
      var dA = D.dias(l.dtEntrada, l.dtReembolso), dT = D.dias(l.dtPagamento, l.dtReembolso), faltaLanc = l.dtEntrada && l.dtReembolso && rv===null;
      if(dA!==null && dA>=0) r.dA.push(dA); if(dT!==null && dT>=0) r.dT.push(dT);
      if(rv===null && !faltaLanc) r.emAberto += v; else if(a.cat==='glosa') r.emAberto += Math.max(0, v-rv);
      if(!l.dtEntrada){ r.nunca += v; r.nNunca++; }
      else if(l.dtReembolso && rv===null){ r.falta += v; r.nFalta++; }
      if(a.cat!=='ok'){ m.abertos++; r.nAbertos++; }
      r.fazer[a.cat].push({ l:l, a:a, quem:(P[l.profId]||{}).apelido || l.profId, v:v });
    });
    return r;
  }

  // ------------------------------------------------------------ seletor: abas, ano (tubo) e meses com o status
  function seletor(per){
    var porMes = {}, doAno = []; S.M.lancamentos.forEach(function(l){ if(l.ciclo.slice(0,4)!==per.ano) return; doAno.push(l); (porMes[l.ciclo] = porMes[l.ciclo] || []).push(l); });
    var st = function(ls){
      if(!ls || !ls.length) return '<span class="st"><i class="dot"></i>sem lançamentos</span>';
      var ab = {}, rb = {}; ls.forEach(function(l){ if(D.acao(l).cat!=='ok') ab[l.profId] = 1; if(num(l.vReembolsado)!==null) rb[l.profId] = 1; });
      var na = Object.keys(ab).length, nr = Object.keys(rb).length;
      return na ? '<span class="st"><i class="dot am"></i>'+na+' a ajustar</span>' : '<span class="st"><i class="dot vd"></i>Tudo ok</span><small>'+nr+' reembolsado'+(nr===1?'':'s')+'</small>';
    };
    var btn = function(mes, rot, ls){ return '<button type="button" class="mb'+(mes ? '' : ' ano')+((per.mes||'')===mes ? ' on' : '')+'" data-mes="'+mes+'"><b>'+rot+'</b>'+st(ls)+'</button>'; };
    var meses = D.MESES.map(function(n, i){ var k = per.ano+'-'+(i<9?'0':'')+(i+1); return btn(k, n, porMes[k]); }).join('');
    return '<div class="abas" role="tablist">'+ABAS.map(function(a){ return '<button role="tab" class="aba'+((S.pnAba||'painel')===a[0]?' on':'')+'" data-pa="'+a[0]+'">'+a[1]+'</button>'; }).join('')+'</div>'+
      '<div class="seletor"><div class="linha-ano"><div class="tubo" role="group" aria-label="Ano">'+anos().map(function(a){ return '<button type="button" data-ano="'+a+'" class="'+(a===per.ano?'on':'')+'">'+a+'</button>'; }).join('')+'</div>'+btn('', 'Ano inteiro', doAno)+'</div>'+
      '<div class="m12">'+meses+'</div></div>';
  }

  // ------------------------------------------------------------ painel geral
  function tiles(c, n, per){
    var tile = function(t, v, s, at){ return '<div class="tile'+(at?' at':'')+'"><span>'+t+'</span><b>'+brl(v)+'</b><small>'+s+'</small></div>'; };
    var pA = media(c.dA), pT = media(c.dT);
    return '<div class="tiles">'+
      tile('Total reembolsado', c.reemb, c.solic ? Math.round(100*c.reemb/c.solic)+'% do que foi solicitado' : 'em '+rotPer(per))+
      tile('Total em aberto', c.emAberto, 'ainda a receber da Amil ('+c.nAbertos+' lançamentos com algo a fazer)', c.emAberto>0)+
      '<div class="tile"><span>Prazo médio de recebimento</span><b>'+(pA===null ? '—' : pA+' dias')+'</b><small>da solicitação ao depósito'+(pT===null ? '' : ' · do pagamento ao depósito: '+pT+' d')+'</small></div>'+
      tile('Falta lançar', c.falta, c.nFalta+' reembolsos já pagos, sem valor registrado', c.falta>0)+
      tile('Não lançado na Amil', c.nunca, c.nNunca+' lançamentos ainda sem protocolo', c.nunca>0)+
      tile('Valor total', c.fat, n+' lançamentos · '+brl(c.solic)+' solicitados')+'</div>';
  }

  /** Os lançamentos de um mês, em tabela (valores sem R$: a moeda está no cabeçalho). */
  function detalheMes(c, abrir){
    var P = App.mapaProf(), L = S.M.lancamentos.filter(function(l){ return l.ciclo===c; }).sort(function(a,b){
      var pa = P[a.profId]||{}, pb = P[b.profId]||{};
      return (D.TERAPIAS.indexOf(pa.terapia||'')-D.TERAPIAS.indexOf(pb.terapia||'')) || String(pa.apelido||'').localeCompare(String(pb.apelido||''),'pt-BR'); });
    var rows = L.map(function(l){
      var p = P[l.profId]||{}, a = D.acao(l), ds = D.diasSolic(l), rv = num(l.vReembolsado);
      return '<tr class="clic" data-l="'+esc(l.id)+'" data-c="'+esc(c)+'"><td><b>'+esc(p.apelido||l.profId)+'</b>'+(l.parcela?' <small>p'+esc(l.parcela)+'</small>':'')+'</td><td>'+esc(D.SIGLA[p.terapia||'x'])+(p.papel ? ' <small>'+esc(p.papel)+'</small>' : '')+'</td><td>'+D.moeda(num(l.valor))+'</td>'+
        '<td>'+(l.dtEntrada ? D.dataCurta(l.dtEntrada)+(ds ? '<br><small>'+(ds.fechado ? ds.dias+' d até o reembolso' : 'há '+ds.dias+' dias')+'</small>' : '') : '—')+'</td><td>'+esc(l.numProtocolo||'—')+'</td><td>'+D.statusChip(l.status)+'</td><td>'+(rv!==null ? D.moeda(rv) : '—')+'</td><td><span class="ac '+a.nivel+'">'+esc(a.texto)+'</span></td></tr>'; }).join('');
    return '<div class="det-in"><div class="tw"><table class="tb2 ctr" style="min-width:820px"><thead><tr><th>Profissional</th><th>Terapia</th><th>Valor (R$)</th><th>Solicitado em</th><th>Protocolo</th><th>Status na Amil</th><th>Reembolsado (R$)</th><th>O que fazer</th></tr></thead><tbody>'+(rows || '<tr><td colspan="8">Sem lançamentos.</td></tr>')+'</tbody></table></div>'+
      (abrir ? '<div class="ups" style="justify-content:center"><button class="bt cl peq" data-abrir="'+esc(c)+'">Abrir o ciclo completo</button></div>' : '')+'</div>';
  }

  function tabelaMeses(c){
    var ciclos = Object.keys(c.meses).sort(), tot = { np:{}, fat:0, solic:0, reemb:0, ab:0, st:{ proc:0, conf:0, rean:0, rec:0, out:0 } };
    var cel = function(n){ return '<td class="n">'+(n ? n : '<span class="zero">·</span>')+'</td>'; };
    var linhas = ciclos.map(function(k){
      var m = c.meses[k], md = mediana(m.d), np = Object.keys(m.profs).length;
      tot.fat += m.fat; tot.solic += m.solic; tot.reemb += m.reemb; tot.ab += m.abertos; Object.keys(m.profs).forEach(function(p){ tot.np[p] = 1; }); Object.keys(m.st).forEach(function(s){ tot.st[s] += m.st[s]; });
      return '<tr class="clic" data-c="'+k+'"><td><b>'+D.mmaa(k)+'</b></td><td class="n">'+np+'</td><td class="n">'+D.moeda(m.fat)+'</td><td class="n">'+D.moeda(m.solic)+'</td><td class="n">'+D.moeda(m.reemb)+'</td>'+
        '<td class="n">'+(m.solic ? Math.round(100*m.reemb/m.solic)+'%' : '—')+'</td><td class="n">'+(m.abertos ? '<span class="chip">'+m.abertos+'</span>' : '<span class="chip ok">0</span>')+'</td>'+
        cel(m.st.proc)+cel(m.st.conf)+cel(m.st.rean)+cel(m.st.rec)+cel(m.st.out)+'<td class="n">'+(md===null ? '—' : md)+'</td></tr>';
    }).join('');
    var rod = '<tr><td>Total</td><td class="n">'+Object.keys(tot.np).length+'</td><td class="n">'+D.moeda(tot.fat)+'</td><td class="n">'+D.moeda(tot.solic)+'</td><td class="n">'+D.moeda(tot.reemb)+'</td><td class="n">'+(tot.solic ? Math.round(100*tot.reemb/tot.solic)+'%' : '—')+'</td><td class="n">'+tot.ab+'</td>'+
      ['proc','conf','rean','rec','out'].map(function(s){ return '<td class="n">'+(tot.st[s]||'·')+'</td>'; }).join('')+'<td class="n"></td></tr>';
    var max = Math.max.apply(null, ciclos.map(function(k){ return Math.max(c.meses[k].fat, c.meses[k].reemb); }).concat([1]));
    var barras = ciclos.map(function(k){ var m = c.meses[k], rot = D.mmaa(k);
      return '<div class="mes" role="img" aria-label="'+rot+': valor '+brl(m.fat)+', reembolsado '+brl(m.reemb)+'" title="Valor '+brl(m.fat)+' · Reembolsado '+brl(m.reemb)+'"><div class="par"><i class="f" style="height:'+(100*m.fat/max)+'%"><em>'+D.curto(m.fat)+'</em></i><i class="r" style="height:'+(100*m.reemb/max)+'%"><em>'+D.curto(m.reemb)+'</em></i></div>'+rot+'</div>'; }).join('');
    return '<div class="cx"><h3>Mês a mês</h3><p class="sub">Do primeiro mês ao último. Toque numa linha para ver os lançamentos do mês logo abaixo. Valores em reais; prazo em dias corridos da solicitação ao reembolso (mediana).</p>'+
      '<div class="tw"><table class="tb2 ctr dens" style="min-width:0"><thead><tr><th>Mês</th><th class="n">Prof.</th><th class="n">Valor (R$)</th><th class="n">Solicitado (R$)</th><th class="n">Reembolsado (R$)</th><th class="n">%</th><th class="n">Em aberto</th><th class="n">Em process.</th><th class="n">Confirmado</th><th class="n">Reanálise</th><th class="n">Recusado</th><th class="n">Outros</th><th class="n">Prazo (d)</th></tr></thead><tbody>'+linhas+'</tbody><tfoot>'+rod+'</tfoot></table></div></div>'+
      '<div class="cx"><h3>Valor e reembolso por mês</h3><div class="barras com-rot">'+barras+'</div><div class="leg"><span><i style="background:var(--azesc)"></i>Valor do mês (R$)</span><span><i style="background:#8DB4DB"></i>Reembolsado (R$)</span></div></div>';
  }

  /** Gráfico de horas empilhado (por terapia ou por profissional) para o período escolhido. */
  function horasCard(per, por, titulo, profId){
    var gr = per.mes ? 'sem' : (S.pnGr || 'ciclo'), dh = D.dadosHoras(gr, por, per.ano, per.mes, profId);
    var tg = per.mes ? '' : '<div class="tubo peq" role="group"><button type="button" data-gr="ciclo" class="'+(gr==='ciclo'?'on':'')+'">Por mês</button><button type="button" data-gr="sem" class="'+(gr==='sem'?'on':'')+'">Por semana</button></div>';
    return '<div class="cx"><div class="tb" style="margin:0 0 6px"><h3 style="margin:0">'+esc(titulo)+'</h3><span class="gap"></span>'+tg+'</div>'+
      (dh.vazio ? '<p class="sub">Nenhum atendimento registrado em '+esc(rotPer(per))+'. Marque os atendimentos na Agenda (Sessões) e o gráfico aparece aqui.</p>'
        : '<p class="sub">Horas de atendimento por '+(gr==='sem' ? 'semana (segunda a domingo; rótulo = dia da segunda)' : 'mês')+', '+esc(rotPer(per))+'.</p>'+D.chartStack(dh.cats, dh.series, dh.val))+'</div>';
  }

  function geral(per){
    var L = lancs(per), c = calc(L), h = '';
    if(!L.length) h += '<div class="cx"><p class="sub">Nenhum lançamento em '+esc(rotPer(per))+'.</p></div>';
    else h += tiles(c, L.length, per);
    if(per.mes) h += L.length ? '<div class="cx"><h3>Lançamentos de '+D.mmaa(per.mes)+'</h3>'+detalheMes(per.mes, true)+'</div>' : '';
    else if(L.length) h += tabelaMeses(c);
    return h + horasCard(per, 'terapia', 'Horas por tipo de terapia') + horasCard(per, 'prof', 'Horas por profissional');
  }

  // ------------------------------------------------------------ pendências
  function pend(per){
    var c = calc(lancs(per));
    var ordem = Object.keys(D.CATS).filter(function(k){ return k!=='ok' && c.fazer[k].length; }).sort(function(a,b){ return D.CATS[a].ordem - D.CATS[b].ordem; });
    var fazer = ordem.map(function(k, i){
      var itens = c.fazer[k].sort(function(x,y){ return x.l.ciclo.localeCompare(y.l.ciclo) || x.quem.localeCompare(y.quem,'pt-BR'); });
      var tot = itens.reduce(function(s,x){ return s + x.v; }, 0);
      return '<details class="causa"'+(i<3?' open':'')+'><summary><span class="ct">'+esc(D.CATS[k].rot)+' · '+itens.length+'</span><span class="cv">'+brl(tot)+'</span></summary><ul class="lst">'+
        itens.map(function(x){
          return '<li><button class="lk3" data-l="'+esc(x.l.id)+'" data-c="'+esc(x.l.ciclo)+'"><b>'+esc(x.quem)+'</b> · '+D.mmaa(x.l.ciclo)+(x.l.parcela?' · parcela '+esc(x.l.parcela):'')+'</button>'+
            '<span class="ac '+x.a.nivel+'">'+esc(x.a.texto)+'</span><span class="v">'+brl(x.v)+'</span></li>'; }).join('')+'</ul></details>';
    }).join('') || '<p class="sub">Nada em aberto em '+esc(rotPer(per))+'. Tudo em dia.</p>';
    return '<div class="cx"><h3>Pendências de '+esc(rotPer(per))+'</h3><p class="sub">Só o que está em aberto, agrupado pelo que precisa ser feito. Toque num item para abrir o lançamento.</p>'+fazer+'</div>';
  }

  // ------------------------------------------------------------ por terapia
  function porTerapia(per){
    var P = App.mapaProf(), SS = sess(per), L = lancs(per), linhas = '', tot = { h:0, ap:0, su:0, sf:0, pago:0, re:0, so:0, ab:0 };
    D.TERAPIAS.forEach(function(t){
      var ls = L.filter(function(l){ return ((P[l.profId]||{}).terapia||'')===t; }), ss = SS.filter(function(s){ return ((P[s.profId]||{}).terapia||'')===t; });
      if(!ls.length && !ss.length) return;
      var profs = {}; ls.forEach(function(l){ profs[l.profId] = 1; }); ss.forEach(function(s){ profs[s.profId] = 1; });
      var h = 0, ap = 0, su = 0; ss.forEach(function(s){ var x = num(s.horas)||0, pp = D.funcao(P[s.profId]); h += x; if(pp==='apl') ap += x; else if(pp==='sup') su += x; });
      var pago = 0, re = 0, so = 0, ab = 0; ls.forEach(function(l){ var v = num(l.valor)||0, rv = num(l.vReembolsado); pago += v; if(l.dtEntrada) so += v; if(rv!==null) re += rv; if(D.acao(l).cat!=='ok') ab++; });
      tot.h += h; tot.ap += ap; tot.su += su; tot.sf += h-ap-su; tot.pago += pago; tot.re += re; tot.so += so; tot.ab += ab;
      linhas += '<tr><td><b>'+esc(D.GRUPO_NOME[t])+'</b></td><td class="n">'+Object.keys(profs).length+'</td><td class="n">'+(h ? hh(h) : '—')+'</td><td class="n">'+(ap ? hh(ap) : '—')+'</td><td class="n">'+(su ? hh(su) : '—')+'</td><td class="n">'+(h-ap-su>0.001 ? hh(h-ap-su) : '—')+'</td><td class="n">'+D.moeda(pago)+'</td><td class="n">'+D.moeda(re)+'</td><td class="n">'+(so ? Math.round(100*re/so)+'%' : '—')+'</td><td class="n">'+(ab ? '<span class="chip">'+ab+'</span>' : '<span class="chip ok">0</span>')+'</td></tr>';
    });
    var rod = '<tr><td>Total</td><td class="n"></td><td class="n">'+hh(tot.h)+'</td><td class="n">'+hh(tot.ap)+'</td><td class="n">'+hh(tot.su)+'</td><td class="n">'+hh(tot.sf)+'</td><td class="n">'+D.moeda(tot.pago)+'</td><td class="n">'+D.moeda(tot.re)+'</td><td class="n">'+(tot.so ? Math.round(100*tot.re/tot.so)+'%' : '—')+'</td><td class="n">'+tot.ab+'</td></tr>';
    return '<div class="cx"><h3>Análise por tipo de terapia · '+esc(rotPer(per))+'</h3><p class="sub">Horas de atendimento (separadas em aplicação e supervisão, conforme a função cadastrada em cada profissional) e o dinheiro de cada terapia.</p>'+
      (linhas ? '<div class="tw"><table class="tb2 ctr dens" style="min-width:0"><thead><tr><th>Terapia</th><th class="n">Prof.</th><th class="n">Horas</th><th class="n">Aplicação (h)</th><th class="n">Supervisão (h)</th><th class="n">Sem função (h)</th><th class="n">Valor (R$)</th><th class="n">Reembolsado (R$)</th><th class="n">%</th><th class="n">Em aberto</th></tr></thead><tbody>'+linhas+'</tbody><tfoot>'+rod+'</tfoot></table></div>' : '<p class="sub">Nada em '+esc(rotPer(per))+'.</p>')+'</div>'+
      horasCard(per, 'terapia', 'Horas por tipo de terapia');
  }

  // ------------------------------------------------------------ por profissional
  function porProf(per){
    var P = App.mapaProf(), SS = sess(per), L = lancs(per), ids = {}; L.forEach(function(l){ ids[l.profId] = 1; }); SS.forEach(function(s){ ids[s.profId] = 1; });
    var lista = Object.keys(ids).map(function(id){ return P[id] || { id:id, apelido:id, nome:id }; }).sort(function(a,b){ return (D.TERAPIAS.indexOf(a.terapia||'')-D.TERAPIAS.indexOf(b.terapia||'')) || String(a.apelido||a.nome).localeCompare(String(b.apelido||b.nome),'pt-BR'); });
    var linhas = lista.map(function(p){
      var ls = L.filter(function(l){ return l.profId===p.id; }), h = SS.filter(function(s){ return s.profId===p.id; }).reduce(function(t,s){ return t + (num(s.horas)||0); }, 0);
      var pago = 0, re = 0, so = 0, ab = 0, d = []; ls.forEach(function(l){ var v = num(l.valor)||0, rv = num(l.vReembolsado); pago += v; if(l.dtEntrada) so += v; if(rv!==null) re += rv; if(D.acao(l).cat!=='ok') ab++; var x = D.dias(l.dtEntrada, l.dtReembolso); if(x!==null && x>=0) d.push(x); });
      return '<tr class="clic" data-p="'+esc(p.id)+'"><td><b>'+esc(p.apelido||p.nome)+'</b></td><td>'+esc(D.SIGLA[p.terapia||'x'])+'</td><td>'+esc(p.papel||'—')+'</td><td class="n">'+(h ? hh(h) : '—')+'</td><td class="n">'+D.moeda(pago)+'</td><td class="n">'+D.moeda(re)+'</td><td class="n">'+(so ? Math.round(100*re/so)+'%' : '—')+'</td><td class="n">'+(ab ? '<span class="chip">'+ab+'</span>' : '<span class="chip ok">0</span>')+'</td><td class="n">'+(media(d)===null ? '—' : media(d))+'</td></tr>'; }).join('');
    var sel = '<label class="campo" style="max-width:320px"><span>Gráficos de</span><select id="pn-prof"><option value="">Todos os profissionais</option>'+lista.map(function(p){ return '<option value="'+esc(p.id)+'"'+(S.pnProf===p.id?' selected':'')+'>'+esc(p.apelido||p.nome)+'</option>'; }).join('')+'</select></label>';
    var pid = ids[S.pnProf] ? S.pnProf : '';
    return '<div class="cx"><h3>Análise por profissional · '+esc(rotPer(per))+'</h3><p class="sub">Toque num profissional para abrir a ficha. Prazo = média de dias da solicitação ao reembolso.</p>'+
      (linhas ? '<div class="tw"><table class="tb2 ctr dens" style="min-width:0"><thead><tr><th>Profissional</th><th>Terapia</th><th>Função</th><th class="n">Horas</th><th class="n">Valor (R$)</th><th class="n">Reembolsado (R$)</th><th class="n">%</th><th class="n">Em aberto</th><th class="n">Prazo (d)</th></tr></thead><tbody>'+linhas+'</tbody></table></div>' : '<p class="sub">Nada em '+esc(rotPer(per))+'.</p>')+'</div>'+
      '<div class="cx">'+sel+'</div>'+horasCard(per, 'prof', pid ? 'Horas de '+((P[pid]||{}).apelido||pid) : 'Horas por profissional', pid);
  }

  function tela(){
    if(!S.M.lancamentos.length && !S.M.sessoes.length) return '<div class="cx"><h3>Painel</h3><p class="sub">Nenhum lançamento ainda. Abra o primeiro ciclo na tela Ciclo.</p></div>';
    var per = periodo(), aba = S.pnAba || 'painel';
    return seletor(per)+(aba==='pend' ? pend(per) : aba==='terapia' ? porTerapia(per) : aba==='prof' ? porProf(per) : geral(per));
  }

  tela.depois = function(){
    var go = function(){ App.ir('painel'); };
    $$('[data-pa]').forEach(function(x){ x.onclick = function(){ S.pnAba = x.dataset.pa; go(); }; });
    $$('[data-ano]').forEach(function(x){ x.onclick = function(){ S.pnAno = x.dataset.ano; S.pnMes = ''; go(); }; });
    $$('[data-mes]').forEach(function(x){ x.onclick = function(){ S.pnMes = x.dataset.mes; go(); }; });
    $$('[data-gr]').forEach(function(x){ x.onclick = function(){ S.pnGr = x.dataset.gr; go(); }; });
    if($('#pn-prof')) $('#pn-prof').onchange = function(){ S.pnProf = this.value; go(); };
    $$('tr.clic[data-p]').forEach(function(tr){ tr.onclick = function(){ S.prof = tr.dataset.p; S.profTab = 'cad'; App.ir('profissionais'); }; });
    $$('.lk3[data-l]').forEach(function(x){ x.onclick = function(){ S.ciclo = x.dataset.c; S.lanSel = x.dataset.l; App.ir('ciclo'); }; });
    $$('[data-abrir]').forEach(function(b){ b.onclick = function(){ S.ciclo = b.dataset.abrir; S.lanSel = null; App.ir('ciclo'); }; });
    $$('[data-l]').forEach(function(tr){ if(tr.tagName==='TR') tr.onclick = function(){ S.ciclo = tr.dataset.c; S.lanSel = tr.dataset.l; App.ir('ciclo'); }; });
    $$('tr.clic[data-c]:not([data-l])').forEach(function(x){ x.onclick = function(){
      var prox = x.nextElementSibling;
      if(prox && prox.classList.contains('det')){ prox.remove(); x.classList.remove('aberto'); return; }
      x.classList.add('aberto'); x.insertAdjacentHTML('afterend', '<tr class="det"><td colspan="13">'+detalheMes(x.dataset.c, true)+'</td></tr>');
      var det = x.nextElementSibling;
      $$('tr[data-l]', det).forEach(function(tr){ tr.onclick = function(){ S.ciclo = tr.dataset.c; S.lanSel = tr.dataset.l; App.ir('ciclo'); }; });
      $$('[data-abrir]', det).forEach(function(b){ b.onclick = function(){ S.ciclo = b.dataset.abrir; S.lanSel = null; App.ir('ciclo'); }; });
    }; });
  };
  App.TELAS.painel = tela;
});
