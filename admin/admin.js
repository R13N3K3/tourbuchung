const $ = id => document.getElementById(id);
const esc = s => { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; };
const fmt = iso => new Date(iso).toLocaleString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const STATUS = { bestaetigt: ['bestätigt', ''], warteliste: ['Warteliste', 'warn'] };

async function api(method, url, body) {
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Fehler');
  return data;
}

function meldung(text) {
  $('meldung').textContent = text;
  $('meldung').hidden = !text;
}

function zeile(b, vorbei) {
  if (b.geloescht) {
    return `<tr><td class="dim small">${b.personen} P. · Code ${esc(b.code)} · Daten gelöscht (Datenschutz)${b.bezahlt ? ' · bezahlt ✓' : ''}</td><td></td></tr>`;
  }
  const [label, cls] = STATUS[b.status];
  return `<tr>
    <td><strong>${esc(b.name)}</strong> <span class="badge ${cls}">${label}</span><br>
      <span class="dim small">${b.personen} P. · <a href="tel:${esc(b.telefon)}">${esc(b.telefon)}</a> · <a href="mailto:${esc(b.email)}">${esc(b.email)}</a><br>Code ${esc(b.code)}${b.nachricht ? `<br>„${esc(b.nachricht)}"` : ''}</span></td>
    <td class="row">
      ${b.status === 'bestaetigt' ? `<button class="small ${b.bezahlt ? '' : 'ghost'}" data-act="bezahlt" data-id="${b.id}" data-val="${b.bezahlt ? 0 : 1}">${b.bezahlt ? 'bezahlt ✓' : 'bezahlt?'}</button>` : ''}
      <button class="small danger" data-act="storno" data-id="${b.id}">Storno</button>
      ${vorbei ? `<button class="small ghost" data-act="loeschen" data-id="${b.id}">Daten löschen</button>` : ''}
    </td></tr>`;
}

function terminKarte(t) {
  const vorbei = new Date(t.start) < new Date();
  const belegt = t.kapazitaet - t.frei;
  const summe = t.buchungen.filter(b => b.status === 'bestaetigt' && b.bezahlt).reduce((s, b) => s + b.personen * t.preis, 0);
  const offen = t.buchungen.filter(b => b.status === 'bestaetigt' && !b.bezahlt).reduce((s, b) => s + b.personen * t.preis, 0);
  return `<section class="card" style="${t.abgesagt || vorbei ? 'opacity:.75' : ''}">
    <div class="row"><strong>${esc(fmt(t.start))}</strong>
      ${t.abgesagt ? '<span class="badge err">abgesagt</span>' : vorbei ? '<span class="badge">vorbei</span>' : ''}</div>
    <div class="dim small">${esc(t.ort)} · ${belegt}/${t.kapazitaet} belegt · ${t.preis} € p. P. · eingenommen ${summe} €, offen ${offen} €</div>
    ${t.buchungen.length ? `<table>${t.buchungen.map(b => zeile(b, vorbei)).join('')}</table>` : '<p class="dim small">Noch keine Anmeldungen.</p>'}
    ${t.abgesagt ? '' : `<p><button class="small danger" data-act="absage" data-id="${t.id}">Termin absagen (alle werden benachrichtigt)</button></p>`}
  </section>`;
}

async function laden() {
  const d = await api('GET', '/api/admin/termine');
  $('ort').value ||= d.standard.ort;
  $('preis').value ||= d.standard.preis;
  $('termine').innerHTML = d.termine.length ? d.termine.map(terminKarte).join('') : '<p class="dim">Noch keine Termine. Lege oben den ersten an.</p>';
  const post = await api('GET', '/api/admin/postausgang');
  $('post').innerHTML = post.length ? post.map(p => `<details><summary>${esc(fmt(p.zeit))} · ${esc(p.an)} · ${esc(p.betreff)} <span class="badge ${p.status === 'fehler' ? 'err' : p.status === 'nur_protokoll' ? 'warn' : ''}">${p.status === 'nur_protokoll' ? 'nur Protokoll' : p.status}</span></summary><pre>${esc(p.text)}${p.fehler ? '\n\nFehler: ' + esc(p.fehler) : ''}</pre></details>`).join('') : '<p class="dim small">Noch keine Mails.</p>';
}

$('terminForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await api('POST', '/api/admin/termine', { start: $('start').value, ort: $('ort').value, kapazitaet: $('kap').value, preis: $('preis').value });
    meldung('Termin angelegt ✓');
    $('start').value = '';
    await laden();
  } catch (err) { meldung(err.message); }
});

$('termine').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const { act, id, val } = btn.dataset;
  try {
    if (act === 'bezahlt') await api('POST', `/api/admin/buchungen/${id}/bezahlt`, { bezahlt: val === '1' });
    if (act === 'storno') {
      if (!confirm('Diese Anmeldung stornieren? Der Gast bekommt eine Mail, die Warteliste rückt nach.')) return;
      await api('POST', `/api/admin/buchungen/${id}/storno`);
    }
    if (act === 'loeschen') {
      if (!confirm('Name, E-Mail, Telefon und Nachricht dieser Anmeldung endgültig löschen? Code, Personenzahl und Zahlungsvermerk bleiben ohne Namen erhalten.')) return;
      await api('POST', `/api/admin/buchungen/${id}/loeschen`);
      meldung('Daten gelöscht ✓');
    }
    if (act === 'absage') {
      const grund = prompt('Grund der Absage (kommt in die Mail an alle Angemeldeten, darf leer bleiben):');
      if (grund === null) return;
      const r = await api('POST', `/api/admin/termine/${id}/absage`, { grund });
      meldung(`Termin abgesagt, ${r.benachrichtigt} ${r.benachrichtigt === 1 ? 'Person' : 'Personen'} benachrichtigt.`);
    }
    await laden();
  } catch (err) { meldung(err.message); }
});

laden().catch(err => meldung(err.message));
