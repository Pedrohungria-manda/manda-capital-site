/* Painel: o ano em números, o que fazer agora e o fechamento mês a mês. */
(window.__mods = window.__mods || []).push(function(App){
  var D = App.D, $ = App.$, $$ = App.$$, esc = App.esc, brl = App.brl, num = App.num, S = App.S;

  function mediana(v){ if(!v.length) return null; v = v.slice().sort(function(a,b){ return a-b; }); var m = v.length>>1; return v.length%2 ? v[m] : Math.round((v[m-1]+v[m])/2); }

  function calc(){
    var L = S.M.lancamentos, P = App.mapaProf();
    var r = { fat:0, solic:0, reemb:0, falta:0, nunca:0, nFalta:0, nNunca:0, nAbertos:0, meses:{}, fazer:{}, dA:[], dT:[], emAberto:0 };
    Object.keys(D.CATS).forEach(function(k){ r.fazer[k] = []; });
    L.forEach(function(l){
      var v = num(l.valor)||0, rv = num(l.vReembolsado), a = D.acao(l), ds = D.diasSolic(l);
      var m = r.meses[l.ciclo] = r.meses[l.ciclo] || { fat:0, solic:0, reemb:0, n:0, abertos:0, st:{}, d:[], profs:{} };
      r.fat += v; m.fat += v; m.n++; m.profs[l.profId] = 1; m.st[l.status||'—'] = (m.st[l.status||'—']||0) + 1;
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
    r.provavel = r.fat - r.reemb - r.falta;
    return r;
  }

  /** Os lançamentos do mês, abertos logo abaixo da linha do painel (sem trocar de página). */
  function detalheMes(c){
    var P = App.mapaProf(), L = S.M.lancamentos.filter(function(l){ return l.ciclo===c; }).sort(function(a,b){
      var pa = P[a.profId]||{}, pb = P[b.profId]||{};
      return (D.TERAPIAS.indexOf(pa.terapia||'')-D.TERAPIAS.indexOf(pb.terapia||'')) || String(pa.apelido||'').localeCompare(String(pb.apelido||''),'pt-BR'); });
    var rows = L.map(function(l){
      var p = P[l.profId]||{}, a = D.acao(l), ds = D.diasSolic(l), rv = num(l.vReembolsado);
      return '<tr class="clic" data-l="'+esc(l.id)+'" data-c="'+esc(c)+'"><td><b>'+esc(p.apelido||l.profId)+'</b>'+(l.parcela?' <small>p'+esc(l.parcela)+'</small>':'')+'</td><td>'+esc(D.SIGLA[p.terapia||'x'])+'</td><td>'+brl(num(l.valor))+'</td>'+
        '<td>'+(l.dtEntrada ? App.dataBR(l.dtEntrada)+(ds ? '<br><small>'+(ds.fechado ? ds.dias+' d até o reembolso' : 'há '+ds.dias+' dias')+'</small>' : '') : '—')+'</td><td>'+esc(l.numProtocolo||'—')+'</td><td>'+D.statusChip(l.status)+'</td><td>'+(rv!==null ? brl(rv) : '—')+'</td><td><span class="ac '+a.nivel+'">'+esc(a.texto)+'</span></td></tr>'; }).join('');
    return '<div class="det-in"><div class="tw"><table class="tb2 ctr" style="min-width:820px"><thead><tr><th>Profissional</th><th>Terapia</th><th>Valor</th><th>Solicitado em</th><th>Protocolo</th><th>Status na Amil</th><th>Reembolsado</th><th>O que fazer</th></tr></thead><tbody>'+(rows || '<tr><td colspan="8">Sem lançamentos.</td></tr>')+'</tbody></table></div>'+
      '<div class="ups" style="justify-content:center"><button class="bt cl peq" data-abrir="'+esc(c)+'">Abrir o ciclo completo</button></div></div>';
  }

  function tela(){
    var L = S.M.lancamentos;
    if(!L.length) return '<div class="cx"><h3>Painel</h3><p class="sub">Nenhum lançamento ainda. Abra o primeiro ciclo na tela Ciclo.</p></div>';
    var c = calc();
    var tile = function(t, v, s, at){ return '<div class="tile'+(at?' at':'')+'"><span>'+t+'</span><b>'+brl(v)+'</b><small>'+s+'</small></div>'; };
    var media = function(v){ return v.length ? Math.round(v.reduce(function(s,x){ return s+x; }, 0)/v.length) : null; };
    var pA = media(c.dA), pT = media(c.dT);
    var tileTxt = function(t, v, s){ return '<div class="tile"><span>'+t+'</span><b>'+v+'</b><small>'+s+'</small></div>'; };
    var tiles = '<div class="tiles">'+
      tile('Total reembolsado', c.reemb, c.solic ? Math.round(100*c.reemb/c.solic)+'% do que foi solicitado' : '')+
      tile('Total em aberto', c.emAberto, 'ainda a receber da Amil ('+c.nAbertos+' lançamentos com algo a fazer)', c.emAberto>0)+
      tileTxt('Prazo médio de recebimento', pA===null ? '—' : pA+' dias', pT===null ? 'da solicitação ao depósito' : 'da solicitação ao depósito · do pagamento ao depósito: '+pT+' d')+
      tile('Falta lançar', c.falta, c.nFalta+' reembolsos já pagos, sem valor registrado', c.falta>0)+
      tile('Não lançado na Amil', c.nunca, c.nNunca+' lançamentos ainda sem protocolo', c.nunca>0)+
      tile('Valor dos meses', c.fat, L.length+' lançamentos · '+brl(c.solic)+' solicitados')+'</div>';
    var gr = S.pnGr || 'sem', dh = D.dadosHoras(gr);
    var horas = '<div class="cx"><h3>Horas dos profissionais</h3><div class="abas" role="tablist"><button role="tab" class="aba'+(gr==='sem'?' on':'')+'" data-gr="sem">Por semana</button><button role="tab" class="aba'+(gr==='ciclo'?' on':'')+'" data-gr="ciclo">Por ciclo (mês)</button></div>'+
      (dh.vazio ? '<p class="sub">Ainda não há atendimentos registrados. Marque os atendimentos na Agenda (Sessões) e o gráfico aparece aqui.</p>' : '<p class="sub">'+(gr==='sem' ? 'Horas de atendimento por semana (segunda a domingo), nas últimas 12 semanas.' : 'Horas de atendimento por ciclo mensal.')+' Cada cor é um profissional.</p>'+D.chartStack(dh.cats, dh.series, dh.val))+'</div>';

    var ordem = Object.keys(D.CATS).filter(function(k){ return k!=='ok' && c.fazer[k].length; }).sort(function(a,b){ return D.CATS[a].ordem - D.CATS[b].ordem; });
    var fazer = ordem.map(function(k, i){
      var itens = c.fazer[k].sort(function(x,y){ return y.l.ciclo.localeCompare(x.l.ciclo) || x.quem.localeCompare(y.quem,'pt-BR'); });
      var tot = itens.reduce(function(s,x){ return s + x.v; }, 0);
      return '<details class="causa"'+(i<3?' open':'')+'><summary><span class="ct">'+esc(D.CATS[k].rot)+' · '+itens.length+'</span><span class="cv">'+brl(tot)+'</span></summary><ul class="lst">'+
        itens.map(function(x){
          return '<li><button class="lk3" data-l="'+esc(x.l.id)+'" data-c="'+esc(x.l.ciclo)+'"><b>'+esc(x.quem)+'</b> · '+D.mmaa(x.l.ciclo)+(x.l.parcela?' · parcela '+esc(x.l.parcela):'')+'</button>'+
            '<span class="ac '+x.a.nivel+'">'+esc(x.a.texto)+'</span><span class="v">'+brl(x.v)+'</span></li>'; }).join('')+'</ul></details>';
    }).join('') || '<p class="sub">Nada em aberto. Tudo em dia.</p>';

    var ciclos = Object.keys(c.meses).sort().reverse();
    var linhas = ciclos.map(function(k){
      var m = c.meses[k], md = mediana(m.d), np = Object.keys(m.profs).length;
      var st = Object.keys(m.st).sort().map(function(s){ return D.statusChip(s).replace('</span>', ' · '+m.st[s]+'</span>'); }).join('');
      return '<tr class="clic" data-c="'+k+'"><td><b>'+D.mmaa(k)+'</b></td><td class="n">'+np+'</td><td class="n">'+brl(m.fat)+'</td><td class="n">'+brl(m.solic)+'</td><td class="n">'+brl(m.reemb)+'</td>'+
        '<td class="n">'+(m.solic ? Math.round(100*m.reemb/m.solic)+'%' : '—')+'</td><td class="n">'+(m.abertos ? '<span class="chip">'+m.abertos+' em aberto</span>' : '<span class="chip ok">fechado</span>')+'</td>'+
        '<td>'+st+'</td><td class="n">'+(md===null ? '—' : md+' d')+'</td></tr>';
    }).join('');
    var max = Math.max.apply(null, ciclos.map(function(k){ return Math.max(c.meses[k].fat, c.meses[k].reemb); }).concat([1]));
    var barras = ciclos.slice().reverse().map(function(k){ var m = c.meses[k], rot = D.mmaa(k);
      return '<div class="mes" role="img" aria-label="'+rot+': valor '+brl(m.fat)+', reembolsado '+brl(m.reemb)+'" title="Valor '+brl(m.fat)+' · Reembolsado '+brl(m.reemb)+'"><div class="par"><i class="f" style="height:'+(100*m.fat/max)+'%"></i><i class="r" style="height:'+(100*m.reemb/max)+'%"></i></div>'+rot+'</div>'; }).join('');

    return '<div class="tb"><span class="gap"></span><span class="msg" id="pn-msg"></span><button class="bt cl" id="pn-prova">Exportar prova (PDF)</button></div>'+tiles+horas+
      '<div class="cx"><h3>O que fazer agora</h3><p class="sub">Tudo que está em aberto, agrupado pelo que precisa ser feito. Toque num item para abrir o lançamento.</p>'+fazer+'</div>'+
      '<div class="cx"><h3>Mês a mês</h3><p class="sub">Valor do mês, quanto já foi solicitado e reembolsado, e a situação de cada solicitação. Toque numa linha para ver os lançamentos do mês logo abaixo.</p>'+
      '<div class="tw"><table class="tb2 ctr" style="min-width:900px"><thead><tr><th>Mês</th><th class="n">Prof.</th><th class="n">Valor</th><th class="n">Solicitado</th><th class="n">Reembolsado</th><th class="n">%</th><th class="n">Situação</th><th>Status na Amil</th><th class="n">Prazo Amil</th></tr></thead><tbody>'+linhas+'</tbody></table></div>'+
      '<div class="barras" style="margin-top:18px">'+barras+'</div><div class="leg"><span><i style="background:var(--azesc)"></i>Valor do mês</span><span><i style="background:#8DB4DB"></i>Reembolsado</span></div></div>';
  }
  tela.depois = function(){
    var b = $('#pn-prova'); if(b) b.onclick = function(){ App.exportarProva(this, $('#pn-msg')); };
    $$('[data-gr]').forEach(function(x){ x.onclick = function(){ S.pnGr = x.dataset.gr; App.ir('painel'); }; });
    $$('.lk3[data-l]').forEach(function(x){ x.onclick = function(){ S.ciclo = x.dataset.c; S.lanSel = x.dataset.l; App.ir('ciclo'); }; });
    $$('tr.clic[data-c]').forEach(function(x){ x.onclick = function(){
      var prox = x.nextElementSibling;
      if(prox && prox.classList.contains('det')){ prox.remove(); x.classList.remove('aberto'); return; }
      x.classList.add('aberto'); x.insertAdjacentHTML('afterend', '<tr class="det"><td colspan="9">'+detalheMes(x.dataset.c)+'</td></tr>');
      var det = x.nextElementSibling;
      $$('[data-l]', det).forEach(function(tr){ tr.onclick = function(){ S.ciclo = tr.dataset.c; S.lanSel = tr.dataset.l; App.ir('ciclo'); }; });
      $$('[data-abrir]', det).forEach(function(b){ b.onclick = function(){ S.ciclo = b.dataset.abrir; S.lanSel = null; App.ir('ciclo'); }; });
    }; });
  };
  App.TELAS.painel = tela;
});
