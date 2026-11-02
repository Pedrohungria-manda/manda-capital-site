/* Painel: o ano em números, o que fazer agora e o fechamento mês a mês. */
(window.__mods = window.__mods || []).push(function(App){
  var D = App.D, $ = App.$, $$ = App.$$, esc = App.esc, brl = App.brl, num = App.num, S = App.S;

  function mediana(v){ if(!v.length) return null; v = v.slice().sort(function(a,b){ return a-b; }); var m = v.length>>1; return v.length%2 ? v[m] : Math.round((v[m-1]+v[m])/2); }

  function calc(){
    var L = S.M.lancamentos, P = App.mapaProf();
    var r = { fat:0, solic:0, reemb:0, falta:0, nunca:0, nFalta:0, nNunca:0, nAbertos:0, meses:{}, fazer:{} };
    Object.keys(D.CATS).forEach(function(k){ r.fazer[k] = []; });
    L.forEach(function(l){
      var v = num(l.valor)||0, rv = num(l.vReembolsado), a = D.acao(l), ds = D.diasSolic(l);
      var m = r.meses[l.ciclo] = r.meses[l.ciclo] || { fat:0, solic:0, reemb:0, n:0, abertos:0, st:{}, d:[], profs:{} };
      r.fat += v; m.fat += v; m.n++; m.profs[l.profId] = 1; m.st[l.status||'—'] = (m.st[l.status||'—']||0) + 1;
      if(l.dtEntrada){ r.solic += v; m.solic += v; }
      if(rv!==null){ r.reemb += rv; m.reemb += rv; }
      if(l.dtReembolso && l.dtEntrada){ var d = D.dias(l.dtEntrada, l.dtReembolso); if(d!==null && d>=0) m.d.push(d); }
      if(!l.dtEntrada){ r.nunca += v; r.nNunca++; }
      else if(l.dtReembolso && rv===null){ r.falta += v; r.nFalta++; }
      if(a.cat!=='ok'){ m.abertos++; r.nAbertos++; }
      r.fazer[a.cat].push({ l:l, a:a, quem:(P[l.profId]||{}).apelido || l.profId, v:v });
    });
    r.provavel = r.fat - r.reemb - r.falta;
    return r;
  }

  function tela(){
    var L = S.M.lancamentos;
    if(!L.length) return '<div class="cx"><h3>Painel</h3><p class="sub">Nenhum lançamento ainda. Abra o primeiro ciclo na tela Ciclo.</p></div>';
    var c = calc();
    var tile = function(t, v, s, at){ return '<div class="tile'+(at?' at':'')+'"><span>'+t+'</span><b>'+brl(v)+'</b><small>'+s+'</small></div>'; };
    var tiles = '<div class="tiles">'+
      tile('Valor dos meses', c.fat, L.length+' lançamentos')+
      tile('Solicitado na Amil', c.solic, c.fat ? Math.round(100*c.solic/c.fat)+'% do valor dos meses' : '')+
      tile('Reembolsado', c.reemb, c.solic ? Math.round(100*c.reemb/c.solic)+'% do solicitado' : '')+
      tile('Falta lançar', c.falta, c.nFalta+' reembolsos pagos sem valor registrado', c.falta>0)+
      tile('Ainda não solicitado', c.nunca, c.nNunca+' lançamentos sem protocolo na Amil', c.nunca>0)+
      tile('A receber (provável)', c.provavel, 'valor − reembolsado − falta lançar')+'</div>';

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

    return '<div class="tb"><span class="gap"></span><span class="msg" id="pn-msg"></span><button class="bt cl" id="pn-prova">Exportar prova (PDF)</button></div>'+tiles+
      '<div class="cx"><h3>O que fazer agora</h3><p class="sub">Tudo que está em aberto, agrupado pelo que precisa ser feito. Toque num item para abrir o lançamento.</p>'+fazer+'</div>'+
      '<div class="cx"><h3>Mês a mês</h3><p class="sub">Valor do mês, quanto já foi solicitado e reembolsado, e a situação de cada solicitação. Toque numa linha para abrir o ciclo.</p>'+
      '<div class="tw"><table class="tb2" style="min-width:900px"><thead><tr><th>Mês</th><th class="n">Prof.</th><th class="n">Valor</th><th class="n">Solicitado</th><th class="n">Reembolsado</th><th class="n">%</th><th class="n">Situação</th><th>Status na Amil</th><th class="n">Prazo Amil</th></tr></thead><tbody>'+linhas+'</tbody></table></div>'+
      '<div class="barras" style="margin-top:18px">'+barras+'</div><div class="leg"><span><i style="background:var(--azesc)"></i>Valor do mês</span><span><i style="background:#8DB4DB"></i>Reembolsado</span></div></div>';
  }
  tela.depois = function(){
    var b = $('#pn-prova'); if(b) b.onclick = function(){ App.exportarProva(this, $('#pn-msg')); };
    $$('.lk3[data-l]').forEach(function(x){ x.onclick = function(){ S.ciclo = x.dataset.c; S.lanSel = x.dataset.l; App.ir('ciclo'); }; });
    $$('tr.clic').forEach(function(x){ x.onclick = function(){ S.ciclo = x.dataset.c; S.lanSel = null; App.ir('ciclo'); }; });
  };
  App.TELAS.painel = tela;
});
