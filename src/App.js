import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";

// ── RESPONSIVE HOOK ──────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

// ── SUPABASE CONFIG ─────────────────────────────────────────────────────────
const EMAILJS_SERVICE = "service_pex455s";
const EMAILJS_KEY = "cnJW9Jlr4xaN97tXq";
const EMAILJS_TEMPLATE_ALERT = "template_rdnhnas";
const EMAILJS_TEMPLATE_REPORT = "template_32n4gky";

const SUPA_URL = "https://ungozmmhdfbdctrhdoth.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuZ296bW1oZGZiZGN0cmhkb3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMzc1MjMsImV4cCI6MjA5MzYxMzUyM30.1i3cuKIP6gGdPr4H0nnIDNWUR5RcxdXG-dvKdjcSZ1g";

// ════════════════════════════════════════════════════════════════════════════
// SESSIONE CONDIVISA CON HUB CÀSA
// Il cookie sta sul dominio padre .casaimmobiliarevarese.it, quindi hub,
// gestionale, modulistica e operatività leggono la stessa sessione.
// Questo blocco è identico in tutte le app: non modificarlo in una sola.
// ════════════════════════════════════════════════════════════════════════════
const COOKIE_SESS = "casa_sess";
const DOMINIO_PADRE = ".casaimmobiliarevarese.it";
const URL_HUB = "https://hub.casaimmobiliarevarese.it";

function scriviCookieSess(valore, giorni){
  const scad = new Date(Date.now() + giorni*864e5).toUTCString();
  document.cookie = `${COOKIE_SESS}=${encodeURIComponent(valore)}; expires=${scad}; path=/; domain=${DOMINIO_PADRE}; SameSite=Lax; Secure`;
}
function leggiCookieSess(){
  for(const p of document.cookie.split(";")){
    const [k,...resto] = p.trim().split("=");
    if(k === COOKIE_SESS){ try{ return decodeURIComponent(resto.join("=")); }catch{ return null; } }
  }
  return null;
}
function cancellaCookieSess(){
  document.cookie = `${COOKIE_SESS}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${DOMINIO_PADRE}`;
}
// Fuori dal dominio reale (anteprima .netlify.app) il cookie di dominio viene
// rifiutato: si ripiega su localStorage, senza condivisione fra le app.
function salvaSessione(s){
  const testo = JSON.stringify(s);
  try{
    scriviCookieSess(testo, 30);
    if(leggiCookieSess()){ try{ localStorage.removeItem(COOKIE_SESS); }catch{} return true; }
  }catch{}
  try{ localStorage.setItem(COOKIE_SESS, testo); }catch{}
  return false;
}
function leggiSessione(){
  const c = leggiCookieSess();
  if(c){ try{ return JSON.parse(c); }catch{} }
  try{ const v = localStorage.getItem(COOKIE_SESS); return v ? JSON.parse(v) : null; }catch{ return null; }
}
function cancellaSessione(){
  cancellaCookieSess();
  try{ localStorage.removeItem(COOKIE_SESS); }catch{}
  TOKEN_ATTIVO = null;
}

// Token corrente: tutte le chiamate al database lo usano al posto della chiave
// anonima. Finché è nullo si ricade sulla chiave anon (compatibilità).
let TOKEN_ATTIVO = null;
function tokenAttivo(){ return TOKEN_ATTIVO; }
function authHeaders(){
  const t = TOKEN_ATTIVO || SUPA_KEY;
  return {"apikey": SUPA_KEY, "Authorization": `Bearer ${t}`};
}

async function autentica(email, password){
  const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method:"POST",
    headers:{ apikey:SUPA_KEY, "Content-Type":"application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error_description || j.msg || j.message || "credenziali");
  return j;
}
async function rinnovaSessione(refresh_token){
  const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=refresh_token`, {
    method:"POST",
    headers:{ apikey:SUPA_KEY, "Content-Type":"application/json" },
    body: JSON.stringify({ refresh_token }),
  });
  if(!r.ok) throw new Error("refresh");
  return r.json();
}
async function chiudiSessioneServer(token){
  try{
    await fetch(`${SUPA_URL}/auth/v1/logout`, {
      method:"POST",
      headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${token}` },
    });
  }catch{}
}
function impacchettaSessione(auth){
  return {
    token: auth.access_token,
    refresh: auth.refresh_token,
    scade: Date.now() + (auth.expires_in || 3600) * 1000,
    email: (auth.user && auth.user.email) || "",
  };
}
// Restituisce una sessione valida (rinnovata se serve) o null.
async function sessioneValida(){
  const s = leggiSessione();
  if(!s || !s.refresh) return null;
  if(s.scade && s.scade > Date.now() + 60000){ TOKEN_ATTIVO = s.token; return s; }
  try{
    const auth = await rinnovaSessione(s.refresh);
    const nuova = impacchettaSessione(auth);
    salvaSessione(nuova);
    TOKEN_ATTIVO = nuova.token;
    return nuova;
  }catch{
    cancellaSessione();
    return null;
  }
}

// ── Dall'anagrafica agenti all'utente dell'app ─────────────────────────────
function trovaAgentePerEmail(data, email){
  const arr = (data && Array.isArray(data.agenti)) ? data.agenti : INIT_AGENTI;
  const e = (email||"").trim().toLowerCase();
  return arr.find(a => a.email && (""+a.email).trim().toLowerCase() === e) || null;
}
function utenteDaAgente(ag){
  const ruolo = ag.profilo==="Broker" ? "Broker"
              : ag.profilo==="Back Office" ? "BackOffice"
              : ag.profilo==="Coach" ? "Coach" : "Agente";
  return {
    id: ag.id, nome: `${ag.nome} ${ag.cognome}`, ruolo, agentId: ag.id,
    profilo: ag.profilo, coachTarget: ag.coachTarget||"agenzia",
    email: (""+(ag.email||"")).trim(),
    permessi: ag.permessi || {},
  };
}

// ── Striscia fissa in alto, identica in tutte le app ───────────────────────
const APP_SORELLE = [
  { k:"gestionale",  nome:"Gestionale",  icona:"📊", url:"https://gestionale.casaimmobiliarevarese.it" },
  { k:"modulistica", nome:"Modulistica", icona:"📄", url:"https://modulistica.casaimmobiliarevarese.it" },
];
function BarraApp({permessi, onEsci}){
  const p = permessi || {};
  const altre = APP_SORELLE.filter(a => p[a.k]);
  const link = { fontSize:11, color:"#888", textDecoration:"none", padding:"3px 9px",
                 borderRadius:6, border:"0.5px solid #e0ddd8", whiteSpace:"nowrap" };
  const nudo = { fontSize:11, color:"#aaa", textDecoration:"none", padding:"3px 9px", whiteSpace:"nowrap" };
  return (
    <div style={{background:"#fff", borderBottom:"0.5px solid #e8e5e0", height:36, flexShrink:0,
                 display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6, padding:"0 14px"}}>
      {altre.map(a=>(
        <a key={a.k} href={a.url} title={`Vai a ${a.nome}`} style={link}>{a.icona} {a.nome}</a>
      ))}
      <a href={URL_HUB} title="Torna all'Hub" style={nudo}>⌂ Hub</a>
      <span style={{width:1,height:16,background:"#e8e5e0",margin:"0 2px"}}/>
      <button onClick={onEsci} title="Esci da tutte le app"
        style={{fontSize:11,color:"#c0392b",padding:"3px 9px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
        Esci
      </button>
    </div>
  );
}

const supaFetch = async (method, body=null) => {
  const opts = {
    method,
    headers: {...authHeaders(),"Content-Type":"application/json","Prefer":"return=representation"},
  };
  if(body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPA_URL}/rest/v1/gestionale_data?id=eq.main`, opts);
  if(!res.ok) throw new Error(await res.text());
  return res.json();
};

const caricaDB = async () => {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/gestionale_data?id=eq.main&select=data`,
      {headers:authHeaders()});
    const rows = await res.json();
    return rows?.[0]?.data || null;
  } catch(e){ return null; }
};

const salvaDB = async (data) => {
  try {
    await supaFetch("PATCH", {data, updated_at: new Date().toISOString()});
  } catch(e){
    console.error("Errore salvataggio Supabase:", e);
    if(typeof window!=="undefined"){
      window.__ultimoErroreSalvataggio = {timestamp:Date.now(),errore:String(e?.message||e)};
    }
    alert("⚠ Errore di salvataggio!\nI tuoi dati potrebbero non essere stati salvati.\nDettaglio: "+(e?.message||e));
  }
};

// Salva solo catCosti e speseCosti con merge
const salvaDBCosti = async (catCosti, speseCosti) => {
  try {
    // Leggi prima il record attuale
    const res = await fetch(`${SUPA_URL}/rest/v1/gestionale_data?id=eq.main&select=data`, {
      headers: authHeaders()
    });
    const rows = await res.json();
    const current = rows?.[0]?.data || {};
    // Fai merge: mantieni tutto il resto, aggiorna solo catCosti e speseCosti
    const merged = {...current, catCosti, speseCosti};
    await supaFetch("PATCH", {data: merged, updated_at: new Date().toISOString()});
    console.log("[COSTI SAVED] catCosti:", catCosti.length, "agente:", catCosti.filter(x=>x.agentId).length);
  } catch(e){ console.error("Errore salvataggio costi:", e); }
};

// ─── CINTURA DI SICUREZZA: salvataggio con fusione anti-sovrascrittura ───
// Prima di scrivere, rilegge i dati sul server e li fonde con quelli locali.
// Regola d'oro: un salvataggio NON può cancellare record che esistono sul server
// e che questo dispositivo non conosce (= aggiunte fatte da altri).
const _mergeArrById = (local, remote, knownIds) => {
  const arrLocal = Array.isArray(local) ? local : [];
  const arrRemote = Array.isArray(remote) ? remote : [];
  const localIds = new Set(arrLocal.map(x=>x&&x.id));
  const out = [...arrLocal];
  for(const r of arrRemote){
    if(!r || r.id==null) continue;
    if(localIds.has(r.id)) continue;             // presente in locale → vince il locale
    if(knownIds && knownIds.has(r.id)) continue; // il dispositivo lo conosceva (archiviato/spostato) → non resuscitare
    out.push(r);                                 // aggiunta fatta da un altro dispositivo → mantieni
  }
  return out;
};
const _mergeObjByKey = (local, remote) => {
  if(!remote || typeof remote!=="object" || Array.isArray(remote)) return local||{};
  return {...remote, ...(local||{})}; // chiavi solo-remote preservate; in conflitto vince il locale
};
const mergeData = (remote, local) => {
  if(!remote || typeof remote!=="object") return local; // nessun remoto valido → scrivi il locale
  const m = {...remote, ...local}; // base: locale vince sui campi che ha; campi solo-remoti (scalari/config/altre app) preservati
  // Collezioni transazionali critiche: fusione per id con protezione delle aggiunte
  const knownInc = new Set([...(local.incarichi||[]).map(i=>i.id), ...(local.archiviati||[]).map(i=>i.id)]);
  m.incarichi  = _mergeArrById(local.incarichi,  remote.incarichi,  knownInc);
  m.archiviati = _mergeArrById(local.archiviati, remote.archiviati, knownInc);
  const knownProp = new Set([...(local.proposte||[]).map(p=>p.id), ...(local.archiviatiProp||[]).map(p=>p.id)]);
  m.proposte       = _mergeArrById(local.proposte,       remote.proposte,       knownProp);
  m.archiviatiProp = _mergeArrById(local.archiviatiProp, remote.archiviatiProp, knownProp);
  const knownVend = new Set([...(local.venduti||[]).map(v=>v.id), ...(local.archiviatiVend||[]).map(v=>v.id)]);
  m.venduti        = _mergeArrById(local.venduti,        remote.venduti,        knownVend);
  m.archiviatiVend = _mergeArrById(local.archiviatiVend, remote.archiviatiVend, knownVend);
  // Altre liste con id (universo = solo locale)
  m.agenti    = _mergeArrById(local.agenti,    remote.agenti,    new Set((local.agenti||[]).map(a=>a&&a.id)));
  m.prospetti = _mergeArrById(local.prospetti, remote.prospetti, new Set((local.prospetti||[]).map(p=>p&&p.id)));
  m.eventi    = _mergeArrById(local.eventi,    remote.eventi,    new Set((local.eventi||[]).map(e=>e&&e.id)));
  m.sfide     = _mergeArrById(local.sfide,     remote.sfide,     new Set((local.sfide||[]).map(s=>s&&s.id)));
  // Oggetti chiave→valore: preserva le chiavi aggiunte altrove
  m.pratiche         = _mergeObjByKey(local.pratiche,         remote.pratiche);
  m.operativita      = _mergeObjByKey(local.operativita,      remote.operativita);
  m.oggiDati         = _mergeObjByKey(local.oggiDati,         remote.oggiDati);
  m.obiettiviOp      = _mergeObjByKey(local.obiettiviOp,      remote.obiettiviOp);
  m.pagamentiFatture = _mergeObjByKey(local.pagamentiFatture, remote.pagamentiFatture);
  m.mirino           = _mergeObjByKey(local.mirino,           remote.mirino);
  m.oneToOne         = _mergeObjByKey(local.oneToOne,         remote.oneToOne);
  m.tracciamento     = _mergeObjByKey(local.tracciamento,     remote.tracciamento);
  // Costi: categorie (array per id) e spese ({anno:[spese]} → per anno e per id)
  m.catCosti = _mergeArrById(local.catCosti, remote.catCosti, new Set((local.catCosti||[]).map(c=>c&&c.id)));
  {
    const lsp=(local.speseCosti&&typeof local.speseCosti==="object"&&!Array.isArray(local.speseCosti))?local.speseCosti:{};
    const rsp=(remote.speseCosti&&typeof remote.speseCosti==="object"&&!Array.isArray(remote.speseCosti))?remote.speseCosti:{};
    const anni=new Set([...Object.keys(lsp),...Object.keys(rsp)]);
    const out={};
    anni.forEach(a=>{ out[a]=_mergeArrById(lsp[a], rsp[a], new Set((lsp[a]||[]).map(s=>s&&s.id))); });
    m.speseCosti=out;
  }
  return m;
};
const salvaDBMerge = async (data) => {
  let remote=null;
  try { remote = await caricaDB(); } catch(e){ remote=null; }
  if(remote===null){
    // 2° tentativo di lettura prima di rinunciare alla fusione
    try { remote = await caricaDB(); } catch(e){ remote=null; }
  }
  try {
    const merged = (remote && typeof remote==="object") ? mergeData(remote, data) : data;
    await supaFetch("PATCH", {data: merged, updated_at: new Date().toISOString()});
  } catch(e){
    console.error("Errore salvataggio (merge) Supabase:", e);
    if(typeof window!=="undefined"){ window.__ultimoErroreSalvataggio={timestamp:Date.now(),errore:String(e?.message||e)}; }
    alert("⚠ Errore di salvataggio!\nI tuoi dati potrebbero non essere stati salvati.\nDettaglio: "+(e?.message||e));
  }
};

const BRAND = {oro:"#C9A96E",oroD:"#A8863A",grigio:"#4A4A4A",beige:"#F2F0EB"};

// ── Notizie: colonne dell'iter e priorità ─────────────────────────────────
const STATI_NOT = [
  { k:"nuova",        lbl:"Nuova",        clr:"#7F8C8D" },
  { k:"contattare",   lbl:"Da contattare",clr:"#E67E22" },
  { k:"appuntamento", lbl:"Appuntamento", clr:"#2980B9" },
  { k:"incarico",     lbl:"Incarico",     clr:"#27AE60" },
  { k:"persa",        lbl:"Persa",        clr:"#C0392B" },
];
const PRIORITA_NOT = { alta:{lbl:"Alta",clr:"#C0392B"}, media:{lbl:"Media",clr:"#E67E22"}, bassa:{lbl:"Bassa",clr:"#95A5A6"} };
const OPERAZIONI_NOT = ["Vendita","Locazione"];
const MOTIVI_PERSA = ["Ha scelto altra agenzia","Vende da privato","Non vende più","Prezzo fuori mercato","Non risponde","Altro"];
const NOTIZIA_VUOTA = {
  titolo:"", nome:"", cognome:"", cellulare:"", telefono:"", email:"",
  tipologia:"", operazione:"Vendita", indirizzo:"", comune:"", zona:"",
  mq:"", locali:"", piano:"", valore:"", fonte:"", dettaglioFonte:"",
  priorita:"media", stato:"nuova", motivoPersa:"", agenteId:"",
  dataContatto:"", dataRichiamata:"", linkAnnuncio:"", note:"",
};
// Titolo automatico quando non compilato a mano
function titoloNotizia(n){
  if(n.titolo && n.titolo.trim()) return n.titolo.trim();
  const p = [n.tipologia, n.indirizzo, n.comune].filter(x=>x&&(""+x).trim());
  return p.length ? p.join(" · ") : "Senza titolo";
}

// 90 frasi motivazionali — mix di citazioni di coach immobiliari, vendita, mindset e crescita personale
const FRASI_MOTIVAZIONALI=[
  {t:"Il segreto del successo è iniziare. Inizia oggi quello che vuoi essere domani.",a:"Mark Twain"},
  {t:"Le persone non comprano quello che fai, comprano il perché lo fai.",a:"Simon Sinek"},
  {t:"Non vendiamo case, costruiamo relazioni che durano nel tempo.",a:"Anonimo"},
  {t:"Ogni no ti avvicina al prossimo sì. Continua a chiamare.",a:"Anonimo"},
  {t:"I top producer non sono più talentuosi, semplicemente fanno più telefonate.",a:"Mike Ferry"},
  {t:"Il tuo network è il tuo net worth.",a:"Tim Sanders"},
  {t:"La differenza tra ordinario e straordinario è quel piccolo extra.",a:"Jimmy Johnson"},
  {t:"Non rincorrere il successo, attirelo diventando una persona di valore.",a:"Jim Rohn"},
  {t:"Il mercato premia chi è costantemente presente, non chi è occasionalmente brillante.",a:"Tom Ferry"},
  {t:"La qualità della tua giornata dipende dalla qualità delle tue prime due ore.",a:"Brian Buffini"},
  {t:"Acquisire è il cuore del nostro mestiere. Tutto il resto è conseguenza.",a:"Anonimo"},
  {t:"Chi non pianifica, pianifica di fallire.",a:"Benjamin Franklin"},
  {t:"Il follow-up è dove si fanno i soldi nel real estate.",a:"Gary Keller"},
  {t:"Sii sempre il primo a chiamare, l'ultimo a mollare.",a:"Anonimo"},
  {t:"L'agente di successo fa quello che gli agenti mediocri evitano.",a:"Tom Hopkins"},
  {t:"Il talento è un mito. La disciplina quotidiana è la verità.",a:"Anonimo"},
  {t:"Non aspettare il momento giusto. Crealo.",a:"George Bernard Shaw"},
  {t:"Le abitudini di oggi sono i risultati di domani.",a:"James Clear"},
  {t:"Vendere è trasferire emozione e fiducia, non solo informazione.",a:"Zig Ziglar"},
  {t:"I clienti non ricordano cosa hai detto, ma come li hai fatti sentire.",a:"Maya Angelou"},
  {t:"Una chiamata in più al giorno significa 250 chiamate in più all'anno.",a:"Anonimo"},
  {t:"Più semini, più raccogli. Senza scorciatoie.",a:"Anonimo"},
  {t:"Il tempo che passi sui clienti passati è l'investimento migliore che puoi fare.",a:"Brian Buffini"},
  {t:"La differenza la fa chi richiama anche quando non sembra urgente.",a:"Anonimo"},
  {t:"Sii brillante nelle fondamenta. Le cose semplici fatte bene battono le cose complicate fatte male.",a:"Tom Ferry"},
  {t:"Non puoi controllare il mercato, ma puoi controllare le tue azioni.",a:"Anonimo"},
  {t:"Ogni acquisizione inizia con una conversazione. Inizia tu, oggi.",a:"Anonimo"},
  {t:"Chi vuole risultati straordinari deve accettare azioni quotidiane ordinarie.",a:"Robin Sharma"},
  {t:"Il valore di un agente si vede nei mesi difficili, non in quelli facili.",a:"Anonimo"},
  {t:"Coltiva il database come un orto: ogni giorno un po', non solo quando hai fame.",a:"Anonimo"},
  {t:"Sii la persona che la tua zona pensa quando dice 'casa'.",a:"Anonimo"},
  {t:"Non sei pagato per la difficoltà del lavoro, ma per il valore che porti.",a:"Jim Rohn"},
  {t:"L'azione cura la paura. L'inazione la alimenta.",a:"Anonimo"},
  {t:"Chi domina la propria agenda domina la propria vita.",a:"Anonimo"},
  {t:"Un agente medio cerca clienti, un top agent costruisce reputazione.",a:"Tom Ferry"},
  {t:"Le proposte non arrivano per fortuna, arrivano per processo.",a:"Anonimo"},
  {t:"Concentrati sulla causa, il risultato seguirà.",a:"Anonimo"},
  {t:"Il modo in cui fai una cosa è il modo in cui fai tutte le cose.",a:"Tom Hopkins"},
  {t:"Niente di buono accade nella tua zona di comfort.",a:"Anonimo"},
  {t:"Le difficoltà preparano persone ordinarie a destini straordinari.",a:"C.S. Lewis"},
  {t:"Quando smetti di imparare, smetti di crescere. Quando smetti di crescere, smetti di vendere.",a:"Anonimo"},
  {t:"Il tuo prossimo cliente è una sola conversazione di distanza.",a:"Anonimo"},
  {t:"L'opportunità è spesso vestita da lavoro duro.",a:"Thomas Edison"},
  {t:"Vendere è servire. Chi serve meglio, vende di più.",a:"Anonimo"},
  {t:"Ascolta più di quanto parli. Le orecchie chiudono più contratti della bocca.",a:"Anonimo"},
  {t:"Sei la media delle 5 persone con cui passi più tempo. Scegli bene.",a:"Jim Rohn"},
  {t:"Non temere chi è bravo, temi chi è costante.",a:"Anonimo"},
  {t:"I problemi sono solo opportunità con i vestiti da lavoro.",a:"Henry Kaiser"},
  {t:"Chi insegue due lepri non ne prende nessuna. Focalizzati.",a:"Proverbio"},
  {t:"Il momento perfetto non esiste. Esiste il momento che cogli.",a:"Anonimo"},
  {t:"La fortuna è quello che succede quando preparazione incontra opportunità.",a:"Seneca"},
  {t:"Tratta ogni chiamata come se fosse la più importante della giornata.",a:"Anonimo"},
  {t:"Un cliente soddisfatto è il miglior business plan che esista.",a:"Michael LeBoeuf"},
  {t:"L'eccellenza non è un atto, è un'abitudine.",a:"Aristotele"},
  {t:"Sii curioso del tuo cliente, non del tuo provvigionario.",a:"Anonimo"},
  {t:"Chi smette di migliorarsi smette di essere buono.",a:"Oliver Cromwell"},
  {t:"Le scuse non pagano l'affitto.",a:"Anonimo"},
  {t:"Il duro lavoro batte il talento quando il talento non lavora duramente.",a:"Tim Notke"},
  {t:"Investi in te stesso. È l'asset che renderà di più.",a:"Warren Buffett"},
  {t:"Sii grato per ogni 'no'. Ti sta liberando per il prossimo 'sì'.",a:"Anonimo"},
  {t:"Il futuro appartiene a chi crede nella bellezza dei propri sogni.",a:"Eleanor Roosevelt"},
  {t:"Pianifica la settimana la domenica, vinci la settimana il lunedì.",a:"Anonimo"},
  {t:"Tutti vogliono il risultato, pochi accettano il processo.",a:"Anonimo"},
  {t:"Sii ossessionato dai tuoi clienti, non dai tuoi competitor.",a:"Jeff Bezos"},
  {t:"Una promessa mantenuta vale più di cento dichiarazioni.",a:"Anonimo"},
  {t:"L'immobiliare è un business di relazioni nascosto dentro un business di immobili.",a:"Anonimo"},
  {t:"Chi parla semina, chi ascolta raccoglie.",a:"Proverbio"},
  {t:"Le scorciatoie nel lungo periodo sono sempre la via più lunga.",a:"Anonimo"},
  {t:"Sii la sveglia, non il sonno. Chiama tu, non aspettare.",a:"Anonimo"},
  {t:"Non vendere mai per vendere. Vendi per risolvere.",a:"Anonimo"},
  {t:"Il tuo nome è il tuo brand. Trattalo come la cosa più preziosa.",a:"Anonimo"},
  {t:"Chi è disposto a fare un'ora in più batte chi punta solo sul talento.",a:"Anonimo"},
  {t:"Il primo passo verso un grande risultato è decidere che lo vuoi davvero.",a:"Anonimo"},
  {t:"L'umiltà attira clienti, l'arroganza li allontana.",a:"Anonimo"},
  {t:"Sii ottimista informato, non illuso. Conosci i numeri, credi nelle persone.",a:"Anonimo"},
  {t:"Il mercato cambia ogni mese, le abitudini vincenti restano per sempre.",a:"Anonimo"},
  {t:"Fai oggi quello che gli altri non faranno, vivi domani come gli altri non potranno.",a:"Jerry Rice"},
  {t:"Costruisci la tua giornata sulle azioni, non sulle aspettative.",a:"Anonimo"},
  {t:"L'agente eccellente è prima di tutto un grande comunicatore.",a:"Anonimo"},
  {t:"Sii il professionista che vorresti incontrare se tu fossi il cliente.",a:"Anonimo"},
  {t:"Le obiezioni non sono rifiuti, sono richieste di chiarezza.",a:"Tom Hopkins"},
  {t:"L'energia che metti oggi è il successo che incassi tra sei mesi.",a:"Anonimo"},
  {t:"Resta affamato. Resta umile.",a:"Steve Jobs"},
  {t:"Chi pianifica vince due volte: prima nella mente, poi nella realtà.",a:"Anonimo"},
  {t:"Le abitudini sono la composizione capitalizzata del tuo carattere.",a:"James Clear"},
  {t:"Non puntare a essere il migliore al mondo, punta a essere il migliore PER il tuo cliente.",a:"Anonimo"},
  {t:"Il successo è la somma di piccoli sforzi ripetuti giorno dopo giorno.",a:"Robert Collier"},
  {t:"Non si tratta di quante porte bussi, ma di quante volte ne bussi una.",a:"Anonimo"},
  {t:"Sii più disciplinato dei tuoi sentimenti.",a:"Anonimo"},
  {t:"L'attitudine è una piccola cosa che fa una grande differenza.",a:"Winston Churchill"},
  {t:"Chi semina nel proprio territorio raccoglie referenze a vita.",a:"Anonimo"},
  {t:"Il prezzo del successo è il duro lavoro, la dedizione, e la determinazione che vincerai.",a:"Vince Lombardi"},
  {t:"Oggi è il primo giorno del resto della tua carriera.",a:"Anonimo"},
];
// Restituisce la frase del giorno (cambia ogni 24h, uguale per tutti gli agenti)
const getFraseDelGiorno=()=>{
  const oggi=new Date();
  const inizio=new Date(oggi.getFullYear(),0,0);
  const diff=oggi-inizio;
  const giornoAnno=Math.floor(diff/(1000*60*60*24));
  return FRASI_MOTIVAZIONALI[giornoAnno%FRASI_MOTIVAZIONALI.length];
};
const MESI_NOMI = ["","Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const TAB_CONFIG = [
  { id:"Dashboard",       icon:"⊞",  label:"Dashboard" },
  { id:"Operatività",     icon:"📅", label:"Operatività" },
  { id:"Notizie",         icon:"📣", label:"Notizie" },
  { id:"Gestione Pratiche", icon:"📁", label:"Gestione Pratiche" },
  { id:"Incarichi",       icon:"📋", label:"Incarichi" },
  { id:"Proposte",        icon:"📝", label:"Proposte" },
  { id:"Venduti",         icon:"🏠", label:"Venduti" },
  { id:"Il mio report",   icon:"📊", label:"Il mio report" },
  { id:"Report Agenti",   icon:"💰", label:"Produzione Agenti" },
  { id:"Fatture Agenti",  icon:"🧾", label:"Fatture Agenti" },
  { id:"Fatture Agente",  icon:"🧾", label:"Le mie fatture" },
  { id:"Costi",          icon:"📋", label:"Costi" },
  { id:"Break Even",     icon:"📉", label:"Break Even" },
  { id:"Statistiche",     icon:"📈", label:"Statistiche" },
  { id:"War Room",        icon:"🏆", label:"War Room" },
  { id:"One-to-One",     icon:"🤝", label:"One-to-One" },
  { id:"Agenti",          icon:"👥", label:"Agenti" },
  { id:"Impostazioni",    icon:"⚙️", label:"Impostazioni" },
  { id:"Guida",           icon:"❓", label:"Guida" },
];
const fmt  = n => Number(n||0).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtN = n => Number(n||0).toLocaleString("it-IT",{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtD = iso => iso ? new Date(iso).toLocaleDateString("it-IT") : "—";
const nowISO = () => new Date().toISOString();
const todayStr = () => new Date().toISOString().slice(0,10);

// Genera il prossimo codice pratica nel formato ANNO-NNN (progressivo che riparte ogni anno).
// Si basa sull'anno di dataInizio dell'incarico. Es: 2026-001, 2026-002...
const generaCodicePratica = (incarichiEsistenti, dataInizio) => {
  const anno = (dataInizio||todayStr()).slice(0,4);
  // Trovo il progressivo più alto già usato per quell'anno
  let maxN = 0;
  (incarichiEsistenti||[]).forEach(i=>{
    if(i.codicePratica && i.codicePratica.startsWith(anno+"-")){
      const n = parseInt(i.codicePratica.split("-")[1],10);
      if(!isNaN(n) && n>maxN) maxN = n;
    }
  });
  const prossimo = String(maxN+1).padStart(3,"0");
  return `${anno}-${prossimo}`;
};
const getAnno = d => d ? String(d).substring(0,4) : "";
const getMese = d => d ? String(d).substring(0,7) : "";
// Data di competenza per fatturato AGENZIA
// Se competenzaAgenziaDiversa=true → usa dataCompetenzaAgenzia, altrimenti dataVendita
const dataCompAgenzia = v => (v.competenzaAgenziaDiversa===true||v.competenzaAgenziaDiversa==="true")&&v.dataCompetenzaAgenzia ? v.dataCompetenzaAgenzia : (v.dataVendita||v.dataAtto||"");
// Normalizza stato pagamento: "Pagato parzialmente" → "Parziale" per retrocompatibilità
const normStatoPag = s => s==="Pagato parzialmente"?"Parziale":s||"Da pagare";
const fmtMese = m => { if(!m) return m; const p=m.split("-"); return MESI_NOMI[parseInt(p[1])]+" "+p[0]; };
const isScad = s => s && new Date(s) < new Date();
const annoCorrente = String(new Date().getFullYear());
const diffGiorni = (d1,d2) => { if(!d1||!d2) return null; const ms=new Date(d2)-new Date(d1); return Math.round(ms/86400000); };

// Ricerca multi-parola case-insensitive su più campi. Tutte le parole devono essere presenti in almeno UNO dei campi (AND tra parole, OR tra campi).
// Es: matchSearch("varese rossi", "Varese - Via Manzoni", "Rossi Marco") → true (entrambe le parole presenti)
const matchSearch = (query, ...fields) => {
  if(!query||!query.trim()) return true;
  const haystack = fields.filter(Boolean).map(f=>String(f).toLowerCase()).join(" ");
  const words = query.toLowerCase().trim().split(/\s+/);
  return words.every(w=>haystack.includes(w));
};

// Barra di ricerca con stato INTERNO + debounce per evitare re-render dell'intero App ad ogni tasto.
// Il valore "esterno" (filtro vero e proprio) si aggiorna 250ms dopo l'ultimo tasto premuto.
// Definita a livello modulo + React.memo per stabilità di riferimento (altrimenti re-render = perdita focus).
const SEARCH_INPUT_STYLE = {
  paddingLeft:30,
  paddingRight:30,
  width:"100%",
  fontSize:13,
  border:"0.5px solid #ddd",
  borderRadius:6,
  padding:"6px 30px 6px 30px",
  background:"#fff",
  outline:"none",
  fontFamily:"inherit"
};
const SearchBar = React.memo(function SearchBar({value, onChange, placeholder, nResults}) {
  const [local, setLocal] = React.useState(value || "");
  const debRef = React.useRef(null);

  // Sincronizzo se il valore esterno cambia da fuori (es. reset programmato)
  React.useEffect(() => {
    setLocal(value || "");
  }, [value]);

  const handleChange = (e) => {
    const v = e.target.value;
    setLocal(v);
    if(debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => onChange(v), 250);
  };

  const handleClear = () => {
    setLocal("");
    if(debRef.current) clearTimeout(debRef.current);
    onChange("");
  };

  return (
    <div style={{position:"relative", display:"inline-block", minWidth:240}}>
      <span style={{position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#aaa", pointerEvents:"none"}}>🔍</span>
      <input
        type="text"
        value={local}
        onChange={handleChange}
        placeholder={placeholder || "Cerca..."}
        style={SEARCH_INPUT_STYLE}
      />
      {local && <button onClick={handleClear} title="Pulisci ricerca" style={{position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", cursor:"pointer", fontSize:14, color:"#888", padding:"2px 6px", lineHeight:1}}>×</button>}
      {value && typeof nResults === "number" && <div style={{position:"absolute", left:0, top:"100%", marginTop:2, fontSize:10, color:"#888", whiteSpace:"nowrap"}}>{nResults} risultat{nResults===1?"o":"i"}</div>}
    </div>
  );
});

const STATI_INC = { Attivo:{clr:"#27AE60",bg:"#E9F7EF"}, "In trattativa":{clr:"#2980B9",bg:"#E8F1FB"}, "Accettata con Vincolo":{clr:"#D4AC0D",bg:"#FEF9E7"}, Scaduto:{clr:"#E74C3C",bg:"#FDECEA"}, Venduto:{clr:"#C9A96E",bg:"#FDF6EC"}, Locato:{clr:"#8E44AD",bg:"#F5EEF8"} };
// Stati "pratica" derivati (modello a stati): vedi specifica Gestione Pratiche
const STATI_PRATICA = {
  "In vendita":{clr:"#27AE60",bg:"#E9F7EF"},
  "In trattativa":{clr:"#2980B9",bg:"#E8F1FB"},
  "Venduto":{clr:"#0E7A52",bg:"#E1F5EE"},
  "Rogitato":{clr:"#0C447C",bg:"#E6F1FB"},
  "Archiviata":{clr:"#7A766C",bg:"#F1EFE8"},
  "Scaduto":{clr:"#E74C3C",bg:"#FDECEA"},
};
const STATI_PROP = {
  "In attesa":{clr:"#4A90D9",bg:"#E8F1FB",s:"🔵",label:"In attesa"},
  "In attesa / Vincolata":{clr:"#4A90D9",bg:"#E8F1FB",s:"🔵",label:"In attesa (vincolata)"},
  "Controproposta":{clr:"#E67E22",bg:"#FEF0E0",s:"🟡",label:"Controproposta"},
  "Rifiutata":{clr:"#C0392B",bg:"#FDECEA",s:"🔴",label:"Rifiutata"},
  "Mancata Chiusura":{clr:"#922B21",bg:"#FADBD8",s:"🔴",label:"Mancata Chiusura"},
  "Accettata con Vincolo":{clr:"#D4AC0D",bg:"#FEF9E7",s:"🟡",label:"Acc. con Vincolo"},
  "Accettata":{clr:"#27AE60",bg:"#E9F7EF",s:"🟢",label:"Accettata"},
};
const STATI_INCASSO = {"Da incassare":{clr:"#E67E22",bg:"#FEF0E0"},"Parziale":{clr:"#D4AC0D",bg:"#FEF9E7"},"Incassato":{clr:"#27AE60",bg:"#E9F7EF"}};
const STATI_FATTURA = {"Da pagare":{clr:"#E67E22",bg:"#FEF0E0"},"Pagato parzialmente":{clr:"#D4AC0D",bg:"#FEF9E7"},"Pagato":{clr:"#27AE60",bg:"#E9F7EF"}};
const bdg = cfg => ({display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:5,fontSize:11,fontWeight:500,background:cfg?.bg||"#eee",color:cfg?.clr||"#333",border:`0.5px solid ${cfg?.clr||"#ccc"}`,whiteSpace:"nowrap"});

// Kit spese personali agente (default)
const VOCI_COSTO_AGENTE_DEFAULT = [
  {voce:"Carburante",tipo:"variabile"},{voce:"Telefono",tipo:"fisso"},
  {voce:"Marketing personale",tipo:"variabile"},{voce:"Formazione / Corsi",tipo:"variabile"},
  {voce:"Pranzi e cene di lavoro",tipo:"variabile"},{voce:"Abbonamenti professionali",tipo:"fisso"},
  {voce:"Materiali promozionali",tipo:"variabile"},{voce:"Altro",tipo:"variabile"},
];
const mkCostiAgente = () => VOCI_COSTO_AGENTE_DEFAULT.map((v,i)=>({id:i+1,voce:v.voce,tipo:v.tipo||"variabile",prevMensile:0,frequenza:"mensile",spese:[]}));

const INIT_AGENTI = [
  {id:1,nome:"Antonello",cognome:"Di Rita",profilo:"Broker",tipo:"Interno",percListing:0,percAcquirente:0,email:"adirita@casaimmobiliarevarese.it",attivo:true},
  {id:2,nome:"Luca",cognome:"Pagliara",profilo:"Consulente",tipo:"Interno",percListing:40,percAcquirente:40,email:"",password:"",attivo:true},
  {id:3,nome:"Riccardo",cognome:"Di Rita",profilo:"Collaboratore",tipo:"Interno",percListing:20,percAcquirente:20,email:"",password:"",attivo:true},
  {id:4,nome:"Fabio",cognome:"Portinaro",profilo:"Collaboratore",tipo:"Interno",percListing:40,percAcquirente:40,email:"",password:"",attivo:true},
];

// LocalStorage come fallback offline
const LS_KEY = "gestionale_casa_v1";
const salvaLS = (data) => { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch(e){} };
const caricaLS = () => { try { const d=localStorage.getItem(LS_KEY); return d?JSON.parse(d):null; } catch(e){return null;} };

const INIT_INCARICHI = [
  {id:1,categoria:"vendita",agenteListing:1,percListing:0,buyerListing:3,percBuyerListing:10,fonte:"CP/CDI",nominativo:"Tresoldi - Caretti",comune:"Barasso",indirizzo:"Via Cassini 1",tipologia:"Villa",dataInizio:"2025-05-07",scadenza:"2025-12-31",prezzoRichiesto:205000,prezzoReale:200000,provvPrevista:6150,note:"",stato:"Venduto",archiviato:false,storicoRibassi:[]},
  {id:2,categoria:"vendita",agenteListing:2,percListing:40,buyerListing:null,percBuyerListing:0,fonte:"CP/CDI",nominativo:"Ventura",comune:"Malnate",indirizzo:"Viale Kennedy 15",tipologia:"Bilocale",dataInizio:"2025-04-02",scadenza:"2025-10-01",prezzoRichiesto:89000,prezzoReale:85000,provvPrevista:2000,note:"",stato:"Attivo",archiviato:false,storicoRibassi:[]},
  {id:3,categoria:"vendita",agenteListing:1,percListing:0,buyerListing:3,percBuyerListing:10,fonte:"CP/CDI",nominativo:"Scala Domenico",comune:"Gazzada Schianno",indirizzo:"Via Carducci",tipologia:"Villa",dataInizio:"2025-09-01",scadenza:"2026-02-28",prezzoRichiesto:310000,prezzoReale:290000,provvPrevista:9300,note:"",stato:"Attivo",archiviato:false,storicoRibassi:[]},
  {id:4,categoria:"affitto",agenteListing:2,percListing:40,buyerListing:null,percBuyerListing:0,fonte:"Privati",nominativo:"Rossi Mario",comune:"Varese",indirizzo:"Via Roma 10",tipologia:"Bilocale",dataInizio:"2025-10-01",scadenza:"2026-04-01",prezzoRichiesto:800,prezzoReale:750,provvPrevista:750,note:"",stato:"Attivo",archiviato:false,storicoRibassi:[]},
];
const INIT_PROPOSTE = [
  {id:1,categoria:"vendita",tipo:"da_incarico",incaricoId:1,agenteListing:1,percListing:0,buyerListing:3,percBuyerListing:10,comuneImmobile:"Barasso",indirizzoImmobile:"Via Cassini 1",tipologia:"Villa",nominativoVenditore:"Tresoldi - Caretti",agenziaEsterna:null,agenteAcquirente:1,percAcquirente:0,buyer:3,percBuyer:20,nomeAcquirente:"Armellini",prezzoOfferto:180000,vincolata:false,tipoVincolo:"",termineSubordine:"",scadenzaProposta:"2025-12-20",provvVenditore:5400,percProvvAcquirente:4,provvAcquirente:7200,stato:"Accettata",noteStato:"",dataStato:"2025-12-10",dataVendita:"2025-12-10",dataAccettazione:"2025-12-10",storico:[],controproposte:[]},
  {id:2,categoria:"vendita",tipo:"da_incarico",incaricoId:3,agenteListing:1,percListing:0,buyerListing:null,percBuyerListing:0,comuneImmobile:"Gazzada Schianno",indirizzoImmobile:"Via Carducci",tipologia:"Villa",nominativoVenditore:"Scala Domenico",agenziaEsterna:null,agenteAcquirente:2,percAcquirente:40,buyer:null,percBuyer:0,nomeAcquirente:"Roncari Leonardo",prezzoOfferto:270000,vincolata:true,tipoVincolo:"Mutuo",termineSubordine:"2026-05-01",scadenzaProposta:"2026-03-15",provvVenditore:1640,percProvvAcquirente:3,provvAcquirente:8000,stato:"In attesa / Vincolata",noteStato:"",dataStato:"2026-02-10",dataVendita:"",dataAccettazione:"",storico:[],controproposte:[]},
];
const INIT_VENDUTI = [
  {id:1,categoria:"vendita",propostaId:1,incaricoId:1,comuneImmobile:"Barasso",indirizzoImmobile:"Via Cassini 1",tipologia:"Villa",nominativoVenditore:"Tresoldi - Caretti",nomeAcquirente:"Armellini",agenteListing:1,percListing:0,buyerListing:3,percBuyerListing:10,agenteAcquirente:1,percAcquirente:0,buyer:3,percBuyer:20,prezzoVendita:180000,provvVenditore:5400,provvAcquirente:7200,tipoAtto:"Preliminare",dataAtto:"2026-01-05",dataVendita:"2025-12-10",acc1V:5400,dataAcc1V:"2026-01-05",noteAcc1V:"Acconto firma preliminare",acc2V:0,dataAcc2V:"",noteAcc2V:"",saldoV:0,dataSaldoV:"",noteSaldoV:"",acc1A:3600,dataAcc1A:"2026-01-05",noteAcc1A:"Acconto firma preliminare",acc2A:0,dataAcc2A:"",noteAcc2A:"",saldoA:0,dataSaldoA:"",noteSaldoA:"",scadenzaIncasso:"2026-06-30",agenziaEsterna:null,note:"",bloccato:false,dataCompetenzaAgente:"",competenzaAgenteDiversa:false},
];

const calcolaIncassatoV = v => Number(v.acc1V||0)+Number(v.acc2V||0)+Number(v.saldoV||0);
const calcolaIncassatoA = v => Number(v.acc1A||0)+Number(v.acc2A||0)+Number(v.saldoA||0);
const calcolaStatoIncasso = v => { const t=Number(v.provvVenditore||0)+Number(v.provvAcquirente||0); const i=calcolaIncassatoV(v)+calcolaIncassatoA(v); if(i===0)return"Da incassare"; if(i>=t)return"Incassato"; return"Parziale"; };
const calcolaQuotaAgente = (v,agId) => { let q=0; if(v.agenteListing===agId)q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100; if(v.agenteAcquirente===agId)q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100; if(v.buyerListing===agId&&v.agenteListing!==agId)q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100; if(v.buyer===agId&&v.agenteAcquirente!==agId)q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100; return q; };

// Estrae TUTTI i pagamenti dai venduti (acc1V, acc2V, saldoV, acc1A, acc2A, saldoA) come array di righe ordinabile per data
const estraiPagamenti = (vendutiArr) => {
  const out = [];
  vendutiArr.forEach(v => {
    ["V","A"].forEach(lato => {
      ["acc1","acc2","saldo"].forEach(k => {
        const importo = Number(v[`${k}${lato}`]||0);
        const data = v[`data${k.charAt(0).toUpperCase()+k.slice(1)}${lato}`] || v[`data${k[0].toUpperCase()+k.slice(1)}${lato}`];
        // Le date sono "dataAcc1V", "dataAcc2V", "dataSaldoV", "dataAcc1A", "dataAcc2A", "dataSaldoA"
        const dataField = `data${k.charAt(0).toUpperCase()+k.slice(1)}${lato}`;
        const dataReal = v[dataField] || "";
        const noteField = `note${k.charAt(0).toUpperCase()+k.slice(1)}${lato}`;
        const noteReal = v[noteField] || "";
        if(importo>0 && dataReal){
          // Quota agenzia su questa rata: importo × (1 - somma delle % degli agenti su quel lato)
          const provLato = lato==="V" ? Number(v.provvVenditore||0) : Number(v.provvAcquirente||0);
          let percAgenti = 0;
          if(lato==="V"){
            if(v.agenteListing) percAgenti += Number(v.percListing||0);
            if(v.buyerListing && v.buyerListing!==v.agenteListing) percAgenti += Number(v.percBuyerListing||0);
          } else {
            if(v.agenteAcquirente) percAgenti += Number(v.percAcquirente||0);
            if(v.buyer && v.buyer!==v.agenteAcquirente) percAgenti += Number(v.percBuyer||0);
          }
          const quotaAg = importo * (1 - percAgenti/100);
          out.push({
            venduto: v,
            data: dataReal,
            lato,
            tipo: k, // acc1, acc2, saldo
            importo,
            quotaAg: Math.max(0, quotaAg),
            note: noteReal
          });
        }
      });
    });
  });
  return out.sort((a,b)=>(b.data||"").localeCompare(a.data||""));
};

// === SCONTI: provvigione teorica vs reale ===
// Calcola la provvigione TEORICA per un lato (venditore o acquirente) secondo la regola:
//   - prezzo <= soglia: MAX(% standard * prezzo, minimo garantito)
//   - prezzo > soglia: solo % standard * prezzo (minimo non si applica)
// lato: "vend" | "acq"
const calcProvvTeorica = (prezzo, lato, provvStandard) => {
  const ps = provvStandard||{percVend:3,percAcq:4,soglia:120000,minVend:3500,minAcq:4000};
  const p = Number(prezzo||0);
  if(p<=0) return 0;
  const perc = lato==="vend" ? Number(ps.percVend||0) : Number(ps.percAcq||0);
  const minimo = lato==="vend" ? Number(ps.minVend||0) : Number(ps.minAcq||0);
  const soglia = Number(ps.soglia||120000);
  const teoricaPerc = p * perc / 100;
  if(p<=soglia) return Math.max(teoricaPerc, minimo);
  return teoricaPerc;
};
// Calcola lo sconto su un lato: teorica - reale (mai negativo per i conteggi sconto)
const calcScontoLato = (prezzo, provvReale, lato, provvStandard) => {
  const teorica = calcProvvTeorica(prezzo, lato, provvStandard);
  const reale = Number(provvReale||0);
  const sconto = teorica - reale;
  return { teorica, reale, sconto, percSconto: teorica>0 ? sconto/teorica*100 : 0 };
};

const VOCI_COSTO = [
  {voce:"Locazione Ufficio",tipo:"fisso"},{voce:"Spese Condominiali",tipo:"fisso"},{voce:"Utenza Elettricita",tipo:"fisso"},
  {voce:"Utenza GAS",tipo:"fisso"},{voce:"Telefonia Fissa",tipo:"fisso"},{voce:"Telefonia Cellulare",tipo:"fisso"},
  {voce:"Pulizie",tipo:"fisso"},{voce:"Assicurazione Ufficio",tipo:"fisso"},{voce:"Imposte Pubblicitarie",tipo:"fisso"},
  {voce:"Ufficio Multifunzione Canone",tipo:"fisso"},{voce:"Commercialista SRL",tipo:"fisso"},
  {voce:"Consulente Paghe",tipo:"fisso"},{voce:"Compenso Amministratore",tipo:"fisso"},
  {voce:"Stipendio Erica Guglielmana",tipo:"fisso"},{voce:"Stipendi x collaborazioni",tipo:"fisso"},
  {voce:"Tasse / Contributi x Dipendenti",tipo:"fisso"},{voce:"Immobiliare.it",tipo:"fisso"},
  {voce:"Idealista.it & Casa.it",tipo:"fisso"},{voce:"Sponsorizzazioni Squadre",tipo:"fisso"},
  {voce:"Gestim + Sito e Hosting",tipo:"fisso"},{voce:"Software - Servizi Professionali",tipo:"fisso"},
  {voce:"FIAIP",tipo:"fisso"},{voce:"Assicurazioni Professionali",tipo:"fisso"},
  {voce:"Altre Assicurazioni",tipo:"fisso"},{voce:"Agente Strategico Abbonamento",tipo:"fisso"},
];
const mkCosti = () => VOCI_COSTO.map((v,i)=>({id:i+1,voce:v.voce,tipo:v.tipo||"fisso",prevMensile:0,frequenza:"mensile",spese:[]}));
const MESI_KEYS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const mesiNomi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const totSpeseVoce = voce => {
  const proprie=(voce.spese||[]).reduce((s,x)=>s+Number(x.importo||0),0);
  const sub=(voce.subVoci||[]).reduce((s,sv)=>s+(sv.spese||[]).reduce((a,x)=>a+Number(x.importo||0),0),0);
  return proprie+sub;
};
const freqMultiplier = f => ({mensile:12,trimestrale:4,semestrale:2,annuale:1}[f]||12);
const prevAnnuoVoce = voce => {
  if((voce.subVoci||[]).length>0)
    return (voce.subVoci||[]).reduce((s,sv)=>s+Number(sv.prevMensile||0)*freqMultiplier(sv.frequenza||"mensile"),0);
  return Number(voce.prevMensile||0)*freqMultiplier(voce.frequenza||"mensile");
};
const FREQ_LABELS = {mensile:"Mensile ×12",trimestrale:"Trimestrale ×4",semestrale:"Semestrale ×2",annuale:"Annuale ×1"};

// Proposte che bloccano nuove proposte sullo stesso incarico
const STATI_BLOCCANTI = ["In attesa","Controproposta","In attesa / Vincolata","Accettata con Vincolo"];

function LoginPage({onLogin}) {
  const [em,setEm]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [load,setLoad]=useState(false);
  const go=async()=>{
    setErr(""); setLoad(true);
    const emTrim = em.trim().toLowerCase();

    let auth;
    try { auth = await autentica(emTrim, pw); }
    catch { setErr("Email o password non corretti."); setLoad(false); return; }

    const sess = impacchettaSessione(auth);
    salvaSessione(sess);
    TOKEN_ATTIVO = sess.token;

    let data = null;
    try { data = await caricaDB(); }
    catch { setErr("Errore di connessione."); setLoad(false); return; }

    const ag = trovaAgentePerEmail(data, emTrim);
    if(!ag){
      cancellaSessione();
      setErr("Nessuna scheda agente collegata a questa email. Avvisa il broker.");
      setLoad(false); return;
    }
    if(ag.attivo===false){
      cancellaSessione();
      setErr("Account disabilitato. Contatta il responsabile.");
      setLoad(false); return;
    }
    onLogin(utenteDaAgente(ag));
  };
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
        <div style={{fontSize:64,fontWeight:700,color:"#fff",fontFamily:"Georgia,serif",lineHeight:1}}>càsa</div>
        <div style={{width:180,height:1,background:"rgba(255,255,255,0.6)",margin:"10px auto 8px"}}/>
        <div style={{fontSize:14,letterSpacing:"0.35em",color:"rgba(255,255,255,0.9)"}}>IMMOBILIARE</div>
      </div>
      <div style={{background:"#fff",borderRadius:16,padding:"2rem 2.5rem",width:"min(90vw,380px)",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <h2 style={{fontSize:18,fontWeight:500,color:BRAND.grigio,margin:"0 0 1.5rem",textAlign:"center"}}>Accedi al gestionale</h2>
        <div style={{marginBottom:12}}><label style={{fontSize:12,color:"#999",display:"block",marginBottom:4}}>Email</label><input style={{width:"100%",fontSize:14,padding:"10px 12px",borderRadius:8,border:"1.5px solid #ddd",boxSizing:"border-box",outline:"none"}} type="email" value={em} onChange={e=>{setEm(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
        <div style={{marginBottom:err?8:20}}><label style={{fontSize:12,color:"#999",display:"block",marginBottom:4}}>Password</label><input style={{width:"100%",fontSize:14,padding:"10px 12px",borderRadius:8,border:"1.5px solid #ddd",boxSizing:"border-box",outline:"none"}} type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
        {err&&<p style={{fontSize:12,color:"#e74c3c",margin:"0 0 16px",textAlign:"center"}}>{err}</p>}
        <button onClick={go} style={{width:"100%",padding:"12px",fontSize:15,fontWeight:600,borderRadius:8,border:"none",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,color:"#fff",cursor:"pointer"}}>{load?"Accesso...":"Accedi"}</button>
      </div>
      <p style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:"2rem"}}>© {new Date().getFullYear()} Càsa Immobiliare — Varese</p>
    </div>
  );
}

function Sidebar({tab,setTab,utente,onEsporta,onImporta,importRef}) {
  const isBroker = utente?.ruolo==="Broker";
  const isBackOffice = utente?.ruolo==="BackOffice";
  const isCoach = utente?.ruolo==="Coach";
  const isCollab = utente?.profilo==="Collaborazione Agenzia";
  const coachIsAgenzia = isCoach&&(!utente?.coachTarget||utente.coachTarget==="agenzia");
  const coachAgentId = isCoach&&!coachIsAgenzia?Number(utente?.coachTarget):null;
  const canViewAll = isBroker||isBackOffice||(isCoach&&coachIsAgenzia);
  const isReadOnly = isCoach;
  const isProductivo = !isBackOffice&&!isCoach&&!isCollab;
  const canEditPratiche = isBroker||isBackOffice||(utente?.agentId===5);
  const TAB_AGENTE = ["Dashboard","Operatività","Notizie","Gestione Pratiche","Incarichi","Proposte","Venduti","Il mio report","Statistiche","Costi","Break Even","War Room","One-to-One","Fatture Agente","Guida"];
  const TAB_COACH=coachIsAgenzia
    ?TAB_CONFIG.map(t=>t.id).filter(id=>id!=="Il mio report"&&id!=="Fatture Agente"&&id!=="Agenti")
    :["Dashboard","Operatività","Notizie","Gestione Pratiche","Incarichi","Proposte","Venduti","Il mio report","Statistiche","Costi","Break Even","War Room","One-to-One","Fatture Agente","Guida"];
  const TAB_BACKOFFICE=TAB_CONFIG.map(t=>t.id).filter(id=>id!=="Operatività");
  // App Operatività standalone: solo le tab di lavoro quotidiano
  const TAB_APP_OPERATIVITA = ["Operatività","Notizie"];
  const tabsVisibili = TAB_CONFIG.filter(t=>TAB_APP_OPERATIVITA.includes(t.id));
  return (
    <div style={{width:220,minWidth:220,background:"#2C2C2C",display:"flex",flexDirection:"column",height:"100vh",position:"sticky",top:0,flexShrink:0}}>
      <div style={{padding:"1.5rem 1.25rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{fontSize:28,fontWeight:700,color:"#fff",fontFamily:"Georgia,serif"}}>c<span style={{color:BRAND.oro}}>à</span>sa</div>
        <div style={{fontSize:8,letterSpacing:"0.3em",color:"rgba(255,255,255,0.4)",borderTop:"1px solid rgba(255,255,255,0.2)",paddingTop:3,marginTop:3}}>IMMOBILIARE</div>
        <div style={{marginTop:8,fontSize:11,color:"rgba(255,255,255,0.35)"}}>{isBroker?"Broker":isBackOffice?"Back Office":isCoach?(coachIsAgenzia?"Coach Agenzia 👁":"Coach Agente 👁"):isCollab?"Collaborazione":"Agente"}</div>
      </div>
      <nav style={{flex:1,padding:"0.75rem 0",overflowY:"auto"}}>
        {tabsVisibili.map(t=>{
          const active=tab===t.id;
          return(<button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 1.25rem",background:active?`${BRAND.oro}22`:"transparent",border:"none",borderLeft:active?`3px solid ${BRAND.oro}`:"3px solid transparent",color:active?BRAND.oro:"rgba(255,255,255,0.55)",fontSize:13,fontWeight:active?600:400,cursor:"pointer",textAlign:"left"}}
            onMouseEnter={e=>{if(!active){e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="rgba(255,255,255,0.85)";}}}
            onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.55)";}}}
          ><span style={{fontSize:15,width:18,textAlign:"center",flexShrink:0}}>{t.icon}</span><span>{t.label}</span></button>);
        })}
      </nav>
      <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",margin:"0 1.25rem"}}/>
      <div style={{padding:"0.75rem 1rem"}}>
        {isBroker&&<>
          <button onClick={onEsporta} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",background:"transparent",border:`1px solid rgba(201,169,110,0.4)`,borderRadius:6,color:BRAND.oro,fontSize:12,cursor:"pointer",marginBottom:6}}>⬇ Esporta dati</button>
          <button onClick={()=>importRef.current.click()} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",background:"transparent",border:"1px solid rgba(255,255,255,0.12)",borderRadius:6,color:"rgba(255,255,255,0.45)",fontSize:12,cursor:"pointer"}}>⬆ Importa dati</button>
          <input ref={importRef} type="file" accept=".json" style={{display:"none"}} onChange={onImporta}/>
        </>}
      </div>
      <div style={{padding:"1rem 1.25rem",borderTop:"1px solid rgba(255,255,255,0.08)",background:"rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>{utente?.nome?.charAt(0)||"?"}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.85)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{utente?.nome}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{utente?.ruolo}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal scheda incarico venduto
function SchedaIncaricoVenduto({incarico, venduto, proposta, agenti, onClose}) {
  const nomAg = id => { const a=agenti.find(a=>a.id===Number(id)); return a?`${a.nome} ${a.cognome}`:"—"; };
  const giorni = diffGiorni(incarico.dataInizio, venduto?.dataVendita||venduto?.dataAtto);
  const diffPerc = incarico.prezzoRichiesto&&venduto?.prezzoVendita ? ((incarico.prezzoRichiesto-venduto.prezzoVendita)/incarico.prezzoRichiesto*100).toFixed(1) : null;
  const S2 = {
    row:{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"0.5px solid #f0f0f0",fontSize:13},
    lbl:{color:"#888",fontWeight:400},
    val:{fontWeight:500,color:BRAND.grigio},
    sec:{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.08em",margin:"16px 0 6px"},
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{background:"#fff",borderRadius:12,padding:"1.5rem",width:"min(96vw,620px)",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem"}}>
          <div>
            <h2 style={{fontSize:17,fontWeight:600,margin:"0 0 3px",color:BRAND.grigio}}>Scheda Venduto</h2>
            <p style={{fontSize:13,color:"#aaa",margin:0}}>{incarico.comune} — {incarico.indirizzo}</p>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#ccc",padding:0}}>✕</button>
        </div>
        <div style={{background:BRAND.beige,borderRadius:10,padding:"1rem"}}>
          <p style={S2.sec}>Immobile</p>
          <div style={S2.row}><span style={S2.lbl}>Indirizzo</span><span style={S2.val}>{incarico.comune} — {incarico.indirizzo}</span></div>
          <div style={S2.row}><span style={S2.lbl}>Tipologia</span><span style={S2.val}>{incarico.tipologia}</span></div>
          <div style={S2.row}><span style={S2.lbl}>Nominativo venditore</span><span style={S2.val}>{incarico.nominativo}</span></div>
          <div style={S2.row}><span style={S2.lbl}>Nominativo acquirente</span><span style={S2.val}>{venduto?.nomeAcquirente||"—"}</span></div>

          <p style={S2.sec}>Tempi</p>
          <div style={S2.row}><span style={S2.lbl}>Data inizio incarico</span><span style={S2.val}>{fmtD(incarico.dataInizio)}</span></div>
          {proposta?.dataStato&&<div style={S2.row}><span style={S2.lbl}>Data proposta</span><span style={S2.val}>{fmtD(proposta.dataStato)}</span></div>}
          {proposta?.vincolata&&proposta?.termineSubordine&&<div style={S2.row}><span style={S2.lbl}>Termine vincolo</span><span style={{...S2.val,color:"#D4AC0D"}}>{fmtD(proposta.termineSubordine)} ({proposta.tipoVincolo||"Vincolo"})</span></div>}
          {proposta?.dataAccettazione&&<div style={S2.row}><span style={S2.lbl}>Data accettazione</span><span style={{...S2.val,color:"#27AE60"}}>{fmtD(proposta.dataAccettazione)}</span></div>}
          {venduto?.dataAtto&&<div style={S2.row}><span style={S2.lbl}>Data {venduto?.tipoAtto||"Preliminare"}</span><span style={S2.val}>{fmtD(venduto.dataAtto)}</span></div>}
          <div style={S2.row}><span style={S2.lbl}>Data vendita</span><span style={S2.val}>{fmtD(venduto?.dataVendita||venduto?.dataAtto)}</span></div>
          <div style={S2.row}><span style={S2.lbl}>Giorni per vendere</span><span style={{...S2.val,color:BRAND.oro}}>{giorni!=null?`${giorni} giorni`:"—"}</span></div>

          <p style={S2.sec}>Prezzi</p>
          <div style={S2.row}><span style={S2.lbl}>Prezzo incarico</span><span style={S2.val}>€ {fmtN(incarico.prezzoRichiesto)}</span></div>
          {(incarico.storicoRibassi||[]).length>0&&(<>
            <div style={{padding:"6px 0",borderBottom:"0.5px solid #f0f0f0"}}><span style={{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.06em"}}>Storico ribassi</span></div>
            {(incarico.storicoRibassi||[]).map((r,i)=>(
              <div key={i} style={S2.row}>
                <span style={S2.lbl}>{fmtD(r.data)}{r.note?` — ${r.note}`:""}</span>
                <span style={{...S2.val,color:BRAND.oroD}}>€ {fmtN(r.prezzo)}</span>
              </div>
            ))}
          </>)}
          <div style={S2.row}><span style={S2.lbl}>Prezzo vendita</span><span style={S2.val}>€ {fmtN(venduto?.prezzoVendita)}</span></div>
          <div style={S2.row}><span style={S2.lbl}>Differenza %</span><span style={{...S2.val,color:diffPerc>5?"#E74C3C":"#27AE60"}}>{diffPerc?`-${diffPerc}%`:"—"}</span></div>

          <p style={S2.sec}>Provvigioni</p>
          <div style={S2.row}><span style={S2.lbl}>Provv. Venditore</span><span style={S2.val}>€ {fmt(venduto?.provvVenditore)}</span></div>
          <div style={S2.row}><span style={S2.lbl}>Provv. Acquirente</span><span style={S2.val}>€ {fmt(venduto?.provvAcquirente)}</span></div>

          <p style={S2.sec}>Agenti</p>
          <div style={S2.row}><span style={S2.lbl}>Agente Listing ({incarico.percListing}%)</span><span style={S2.val}>{nomAg(incarico.agenteListing)}</span></div>
          {incarico.buyerListing&&<div style={S2.row}><span style={S2.lbl}>Buyer Listing ({incarico.percBuyerListing}%)</span><span style={S2.val}>{nomAg(incarico.buyerListing)}</span></div>}
          {venduto?.agenteAcquirente&&<div style={S2.row}><span style={S2.lbl}>Agente Acquirente ({venduto.percAcquirente}%)</span><span style={S2.val}>{nomAg(venduto.agenteAcquirente)}</span></div>}
          {venduto?.buyer&&<div style={S2.row}><span style={S2.lbl}>Buyer ({venduto.percBuyer}%)</span><span style={S2.val}>{nomAg(venduto.buyer)}</span></div>}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:"1rem"}}>
          <button onClick={onClose} style={{padding:"7px 18px",fontSize:13,borderRadius:6,border:`1px solid ${BRAND.oro}`,background:BRAND.oro,color:"#fff",cursor:"pointer",fontWeight:500}}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}

function ModalIncassoLato({vend,lato,onSave,onClose}) {
  const isV=lato==="V"; const provv=isV?Number(vend.provvVenditore||0):Number(vend.provvAcquirente||0); const nominativo=isV?vend.nominativoVenditore:vend.nomeAcquirente;
  const [form,setForm]=useState({acc1:Number(vend[`acc1${lato}`]||0),dataAcc1:vend[`dataAcc1${lato}`]||"",noteAcc1:vend[`noteAcc1${lato}`]||"",acc2:Number(vend[`acc2${lato}`]||0),dataAcc2:vend[`dataAcc2${lato}`]||"",noteAcc2:vend[`noteAcc2${lato}`]||"",saldo:Number(vend[`saldo${lato}`]||0),dataSaldo:vend[`dataSaldo${lato}`]||"",noteSaldo:vend[`noteSaldo${lato}`]||"",scadenzaIncasso:vend.scadenzaIncasso||""});
  const tot=Number(form.acc1||0)+Number(form.acc2||0)+Number(form.saldo||0); const res=provv-tot;
  const Si={lbl:{fontSize:12,color:"#999",display:"block",marginBottom:3},inp:{width:"100%",fontSize:13,padding:"7px 9px",borderRadius:6,border:"0.5px solid #ccc",background:"#fff",color:BRAND.grigio,boxSizing:"border-box"},secBox:{background:BRAND.beige,borderRadius:8,padding:"12px 14px",marginBottom:10},r3:{display:"grid",gridTemplateColumns:"120px 1fr 1fr",gap:8}};
  const save=()=>{const u={...vend,[`acc1${lato}`]:Number(form.acc1||0),[`dataAcc1${lato}`]:form.dataAcc1,[`noteAcc1${lato}`]:form.noteAcc1,[`acc2${lato}`]:Number(form.acc2||0),[`dataAcc2${lato}`]:form.dataAcc2,[`noteAcc2${lato}`]:form.noteAcc2,[`saldo${lato}`]:Number(form.saldo||0),[`dataSaldo${lato}`]:form.dataSaldo,[`noteSaldo${lato}`]:form.noteSaldo,scadenzaIncasso:form.scadenzaIncasso};u.incassatoVenditore=calcolaIncassatoV(u);u.incassatoAcquirente=calcolaIncassatoA(u);u.statoIncasso=calcolaStatoIncasso(u);onSave(u);};
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
    <div style={{background:"#fff",borderRadius:12,padding:"1.5rem",width:"min(96vw,560px)",maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem"}}>
        <div><h2 style={{fontSize:16,fontWeight:600,margin:"0 0 2px",color:BRAND.grigio}}>Incasso {isV?"Venditore":"Acquirente"}</h2><p style={{fontSize:13,color:"#aaa",margin:0}}>{vend.comuneImmobile} — {nominativo}</p></div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#ccc",padding:0}}>✕</button>
      </div>
      <div style={{background:`${BRAND.oro}18`,border:`1px solid ${BRAND.oro}44`,borderRadius:8,padding:"10px 14px",marginBottom:"1rem",display:"flex",justifyContent:"space-between",gap:8}}>
        <span style={{fontSize:13}}>Provvigione: <strong style={{color:BRAND.oroD}}>€ {fmt(provv)}</strong></span>
        <span style={{fontSize:13,fontWeight:600,color:res>0?"#E67E22":res===0?"#27AE60":"#E74C3C"}}>{res>0?`Residuo: € ${fmt(res)}`:res===0?"Saldato":"Eccesso"}</span>
      </div>
      {[["Acconto 1","acc1","dataAcc1","noteAcc1",Si.secBox],["Acconto 2","acc2","dataAcc2","noteAcc2",Si.secBox],["Saldo","saldo","dataSaldo","noteSaldo",{...Si.secBox,background:"#E9F7EF"}]].map(([title,fA,fD,fN,bs])=>(
        <div key={title} style={bs}>
          <p style={{fontSize:12,fontWeight:600,color:title==="Saldo"?"#27AE60":BRAND.oroD,textTransform:"uppercase",margin:"0 0 8px"}}>{title}</p>
          <div style={Si.r3}>
            <div><label style={Si.lbl}>Importo (€)</label><input style={Si.inp} type="number" value={form[fA]||""} onChange={e=>setForm({...form,[fA]:e.target.value})} placeholder="0"/></div>
            <div><label style={Si.lbl}>Data</label><input style={Si.inp} type="date" value={form[fD]} onChange={e=>setForm({...form,[fD]:e.target.value})}/></div>
            <div><label style={Si.lbl}>Nota</label><input style={Si.inp} value={form[fN]} onChange={e=>setForm({...form,[fN]:e.target.value})}/></div>
          </div>
        </div>
      ))}
      <div style={{marginBottom:"1rem"}}><label style={Si.lbl}>Scadenza incasso</label><input style={{...Si.inp,maxWidth:200}} type="date" value={form.scadenzaIncasso} onChange={e=>setForm({...form,scadenzaIncasso:e.target.value})}/></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"7px 14px",fontSize:13,borderRadius:6,border:"0.5px solid #ccc",background:"#fff",cursor:"pointer"}}>Annulla</button>
        <button onClick={save} style={{padding:"7px 14px",fontSize:13,borderRadius:6,border:`1px solid ${BRAND.oro}`,background:BRAND.oro,cursor:"pointer",color:"#fff",fontWeight:500}}>Salva</button>
      </div>
    </div>
  </div>);
}

function SchedaAgente({agente,venduti,incarichi,prospetti,onClose}) {
  const [fA,setFA]=useState(annoCorrente); const [fM,setFM]=useState("Tutti");
  const [showTabella,setShowTabella]=useState(true);
  const anni=useMemo(()=>Array.from(new Set(venduti.map(v=>getAnno(v.dataVendita||v.dataAtto||"")).filter(Boolean))).sort().reverse(),[venduti]);
  const mesi=useMemo(()=>Array.from(new Set(venduti.filter(v=>fA==="Tutti"||getAnno(v.dataVendita||v.dataAtto||"")===fA).map(v=>getMese(v.dataVendita||v.dataAtto||"")).filter(Boolean))).sort().reverse(),[venduti,fA]);
  const prat=useMemo(()=>venduti.filter(v=>{
    const c=v.agenteListing===agente.id||v.agenteAcquirente===agente.id||v.buyerListing===agente.id||v.buyer===agente.id;
    if(!c)return false;
    if(fA!=="Tutti"&&getAnno(v.dataVendita||v.dataAtto||"")!==fA)return false;
    if(fM!=="Tutti"&&getMese(v.dataVendita||v.dataAtto||"")!==fM)return false;
    return true;
  }),[venduti,agente,fA,fM]);
  const incAcquisiti=incarichi.filter(i=>i.agenteListing===agente.id&&!i.archiviato&&(fA==="Tutti"||getAnno(i.dataInizio)===fA)).length;
  // Transazioni: V = listing con provv>0, A = acquirente con provv>0
  const nTransV=prat.filter(v=>v.agenteListing===agente.id&&Number(v.provvVenditore||0)>0&&!v.agenziaEsterna).length;
  const nTransA=prat.filter(v=>v.agenteAcquirente===agente.id&&Number(v.provvAcquirente||0)>0).length;
  // Produzione agente = provv agenzia dove è Listing o Acquirente
  const totP=prat.reduce((s,v)=>{let p=0;if(v.agenteListing===agente.id)p+=Number(v.provvVenditore||0);if(v.agenteAcquirente===agente.id)p+=Number(v.provvAcquirente||0);return s+p;},0);
  const totI=prat.reduce((s,v)=>{let t=0;if(v.agenteListing===agente.id)t+=calcolaIncassatoV(v);if(v.agenteAcquirente===agente.id)t+=calcolaIncassatoA(v);return s+t;},0);
  // Quota Agente (solo Listing/Acquirente)
  const totQ=prat.reduce((s,v)=>{let q=0;if(v.agenteListing===agente.id)q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;if(v.agenteAcquirente===agente.id)q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;return s+q;},0);
  // Quota Buyer (solo Buyer L / Buyer)
  const totQBuy=prat.reduce((s,v)=>{let q=0;if(v.buyerListing===agente.id&&v.agenteListing!==agente.id)q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;if(v.buyer===agente.id&&v.agenteAcquirente!==agente.id)q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;return s+q;},0);
  const totQTot=totQ+totQBuy;
  const Ss={th:{textAlign:"left",padding:"8px 12px",borderBottom:"0.5px solid #eee",color:"#999",fontWeight:500,fontSize:12,background:"#fafaf8"},td:{padding:"8px 12px",borderBottom:"0.5px solid #f5f5f5",verticalAlign:"middle",fontSize:13},tdR:{padding:"8px 12px",borderBottom:"0.5px solid #f5f5f5",verticalAlign:"middle",textAlign:"right",fontSize:13},sel:{fontSize:13,padding:"5px 8px",borderRadius:6,border:"0.5px solid #ccc",background:"#fff",color:BRAND.grigio}};
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
    <div style={{background:"#fff",borderRadius:12,padding:"1.5rem",width:"min(96vw,900px)",maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#fff"}}>{agente.nome.charAt(0)}</div>
          <div>
            <h2 style={{fontSize:18,fontWeight:600,margin:"0 0 4px",color:BRAND.grigio}}>{agente.nome} {agente.cognome}</h2>
            <span style={{fontSize:12,padding:"2px 8px",borderRadius:4,background:agente.profilo==="Broker"?`${BRAND.oro}22`:"#EAF4FB",color:agente.profilo==="Broker"?BRAND.oroD:"#2980B9",fontWeight:500}}>{agente.profilo}</span>
            {agente.profilo!=="Broker"&&<span style={{fontSize:12,color:"#aaa",marginLeft:10}}>Listing {agente.percListing}% · Acq. {agente.percAcquirente}%</span>}
          </div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#ccc",padding:0}}>✕</button>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:"1.25rem"}}>
        <select style={Ss.sel} value={fA} onChange={e=>{setFA(e.target.value);setFM("Tutti");}}><option value="Tutti">Tutti gli anni</option>{anni.map(a=><option key={a}>{a}</option>)}</select>
        <select style={Ss.sel} value={fM} onChange={e=>setFM(e.target.value)}><option value="Tutti">Tutti i mesi</option>{mesi.map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}</select>
      </div>
      {/* KPI */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr) repeat(3,1fr)",gap:10,marginBottom:"1.25rem"}}>
        <div style={{background:"#fff",borderRadius:8,border:"0.5px solid #e8e5e0",padding:"12px 14px",borderLeft:"3px solid #4A90D9"}}>
          <p style={{fontSize:11,color:"#888",margin:"0 0 3px"}}>Incarichi anno</p>
          <p style={{fontSize:18,fontWeight:600,margin:0,color:"#4A90D9"}}>{incAcquisiti}</p>
        </div>
        <div style={{background:"#fff",borderRadius:8,border:"0.5px solid #e8e5e0",padding:"12px 14px",borderLeft:`3px solid ${BRAND.oroD}`}}>
          <p style={{fontSize:11,color:"#888",margin:"0 0 3px"}}>N° Transazioni</p>
          <p style={{fontSize:18,fontWeight:600,margin:0,color:BRAND.oroD}}>{nTransV+nTransA}</p>
          <p style={{fontSize:10,color:"#aaa",margin:"3px 0 0"}}>{nTransV}V · {nTransA}A</p>
        </div>
        <div style={{background:"#fff",borderRadius:8,border:"0.5px solid #e8e5e0",padding:"12px 14px",borderLeft:"3px solid #27AE60"}}>
          <p style={{fontSize:11,color:"#888",margin:"0 0 3px"}}>Produzione Agente</p>
          <p style={{fontSize:18,fontWeight:600,margin:0,color:"#27AE60"}}>€ {fmt(totP)}</p>
          <p style={{fontSize:10,color:"#aaa",margin:"3px 0 0"}}>Listing+Acq.</p>
        </div>
        <div style={{background:"#fff",borderRadius:8,border:"0.5px solid #e8e5e0",padding:"12px 14px",borderLeft:"3px solid #E67E22"}}>
          <p style={{fontSize:11,color:"#888",margin:"0 0 3px"}}>Incassato</p>
          <p style={{fontSize:18,fontWeight:600,margin:0,color:"#E67E22"}}>€ {fmt(totI)}</p>
          <p style={{fontSize:10,color:"#aaa",margin:"3px 0 0"}}>Listing+Acq.</p>
        </div>
        <div style={{background:"#fff",borderRadius:8,border:"0.5px solid #e8e5e0",padding:"12px 14px",borderLeft:"3px solid #8E44AD"}}>
          <p style={{fontSize:11,color:"#888",margin:"0 0 3px"}}>Quota Agente + Buyer</p>
          <p style={{fontSize:18,fontWeight:600,margin:0,color:"#8E44AD"}}>€ {fmt(totQTot)}</p>
          <div style={{marginTop:4,fontSize:11,color:"#aaa"}}>
            {totQ>0&&<span style={{marginRight:8}}>Ag: € {fmt(totQ)}</span>}
            {totQBuy>0&&<span style={{color:"#2980B9"}}>Buyer: € {fmt(totQBuy)}</span>}
          </div>
        </div>
      </div>
      {/* Tabella collassabile */}
      <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden"}}>
        <div style={{padding:"10px 16px",background:"#fafaf8",borderBottom:"0.5px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setShowTabella(v=>!v)}>
          <span style={{fontSize:13,fontWeight:500,color:BRAND.grigio}}>Lista pratiche ({prat.length})</span>
          <button style={{background:"none",border:`0.5px solid #ddd`,borderRadius:6,padding:"3px 12px",fontSize:12,cursor:"pointer",color:BRAND.oroD}}>{showTabella?"▲ Nascondi":"▼ Mostra"}</button>
        </div>
        {showTabella&&(()=>{
          // Helper: stato pagamento agenzia→agente per (pratica, agente) basato sui prospetti
          // Considera TUTTI i ruoli dell'agente su quella pratica
          const calcStatoPag = (venditoId) => {
            if(!prospetti||prospetti.length===0) return {lbl:"Da fatturare",clr:"#BA7517",bg:"#FAEEDA",ic:"🧾"};
            // Cerco prospetti non annullati per questo agente che contengano questa pratica
            const prosp = prospetti.find(p=>
              p.agenteId===agente.id &&
              p.statoFlow!=="annullato" &&
              (p.righe||[]).some(r=>r.venditoId===venditoId)
            );
            if(!prosp) return {lbl:"Da fatturare",clr:"#BA7517",bg:"#FAEEDA",ic:"🧾"};
            if(prosp.statoFlow==="pagato") return {lbl:"Pagato",clr:"#0F6E56",bg:"#E1F5EE",ic:"✓",extra:prosp.numero};
            if(prosp.statoFlow==="fatturato") return {lbl:"Da pagare",clr:"#633806",bg:"#FAEEDA",ic:"⏳",extra:prosp.numero};
            return {lbl:"In prospetto",clr:"#0C447C",bg:"#E6F1FB",ic:"✉",extra:prosp.numero};
          };
        return(<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
          <thead><tr>{["Data","Immobile","Ruolo","Provv. Agenzia","Quota Agente","Quota Buyer","Stato cliente","Stato pagamento"].map(h=><th key={h} style={Ss.th}>{h}</th>)}</tr></thead>
          <tbody>
            {prat.map(v=>{
              const ruoli=[];
              if(v.agenteListing===agente.id)ruoli.push("Listing");if(v.agenteAcquirente===agente.id)ruoli.push("Acquirente");
              if(v.buyerListing===agente.id&&v.agenteListing!==agente.id)ruoli.push("Buyer L.");if(v.buyer===agente.id&&v.agenteAcquirente!==agente.id)ruoli.push("Buyer");
              const qAg=(()=>{let q=0;if(v.agenteListing===agente.id)q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;if(v.agenteAcquirente===agente.id)q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;return q;})();
              const qBuy=(()=>{let q=0;if(v.buyerListing===agente.id&&v.agenteListing!==agente.id)q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;if(v.buyer===agente.id&&v.agenteAcquirente!==agente.id)q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;return q;})();
              const provvAg=(()=>{let p=0;if(v.agenteListing===agente.id)p+=Number(v.provvVenditore||0);if(v.agenteAcquirente===agente.id)p+=Number(v.provvAcquirente||0);return p;})();
              const cfg=STATI_INCASSO[calcolaStatoIncasso(v)]||STATI_INCASSO["Da incassare"];
              const cfgPag=calcStatoPag(v.id);
              return(<tr key={v.id}>
                <td style={Ss.td}>{fmtD(v.dataVendita||v.dataAtto)}</td>
                <td style={Ss.td}><strong>{v.comuneImmobile}</strong> — {v.indirizzoImmobile}<br/><span style={{fontSize:11,color:"#aaa"}}>{v.tipologia}</span></td>
                <td style={Ss.td}>{ruoli.map(r=><span key={r} style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:"#EAF4FB",color:"#2980B9",marginRight:4,fontWeight:500}}>{r}</span>)}</td>
                <td style={{...Ss.tdR,color:"#aaa"}}>€ {fmt(Number(v.provvVenditore||0)+Number(v.provvAcquirente||0))}</td>
                <td style={{...Ss.tdR,fontWeight:600,color:"#8E44AD"}}>{qAg>0?`€ ${fmt(qAg)}`:"—"}</td>
                <td style={{...Ss.tdR,fontWeight:600,color:"#2980B9"}}>{qBuy>0?`€ ${fmt(qBuy)}`:"—"}</td>
                <td style={Ss.td}><span style={bdg(cfg)}>{calcolaStatoIncasso(v)}</span></td>
                <td style={Ss.td}><span style={{fontSize:11,padding:"3px 8px",borderRadius:4,background:cfgPag.bg,color:cfgPag.clr,fontWeight:600,whiteSpace:"nowrap"}}>{cfgPag.ic} {cfgPag.lbl}{cfgPag.extra?` ${cfgPag.extra}`:""}</span></td>
              </tr>);
            })}
            {prat.length===0&&<tr><td colSpan={8} style={{...Ss.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessuna pratica nel periodo</td></tr>}
          </tbody>
          {prat.length>0&&<tfoot><tr style={{background:"#F2F0EB",fontWeight:500}}>
            <td colSpan={3} style={Ss.td}>Totale</td>
            <td style={{...Ss.tdR,color:BRAND.oroD}}>€ {fmt(totP)}</td>
            <td style={{...Ss.tdR,color:"#8E44AD"}}>{totQ>0?`€ ${fmt(totQ)}`:"—"}</td>
            <td style={{...Ss.tdR,color:"#2980B9"}}>{totQBuy>0?`€ ${fmt(totQBuy)}`:"—"}</td>
            <td style={Ss.td}/>
            <td style={Ss.td}/>
          </tr></tfoot>}
        </table></div>);
        })()}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:"1rem"}}>
        <button onClick={onClose} style={{padding:"7px 18px",fontSize:13,borderRadius:6,border:`1px solid ${BRAND.oro}`,background:BRAND.oro,color:"#fff",cursor:"pointer",fontWeight:500}}>Chiudi</button>
      </div>
    </div>
  </div>);
}


// ── FASI GESTIONE PRATICHE (a livello modulo per accesso globale) ──
const FASI=[
  {k:"f1",n:"Incarico & documenti",fase:1,timing:"Giorno 0 · cartella a Erica entro 7 gg",azioni:[
    {k:"incFirmato",lbl:"Incarico mediazione firmato (UNAFIAIP)",ruolo:"agente"},
    {k:"docVenditore",lbl:"Documenti venditore ritirati (anagrafici, provenienza)",ruolo:"agente"},
    {k:"visuraCat",lbl:"Visura catastale storica",ruolo:"agente",alert:true},
    {k:"cartellaErica",lbl:"Cartella consegnata a Erica (entro 7 gg)",ruolo:"agente",alert:true},
  ]},
  {k:"f2",n:"Attivazione pratica",fase:2,timing:"Alla ricezione della cartella",azioni:[
    {k:"verificaDoc",lbl:"Verifica documenti + richiesta mancanti ai venditori",ruolo:"erica"},
    {k:"visuraIpo",lbl:"Ispezioni ipotecarie",ruolo:"erica",alert:true},
    {k:"archivioOneDrive",lbl:"Posizione Archivio + cartella OneDrive",ruolo:"erica"},
    {k:"gateFotografo",lbl:"Ipotecarie negative → sblocca fotografo",ruolo:"erica",alert:true},
  ]},
  {k:"f3",n:"Preparazione annuncio",fase:3,timing:"Due corsie",azioni:[
    {k:"precaricaGestim",lbl:"Precarica immobile su Gestim",ruolo:"agente"},
    {k:"fotografo",lbl:"Incarica fotografo",ruolo:"agente"},
    {k:"fotoTesto",lbl:"Carica foto + testo annuncio",ruolo:"agente"},
    {k:"okPubblica",lbl:"Ok alla pubblicazione",ruolo:"agente"},
    {k:"schedeGeom",lbl:"Schede rasterizzate dal geometra",ruolo:"erica"},
    {k:"schedeRender",lbl:"Schede arredate (TotaleRender)",ruolo:"erica"},
    {k:"pubblica",lbl:"Pubblica su sito + portali",ruolo:"erica"},
  ]},
  {k:"f4",n:"Open House & lancio",fase:4,timing:"Report al proprietario ogni 15 gg",azioni:[
    {k:"sceltaOH",lbl:"Scelta percorso: con / senza Open House",ruolo:"agente"},
    {k:"materiali",lbl:"Richiesta materiali (cartello, lettere, cartoline + quantità)",ruolo:"agente"},
    {k:"ica",lbl:"Richiesta ICA affissione cartello (se Varese)",ruolo:"erica"},
    {k:"prepMateriali",lbl:"Materiali preparati",ruolo:"erica"},
    {k:"ohEseguito",lbl:"Open House eseguito",ruolo:"agente"},
    {k:"feedback",lbl:"Feedback visitatori raccolti",ruolo:"agente"},
    {k:"report15",lbl:"Report al proprietario (a 15 gg)",ruolo:"agente",alert:true},
  ]},
  {k:"f5",n:"Trattativa & accettazione",fase:5,timing:"Lo stato cambia all'accettazione",azioni:[
    {k:"propRicevuta",lbl:"Proposta ricevuta e inserita",ruolo:"agente"},
    {k:"accettazione",lbl:"Accettazione (con/senza vincolo) registrata",ruolo:"agente",alert:true},
  ]},
  {k:"f6",n:"Preliminare",fase:6,timing:"= Venduto · provvigione maturata",azioni:[
    {k:"caparra",lbl:"Caparra consegnata/incassata al venditore",ruolo:"agente"},
    {k:"antiriciclaggio",lbl:"Antiriciclaggio acquirente",ruolo:"erica",alert:true},
    {k:"proforma",lbl:"Fatture pro forma predisposte",ruolo:"erica"},
    {k:"visurePrelim",lbl:"Visure ipotecarie aggiornate",ruolo:"erica",alert:true},
    {k:"agenda",lbl:"Agenda preliminare + conferma parti",ruolo:"agente"},
    {k:"copieAssegni",lbl:"Copia degli assegni",ruolo:"agente"},
    {k:"registrazione",lbl:"Registrazione preliminare",ruolo:"erica",alert:true},
  ]},
  {k:"f7",n:"Rogito & post",fase:7,timing:"Atto → Rogitato → archiviazione",azioni:[
    {k:"confronto",lbl:"Confronto Agente↔Erica pre-predisposizione",ruolo:"entrambi"},
    {k:"notaio",lbl:"Interfaccia notaio + invio documenti",ruolo:"erica",alert:true},
    {k:"conteggi",lbl:"Conteggi estintivi banche",ruolo:"erica"},
    {k:"cofanetto",lbl:"Cofanetto acquirente preparato",ruolo:"erica"},
    {k:"rogito",lbl:"Atto firmato (Rogitato)",ruolo:"entrambi"},
    {k:"recensione",lbl:"Recensione richiesta alle parti",ruolo:"erica"},
    {k:"archivia",lbl:"Archiviazione (OneDrive + cartaceo)",ruolo:"erica"},
  ]},
];

// Normalizza 'pratiche' a OGGETTO chiave=incaricoId, preservando le chiavi
// (recupera anche dati salvati come array o come oggetto "ibrido")
const normPratiche = (p) => {
  if(!p) return {};
  const out={};
  if(Array.isArray(p)){
    p.forEach((v,i)=>{ if(v&&typeof v==="object") out[v.incaricoId!=null?v.incaricoId:i]=v; });
    return out;
  }
  Object.entries(p).forEach(([k,v])=>{ if(v&&typeof v==="object") out[v.incaricoId!=null?v.incaricoId:k]=v; });
  return out;
};

const getAlertFasi = (pratiche, incId) => {
  const pr=(pratiche||{})[incId]||{fasi:{}};
  const al=[];
  FASI.forEach(f=>f.azioni.filter(a=>a.alert).forEach(a=>{
    if(!(pr.fasi[f.k]||{})[a.k]?.fatto) al.push({fase:f.n,lbl:a.lbl,ruolo:a.ruolo});
  }));
  return al;
};

const METRB_LABELS={acquisizioni:"🏠 Acquisizioni",fatturato:"💰 Fatturato",chiamate:"📞 Chiamate",chiamate_ci:"📞 C.Influenza",chiamate_cp:"📞 Clienti pass.",chiamate_freddo:"📞 Freddo",oh:"🚪 Open House",proposte:"📝 Proposte",appuntamenti:"🤝 Appuntamenti",immVisitati:"👁 Imm. visitati",postSocial:"📱 Post social"};
// EmailJS send function
const sendEmail = async (templateId, params) => {
  try {
    const res=await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE,
        template_id: templateId,
        user_id: EMAILJS_KEY,
        template_params: params
      })
    });
    return res.ok;
  } catch(e) { console.error("EmailJS error:", e); return false; }
};

export default function App() {
  const isMobile=useIsMobile();
  const [utente,setUtente]=useState(null);
  const [sessionePronta,setSessionePronta]=useState(false);
  const handleLogin=(u)=>{setUtente(u);};
  const handleLogout=()=>{
    const s=leggiSessione();
    cancellaSessione();
    setUtente(null);
    if(s&&s.token) chiudiSessioneServer(s.token);
  };
  // All'avvio riprende la sessione lasciata dall'Hub o da un'altra app.
  useEffect(()=>{
    let vivo=true;
    (async()=>{
      const s=await sessioneValida();
      if(!vivo) return;
      if(!s){ setSessionePronta(true); return; }
      try{
        const data=await caricaDB();
        const ag=trovaAgentePerEmail(data,s.email);
        if(!vivo) return;
        if(ag && ag.attivo!==false) setUtente(utenteDaAgente(ag));
        else cancellaSessione();
      }catch(e){}
      if(vivo) setSessionePronta(true);
    })();
    return()=>{ vivo=false; };
  },[]);
  // Funzione "Salva ora" — forza un salvataggio immediato bypassando il debounce.
  // Usata dal bottone "💾 Salva ora" in TAB Oggi come rete di sicurezza per evitare perdita dati.
  const salvaOraManualeRef = useRef(null);
  const salvaOraManuale = () => {
    if(salvaOraManualeRef.current) salvaOraManualeRef.current();
  };
  // Carica da localStorage se disponibile, altrimenti usa dati iniziali
  const _ls = caricaLS();
  // Default tab: gli agenti aprono direttamente "Operatività" (sub-tab Oggi); broker/back office/coach aprono "Dashboard"
  const _tabIniziale = "Operatività"; // App Operatività: tutti entrano direttamente qui
  const [tab,setTab]=useState(_tabIniziale);
  const [dbLoaded,setDbLoaded]=useState(false);
  const [dbSaving,setDbSaving]=useState(false);
  const [ultimoSalvataggio,setUltimoSalvataggio]=useState(null);
  const [agenti,setAgenti]=useState(_ls?.agenti||INIT_AGENTI);
  const [incarichi,setIncarichi]=useState(_ls?.incarichi||INIT_INCARICHI);
  const [proposte,setProposte]=useState(_ls?.proposte||INIT_PROPOSTE);
  const [venduti,setVenduti]=useState(_ls?.venduti||INIT_VENDUTI);
  const [archiviati,setArchiviati]=useState(_ls?.archiviati||[]);
  const [costi,setCosti]=useState(_ls?.costi||{[annoCorrente]:mkCosti()});
  const CAT_COSTI_DEFAULT=[
    {id:"lc1",nome:"Locazione Ufficio",totaleAnno:15000,tipo:"fisso",anno:2025},
    {id:"lc2",nome:"Spese Condominiali",totaleAnno:1018.85,tipo:"fisso",anno:2025},
    {id:"lc3",nome:"Utenza Elettricità",totaleAnno:1597.26,tipo:"fisso",anno:2025},
    {id:"lc4",nome:"Utenza GAS",totaleAnno:1279.96,tipo:"fisso",anno:2025},
    {id:"lc5",nome:"Telefonia Fissa",totaleAnno:1219.31,tipo:"fisso",anno:2025},
    {id:"lc6",nome:"Telefonia Cellulare",totaleAnno:2597,tipo:"fisso",anno:2025},
    {id:"lc7",nome:"Pulizie",totaleAnno:1320,tipo:"fisso",anno:2025},
    {id:"lc8",nome:"Imposte Pubblicitarie",totaleAnno:1415.2,tipo:"fisso",anno:2025},
    {id:"lc9",nome:"Multifunzione Canone",totaleAnno:1300.64,tipo:"fisso",anno:2025},
    {id:"lc10",nome:"Commercialista SRL",totaleAnno:8566.97,tipo:"fisso",anno:2025},
    {id:"lc11",nome:"Consulente Paghe",totaleAnno:647.92,tipo:"fisso",anno:2025},
    {id:"lc12",nome:"Compenso Amministratore",totaleAnno:30026,tipo:"fisso",anno:2025},
    {id:"lc13",nome:"Stipendio Erica Guglielmana",totaleAnno:16923,tipo:"fisso",anno:2025},
    {id:"lc14",nome:"Stipendi x collaborazioni",totaleAnno:3176.9,tipo:"fisso",anno:2025},
    {id:"lc15",nome:"Tasse / Contributi Dipendenti",totaleAnno:21579.91,tipo:"fisso",anno:2025},
    {id:"lc16",nome:"Immobiliare.it",totaleAnno:5730.03,tipo:"fisso",anno:2025},
    {id:"lc17",nome:"Idealista.it & Casa.it",totaleAnno:4411.9,tipo:"fisso",anno:2025},
    {id:"lc18",nome:"Sponsorizzazioni Squadre",totaleAnno:2015.29,tipo:"fisso",anno:2025},
    {id:"lc19",nome:"Gestim + Sito + Hosting",totaleAnno:1992,tipo:"fisso",anno:2025},
    {id:"lc20",nome:"Altre Assicurazioni",totaleAnno:33.85,tipo:"fisso",anno:2025},
    {id:"lc21",nome:"Agente Strategico",totaleAnno:12487,tipo:"fisso",anno:2025},
    {id:"lv1",nome:"Foto Immobili",totaleAnno:2045.01,tipo:"variabile",anno:2025},
    {id:"lv2",nome:"Materiale Brand Càsa Imm.",totaleAnno:304.95,tipo:"variabile",anno:2025},
    {id:"lv3",nome:"Materiale Brand x Agenti",totaleAnno:2653.53,tipo:"variabile",anno:2025},
    {id:"lv4",nome:"Materiale di Consumo",totaleAnno:967.79,tipo:"variabile",anno:2025},
    {id:"lv5",nome:"Spese Straordinarie e Varie",totaleAnno:8665.23,tipo:"variabile",anno:2025},
    {id:"lv6",nome:"REGOLD (ricariche)",totaleAnno:819,tipo:"variabile",anno:2025},
    {id:"lv7",nome:"Consulente SocialMedia",totaleAnno:500,tipo:"variabile",anno:2025},
    {id:"lv8",nome:"SISTER ricariche",totaleAnno:869.12,tipo:"variabile",anno:2025},
    {id:"lv9",nome:"Corsi di Formazione",totaleAnno:4796.5,tipo:"variabile",anno:2025},
    {id:"lv10",nome:"Sponsorizzate Social",totaleAnno:70.1,tipo:"variabile",anno:2025},
    {id:"lv11",nome:"Software-Servizi Professionali",totaleAnno:5847.57,tipo:"variabile",anno:2025},
  ];
  const [catCosti,_setCatCosti]=useState(Array.isArray(_ls?.catCosti)?_ls.catCosti:CAT_COSTI_DEFAULT);
  const setCatCosti=cb=>_setCatCosti(prev=>{
    const next=typeof cb==="function"?cb(Array.isArray(prev)?prev:[...CAT_COSTI_DEFAULT]):cb;
    return Array.isArray(next)?next:[...CAT_COSTI_DEFAULT];
  });
  const [speseCosti,setSpeseCosti]=useState(typeof _ls?.speseCosti==="object"&&!Array.isArray(_ls?.speseCosti)?_ls.speseCosti:{});
  const [impCostiAnno,setImpCostiAnno]=useState(String(new Date().getFullYear()));
  const [impCostiTipo,setImpCostiTipo]=useState("fisso");
  const [formNuovaCat,setFormNuovaCat]=useState(null);
  const [catCostiEditId,setCatCostiEditId]=useState(null);
  const [delCatTarget,setDelCatTarget]=useState(null); // categoria in attesa di conferma eliminazione (se ha spese)
  const [formSpesa,setFormSpesa]=useState(null);
  const [costiCatExpand,setCostiCatExpand]=useState({});
  const [showGestCat,setShowGestCat]=useState(false);
  const [formNuovaCatAg,setFormNuovaCatAg]=useState(null);
  const [costiAnno,setCostiAnno]=useState(annoCorrente);
  const [costiSubTab,setCostiSubTab]=useState("anno"); // "anno" = vista anno singolo, "confronto" = confronto anni
  const [costiVista,setCostiVista]=useState("riepilogo"); // "riepilogo" | "fisso" | "variabile" | "finanziamento"
  const [costiAnnoAg,setCostiAnnoAg]=useState("2025"); // anno separato per agente
  const [obiettivoFatturato,setObiettivoFatturato]=useState(_ls?.obiettivoFatturato||0);
  const [obiettivoQuotaAgenzia,setObiettivoQuotaAgenzia]=useState(_ls?.obiettivoQuotaAgenzia||0);
  // Break Even manuale per anno: { "2025": 180000, "2026": 195000, ... }
  const [breakEvenManuale,setBreakEvenManuale]=useState(_ls?.breakEvenManuale||{});
  const [costiBreakevenMode,setCostiBreakevenMode]=useState("fissi+variabili");
  const [costiAgenteBreakevenMode,setCostiAgenteBreakevenMode]=useState("fissi+variabili");
  const [expandedVoci,setExpandedVoci]=useState({});
  const [archiviatiProp,setArchiviatiProp]=useState(_ls?.archiviatiProp||[]);
  const [archiviatiVend,setArchiviatiVend]=useState(_ls?.archiviatiVend||[]);
  const [mostraArchiviatiProp,setMostraArchiviatiProp]=useState(false);
  const [mostraArchiviatiVend,setMostraArchiviatiVend]=useState(false);
  const [modalCostoVoce,setModalCostoVoce]=useState(null);
  const [formNuovaSpesa,setFormNuovaSpesa]=useState({data:todayStr(),importo:"",desc:""});
  const [fonti,setFonti]=useState(_ls?.fonti||["CP/CDI","Zona","Privati","Agenzia Esterna","Passaparola"]);
  const [tipologie,setTipologie]=useState(_ls?.tipologie||["Monolocale","Bilocale","Trilocale","Quadrilocale","Villa","Casa singola","Porzione","Appartamento","Terreno edificabile","Negozio","Ufficio"]);
  const [vincoli,setVincoli]=useState(_ls?.vincoli||["Mutuo","Sanatoria","Urbanistico/difformità","Successione","Permuta","Altro"]);
  const [tipiNeg,setTipiNeg]=useState(_ls?.tipiNeg||["Mutuo negato","Pratica rifiutata","Rinuncia acquirente","Problemi catastali","Altro"]);
  const [tipiVolantino,setTipiVolantino]=useState(_ls?.tipiVolantino||["Lettera acquisizione zona","Lettera OH","Volantino Venduto","Flyer immobile","Lettera AMV"]);
  const [tipiSviluppo,setTipiSviluppo]=useState(_ls?.tipiSviluppo||["Riunione","Corso","Programmazione settimana","Formazione online","One-to-one con broker","Altro"]);
  // Operatività: {agentId: {"2026-05-15": {dati giornata...}}}
  const [operativita,setOperativita]=useState(_ls?.operativita||{});
  // Obiettivi operatività: {agentId: {"2026-05": {obiettivi mese...}}}
  const [obiettiviOp,setObiettiviOp]=useState(_ls?.obiettiviOp||{});
  const [opSubTab,setOpSubTab]=useState("oggi");
  const [opMainTab,setOpMainTab]=useState("attivita");
  // === STATE per il nuovo sub-tab "Oggi" ===
  // Catalogo Azioni (cause): 15 voci default, 4 gruppi
  // consigliatoDefault = valore consigliato/giorno per Top Agent (modificabile dall'agente)
  const CATALOGO_AZIONI_DEFAULT=[
    {id:"chiam_prop", gruppo:"telefono", nome:"Chiamate proprietari", icona:"📞", attivo:true, consigliatoDefault:8},
    {id:"chiam_zona", gruppo:"telefono", nome:"Chiamate zona post volantino", icona:"📞", attivo:true, consigliatoDefault:0},
    {id:"chiam_pass", gruppo:"telefono", nome:"Chiamate clienti passati", icona:"📞", attivo:true, consigliatoDefault:5},
    {id:"chiam_infl", gruppo:"telefono", nome:"Chiamate centri di influenza", icona:"📞", attivo:true, consigliatoDefault:2},
    {id:"chiam_priv", gruppo:"telefono", nome:"Chiamate privati / contatti caldi", icona:"📞", attivo:true, consigliatoDefault:3},
    {id:"chiam_freddo", gruppo:"telefono", nome:"Chiamate generica / freddo", icona:"📞", attivo:true, consigliatoDefault:0},
    {id:"follow_notizie", gruppo:"telefono", nome:"Follow-up notizie", icona:"📞", attivo:true, consigliatoDefault:3},
    {id:"follow_mirino", gruppo:"telefono", nome:"Follow-up contatti mirino", icona:"🎯", attivo:true, consigliatoDefault:5},
    {id:"lettere", gruppo:"scritto", nome:"Lettere mirate", icona:"✉️", attivo:true, consigliatoDefault:10},
    {id:"newsletter", gruppo:"scritto", nome:"Newsletter / email database", icona:"📧", attivo:true, consigliatoDefault:0},
    {id:"post_social", gruppo:"social", nome:"Post social", icona:"📱", attivo:true, consigliatoDefault:1},
    {id:"video_social", gruppo:"social", nome:"Video per social", icona:"🎬", attivo:true, consigliatoDefault:0},
    {id:"volantinaggio", gruppo:"distribuzione", nome:"Volantinaggio", icona:"📢", attivo:true, hasTipoVolantino:true, consigliatoDefault:0},
    {id:"open_house", gruppo:"distribuzione", nome:"Open House organizzato", icona:"🏠", attivo:true, consigliatoDefault:0},
    {id:"networking", gruppo:"distribuzione", nome:"Networking / eventi", icona:"🤝", attivo:true, consigliatoDefault:0},
  ];
  const TIPI_VOLANTINO=["AMV","AV","OH","Personale Agente","Flyer3"];
  const GRUPPI_AZIONI=[
    {id:"telefono", nome:"Telefono", icona:"📞"},
    {id:"scritto", nome:"Scritto", icona:"✉️"},
    {id:"social", nome:"Social", icona:"📱"},
    {id:"distribuzione", nome:"Distribuzione & Networking", icona:"📢"},
  ];
  // Conseguenze (output diretti)
  const CATALOGO_CONSEGUENZE_DEFAULT=[
    {id:"appt_acq_fissati", nome:"Appuntamenti acquisizione fissati", icona:"📅", clr:"#A8863A"},
    {id:"immobili_visti", nome:"Immobili visti in acquisizione", icona:"🏠", clr:"#A8863A"},
    {id:"presentazioni", nome:"Presentazioni Val + Piano Marketing", icona:"📊", clr:"#A8863A"},
    {id:"follow_val", nome:"Follow-up post-valutazione", icona:"🔄", clr:"#A8863A"},
    {id:"report_prop", nome:"Report proprietari consegnati", icona:"📋", clr:"#2980B9"},
    {id:"ribassi", nome:"Ribassi proposti", icona:"📉", clr:"#E67E22"},
    {id:"appt_acq_clienti", nome:"Appuntamenti con acquirenti", icona:"🤝", clr:"#8E44AD"},
    {id:"oh_effettuati", nome:"Visite Open House effettuate", icona:"🏠", clr:"#E74C3C"},
    {id:"proposte_pres", nome:"Proposte presentate", icona:"📄", clr:"#27AE60"},
    {id:"proposte_acc", nome:"Proposte accettate", icona:"✅", clr:"#27AE60"},
    {id:"preliminari", nome:"Preliminari firmati", icona:"✍️", clr:"#27AE60"},
    {id:"rogiti", nome:"Rogiti", icona:"🎉", clr:"#27AE60"},
  ];
  // Tempo dedicato — 6 categorie ore
  const CATALOGO_TEMPO_DEFAULT=[
    {id:"ore_ricerca", nome:"Ricerca / acquisizione", clr:"#2980B9"},
    {id:"ore_operativo", nome:"Operativo / vendite", clr:"#A8863A"},
    {id:"ore_oh", nome:"Open House", clr:"#E74C3C"},
    {id:"ore_sviluppo", nome:"Sviluppo", clr:"#8E44AD"},
    {id:"ore_marketing", nome:"Marketing", clr:"#27AE60"},
    {id:"ore_admin", nome:"Amministrativo", clr:"#888"},
  ];
  // Routine professionali (linee guida broker, uguali per tutti)
  const ROUTINE_PROFESSIONALI_DEFAULT=[
    {id:"formazione", nome:"1H formazione mattino", attivo:true},
    {id:"mirino", nome:"Sessione mirino · aggiornamento contatti", attivo:true},
    {id:"crm", nome:"1H aggiornamento CRM", attivo:true},
  ];
  const [catalogoAzioni,setCatalogoAzioni]=useState(_ls?.catalogoAzioni||CATALOGO_AZIONI_DEFAULT);
  const [routineProf,setRoutineProf]=useState(_ls?.routineProf||ROUTINE_PROFESSIONALI_DEFAULT);
  // Dati operatività "Oggi" per agente/data: {agentId:{"2026-05-25":{azioni:{}, conseguenze:{}, routine:{}, spaziPersonali:[], note:""}}}
  const [oggiDati,setOggiDati]=useState(_ls?.oggiDati||{});
  // Volantinaggi tracciati per follow-up automatico chiamate in zona
  // [{id, agentId, data, tipoVolantino, zona, quantita}]
  const [volantinaggi,setVolantinaggi]=useState(_ls?.volantinaggi||[]);
  const [opDataSel,setOpDataSel]=useState(todayStr());
  const [opMeseSel,setOpMeseSel]=useState(annoCorrente+"-"+String(new Date().getMonth()+1).padStart(2,"0"));
  const [opAgenteSel,setOpAgenteSel]=useState("Tutti");
  // Gestione Pratiche: {incaricoId: {fasi:{}, checklistA:{}, checklistB:{}, checklistC:{}, note:""}}
  const [pratiche,setPratiche]=useState(normPratiche(_ls?.pratiche));
  const [gpIncSel,setGpIncSel]=useState(null);
  const [gpSubTab,setGpSubTab]=useState("pipeline");
  const [gpFiltroStato,setGpFiltroStato]=useState("Tutti");
  const [gpVista,setGpVista]=useState("kanban");
  const [gpFiltroFase,setGpFiltroFase]=useState("Tutte");
  const [gpFiltroAlert,setGpFiltroAlert]=useState(false);
  const [gpPraticaSel,setGpPraticaSel]=useState(null);
  const [rogitoModal,setRogitoModal]=useState(null);
  const [gpFasiOpen,setGpFasiOpen]=useState({});
  const [reportForm,setReportForm]=useState(null);
  const [gpDocOpen,setGpDocOpen]=useState(false);
  const [gpRefOpen,setGpRefOpen]=useState(false);
  const [gpAnno,setGpAnno]=useState("Tutti");
  const [gpCategoria,setGpCategoria]=useState("attive");
  const [gpFiltroAg,setGpFiltroAg]=useState("Tutti");
  const [rowOpen,setRowOpen]=useState(null);
  const [warPeriodo,setWarPeriodo]=useState("anno");
  const [warDal,setWarDal]=useState(todayStr());
  const [warAl,setWarAl]=useState(todayStr());
  const [warRiunione,setWarRiunione]=useState(false);
  const [warShowObiettivo,setWarShowObiettivo]=useState(true);
  const [warShowProduzione,setWarShowProduzione]=useState(true);
  // War Room — traguardi volanti
  const [sfide,setSfide]=useState(_ls?.sfide||[]);
  const [notizie,setNotizie]=useState(_ls?.notizie||[]);
  const [formNot,setFormNot]=useState(null);
  const [qNot,setQNot]=useState("");
  const [fNotAgente,setFNotAgente]=useState("tutti");
  const [fNotFonte,setFNotFonte]=useState("tutte");
  const [fNotPrio,setFNotPrio]=useState("tutte");
  const [formSfida,setFormSfida]=useState({nome:"",metrica:"acquisizioni",dal:todayStr(),al:"",premio:""});
  const [showFormSfida,setShowFormSfida]=useState(false);
  const [warSubTab,setWarSubTab]=useState("performance");
  const [agSubWar,setAgSubWar]=useState("traguardo"); // sotto-tab per la vista agente in War Room: "traguardo" | "eventi"
  const [warOscura,setWarOscura]=useState(false);
  // War Room — Eventi (corsi, cene, conferenze ecc.)
  const [eventi,setEventi]=useState(_ls?.eventi||[]);
  const [tipiEvento,setTipiEvento]=useState(_ls?.tipiEvento||["Corso","Evento","Cena","Conferenza","Aperitivo","Altro"]);
  const [showEvento,setShowEvento]=useState(null); // null | "new" | oggetto evento
  const [formEvento,setFormEvento]=useState({data:todayStr(),titolo:"",tipo:"Corso",luogo:"",partecipanti:[],costo:"",includiCosti:false,note:"",link:""});
  const [fEventoTipo,setFEventoTipo]=useState("Tutti");
  const [oneToOne,setOneToOne]=useState(_ls?.oneToOne||{});
  const [otoAgSel,setOtoAgSel]=useState(null);
  const [otoForm,setOtoForm]=useState({data:todayStr(),noteIncontro:"",obiettivi:"",criticita:"",azioni:"",notePrivate:""});
  const [otoOpen,setOtoOpen]=useState(null);
  const [warAnno,setWarAnno]=useState(annoCorrente);
  const [warMese,setWarMese]=useState(String(new Date().getMonth()+1).padStart(2,"0"));
  // Cache form giornata per evitare re-render a ogni carattere
  const [opFormCache,setOpFormCache]=useState({});
  const [opSaved,setOpSaved]=useState(false);
  const [fasiConfig,setFasiConfig]=useState(null);
  const [impSezione,setImpSezione]=useState("generale");
  const [impFaseSel,setImpFaseSel]=useState(0);
  const [formNuovaAzione,setFormNuovaAzione]=useState({lbl:"",ruolo:"agente",alert:false});
  const [opFormSett,setOpFormSett]=useState({});
  const [opModoInserimento,setOpModoInserimento]=useState("giorno");
  // nF,nT,nV,nN removed - SettSec manages its own local state to fix cursor bug
  const [subInc,setSubInc]=useState("vendita"); const [subProp,setSubProp]=useState("vendita"); const [subVend,setSubVend]=useState("vendita");
  const [vendViewMode,setVendViewMode]=useState("pratiche"); // 'pratiche' o 'incassi'
  const [incassiPeriodo,setIncassiPeriodo]=useState("settimana"); // 'oggi','settimana','mese','mese_scorso','custom'
  // Modale pagamento (apertura cliccando una riga in vista Incassi)
  // Per "nuovo": {mode:"new", venduto, lato:"V"|"A"}
  // Per "modifica": {mode:"edit", venduto, lato:"V"|"A", rata:"acc1"|"acc2"|"saldo"}
  const [pagamentoModale,setPagamentoModale]=useState(null);
  const [pmImporto,setPmImporto]=useState("");
  const [pmData,setPmData]=useState("");
  const [pmNote,setPmNote]=useState("");
  const [pmRata,setPmRata]=useState("acc1");
  const [pmSbloccato,setPmSbloccato]=useState(false); // sblocco temporaneo per modificare pagamenti di lati completamente incassati
  const [incassiDal,setIncassiDal]=useState(""); const [incassiAl,setIncassiAl]=useState("");
  const [dashIncassiPeriodo,setDashIncassiPeriodo]=useState("settimana"); // per mini-box Dashboard
  const [fIncStato,setFIncStato]=useState("Attivo"); const [fIncAnno,setFIncAnno]=useState("Tutti"); const [incVistaTutti,setIncVistaTutti]=useState(false); const [fIncMese,setFIncMese]=useState("Tutti"); const [fIncAg,setFIncAg]=useState("Tutti"); const [fIncMirino,setFIncMirino]=useState(false);
  const [ordineInc,setOrdineInc]=useState("recenti"); // recenti | vecchi | scadenza | prezzoAlto | prezzoBasso
  const [fPropStato,setFPropStato]=useState("Tutti"); const [fPropAnno,setFPropAnno]=useState(annoCorrente); const [fPropMese,setFPropMese]=useState("Tutti"); const [fPropAg,setFPropAg]=useState("Tutti");
  const [ordineProp,setOrdineProp]=useState("recenti"); // recenti | vecchi | scadenza | prezzoAlto | prezzoBasso
  const [fVendStato,setFVendStato]=useState("Tutti"); const [fVendRogito,setFVendRogito]=useState("Tutti"); const [fVendAnno,setFVendAnno]=useState(annoCorrente); const [fVendAg,setFVendAg]=useState("Tutti");
  const [ordineVend,setOrdineVend]=useState("recenti"); // recenti | vecchi | scadenzaIncasso | prezzoAlto | prezzoBasso
  const [dashAnno,setDashAnno]=useState(annoCorrente);
  const [reportAnno,setReportAnno]=useState(annoCorrente); const [reportMese,setReportMese]=useState("Tutti");
  const [fatAgente,setFatAgente]=useState(""); const [fatAnno,setFatAnno]=useState(annoCorrente); const [fatMese,setFatMese]=useState("Tutti"); const [fatStatoIncasso,setFatStatoIncasso]=useState("Tutti");
  const [mostraArchiviati,setMostraArchiviati]=useState(false);
  const [showInc,setShowInc]=useState(null);
  const [showRibasso,setShowRibasso]=useState(null);
  const [formRibasso,setFormRibasso]=useState({data:todayStr(),prezzo:"",note:""}); const [showProp,setShowProp]=useState(null); const [showGestProp,setShowGestProp]=useState(null); const [showGestVend,setShowGestVend]=useState(null);
  const [formInc,setFormInc]=useState({}); const [formProp,setFormProp]=useState({}); const [formStatoProp,setFormStatoProp]=useState({}); const [formVend,setFormVend]=useState({});
  const [showSelIncaricoAg,setShowSelIncaricoAg]=useState(false);
  const [cercaIncAg,setCercaIncAg]=useState("");
  const [showIncassoLato,setShowIncassoLato]=useState(null);
  const [showAgente,setShowAgente]=useState(null); const [formAgente,setFormAgente]=useState({});
  const [schedaAgente,setSchedaAgente]=useState(null);
  const [schedaIncarico,setSchedaIncarico]=useState(null);
  const [pagamentiFatture,setPagamentiFatture]=useState(_ls?.pagamentiFatture||{});
  // Prospetti fatture agente (Architettura A): array di prospetti con n° auto P-001, P-002...
  // Schema: {id, numero:"P-001", agenteId, dataCreazione, righe:[{venditoId, ruolo, importo}],
  //   totale, statoFlow:"inviato"|"fatturato"|"pagato"|"annullato",
  //   numFatturaAg, dataFatturaAg, dataPagamento, note}
  const [prospetti,setProspetti]=useState(_ls?.prospetti||[]);
  // UI: sub-tab nel TAB Fatture Agenti (broker)
  const [fatSubTab,setFatSubTab]=useState("quote"); // "quote" = quote maturate da fatturare, "prospetti" = lista prospetti emessi
  // Selezione pratiche per nuovo prospetto: array di venditoId selezionati
  const [prospettoSel,setProspettoSel]=useState([]);
  // Modale dettaglio prospetto aperto
  const [showProspetto,setShowProspetto]=useState(null);
  // Modale stampa prospetto
  const [stampaProspetto,setStampaProspetto]=useState(null);
  // Modale dettaglio prospetto lato agente (sola lettura)
  const [showProspettoAg,setShowProspettoAg]=useState(null);
  // Filtro anno per vista agente "Le mie fatture"
  const [fatAgAnno,setFatAgAnno]=useState("");
  // === RICERCA TESTUALE (live, multi-parola, multi-campo) per tutte le viste lista ===
  const [searchIncarichi,setSearchIncarichi]=useState("");
  const [searchProposte,setSearchProposte]=useState("");
  const [searchVenduti,setSearchVenduti]=useState("");
  const [searchMirino,setSearchMirino]=useState("");
  const [searchPratiche,setSearchPratiche]=useState("");
  const [searchArchiviati,setSearchArchiviati]=useState("");
  const [showPagamento,setShowPagamento]=useState(null); const [formPagamento,setFormPagamento]=useState({});
  const [mirino,setMirino]=useState(_ls?.mirino||{});
  const [emailLog,setEmailLog]=useState(_ls?.emailLog||{});
  // Tracciamento accessi e modifiche del team
  const [tracciamento,setTracciamento]=useState(_ls?.tracciamento||{});
  const [showMirino,setShowMirino]=useState(null);
  const [formMirino,setFormMirino]=useState({});
  const [provvStandard,setProvvStandard]=useState(_ls?.provvStandard||{percVend:3,percAcq:4,soglia:120000,minVend:3500,minAcq:4000});
  const [statSubTab,setStatSubTab]=useState("generali");
  const [statAnno,setStatAnno]=useState(annoCorrente);
  const [statPeriodoMesi,setStatPeriodoMesi]=useState("12"); // Trend: 3/6/12/24 mesi oppure "ytd" (anno corrente)
  const [statAgente,setStatAgente]=useState("self"); // Trend+Funnel: self/team/<id>
  const [statFunnelPeriodo,setStatFunnelPeriodo]=useState("mese"); // Funnel: mese/trimestre/anno/tutto
  const [statShowSconti,setStatShowSconti]=useState(false);
  const [showSospesi,setShowSospesi]=useState(false);
  // To-do list libera di Erica (Back Office): array di {id, testo, fatto, data}
  const [ericaTodo,setEricaTodo]=useState(_ls?.ericaTodo||[]);
  const [ericaTodoInput,setEricaTodoInput]=useState("");
  // To-do list libera degli agenti: oggetto {agentId: [{id,testo,fatto,data}]}
  const [agenteTodo,setAgenteTodo]=useState(_ls?.agenteTodo||{});
  const [agenteTodoInput,setAgenteTodoInput]=useState("");
  const [showNuoviIncBO,setShowNuoviIncBO]=useState(false);
  // Dashboard agente: sezioni collassabili (chiuse di default, coerenza col broker)
  const [showAttesaAg,setShowAttesaAg]=useState(false);
  const [showVincolateAg,setShowVincolateAg]=useState(false);
  const [showAttivitaAg,setShowAttivitaAg]=useState(false);
  // Banner spiegazione "Venduti ≠ Rogitati" — dismissibile (memorizzato in localStorage)
  const [showBannerVend,setShowBannerVend]=useState(()=>{try{return localStorage.getItem("casa_bannerVend_chiuso")!=="1";}catch{return true;}});
  const chiudiBannerVend=()=>{try{localStorage.setItem("casa_bannerVend_chiuso","1");}catch{}setShowBannerVend(false);};
  const [showAttesa,setShowAttesa]=useState(false);
  const [showVincolate,setShowVincolate]=useState(false);
  const [showSospesiAg,setShowSospesiAg]=useState(false);
  const [mioRepAnno,setMioRepAnno]=useState(annoCorrente);
  const [mioRepMese,setMioRepMese]=useState("Tutti");
  const [mioRepStato,setMioRepStato]=useState("tutti"); // tutti / incassate / parziali / daincassare
  const [showMioTabella,setShowMioTabella]=useState(true);
  const [mioFatAnno,setMioFatAnno]=useState(annoCorrente);
  const [mioFatMese,setMioFatMese]=useState("Tutti");
  const [mioFatStato,setMioFatStato]=useState("Tutti");

  const isBroker = utente?.ruolo==="Broker";
  const isBackOffice = utente?.ruolo==="BackOffice";
  const isCoach = utente?.ruolo==="Coach";
  const isCollab = utente?.profilo==="Collaborazione Agenzia";
  const coachIsAgenzia = isCoach&&(!utente?.coachTarget||utente.coachTarget==="agenzia");
  const coachAgentId = isCoach&&!coachIsAgenzia?Number(utente?.coachTarget):null;
  const canViewAll = isBroker||isBackOffice||(isCoach&&coachIsAgenzia);
  const isReadOnly = isCoach;
  const isProductivo = !isBackOffice&&!isCoach&&!isCollab;
  const canEditPratiche = isBroker||isBackOffice||(utente?.agentId===5);
  const myAgentId = coachAgentId||utente?.agentId||null;

  // Costi personali agente (per agente loggato)
  const [costiAgente,setCostiAgente]=useState(_ls?.costiAgente||{});
  const [costiAgenteAnno,setCostiAgenteAnno]=useState(annoCorrente);
  const [modalCostoVoceAg,setModalCostoVoceAg]=useState(null);
  const [formNuovaSpesaAg,setFormNuovaSpesaAg]=useState({data:todayStr(),importo:"",desc:""});
  const [obiettivoAgente,setObiettivoAgente]=useState(_ls?.obiettivoAgente||{});
  const importRef=useRef();
  const [showMobileMenu,setShowMobileMenu]=useState(false);

  // Carica dati da Supabase all'avvio
  // Migrazione inReport per agenti esistenti - runs once after DB load
  useEffect(()=>{
    if(!dbLoaded) return;
    setAgenti(prev=>prev.map(a=>({
      ...a,
      inReport: ["Broker","Consulente","Collaboratore"].includes(a.profilo) ? (a.inReport!==false) : false
    })));
  },[dbLoaded]);

  // CSS GLOBALE PER STAMPA - nasconde tutto tranne le aree marcate data-print="true"
  // Risolve: 1) header app/sidebar nella stampa  2) stampa doppia/2 pagine indesiderate
  useEffect(()=>{
    const styleId = "gest-print-styles";
    if(document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        @page { size: A4; margin: 12mm; }
        html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
        body * { visibility: hidden !important; }
        [data-print="true"], [data-print="true"] * { visibility: visible !important; }
        [data-print="true"] {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          box-shadow: none !important;
          border: none !important;
        }
        /* Nascondi pulsanti dentro l'area stampabile (es. Stampa/Chiudi) */
        [data-print="true"] [data-noprint="true"],
        [data-print="true"] button {
          display: none !important;
        }
        /* Page break controlli */
        .print-page-break { page-break-before: always; }
        .print-no-break { page-break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
    return ()=>{ const el=document.getElementById(styleId); if(el) el.remove(); };
  },[]);

    useEffect(()=>{
    caricaDB().then(data=>{
      if(data&&Object.keys(data).length>0){
        if(data.agenti) setAgenti(data.agenti.map(a=>({
          ...a,
          inReport: ["Broker","Consulente","Collaboratore"].includes(a.profilo) ? (a.inReport!==false) : false
        })));
        if(data.incarichi) setIncarichi(data.incarichi);
        if(data.proposte) setProposte(data.proposte);
        if(data.venduti) setVenduti(data.venduti);
        if(data.archiviati) setArchiviati(data.archiviati);
        if(data.archiviatiProp) setArchiviatiProp(data.archiviatiProp);
        if(data.archiviatiVend) setArchiviatiVend(data.archiviatiVend);
        if(data.fonti) setFonti(data.fonti);
        if(data.tipologie) setTipologie(data.tipologie);
        if(data.vincoli) setVincoli(data.vincoli);
        if(data.tipiNeg) setTipiNeg(data.tipiNeg);
        if(data.tipiVolantino) setTipiVolantino(data.tipiVolantino);
        if(data.tipiSviluppo) setTipiSviluppo(data.tipiSviluppo);
        if(data.operativita) setOperativita(data.operativita);
        if(data.catalogoAzioni) setCatalogoAzioni(data.catalogoAzioni);
        if(data.routineProf) setRoutineProf(data.routineProf);
        if(data.oggiDati) setOggiDati(data.oggiDati);
        if(data.volantinaggi) setVolantinaggi(data.volantinaggi);
        if(data.obiettiviOp) setObiettiviOp(data.obiettiviOp);
        if(data.pratiche) setPratiche(normPratiche(data.pratiche));
        if(data.pagamentiFatture) setPagamentiFatture(data.pagamentiFatture);
        if(data.prospetti) setProspetti(Array.isArray(data.prospetti)?data.prospetti:[]);
        if(data.ericaTodo) setEricaTodo(Array.isArray(data.ericaTodo)?data.ericaTodo:[]);
        if(data.agenteTodo) setAgenteTodo(typeof data.agenteTodo==="object"&&data.agenteTodo?data.agenteTodo:{});
        if(data.costi) setCosti(data.costi);
        if(data.obiettivoFatturato!==undefined) setObiettivoFatturato(data.obiettivoFatturato);
        if(data.obiettivoQuotaAgenzia!==undefined) setObiettivoQuotaAgenzia(data.obiettivoQuotaAgenzia);
        if(data.breakEvenManuale) setBreakEvenManuale(data.breakEvenManuale);
        if(data.provvStandard) setProvvStandard(data.provvStandard);
        if(data.costiAgente) setCostiAgente(data.costiAgente);
        if(data.mirino) setMirino(data.mirino);
        if(data.fasiConfig) setFasiConfig(data.fasiConfig);
        if(data.emailLog) setEmailLog(data.emailLog);
        if(data.catCosti) {
          // Pulisco automaticamente le categorie placeholder vuote ("Nuova categoria" con totale 0)
          // che si accumulano e bloccano il fallback al previsionale anno precedente
          const raw = Array.isArray(data.catCosti)?data.catCosti:Object.values(data.catCosti);
          const pulito = raw.filter(c => !(
            (c.nome==="Nuova categoria"||!c.nome||c.nome.trim()==="") 
            && Number(c.totaleAnno||0)===0
          ));
          setCatCosti(pulito);
        }
        if(data.speseCosti) setSpeseCosti(typeof data.speseCosti==="object"&&!Array.isArray(data.speseCosti)?data.speseCosti:{});
        if(data.oneToOne) setOneToOne(data.oneToOne);
        if(data.sfide) setSfide(data.sfide);
        if(data.notizie) setNotizie(data.notizie);
        if(data.obiettivoAgente) setObiettivoAgente(data.obiettivoAgente);
        if(data.eventi) setEventi(Array.isArray(data.eventi)?data.eventi:[]);
        if(data.tipiEvento) setTipiEvento(Array.isArray(data.tipiEvento)?data.tipiEvento:["Corso","Evento","Cena","Conferenza","Aperitivo","Altro"]);
        if(data.tracciamento) setTracciamento(data.tracciamento);
      }
      setDbLoaded(true);
    });
  },[]);

  // ── MIGRAZIONE: assegna codice pratica agli incarichi storici che non ce l'hanno ──
  // Ordina per data e assegna progressivi per anno. Gira una sola volta quando serve.
  useEffect(()=>{
    if(!dbLoaded) return;
    const senzaCodice = incarichi.filter(i=>!i.codicePratica);
    if(senzaCodice.length===0) return;
    // Ordino tutti gli incarichi per dataInizio (i più vecchi prima) per assegnare progressivi coerenti
    const ordinati = [...incarichi].sort((a,b)=>(a.dataInizio||"").localeCompare(b.dataInizio||""));
    const contatoriAnno = {};
    // Prima registro i progressivi già esistenti per non creare duplicati
    incarichi.forEach(i=>{
      if(i.codicePratica){
        const [anno,num] = i.codicePratica.split("-");
        const n = parseInt(num,10);
        if(!isNaN(n)) contatoriAnno[anno] = Math.max(contatoriAnno[anno]||0, n);
      }
    });
    const codiciAssegnati = {};
    ordinati.forEach(i=>{
      if(i.codicePratica) return;
      const anno = (i.dataInizio||todayStr()).slice(0,4);
      contatoriAnno[anno] = (contatoriAnno[anno]||0)+1;
      codiciAssegnati[i.id] = `${anno}-${String(contatoriAnno[anno]).padStart(3,"0")}`;
    });
    setIncarichi(incarichi.map(i=>codiciAssegnati[i.id]?{...i,codicePratica:codiciAssegnati[i.id]}:i));
  },[dbLoaded]);

  // ── EMAIL AUTOMATICHE ──
  // Alert pratiche RT - controlla ogni ora
  useEffect(()=>{
    if(!dbLoaded) return;
    const checkAlertsEmail = async () => {
      const oggi=todayStr();
      const chiaveGiorno=`alert_${oggi}`;
      if(emailLog[chiaveGiorno]) return; // già inviato oggi
      const alertsPratiche=[];
      (Array.isArray(pratiche)?pratiche:Object.values(pratiche||{})).forEach(p=>{
        if(p.completata||p.archiviata) return;
        const inc=incarichi.find(i=>i.id===p.incaricoId);
        if(!inc) return;
        const ag=agenti.find(a=>a.id===Number(inc.agenteListing));
        if(!ag?.email) return;
        // Trova azioni in ritardo
        const azioniRitardo=(p.fasi||[]).flatMap(f=>(f.azioni||[]).filter(a=>!a.completata&&a.scadenza&&a.scadenza<oggi));
        azioniRitardo.forEach(az=>{
          alertsPratiche.push({
            email_destinatario: ag.email,
            agente: `${ag.nome} ${ag.cognome||""}`,
            immobile: `${inc.comune||""} — ${inc.indirizzo||""}`,
            azione: az.nome||"Azione",
            scadenza: az.scadenza,
            giorni_ritardo: Math.floor((new Date(oggi)-new Date(az.scadenza))/(1000*60*60*24))
          });
        });
      });
      // Invia alert
      for(const params of alertsPratiche){
        await sendEmail(EMAILJS_TEMPLATE_ALERT, params);
      }
      if(alertsPratiche.length>0){
        setEmailLog(prev=>({...prev,[chiaveGiorno]:true}));
      }
    };
    checkAlertsEmail();
    const interval=setInterval(checkAlertsEmail, 3600000); // ogni ora
    return()=>clearInterval(interval);
  },[dbLoaded]);

  // TRACCIAMENTO ACCESSI — registra accesso utente corrente (tutti tranne Sorrentino/Coach)
  useEffect(()=>{
    if(!dbLoaded) return;
    if(!utente?.agentId) return;
    if(isCoach) return; // Coach (Sorrentino) escluso dal tracciamento
    const myId = String(utente.agentId);
    const now = nowISO();
    setTracciamento(prev=>{
      const cur = prev[myId] || {};
      const accessi30gg = Array.isArray(cur.accessi30gg) ? cur.accessi30gg : [];
      // Aggiungo solo se l'ultimo accesso è > 30 minuti fa (evito spam su ricarica pagina)
      const ultimo = accessi30gg[accessi30gg.length-1];
      const trentaMinuti = 30*60*1000;
      if(ultimo && (new Date(now)-new Date(ultimo)) < trentaMinuti) return prev;
      // Pulisco gli accessi > 30 giorni
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-30);
      const accessiPuliti = [...accessi30gg.filter(t=>new Date(t)>=cutoff), now];
      return {...prev, [myId]: {...cur, ultimoAccesso:now, accessi30gg:accessiPuliti}};
    });
  },[dbLoaded, utente?.agentId, isCoach]);

  // TRACCIAMENTO MODIFICHE — quando i dati di lavoro cambiano, registra ultimaModifica
  const modificheTrackRef = useRef({last:null});
  useEffect(()=>{
    if(!dbLoaded) return;
    if(!utente?.agentId) return;
    if(isCoach) return; // Coach escluso
    // Debounce: aggiorno una volta al minuto al massimo
    const myId = String(utente.agentId);
    const now = Date.now();
    if(modificheTrackRef.current.last && (now - modificheTrackRef.current.last) < 60000) return;
    modificheTrackRef.current.last = now;
    setTracciamento(prev=>{
      const cur = prev[myId] || {};
      return {...prev, [myId]: {...cur, ultimaModifica:nowISO()}};
    });
  },[incarichi, proposte, venduti, operativita, pratiche, mirino, dbLoaded, isCoach, utente?.agentId]);

  // Report settimanale - ogni lunedì
  useEffect(()=>{
    if(!dbLoaded) return;
    const oggi=new Date();
    if(oggi.getDay()!==1) return; // solo lunedì
    const chiave=`report_${todayStr()}`;
    if(emailLog[chiave]) return;
    const sendReports=async()=>{
      const dal=new Date(oggi);dal.setDate(oggi.getDate()-7);
      const dalStr=dal.toISOString().slice(0,10);
      const aOggi=todayStr();
      for(const ag of agenti.filter(a=>a.inReport!==false&&a.email&&["Broker","Consulente","Collaboratore"].includes(a.profilo))){
        const opAg=operativita[ag.id]||{};
        const chiamate=Object.entries(opAg).filter(([d])=>d>=dalStr&&d<=aOggi).reduce((s,[,g])=>s+Object.values(g.chiamate_tipi||{}).reduce((a,v)=>a+Number(v||0),0),0);
        const appt=Object.entries(opAg).filter(([d])=>d>=dalStr&&d<=aOggi).reduce((s,[,g])=>s+Number(g.appuntamenti||0),0);
        const visit=Object.entries(opAg).filter(([d])=>d>=dalStr&&d<=aOggi).reduce((s,[,g])=>s+Number(g.immVisitati||0),0);
        const acq=incarichi.filter(i=>Number(i.agenteListing)===ag.id&&i.dataInizio>=dalStr&&i.dataInizio<=aOggi).length;
        const prop=proposte.filter(p=>Number(p.agenteId)===ag.id&&p.dataStato>=dalStr).length;
        const vAg=venduti.filter(v=>(Number(v.agenteListing)===ag.id||Number(v.agenteAcquirente)===ag.id)&&(v.dataVendita||v.dataAtto||"")>=dalStr);
        const fattSett=vAg.reduce((s,v)=>{let p=0;if(Number(v.agenteListing)===ag.id)p+=Number(v.provvVenditore||0);if(Number(v.agenteAcquirente)===ag.id)p+=Number(v.provvAcquirente||0);return s+p;},0);
        const vYTD=venduti.filter(v=>(Number(v.agenteListing)===ag.id||Number(v.agenteAcquirente)===ag.id)&&(v.dataVendita||v.dataAtto||"").startsWith(new Date().getFullYear()));
        const fattYTD=vYTD.reduce((s,v)=>{let p=0;if(Number(v.agenteListing)===ag.id)p+=Number(v.provvVenditore||0);if(Number(v.agenteAcquirente)===ag.id)p+=Number(v.provvAcquirente||0);return s+p;},0);
        const obAnno=Number((obiettivoAgente[ag.id]||{}).fatturato||0);
        const perc=obAnno>0?Math.round(fattYTD/obAnno*100):0;
        await sendEmail(EMAILJS_TEMPLATE_REPORT,{
          email_destinatario:ag.email,
          agente:`${ag.nome} ${ag.cognome||""}`,
          chiamate,appuntamenti:appt,visitati:visit,
          acquisizioni:acq,proposte:prop,
          fatturato:`€ ${fattSett.toLocaleString("it-IT")}`,
          fatturato_ytd:`€ ${fattYTD.toLocaleString("it-IT")}`,
          obiettivo_anno:`€ ${obAnno.toLocaleString("it-IT")}`,
          percentuale:perc
        });
      }
      setEmailLog(prev=>({...prev,[chiave]:true}));
    };
    sendReports();
  },[dbLoaded]);

  // Supabase Realtime — sincronizzazione istantanea
  useEffect(()=>{
    if(!dbLoaded) return;
    let channel=null; let supaClient=null;
    let ultimoSalvataggioLocale=Date.now();

    const ricaricaDati=async()=>{
      // Non ricaricare se abbiamo salvato noi stessi negli ultimi 8 secondi
      if(Date.now()-ultimoSalvataggioLocale<8000) return;
      // Non ricaricare se c'è un modal aperto
      if(document.querySelector('[data-modal="true"]')) return;
      try{
        const res=await fetch(`${SUPA_URL}/rest/v1/gestionale_data?id=eq.main&select=data`,
          {headers:authHeaders()});
        if(!res.ok) return;
        const rows=await res.json();
        const d=rows?.[0]?.data;
        if(!d) return;
        if(d.venduti) setVenduti(d.venduti);
        if(d.incarichi) setIncarichi(d.incarichi);
        if(d.proposte) setProposte(d.proposte);
        if(d.pratiche) setPratiche(normPratiche(d.pratiche));
        if(d.pagamentiFatture) setPagamentiFatture(d.pagamentiFatture);
        if(d.prospetti) setProspetti(Array.isArray(d.prospetti)?d.prospetti:[]);
        if(d.operativita) setOperativita(d.operativita);
        if(d.agenti) setAgenti(d.agenti.map(a=>({...a,inReport:["Broker","Consulente","Collaboratore"].includes(a.profilo)?(a.inReport!==false):false})));
        if(d.sfide) setSfide(d.sfide);
        if(d.notizie) setNotizie(d.notizie);
        if(d.eventi) setEventi(d.eventi);
        if(d.tipiEvento) setTipiEvento(d.tipiEvento);
        if(d.tracciamento) setTracciamento(d.tracciamento);
        if(d.catCosti) setCatCosti(Array.isArray(d.catCosti)?d.catCosti:Object.values(d.catCosti));
        if(d.speseCosti) setSpeseCosti(typeof d.speseCosti==="object"&&!Array.isArray(d.speseCosti)?d.speseCosti:{});
        if(d.breakEvenManuale) setBreakEvenManuale(d.breakEvenManuale);
        if(d.archiviati) setArchiviati(d.archiviati);
        if(d.archiviatiProp) setArchiviatiProp(d.archiviatiProp);
        if(d.archiviatiVend) setArchiviatiVend(d.archiviatiVend);
        if(d.oneToOne) setOneToOne(d.oneToOne);
        if(d.fasiConfig) setFasiConfig(d.fasiConfig);
        if(d.mirino) setMirino(d.mirino);
        if(d.obiettivoAgente) setObiettivoAgente(d.obiettivoAgente);
        // Campi aggiuntivi sincronizzati per evitare perdita dati su modifiche concorrenti
        if(d.ericaTodo) setEricaTodo(d.ericaTodo);
        if(d.agenteTodo) setAgenteTodo(d.agenteTodo);
        if(d.obiettivoFatturato) setObiettivoFatturato(d.obiettivoFatturato);
        if(d.obiettivoQuotaAgenzia) setObiettivoQuotaAgenzia(d.obiettivoQuotaAgenzia);
        if(d.obiettiviOp) setObiettiviOp(d.obiettiviOp);
        if(d.provvStandard) setProvvStandard(d.provvStandard);
        if(d.costi) setCosti(d.costi);
        if(d.costiAgente) setCostiAgente(d.costiAgente);
        if(d.catalogoAzioni) setCatalogoAzioni(d.catalogoAzioni);
        if(d.routineProf) setRoutineProf(d.routineProf);
        if(d.oggiDati) setOggiDati(d.oggiDati);
        if(d.volantinaggi) setVolantinaggi(d.volantinaggi);
        if(d.emailLog) setEmailLog(d.emailLog);
        if(d.fonti) setFonti(d.fonti);
        if(d.tipologie) setTipologie(d.tipologie);
        if(d.vincoli) setVincoli(d.vincoli);
        if(d.tipiNeg) setTipiNeg(d.tipiNeg);
        if(d.tipiVolantino) setTipiVolantino(d.tipiVolantino);
        if(d.tipiSviluppo) setTipiSviluppo(d.tipiSviluppo);
      }catch(e){}
    };

    // Esponi funzione per segnare quando salviamo noi
    window._gestionaleSalvato=()=>{ ultimoSalvataggioLocale=Date.now(); };

    const initRealtime=async()=>{
      try{
        const _imp=new Function("u","return import(u)");
        const {createClient}=await _imp("https://esm.sh/@supabase/supabase-js@2");
        supaClient=createClient(SUPA_URL,SUPA_KEY);
        try{ const _tk=tokenAttivo(); if(_tk&&supaClient.realtime&&supaClient.realtime.setAuth) supaClient.realtime.setAuth(_tk); }catch(e){}
        channel=supaClient
          .channel("gestionale_sync")
          .on("postgres_changes",{event:"UPDATE",schema:"public",table:"gestionale_data"},
            ()=>{ setTimeout(ricaricaDati,800); })
          .subscribe();
      }catch(e){
        // Fallback polling
        const poll=setInterval(ricaricaDati,8000);
        return()=>clearInterval(poll);
      }
    };
    initRealtime();
    // Riallineamento al rientro: torna a fuoco la scheda o torna la connessione → rileggi subito il server
    const onVis=()=>{ if(!document.hidden) ricaricaDati(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", ricaricaDati);
    window.addEventListener("focus", onVis);
    return()=>{ if(channel&&supaClient)supaClient.removeChannel(channel); delete window._gestionaleSalvato; document.removeEventListener("visibilitychange",onVis); window.removeEventListener("online",ricaricaDati); window.removeEventListener("focus",onVis); };
  },[dbLoaded]);

  // Auto-salvataggio su Supabase + localStorage ad ogni modifica
  useEffect(()=>{
    if(!dbLoaded) return; // non salvare prima di aver caricato
    const payload = {agenti,incarichi,proposte,venduti,archiviati,archiviatiProp,archiviatiVend,fonti,tipologie,vincoli,tipiNeg,tipiVolantino,tipiSviluppo,operativita,obiettiviOp,pratiche,pagamentiFatture,prospetti,ericaTodo,agenteTodo,costi,obiettivoFatturato,obiettivoQuotaAgenzia,obiettivoAgente,provvStandard,costiAgente,sfide,notizie,oneToOne,fasiConfig,mirino,emailLog,catCosti,speseCosti,breakEvenManuale,catalogoAzioni,routineProf,oggiDati,volantinaggi,eventi,tipiEvento,tracciamento};
    salvaLS(payload); // salva anche in locale come backup
    if(window._gestionaleSalvato) window._gestionaleSalvato(); // marca subito la modifica locale: il riallineamento non la sovrascrive prima del salvataggio
    // Popola la ref per il salvataggio manuale immediato (bypass debounce)
    salvaOraManualeRef.current = () => {
      setDbSaving(true);
      if(window._gestionaleSalvato) window._gestionaleSalvato();
      salvaDBMerge(payload).finally(()=>{
        setDbSaving(false);
        setUltimoSalvataggio(new Date());
        if(window._gestionaleSalvato) window._gestionaleSalvato();
      });
    };
    setDbSaving(true);
    const t=setTimeout(()=>{
      if(window._gestionaleSalvato)window._gestionaleSalvato();
      salvaDBMerge(payload).finally(()=>{
        setDbSaving(false);
        setUltimoSalvataggio(new Date());
        // Rinnova il guard dopo il salvataggio completato
        if(window._gestionaleSalvato)window._gestionaleSalvato();
      });
    },800); // debounce 800ms (era 2000ms, ridotto per minimizzare rischio perdita dati)
    return ()=>clearTimeout(t);
  },[agenti,incarichi,proposte,venduti,archiviati,archiviatiProp,archiviatiVend,fonti,tipologie,vincoli,tipiNeg,tipiVolantino,tipiSviluppo,operativita,obiettiviOp,pratiche,pagamentiFatture,prospetti,ericaTodo,agenteTodo,costi,obiettivoFatturato,obiettivoQuotaAgenzia,obiettivoAgente,provvStandard,costiAgente,mirino,sfide,oneToOne,fasiConfig,emailLog,catCosti,speseCosti,breakEvenManuale,catalogoAzioni,routineProf,oggiDati,volantinaggi,eventi,tipiEvento,tracciamento,dbLoaded]);



  const nomAg=id=>{const a=agenti.find(a=>a.id===Number(id));return a?`${a.nome} ${a.cognome}`:"—";};
  // % dell'agente dal SUO PROFILO (Impostazioni) — fonte di verità. lato: "listing" | "acquirente"
  // Nota: uso ?? e controllo esplicito per non trasformare lo 0 del Broker in un default.
  const pctAg=(id,lato)=>{const a=agenti.find(a=>a.id===Number(id));if(!a)return null;return lato==="listing"?Number(a.percListing||0):Number(a.percAcquirente||0);};
  const statoInc=i=>{
    if(i.stato==="Venduto") return "Venduto";
    if(i.stato==="Locato") return "Locato";
    // Stato automatico in base alle proposte collegate non concluse
    const propColl=proposte.filter(p=>p.incaricoId===i.id&&!p.archiviato);
    const haVincolo=propColl.some(p=>p.stato==="Accettata con Vincolo");
    const haAttesa=propColl.some(p=>["In attesa","In attesa / Vincolata","Controproposta"].includes(p.stato));
    if(haVincolo) return "Accettata con Vincolo";
    if(haAttesa) return "In trattativa";
    if(isScad(i.scadenza)) return "Scaduto";
    return "Attivo";
  };

  // Stato "pratica" derivato in automatico dai dati esistenti (incarico/proposte/venduti).
  // Venduto = provvigione maturata (preliminare / proposta accettata senza vincolo);
  // Rogitato = atto notarile fatto. Si determina da un marcatore ESPLICITO:
  //  - dataRogito valorizzata, oppure stato "Rogitata", oppure tipoAtto "Rogito"/"Rogito Diretto".
  // NON da dataAtto (che è anche la data del preliminare).
  const isRogitato = v => !!v && (!!v.dataRogito || v.stato==="Rogitata" || v.tipoAtto==="Rogito" || v.tipoAtto==="Rogito Diretto");
  const statoPratica=i=>{
    if(i.archiviato) return "Archiviata";
    const s=statoInc(i);
    if(s==="Scaduto") return "Scaduto";
    if(s==="Venduto"||s==="Locato"){
      const v=venduti.find(x=>Number(x.incaricoId)===Number(i.id));
      return isRogitato(v)?"Rogitato":"Venduto";
    }
    if(s==="In trattativa"||s==="Accettata con Vincolo") return "In trattativa";
    return "In vendita"; // Attivo
  };

  // Verifica se un incarico ha proposte bloccanti attive
  const hasPropBloccante = incId => proposte.some(p=>p.incaricoId===incId&&STATI_BLOCCANTI.includes(p.stato));

  const anniInc=useMemo(()=>Array.from(new Set(incarichi.map(i=>getAnno(i.dataInizio)).filter(Boolean))).sort().reverse(),[incarichi]);
  const anniProp=useMemo(()=>Array.from(new Set(proposte.map(p=>getAnno(p.dataStato)).filter(Boolean))).sort().reverse(),[proposte]);
  const anniVend=useMemo(()=>Array.from(new Set(venduti.map(v=>getAnno(dataCompAgenzia(v))).filter(Boolean))).sort().reverse(),[venduti]);
  const mesiInc=useMemo(()=>Array.from(new Set(incarichi.filter(i=>fIncAnno==="Tutti"||getAnno(i.dataInizio)===fIncAnno).map(i=>getMese(i.dataInizio)).filter(Boolean))).sort().reverse(),[incarichi,fIncAnno]);
  const mesiProp=useMemo(()=>Array.from(new Set(proposte.filter(p=>fPropAnno==="Tutti"||getAnno(p.dataStato)===fPropAnno).map(p=>getMese(p.dataStato)).filter(Boolean))).sort().reverse(),[proposte,fPropAnno]);
  const mesiFat=useMemo(()=>Array.from(new Set(venduti.filter(v=>fatAnno==="Tutti"||getAnno(dataCompAgenzia(v))===fatAnno).map(v=>getMese(dataCompAgenzia(v))).filter(Boolean))).sort().reverse(),[venduti,fatAnno]);
  const mesiReport=useMemo(()=>Array.from(new Set(venduti.filter(v=>reportAnno==="Tutti"||getAnno(dataCompAgenzia(v))===reportAnno).map(v=>getMese(dataCompAgenzia(v))).filter(Boolean))).sort().reverse(),[venduti,reportAnno]);

  const incFiltrati=useMemo(()=>{const arr=incarichi.filter(i=>{
    if(i.archiviato&&!mostraArchiviati) return false;
    if(i.categoria!==subInc) return false;
    // Agente: se vuole vede tutti, altrimenti solo i suoi
    if(!canViewAll&&myAgentId&&!incVistaTutti&&i.agenteListing!==myAgentId) return false;
    const s=statoInc(i);
    if(fIncStato!=="Tutti"){
      // "Attivo" è un macro-filtro: include Attivo, In trattativa, Accettata con Vincolo (tutti incarichi vivi)
      if(fIncStato==="Attivo"){
        if(!["Attivo","In trattativa","Accettata con Vincolo"].includes(s)) return false;
      } else if(s!==fIncStato) return false;
    }
    if(fIncAnno!=="Tutti"&&getAnno(i.dataInizio)!==fIncAnno) return false;
    if(fIncMese!=="Tutti"&&getMese(i.dataInizio)!==fIncMese) return false;
    if(fIncAg!=="Tutti"&&i.agenteListing!==Number(fIncAg)) return false;
    if(fIncMirino&&!mirino[String(i.id)]) return false;
    // Ricerca testuale (live, multi-parola)
    if(!matchSearch(searchIncarichi, i.comune, i.indirizzo, i.tipologia, i.nominativo, i.note, i.fonte)) return false;
    return true;
  });
  const cmpData=(x,y,dir)=>{ if(!x&&!y)return 0; if(!x)return 1; if(!y)return -1; return dir==="desc"?y.localeCompare(x):x.localeCompare(y); };
  arr.sort((a,b)=>{
    switch(ordineInc){
      case "vecchi": return cmpData(a.dataInizio,b.dataInizio,"asc");
      case "scadenza": { if(!a.scadenza&&!b.scadenza)return 0; if(!a.scadenza)return 1; if(!b.scadenza)return -1; return a.scadenza.localeCompare(b.scadenza); }
      case "prezzoAlto": return Number(b.prezzoRichiesto||0)-Number(a.prezzoRichiesto||0);
      case "prezzoBasso": return Number(a.prezzoRichiesto||0)-Number(b.prezzoRichiesto||0);
      default: return cmpData(a.dataInizio,b.dataInizio,"desc"); // recenti (default)
    }
  });
  return arr;
  },[incarichi,subInc,fIncStato,fIncAnno,fIncMese,fIncAg,fIncMirino,mirino,mostraArchiviati,isBroker,myAgentId,incVistaTutti,searchIncarichi,ordineInc]);

  const cntInc=useMemo(()=>{
    const b=incarichi.filter(i=>{
      if(i.archiviato)return false;
      if(i.categoria!==subInc)return false;
      // Agente vede solo i propri
      if(!canViewAll&&myAgentId&&i.agenteListing!==myAgentId)return false;
      if(fIncAnno!=="Tutti"&&getAnno(i.dataInizio)!==fIncAnno)return false;
      if(fIncMese!=="Tutti"&&getMese(i.dataInizio)!==fIncMese)return false;
      if((isBroker||isBackOffice)&&fIncAg!=="Tutti"&&i.agenteListing!==Number(fIncAg))return false;
      return true;
    });
    return{attivi:b.filter(i=>["Attivo","In trattativa","Accettata con Vincolo"].includes(statoInc(i))).length,scaduti:b.filter(i=>statoInc(i)==="Scaduto").length,venduti:b.filter(i=>statoInc(i)==="Venduto"||statoInc(i)==="Locato").length};
  },[incarichi,subInc,fIncAnno,fIncMese,fIncAg,isBroker,myAgentId]);

  const propFiltrate=useMemo(()=>{const arr=proposte.filter(p=>{
    if(p.categoria!==subProp) return false;
    // Agente vede solo le proprie proposte
    if(!canViewAll&&!isBackOffice&&myAgentId&&Number(p.agenteAcquirente)!==myAgentId&&Number(p.agenteListing)!==myAgentId&&Number(p.buyerListing)!==myAgentId&&Number(p.buyer)!==myAgentId) return false;
    if(fPropStato!=="Tutti"&&p.stato!==fPropStato) return false;
    if(fPropAnno!=="Tutti"&&getAnno(p.dataStato)!==fPropAnno) return false;
    if(fPropMese!=="Tutti"&&getMese(p.dataStato)!==fPropMese) return false;
    if(fPropAg!=="Tutti"&&Number(p.agenteAcquirente)!==Number(fPropAg)&&Number(p.agenteListing)!==Number(fPropAg)) return false;
    // Ricerca testuale (live, multi-parola)
    if(!matchSearch(searchProposte, p.comuneImmobile, p.indirizzoImmobile, p.tipologia, p.nominativoVenditore, p.nomeAcquirente, p.noteStato)) return false;
    return true;
  });
  const cmpD=(x,y,dir)=>{ if(!x&&!y)return 0; if(!x)return 1; if(!y)return -1; return dir==="desc"?y.localeCompare(x):x.localeCompare(y); };
  arr.sort((a,b)=>{
    switch(ordineProp){
      case "vecchi": return cmpD(a.dataStato,b.dataStato,"asc");
      case "scadenza": { if(!a.scadenzaProposta&&!b.scadenzaProposta)return 0; if(!a.scadenzaProposta)return 1; if(!b.scadenzaProposta)return -1; return a.scadenzaProposta.localeCompare(b.scadenzaProposta); }
      case "prezzoAlto": return Number(b.prezzoOfferto||0)-Number(a.prezzoOfferto||0);
      case "prezzoBasso": return Number(a.prezzoOfferto||0)-Number(b.prezzoOfferto||0);
      default: return cmpD(a.dataStato,b.dataStato,"desc"); // recenti
    }
  });
  return arr;
  },[proposte,subProp,fPropStato,fPropAnno,fPropMese,fPropAg,isBroker,myAgentId,searchProposte,ordineProp]);

  const cntProp=useMemo(()=>({attesa:propFiltrate.filter(p=>["In attesa","In attesa / Vincolata"].includes(p.stato)).length,vincolo:propFiltrate.filter(p=>p.stato==="Accettata con Vincolo").length,accettate:propFiltrate.filter(p=>p.stato==="Accettata").length,rifiutate:propFiltrate.filter(p=>["Rifiutata","Mancata Chiusura"].includes(p.stato)).length}),[propFiltrate]);

  const vendFiltrati=useMemo(()=>{const arr=venduti.filter(v=>{
    if(v.categoria!==subVend) return false;
    // Agente vede solo i propri venduti
    if(!canViewAll&&!isBackOffice&&myAgentId&&Number(v.agenteListing)!==myAgentId&&Number(v.agenteAcquirente)!==myAgentId&&Number(v.buyerListing)!==myAgentId&&Number(v.buyer)!==myAgentId) return false;
    const stato=calcolaStatoIncasso(v);
    if(fVendStato!=="Tutti"&&stato!==fVendStato) return false;
    if(fVendRogito!=="Tutti"){
      if(v.categoria==="affitto") return false;
      if(fVendRogito==="Rogitati"&&!isRogitato(v)) return false;
      if(fVendRogito==="Da rogitare"&&isRogitato(v)) return false;
    }
    if(fVendAnno!=="Tutti"&&getAnno(dataCompAgenzia(v))!==fVendAnno) return false;
    if(fVendAg!=="Tutti"&&Number(v.agenteListing)!==Number(fVendAg)&&Number(v.agenteAcquirente)!==Number(fVendAg)) return false;
    // Ricerca testuale (live, multi-parola)
    if(!matchSearch(searchVenduti, v.comuneImmobile, v.indirizzoImmobile, v.tipologia, v.nominativoVenditore, v.nomeAcquirente, v.note)) return false;
    return true;
  });
  const cmpD=(x,y,dir)=>{ if(!x&&!y)return 0; if(!x)return 1; if(!y)return -1; return dir==="desc"?y.localeCompare(x):x.localeCompare(y); };
  arr.sort((a,b)=>{
    switch(ordineVend){
      case "vecchi": return cmpD(dataCompAgenzia(a),dataCompAgenzia(b),"asc");
      case "scadenzaIncasso": { if(!a.scadenzaIncasso&&!b.scadenzaIncasso)return 0; if(!a.scadenzaIncasso)return 1; if(!b.scadenzaIncasso)return -1; return a.scadenzaIncasso.localeCompare(b.scadenzaIncasso); }
      case "prezzoAlto": return Number(b.prezzoVendita||0)-Number(a.prezzoVendita||0);
      case "prezzoBasso": return Number(a.prezzoVendita||0)-Number(b.prezzoVendita||0);
      default: return cmpD(dataCompAgenzia(a),dataCompAgenzia(b),"desc"); // recenti
    }
  });
  return arr;
  },[venduti,subVend,fVendStato,fVendRogito,fVendAnno,fVendAg,isBroker,myAgentId,searchVenduti,ordineVend]);

  const cntVend=useMemo(()=>({
    daIncassare:vendFiltrati.filter(v=>calcolaStatoIncasso(v)==="Da incassare").length,
    parziale:vendFiltrati.filter(v=>calcolaStatoIncasso(v)==="Parziale").length,
    incassato:vendFiltrati.filter(v=>calcolaStatoIncasso(v)==="Incassato").length,
  }),[vendFiltrati]);

  const dashVend=useMemo(()=>venduti.filter(v=>{
    if(v.categoria!=="vendita") return false;
    if(dashAnno==="Tutti") return true;
    return getAnno(dataCompAgenzia(v))===dashAnno;
  }),[venduti,dashAnno]);
  const dashInc=useMemo(()=>incarichi.filter(i=>i.categoria==="vendita"&&!i.archiviato&&(dashAnno==="Tutti"||getAnno(i.dataInizio)===dashAnno)),[incarichi,dashAnno]);
  const vendReport=useMemo(()=>venduti.filter(v=>{
    // Report Agenti filtra SEMPRE per competenza AGENZIA
    const dataRif=dataCompAgenzia(v);
    if(reportAnno!=="Tutti"&&getAnno(dataRif)!==reportAnno)return false;
    if(reportMese!=="Tutti"&&getMese(dataRif)!==reportMese)return false;
    return true;
  }),[venduti,reportAnno,reportMese]);

  // Dashboard calcoli — tutti useMemo per aggiornamento in tempo reale
  const dashCalcoli = useMemo(()=>{
    const tuttiVendVendita = venduti.filter(v=>{
      if(v.categoria!=="vendita") return false;
      if(dashAnno==="Tutti") return true;
      return getAnno(dataCompAgenzia(v))===dashAnno;
    });
    const nonBroker = agenti.filter(a=>a.profilo!=="Broker");

    // INCASSATO = somma reale di tutti gli acconti e saldi registrati
    let incassato=0, daIncassare=0;
    let qAgInc=0, qBuyInc=0, qAgRes=0, qBuyRes=0;

    tuttiVendVendita.forEach(v=>{
      const incV=calcolaIncassatoV(v);
      const incA=calcolaIncassatoA(v);
      const provvV=Number(v.provvVenditore||0);
      const provvA=Number(v.provvAcquirente||0);
      const residuoV=Math.max(0,provvV-incV);
      const residuoA=Math.max(0,provvA-incA);

      incassato += incV+incA;
      daIncassare += residuoV+residuoA;

      // Quote AGENTI su incassato (solo ruolo Listing o Acquirente, NON Buyer)
      nonBroker.forEach(a=>{
        if(v.agenteListing===a.id&&provvV>0) qAgInc+=incV*(Number(v.percListing||0)/100);
        if(v.agenteAcquirente===a.id&&provvA>0) qAgInc+=incA*(Number(v.percAcquirente||0)/100);
      });
      // Quote BUYER su incassato (solo ruolo Buyer, esclusi quelli già contati come Listing/Acquirente)
      if(v.buyerListing&&v.agenteListing!==v.buyerListing&&provvV>0) qBuyInc+=incV*(Number(v.percBuyerListing||0)/100);
      if(v.buyer&&v.agenteAcquirente!==v.buyer&&provvA>0) qBuyInc+=incA*(Number(v.percBuyer||0)/100);

      // Quote AGENTI su residuo
      nonBroker.forEach(a=>{
        if(v.agenteListing===a.id&&provvV>0) qAgRes+=residuoV*(Number(v.percListing||0)/100);
        if(v.agenteAcquirente===a.id&&provvA>0) qAgRes+=residuoA*(Number(v.percAcquirente||0)/100);
      });
      // Quote BUYER su residuo
      if(v.buyerListing&&v.agenteListing!==v.buyerListing&&provvV>0) qBuyRes+=residuoV*(Number(v.percBuyerListing||0)/100);
      if(v.buyer&&v.agenteAcquirente!==v.buyer&&provvA>0) qBuyRes+=residuoA*(Number(v.percBuyer||0)/100);
    });

    return {
      incassato, daIncassare,
      qAgInc, qBuyInc, qAgenziaInc: incassato-qAgInc-qBuyInc,
      qAgRes, qBuyRes, qAgenziaRes: daIncassare-qAgRes-qBuyRes,
    };
  },[venduti,agenti,dashAnno]);

  const {incassato:dashIncassato, daIncassare:dashDaIncassare,
         qAgInc, qBuyInc, qAgenziaInc, qAgRes, qBuyRes, qAgenziaRes} = dashCalcoli;

  const propVincolo=proposte.filter(p=>p.stato==="Accettata con Vincolo"&&p.categoria==="vendita"&&(dashAnno==="Tutti"||getAnno(p.dataStato)===dashAnno));
  const dashSospeso=propVincolo.reduce((s,p)=>s+Number(p.provvVenditore||0)+Number(p.provvAcquirente||0),0);
  const dashSospesoQuotaAg=useMemo(()=>propVincolo.reduce((s,p)=>{
    // Quota agenzia = provv totale - quote agenti - quote buyer
    // Le % vanno SEMPRE lette dalla pratica (p.percListing/p.percAcquirente/p.percBuyer/p.percBuyerListing),
    // perché ogni pratica può avere override rispetto al default agente.
    const pV=Number(p.provvVenditore||0); const pA=Number(p.provvAcquirente||0);
    let qAg=pV+pA;
    if(p.agenteListing) qAg-=pV*(Number(p.percListing||0)/100);
    if(p.agenteAcquirente) qAg-=pA*(Number(p.percAcquirente||0)/100);
    if(p.buyerListing&&p.buyerListing!==p.agenteListing) qAg-=pV*(Number(p.percBuyerListing||0)/100);
    if(p.buyer&&p.buyer!==p.agenteAcquirente) qAg-=pA*(Number(p.percBuyer||0)/100);
    return s+Math.max(0,qAg);
  },0),[propVincolo]);

  const agentiFattura=useMemo(()=>agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false),[agenti]);
  const fatAg=agenti.find(a=>a.id===Number(fatAgente));
  const fatturaDati=useMemo(()=>{
    if(!fatAgente) return [];
    const ag=agenti.find(a=>a.id===Number(fatAgente));
    if(!ag||ag.profilo==="Broker") return [];
    return venduti.filter(v=>{
      const stato=calcolaStatoIncasso(v);
      // Filtra per stato incasso se selezionato
      if(fatStatoIncasso!=="Tutti"&&stato!==fatStatoIncasso) return false;
      // Fatture agenti: usa dataCompetenzaAgente se impostata (quando l'agente deve ricevere),
      // altrimenti dataCompAgenzia
      const dataRif=(v.competenzaAgenteDiversa===true||v.competenzaAgenteDiversa==="true")&&v.dataCompetenzaAgente
        ?v.dataCompetenzaAgente
        :dataCompAgenzia(v);
      if(fatAnno!=="Tutti"&&getAnno(dataRif)!==fatAnno)return false;
      if(fatMese!=="Tutti"&&getMese(dataRif)!==fatMese)return false;
      return v.agenteListing===ag.id||v.agenteAcquirente===ag.id||v.buyerListing===ag.id||v.buyer===ag.id;
    }).map(v=>{
      const righe=[];
      if(v.agenteListing===ag.id&&Number(v.provvVenditore)>0)righe.push({tipo:"Venditore",cliente:v.nominativoVenditore,provvAgenzia:Number(v.provvVenditore),percAg:Number(v.percListing||0),quotaAg:Number(v.provvVenditore)*Number(v.percListing||0)/100});
      if(v.agenteAcquirente===ag.id&&Number(v.provvAcquirente)>0)righe.push({tipo:"Acquirente",cliente:v.nomeAcquirente,provvAgenzia:Number(v.provvAcquirente),percAg:Number(v.percAcquirente||0),quotaAg:Number(v.provvAcquirente)*Number(v.percAcquirente||0)/100});
      if(v.buyerListing===ag.id&&v.agenteListing!==ag.id&&Number(v.provvVenditore)>0)righe.push({tipo:"Buyer L",cliente:v.nominativoVenditore,provvAgenzia:Number(v.provvVenditore),percAg:Number(v.percBuyerListing||0),quotaAg:Number(v.provvVenditore)*Number(v.percBuyerListing||0)/100});
      if(v.buyer===ag.id&&v.agenteAcquirente!==ag.id&&Number(v.provvAcquirente)>0)righe.push({tipo:"Buyer",cliente:v.nomeAcquirente,provvAgenzia:Number(v.provvAcquirente),percAg:Number(v.percBuyer||0),quotaAg:Number(v.provvAcquirente)*Number(v.percBuyer||0)/100});
      const totPratica=righe.reduce((s,r)=>s+r.quotaAg,0);
      const key=`${v.id}_${ag.id}`;
      const pag=pagamentiFatture[key]||{stato:"Da pagare",importoPagato:0,dataPagamento:"",note:""};
      return{v,righe,totPratica,key,pag};
    }).filter(x=>x.righe.length>0);
  },[agenti,venduti,fatAgente,fatAnno,fatMese,fatStatoIncasso,pagamentiFatture]);
  const totImponibile=fatturaDati.reduce((s,x)=>s+x.totPratica,0);
  const totPagato=fatturaDati.reduce((s,x)=>s+Number(x.pag.importoPagato||0),0);

  const emptyInc=(cat="vendita")=>({categoria:cat,codicePratica:"",agenteListing:"",percListing:0,buyerListing:"",percBuyerListing:0,fonte:"",nominativo:"",comune:"",indirizzo:"",tipologia:"",dataInizio:todayStr(),scadenza:"",prezzoRichiesto:"",prezzoReale:"",provvPrevista:"",proposteRicevute:0,origine:"manuale",riferimentoModulo:"",note:"",stato:"Attivo",archiviato:false,storicoRibassi:[]});
  const salvaInc=()=>{ if(isReadOnly){alert("Modalità sola lettura");return;}
    if(!formInc.nominativo||!formInc.comune)return;
    const inc={...formInc,id:showInc==="new"?Date.now():showInc.id,prezzoRichiesto:Number(formInc.prezzoRichiesto),prezzoReale:Number(formInc.prezzoReale),provvPrevista:Number(formInc.provvPrevista),proposteRicevute:Number(formInc.proposteRicevute||0),agenteListing:Number(formInc.agenteListing)||null,buyerListing:formInc.buyerListing?Number(formInc.buyerListing):null,percListing:Number(formInc.percListing||0),percBuyerListing:Number(formInc.percBuyerListing||0)};
    // Genero codice pratica se è un nuovo incarico e non ne ha già uno
    if(showInc==="new" && !inc.codicePratica){
      inc.codicePratica = generaCodicePratica(incarichi, inc.dataInizio);
    }
    showInc==="new"?setIncarichi([...incarichi,inc]):setIncarichi(incarichi.map(i=>i.id===showInc.id?inc:i));
    setShowInc(null);
  };

  const emptyProp=(cat="vendita",inc=null)=>({categoria:cat,tipo:inc?"da_incarico":"collaborazione",incaricoId:inc?inc.id:null,agenteListing:inc?inc.agenteListing:null,percListing:inc?inc.percListing:0,buyerListing:inc?inc.buyerListing:null,percBuyerListing:inc?inc.percBuyerListing:0,comuneImmobile:inc?inc.comune:"",indirizzoImmobile:inc?inc.indirizzo:"",tipologia:inc?inc.tipologia:"",nominativoVenditore:inc?inc.nominativo:"",agenziaEsterna:"",agenteAcquirente:"",percAcquirente:"",percProvvVenditore:"",percProvvAcquirente:"",buyer:"",percBuyer:0,nomeAcquirente:"",prezzoOfferto:"",vincolata:false,tipoVincolo:"",termineSubordine:"",scadenzaProposta:"",provvVenditore:inc?inc.provvPrevista:"",provvAcquirente:"",stato:"In attesa",noteStato:"",dataStato:todayStr(),dataVendita:"",dataAccettazione:"",storico:[{stato:"In attesa",data:nowISO()}],controproposte:[]});
  const salvaProp=()=>{ if(isReadOnly){alert("Modalità sola lettura");return;}
    if(!formProp.comuneImmobile||!formProp.nomeAcquirente){
      const mancano=[];
      if(!formProp.comuneImmobile) mancano.push("Comune");
      if(!formProp.nomeAcquirente) mancano.push("Nome acquirente");
      alert("Per salvare la proposta " + (mancano.length>1?"servono":"serve") + ": " + mancano.join(" e ") + ".");
      return;
    }
    if(showProp==="edit"){
      // Modifica proposta - aggiorna stato in base a vincolata
      const statoAttuale=formProp.stato;
      let nuovoStato=statoAttuale;
      if(formProp.vincolata&&statoAttuale==="In attesa") nuovoStato="In attesa / Vincolata";
      if(!formProp.vincolata&&statoAttuale==="In attesa / Vincolata") nuovoStato="In attesa";
      const upd={...formProp,stato:nuovoStato,prezzoOfferto:Number(formProp.prezzoOfferto),provvAcquirente:Number(formProp.provvAcquirente||0),provvVenditore:Number(formProp.provvVenditore||0),agenteAcquirente:Number(formProp.agenteAcquirente)||null,buyer:formProp.buyer?Number(formProp.buyer):null,percAcquirente:Number(formProp.percAcquirente||0)};
      setProposte(proposte.map(x=>x.id===upd.id?upd:x));
      setShowProp(null);
      return;
    }
    const statoIniziale=formProp.vincolata?"In attesa / Vincolata":"In attesa";
    const p={...formProp,id:Date.now(),prezzoOfferto:Number(formProp.prezzoOfferto),provvAcquirente:Number(formProp.provvAcquirente||0),provvVenditore:Number(formProp.provvVenditore||0),agenteAcquirente:Number(formProp.agenteAcquirente)||null,buyer:formProp.buyer?Number(formProp.buyer):null,percAcquirente:Number(formProp.percAcquirente||0),stato:statoIniziale,controproposte:[]};
    setProposte([...proposte,p]);setShowProp(null);
  };

  const salvaStatoProp=()=>{ if(isReadOnly){alert("Modalità sola lettura");return;}
    if(!showGestProp)return;
    const p=showGestProp; const ns=formStatoProp.stato||p.stato;
    const oggi=todayStr();
    const upd={...p,...formStatoProp,stato:ns,storico:[...(p.storico||[]),{stato:ns,data:nowISO(),note:formStatoProp.noteStato||""}]};
    // Se accettata → usa data dal form (non oggi automaticamente)
    if(ns==="Accettata"){
      upd.dataAccettazione=formStatoProp.dataAccettazione||"";
      upd.dataVendita=formStatoProp.dataAccettazione||"";
    }
    // Se vincolo positivo → usa data esito vincolo dal form
    if(ns==="Accettata con Vincolo"&&formStatoProp.esitoVincolo==="Positivo"){
      upd.dataAccettazione=formStatoProp.dataAccettazione||"";
      upd.dataVendita=formStatoProp.dataEsitoVincolo||formStatoProp.dataAccettazione||"";
    }
    // Se accettata con vincolo (senza esito ancora) → salva data accettazione vincolo
    if(ns==="Accettata con Vincolo"&&!formStatoProp.esitoVincolo){
      upd.dataAccettazione=formStatoProp.dataAccettazione||"";
    }
    setProposte(proposte.map(x=>x.id===p.id?upd:x));
    // Se esito vincolo positivo, stato diventa Accettata
    if(ns==="Accettata con Vincolo"&&formStatoProp.esitoVincolo==="Positivo") upd.stato="Accettata";
    if(ns==="Accettata"||(ns==="Accettata con Vincolo"&&formStatoProp.esitoVincolo==="Positivo")){
      const inc=incarichi.find(i=>i.id===p.incaricoId);const ag=agenti.find(a=>a.id===p.agenteAcquirente);
      const nv={id:Date.now(),categoria:p.categoria,propostaId:p.id,incaricoId:p.incaricoId,comuneImmobile:p.comuneImmobile,indirizzoImmobile:p.indirizzoImmobile,tipologia:p.tipologia,nominativoVenditore:p.nominativoVenditore,nomeAcquirente:p.nomeAcquirente,agenteListing:p.agenteListing,percListing:Number(p.percListing||0),buyerListing:p.buyerListing,percBuyerListing:Number(p.percBuyerListing||0),agenteAcquirente:p.agenteAcquirente,percAcquirente:Number(p.percAcquirente||ag?.percAcquirente||0),buyer:p.buyer,percBuyer:Number(p.percBuyer||0),prezzoVendita:Number(p.prezzoOfferto),provvVenditore:Number(p.provvVenditore||inc?.provvPrevista||0),provvAcquirente:Number(p.provvAcquirente||0),tipoAtto:"Preliminare",dataAtto:"",dataVendita:formStatoProp.dataEsitoVincolo||formStatoProp.dataAccettazione||"",statoIncasso:"Da incassare",acc1V:0,dataAcc1V:"",noteAcc1V:"",acc2V:0,dataAcc2V:"",noteAcc2V:"",saldoV:0,dataSaldoV:"",noteSaldoV:"",acc1A:0,dataAcc1A:"",noteAcc1A:"",acc2A:0,dataAcc2A:"",noteAcc2A:"",saldoA:0,dataSaldoA:"",noteSaldoA:"",incassatoVenditore:0,incassatoAcquirente:0,scadenzaIncasso:"",agenziaEsterna:p.agenziaEsterna||null,note:"",bloccato:false,dataCompetenzaAgente:"",competenzaAgenteDiversa:false,dataCompetenzaAgenzia:"",competenzaAgenziaDiversa:false};
      setVenduti([...venduti,nv]);
      if(p.incaricoId)setIncarichi(incarichi.map(i=>i.id===p.incaricoId?{...i,stato:p.categoria==="affitto"?"Locato":"Venduto"}:i));
    }
    // Vincolo NEGATIVO: la proposta decade (Mancata Chiusura), l'incarico torna Attivo libero
    if(ns==="Accettata con Vincolo"&&formStatoProp.esitoVincolo==="Negativo"){
      const updNeg={...upd,stato:"Mancata Chiusura",esitoVincolo:"Negativo",dataEsitoVincolo:formStatoProp.dataEsitoVincolo||todayStr(),restituzione:{pending:true,assegni:false,comunicato:false,mutuo:/mutuo/i.test(p.tipoVincolo||"")},noteStato:(formStatoProp.noteStato||"")+" [Vincolo non avverato]",storico:[...(p.storico||[]),{stato:"Mancata Chiusura",data:nowISO(),note:"Vincolo "+(p.tipoVincolo||"")+" non avverato"}]};
      setProposte(proposte.map(x=>x.id===p.id?updNeg:x));
      // L'incarico torna Attivo (lo stato è comunque calcolato automaticamente da statoInc, ma resetto il flag esplicito)
      if(p.incaricoId)setIncarichi(incarichi.map(i=>i.id===p.incaricoId&&(i.stato==="Venduto"||i.stato==="Locato")?{...i,stato:"Attivo"}:i));
      setShowGestProp(null);
      return;
    }
    setShowGestProp(null);
  };

  // Sostituzione di una proposta subordinata (Accettata con Vincolo) con una nuova proposta migliore.
  // La vecchia subordinata viene marcata "Mancata Chiusura" con nota; si apre il form per la nuova proposta.
  const sostituisciSubordinata=(propVecchia)=>{
    if(isReadOnly){alert("Modalità sola lettura");return;}
    if(!confirm(`Vuoi sostituire la proposta subordinata di ${propVecchia.nomeAcquirente||"questo acquirente"}?\n\nLa proposta attuale verrà archiviata come "Mancata Chiusura" e potrai inserire la nuova proposta.`)) return;
    // Archivio la vecchia come Mancata Chiusura
    const updVecchia={...propVecchia,stato:"Mancata Chiusura",noteStato:(propVecchia.noteStato||"")+" [Sostituita da proposta migliore]",storico:[...(propVecchia.storico||[]),{stato:"Mancata Chiusura",data:nowISO(),note:"Sostituita da nuova proposta"}]};
    setProposte(proposte.map(x=>x.id===propVecchia.id?updVecchia:x));
    // Apro il form nuova proposta, ereditando i dati dall'incarico
    const inc=incarichi.find(i=>i.id===propVecchia.incaricoId);
    setFormProp(emptyProp(propVecchia.categoria, inc));
    setShowProp("new");
  };

  const salvaVend=()=>{ if(isReadOnly){alert("Sola lettura");return;}if(!showGestVend)return;const u={...showGestVend,...formVend};u.statoIncasso=calcolaStatoIncasso(u);setVenduti(venduti.map(v=>v.id===showGestVend.id?u:v));setShowGestVend(null);};
  // === MODALE INCASSO (vista Incassi → Nuovo / Modifica pagamento) ===
  // Apre il modale precompilando i campi (per modifica) o vuoto (per nuovo)
  const apriModaleIncasso=(venduto,lato,rata)=>{
    setPmSbloccato(false); // ogni apertura riparte bloccato
    if(rata){ // MODIFICA pagamento esistente
      const importoField = `${rata}${lato}`; // es. acc1V, saldoA
      const dataField = `data${rata.charAt(0).toUpperCase()+rata.slice(1)}${lato}`;
      const noteField = `note${rata.charAt(0).toUpperCase()+rata.slice(1)}${lato}`;
      setPmImporto(String(Number(venduto[importoField]||0)));
      setPmData(venduto[dataField]||todayStr());
      setPmNote(venduto[noteField]||"");
      setPmRata(rata);
      setPagamentoModale({mode:"edit",venduto,lato,rata});
    } else { // NUOVO pagamento — proponi la prima rata libera
      let rataLibera = "acc1";
      const acc1F = `acc1${lato}`, acc2F = `acc2${lato}`, saldoF = `saldo${lato}`;
      if(Number(venduto[acc1F]||0)>0&&Number(venduto[acc2F]||0)===0) rataLibera = "acc2";
      else if(Number(venduto[acc1F]||0)>0&&Number(venduto[acc2F]||0)>0) rataLibera = "saldo";
      setPmImporto("");
      setPmData(todayStr());
      setPmNote("");
      setPmRata(rataLibera);
      setPagamentoModale({mode:"new",venduto,lato});
    }
  };
  // Salva (nuovo o modifica) - aggiunge tracking chi/quando
  const salvaIncassoModale=()=>{
    if(isReadOnly){alert("Modalità sola lettura");return;}
    if(!pagamentoModale) return;
    const {venduto,lato} = pagamentoModale;
    const rata = pmRata;
    const importo = Number(pmImporto||0);
    if(importo<=0){alert("Inserisci un importo maggiore di 0");return;}
    if(!pmData){alert("Inserisci la data del pagamento");return;}
    const importoField = `${rata}${lato}`;
    const dataField = `data${rata.charAt(0).toUpperCase()+rata.slice(1)}${lato}`;
    const noteField = `note${rata.charAt(0).toUpperCase()+rata.slice(1)}${lato}`;
    const trackField = `track${rata.charAt(0).toUpperCase()+rata.slice(1)}${lato}`;
    // Tracking: chi ha fatto l'operazione e quando
    const utente = nomAg(myAgentId,agenti) || "Sistema";
    const azione = pagamentoModale.mode==="new" ? "registrato" : "modificato";
    const oraStr = new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
    const trackStr = `${azione} da ${utente} il ${fmtD(todayStr())} alle ${oraStr}`;
    const aggiornato = {
      ...venduto,
      [importoField]: importo,
      [dataField]: pmData,
      [noteField]: pmNote||"",
      [trackField]: trackStr
    };
    aggiornato.statoIncasso = calcolaStatoIncasso(aggiornato);
    setVenduti(venduti.map(v=>v.id===venduto.id?aggiornato:v));
    setPagamentoModale(null);
  };
  // Elimina pagamento (solo in modalità modifica)
  const eliminaIncassoModale=()=>{
    if(isReadOnly){alert("Modalità sola lettura");return;}
    if(!pagamentoModale||pagamentoModale.mode!=="edit") return;
    if(!window.confirm("Eliminare definitivamente questo pagamento?")) return;
    const {venduto,lato,rata} = pagamentoModale;
    const importoField = `${rata}${lato}`;
    const dataField = `data${rata.charAt(0).toUpperCase()+rata.slice(1)}${lato}`;
    const noteField = `note${rata.charAt(0).toUpperCase()+rata.slice(1)}${lato}`;
    const trackField = `track${rata.charAt(0).toUpperCase()+rata.slice(1)}${lato}`;
    const aggiornato = {
      ...venduto,
      [importoField]: 0,
      [dataField]: "",
      [noteField]: "",
      [trackField]: ""
    };
    aggiornato.statoIncasso = calcolaStatoIncasso(aggiornato);
    setVenduti(venduti.map(v=>v.id===venduto.id?aggiornato:v));
    setPagamentoModale(null);
  };
  const salvaPagamento=()=>{ if(isReadOnly){alert("Modalità sola lettura");return;}if(!showPagamento)return;setPagamentiFatture({...pagamentiFatture,[showPagamento.key]:{...formPagamento,importoPagato:Number(formPagamento.importoPagato||0)}});setShowPagamento(null);};
  const esporta=()=>{const b=new Blob([JSON.stringify({agenti,incarichi,proposte,venduti,fonti,tipologie,vincoli,tipiNeg,pagamentiFatture,archiviati,pratiche},null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`gestionale_${todayStr()}.json`;a.click();URL.revokeObjectURL(u);};
  const importa=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.agenti)setAgenti(d.agenti);if(d.incarichi)setIncarichi(d.incarichi);if(d.proposte)setProposte(d.proposte);if(d.venduti)setVenduti(d.venduti);if(d.fonti)setFonti(d.fonti);if(d.tipologie)setTipologie(d.tipologie);if(d.vincoli)setVincoli(d.vincoli);if(d.tipiNeg)setTipiNeg(d.tipiNeg);if(d.pagamentiFatture)setPagamentiFatture(d.pagamentiFatture);if(d.archiviati)setArchiviati(d.archiviati);if(d.pratiche)setPratiche(normPratiche(d.pratiche));alert("Importato!");}catch{alert("File non valido.");}};r.readAsText(f);e.target.value="";};

  const archiviaInc=(id)=>{
    const inc=incarichi.find(i=>i.id===id);
    if(!inc)return;
    setArchiviati([...archiviati,{...inc,dataArchiviazione:todayStr()}]);
    setIncarichi(incarichi.filter(i=>i.id!==id));
  };
  const ripristinaInc=(id)=>{
    const inc=archiviati.find(i=>i.id===id);
    if(!inc)return;
    setIncarichi([...incarichi,inc]);
    setArchiviati(archiviati.filter(i=>i.id!==id));
  };

  const archiviaProp=(id)=>{const p=proposte.find(x=>x.id===id);if(!p)return;setArchiviatiProp([...archiviatiProp,{...p,dataArchiviazione:todayStr()}]);setProposte(proposte.filter(x=>x.id!==id));};
  const ripristinaProp=(id)=>{const p=archiviatiProp.find(x=>x.id===id);if(!p)return;setProposte([...proposte,p]);setArchiviatiProp(archiviatiProp.filter(x=>x.id!==id));};
  const archiviaVend=(id)=>{const v=venduti.find(x=>x.id===id);if(!v)return;setArchiviatiVend([...archiviatiVend,{...v,dataArchiviazione:todayStr()}]);setVenduti(venduti.filter(x=>x.id!==id));};
  const ripristinaVend=(id)=>{const v=archiviatiVend.find(x=>x.id===id);if(!v)return;setVenduti([...venduti,v]);setArchiviatiVend(archiviatiVend.filter(x=>x.id!==id));};

  const aggiungiSpesaVoce=()=>{
    if(!modalCostoVoce||!formNuovaSpesa.importo) return;
    const voci=[...(costi[modalCostoVoce.anno]||mkCosti())];
    const nuovaSpesa={id:Date.now(),data:formNuovaSpesa.data,importo:Number(formNuovaSpesa.importo),desc:formNuovaSpesa.desc||"Spesa"};
    voci[modalCostoVoce.idx]={...voci[modalCostoVoce.idx],spese:[...(voci[modalCostoVoce.idx].spese||[]),nuovaSpesa]};
    if(!isReadOnly){setCosti({...costi,[modalCostoVoce.anno]:voci});}
    setModalCostoVoce({...modalCostoVoce,voce:voci[modalCostoVoce.idx]});
    setFormNuovaSpesa({data:todayStr(),importo:"",desc:""});
  };

  if(!sessionePronta) return(
    <div style={{minHeight:"100vh",background:BRAND.beige,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontSize:32,fontWeight:700,color:BRAND.oroD,fontFamily:"Georgia,serif"}}>c<span style={{color:BRAND.oro}}>a</span>sa</div>
    </div>
  );
  if(!utente) return <LoginPage onLogin={handleLogin}/>;
  if(!dbLoaded) return(
    <div style={{minHeight:"100vh",background:BRAND.beige,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{fontSize:32,fontWeight:700,color:BRAND.oroD,fontFamily:"Georgia,serif"}}>c<span style={{color:BRAND.oro}}>a</span>sa</div>
      <div style={{fontSize:14,color:"#aaa"}}>Caricamento dati in corso...</div>
      <div style={{width:200,height:4,background:"#e8e5e0",borderRadius:4,overflow:"hidden"}}>
        <div style={{height:"100%",borderRadius:4,background:BRAND.oro,animation:"loading 1.5s ease-in-out infinite",width:"60%"}}/>
      </div>
    </div>
  );

  const S={
    sec:{padding:isMobile?"0.75rem":"1.5rem",flex:1,overflowY:"auto",minWidth:0},
    g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10},
    g4:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"},
    fRow:{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center",fontSize:isMobile?12:13},
    sel:{fontSize:13,padding:"5px 8px",borderRadius:6,border:"0.5px solid #ccc",background:"#fff",color:BRAND.grigio},
    btn:{padding:"6px 12px",fontSize:13,borderRadius:6,border:"0.5px solid #ccc",background:"#fff",cursor:"pointer",color:BRAND.grigio},
    btnP:{padding:"7px 14px",fontSize:13,borderRadius:6,border:`1px solid ${BRAND.oro}`,background:BRAND.oro,cursor:"pointer",color:"#fff",fontWeight:500},
    btnG:{padding:"7px 14px",fontSize:13,borderRadius:6,border:"1px solid #27AE60",background:"#27AE60",cursor:"pointer",color:"#fff",fontWeight:500},
    btnD:{padding:"6px 12px",fontSize:13,borderRadius:6,border:"0.5px solid #E67E22",background:"#FEF0E0",cursor:"pointer",color:"#E67E22"},
    subTab:a=>({padding:"6px 14px",fontSize:13,cursor:"pointer",border:`1px solid ${a?BRAND.oro:"#ddd"}`,background:a?BRAND.oro:"#fff",color:a?"#fff":BRAND.grigio,borderRadius:6,fontWeight:a?500:400}),
    tblWrap:{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"auto",marginBottom:"1rem",maxHeight:"65vh"},
    tbl:{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700},
    th:{textAlign:"left",padding:"9px 12px",borderBottom:"0.5px solid #eee",color:"#999",fontWeight:500,fontSize:12,whiteSpace:"nowrap",background:"#fafaf8"},
    thC:{textAlign:"center",padding:"9px 12px",borderBottom:"0.5px solid #eee",color:"#999",fontWeight:500,fontSize:12,whiteSpace:"nowrap",background:"#fafaf8"},
    td:{padding:"9px 12px",borderBottom:"0.5px solid #f5f5f5",verticalAlign:"middle"},
    tdC:{padding:"9px 12px",borderBottom:"0.5px solid #f5f5f5",verticalAlign:"middle",textAlign:"center"},
    tdR:{padding:"9px 12px",borderBottom:"0.5px solid #f5f5f5",verticalAlign:"middle",textAlign:"right"},
    totRow:{background:BRAND.beige,fontWeight:500},
    card:c=>({background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"14px 16px",borderLeft:`3px solid ${c}`}),
    overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200},
    modal:{background:"#fff",borderRadius:12,border:"0.5px solid #ddd",padding:"1.5rem",width:"min(96vw,660px)",maxHeight:"90vh",overflowY:"auto"},
    lbl:{fontSize:12,color:"#999",display:"block",marginBottom:3},
    inp:{width:"100%",fontSize:13,padding:"7px 9px",borderRadius:6,border:"0.5px solid #ccc",background:"#fff",color:BRAND.grigio,boxSizing:"border-box"},
    cnt:{display:"flex",gap:12,marginBottom:"1rem",flexWrap:"wrap"},
    cntBox:c=>({background:"#fff",border:`1px solid ${c}22`,borderTop:`3px solid ${c}`,borderRadius:8,padding:"10px 18px",display:"flex",flexDirection:"column",alignItems:"center",minWidth:80}),
    hl:{background:BRAND.beige,borderRadius:8,padding:"10px 14px",marginBottom:10},
    warnBox:{background:"#FEF9E7",border:"1px solid #D4AC0D",borderRadius:8,padding:"1rem",marginBottom:10},
    divider:{borderTop:"0.5px solid #eee",margin:"12px 0"},
    tagRow:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8},
    tag:{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:6,background:BRAND.beige,border:"0.5px solid #ddd",fontSize:13},
    tagX:{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:14,lineHeight:1,padding:0},
    pageHdr:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8},
    thS:{textAlign:"left",padding:"7px 12px",borderBottom:"0.5px solid #eee",color:"#999",fontWeight:500,fontSize:12,whiteSpace:"nowrap",background:"#fafaf8"},
    tdS:{padding:"7px 12px",borderBottom:"0.5px solid #f5f5f5",verticalAlign:"middle",fontSize:12},
    tdRS:{padding:"7px 12px",borderBottom:"0.5px solid #f5f5f5",verticalAlign:"middle",textAlign:"right",fontSize:12},
    // Colori colonne agenti
    thL:{textAlign:"center",padding:"9px 8px",borderBottom:"0.5px solid #eee",color:"#2980B9",fontWeight:600,fontSize:11,whiteSpace:"nowrap",background:"#EAF4FB"},
    thA:{textAlign:"center",padding:"9px 8px",borderBottom:"0.5px solid #eee",color:"#8E44AD",fontWeight:600,fontSize:11,whiteSpace:"nowrap",background:"#F5EEF8"},
    tdL:{padding:"8px 8px",borderBottom:"0.5px solid #f5f5f5",verticalAlign:"middle",textAlign:"center",fontSize:12,background:"#EAF4FB22"},
    tdA:{padding:"8px 8px",borderBottom:"0.5px solid #f5f5f5",verticalAlign:"middle",textAlign:"center",fontSize:12,background:"#F5EEF822"},
  };

  const Sel=({value,onChange,children})=>(<select style={S.sel} value={value} onChange={e=>{e.stopPropagation();onChange(e.target.value);}} onClick={e=>e.stopPropagation()}>{children}</select>);
  const SubTabs=({value,onChange,options})=>(<div style={{display:"flex",gap:8}}>{options.map(o=><button key={o.v} style={S.subTab(value===o.v)} onClick={()=>onChange(o.v)}>{o.l}</button>)}</div>);
  const SettSec=({title,items,setItems,ph})=>{
    const [localVal,setLocalVal]=React.useState("");
    const aggiungi=()=>{if(localVal.trim()){setItems([...items,localVal.trim()]);setLocalVal("");}};
    return(<div style={{marginBottom:"1.25rem"}}>
      <h3 style={{fontSize:14,fontWeight:500,margin:"0 0 8px"}}>{title}</h3>
      <div style={S.tagRow}>{items.map(v=><span key={v} style={S.tag}>{v}<button style={S.tagX} onClick={()=>setItems(items.filter(x=>x!==v))}>✕</button></span>)}</div>
      <div style={{display:"flex",gap:8,maxWidth:380}}>
        <input style={S.inp} placeholder={ph} value={localVal} onChange={e=>setLocalVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")aggiungi();}}/>
        <button style={S.btnP} onClick={aggiungi}>+</button>
      </div>
    </div>);
  };

  const FiltriInc=()=>(<div style={S.fRow}>
    <Sel value={fIncAnno} onChange={v=>{setFIncAnno(v);setFIncMese("Tutti");}}><option value="Tutti">Tutti gli anni</option>{anniInc.map(a=><option key={a}>{a}</option>)}</Sel>
    <Sel value={fIncMese} onChange={setFIncMese}><option value="Tutti">Tutti i mesi</option>{mesiInc.map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}</Sel>
    <Sel value={fIncStato} onChange={setFIncStato}><option value="Tutti">Tutti gli stati</option>{["Attivo","In trattativa","Accettata con Vincolo","Scaduto",subInc==="affitto"?"Locato":"Venduto"].map(s=><option key={s}>{s}</option>)}</Sel>
    {(isBroker||isBackOffice)&&<Sel value={fIncAg} onChange={setFIncAg}><option value="Tutti">Tutti gli agenti</option>{agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</Sel>}
    <button onClick={()=>setFIncMirino(!fIncMirino)} title={fIncMirino?"Mostra tutti":"Mostra solo nel mirino"} style={{padding:"5px 12px",fontSize:12,borderRadius:6,border:`0.5px solid ${fIncMirino?"#E74C3C":"#ddd"}`,background:fIncMirino?"#FDECEC":"#fff",color:fIncMirino?"#E74C3C":"#888",cursor:"pointer",fontFamily:"inherit",fontWeight:fIncMirino?600:400}}>🎯 {fIncMirino?"Solo mirino":"Solo mirino"}</button>
  </div>);
  const FiltriProp=()=>(<div style={S.fRow}>
    <Sel value={fPropAnno} onChange={v=>{setFPropAnno(v);setFPropMese("Tutti");}}><option value="Tutti">Tutti gli anni</option>{anniProp.map(a=><option key={a}>{a}</option>)}</Sel>
    <Sel value={fPropMese} onChange={setFPropMese}><option value="Tutti">Tutti i mesi</option>{mesiProp.map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}</Sel>
    <Sel value={fPropStato} onChange={setFPropStato}><option value="Tutti">Tutti gli stati</option>{Object.keys(STATI_PROP).map(s=><option key={s}>{s}</option>)}</Sel>
    {(isBroker||isBackOffice)&&<Sel value={fPropAg} onChange={setFPropAg}><option value="Tutti">Tutti gli agenti</option>{agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</Sel>}
  </div>);
  const FiltriVend=()=>(<div style={S.fRow}>
    <Sel value={fVendAnno} onChange={setFVendAnno}><option value="Tutti">Tutti gli anni</option>{anniVend.map(a=><option key={a}>{a}</option>)}</Sel>
    <Sel value={fVendStato} onChange={setFVendStato}><option value="Tutti">Tutti gli stati</option>{Object.keys(STATI_INCASSO).map(s=><option key={s}>{s}</option>)}</Sel>
    <Sel value={fVendRogito} onChange={setFVendRogito}><option value="Tutti">Rogito: tutti</option><option value="Da rogitare">📜 Da rogitare</option><option value="Rogitati">✓ Rogitati</option></Sel>
    {(isBroker||isBackOffice)&&<Sel value={fVendAg} onChange={setFVendAg}><option value="Tutti">Tutti gli agenti</option>{agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</Sel>}
  </div>);

  const BloccoFin=({titolo,colore,emoji,totale,qAgenzia,qAgenti,qBuyer})=>(
    <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden"}}>
      <div style={{background:colore,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:600,color:"#fff"}}>{emoji} {titolo}</span>
        <span style={{fontSize:20,fontWeight:700,color:"#fff"}}>€ {fmt(totale)}</span>
      </div>
      <div style={{padding:"10px 16px"}}>
        {[["Quota Agenzia",qAgenzia,colore],["Quota Agenti",qAgenti,"#2980B9"],["Quota Buyer",qBuyer,"#8E44AD"]].map(([l,v,c])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid #f5f5f5",fontSize:13}}>
            <span style={{color:"#888"}}>{l}</span><span style={{fontWeight:500,color:c}}>€ {fmt(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const currentTabCfg=TAB_CONFIG.find(t=>t.id===tab);

  return(
    <div style={{display:"flex",height:"100vh",background:BRAND.beige,overflow:"hidden",fontFamily:"'Georgia',serif",color:BRAND.grigio}}>
      {(!isMobile||showMobileMenu)&&<div style={isMobile?{position:"fixed",inset:0,zIndex:500,display:"flex"}:{}}>
        {isMobile&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)"}} onClick={()=>setShowMobileMenu(false)}/>}
        <Sidebar tab={tab} setTab={v=>{setTab(v);setShowMobileMenu(false);}} utente={utente} onEsporta={esporta} onImporta={importa} importRef={importRef}/>
      </div>}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <BarraApp permessi={utente?.permessi} onEsci={handleLogout}/>
        <div style={{background:"#fff",borderBottom:"0.5px solid #e8e5e0",padding:isMobile?"0.6rem 1rem":"0.875rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isMobile&&<button onClick={()=>setShowMobileMenu(true)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:BRAND.grigio,padding:"0 8px 0 0",lineHeight:1}}>☰</button>}
            <span style={{fontSize:18}}>{currentTabCfg?.icon}</span>
            <h1 style={{fontSize:15,fontWeight:600,margin:0}}>{currentTabCfg?.label}</h1>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {dbSaving&&<span style={{fontSize:11,color:"#aaa",display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:BRAND.oro,display:"inline-block",animation:"pulse 1s infinite"}}></span>Salvataggio...</span>}
            {!dbSaving&&dbLoaded&&<span style={{fontSize:11,color:"#27AE60"}}>✓ Sincronizzato</span>}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>

          {isReadOnly&&<div style={{position:"sticky",top:0,zIndex:50,background:"#0C447C",color:"#fff",padding:"6px 0",fontSize:12,fontWeight:500,textAlign:"center",letterSpacing:".02em"}}>👁 Sola lettura — navigazione permessa, modifiche bloccate</div>}
          {/* DASHBOARD */}
          {rogitoModal&&(<div style={S.overlay} onClick={()=>setRogitoModal(null)}>
            <div style={{...S.modal,width:"min(94vw,360px)"}} onClick={e=>e.stopPropagation()}>
              <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:600,color:"#1D8A5F"}}>✓ Segna rogitato</h3>
              <p style={{margin:"0 0 14px",fontSize:12,color:"#888"}}>Indica la data in cui è avvenuto il rogito.</p>
              <label style={{display:"block",fontSize:11,color:"#888",marginBottom:4}}>Data del rogito</label>
              <input type="date" value={rogitoModal.data||""} onChange={e=>setRogitoModal({...rogitoModal,data:e.target.value})} style={{fontSize:14,border:"0.5px solid #ccc",borderRadius:8,padding:"8px 10px",fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
              <div style={{display:"flex",gap:8,marginTop:18,justifyContent:"flex-end"}}>
                <button onClick={()=>setRogitoModal(null)} style={{fontSize:13,padding:"8px 14px",borderRadius:8,border:"0.5px solid #ddd",background:"#fff",color:"#888",cursor:"pointer",fontFamily:"inherit"}}>Annulla</button>
                <button onClick={()=>{ if(!rogitoModal.data){alert("Seleziona la data del rogito.");return;} setVenduti(venduti.map(x=>x.id===rogitoModal.vid?{...x,dataRogito:rogitoModal.data,stato:"Rogitata"}:x)); setRogitoModal(null); }} style={{fontSize:13,padding:"8px 16px",borderRadius:8,border:"none",background:"#1D8A5F",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Conferma rogito</button>
              </div>
            </div>
          </div>)}
          {tab==="Operatività"&&(()=>{
            // Chi vede tutto (Broker, BackOffice, Coach Agenzia) seleziona da menu; gli altri vedono solo sé
            const agentiVisibili = canViewAll ? agenti : agenti.filter(a=>a.id===myAgentId);
            const agIdSel = canViewAll ? (opAgenteSel==="Tutti"?null:Number(opAgenteSel)) : myAgentId;

            // Helper: ottieni/salva giornata
            const getGiornata = (agId,data) => (operativita[agId]||{})[data]||{};
            const salvaGiornata = (agId,data,dati) => { if(isReadOnly) return;
              setOperativita(prev=>({...prev,[agId]:{...(prev[agId]||{}),[data]:{...(getGiornata(agId,data)),...dati}}}));
            };

            // Helper: ottieni obiettivi mese
            const getObiettivi = (agId,mese) => (obiettiviOp[agId]||{})[mese]||{proposti:{},approvati:{},stato:"bozza"};
            const salvaObiettivi = (agId,mese,dati) => setObiettiviOp(prev=>({...prev,[agId]:{...(prev[agId]||{}),[mese]:dati}}));

            // Colori per categoria
            const CAT_CFG = {
              ricerca:{lbl:"Ricerca / acquisizione",clr:"#185FA5",bg:"#E6F1FB"},
              oh:{lbl:"Open House",clr:"#D85A30",bg:"#FAECE7"},
              immobile:{lbl:"Attività immobile",clr:"#085041",bg:"#E1F5EE"},
              operativo:{lbl:"Operativo / vendite",clr:"#633806",bg:"#FAEEDA"},
              sviluppo:{lbl:"Sviluppo",clr:"#3C3489",bg:"#EEEDFE"},
              marketing:{lbl:"Marketing / social",clr:"#3B6D11",bg:"#EAF3DE"},
              amm:{lbl:"Amministrativo",clr:"#444441",bg:"#F1EFE8"},
            };

            // Settimana corrente: lunedì→sabato
            const getSettimana = (dataRef) => {
              const d = new Date(dataRef);
              const dow = d.getDay()===0?6:d.getDay()-1; // 0=lun..5=sab
              const lun = new Date(d); lun.setDate(d.getDate()-dow);
              return Array.from({length:6},(_,i)=>{const x=new Date(lun);x.setDate(lun.getDate()+i);return x.toISOString().slice(0,10);});
            };
            const settimana = getSettimana(opDataSel);
            const lunedi = settimana[0];
            const sabato = settimana[5];
            const fmtGg = iso => {const d=new Date(iso);return ["Lun","Mar","Mer","Gio","Ven","Sab"][d.getDay()===0?6:d.getDay()-1]+" "+d.getDate();};

            // Conta attività giornata (per heatmap)
            const intensita = (agId,data) => {
              const g = getGiornata(agId,data);
              let tot = 0;
              tot += Number(g.chiamate||0)*2 + Number(g.appuntamenti||0)*5 + Number(g.acquisizioni||0)*10;
              tot += Number(g.oreRicerca||0)*3 + Number(g.oreSviluppo||0)*2 + Number(g.oreMarketing||0)*2;
              tot += (g.ohImmobili||[]).reduce((s,oh)=>s+Number(oh.visite||0)*3,0);
              if(tot===0) return "vuoto";
              if(tot<10) return "basso";
              if(tot<25) return "medio";
              return "alto";
            };
            const INT_CFG = {vuoto:{bg:"var(--color-background-secondary)",clr:"var(--color-text-tertiary)"},basso:{bg:"#E1F5EE",clr:"#085041"},medio:{bg:"#9FE1CB",clr:"#04342C"},alto:{bg:"#1D9E75",clr:"#fff"}};

            // Auto-compila dati da gestionale (opzione 3 - misto)
            const autoCompila = (agId,data) => {
              const existing = getGiornata(agId,data);
              // Proposte presentate in questa data
              const propPres = proposte.filter(p=>(p.agenteListing===agId||p.agenteAcquirente===agId)&&p.dataStato===data).length;
              // Proposte accettate
              const propAcc = proposte.filter(p=>(p.agenteListing===agId||p.agenteAcquirente===agId)&&p.dataStato===data&&p.stato==="Accettata").length;
              // Preliminari firmati (venduti con dataVendita=data e tipoAtto=Preliminare)
              const prelim = venduti.filter(v=>(v.agenteListing===agId||v.agenteAcquirente===agId)&&v.dataVendita===data&&v.tipoAtto==="Preliminare").length;
              // Rogiti
              const rogiti = venduti.filter(v=>(v.agenteListing===agId||v.agenteAcquirente===agId)&&v.dataAtto===data).length;
              return {...existing, propPresentate:propPres||existing.propPresentate||0, propAccettate:propAcc||existing.propAccettate||0, preliminari:prelim||existing.preliminari||0, rogiti:rogiti||existing.rogiti||0};
            };

            // Incarichi visibili all'agente per attività immobile
            const incarichiAgente = (agId) => incarichi.filter(i=>i.categoria==="vendita"&&!i.archiviato&&(i.agenteListing===agId||i.buyerListing===agId||i.buyer===agId));

            // Form giornata per un agente
            const FormGiornata = ({agId, data}) => {
              const cacheKey=`${agId}_${data}`;
              const g={...autoCompila(agId,data),...(opFormCache[cacheKey]||{})};
              const isSabato=new Date(data).getDay()===6;
              const upd=(k,v)=>{
                setOpFormCache(prev=>({...prev,[cacheKey]:{...(prev[cacheKey]||{}),[k]:v}}));
                salvaGiornata(agId,data,{[k]:v});
              };
              const updCh=(k,v)=>{
                const n={...(g.chiamate_tipi||{}),[k]:Math.max(0,Number(v))};
                const tot=Object.values(n).reduce((s,x)=>s+Number(x||0),0);
                setOpFormCache(prev=>({...prev,[cacheKey]:{...(prev[cacheKey]||{}),chiamate_tipi:n,chiamate:tot}}));
                salvaGiornata(agId,data,{chiamate_tipi:n,chiamate:tot});
              };
              const updN=(k,delta)=>upd(k,Math.max(0,(Number(g[k]||0))+delta));
              const updH=(k,delta)=>upd(k,Math.max(0,parseFloat(((Number(g[k]||0))+0.5*delta).toFixed(1))));
              const updChN=(k,delta)=>updCh(k,Math.max(0,(Number((g.chiamate_tipi||{})[k]||0))+delta));
              const updImm=(idx,k,v)=>{
                const arr=[...(g.attImm||[])];
                if(!arr[idx])arr[idx]={};
                arr[idx]={...arr[idx],[k]:v};
                setOpFormCache(prev=>({...prev,[cacheKey]:{...(prev[cacheKey]||{}),attImm:arr}}));
                salvaGiornata(agId,data,{attImm:arr});
              };
              const addImmobile=()=>{
                const arr=[...(g.attImm||[]),{incId:"",cartello:false,lettAMV:false,lettOH:false,volVend:false,reportProp:false,ribasso:false,tipoVol:"",modalita:"Di persona",copie:0}];
                setOpFormCache(prev=>({...prev,[cacheKey]:{...(prev[cacheKey]||{}),attImm:arr}}));
                salvaGiornata(agId,data,{attImm:arr});
              };
              const toggleChip=(k,tipo)=>{
                const cur=g[k]||[];
                const next=cur.includes(tipo)?cur.filter(t=>t!==tipo):[...cur,tipo];
                upd(k,next);
              };
              const incarichiAg=incarichi.filter(i=>i.categoria==="vendita"&&!i.archiviato&&(isBroker||i.agenteListing===agId));
              const ct=g.chiamate_tipi||{};
              const totCh=Object.values(ct).reduce((s,x)=>s+Number(x||0),0);

              // Stili locali
              const CARD={background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"14px 16px",marginBottom:10};
              const HDOT=(clr)=><div style={{width:4,height:18,borderRadius:2,background:clr,flexShrink:0}}/>;
              const HLBL=(lbl,clr,badge)=>(<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                {HDOT(clr)}
                <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:"#888"}}>{lbl}</span>
                {badge&&<span style={{marginLeft:"auto",fontSize:11,padding:"2px 8px",borderRadius:12,background:clr+"18",color:clr,fontWeight:600}}>{badge}</span>}
              </div>);
              const Stepper=({label,k,step=1,auto=false,last=false})=>{
                const val=step===0.5?`${g[k]||0}h`:(g[k]||0);
                return(<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:last?"none":"0.5px solid #f5f5f5"}}>
                  <span style={{fontSize:12,color:"#2c2c2c"}}>{label}{auto&&<span style={{fontSize:10,color:"#27AE60",marginLeft:4}}>✓</span>}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <button style={{width:28,height:28,borderRadius:5,border:"0.5px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:15,lineHeight:1,fontFamily:"inherit",color:"#555"}} onClick={()=>step===0.5?updH(k,-1):updN(k,-1)}>−</button>
                    <span style={{fontSize:13,fontWeight:600,minWidth:32,textAlign:"center",color:"#2c2c2c"}}>{val}</span>
                    <button style={{width:28,height:28,borderRadius:5,border:"0.5px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:15,lineHeight:1,fontFamily:"inherit",color:"#555"}} onClick={()=>step===0.5?updH(k,1):updN(k,1)}>+</button>
                  </div>
                </div>);
              };
              const StepperCh=({label,k,last=false})=>(
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:last?"none":"0.5px solid #f5f5f5"}}>
                  <span style={{fontSize:12,color:"#2c2c2c"}}>{label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <button style={{width:28,height:28,borderRadius:5,border:"0.5px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:15,lineHeight:1,fontFamily:"inherit",color:"#555"}} onClick={()=>updChN(k,-1)}>−</button>
                    <span style={{fontSize:13,fontWeight:600,minWidth:32,textAlign:"center",color:"#2c2c2c"}}>{ct[k]||0}</span>
                    <button style={{width:28,height:28,borderRadius:5,border:"0.5px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:15,lineHeight:1,fontFamily:"inherit",color:"#555"}} onClick={()=>updChN(k,1)}>+</button>
                  </div>
                </div>
              );
              const Chip=({label,k,tipo,clrOn="#185FA5"})=>{
                const on=(g[k]||[]).includes(tipo);
                return(<span onClick={()=>toggleChip(k,tipo)} style={{display:"inline-flex",padding:"5px 12px",borderRadius:20,fontSize:11,cursor:"pointer",border:`0.5px solid ${on?clrOn:"#ddd"}`,background:on?clrOn+"18":"#fafaf8",color:on?clrOn:"#888",fontWeight:on?500:400,marginBottom:5,marginRight:5,transition:"all .15s"}}>{label}</span>);
              };

              // Riepilogo badges
              const badges=[];
              if(totCh>0)badges.push({l:`📞 ${totCh} chiam.`,bg:"#E6F1FB",c:"#0C447C"});
              if(g.appuntamenti>0)badges.push({l:`🤝 ${g.appuntamenti} appt. acq.`,bg:"#FAEEDA",c:"#412402"});
              if(g.immVisitati>0)badges.push({l:`🏠 ${g.immVisitati} visitati`,bg:"#EAF3DE",c:"#173404"});
              if(g.postSocial>0)badges.push({l:`📱 ${g.postSocial} post`,bg:"#EEEDFE",c:"#26215C"});
              if((g.oreSviluppo||0)>0)badges.push({l:`📚 ${g.oreSviluppo}h sviluppo`,bg:"#E1F5EE",c:"#04342C"});
              if(g.mood)badges.push({l:g.mood==="top"?"😊 Ottima":g.mood==="ok"?"😐 Normale":"😓 Difficile",bg:g.mood==="top"?"#E9F7EF":g.mood==="ok"?"#f5f5f5":"#FCEBEB",c:g.mood==="top"?"#085041":g.mood==="ok"?"#444":"#A32D2D"});

              return(<div>
                {/* ─── A.1 CHIAMATE ─── */}
                <div style={CARD}>
                  {HLBL("Chiamate","#185FA5",totCh>0?`Totale: ${totCh}`:null)}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
                    <div>
                      <StepperCh label="Centri d'influenza" k="centri_inf"/>
                      <StepperCh label="Clienti passati" k="clienti_pass"/>
                      <StepperCh label="Privati" k="privati" last/>
                    </div>
                    <div>
                      <StepperCh label="Generica / Freddo" k="freddo"/>
                      <StepperCh label="Zona post volantino" k="zona_vol"/>
                      <StepperCh label="Follow-up notizie" k="followup" last/>
                    </div>
                  </div>
                </div>

                {/* ─── A.2 ACQUISIZIONE + VENDITA affiancati ─── */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <div style={CARD}>
                    {HLBL("Acquisizione","#A8863A")}
                    <Stepper label="Appt. fissati" k="appuntamenti"/>
                    <Stepper label="Presentaz./Valutaz." k="valutazioni"/>
                    <Stepper label="Immobili visitati" k="immVisitati"/>
                    <Stepper label="Ore telefono" k="oreTel" step={0.5}/>
                    <Stepper label="Ore zona" k="oreZona" step={0.5} last/>
                  </div>
                  <div style={CARD}>
                    {HLBL("Vendita","#533AB7")}
                    <Stepper label="Appt. acquirenti" k="apptAcq"/>
                    <Stepper label="OH effettuati" k="ohNum"/>
                    <Stepper label="Proposte" k="propPresentate" auto/>
                    <Stepper label="Preliminari" k="preliminari" auto/>
                    <Stepper label="Rogiti" k="rogiti" auto last/>
                  </div>
                </div>

                {/* ─── A.3 SOCIAL ─── */}
                <div style={{...CARD,marginBottom:20}}>
                  {HLBL("Social / Marketing","#3C3489")}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[["Post pubblicati","postSocial"],["Video","video"],["Stories / Reels","stories"]].map(([lbl,k])=>(
                      <div key={k} style={{textAlign:"center",padding:"10px 6px",background:"#fafaf8",borderRadius:8,border:"0.5px solid #f0f0f0"}}>
                        <div style={{fontSize:11,color:"#888",marginBottom:8}}>{lbl}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                          <button style={{width:28,height:28,borderRadius:5,border:"0.5px solid #ddd",background:"#f0f0f0",cursor:"pointer",fontSize:15,fontFamily:"inherit",color:"#555"}} onClick={()=>updN(k,-1)}>−</button>
                          <span style={{fontSize:18,fontWeight:600,color:"#3C3489",minWidth:24}}>{g[k]||0}</span>
                          <button style={{width:28,height:28,borderRadius:5,border:"0.5px solid #ddd",background:"#f0f0f0",cursor:"pointer",fontSize:15,fontFamily:"inherit",color:"#555"}} onClick={()=>updN(k,1)}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ─── B: ATTIVITA IMMOBILE ─── */}
                <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:".1em",color:"#aaa",marginBottom:8}}>B — Attività su immobili</div>
                <div style={CARD}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:(g.attImm||[]).length>0?12:0}}>
                    {HLBL("Attività immobile","#085041")}
                    <button style={{fontSize:11,padding:"4px 12px",borderRadius:6,border:"0.5px solid #085041",background:"transparent",cursor:"pointer",color:"#085041",marginBottom:10}} onClick={addImmobile}>+ Aggiungi immobile</button>
                  </div>
                  {(g.attImm||[]).length===0&&<p style={{fontSize:12,color:"#aaa",fontStyle:"italic",paddingBottom:4}}>Nessuna attività su immobili — clicca "+ Aggiungi immobile"</p>}
                  {(g.attImm||[]).map((att,idx)=>(
                    <div key={idx} style={{background:"#fafal8",borderRadius:8,padding:"10px 12px",marginBottom:8,border:"0.5px solid #e8e5e0"}}>
                      <select style={{width:"100%",fontSize:12,padding:"6px 10px",borderRadius:6,border:"0.5px solid #ddd",background:"#fff",marginBottom:10}} value={att.incId||""} onChange={e=>updImm(idx,"incId",e.target.value)}>
                        <option value="">— seleziona immobile —</option>
                        {incarichiAg.map(i=><option key={i.id} value={i.id}>{i.comune} — {i.indirizzo}</option>)}
                      </select>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
                        {[["cartello","Cartello AMV affisso","#e8e5e0"],["lettAMV","Lettera AMV","#e8e5e0"],["lettOH","Lettera OH distribuita","#e8e5e0"],["volVend","Volantino Venduto","#e8e5e0"]].map(([k,lbl])=>(
                          <label key={k} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,padding:"7px 10px",background:"#fafal8",borderRadius:6,cursor:"pointer",border:"0.5px solid #e8e5e0"}}>
                            <input type="checkbox" style={{accentColor:"#085041"}} checked={att[k]||false} onChange={e=>updImm(idx,k,e.target.checked)}/>{lbl}
                          </label>
                        ))}
                        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,padding:"7px 10px",background:"#FEF9E7",borderRadius:6,cursor:"pointer",border:"0.5px solid #D4AC0D44"}}>
                          <input type="checkbox" style={{accentColor:"#A8863A"}} checked={att.reportProp||false} onChange={e=>updImm(idx,"reportProp",e.target.checked)}/>Report al proprietario
                        </label>
                        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,padding:"7px 10px",background:"#FCEBEB",borderRadius:6,cursor:"pointer",border:"0.5px solid #E24B4A44"}}>
                          <input type="checkbox" style={{accentColor:"#E24B4A"}} checked={att.ribasso||false} onChange={e=>updImm(idx,"ribasso",e.target.checked)}/>Ribasso proposto
                        </label>
                      </div>
                      {(att.lettOH||att.lettAMV||att.volVend)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                        <div><div style={{fontSize:10,color:"#aaa",marginBottom:3}}>Tipo volantino</div>
                          <select style={{width:"100%",fontSize:11,padding:"5px 8px",borderRadius:5,border:"0.5px solid #ddd",background:"#fff"}} value={att.tipoVol||""} onChange={e=>updImm(idx,"tipoVol",e.target.value)}>
                            <option value="">—</option>{tipiVolantino.map(v=><option key={v}>{v}</option>)}
                          </select>
                        </div>
                        <div><div style={{fontSize:10,color:"#aaa",marginBottom:3}}>Modalità</div>
                          <select style={{width:"100%",fontSize:11,padding:"5px 8px",borderRadius:5,border:"0.5px solid #ddd",background:"#fff"}} value={att.modalita||"Di persona"} onChange={e=>updImm(idx,"modalita",e.target.value)}>
                            <option>Di persona</option><option>Distributore</option>
                          </select>
                        </div>
                        <div><div style={{fontSize:10,color:"#aaa",marginBottom:3}}>N° copie</div>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <button style={{width:26,height:26,borderRadius:4,border:"0.5px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:13,fontFamily:"inherit"}} onClick={()=>updImm(idx,"copie",Math.max(0,(att.copie||0)-10))}>−</button>
                            <span style={{fontSize:12,fontWeight:600,minWidth:28,textAlign:"center"}}>{att.copie||0}</span>
                            <button style={{width:26,height:26,borderRadius:4,border:"0.5px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:13,fontFamily:"inherit"}} onClick={()=>updImm(idx,"copie",(att.copie||0)+10)}>+</button>
                          </div>
                        </div>
                      </div>}
                    </div>
                  ))}
                </div>

                {/* ─── C: SVILUPPO, AMM, NOTE ─── */}
                <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:".1em",color:"#aaa",marginBottom:8,marginTop:4}}>C — Sviluppo, Amministrativo, Note</div>
                <div style={CARD}>
                  {/* Sviluppo */}
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#533AB7",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>Sviluppo professionale</div>
                    <div style={{marginBottom:10}}>
                      {["Corso / Formazione","Riunione team","One-to-one broker","Programmazione settimana","Formazione online","Coaching","Altro"].map(t=><Chip key={t} label={t} k="tipiSviluppoSel" tipo={t} clrOn="#533AB7"/>)}
                    </div>
                    {(g.tipiSviluppoSel||[]).length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div>
                        <div style={{fontSize:10,color:"#aaa",marginBottom:4}}>Ore totali sviluppo</div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <button style={{width:28,height:28,borderRadius:5,border:"0.5px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:15,fontFamily:"inherit"}} onClick={()=>updH("oreSviluppo",-1)}>−</button>
                          <span style={{fontSize:14,fontWeight:600,minWidth:32,textAlign:"center"}}>{g.oreSviluppo||0}h</span>
                          <button style={{width:28,height:28,borderRadius:5,border:"0.5px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:15,fontFamily:"inherit"}} onClick={()=>updH("oreSviluppo",1)}>+</button>
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:10,color:"#aaa",marginBottom:4}}>Note</div>
                        <input style={{width:"100%",fontSize:12,padding:"6px 8px",borderRadius:5,border:"0.5px solid #ddd",background:"#fff"}} value={g.noteSviluppo||""} placeholder="es. corso negoziazione..." onChange={e=>upd("noteSviluppo",e.target.value)}/>
                      </div>
                    </div>}
                  </div>
                  {/* Amministrativo */}
                  <div style={{borderTop:"0.5px solid #f0f0f0",paddingTop:16,marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#444441",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>Amministrativo / Back-office</div>
                    <div style={{marginBottom:10}}>
                      {["Pratiche e documenti","Inserimento gestionale","Email e comunicazioni","Fatturazione","Archivio","Altro"].map(t=><Chip key={t} label={t} k="tipiAmmSel" tipo={t} clrOn="#444441"/>)}
                    </div>
                    {(g.tipiAmmSel||[]).length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div>
                        <div style={{fontSize:10,color:"#aaa",marginBottom:4}}>Ore back-office</div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <button style={{width:28,height:28,borderRadius:5,border:"0.5px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:15,fontFamily:"inherit"}} onClick={()=>updH("oreAmm",-1)}>−</button>
                          <span style={{fontSize:14,fontWeight:600,minWidth:32,textAlign:"center"}}>{g.oreAmm||0}h</span>
                          <button style={{width:28,height:28,borderRadius:5,border:"0.5px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:15,fontFamily:"inherit"}} onClick={()=>updH("oreAmm",1)}>+</button>
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:10,color:"#aaa",marginBottom:4}}>Dettaglio</div>
                        <input style={{width:"100%",fontSize:12,padding:"6px 8px",borderRadius:5,border:"0.5px solid #ddd",background:"#fff"}} value={g.noteAmm||""} placeholder="es. pratica Maconi..." onChange={e=>upd("noteAmm",e.target.value)}/>
                      </div>
                    </div>}
                  </div>
                  {/* Note + Mood */}
                  <div style={{borderTop:"0.5px solid #f0f0f0",paddingTop:16}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>Note giornata</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
                      {[["top","😊","Ottima"],["ok","😐","Normale"],["hard","😓","Difficile"]].map(([v,em,lbl])=>(
                        <button key={v} onClick={()=>upd("mood",g.mood===v?"":v)} style={{padding:"10px 6px",fontSize:14,borderRadius:8,border:`1px solid ${g.mood===v?"#A8863A":"#e8e5e0"}`,background:g.mood===v?"#FEF9E7":"#fafal8",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          <span style={{fontSize:22}}>{em}</span>
                          <span style={{fontSize:10,color:g.mood===v?"#A8863A":"#888",fontWeight:g.mood===v?600:400}}>{lbl}</span>
                        </button>
                      ))}
                    </div>
                    <textarea style={{width:"100%",fontSize:12,padding:"8px",borderRadius:6,border:"0.5px solid #ddd",resize:"none",background:"#fff",lineHeight:1.6}} rows={3} value={g.note||""} placeholder="Annotazioni, idee, promemoria per domani..." onChange={e=>upd("note",e.target.value)}/>
                  </div>
                </div>

                {/* Riepilogo */}
                {badges.length>0&&<div style={{background:"#fafal8",borderRadius:10,padding:"10px 14px",marginBottom:10,border:"0.5px solid #e8e5e0"}}>
                  <div style={{fontSize:10,fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Riepilogo giornata</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {badges.map((b,i)=><span key={i} style={{fontSize:11,padding:"3px 9px",borderRadius:12,background:b.bg,color:b.c,fontWeight:500}}>{b.l}</span>)}
                  </div>
                </div>}

                <button disabled={isReadOnly} style={{width:"100%",padding:11,background:isReadOnly?"#ccc":opSaved?"#27AE60":"#A8863A",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:isReadOnly?"not-allowed":"pointer",transition:"background .3s"}} onClick={()=>{
                  if(isReadOnly)return;
                  const cached=opFormCache[cacheKey]||{};
                  salvaGiornata(agId,data,cached);
                  setOpSaved(true);
                  setTimeout(()=>setOpSaved(false),2000);
                }}>{isReadOnly?"👁 Solo lettura":opSaved?"✓ Salvato!":"Salva giornata"}</button>
              </div>);
            };

            // ── CALCOLI REPORT MENSILE ──────────────────────────────────────
            const calcReport = (agId, mese) => {
              const giorni = Object.entries(operativita[agId]||{}).filter(([d])=>d.startsWith(mese));
              const sum = (k) => giorni.reduce((s,[,g])=>s+Number(g[k]||0),0);
              const sumArr = (arr,k) => giorni.reduce((s,[,g])=>s+(g[arr]||[]).reduce((a,x)=>a+Number(x[k]||0),0),0);
              const sumNested = (parent,k) => giorni.reduce((s,[,g])=>s+Number((g[parent]||{})[k]||0),0);
              const chiamateTot = giorni.reduce((s,[,g])=>{const ct=g.chiamate_tipi||{};return s+Object.values(ct).reduce((a,v)=>a+Number(v||0),0);},0)||sum("chiamate");
              const ohVisite = sumArr("ohImmobili","visite");
              const ohNum = giorni.reduce((s,[,g])=>s+(g.ohImmobili||[]).length,0);
              const giorniCompilati = giorni.filter(([,g])=>Object.keys(g).some(k=>Number(g[k]||0)>0||g[k]===true)).length;
              const vendMese = venduti.filter(v=>(v.agenteListing===agId||v.agenteAcquirente===agId)&&dataCompAgenzia(v).startsWith(mese));
              const propMese = proposte.filter(p=>(p.agenteListing===agId||p.agenteAcquirente===agId)&&(p.dataStato||"").startsWith(mese));
              return {
                giorniCompilati, chiamate:chiamateTot, appuntamenti:sum("appuntamenti"), acquisizioni:sum("acquisizioni"),
                centri_inf:sumNested("chiamate_tipi","centri_inf"), clienti_pass:sumNested("chiamate_tipi","clienti_pass"),
                privati:sumNested("chiamate_tipi","privati"), freddo:sumNested("chiamate_tipi","freddo"),
                zona_vol:sumNested("chiamate_tipi","zona_vol"), followup:sumNested("chiamate_tipi","followup"),
                immVisitati:sum("immVisitati"), valutazioni:sum("valutazioni"),
                oreTel:sum("oreTel"), oreZona:sum("oreZona"), oreSviluppoRic:sum("oreSviluppoRic"),
                oreRicerca:sum("oreTel")+sum("oreZona")+sum("oreSviluppoRic"),
                propPresentate:Math.max(sum("propPresentate"),propMese.length),
                propAccettate:Math.max(sum("propAccettate"),propMese.filter(p=>p.stato==="Accettata"||p.stato==="Accettata con Vincolo").length),
                preliminari:Math.max(sum("preliminari"),vendMese.filter(v=>v.tipoAtto==="Preliminare").length),
                rogiti:vendMese.filter(v=>v.dataAtto).length,
                ohNum, ohVisite, postSocial:sum("postSocial"), video:sum("video"), stories:sum("stories"),
                oreSviluppo:sum("oreSviluppo"), oreAmm:sum("oreAmm"), oreMarketing:sum("postSocial"),
              };
            };

            const obMese = getObiettivi(agIdSel||myAgentId||agenti[0]?.id, opMeseSel);
            const ob = obMese.approvati && Object.keys(obMese.approvati).length>0 ? obMese.approvati : obMese.proposti;
            const rep = agIdSel ? calcReport(agIdSel, opMeseSel) : null;

            const S2 = {
              card:{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"1rem",marginBottom:"1rem"},
              sec:{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 8px"},
              kpi:{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 12px"},
              bar:(perc,clr)=><div style={{height:6,background:"#f0f0f0",borderRadius:3,overflow:"hidden",marginTop:4}}><div style={{height:"100%",width:`${Math.min(100,perc)}%`,background:clr,borderRadius:3,transition:"width 0.4s"}}/></div>,
            };

            return(
              <div style={S.sec}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
                  <h2 style={{fontSize:16,fontWeight:600,margin:0,color:"#2C2C2C"}}>📅 Operatività</h2>
                </div>

                {isReadOnly&&<div style={{background:"#EAF4FB",border:"1px solid #2980B944",borderRadius:8,padding:"10px 14px",marginBottom:"1rem",fontSize:13,color:"#2980B9",display:"flex",alignItems:"center",gap:8}}><span>👁</span><strong>Modalità sola lettura</strong></div>}
                {/* Main tab: Attività vs Piano Produzione */}
                <div style={{display:"flex",gap:4,background:"#f0f0f0",borderRadius:8,padding:4,width:"fit-content",marginBottom:"1.25rem"}}>
                  {[["attivita","⚙ Attività"],["piano","🎯 Piano Produzione"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setOpMainTab(v)} style={{padding:"7px 18px",fontSize:12,borderRadius:6,border:"none",background:opMainTab===v?"#fff":"transparent",color:opMainTab===v?"#A8863A":"#888",fontWeight:opMainTab===v?600:400,cursor:"pointer",fontFamily:"inherit",boxShadow:opMainTab===v?"0 1px 4px rgba(0,0,0,.12)":"none"}}>{l}</button>
                  ))}
                </div>
                {opMainTab==="attivita"&&<div>
                {/* Sotto-tab */}
                <div style={{display:"flex",gap:6,marginBottom:"1.25rem",borderBottom:"1px solid #eee",paddingBottom:"0.75rem",flexWrap:"wrap"}}>
                  {[{v:"oggi",l:"📅 Oggi"},{v:"settimana",l:"📆 Settimana"},{v:"report",l:"📊 Report mensile"},{v:"obiettivi",l:"🎯 Obiettivi mensili"}].map(o=>(
                    <button key={o.v} onClick={()=>setOpSubTab(o.v)} style={{padding:"6px 16px",fontSize:13,cursor:"pointer",border:"none",background:"none",borderBottom:`2px solid ${opSubTab===o.v?"#A8863A":"transparent"}`,color:opSubTab===o.v?"#A8863A":"#666",fontWeight:opSubTab===o.v?600:400,fontFamily:"inherit"}}>
                      {o.l}
                    </button>
                  ))}
                </div>
                {/* ── VISTA OGGI ── */}
                {opSubTab==="oggi"&&(()=>{
                  // ── LOGICA AGENTE/BROKER ──
                  // Il broker ha il SUO Oggi personale (default) E può guardare gli altri agenti dal selettore.
                  // Per il broker: opAgenteSel === "" o "self" = se stesso; numero = altro agente
                  const brokerVedeSeStesso = canViewAll && (opAgenteSel==="Tutti"||opAgenteSel===""||opAgenteSel==="self"||opAgenteSel===String(myAgentId));
                  const agIdSel = canViewAll
                    ? (brokerVedeSeStesso ? myAgentId : Number(opAgenteSel))
                    : myAgentId;
                  const dataSel = opDataSel||todayStr();
                  const agSel = agenti.find(a=>a.id===agIdSel);
                  // Sta vedendo i propri dati? (può modificare TUTTO inclusi spazi personali)
                  const stoGuardandomi = agIdSel===myAgentId;
                  // Posso modificare numeri? Solo se sto guardandomi
                  const puoModificare = stoGuardandomi && !isReadOnly;
                  // Vedo gli spazi personali? Solo se sto guardandomi
                  const vedoSpaziPersonali = stoGuardandomi;
                  const frase = getFraseDelGiorno();

                  // Dati giornata corrente
                  const datiOggi = (oggiDati[agIdSel]||{})[dataSel] || {};
                  const azioniOggi = datiOggi.azioni || {};
                  const conseguenzeOggi = datiOggi.conseguenze || {};
                  const tempoOggi = datiOggi.tempo || {};
                  const routineOggi = datiOggi.routine || {};
                  const spaziPersonaliOggi = datiOggi.spaziPersonali || [];

                  // Helper salvataggio
                  const salvaDatiOggi = (patch) => {
                    if(!agIdSel||!puoModificare) return;
                    setOggiDati(prev=>({
                      ...prev,
                      [agIdSel]:{
                        ...(prev[agIdSel]||{}),
                        [dataSel]:{
                          ...((prev[agIdSel]||{})[dataSel]||{}),
                          ...patch
                        }
                      }
                    }));
                  };
                  const aggiornaAzione = (azId, patch) => {
                    const cur = azioniOggi[azId]||{};
                    salvaDatiOggi({azioni:{...azioniOggi, [azId]:{...cur, ...patch}}});
                  };
                  const aggiornaConseguenza = (cId, val) => {
                    const nuovo={...conseguenzeOggi};
                    if(val===""||val===null||val===undefined||Number(val)===0) delete nuovo[cId];
                    else nuovo[cId]=Number(val);
                    salvaDatiOggi({conseguenze:nuovo});
                  };
                  const aggiornaTempo = (tId, val) => {
                    const nuovo={...tempoOggi};
                    if(val===""||val===null||val===undefined||Number(val)===0) delete nuovo[tId];
                    else nuovo[tId]=Number(val);
                    salvaDatiOggi({tempo:nuovo});
                  };
                  const toggleRoutine = (rId) => {
                    const cur = routineOggi[rId]||{};
                    salvaDatiOggi({routine:{...routineOggi, [rId]:{fatto:!cur.fatto, ora:!cur.fatto?new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}):""}}});
                  };
                  const toggleSpazio = (idx) => {
                    const nuovo=[...spaziPersonaliOggi];
                    nuovo[idx]={...nuovo[idx], fatto:!nuovo[idx].fatto};
                    salvaDatiOggi({spaziPersonali:nuovo});
                  };
                  const aggiungiSpazio = () => {
                    const nome=window.prompt("Nuovo spazio personale (solo tu lo vedi):");
                    if(!nome) return;
                    salvaDatiOggi({spaziPersonali:[...spaziPersonaliOggi, {id:Date.now(), nome, fatto:false}]});
                  };
                  const rimuoviSpazio = (idx) => {
                    if(!window.confirm("Rimuovere questo spazio personale?")) return;
                    const nuovo=spaziPersonaliOggi.filter((_,i)=>i!==idx);
                    salvaDatiOggi({spaziPersonali:nuovo});
                  };

                  // ── CONSIGLIATO DAL PIANO PRODUZIONE ──
                  // Per ogni azione, calcolo il "consigliato giornaliero":
                  // - Se l'azione è collegata al Piano (acquisizioni/appuntamenti) → derivo dai numeri del piano
                  // - Altrimenti uso consigliatoDefault dal catalogo
                  // Il Piano Produzione è in obiettivoAgente[agIdSel] = {fatturatoAnnuale, provvMedia, ...}
                  // I numeri derivati: acquisizioniNec/anno (default 13), apptAcqSettimana (default 1)
                  const pianoAg = obiettivoAgente?.[agIdSel] || {};
                  const acquisizioniNecAnno = Number(pianoAg.acquisizioniNec||0);
                  const apptAcqSettimana = Number(pianoAg.apptAcqSettimana||0);
                  // Distribuzione: 22 giorni lavorativi/mese, 6 giorni/settimana
                  const acquisizioniMese = acquisizioniNecAnno>0 ? acquisizioniNecAnno/12 : 0;
                  const apptAcqGiorno = apptAcqSettimana>0 ? apptAcqSettimana/6 : 0;
                  // Map azione → consigliato giornaliero
                  const getConsigliato = (az) => {
                    // Per le voci collegate al Piano, uso il calcolato (se >0)
                    // Per le altre, uso consigliatoDefault del catalogo
                    return Math.round(az.consigliatoDefault||0);
                  };

                  // Calcolo avanzamento azioni complessivo
                  const azioniAttive = catalogoAzioni.filter(a=>a.attivo);
                  let totTarget=0, totFatto=0, totAzioniConTarget=0, totAzioniCompletate=0;
                  azioniAttive.forEach(a=>{
                    const dati = azioniOggi[a.id]||{};
                    const t = Number(dati.target||0);
                    const f = Number(dati.fatto||0);
                    if(t>0){
                      totAzioniConTarget++;
                      totTarget+=t;
                      totFatto+=Math.min(f,t);
                      if(f>=t) totAzioniCompletate++;
                    }
                  });
                  const avanzamentoPerc = totTarget>0 ? Math.round(totFatto/totTarget*100) : 0;
                  const routineCompletate = Object.values(routineOggi).filter(r=>r&&r.fatto).length;
                  const dataObj = new Date(dataSel);
                  const giorniSett = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
                  const mesi=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
                  const settimanaCal = (()=>{
                    const d=new Date(dataObj);
                    d.setHours(0,0,0,0);
                    d.setDate(d.getDate()+4-(d.getDay()||7));
                    const yearStart=new Date(d.getFullYear(),0,1);
                    return Math.ceil(((d-yearStart)/86400000+1)/7);
                  })();

                  // Stili input
                  const inpNum={width:48,padding:"6px 4px",fontSize:14,fontWeight:600,border:`1px solid ${BRAND.oro}66`,borderRadius:6,textAlign:"center",fontFamily:"inherit",background:"#FFFEF9",color:BRAND.grigio,outline:"none"};
                  const inpNumGrande={width:60,padding:"7px 6px",fontSize:16,fontWeight:700,border:`1.5px solid ${BRAND.oro}88`,borderRadius:6,textAlign:"center",fontFamily:"inherit",background:"#FFFEF9",color:BRAND.oroD,outline:"none"};

                  // ── CHECK DI SICUREZZA ──
                  // Se non riusciamo a determinare un agente valido, mostra messaggio invece di crashare
                  if(!agIdSel||!agSel){
                    return(<div style={{textAlign:"center",padding:"3rem 1rem",color:"#888"}}>
                      <p style={{fontSize:18,marginBottom:8,color:BRAND.grigio,fontWeight:600}}>👤 Seleziona un agente</p>
                      <p style={{fontSize:13,color:"#aaa",marginBottom:20}}>Per visualizzare la giornata operativa serve un agente di riferimento.</p>
                      {canViewAll&&<select style={{...S.sel,fontSize:14,padding:"8px 14px",minWidth:220}} value={opAgenteSel} onChange={e=>setOpAgenteSel(e.target.value)}>
                        <option value="">— Seleziona —</option>
                        {myAgentId&&<option value="self">🏠 I miei dati</option>}
                        {agenti.filter(a=>["Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>👤 {a.nome} {a.cognome}</option>)}
                      </select>}
                      {!isBroker&&!isBackOffice&&!myAgentId&&<p style={{fontSize:12,color:"#E74C3C",marginTop:12,padding:"8px 14px",background:"#FDECEA",borderRadius:6,display:"inline-block"}}>⚠️ Il tuo utente non è associato a un agente. Contatta il broker per la configurazione.</p>}
                    </div>);
                  }

                  return(<>
                    {/* Selettore data e agente (broker può scegliere se stesso o altri) */}
                    <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center",flexWrap:"wrap"}}>
                      <input type="date" style={{...S.sel}} value={dataSel} onChange={e=>setOpDataSel(e.target.value)}/>
                      {canViewAll&&<select style={S.sel} value={brokerVedeSeStesso?"self":opAgenteSel} onChange={e=>setOpAgenteSel(e.target.value)}>
                        <option value="self">🏠 I miei dati</option>
                        <optgroup label="Vista di un agente">
                          {agenti.filter(a=>["Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false&&a.id!==myAgentId).map(a=><option key={a.id} value={a.id}>👤 {a.nome} {a.cognome}</option>)}
                        </optgroup>
                      </select>}
                      {!stoGuardandomi&&<div style={{padding:"6px 12px",background:"#EAF4FB",borderRadius:6,fontSize:12,color:"#2980B9",fontWeight:600,border:"0.5px solid #2980B944"}}>👁 Stai guardando {agSel?.nome} — sola lettura</div>}
                      {/* Stato salvataggio + bottone Salva ora */}
                      {puoModificare&&<div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <div style={{fontSize:11,color:dbSaving?"#E67E22":"#27AE60",fontWeight:600,padding:"5px 10px",background:dbSaving?"#FEF6E6":"#E8F8EF",borderRadius:6,border:`0.5px solid ${dbSaving?"#F39C1244":"#27AE6044"}`}}>
                          {dbSaving ? "⏳ Salvataggio..." : ultimoSalvataggio ? `✓ Salvato alle ${ultimoSalvataggio.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}` : "✓ Sincronizzato"}
                        </div>
                        <button onClick={salvaOraManuale} disabled={dbSaving} style={{...S.btn,fontSize:12,padding:"6px 14px",background:BRAND.oro,color:"#fff",border:"none",fontWeight:600,opacity:dbSaving?0.6:1,cursor:dbSaving?"default":"pointer"}}>💾 Salva ora</button>
                      </div>}
                    </div>

                    {/* HEADER MOTIVAZIONALE */}
                    <div style={{background:`linear-gradient(135deg, ${BRAND.oro}18 0%, ${BRAND.oro}08 100%)`,borderRadius:14,padding:"1.25rem 1.5rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,border:`1.5px solid ${BRAND.oro}55`,boxShadow:`0 2px 8px ${BRAND.oro}15`}}>
                      <div>
                        <p style={{fontSize:11,color:BRAND.oroD,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>{stoGuardandomi?"☀️ Buongiorno":"👁 Vista giornata di"}</p>
                        <h2 style={{margin:0,fontSize:24,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>{agSel?.nome} {agSel?.cognome}</h2>
                        <p style={{fontSize:13,color:"#666",margin:"5px 0 0",fontWeight:500}}>{giorniSett[dataObj.getDay()]} {dataObj.getDate()} {mesi[dataObj.getMonth()]} · settimana {settimanaCal}</p>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <p style={{fontSize:10,color:BRAND.oroD,margin:0,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>Avanzamento</p>
                        <p style={{fontSize:32,fontWeight:800,margin:"3px 0 0",color:avanzamentoPerc>=80?"#27AE60":avanzamentoPerc>=50?BRAND.oroD:avanzamentoPerc>0?"#E67E22":"#bbb",fontFamily:"Georgia,serif"}}>{avanzamentoPerc}%</p>
                        <p style={{fontSize:11,color:"#888",margin:0,fontWeight:500}}>{totAzioniCompletate} di {totAzioniConTarget} target</p>
                      </div>
                    </div>

                    {/* FRASE DEL GIORNO */}
                    <div style={{background:"#FDFBF7",borderRadius:10,padding:"14px 18px",marginBottom:"1.5rem",borderLeft:`4px solid ${BRAND.oro}`,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                      <p style={{margin:0,fontSize:15,fontStyle:"italic",color:BRAND.grigio,fontFamily:"Georgia,serif",lineHeight:1.5}}>"{frase.t}"</p>
                      <p style={{margin:"6px 0 0",fontSize:12,color:BRAND.oroD,fontWeight:600}}>— {frase.a}</p>
                    </div>

                    {/* ====== WIDGET OBIETTIVO DEL MESE ====== */}
                    {(()=>{
                      const meseSelOg=dataSel.substring(0,7); // YYYY-MM dalla data selezionata
                      const obMese=(getObiettivi(agIdSel,meseSelOg)?.proposti)||{};
                      const repMese=calcReport(agIdSel,meseSelOg);
                      const vociMese=[
                        {k:"chiamate",lbl:"Chiamate",icon:"📞",val:repMese.chiamate,clr:"#185FA5"},
                        {k:"appuntamenti",lbl:"Appt. acq.",icon:"🤝",val:repMese.appuntamenti,clr:"#633806"},
                        {k:"acquisizioni",lbl:"Acquisizioni",icon:"🏠",val:repMese.acquisizioni,clr:"#533AB7"},
                        {k:"oh",lbl:"Open House",icon:"🚪",val:repMese.ohNum,clr:"#D85A30"},
                        {k:"propPresentate",lbl:"Proposte",icon:"📝",val:repMese.propPresentate,clr:"#27AE60"},
                        {k:"immVisitati",lbl:"Imm. visitati",icon:"👁",val:repMese.immVisitati,clr:"#085041"},
                        {k:"oreTel",lbl:"Ore telefono",icon:"⏱",val:repMese.oreTel,clr:"#0F6E56"},
                        {k:"postSocial",lbl:"Post social",icon:"📱",val:repMese.postSocial,clr:"#3C3489"},
                      ];
                      const vociConOb=vociMese.filter(v=>Number(obMese[v.k]||0)>0);
                      const haObiettivi=vociConOb.length>0;
                      // Calcolo % media raggiungimento
                      const percMedia=haObiettivi?Math.round(vociConOb.reduce((s,v)=>{
                        const t=Number(obMese[v.k]||0);
                        const p=t>0?Math.min(100,Math.round(v.val/t*100)):0;
                        return s+p;
                      },0)/vociConOb.length):0;
                      const mesiN=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
                      const nomeMese=mesiN[parseInt(meseSelOg.substring(5,7))-1];

                      return(<div style={{background:`linear-gradient(135deg, #FDFBF7 0%, ${BRAND.oro}10 100%)`,border:`1.5px solid ${BRAND.oro}55`,borderRadius:12,padding:"1rem 1.25rem",marginBottom:"1.5rem"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:haObiettivi?12:0,flexWrap:"wrap",gap:8}}>
                          <div>
                            <h3 style={{margin:0,fontSize:15,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🎯 Il tuo obiettivo del mese</h3>
                            <p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>{nomeMese} {meseSelOg.substring(0,4)} · {haObiettivi?`${vociConOb.length} obiettivi attivi`:"nessun obiettivo impostato"}</p>
                          </div>
                          {haObiettivi&&<div style={{textAlign:"right"}}>
                            <div style={{fontSize:28,fontWeight:800,color:percMedia>=80?"#27AE60":percMedia>=50?BRAND.oroD:percMedia>0?"#E67E22":"#bbb",fontFamily:"Georgia,serif",lineHeight:1}}>{percMedia}%</div>
                            <div style={{fontSize:10,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>media mese</div>
                          </div>}
                        </div>

                        {haObiettivi?(
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginBottom:10}}>
                            {vociConOb.map(v=>{
                              const target=Number(obMese[v.k]||0);
                              const perc=Math.min(100,Math.round(v.val/target*100));
                              const raggiunto=v.val>=target;
                              return(<div key={v.k} style={{background:"#fff",borderRadius:8,padding:"8px 10px",border:`0.5px solid ${v.clr}33`}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                                  <span style={{fontSize:11,color:"#888",fontWeight:500}}>{v.icon} {v.lbl}</span>
                                  {raggiunto&&<span style={{fontSize:12}}>✓</span>}
                                </div>
                                <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:4}}>
                                  <span style={{fontSize:18,fontWeight:700,color:raggiunto?"#27AE60":v.clr}}>{v.val}</span>
                                  <span style={{fontSize:11,color:"#aaa"}}>/ {target}</span>
                                </div>
                                <div style={{height:3,background:"#f0f0f0",borderRadius:2,overflow:"hidden"}}>
                                  <div style={{height:"100%",width:`${perc}%`,background:raggiunto?"#27AE60":v.clr,borderRadius:2,transition:"width .4s"}}/>
                                </div>
                              </div>);
                            })}
                          </div>
                        ):(
                          <p style={{margin:"4px 0 10px",fontSize:13,color:"#888",fontStyle:"italic"}}>Non hai ancora impostato gli obiettivi per questo mese. Vai a "Obiettivi mensili" per definirli.</p>
                        )}

                        <div style={{display:"flex",justifyContent:"flex-end"}}>
                          <button onClick={()=>setOpSubTab("obiettivi")} style={{fontSize:12,padding:"6px 14px",borderRadius:6,border:`1px solid ${BRAND.oro}`,background:"transparent",color:BRAND.oroD,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                            {haObiettivi?"✏️ Modifica obiettivi":"➕ Imposta obiettivi"} →
                          </button>
                        </div>
                      </div>);
                    })()}

                    {/* ====== AZIONI OGGI ====== */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,padding:"0 2px"}}>
                      <h3 style={{margin:0,fontSize:14,fontWeight:600,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🎯 Azioni oggi</h3>
                      <span style={{fontSize:10,color:BRAND.oroD,fontWeight:500}}>💡 = suggerito · clicca per impostare</span>
                    </div>

                    {GRUPPI_AZIONI.map(gruppo=>{
                      const azioniDelGruppo = azioniAttive.filter(a=>a.gruppo===gruppo.id);
                      if(azioniDelGruppo.length===0) return null;
                      const colorGruppo = gruppo.id==="telefono"?"#2980B9":gruppo.id==="scritto"?"#8E44AD":gruppo.id==="social"?"#E91E63":"#E67E22";
                      // Totali gruppo
                      const totFatto = azioniDelGruppo.reduce((s,a)=>s+Number((azioniOggi[a.id]||{}).fatto||0),0);
                      const totTarget = azioniDelGruppo.reduce((s,a)=>s+Number((azioniOggi[a.id]||{}).target||0),0);
                      const percGruppo = totTarget>0?Math.round(totFatto/totTarget*100):0;
                      return(<div key={gruppo.id} style={{background:"#fff",borderRadius:8,marginBottom:8,overflow:"hidden",border:"0.5px solid #e8e5e0",borderLeft:`3px solid ${colorGruppo}`}}>
                        {/* Header gruppo: compatto */}
                        <div style={{padding:"6px 12px",background:"#fafaf8",borderBottom:"0.5px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:11,fontWeight:600,color:colorGruppo,textTransform:"uppercase",letterSpacing:".08em"}}>{gruppo.icona} {gruppo.nome}</span>
                          {totTarget>0&&<span style={{fontSize:10,color:"#aaa"}}>{totFatto}/{totTarget} totali · {percGruppo}%</span>}
                        </div>
                        {azioniDelGruppo.map((az,idx)=>{
                          const dati = azioniOggi[az.id]||{};
                          const target = Number(dati.target||0);
                          const fatto = Number(dati.fatto||0);
                          const consigliato = getConsigliato(az);
                          const perc = target>0 ? Math.min(100, Math.round(fatto/target*100)) : 0;
                          const completata = target>0&&fatto>=target;
                          const daFare = target>0&&fatto<target;
                          const clr = completata?"#1D9E75":perc>=66?"#A8863A":perc>=33?"#E67E22":perc>0?"#E74C3C":"#bbb";
                          const isLast = idx===azioniDelGruppo.length-1;
                          // Helper per cambio veloce con +/-
                          const setFatto = (nuovo) => aggiornaAzione(az.id,{fatto:Math.max(0,nuovo)});
                          return(<div key={az.id}>
                            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr auto":"1fr 60px 80px 100px 40px 36px",alignItems:"center",gap:8,padding:"6px 12px",borderBottom:isLast&&!az.hasTipoVolantino?"none":"0.5px solid #f8f8f5",background:completata?"#fafff5":target===0?"#fafaf8":"transparent",opacity:target===0&&!consigliato?0.6:1}}>
                              {/* Nome azione */}
                              <div style={{minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:500,color:completata?"#888":"#2C2C2C",textDecoration:completata?"line-through":"none",lineHeight:1.3}}>
                                  {az.nome}
                                </div>
                                {consigliato>0&&target===0&&puoModificare&&<button onClick={()=>aggiornaAzione(az.id,{target:consigliato})} style={{background:"none",border:"none",color:"#2980B9",cursor:"pointer",padding:"2px 0 0",fontSize:10,fontWeight:500,fontFamily:"inherit",textDecoration:"underline dotted"}}>💡 imposta target {consigliato}</button>}
                                {consigliato>0&&target>0&&target!==consigliato&&<span style={{fontSize:9,color:"#aaa",marginLeft:0,display:"block",paddingTop:1}}>💡 consigliato: {consigliato}</span>}
                              </div>
                              {/* Fatto/Target compatto */}
                              <div style={{display:"flex",alignItems:"center",gap:3,justifyContent:"center"}}>
                                <input type="number" min="0" value={fatto===0?"":fatto} placeholder="0" disabled={!puoModificare}
                                  onChange={e=>aggiornaAzione(az.id,{fatto:e.target.value===""?0:Number(e.target.value)})}
                                  style={{width:30,padding:"2px 4px",fontSize:13,fontWeight:600,border:"0.5px solid #e0ddd5",borderRadius:4,textAlign:"center",color:clr,fontFamily:"inherit",background:"#fff"}} title="Fatto"/>
                                <span style={{fontSize:11,color:"#aaa"}}>/</span>
                                <input type="number" min="0" value={target===0?"":target} placeholder="0" disabled={!puoModificare}
                                  onChange={e=>aggiornaAzione(az.id,{target:e.target.value===""?0:Number(e.target.value)})}
                                  style={{width:26,padding:"2px 3px",fontSize:11,fontWeight:500,border:"0.5px solid #e0ddd5",borderRadius:4,textAlign:"center",color:"#888",fontFamily:"inherit",background:"#fff"}} title="Target"/>
                              </div>
                              {/* Bottoni +/- rapidi */}
                              {puoModificare&&<div style={{display:"flex",alignItems:"center",gap:2}}>
                                <button onClick={()=>setFatto(fatto-1)} disabled={fatto<=0} style={{width:22,height:22,border:"0.5px solid #e0ddd5",background:"#fff",borderRadius:4,cursor:fatto<=0?"not-allowed":"pointer",fontSize:14,color:"#888",lineHeight:1,padding:0,opacity:fatto<=0?0.4:1}}>−</button>
                                <button onClick={()=>setFatto(fatto+1)} style={{width:22,height:22,border:`0.5px solid ${colorGruppo}`,background:colorGruppo,color:"#fff",borderRadius:4,cursor:"pointer",fontSize:14,lineHeight:1,padding:0}}>+</button>
                              </div>}
                              {/* Barra progresso */}
                              {!isMobile&&<div style={{height:6,background:"#f0ece4",borderRadius:3,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${perc}%`,background:clr,transition:"width .4s",borderRadius:3}}/>
                              </div>}
                              {/* Percentuale */}
                              {!isMobile&&<div style={{fontSize:11,fontWeight:600,color:clr,textAlign:"right"}}>{target>0?(completata?"✓ 100%":`${perc}%`):"—"}</div>}
                              {/* Badge stato */}
                              {!isMobile&&<div style={{textAlign:"center"}}>
                                {target===0&&consigliato>0&&<span style={{fontSize:9,color:"#fff",padding:"1px 5px",borderRadius:3,background:"#bbb",textTransform:"uppercase",letterSpacing:".04em",fontWeight:600}}>IMP</span>}
                                {daFare&&perc<33&&<span style={{fontSize:9,color:"#fff",padding:"1px 5px",borderRadius:3,background:BRAND.oro,textTransform:"uppercase",letterSpacing:".04em",fontWeight:600}}>FAI</span>}
                                {completata&&<span style={{fontSize:9,color:"#fff",padding:"1px 5px",borderRadius:3,background:"#1D9E75",textTransform:"uppercase",letterSpacing:".04em",fontWeight:600}}>OK</span>}
                              </div>}
                            </div>
                            {/* Selettore tipo volantino (invariato) */}
                            {az.hasTipoVolantino&&(target>0||fatto>0)&&<div style={{padding:"6px 12px 8px 24px",background:"#FDFBF7",borderBottom:isLast?"none":"0.5px solid #f8f8f5",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                              <span style={{fontSize:10,color:"#888",fontWeight:600}}>TIPO:</span>
                              {TIPI_VOLANTINO.map(tv=>(
                                <button key={tv} onClick={()=>puoModificare&&aggiornaAzione(az.id,{tipoVolantino:dati.tipoVolantino===tv?"":tv})} disabled={!puoModificare} style={{fontSize:10,padding:"3px 8px",borderRadius:4,border:`0.5px solid ${dati.tipoVolantino===tv?BRAND.oro:"#ddd"}`,background:dati.tipoVolantino===tv?BRAND.oro:"#fff",color:dati.tipoVolantino===tv?"#fff":"#666",cursor:puoModificare?"pointer":"default",fontFamily:"inherit",fontWeight:dati.tipoVolantino===tv?600:500}}>{tv}</button>
                              ))}
                              <input type="text" placeholder="Zona (es. Bizzozero)" value={dati.zona||""} disabled={!puoModificare}
                                onChange={e=>aggiornaAzione(az.id,{zona:e.target.value})}
                                style={{flex:1,minWidth:100,padding:"3px 8px",fontSize:11,border:"0.5px solid #ddd",borderRadius:4,fontFamily:"inherit"}}/>
                            </div>}
                          </div>);
                        })}
                      </div>);
                    })}

                    {/* ====== CONSEGUENZE OGGI ====== */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,marginBottom:8,padding:"0 2px"}}>
                      <h3 style={{margin:0,fontSize:14,fontWeight:600,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🔄 Conseguenze oggi</h3>
                      <span style={{fontSize:10,color:"#aaa",fontStyle:"italic"}}>output diretti delle azioni</span>
                    </div>
                    <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:8,overflow:"hidden",marginBottom:14}}>
                      {CATALOGO_CONSEGUENZE_DEFAULT.map((c,idx)=>{
                        const val = Number(conseguenzeOggi[c.id]||0);
                        const isLast = idx===CATALOGO_CONSEGUENZE_DEFAULT.length-1;
                        return(<div key={c.id} style={{display:"grid",gridTemplateColumns:"1fr 50px auto",alignItems:"center",gap:8,padding:"6px 12px",borderBottom:isLast?"none":"0.5px solid #f8f8f5"}}>
                          <div style={{fontSize:12,color:"#2C2C2C",fontWeight:500}}><span style={{marginRight:6}}>{c.icona}</span>{c.nome}</div>
                          <input type="number" min="0" value={val===0?"":val} placeholder="0" disabled={!puoModificare}
                            onChange={e=>aggiornaConseguenza(c.id,e.target.value)}
                            style={{width:36,padding:"2px 4px",fontSize:13,fontWeight:600,border:"0.5px solid #e0ddd5",borderRadius:4,textAlign:"center",color:val>0?c.clr:"#bbb",fontFamily:"inherit",background:"#fff"}}/>
                          {puoModificare&&<div style={{display:"flex",alignItems:"center",gap:2}}>
                            <button onClick={()=>aggiornaConseguenza(c.id,Math.max(0,val-1))} disabled={val<=0} style={{width:22,height:22,border:"0.5px solid #e0ddd5",background:"#fff",borderRadius:4,cursor:val<=0?"not-allowed":"pointer",fontSize:14,color:"#888",lineHeight:1,padding:0,opacity:val<=0?0.4:1}}>−</button>
                            <button onClick={()=>aggiornaConseguenza(c.id,val+1)} style={{width:22,height:22,border:`0.5px solid ${c.clr}`,background:c.clr,color:"#fff",borderRadius:4,cursor:"pointer",fontSize:14,lineHeight:1,padding:0}}>+</button>
                          </div>}
                        </div>);
                      })}
                    </div>

                    {/* ====== TEMPO DEDICATO ====== */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,marginBottom:8,padding:"0 2px"}}>
                      <h3 style={{margin:0,fontSize:14,fontWeight:600,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>⏱️ Tempo dedicato</h3>
                      <span style={{fontSize:10,color:"#aaa",fontStyle:"italic"}}>ore investite per categoria</span>
                    </div>
                    <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:8,padding:"8px 12px",marginBottom:14}}>
                      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fit,minmax(160px,1fr))",gap:6}}>
                        {CATALOGO_TEMPO_DEFAULT.map(t=>{
                          const val=Number(tempoOggi[t.id]||0);
                          return(<div key={t.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:"#FDFBF7",borderRadius:5,borderLeft:`2px solid ${t.clr}`}}>
                            <p style={{margin:0,fontSize:11,fontWeight:500,flex:1,color:BRAND.grigio}}>{t.nome}</p>
                            <input type="number" min="0" step="0.5" value={val===0?"":val} placeholder="0" disabled={!puoModificare}
                              onChange={e=>aggiornaTempo(t.id,e.target.value)}
                              style={{width:42,padding:"2px 4px",fontSize:12,fontWeight:600,border:"0.5px solid "+(val>0?t.clr:"#e0ddd5"),borderRadius:4,textAlign:"center",color:val>0?t.clr:"#bbb",fontFamily:"inherit",background:"#fff"}}/>
                            <span style={{fontSize:10,color:"#888",fontWeight:500}}>h</span>
                          </div>);
                        })}
                      </div>
                      {(()=>{
                        const tot=CATALOGO_TEMPO_DEFAULT.reduce((s,t)=>s+Number(tempoOggi[t.id]||0),0);
                        return tot>0&&<div style={{marginTop:10,paddingTop:10,borderTop:"0.5px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:12,color:"#888",fontWeight:600}}>TOTALE ORE GIORNATA</span>
                          <span style={{fontSize:18,fontWeight:700,color:BRAND.oroD}}>{tot} h</span>
                        </div>;
                      })()}
                    </div>

                    {/* ====== ROUTINE PROFESSIONALI ====== */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <h3 style={{margin:0,fontSize:16,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>📌 Routine professionali</h3>
                      <span style={{fontSize:12,color:"#888",fontWeight:500}}>linee guida agenzia · <strong style={{color:routineCompletate===routineProf.filter(r=>r.attivo).length?"#27AE60":BRAND.oroD}}>{routineCompletate} di {routineProf.filter(r=>r.attivo).length}</strong></span>
                    </div>
                    <div style={{background:"#fff",border:"1px solid #e8e5e0",borderRadius:10,padding:"0.875rem 1.25rem",marginBottom:"1.5rem",boxShadow:"0 1px 3px rgba(0,0,0,0.03)"}}>
                      {routineProf.filter(r=>r.attivo).map((r,idx,arr)=>{
                        const d=routineOggi[r.id]||{};
                        const fatto=d.fatto;
                        const isLast=idx===arr.length-1;
                        return(<div key={r.id} onClick={()=>puoModificare&&toggleRoutine(r.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:isLast?"none":"0.5px solid #f0f0f0",cursor:puoModificare?"pointer":"default"}}>
                          <span style={{fontSize:20,color:fatto?"#27AE60":"#bbb"}}>{fatto?"✅":"⬜"}</span>
                          <p style={{margin:0,fontSize:14,flex:1,fontWeight:fatto?500:600,textDecoration:fatto?"line-through":"none",color:fatto?"#888":BRAND.grigio}}>{r.nome}</p>
                          {fatto?<span style={{fontSize:12,color:"#27AE60",fontWeight:600}}>completata · {d.ora}</span>:<span style={{fontSize:10,color:"#fff",padding:"3px 10px",borderRadius:4,background:BRAND.oro,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>DA FARE</span>}
                        </div>);
                      })}
                    </div>

                    {/* ====== SPAZI PERSONALI — solo quando guardo me stesso ====== */}
                    {vedoSpaziPersonali&&<>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <h3 style={{margin:0,fontSize:16,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>❤️ Spazi personali</h3>
                        <span style={{fontSize:12,color:"#888",fontWeight:500}}>privati · solo tu li vedi</span>
                      </div>
                      <div style={{background:"#fff",border:"1px solid #e8e5e0",borderRadius:10,padding:"0.875rem 1.25rem",marginBottom:"1.5rem",boxShadow:"0 1px 3px rgba(0,0,0,0.03)"}}>
                        {spaziPersonaliOggi.length===0&&<p style={{fontSize:13,color:"#aaa",textAlign:"center",margin:"10px 0",fontStyle:"italic"}}>Nessuno spazio personale per oggi. Aggiungi sport, lettura, famiglia o quello che vuoi.</p>}
                        {spaziPersonaliOggi.map((s,idx)=>{
                          const isLast=idx===spaziPersonaliOggi.length-1;
                          return(<div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:isLast?"none":"0.5px solid #f0f0f0"}}>
                            <span onClick={()=>puoModificare&&toggleSpazio(idx)} style={{fontSize:20,color:s.fatto?"#27AE60":"#bbb",cursor:puoModificare?"pointer":"default"}}>{s.fatto?"✅":"⬜"}</span>
                            <p style={{margin:0,fontSize:14,flex:1,fontWeight:s.fatto?500:600,textDecoration:s.fatto?"line-through":"none",color:s.fatto?"#888":BRAND.grigio}}>{s.nome}</p>
                            {puoModificare&&<button onClick={()=>rimuoviSpazio(idx)} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:16,padding:"0 4px"}}>✕</button>}
                          </div>);
                        })}
                        {puoModificare&&<div style={{marginTop:12,paddingTop:10,borderTop:"0.5px solid #f0f0f0"}}>
                          <button onClick={aggiungiSpazio} style={{...S.btn,fontSize:13,padding:"8px 14px",width:"100%",fontWeight:600}}>+ Aggiungi spazio personale</button>
                        </div>}
                      </div>
                    </>}

                    {/* ====== DOVE SEI - nuove voci: Incarichi mese, Appt acq fissati, Immobili visti, Valutazioni fatte ====== */}
                    {(()=>{
                      const mese = dataSel.substring(0,7);
                      const incMese = incarichi.filter(i=>i.agenteListing===agIdSel&&(i.dataInizio||"").startsWith(mese)&&!i.archiviato).length;
                      // Aggrego conseguenze del mese da oggiDati
                      const datiMese = oggiDati[agIdSel]||{};
                      let apptAcqMese=0, immVistiMese=0, valFatteMese=0;
                      Object.keys(datiMese).forEach(data=>{
                        if(data.startsWith(mese)){
                          const c=datiMese[data]?.conseguenze||{};
                          apptAcqMese += Number(c.appt_acq_fissati||0);
                          immVistiMese += Number(c.immobili_visti||0);
                          valFatteMese += Number(c.presentazioni||0);
                        }
                      });
                      return(<>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <h3 style={{margin:0,fontSize:16,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>📊 Dove sei</h3>
                          <span style={{fontSize:12,color:"#888",fontWeight:500}}>produttività del mese</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:"1.5rem"}}>
                          <div style={{background:`linear-gradient(135deg, ${BRAND.oro}15, ${BRAND.oro}05)`,borderRadius:10,padding:"14px 16px",border:`1px solid ${BRAND.oro}33`}}>
                            <p style={{margin:"0 0 4px",fontSize:11,color:BRAND.oroD,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Incarichi mese</p>
                            <p style={{margin:0,fontSize:22,fontWeight:700,color:BRAND.oroD,fontFamily:"Georgia,serif"}}>{incMese}<span style={{fontSize:13,fontWeight:500,marginLeft:4}}>nuovi</span></p>
                          </div>
                          <div style={{background:`linear-gradient(135deg, ${BRAND.oro}15, ${BRAND.oro}05)`,borderRadius:10,padding:"14px 16px",border:`1px solid ${BRAND.oro}33`}}>
                            <p style={{margin:"0 0 4px",fontSize:11,color:BRAND.oroD,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Appt. acquisizione</p>
                            <p style={{margin:0,fontSize:22,fontWeight:700,color:BRAND.oroD,fontFamily:"Georgia,serif"}}>{apptAcqMese}<span style={{fontSize:13,fontWeight:500,marginLeft:4}}>fissati</span></p>
                          </div>
                          <div style={{background:`linear-gradient(135deg, ${BRAND.oro}15, ${BRAND.oro}05)`,borderRadius:10,padding:"14px 16px",border:`1px solid ${BRAND.oro}33`}}>
                            <p style={{margin:"0 0 4px",fontSize:11,color:BRAND.oroD,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Immobili visti</p>
                            <p style={{margin:0,fontSize:22,fontWeight:700,color:BRAND.oroD,fontFamily:"Georgia,serif"}}>{immVistiMese}</p>
                          </div>
                          <div style={{background:`linear-gradient(135deg, ${BRAND.oro}15, ${BRAND.oro}05)`,borderRadius:10,padding:"14px 16px",border:`1px solid ${BRAND.oro}33`}}>
                            <p style={{margin:"0 0 4px",fontSize:11,color:BRAND.oroD,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Valutazioni fatte</p>
                            <p style={{margin:0,fontSize:22,fontWeight:700,color:BRAND.oroD,fontFamily:"Georgia,serif"}}>{valFatteMese}</p>
                          </div>
                        </div>
                      </>);
                    })()}

                    {/* ====== PROMEMORIA ====== */}
                    {(()=>{
                      const oggiStr=dataSel;
                      const tra7gg=(()=>{const d=new Date(oggiStr);d.setDate(d.getDate()+7);return d.toISOString().slice(0,10);})();
                      const incInScadenza = incarichi.filter(i=>i.agenteListing===agIdSel&&!i.archiviato&&i.scadenza&&i.scadenza>=oggiStr&&i.scadenza<=tra7gg);
                      const propAttesa = proposte.filter(p=>(p.agenteListing===agIdSel||p.agenteAcquirente===agIdSel)&&p.stato==="In trattativa");
                      if(incInScadenza.length===0&&propAttesa.length===0) return null;
                      return(<>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <h3 style={{margin:0,fontSize:16,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🔔 Promemoria</h3>
                          <span style={{fontSize:12,color:"#888",fontWeight:500}}>dalle altre sezioni</span>
                        </div>
                        <div style={{background:"#fff",border:"1px solid #e8e5e0",borderLeft:`4px solid #E67E22`,borderRadius:10,padding:"0.875rem 1.25rem",marginBottom:"1.5rem",boxShadow:"0 1px 3px rgba(0,0,0,0.03)"}}>
                          {incInScadenza.length>0&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:propAttesa.length>0?"0.5px solid #f0f0f0":"none"}}>
                            <span style={{fontSize:20}}>⚠️</span>
                            <div style={{flex:1}}>
                              <p style={{margin:0,fontSize:14,fontWeight:700,color:BRAND.grigio}}>{incInScadenza.length} incarico{incInScadenza.length>1?"i":""} in scadenza nei prossimi 7 giorni</p>
                              <p style={{margin:"2px 0 0",fontSize:12,color:"#888"}}>{incInScadenza.slice(0,3).map(i=>`${i.nominativo}`).join(" · ")}{incInScadenza.length>3?" · ...":""}</p>
                            </div>
                          </div>}
                          {propAttesa.length>0&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0"}}>
                            <span style={{fontSize:20}}>📄</span>
                            <div style={{flex:1}}>
                              <p style={{margin:0,fontSize:14,fontWeight:700,color:BRAND.grigio}}>{propAttesa.length} proposta in attesa di risposta</p>
                              <p style={{margin:"2px 0 0",fontSize:12,color:"#888"}}>verificare follow-up con il cliente</p>
                            </div>
                          </div>}
                        </div>
                      </>);
                    })()}

                  </>);
                })()}

                {/* ── VISTA SETTIMANA ── */}
                {opSubTab==="settimana"&&(()=>{
                  // === LOGICA AGENTE/BROKER ===
                  const brokerVedeSeStesso = canViewAll && (opAgenteSel==="Tutti"||opAgenteSel===""||opAgenteSel==="self"||opAgenteSel===String(myAgentId));
                  const isAgg = canViewAll && opAgenteSel==="team";
                  const agIdSelW = isAgg ? null :
                    canViewAll
                      ? (brokerVedeSeStesso ? myAgentId : Number(opAgenteSel))
                      : myAgentId;

                  // Calcolo i 6 giorni Lun-Sab della settimana che contiene opDataSel
                  const baseDate = new Date(opDataSel||todayStr());
                  const giornoSett = baseDate.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
                  const offsetLun = giornoSett===0 ? -6 : 1-giornoSett;
                  const lunedi = new Date(baseDate);
                  lunedi.setDate(baseDate.getDate()+offsetLun);
                  const giorniSettim = [];
                  for(let i=0; i<6; i++){
                    const d = new Date(lunedi);
                    d.setDate(lunedi.getDate()+i);
                    giorniSettim.push(d);
                  }
                  const fmtData = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()+0).padStart(2,"0")}`;
                  const dataStart = fmtData(giorniSettim[0]);
                  const dataEnd = fmtData(giorniSettim[5]);
                  const giorniSettCorti = ["Lun","Mar","Mer","Gio","Ven","Sab"];

                  // Funzione che aggrega i dati di un agente in un range
                  const aggregaPerAgente = (agId) => {
                    const dati = oggiDati[agId]||{};
                    const aggr = {
                      perGiorno: {}, // {dataStr: {azioniTot, conseguenze, oreTot, percMedia}}
                      totazioni: {},  // {azioneId: {fatto, target}}
                      totconseguenze: {},
                      tottempo: {},
                      routineCompl: 0,
                      routineTot: 0,
                    };
                    giorniSettim.forEach(d=>{
                      const k = fmtData(d);
                      const g = dati[k] || {};
                      const az = g.azioni||{};
                      const co = g.conseguenze||{};
                      const tp = g.tempo||{};
                      const rt = g.routine||{};
                      // Aggregazione giornaliera
                      let azFatto=0, azTarget=0, azCompletate=0, azConTarget=0;
                      Object.entries(az).forEach(([azId, v])=>{
                        const f = Number(v.fatto||0), t = Number(v.target||0);
                        azFatto += f; azTarget += t;
                        if(t>0){ azConTarget++; if(f>=t) azCompletate++; }
                        // Totali
                        if(!aggr.totazioni[azId]) aggr.totazioni[azId] = {fatto:0, target:0};
                        aggr.totazioni[azId].fatto += f;
                        aggr.totazioni[azId].target += t;
                      });
                      Object.entries(co).forEach(([cId, v])=>{
                        aggr.totconseguenze[cId] = (aggr.totconseguenze[cId]||0) + Number(v||0);
                      });
                      Object.entries(tp).forEach(([tId, v])=>{
                        aggr.tottempo[tId] = (aggr.tottempo[tId]||0) + Number(v||0);
                      });
                      Object.values(rt).forEach(r=>{
                        if(r&&r.fatto) aggr.routineCompl++;
                        aggr.routineTot++;
                      });
                      const perc = azTarget>0 ? Math.round(azFatto/azTarget*100) : 0;
                      const oreGiorno = Object.values(tp).reduce((s,v)=>s+Number(v||0),0);
                      aggr.perGiorno[k] = {
                        azioniTot: azFatto,
                        azCompletate, azConTarget,
                        perc: Math.min(100, perc),
                        ore: oreGiorno,
                        hasData: Object.keys(az).length>0 || Object.keys(co).length>0 || Object.keys(tp).length>0
                      };
                    });
                    return aggr;
                  };

                  // Aggrego: se team → tutti gli agenti operativi sommati, altrimenti l'agente selezionato
                  const aggregaTotale = (()=>{
                    if(isAgg){
                      const operativi = agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false);
                      const merged = {perGiorno:{}, totazioni:{}, totconseguenze:{}, tottempo:{}, routineCompl:0, routineTot:0, agentiAttivi:0};
                      operativi.forEach(ag=>{
                        const a = aggregaPerAgente(ag.id);
                        let hasAny = false;
                        Object.entries(a.perGiorno).forEach(([k,v])=>{
                          if(!merged.perGiorno[k]) merged.perGiorno[k]={azioniTot:0,ore:0,giorniAttivi:0,percSum:0,percCount:0};
                          merged.perGiorno[k].azioniTot += v.azioniTot;
                          merged.perGiorno[k].ore += v.ore;
                          if(v.hasData){ merged.perGiorno[k].giorniAttivi++; merged.perGiorno[k].percSum+=v.perc; merged.perGiorno[k].percCount++; hasAny=true; }
                        });
                        Object.entries(a.totazioni).forEach(([k,v])=>{
                          if(!merged.totazioni[k]) merged.totazioni[k]={fatto:0,target:0};
                          merged.totazioni[k].fatto += v.fatto;
                          merged.totazioni[k].target += v.target;
                        });
                        Object.entries(a.totconseguenze).forEach(([k,v])=>{ merged.totconseguenze[k]=(merged.totconseguenze[k]||0)+v; });
                        Object.entries(a.tottempo).forEach(([k,v])=>{ merged.tottempo[k]=(merged.tottempo[k]||0)+v; });
                        merged.routineCompl += a.routineCompl;
                        merged.routineTot += a.routineTot;
                        if(hasAny) merged.agentiAttivi++;
                      });
                      // Calcolo media perc per giorno
                      Object.values(merged.perGiorno).forEach(g=>{ g.perc = g.percCount>0 ? Math.round(g.percSum/g.percCount) : 0; });
                      return merged;
                    } else {
                      return aggregaPerAgente(agIdSelW);
                    }
                  })();

                  const agSelW = !isAgg ? agenti.find(a=>a.id===agIdSelW) : null;
                  const totSettAzioni = Object.values(aggregaTotale.perGiorno).reduce((s,g)=>s+g.azioniTot,0);
                  const totSettOre = Object.values(aggregaTotale.perGiorno).reduce((s,g)=>s+g.ore,0);
                  const giorniConDati = Object.values(aggregaTotale.perGiorno).filter(g=>(isAgg?g.azioniTot>0:g.hasData)).length;
                  const percMediaSett = (()=>{
                    const valori = Object.values(aggregaTotale.perGiorno).map(g=>g.perc).filter(p=>p>0);
                    return valori.length>0 ? Math.round(valori.reduce((s,p)=>s+p,0)/valori.length) : 0;
                  })();

                  // Mappe nome categorie/conseguenze
                  const nomeAzioneById = {};
                  catalogoAzioni.forEach(a=>{ nomeAzioneById[a.id] = {nome:a.nome, gruppo:a.gruppo, icona:a.icona}; });
                  const nomeConsById = {};
                  CATALOGO_CONSEGUENZE_DEFAULT.forEach(c=>{ nomeConsById[c.id] = {nome:c.nome, icona:c.icona, clr:c.clr}; });
                  const nomeTempoById = {};
                  CATALOGO_TEMPO_DEFAULT.forEach(t=>{ nomeTempoById[t.id] = {nome:t.nome, clr:t.clr}; });

                  return(<>
                    {/* Selettori */}
                    <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center",flexWrap:"wrap"}}>
                      <input type="date" style={S.sel} value={opDataSel} onChange={e=>setOpDataSel(e.target.value)}/>
                      {canViewAll&&<select style={S.sel} value={isAgg?"team":(brokerVedeSeStesso?"self":opAgenteSel)} onChange={e=>setOpAgenteSel(e.target.value)}>
                        <option value="self">🏠 I miei dati</option>
                        <option value="team">👥 Vista team aggregata</option>
                        <optgroup label="Singolo agente">
                          {agenti.filter(a=>["Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false&&a.id!==myAgentId).map(a=><option key={a.id} value={a.id}>👤 {a.nome} {a.cognome}</option>)}
                        </optgroup>
                      </select>}
                      <span style={{fontSize:12,color:"#888"}}>{dataStart.split("-").reverse().join("/")} → {dataEnd.split("-").reverse().join("/")}</span>
                    </div>

                    {/* HEADER */}
                    <div style={{background:`linear-gradient(135deg, ${BRAND.oro}18 0%, ${BRAND.oro}08 100%)`,borderRadius:14,padding:"1.25rem 1.5rem",marginBottom:"1.25rem",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,border:`1.5px solid ${BRAND.oro}55`}}>
                      <div>
                        <p style={{fontSize:11,color:BRAND.oroD,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>📆 Settimana</p>
                        <h2 style={{margin:0,fontSize:22,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>{isAgg?"Vista team aggregata":(agSelW?`${agSelW.nome} ${agSelW.cognome}`:"—")}</h2>
                        <p style={{fontSize:12,color:"#666",margin:"4px 0 0",fontWeight:500}}>{dataStart.split("-").reverse().join("/")} → {dataEnd.split("-").reverse().join("/")} · {giorniConDati}/6 giorni con attività</p>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <p style={{fontSize:10,color:BRAND.oroD,margin:0,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>% media settimana</p>
                        <p style={{fontSize:30,fontWeight:800,margin:"2px 0 0",color:percMediaSett>=80?"#27AE60":percMediaSett>=50?BRAND.oroD:percMediaSett>0?"#E67E22":"#bbb",fontFamily:"Georgia,serif"}}>{percMediaSett}%</p>
                        <p style={{fontSize:11,color:"#888",margin:0,fontWeight:500}}>{totSettAzioni} azioni · {totSettOre.toFixed(1)}h</p>
                      </div>
                    </div>

                    {/* GRIGLIA GIORNI LUN-SAB */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:"1.5rem"}}>
                      {giorniSettim.map((d,i)=>{
                        const k = fmtData(d);
                        const g = aggregaTotale.perGiorno[k]||{azioniTot:0,perc:0,ore:0,hasData:false};
                        const isOggi = k===todayStr();
                        const clrPerc = g.perc>=80?"#27AE60":g.perc>=50?BRAND.oroD:g.perc>0?"#E67E22":"#bbb";
                        return(<div key={k} onClick={()=>{setOpDataSel(k);setOpSubTab("oggi");}} style={{background:"#fff",border:`1.5px solid ${isOggi?BRAND.oro:"#e8e5e0"}`,borderRadius:10,padding:"12px 10px",cursor:"pointer",transition:"all .2s",boxShadow:isOggi?`0 2px 8px ${BRAND.oro}30`:"0 1px 3px rgba(0,0,0,0.03)",textAlign:"center"}}>
                          <div style={{fontSize:11,fontWeight:700,color:isOggi?BRAND.oroD:"#888",textTransform:"uppercase",letterSpacing:"0.08em"}}>{giorniSettCorti[i]}</div>
                          <div style={{fontSize:18,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif",margin:"4px 0"}}>{d.getDate()}</div>
                          {g.azioniTot>0 ? (<>
                            <div style={{fontSize:20,fontWeight:800,color:clrPerc,marginBottom:2,fontFamily:"Georgia,serif"}}>{g.perc}%</div>
                            <div style={{fontSize:10,color:"#888",marginBottom:6}}>{g.azioniTot} azioni{isAgg?` · ${g.giorniAttivi||0} agenti`:""}</div>
                            <div style={{height:4,background:"#f0f0f0",borderRadius:2,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${g.perc}%`,background:clrPerc,borderRadius:2}}/>
                            </div>
                            {g.ore>0&&<div style={{fontSize:10,color:"#888",marginTop:6}}>⏱ {g.ore.toFixed(1)}h</div>}
                          </>) : (
                            <div style={{fontSize:11,color:"#bbb",marginTop:14}}>—</div>
                          )}
                          {isOggi&&<div style={{fontSize:9,color:BRAND.oroD,marginTop:6,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>OGGI</div>}
                        </div>);
                      })}
                    </div>

                    {/* TOTALI SETTIMANA - AZIONI PER GRUPPO */}
                    {(()=>{
                      const azioniPerGruppo = {};
                      Object.entries(aggregaTotale.totazioni).forEach(([azId, v])=>{
                        const meta = nomeAzioneById[azId];
                        if(!meta) return;
                        if(!azioniPerGruppo[meta.gruppo]) azioniPerGruppo[meta.gruppo] = [];
                        azioniPerGruppo[meta.gruppo].push({...v, nome:meta.nome, icona:meta.icona, id:azId});
                      });
                      if(Object.keys(azioniPerGruppo).length===0){
                        return(<div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"2rem 1rem",textAlign:"center",marginBottom:"1.5rem"}}>
                          <p style={{fontSize:13,color:"#888",margin:0}}>Nessuna azione registrata in questa settimana.</p>
                          <p style={{fontSize:12,color:"#aaa",margin:"6px 0 0"}}>Clicca su un giorno per registrare attività.</p>
                        </div>);
                      }
                      return(<>
                        <h3 style={{margin:"0 0 10px",fontSize:15,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🎯 Totale Azioni settimana</h3>
                        {GRUPPI_AZIONI.map(gruppo=>{
                          const voci = azioniPerGruppo[gruppo.id]||[];
                          if(voci.length===0) return null;
                          const colorGruppo = gruppo.id==="telefono"?"#2980B9":gruppo.id==="scritto"?"#8E44AD":gruppo.id==="social"?"#E91E63":"#E67E22";
                          const totGruppoFatto = voci.reduce((s,v)=>s+v.fatto,0);
                          const totGruppoTarget = voci.reduce((s,v)=>s+v.target,0);
                          return(<div key={gruppo.id} style={{background:"#fff",border:"0.5px solid #e8e5e0",borderLeft:`4px solid ${colorGruppo}`,borderRadius:10,padding:"0.875rem 1.125rem",marginBottom:"0.75rem"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                              <p style={{margin:0,fontSize:11,color:colorGruppo,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:800}}>{gruppo.icona} {gruppo.nome}</p>
                              <p style={{margin:0,fontSize:12,color:"#666",fontWeight:600}}>{totGruppoFatto} / {totGruppoTarget} <span style={{fontSize:10,color:"#aaa",marginLeft:4}}>settimana</span></p>
                            </div>
                            {voci.filter(v=>v.fatto>0||v.target>0).map(v=>{
                              const perc = v.target>0 ? Math.min(100,Math.round(v.fatto/v.target*100)) : 0;
                              const clr = v.fatto>=v.target&&v.target>0?"#27AE60":perc>=66?BRAND.oroD:perc>=33?"#E67E22":perc>0?"#E74C3C":"#bbb";
                              return(<div key={v.id} style={{display:"grid",gridTemplateColumns:"1fr 80px 100px 50px",gap:10,alignItems:"center",padding:"6px 0",borderBottom:"0.5px solid #f5f5f5"}}>
                                <p style={{margin:0,fontSize:13,color:BRAND.grigio,fontWeight:500}}>{v.nome}</p>
                                <p style={{margin:0,fontSize:13,color:"#666",textAlign:"right",fontWeight:600}}>{v.fatto} <span style={{fontSize:11,color:"#aaa"}}>/ {v.target}</span></p>
                                <div style={{height:6,background:"#f0f0f0",borderRadius:3,overflow:"hidden"}}>
                                  <div style={{height:"100%",width:`${perc}%`,background:clr,borderRadius:3}}/>
                                </div>
                                <p style={{margin:0,fontSize:12,color:clr,fontWeight:700,textAlign:"right"}}>{v.target>0?`${perc}%`:"—"}</p>
                              </div>);
                            })}
                          </div>);
                        })}
                      </>);
                    })()}

                    {/* CONSEGUENZE SETTIMANA */}
                    {Object.keys(aggregaTotale.totconseguenze).length>0&&(()=>{
                      const voci = Object.entries(aggregaTotale.totconseguenze).filter(([_,v])=>v>0).map(([id,val])=>({...nomeConsById[id], val, id})).filter(x=>x.nome);
                      if(voci.length===0) return null;
                      return(<>
                        <h3 style={{margin:"1.25rem 0 10px",fontSize:15,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🔄 Totale Conseguenze settimana</h3>
                        <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"0.875rem 1.25rem",marginBottom:"1.25rem"}}>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8}}>
                            {voci.map(v=>(<div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"#FDFBF7",borderRadius:6,borderLeft:`3px solid ${v.clr}`}}>
                              <span style={{fontSize:13,color:BRAND.grigio,fontWeight:500}}>{v.icona} {v.nome}</span>
                              <strong style={{fontSize:16,color:v.clr,fontWeight:700}}>{v.val}</strong>
                            </div>))}
                          </div>
                        </div>
                      </>);
                    })()}

                    {/* TEMPO SETTIMANA */}
                    {Object.keys(aggregaTotale.tottempo).length>0&&(()=>{
                      const voci = Object.entries(aggregaTotale.tottempo).filter(([_,v])=>v>0).map(([id,val])=>({...nomeTempoById[id], val, id})).filter(x=>x.nome);
                      if(voci.length===0) return null;
                      const totOre = voci.reduce((s,v)=>s+v.val,0);
                      return(<>
                        <h3 style={{margin:"1.25rem 0 10px",fontSize:15,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>⏱️ Tempo settimana ({totOre.toFixed(1)}h)</h3>
                        <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"0.875rem 1.25rem",marginBottom:"1.25rem"}}>
                          {voci.map(v=>{
                            const perc = Math.round(v.val/totOre*100);
                            return(<div key={v.id} style={{display:"grid",gridTemplateColumns:"160px 1fr 80px",gap:10,alignItems:"center",padding:"7px 0",borderBottom:"0.5px solid #f5f5f5"}}>
                              <p style={{margin:0,fontSize:13,color:BRAND.grigio,fontWeight:500}}>{v.nome}</p>
                              <div style={{height:8,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${perc}%`,background:v.clr,borderRadius:4}}/>
                              </div>
                              <p style={{margin:0,fontSize:13,color:v.clr,fontWeight:700,textAlign:"right"}}>{v.val.toFixed(1)}h <span style={{fontSize:10,color:"#aaa",fontWeight:500}}>({perc}%)</span></p>
                            </div>);
                          })}
                        </div>
                      </>);
                    })()}

                    {/* ROUTINE SETTIMANA */}
                    {aggregaTotale.routineTot>0&&<div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"0.875rem 1.25rem",marginBottom:"1.25rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                      <p style={{margin:0,fontSize:13,color:BRAND.grigio,fontWeight:500}}>📌 Routine professionali completate</p>
                      <strong style={{fontSize:16,color:aggregaTotale.routineCompl>=aggregaTotale.routineTot*0.7?"#27AE60":BRAND.oroD,fontWeight:700}}>{aggregaTotale.routineCompl} / {aggregaTotale.routineTot}</strong>
                    </div>}

                  </>);
                })()}

                {/* ── REPORT MENSILE ── */}
                {opSubTab==="report"&&(()=>{
                  // === LOGICA AGENTE/BROKER ===
                  const brokerVedeSeStesso = canViewAll && (opAgenteSel==="Tutti"||opAgenteSel===""||opAgenteSel==="self"||opAgenteSel===String(myAgentId));
                  const isAgg = canViewAll && opAgenteSel==="team";
                  const agIdSelM = isAgg ? null :
                    canViewAll
                      ? (brokerVedeSeStesso ? myAgentId : Number(opAgenteSel))
                      : myAgentId;

                  const meseSel = opMeseSel || (annoCorrente+"-"+String(new Date().getMonth()+1).padStart(2,"0"));
                  const annoR = meseSel.substring(0,4);
                  const meseR = meseSel.substring(5,7);
                  const ultimoGiorno = new Date(parseInt(annoR), parseInt(meseR), 0).getDate();

                  // Aggregazione mese
                  const aggregaMeseAgente = (agId) => {
                    const dati = oggiDati[agId]||{};
                    const aggr = {totazioni:{}, totconseguenze:{}, tottempo:{}, routineCompl:0, routineTot:0, giorniCompilati:0};
                    Object.entries(dati).forEach(([k, g])=>{
                      if(!k.startsWith(meseSel)) return;
                      const az = g.azioni||{};
                      const co = g.conseguenze||{};
                      const tp = g.tempo||{};
                      const rt = g.routine||{};
                      const hasData = Object.keys(az).length>0 || Object.keys(co).length>0 || Object.keys(tp).length>0;
                      if(hasData) aggr.giorniCompilati++;
                      Object.entries(az).forEach(([azId, v])=>{
                        if(!aggr.totazioni[azId]) aggr.totazioni[azId] = {fatto:0, target:0};
                        aggr.totazioni[azId].fatto += Number(v.fatto||0);
                        aggr.totazioni[azId].target += Number(v.target||0);
                      });
                      Object.entries(co).forEach(([cId, v])=>{ aggr.totconseguenze[cId] = (aggr.totconseguenze[cId]||0) + Number(v||0); });
                      Object.entries(tp).forEach(([tId, v])=>{ aggr.tottempo[tId] = (aggr.tottempo[tId]||0) + Number(v||0); });
                      Object.values(rt).forEach(r=>{ if(r&&r.fatto) aggr.routineCompl++; aggr.routineTot++; });
                    });
                    return aggr;
                  };

                  const aggregaTotaleM = (()=>{
                    if(isAgg){
                      const operativi = agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false);
                      const merged = {totazioni:{}, totconseguenze:{}, tottempo:{}, routineCompl:0, routineTot:0, giorniCompilati:0, agentiAttivi:0};
                      operativi.forEach(ag=>{
                        const a = aggregaMeseAgente(ag.id);
                        if(a.giorniCompilati>0) merged.agentiAttivi++;
                        merged.giorniCompilati += a.giorniCompilati;
                        Object.entries(a.totazioni).forEach(([k,v])=>{
                          if(!merged.totazioni[k]) merged.totazioni[k]={fatto:0,target:0};
                          merged.totazioni[k].fatto += v.fatto;
                          merged.totazioni[k].target += v.target;
                        });
                        Object.entries(a.totconseguenze).forEach(([k,v])=>{ merged.totconseguenze[k]=(merged.totconseguenze[k]||0)+v; });
                        Object.entries(a.tottempo).forEach(([k,v])=>{ merged.tottempo[k]=(merged.tottempo[k]||0)+v; });
                        merged.routineCompl += a.routineCompl;
                        merged.routineTot += a.routineTot;
                      });
                      return merged;
                    } else {
                      return aggregaMeseAgente(agIdSelM);
                    }
                  })();

                  const agSelM = !isAgg ? agenti.find(a=>a.id===agIdSelM) : null;
                  const totMeseAzioni = Object.values(aggregaTotaleM.totazioni).reduce((s,v)=>s+v.fatto,0);
                  const totMeseConseg = Object.values(aggregaTotaleM.totconseguenze).reduce((s,v)=>s+v,0);
                  const totMeseOre = Object.values(aggregaTotaleM.tottempo).reduce((s,v)=>s+v,0);
                  const totMeseTarget = Object.values(aggregaTotaleM.totazioni).reduce((s,v)=>s+v.target,0);
                  const percMese = totMeseTarget>0 ? Math.min(100, Math.round(totMeseAzioni/totMeseTarget*100)) : 0;

                  const nomeAzioneById = {};
                  catalogoAzioni.forEach(a=>{ nomeAzioneById[a.id] = {nome:a.nome, gruppo:a.gruppo, icona:a.icona}; });
                  const nomeConsById = {};
                  CATALOGO_CONSEGUENZE_DEFAULT.forEach(c=>{ nomeConsById[c.id] = {nome:c.nome, icona:c.icona, clr:c.clr}; });
                  const nomeTempoById = {};
                  CATALOGO_TEMPO_DEFAULT.forEach(t=>{ nomeTempoById[t.id] = {nome:t.nome, clr:t.clr}; });
                  const mesiNomi=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];

                  return(<>
                    {/* Selettori */}
                    <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center",flexWrap:"wrap"}}>
                      <input type="month" style={S.sel} value={meseSel} onChange={e=>setOpMeseSel(e.target.value)}/>
                      {canViewAll&&<select style={S.sel} value={isAgg?"team":(brokerVedeSeStesso?"self":opAgenteSel)} onChange={e=>setOpAgenteSel(e.target.value)}>
                        <option value="self">🏠 I miei dati</option>
                        <option value="team">👥 Vista team aggregata</option>
                        <optgroup label="Singolo agente">
                          {agenti.filter(a=>["Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false&&a.id!==myAgentId).map(a=><option key={a.id} value={a.id}>👤 {a.nome} {a.cognome}</option>)}
                        </optgroup>
                      </select>}
                    </div>

                    {/* HEADER */}
                    <div style={{background:`linear-gradient(135deg, ${BRAND.oro}18 0%, ${BRAND.oro}08 100%)`,borderRadius:14,padding:"1.25rem 1.5rem",marginBottom:"1.25rem",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,border:`1.5px solid ${BRAND.oro}55`}}>
                      <div>
                        <p style={{fontSize:11,color:BRAND.oroD,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>📊 Report mensile</p>
                        <h2 style={{margin:0,fontSize:22,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>{mesiNomi[parseInt(meseR)-1]} {annoR}</h2>
                        <p style={{fontSize:12,color:"#666",margin:"4px 0 0",fontWeight:500}}>{isAgg?`Team aggregato · ${aggregaTotaleM.agentiAttivi||0} agenti attivi`:(agSelM?`${agSelM.nome} ${agSelM.cognome}`:"—")}</p>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <p style={{fontSize:10,color:BRAND.oroD,margin:0,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>% media mese</p>
                        <p style={{fontSize:30,fontWeight:800,margin:"2px 0 0",color:percMese>=80?"#27AE60":percMese>=50?BRAND.oroD:percMese>0?"#E67E22":"#bbb",fontFamily:"Georgia,serif"}}>{percMese}%</p>
                      </div>
                    </div>

                    {/* KPI MENSILI */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:"1.5rem"}}>
                      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #2980B9`,padding:"1rem",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6,fontWeight:700}}>Giorni operativi</div>
                        <div style={{fontSize:26,fontWeight:700,color:"#2980B9",fontFamily:"Georgia,serif"}}>{aggregaTotaleM.giorniCompilati}</div>
                        <div style={{fontSize:11,color:"#aaa",marginTop:2}}>su {ultimoGiorno} del mese</div>
                      </div>
                      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid ${BRAND.oro}`,padding:"1rem",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6,fontWeight:700}}>Totale azioni</div>
                        <div style={{fontSize:26,fontWeight:700,color:BRAND.oroD,fontFamily:"Georgia,serif"}}>{totMeseAzioni}</div>
                        <div style={{fontSize:11,color:"#aaa",marginTop:2}}>su {totMeseTarget} pianificate</div>
                      </div>
                      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #27AE60`,padding:"1rem",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6,fontWeight:700}}>Conseguenze</div>
                        <div style={{fontSize:26,fontWeight:700,color:"#27AE60",fontFamily:"Georgia,serif"}}>{totMeseConseg}</div>
                        <div style={{fontSize:11,color:"#aaa",marginTop:2}}>output prodotti</div>
                      </div>
                      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #E67E22`,padding:"1rem",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6,fontWeight:700}}>Ore lavorate</div>
                        <div style={{fontSize:26,fontWeight:700,color:"#E67E22",fontFamily:"Georgia,serif"}}>{totMeseOre.toFixed(1)}<span style={{fontSize:14,marginLeft:2}}>h</span></div>
                        <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{aggregaTotaleM.giorniCompilati>0?`~${(totMeseOre/aggregaTotaleM.giorniCompilati).toFixed(1)}h/giorno`:"—"}</div>
                      </div>
                    </div>

                    {/* AZIONI PER GRUPPO */}
                    {(()=>{
                      const azioniPerGruppo = {};
                      Object.entries(aggregaTotaleM.totazioni).forEach(([azId, v])=>{
                        const meta = nomeAzioneById[azId];
                        if(!meta) return;
                        if(!azioniPerGruppo[meta.gruppo]) azioniPerGruppo[meta.gruppo] = [];
                        azioniPerGruppo[meta.gruppo].push({...v, nome:meta.nome, icona:meta.icona, id:azId});
                      });
                      if(Object.keys(azioniPerGruppo).length===0){
                        return(<div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"2rem 1rem",textAlign:"center",marginBottom:"1.5rem"}}>
                          <p style={{fontSize:13,color:"#888",margin:0}}>Nessuna azione registrata in questo mese.</p>
                        </div>);
                      }
                      return(<>
                        <h3 style={{margin:"0 0 10px",fontSize:15,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🎯 Azioni del mese</h3>
                        {GRUPPI_AZIONI.map(gruppo=>{
                          const voci = azioniPerGruppo[gruppo.id]||[];
                          if(voci.length===0) return null;
                          const colorGruppo = gruppo.id==="telefono"?"#2980B9":gruppo.id==="scritto"?"#8E44AD":gruppo.id==="social"?"#E91E63":"#E67E22";
                          const totGruppoFatto = voci.reduce((s,v)=>s+v.fatto,0);
                          const totGruppoTarget = voci.reduce((s,v)=>s+v.target,0);
                          return(<div key={gruppo.id} style={{background:"#fff",border:"0.5px solid #e8e5e0",borderLeft:`4px solid ${colorGruppo}`,borderRadius:10,padding:"0.875rem 1.125rem",marginBottom:"0.75rem"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                              <p style={{margin:0,fontSize:11,color:colorGruppo,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:800}}>{gruppo.icona} {gruppo.nome}</p>
                              <p style={{margin:0,fontSize:12,color:"#666",fontWeight:600}}>{totGruppoFatto} / {totGruppoTarget}</p>
                            </div>
                            {voci.filter(v=>v.fatto>0||v.target>0).map(v=>{
                              const perc = v.target>0 ? Math.min(100,Math.round(v.fatto/v.target*100)) : 0;
                              const clr = v.fatto>=v.target&&v.target>0?"#27AE60":perc>=66?BRAND.oroD:perc>=33?"#E67E22":perc>0?"#E74C3C":"#bbb";
                              return(<div key={v.id} style={{display:"grid",gridTemplateColumns:"1fr 80px 100px 50px",gap:10,alignItems:"center",padding:"6px 0",borderBottom:"0.5px solid #f5f5f5"}}>
                                <p style={{margin:0,fontSize:13,color:BRAND.grigio,fontWeight:500}}>{v.nome}</p>
                                <p style={{margin:0,fontSize:13,color:"#666",textAlign:"right",fontWeight:600}}>{v.fatto} <span style={{fontSize:11,color:"#aaa"}}>/ {v.target}</span></p>
                                <div style={{height:6,background:"#f0f0f0",borderRadius:3,overflow:"hidden"}}>
                                  <div style={{height:"100%",width:`${perc}%`,background:clr,borderRadius:3}}/>
                                </div>
                                <p style={{margin:0,fontSize:12,color:clr,fontWeight:700,textAlign:"right"}}>{v.target>0?`${perc}%`:"—"}</p>
                              </div>);
                            })}
                          </div>);
                        })}
                      </>);
                    })()}

                    {/* CONSEGUENZE */}
                    {Object.keys(aggregaTotaleM.totconseguenze).length>0&&(()=>{
                      const voci = Object.entries(aggregaTotaleM.totconseguenze).filter(([_,v])=>v>0).map(([id,val])=>({...nomeConsById[id], val, id})).filter(x=>x.nome);
                      if(voci.length===0) return null;
                      return(<>
                        <h3 style={{margin:"1.25rem 0 10px",fontSize:15,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🔄 Conseguenze del mese</h3>
                        <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"0.875rem 1.25rem",marginBottom:"1.25rem"}}>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8}}>
                            {voci.map(v=>(<div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"#FDFBF7",borderRadius:6,borderLeft:`3px solid ${v.clr}`}}>
                              <span style={{fontSize:13,color:BRAND.grigio,fontWeight:500}}>{v.icona} {v.nome}</span>
                              <strong style={{fontSize:16,color:v.clr,fontWeight:700}}>{v.val}</strong>
                            </div>))}
                          </div>
                        </div>
                      </>);
                    })()}

                    {/* DISTRIBUZIONE TEMPO */}
                    {Object.keys(aggregaTotaleM.tottempo).length>0&&(()=>{
                      const voci = Object.entries(aggregaTotaleM.tottempo).filter(([_,v])=>v>0).map(([id,val])=>({...nomeTempoById[id], val, id})).filter(x=>x.nome);
                      if(voci.length===0) return null;
                      const totOreM = voci.reduce((s,v)=>s+v.val,0);
                      return(<>
                        <h3 style={{margin:"1.25rem 0 10px",fontSize:15,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>⏱️ Distribuzione tempo del mese ({totOreM.toFixed(1)}h)</h3>
                        <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"0.875rem 1.25rem",marginBottom:"1.25rem"}}>
                          {voci.map(v=>{
                            const perc = Math.round(v.val/totOreM*100);
                            return(<div key={v.id} style={{display:"grid",gridTemplateColumns:"160px 1fr 80px",gap:10,alignItems:"center",padding:"7px 0",borderBottom:"0.5px solid #f5f5f5"}}>
                              <p style={{margin:0,fontSize:13,color:BRAND.grigio,fontWeight:500}}>{v.nome}</p>
                              <div style={{height:8,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${perc}%`,background:v.clr,borderRadius:4}}/>
                              </div>
                              <p style={{margin:0,fontSize:13,color:v.clr,fontWeight:700,textAlign:"right"}}>{v.val.toFixed(1)}h <span style={{fontSize:10,color:"#aaa",fontWeight:500}}>({perc}%)</span></p>
                            </div>);
                          })}
                        </div>
                      </>);
                    })()}

                    {/* ROUTINE PROFESSIONALI */}
                    {aggregaTotaleM.routineTot>0&&(()=>{
                      const percR = Math.round(aggregaTotaleM.routineCompl/aggregaTotaleM.routineTot*100);
                      return(<div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8}}>
                          <p style={{margin:0,fontSize:13,color:BRAND.grigio,fontWeight:600}}>📌 Routine professionali completate</p>
                          <strong style={{fontSize:18,color:percR>=70?"#27AE60":percR>=40?BRAND.oroD:"#E67E22",fontWeight:700,fontFamily:"Georgia,serif"}}>{aggregaTotaleM.routineCompl} / {aggregaTotaleM.routineTot} <span style={{fontSize:13,color:"#888",fontWeight:500}}>({percR}%)</span></strong>
                        </div>
                        <div style={{height:8,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${percR}%`,background:percR>=70?"#27AE60":percR>=40?BRAND.oroD:"#E67E22",borderRadius:4,transition:"width .4s"}}/>
                        </div>
                      </div>);
                    })()}

                  </>);
                })()}

                {/* ── OBIETTIVI ── */}
                {opSubTab==="obiettivi"&&(<>
                  <div style={{display:"flex",gap:8,marginBottom:"1.25rem",alignItems:"center",flexWrap:"wrap"}}>
                    <input type="month" style={S.sel} value={opMeseSel} onChange={e=>setOpMeseSel(e.target.value)}/>
                    {canViewAll&&<select style={S.sel} value={opAgenteSel} onChange={e=>setOpAgenteSel(e.target.value)}>
                      <option value="Tutti">Tutti gli agenti</option>
                      {agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}
                    </select>}
                  </div>
                  {(()=>{
                    const agId=isBroker?(Number(opAgenteSel==="Tutti"?agenti[0]?.id:opAgenteSel)||agenti[0]?.id):myAgentId;
                    const ag=agenti.find(a=>a.id===agId);
                    if(!ag) return null;
                    const obDati=getObiettivi(agId,opMeseSel);
                    const ob=obDati.proposti||{};
                    // Suggerimento dal mese precedente: se l'agente non ha ancora compilato gli obiettivi del mese corrente,
                    // mostra come placeholder i valori del mese precedente
                    const meseObPrec=(()=>{
                      const [y,m]=opMeseSel.split("-").map(Number);
                      const prevDate=new Date(y,m-2,1); // m-1-1 perché Date conta i mesi da 0
                      return `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,"0")}`;
                    })();
                    const obPrec=(getObiettivi(agId,meseObPrec).proposti)||{};
                    const isMeseVuoto=Object.keys(ob).filter(k=>Number(ob[k])>0).length===0;
                    const haObPrec=Object.keys(obPrec).filter(k=>Number(obPrec[k])>0).length>0;
                    const rep=calcReport(agId,opMeseSel);
                    const upd=(k,v)=>salvaObiettivi(agId,opMeseSel,{...obDati,proposti:{...ob,[k]:Number(v)}});

                    const vociOb=[
                      {k:"chiamate",    lbl:"Chiamate",           sub:"a settimana", clr:"#185FA5", icon:"📞", val:rep.chiamate},
                      {k:"appuntamenti",lbl:"Appuntamenti acq.",   sub:"al mese",     clr:"#633806", icon:"🤝", val:rep.appuntamenti},
                      {k:"acquisizioni",lbl:"Acquisizioni",        sub:"al mese",     clr:"#533AB7", icon:"🏠", val:rep.acquisizioni},
                      {k:"oh",          lbl:"Open House",          sub:"al mese",     clr:"#D85A30", icon:"🚪", val:rep.ohNum},
                      {k:"propPresentate",lbl:"Proposte",          sub:"al mese",     clr:"#27AE60", icon:"📝", val:rep.propPresentate},
                      {k:"immVisitati", lbl:"Immobili visitati",   sub:"a settimana", clr:"#085041", icon:"👁",  val:rep.immVisitati},
                      {k:"oreTel",      lbl:"Ore telefono",        sub:"a settimana", clr:"#0F6E56", icon:"⏱",  val:rep.oreTel},
                      {k:"postSocial",  lbl:"Post social",         sub:"a settimana", clr:"#3C3489", icon:"📱", val:rep.postSocial},
                    ];

                    return(<>
                      {/* Header agente */}
                      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:"1.5rem",padding:"1rem 1.25rem",background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0"}}>
                        <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#fff",flexShrink:0}}>{ag.nome.charAt(0)}</div>
                        <div>
                          <h3 style={{fontSize:16,fontWeight:600,margin:"0 0 2px",color:"#2C2C2C"}}>{ag.nome} {ag.cognome}</h3>
                          <p style={{fontSize:12,color:"#888",margin:0}}>Obiettivi personali · {opMeseSel} · {canViewAll?"imposta obiettivi per l'agente":"modifica i tuoi obiettivi"}</p>
                        </div>
                      </div>

                      {/* Banner suggerimento mese precedente */}
                      {isMeseVuoto&&haObPrec&&(!isBroker||opAgenteSel===String(myAgentId)||opAgenteSel==="Tutti")&&<div style={{background:"#FDFBF7",border:`1px solid ${BRAND.oro}55`,borderLeft:`4px solid ${BRAND.oro}`,borderRadius:8,padding:"10px 14px",marginBottom:"1.25rem",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                        <span style={{fontSize:20}}>💡</span>
                        <div style={{flex:1,minWidth:200}}>
                          <p style={{margin:0,fontSize:13,fontWeight:600,color:BRAND.grigio}}>Non hai ancora impostato gli obiettivi del mese</p>
                          <p style={{margin:"2px 0 0",fontSize:12,color:"#888"}}>Suggerimento: usa i valori del mese scorso ({meseObPrec}) come base di partenza.</p>
                        </div>
                        <button onClick={()=>{
                          if(window.confirm(`Copiare gli obiettivi di ${meseObPrec} come obiettivi di ${opMeseSel}?\\n\\nPotrai modificarli liberamente dopo.`)){
                            salvaObiettivi(agId,opMeseSel,{...obDati,proposti:{...obPrec}});
                          }
                        }} style={{...S.btn,fontSize:12,padding:"6px 14px",background:BRAND.oro,color:"#fff",border:"none",fontWeight:600}}>📋 Usa valori {meseObPrec}</button>
                      </div>}

                      {/* Griglia obiettivi — visuale ad alto impatto */}
                      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:"1.5rem"}}>
                        {vociOb.map(({k,lbl,sub,clr,icon,val})=>{
                          const target=Number(ob[k]||0);
                          const perc=target>0?Math.min(100,Math.round(val/target*100)):0;
                          const raggiunto=target>0&&val>=target;
                          return(<div key={k} style={{background:"#fff",borderRadius:12,border:`0.5px solid ${clr}33`,padding:"1rem",borderTop:`3px solid ${clr}`,position:"relative",overflow:"hidden"}}>
                            {raggiunto&&<div style={{position:"absolute",top:8,right:8,fontSize:16}}>🎉</div>}
                            <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
                            <div style={{fontSize:11,color:"#888",fontWeight:500,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.06em"}}>{lbl}</div>
                            <div style={{fontSize:11,color:"#bbb",marginBottom:10}}>{sub}</div>
                            {/* Input obiettivo — modificabile da tutti */}
                            <input type="number" min="0"
                              style={{width:"100%",fontSize:28,fontWeight:700,color:clr,border:"none",borderBottom:`2px solid ${clr}44`,background:"transparent",padding:"4px 0",textAlign:"center",outline:"none",marginBottom:8}}
                              value={ob[k]||""} placeholder={obPrec[k]>0?String(obPrec[k]):"0"}
                              onChange={e=>upd(k,e.target.value)}/>
                            {/* Suggerimento dal mese precedente se vuoto */}
                            {!ob[k]&&obPrec[k]>0&&<div style={{fontSize:10,color:BRAND.oroD,textAlign:"center",marginTop:-4,marginBottom:6,fontStyle:"italic"}}>💡 mese scorso: {obPrec[k]}</div>}
                            {/* Realizzato nel mese */}
                            {val>0&&<div style={{fontSize:11,color:"#888",textAlign:"center",marginBottom:6}}>Realizzato: <strong style={{color:clr}}>{val}</strong></div>}
                            {/* Barra progresso */}
                            {target>0&&(<>
                              <div style={{height:5,background:"#f0f0f0",borderRadius:3,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${perc}%`,background:raggiunto?"#27AE60":clr,borderRadius:3,transition:"width 0.5s"}}/>
                              </div>
                              <div style={{fontSize:10,color:raggiunto?"#27AE60":"#aaa",textAlign:"center",marginTop:4,fontWeight:raggiunto?600:400}}>
                                {raggiunto?"✓ Obiettivo raggiunto":`${perc}% · mancano ${target-val}`}
                              </div>
                            </>)}
                          </div>);
                        })}
                      </div>

                      {/* Box riepilogo mese */}
                      {Object.keys(ob).length>0&&(<div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
                        <p style={{fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 12px"}}>Riepilogo avanzamento — {opMeseSel}</p>
                        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                          {(()=>{
                            const raggiunti=vociOb.filter(v=>Number(ob[v.k]||0)>0&&v.val>=Number(ob[v.k]||0)).length;
                            const totConOb=vociOb.filter(v=>Number(ob[v.k]||0)>0).length;
                            const percTot=totConOb>0?Math.round(raggiunti/totConOb*100):0;
                            return(<>
                              <div style={{flex:1,minWidth:120}}>
                                <div style={{fontSize:32,fontWeight:700,color:percTot>=80?"#27AE60":percTot>=50?"#D4AC0D":"#E74C3C"}}>{percTot}%</div>
                                <div style={{fontSize:12,color:"#888"}}>obiettivi raggiunti</div>
                                <div style={{fontSize:11,color:"#aaa"}}>{raggiunti}/{totConOb} voci completate</div>
                              </div>
                              <div style={{flex:3}}>
                                {vociOb.filter(v=>Number(ob[v.k]||0)>0).map(({k,lbl,clr,val,icon})=>{
                                  const t=Number(ob[k]||0);
                                  const p=Math.min(100,Math.round(val/t*100));
                                  return(<div key={k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                                    <span style={{fontSize:12,width:120,flexShrink:0,color:"#555"}}>{icon} {lbl}</span>
                                    <div style={{flex:1,height:8,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
                                      <div style={{height:"100%",width:`${p}%`,background:val>=t?"#27AE60":clr,borderRadius:4}}/>
                                    </div>
                                    <span style={{fontSize:11,color:val>=t?"#27AE60":"#aaa",width:60,textAlign:"right",flexShrink:0}}>{val}/{t}</span>
                                  </div>);
                                })}
                              </div>
                            </>);
                          })()}
                        </div>
                      </div>)}

                      {/* Vista team broker */}
                      {canViewAll&&(<div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"1rem 1.25rem"}}>
                        <p style={{fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 12px"}}>Obiettivi team — {opMeseSel}</p>
                        <div style={{overflowX:"auto"}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:500}}>
                            <thead><tr style={{background:"#fafaf8"}}>
                              {["Agente","📞","🤝","🏠","🚪","📝","% media"].map(h=><th key={h} style={{...S.th,fontSize:11,textAlign:"center"}}>{h}</th>)}
                            </tr></thead>
                            <tbody>{agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=>{
                              const od=getObiettivi(a.id,opMeseSel).proposti||{};
                              const r=calcReport(a.id,opMeseSel);
                              const coppie=[[od.chiamate,r.chiamate],[od.appuntamenti,r.appuntamenti],[od.acquisizioni,r.acquisizioni],[od.oh,r.ohNum],[od.propPresentate,r.propPresentate]];
                              const percs=coppie.filter(([t])=>t>0).map(([t,v])=>Math.min(100,Math.round((v||0)/t*100)));
                              const avgPerc=percs.length>0?Math.round(percs.reduce((s,p)=>s+p,0)/percs.length):null;
                              return(<tr key={a.id} style={{borderBottom:"0.5px solid #f5f5f5"}}>
                                <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:22,height:22,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff"}}>{a.nome.charAt(0)}</div>{a.nome} {a.cognome}</div></td>
                                {coppie.map(([t,v],i)=>(
                                  <td key={i} style={{...S.tdC,color:t>0&&v>=t?"#27AE60":t>0?"#555":"#ccc"}}>
                                    {t>0?`${v||0}/${t}`:"—"}
                                  </td>
                                ))}
                                <td style={{...S.tdC,fontWeight:600,color:avgPerc>=80?"#27AE60":avgPerc>=50?"#D4AC0D":avgPerc!==null?"#E74C3C":"#ccc"}}>
                                  {avgPerc!==null?`${avgPerc}%`:"—"}
                                </td>
                              </tr>);
                            })}</tbody>
                          </table>
                        </div>
                      </div>)}
                    </>);
                  })()}
                </>)}
              </div>}

              {opMainTab==="piano"&&(()=>{
                const agentiProd2=agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false);
                const annoPiano=new Date().getFullYear();
                const oggi4=todayStr();
                const dal4=`${annoPiano}-01-01`;
                const transV2=venduti.filter(v=>Number(v.provvVenditore||0)>0);
                const transA2=venduti.filter(v=>Number(v.provvAcquirente||0)>0);
                const mediaV2=transV2.length>0?transV2.reduce((s,v)=>s+Number(v.provvVenditore||0),0)/transV2.length:0;
                const mediaA2=transA2.length>0?transA2.reduce((s,v)=>s+Number(v.provvAcquirente||0),0)/transA2.length:0;
                const provvMediaReale=Math.round((mediaV2+mediaA2)/2)||8000;
                const CONV=0.65; const APPT=0.40;
                const sCard2={background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"16px 20px"};
                const sLbl2={fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 4px"};
                const clrP=(p)=>p>=100?"#27AE60":p>=70?"#E67E22":"#E74C3C";

                // Vista agenzia: somma obiettivi e YTD di tutti gli agenti
                const vistaTotale=isBroker&&opAgenteSel==="Tutti";

                // Dati per agente singolo
                const agIdPiano=isBroker&&!vistaTotale?(Number(opAgenteSel)||agenti.find(a=>a.profilo==="Broker")?.id||agentiProd2[0]?.id):myAgentId;
                const agPiano=agenti.find(a=>a.id===agIdPiano)||{};
                const obAnnPiano=(obiettivoAgente[agIdPiano])||{};
                const obFattPiano=vistaTotale?agentiProd2.reduce((s,a)=>s+Number((obiettivoAgente[a.id]||{}).fatturato||0),0):Number(obAnnPiano.fatturato||0);
                const provvCustom=Number(obAnnPiano.provvMedia||0)||provvMediaReale;

                // Calcoli piano (per agente singolo o totale)
                const transazNec=provvCustom>0?Math.ceil(obFattPiano/provvCustom):0;
                const immobiliVend=Math.ceil(transazNec/2);
                const acquisizioniNec=Math.ceil(immobiliVend/CONV);
                const acquisizioniMese=Math.ceil(acquisizioniNec/12);
                const apptSett=Math.ceil(acquisizioniNec/APPT/52);
                const apptMese=Math.ceil(acquisizioniNec/APPT/12);

                // YTD
                const calcFattYTD=(agId)=>venduti.filter(v=>{const dc=dataCompAgenzia(v);return(Number(v.agenteListing)===agId||Number(v.agenteAcquirente)===agId)&&dc>=dal4&&dc<=oggi4;}).reduce((s,v)=>{let p=0;if(Number(v.agenteListing)===agId)p+=Number(v.provvVenditore||0);if(Number(v.agenteAcquirente)===agId)p+=Number(v.provvAcquirente||0);return s+p;},0);
                const calcAcqYTD=(agId)=>incarichi.filter(i=>Number(i.agenteListing)===agId&&i.dataInizio>=dal4&&i.dataInizio<=oggi4).length;
                const calcTransYTD=(agId)=>venduti.filter(v=>{const dc=dataCompAgenzia(v);return(Number(v.agenteListing)===agId||Number(v.agenteAcquirente)===agId)&&dc>=dal4&&dc<=oggi4;}).length;

                const fattYTD4=vistaTotale?agentiProd2.reduce((s,a)=>s+calcFattYTD(a.id),0):calcFattYTD(agIdPiano);
                const acqYTD4=vistaTotale?agentiProd2.reduce((s,a)=>s+calcAcqYTD(a.id),0):calcAcqYTD(agIdPiano);
                const transYTD4=vistaTotale?agentiProd2.reduce((s,a)=>s+calcTransYTD(a.id),0):calcTransYTD(agIdPiano);

                const meseCorr=new Date().getMonth()+1;
                const proiezioneFineAnno=meseCorr>0?Math.round(fattYTD4/meseCorr*12):0;
                const percF4=obFattPiano>0?Math.min(100,Math.round(fattYTD4/obFattPiano*100)):null;
                const percA4=acquisizioniNec>0?Math.min(100,Math.round(acqYTD4/acquisizioniNec*100)):null;
                const percT4=transazNec>0?Math.min(100,Math.round(transYTD4/transazNec*100)):null;
                const revisioni=vistaTotale?[]:(obAnnPiano.revisioni||[]);

                return(<div>
                  {/* Selettore broker */}
                  {canViewAll&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem",padding:"10px 14px",background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0"}}>
                    <span style={{fontSize:12,color:"#888",flexShrink:0}}>Piano di:</span>
                    <select style={S.sel} value={opAgenteSel} onChange={e=>setOpAgenteSel(e.target.value)}>
                      <option value="Tutti">🏢 Tutta l'agenzia</option>
                      {agentiProd2.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}
                    </select>
                    {!vistaTotale&&<>
                      <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",flexShrink:0}}>{agPiano.nome?.charAt(0)||"?"}</div>
                      <div><div style={{fontSize:13,fontWeight:600}}>{agPiano.nome} {agPiano.cognome}</div><div style={{fontSize:11,color:"#888"}}>{agPiano.profilo}</div></div>
                    </>}
                    {vistaTotale&&<div style={{fontSize:13,fontWeight:600,color:BRAND.oroD}}>Visione totale agenzia — somma obiettivi agenti</div>}
                  </div>}

                  {/* Vista totale agenzia — tabella agenti */}
                  {vistaTotale&&obFattPiano>0&&<>
                    <p style={{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 10px"}}>Obiettivi per agente — {annoPiano}</p>
                    <div style={{...sCard2,marginBottom:"1.25rem",overflow:"hidden",padding:0}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead><tr style={{background:"#fafaf8"}}>
                          {["Agente","Obiettivo","Fatturato YTD","% raggiunto","Acquisizioni","Transazioni"].map(h=>(
                            <th key={h} style={{padding:"8px 14px",fontSize:11,fontWeight:600,color:"#888",textAlign:h==="Agente"?"left":"right",borderBottom:"1px solid #eee"}}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {agentiProd2.map((ag,idx)=>{
                            const ob=Number((obiettivoAgente[ag.id]||{}).fatturato||0);
                            const fYTD=calcFattYTD(ag.id);
                            const aYTD=calcAcqYTD(ag.id);
                            const tYTD=calcTransYTD(ag.id);
                            const perc=ob>0?Math.min(100,Math.round(fYTD/ob*100)):null;
                            const AVBG=["#FAEEDA","#E6F1FB","#EEEDFE","#EAF3DE","#F1EFE8"];
                            const AVCL=["#412402","#0C447C","#3C3489","#173404","#444441"];
                            return(<tr key={ag.id} style={{borderBottom:"0.5px solid #f5f5f5"}}>
                              <td style={{padding:"10px 14px"}}>
                                <div style={{display:"flex",alignItems:"center",gap:8}}>
                                  <div style={{width:28,height:28,borderRadius:"50%",background:AVBG[idx%5],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:AVCL[idx%5]}}>{ag.nome.charAt(0)}</div>
                                  <span style={{fontSize:12,fontWeight:500}}>{ag.nome} {ag.cognome||""}</span>
                                </div>
                              </td>
                              <td style={{padding:"10px 14px",fontSize:13,textAlign:"right",color:ob>0?BRAND.oroD:"#bbb",fontWeight:ob>0?600:400}}>{ob>0?"€ "+fmt(ob):"—"}</td>
                              <td style={{padding:"10px 14px",fontSize:13,textAlign:"right",color:fYTD>0?"#085041":"#bbb",fontWeight:fYTD>0?500:400}}>{fYTD>0?"€ "+fmt(fYTD):"—"}</td>
                              <td style={{padding:"10px 14px",textAlign:"right"}}>
                                {perc!=null?<span style={{fontSize:12,fontWeight:600,color:clrP(perc),background:clrP(perc)+"15",padding:"2px 8px",borderRadius:6}}>{perc}%</span>:<span style={{color:"#bbb",fontSize:12}}>—</span>}
                              </td>
                              <td style={{padding:"10px 14px",fontSize:13,textAlign:"right"}}>{aYTD||"—"}</td>
                              <td style={{padding:"10px 14px",fontSize:13,textAlign:"right"}}>{tYTD||"—"}</td>
                            </tr>);
                          })}
                          {/* Riga totale */}
                          <tr style={{background:"#FFFBF0",borderTop:"2px solid #f0e8d0"}}>
                            <td style={{padding:"10px 14px",fontSize:12,fontWeight:700,color:BRAND.oroD}}>TOTALE AGENZIA</td>
                            <td style={{padding:"10px 14px",fontSize:13,textAlign:"right",fontWeight:700,color:BRAND.oroD}}>€ {fmt(obFattPiano)}</td>
                            <td style={{padding:"10px 14px",fontSize:13,textAlign:"right",fontWeight:700,color:"#085041"}}>€ {fmt(fattYTD4)}</td>
                            <td style={{padding:"10px 14px",textAlign:"right"}}>
                              {percF4!=null?<span style={{fontSize:13,fontWeight:700,color:clrP(percF4),background:clrP(percF4)+"15",padding:"2px 10px",borderRadius:6}}>{percF4}%</span>:<span style={{color:"#bbb"}}>—</span>}
                            </td>
                            <td style={{padding:"10px 14px",fontSize:13,textAlign:"right",fontWeight:700}}>{acqYTD4||"—"}</td>
                            <td style={{padding:"10px 14px",fontSize:13,textAlign:"right",fontWeight:700}}>{transYTD4||"—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>}

                  {/* Input obiettivi — solo agente singolo */}
                  {!vistaTotale&&<>
                    <p style={{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 10px"}}>Imposta obiettivo</p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:"1.25rem"}}>
                      <div style={{...sCard2,borderTop:`3px solid ${BRAND.oroD}`}}>
                        <p style={sLbl2}>Obiettivo fatturato annuale</p>
                        <div style={{display:"flex",alignItems:"baseline",gap:6,margin:"4px 0 2px"}}>
                          <span style={{fontSize:18,color:"#aaa"}}>€</span>
                          <input type="number" min="0" style={{fontSize:32,fontWeight:700,border:"none",background:"transparent",color:BRAND.oroD,outline:"none",fontFamily:"inherit",width:"100%"}}
                            value={obFattPiano||""} placeholder="200000"
                            onChange={e=>setObiettivoAgente(prev=>({...prev,[agIdPiano]:{...(prev[agIdPiano]||{}),fatturato:Number(e.target.value)}}))}/>
                        </div>
                        {obFattPiano>0&&<p style={{fontSize:12,color:BRAND.oroD,margin:0}}>= € {fmt(Math.round(obFattPiano/12))} / mese</p>}
                      </div>
                      <div style={{...sCard2,borderTop:"3px solid #854F0B"}}>
                        <p style={sLbl2}>Provv. media Càsa Immobiliare</p>
                        <div style={{display:"flex",alignItems:"baseline",gap:6,margin:"4px 0 2px"}}>
                          <span style={{fontSize:18,color:"#aaa"}}>€</span>
                          <input type="number" min="0" style={{fontSize:32,fontWeight:700,border:"none",background:"transparent",color:"#633806",outline:"none",fontFamily:"inherit",width:"100%"}}
                            value={provvCustom||""} placeholder={String(provvMediaReale)}
                            onChange={e=>setObiettivoAgente(prev=>({...prev,[agIdPiano]:{...(prev[agIdPiano]||{}),provvMedia:Number(e.target.value)}}))}/>
                        </div>
                        <p style={{fontSize:12,color:"#888",margin:0}}>media reale agenzia: <strong style={{color:"#633806"}}>€ {fmt(provvMediaReale)}</strong></p>
                      </div>
                    </div>
                  </>}

                  {/* Piano derivato */}
                  {(obFattPiano>0||!vistaTotale)&&<>
                    <p style={{fontSize:11,fontWeight:600,color:"#185FA5",textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 10px"}}>{vistaTotale?"Piano agenzia — derivato dalla somma obiettivi":"Piano derivato automaticamente"}</p>
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
                      {[
                        ["Transazioni necessarie",transazNec,BRAND.oroD,"ogni imm. = 2 transaz."],
                        ["Immobili da vendere",immobiliVend,"#27AE60","rogiti ÷ 2"],
                        ["Acquisizioni necessarie",acquisizioniNec,"#185FA5",acquisizioniMese+"/mese · conv. 65%"],
                        ["Appt. acq. / settimana",apptSett,"#8E44AD",apptMese+"/mese · conv. 40%"],
                      ].map(([lbl,val,clr,note])=>(
                        <div key={lbl} style={{...sCard2,borderTop:`3px solid ${clr}`,textAlign:"center"}}>
                          <p style={sLbl2}>{lbl}</p>
                          <p style={{fontSize:40,fontWeight:700,color:clr,margin:"4px 0 2px",lineHeight:1}}>{val||"—"}</p>
                          <p style={{fontSize:11,color:"#888",margin:0}}>{note}</p>
                        </div>
                      ))}
                    </div>
                  </>}

                  {/* Dove sei oggi */}
                  {(obFattPiano>0||!vistaTotale)&&<>
                    <p style={{fontSize:11,fontWeight:600,color:"#27AE60",textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 10px"}}>Dove sei oggi — {annoPiano}</p>
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10,marginBottom:"1rem"}}>
                      {[
                        ["💰 Fatturato YTD","€ "+fmt(fattYTD4),percF4,"#0F6E56","€ "+fmt(obFattPiano)],
                        ["🏠 Acquisizioni YTD",acqYTD4,percA4,"#185FA5",acquisizioniNec+" necessarie"],
                        ["📋 Transazioni YTD",transYTD4,percT4,"#8E44AD",transazNec+" necessarie"],
                      ].map(([lbl,val,perc,clr,obj])=>(
                        <div key={lbl} style={sCard2}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                            <p style={{...sLbl2,margin:0}}>{lbl}</p>
                            {perc!=null&&<span style={{fontSize:12,fontWeight:700,color:clrP(perc),background:clrP(perc)+"15",padding:"2px 8px",borderRadius:6}}>{perc}%</span>}
                          </div>
                          <p style={{fontSize:26,fontWeight:700,color:clr,margin:"2px 0 6px"}}>{val}</p>
                          <div style={{height:6,background:"#f0f0f0",borderRadius:3,overflow:"hidden",marginBottom:4}}>
                            <div style={{height:"100%",width:(perc||0)+"%",background:perc>=100?"#27AE60":perc>=70?"#E67E22":clr,borderRadius:3,transition:"width .4s"}}/>
                          </div>
                          <p style={{fontSize:11,color:"#aaa",margin:0}}>obj: {obj}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{...sCard2,display:"flex",alignItems:"center",gap:12,marginBottom:"1.25rem",borderLeft:`4px solid ${obFattPiano<=0?"#aaa":proiezioneFineAnno>=obFattPiano?"#27AE60":"#E67E22"}`}}>
                      <span style={{fontSize:28}}>{obFattPiano<=0?"💡":proiezioneFineAnno>=obFattPiano?"🎉":"📅"}</span>
                      <div>
                        {obFattPiano<=0
                          ?<p style={{fontSize:14,fontWeight:600,color:"#888",margin:"0 0 2px"}}>Imposta un obiettivo annuale per vedere la proiezione</p>
                          :proiezioneFineAnno>=obFattPiano
                            ?<p style={{fontSize:14,fontWeight:600,color:"#27AE60",margin:"0 0 2px"}}>A questo ritmo supererai l'obiettivo — proiezione € {fmt(proiezioneFineAnno)}</p>
                            :<p style={{fontSize:14,fontWeight:600,color:"#2c2c2c",margin:"0 0 2px"}}>A questo ritmo chiuderai a € {fmt(proiezioneFineAnno)} — mancano € {fmt(Math.max(0,obFattPiano-proiezioneFineAnno))}</p>
                        }
                        {obFattPiano>0&&obFattPiano>proiezioneFineAnno&&<p style={{fontSize:12,color:"#888",margin:0}}>Accelera di +€ {fmt(Math.round((obFattPiano-fattYTD4)/Math.max(1,12-meseCorr)))} / mese nei prossimi {12-meseCorr} mesi</p>}
                      </div>
                    </div>
                  </>}

                  {/* Revisioni — solo agente singolo */}
                  {!vistaTotale&&<>
                    <p style={{fontSize:11,fontWeight:600,color:"#8E44AD",textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 10px"}}>Revisioni obiettivo</p>
                    <div style={sCard2}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:revisioni.length>0?"1rem":0,flexWrap:"wrap",gap:8}}>
                        <span style={{fontSize:12,color:"#888"}}>{revisioni.length===0?"Nessuna revisione registrata":`${revisioni.length} revisione${revisioni.length>1?"i":""} · ultima è quella attiva`}</span>
                        {!isReadOnly&&<button onClick={()=>{
                          const motivo=prompt("Motivo della revisione:");
                          if(!motivo) return;
                          const nuovoOb=Number(prompt("Nuovo obiettivo fatturato €:"));
                          if(!nuovoOb||isNaN(nuovoOb)||nuovoOb<=0){alert("Inserisci un importo valido.");return;}
                          // Snapshot dei nuovi calcoli (basati sui parametri attuali)
                          const provvMediaPiano=Number(obAnnPiano.provvMedia)||5386;
                          const trans=Math.ceil(nuovoOb/provvMediaPiano);
                          const imm=Math.ceil(trans/2);
                          const acquis=Math.ceil(imm/0.65);
                          const appt=Math.ceil((acquis/12)/0.40);
                          const rev={data:oggi4,motivo,vecchio:obFattPiano,nuovo:nuovoOb,calc:{trans,imm,acquis,appt}};
                          setObiettivoAgente(prev=>({...prev,[agIdPiano]:{...(prev[agIdPiano]||{}),fatturato:nuovoOb,revisioni:[...(prev[agIdPiano]?.revisioni||[]),rev]}}));
                        }} style={{...S.btnP,fontSize:11,padding:"4px 14px"}}>+ Revisiona</button>}
                      </div>
                      {revisioni.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {revisioni.map((r,i)=>{
                          const isUltima=i===revisioni.length-1;
                          return(
                          <div key={i} style={{padding:"12px 14px",borderRadius:8,background:isUltima?"#FDFBF7":"#fafaf8",border:`0.5px solid ${isUltima?BRAND.oro+"66":"#eee"}`,position:"relative"}}>
                            {/* Riga superiore: motivo + variazione + cancellazione */}
                            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:r.calc?8:0}}>
                              <div style={{width:10,height:10,borderRadius:"50%",background:r.nuovo>r.vecchio?"#27AE60":"#E67E22",flexShrink:0}}/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:13,fontWeight:500,color:BRAND.grigio}}>{r.motivo}{isUltima&&<span style={{fontSize:9,color:"#fff",marginLeft:8,padding:"1px 8px",borderRadius:4,background:BRAND.oro,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,verticalAlign:"middle"}}>ATTIVA</span>}</div>
                                <div style={{fontSize:11,color:"#888",marginTop:2}}>{fmtD(r.data)} · da € {fmt(r.vecchio)} → <strong style={{color:BRAND.grigio}}>€ {fmt(r.nuovo)}</strong> {r.nuovo>r.vecchio?<span style={{color:"#27AE60"}}>↑</span>:<span style={{color:"#E67E22"}}>↓</span>}</div>
                              </div>
                              {!isReadOnly&&<button onClick={()=>{
                                if(!window.confirm(`Eliminare questa revisione?\\n\\nMotivo: ${r.motivo}\\nData: ${fmtD(r.data)}\\n\\nSe è l'ultima revisione, il fatturato tornerà al valore precedente.`)) return;
                                setObiettivoAgente(prev=>{
                                  const cur = prev[agIdPiano]||{};
                                  const nuoveRev = (cur.revisioni||[]).filter((_,idx)=>idx!==i);
                                  // Se elimino l'ULTIMA revisione, il fatturato torna al valore "vecchio" della revisione eliminata
                                  // Se invece elimino una in mezzo, il fatturato resta quello dell'ultima rimanente
                                  let nuovoFatt = cur.fatturato;
                                  if(i===(cur.revisioni||[]).length-1){
                                    // Era l'ultima → uso il "nuovo" dell'ultima rimanente, o il "vecchio" di questa se era l'unica
                                    nuovoFatt = nuoveRev.length>0 ? nuoveRev[nuoveRev.length-1].nuovo : r.vecchio;
                                  }
                                  return {...prev,[agIdPiano]:{...cur,fatturato:nuovoFatt,revisioni:nuoveRev}};
                                });
                              }} title="Elimina questa revisione" style={{background:"transparent",border:"0.5px solid #ddd",borderRadius:6,padding:"3px 8px",cursor:"pointer",color:"#E74C3C",fontSize:13,fontWeight:600,flexShrink:0}}>✕</button>}
                            </div>
                            {/* Dettaglio nuovi calcoli (se presenti) */}
                            {r.calc&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:6,marginTop:8,paddingTop:8,borderTop:`0.5px dashed ${isUltima?BRAND.oro+"44":"#ddd"}`}}>
                              <div style={{fontSize:10,color:"#888"}}><strong style={{color:BRAND.grigio,fontSize:13,display:"block",fontFamily:"Georgia,serif"}}>{r.calc.trans}</strong>Transazioni</div>
                              <div style={{fontSize:10,color:"#888"}}><strong style={{color:BRAND.grigio,fontSize:13,display:"block",fontFamily:"Georgia,serif"}}>{r.calc.imm}</strong>Immobili</div>
                              <div style={{fontSize:10,color:"#888"}}><strong style={{color:BRAND.grigio,fontSize:13,display:"block",fontFamily:"Georgia,serif"}}>{r.calc.acquis}</strong>Acquisizioni</div>
                              <div style={{fontSize:10,color:"#888"}}><strong style={{color:BRAND.grigio,fontSize:13,display:"block",fontFamily:"Georgia,serif"}}>{r.calc.appt}</strong>Appt/sett</div>
                            </div>}
                          </div>);
                        })}
                      </div>}
                    </div>
                  </>}
                </div>);
              })()}
            </div>
            );
          })()}

          {/* GESTIONE PRATICHE */}
          {tab==="Notizie"&&(()=>{
            const mieNotizie = canViewAll ? notizie : notizie.filter(n=>String(n.agenteId)===String(myAgentId));
            const vis = mieNotizie.filter(n=>{
              if(fNotAgente!=="tutti" && String(n.agenteId)!==String(fNotAgente)) return false;
              if(fNotFonte!=="tutte" && n.fonte!==fNotFonte) return false;
              if(fNotPrio!=="tutte" && n.priorita!==fNotPrio) return false;
              if(qNot.trim()){
                const q = qNot.trim().toLowerCase();
                const testo = [n.titolo,n.nome,n.cognome,n.cellulare,n.telefono,n.email,n.indirizzo,n.comune,n.zona,n.note].filter(Boolean).join(" ").toLowerCase();
                if(!testo.includes(q)) return false;
              }
              return true;
            });
            const perStato = k => vis.filter(n=>(n.stato||"nuova")===k);
            const oggiISO = new Date().toISOString().slice(0,10);
            const daRichiamare = vis.filter(n=>n.dataRichiamata && n.dataRichiamata<=oggiISO && n.stato!=="persa" && n.stato!=="incarico");
            const nomeAg = id => { const a=agenti.find(x=>String(x.id)===String(id)); return a?`${a.nome} ${a.cognome||""}`.trim():""; };

            const salvaNotizia = () => {
              const f = formNot;
              if(!f.nome && !f.cognome && !f.indirizzo){ alert("Inserisci almeno il nome del contatto oppure l'indirizzo dell'immobile."); return; }
              if(f.id){
                setNotizie(notizie.map(n=>n.id===f.id?{...f,updatedAt:Date.now()}:n));
              } else {
                setNotizie([...notizie,{...f,id:Date.now(),createdAt:Date.now(),updatedAt:Date.now(),agenteId:f.agenteId||myAgentId||""}]);
              }
              setFormNot(null);
            };
            const cambiaStato = (n,nuovo) => {
              setNotizie(notizie.map(x=>x.id===n.id?{...x,stato:nuovo,...(nuovo!=="persa"?{motivoPersa:""}:{}),updatedAt:Date.now()}:x));
            };

            return (
            <div style={S.sec}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
                <div>
                  <h2 style={{fontSize:16,fontWeight:600,margin:0,color:"#2C2C2C"}}>📣 Notizie</h2>
                  <div style={{fontSize:12,color:"#999",marginTop:2}}>Segnalazioni di immobili in vendita, dal primo contatto all'incarico</div>
                </div>
                <button style={S.btnP} onClick={()=>setFormNot({...NOTIZIA_VUOTA,agenteId:myAgentId||""})}>+ Nuova notizia</button>
              </div>

              {daRichiamare.length>0&&(
                <div style={{...S.warnBox,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <span style={{fontSize:13,color:"#7D6608"}}>🔔 <strong>{daRichiamare.length}</strong> {daRichiamare.length===1?"notizia da richiamare":"notizie da richiamare"}:</span>
                  {daRichiamare.slice(0,4).map(n=>(
                    <button key={n.id} onClick={()=>setFormNot({...n})} style={{...S.btn,fontSize:12,padding:"3px 9px"}}>
                      {titoloNotizia(n)}
                    </button>
                  ))}
                  {daRichiamare.length>4&&<span style={{fontSize:12,color:"#999"}}>e altre {daRichiamare.length-4}</span>}
                </div>
              )}

              <div style={S.fRow}>
                <input placeholder="Cerca nome, telefono, indirizzo…" value={qNot} onChange={e=>setQNot(e.target.value)}
                  style={{...S.sel,minWidth:220,flex:isMobile?"1 1 100%":"0 1 260px"}}/>
                {canViewAll&&(
                  <select value={fNotAgente} onChange={e=>setFNotAgente(e.target.value)} style={S.sel}>
                    <option value="tutti">Tutti gli agenti</option>
                    {agenti.filter(a=>a.tipo!=="Esterno").map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome||""}</option>)}
                  </select>
                )}
                <select value={fNotFonte} onChange={e=>setFNotFonte(e.target.value)} style={S.sel}>
                  <option value="tutte">Tutte le fonti</option>
                  {fonti.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
                <select value={fNotPrio} onChange={e=>setFNotPrio(e.target.value)} style={S.sel}>
                  <option value="tutte">Tutte le priorità</option>
                  {Object.entries(PRIORITA_NOT).map(([k,v])=><option key={k} value={k}>{v.lbl}</option>)}
                </select>
                {(qNot||fNotAgente!=="tutti"||fNotFonte!=="tutte"||fNotPrio!=="tutte")&&(
                  <button style={S.btn} onClick={()=>{setQNot("");setFNotAgente("tutti");setFNotFonte("tutte");setFNotPrio("tutte");}}>Azzera filtri</button>
                )}
              </div>

              {/* Colonne dell'iter */}
              <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8,alignItems:"flex-start"}}>
                {STATI_NOT.map(st=>{
                  const lista = perStato(st.k);
                  return (
                    <div key={st.k} style={{minWidth:250,width:250,flexShrink:0,background:"#fafaf8",borderRadius:10,border:"0.5px solid #e8e5e0"}}>
                      <div style={{padding:"9px 12px",borderBottom:`2px solid ${st.clr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:600,color:st.clr,textTransform:"uppercase",letterSpacing:"0.04em"}}>{st.lbl}</span>
                        <span style={{fontSize:12,color:"#aaa"}}>{lista.length}</span>
                      </div>
                      <div style={{padding:8,maxHeight:"58vh",overflowY:"auto"}}>
                        {lista.length===0&&<div style={{fontSize:12,color:"#ccc",textAlign:"center",padding:"18px 0"}}>—</div>}
                        {lista.map(n=>{
                          const pr = PRIORITA_NOT[n.priorita]||PRIORITA_NOT.media;
                          const scaduta = n.dataRichiamata && n.dataRichiamata<=oggiISO && st.k!=="persa" && st.k!=="incarico";
                          return (
                            <div key={n.id} style={{background:"#fff",border:`0.5px solid ${scaduta?"#E67E22":"#e8e5e0"}`,borderRadius:8,padding:"9px 11px",marginBottom:8}}>
                              <div style={{display:"flex",alignItems:"flex-start",gap:6}}>
                                <span title={`Priorità ${pr.lbl}`} style={{width:8,height:8,borderRadius:"50%",background:pr.clr,flexShrink:0,marginTop:5}}/>
                                <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>setFormNot({...n})}>
                                  <div style={{fontSize:13,fontWeight:500,color:"#2C2C2C",lineHeight:1.35}}>{titoloNotizia(n)}</div>
                                  {(n.nome||n.cognome)&&<div style={{fontSize:12,color:"#888",marginTop:2}}>{`${n.nome||""} ${n.cognome||""}`.trim()}</div>}
                                  {n.cellulare&&<div style={{fontSize:11,color:"#aaa",marginTop:1}}>{n.cellulare}</div>}
                                </div>
                              </div>
                              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:7}}>
                                {n.operazione&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:"#EAF2FB",color:"#2980B9"}}>{n.operazione}</span>}
                                {n.fonte&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:BRAND.beige,color:"#8a7a5c"}}>{n.fonte}</span>}
                                {!!n.valore&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:"#EAF7EF",color:"#27AE60"}}>€ {Number(n.valore).toLocaleString("it-IT")}</span>}
                              </div>
                              {scaduta&&<div style={{fontSize:11,color:"#E67E22",marginTop:6}}>🔔 Da richiamare il {n.dataRichiamata.split("-").reverse().join("/")}</div>}
                              {st.k==="persa"&&n.motivoPersa&&<div style={{fontSize:11,color:"#C0392B",marginTop:6}}>{n.motivoPersa}</div>}
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,gap:6}}>
                                <span style={{fontSize:10,color:"#bbb",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nomeAg(n.agenteId)}</span>
                                <select value={st.k} onChange={e=>cambiaStato(n,e.target.value)}
                                  style={{fontSize:10,padding:"2px 4px",borderRadius:5,border:"0.5px solid #ddd",background:"#fff",color:"#888",cursor:"pointer"}}>
                                  {STATI_NOT.map(s=><option key={s.k} value={s.k}>{s.lbl}</option>)}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scheda notizia */}
              {formNot&&(
                <div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setFormNot(null);}}>
                  <div style={S.modal}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                      <h3 style={{fontSize:15,fontWeight:600,margin:0}}>{formNot.id?"Modifica notizia":"Nuova notizia"}</h3>
                      <button onClick={()=>setFormNot(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#bbb",lineHeight:1}}>×</button>
                    </div>

                    <div style={{marginBottom:10}}>
                      <label style={S.lbl}>Titolo <span style={{color:"#ccc"}}>(se vuoto lo compone da tipologia e indirizzo)</span></label>
                      <input style={S.inp} value={formNot.titolo} onChange={e=>setFormNot({...formNot,titolo:e.target.value})}/>
                    </div>

                    <div style={{...S.divider}}/>
                    <div style={{fontSize:12,color:"#999",marginBottom:8}}>CONTATTO</div>
                    <div style={S.g2}>
                      <div><label style={S.lbl}>Nome</label><input style={S.inp} value={formNot.nome} onChange={e=>setFormNot({...formNot,nome:e.target.value})}/></div>
                      <div><label style={S.lbl}>Cognome</label><input style={S.inp} value={formNot.cognome} onChange={e=>setFormNot({...formNot,cognome:e.target.value})}/></div>
                    </div>
                    <div style={S.g2}>
                      <div><label style={S.lbl}>Cellulare</label><input style={S.inp} value={formNot.cellulare} onChange={e=>setFormNot({...formNot,cellulare:e.target.value})}/></div>
                      <div><label style={S.lbl}>Telefono fisso</label><input style={S.inp} value={formNot.telefono} onChange={e=>setFormNot({...formNot,telefono:e.target.value})}/></div>
                    </div>
                    <div style={{marginBottom:10}}>
                      <label style={S.lbl}>Email</label>
                      <input style={S.inp} type="email" value={formNot.email} onChange={e=>setFormNot({...formNot,email:e.target.value})}/>
                    </div>

                    <div style={S.divider}/>
                    <div style={{fontSize:12,color:"#999",marginBottom:8}}>IMMOBILE</div>
                    <div style={S.g2}>
                      <div>
                        <label style={S.lbl}>Tipologia</label>
                        <select style={S.inp} value={formNot.tipologia} onChange={e=>setFormNot({...formNot,tipologia:e.target.value})}>
                          <option value="">—</option>
                          {tipologie.map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={S.lbl}>Operazione</label>
                        <select style={S.inp} value={formNot.operazione} onChange={e=>setFormNot({...formNot,operazione:e.target.value})}>
                          {OPERAZIONI_NOT.map(o=><option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{marginBottom:10}}>
                      <label style={S.lbl}>Indirizzo</label>
                      <input style={S.inp} value={formNot.indirizzo} onChange={e=>setFormNot({...formNot,indirizzo:e.target.value})}/>
                    </div>
                    <div style={S.g2}>
                      <div><label style={S.lbl}>Comune</label><input style={S.inp} value={formNot.comune} onChange={e=>setFormNot({...formNot,comune:e.target.value})}/></div>
                      <div><label style={S.lbl}>Zona / quartiere</label><input style={S.inp} value={formNot.zona} onChange={e=>setFormNot({...formNot,zona:e.target.value})}/></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
                      <div><label style={S.lbl}>Mq</label><input style={S.inp} value={formNot.mq} onChange={e=>setFormNot({...formNot,mq:e.target.value})}/></div>
                      <div><label style={S.lbl}>Locali</label><input style={S.inp} value={formNot.locali} onChange={e=>setFormNot({...formNot,locali:e.target.value})}/></div>
                      <div><label style={S.lbl}>Piano</label><input style={S.inp} value={formNot.piano} onChange={e=>setFormNot({...formNot,piano:e.target.value})}/></div>
                      <div><label style={S.lbl}>Valore €</label><input style={S.inp} type="number" value={formNot.valore} onChange={e=>setFormNot({...formNot,valore:e.target.value})}/></div>
                    </div>
                    <div style={{marginBottom:10}}>
                      <label style={S.lbl}>Link annuncio</label>
                      <input style={S.inp} value={formNot.linkAnnuncio} onChange={e=>setFormNot({...formNot,linkAnnuncio:e.target.value})} placeholder="https://…"/>
                    </div>

                    <div style={S.divider}/>
                    <div style={{fontSize:12,color:"#999",marginBottom:8}}>GESTIONE</div>
                    <div style={S.g2}>
                      <div>
                        <label style={S.lbl}>Fonte</label>
                        <select style={S.inp} value={formNot.fonte} onChange={e=>setFormNot({...formNot,fonte:e.target.value})}>
                          <option value="">—</option>
                          {fonti.map(f=><option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div><label style={S.lbl}>Dettaglio fonte</label><input style={S.inp} value={formNot.dettaglioFonte} onChange={e=>setFormNot({...formNot,dettaglioFonte:e.target.value})} placeholder="es. nome del collega"/></div>
                    </div>
                    <div style={S.g2}>
                      <div>
                        <label style={S.lbl}>Priorità</label>
                        <select style={S.inp} value={formNot.priorita} onChange={e=>setFormNot({...formNot,priorita:e.target.value})}>
                          {Object.entries(PRIORITA_NOT).map(([k,v])=><option key={k} value={k}>{v.lbl}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={S.lbl}>Agente</label>
                        <select style={S.inp} value={formNot.agenteId} onChange={e=>setFormNot({...formNot,agenteId:e.target.value})} disabled={!canViewAll}>
                          <option value="">—</option>
                          {agenti.filter(a=>a.tipo!=="Esterno").map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome||""}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={S.g2}>
                      <div><label style={S.lbl}>Data primo contatto</label><input style={S.inp} type="date" value={formNot.dataContatto} onChange={e=>setFormNot({...formNot,dataContatto:e.target.value})}/></div>
                      <div><label style={S.lbl}>Da richiamare il</label><input style={S.inp} type="date" value={formNot.dataRichiamata} onChange={e=>setFormNot({...formNot,dataRichiamata:e.target.value})}/></div>
                    </div>
                    <div style={S.g2}>
                      <div>
                        <label style={S.lbl}>Stato</label>
                        <select style={S.inp} value={formNot.stato} onChange={e=>setFormNot({...formNot,stato:e.target.value})}>
                          {STATI_NOT.map(s=><option key={s.k} value={s.k}>{s.lbl}</option>)}
                        </select>
                      </div>
                      {formNot.stato==="persa"&&(
                        <div>
                          <label style={S.lbl}>Motivo</label>
                          <select style={S.inp} value={formNot.motivoPersa} onChange={e=>setFormNot({...formNot,motivoPersa:e.target.value})}>
                            <option value="">—</option>
                            {MOTIVI_PERSA.map(m=><option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <div style={{marginBottom:14}}>
                      <label style={S.lbl}>Note</label>
                      <textarea style={{...S.inp,minHeight:70,resize:"vertical",fontFamily:"inherit"}} value={formNot.note} onChange={e=>setFormNot({...formNot,note:e.target.value})}/>
                    </div>

                    <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                      {formNot.id
                        ? <button style={{...S.btn,color:"#C0392B",borderColor:"#E8C4BE"}}
                            onClick={()=>{ if(confirm("Eliminare definitivamente questa notizia?")){ setNotizie(notizie.filter(n=>n.id!==formNot.id)); setFormNot(null); } }}>Elimina</button>
                        : <span/>}
                      <div style={{display:"flex",gap:8}}>
                        <button style={S.btn} onClick={()=>setFormNot(null)}>Annulla</button>
                        <button style={S.btnP} onClick={salvaNotizia}>Salva</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            );
          })()}


        </div>
      </div>

      {schedaAgente&&<SchedaAgente agente={schedaAgente} venduti={vendReport} incarichi={incarichi} prospetti={prospetti} onClose={()=>setSchedaAgente(null)}/>}

      {/* MODAL SELEZIONE INCARICO AGENZIA PER PROPOSTA */}
      {showSelIncaricoAg&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowSelIncaricoAg(false)}>
        <div style={{...S.modal,width:"min(96vw,640px)",maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexShrink:0}}>
            <div>
              <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 3px",color:BRAND.grigio}}>🏢 Seleziona immobile agenzia</h2>
              <p style={{fontSize:12,color:"#aaa",margin:0}}>Incarichi attivi di tutti gli agenti — scegli quello su cui creare la proposta</p>
            </div>
            <button onClick={()=>setShowSelIncaricoAg(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#ccc",padding:0}}>✕</button>
          </div>
          {/* Ricerca */}
          <input style={{...S.inp,marginBottom:12,flexShrink:0}} placeholder="Cerca per nominativo, comune, indirizzo, tipologia..." value={cercaIncAg} onChange={e=>setCercaIncAg(e.target.value)}/>
          {/* Lista incarichi */}
          <div style={{overflowY:"auto",flex:1}}>
            {incarichi.filter(i=>{
              if(i.categoria!==subProp) return false;
              if(i.archiviato) return false;
              const s=statoInc(i);
              if(s==="Venduto"||s==="Locato") return false;
              if(!cercaIncAg) return true;
              const q=cercaIncAg.toLowerCase();
              return (i.nominativo||"").toLowerCase().includes(q)||(i.comune||"").toLowerCase().includes(q)||(i.indirizzo||"").toLowerCase().includes(q)||(i.tipologia||"").toLowerCase().includes(q);
            }).map(i=>{
              const agListing=agenti.find(a=>a.id===Number(i.agenteListing));
              const isCollega=agListing&&agListing.id!==myAgentId;
              return(
                <div key={i.id} style={{padding:"12px 14px",borderRadius:8,border:`1px solid ${isCollega?"#4A90D944":"#e8e5e0"}`,marginBottom:8,cursor:"pointer",background:isCollega?"#EAF4FB":"#fff",transition:"all 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.1)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
                  onClick={()=>{
                    setFormProp(emptyProp(subProp,i));
                    // Pre-imposta agente acquirente con l'agente loggato se non broker
                    if(!isBroker&&myAgentId) setFormProp(fp=>({...fp,...emptyProp(subProp,i),agenteAcquirente:myAgentId,percAcquirente:agenti.find(a=>a.id===myAgentId)?.percAcquirente||0}));
                    if(!isReadOnly)setShowProp("new");
                    setShowSelIncaricoAg(false);
                  }}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontWeight:600,fontSize:13,color:BRAND.grigio}}>{i.comune} — {i.indirizzo}</span>
                        <span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:"#f0f0f0",color:"#666"}}>{i.tipologia}</span>
                        {isCollega&&<span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:"#2980B922",color:"#2980B9",fontWeight:500}}>📋 collega</span>}
                      </div>
                      <div style={{fontSize:12,color:"#888"}}>
                        <span style={{marginRight:12}}>👤 {i.nominativo}</span>
                        <span style={{marginRight:12}}>🏷️ {agListing?`${agListing.nome} ${agListing.cognome}`:"—"}</span>
                        <span>📅 scad. {fmtD(i.scadenza)}</span>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                      <div style={{fontSize:13,fontWeight:600,color:BRAND.oroD}}>€ {fmtN(i.prezzoRichiesto)}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>prezzo richiesto</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {incarichi.filter(i=>i.categoria===subProp&&!i.archiviato&&statoInc(i)!=="Venduto"&&statoInc(i)!=="Locato").length===0&&(
              <p style={{textAlign:"center",color:"#bbb",fontSize:13,margin:"2rem 0"}}>Nessun incarico attivo</p>
            )}
          </div>
        </div>
      </div>)}
      {schedaIncarico&&<SchedaIncaricoVenduto {...schedaIncarico} agenti={agenti} onClose={()=>setSchedaIncarico(null)}/>}

      {/* MODAL RIBASSO PREZZO */}
      {showRibasso&&(<div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowRibasso(null);}}>
        <div style={{...S.modal,width:"min(96vw,480px)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem"}}>
            <div>
              <h2 style={{fontSize:16,fontWeight:500,margin:"0 0 3px",color:BRAND.grigio}}>Ribasso prezzo</h2>
              <p style={{fontSize:13,color:"#aaa",margin:0}}>{showRibasso.nominativo} — {showRibasso.comune}</p>
            </div>
            <button onClick={()=>setShowRibasso(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#ccc",padding:0}}>✕</button>
          </div>

          {/* Storico ribassi */}
          {(showRibasso.storicoRibassi||[]).length>0&&(
            <div style={{background:BRAND.beige,borderRadius:8,padding:"12px 14px",marginBottom:"1rem"}}>
              <p style={{fontSize:12,fontWeight:500,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 8px"}}>Storico ribassi</p>
              <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,color:"#888",borderBottom:"0.5px solid #ddd",marginBottom:4}}>
                <span style={{flex:1}}>Data</span><span style={{flex:2}}>Nota</span><span style={{textAlign:"right",minWidth:100}}>Prezzo</span><span style={{minWidth:20}}></span>
              </div>
              {(showRibasso.storicoRibassi||[]).map((r,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"0.5px solid #f0f0f0",fontSize:13}}>
                  <span style={{flex:1,color:"#888"}}>{fmtD(r.data)}</span>
                  <span style={{flex:2,color:BRAND.grigio}}>{r.note||"—"}</span>
                  <span style={{fontWeight:500,color:BRAND.oroD,minWidth:100,textAlign:"right"}}>€ {fmtN(r.prezzo)}</span>
                  <button style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:14,marginLeft:8,padding:0}}
                    onClick={()=>{if(window.confirm("Eliminare questo ribasso?"))setIncarichi(incarichi.map(x=>x.id===showRibasso.id?{...x,storicoRibassi:(x.storicoRibassi||[]).filter((_,j)=>j!==i)}:{...x}));setShowRibasso(incarichi.find(x=>x.id===showRibasso.id));}}
                    onMouseEnter={e=>e.currentTarget.style.color="#E74C3C"} onMouseLeave={e=>e.currentTarget.style.color="#ddd"}>✕</button>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:13,fontWeight:500}}>
                <span style={{color:"#888"}}>Prezzo originale:</span>
                <span style={{color:BRAND.grigio}}>€ {fmtN(showRibasso.prezzoRichiesto)}</span>
              </div>
              {(showRibasso.storicoRibassi||[]).length>0&&(
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:500,marginTop:4}}>
                  <span style={{color:"#888"}}>Prezzo attuale:</span>
                  <span style={{color:BRAND.oroD}}>€ {fmtN(showRibasso.storicoRibassi[showRibasso.storicoRibassi.length-1].prezzo)}</span>
                </div>
              )}
            </div>
          )}

          {/* Form nuovo ribasso */}
          <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:8,padding:"12px 14px",marginBottom:"1rem"}}>
            <p style={{fontSize:12,fontWeight:500,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 10px"}}>Nuovo ribasso</p>
            <div style={S.g2}>
              <div><label style={S.lbl}>Data ribasso</label><input style={S.inp} type="date" value={formRibasso.data} onChange={e=>setFormRibasso({...formRibasso,data:e.target.value})}/></div>
              <div><label style={S.lbl}>Nuovo prezzo (€)</label><input style={S.inp} type="number" placeholder="es. 190000" value={formRibasso.prezzo} onChange={e=>setFormRibasso({...formRibasso,prezzo:e.target.value})}/></div>
            </div>
            <div style={{marginTop:8}}><label style={S.lbl}>Nota (opzionale)</label><input style={S.inp} type="text" placeholder="es. Accordo con venditore" value={formRibasso.note} onChange={e=>setFormRibasso({...formRibasso,note:e.target.value})}/></div>
            {formRibasso.prezzo&&Number(formRibasso.prezzo)>0&&(
              <div style={{marginTop:8,padding:"8px 10px",background:BRAND.beige,borderRadius:6,fontSize:12,display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#888"}}>Ribasso rispetto al prezzo originale:</span>
                <span style={{fontWeight:500,color:"#E74C3C"}}>-€ {fmtN(Number(showRibasso.prezzoRichiesto)-Number(formRibasso.prezzo))} ({((Number(showRibasso.prezzoRichiesto)-Number(formRibasso.prezzo))/Number(showRibasso.prezzoRichiesto)*100).toFixed(1)}%)</span>
              </div>
            )}
          </div>

          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={S.btn} onClick={()=>setShowRibasso(null)}>Annulla</button>
            <button style={S.btnP} onClick={()=>{
              if(!formRibasso.prezzo||!Number(formRibasso.prezzo)) return;
              const nuovoRibasso={data:formRibasso.data,prezzo:Number(formRibasso.prezzo),note:formRibasso.note};
              const inc_upd=incarichi.map(x=>x.id===showRibasso.id?{...x,prezzoReale:Number(formRibasso.prezzo),storicoRibassi:[...(x.storicoRibassi||[]),nuovoRibasso]}:x);
              setIncarichi(inc_upd);
              setShowRibasso({...showRibasso,storicoRibassi:[...(showRibasso.storicoRibassi||[]),nuovoRibasso],prezzoReale:Number(formRibasso.prezzo)});
              setFormRibasso({data:todayStr(),prezzo:"",note:""});
            }}>Salva ribasso</button>
          </div>
        </div>
      </div>)}

      {/* MODAL INCARICO */}
      {showInc&&(<div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowInc(null);}}>
        <div style={S.modal}>
          <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 1rem"}}>{showInc==="new"?"Nuovo":"Modifica"} incarico — {formInc.categoria==="affitto"?"Affitto":"Vendita"}</h2>
          <div style={S.g2}>
            <div><label style={S.lbl}>Agente Listing</label><select style={S.inp} value={formInc.agenteListing||""} onChange={e=>{const ag=agenti.find(a=>a.id===Number(e.target.value));setFormInc({...formInc,agenteListing:e.target.value,percListing:ag?Number(ag.percListing||0):formInc.percListing});}}><option value="">Seleziona</option>{agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
            <div style={{background:"#FAEEDA",border:"1px solid #E8C97A",borderRadius:8,padding:"8px 10px"}}><label style={{...S.lbl,color:"#854F0B",fontWeight:600}}>% Provv. Listing — {Number(formInc.agenteListing)===myAgentId?"la tua 💰":"dell'agente 💰"}</label><input style={{...S.inp,color:"#854F0B",fontWeight:700,borderColor:"#E8C97A",margin:0}} type="number" step="0.1" value={formInc.percListing||""} onChange={e=>setFormInc({...formInc,percListing:e.target.value})}/><span style={{fontSize:10,color:"#854F0B",display:"block",marginTop:4,lineHeight:1.4}}>Già impostata dalle Impostazioni — modifica solo se diversa da quella preimpostata</span></div>
            <div><label style={S.lbl}>Buyer Listing (opz.)</label><select style={S.inp} value={formInc.buyerListing||""} onChange={e=>setFormInc({...formInc,buyerListing:e.target.value})}><option value="">Nessuno</option>{agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
            <div><label style={S.lbl}>% Buyer Listing</label><input style={S.inp} type="number" step="0.1" value={formInc.percBuyerListing||""} onChange={e=>setFormInc({...formInc,percBuyerListing:e.target.value})}/></div>
            <div><label style={S.lbl}>Fonte</label><select style={S.inp} value={formInc.fonte||""} onChange={e=>setFormInc({...formInc,fonte:e.target.value})}><option value="">Seleziona</option>{fonti.map(f=><option key={f}>{f}</option>)}</select></div>
            <div><label style={S.lbl}>Nominativo venditore</label><input style={S.inp} value={formInc.nominativo||""} onChange={e=>setFormInc({...formInc,nominativo:e.target.value})}/></div>
            <div><label style={S.lbl}>Comune</label><input style={S.inp} value={formInc.comune||""} onChange={e=>setFormInc({...formInc,comune:e.target.value})}/></div>
            <div><label style={S.lbl}>Indirizzo</label><input style={S.inp} value={formInc.indirizzo||""} onChange={e=>setFormInc({...formInc,indirizzo:e.target.value})}/></div>
            <div><label style={S.lbl}>Tipologia</label><select style={S.inp} value={formInc.tipologia||""} onChange={e=>setFormInc({...formInc,tipologia:e.target.value})}><option value="">Seleziona</option>{tipologie.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={S.lbl}>Data inizio</label><input style={S.inp} type="date" value={formInc.dataInizio||""} onChange={e=>setFormInc({...formInc,dataInizio:e.target.value})}/></div>
            <div><label style={S.lbl}>Scadenza</label><input style={S.inp} type="date" value={formInc.scadenza||""} onChange={e=>setFormInc({...formInc,scadenza:e.target.value})}/></div>
            <div><label style={S.lbl}>{formInc.categoria==="affitto"?"Canone mensile (EUR)":"Prezzo richiesto (EUR)"}</label><div style={{position:"relative"}}><input style={S.inp} type="number" value={formInc.prezzoRichiesto||""} onChange={e=>{const pr=Number(e.target.value);const perc=Number(formInc.percProvv||0);setFormInc({...formInc,prezzoRichiesto:e.target.value,provvPrevista:perc>0&&pr>0?Math.round(pr*perc/100):formInc.provvPrevista});}}/>{formInc.prezzoRichiesto>0&&<span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:BRAND.oroD,pointerEvents:"none",background:"#fff",paddingLeft:4}}>= € {fmtN(formInc.prezzoRichiesto)}</span>}</div></div>
            <div><label style={S.lbl}>{formInc.categoria==="affitto"?"Canone reale (EUR)":"Prezzo reale stimato (EUR)"}</label><input style={S.inp} type="number" value={formInc.prezzoReale||""} onChange={e=>setFormInc({...formInc,prezzoReale:e.target.value})}/></div>
            <div><label style={S.lbl}>% Provvigione venditore</label><input style={S.inp} type="number" step="0.1" placeholder="es. 3" value={formInc.percProvv||""} onChange={e=>{const perc=Number(e.target.value);const prezzo=Number(formInc.prezzoRichiesto||0);setFormInc({...formInc,percProvv:e.target.value,provvPrevista:prezzo>0?Math.round(prezzo*perc/100):formInc.provvPrevista});}}/><span style={{fontSize:10,color:"#aaa"}}>A carico del cliente venditore che ha conferito l'incarico</span></div>
            <div><label style={S.lbl}>Provvigione prevista venditore (EUR) — calcolata o manuale</label><div style={{position:"relative"}}><input style={S.inp} type="number" value={formInc.provvPrevista||""} onChange={e=>setFormInc({...formInc,provvPrevista:e.target.value,percProvv:""})} placeholder="Calcolata automaticamente dalla %"/>{formInc.provvPrevista>0&&<span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:BRAND.oroD,pointerEvents:"none",background:"#fff",paddingLeft:4}}>= € {fmtN(formInc.provvPrevista)}</span>}</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>{formInc.codicePratica&&<><label style={S.lbl}>Codice pratica</label><input style={{...S.inp,background:"#f5f5f5",fontFamily:"monospace"}} value={formInc.codicePratica} disabled/></>}</div>
            <div></div>
          </div>
          <div><label style={S.lbl}>Note</label><textarea style={{...S.inp,resize:"vertical",minHeight:60}} value={formInc.note||""} onChange={e=>setFormInc({...formInc,note:e.target.value})}/></div>
          <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:"1rem"}}>
            <div>{showInc!=="new"&&<button style={S.btnG} onClick={()=>{setFormProp(emptyProp(showInc.categoria,showInc));setShowInc(null);if(!isReadOnly)setShowProp("new");}}>+ Crea Proposta</button>}</div>
            <div style={{display:"flex",gap:8}}><button style={S.btn} onClick={()=>setShowInc(null)}>Annulla</button><button style={S.btnP} onClick={salvaInc}>Salva</button></div>
          </div>
        </div>
      </div>)}

      {/* MODAL PROPOSTA */}
      {showProp&&(<div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowProp(null);}}>
        <div style={S.modal}>
          <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 4px"}}>{showProp==="edit"?"Modifica proposta":"Nuova proposta"}</h2>
          <p style={{fontSize:13,color:BRAND.oroD,margin:"0 0 1rem"}}>{formProp.tipo==="da_incarico"?"Da incarico":"Collaborazione"}</p>
          {formProp.tipo==="collaborazione"&&(<div style={S.hl}><div style={S.g2}>
            <div><label style={S.lbl}>Agenzia esterna</label><input style={S.inp} value={formProp.agenziaEsterna||""} onChange={e=>setFormProp({...formProp,agenziaEsterna:e.target.value})}/></div>
            <div><label style={S.lbl}>Tipologia</label><select style={S.inp} value={formProp.tipologia||""} onChange={e=>setFormProp({...formProp,tipologia:e.target.value})}><option value="">Seleziona</option>{tipologie.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={S.lbl}>Comune</label><input style={S.inp} value={formProp.comuneImmobile||""} onChange={e=>setFormProp({...formProp,comuneImmobile:e.target.value})}/></div>
            <div><label style={S.lbl}>Indirizzo</label><input style={S.inp} value={formProp.indirizzoImmobile||""} onChange={e=>setFormProp({...formProp,indirizzoImmobile:e.target.value})}/></div>
            <div><label style={S.lbl}>Nominativo venditore</label><input style={S.inp} value={formProp.nominativoVenditore||""} onChange={e=>setFormProp({...formProp,nominativoVenditore:e.target.value})}/></div>
          </div></div>)}
          {formProp.tipo==="da_incarico"&&(<div style={{...S.hl,fontSize:13,color:"#555",marginBottom:10}}><strong>{formProp.nominativoVenditore}</strong> — {formProp.comuneImmobile}, {formProp.indirizzoImmobile} ({formProp.tipologia})</div>)}
          <div style={S.g2}>
            <div><label style={S.lbl}>Data proposta</label><input style={S.inp} type="date" value={formProp.dataStato||todayStr()} onChange={e=>setFormProp({...formProp,dataStato:e.target.value})}/></div>
            <div><label style={S.lbl}>Scadenza proposta</label><input style={S.inp} type="date" value={formProp.scadenzaProposta||""} onChange={e=>setFormProp({...formProp,scadenzaProposta:e.target.value})}/></div>
            {/* Nome + Prezzo */}
            <div><label style={S.lbl}>Nome acquirente</label><input style={S.inp} value={formProp.nomeAcquirente||""} onChange={e=>setFormProp({...formProp,nomeAcquirente:e.target.value})}/></div>
            <div><label style={S.lbl}>Prezzo offerto (EUR)</label><input style={S.inp} type="number" value={formProp.prezzoOfferto||""} onChange={e=>{const pr=Number(e.target.value);setFormProp({...formProp,prezzoOfferto:e.target.value,provvAcquirente:formProp.percProvvAcquirente?Math.round(pr*Number(formProp.percProvvAcquirente)/100):formProp.provvAcquirente,provvVenditore:formProp.percProvvVenditore?Math.round(pr*Number(formProp.percProvvVenditore)/100):formProp.provvVenditore});}}/></div>
            {/* Provv Cliente Acquirente */}
            <div style={{gridColumn:"1/-1",background:BRAND.beige,borderRadius:8,padding:"12px 14px"}}>
              <p style={{fontSize:12,fontWeight:600,color:BRAND.oroD,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 10px"}}>Provvigione Acquirente</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <label style={{...S.lbl,textAlign:"center",display:"block",marginBottom:6}}>% sul prezzo offerto</label>
                  <input style={S.inp} type="number" step="0.1" placeholder="es. 3" value={formProp.percProvvAcquirente||""} onChange={e=>{const perc=Number(e.target.value);setFormProp({...formProp,percProvvAcquirente:e.target.value,provvAcquirente:formProp.prezzoOfferto?Math.round(Number(formProp.prezzoOfferto)*perc/100):formProp.provvAcquirente});}}/>
                </div>
                <div>
                  <label style={{...S.lbl,textAlign:"center",display:"block",marginBottom:6}}>EUR — calcolata o manuale</label>
                  <input style={S.inp} type="number" value={formProp.provvAcquirente||""} onChange={e=>setFormProp({...formProp,provvAcquirente:e.target.value})}/>
                </div>
              </div>
            </div>
            {/* Separatore lato Acquirente */}
            <div style={{gridColumn:"1/-1",borderTop:"0.5px solid #eee",paddingTop:8,marginTop:4}}><span style={{fontSize:11,fontWeight:600,color:"#8E44AD",textTransform:"uppercase",letterSpacing:"0.08em"}}>Agenti lato Acquirente</span></div>
            <div><label style={S.lbl}>Agente Acquirente</label><select style={S.inp} value={formProp.agenteAcquirente||""} onChange={e=>{const ag=agenti.find(a=>a.id===Number(e.target.value));setFormProp({...formProp,agenteAcquirente:e.target.value,percAcquirente:ag?Number(ag.percAcquirente||0):formProp.percAcquirente});}}><option value="">Seleziona</option>{agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
            <div style={{background:"#FAEEDA",border:"1px solid #E8C97A",borderRadius:8,padding:"8px 10px"}}><label style={{...S.lbl,color:"#854F0B",fontWeight:600}}>% Provv. Agente Acquirente — {Number(formProp.agenteAcquirente)===myAgentId?"la tua 💰":"dell'agente 💰"}</label><input style={{...S.inp,color:"#854F0B",fontWeight:700,borderColor:"#E8C97A",margin:0}} type="number" step="0.1" placeholder="es. 40" value={formProp.percAcquirente||""} onChange={e=>setFormProp({...formProp,percAcquirente:e.target.value})}/><span style={{fontSize:10,color:"#854F0B",display:"block",marginTop:4,lineHeight:1.4}}>Già impostata dalle Impostazioni — modifica solo se diversa da quella preimpostata</span></div>
            <div><label style={S.lbl}>Buyer (opzionale)</label><select style={S.inp} value={formProp.buyer||""} onChange={e=>setFormProp({...formProp,buyer:e.target.value})}><option value="">Nessuno</option>{agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
            <div><label style={S.lbl}>% Provv. Buyer</label><input style={S.inp} type="number" step="0.1" value={formProp.percBuyer||""} onChange={e=>setFormProp({...formProp,percBuyer:e.target.value})}/></div>

          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,margin:"8px 0"}}><input type="checkbox" id="vinc" checked={formProp.vincolata||false} onChange={e=>setFormProp({...formProp,vincolata:e.target.checked})}/><label htmlFor="vinc" style={{fontSize:13}}>Proposta vincolata</label></div>
          {formProp.vincolata&&(<div style={S.g2}>
            <div><label style={S.lbl}>Tipo vincolo</label><select style={S.inp} value={formProp.tipoVincolo||""} onChange={e=>setFormProp({...formProp,tipoVincolo:e.target.value})}><option value="">Seleziona</option>{vincoli.map(v=><option key={v}>{v}</option>)}</select></div>
            <div><label style={S.lbl}>Termine subordine</label><input style={S.inp} type="date" value={formProp.termineSubordine||""} onChange={e=>setFormProp({...formProp,termineSubordine:e.target.value})}/></div>
          </div>)}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem"}}><button style={S.btn} onClick={()=>setShowProp(null)}>Annulla</button><button style={S.btnP} onClick={salvaProp}>Salva</button></div>
        </div>
      </div>)}

      {/* MODAL GESTIONE PROPOSTA */}
      {showGestProp&&(<div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowGestProp(null);}}>
        <div style={S.modal}>
          <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 4px"}}>Gestione proposta</h2>
          <p style={{fontSize:13,color:"#aaa",margin:"0 0 1rem"}}>{showGestProp.comuneImmobile} — {showGestProp.indirizzoImmobile} | <strong>{showGestProp.nomeAcquirente}</strong> | € {fmtN(showGestProp.prezzoOfferto)}</p>

          {/* Storico controproposte */}
          {(showGestProp.controproposte||[]).length>0&&(
            <div style={{...S.hl,marginBottom:12}}>
              <p style={{fontSize:12,fontWeight:600,color:BRAND.oroD,margin:"0 0 8px"}}>STORICO CONTROPROPOSTE</p>
              {(showGestProp.controproposte||[]).map((c,i)=>(
                <div key={i} style={{fontSize:12,padding:"6px 0",borderBottom:"0.5px solid #eee"}}>
                  <span style={{color:"#888"}}>{fmtD(c.data)}</span>
                  <span style={{margin:"0 8px",fontWeight:500}}>{c.parte}:</span>
                  <span>€ {fmtN(c.prezzo)}</span>
                  {c.note&&<span style={{color:"#aaa",marginLeft:8}}>— {c.note}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Risposta venditore */}
          {(showGestProp.stato==="In attesa"||showGestProp.stato==="In attesa / Vincolata")&&(<>
            <p style={{fontSize:13,fontWeight:500,margin:"0 0 8px"}}>Risposta del venditore</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              {["Accettata","Controproposta","Rifiutata","Mancata Chiusura",...(showGestProp.vincolata?["Accettata con Vincolo"]:[])].map(s=>{const cfg=STATI_PROP[s];const sel=formStatoProp.stato===s;return(<button key={s} onClick={()=>setFormStatoProp({...formStatoProp,stato:s})} style={{...S.btn,border:`1.5px solid ${sel?cfg?.clr:"#ddd"}`,background:sel?cfg?.bg:"#fff",color:sel?cfg?.clr:BRAND.grigio,fontWeight:sel?500:400}}>{cfg?.s} {s}</button>);})}
            </div>
          </>)}

          {/* Risposta acquirente alla controproposta */}
          {showGestProp.stato==="Controproposta"&&(<>
            <p style={{fontSize:13,fontWeight:500,margin:"0 0 8px"}}>Risposta acquirente alla controproposta</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              {(showGestProp.vincolata
                ? ["Accettata con Vincolo","Controproposta","Rifiutata"]
                : ["Accettata","Controproposta","Rifiutata"]
              ).map(s=>{const cfg=STATI_PROP[s];const sel=formStatoProp.rispostaAcquirente===s;return(<button key={s} onClick={()=>setFormStatoProp({...formStatoProp,rispostaAcquirente:s,stato:s})} style={{...S.btn,border:`1.5px solid ${sel?cfg?.clr:"#ddd"}`,background:sel?cfg?.bg:"#fff",color:sel?cfg?.clr:BRAND.grigio,fontWeight:sel?500:400}}>{cfg?.s} {s}</button>);})}
            </div>
          </>)}

          {formStatoProp.stato==="Controproposta"&&(<div style={S.g2}>
            <div><label style={S.lbl}>Nuovo prezzo controproposto (EUR)</label><input style={S.inp} type="number" value={formStatoProp.contropropostaPrezzo||""} onChange={e=>setFormStatoProp({...formStatoProp,contropropostaPrezzo:e.target.value})}/></div>
            <div><label style={S.lbl}>Note</label><input style={S.inp} value={formStatoProp.noteStato||""} onChange={e=>setFormStatoProp({...formStatoProp,noteStato:e.target.value})}/></div>
          </div>)}
          {["Rifiutata","Mancata Chiusura"].includes(formStatoProp.stato)&&(<div><label style={S.lbl}>Motivo</label><textarea style={{...S.inp,resize:"vertical",minHeight:64}} value={formStatoProp.noteStato||""} onChange={e=>setFormStatoProp({...formStatoProp,noteStato:e.target.value})}/></div>)}
          {/* Data accettazione - per proposta normale Accettata */}
          {formStatoProp.stato==="Accettata"&&(
            <div style={{marginBottom:12,padding:"10px 14px",background:"#E9F7EF",borderRadius:8,border:"0.5px solid #27AE6044"}}>
              <label style={{...S.lbl,color:"#27AE60",fontWeight:500}}>Data accettazione</label>
              <input style={{...S.inp,maxWidth:200}} type="date" value={formStatoProp.dataAccettazione||""} onChange={e=>setFormStatoProp({...formStatoProp,dataAccettazione:e.target.value})}/>
            </div>
          )}
          {/* Gestione vincolo */}
          {formStatoProp.stato==="Accettata con Vincolo"&&(<div style={S.warnBox}>
            <p style={{fontSize:13,fontWeight:500,margin:"0 0 10px",color:"#D4AC0D"}}>Gestione vincolo</p>
            <div style={{marginBottom:10}}>
              <label style={S.lbl}>Data accettazione con vincolo</label>
              <input style={{...S.inp,maxWidth:200}} type="date" value={formStatoProp.dataAccettazione||""} onChange={e=>setFormStatoProp({...formStatoProp,dataAccettazione:e.target.value})}/>
            </div>
            <div style={{marginBottom:10}}>
              <label style={S.lbl}>Esito vincolo</label>
              <select style={{...S.inp,maxWidth:300}} value={formStatoProp.esitoVincolo||""} onChange={e=>setFormStatoProp({...formStatoProp,esitoVincolo:e.target.value})}>
                <option value="">In attesa</option>
                <option value="Positivo">Positivo — va in Venduti</option>
                <option value="Negativo">Negativo — torna In vendita</option>
              </select>
            </div>
            {formStatoProp.esitoVincolo==="Positivo"&&(
              <div style={{marginBottom:10}}>
                <label style={S.lbl}>Data esito vincolo positivo</label>
                <input style={{...S.inp,maxWidth:200}} type="date" value={formStatoProp.dataEsitoVincolo||""} onChange={e=>setFormStatoProp({...formStatoProp,dataEsitoVincolo:e.target.value})}/>
              </div>
            )}
            <p style={{fontSize:11,color:"#aaa",margin:"8px 0 0"}}>Esito Negativo: la proposta passa a "Mancata Chiusura" e la pratica torna automaticamente In vendita; nella scheda comparirà il promemoria per restituire gli assegni e comunicare alle parti.</p>
          </div>)}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem"}}>
            <button style={S.btn} onClick={()=>setShowGestProp(null)}>Annulla</button>
            <button style={S.btnP} onClick={()=>{
              // Aggiunge controproposta allo storico se applicabile
              if(formStatoProp.stato==="Controproposta"&&formStatoProp.contropropostaPrezzo){
                const cp={parte:showGestProp.stato==="Controproposta"?"Acquirente":"Venditore",prezzo:Number(formStatoProp.contropropostaPrezzo),note:formStatoProp.noteStato||"",data:todayStr()};
                // Preserva vincolo originale nella controproposta
                const upd={...showGestProp,stato:"Controproposta",vincolata:showGestProp.vincolata||false,tipoVincolo:showGestProp.tipoVincolo||"",termineSubordine:showGestProp.termineSubordine||"",controproposte:[...(showGestProp.controproposte||[]),cp],storico:[...(showGestProp.storico||[]),{stato:"Controproposta",data:nowISO()}]};
                setProposte(proposte.map(x=>x.id===showGestProp.id?upd:x));
                setShowGestProp(null);
              } else {
                salvaStatoProp();
              }
            }}>Conferma</button>
          </div>
        </div>
      </div>)}

      {/* MODAL GESTIONE VENDUTO */}
            {/* MODAL MIRINO */}
      {showMirino&&(<div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowMirino(null);}}>
        <div style={{...S.modal,maxWidth:480}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"1rem"}}>
            <span style={{fontSize:20}}>🎯</span>
            <div>
              <h3 style={{fontSize:15,fontWeight:600,margin:0}}>Nel mirino</h3>
              <p style={{fontSize:12,color:"#888",margin:0}}>{showMirino.comune||showMirino.indirizzo} — {showMirino.indirizzo}</p>
            </div>
            {mirino[showMirino.id]&&<button onClick={()=>{const m={...mirino};delete m[String(showMirino.id)];setMirino(m);setShowMirino(null);}} style={{...S.btnD,fontSize:11,marginLeft:"auto"}}>✕ Rimuovi</button>}
          </div>
          <div style={S.g2}>
            <div><label style={S.lbl}>Data interesse manifestato</label><input type="date" style={S.inp} value={formMirino.dataInteresse||""} onChange={e=>setFormMirino({...formMirino,dataInteresse:e.target.value})}/></div>
            <div><label style={S.lbl}>Follow-up entro</label><input type="date" style={S.inp} value={formMirino.followUp||""} onChange={e=>setFormMirino({...formMirino,followUp:e.target.value})}/></div>
          </div>
          <div style={{marginBottom:"1rem"}}><label style={S.lbl}>Note cliente</label><textarea style={{...S.inp,height:70,resize:"none"}} value={formMirino.note||""} placeholder="Es: ha visitato 2 volte, aspetta risposta mutuo..." onChange={e=>setFormMirino({...formMirino,note:e.target.value})}/></div>
          {(()=>{
            const prezzo=Number(showMirino.prezzoRichiesto||0);
            const provvV=prezzo>0?Math.round(prezzo*(Number(provvStandard.percVend||3)/100)):0;
            const provvA=prezzo>0?Math.round(prezzo*(Number(provvStandard.percAcq||4)/100)):0;
            if(prezzo===0) return null;
            return(<div style={{background:"#E1F5EE",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
              <div>
                <div style={{fontSize:10,color:"#085041",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>Provvigione stimata</div>
                <div style={{fontSize:10,color:"#aaa",marginTop:2}}>da € {fmt(prezzo)} × tabelle agenzia</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:20,fontWeight:700,color:"#0F6E56"}}>€ {fmt(provvV+provvA)}</div>
                <div style={{fontSize:10,color:"#aaa"}}>V: € {fmt(provvV)} ({provvStandard.percVend}%) · A: € {fmt(provvA)} ({provvStandard.percAcq}%)</div>
              </div>
            </div>);
          })()}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={S.btn} onClick={()=>setShowMirino(null)}>Annulla</button>
            <button style={S.btnP} onClick={()=>{setMirino({...mirino,[String(showMirino.id)]:{...formMirino,incaricoId:showMirino.id,agenteListing:showMirino.agenteListing}});setShowMirino(null);}}>🎯 Salva</button>
          </div>
        </div>
      </div>)}

      {showGestVend&&(<div data-modal="true" style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowGestVend(null);}}>
        <div style={S.modal}>
          <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 4px"}}>Modifica pratica</h2>
          <p style={{fontSize:13,color:"#aaa",margin:"0 0 1rem"}}>{showGestVend.comuneImmobile} — V: {showGestVend.nominativoVenditore} | A: {showGestVend.nomeAcquirente}</p>
          <div style={S.hl}><p style={{fontSize:13,fontWeight:500,margin:"0 0 8px"}}>Provvigioni</p><div style={S.g2}><div><label style={S.lbl}>Provv. venditore (EUR)</label><input style={S.inp} type="number" value={formVend.provvVenditore!=null?formVend.provvVenditore:""} onChange={e=>setFormVend({...formVend,provvVenditore:e.target.value===""?"":Number(e.target.value)})}/></div><div><label style={S.lbl}>Provv. acquirente (EUR)</label><input style={S.inp} type="number" value={formVend.provvAcquirente!=null?formVend.provvAcquirente:""} onChange={e=>setFormVend({...formVend,provvAcquirente:e.target.value===""?"":Number(e.target.value)})}/></div></div></div>
          <div style={S.g2}><div><label style={S.lbl}>Tipo atto</label><select style={S.inp} value={formVend.tipoAtto||"Preliminare"} onChange={e=>setFormVend({...formVend,tipoAtto:e.target.value})}><option>Preliminare</option><option>Rogito Diretto</option><option>Rogito</option></select></div><div><label style={S.lbl}>Data atto</label><input style={S.inp} type="date" value={formVend.dataAtto||""} onChange={e=>setFormVend({...formVend,dataAtto:e.target.value})}/></div></div>
          <div style={{marginBottom:"1rem"}}><label style={S.lbl}>Scadenza incasso</label><input style={{...S.inp,maxWidth:200}} type="date" value={formVend.scadenzaIncasso||""} onChange={e=>setFormVend({...formVend,scadenzaIncasso:e.target.value})}/></div>
          <div style={{marginBottom:"1rem",padding:"10px 14px",background:"#EAF4FB",borderRadius:8,borderLeft:"3px solid #2980B9"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:formVend.competenzaAgenziaDiversa?10:0}}>
              <input type="checkbox" id="compAgDiv" checked={formVend.competenzaAgenziaDiversa||false} onChange={e=>setFormVend({...formVend,competenzaAgenziaDiversa:e.target.checked,dataCompetenzaAgenzia:e.target.checked?formVend.dataCompetenzaAgenzia:""})}/>
              <label htmlFor="compAgDiv" style={{fontSize:13,cursor:"pointer",fontWeight:500,color:"#2980B9"}}>📅 Competenza agenzia diversa da data proposta</label>
            </div>
            {formVend.competenzaAgenziaDiversa&&(
              <div style={{marginTop:8}}>
                <label style={S.lbl}>Data competenza agenzia (fatturato, statistiche, break even)</label>
                <input style={{...S.inp,maxWidth:200}} type="date" value={formVend.dataCompetenzaAgenzia||""} onChange={e=>setFormVend({...formVend,dataCompetenzaAgenzia:e.target.value})}/>
                <p style={{fontSize:11,color:"#2980B9",margin:"4px 0 0"}}>💡 Usa questa opzione per pratiche a cavallo d'anno: il fatturato agenzia verrà imputato all'anno/mese indicato (es. 2025) anche se l'incasso avviene nel 2026.</p>
              </div>
            )}
            {!formVend.competenzaAgenziaDiversa&&(
              <p style={{fontSize:11,color:"#888",margin:"4px 0 0"}}>Default: usa la data di accettazione proposta ({fmtD(showGestVend?.dataVendita||"")})</p>
            )}
          </div>
          <div style={{marginBottom:"1rem",padding:"10px 14px",background:BRAND.beige,borderRadius:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:formVend.competenzaAgenteDiversa?10:0}}>
              <input type="checkbox" id="compDiv" checked={formVend.competenzaAgenteDiversa||false} onChange={e=>setFormVend({...formVend,competenzaAgenteDiversa:e.target.checked,dataCompetenzaAgente:e.target.checked?formVend.dataCompetenzaAgente:""})}/>
              <label htmlFor="compDiv" style={{fontSize:13,cursor:"pointer",fontWeight:500}}>📅 Competenza agente diversa (quota provvigionale)</label>
            </div>
            {formVend.competenzaAgenteDiversa&&(
              <div style={{marginTop:8}}>
                <label style={S.lbl}>Data competenza agente (per fatture agenti e quota incassata)</label>
                <input style={{...S.inp,maxWidth:200}} type="date" value={formVend.dataCompetenzaAgente||""} onChange={e=>setFormVend({...formVend,dataCompetenzaAgente:e.target.value})}/>
                <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>💡 La quota agente verrà imputata a questa data (es. 2026 se pagata nel 2026). Indipendente dalla competenza agenzia.</p>
              </div>
            )}
          </div>
          <p style={{fontSize:12,color:"#aaa",fontStyle:"italic",margin:"0 0 1rem"}}>Per acconti e saldo usa i pulsanti V / A nella tabella Venduti</p>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button style={S.btn} onClick={()=>setShowGestVend(null)}>Annulla</button><button style={S.btnP} onClick={salvaVend}>Salva</button></div>
        </div>
      </div>)}

      {showIncassoLato&&(<ModalIncassoLato vend={showIncassoLato.vend} lato={showIncassoLato.lato} onSave={upd=>{setVenduti(venduti.map(v=>v.id===upd.id?upd:v));setShowIncassoLato(null);}} onClose={()=>setShowIncassoLato(null)}/>)}

      {/* MODAL EVENTO (War Room → Eventi) */}
      {showEvento&&(<div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowEvento(null);}}>
        <div style={{...S.modal,width:"min(96vw,640px)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <h2 style={{fontSize:17,fontWeight:500,margin:0}}>{showEvento==="new"?"📅 Nuovo evento":"📅 Modifica evento"}</h2>
            <button onClick={()=>setShowEvento(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#ccc",padding:0}}>x</button>
          </div>
          <div style={S.g2}>
            <div><label style={S.lbl}>Data</label><input type="date" style={S.inp} value={formEvento.data||""} onChange={e=>setFormEvento({...formEvento,data:e.target.value})}/></div>
            <div>
              <label style={S.lbl}>Tipo</label>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <select style={{...S.inp,flex:1}} value={formEvento.tipo||""} onChange={e=>setFormEvento({...formEvento,tipo:e.target.value})}>
                  {tipiEvento.map(t=><option key={t}>{t}</option>)}
                </select>
                <button title="Aggiungi nuova tipologia" onClick={()=>{const nuovo=prompt("Nome nuova tipologia di evento:");if(nuovo&&nuovo.trim()&&!tipiEvento.includes(nuovo.trim())){const t=nuovo.trim();setTipiEvento([...tipiEvento,t]);setFormEvento({...formEvento,tipo:t});}}} style={{...S.btn,fontSize:13,padding:"4px 10px",borderColor:BRAND.oro,color:BRAND.oroD}}>+</button>
              </div>
            </div>
          </div>
          <div><label style={S.lbl}>Titolo *</label><input style={S.inp} placeholder="es. Corso BNI — Gestire le obiezioni" value={formEvento.titolo||""} onChange={e=>setFormEvento({...formEvento,titolo:e.target.value})}/></div>
          <div><label style={S.lbl}>Luogo</label><input style={S.inp} placeholder="es. Varese — Hotel Palace" value={formEvento.luogo||""} onChange={e=>setFormEvento({...formEvento,luogo:e.target.value})}/></div>
          <div>
            <label style={S.lbl}>Partecipanti dell'agenzia</label>
            <div style={{background:"#fafaf8",border:"0.5px solid #e8e5e0",borderRadius:6,padding:"8px 10px",display:"flex",flexWrap:"wrap",gap:6}}>
              {agenti.filter(a=>["Broker","Consulente","Collaboratore","Back Office"].includes(a.profilo)&&a.attivo!==false).map(a=>{
                const sel=(formEvento.partecipanti||[]).includes(a.id);
                return(<button key={a.id} type="button" onClick={()=>{const lst=formEvento.partecipanti||[];const next=sel?lst.filter(x=>x!==a.id):[...lst,a.id];setFormEvento({...formEvento,partecipanti:next});}} style={{padding:"4px 10px",fontSize:12,borderRadius:6,border:`0.5px solid ${sel?"#27AE60":"#ddd"}`,background:sel?"#E9F7EF":"#fff",color:sel?"#27AE60":"#666",cursor:"pointer",fontFamily:"inherit",fontWeight:sel?600:400}}>{sel?"✓ ":""}{a.nome} {a.cognome}</button>);
              })}
            </div>
          </div>
          <div style={S.g2}>
            <div><label style={S.lbl}>Costo (€)</label><input type="number" min="0" step="0.01" style={S.inp} placeholder="0 = gratuito" value={formEvento.costo||""} onChange={e=>setFormEvento({...formEvento,costo:e.target.value})}/></div>
            <div><label style={S.lbl}>Link (opzionale)</label><input style={S.inp} placeholder="https://…" value={formEvento.link||""} onChange={e=>setFormEvento({...formEvento,link:e.target.value})}/></div>
          </div>
          {Number(formEvento.costo||0)>0&&<label style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:12,color:BRAND.grigio,cursor:"pointer",padding:"8px 10px",background:"#FAEEDA66",borderRadius:6,marginTop:6}}>
            <input type="checkbox" checked={!!formEvento.includiCosti} onChange={e=>setFormEvento({...formEvento,includiCosti:e.target.checked})} style={{marginTop:2}}/>
            <span><strong>Includi nei costi agenzia</strong> — il costo verrà conteggiato come spesa di formazione/networking. Compare nel KPI "Investiti in formazione/eventi". <span style={{color:"#999",fontSize:11}}>(integrazione automatica con Break Even in arrivo)</span></span>
          </label>}
          <div><label style={S.lbl}>Note</label><textarea style={{...S.inp,resize:"vertical",minHeight:80}} placeholder="Temi affrontati, contatti utili, idee portate a casa…" value={formEvento.note||""} onChange={e=>setFormEvento({...formEvento,note:e.target.value})}/></div>
          <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:"1rem"}}>
            <div>
              {showEvento!=="new"&&<button onClick={()=>{if(window.confirm("Eliminare questo evento?")){setEventi(eventi.filter(x=>x.id!==showEvento.id));setShowEvento(null);}}} style={{...S.btnD,fontSize:13}}>🗑 Elimina</button>}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowEvento(null)} style={S.btn}>Annulla</button>
              <button onClick={()=>{
                if(!formEvento.titolo||!formEvento.titolo.trim()){alert("Il titolo è obbligatorio");return;}
                if(!formEvento.data){alert("La data è obbligatoria");return;}
                const ev={...formEvento,id:showEvento==="new"?Date.now():showEvento.id,costo:Number(formEvento.costo||0),partecipanti:formEvento.partecipanti||[]};
                if(showEvento==="new") setEventi([...eventi,ev]);
                else setEventi(eventi.map(x=>x.id===showEvento.id?ev:x));
                setShowEvento(null);
              }} style={S.btnP}>{showEvento==="new"?"Crea":"Salva"}</button>
            </div>
          </div>
        </div>
      </div>)}

      {/* MODAL AGENTE */}
      {showAgente&&(<div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowAgente(null);}}>
        <div style={{...S.modal,width:"min(96vw,480px)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}><h2 style={{fontSize:17,fontWeight:500,margin:0}}>{showAgente==="new"?"Nuovo agente":"Modifica agente"}</h2><button onClick={()=>setShowAgente(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#ccc",padding:0}}>x</button></div>
          <div style={S.g2}><div><label style={S.lbl}>Nome</label><input style={S.inp} value={formAgente.nome||""} onChange={e=>setFormAgente({...formAgente,nome:e.target.value})}/></div><div><label style={S.lbl}>Cognome</label><input style={S.inp} value={formAgente.cognome||""} onChange={e=>setFormAgente({...formAgente,cognome:e.target.value})}/></div></div>
          <div style={S.g2}><div><label style={S.lbl}>Profilo</label><select style={S.inp} value={formAgente.profilo||"Consulente"} onChange={e=>setFormAgente({...formAgente,profilo:e.target.value,percListing:e.target.value==="Broker"?0:formAgente.percListing,percAcquirente:e.target.value==="Broker"?0:formAgente.percAcquirente})}><option>Broker</option><option>Consulente</option><option>Collaboratore</option><option>Collaborazione Agenzia</option><option>Back Office</option><option>Coach</option></select></div><div><label style={S.lbl}>Tipo</label><select style={S.inp} value={formAgente.tipo||"Interno"} onChange={e=>setFormAgente({...formAgente,tipo:e.target.value})}><option>Interno</option><option>Esterno</option></select></div></div>
                            {formAgente.profilo==="Coach"&&<div style={{marginBottom:10}}><label style={S.lbl}>Coach di</label><select style={S.inp} value={formAgente.coachTarget||"agenzia"} onChange={e=>setFormAgente({...formAgente,coachTarget:e.target.value})}><option value="agenzia">Tutta l'agenzia</option>{agenti.filter(a=>a.profilo!=="Broker"&&a.profilo!=="Coach"&&a.profilo!=="Back Office").map(a=><option key={a.id} value={String(a.id)}>{a.nome} {a.cognome}</option>)}</select></div>}
          {formAgente.profilo!=="Broker"&&(<div style={S.g2}><div><label style={S.lbl}>% Provv. Listing</label><input style={S.inp} type="number" min="0" max="100" step="0.5" value={formAgente.percListing||""} onChange={e=>setFormAgente({...formAgente,percListing:Number(e.target.value)})}/></div><div><label style={S.lbl}>% Provv. Acquirente</label><input style={S.inp} type="number" min="0" max="100" step="0.5" value={formAgente.percAcquirente||""} onChange={e=>setFormAgente({...formAgente,percAcquirente:Number(e.target.value)})}/></div></div>)}
          {/* Accesso al gestionale */}
          {formAgente.profilo!=="Broker"&&(<>
            <div style={{borderTop:"0.5px solid #eee",paddingTop:12,marginTop:4,marginBottom:10}}>
              <p style={{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 10px"}}>Accesso al gestionale</p>
              <div style={S.g2}>
                <div><label style={S.lbl}>Email di accesso</label><input style={S.inp} type="email" placeholder="es. nome@email.it" value={formAgente.email||""} onChange={e=>setFormAgente({...formAgente,email:e.target.value})}/></div>
                <div><label style={S.lbl}>Password</label><input style={S.inp} type="text" placeholder="imposta una password" value={formAgente.password||""} onChange={e=>setFormAgente({...formAgente,password:e.target.value})}/></div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                <input type="checkbox" id="attivoChk" checked={formAgente.attivo!==false} onChange={e=>setFormAgente({...formAgente,attivo:e.target.checked})}/>
                <label htmlFor="attivoChk" style={{fontSize:13,cursor:"pointer"}}>Accesso attivo</label>
                {formAgente.attivo===false&&<span style={{fontSize:11,color:"#E74C3C",fontWeight:500}}>⚠ Agente bloccato — non può accedere</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                <input type="checkbox" id="inReportChk" checked={formAgente.inReport===true||(formAgente.inReport===undefined&&["Broker","Consulente","Collaboratore"].includes(formAgente.profilo||"Consulente"))} onChange={e=>setFormAgente({...formAgente,inReport:e.target.checked})}/>
                <label htmlFor="inReportChk" style={{fontSize:13,cursor:"pointer"}}>Includi in report, statistiche e classifiche</label>
                {formAgente.inReport===false&&<span style={{fontSize:11,color:"#888",fontWeight:500}}>👁 Escluso da War Room, Report Agenti, Statistiche</span>}
              </div>
              {(!formAgente.email||!formAgente.password)&&<p style={{fontSize:11,color:"#aaa",margin:"6px 0 0"}}>Senza email e password l'agente non può accedere al gestionale.</p>}
            </div>
          </>)}

          {/* Permessi accesso app (Modulistica / Gestionale / Operatività) — modificabili solo da Broker e Erica */}
          {formAgente.profilo!=="Broker"&&(isBroker||isBackOffice)&&(()=>{
            // Default: se permessi mancano, considera abilitato (true)
            const perm = formAgente.permessi || {modulistica:true,gestionale:true,operativita:true};
            const setPerm = (k,v) => setFormAgente({...formAgente,permessi:{...perm,[k]:v}});
            return(<div style={{borderTop:"0.5px solid #eee",paddingTop:12,marginTop:4,marginBottom:10}}>
              <p style={{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 4px"}}>🔐 Permessi accesso app</p>
              <p style={{fontSize:11,color:"#888",margin:"0 0 10px"}}>Quali app può aprire questo agente. Spegnere un permesso impedisce l'accesso all'app corrispondente.</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>
                {[
                  {k:"gestionale",lbl:"🏠 Gestionale",desc:"questa app"},
                  {k:"modulistica",lbl:"📋 Modulistica",desc:"app moduli e contratti"},
                  {k:"operativita",lbl:"📅 Operatività",desc:"agenda e attività"}
                ].map(p=>(
                  <label key={p.k} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 10px",border:`0.5px solid ${perm[p.k]!==false?BRAND.oro:"#ddd"}`,borderRadius:6,background:perm[p.k]!==false?"#FDFBF7":"#fafaf8",cursor:"pointer"}}>
                    <input type="checkbox" checked={perm[p.k]!==false} onChange={e=>setPerm(p.k,e.target.checked)} style={{marginTop:2}}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:perm[p.k]!==false?"#2C2C2C":"#888"}}>{p.lbl}</div>
                      <div style={{fontSize:10,color:"#aaa",marginTop:1}}>{p.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>);
          })()}
          {/* Broker: i permessi sono SEMPRE tutti attivi e non modificabili */}
          {formAgente.profilo==="Broker"&&(isBroker||isBackOffice)&&(<div style={{borderTop:"0.5px solid #eee",paddingTop:12,marginTop:4,marginBottom:10}}>
            <p style={{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 4px"}}>🔐 Permessi accesso app</p>
            <p style={{fontSize:11,color:"#888",margin:0}}>👑 Il Broker ha sempre accesso a tutte le app (Gestionale, Modulistica, Operatività).</p>
          </div>)}

          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1.25rem"}}><button style={S.btn} onClick={()=>setShowAgente(null)}>Annulla</button><button style={S.btnP} onClick={()=>{if(!formAgente.nome||!formAgente.cognome)return;const isNewBroker=formAgente.profilo==="Broker";const permessiSalva = isNewBroker?{modulistica:true,gestionale:true,operativita:true}:(formAgente.permessi||{modulistica:true,gestionale:true,operativita:true});if(showAgente==="new")setAgenti([...agenti,{...formAgente,id:Date.now(),attivo:formAgente.attivo!==false,inReport:["Broker","Consulente","Collaboratore"].includes(formAgente.profilo||"Consulente")?formAgente.inReport!==false:false,permessi:permessiSalva}]);else setAgenti(agenti.map(a=>a.id===showAgente.id?{...formAgente,id:a.id,inReport:["Broker","Consulente","Collaboratore"].includes(formAgente.profilo||"Consulente")?formAgente.inReport!==false:false,permessi:permessiSalva}:a));setShowAgente(null);}}>Salva</button></div>
        </div>
      </div>)}

      {/* MODAL SPESE VOCE */}
      {modalCostoVoce&&(<div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setModalCostoVoce(null);}}>
        <div style={{...S.modal,width:"min(96vw,520px)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem"}}>
            <div>
              <h2 style={{fontSize:16,fontWeight:500,margin:"0 0 3px",color:BRAND.grigio}}>{modalCostoVoce.voce.voce}</h2>
              <p style={{fontSize:12,color:"#aaa",margin:0}}>Previsionale mensile: <strong style={{color:BRAND.oroD}}>€ {fmt(modalCostoVoce.voce.prevMensile||0)}</strong> — Annuo: <strong style={{color:BRAND.oroD}}>€ {fmt((modalCostoVoce.voce.prevMensile||0)*12)}</strong></p>
            </div>
            <button onClick={()=>setModalCostoVoce(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#ccc",padding:0}}>✕</button>
          </div>

          {/* Form aggiungi spesa */}
          <div style={{background:BRAND.beige,borderRadius:8,padding:"12px 14px",marginBottom:"1rem"}}>
            <p style={{fontSize:12,fontWeight:500,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 10px"}}>Aggiungi spesa</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div><label style={S.lbl}>Data</label><input style={S.inp} type="date" value={formNuovaSpesa.data} onChange={e=>setFormNuovaSpesa({...formNuovaSpesa,data:e.target.value})}/></div>
              <div><label style={S.lbl}>Importo (€)</label><input style={S.inp} type="number" placeholder="0" value={formNuovaSpesa.importo} onChange={e=>setFormNuovaSpesa({...formNuovaSpesa,importo:e.target.value})}/></div>
            </div>
            <div style={{marginBottom:8}}><label style={S.lbl}>Descrizione</label><input style={S.inp} type="text" placeholder="es. Facebook Ads, Volantini, Abbonamento..." value={formNuovaSpesa.desc} onChange={e=>setFormNuovaSpesa({...formNuovaSpesa,desc:e.target.value})} onKeyDown={e=>{if(e.key==="Enter")aggiungiSpesaVoce();}}/></div>
            <button style={{...S.btnP,width:"100%"}} onClick={aggiungiSpesaVoce}>+ Aggiungi spesa</button>
          </div>

          {/* Lista spese raggruppate per mese */}
          {(()=>{
            const spese=modalCostoVoce.voce.spese||[];
            if(spese.length===0) return <p style={{textAlign:"center",color:"#bbb",fontSize:13,padding:"1rem 0"}}>Nessuna spesa inserita — aggiungi la prima qui sopra</p>;
            const perMese={};
            spese.forEach(s=>{const m=s.data?s.data.substring(0,7):"senza data";if(!perMese[m])perMese[m]=[];perMese[m].push(s);});
            return Object.keys(perMese).sort().reverse().map(mese=>{
              const spM=perMese[mese];
              const totM=spM.reduce((s,x)=>s+Number(x.importo||0),0);
              const [anno,mm]=mese.split("-");
              const nomeM=mm?mesiNomi[parseInt(mm)-1]+" "+anno:mese;
              return(<div key={mese} style={{marginBottom:"1rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:500,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.06em"}}>{nomeM}</span>
                  <span style={{fontSize:12,fontWeight:500,color:BRAND.grigio}}>€ {fmt(totM)}</span>
                </div>
                {spM.map(s=>(
                  <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#fff",borderRadius:6,border:"0.5px solid #e8e5e0",marginBottom:4}}>
                    <span style={{fontSize:12,color:"#aaa",minWidth:78}}>{fmtD(s.data)}</span>
                    <span style={{fontSize:13,flex:1,color:BRAND.grigio}}>{s.desc||"—"}</span>
                    <span style={{fontSize:13,fontWeight:500,color:BRAND.grigio}}>€ {fmt(s.importo)}</span>
                    <button style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:16,lineHeight:1,padding:0,flexShrink:0}}
                      onClick={()=>{
                        const voci=[...(costi[modalCostoVoce.anno]||mkCosti())];
                        voci[modalCostoVoce.idx]={...voci[modalCostoVoce.idx],spese:voci[modalCostoVoce.idx].spese.filter(x=>x.id!==s.id)};
                        if(!isReadOnly){setCosti({...costi,[modalCostoVoce.anno]:voci});}
                        setModalCostoVoce({...modalCostoVoce,voce:voci[modalCostoVoce.idx]});
                      }}
                      onMouseEnter={e=>e.currentTarget.style.color="#E74C3C"} onMouseLeave={e=>e.currentTarget.style.color="#ddd"}>✕</button>
                  </div>
                ))}
              </div>);
            });
          })()}

          {/* Totale */}
          {(modalCostoVoce.voce.spese||[]).length>0&&(
            <div style={{borderTop:"0.5px solid #eee",paddingTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,color:"#888"}}>{(modalCostoVoce.voce.spese||[]).length} {(modalCostoVoce.voce.spese||[]).length===1?"spesa":"spese"} totali</span>
              <strong style={{fontSize:16,color:"#27AE60"}}>€ {fmt(totSpeseVoce(modalCostoVoce.voce))}</strong>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:"1rem"}}>
            <button style={S.btnP} onClick={()=>setModalCostoVoce(null)}>Chiudi</button>
          </div>
        </div>
      </div>)}

      {/* MODAL PAGAMENTO FATTURA */}
      {showPagamento&&(<div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowPagamento(null);}}>
        <div style={{...S.modal,width:"min(96vw,460px)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}><h2 style={{fontSize:16,fontWeight:500,margin:0}}>Gestione pagamento</h2><button onClick={()=>setShowPagamento(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#ccc",padding:0}}>x</button></div>
          <p style={{fontSize:12,color:"#aaa",margin:"0 0 1rem"}}>{showPagamento.pratica}</p>
          <div style={{background:`${BRAND.oro}18`,border:`1px solid ${BRAND.oro}44`,borderRadius:8,padding:"10px 14px",marginBottom:"1rem"}}><span style={{fontSize:13}}>Importo da fatturare: <strong style={{color:BRAND.oroD}}>€ {fmt(showPagamento.totPratica)}</strong></span></div>
          <div style={{marginBottom:10}}>
            <label style={S.lbl}>Stato pagamento</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{Object.entries(STATI_FATTURA).map(([stato,cfg])=>{const sel=formPagamento.stato===stato;return(<button key={stato} onClick={()=>setFormPagamento({...formPagamento,stato})} style={{...S.btn,border:`1.5px solid ${sel?cfg.clr:"#ddd"}`,background:sel?cfg.bg:"#fff",color:sel?cfg.clr:BRAND.grigio,fontWeight:sel?500:400,fontSize:12}}>{stato}</button>);})}</div>
          </div>
          <div style={S.g2}><div><label style={S.lbl}>Importo pagato (EUR)</label><input style={S.inp} type="number" value={formPagamento.importoPagato||""} onChange={e=>setFormPagamento({...formPagamento,importoPagato:e.target.value})} placeholder="0"/></div><div><label style={S.lbl}>Data pagamento</label><input style={S.inp} type="date" value={formPagamento.dataPagamento||""} onChange={e=>setFormPagamento({...formPagamento,dataPagamento:e.target.value})}/></div></div>
          <div><label style={S.lbl}>Note</label><input style={S.inp} value={formPagamento.note||""} onChange={e=>setFormPagamento({...formPagamento,note:e.target.value})} placeholder="es. Bonifico ricevuto"/></div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem"}}><button style={S.btn} onClick={()=>setShowPagamento(null)}>Annulla</button><button style={S.btnP} onClick={salvaPagamento}>Salva</button></div>
        </div>
      </div>)}

      {/* MODALE INCASSO — Nuovo / Modifica pagamento dalla vista Incassi */}
      {pagamentoModale&&(()=>{
        const {mode,venduto,lato,rata} = pagamentoModale;
        const isNew = mode==="new";
        const provLato = lato==="V" ? Number(venduto.provvVenditore||0) : Number(venduto.provvAcquirente||0);
        const incassatoLato = lato==="V" ? calcolaIncassatoV(venduto) : calcolaIncassatoA(venduto);
        // In modalità modifica: il già incassato da scontare include l'importo originale di QUESTA rata
        const importoField = `${pmRata}${lato}`;
        const importoOriginale = isNew ? 0 : Number(venduto[importoField]||0);
        const residuoDisponibile = Math.max(0, provLato - incassatoLato + importoOriginale - Number(pmImporto||0));
        const cliente = lato==="V" ? venduto.nominativoVenditore : venduto.nomeAcquirente;
        // === LOGICA BLOCCO/SBLOCCO ===
        // Lato è "bloccato" se completamente incassato (incassato >= provLato) e siamo in modalità modifica
        const latoCompletamenteIncassato = !isNew && provLato>0 && incassatoLato>=provLato;
        const isBloccato = latoCompletamenteIncassato && !pmSbloccato;
        // Colore varia: bloccato=grigio, sbloccato=arancio, normale modifica=oro, normale nuovo=verde
        const colore = isBloccato ? "#6B6B6B" : (latoCompletamenteIncassato && pmSbloccato) ? "#E67E22" : (isNew ? "#1D9E75" : BRAND.oroD);
        const coloreLight = isBloccato ? "#F5F1E8" : (latoCompletamenteIncassato && pmSbloccato) ? "#FFF3E0" : (isNew ? "#E9F7EF" : "#F0E8DC");
        const importoMax = Math.max(0, provLato - incassatoLato + importoOriginale);
        const importoNum = Number(pmImporto||0);
        const newIncassatoLato = incassatoLato - importoOriginale + importoNum;
        const newStato = newIncassatoLato>=provLato ? "Incassato" : newIncassatoLato>0 ? "Parziale" : "Da incassare";
        // Tracking esistente
        const trackField = `track${pmRata.charAt(0).toUpperCase()+pmRata.slice(1)}${lato}`;
        const trackStorico = venduto[trackField] || "";
        // Title header dinamico
        const headerLabel = isBloccato ? "🔒 Pagamento bloccato" : (latoCompletamenteIncassato && pmSbloccato) ? "⚠️ Modifica pagamento incassato" : isNew ? "💰 Registra incasso" : "✏️ Modifica pagamento";
        return(
          <div data-modal="true" style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)setPagamentoModale(null);}}>
            <div style={{...S.modal,maxWidth:560,width:"95%",padding:0,overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
              {/* Header */}
              <div style={{padding:"14px 20px",background:`linear-gradient(135deg, ${coloreLight} 0%, #fff 100%)`,borderBottom:"0.5px solid #e8e5e0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:11,color:colore,textTransform:"uppercase",letterSpacing:".08em",fontWeight:600,marginBottom:2}}>{headerLabel}</div>
                  <div style={{fontSize:16,fontWeight:500,color:"#2C2C2C"}}>{cliente}</div>
                  <div style={{fontSize:11,color:"#888",marginTop:2}}>{venduto.comuneImmobile} — {venduto.indirizzoImmobile}</div>
                </div>
                <button onClick={()=>setPagamentoModale(null)} style={{background:"transparent",border:"none",color:"#aaa",cursor:"pointer",fontSize:20,lineHeight:1,padding:"4px 8px"}}>✕</button>
              </div>

              {/* BANNER LUCCHETTO (solo se bloccato) */}
              {isBloccato&&<div style={{padding:"12px 20px",background:"#FDF6EC",borderBottom:"0.5px solid #E5D0A1",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:200}}>
                  <span style={{fontSize:22}}>🔒</span>
                  <div>
                    <div style={{fontSize:12,color:"#6B5119",fontWeight:600}}>Lato {lato} — {lato==="V"?"Venditore":"Acquirente"} completamente incassato</div>
                    <div style={{fontSize:11,color:"#8B7138",marginTop:1}}>Per modificare questo pagamento, prima sblocca la pratica.</div>
                  </div>
                </div>
                {canEditPratiche&&!isReadOnly&&<button onClick={()=>setPmSbloccato(true)} style={{background:BRAND.oro,color:"#fff",border:"none",padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"}}>🔓 Sblocca per modificare</button>}
              </div>}

              {/* BANNER ATTENZIONE (sbloccato) */}
              {latoCompletamenteIncassato&&pmSbloccato&&<div style={{padding:"10px 20px",background:"#FFF3E0",borderBottom:"0.5px solid #FFCC80",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>🔓</span>
                <div style={{fontSize:11,color:"#993C1D"}}>
                  <strong>Modalità modifica attiva</strong> — Stai modificando un pagamento di un lato completamente incassato. Procedi con cautela.
                </div>
              </div>}

              {/* Pannello riepilogo */}
              <div style={{padding:"12px 20px",background:"#fafaf8",borderBottom:"0.5px solid #e8e5e0"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <div>
                    <div style={{fontSize:9,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Lato</div>
                    <span style={{fontSize:12,padding:"2px 8px",borderRadius:3,background:lato==="V"?"#EAF1F8":"#F4EAF5",color:lato==="V"?"#2980B9":"#8E44AD",fontWeight:600}}>{lato} — {lato==="V"?"Venditore":"Acquirente"}</span>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Provv. totale</div>
                    <div style={{fontSize:14,fontWeight:500,color:"#2C2C2C"}}>€ {fmt(provLato)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Già incassato</div>
                    <div style={{fontSize:14,fontWeight:500,color:latoCompletamenteIncassato?"#1D9E75":"#888"}}>€ {fmt(incassatoLato)}{latoCompletamenteIncassato?" ✓":""}</div>
                  </div>
                </div>
                {!isBloccato&&<div style={{marginTop:10,paddingTop:10,borderTop:"0.5px solid #e8e5e0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:12,color:"#555"}}>{isNew?"Residuo da incassare:":"Residuo dopo questa modifica:"}</div>
                  <div style={{fontSize:18,fontWeight:600,color:residuoDisponibile<=0?"#1D9E75":"#E67E22"}}>€ {fmt(residuoDisponibile)}</div>
                </div>}
              </div>
              {/* Form */}
              <div style={{padding:"18px 20px"}}>
                {/* Tipo rata (solo se NUOVO e non bloccato) */}
                {isNew&&!isBloccato&&<div style={{marginBottom:14}}>
                  <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:".06em",fontWeight:500,marginBottom:6}}>Tipo rata</div>
                  <div style={{display:"flex",gap:6}}>
                    {[{v:"acc1",l:"Acconto 1"},{v:"acc2",l:"Acconto 2"},{v:"saldo",l:"Saldo"}].map(t=>(
                      <button key={t.v} onClick={()=>setPmRata(t.v)} style={{flex:1,padding:"8px 12px",background:pmRata===t.v?colore:"#fff",border:`0.5px solid ${pmRata===t.v?colore:"#e0ddd5"}`,color:pmRata===t.v?"#fff":"#555",borderRadius:6,fontSize:12,fontWeight:pmRata===t.v?500:400,cursor:"pointer"}}>{t.l}</button>
                    ))}
                  </div>
                </div>}
                {!isNew&&<div style={{marginBottom:14,padding:"8px 12px",background:"#fafaf8",borderRadius:6}}>
                  <div style={{fontSize:11,color:"#888"}}>{isBloccato?"Stai visualizzando":"Stai modificando"}: <strong style={{color:"#2C2C2C"}}>{pmRata==="acc1"?"Acconto 1":pmRata==="acc2"?"Acconto 2":"Saldo"}</strong></div>
                </div>}
                {/* Importo + Data */}
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:14}}>
                  <div>
                    <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:".06em",fontWeight:500,marginBottom:6}}>Importo</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:isBloccato?"#f5f3ed":"#fff",border:`1px solid ${isBloccato?"#e0ddd5":colore}`,borderRadius:6}}>
                      <span style={{fontSize:16,color:isBloccato?"#ccc":"#aaa"}}>€</span>
                      <input type="number" min="0" step="0.01" value={pmImporto} onChange={e=>setPmImporto(e.target.value)} placeholder="0,00" disabled={isBloccato}
                        style={{fontSize:18,fontWeight:600,border:"none",outline:"none",background:"transparent",color:isBloccato?"#888":colore,width:"100%",fontFamily:"inherit",cursor:isBloccato?"not-allowed":"text"}} autoFocus={!isBloccato}/>
                    </div>
                    {/* Bottoni rapidi solo per nuovo */}
                    {isNew&&importoMax>0&&!isBloccato&&<div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
                      {importoMax>=1000&&<button onClick={()=>setPmImporto("1000")} style={{fontSize:10,padding:"2px 8px",background:"#fafaf8",border:"0.5px solid #e0ddd5",borderRadius:4,cursor:"pointer",color:"#555"}}>€ 1.000</button>}
                      {importoMax>=2000&&<button onClick={()=>setPmImporto("2000")} style={{fontSize:10,padding:"2px 8px",background:"#fafaf8",border:"0.5px solid #e0ddd5",borderRadius:4,cursor:"pointer",color:"#555"}}>€ 2.000</button>}
                      <button onClick={()=>setPmImporto(String(Math.round(importoMax/2)))} style={{fontSize:10,padding:"2px 8px",background:"#fafaf8",border:"0.5px solid #e0ddd5",borderRadius:4,cursor:"pointer",color:"#555"}}>50%</button>
                      <button onClick={()=>setPmImporto(String(importoMax))} style={{fontSize:10,padding:"2px 8px",background:"#fafaf8",border:`0.5px solid ${colore}`,borderRadius:4,cursor:"pointer",color:colore,fontWeight:500}}>Tutto (€ {fmt(importoMax)})</button>
                    </div>}
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:".06em",fontWeight:500,marginBottom:6}}>Data</div>
                    <input type="date" value={pmData} onChange={e=>setPmData(e.target.value)} disabled={isBloccato} style={{width:"100%",padding:"8px 10px",fontSize:13,border:"1px solid #e0ddd5",borderRadius:6,fontFamily:"inherit",color:isBloccato?"#888":"#2C2C2C",background:isBloccato?"#f5f3ed":"#fff",boxSizing:"border-box",cursor:isBloccato?"not-allowed":"text"}}/>
                  </div>
                </div>
                {/* Note */}
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:".06em",fontWeight:500,marginBottom:6}}>Note (opzionale)</div>
                  <input type="text" value={pmNote} onChange={e=>setPmNote(e.target.value)} placeholder="Es. Bonifico, contanti, assegno..." disabled={isBloccato}
                    style={{width:"100%",padding:"8px 10px",fontSize:12,border:"1px solid #e0ddd5",borderRadius:6,fontFamily:"inherit",color:isBloccato?"#888":"#2C2C2C",background:isBloccato?"#f5f3ed":"#fff",boxSizing:"border-box",cursor:isBloccato?"not-allowed":"text"}}/>
                </div>
                {/* Feedback stato dopo modifica */}
                {importoNum>0&&!isBloccato&&<div style={{padding:"8px 12px",background:newStato==="Incassato"?"#E9F7EF":"#FFFAF3",borderRadius:6,fontSize:11,color:newStato==="Incassato"?"#0F6E56":"#993C1D"}}>
                  ℹ️ Dopo questo {isNew?"incasso":"aggiornamento"}, il lato <strong>{lato}</strong> sarà a stato <strong>{newStato}</strong>{newStato!=="Incassato"&&<> con un residuo di <strong>€ {fmt(residuoDisponibile)}</strong></>}.
                </div>}
                {/* TRACKING — Storico */}
                {trackStorico&&<div style={{marginTop:12,padding:"8px 12px",background:"#FDFBF7",borderLeft:`2px solid ${BRAND.oro}`,borderRadius:4,fontSize:11,color:"#888"}}>
                  📜 <strong style={{color:"#2C2C2C"}}>Storico:</strong> {trackStorico}
                </div>}
              </div>
              {/* Footer */}
              <div style={{padding:"12px 20px",background:"#fafaf8",borderTop:"0.5px solid #e8e5e0",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                {!isNew&&!isBloccato&&!isReadOnly?<button onClick={eliminaIncassoModale} style={{background:"transparent",border:"0.5px solid #E74C3C",color:"#E74C3C",padding:"6px 12px",borderRadius:6,fontSize:11,cursor:"pointer"}}>🗑 Elimina pagamento</button>:<div/>}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setPagamentoModale(null)} style={{background:"transparent",border:"0.5px solid #e0ddd5",color:"#888",padding:"8px 16px",borderRadius:6,fontSize:12,cursor:"pointer"}}>{isBloccato?"Chiudi":"Annulla"}</button>
                  {!isBloccato&&<button onClick={salvaIncassoModale} disabled={!Number(pmImporto)||isReadOnly} style={{background:colore,color:"#fff",border:"none",padding:"8px 20px",borderRadius:6,fontSize:13,fontWeight:500,cursor:(!Number(pmImporto)||isReadOnly)?"not-allowed":"pointer",opacity:(!Number(pmImporto)||isReadOnly)?0.5:1}}>{isNew?`✓ Registra incasso${importoNum>0?` di € ${fmt(importoNum)}`:""}`:(latoCompletamenteIncassato?"✓ Conferma modifica":"✓ Salva modifiche")}</button>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
