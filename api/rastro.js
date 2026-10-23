// Recebe os sinais da página da proposta e repassa para a planilha de acessos (Apps Script).
// O endereço e a chave da planilha ficam nas variáveis RASTRO_URL e RASTRO_CHAVE do Vercel, fora do código público.
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  if (!b || typeof b !== 'object') b = {};
  const h = req.headers;
  const dec = (x) => { try { return decodeURIComponent(x || ''); } catch (e) { return x || ''; } };
  const s = (x, n) => String(x == null ? '' : x).slice(0, n);
  const d = {
    k: process.env.RASTRO_CHAVE,
    p: s(b.p, 40), v: s(b.v, 40), ev: s(b.ev, 20), seg: Number(b.seg) || 0, rol: Number(b.rol) || 0,
    secao: s(b.secao, 80), origem: s(b.origem, 40), tela: s(b.tela, 20),
    ua: s(h['user-agent'], 160),
    ip: s((h['x-forwarded-for'] || '').split(',')[0].trim() || h['x-real-ip'] || '', 60),
    cidade: dec(h['x-vercel-ip-city']), estado: s(h['x-vercel-ip-country-region'], 20), pais: s(h['x-vercel-ip-country'], 10)
  };
  if (process.env.RASTRO_URL && d.v) {
    try {
      await fetch(process.env.RASTRO_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(d), redirect: 'follow' });
    } catch (e) {}
  }
  res.status(204).end();
};
