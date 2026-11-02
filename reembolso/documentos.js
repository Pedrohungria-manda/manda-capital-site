/* Documentos: o acervo no Drive (permanentes, por profissional, por mês) e o resumo da base jurídica. */
(window.__mods = window.__mods || []).push(function(App){
  var D = App.D, $ = App.$, $$ = App.$$, esc = App.esc, S = App.S, api = App.api, msgErro = App.msgErro;

  var JUR = [
    ['Ação', '5041389-88.2025.8.24.0023 — 3ª Vara Cível da Capital, TJSC'],
    ['Agravo', '5057598-07.2025.8.24.0000 — efeito suspensivo indeferido, liminar mantida (30/07/2025)'],
    ['Obrigação', 'Custear o tratamento junto a profissional especializado não credenciado, escolhido pelo autor, na periodicidade prescrita, dentro de raio de 10 km em Florianópolis/SC'],
    ['Multa', 'R$ 500/dia, teto de R$ 15.000'],
    ['Ônus', 'Redistribuído (art. 373, §1º, CPC): cabe à Amil demonstrar a regularidade de uma recusa'],
    ['Sigilo', 'Segredo de justiça (art. 189, III) e tramitação prioritária']
  ];

  function tela(){
    var fam = S.u.perfil==='familia', abas = fam ? [['perm','Permanentes'], ['prof','Por profissional'], ['ciclo','Por mês'], ['jur','Base jurídica']] : [['jur','Base jurídica']];
    var tab = fam ? (S.docTab || 'perm') : 'jur';
    var barra = '<div class="abas" role="tablist">'+abas.map(function(a){ return '<button role="tab" class="aba'+(a[0]===tab?' on':'')+'" data-aba="'+a[0]+'" aria-selected="'+(a[0]===tab)+'">'+a[1]+'</button>'; }).join('')+'</div>';
    var corpo = '';
    if(tab==='perm'){
      corpo = '<div class="cx"><h3>Documentos permanentes</h3><p class="sub">Laudo, liminar, decisão do agravo, declaração escolar e página inicial. Ficam na pasta 00 do Drive.</p>'+
        '<div class="ups"><button class="bt cl" id="dc-up">Enviar documento permanente</button><span class="msg" id="info-permanente"></span></div><div class="bar" id="barra-dc" hidden><i style="width:4%;background:var(--az)"></i></div><div id="dc-lista"><p class="sub">Carregando…</p></div></div>';
    } else if(tab==='prof'){
      var P = S.M.profissionais.slice().sort(function(a,b){ return String(a.apelido||a.nome).localeCompare(String(b.apelido||b.nome),'pt-BR'); });
      if(!S.docProf || !P.some(function(p){ return p.id===S.docProf; })) S.docProf = P[0] && P[0].id;
      corpo = '<div class="cx"><h3>Documentos por profissional</h3><div class="tb"><select id="dc-prof" aria-label="Profissional">'+P.map(function(p){ return '<option value="'+esc(p.id)+'"'+(p.id===S.docProf?' selected':'')+'>'+esc(p.apelido||p.nome)+'</option>'; }).join('')+'</select><button class="bt cl" id="dc-ficha">Abrir ficha completa</button></div><div id="dc-lista"><p class="sub">Carregando…</p></div></div>';
    } else if(tab==='ciclo'){
      var meses = D.meses(); if(!S.docMes || meses.indexOf(S.docMes)<0) S.docMes = meses[0];
      corpo = '<div class="cx"><h3>Documentos por mês</h3><p class="sub">Para enviar um arquivo, abra o lançamento do profissional na tela Ciclo.</p><div class="tb"><select id="dc-mes" aria-label="Mês">'+meses.map(function(m){ return '<option'+(m===S.docMes?' selected':'')+'>'+esc(m)+'</option>'; }).join('')+'</select></div><div id="dc-lista"><p class="sub">Carregando…</p></div></div>';
    } else {
      corpo = '<div class="cx"><h3>Base jurídica</h3><p class="sub">Resumo para consulta. Os valores de diferença entre pago e reembolsado são o acervo probatório.</p><div class="tw"><table class="tb2" style="min-width:0"><tbody>'+
        JUR.map(function(j){ return '<tr><td style="white-space:normal;width:120px"><b>'+esc(j[0])+'</b></td><td style="white-space:normal">'+esc(j[1])+'</td></tr>'; }).join('')+'</tbody></table></div>'+
        '<p><b>A brecha.</b> A decisão manda custear integralmente, mas o parágrafo seguinte admite reembolso "de acordo com a tabela de preços por ela estabelecida". Dali sai toda a diferença. Duas páginas antes, a mesma decisão invoca o STJ em sentido oposto: cobertura obrigatória e reembolso integral na ausência de profissional habilitado na rede credenciada.</p>'+
        '<div class="ups"><button class="bt" id="dc-prova">Exportar série histórica (PDF)</button><span class="msg" id="dc-pmsg"></span></div></div>';
    }
    return barra+corpo;
  }

  tela.depois = function(){
    $$('.aba').forEach(function(b){ b.onclick = function(){ S.docTab = b.dataset.aba; App.ir('documentos'); }; });
    var box = $('#dc-lista'), carregar = function(corpo){
      if(!box) return; box.innerHTML = '<p class="sub">Carregando…</p>';
      api('listarArquivos', corpo).then(function(o){ if(!o.ok) throw new Error(o.msg); box.innerHTML = D.arquivosHtml(o.grupos, o.aviso); })
        .catch(function(x){ box.innerHTML = '<p class="msg er">'+esc(msgErro(x, 'Não foi possível listar.'))+'</p>'; });
    };
    var tab = S.u.perfil==='familia' ? (S.docTab || 'perm') : 'jur';
    if(tab==='perm'){
      carregar({ escopo:'permanentes' });
      var inp = $('#env-arq');
      if(!inp){ inp = document.createElement('input'); inp.id = 'env-arq'; inp.type = 'file'; inp.accept = 'application/pdf,image/jpeg,image/png'; inp.multiple = true; inp.hidden = true; document.body.appendChild(inp); }
      $('#dc-up').onclick = function(){ inp.onchange = function(){ var files = [].slice.call(inp.files); inp.value = '';
        if(files.length) App.enviarLote('permanente', files, {}, $('#barra-dc'), $('#info-permanente'), function(){ S.docTab = 'perm'; App.ir('documentos'); var m = $('#info-permanente'); if(m){ m.className = 'msg ok'; m.textContent = 'Arquivo recebido e salvo no Drive.'; } }); }; inp.click(); };
    } else if(tab==='prof'){
      carregar({ escopo:'profissional', profId:S.docProf });
      $('#dc-prof').onchange = function(){ S.docProf = this.value; App.ir('documentos'); };
      $('#dc-ficha').onclick = function(){ S.prof = S.docProf; S.profTab = 'docs'; App.ir('profissionais'); };
    } else if(tab==='ciclo'){
      carregar({ escopo:'ciclo', ciclo:S.docMes });
      $('#dc-mes').onchange = function(){ S.docMes = this.value; App.ir('documentos'); };
    } else {
      var b = $('#dc-prova'); if(b) b.onclick = function(){ App.exportarProva(this, $('#dc-pmsg')); };
    }
  };
  App.TELAS.documentos = tela;
});
