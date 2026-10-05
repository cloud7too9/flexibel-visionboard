/* ============================================================================
   ENTWURF · HANDBUCH › VERZAUBERUNGEN
   ----------------------------------------------------------------------------
   Entscheidung von Max (05.10.2026): Verzauberungen fliegen komplett aus dem
   Bereich Rüstung raus und kommen ins Handbuch. Hier liegt, was die Rüstung bis
   dahin dazu hatte, unverändert aus companion-prototyp.html (Abschnitt 9g), damit
   beim Bau des Handbuchs nichts verloren geht:
   · Amboss-Pläne je Rüstungsteil mit XP (Vorlage: lighthousepng)
   · Darstellung als aufklappbare Karte je Teil, Schritte abhaken (nur auf dem
     Gerät, localStorage „ruestung.schritte.<set>.<teil>“)
   Offen (aus der Übergabe): XP-Werte in Bedrock nicht geprüft; deutsche
   Bedrock-Namen der Verzauberungen („Huschen“ …) gegen de_DE.lang prüfen.
   Im Handbuch hängen die Pläne nicht mehr an einem Set – das Datenmodell dafür
   wird beim Handbuch besprochen. Die Funktionen unten erwarten noch ein Set.
   ========================================================================== */

/* ---- CSS ---------------------------------------------------------------------
/* Verzauberung am Amboss *\/
.verz { padding:0; gap:0; overflow:hidden; }
.verz.offen { border-color:var(--accent); }
.verz-kopf { display:flex; align-items:center; gap:10px; width:100%; background:none; border:none; color:var(--text);
  font:inherit; text-align:left; cursor:pointer; padding:10px 12px; }
.verz-kopf .item-bild { width:28px; height:28px; }
.verz-text { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.verz-text b { font-size:14px; }
.verz-text small { font-size:11.5px; color:var(--text-faint); line-height:1.4; }
.verz.offen .ach-cat-chevron { transform:rotate(180deg); }
.verz-schritte { padding:0 10px 12px; }
.amboss { gap:8px; }
.amboss-seite { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; font-size:12.5px; }
.amboss-seite small { font-size:11px; color:var(--text-faint); line-height:1.3; }
.amboss .plus { color:var(--text-faint); font-weight:800; }
.amboss .xp { font:800 14px ui-monospace,monospace; color:#9be36a; text-align:right; flex:0 0 auto; }
.amboss .xp small { font-size:9px; margin-left:1px; }
.amboss.erledigt .amboss-seite, .amboss.erledigt .xp { opacity:.5; }
------------------------------------------------------------------------------ */

/* ---- JS ---------------------------------------------------------------------- */
/* Verzauberungs-Pläne je Teil – beste Verzauberung mit wenig XP (Vorlage: lighthousepng).
   XP-Werte sind Richtwerte und können im Spiel leicht abweichen.
   Schritt = [links, rechts, xp]; links/rechts: { teil:true|false, v:[Verzauberungen] } */
const T = (...v) => ({ teil:true, v }), B = (...v) => ({ teil:false, v });
const VERZAUBERUNG = Object.freeze({
  helmet:     { ziel:["Schutz IV", "Haltbarkeit III", "Atmung III", "Wasseraffinität", "Reparatur"], schritte:[
    [T(), B("Atmung III"), 6], [B("Schutz IV"), B("Reparatur"), 2], [T("Atmung III"), B("Schutz IV", "Reparatur"), 8],
    [B("Haltbarkeit III"), B("Wasseraffinität"), 2], [T("Atmung III", "Schutz IV", "Reparatur"), B("Haltbarkeit III", "Wasseraffinität"), 9]] },
  chestplate: { ziel:["Schutz IV", "Haltbarkeit III", "Reparatur"], schritte:[
    [T(), B("Schutz IV"), 4], [B("Haltbarkeit III"), B("Reparatur"), 4], [T("Schutz IV"), B("Haltbarkeit III", "Reparatur"), 5]] },
  leggings:   { ziel:["Schutz IV", "Haltbarkeit III", "Reparatur", "Huschen III"], schritte:[
    [T(), B("Huschen III"), 12], [B("Haltbarkeit III"), B("Reparatur"), 2], [T("Huschen III"), B("Haltbarkeit III", "Reparatur"), 7],
    [T("Huschen III", "Haltbarkeit III", "Reparatur"), B("Schutz IV"), 7]] },
  boots:      { ziel:["Schutz IV", "Haltbarkeit III", "Reparatur", "Wasserläufer III", "Seelenläufer III", "Federfall IV"], schritte:[
    [T(), B("Seelenläufer III"), 12], [B("Wasserläufer III"), B("Federfall IV"), 3], [T("Seelenläufer III"), B("Wasserläufer III", "Federfall IV"), 11],
    [B("Schutz IV"), B("Haltbarkeit III"), 2], [B("Schutz IV", "Haltbarkeit III"), B("Reparatur"), 10],
    [T("Seelenläufer III", "Wasserläufer III", "Federfall IV"), B("Schutz IV", "Haltbarkeit III", "Reparatur"), 11]] },
});
const xpSumme = (teilId) => VERZAUBERUNG[teilId].schritte.reduce((n, s) => n + s[2], 0);
const verzSchritte = (setId, teilId) => new Set(lsLesen(`ruestung.schritte.${setId}.${teilId}`) || []);
const ambossSeite = (seite, name) => seite.teil
  ? `<b>${esc(name)}</b>${seite.v.length ? `<small>${seite.v.map(esc).join(", ")}</small>` : ""}`
  : `<b>Buch</b><small>${seite.v.map(esc).join(", ")}</small>`;

function verzauberungHtml(s){
  const teile = RUESTUNGS_TEILE.filter(({ id }) => s.teile[id]?.verzaubert);
  if(!teile.length) return "";
  return `<div class="field-group"><div class="field-group-label">Verzaubern am Amboss</div><div class="list-stack">${teile.map(({ id }) => {
    const plan = VERZAUBERUNG[id], erledigt = verzSchritte(s.id, id), offen = rs.offen === id, name = itemName(id, s.teile[id]);
    return `<div class="card verz ${offen ? "offen" : ""}">
      <button class="verz-kopf" data-aktion="verz-auf" data-teil-id="${id}" aria-expanded="${offen}">
        ${teilIcon(id, s.teile[id])}
        <span class="verz-text"><b>${esc(name)}</b><small>${erledigt.size}/${plan.schritte.length} Schritte · ${xpSumme(id)} XP · ${plan.ziel.map(esc).join(" · ")}</small></span>
        <span class="ach-cat-chevron">${CHEVRON}</span>
      </button>
      ${offen ? `<div class="list-stack verz-schritte">${plan.schritte.map(([l, r, xp], n) => `<button class="card schritt amboss ${erledigt.has(n) ? "erledigt" : ""}" data-aktion="verz-schritt" data-id="${s.id}" data-teil-id="${id}" data-n="${n}">
          <span class="schritt-nr">${erledigt.has(n) ? "✓" : n + 1}</span>
          <span class="amboss-seite">${ambossSeite(l, name)}</span><span class="plus">+</span><span class="amboss-seite">${ambossSeite(r, name)}</span>
          <span class="xp">${xp}<small>XP</small></span></button>`).join("")}
        <p class="result-hint">Reihenfolge mit wenig XP (Vorlage: lighthousepng) · XP-Werte sind Richtwerte, im Spiel leicht abweichend. Abhaken gilt nur auf diesem Gerät.</p></div>` : ""}
    </div>`;
  }).join("")}</div></div>`;
}
function verzSchrittUmschalten(setId, teilId, n){
  const erledigt = verzSchritte(setId, teilId);
  erledigt.has(n) ? erledigt.delete(n) : erledigt.add(n);
  lsSchreiben(`ruestung.schritte.${setId}.${teilId}`, erledigt.size ? [...erledigt] : null);
  ruestungDetailOeffnen(setId);
}
