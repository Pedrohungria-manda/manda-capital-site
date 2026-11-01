/* Validação da carga horária (HANDOFF §6). Funções puras, sem DOM: o app e testes.html usam o mesmo arquivo.
   O laudo prescreve carga SEMANAL; os profissionais faturam por MÊS. O teto é proporcional aos dias
   (horasSemana / 7 * dias) e vale por terapia, nunca pelo total, em quatro janelas, no mês e no acumulado. */
(function(root){
  var LAUDO = { aba:40, fono:8, to:4, psicomot:2 };      // h/semana — laudo de 14/11/2025 (psicomot: 2 h nos autos)
  var LOCAIS = ['Clínica/consultório', 'Outro endereço', 'Telessaúde', 'Escola'];

  function partes(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? { a:+m[1], m:+m[2], d:+m[3] } : null; }
  function numDia(iso){ var p = partes(iso); return p ? Math.round(Date.UTC(p.a, p.m - 1, p.d) / 864e5) : null; }
  function diaSemana(iso){ var p = partes(iso); return p ? new Date(Date.UTC(p.a, p.m - 1, p.d)).getUTCDay() : null; }   // 0 = domingo
  function diasDoMes(ciclo){ var a = +ciclo.slice(0, 4), m = +ciclo.slice(5, 7); return new Date(Date.UTC(a, m, 0)).getUTCDate(); }
  function hm(t){ var m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; }

  /** Horas da sessão, em decimal (nunca vem do cliente: o servidor recalcula com a mesma conta). */
  function horasDaSessao(ini, fim){ var a = hm(ini), b = hm(fim); return a === null || b === null || b <= a ? null : Math.round((b - a) / 60 * 100) / 100; }

  /** Semana 1: 1–7, 2: 8–14, 3: 15–21, 4: 22–último dia (7 a 10 dias). A soma dos dias é sempre o mês. */
  function janelas(ciclo){
    var n = diasDoMes(ciclo);
    return [ { n:1, ini:1, fim:7, dias:7 }, { n:2, ini:8, fim:14, dias:7 }, { n:3, ini:15, fim:21, dias:7 }, { n:4, ini:22, fim:n, dias:n - 21 } ];
  }

  function tetoDia(terapia, H){ return (H || LAUDO)[terapia] / 7; }
  function tetoJanela(terapia, dias, H){ return (H || LAUDO)[terapia] * dias / 7; }       // multiplica antes de dividir: 40 h × 7 d ÷ 7 = 40 exato

  /** usado/teto > 1 crítico; > 0.95 atenção; senão ok. */
  function semaforo(usado, teto){
    if(!(teto > 0)) return usado > 0 ? 'critico' : 'ok';
    var r = usado / teto; return r > 1 ? 'critico' : r > 0.95 ? 'atencao' : 'ok';
  }
  function celula(usado, teto){ return { usado:usado, teto:teto, razao: teto > 0 ? usado / teto : 0, nivel: semaforo(usado, teto) }; }

  /** escola: { '1': {ini:'08:00', fim:'12:00'}, ... } indexado por dia da semana (0 = domingo). */
  function cruzaEscola(s, escola){
    var e = escola && escola[diaSemana(s.data)]; if(!e) return false;
    var a = hm(s.horaIni), b = hm(s.horaFim), x = hm(e.ini), y = hm(e.fim);
    return a !== null && b !== null && x !== null && y !== null && a < y && b > x;      // encostar na borda não é cruzar
  }
  function escolaVazia(escola){ return !escola || !Object.keys(escola).some(function(k){ return escola[k] && escola[k].ini && escola[k].fim; }); }

  function alertasDaSessao(s, escola){
    var r = [];
    if(s.local === 'Escola') r.push({ nivel:'critico', texto:'Atendimento dentro da escola: fora da cobertura (Parecer ANS 39/2024)' });
    if(s.local === 'Telessaúde') r.push({ nivel:'atencao', texto:'Telessaúde: permitido, mas enfraquece o argumento da distância' });
    if(cruzaEscola(s, escola)) r.push({ nivel:'critico', texto:'Cruza o horário escolar' });
    return r;
  }

  /**
   * ctx: { ciclo:'YYYY-MM', sessoes:[{id,data,profId,horaIni,horaFim,local}], profs:{id:{terapia}}, H, escola }
   * Devolve, por terapia: as quatro janelas, o mês e o acumulado desde a primeira sessão registrada
   * (até o fim do mês olhado); as horas sem terapia, que ficam fora; e os alertas por sessão.
   */
  function validar(ctx){
    var H = ctx.H || LAUDO, ciclo = ctx.ciclo, n = diasDoMes(ciclo), jan = janelas(ciclo);
    var ini = numDia(ciclo + '-01'), fimMes = ini + n - 1, out = { terapias:{}, fora:{ horas:0, sessoes:0, profs:{} }, alertas:{}, diasMes:n };
    Object.keys(H).forEach(function(t){
      out.terapias[t] = { janelas: jan.map(function(j){ return Object.assign({}, j, celula(0, tetoJanela(t, j.dias, H))); }),
        mes: celula(0, tetoJanela(t, n, H)), acum: null, primeira: null };
    });
    var porTerapia = {};
    (ctx.sessoes || []).forEach(function(s){
      var al = alertasDaSessao(s, ctx.escola); if(al.length && s.data && s.data.slice(0, 7) === ciclo) out.alertas[s.id] = al;
      var p = ctx.profs[s.profId], t = p && p.terapia, h = horasDaSessao(s.horaIni, s.horaFim), d = numDia(s.data);
      if(h === null || d === null || d > fimMes) return;
      if(!t || !H[t]){ if(s.data.slice(0, 7) === ciclo){ out.fora.horas += h; out.fora.sessoes++; out.fora.profs[s.profId] = 1; } return; }
      (porTerapia[t] = porTerapia[t] || []).push({ d:d, h:h });
    });
    Object.keys(porTerapia).forEach(function(t){
      var T = out.terapias[t], L = porTerapia[t], usJ = [0, 0, 0, 0], mes = 0, tudo = 0, primeira = null;
      L.forEach(function(x){
        tudo += x.h; if(primeira === null || x.d < primeira) primeira = x.d;
        if(x.d >= ini){ mes += x.h; var dia = x.d - ini + 1; usJ[dia <= 7 ? 0 : dia <= 14 ? 1 : dia <= 21 ? 2 : 3] += x.h; }
      });
      T.janelas = T.janelas.map(function(j, i){ return Object.assign({}, j, celula(usJ[i], j.teto)); });
      T.mes = celula(mes, T.mes.teto);
      var dias = fimMes - primeira + 1;
      T.acum = Object.assign({ dias:dias, desde:primeira }, celula(tudo, tetoJanela(t, dias, H)));
      T.primeira = primeira;
    });
    return out;
  }

  root.Validacao = { LAUDO:LAUDO, LOCAIS:LOCAIS, janelas:janelas, diasDoMes:diasDoMes, tetoDia:tetoDia, tetoJanela:tetoJanela, semaforo:semaforo,
    horasDaSessao:horasDaSessao, cruzaEscola:cruzaEscola, escolaVazia:escolaVazia, alertasDaSessao:alertasDaSessao, validar:validar,
    numDia:numDia, diaSemana:diaSemana };
})(typeof window !== 'undefined' ? window : this);
