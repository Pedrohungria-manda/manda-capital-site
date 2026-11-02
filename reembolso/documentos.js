/* Documentos: o acervo no Drive (gerais, por profissional, mensais) e a base jurídica com os documentos-chave para baixar. */
(window.__mods = window.__mods || []).push(function(App){
  var D = App.D, $ = App.$, $$ = App.$$, esc = App.esc, S = App.S, api = App.api, msgErro = App.msgErro, bool = App.bool;

  var JUR = [
    ['Ação', '5041389-88.2025.8.24.0023 — 3ª Vara Cível da Capital, TJSC'],
    ['Agravo', '5057598-07.2025.8.24.0000 — efeito suspensivo indeferido, liminar mantida (30/07/2025)'],
    ['Obrigação', 'Custear o tratamento junto a profissional especializado não credenciado, escolhido pelo autor, na periodicidade prescrita, dentro de raio de 10 km em Florianópolis/SC'],
    ['Multa', 'R$ 500/dia, teto de R$ 15.000'],
    ['Ônus', 'Redistribuído (art. 373, §1º, CPC): cabe à Amil demonstrar a regularidade de uma recusa'],
    ['Sigilo', 'Segredo de justiça (art. 189, III) e tramitação prioritária']
  ];
  // documentos que o pacote precisa ter; o app procura cada um na pasta 01 - Documentos Gerais pelo nome
  var CHAVE = [
    ['Laudo médico', /laudo/i], ['Liminar', /liminar/i], ['Decisão do agravo', /agravo|decis/i],
    ['Declaração escolar', /declara.{1,3}o escolar/i], ['Página inicial', /p.gina inicial/i], ['Carta de abertura', /carta/i]
  ];
  var semAc = function(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,''); };

  function tela(){
    var fam = S.u.perfil==='familia', abas = fam ? [['perm','Gerais'], ['prof','Por profissional'], ['ciclo','Mensais'], ['jur','Base jurídica']] : [['jur','Base jurídica']];
    var tab = fam ? (S.docTab || 'perm') : 'jur';
    var barra = '<div class="abas" role="tablist">'+abas.map(function(a){ return '<button role="tab" class="aba'+(a[0]===tab?' on':'')+'" data-aba="'+a[0]+'" aria-selected="'+(a[0]===tab)+'">'+a[1]+'</button>'; }).join('')+'</div>';
    var corpo = '';
    if(tab==='perm'){
      corpo = '<div class="cx"><h3>Documentos gerais</h3><p class="sub">Laudo, liminar, decisão do agravo, declaração escolar, página inicial e a carta de abertura (a primeira folha do pacote enviado à Amil). Ficam na pasta 01 - Documentos Gerais do Drive.</p>'+
        '<div class="ups"><button class="bt cl" id="dc-up">Enviar documento geral</button><span class="msg" id="info-permanente"></span></div><div class="bar" id="barra-dc" hidden><i style="width:4%;background:var(--az)"></i></div><div id="dc-lista"><p class="sub">Carregando…</p></div></div>';
    } else if(tab==='prof'){
      var P = S.M.profissionais.slice().sort(function(a,b){ return (D.TERAPIAS.indexOf(a.terapia||'')-D.TERAPIAS.indexOf(b.terapia||'')) || String(a.nome).localeCompare(String(b.nome),'pt-BR'); });
      var h = '', g = null;
      P.forEach(function(p){
        var t = p.terapia||''; if(t!==g){ g = t; h += '<tr class="gh"><td colspan="4">'+esc(D.GRUPO_NOME[t])+'</td></tr>'; }
        h += '<tr class="clic" data-p="'+esc(p.id)+'"><td class="l"><b>'+esc(p.nome)+'</b>'+(bool(p.ativo) ? '' : ' <span class="chip neutro">inativo</span>')+'</td><td>'+esc(D.SIGLA[t||'x']==='S/T' ? '—' : App.TERAPIA_NOME[t])+'</td>'+
          '<td>'+(p.pastaId ? '<a href="'+D.urlPasta(p.pastaId)+'" target="_blank" rel="noopener noreferrer" class="solta">Abrir pasta</a>' : '<span class="chip">sem pasta</span>')+'</td><td><button class="bt cl peq" data-ver="'+esc(p.id)+'">Ver documentos</button></td></tr>';
      });
      corpo = '<div class="cx"><h3>Documentos por profissional</h3><p class="sub">Todos os profissionais. Toque em "Ver documentos" para abrir a lista logo abaixo, ou em "Abrir pasta" para ir direto ao Drive. Tudo que um profissional entrega no mês fica na pasta dele, em uma subpasta por mês.</p>'+
        '<div class="tw"><table class="tb2 tprof" style="min-width:560px"><thead><tr><th class="l">Profissional</th><th>Terapia</th><th>Pasta</th><th></th></tr></thead><tbody>'+h+'</tbody></table></div></div>';
    } else if(tab==='ciclo'){
      var meses = D.meses(); if(!S.docMes || meses.indexOf(S.docMes)<0) S.docMes = meses[0];
      corpo = '<div class="cx"><h3>Documentos mensais</h3><p class="sub">Notas, listas assinadas e comprovantes de cada profissional, por mês. Para enviar um arquivo, abra o lançamento do profissional na tela Ciclo.</p><div class="tb"><select id="dc-mes" aria-label="Mês">'+meses.map(function(m){ return '<option'+(m===S.docMes?' selected':'')+'>'+esc(m)+'</option>'; }).join('')+'</select></div><div id="dc-lista"><p class="sub">Carregando…</p></div></div>';
    } else {
      corpo = '<div class="cx"><h3>Base jurídica</h3><p class="sub">Resumo do processo e os documentos importantes, para abrir ou baixar em PDF.</p><div class="tw"><table class="tb2" style="min-width:0"><tbody>'+
        JUR.map(function(j){ return '<tr><td style="white-space:normal;width:120px"><b>'+esc(j[0])+'</b></td><td style="white-space:normal">'+esc(j[1])+'</td></tr>'; }).join('')+'</tbody></table></div>'+
        '<p><b>A brecha.</b> A decisão manda custear integralmente, mas o parágrafo seguinte admite reembolso "de acordo com a tabela de preços por ela estabelecida". Dali sai toda a diferença. Duas páginas antes, a mesma decisão invoca o STJ em sentido oposto: cobertura obrigatória e reembolso integral na ausência de profissional habilitado na rede credenciada.</p></div>'+
        (fam ? '<div class="cx"><h3>Documentos-chave</h3><p class="sub">Procurados na pasta 01 - Documentos Gerais. O que faltar, envie na aba Gerais.</p><div id="jur-docs"><p class="sub">Carregando…</p></div></div>' : '')+
        '<div class="cx"><h3>Prova financeira</h3><p class="sub">Série histórica de pago, reembolsado e diferença, por mês e por profissional, em PDF para anexar à petição.</p><div class="ups"><button class="bt" id="dc-prova">Exportar série histórica (PDF)</button><span class="msg" id="dc-pmsg"></span></div></div>';
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
      $$('[data-ver]').forEach(function(b){ b.onclick = function(e){
        e.stopPropagation(); var tr = b.closest('tr'), prox = tr.nextElementSibling;
        if(prox && prox.classList.contains('det')){ prox.remove(); tr.classList.remove('aberto'); return; }
        tr.classList.add('aberto'); tr.insertAdjacentHTML('afterend', '<tr class="det"><td colspan="4"><div class="det-in l"><p class="sub">Carregando…</p></div></td></tr>');
        var alvo = tr.nextElementSibling.querySelector('.det-in');
        api('listarArquivos', { escopo:'profissional', profId:b.dataset.ver }).then(function(o){ if(!o.ok) throw new Error(o.msg); alvo.innerHTML = D.arquivosHtml(o.grupos); })
          .catch(function(x){ alvo.innerHTML = '<p class="msg er">'+esc(msgErro(x, 'Não foi possível listar.'))+'</p>'; }); }; });
      $$('tr.clic[data-p]').forEach(function(tr){ tr.onclick = function(e){ if(e.target.closest('a,button')) return; var b = tr.querySelector('[data-ver]'); if(b) b.click(); }; });
    } else if(tab==='ciclo'){
      carregar({ escopo:'ciclo', ciclo:S.docMes });
      $('#dc-mes').onchange = function(){ S.docMes = this.value; App.ir('documentos'); };
    } else {
      var b = $('#dc-prova'); if(b) b.onclick = function(){ App.exportarProva(this, $('#dc-pmsg')); };
      var jd = $('#jur-docs');
      if(jd) api('listarArquivos', { escopo:'permanentes' }).then(function(o){
        if(!o.ok) throw new Error(o.msg);
        var todos = []; o.grupos.forEach(function(g){ g.arquivos.forEach(function(a){ todos.push(a); }); });
        jd.innerHTML = '<ul class="lst">'+CHAVE.map(function(c){
          var a = todos.filter(function(x){ return c[1].test(semAc(x.nome)) || c[1].test(x.nome); })[0];
          return '<li><span><b>'+esc(c[0])+'</b>'+(a ? ' · <a href="'+esc(a.url)+'" target="_blank" rel="noopener noreferrer">'+esc(a.nome)+'</a>' : '')+'</span>'+
            (a ? '<span><a class="bt cl peq" href="'+D.urlBaixar(a.id)+'" rel="noopener noreferrer">Baixar PDF</a></span>' : '<span class="chip">não encontrado — envie na aba Gerais</span>')+'</li>'; }).join('')+'</ul>'; })
        .catch(function(x){ jd.innerHTML = '<p class="msg er">'+esc(msgErro(x, 'Não foi possível listar.'))+'</p>'; });
    }
  };
  App.TELAS.documentos = tela;
});
