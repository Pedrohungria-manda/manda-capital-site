/* Regras de negócio compartilhadas pelas telas: o que fazer com cada lançamento, contagem de dias,
   resumo de relacionamento por profissional, pendências de cadastro e calendário do mês. Sem DOM próprio. */
(window.__mods = window.__mods || []).push(function(App){
  var num = App.num, hojeISO = App.hojeISO, esc = App.esc, V = App.V, brl = App.brl, hh = App.hh, dataBR = App.dataBR, digitos = App.digitos;
  var D = App.D = {};

  D.STATUS = ['Preparando','Aguardando Documentação','Em processamento','Liberado para Pagamento','Pagamento Confirmado','Em Reanálise','Reembolso Devolvido','Indeferido'];
  D.PRAZO_AMIL = 15;
  D.TERAPIAS = ['aba','fono','to','psicomot',''];
  D.GRUPO_NOME = { aba:'ABA', fono:'Fonoaudiologia', to:'Terapia ocupacional', psicomot:'Psicomotricidade', '':'Sem terapia definida' };
  D.mmaa = function(c){ return c.slice(5)+'/'+c.slice(2,4); };

  D.dias = function(a, b){ var x = Date.parse(a), y = Date.parse(b); return isNaN(x)||isNaN(y) ? null : Math.round((y-x)/864e5); };

  /** Dias desde a solicitação (entrada na Amil) até o reembolso, ou até hoje se ainda está aberto. */
  D.diasSolic = function(l){
    if(!l.dtEntrada) return null;
    var d = D.dias(l.dtEntrada, l.dtReembolso || hojeISO());
    return d===null ? null : { dias:d, fechado:!!l.dtReembolso };
  };

  D.CATS = {
    'problema':    { rot:'Indeferido ou devolvido', ordem:0 },
    'protocolar':  { rot:'Pronto para protocolar na Amil', ordem:1 },
    'cobrar-amil': { rot:'Cobrar a Amil (passou do prazo)', ordem:2 },
    'cobrar-prof': { rot:'Cobrar documentos do profissional', ordem:3 },
    'pagar':       { rot:'Pagar / registrar pagamento', ordem:4 },
    'protocolo':   { rot:'Informar o número do protocolo', ordem:5 },
    'lancar':      { rot:'Lançar o valor que a Amil depositou', ordem:6 },
    'glosa':       { rot:'Glosa: pedir reanálise', ordem:7 },
    'aguardar':    { rot:'Aguardando a Amil (dentro do prazo)', ordem:8 },
    'ok':          { rot:'Concluído', ordem:9 }
  };

  /** O que o Pedro precisa fazer agora com este lançamento. nivel: crit | at | info | ok */
  D.acao = function(l){
    var v = num(l.valor)||0, rv = num(l.vReembolsado), ds = D.diasSolic(l), d = ds ? ds.dias : 0;
    var r = function(cat, nivel, texto){ return { cat:cat, nivel:nivel, texto:texto, dias:ds ? ds.dias : null }; };
    if(l.status==='Indeferido') return r('problema','crit','Indeferido pela Amil: decidir entre reanálise e recurso');
    if(l.status==='Reembolso Devolvido') return r('problema','crit','Reembolso devolvido: descobrir o motivo com a Amil');
    if(!l.dtEntrada){
      var falta = []; if(l.nf!=='Sim') falta.push('nota fiscal'); if(l.freq!=='Sim') falta.push('lista assinada');
      if(falta.length) return r('cobrar-prof','at','Cobrar do profissional: '+falta.join(' e '));
      if(!v) return r('pagar','at','Definir o valor do mês');
      if(!l.dtPagamento) return r('pagar','at','Pagar o profissional e registrar a data');
      if(l.comp!=='Sim') return r('pagar','at','Anexar o comprovante de pagamento');
      return r('protocolar','crit','Tudo pronto: protocolar na Amil e registrar o número');
    }
    if(!l.numProtocolo) return r('protocolo','at','Informar o número do protocolo de acompanhamento');
    if(rv!==null){
      var q = v>0 ? rv/v : 1;
      if(q < 0.5) return r('glosa','at','Glosa de '+Math.round((1-q)*100)+'%: pedir reanálise e guardar para a prova');
      if(q < 0.995) return r('ok','info','Reembolso parcial: '+Math.round(q*100)+'% do valor');
      return r('ok','ok','Concluído');
    }
    if(l.dtReembolso) return r('lancar','at','Lançar o valor que a Amil depositou');
    if(d > D.PRAZO_AMIL) return r('cobrar-amil','crit', (l.status==='Em Reanálise' ? 'Em reanálise' : 'Sem retorno')+' há '+d+' dias (prazo normal: '+D.PRAZO_AMIL+'): cobrar a Amil');
    return r('aguardar','info', (l.status==='Em Reanálise' ? 'Em reanálise' : 'Aguardando a Amil')+': '+d+' de '+D.PRAZO_AMIL+' dias');
  };

  D.statusChip = function(s){
    var c = s==='Pagamento Confirmado' ? 'ok' : (s==='Indeferido'||s==='Reembolso Devolvido') ? 'crit' : s==='Em Reanálise' ? '' : 'neutro';
    return '<span class="chip '+c+'">'+esc(s||'—')+'</span>';
  };
  D.nivelChip = function(a){ return '<span class="chip '+(a.nivel==='crit'?'crit':a.nivel==='ok'?'ok':a.nivel==='info'?'neutro':'')+'">'+esc(a.texto)+'</span>'; };
  D.sim = function(v){ return v==='Sim' ? '<span class="chip ok">Sim</span>' : '<span class="chip">falta</span>'; };

  /** Tudo sobre o relacionamento com um profissional. */
  D.resumoProf = function(p){
    var M = App.S.M, L = M.lancamentos.filter(function(l){ return l.profId===p.id; }), SS = M.sessoes.filter(function(s){ return s.profId===p.id; });
    var r = { lan:L, sess:SS, horas:0, nSess:SS.length, pago:0, reemb:0, valorComReemb:0, nNF:0, nLista:0, nComp:0, abertos:[], deve:[], porMes:{} };
    SS.forEach(function(s){ r.horas += num(s.horas)||0; var m = s.data.slice(0,7); var x = r.porMes[m] = r.porMes[m] || { n:0, h:0 }; x.n++; x.h += num(s.horas)||0; });
    L.forEach(function(l){
      var v = num(l.valor)||0, rv = num(l.vReembolsado); r.pago += v; if(rv!==null){ r.reemb += rv; r.valorComReemb += v; }
      if(l.nf==='Sim') r.nNF++; else r.deve.push('Nota fiscal de '+D.mmaa(l.ciclo));
      if(l.freq==='Sim') r.nLista++; else r.deve.push('Lista assinada de '+D.mmaa(l.ciclo));
      if(l.comp==='Sim') r.nComp++;
      var a = D.acao(l); if(a.cat!=='ok') r.abertos.push({ l:l, a:a });
    });
    r.deve.sort();
    r.glosa = r.valorComReemb>0 ? 1 - r.reemb/r.valorComReemb : null;
    r.ultimo = L.length ? L.map(function(l){ return l.ciclo; }).sort().pop() : null;
    return r;
  };

  D.pendCadastro = function(p, todos){
    var r = [], d = digitos(p.docFiscal);
    if(!p.terapia) r.push({ t:'Sem terapia: as horas não entram na validação', n:'' });
    if(!d) r.push({ t:'Sem CPF/CNPJ', n:'' });
    else if(todos.some(function(o){ return o.id!==p.id && digitos(o.docFiscal)===d; })) r.push({ t:'CPF/CNPJ repetido em outro cadastro', n:'crit' });
    if(!p.registro) r.push({ t:'Sem registro no conselho', n:'' });
    if(!p.endereco) r.push({ t:'Sem endereço de atendimento', n:'' });
    if(!p.email) r.push({ t:'Sem e-mail (não consegue entrar)', n:'' });
    if(p.actValidade){ var dias = D.dias(hojeISO(), p.actValidade); if(dias < 0) r.push({ t:'Atestado vencido', n:'crit' }); else if(dias < 30) r.push({ t:'Atestado vence em '+dias+' dias', n:'' }); }
    if(p.alerta) r.push({ t:p.alerta, n:'' });
    return r;
  };
  D.chips = function(l){ return l.map(function(x){ return '<span class="chip'+(x.n?' '+x.n:'')+'">'+esc(x.t)+'</span>'; }).join(''); };

  // ------------------------------------------------------------ calendário do mês
  var ev = function(ctx, ciclo){
    var por = {}, add = function(dia, k, o){ if(!dia || dia.slice(0,7)!==ciclo) return; var x = por[dia] = por[dia] || { s:[], p:[], a:[], r:[] }; x[k].push(o); };
    var P = ctx.profs;
    ctx.sessoes.forEach(function(s){ add(s.data, 's', s); });
    ctx.lancamentos.forEach(function(l){ add(l.dtPagamento, 'p', l); add(l.dtEntrada, 'a', l); add(l.dtReembolso, 'r', l); });
    return por;
  };
  D.SIGLA = { aba:'ABA', fono:'Fono', to:'TO', psicomot:'Psico', x:'S/T' };
  D.CORES = { aba:'#0B2550', fono:'#0B63B1', to:'#3FB6AE', psicomot:'#8A7BC8', x:'#9AA3B5' };
  D.terapiaDe = function(profs, id){ return (profs[id]||{}).terapia || 'x'; };

  /** modo: 'reemb' (pagamentos, solicitações, reembolsos), 'atend' (horas por terapia) ou 'todos'. */
  D.calendario = function(ciclo, ctx, modo){
    modo = modo || 'todos';
    var n = V.diasDoMes(ciclo), pri = V.diaSemana(ciclo+'-01'), por = ev(ctx, ciclo), hoje = hojeISO(), h = '';
    ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(function(d){ h += '<div class="cdh">'+d+'</div>'; });
    for(var i = 0; i < pri; i++) h += '<div class="cd vazio"></div>';
    for(var d = 1; d <= n; d++){
      var iso = ciclo+'-'+(d<10?'0':'')+d, x = por[iso], m = '';
      if(x){
        if(x.s.length && modo==='atend'){
          var pt = {}; x.s.forEach(function(s){ var t = D.terapiaDe(ctx.profs, s.profId); pt[t] = (pt[t]||0) + (num(s.horas)||0); });
          Object.keys(pt).sort().forEach(function(t){ m += '<i class="m tt" style="background:'+D.CORES[t]+'" title="'+esc(D.GRUPO_NOME[t==='x'?'':t])+'">'+D.SIGLA[t]+' '+hh(pt[t])+'</i>'; });
        } else if(x.s.length && modo==='todos') m += '<i class="m s" title="Sessões">'+hh(x.s.reduce(function(t,s){ return t+(num(s.horas)||0); }, 0))+' h</i>';
        if(modo!=='atend'){
          if(x.p.length) m += '<i class="m p" title="Pagamentos ao profissional">Pgto '+x.p.length+'</i>';
          if(x.a.length) m += '<i class="m a" title="Solicitações na Amil">Solic. '+x.a.length+'</i>';
          if(x.r.length) m += '<i class="m r" title="Reembolsos recebidos">Reemb. '+x.r.length+'</i>';
        }
      }
      h += '<button type="button" class="cd'+(iso===hoje?' hoje':'')+(x?' tem':'')+'" data-d="'+iso+'"><b>'+d+'</b>'+m+'</button>';
    }
    var leg = modo==='atend'
      ? '<div class="cal-leg">'+['aba','fono','to','psicomot','x'].map(function(t){ return '<span><i class="m" style="background:'+D.CORES[t]+'"></i>'+esc(D.GRUPO_NOME[t==='x'?'':t])+'</span>'; }).join('')+'</div>'
      : '<div class="cal-leg">'+(modo==='todos' ? '<span><i class="m s"></i>horas de sessão</span>' : '')+'<span><i class="m p"></i>pagamento</span><span><i class="m a"></i>solicitação</span><span><i class="m r"></i>reembolso</span></div>';
    return '<div class="cal" id="cal">'+h+'</div>'+leg+'<div id="cal-det"></div>';
  };
  D.detalheDia = function(iso, ctx){
    var x = ev(ctx, iso.slice(0,7))[iso], P = ctx.profs; if(!x) return '<p class="sub">Nada neste dia.</p>';
    var nome = function(id){ return esc((P[id]||{}).apelido || id); }, h = '<h4>'+dataBR(iso)+'</h4><ul class="lst">';
    x.s.forEach(function(s){ h += '<li><span>Sessão · '+nome(s.profId)+' · '+esc(s.horaIni)+'–'+esc(s.horaFim)+'</span><span>'+hh(num(s.horas)||0)+' h</span></li>'; });
    x.p.forEach(function(l){ h += '<li><span>Pagamento · '+nome(l.profId)+' · '+D.mmaa(l.ciclo)+'</span><span>'+brl(num(l.valor))+'</span></li>'; });
    x.a.forEach(function(l){ h += '<li><span>Solicitado na Amil · '+nome(l.profId)+' · '+D.mmaa(l.ciclo)+(l.numProtocolo ? ' · protocolo '+esc(l.numProtocolo) : '')+'</span><span>'+brl(num(l.valor))+'</span></li>'; });
    x.r.forEach(function(l){ h += '<li><span>Reembolso · '+nome(l.profId)+' · '+D.mmaa(l.ciclo)+'</span><span>'+brl(num(l.vReembolsado))+'</span></li>'; });
    return h + '</ul>';
  };
  /** Liga os cliques do calendário. onDia(iso) é opcional (ex.: preencher a data no formulário de sessão). */
  D.ligarCalendario = function(ctx, onDia){
    App.$$('#cal .cd[data-d]').forEach(function(b){ b.onclick = function(){
      App.$$('#cal .cd.sel').forEach(function(x){ x.classList.remove('sel'); }); b.classList.add('sel');
      App.$('#cal-det').innerHTML = D.detalheDia(b.dataset.d, ctx); if(onDia) onDia(b.dataset.d); }; });
  };
  D.ctx = function(filtroProf){
    var M = App.S.M;
    return { sessoes: filtroProf ? M.sessoes.filter(function(s){ return s.profId===filtroProf; }) : M.sessoes,
             lancamentos: filtroProf ? M.lancamentos.filter(function(l){ return l.profId===filtroProf; }) : M.lancamentos, profs: App.mapaProf() };
  };

  /** Meses conhecidos (lançamentos, sessões e o atual), do mais novo ao mais antigo. */
  D.meses = function(){
    var M = App.S.M, u = {}; M.lancamentos.forEach(function(l){ u[l.ciclo] = 1; }); M.sessoes.forEach(function(s){ u[s.data.slice(0,7)] = 1; }); u[hojeISO().slice(0,7)] = 1;
    return Object.keys(u).sort().reverse();
  };
  D.cicloVizinho = function(ciclo, delta){
    var y = +ciclo.slice(0,4), m = +ciclo.slice(5,7) + delta; while(m<1){ m += 12; y--; } while(m>12){ m -= 12; y++; }
    return y+'-'+(m<10?'0':'')+m;
  };
  D.fmtTam = function(b){ b = +b||0; return b>1048576 ? (b/1048576).toFixed(1).replace('.',',')+' MB' : Math.max(1,Math.round(b/1024))+' KB'; };
  // ------------------------------------------------------------ horas por semana do ciclo e por terapia
  /** Horas do mês nas 4 janelas do ciclo (1–7, 8–14, 15–21, 22–fim), por terapia. profId opcional. */
  D.horasDoCiclo = function(ciclo, sessoes, profs, profId){
    var r = { jan: V.janelas(ciclo).map(function(j){ return { n:j.n, ini:j.ini, fim:j.fim, t:{}, tot:0 }; }), t:{}, tot:0 };
    sessoes.forEach(function(s){
      if(s.data.slice(0,7)!==ciclo || (profId && s.profId!==profId)) return;
      var h = num(s.horas)||0, t = D.terapiaDe(profs, s.profId), dia = +s.data.slice(8), w = r.jan[dia<=7?0:dia<=14?1:dia<=21?2:3];
      w.t[t] = (w.t[t]||0) + h; w.tot += h; r.t[t] = (r.t[t]||0) + h; r.tot += h;
    });
    return r;
  };
  /** Tabela semana × terapia, com o total das 4 semanas embaixo. */
  D.tabelaSemanas = function(r){
    var cols = ['aba','fono','to','psicomot','x'].filter(function(t){ return t!=='x' || r.t.x; });
    var cel = function(v){ return '<td class="n">'+(v ? hh(v)+' h' : '—')+'</td>'; };
    return '<div class="tw"><table class="tb2 ctr" style="min-width:0"><thead><tr><th>Semana</th>'+cols.map(function(t){ return '<th><i class="pt" style="background:'+D.CORES[t]+'"></i>'+D.SIGLA[t]+'</th>'; }).join('')+'<th>Total</th></tr></thead><tbody>'+
      r.jan.map(function(w){ return '<tr><td><b>S'+w.n+'</b> <small>dias '+w.ini+'–'+w.fim+'</small></td>'+cols.map(function(t){ return cel(w.t[t]); }).join('')+'<td class="n"><b>'+(w.tot ? hh(w.tot)+' h' : '—')+'</b></td></tr>'; }).join('')+
      '</tbody><tfoot><tr><td>Ciclo completo</td>'+cols.map(function(t){ return cel(r.t[t]); }).join('')+'<td class="n">'+hh(r.tot)+' h</td></tr></tfoot></table></div>';
  };

  // ------------------------------------------------------------ semanas (segunda a domingo) e gráficos
  var isoDe = function(n){ return new Date(n*864e5).toISOString().slice(0,10); };
  D.segundaDe = function(iso){ return V.numDia(iso) - ((V.diaSemana(iso)+6)%7); };         // nº do dia da segunda-feira da semana
  D.ultimasSemanas = function(n){ var s = D.segundaDe(hojeISO()), r = []; for(var i = n-1; i >= 0; i--) r.push(s - 7*i); return r; };
  D.rotSemana = function(num){ var d = isoDe(num); return d.slice(8)+'/'+d.slice(5,7); };
  D.PALETA = ['#0B2550','#0B63B1','#3FB6AE','#8A7BC8','#C27BA0','#7A8B3F','#B8864B','#4F6D7A','#A05A5A','#6B9AC4','#5E5E7A','#9AA3B5','#2F7D6B'];
  /** Barras empilhadas. cats: [{k, rot}], series: [{k, nome, cor}], val(catK, serieK) → horas. */
  D.chartStack = function(cats, series, val){
    var tot = cats.map(function(c){ return series.reduce(function(s,x){ return s + (val(c.k, x.k)||0); }, 0); });
    var max = Math.max.apply(null, tot.concat([1]));
    var col = cats.map(function(c, i){
      var seg = series.map(function(x){ var v = val(c.k, x.k)||0; return v ? '<i style="height:'+(100*v/max)+'%;background:'+x.cor+'" title="'+esc(x.nome)+': '+hh(v)+' h"></i>' : ''; }).join('');
      return '<div class="gcol" role="img" aria-label="Semana de '+c.rot+': '+hh(tot[i])+' horas"><b>'+(tot[i] ? hh(tot[i]) : '')+'</b><div class="gbar">'+seg+'</div><span>'+c.rot+'</span></div>';
    }).join('');
    var leg = series.map(function(x){ return '<span><i style="background:'+x.cor+'"></i>'+esc(x.nome)+'</span>'; }).join('');
    return '<div class="graf" style="--n:'+cats.length+'">'+col+'</div><div class="cal-leg">'+leg+'</div>';
  };

  /** Grupos de arquivos do Drive (resposta de listarArquivos) como HTML. */
  D.arquivosHtml = function(grupos, aviso){
    if(!grupos.length) return '<p class="sub">'+esc(aviso||'Nenhum arquivo ainda.')+'</p>';
    return grupos.map(function(g){
      return '<div class="gp"><h4>'+esc(g.titulo)+' <a class="lk2" href="'+esc(g.url)+'" target="_blank" rel="noopener noreferrer">abrir pasta</a></h4>'+
        (g.arquivos.length ? '<ul class="lst">'+g.arquivos.map(function(a){ return '<li><a href="'+esc(a.url)+'" target="_blank" rel="noopener noreferrer">'+esc(a.nome)+'</a><span>'+dataBR(a.em)+' · '+D.fmtTam(a.tam)+'</span></li>'; }).join('')+'</ul>' : '<p class="sub">Pasta vazia.</p>')+'</div>';
    }).join('');
  };
});
