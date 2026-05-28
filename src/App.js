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

const supaFetch = async (method, body=null) => {
  const opts = {
    method,
    headers: {"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`,"Prefer":"return=representation"},
  };
  if(body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPA_URL}/rest/v1/gestionale_data?id=eq.main`, opts);
  if(!res.ok) throw new Error(await res.text());
  return res.json();
};

const caricaDB = async () => {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/gestionale_data?id=eq.main&select=data`,
      {headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`}});
    const rows = await res.json();
    return rows?.[0]?.data || null;
  } catch(e){ return null; }
};

const salvaDB = async (data) => {
  try {
    await supaFetch("PATCH", {data, updated_at: new Date().toISOString()});
  } catch(e){ console.error("Errore salvataggio Supabase:", e); }
};

// Salva solo catCosti e speseCosti con merge
const salvaDBCosti = async (catCosti, speseCosti) => {
  try {
    // Leggi prima il record attuale
    const res = await fetch(`${SUPA_URL}/rest/v1/gestionale_data?id=eq.main&select=data`, {
      headers: {"apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`}
    });
    const rows = await res.json();
    const current = rows?.[0]?.data || {};
    // Fai merge: mantieni tutto il resto, aggiorna solo catCosti e speseCosti
    const merged = {...current, catCosti, speseCosti};
    await supaFetch("PATCH", {data: merged, updated_at: new Date().toISOString()});
    console.log("[COSTI SAVED] catCosti:", catCosti.length, "agente:", catCosti.filter(x=>x.agentId).length);
  } catch(e){ console.error("Errore salvataggio costi:", e); }
};

const BRAND = {oro:"#C9A96E",oroD:"#A8863A",grigio:"#4A4A4A",beige:"#F2F0EB"};

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

const STATI_INC = { Attivo:{clr:"#27AE60",bg:"#E9F7EF"}, Scaduto:{clr:"#E74C3C",bg:"#FDECEA"}, Venduto:{clr:"#C9A96E",bg:"#FDF6EC"}, Locato:{clr:"#8E44AD",bg:"#F5EEF8"} };
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
  {id:1,nome:"Antonello",cognome:"Di Rita",profilo:"Broker",tipo:"Interno",percListing:0,percAcquirente:0,email:"adirita@casaimmobiliarevarese.it",password:"Dalmata1518",attivo:true},
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
  const go=()=>{
    setLoad(true);
    setTimeout(async()=>{
      try {
        const data = await caricaDB();
        // Merge agenti DB con INIT_AGENTI per recuperare email/password se mancanti nel DB
        const agentiRaw = data?.agenti || INIT_AGENTI;
        const agentiDB = agentiRaw.map(a=>{
          const def = INIT_AGENTI.find(d=>d.id===a.id);
          return {
            ...a,
            email: a.email || def?.email || "",
            password: a.password || def?.password || "",
            attivo: a.attivo !== undefined ? a.attivo : true,
          };
        });
        const emTrim = em.trim().toLowerCase();
        const ag = agentiDB.find(a=>a.email&&a.email.trim().toLowerCase()===emTrim&&a.password&&a.password===pw);
        if(ag){
          if(ag.attivo===false){setErr("Account disabilitato. Contatta il responsabile.");setLoad(false);return;}
          const ruolo=ag.profilo==="Broker"?"Broker":ag.profilo==="Back Office"?"BackOffice":ag.profilo==="Coach"?"Coach":"Agente";
          onLogin({id:ag.id,nome:`${ag.nome} ${ag.cognome}`,ruolo,agentId:ag.id,profilo:ag.profilo,coachTarget:ag.coachTarget||"agenzia"});
        } else {
          setErr("Credenziali non corrette.");setLoad(false);
        }
      } catch(e){setErr("Errore di connessione.");setLoad(false);}
    },600);
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
  const TAB_AGENTE = ["Dashboard","Operatività","Gestione Pratiche","Incarichi","Proposte","Venduti","Il mio report","Statistiche","Costi","Break Even","War Room","One-to-One","Fatture Agente","Guida"];
  const TAB_COACH=coachIsAgenzia
    ?["Dashboard","Operatività","Gestione Pratiche","Incarichi","Proposte","Venduti","Statistiche","War Room","Report Agenti","One-to-One","Agenti"]
    :["Dashboard","Operatività","Gestione Pratiche","Incarichi","Proposte","Venduti","Il mio report","Statistiche","Costi","Break Even","War Room","One-to-One","Fatture Agente","Guida"];
  const TAB_BACKOFFICE=TAB_CONFIG.map(t=>t.id).filter(id=>id!=="Operatività");
  const tabsVisibili = TAB_CONFIG.filter(t=>{
    if(isBroker) return t.id !== "Il mio report" && t.id !== "Fatture Agente";
    if(isBackOffice) return !["Operatività","Il mio report","Report Agenti","Break Even","Statistiche","War Room","Fatture Agente"].includes(t.id);
    if(isCoach) return TAB_COACH.includes(t.id);
    if(isCollab&&t.id==="Operatività") return false;
    return TAB_AGENTE.includes(t.id);
  });
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
  {k:"f1",n:"Incarico firmato",fase:1,timing:"Giorno 0",azioni:[
    {k:"incFirmato",lbl:"Incarico mediazione firmato (UNAFIAIP)",ruolo:"agente"},
    {k:"lavagna",lbl:"Annotazione lavagna ufficio",ruolo:"agente"},
    {k:"gestim",lbl:"Inserimento su GESTIM",ruolo:"agente"},
    {k:"vendilo",lbl:"Aggiornamento VENDILO",ruolo:"agente"},
    {k:"consegnaErica",lbl:"Consegna documenti a Erica",ruolo:"agente"},
  ]},
  {k:"f2",n:"Attivazione pratica",fase:2,timing:"Entro 48h",azioni:[
    {k:"numPratica",lbl:"N° pratica generato su GESTIM",ruolo:"erica"},
    {k:"fascicolo",lbl:"Fascicolo cartaceo + 8 sottocartelle",ruolo:"erica"},
    {k:"cartellaNav",lbl:"Cartella NAS creata",ruolo:"erica"},
    {k:"visuraCat",lbl:"Visura catastale storica",ruolo:"erica",alert:true},
    {k:"visuraIpo",lbl:"Visura ipotecaria su immobile e proprietari",ruolo:"erica",alert:true},
    {k:"mailPropr",lbl:"Mail al proprietario + lista documenti mancanti",ruolo:"erica"},
    {k:"checkDoc",lbl:"Checklist documentale aperta (vedi A)",ruolo:"erica"},
  ]},
  {k:"f3",n:"Lancio commerciale",fase:3,timing:"Entro 5 gg",azioni:[
    {k:"fotografo",lbl:"Sopralluogo fotografo concordato",ruolo:"agente"},
    {k:"schedaGestim",lbl:"Scheda immobile compilata su GESTIM",ruolo:"agente"},
    {k:"pubblicazione",lbl:"Pubblicazione completa su portali",ruolo:"erica"},
    {k:"cartello",lbl:"Cartello VENDESI preparato e affisso",ruolo:"entrambi"},
    {k:"mailLink",lbl:"Mail ringraziamento + link annuncio",ruolo:"erica"},
    {k:"letteraZona",lbl:"Lettera dedicata per zona preparata",ruolo:"erica"},
  ]},
  {k:"f4",n:"Prima visita / Open House",fase:4,timing:"Entro 15 gg",azioni:[
    {k:"cartelloOH",lbl:"Cartello Open House preparato",ruolo:"erica"},
    {k:"brochure",lbl:"Brochure immobile per slot preparata",ruolo:"erica"},
    {k:"prequalifica",lbl:"Prequalifica telefonica interessati",ruolo:"agente"},
    {k:"ohEseguito",lbl:"Open House eseguito",ruolo:"agente"},
    {k:"feedback",lbl:"Feedback da ogni visitatore raccolto (entro 24h)",ruolo:"agente"},
    {k:"followUp",lbl:"Follow-up profili interessati (entro 48h)",ruolo:"agente"},
    {k:"aggGestim",lbl:"GESTIM aggiornato con nominativi e feedback",ruolo:"erica"},
  ]},
  {k:"f5",n:"Proposta ricevuta",fase:5,timing:"Stesso giorno",azioni:[
    {k:"propCompilata",lbl:"Proposta compilata (UNAFIAIP mod. 14)",ruolo:"agente",alert:true},
    {k:"copieCI",lbl:"Copie CI/CF proponente + fotocopia assegno",ruolo:"agente"},
    {k:"lavagnaProp",lbl:"Lavagna aggiornata sezione Proposte",ruolo:"agente"},
    {k:"gestimProp",lbl:"Proposta inserita su GESTIM (entro 2h)",ruolo:"agente",alert:true},
    {k:"vendiloProp",lbl:"VENDILO spostato in 'In Proposta' (entro 2h)",ruolo:"agente"},
    {k:"notificaErica",lbl:"Notifica WhatsApp a Erica",ruolo:"agente"},
    {k:"assegnoDeposito",lbl:"Assegno caparra consegnato a Erica/Broker",ruolo:"agente",alert:true},
    {k:"appAccettazione",lbl:"Appuntamento accettazione fissato (entro 48h)",ruolo:"agente"},
  ]},
  {k:"f6",n:"Proposta accettata",fase:6,timing:"Entro 48h",azioni:[
    {k:"firmaProp",lbl:"Proposta firmata per accettazione",ruolo:"agente"},
    {k:"datePrelim",lbl:"2 date possibili per preliminare concordate",ruolo:"agente"},
    {k:"visuraPrePrelim",lbl:"Visura ipotecaria aggiornata (giorno prima prelim.)",ruolo:"erica",alert:true},
    {k:"cartellaRogito",lbl:"Cartella 'Da Rogitare' NAS aperta",ruolo:"erica"},
    {k:"contattoMutuo",lbl:"Contatto broker/banca per mutuo avviato",ruolo:"agente"},
  ]},
  {k:"f7",n:"Preliminare firmato",fase:7,timing:"Data concordata",azioni:[
    {k:"bozzaPrelim",lbl:"Bozza preliminare preparata da Erica",ruolo:"erica",alert:true},
    {k:"invioParti",lbl:"Bozza inviata alle parti (almeno 48h prima)",ruolo:"erica",alert:true},
    {k:"antiricicl",lbl:"Antiriciclaggio completato PRIMA della firma",ruolo:"erica",alert:true},
    {k:"firmaEseguita",lbl:"Firma preliminare eseguita",ruolo:"entrambi"},
    {k:"copieAssegni",lbl:"Fotocopia tutti gli assegni",ruolo:"erica"},
    {k:"regold",lbl:"Registrazione Regold (entro 30 gg dalla firma)",ruolo:"erica",alert:true},
    {k:"fatturaPrelim",lbl:"Fatture provvigioni emesse (entro 48h)",ruolo:"erica"},
  ]},
  {k:"f8",n:"Dal prelim. al rogito",fase:8,timing:"Monitoraggio costante",azioni:[
    {k:"docBanca",lbl:"Documentazione inviata alla banca (entro 48h)",ruolo:"erica"},
    {k:"monitorMutuo",lbl:"Iter mutuo monitorato settimanalmente",ruolo:"entrambi"},
    {k:"contNotaio",lbl:"Contatti con notaio — invio documenti",ruolo:"erica",alert:true},
    {k:"docNotaio7gg",lbl:"Documenti al notaio (almeno 7 gg prima rogito)",ruolo:"erica",alert:true},
    {k:"checkFinale",lbl:"Check finale 1 gg prima con agente e Broker",ruolo:"erica"},
  ]},
  {k:"f9",n:"Il rogito",fase:9,timing:"Giorno rogito",azioni:[
    {k:"presenzaRogito",lbl:"Agente presente al rogito con pratica completa",ruolo:"agente"},
    {k:"giftAcquirente",lbl:"Pacchetto gift consegnato all'acquirente",ruolo:"agente"},
    {k:"recensioni",lbl:"Recensioni richieste alle parti",ruolo:"agente"},
    {k:"notificaStipula",lbl:"Comunicazione stipula avvenuta a Erica",ruolo:"agente"},
    {k:"aggGestimVend",lbl:"GESTIM aggiornato come 'Venduto'",ruolo:"erica"},
    {k:"portaliVend",lbl:"Portali aggiornati 'Venduto' (entro 24h)",ruolo:"erica",alert:true},
  ]},
  {k:"f10",n:"Post rogito",fase:10,timing:"Entro 48h",azioni:[
    {k:"cartelloVend",lbl:"Cartello VENDUTO affisso",ruolo:"erica"},
    {k:"fattureFinali",lbl:"Fatture definitive emesse (entro 48h)",ruolo:"erica"},
    {k:"archiviazioneNas",lbl:"Pratica archiviata su NAS",ruolo:"erica"},
    {k:"lettCongratul",lbl:"Lettera congratulazioni al venditore inviata",ruolo:"agente"},
    {k:"lettBenvenuto",lbl:"Lettera benvenuto all'acquirente inviata",ruolo:"agente"},
    {k:"cartolineZona",lbl:"Cartoline 'Appena Venduto' distribuite in zona",ruolo:"agente"},
    {k:"recensioneGoogle",lbl:"Recensione Google richiesta (entro 7 gg)",ruolo:"agente",alert:true},
  ]},
];

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
  const [utente,setUtente]=useState(()=>{try{const u=sessionStorage.getItem("casa_utente");return u?JSON.parse(u):null;}catch(e){return null;}});
  const handleLogin=(u)=>{try{sessionStorage.setItem("casa_utente",JSON.stringify(u));}catch(e){}setUtente(u);};
  const handleLogout=()=>{try{sessionStorage.removeItem("casa_utente");}catch(e){}setUtente(null);};
  // Funzione "Salva ora" — forza un salvataggio immediato bypassando il debounce.
  // Usata dal bottone "💾 Salva ora" in TAB Oggi come rete di sicurezza per evitare perdita dati.
  const salvaOraManualeRef = useRef(null);
  const salvaOraManuale = () => {
    if(salvaOraManualeRef.current) salvaOraManualeRef.current();
  };
  // Carica da localStorage se disponibile, altrimenti usa dati iniziali
  const _ls = caricaLS();
  // Default tab: gli agenti aprono direttamente "Operatività" (sub-tab Oggi); broker/back office/coach aprono "Dashboard"
  // Il ruolo va letto dall'utente loggato in sessionStorage (chiave "casa_utente")
  const _ruoloIniziale = (()=>{
    try{
      const u=sessionStorage.getItem("casa_utente");
      return u?JSON.parse(u)?.ruolo:null;
    }catch(e){return null;}
  })();
  const _tabIniziale = (_ruoloIniziale==="Consulente"||_ruoloIniziale==="Collaboratore"||_ruoloIniziale==="Agente") ? "Operatività" : "Dashboard";
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
  const [formSpesa,setFormSpesa]=useState(null);
  const [costiCatExpand,setCostiCatExpand]=useState({});
  const [showGestCat,setShowGestCat]=useState(false);
  const [formNuovaCatAg,setFormNuovaCatAg]=useState(null);
  const [costiAnno,setCostiAnno]=useState(annoCorrente);
  const [costiSubTab,setCostiSubTab]=useState("anno"); // "anno" = vista anno singolo, "confronto" = confronto anni
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
  const [vincoli,setVincoli]=useState(_ls?.vincoli||["Mutuo","Sanatoria","Successione","Permuta","Altro"]);
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
  const [pratiche,setPratiche]=useState(_ls?.pratiche||{});
  const [gpIncSel,setGpIncSel]=useState(null);
  const [gpSubTab,setGpSubTab]=useState("pipeline");
  const [gpFiltroStato,setGpFiltroStato]=useState("Tutti");
  const [gpVista,setGpVista]=useState("kanban");
  const [gpFiltroFase,setGpFiltroFase]=useState("Tutte");
  const [gpFiltroAlert,setGpFiltroAlert]=useState(false);
  const [gpPraticaSel,setGpPraticaSel]=useState(null);
  const [gpAnno,setGpAnno]=useState("Tutti");
  const [gpCategoria,setGpCategoria]=useState("attive");
  const [rowOpen,setRowOpen]=useState(null);
  const [warPeriodo,setWarPeriodo]=useState("anno");
  const [warDal,setWarDal]=useState(todayStr());
  const [warAl,setWarAl]=useState(todayStr());
  const [warRiunione,setWarRiunione]=useState(false);
  const [warShowObiettivo,setWarShowObiettivo]=useState(true);
  const [warShowProduzione,setWarShowProduzione]=useState(true);
  // War Room — traguardi volanti
  const [sfide,setSfide]=useState(_ls?.sfide||[]);
  const [formSfida,setFormSfida]=useState({nome:"",metrica:"acquisizioni",dal:todayStr(),al:"",premio:""});
  const [showFormSfida,setShowFormSfida]=useState(false);
  const [warSubTab,setWarSubTab]=useState("performance");
  const [warOscura,setWarOscura]=useState(false);
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
  const [fIncStato,setFIncStato]=useState("Attivo"); const [fIncAnno,setFIncAnno]=useState("Tutti"); const [incVistaTutti,setIncVistaTutti]=useState(false); const [fIncMese,setFIncMese]=useState("Tutti"); const [fIncAg,setFIncAg]=useState("Tutti");
  const [fPropStato,setFPropStato]=useState("Tutti"); const [fPropAnno,setFPropAnno]=useState(annoCorrente); const [fPropMese,setFPropMese]=useState("Tutti"); const [fPropAg,setFPropAg]=useState("Tutti");
  const [fVendStato,setFVendStato]=useState("Tutti"); const [fVendAnno,setFVendAnno]=useState(annoCorrente); const [fVendAg,setFVendAg]=useState("Tutti");
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
  const [showAttesa,setShowAttesa]=useState(false);
  const [showVincolate,setShowVincolate]=useState(false);
  const [showSospesiAg,setShowSospesiAg]=useState(false);
  const [mioRepAnno,setMioRepAnno]=useState(annoCorrente);
  const [mioRepMese,setMioRepMese]=useState("Tutti");
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
        if(data.pratiche) if(data.pratiche) setPratiche(Array.isArray(data.pratiche)?data.pratiche:Object.values(data.pratiche||{}));
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
        if(data.obiettivoAgente) setObiettivoAgente(data.obiettivoAgente);
      }
      setDbLoaded(true);
    });
  },[]);

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
      // Non ricaricare se abbiamo salvato noi stessi negli ultimi 3 secondi
      if(Date.now()-ultimoSalvataggioLocale<8000) return;
      // Non ricaricare se c'è un modal aperto
      if(document.querySelector('[data-modal="true"]')) return;
      try{
        const res=await fetch(`${SUPA_URL}/rest/v1/gestionale_data?id=eq.main&select=data`,
          {headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`}});
        if(!res.ok) return;
        const rows=await res.json();
        const d=rows?.[0]?.data;
        if(!d) return;
        if(d.venduti) setVenduti(d.venduti);
        if(d.incarichi) setIncarichi(d.incarichi);
        if(d.proposte) setProposte(d.proposte);
        if(d.pratiche) if(d.pratiche) setPratiche(Array.isArray(d.pratiche)?d.pratiche:Object.values(d.pratiche||{}));
        if(d.pagamentiFatture) setPagamentiFatture(d.pagamentiFatture);
        if(d.operativita) setOperativita(d.operativita);
        if(d.agenti) setAgenti(d.agenti.map(a=>({...a,inReport:["Broker","Consulente","Collaboratore"].includes(a.profilo)?(a.inReport!==false):false})));
        if(d.sfide) setSfide(d.sfide);
        if(d.archiviati) setArchiviati(d.archiviati);
        if(d.archiviatiProp) setArchiviatiProp(d.archiviatiProp);
        if(d.archiviatiVend) setArchiviatiVend(d.archiviatiVend);
        if(d.oneToOne) setOneToOne(d.oneToOne);
        if(d.fasiConfig) setFasiConfig(d.fasiConfig);
        if(d.mirino) setMirino(prev=>({...d.mirino,...prev})); // merge, local wins
        if(d.obiettivoAgente) setObiettivoAgente(d.obiettivoAgente);
        if(d.mirino) setMirino(d.mirino);
        if(d.sfide) setSfide(d.sfide);
      }catch(e){}
    };

    // Esponi funzione per segnare quando salviamo noi
    window._gestionaleSalvato=()=>{ ultimoSalvataggioLocale=Date.now(); };

    const initRealtime=async()=>{
      try{
        const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2");
        supaClient=createClient(SUPA_URL,SUPA_KEY);
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
    return()=>{ if(channel&&supaClient)supaClient.removeChannel(channel); delete window._gestionaleSalvato; };
  },[dbLoaded]);

  // Auto-salvataggio su Supabase + localStorage ad ogni modifica
  useEffect(()=>{
    if(!dbLoaded) return; // non salvare prima di aver caricato
    const payload = {agenti,incarichi,proposte,venduti,archiviati,archiviatiProp,archiviatiVend,fonti,tipologie,vincoli,tipiNeg,tipiVolantino,tipiSviluppo,operativita,obiettiviOp,pratiche,pagamentiFatture,prospetti,ericaTodo,agenteTodo,costi,obiettivoFatturato,obiettivoQuotaAgenzia,obiettivoAgente,provvStandard,costiAgente,sfide,oneToOne,fasiConfig,mirino,emailLog,catCosti,speseCosti,breakEvenManuale,catalogoAzioni,routineProf,oggiDati,volantinaggi};
    salvaLS(payload); // salva anche in locale come backup
    // Popola la ref per il salvataggio manuale immediato (bypass debounce)
    salvaOraManualeRef.current = () => {
      setDbSaving(true);
      if(window._gestionaleSalvato) window._gestionaleSalvato();
      salvaDB(payload).finally(()=>{
        setDbSaving(false);
        setUltimoSalvataggio(new Date());
        if(window._gestionaleSalvato) window._gestionaleSalvato();
      });
    };
    setDbSaving(true);
    const t=setTimeout(()=>{
      if(window._gestionaleSalvato)window._gestionaleSalvato();
      salvaDB(payload).finally(()=>{
        setDbSaving(false);
        setUltimoSalvataggio(new Date());
        // Rinnova il guard dopo il salvataggio completato
        if(window._gestionaleSalvato)window._gestionaleSalvato();
      });
    },800); // debounce 800ms (era 2000ms, ridotto per minimizzare rischio perdita dati)
    return ()=>clearTimeout(t);
  },[agenti,incarichi,proposte,venduti,archiviati,archiviatiProp,archiviatiVend,fonti,tipologie,vincoli,tipiNeg,tipiVolantino,tipiSviluppo,operativita,obiettiviOp,pratiche,pagamentiFatture,prospetti,ericaTodo,agenteTodo,costi,obiettivoFatturato,obiettivoQuotaAgenzia,obiettivoAgente,provvStandard,costiAgente,mirino,sfide,oneToOne,fasiConfig,emailLog,catCosti,speseCosti,breakEvenManuale,catalogoAzioni,routineProf,oggiDati,volantinaggi,dbLoaded]);



  const nomAg=id=>{const a=agenti.find(a=>a.id===Number(id));return a?`${a.nome} ${a.cognome}`:"—";};
  const statoInc=i=>i.stato==="Venduto"?"Venduto":i.stato==="Locato"?"Locato":isScad(i.scadenza)?"Scaduto":"Attivo";

  // Verifica se un incarico ha proposte bloccanti attive
  const hasPropBloccante = incId => proposte.some(p=>p.incaricoId===incId&&STATI_BLOCCANTI.includes(p.stato));

  const anniInc=useMemo(()=>Array.from(new Set(incarichi.map(i=>getAnno(i.dataInizio)).filter(Boolean))).sort().reverse(),[incarichi]);
  const anniProp=useMemo(()=>Array.from(new Set(proposte.map(p=>getAnno(p.dataStato)).filter(Boolean))).sort().reverse(),[proposte]);
  const anniVend=useMemo(()=>Array.from(new Set(venduti.map(v=>getAnno(dataCompAgenzia(v))).filter(Boolean))).sort().reverse(),[venduti]);
  const mesiInc=useMemo(()=>Array.from(new Set(incarichi.filter(i=>fIncAnno==="Tutti"||getAnno(i.dataInizio)===fIncAnno).map(i=>getMese(i.dataInizio)).filter(Boolean))).sort().reverse(),[incarichi,fIncAnno]);
  const mesiProp=useMemo(()=>Array.from(new Set(proposte.filter(p=>fPropAnno==="Tutti"||getAnno(p.dataStato)===fPropAnno).map(p=>getMese(p.dataStato)).filter(Boolean))).sort().reverse(),[proposte,fPropAnno]);
  const mesiFat=useMemo(()=>Array.from(new Set(venduti.filter(v=>fatAnno==="Tutti"||getAnno(dataCompAgenzia(v))===fatAnno).map(v=>getMese(dataCompAgenzia(v))).filter(Boolean))).sort().reverse(),[venduti,fatAnno]);
  const mesiReport=useMemo(()=>Array.from(new Set(venduti.filter(v=>reportAnno==="Tutti"||getAnno(dataCompAgenzia(v))===reportAnno).map(v=>getMese(dataCompAgenzia(v))).filter(Boolean))).sort().reverse(),[venduti,reportAnno]);

  const incFiltrati=useMemo(()=>incarichi.filter(i=>{
    if(i.archiviato&&!mostraArchiviati) return false;
    if(i.categoria!==subInc) return false;
    // Agente: se vuole vede tutti, altrimenti solo i suoi
    if(!canViewAll&&myAgentId&&!incVistaTutti&&i.agenteListing!==myAgentId) return false;
    const s=statoInc(i);
    if(fIncStato!=="Tutti"&&s!==fIncStato) return false;
    if(fIncAnno!=="Tutti"&&getAnno(i.dataInizio)!==fIncAnno) return false;
    if(fIncMese!=="Tutti"&&getMese(i.dataInizio)!==fIncMese) return false;
    if(fIncAg!=="Tutti"&&i.agenteListing!==Number(fIncAg)) return false;
    // Ricerca testuale (live, multi-parola)
    if(!matchSearch(searchIncarichi, i.comune, i.indirizzo, i.tipologia, i.nominativo, i.note, i.fonte)) return false;
    return true;
  }),[incarichi,subInc,fIncStato,fIncAnno,fIncMese,fIncAg,mostraArchiviati,isBroker,myAgentId,incVistaTutti,searchIncarichi]);

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
    return{attivi:b.filter(i=>statoInc(i)==="Attivo").length,scaduti:b.filter(i=>statoInc(i)==="Scaduto").length,venduti:b.filter(i=>statoInc(i)==="Venduto"||statoInc(i)==="Locato").length};
  },[incarichi,subInc,fIncAnno,fIncMese,fIncAg,isBroker,myAgentId]);

  const propFiltrate=useMemo(()=>proposte.filter(p=>{
    if(p.categoria!==subProp) return false;
    // Agente vede solo le proprie proposte
    if(!isBroker&&!isBackOffice&&myAgentId&&Number(p.agenteAcquirente)!==myAgentId&&Number(p.agenteListing)!==myAgentId) return false;
    if(fPropStato!=="Tutti"&&p.stato!==fPropStato) return false;
    if(fPropAnno!=="Tutti"&&getAnno(p.dataStato)!==fPropAnno) return false;
    if(fPropMese!=="Tutti"&&getMese(p.dataStato)!==fPropMese) return false;
    if(fPropAg!=="Tutti"&&Number(p.agenteAcquirente)!==Number(fPropAg)&&Number(p.agenteListing)!==Number(fPropAg)) return false;
    // Ricerca testuale (live, multi-parola)
    if(!matchSearch(searchProposte, p.comuneImmobile, p.indirizzoImmobile, p.tipologia, p.nominativoVenditore, p.nomeAcquirente, p.noteStato)) return false;
    return true;
  }),[proposte,subProp,fPropStato,fPropAnno,fPropMese,fPropAg,isBroker,myAgentId,searchProposte]);

  const cntProp=useMemo(()=>({attesa:propFiltrate.filter(p=>["In attesa","In attesa / Vincolata"].includes(p.stato)).length,vincolo:propFiltrate.filter(p=>p.stato==="Accettata con Vincolo").length,accettate:propFiltrate.filter(p=>p.stato==="Accettata").length,rifiutate:propFiltrate.filter(p=>["Rifiutata","Mancata Chiusura"].includes(p.stato)).length}),[propFiltrate]);

  const vendFiltrati=useMemo(()=>venduti.filter(v=>{
    if(v.categoria!==subVend) return false;
    // Agente vede solo i propri venduti
    if(!isBroker&&!isBackOffice&&myAgentId&&Number(v.agenteListing)!==myAgentId&&Number(v.agenteAcquirente)!==myAgentId) return false;
    const stato=calcolaStatoIncasso(v);
    if(fVendStato!=="Tutti"&&stato!==fVendStato) return false;
    if(fVendAnno!=="Tutti"&&getAnno(dataCompAgenzia(v))!==fVendAnno) return false;
    if(fVendAg!=="Tutti"&&Number(v.agenteListing)!==Number(fVendAg)&&Number(v.agenteAcquirente)!==Number(fVendAg)) return false;
    // Ricerca testuale (live, multi-parola)
    if(!matchSearch(searchVenduti, v.comuneImmobile, v.indirizzoImmobile, v.tipologia, v.nominativoVenditore, v.nomeAcquirente, v.note)) return false;
    return true;
  }),[venduti,subVend,fVendStato,fVendAnno,fVendAg,isBroker,myAgentId,searchVenduti]);

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
    const pV=Number(p.provvVenditore||0); const pA=Number(p.provvAcquirente||0);
    let qAg=pV+pA;
    agenti.filter(a=>a.profilo!=="Broker").forEach(a=>{
      if(p.agenteListing===a.id) qAg-=pV*(Number(a.percListing||0)/100);
      if(p.agenteAcquirente===a.id) qAg-=pA*(Number(a.percAcquirente||0)/100);
      if(p.buyerListing===a.id&&p.agenteListing!==a.id) qAg-=pV*(Number(a.percBuyerListing||p.percBuyerListing||0)/100);
      if(p.buyer===a.id&&p.agenteAcquirente!==a.id) qAg-=pA*(Number(a.percBuyer||p.percBuyer||0)/100);
    });
    return s+Math.max(0,qAg);
  },0),[propVincolo,agenti]);

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

  const emptyInc=(cat="vendita")=>({categoria:cat,agenteListing:"",percListing:0,buyerListing:"",percBuyerListing:0,fonte:"",nominativo:"",comune:"",indirizzo:"",tipologia:"",dataInizio:todayStr(),scadenza:"",prezzoRichiesto:"",prezzoReale:"",provvPrevista:"",note:"",stato:"Attivo",archiviato:false,storicoRibassi:[]});
  const salvaInc=()=>{ if(isReadOnly){alert("Modalità sola lettura");return;}
    if(!formInc.nominativo||!formInc.comune)return;
    const inc={...formInc,id:showInc==="new"?Date.now():showInc.id,prezzoRichiesto:Number(formInc.prezzoRichiesto),prezzoReale:Number(formInc.prezzoReale),provvPrevista:Number(formInc.provvPrevista),agenteListing:Number(formInc.agenteListing)||null,buyerListing:formInc.buyerListing?Number(formInc.buyerListing):null,percListing:Number(formInc.percListing||0),percBuyerListing:Number(formInc.percBuyerListing||0)};
    showInc==="new"?setIncarichi([...incarichi,inc]):setIncarichi(incarichi.map(i=>i.id===showInc.id?inc:i));
    setShowInc(null);
  };

  const emptyProp=(cat="vendita",inc=null)=>({categoria:cat,tipo:inc?"da_incarico":"collaborazione",incaricoId:inc?inc.id:null,agenteListing:inc?inc.agenteListing:null,percListing:inc?inc.percListing:0,buyerListing:inc?inc.buyerListing:null,percBuyerListing:inc?inc.percBuyerListing:0,comuneImmobile:inc?inc.comune:"",indirizzoImmobile:inc?inc.indirizzo:"",tipologia:inc?inc.tipologia:"",nominativoVenditore:inc?inc.nominativo:"",agenziaEsterna:"",agenteAcquirente:"",percAcquirente:"",percProvvVenditore:"",percProvvAcquirente:"",buyer:"",percBuyer:0,nomeAcquirente:"",prezzoOfferto:"",vincolata:false,tipoVincolo:"",termineSubordine:"",scadenzaProposta:"",provvVenditore:inc?inc.provvPrevista:"",provvAcquirente:"",stato:"In attesa",noteStato:"",dataStato:todayStr(),dataVendita:"",dataAccettazione:"",storico:[{stato:"In attesa",data:nowISO()}],controproposte:[]});
  const salvaProp=()=>{ if(isReadOnly){alert("Modalità sola lettura");return;}
    if(!formProp.comuneImmobile||!formProp.nomeAcquirente)return;
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
    // Vincolo negativo: NON cambia stato, rimane in attesa/vincolata (gestione manuale)
    setShowGestProp(null);
  };

  const salvaVend=()=>{ if(isReadOnly){alert("Sola lettura");return;}if(!showGestVend)return;const u={...showGestVend,...formVend};u.statoIncasso=calcolaStatoIncasso(u);setVenduti(venduti.map(v=>v.id===showGestVend.id?u:v));setShowGestVend(null);};
  const salvaPagamento=()=>{ if(isReadOnly){alert("Modalità sola lettura");return;}if(!showPagamento)return;setPagamentiFatture({...pagamentiFatture,[showPagamento.key]:{...formPagamento,importoPagato:Number(formPagamento.importoPagato||0)}});setShowPagamento(null);};
  const esporta=()=>{const b=new Blob([JSON.stringify({agenti,incarichi,proposte,venduti,fonti,tipologie,vincoli,tipiNeg,pagamentiFatture,archiviati},null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`gestionale_${todayStr()}.json`;a.click();URL.revokeObjectURL(u);};
  const importa=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.agenti)setAgenti(d.agenti);if(d.incarichi)setIncarichi(d.incarichi);if(d.proposte)setProposte(d.proposte);if(d.venduti)setVenduti(d.venduti);if(d.fonti)setFonti(d.fonti);if(d.tipologie)setTipologie(d.tipologie);if(d.vincoli)setVincoli(d.vincoli);if(d.tipiNeg)setTipiNeg(d.tipiNeg);if(d.pagamentiFatture)setPagamentiFatture(d.pagamentiFatture);if(d.archiviati)setArchiviati(d.archiviati);alert("Importato!");}catch{alert("File non valido.");}};r.readAsText(f);e.target.value="";};

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
    <Sel value={fIncStato} onChange={setFIncStato}><option value="Tutti">Tutti gli stati</option>{["Attivo","Scaduto",subInc==="affitto"?"Locato":"Venduto"].map(s=><option key={s}>{s}</option>)}</Sel>
    {(isBroker||isBackOffice)&&<Sel value={fIncAg} onChange={setFIncAg}><option value="Tutti">Tutti gli agenti</option>{agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</Sel>}
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
        <div style={{background:"#fff",borderBottom:"0.5px solid #e8e5e0",padding:isMobile?"0.6rem 1rem":"0.875rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isMobile&&<button onClick={()=>setShowMobileMenu(true)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:BRAND.grigio,padding:"0 8px 0 0",lineHeight:1}}>☰</button>}
            <span style={{fontSize:18}}>{currentTabCfg?.icon}</span>
            <h1 style={{fontSize:15,fontWeight:600,margin:0}}>{currentTabCfg?.label}</h1>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {dbSaving&&<span style={{fontSize:11,color:"#aaa",display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:BRAND.oro,display:"inline-block",animation:"pulse 1s infinite"}}></span>Salvataggio...</span>}
            {!dbSaving&&dbLoaded&&<span style={{fontSize:11,color:"#27AE60"}}>✓ Sincronizzato</span>}
            <button style={{...S.btn,color:"#c0392b",fontSize:12}} onClick={handleLogout}>Esci</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>

          {isReadOnly&&<div style={{position:"sticky",top:0,zIndex:50,background:"#0C447C",color:"#fff",padding:"6px 0",fontSize:12,fontWeight:500,textAlign:"center",letterSpacing:".02em"}}>👁 Sola lettura — navigazione permessa, modifiche bloccate</div>}
          {/* DASHBOARD */}
          {tab==="Dashboard"&&(<div style={S.sec}>

            {/* ── DASHBOARD AGENTE ── */}
            {!isBroker&&!isBackOffice&&myAgentId&&(()=>{
              const ag = agenti.find(a=>a.id===myAgentId);

              // Tutte le pratiche dove l'agente appare in qualsiasi ruolo
              const myVendTutti = venduti.filter(v=>v.categoria==="vendita"&&(
                Number(v.agenteListing)===myAgentId||
                Number(v.agenteAcquirente)===myAgentId||
                Number(v.buyerListing)===myAgentId||
                Number(v.buyer)===myAgentId
              ));

              // Pratiche filtrate per anno selezionato
              // Per PRODUZIONE AGENZIA: filtra per dataCompAgenzia (competenza agenzia)
              const myVendAnnoProd = myVendTutti.filter(v=>dashAnno==="Tutti"||getAnno(dataCompAgenzia(v))===dashAnno);
              // Per QUOTA AGENTE/INCASSATO: filtra per dataCompetenzaAgente (quando l'agente matura la quota)
              // Se competenzaAgenteDiversa=true usa dataCompetenzaAgente, altrimenti usa dataCompAgenzia
              const dataCompAgente = v => (v.competenzaAgenteDiversa===true||v.competenzaAgenteDiversa==="true")&&v.dataCompetenzaAgente ? v.dataCompetenzaAgente : dataCompAgenzia(v);
              const myVendAnno = myVendTutti.filter(v=>dashAnno==="Tutti"||getAnno(dataCompAgente(v))===dashAnno);

              // Ruolo in ogni pratica
              const ruoloIn = v => {
                const ruoli=[];
                if(Number(v.agenteListing)===myAgentId) ruoli.push("Listing");
                if(Number(v.agenteAcquirente)===myAgentId) ruoli.push("Acquirente");
                if(Number(v.buyerListing)===myAgentId) ruoli.push("Buyer L");
                if(Number(v.buyer)===myAgentId) ruoli.push("Buyer");
                return ruoli;
              };

              // KPI incarichi agente
              const myInc = incarichi.filter(i=>i.categoria==="vendita"&&i.agenteListing===myAgentId&&!i.archiviato);
              const myIncAnno = incarichi.filter(i=>i.categoria==="vendita"&&i.agenteListing===myAgentId&&(dashAnno==="Tutti"||getAnno(i.dataInizio)===dashAnno));
              const nTransV = myVendAnnoProd.filter(v=>Number(v.agenteListing)===myAgentId&&Number(v.provvVenditore||0)>0&&!v.agenziaEsterna).length;
              const nTransA = myVendAnnoProd.filter(v=>Number(v.agenteAcquirente)===myAgentId&&Number(v.provvAcquirente||0)>0).length;

              // Produzione Agente = provv agenzia dove è Listing o Acquirente (usa competenza AGENZIA)
              const produzione = myVendAnnoProd.reduce((s,v)=>{
                let p=0;
                if(Number(v.agenteListing)===myAgentId) p+=Number(v.provvVenditore||0);
                if(Number(v.agenteAcquirente)===myAgentId) p+=Number(v.provvAcquirente||0);
                return s+p;
              },0);
              const quotaAgenziaSuProd = myVendAnnoProd.reduce((s,v)=>{
                let q=0;
                const pV=Number(v.provvVenditore||0); const pA=Number(v.provvAcquirente||0);
                if(Number(v.agenteListing)===myAgentId&&pV>0) q+=pV*(1-Number(v.percListing||0)/100);
                if(Number(v.agenteAcquirente)===myAgentId&&pA>0) q+=pA*(1-Number(v.percAcquirente||0)/100);
                return s+q;
              },0);
              // Quota Agente (solo Listing/Acquirente)
              const quotaAgente = myVendAnno.reduce((s,v)=>{
                let q=0;
                if(Number(v.agenteListing)===myAgentId) q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
                if(Number(v.agenteAcquirente)===myAgentId) q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
                return s+q;
              },0);
              // Quota Buyer (solo BuyerL/Buyer)
              const quotaBuyer = myVendAnno.reduce((s,v)=>{
                let q=0;
                if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId) q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;
                if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId) q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;
                return s+q;
              },0);
              // QUOTA INCASSATA = quanto l'agenzia ha effettivamente pagato all'agente
              // Si legge da pagamentiFatture (tab Fatture Agenti → bottone Pagamento)
              // key = v.id + "_" + myAgentId (stessa key usata in fatturaDati)
              const incassatoAgente = myVendTutti.reduce((s,v)=>{
                const key=String(v.id)+"_"+String(myAgentId);
                const pag=pagamentiFatture[key]||{};
                return s+Number(pag.importoPagato||0);
              },0);
              const incassatoBuyer = 0; // incluso in importoPagato sopra
              const totIncassato = incassatoAgente;
              const totMaturato = quotaAgente + quotaBuyer;
              const daIncAssAgente = Math.max(0, quotaAgente - totIncassato);
              const daIncAssBuyer = Math.max(0, quotaBuyer);
              const totDaInc = Math.max(0, totMaturato - totIncassato);

              // Quota agente SOLO su produzione anno corrente (esclude pratiche anno prec.)
              const quotaAgenteProdAnno = myVendAnnoProd.reduce((s,v)=>{
                let q=0;
                if(Number(v.agenteListing)===myAgentId) q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
                if(Number(v.agenteAcquirente)===myAgentId) q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
                return s+q;
              },0);

              // Quota maturata da anno precedente (in totale maturato)
              // = pratiche con competenza AGENTE nell'anno sel. ma competenza AGENZIA diversa
              const quotaAnnoPrecMaturata = dashAnno==="Tutti" ? 0 : myVendTutti.filter(v=>{
                return getAnno(dataCompAgente(v))===dashAnno && getAnno(dataCompAgenzia(v))!==dashAnno;
              }).reduce((s,v)=>{
                let q=0;
                if(Number(v.agenteListing)===myAgentId) q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
                if(Number(v.agenteAcquirente)===myAgentId) q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
                if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId) q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;
                if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId) q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;
                return s+q;
              },0);
              // Produzione Agente anno corrente = esclude quota da anno precedente
              const quotaAgentePuraAnno = quotaAgente - myVendAnnoProd.reduce((s,v)=>{
                // sottrai solo la parte che viene da myVendAnno ma non da myVendAnnoProd
                return s; // già calcolato sopra separatamente
              },0);

              // Quota da anno precedente = pratiche con dataCompetenzaAgente in anno diverso da dashAnno
              const annoPrecCalc = dashAnno!=="Tutti" ? String(Number(dashAnno)-1) : null;
              // Quota incassata da pratiche con competenza AGENTE nell'anno sel. ma competenza AGENZIA diversa
              const incassatoAnnoPrecAg = dashAnno==="Tutti" ? 0 : myVendTutti.filter(v=>{
                return getAnno(dataCompAgente(v))===dashAnno && getAnno(dataCompAgenzia(v))!==dashAnno;
              }).reduce((s,v)=>{
                let q=0;
                if(Number(v.agenteListing)===myAgentId) q+=calcolaIncassatoV(v)*Number(v.percListing||0)/100;
                if(Number(v.agenteAcquirente)===myAgentId) q+=calcolaIncassatoA(v)*Number(v.percAcquirente||0)/100;
                if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId) q+=calcolaIncassatoV(v)*Number(v.percBuyerListing||0)/100;
                if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId) q+=calcolaIncassatoA(v)*Number(v.percBuyer||0)/100;
                return s+q;
              },0);
              // Quota maturata anno precedente ancora da incassare
              const daIncAnnoPrecAg = dashAnno==="Tutti" ? 0 : myVendTutti.filter(v=>{
                const dataAgenzia = dataCompAgenzia(v);
                return annoPrecCalc && getAnno(dataAgenzia)===annoPrecCalc;
              }).reduce((s,v)=>{
                let qTot=0,qInc=0;
                if(Number(v.agenteListing)===myAgentId){qTot+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;qInc+=calcolaIncassatoV(v)*Number(v.percListing||0)/100;}
                if(Number(v.agenteAcquirente)===myAgentId){qTot+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;qInc+=calcolaIncassatoA(v)*Number(v.percAcquirente||0)/100;}
                if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId){qTot+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;qInc+=calcolaIncassatoV(v)*Number(v.percBuyerListing||0)/100;}
                if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId){qTot+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;qInc+=calcolaIncassatoA(v)*Number(v.percBuyer||0)/100;}
                return s+Math.max(0,qTot-qInc);
              },0);

              // Sospesi agente
              const sospesiRighe=[];
              myVendTutti.forEach(v=>{
                const ruoli=ruoloIn(v);
                if(ruoli.includes("Listing")||ruoli.includes("Buyer L")){
                  const resV=(Number(v.provvVenditore||0)-calcolaIncassatoV(v));
                  if(resV>0){const quotaV=ruoli.includes("Listing")?Number(v.percListing||0)/100:Number(v.percBuyerListing||0)/100;sospesiRighe.push({v,lato:"V",ruolo:ruoli.includes("Listing")?"Listing":"Buyer L",nominativo:v.nominativoVenditore,residuo:resV,quotaMia:resV*quotaV,scadenza:v.scadenzaIncasso});}
                }
                if(ruoli.includes("Acquirente")||ruoli.includes("Buyer")){
                  const resA=(Number(v.provvAcquirente||0)-calcolaIncassatoA(v));
                  if(resA>0){const quotaA=ruoli.includes("Acquirente")?Number(v.percAcquirente||0)/100:Number(v.percBuyer||0)/100;sospesiRighe.push({v,lato:"A",ruolo:ruoli.includes("Acquirente")?"Acquirente":"Buyer",nominativo:v.nomeAcquirente,residuo:resA,quotaMia:resA*quotaA,scadenza:v.scadenzaIncasso});}
                }
              });

              const myPropAttive=proposte.filter(p=>p.categoria==="vendita"&&(
                Number(p.agenteAcquirente)===myAgentId||Number(p.agenteListing)===myAgentId||
                Number(p.buyerListing)===myAgentId||Number(p.buyer)===myAgentId
              )&&["In attesa","In attesa / Vincolata","Controproposta"].includes(p.stato));
              const myPropVincolo=proposte.filter(p=>p.categoria==="vendita"&&(
                Number(p.agenteAcquirente)===myAgentId||Number(p.agenteListing)===myAgentId||
                Number(p.buyerListing)===myAgentId||Number(p.buyer)===myAgentId
              )&&p.stato==="Accettata con Vincolo");
              // Ruolo agente in ogni proposta
              const ruoloProp=p=>{
                if(Number(p.agenteListing)===myAgentId) return "Listing";
                if(Number(p.agenteAcquirente)===myAgentId) return "Acquirente";
                if(Number(p.buyerListing)===myAgentId) return "Buyer L";
                if(Number(p.buyer)===myAgentId) return "Buyer";
                return "—";
              };
              const colRuolo={Listing:"#2980B9",Acquirente:"#8E44AD","Buyer L":"#E67E22",Buyer:"#E74C3C"};

              const BF=({titolo,colore,emoji,totale,sub1L,sub1V,sub2L,sub2V,sub3L,sub3V})=>(
                <div style={{background:"#fff",borderRadius:10,border:`0.5px solid ${colore}44`,padding:"14px 16px",borderTop:`3px solid ${colore}`}}>
                  <p style={{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 4px"}}>{emoji} {titolo}</p>
                  <p style={{fontSize:22,fontWeight:700,color:colore,margin:"0 0 8px"}}>€ {fmt(totale)}</p>
                  <div style={{borderTop:"0.5px solid #f0f0f0",paddingTop:6,display:"flex",flexDirection:"column",gap:3}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:"#aaa"}}>{sub1L}</span><span style={{fontWeight:500,color:"#555"}}>€ {fmt(sub1V)}</span></div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:"#aaa"}}>{sub2L}</span><span style={{fontWeight:500,color:"#555"}}>€ {fmt(sub2V)}</span></div>
                    {sub3L!==undefined&&sub3V>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:3,paddingTop:3,borderTop:"0.5px dashed #e8e5e0"}}>
                      <span style={{color:"#C9A96E",fontStyle:"italic"}}>{sub3L}</span>
                      <span style={{fontWeight:600,color:"#C9A96E"}}>€ {fmt(sub3V)}</span>
                    </div>}
                  </div>
                </div>
              );

              return(<>
                <div style={S.fRow}>
                  <Sel value={dashAnno} onChange={setDashAnno}>
                    <option value="Tutti">Tutti gli anni</option>
                    {[...new Set([annoCorrente,...anniVend])].sort().reverse().map(a=><option key={a}>{a}</option>)}
                  </Sel>
                </div>
                {/* KPI 4 box */}
                <div style={isMobile?{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:"1rem"}:S.g4}>
                  <div style={S.card(STATI_INC.Attivo.clr)}>
                    <p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>Incarichi attivi</p>
                    <p style={{fontSize:28,fontWeight:600,margin:0,color:STATI_INC.Attivo.clr}}>{myInc.filter(i=>statoInc(i)==="Attivo").length}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>{myIncAnno.length} acquisiti{dashAnno!=="Tutti"?` ${dashAnno}`:""}</p>
                  </div>
                  <div style={S.card(STATI_INC.Scaduto.clr)}>
                    <p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>Incarichi scaduti</p>
                    <p style={{fontSize:28,fontWeight:600,margin:0,color:STATI_INC.Scaduto.clr}}>{myInc.filter(i=>statoInc(i)==="Scaduto").length}</p>
                  </div>
                  <div style={S.card(STATI_INC.Venduto.clr)}>
                    <p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>Transazioni {dashAnno!=="Tutti"?dashAnno:"totali"}</p>
                    <p style={{fontSize:28,fontWeight:600,margin:0,color:STATI_INC.Venduto.clr}}>{nTransV+nTransA}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>{nTransV}V · {nTransA}A</p>
                  </div>
                  <div style={S.card("#4A90D9")}>
                    <p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>Incarichi acquisiti {dashAnno!=="Tutti"?dashAnno:annoCorrente}</p>
                    <p style={{fontSize:28,fontWeight:600,margin:0,color:"#4A90D9"}}>{incarichi.filter(i=>i.categoria==="vendita"&&i.agenteListing===myAgentId&&!i.archiviato&&getAnno(i.dataInizio)===(dashAnno!=="Tutti"?dashAnno:annoCorrente)).length}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>{myPropAttive.length} proposte attive</p>
                  </div>
                </div>
                {/* 4 blocchi finanziari */}
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
                  <BF titolo="Produzione Agente" colore="#27AE60" emoji="📋" totale={produzione} sub1L="Quota Agenzia" sub1V={quotaAgenziaSuProd} sub2L={`Quota Agente ${dashAnno!=="Tutti"?dashAnno:""}`} sub2V={quotaAgenteProdAnno}/>
                  <BF titolo="Quota Incassata" colore="#2980B9" emoji="✅" totale={totIncassato} sub1L="Quota Agente" sub1V={incassatoAgente} sub2L="Quota Buyer" sub2V={incassatoBuyer} sub3L={`di cui da ${annoPrecCalc||"anno prec."}`} sub3V={incassatoAnnoPrecAg}/>
                  <BF titolo="Da Incassare" colore="#E67E22" emoji="⏳" totale={totDaInc} sub1L="Quota Agente" sub1V={daIncAssAgente} sub2L="Quota Buyer" sub2V={daIncAssBuyer} sub3L={`da anno ${annoPrecCalc||"prec."}`} sub3V={daIncAnnoPrecAg}/>
                  <BF titolo="Totale Maturato" colore={BRAND.oroD} emoji="💰" totale={totMaturato} sub1L="Quota Agente" sub1V={quotaAgente} sub2L="Quota Buyer" sub2V={quotaBuyer} sub3L={annoPrecCalc&&quotaAnnoPrecMaturata>0?`di cui da ${annoPrecCalc}`:undefined} sub3V={quotaAnnoPrecMaturata}/>
                </div>

                {/* LE MIE ATTIVITÀ SULLE PRATICHE (azioni ruolo agente/entrambi, fase corrente) */}
                {(()=>{
                  const fasiAg=fasiConfig||FASI;
                  const getPrAg=incId=>{const pr=Array.isArray(pratiche)?pratiche.find(p=>p.incaricoId===incId):pratiche[incId];return pr||{fasi:{}};};
                  const faseCorrenteAg=(incId)=>{const pr=getPrAg(incId);let lastIdx=0;fasiAg.forEach((f,idx)=>{if(Object.values(pr.fasi?.[f.k]||{}).some(a=>a.fatto))lastIdx=idx;});return lastIdx;};
                  // Pratiche dove l'agente è coinvolto in QUALSIASI ruolo (opzione B)
                  const mieInc=incarichi.filter(i=>i.categoria==="vendita"&&!i.archiviato&&statoInc(i)!=="Venduto"&&(
                    Number(i.agenteListing)===myAgentId||Number(i.buyerListing)===myAgentId
                  ));
                  // Includo anche pratiche dove è acquirente/buyer (dai venduti non ancora rogitati? no: incarichi)
                  // Per acquirente/buyer guardo le proposte→incarichi collegati. Semplifico: uso incarichi dove è listing o buyerListing.
                  const attAg=[];
                  mieInc.forEach(inc=>{
                    const pr=getPrAg(inc.id);
                    const fcIdx=faseCorrenteAg(inc.id);
                    fasiAg.forEach((fase,fIdx)=>{
                      (fase.azioni||[]).forEach(az=>{
                        if(az.ruolo!=="agente"&&az.ruolo!=="entrambi") return;
                        const fatto=pr.fasi?.[fase.k]?.[az.k]?.fatto;
                        if(fatto) return;
                        if(fIdx!==fcIdx) return; // solo fase corrente
                        attAg.push({inc, fase, az, alert:!!az.alert});
                      });
                    });
                  });
                  attAg.sort((a,b)=>(b.alert?1:0)-(a.alert?1:0));
                  return(<div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1.25rem"}}>
                    <div onClick={()=>setShowAttivitaAg(v=>!v)} style={{background:"#EEEDFE",padding:"9px 16px",borderBottom:showAttivitaAg?"0.5px solid #e8e5e0":"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
                      <div>
                        <span style={{fontSize:13,fontWeight:600,color:"#3C3489"}}>✅ Le mie attività sulle pratiche</span>
                        {attAg.length>0&&<span style={{marginLeft:8,fontSize:11,padding:"1px 8px",borderRadius:10,background:"#3C3489",color:"#fff",fontWeight:700}}>{attAg.length}</span>}
                        <p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>Le tue azioni nella fase attuale di ogni pratica · apri per vedere l'avanzamento completo</p>
                      </div>
                      <button style={{background:"none",border:"0.5px solid #3C348944",borderRadius:6,padding:"3px 10px",fontSize:12,cursor:"pointer",color:"#3C3489",whiteSpace:"nowrap"}}>{showAttivitaAg?"▲ Chiudi":"▼ Vedi"}</button>
                    </div>
                    {showAttivitaAg&&(attAg.length===0?<div style={{padding:"1.25rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna attività in sospeso nelle tue pratiche ✨</div>:
                    <>{attAg.slice(0,10).map(a=>(
                      <div key={`${a.inc.id}_${a.fase.k}_${a.az.k}`} onClick={()=>{setTab("Gestione Pratiche");}} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 16px",borderBottom:"0.5px solid #f0f0f0",cursor:"pointer",background:a.alert?"#FCF4E6":"#fff"}}>
                        <span style={{fontSize:13,flexShrink:0}}>{a.alert?"⚠️":"○"}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12.5,fontWeight:a.alert?600:400}}>{a.az.lbl}</div>
                          <div style={{fontSize:11,color:"#888"}}>{a.inc.comune} — {a.inc.indirizzo} · {a.fase.timing}</div>
                        </div>
                        <span style={{fontSize:11,color:"#3C3489",whiteSpace:"nowrap"}}>Apri →</span>
                      </div>
                    ))}
                    {attAg.length>10&&<div style={{padding:"8px 16px",fontSize:11,color:"#888",textAlign:"center"}}>+ altre {attAg.length-10} attività in Gestione Pratiche</div>}</>)}
                  </div>);
                })()}

                {/* TO-DO LIBERA AGENTE (come Erica, subito dopo le attività) */}
                {(()=>{
                  const mieTodo=agenteTodo[myAgentId]||[];
                  const aggTodoAg=()=>{
                    if(!agenteTodoInput.trim())return;
                    const nuovo={id:Date.now(),testo:agenteTodoInput.trim(),fatto:false,data:todayStr()};
                    setAgenteTodo({...agenteTodo,[myAgentId]:[...mieTodo,nuovo]});
                    setAgenteTodoInput("");
                  };
                  const toggleTodoAg=id=>setAgenteTodo({...agenteTodo,[myAgentId]:mieTodo.map(t=>t.id===id?{...t,fatto:!t.fatto}:t)});
                  const delTodoAg=id=>setAgenteTodo({...agenteTodo,[myAgentId]:mieTodo.filter(t=>t.id!==id)});
                  return(<div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1.25rem"}}>
                    <div style={{background:"#E1F5EE",padding:"10px 16px",borderBottom:"0.5px solid #e8e5e0"}}>
                      <span style={{fontSize:13,fontWeight:600,color:"#0F6E56"}}>📝 Le mie cose da fare</span>
                      <p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>Promemoria personali (chiamate da fare, materiali, idee...)</p>
                    </div>
                    <div style={{padding:"10px 16px"}}>
                      {mieTodo.length===0&&<p style={{fontSize:12,color:"#bbb",textAlign:"center",margin:"8px 0"}}>Nessuna attività. Aggiungine una qui sotto.</p>}
                      {mieTodo.map(t=>(
                        <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"0.5px solid #f0f0f0"}}>
                          <span onClick={()=>toggleTodoAg(t.id)} style={{fontSize:16,cursor:"pointer",color:t.fatto?"#0F6E56":"#B4B2A9",flexShrink:0}}>{t.fatto?"☑":"☐"}</span>
                          <span style={{flex:1,fontSize:13,color:t.fatto?"#bbb":BRAND.grigio,textDecoration:t.fatto?"line-through":"none"}}>{t.testo}</span>
                          <button onClick={()=>delTodoAg(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:14,padding:"2px 6px"}} title="Elimina">×</button>
                        </div>
                      ))}
                      <div style={{display:"flex",gap:8,paddingTop:10}}>
                        <input type="text" value={agenteTodoInput} onChange={e=>setAgenteTodoInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")aggTodoAg();}} placeholder="Aggiungi un'attività..." style={{...S.inp,flex:1,fontSize:13}}/>
                        <button onClick={aggTodoAg} style={{...S.btnP,fontSize:13,padding:"7px 14px"}}>+ Aggiungi</button>
                      </div>
                    </div>
                  </div>);
                })()}

                {/* SOSPESI collassabile */}
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #E67E2244",overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#FEF0E0",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:showSospesiAg?"0.5px solid #E67E2233":"none",cursor:"pointer"}} onClick={()=>setShowSospesiAg(v=>!v)}>
                    <div><span style={{fontSize:13,fontWeight:600,color:"#E67E22"}}>🕐 SOSPESI DA INCASSARE — Tue pratiche con residuo</span>
                    <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Include Listing, Acquirente, Buyer L, Buyer</p></div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:18,fontWeight:700,color:"#E67E22",whiteSpace:"nowrap"}}>{sospesiRighe.length>0?`€ ${fmt(sospesiRighe.reduce((s,r)=>s+r.quotaMia,0))}`:"—"}</span>
                      <button style={{background:"none",border:`0.5px solid #E67E2266`,borderRadius:6,padding:"3px 10px",fontSize:12,cursor:"pointer",color:"#E67E22",whiteSpace:"nowrap"}}>{showSospesiAg?"▲ Chiudi":"▼ Vedi"}</button>
                    </div>
                  </div>
                  {showSospesiAg&&(sospesiRighe.length>0?(
                    <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                      <thead><tr>{["Ruolo","Lato","Nominativo","Immobile","Residuo pratica","Tua quota","Scadenza"].map(h=><th key={h} style={S.thS}>{h}</th>)}</tr></thead>
                      <tbody>{sospesiRighe.map((r,i)=>(
                        <tr key={i} style={{background:["Buyer L","Buyer"].includes(r.ruolo)?"#FFF9F0":"#fff"}}>
                          <td style={S.tdS}>
                            <span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:`${colRuolo[r.ruolo]}22`,color:colRuolo[r.ruolo],fontWeight:600,border:`0.5px solid ${colRuolo[r.ruolo]}44`}}>{r.ruolo}</span>
                          </td>
                          <td style={S.tdS}><span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:r.lato==="V"?"#EAF4FB":"#F5EEF8",color:r.lato==="V"?"#2980B9":"#8E44AD",fontWeight:500}}>{r.lato==="V"?"Venditore":"Acquirente"}</span></td>
                          <td style={{...S.tdS,fontWeight:500}}>{r.nominativo}</td>
                          <td style={S.tdS}>{r.v.comuneImmobile} — {r.v.indirizzoImmobile}</td>
                          <td style={{...S.tdRS,color:"#E67E22",fontWeight:600}}>€ {fmt(r.residuo)}</td>
                          <td style={{...S.tdRS,color:BRAND.oroD,fontWeight:700}}>€ {fmt(r.quotaMia)}</td>
                          <td style={{...S.tdS,color:r.scadenza&&new Date(r.scadenza)<new Date()?"#E74C3C":"inherit"}}>{r.scadenza?fmtD(r.scadenza):"—"}</td>
                        </tr>
                      ))}</tbody>
                    </table></div>
                  ):<div style={{padding:"1rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna provvigione in sospeso</div>)}
                </div>

                {/* IN ATTESA / CONTROPROPOSTA — collassabile */}
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #4A90D955",overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#E8F1FB",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:showAttesaAg?"0.5px solid #4A90D933":"none",cursor:"pointer"}} onClick={()=>setShowAttesaAg(v=>!v)}>
                    <div>
                      <span style={{fontSize:13,fontWeight:600,color:"#2980B9"}}>🔵 IN ATTESA / CONTROPROPOSTA — Proposte attive in corso di trattativa</span>
                      <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Provvigioni potenziali su proposte ancora aperte</p>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:18,fontWeight:700,color:"#2980B9",whiteSpace:"nowrap"}}>{myPropAttive.length>0?`€ ${fmt(myPropAttive.reduce((s,p)=>s+Number(p.provvVenditore||0)+Number(p.provvAcquirente||0),0))}`:"—"}</span>
                      <button style={{background:"none",border:`0.5px solid #4A90D966`,borderRadius:6,padding:"3px 10px",fontSize:12,cursor:"pointer",color:"#2980B9",whiteSpace:"nowrap"}}>{showAttesaAg?"▲ Chiudi":`▼ Vedi (${myPropAttive.length})`}</button>
                    </div>
                  </div>
                  {showAttesaAg&&(myPropAttive.length>0?(
                    <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                      <thead><tr>{["Ruolo","Stato","Venditore","Acquirente","Immobile","Prezzo","Provv. prevista"].map(h=><th key={h} style={S.thS}>{h}</th>)}</tr></thead>
                      <tbody>{myPropAttive.map(p=>{
                        const cfg=STATI_PROP[p.stato]||STATI_PROP["In attesa"];
                        const rp=ruoloProp(p);
                        return(<tr key={p.id} style={{background:["Buyer L","Buyer"].includes(rp)?"#FFF9F0":"#fff"}}>
                          <td style={S.tdS}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:`${colRuolo[rp]||"#eee"}22`,color:colRuolo[rp]||"#666",fontWeight:600,border:`0.5px solid ${colRuolo[rp]||"#ccc"}44`}}>{rp}</span></td>
                          <td style={S.tdS}><span style={bdg(cfg)}>{cfg.s} {cfg.label}</span></td>
                          <td style={{...S.tdS,fontWeight:500}}>{p.nominativoVenditore}</td>
                          <td style={S.tdS}>{p.nomeAcquirente}</td>
                          <td style={S.tdS}>{p.comuneImmobile} — {p.indirizzoImmobile}</td>
                          <td style={S.tdRS}>€ {fmtN(p.prezzoOfferto)}</td>
                          <td style={{...S.tdRS,fontWeight:600,color:"#2980B9"}}>€ {fmt(Number(p.provvVenditore||0)+Number(p.provvAcquirente||0))}</td>
                        </tr>);
                      })}</tbody>
                    </table></div>
                  ):<div style={{padding:"1rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna proposta in attesa</div>)}
                </div>

                {/* VINCOLATE — collassabile */}
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #D4AC0D55",overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#FEF9E7",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:showVincolateAg?"0.5px solid #D4AC0D44":"none",cursor:"pointer"}} onClick={()=>setShowVincolateAg(v=>!v)}>
                    <div>
                      <span style={{fontSize:13,fontWeight:600,color:"#D4AC0D"}}>Vincolate — Proposte accettate con vincolo in attesa di esito</span>
                      <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Provvigioni previste ma non certe: dipendono dall'esito del vincolo</p>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:18,fontWeight:700,color:"#D4AC0D",whiteSpace:"nowrap"}}>{myPropVincolo.length>0?`€ ${fmt(myPropVincolo.reduce((s,p)=>s+Number(p.provvVenditore||0)+Number(p.provvAcquirente||0),0))}`:"—"}</span>
                      <button style={{background:"none",border:`0.5px solid #D4AC0D66`,borderRadius:6,padding:"3px 10px",fontSize:12,cursor:"pointer",color:"#A8863A",whiteSpace:"nowrap"}}>{showVincolateAg?"▲ Chiudi":`▼ Vedi (${myPropVincolo.length})`}</button>
                    </div>
                  </div>
                  {showVincolateAg&&(myPropVincolo.length>0?(
                    <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                      <thead><tr>{["Ruolo","Venditore","Acquirente","Immobile","Vincolo","Scadenza vincolo","Provv. prevista"].map(h=><th key={h} style={S.thS}>{h}</th>)}</tr></thead>
                      <tbody>{myPropVincolo.map(p=>{
                        const rp=ruoloProp(p);
                        return(<tr key={p.id} style={{background:["Buyer L","Buyer"].includes(rp)?"#FFF9F0":"#fff"}}>
                          <td style={S.tdS}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:`${colRuolo[rp]||"#eee"}22`,color:colRuolo[rp]||"#666",fontWeight:600,border:`0.5px solid ${colRuolo[rp]||"#ccc"}44`}}>{rp}</span></td>
                          <td style={{...S.tdS,fontWeight:500}}>{p.nominativoVenditore}</td>
                          <td style={S.tdS}>{p.nomeAcquirente}</td>
                          <td style={S.tdS}>{p.comuneImmobile} — {p.indirizzoImmobile}</td>
                          <td style={S.tdS}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:"#f5f5f5",color:"#666"}}>{p.tipoVincolo||"Generico"}</span></td>
                          <td style={{...S.tdS,color:p.termineSubordine&&new Date(p.termineSubordine)<new Date()?"#E74C3C":"inherit"}}>{p.termineSubordine?fmtD(p.termineSubordine):"—"}</td>
                          <td style={{...S.tdRS,fontWeight:600,color:"#D4AC0D"}}>€ {fmt(Number(p.provvVenditore||0)+Number(p.provvAcquirente||0))}</td>
                        </tr>);
                      })}
                      </tbody>
                      <tfoot><tr style={{background:"#FEF9E7",fontWeight:500}}>
                        <td colSpan={6} style={S.tdS}>Totale vincolate ({myPropVincolo.length})</td>
                        <td style={{...S.tdRS,color:"#D4AC0D"}}>€ {fmt(myPropVincolo.reduce((s,p)=>s+Number(p.provvVenditore||0)+Number(p.provvAcquirente||0),0))}</td>
                      </tr></tfoot>
                    </table></div>
                  ):<div style={{padding:"1rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna proposta vincolata</div>)}
                </div>
              </>);
            })()}
            {!isBroker&&!isBackOffice&&(()=>{
              const oggiD=new Date();oggiD.setHours(0,0,0,0);
              const tra30=new Date(oggiD);tra30.setDate(tra30.getDate()+30);
              const toD=s=>{const d=new Date(s);d.setHours(0,0,0,0);return d;};
              const sfidaAtt=sfide.find(s=>s.dal<=todayStr()&&s.al>=todayStr()&&!s.conclusa);
              const PCLR=["#D4AC0D","#888","#CD7F32","#555"];
              const PEMOJI=["🥇","🥈","🥉","4°"];
              const calcMet=(agId,metr,d1,d2)=>{
                const incP=incarichi.filter(i=>i.agenteListing===agId&&i.dataInizio>=d1&&i.dataInizio<=d2);
                const vendP=venduti.filter(v=>(v.agenteListing===agId||v.agenteAcquirente===agId)&&(v.dataAtto||"")>=d1&&(v.dataAtto||"")<=d2);
                const gg=Object.entries(operativita[agId]||{}).filter(([d])=>d>=d1&&d<=d2);
                const ch=gg.reduce((s,[,g])=>{const ct=g.chiamate_tipi||{};return s+Object.values(ct).reduce((a,v)=>a+Number(v||0),0);},0);
                switch(metr){case "acquisizioni":return incP.length;case "fatturato":return vendP.reduce((s,v)=>s+Number(v.provvVenditore||0)+Number(v.provvAcquirente||0),0);case "chiamate":return ch;case "oh":return gg.reduce((s,[,g])=>s+(g.ohImmobili||[]).length,0);case "proposte":return proposte.filter(p=>(p.agenteListing===agId||p.agenteAcquirente===agId)&&(p.dataStato||"")>=d1&&(p.dataStato||"")<=d2).length;default:return 0;}
              };
              const myRog=venduti.filter(v=>{if(!v.dataAtto||(v.agenteListing!==myAgentId&&v.agenteAcquirente!==myAgentId))return false;const d=toD(v.dataAtto);return d>=oggiD&&d<=tra30;}).sort((a,b)=>a.dataAtto.localeCompare(b.dataAtto));
              const myAl=incarichi.filter(i=>!i.archiviato&&i.agenteListing===myAgentId).map(i=>({inc:i,al:getAlertFasi(pratiche,i.id)})).filter(x=>x.al.length>0);
              return(<div style={{marginTop:"1rem"}}>
                  {/* MIRINO agente */}
                  {(()=>{
                    const oggi9=todayStr();
                    const mirinoAg=Object.values(mirino).filter(m=>{
                      const inc=incarichi.find(i=>String(i.id)===String(m.incaricoId));
                      return inc&&!inc.archiviato&&Number(inc.agenteListing)===myAgentId;
                    }).sort((a,b)=>(b.dataInteresse||"").localeCompare(a.dataInteresse||""));
                    if(mirinoAg.length===0) return null;
                    const giorniDa=(d)=>{if(!d)return null;return Math.floor((new Date(oggi9)-new Date(d))/(1000*60*60*24));};
                    return(<div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",borderLeft:"4px solid #E74C3C",padding:"1rem",marginBottom:"1.25rem"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <span style={{fontSize:16}}>🎯</span>
                        <span style={{fontSize:13,fontWeight:700,color:"#E74C3C",textTransform:"uppercase",letterSpacing:".06em"}}>Immobili nel mirino</span>
                        <span style={{fontSize:11,background:"#FDECEC",color:"#E74C3C",padding:"1px 8px",borderRadius:10,fontWeight:600,marginLeft:"auto"}}>{mirinoAg.length}</span>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {mirinoAg.map(m=>{
                          const inc=incarichi.find(i=>String(i.id)===String(m.incaricoId))||{};
                          const giorni=giorniDa(m.dataInteresse);
                          const clrG=giorni===null?"#aaa":giorni>=7?"#E74C3C":giorni>=3?"#E67E22":"#27AE60";
                          const bgG=giorni===null?"#f5f5f5":giorni>=7?"#FDECEC":giorni>=3?"#FEF3E2":"#E1F5EE";
                          const prezzo=Number(inc.prezzoRichiesto||0);
                          const provvV=prezzo>0?Math.round(prezzo*(Number(provvStandard.percVend||3)/100)):0;
                          const provvA=prezzo>0?Math.round(prezzo*(Number(provvStandard.percAcq||4)/100)):0;
                          const followUpScad=m.followUp&&m.followUp<oggi9;
                          return(<div key={String(m.incaricoId)} style={{border:`0.5px solid ${giorni>=7?"#E74C3C44":giorni>=3?"#E67E2244":"#f0f0f0"}`,borderRadius:8,padding:"10px 12px",background:giorni>=7?"#FFFBF5":"#fff",borderLeft:`3px solid ${clrG}`}}>
                            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                              <div style={{flex:1}}>
                                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                                  <span style={{fontSize:13,fontWeight:600}}>{inc.comune||inc.indirizzo||"—"}{inc.indirizzo&&inc.comune?" — "+inc.indirizzo:""}</span>
                                  {giorni!==null&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:8,background:bgG,color:clrG,fontWeight:600}}>{giorni===0?"oggi":giorni===1?"ieri":giorni+" gg fa"}</span>}
                                </div>
                                <div style={{fontSize:11,color:"#888"}}>{inc.tipologia} · € {fmt(prezzo)}</div>
                                {m.note&&<div style={{fontSize:11,color:"#555",marginTop:4,fontStyle:"italic"}}>"{m.note}"</div>}
                                {m.followUp&&<div style={{fontSize:11,color:followUpScad?"#E74C3C":"#E67E22",marginTop:3,fontWeight:500}}>⏰ Follow-up: {fmtD(m.followUp)}{followUpScad?" — SCADUTO!":""}</div>}
                              </div>
                              {prezzo>0&&<div style={{textAlign:"right",flexShrink:0,paddingLeft:10,borderLeft:"0.5px solid #f0f0f0"}}>
                                <div style={{fontSize:10,color:"#aaa"}}>Provv. stimata</div>
                                <div style={{fontSize:16,fontWeight:700,color:"#0F6E56"}}>€ {fmt(provvV+provvA)}</div>
                                <div style={{fontSize:9,color:"#aaa"}}>V: €{fmt(provvV)} · A: €{fmt(provvA)}</div>
                              </div>}
                            </div>
                          </div>);
                        })}
                      </div>
                    </div>);
                  })()}
                {/* NUOVI INCARICHI SETTIMANA agente */}
                {(()=>{
                  const oggi8a=todayStr();
                  const da=new Date(oggi8a);
                  const day2=da.getDay()||7;
                  const lun2=new Date(da);lun2.setDate(da.getDate()-day2+1);
                  const sab2=new Date(lun2);sab2.setDate(lun2.getDate()+5);
                  const lunStr2=lun2.toISOString().slice(0,10);
                  const sabStr2=sab2.toISOString().slice(0,10);
                  const nuoviIncAg=incarichi.filter(i=>i.dataInizio>=lunStr2&&i.dataInizio<=sabStr2&&i.categoria==="vendita"&&!i.archiviato).sort((a,b)=>b.dataInizio?.localeCompare(a.dataInizio||"")||0);
                  if(nuoviIncAg.length===0) return null;
                  return(<div style={{background:"#fff",borderRadius:10,border:"1px solid #A8863A44",padding:"1rem",marginBottom:10,borderLeft:"4px solid #A8863A"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <span style={{fontSize:14}}>🏠</span>
                      <span style={{fontSize:12,fontWeight:700,color:"#633806",textTransform:"uppercase",letterSpacing:".06em"}}>Nuovi incarichi questa settimana</span>
                      <span style={{fontSize:11,background:"#FDF6EC",color:"#A8863A",padding:"1px 8px",borderRadius:10,fontWeight:600,marginLeft:"auto"}}>{nuoviIncAg.length}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {nuoviIncAg.map(inc=>{
                        const ag2=agenti.find(a=>a.id===Number(inc.agenteListing));
                        const agIdx2=agenti.findIndex(a=>a.id===Number(inc.agenteListing))%5;
                        const AVBG2=["#FAEEDA","#E6F1FB","#EEEDFE","#EAF3DE","#F1EFE8"];
                        const AVCL2=["#412402","#0C447C","#3C3489","#173404","#444441"];
                        return(<div key={inc.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,background:"#FFFBF0",border:"0.5px solid #f0e8d0"}}>
                          <div style={{width:30,height:30,borderRadius:"50%",background:AVBG2[agIdx2],display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:AVCL2[agIdx2],flexShrink:0}}>{ag2?.nome?.charAt(0)||"?"}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inc.comune||inc.indirizzo||"Indirizzo non specificato"}</div>
                            <div style={{fontSize:11,color:"#888"}}>{inc.tipologia||""}{inc.fonte?` · ${inc.fonte}`:""}</div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:"#A8863A"}}>{ag2?.nome||"—"}</div>
                            <div style={{fontSize:10,color:"#aaa"}}>{fmtD(inc.dataInizio)}</div>
                          </div>
                          {Number(inc.prezzoRichiesto)>0&&<div style={{textAlign:"right",flexShrink:0,borderLeft:"0.5px solid #f0e8d0",paddingLeft:10}}>
                            <div style={{fontSize:11,color:"#aaa"}}>Prezzo</div>
                            <div style={{fontSize:12,fontWeight:600,color:"#633806"}}>€ {fmt(Number(inc.prezzoRichiesto))}</div>
                          </div>}
                        </div>);
                      })}
                    </div>
                  </div>);
                })()}
                {/* Traguardo volante agente — sempre visibile */}
                <div style={{background:sfidaAtt?"linear-gradient(135deg,#FDF6EC,#FAEEDA)":"#fafaf8",borderRadius:10,border:`1px solid ${sfidaAtt?"#D4AC0D44":"#e8e5e0"}`,padding:"1rem",marginBottom:10}}>
                  {sfidaAtt?(()=>{
                    const cl=agenti.filter(a=>["Consulente","Collaboratore"].includes(a.profilo)&&a.id!==5).map(ag=>({ag,val:calcMet(ag.id,sfidaAtt.metrica,sfidaAtt.dal,sfidaAtt.al)})).sort((a,b)=>b.val-a.val);
                    const miaPos=cl.findIndex(x=>x.ag.id===myAgentId);
                    const mioVal=cl[miaPos]?.val||0;
                    const ggR=Math.max(0,Math.round((toD(sfidaAtt.al)-oggiD)/86400000));
                    return(<>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:6}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:"#D4AC0D",marginBottom:2}}>🏆 {sfidaAtt.nome}</div>
                          <div style={{fontSize:11,color:"#888"}}>{METRB_LABELS[sfidaAtt.metrica]||sfidaAtt.metrica} · 🎁 {sfidaAtt.premio}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:10,color:"#aaa"}}>Scade tra</div>
                          <div style={{fontSize:18,fontWeight:700,color:ggR<7?"#E74C3C":"#E67E22"}}>{ggR}gg</div>
                        </div>
                      </div>
                      {/* La mia posizione */}
                      <div style={{background:"#fff",borderRadius:8,padding:"10px",marginBottom:8,display:"flex",alignItems:"center",gap:12,border:"0.5px solid #f0f0f0"}}>
                        <div style={{fontSize:28}}>{PEMOJI[miaPos]||"—"}</div>
                        <div>
                          <div style={{fontSize:11,color:"#aaa"}}>La tua posizione</div>
                          <div style={{fontSize:20,fontWeight:700,color:PCLR[miaPos]||"#555"}}>{sfidaAtt.metrica==="fatturato"?`€ ${fmt(mioVal)}`:mioVal}</div>
                        </div>
                        <div style={{marginLeft:"auto",textAlign:"right"}}>
                          <div style={{fontSize:11,color:"#aaa"}}>Classifica</div>
                          <div style={{fontSize:16,fontWeight:700,color:PCLR[miaPos]||"#555"}}>{miaPos+1}° / {agenti.length}</div>
                        </div>
                      </div>
                      {/* Mini podio */}
                      {cl.slice(0,3).map(({ag,val},i)=>(<div key={ag.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,padding:"4px 8px",borderRadius:5,background:ag.id===myAgentId?"#FEF0E0":"transparent",border:ag.id===myAgentId?"0.5px solid #D4AC0D33":"none",marginBottom:2}}>
                        <span style={{fontWeight:ag.id===myAgentId?600:400}}>{PEMOJI[i]} {ag.nome} {ag.cognome||""}</span>
                        <span style={{fontWeight:600,color:PCLR[i]}}>{sfidaAtt.metrica==="fatturato"?`€ ${fmt(val)}`:val}</span>
                      </div>))}
                    </>);
                  })():(
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{fontSize:24}}>🏆</div>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:"#aaa"}}>Nessun traguardo volante attivo</div>
                        <div style={{fontSize:11,color:"#bbb"}}>Il broker ne creerà uno presto!</div>
                      </div>
                    </div>
                  )}
                </div>
                </div>);
            })()}
            {/* ── DASHBOARD BROKER ── */}
            {isBroker&&(<>
            {/* HEADER BROKER */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:"1.25rem",padding:"1rem 1.25rem",background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0"}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🏠</div>
                <div>
                  <p style={{fontSize:11,color:BRAND.oroD,margin:"0 0 2px",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>{isBackOffice?"Back Office":"Broker"}</p>
                  <h2 style={{margin:0,fontSize:18,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>Càsa Immobiliare Varese</h2>
                  <p style={{margin:"2px 0 0",fontSize:12,color:"#888"}}>La tua agenzia oggi · {new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
                </div>
              </div>
              <Sel value={dashAnno} onChange={setDashAnno}><option value="Tutti">Tutti gli anni</option>{[...new Set([annoCorrente,...anniVend])].sort().reverse().map(a=><option key={a}>{a}</option>)}</Sel>
            </div>

            {/* BARRA OBIETTIVO BREAK EVEN */}
            {(()=>{
              const annoBE = dashAnno==="Tutti" ? String(annoCorrente) : dashAnno;
              const obiettivoBE = Number((breakEvenManuale||{})[annoBE]||0);
              if(obiettivoBE<=0) return(
                <div style={{background:"#FDFBF7",border:`1px dashed ${BRAND.oro}66`,borderRadius:10,padding:"12px 16px",marginBottom:"1.25rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <span style={{fontSize:12,color:"#888"}}>💡 Imposta il tuo <strong>Punto di Break Even {annoBE}</strong> per vedere qui la barra di avanzamento verso la copertura dei costi.</span>
                  <button onClick={()=>setTab("Break Even")} style={{...S.btn,fontSize:11,padding:"5px 14px",borderColor:BRAND.oro,color:BRAND.oroD}}>Vai a Break Even →</button>
                </div>
              );
              // Progresso = quota agenzia incassata (criterio cassa: i soldi davvero entrati)
              const progressoInc = qAgenziaInc;
              const progressoTot = qAgenziaInc + qAgenziaRes;
              const percInc = Math.min(100, Math.round(progressoInc/obiettivoBE*100));
              const percTot = Math.min(100, Math.round(progressoTot/obiettivoBE*100));
              const raggiunto = progressoInc>=obiettivoBE;
              const mancano = Math.max(0, obiettivoBE-progressoInc);
              return(
                <div style={{background:"#fff",border:`1.5px solid ${raggiunto?"#27AE60":BRAND.oro}`,borderRadius:12,padding:"1.25rem 1.5rem",marginBottom:"1.25rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
                    <div>
                      <p style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:raggiunto?"#27AE60":BRAND.oroD,margin:"0 0 2px"}}>🎯 Obiettivo Break Even {annoBE}</p>
                      <p style={{margin:0,fontSize:13,color:"#888"}}>Quota agenzia necessaria per coprire i costi: <strong style={{color:BRAND.grigio}}>€ {fmt(obiettivoBE)}</strong></p>
                    </div>
                    <div style={{textAlign:"right"}}>
                      {raggiunto?<span style={{fontSize:14,fontWeight:700,color:"#27AE60"}}>✓ Break Even raggiunto!</span>
                        :<><span style={{fontSize:11,color:"#aaa"}}>Mancano</span><div style={{fontSize:18,fontWeight:700,color:"#E67E22"}}>€ {fmt(mancano)}</div></>}
                    </div>
                  </div>
                  {/* Barra di avanzamento a doppio livello */}
                  <div style={{position:"relative",height:24,background:"#f0ede6",borderRadius:12,overflow:"hidden"}}>
                    {/* Totale (incassato + da incassare) - più chiaro */}
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${percTot}%`,background:`${BRAND.oro}44`,transition:"width .5s"}}/>
                    {/* Incassato - pieno */}
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${percInc}%`,background:raggiunto?"#27AE60":BRAND.oro,transition:"width .5s",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:8}}>
                      {percInc>=15&&<span style={{fontSize:11,fontWeight:700,color:"#fff"}}>{percInc}%</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:8,flexWrap:"wrap",gap:8}}>
                    <span style={{fontSize:11,color:"#888"}}><span style={{display:"inline-block",width:10,height:10,borderRadius:2,background:raggiunto?"#27AE60":BRAND.oro,marginRight:4,verticalAlign:"middle"}}/>Incassato: <strong>€ {fmt(progressoInc)}</strong> ({percInc}%)</span>
                    <span style={{fontSize:11,color:"#888"}}><span style={{display:"inline-block",width:10,height:10,borderRadius:2,background:`${BRAND.oro}44`,marginRight:4,verticalAlign:"middle"}}/>Con da incassare: <strong>€ {fmt(progressoTot)}</strong> ({percTot}%)</span>
                  </div>
                </div>
              );
            })()}

            <div style={isMobile?{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:"1rem"}:S.g4}>
              <div style={S.card(STATI_INC.Attivo.clr)}><p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>Incarichi attivi</p><p style={{fontSize:28,fontWeight:600,margin:0,color:STATI_INC.Attivo.clr}}>{dashInc.filter(i=>statoInc(i)==="Attivo").length}</p></div>
              <div style={S.card(STATI_INC.Scaduto.clr)}><p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>Incarichi scaduti</p><p style={{fontSize:28,fontWeight:600,margin:0,color:STATI_INC.Scaduto.clr}}>{dashInc.filter(i=>statoInc(i)==="Scaduto").length}</p></div>
              <div style={S.card(STATI_INC.Venduto.clr)}>
                <p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>Transazioni totali</p>
                <p style={{fontSize:28,fontWeight:600,margin:0,color:STATI_INC.Venduto.clr}}>{
                  dashVend.filter(v=>Number(v.provvVenditore||0)>0&&!v.agenziaEsterna).length +
                  dashVend.filter(v=>Number(v.provvAcquirente||0)>0).length
                }</p>
                <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>
                  {dashVend.filter(v=>Number(v.provvVenditore||0)>0&&!v.agenziaEsterna).length}V · {dashVend.filter(v=>Number(v.provvAcquirente||0)>0).length}A
                </p>
              </div>
              <div style={S.card("#4A90D9")}>
                <p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>Incarichi acquisiti {annoCorrente}</p>
                <p style={{fontSize:28,fontWeight:600,margin:0,color:"#4A90D9"}}>{incarichi.filter(i=>i.categoria==="vendita"&&!i.archiviato&&getAnno(i.dataInizio)===annoCorrente).length}</p>
                <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>vendite anno corrente</p>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:"1.25rem"}}>
              <BloccoFin titolo="INCASSATO" colore="#27AE60" emoji="✅" totale={dashIncassato} qAgenzia={qAgenziaInc} qAgenti={qAgInc} qBuyer={qBuyInc}/>
              <BloccoFin titolo="DA INCASSARE" colore="#E67E22" emoji="⏳" totale={dashDaIncassare} qAgenzia={qAgenziaRes} qAgenti={qAgRes} qBuyer={qBuyRes}/>
              <BloccoFin titolo="TOTALE FATTURATO" colore={BRAND.oroD} emoji="💰" totale={dashIncassato+dashDaIncassare} qAgenzia={qAgenziaInc+qAgenziaRes} qAgenti={qAgInc+qAgRes} qBuyer={qBuyInc+qBuyRes}/>
            </div>

            {/* ANDAMENTO MENSILE FATTURATO */}
            {dashAnno!=="Tutti"&&(()=>{
              const MESI_LBL=["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
              // Provvigione agenzia totale (pV+pA) per mese dell'anno selezionato
              const perMese=Array(12).fill(0);
              venduti.filter(v=>v.categoria==="vendita"&&getAnno(dataCompAgenzia(v))===dashAnno).forEach(v=>{
                const m=getMese(dataCompAgenzia(v));
                if(!m) return;
                const idx=parseInt(m.split("-")[1],10)-1;
                if(idx<0||idx>11) return;
                perMese[idx]+=Number(v.provvVenditore||0)+Number(v.provvAcquirente||0);
              });
              const maxVal=Math.max(...perMese,1);
              const totAnno=perMese.reduce((s,x)=>s+x,0);
              const meseCorr=Number(dashAnno)===annoCorrente?new Date().getMonth():11;
              // Trimestri
              const trim=[0,1,2,3].map(t=>perMese.slice(t*3,t*3+3).reduce((s,x)=>s+x,0));
              if(totAnno===0) return null;
              return(
                <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1.25rem 1.5rem",marginBottom:"1.25rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
                    <p style={{margin:0,fontSize:13,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>📈 Andamento provvigione agenzia {dashAnno}</p>
                    <span style={{fontSize:12,color:"#888"}}>Totale: <strong style={{color:BRAND.oroD}}>€ {fmt(totAnno)}</strong></span>
                  </div>
                  {/* Barre mensili */}
                  <div style={{display:"flex",alignItems:"flex-end",gap:isMobile?2:6,height:120,marginBottom:8}}>
                    {perMese.map((val,i)=>{
                      const h=Math.round(val/maxVal*100);
                      const isFuturo=Number(dashAnno)===annoCorrente&&i>meseCorr;
                      return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:"100%"}}>
                        <div style={{fontSize:9,color:"#aaa",marginBottom:3,whiteSpace:"nowrap",opacity:val>0?1:0}}>{val>=1000?`${Math.round(val/1000)}k`:val>0?Math.round(val):""}</div>
                        <div title={`${MESI_LBL[i]}: € ${fmt(val)}`} style={{width:"100%",maxWidth:36,height:`${Math.max(h,val>0?4:0)}%`,minHeight:val>0?4:0,background:isFuturo?"#f0ede6":`linear-gradient(180deg,${BRAND.oro},${BRAND.oroD})`,borderRadius:"4px 4px 0 0",transition:"height .4s"}}/>
                      </div>);
                    })}
                  </div>
                  <div style={{display:"flex",gap:isMobile?2:6}}>
                    {MESI_LBL.map((m,i)=><div key={i} style={{flex:1,textAlign:"center",fontSize:9,color:Number(dashAnno)===annoCorrente&&i===meseCorr?BRAND.oroD:"#aaa",fontWeight:Number(dashAnno)===annoCorrente&&i===meseCorr?700:400}}>{m}</div>)}
                  </div>
                  {/* Riepilogo trimestri */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:14,paddingTop:12,borderTop:"0.5px solid #f0f0f0"}}>
                    {trim.map((val,i)=>(<div key={i} style={{textAlign:"center"}}>
                      <p style={{margin:"0 0 2px",fontSize:10,color:"#aaa",textTransform:"uppercase",letterSpacing:".04em"}}>{i+1}° Trim</p>
                      <p style={{margin:0,fontSize:14,fontWeight:700,color:val>0?BRAND.grigio:"#ccc",fontFamily:"Georgia,serif"}}>{val>0?`€ ${fmt(Math.round(val))}`:"—"}</p>
                    </div>))}
                  </div>
                </div>
              );
            })()}
            {/* SOSPESI */}
            {(()=>{
              const sospesi=venduti.filter(v=>{
                if(v.categoria!=="vendita") return false;
                return (Number(v.provvVenditore||0)-calcolaIncassatoV(v))>0||(Number(v.provvAcquirente||0)-calcolaIncassatoA(v))>0;
              });
              const righe=[];
              sospesi.forEach(v=>{
                const residuoV=Number(v.provvVenditore||0)-calcolaIncassatoV(v);
                const residuoA=Number(v.provvAcquirente||0)-calcolaIncassatoA(v);
                if(residuoV>0) righe.push({v,lato:"V",nominativo:v.nominativoVenditore,agente:nomAg(v.agenteListing),giaInc:calcolaIncassatoV(v),residuo:residuoV,scadenza:v.scadenzaIncasso});
                if(residuoA>0) righe.push({v,lato:"A",nominativo:v.nomeAcquirente,agente:nomAg(v.agenteAcquirente),giaInc:calcolaIncassatoA(v),residuo:residuoA,scadenza:v.scadenzaIncasso});
              });
              const totSospesi=righe.reduce((s,r)=>s+r.residuo,0);
              return(
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #E67E2244",overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#FEF0E0",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:showSospesi?"0.5px solid #E67E2233":"none",cursor:"pointer"}} onClick={()=>setShowSospesi(v=>!v)}>
                    <div><span style={{fontSize:13,fontWeight:600,color:"#E67E22"}}>🕐 SOSPESI DA INCASSARE — Provvigioni maturate, da riscuotere</span><p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Pratiche concluse con provvigioni ancora da incassare totalmente o parzialmente</p></div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:18,fontWeight:700,color:"#E67E22",whiteSpace:"nowrap"}}>{righe.length>0?`€ ${fmt(totSospesi)}`:"—"}</span>
                      <button style={{background:"none",border:`0.5px solid #E67E2266`,borderRadius:6,padding:"3px 10px",fontSize:12,cursor:"pointer",color:"#E67E22",whiteSpace:"nowrap"}}>{showSospesi?"▲ Chiudi":"▼ Vedi"}</button>
                    </div>
                  </div>
                  {showSospesi&&(righe.length>0?(
                    <div style={isMobile?{overflowX:"auto"}:{}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?600:"100%"}}>
                      <thead><tr>{["Lato","Agente","Nominativo","Immobile","Gia incassato","Residuo","Scadenza",""].map(h=><th key={h} style={S.thS}>{h}</th>)}</tr></thead>
                      <tbody>{righe.map((r,i)=>(
                        <tr key={i}>
                          <td style={S.tdS}><span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:r.lato==="V"?"#EAF4FB":"#F5EEF8",color:r.lato==="V"?"#2980B9":"#8E44AD",fontWeight:500}}>{r.lato==="V"?"Venditore":"Acquirente"}</span></td>
                          <td style={S.tdS}>{r.agente}</td>
                          <td style={{...S.tdS,fontWeight:500}}>{r.nominativo}</td>
                          <td style={S.tdS}>{r.v.comuneImmobile} — {r.v.indirizzoImmobile}</td>
                          <td style={{...S.tdRS,color:"#27AE60"}}>{r.giaInc>0?`€ ${fmt(r.giaInc)}`:"—"}</td>
                          <td style={{...S.tdRS,fontWeight:600,color:"#E67E22"}}>€ {fmt(r.residuo)}</td>
                          <td style={{...S.tdS,color:r.scadenza&&new Date(r.scadenza)<new Date()?"#E74C3C":"inherit"}}>{r.scadenza?fmtD(r.scadenza):"—"}</td>
                          <td style={S.tdS}><button style={{...S.btnP,fontSize:11,padding:"3px 10px",background:r.lato==="V"?"#2980B9":"#8E44AD",borderColor:r.lato==="V"?"#2980B9":"#8E44AD"}} onClick={()=>setShowIncassoLato({vend:r.v,lato:r.lato})}>Gestisci</button></td>
                        </tr>
                      ))}</tbody>
                      <tfoot><tr style={{background:BRAND.beige,fontWeight:500}}>
                        <td colSpan={4} style={S.tdS}>Totale ({righe.length} {righe.length===1?"voce":"voci"})</td>
                        <td style={{...S.tdRS,color:"#27AE60"}}>€ {fmt(righe.reduce((s,r)=>s+r.giaInc,0))}</td>
                        <td style={{...S.tdRS,color:"#E67E22"}}>€ {fmt(totSospesi)}</td>
                        <td colSpan={2} style={S.tdS}/>
                      </tr></tfoot>
                    </table>
                  </div>):<div style={{padding:"1rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna provvigione in sospeso</div>)}
                </div>
              );
            })()}
            {/* IN ATTESA / CONTROPROPOSTA */}
            {(()=>{
              const propAttesa=proposte.filter(p=>["In attesa","In attesa / Vincolata","Controproposta"].includes(p.stato)&&p.categoria==="vendita"&&(dashAnno==="Tutti"||getAnno(p.dataStato)===dashAnno));
              const totAttesa=propAttesa.reduce((s,p)=>s+Number(p.provvVenditore||0)+Number(p.provvAcquirente||0),0);
              return(
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #4A90D955",overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#E8F1FB",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:showAttesa?"0.5px solid #4A90D933":"none",cursor:"pointer"}} onClick={()=>setShowAttesa(v=>!v)}>
                    <div><span style={{fontSize:13,fontWeight:600,color:"#2980B9"}}>🔵 IN ATTESA / CONTROPROPOSTA — Proposte attive in corso di trattativa</span><p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Provvigioni potenziali su proposte ancora aperte</p></div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:18,fontWeight:700,color:"#2980B9",whiteSpace:"nowrap"}}>{propAttesa.length>0?`€ ${fmt(totAttesa)}`:"—"}</span>
                      <button style={{background:"none",border:`0.5px solid #4A90D966`,borderRadius:6,padding:"3px 10px",fontSize:12,cursor:"pointer",color:"#2980B9",whiteSpace:"nowrap"}}>{showAttesa?"▲ Chiudi":`▼ Vedi (${propAttesa.length})`}</button>
                    </div>
                  </div>
                  {showAttesa&&(propAttesa.length>0?(
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr>{["Stato","Venditore","Acquirente","Immobile","Prezzo offerto","Provv. prevista","Agente Acq.",""].map(h=><th key={h} style={S.thS}>{h}</th>)}</tr></thead>
                      <tbody>{propAttesa.map(p=>{
                        const cfg=STATI_PROP[p.stato]||STATI_PROP["In attesa"];
                        return(<tr key={p.id}>
                          <td style={S.tdS}><span style={bdg(cfg)}>{cfg.s} {cfg.label}</span></td>
                          <td style={{...S.tdS,fontWeight:500}}>{p.nominativoVenditore}</td>
                          <td style={S.tdS}>{p.nomeAcquirente}</td>
                          <td style={S.tdS}>{p.comuneImmobile} — {p.indirizzoImmobile}</td>
                          <td style={{...S.tdRS,fontWeight:500}}>€ {fmtN(p.prezzoOfferto)}</td>
                          <td style={{...S.tdRS,fontWeight:600,color:"#2980B9"}}>€ {fmt(Number(p.provvVenditore||0)+Number(p.provvAcquirente||0))}</td>
                          <td style={S.tdS}>{nomAg(p.agenteAcquirente)}</td>
                          <td style={S.tdS}><button style={{...S.btnP,fontSize:11,padding:"3px 10px",background:"#2980B9",borderColor:"#2980B9"}} onClick={()=>{setFormStatoProp({stato:p.stato,noteStato:"",contropropostaPrezzo:"",esitoVincolo:"",tipoNegazione:"",rispostaAcquirente:"",dataAccettazione:p.dataAccettazione||"",dataEsitoVincolo:""});setShowGestProp(p);setTab("Proposte");}}>Gestisci</button></td>
                        </tr>);
                      })}</tbody>
                      <tfoot><tr style={{background:BRAND.beige,fontWeight:500}}>
                        <td colSpan={5} style={S.tdS}>Totale ({propAttesa.length} {propAttesa.length===1?"proposta":"proposte"})</td>
                        <td style={{...S.tdRS,color:"#2980B9"}}>€ {fmt(totAttesa)}</td>
                        <td colSpan={2} style={S.tdS}/>
                      </tr></tfoot>
                    </table>
                  ):<div style={{padding:"1rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna proposta in attesa</div>)}
                </div>
              );
            })()}

            {/* VINCOLATE */}
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #D4AC0D55",overflow:"hidden",marginBottom:"1.25rem"}}>
              <div style={{background:"#FEF9E7",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:showVincolate?"0.5px solid #D4AC0D44":"none",cursor:"pointer"}} onClick={()=>setShowVincolate(v=>!v)}>
                <div><span style={{fontSize:13,fontWeight:600,color:"#D4AC0D"}}>Vincolate — Proposte accettate con vincolo in attesa di esito</span><p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Provvigioni previste ma non certe: dipendono dall'esito del vincolo</p></div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:18,fontWeight:700,color:"#D4AC0D",whiteSpace:"nowrap"}}>{propVincolo.length>0?`€ ${fmt(dashSospeso)}`:"—"}</span>
                  <button style={{background:"none",border:`0.5px solid #D4AC0D66`,borderRadius:6,padding:"3px 10px",fontSize:12,cursor:"pointer",color:"#A8863A",whiteSpace:"nowrap"}}>{showVincolate?"▲ Chiudi":`▼ Vedi (${propVincolo.length})`}</button>
                </div>
              </div>
              {showVincolate&&(propVincolo.length>0?(
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Venditore","Acquirente","Immobile","Vincolo","Scadenza vincolo","Provv. prevista",""].map(h=><th key={h} style={S.thS}>{h}</th>)}</tr></thead>
                  <tbody>{propVincolo.map(p=>(
                    <tr key={p.id}>
                      <td style={{...S.tdS,fontWeight:500}}>{p.nominativoVenditore}</td>
                      <td style={S.tdS}>{p.nomeAcquirente}</td>
                      <td style={S.tdS}>{p.comuneImmobile} — {p.indirizzoImmobile}</td>
                      <td style={S.tdS}><span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:"#FEF9E7",color:"#A8863A",fontWeight:500,border:"0.5px solid #D4AC0D44"}}>{p.tipoVincolo||"Generico"}</span></td>
                      <td style={{...S.tdS,color:p.termineSubordine&&new Date(p.termineSubordine)<new Date()?"#E74C3C":"inherit"}}>{p.termineSubordine?fmtD(p.termineSubordine):"—"}</td>
                      <td style={{...S.tdRS,fontWeight:600,color:"#D4AC0D"}}>€ {fmt(Number(p.provvVenditore||0)+Number(p.provvAcquirente||0))}</td>
                      <td style={S.tdS}><button style={{...S.btnP,fontSize:11,padding:"3px 10px",background:"#D4AC0D",borderColor:"#D4AC0D"}} onClick={()=>{setFormStatoProp({stato:p.stato,noteStato:"",esitoVincolo:"",tipoNegazione:"",dataAccettazione:p.dataAccettazione||"",dataEsitoVincolo:""});setShowGestProp(p);}}>Gestisci</button></td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{background:BRAND.beige,fontWeight:500}}>
                    <td colSpan={5} style={S.tdS}>Totale vincolate ({propVincolo.length})</td>
                    <td style={{...S.tdRS,color:"#D4AC0D"}}>€ {fmt(dashSospeso)}</td>
                    <td style={{...S.tdRS,color:"#27AE60",fontSize:11}}>Quota ag.: € {fmt(dashSospesoQuotaAg)}</td>
                  </tr></tfoot>
                </table>
              ):<div style={{padding:"1rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna proposta vincolata</div>)}
            </div>
            {(isBroker||isBackOffice)&&(()=>{
              const oggiD=new Date();oggiD.setHours(0,0,0,0);
              const tra30=new Date(oggiD);tra30.setDate(tra30.getDate()+30);
              const toD=s=>{const d=new Date(s);d.setHours(0,0,0,0);return d;};
              const prossimiR=venduti.filter(v=>{if(!v.dataAtto)return false;const d=toD(v.dataAtto);return d>=oggiD&&d<=tra30;}).sort((a,b)=>a.dataAtto.localeCompare(b.dataAtto));
              const alertP=incarichi.filter(i=>!i.archiviato&&statoInc(i)!=="Venduto").map(i=>({inc:i,al:getAlertFasi(pratiche,i.id)})).filter(x=>x.al.length>0);
              const sfidaAttBr=sfide.find(s=>s.dal<=todayStr()&&s.al>=todayStr()&&!s.conclusa);
              // METRB_LABELS defined at module level
              const PCLRB=["#D4AC0D","#888","#CD7F32","#555"];
              const PEMOJIB=["🥇","🥈","🥉","4°"];
              const calcMB=(agId,metr,d1,d2)=>{
                const incP=incarichi.filter(i=>i.agenteListing===agId&&i.dataInizio>=d1&&i.dataInizio<=d2);
                const vendP=venduti.filter(v=>{const dc=dataCompAgenzia(v);return(v.agenteListing===agId||v.agenteAcquirente===agId)&&dc>=d1&&dc<=d2;});
                const gg=Object.entries(operativita[agId]||{}).filter(([d])=>d>=d1&&d<=d2);
                const ch=gg.reduce((s,[,g])=>{const ct=g.chiamate_tipi||{};return s+Object.values(ct).reduce((a,v)=>a+Number(v||0),0);},0);
                switch(metr){case "acquisizioni":return incP.length;case "fatturato":return vendP.reduce((s,v)=>s+Number(v.provvVenditore||0)+Number(v.provvAcquirente||0),0);case "chiamate":return ch;default:return 0;}
              };
              return(<div style={{marginTop:"1rem"}}>
              {/* Traguardo volante — sempre visibile */}
              <div style={{background:sfidaAttBr?"linear-gradient(135deg,#FDF6EC,#FAEEDA)":"#fafaf8",borderRadius:10,border:`1px solid ${sfidaAttBr?"#D4AC0D44":"#e8e5e0"}`,padding:"1rem",marginBottom:10}}>
                {sfidaAttBr?(()=>{
                  const cl=agenti.filter(a=>["Consulente","Collaboratore"].includes(a.profilo)&&a.id!==5).map(ag=>({ag,val:calcMB(ag.id,sfidaAttBr.metrica,sfidaAttBr.dal,sfidaAttBr.al)})).sort((a,b)=>b.val-a.val);
                  const ggR=Math.max(0,Math.round((toD(sfidaAttBr.al)-oggiD)/86400000));
                  return(<>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:6}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#D4AC0D",marginBottom:2}}>🏆 Traguardo volante attivo: {sfidaAttBr.nome}</div>
                        <div style={{fontSize:11,color:"#888"}}>{METRB_LABELS[sfidaAttBr.metrica]||sfidaAttBr.metrica} · {fmtD(sfidaAttBr.dal)} → {fmtD(sfidaAttBr.al)} · 🎁 {sfidaAttBr.premio}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:10,color:"#aaa"}}>Scade tra</div>
                        <div style={{fontSize:20,fontWeight:700,color:ggR<7?"#E74C3C":"#E67E22"}}>{ggR} gg</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(agenti.length,4)},1fr)`,gap:6}}>
                      {cl.slice(0,4).map(({ag,val},i)=>(<div key={ag.id} style={{background:i===0?"#fff":"#fafaf8",borderRadius:8,padding:"8px",textAlign:"center",border:i===0?"1px solid #D4AC0D":"0.5px solid #eee"}}>
                        <div style={{fontSize:16}}>{PEMOJIB[i]}</div>
                        <div style={{fontSize:11,fontWeight:500,marginTop:2}}>{ag.nome} {ag.cognome||""}</div>
                        <div style={{fontSize:14,fontWeight:700,color:PCLRB[i]}}>{sfidaAttBr.metrica==="fatturato"?`€ ${fmt(val)}`:val}</div>
                      </div>))}
                    </div>
                  </>);
                })():(
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"#aaa",marginBottom:2}}>🏆 Nessun traguardo volante attivo</div>
                      <div style={{fontSize:11,color:"#bbb"}}>Vai in War Room per crearne uno e motivare il team</div>
                    </div>
                    <button style={{...S.btn,fontSize:11,padding:"5px 14px",borderColor:"#D4AC0D",color:"#A8863A"}} onClick={()=>setTab("War Room")}>+ Crea traguardo</button>
                  </div>
                )}
              </div>
              {/* MIRINO — visibile in alto per tutti */}
              {(()=>{
                const oggi9=todayStr();
                const mirinoList=Object.values(mirino).filter(m=>{
                  const inc=incarichi.find(i=>i.id===m.incaricoId);
                  if(!inc||inc.archiviato) return false;
                  if(!isBroker&&!isBackOffice&&Number(inc.agenteListing)!==myAgentId) return false;
                  return true;
                }).sort((a,b)=>(b.dataInteresse||"").localeCompare(a.dataInteresse||""));
                if(mirinoList.length===0) return null;
                const sCard4={background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"12px 14px"};
                const sLbl4={fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 4px"};
                const giorniDa=(d)=>{if(!d)return null;const diff=Math.floor((new Date(oggi9)-new Date(d))/(1000*60*60*24));return diff;};
                return(<div style={{...sCard4,borderLeft:"4px solid #E74C3C",marginBottom:"1.5rem"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <span style={{fontSize:16}}>🎯</span>
                    <span style={{fontSize:13,fontWeight:700,color:"#E74C3C",textTransform:"uppercase",letterSpacing:".06em"}}>Immobili nel mirino</span>
                    <span style={{fontSize:11,background:"#FDECEC",color:"#E74C3C",padding:"1px 8px",borderRadius:10,fontWeight:600,marginLeft:"auto"}}>{mirinoList.length}</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {mirinoList.map(m=>{
                      const inc=incarichi.find(i=>i.id===m.incaricoId)||{};
                      const ag=agenti.find(a=>a.id===Number(inc.agenteListing));
                      const giorni=giorniDa(m.dataInteresse);
                      const clrG=giorni===null?'#aaa':giorni>=7?'#E74C3C':giorni>=3?'#E67E22':'#27AE60';
                      const bgG=giorni===null?'#f5f5f5':giorni>=7?'#FDECEC':giorni>=3?'#FEF3E2':'#E1F5EE';
                      const prezzo=Number(inc.prezzoRichiesto||0);
                      const provvV=prezzo>0?Math.round(prezzo*(Number(provvStandard.percVend||3)/100)):0;
                      const provvA=prezzo>0?Math.round(prezzo*(Number(provvStandard.percAcq||4)/100)):0;
                      const followUpScad=m.followUp&&m.followUp<oggi9;
                      return(<div key={m.incaricoId} style={{border:`0.5px solid ${giorni>=7?'#E74C3C44':giorni>=3?'#E67E2244':'#f0f0f0'}`,borderRadius:8,padding:"10px 12px",background:giorni>=7?'#FFFBF5':'#fff',borderLeft:`3px solid ${clrG}`}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                              <span style={{fontSize:13,fontWeight:600}}>{inc.comune||inc.indirizzo||"—"}{inc.indirizzo&&inc.comune?" — "+inc.indirizzo:""}</span>
                              {giorni!==null&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:8,background:bgG,color:clrG,fontWeight:600}}>{giorni===0?"oggi":giorni===1?"ieri":giorni+" gg fa"}</span>}
                            </div>
                            <div style={{fontSize:11,color:"#888"}}>{inc.tipologia} · {inc.categoria} · <span style={{color:"#A8863A",fontWeight:500}}>{ag?.nome||""} {ag?.cognome||""}</span></div>
                            {m.note&&<div style={{fontSize:11,color:"#555",marginTop:4,fontStyle:"italic"}}>"{m.note}"</div>}
                            {m.followUp&&<div style={{fontSize:11,color:followUpScad?"#E74C3C":"#E67E22",marginTop:3,fontWeight:500}}>⏰ Follow-up: {fmtD(m.followUp)}{followUpScad?" — SCADUTO!":""}</div>}
                          </div>
                          {prezzo>0&&<div style={{textAlign:"right",flexShrink:0,paddingLeft:10,borderLeft:"0.5px solid #f0f0f0"}}>
                            <div style={{fontSize:10,color:"#aaa"}}>Provv. stimata</div>
                            <div style={{fontSize:16,fontWeight:700,color:"#0F6E56"}}>€ {fmt(provvV+provvA)}</div>
                            <div style={{fontSize:9,color:"#aaa"}}>V: €{fmt(provvV)} · A: €{fmt(provvA)}</div>
                          </div>}
                        </div>
                      </div>);
                    })}
                  </div>
                </div>);
              })()}

              {/* NUOVI INCARICHI SETTIMANA */}
              {(()=>{
                const oggi8=todayStr();
                const d=new Date(oggi8);
                const day=d.getDay()||7;
                const lun=new Date(d);lun.setDate(d.getDate()-day+1);
                const sab=new Date(lun);sab.setDate(lun.getDate()+5);
                const lunStr=lun.toISOString().slice(0,10);
                const sabStr=sab.toISOString().slice(0,10);
                const nuoviInc=incarichi.filter(i=>i.dataInizio>=lunStr&&i.dataInizio<=sabStr&&i.categoria==="vendita"&&!i.archiviato).sort((a,b)=>b.dataInizio?.localeCompare(a.dataInizio||"")||0);
                if(nuoviInc.length===0) return null;
                return(<div style={{background:"#fff",borderRadius:10,border:"1px solid #A8863A44",padding:"1rem",marginBottom:"1rem",borderLeft:"4px solid #A8863A"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <span style={{fontSize:14}}>🏠</span>
                    <span style={{fontSize:12,fontWeight:700,color:"#633806",textTransform:"uppercase",letterSpacing:".06em"}}>Nuovi incarichi questa settimana</span>
                    <span style={{fontSize:11,background:"#FDF6EC",color:"#A8863A",padding:"1px 8px",borderRadius:10,fontWeight:600,marginLeft:"auto"}}>{nuoviInc.length} {nuoviInc.length===1?"incarico":"incarichi"}</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {nuoviInc.map(inc=>{
                      const ag=agenti.find(a=>a.id===Number(inc.agenteListing));
                      const AVBG=["#FAEEDA","#E6F1FB","#EEEDFE","#EAF3DE","#F1EFE8"];
                      const AVCL=["#412402","#0C447C","#3C3489","#173404","#444441"];
                      const agIdx=agenti.findIndex(a=>a.id===Number(inc.agenteListing))%5;
                      return(<div key={inc.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,background:"#FFFBF0",border:"0.5px solid #f0e8d0"}}>
                        <div style={{width:30,height:30,borderRadius:"50%",background:AVBG[agIdx],display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:AVCL[agIdx],flexShrink:0}}>
                          {ag?.nome?.charAt(0)||"?"}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inc.comune||inc.indirizzo||"Indirizzo non specificato"}</div>
                          <div style={{fontSize:11,color:"#888"}}>{inc.indirizzo&&inc.comune?inc.indirizzo+" — ":""}{inc.tipologia||""}{inc.fonte?` · ${inc.fonte}`:""}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:"#A8863A"}}>{ag?.nome||"—"} {ag?.cognome||""}</div>
                          <div style={{fontSize:10,color:"#aaa"}}>{fmtD(inc.dataInizio)}</div>
                        </div>
                        {Number(inc.prezzoRichiesto)>0&&<div style={{textAlign:"right",flexShrink:0,borderLeft:"0.5px solid #f0e8d0",paddingLeft:10}}>
                          <div style={{fontSize:11,color:"#aaa"}}>Prezzo</div>
                          <div style={{fontSize:12,fontWeight:600,color:"#633806"}}>€ {fmt(Number(inc.prezzoRichiesto))}</div>
                        </div>}
                      </div>);
                    })}
                  </div>
                </div>);
              })()}
              {/* Prossimi rogiti + Alert pratiche: solo per Back Office (Erica), non per il Broker */}
              {isBackOffice&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
                <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                  <p style={{fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".08em",margin:"0 0 10px"}}>📅 Prossimi rogiti — 30 giorni</p>
                  {prossimiR.length===0?<p style={{fontSize:12,color:"#bbb",textAlign:"center"}}>Nessun rogito nei prossimi 30 giorni</p>
                  :prossimiR.map(v=>{const gg=Math.round((toD(v.dataAtto)-oggiD)/86400000);const ag=agenti.find(a=>a.id===v.agenteListing);return(<div key={v.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"0.5px solid #f5f5f5",gap:4}}>
                    <div><div style={{fontSize:12,fontWeight:500}}>{v.comuneImmobile} — {v.indirizzoImmobile}</div><div style={{fontSize:11,color:"#888"}}>{v.nominativoVenditore} · {ag?.nome||"—"}</div></div>
                    <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:12,fontWeight:600,color:gg<=7?"#E74C3C":gg<=15?"#E67E22":"#27AE60"}}>{gg===0?"Oggi!":gg===1?"Domani":gg+" gg"}</div><div style={{fontSize:10,color:"#aaa"}}>{fmtD(v.dataAtto)}</div></div>
                  </div>);})}
                </div>
                <div style={{background:"#fff",borderRadius:10,border:`0.5px solid ${alertP.length>0?"#E74C3C44":"#e8e5e0"}`,padding:"1rem"}}>
                  <p style={{fontSize:11,fontWeight:600,color:alertP.length>0?"#E74C3C":"#888",textTransform:"uppercase",letterSpacing:".08em",margin:"0 0 10px"}}>{alertP.length>0?"⚠ Alert pratiche RT":"✅ Pratiche RT"}{alertP.length>0&&<span style={{marginLeft:6,padding:"1px 6px",borderRadius:3,background:"#FDECEA",color:"#E74C3C",fontSize:10}}>{alertP.length}</span>}</p>
                  {alertP.length===0?<p style={{fontSize:12,color:"#bbb",textAlign:"center"}}>Tutto in regola</p>
                  :alertP.slice(0,4).map(({inc,al})=>(<div key={inc.id} style={{padding:"7px 0",borderBottom:"0.5px solid #f5f5f5"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:12,fontWeight:500}}>{inc.comune} — {inc.indirizzo}</span><span style={{fontSize:10,padding:"1px 6px",borderRadius:3,background:"#FDECEA",color:"#E74C3C",fontWeight:600}}>{al.length}</span></div>
                    <div style={{fontSize:11,color:"#E74C3C"}}>{al[0].lbl}{al.length>1?` +${al.length-1}`:""}</div>
                  </div>))}
                </div>
              </div>}</div>);
            })()}
            </>)}

            {/* ── DASHBOARD BACK OFFICE (ERICA) ── */}
            {isBackOffice&&(()=>{
              const oggiBO=new Date();oggiBO.setHours(0,0,0,0);
              const tra30BO=new Date(oggiBO);tra30BO.setDate(tra30BO.getDate()+30);
              const toDBO=s=>{const d=new Date(s);d.setHours(0,0,0,0);return d;};
              const fasiBO=fasiConfig||FASI;

              // === Frase del giorno (stessa funzione usata in Oggi, coerente per tutti) ===
              const fraseOggi=getFraseDelGiorno();

              // === NUOVI INCARICHI da impostare (inseriti ma senza nessuna azione completata) ===
              const getPrBO=incId=>{
                const pr=Array.isArray(pratiche)?pratiche.find(p=>p.incaricoId===incId):pratiche[incId];
                return pr||{fasi:{}};
              };
              const nessunaAzioneFatta=incId=>{
                const pr=getPrBO(incId);
                if(!pr.fasi) return true;
                return !Object.values(pr.fasi).some(faseObj=>Object.values(faseObj||{}).some(a=>a.fatto));
              };
              const nuoviIncBO=incarichi.filter(i=>i.categoria==="vendita"&&!i.archiviato&&statoInc(i)!=="Venduto"&&nessunaAzioneFatta(i.id))
                .sort((a,b)=>(b.dataInizio||"").localeCompare(a.dataInizio||""));

              // === LE MIE ATTIVITÀ SULLE PRATICHE ===
              // Logica: mostro solo le azioni della FASE CORRENTE di ogni pratica + arretrati a scadenza LEGALE
              // (Regold, antiriciclaggio) di fasi precedenti non completate (hanno conseguenze fiscali).
              // Fase corrente = ultima fase con almeno un'azione completata (o la prima se nulla è stato fatto).
              const faseCorrenteBO=(incId)=>{
                const pr=getPrBO(incId);
                let lastIdx=0;
                fasiBO.forEach((f,idx)=>{
                  if(Object.values(pr.fasi?.[f.k]||{}).some(a=>a.fatto)) lastIdx=idx;
                });
                return lastIdx;
              };
              // Keyword che identificano azioni a scadenza legale/fiscale (arretrati da non perdere mai)
              const isScadenzaLegale=(lbl)=>{
                const l=(lbl||"").toLowerCase();
                return l.includes("regold")||l.includes("registrazione")||l.includes("antiriciclaggio")||l.includes("antiricic");
              };
              const attivitaErica=[];
              incarichi.filter(i=>i.categoria==="vendita"&&!i.archiviato&&statoInc(i)!=="Venduto").forEach(inc=>{
                const pr=getPrBO(inc.id);
                const fcIdx=faseCorrenteBO(inc.id);
                fasiBO.forEach((fase,fIdx)=>{
                  (fase.azioni||[]).forEach(az=>{
                    if(az.ruolo!=="erica"&&az.ruolo!=="entrambi") return;
                    const fatto=pr.fasi?.[fase.k]?.[az.k]?.fatto;
                    if(fatto) return;
                    const inFaseCorrente = fIdx===fcIdx;
                    const arretratoLegale = fIdx<fcIdx && isScadenzaLegale(az.lbl);
                    // Mostro solo: azioni della fase corrente OPPURE arretrati a scadenza legale di fasi superate
                    if(!inFaseCorrente && !arretratoLegale) return;
                    attivitaErica.push({inc, fase, az, alert:!!az.alert, arretrato:arretratoLegale});
                  });
                });
              });
              // Ordino: prima gli arretrati legali (più gravi), poi le alert, poi il resto
              attivitaErica.sort((a,b)=>{
                if(a.arretrato!==b.arretrato) return a.arretrato?-1:1;
                return (b.alert?1:0)-(a.alert?1:0);
              });
              const attivitaUrgenti=attivitaErica.filter(a=>a.alert||a.arretrato);

              // === ROGITI IN ARRIVO 30gg ===
              const prossimiRBO=venduti.filter(v=>{if(!v.dataAtto)return false;const d=toDBO(v.dataAtto);return d>=oggiBO&&d<=tra30BO;}).sort((a,b)=>a.dataAtto.localeCompare(b.dataAtto));

              // === PAGAMENTI: clienti→agenzia da incassare ===
              const incassiDaSeguire=venduti.filter(v=>{
                if(v.categoria!=="vendita") return false;
                return (Number(v.provvVenditore||0)-calcolaIncassatoV(v))>0||(Number(v.provvAcquirente||0)-calcolaIncassatoA(v))>0;
              });
              // === PROSPETTI agenti da gestire (non pagati) ===
              const prospettiDaGestire=prospetti.filter(p=>p.statoFlow!=="pagato"&&p.statoFlow!=="annullato");

              // === TO-DO LIBERA ===
              const todoAttivi=ericaTodo.filter(t=>!t.fatto);
              const aggTodo=()=>{
                if(!ericaTodoInput.trim())return;
                setEricaTodo([...ericaTodo,{id:Date.now(),testo:ericaTodoInput.trim(),fatto:false,data:todayStr()}]);
                setEricaTodoInput("");
              };
              const toggleTodo=id=>setEricaTodo(ericaTodo.map(t=>t.id===id?{...t,fatto:!t.fatto}:t));
              const delTodo=id=>setEricaTodo(ericaTodo.filter(t=>t.id!==id));

              const cfgStatoPBO={
                "inviato":{lbl:"Da inviare",clr:"#0C447C",bg:"#E6F1FB"},
                "fatturato":{lbl:"Attesa fattura",clr:"#633806",bg:"#FAEEDA"},
              };

              return(<>
                {/* HEADER ERICA */}
                <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderLeft:`4px solid ${BRAND.oro}`,borderRadius:"0 12px 12px 0",padding:"1.25rem 1.5rem",marginBottom:"1.25rem"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:fraseOggi?10:0}}>
                    <div style={{width:52,height:52,borderRadius:"50%",background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#633806",flexShrink:0}}>E</div>
                    <div>
                      <h2 style={{margin:0,fontSize:18,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>Buongiorno {(agenti.find(a=>a.id===5)?.nome)||"Erica"}! ☀️</h2>
                      <p style={{margin:"2px 0 0",fontSize:13,color:"#888"}}>{new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · Il tuo lavoro tiene in ordine tutta l'agenzia</p>
                    </div>
                  </div>
                  {fraseOggi&&fraseOggi.t&&<div style={{background:"#FAEEDA",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#633806",fontStyle:"italic"}}>💬 "{fraseOggi.t}"{fraseOggi.a&&<span style={{fontStyle:"normal",opacity:0.7}}> — {fraseOggi.a}</span>}</div>}
                </div>

                {/* 4 CONTATORI (compatti) */}
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,marginBottom:"1rem"}}>
                  {[
                    {n:nuoviIncBO.length,l:"Nuovi incarichi",c:"#185FA5"},
                    {n:attivitaUrgenti.length,l:"Attività urgenti",c:"#A32D2D"},
                    {n:prossimiRBO.length,l:"Rogiti 30gg",c:"#BA7517"},
                    {n:incassiDaSeguire.length+prospettiDaGestire.length,l:"Pagamenti",c:"#0F6E56"},
                  ].map(({n,l,c})=>(
                    <div key={l} style={{background:"#fafaf8",borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:22,fontWeight:700,color:c,fontFamily:"Georgia,serif",lineHeight:1}}>{n}</span>
                      <span style={{fontSize:11.5,color:"#888",lineHeight:1.2}}>{l}</span>
                    </div>
                  ))}
                </div>

                {/* LE MIE ATTIVITÀ SULLE PRATICHE */}
                <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1rem"}}>
                  <div style={{background:"#EEEDFE",padding:"9px 16px",borderBottom:"0.5px solid #e8e5e0"}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#3C3489"}}>✅ Le mie attività sulle pratiche</span>
                    <p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>Solo la fase attuale di ogni pratica · scadenze legali arretrate in cima · spunti in Gestione Pratiche</p>
                  </div>
                  {attivitaErica.length===0?<div style={{padding:"1.5rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna attività in sospeso. Ottimo lavoro! ✨</div>:
                  attivitaErica.slice(0,12).map((a,i)=>(
                    <div key={`${a.inc.id}_${a.fase.k}_${a.az.k}`} onClick={()=>{setTab("Gestione Pratiche");}} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 16px",borderBottom:"0.5px solid #f0f0f0",cursor:"pointer",background:a.arretrato?"#FBEAEA":a.alert?"#FCF4E6":"#fff"}}>
                      <span style={{fontSize:13,flexShrink:0}}>{a.arretrato?"🔴":a.alert?"⚠️":"○"}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12.5,fontWeight:a.arretrato||a.alert?600:400}}>{a.az.lbl}{a.arretrato&&<span style={{marginLeft:6,fontSize:9,padding:"1px 6px",borderRadius:3,background:"#A32D2D",color:"#fff",fontWeight:700,textTransform:"uppercase",letterSpacing:".03em"}}>Scadenza legale</span>}</div>
                        <div style={{fontSize:11,color:"#888"}}>{a.inc.comune} — {a.inc.indirizzo} · {a.fase.timing}</div>
                      </div>
                      <span style={{fontSize:11,color:"#3C3489",whiteSpace:"nowrap"}}>Apri →</span>
                    </div>
                  ))}
                  {attivitaErica.length>12&&<div style={{padding:"8px 16px",fontSize:11,color:"#888",textAlign:"center"}}>+ altre {attivitaErica.length-12} attività in Gestione Pratiche</div>}
                </div>

                {/* TO-DO LIBERA */}
                <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1rem"}}>
                  <div style={{background:"#E1F5EE",padding:"10px 16px",borderBottom:"0.5px solid #e8e5e0"}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#0F6E56"}}>📝 Le mie cose da fare</span>
                    <p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>Attività generiche che gestisci tu (newsletter, ordini, ecc.)</p>
                  </div>
                  <div style={{padding:"10px 16px"}}>
                    {ericaTodo.length===0&&<p style={{fontSize:12,color:"#bbb",textAlign:"center",margin:"8px 0"}}>Nessuna attività. Aggiungine una qui sotto.</p>}
                    {ericaTodo.map(t=>(
                      <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"0.5px solid #f0f0f0"}}>
                        <span onClick={()=>toggleTodo(t.id)} style={{fontSize:16,cursor:"pointer",color:t.fatto?"#0F6E56":"#B4B2A9",flexShrink:0}}>{t.fatto?"☑":"☐"}</span>
                        <span style={{flex:1,fontSize:13,color:t.fatto?"#bbb":BRAND.grigio,textDecoration:t.fatto?"line-through":"none"}}>{t.testo}</span>
                        <button onClick={()=>delTodo(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:14,padding:"2px 6px"}} title="Elimina">×</button>
                      </div>
                    ))}
                    <div style={{display:"flex",gap:8,paddingTop:10}}>
                      <input type="text" value={ericaTodoInput} onChange={e=>setEricaTodoInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")aggTodo();}} placeholder="Aggiungi un'attività..." style={{...S.inp,flex:1,fontSize:13}}/>
                      <button onClick={aggTodo} style={{...S.btnP,fontSize:13,padding:"7px 14px"}}>+ Aggiungi</button>
                    </div>
                  </div>
                </div>

                {/* NUOVI INCARICHI DA IMPOSTARE (collassabile, chiuso di default) */}
                {nuoviIncBO.length>0&&<div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1rem"}}>
                  <div onClick={()=>setShowNuoviIncBO(v=>!v)} style={{background:"#E6F1FB",padding:"10px 16px",borderBottom:showNuoviIncBO?"0.5px solid #e8e5e0":"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
                    <div>
                      <span style={{fontSize:13,fontWeight:600,color:"#0C447C"}}>🗂 Nuovi incarichi da impostare</span>
                      <span style={{marginLeft:8,fontSize:11,padding:"1px 8px",borderRadius:10,background:"#0C447C",color:"#fff",fontWeight:700}}>{nuoviIncBO.length}</span>
                      <p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>Inseriti a sistema ma ancora senza pratica avviata</p>
                    </div>
                    <button style={{background:"none",border:"0.5px solid #0C447C44",borderRadius:6,padding:"3px 10px",fontSize:12,cursor:"pointer",color:"#0C447C",whiteSpace:"nowrap"}}>{showNuoviIncBO?"▲ Chiudi":"▼ Vedi"}</button>
                  </div>
                  {showNuoviIncBO&&nuoviIncBO.slice(0,10).map(inc=>(
                    <div key={inc.id} onClick={()=>{setTab("Gestione Pratiche");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 16px",borderBottom:"0.5px solid #f0f0f0",cursor:"pointer"}}>
                      <div><strong style={{fontSize:13}}>{inc.comune} — {inc.indirizzo}</strong><div style={{fontSize:11,color:"#888"}}>{inc.nominativo||"—"} · acquisito {fmtD(inc.dataInizio)}</div></div>
                      <span style={{fontSize:11,color:"#0C447C",whiteSpace:"nowrap"}}>Apri pratica →</span>
                    </div>
                  ))}
                  {showNuoviIncBO&&nuoviIncBO.length>10&&<div style={{padding:"8px 16px",fontSize:11,color:"#888",textAlign:"center"}}>+ altri {nuoviIncBO.length-10} in Gestione Pratiche</div>}
                </div>}

                {/* ROGITI + PAGAMENTI */}
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                  {/* Rogiti */}
                  <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                    <p style={{margin:"0 0 10px",fontSize:12,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em"}}>📅 Rogiti in arrivo — 30gg</p>
                    {prossimiRBO.length===0?<p style={{fontSize:12,color:"#bbb",textAlign:"center"}}>Nessun rogito nei prossimi 30 giorni</p>:
                    prossimiRBO.map(v=>{const gg=Math.round((toDBO(v.dataAtto)-oggiBO)/86400000);return(
                      <div key={v.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"0.5px solid #f5f5f5",gap:4}}>
                        <div><div style={{fontSize:12,fontWeight:500}}>{v.comuneImmobile} — {v.indirizzoImmobile}</div><div style={{fontSize:11,color:"#888"}}>{v.nominativoVenditore||"—"}</div></div>
                        <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:12,fontWeight:600,color:gg<=7?"#A32D2D":gg<=15?"#BA7517":"#0F6E56"}}>{gg===0?"Oggi!":gg===1?"Domani":gg+" gg"}</div><div style={{fontSize:10,color:"#aaa"}}>{fmtD(v.dataAtto)}</div></div>
                      </div>
                    );})}
                  </div>
                  {/* Pagamenti / prospetti */}
                  <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                    <p style={{margin:"0 0 10px",fontSize:12,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em"}}>💰 Pagamenti / prospetti</p>
                    {/* Prospetti da gestire */}
                    {prospettiDaGestire.length>0&&<div style={{marginBottom:incassiDaSeguire.length>0?10:0}}>
                      <p style={{margin:"0 0 4px",fontSize:10,color:"#aaa",textTransform:"uppercase"}}>Prospetti agenti</p>
                      {prospettiDaGestire.slice(0,4).map(p=>{
                        const ag=agenti.find(a=>a.id===p.agenteId);const cfg=cfgStatoPBO[p.statoFlow]||cfgStatoPBO["inviato"];
                        return(<div key={p.id} onClick={()=>{setFatAgente(String(p.agenteId));setTab("Fatture Agenti");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"0.5px solid #f5f5f5",cursor:"pointer",gap:4}}>
                          <span style={{fontSize:12}}>{p.numero} · {ag?.nome||"—"}</span>
                          <span style={{fontSize:10,padding:"1px 7px",borderRadius:4,background:cfg.bg,color:cfg.clr,fontWeight:600,whiteSpace:"nowrap"}}>{cfg.lbl}</span>
                        </div>);
                      })}
                    </div>}
                    {/* Incassi clienti */}
                    {incassiDaSeguire.length>0&&<div>
                      <p style={{margin:"0 0 4px",fontSize:10,color:"#aaa",textTransform:"uppercase"}}>Incassi clienti da seguire</p>
                      {incassiDaSeguire.slice(0,4).map(v=>{
                        const resV=Number(v.provvVenditore||0)-calcolaIncassatoV(v);
                        const resA=Number(v.provvAcquirente||0)-calcolaIncassatoA(v);
                        const res=Math.max(0,resV)+Math.max(0,resA);
                        return(<div key={v.id} onClick={()=>setTab("Venduti")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"0.5px solid #f5f5f5",cursor:"pointer",gap:4}}>
                          <span style={{fontSize:12}}>{v.comuneImmobile} — {v.indirizzoImmobile}</span>
                          <span style={{fontSize:11,fontWeight:600,color:"#BA7517",whiteSpace:"nowrap"}}>€ {fmt(Math.round(res))}</span>
                        </div>);
                      })}
                    </div>}
                    {prospettiDaGestire.length===0&&incassiDaSeguire.length===0&&<p style={{fontSize:12,color:"#bbb",textAlign:"center"}}>Tutto in regola ✓</p>}
                  </div>
                </div>
              </>);
            })()}
          </div>)}

          {/* INCARICHI */}
          {tab==="Incarichi"&&(<div style={S.sec}>
            <div style={S.pageHdr}>
              <SubTabs value={subInc} onChange={v=>{setSubInc(v);setFIncStato("Tutti");}} options={[{v:"vendita",l:"🏠 Vendite"},{v:"affitto",l:"🔑 Affitti"}]}/>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",color:BRAND.grigio}}>
                  <input type="checkbox" checked={mostraArchiviati} onChange={e=>setMostraArchiviati(e.target.checked)}/> Mostra archiviati
                </label>
                <button style={S.btnP} onClick={()=>{setFormInc(emptyInc(subInc));if(!isReadOnly)setShowInc("new");}}>+ Nuovo incarico</button>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
              {!canViewAll&&<div style={{display:"flex",background:"#f0f0f0",borderRadius:7,padding:3,gap:2}}>
                {[[false,"👤 I miei"],[true,"🏢 Tutti"]].map(([v,l])=>(
                  <button key={String(v)} onClick={()=>setIncVistaTutti(v)} style={{padding:"5px 12px",fontSize:11,borderRadius:5,border:"none",background:incVistaTutti===v?"#fff":"transparent",color:incVistaTutti===v?"#A8863A":"#888",fontWeight:incVistaTutti===v?600:400,cursor:"pointer",fontFamily:"inherit",boxShadow:incVistaTutti===v?"0 1px 3px rgba(0,0,0,.1)":"none"}}>{l}</button>
                ))}
              </div>}
              <FiltriInc/>
              <SearchBar value={searchIncarichi} onChange={setSearchIncarichi} placeholder="Cerca immobile, cliente, indirizzo..." nResults={incFiltrati.length}/>
            </div>
            <div style={S.cnt}>
              {[["Attivi",cntInc.attivi,STATI_INC.Attivo.clr],["Scaduti",cntInc.scaduti,STATI_INC.Scaduto.clr],[subInc==="affitto"?"Locati":"Venduti",cntInc.venduti,STATI_INC.Venduto.clr]].map(([l,n,c])=>(<div key={l} style={S.cntBox(c)}><span style={{fontSize:24,fontWeight:700,color:c}}>{n}</span><span style={{fontSize:12,color:"#aaa"}}>{l}</span></div>))}
              <div style={{...S.cntBox(BRAND.oroD),marginLeft:"auto",borderTop:`3px solid ${BRAND.oroD}`,borderLeft:"none",minWidth:110}}>
                <span style={{fontSize:22,fontWeight:700,color:BRAND.oroD}}>{incarichi.filter(i=>i.categoria===subInc&&!i.archiviato&&getAnno(i.dataInizio)===annoCorrente&&(isBroker||isBackOffice||!myAgentId||i.agenteListing===myAgentId)).length}</span>
                <span style={{fontSize:11,color:BRAND.oroD,fontWeight:500}}>Acquisiti {annoCorrente}</span>
                <span style={{fontSize:10,color:"#aaa"}}>{(isBroker||isBackOffice)?"totali agenzia":"tuoi anno corrente"}</span>
              </div>
            </div>
            <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,overflow:"auto",maxHeight:"70vh"}}>
            <table style={{width:"100%",borderCollapse:"separate",borderSpacing:0,fontSize:13}}>
              <thead>
                <tr style={{background:"#fafaf8",borderBottom:"1px solid #e8e5e0"}}>
                  <th style={{...S.th,minWidth:100,paddingLeft:12,position:"sticky",top:0,zIndex:2}}>Stato</th>
                  <th style={{...S.th,minWidth:200,position:"sticky",top:0,zIndex:2}}>Immobile / Proprietario</th>
                  <th style={{...S.th,minWidth:100,position:"sticky",top:0,zIndex:2}}>Agenti</th>
                  <th style={{...S.th,minWidth:110,textAlign:"right",position:"sticky",top:0,zIndex:2}}>Prezzo</th>
                  <th style={{...S.th,minWidth:110,position:"sticky",top:0,zIndex:2}}>Scadenza</th>
                  <th style={{...S.th,minWidth:100,position:"sticky",top:0,zIndex:2}}>Proposta</th>
                  <th style={{...S.th,minWidth:100,position:"sticky",top:0,zIndex:2}}>Azioni</th>
                </tr>
              </thead>
              <tbody>{incFiltrati.map(inc=>{
                const s=statoInc(inc); const cfg=STATI_INC[s]||STATI_INC.Attivo;
                const isVenduto=s==="Venduto"||s==="Locato";
                const vendCorr=venduti.find(v=>v.incaricoId===inc.id);
                const propCorr=proposte.find(p=>p.incaricoId===inc.id&&STATI_BLOCCANTI.includes(p.stato));
                const hasPropAttiva=hasPropBloccante(inc.id);
                const propAttivaVinc=proposte.some(p=>p.incaricoId===inc.id&&p.stato==="In attesa / Vincolata");
                const rowBg=inc.archiviato?"#fafafa":mirino[String(inc.id)]?"#FFF5F5":hasPropAttiva?(propAttivaVinc?"#FEF9E7":"#FEF0E0"):"white";
                const ggScad=inc.scadenza?Math.round((new Date(inc.scadenza)-new Date())/86400000):null;
                const scadClr=ggScad===null?"#aaa":ggScad<0?"#E74C3C":ggScad<30?"#E67E22":"#27AE60";
                const isOpenInc=rowOpen===`inc_${inc.id}`;
                return(<React.Fragment key={inc.id}>
                <tr style={{background:isOpenInc?"#FDFBF7":rowBg,opacity:inc.archiviato?0.7:1,borderLeft:`4px solid ${cfg.clr}`,borderBottom:isOpenInc?"none":"0.5px solid #f5f5f5",cursor:"pointer",transition:"background .15s"}}
                  onClick={()=>setRowOpen(isOpenInc?null:`inc_${inc.id}`)}>
                  {/* Stato */}
                  <td style={{padding:"12px 12px",verticalAlign:"middle"}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,padding:"4px 10px",borderRadius:5,background:`${cfg.clr}18`,color:cfg.clr,fontWeight:600,border:`0.5px solid ${cfg.clr}44`,whiteSpace:"nowrap"}}>
                      {cfg.s} {s}
                    </span>
                    {hasPropAttiva&&<div style={{fontSize:10,color:propAttivaVinc?"#D4AC0D":"#E67E22",marginTop:3,fontWeight:500}}>{propAttivaVinc?"⚡ Vincolata":"⚡ In proposta"}</div>}
                    {mirino[String(inc.id)]&&<div style={{fontSize:10,color:"#E74C3C",fontWeight:600,marginTop:2}}>🎯 Nel mirino</div>}
                  </td>
                  {/* Immobile + Proprietario */}
                  <td style={{padding:"12px 12px",verticalAlign:"middle"}}>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:3,color:"#2C2C2C"}}>
                      {inc.comune} — {inc.indirizzo}
                      <span style={{fontSize:12,color:"#bbb",fontWeight:400,marginLeft:6}}>{isOpenInc?"▲":"▼"}</span>
                    </div>
                    <div style={{fontSize:12,color:"#888",display:"flex",gap:8,flexWrap:"wrap"}}>
                      <span>{inc.nominativo}</span>
                      {inc.fonte&&<span style={{padding:"1px 5px",borderRadius:3,background:"#f0f0f0",color:"#666"}}>{inc.fonte}</span>}
                      {inc.tipologia&&<span style={{color:"#aaa"}}>{inc.tipologia}</span>}
                    </div>
                  </td>
                  {/* Agenti */}
                  <td style={{padding:"10px 12px",verticalAlign:"middle"}}>
                    <div style={{fontSize:11,display:"flex",flexDirection:"column",gap:2}}>
                      {inc.agenteListing&&<span style={{color:"#2980B9"}}>L: {nomAg(inc.agenteListing)}</span>}
                      {inc.buyerListing&&<span style={{color:"#2980B9",opacity:.8}}>BL: {nomAg(inc.buyerListing)}</span>}
                      {vendCorr?.agenteAcquirente&&<span style={{color:"#8E44AD"}}>A: {nomAg(vendCorr.agenteAcquirente)}</span>}
                      {vendCorr?.buyer&&<span style={{color:"#8E44AD",opacity:.8}}>B: {nomAg(vendCorr.buyer)}</span>}
                    </div>
                  </td>
                  {/* Prezzo */}
                  <td style={{padding:"10px 12px",textAlign:"right",verticalAlign:"middle"}}>
                    {(inc.storicoRibassi||[]).length>0
                      ?<><span style={{color:"#bbb",textDecoration:"line-through",fontSize:11,display:"block"}}>€ {fmtN(inc.prezzoRichiesto)}</span><span style={{fontWeight:600,color:BRAND.oroD,fontSize:13}}>€ {fmtN(inc.storicoRibassi[inc.storicoRibassi.length-1].prezzo)}</span></>
                      :<span style={{fontWeight:500,color:BRAND.oroD,fontSize:13}}>€ {fmtN(inc.prezzoRichiesto)}</span>
                    }
                    <div style={{fontSize:10,color:"#aaa",marginTop:2}}>{inc.provvPrevista?`${inc.provvPrevista}% provv.`:""}</div>
                  </td>
                  {/* Scadenza */}
                  <td style={{padding:"10px 12px",verticalAlign:"middle"}}>
                    {ggScad!==null?(<>
                      <div style={{fontSize:12,fontWeight:500,color:scadClr}}>{ggScad<0?"Scaduto":ggScad===0?"Oggi":ggScad+" gg"}</div>
                      <div style={{fontSize:10,color:"#aaa",marginTop:1}}>{fmtD(inc.scadenza)}</div>
                      <div style={{height:3,background:"#f0f0f0",borderRadius:2,marginTop:3,overflow:"hidden",width:50}}>
                        <div style={{height:"100%",width:`${Math.min(100,Math.max(0,(ggScad/90)*100))}%`,background:scadClr,borderRadius:2}}/>
                      </div>
                    </>):<span style={{fontSize:11,color:"#aaa"}}>—</span>}
                  </td>
                  <td style={S.tdC}>
                    {(()=>{
                      const propInc=proposte.filter(p=>p.incaricoId===inc.id&&!["Rifiutata","Mancata Chiusura"].includes(p.stato));
                      if(propInc.length===0) return null;
                      const priorita=["Accettata","Accettata con Vincolo","In attesa / Vincolata","Controproposta","In attesa"];
                      const propOrd=[...propInc].sort((a,b)=>priorita.indexOf(a.stato)-priorita.indexOf(b.stato));
                      return <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"center"}}>{propOrd.map((p,i)=>{
                        const cfg=STATI_PROP[p.stato]||STATI_PROP["In attesa"];
                        return <span key={i} style={bdg(cfg)}>{cfg.s} {cfg.label}</span>;
                      })}</div>;
                    })()}
                  </td>
                  <td style={S.td} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {!isVenduto&&!inc.archiviato&&(isBroker||isBackOffice||Number(inc.agenteListing)===myAgentId)&&<button style={{...S.btn,fontSize:12,padding:"4px 8px"}} onClick={()=>{setFormInc({...inc,agenteListing:inc.agenteListing||"",buyerListing:inc.buyerListing||""});setShowInc(inc);}}>✏️</button>}
                      {(isBroker||isBackOffice||Number(inc.agenteListing)===myAgentId)&&<button title={mirino[String(inc.id)]?"Nel mirino — clicca per modificare":"Metti nel mirino"} style={{...S.btn,fontSize:12,padding:"4px 8px",borderColor:mirino[String(inc.id)]?"#E74C3C":"#ddd",color:mirino[String(inc.id)]?"#E74C3C":"#aaa",background:mirino[String(inc.id)]?"#FDECEC":"#fff"}} onClick={()=>{setFormMirino({...(mirino[String(inc.id)]||{dataInteresse:todayStr(),followUp:"",note:""})});setShowMirino(inc);}}>🎯</button>}
                      {!isVenduto&&!inc.archiviato&&(isBroker||isBackOffice||Number(inc.agenteListing)===myAgentId)&&<button style={{...S.btn,fontSize:12,padding:"4px 8px",color:BRAND.oroD,borderColor:BRAND.oro}} onClick={()=>{setShowRibasso(inc);setFormRibasso({data:todayStr(),prezzo:"",note:""});}}>↘</button>}
                      {!isVenduto&&!hasPropAttiva&&!inc.archiviato&&(isBroker||isBackOffice||Number(inc.agenteListing)===myAgentId)&&<button style={S.btnG} onClick={()=>{setFormProp(emptyProp(inc.categoria,inc));if(!isReadOnly)setShowProp("new");}}>+ Prop.</button>}
                      {(isBroker||isBackOffice||Number(inc.agenteListing)===myAgentId)&&(!inc.archiviato?<button style={S.btnD} onClick={()=>{if(window.confirm(`Archiviare?`))archiviaInc(inc.id);}}>📦</button>
                      :<button style={{...S.btn,fontSize:12,padding:"4px 8px",color:"#27AE60"}} onClick={()=>ripristinaInc(inc.id)}>↩</button>)}
                    </div>
                  </td>
                </tr>
                {/* ACCORDION INCARICHI */}
                {isOpenInc&&<tr style={{background:"#FAFAF8",borderBottom:"1px solid #e8e5e0",borderLeft:`4px solid ${cfg.clr}`}}>
                  <td colSpan={7} style={{padding:"0 14px 14px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:10}}>
                      <div style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:"0.5px solid #e8e5e0"}}>
                        <p style={{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 8px"}}>Dettaglio incarico</p>
                        {[["Data inizio",fmtD(inc.dataInizio)],["Scadenza",inc.scadenza?fmtD(inc.scadenza):"—"],["Tipologia",inc.tipologia||"—"],["Fonte",inc.fonte||"—"],["Provv. prevista",`${inc.provvPrevista||3}%`],["Provv. acquirente",`${inc.provvAcquirente||3}%`]].map(([k,v])=>(
                          <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"0.5px solid #f5f5f5"}}><span style={{color:"#888"}}>{k}</span><strong>{v}</strong></div>
                        ))}
                        {inc.note&&<div style={{fontSize:11,color:"#aaa",fontStyle:"italic",marginTop:6}}>{inc.note}</div>}
                      </div>
                      <div style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:"0.5px solid #e8e5e0"}}>
                        <p style={{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 8px"}}>Agenti coinvolti</p>
                        {[["Listing",inc.agenteListing,(isBroker||isBackOffice)?`${inc.percListing||50}%`:null],["Buyer L.",inc.buyerListing,(isBroker||isBackOffice)?`${inc.percBuyerListing||0}%`:null],["Acquirente",vendCorr?.agenteAcquirente,(isBroker||isBackOffice)?`${vendCorr?.percAcquirente||0}%`:null],["Buyer",vendCorr?.buyer,(isBroker||isBackOffice)?`${vendCorr?.percBuyer||0}%`:null]].filter(([,id])=>id).map(([k,id,p])=>(
                          <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"0.5px solid #f5f5f5"}}><span style={{color:"#888"}}>{k}</span><span><strong>{nomAg(id)}</strong> <span style={{color:"#aaa"}}>{p}</span></span></div>
                        ))}
                      </div>
                      <div style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:"0.5px solid #e8e5e0"}}>
                        <p style={{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 8px"}}>Proposte attive</p>
                        {proposte.filter(p=>p.incaricoId===inc.id&&!["Rifiutata","Mancata Chiusura"].includes(p.stato)).length===0
                          ?<p style={{fontSize:12,color:"#aaa",fontStyle:"italic"}}>Nessuna proposta attiva</p>
                          :proposte.filter(p=>p.incaricoId===inc.id&&!["Rifiutata","Mancata Chiusura"].includes(p.stato)).map(p=>{
                            const cfgP=STATI_PROP[p.stato]||STATI_PROP["In attesa"];
                            return(<div key={p.id} style={{marginBottom:8,padding:"8px",background:"#fafaf8",borderRadius:6,border:`0.5px solid ${cfgP.clr}33`}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                <span style={{fontSize:11,fontWeight:600,color:cfgP.clr}}>{cfgP.s} {p.stato}</span>
                                <strong style={{fontSize:12,color:BRAND.oroD}}>€ {fmtN(p.prezzoOfferto)}</strong>
                              </div>
                              <div style={{fontSize:11,color:"#888"}}>{p.nomeAcquirente}</div>
                              {p.vincolata&&<div style={{fontSize:10,color:BRAND.oroD,marginTop:2}}>⚡ {p.tipoVincolo||"Vincolata"}</div>}
                            </div>);
                          })
                        }
                        {!isVenduto&&!hasPropAttiva&&!inc.archiviato&&<button style={{...S.btnG,width:"100%",marginTop:4,fontSize:12}} onClick={e=>{e.stopPropagation();setFormProp(emptyProp(inc.categoria,inc));if(!isReadOnly)setShowProp("new");}}>+ Nuova proposta</button>}
                        <button style={{...S.btn,width:"100%",marginTop:6,fontSize:12,color:"#533AB7",borderColor:"#533AB7"}} onClick={e=>{e.stopPropagation();setGpPraticaSel(inc.id);setTab("Gestione Pratiche");}}>📋 Apri pratica RT</button>
                      </div>
                    </div>
                  </td>
                </tr>}
                </React.Fragment>);
              })}
              {incFiltrati.length===0&&<tr><td colSpan={18} style={{...S.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessun incarico trovato</td></tr>}
              </tbody>
            </table></div>
            {archiviati.length>0&&!mostraArchiviati&&<p style={{fontSize:12,color:"#aaa",textAlign:"center"}}>{archiviati.length} incarichi archiviati — attiva "Mostra archiviati" per vederli</p>}
            {mostraArchiviati&&archiviati.length>0&&(
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #E67E2244",padding:"1rem",marginTop:"0.5rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
                  <p style={{fontSize:13,fontWeight:500,color:"#E67E22",margin:0}}>Archivio ({archiviati.length})</p>
                  <button style={{...S.btnD,fontSize:12}} onClick={()=>{if(window.confirm("Eliminare TUTTI gli incarichi archiviati definitivamente?"))setArchiviati([]);}}>Svuota archivio</button>
                </div>
                {archiviati.map(inc=>(
                  <div key={inc.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,background:"#fafafa",border:"0.5px solid #eee",marginBottom:6,flexWrap:"wrap",gap:8}}>
                    <div>
                      <span style={{fontSize:13,fontWeight:500,color:BRAND.grigio}}>{inc.nominativo}</span>
                      <span style={{fontSize:12,color:"#aaa",marginLeft:10}}>{inc.comune} — {inc.indirizzo}</span>
                      <span style={{fontSize:11,color:"#ccc",marginLeft:10}}>Archiviato il {fmtD(inc.dataArchiviazione)}</span>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button style={{...S.btn,fontSize:12,padding:"4px 10px",color:"#27AE60"}} onClick={()=>ripristinaInc(inc.id)}>Ripristina</button>
                      <button style={{...S.btnD,fontSize:12,padding:"4px 10px"}} onClick={()=>{if(window.confirm(`Eliminare definitivamente "${inc.nominativo}"? Non sara recuperabile.`))setArchiviati(archiviati.filter(x=>x.id!==inc.id));}}>Elimina</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mostraArchiviati&&archiviati.length===0&&<p style={{fontSize:12,color:"#aaa",textAlign:"center",marginTop:"0.5rem"}}>Nessun incarico archiviato</p>}
          </div>)}

          {/* PROPOSTE */}
          {tab==="Proposte"&&(<div style={S.sec}>
            <div style={S.pageHdr}>
              <SubTabs value={subProp} onChange={v=>{setSubProp(v);setFPropStato("Tutti");}} options={[{v:"vendita",l:"🏠 Vendite"},{v:"affitto",l:"🔑 Affitti"}]}/>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button style={{...S.btnP,background:"#2980B9",borderColor:"#2980B9"}} onClick={()=>{setCercaIncAg("");setShowSelIncaricoAg(true);}}>🏢 Proposta su immobile agenzia</button>
                <button style={S.btnP} onClick={()=>{setFormProp(emptyProp(subProp));if(!isReadOnly)setShowProp("new");}}>+ Nuova proposta (collab.)</button>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
              <FiltriProp/>
              <SearchBar value={searchProposte} onChange={setSearchProposte} placeholder="Cerca immobile, venditore, acquirente..." nResults={propFiltrate.length}/>
            </div>
            <div style={S.cnt}>{[["In attesa",cntProp.attesa,"#4A90D9"],["Con vincolo",cntProp.vincolo,"#D4AC0D"],["Accettate",cntProp.accettate,"#27AE60"],["Non concluse",cntProp.rifiutate,"#E74C3C"]].map(([l,n,c])=>(<div key={l} style={S.cntBox(c)}><span style={{fontSize:24,fontWeight:700,color:c}}>{n}</span><span style={{fontSize:12,color:"#aaa"}}>{l}</span></div>))}</div>
            <div style={{...S.tblWrap,overflow:"auto",maxHeight:"70vh"}}><table style={{...S.tbl,borderCollapse:"separate",borderSpacing:0}}>
              <thead><tr>
                <th style={{...S.th,minWidth:110,background:"#fafaf8",position:"sticky",top:0,zIndex:2}}>Stato</th>
                <th style={{...S.th,minWidth:160,position:"sticky",top:0,zIndex:2}}>Immobile / Parti</th>
                <th style={{...S.th,minWidth:100,position:"sticky",top:0,zIndex:2}}>Agenti</th>
                <th style={{...S.th,minWidth:130,textAlign:"right",position:"sticky",top:0,zIndex:2}}>Offerta / Prezzo rich.</th>
                <th style={{...S.th,minWidth:90,position:"sticky",top:0,zIndex:2}}>Provvigioni</th>
                <th style={{...S.th,minWidth:90,position:"sticky",top:0,zIndex:2}}>Vincolo</th>
                <th style={{...S.th,minWidth:100,position:"sticky",top:0,zIndex:2}}>Data</th>
                <th style={{...S.th,minWidth:110,position:"sticky",top:0,zIndex:2}}>Azioni</th>
              </tr></thead>
              <tbody>{propFiltrate.map(p=>{
                const cfg=STATI_PROP[p.stato]||STATI_PROP["In attesa"];
                const puoGestire=!["Rifiutata","Mancata Chiusura","Accettata"].includes(p.stato);
                const isOpenProp=rowOpen===`prop_${p.id}`;
                return(<React.Fragment key={p.id}>
                <tr style={{borderLeft:`4px solid ${cfg.clr}`,borderBottom:isOpenProp?"none":"0.5px solid #f5f5f5",cursor:"pointer",background:isOpenProp?"#FDFBF7":"#fff",transition:"background .15s"}}
                  onClick={()=>setRowOpen(isOpenProp?null:`prop_${p.id}`)}>
                  {/* Stato */}
                  <td style={{padding:"12px 12px",verticalAlign:"middle"}}>
                    <span style={{display:"inline-flex",fontSize:12,padding:"4px 10px",borderRadius:5,background:`${cfg.clr}18`,color:cfg.clr,fontWeight:600,border:`0.5px solid ${cfg.clr}44`,whiteSpace:"nowrap",marginBottom:3}}>{cfg.s} {p.stato}</span>
                    <div><span style={{fontSize:10,padding:"1px 6px",borderRadius:3,background:p.tipo==="da_incarico"?"#EAF4FB":"#FEF0E0",color:p.tipo==="da_incarico"?"#2980B9":"#E67E22"}}>{p.tipo==="da_incarico"?"Incarico":"Collab."}</span></div>
                  </td>
                  {/* Immobile + Parti */}
                  <td style={{padding:"12px 12px",verticalAlign:"middle"}}>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:3,color:"#2C2C2C"}}>
                      {p.comuneImmobile} — {p.indirizzoImmobile}
                      <span style={{fontSize:12,color:"#bbb",fontWeight:400,marginLeft:6}}>{isOpenProp?"▲":"▼"}</span>
                    </div>
                    <div style={{fontSize:12,color:"#888",display:"flex",gap:8,flexWrap:"wrap"}}>
                      <span>V: {p.nominativoVenditore||"—"}</span>
                      <span>A: {p.nomeAcquirente||"—"}</span>
                      {p.tipologia&&<span style={{color:"#aaa"}}>{p.tipologia}</span>}
                    </div>
                  </td>
                  {/* Agenti */}
                  <td style={{padding:"10px 12px",verticalAlign:"top"}}>
                    <div style={{fontSize:11,display:"flex",flexDirection:"column",gap:2}}>
                      {p.agenteListing&&<span style={{color:"#2980B9"}}>L: {nomAg(p.agenteListing)}</span>}
                      {p.agenteAcquirente&&<span style={{color:"#8E44AD"}}>A: {nomAg(p.agenteAcquirente)}{p.percAcquirente?` ${p.percAcquirente}%`:""}</span>}
                      {p.buyerListing&&<span style={{color:"#2980B9",opacity:.8}}>BL: {nomAg(p.buyerListing)}</span>}
                      {p.buyer&&<span style={{color:"#8E44AD",opacity:.8}}>B: {nomAg(p.buyer)}</span>}
                    </div>
                  </td>
                  {/* Prezzo offerta + prezzo incarico */}
                  <td style={{padding:"10px 12px",textAlign:"right",verticalAlign:"top"}}>{(()=>{
                    const inc2=incarichi.find(i=>i.id===p.incaricoId);
                    const diff=inc2&&inc2.prezzoRichiesto?((p.prezzoOfferto/inc2.prezzoRichiesto-1)*100).toFixed(1):null;
                    return(<><div style={{fontWeight:500,color:BRAND.oroD,fontSize:13}}>€ {fmtN(p.prezzoOfferto)}</div>
                    {inc2&&inc2.prezzoRichiesto&&<div style={{fontSize:10,color:"#aaa",marginTop:2}}>Rich.: € {fmtN(inc2.prezzoRichiesto)}</div>}
                    {diff&&<div style={{fontSize:11,fontWeight:500,color:Number(diff)<0?"#E74C3C":"#27AE60",marginTop:1}}>{diff}%</div>}</>);
                  })()}</td>
                  {/* Provvigioni */}
                  <td style={{padding:"10px 12px",verticalAlign:"top"}}>
                    <div style={{fontSize:11,display:"flex",flexDirection:"column",gap:2}}>
                      {p.provvVenditore>0&&<span style={{color:"#2980B9"}}>V: € {fmt(p.provvVenditore)}</span>}
                      {p.provvAcquirente>0&&<span style={{color:"#8E44AD"}}>A: € {fmt(p.provvAcquirente)}</span>}
                    </div>
                  </td>
                  {/* Vincolo */}
                  <td style={{padding:"10px 12px",verticalAlign:"top"}}>
                    {p.vincolata
                      ?<div><span style={{fontSize:11,color:BRAND.oroD,fontWeight:500}}>⚡ {p.tipoVincolo||"Sì"}</span>{p.termineSubordine&&<div style={{fontSize:10,color:"#aaa",marginTop:2}}>Scad: {fmtD(p.termineSubordine)}</div>}</div>
                      :<span style={{fontSize:11,color:"#ccc"}}>—</span>}
                  </td>
                  {/* Data */}
                  <td style={{padding:"10px 12px",verticalAlign:"top"}}>
                    <div style={{fontSize:12}}>{fmtD(p.dataStato)}</div>
                    {p.dataAccettazione&&<div style={{fontSize:10,color:"#27AE60",marginTop:2}}>Acc: {fmtD(p.dataAccettazione)}</div>}
                  </td>
                  <td style={S.td}>
                    <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                      {puoGestire&&<button style={S.btnP} onClick={()=>{setFormStatoProp({stato:p.stato,noteStato:"",contropropostaPrezzo:"",esitoVincolo:"",tipoNegazione:"",rispostaAcquirente:"",dataAccettazione:p.dataAccettazione||"",dataEsitoVincolo:""});setShowGestProp(p);}}>Gestisci</button>}
                      {!puoGestire&&["Accettata","Accettata con Vincolo"].includes(p.stato)&&<span style={{fontSize:12,padding:"3px 10px",borderRadius:6,background:"#E9F7EF",color:"#27AE60",fontWeight:600,border:"0.5px solid #27AE6044"}}>✓ Conclusa</span>}
                      {!puoGestire&&!["Accettata","Accettata con Vincolo"].includes(p.stato)&&<span style={{fontSize:11,color:"#aaa",fontStyle:"italic"}}>{p.stato}</span>}
                      <button style={{...S.btn,fontSize:12,padding:"4px 8px"}} title="Modifica proposta" onClick={()=>{setFormProp({...p});if(!isReadOnly)setShowProp("edit");}}>✏️</button>
                      <button style={{...S.btnD,fontSize:11,padding:"3px 8px"}} title="Archivia" onClick={()=>{if(window.confirm(`Archiviare la proposta per "${p.nomeAcquirente}"?`))archiviaProp(p.id);}}>📦</button>
                    </div>
                  </td>
                </tr>
                {/* ACCORDION PROPOSTE */}
                {isOpenProp&&<tr style={{background:"#FAFAF8",borderBottom:"1px solid #e8e5e0",borderLeft:`4px solid ${cfg.clr}`}}>
                  <td colSpan={8} style={{padding:"0 14px 14px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:10}}>
                      <div style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:"0.5px solid #e8e5e0"}}>
                        <p style={{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 8px"}}>Dettaglio proposta</p>
                        {[["Offerta",`€ ${fmtN(p.prezzoOfferto)}`],["Data",fmtD(p.dataStato)],["Accettazione",p.dataAccettazione?fmtD(p.dataAccettazione):"—"],["Scadenza",p.scadenzaProposta?fmtD(p.scadenzaProposta):"—"],["Tipo",p.tipo==="da_incarico"?"Su incarico":"Collaborazione"]].map(([k,v])=>(
                          <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"0.5px solid #f5f5f5"}}><span style={{color:"#888"}}>{k}</span><strong>{v}</strong></div>
                        ))}
                        {p.vincolata&&<div style={{marginTop:8,padding:"6px 8px",background:"#FEF9E7",borderRadius:5,fontSize:11,color:"#633806"}}>⚡ Vincolo: {p.tipoVincolo||"Sì"}{p.termineSubordine?` · scade ${fmtD(p.termineSubordine)}`:""}</div>}
                      </div>
                      <div style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:"0.5px solid #e8e5e0"}}>
                        <p style={{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 8px"}}>Provvigioni</p>
                        {[["Provv. venditore",`€ ${fmt(p.provvVenditore||0)}`],["Provv. acquirente",`€ ${fmt(p.provvAcquirente||0)}`]].map(([k,v])=>(
                          <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"0.5px solid #f5f5f5"}}><span style={{color:"#888"}}>{k}</span><strong>{v}</strong></div>
                        ))}
                        <p style={{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"12px 0 8px"}}>Agenti</p>
                        {[["Listing",p.agenteListing,p.percListing],["Buyer L.",p.buyerListing,p.percBuyerListing],["Acquirente",p.agenteAcquirente,p.percAcquirente],["Buyer",p.buyer,p.percBuyer]].filter(([,id])=>id).map(([k,id,perc])=>(
                          <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"0.5px solid #f5f5f5"}}><span style={{color:"#888"}}>{k}</span><span><strong>{nomAg(id)}</strong>{perc?<span style={{color:"#aaa"}}> {perc}%</span>:null}</span></div>
                        ))}
                      </div>
                      <div style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:"0.5px solid #e8e5e0"}}>
                        <p style={{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 8px"}}>Azioni</p>
                        <div style={{display:"flex",flexDirection:"column",gap:6}} onClick={e=>e.stopPropagation()}>
                          {puoGestire&&<button style={{...S.btnP,fontSize:12,padding:"6px"}} onClick={()=>{setFormStatoProp({stato:p.stato,noteStato:"",contropropostaPrezzo:"",esitoVincolo:"",tipoNegazione:"",rispostaAcquirente:"",dataAccettazione:p.dataAccettazione||"",dataEsitoVincolo:""});setShowGestProp(p);}}>Gestisci proposta</button>}
                          {p.stato==="Accettata"&&!venduti.find(v=>v.propostaId===p.id)&&<button style={{...S.btnG,fontSize:12,padding:"6px"}} onClick={()=>{const nv=creaVendutoDaProposta(p);setVenduti([...venduti,nv]);setProposte(proposte.map(x=>x.id===p.id?{...x,archiviato:true}:x));}}>✓ Conclusa</button>}
                          {p.note&&<div style={{fontSize:11,color:"#aaa",fontStyle:"italic",marginTop:4}}>{p.note}</div>}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>}
                </React.Fragment>);
              })}
              {propFiltrate.length===0&&<tr><td colSpan={8} style={{...S.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessuna proposta trovata</td></tr>}
              </tbody>
            </table></div>
          </div>)}
            {/* Archivio Proposte */}
            {tab==="Proposte"&&(<div style={{padding:"0 1.5rem 1rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",color:BRAND.grigio}}>
                  <input type="checkbox" checked={mostraArchiviatiProp} onChange={e=>setMostraArchiviatiProp(e.target.checked)}/> Mostra proposte archiviate ({archiviatiProp.length})
                </label>
                {mostraArchiviatiProp&&archiviatiProp.length>0&&<button style={{...S.btnD,fontSize:12,marginLeft:"auto"}} onClick={()=>{if(window.confirm("Svuotare tutto l archivio proposte?"))setArchiviatiProp([]);}}>Svuota archivio</button>}
              </div>
              {mostraArchiviatiProp&&archiviatiProp.length>0&&archiviatiProp.filter(p=>p.categoria===subProp).map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,background:"#fff",border:"0.5px solid #eee",marginBottom:6,flexWrap:"wrap",gap:8}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:500}}>{p.nomeAcquirente}</span>
                    <span style={{fontSize:12,color:"#aaa",marginLeft:8}}>{p.comuneImmobile} — {p.indirizzoImmobile}</span>
                    <span style={bdg(STATI_PROP[p.stato]||STATI_PROP["In attesa"])} style2={{marginLeft:8,fontSize:11}}> {p.stato}</span>
                    <span style={{fontSize:11,color:"#ccc",marginLeft:8}}>Archiviata il {fmtD(p.dataArchiviazione)}</span>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button style={{...S.btn,fontSize:12,padding:"4px 10px",color:"#27AE60"}} onClick={()=>ripristinaProp(p.id)}>Ripristina</button>
                    <button style={{...S.btnD,fontSize:12,padding:"4px 10px"}} onClick={()=>{if(window.confirm(`Eliminare definitivamente la proposta per "${p.nomeAcquirente}"?`))setArchiviatiProp(archiviatiProp.filter(x=>x.id!==p.id));}}>Elimina</button>
                  </div>
                </div>
              ))}
              {mostraArchiviatiProp&&archiviatiProp.length===0&&<p style={{fontSize:12,color:"#aaa"}}>Nessuna proposta archiviata</p>}
            </div>)}

          {/* VENDUTI */}
          {tab==="Venduti"&&(<div style={S.sec}>
            <div style={{marginBottom:"1rem"}}><SubTabs value={subVend} onChange={v=>{setSubVend(v);setFVendStato("Tutti");}} options={[{v:"vendita",l:"🏠 Vendite"},{v:"affitto",l:"🔑 Locazioni"}]}/></div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
              <FiltriVend/>
              <SearchBar value={searchVenduti} onChange={setSearchVenduti} placeholder="Cerca immobile, venditore, acquirente..." nResults={vendFiltrati.length}/>
            </div>
            <div style={S.cnt}>{[["Da incassare",cntVend.daIncassare,"#E67E22"],["Parziale",cntVend.parziale,"#D4AC0D"],["Incassato",cntVend.incassato,"#27AE60"]].map(([l,n,c])=>(<div key={l} style={S.cntBox(c)}><span style={{fontSize:24,fontWeight:700,color:c}}>{n}</span><span style={{fontSize:12,color:"#aaa"}}>{l}</span></div>))}</div>
            <div style={{...S.tblWrap,overflow:"auto",maxHeight:"70vh"}}><table style={{...S.tbl,borderCollapse:"separate",borderSpacing:0}}>
              <thead><tr>
                <th style={{...S.th,minWidth:100,background:"#fafaf8",position:"sticky",top:0,zIndex:2}}>Stato</th>
                <th style={{...S.th,minWidth:220,background:"#fafaf8",position:"sticky",top:0,zIndex:2}}>Immobile / Parti</th>
                <th style={{...S.th,minWidth:130,background:"#fafaf8",position:"sticky",top:0,zIndex:2}}>Agenti</th>
                <th style={{...S.th,minWidth:120,textAlign:"right",background:"#fafaf8",position:"sticky",top:0,zIndex:2}}>Prezzo / Provv.</th>
                <th style={{...S.th,minWidth:120,background:"#fafaf8",position:"sticky",top:0,zIndex:2}}>Rogito</th>
                <th style={{...S.th,minWidth:110,background:"#fafaf8",position:"sticky",top:0,zIndex:2}}>Incassato</th>
                <th style={{...S.th,minWidth:90,background:"#fafaf8",position:"sticky",top:0,zIndex:2}}>Azioni</th>
              </tr></thead>
              <tbody>{vendFiltrati.map(v=>{
                const statoI=calcolaStatoIncasso(v);
                const cfg=STATI_INCASSO[statoI]||STATI_INCASSO["Da incassare"];
                const incV=calcolaIncassatoV(v); const incA=calcolaIncassatoA(v);
                const totInc=incV+incA; const totProvv=(v.provvVenditore||0)+(v.provvAcquirente||0);
                const isOpen=rowOpen===v.id;
                return(<React.Fragment key={v.id}>
                  <tr style={{opacity:v.bloccato?0.85:1,borderLeft:`4px solid ${cfg.clr}`,borderBottom:isOpen?"none":"0.5px solid #f5f5f5",cursor:"pointer",background:isOpen?"#FDFBF7":"#fff"}}
                    onClick={()=>setRowOpen(isOpen?null:v.id)}>
                  <td style={{padding:"10px 12px",verticalAlign:"top"}}>
                    <span style={{display:"inline-flex",fontSize:11,padding:"3px 8px",borderRadius:5,background:`${cfg.clr}18`,color:cfg.clr,fontWeight:600,border:`0.5px solid ${cfg.clr}44`,whiteSpace:"nowrap"}}>{cfg.s} {statoI}</span>
                    {v.bloccato&&<div style={{fontSize:10,color:"#E74C3C",marginTop:3}}>🔒</div>}
                  </td>
                  <td style={{padding:"10px 12px",verticalAlign:"top"}}>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:3,color:"#2C2C2C"}}>{v.comuneImmobile} — {v.indirizzoImmobile}<span style={{fontSize:12,color:"#bbb",fontWeight:400,marginLeft:6}}>{isOpen?"▲":"▼"}</span></div>
                    <div style={{fontSize:11,color:"#888",display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span>V: {v.nominativoVenditore||"—"}</span><span>A: {v.nomeAcquirente||"—"}</span>
                      {v.tipologia&&<span style={{color:"#aaa"}}>{v.tipologia}</span>}
                    </div>
                  </td>
                  <td style={{padding:"10px 12px",verticalAlign:"top"}}>
                    <div style={{fontSize:11,display:"flex",flexDirection:"column",gap:2}}>
                      {v.agenteListing?<span style={{color:"#2980B9"}}>L: {nomAg(v.agenteListing)}</span>:v.agenziaEsterna?<span style={{color:BRAND.oroD,fontSize:10}}>{v.agenziaEsterna}</span>:null}
                      {v.buyerListing&&<span style={{color:"#2980B9",opacity:.8}}>BL: {nomAg(v.buyerListing)}</span>}
                      {v.agenteAcquirente&&<span style={{color:"#8E44AD"}}>A: {nomAg(v.agenteAcquirente)}{v.percAcquirente?` ${v.percAcquirente}%`:""}</span>}
                      {v.buyer&&<span style={{color:"#8E44AD",opacity:.8}}>B: {nomAg(v.buyer)}{v.percBuyer?` ${v.percBuyer}%`:""}</span>}
                    </div>
                  </td>
                  <td style={{padding:"10px 12px",textAlign:"right",verticalAlign:"top"}}>
                    <div style={{fontWeight:500,color:BRAND.oroD,fontSize:13}}>€ {fmtN(v.prezzoVendita)}</div>
                    <div style={{fontSize:11,marginTop:2}}>
                      {v.provvVenditore>0&&<div style={{color:"#2980B9"}}>V: € {fmt(v.provvVenditore)}</div>}
                      {v.provvAcquirente>0&&<div style={{color:"#8E44AD"}}>A: € {fmt(v.provvAcquirente)}</div>}
                    </div>
                  </td>
                  <td style={{padding:"10px 12px",verticalAlign:"top"}}>
                    <div style={{fontSize:12,fontWeight:500}}>{v.tipoAtto||"—"}</div>
                    <div style={{fontSize:11,color:"#888"}}>{v.dataAtto?fmtD(v.dataAtto):"—"}</div>
                    {v.competenzaAgenziaDiversa&&v.dataCompetenzaAgenzia&&<div style={{fontSize:10,color:"#2980B9",fontStyle:"italic"}}>🏢 {fmtD(v.dataCompetenzaAgenzia)}</div>}
                    {v.competenzaAgenteDiversa&&v.dataCompetenzaAgente&&<div style={{fontSize:10,color:"#8E44AD",fontStyle:"italic"}}>👤 {fmtD(v.dataCompetenzaAgente)}</div>}
                  </td>
                  <td style={{padding:"10px 12px",verticalAlign:"top"}}>
                    <div style={{fontSize:13,fontWeight:500,color:totInc>=totProvv&&totProvv>0?"#27AE60":"#E67E22"}}>€ {fmt(totInc)}</div>
                    <div style={{fontSize:10,color:"#aaa"}}>su € {fmt(totProvv)}</div>
                    {totProvv>0&&<div style={{height:3,background:"#f0f0f0",borderRadius:2,marginTop:3,overflow:"hidden",width:50}}><div style={{height:"100%",width:`${Math.min(100,Math.round(totInc/totProvv*100))}%`,background:totInc>=totProvv?"#27AE60":"#E67E22",borderRadius:2}}/></div>}
                    {v.scadenzaIncasso&&<div style={{fontSize:10,color:"#E67E22",marginTop:2}}>Scad: {fmtD(v.scadenzaIncasso)}</div>}
                  </td>
                  <td style={{padding:"10px 12px",verticalAlign:"top"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {(v.statoIncasso!=="Incassato"&&!v.bloccato)&&<><button style={{...S.btnP,fontSize:11,padding:"3px 7px",background:"#2980B9",borderColor:"#2980B9"}} onClick={()=>setShowIncassoLato({vend:v,lato:"V"})}>V</button>
                      <button style={{...S.btnP,fontSize:11,padding:"3px 7px",background:"#8E44AD",borderColor:"#8E44AD"}} onClick={()=>setShowIncassoLato({vend:v,lato:"A"})}>A</button>
                      <button style={{...S.btn,fontSize:11,padding:"3px 7px"}} onClick={()=>{setFormVend({...v});if(!isReadOnly)setShowGestVend(v);}}>✏️</button></>}
                      <button style={{...S.btn,fontSize:11,padding:"3px 7px",color:v.statoIncasso==="Incassato"?"#27AE60":v.bloccato?"#E67E22":"#aaa"}} 
                        title={v.statoIncasso==="Incassato"?"Incassato — bloccato automaticamente":v.bloccato?"Sbloccato manualmente — clicca per bloccare":"Clicca per bloccare"}
                        onClick={()=>{if(v.statoIncasso==="Incassato")return;setVenduti(venduti.map(x=>x.id===v.id?{...x,bloccato:!x.bloccato}:x));}}>
                        {v.statoIncasso==="Incassato"?"🔒":v.bloccato?"🔒":"🔓"}
                      </button>
                      <button style={{...S.btnD,fontSize:11,padding:"3px 7px"}} onClick={()=>{if(window.confirm("Archiviare?"))archiviaVend(v.id);}}>📦</button>
                    </div>
                  </td>
                </tr>
                {isOpen&&<tr style={{background:"#FAFAF8",borderBottom:"1px solid #e8e5e0",borderLeft:`4px solid ${cfg.clr}`}}>
                  <td colSpan={7} style={{padding:"0 14px 14px 14px"}}>
                    {/* Riepilogo incasso stato */}
                    <div style={{display:"flex",gap:10,marginTop:10,marginBottom:10,flexWrap:"wrap"}}>
                      <div style={{flex:1,minWidth:120,background:totInc>=totProvv&&totProvv>0?"#E9F7EF":"#FEF0E0",borderRadius:8,padding:"10px 14px",border:`0.5px solid ${totInc>=totProvv&&totProvv>0?"#C0DD97":"#FAC775"}`}}>
                        <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>Stato incasso</div>
                        <div style={{fontSize:16,fontWeight:700,color:totInc>=totProvv&&totProvv>0?"#27AE60":"#E67E22"}}>{statoI}</div>
                        <div style={{fontSize:12,marginTop:4}}>Incassato: <strong style={{color:"#27AE60"}}>€ {fmt(totInc)}</strong> su <strong>€ {fmt(totProvv)}</strong></div>
                        {totInc<totProvv&&<div style={{fontSize:12,color:"#E74C3C",marginTop:2,fontWeight:500}}>Manca: € {fmt(totProvv-totInc)}</div>}
                        {totProvv>0&&<div style={{height:5,background:"#f0f0f0",borderRadius:3,marginTop:6,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,Math.round(totInc/totProvv*100))}%`,background:totInc>=totProvv?"#27AE60":"#E67E22",borderRadius:3}}/></div>}
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                      <div style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:"0.5px solid #e8e5e0"}}>
                        <p style={{fontSize:10,fontWeight:600,color:"#2980B9",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 8px"}}>Incasso Venditore <span style={{color:"#27AE60"}}>(€ {fmt(incV)} / € {fmt(v.provvVenditore||0)})</span></p>
                        {[["Acc.1",v.acc1V,v.dataAcc1V],["Acc.2",v.acc2V,v.dataAcc2V],["Saldo",v.saldoV,v.dataSaldoV]].map(([k,imp,dt])=>Number(imp||0)>0&&(<div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"4px 0",borderBottom:"0.5px solid #f5f5f5"}}><span style={{color:"#888"}}>{k}{dt?` · ${fmtD(dt)}`:""}</span><strong style={{color:"#2980B9"}}>€ {fmt(imp)}</strong></div>))}
                        {Number(v.provvVenditore||0)>incV&&<div style={{marginTop:6,fontSize:11,color:"#E74C3C",fontWeight:500}}>Da incassare: € {fmt(Number(v.provvVenditore||0)-incV)}</div>}
                      </div>
                      <div style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:"0.5px solid #e8e5e0"}}>
                        <p style={{fontSize:10,fontWeight:600,color:"#8E44AD",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 8px"}}>Incasso Acquirente <span style={{color:"#27AE60"}}>(€ {fmt(incA)} / € {fmt(v.provvAcquirente||0)})</span></p>
                        {[["Acc.1",v.acc1A,v.dataAcc1A],["Acc.2",v.acc2A,v.dataAcc2A],["Saldo",v.saldoA,v.dataSaldoA]].map(([k,imp,dt])=>Number(imp||0)>0&&(<div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"4px 0",borderBottom:"0.5px solid #f5f5f5"}}><span style={{color:"#888"}}>{k}{dt?` · ${fmtD(dt)}`:""}</span><strong style={{color:"#8E44AD"}}>€ {fmt(imp)}</strong></div>))}
                        {Number(v.provvAcquirente||0)>incA&&<div style={{marginTop:6,fontSize:11,color:"#E74C3C",fontWeight:500}}>Da incassare: € {fmt(Number(v.provvAcquirente||0)-incA)}</div>}
                      </div>
                      <div style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:"0.5px solid #e8e5e0"}}>
                        <p style={{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 8px"}}>Riepilogo pratica</p>
                        {[["Prezzo vendita",`€ ${fmtN(v.prezzoVendita)}`],["Tipo atto",v.tipoAtto||"—"],["Data atto",v.dataAtto?fmtD(v.dataAtto):"—"],["Scad. incasso",v.scadenzaIncasso?fmtD(v.scadenzaIncasso):"—"],["Note",v.note||"—"]].map(([k,val])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"4px 0",borderBottom:"0.5px solid #f5f5f5"}}><span style={{color:"#888"}}>{k}</span><span style={{fontWeight:500}}>{val}</span></div>))}
                      </div>
                    </div>
                  </td>
                </tr>}
                </React.Fragment>);
              })}
              {vendFiltrati.length===0&&<tr><td colSpan={7} style={{...S.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessun venduto trovato</td></tr>}
              </tbody>

            </table></div>
          </div>)}

          {/* Archivio Venduti */}
            {tab==="Venduti"&&(<div style={{padding:"0 1.5rem 1rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",color:BRAND.grigio}}>
                  <input type="checkbox" checked={mostraArchiviatiVend} onChange={e=>setMostraArchiviatiVend(e.target.checked)}/> Mostra venduti archiviati ({archiviatiVend.length})
                </label>
                {mostraArchiviatiVend&&archiviatiVend.length>0&&<button style={{...S.btnD,fontSize:12,marginLeft:"auto"}} onClick={()=>{if(window.confirm("Svuotare tutto l archivio venduti?"))setArchiviatiVend([]);}}>Svuota archivio</button>}
              </div>
              {mostraArchiviatiVend&&archiviatiVend.length>0&&archiviatiVend.filter(v=>v.categoria===subVend).map(v=>(
                <div key={v.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,background:"#fff",border:"0.5px solid #eee",marginBottom:6,flexWrap:"wrap",gap:8}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:500}}>{v.nominativoVenditore}</span>
                    <span style={{fontSize:12,color:"#aaa",marginLeft:8}}>→ {v.nomeAcquirente}</span>
                    <span style={{fontSize:12,color:"#aaa",marginLeft:8}}>{v.comuneImmobile} — {v.indirizzoImmobile}</span>
                    <span style={{fontSize:12,fontWeight:500,color:BRAND.oroD,marginLeft:8}}>€ {fmt(Number(v.provvVenditore||0)+Number(v.provvAcquirente||0))}</span>
                    <span style={{fontSize:11,color:"#ccc",marginLeft:8}}>Archiviato il {fmtD(v.dataArchiviazione)}</span>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button style={{...S.btn,fontSize:12,padding:"4px 10px",color:"#27AE60"}} onClick={()=>ripristinaVend(v.id)}>Ripristina</button>
                    <button style={{...S.btnD,fontSize:12,padding:"4px 10px"}} onClick={()=>{if(window.confirm(`Eliminare definitivamente "${v.nominativoVenditore} - ${v.nomeAcquirente}"?`))setArchiviatiVend(archiviatiVend.filter(x=>x.id!==v.id));}}>Elimina</button>
                  </div>
                </div>
              ))}
              {mostraArchiviatiVend&&archiviatiVend.length===0&&<p style={{fontSize:12,color:"#aaa"}}>Nessun venduto archiviato</p>}
            </div>)}

          {/* REPORT AGENTI */}
          {tab==="Report Agenti"&&(<div style={S.sec}>
            <div style={S.fRow}>
              <Sel value={reportAnno} onChange={v=>{setReportAnno(v);setReportMese("Tutti");}}><option value="Tutti">Tutti gli anni</option>{anniVend.map(a=><option key={a}>{a}</option>)}</Sel>
              <Sel value={reportMese} onChange={setReportMese}><option value="Tutti">Tutti i mesi</option>{mesiReport.map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}</Sel>
              <span style={{fontSize:12,color:"#aaa",marginLeft:4}}>Clicca su un agente per il dettaglio</span>
            </div>
            {reportAnno!=="Tutti"&&<p style={{fontSize:11,color:"#888",margin:"0 0 12px",padding:"6px 10px",background:"#FEF9E7",borderRadius:6,borderLeft:"3px solid #D4AC0D"}}>📅 Filtro per <strong>data di competenza agenzia</strong> — le pratiche con competenza impostata manualmente seguono quella data, non la data atto</p>}
            <div style={{...S.tblWrap,overflowX:"auto"}}><table style={{...S.tbl,minWidth:isMobile?500:400}}>
              <thead><tr>{["Agente","Profilo","Incarichi","N° Trans.","Provv. Agenzia","Incassato","Quota Agente","Quota Buyer","Tot. Ag.+Buyer","da ann. prec."].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(ag=>{
                const vAg=vendReport.filter(v=>v.agenteListing===ag.id||v.agenteAcquirente===ag.id||v.buyerListing===ag.id||v.buyer===ag.id);
                const incAg=incarichi.filter(i=>i.agenteListing===ag.id&&!i.archiviato&&(reportAnno==="Tutti"||getAnno(i.dataInizio)===reportAnno)).length;
                const nTV=vAg.filter(v=>v.agenteListing===ag.id&&Number(v.provvVenditore||0)>0&&!v.agenziaEsterna).length;
                const nTA=vAg.filter(v=>v.agenteAcquirente===ag.id&&Number(v.provvAcquirente||0)>0).length;
                const genTot=vAg.reduce((s,v)=>{let t=0;if(v.agenteListing===ag.id)t+=Number(v.provvVenditore||0);if(v.agenteAcquirente===ag.id)t+=Number(v.provvAcquirente||0);return s+t;},0);
                const incTot=vAg.reduce((s,v)=>{let t=0;if(v.agenteListing===ag.id)t+=calcolaIncassatoV(v);if(v.agenteAcquirente===ag.id)t+=calcolaIncassatoA(v);return s+t;},0);
                const quotaAg=vAg.reduce((s,v)=>{let q=0;if(v.agenteListing===ag.id)q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;if(v.agenteAcquirente===ag.id)q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;return s+q;},0);
                const quotaBuy=vAg.reduce((s,v)=>{let q=0;if(v.buyerListing===ag.id&&v.agenteListing!==ag.id)q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;if(v.buyer===ag.id&&v.agenteAcquirente!==ag.id)q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;return s+q;},0);
                const quotaTot=quotaAg+quotaBuy;
                // Quota da anno precedente = pratiche con competenza agente nell'anno sel. ma agenzia in anno precedente
                const annoPrecReport=reportAnno!=="Tutti"?String(Number(reportAnno)-1):null;
                const quotaAnnoPrecAg=reportAnno==="Tutti"?0:venduti.filter(v=>{
                  if(!(v.agenteListing===ag.id||v.agenteAcquirente===ag.id||v.buyerListing===ag.id||v.buyer===ag.id))return false;
                  const dataAgente=(v.competenzaAgenteDiversa===true||v.competenzaAgenteDiversa==="true")&&v.dataCompetenzaAgente?v.dataCompetenzaAgente:dataCompAgenzia(v);
                  const dataAgenzia=dataCompAgenzia(v);
                  return getAnno(dataAgente)===reportAnno&&getAnno(dataAgenzia)!==reportAnno;
                }).reduce((s,v)=>{
                  let q=0;
                  if(v.agenteListing===ag.id)q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
                  if(v.agenteAcquirente===ag.id)q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
                  if(v.buyerListing===ag.id&&v.agenteListing!==ag.id)q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;
                  if(v.buyer===ag.id&&v.agenteAcquirente!==ag.id)q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;
                  return s+q;
                },0);
                return(<tr key={ag.id} style={{cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#fafaf8"}
                  onMouseLeave={e=>e.currentTarget.style.background=""}
                  onClick={()=>setSchedaAgente(ag)}>
                  <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{ag.nome.charAt(0)}</div><strong>{ag.nome} {ag.cognome}</strong></div></td>
                  <td style={S.td}><span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:ag.profilo==="Broker"?`${BRAND.oro}22`:"#EAF4FB",color:ag.profilo==="Broker"?BRAND.oroD:"#2980B9",fontWeight:500}}>{ag.profilo}</span></td>
                  <td style={S.tdC}><strong style={{color:"#4A90D9"}}>{incAg}</strong></td>
                  <td style={S.tdC}><strong style={{color:BRAND.oroD}}>{nTV+nTA}</strong><span style={{fontSize:11,color:"#aaa",marginLeft:4}}>{nTV}V·{nTA}A</span></td>
                  <td style={S.tdR}>€ {fmt(genTot)}</td>
                  <td style={S.tdR}>€ {fmt(incTot)}</td>
                  <td style={{...S.tdR,color:"#8E44AD",fontWeight:500}}>{ag.profilo==="Broker"?"—":quotaAg>0?`€ ${fmt(quotaAg)}`:"—"}</td>
                  <td style={{...S.tdR,color:"#2980B9",fontWeight:500}}>{quotaBuy>0?`€ ${fmt(quotaBuy)}`:"—"}</td>
                  <td style={{...S.tdR,color:BRAND.oroD,fontWeight:600}}>{ag.profilo==="Broker"?"—":quotaTot>0?`€ ${fmt(quotaTot)}`:"—"}</td>
                  <td style={{...S.tdR,color:"#C9A96E",fontStyle:"italic",fontSize:11}}>{quotaAnnoPrecAg>0?`€ ${fmt(quotaAnnoPrecAg)}`:"—"}</td>
                </tr>);
              })}</tbody>
            </table></div>
          </div>)}

          {/* FATTURE AGENTI */}
          {tab==="Fatture Agenti"&&(()=>{
            // === Helpers prospetti ===
            const prossimoNumeroP = () => {
              const numeri = prospetti.map(p=>{
                const m = (p.numero||"").match(/P-(\d+)/);
                return m?parseInt(m[1],10):0;
              });
              const max = numeri.length>0?Math.max(...numeri):0;
              return `P-${String(max+1).padStart(3,"0")}`;
            };

            // venditoId presenti in prospetti NON annullati (queste quote sono "occupate")
            const venditoIdOccupati = new Set();
            prospetti.forEach(p=>{
              if(p.statoFlow==="annullato") return;
              (p.righe||[]).forEach(r=>{
                venditoIdOccupati.add(`${r.venditoId}_${r.ruolo}_${p.agenteId}`);
              });
            });

            // === Per ogni agente, calcolo righe disponibili ===
            // Agenti che ricevono compensi (Consulenti e Collaboratori, NO Broker)
            // Il Broker non emette fatture verso sé stesso, quindi è escluso da questa vista
            const agentiOperativi = agenti.filter(a=>["Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false);
            const agSel = fatAgente ? agenti.find(a=>a.id===Number(fatAgente)) : null;

            // Quote disponibili (non già in un prospetto attivo) per l'agente selezionato
            const calcQuotaPerRuolo = (v, agId, ruolo) => {
              if(ruolo==="listing"&&Number(v.agenteListing)===agId) return Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
              if(ruolo==="acquirente"&&Number(v.agenteAcquirente)===agId) return Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
              if(ruolo==="buyerListing"&&Number(v.buyerListing)===agId&&Number(v.agenteListing)!==agId) return Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;
              if(ruolo==="buyer"&&Number(v.buyer)===agId&&Number(v.agenteAcquirente)!==agId) return Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;
              return 0;
            };
            // Calcola % incassato dal cliente per la pratica
            const calcPercIncasso = (v) => {
              const provTot = Number(v.provvVenditore||0)+Number(v.provvAcquirente||0);
              if(provTot===0) return 0;
              const incTot = calcolaIncassatoV(v)+calcolaIncassatoA(v);
              return Math.round(incTot/provTot*100);
            };
            const stCli = (v) => {
              const p = calcPercIncasso(v);
              if(p>=100) return {lbl:"Sì",clr:"#0F6E56",bg:"#E1F5EE",ic:"✓"};
              if(p>0) return {lbl:`${p}%`,clr:"#BA7517",bg:"#FAEEDA",ic:"⏳"};
              return {lbl:"No",clr:"#A32D2D",bg:"#FCEBEB",ic:"✕"};
            };

            // Lista di righe disponibili per l'agente selezionato
            const righeDisponibili = agSel ? (()=>{
              const out = [];
              venduti.forEach(v=>{
                if(fatAnno!=="Tutti" && getAnno(dataCompAgenzia(v))!==fatAnno) return;
                ["listing","acquirente","buyerListing","buyer"].forEach(ruolo=>{
                  const importo = calcQuotaPerRuolo(v, agSel.id, ruolo);
                  if(importo<=0) return;
                  const key = `${v.id}_${ruolo}_${agSel.id}`;
                  if(venditoIdOccupati.has(key)) return;
                  out.push({venditoId:v.id, v, ruolo, importo, key});
                });
              });
              // Ordina per data più recente
              return out.sort((a,b)=>(dataCompAgenzia(b.v)||"").localeCompare(dataCompAgenzia(a.v)||""));
            })() : [];

            // Prospetti dell'agente selezionato
            const prospettiAg = agSel ? prospetti.filter(p=>p.agenteId===agSel.id) : [];
            const prospettiAttivi = prospettiAg.filter(p=>p.statoFlow!=="annullato"&&p.statoFlow!=="pagato");
            const prospettiPagati = prospettiAg.filter(p=>p.statoFlow==="pagato");

            // KPI agente
            const totDaFatturare = righeDisponibili.reduce((s,r)=>s+r.importo,0);
            const totInProspetto = prospettiAttivi.reduce((s,p)=>s+Number(p.totale||0),0);
            const totPagato = prospettiPagati.reduce((s,p)=>s+Number(p.totale||0),0);

            // Etichette stato prospetto
            const cfgStatoP = {
              "inviato":{lbl:"Inviato",clr:"#0C447C",bg:"#E6F1FB",ic:"✉"},
              "fatturato":{lbl:"Da pagare",clr:"#633806",bg:"#FAEEDA",ic:"⏳"},
              "pagato":{lbl:"Pagato",clr:"#0F6E56",bg:"#E1F5EE",ic:"✓"},
              "annullato":{lbl:"Annullato",clr:"#666",bg:"#F1EFE8",ic:"—"},
            };
            const ruoloLbl = {"listing":"Listing","acquirente":"Acquirente","buyerListing":"Buyer L","buyer":"Buyer"};
            const ruoloClr = {"listing":"#0C447C","acquirente":"#3C3489","buyerListing":"#633806","buyer":"#A32D2D"};
            const ruoloBg = {"listing":"#E6F1FB","acquirente":"#EEEDFE","buyerListing":"#FAEEDA","buyer":"#FCEBEB"};

            // Toggle selezione riga
            const toggleRiga = (key) => {
              setProspettoSel(prev=>prev.includes(key)?prev.filter(k=>k!==key):[...prev,key]);
            };

            // Crea prospetto dai righe selezionate
            const creaProspetto = () => {
              if(prospettoSel.length===0||!agSel){alert("Seleziona almeno una riga.");return;}
              const righeOk = righeDisponibili.filter(r=>prospettoSel.includes(r.key));
              const totale = righeOk.reduce((s,r)=>s+r.importo,0);
              const nuovo = {
                id:Date.now(),
                numero:prossimoNumeroP(),
                agenteId:agSel.id,
                dataCreazione:todayStr(),
                righe:righeOk.map(r=>({venditoId:r.venditoId, ruolo:r.ruolo, importo:r.importo})),
                totale,
                statoFlow:"inviato",
                numFatturaAg:"",
                dataFatturaAg:"",
                dataPagamento:"",
                note:""
              };
              setProspetti(prev=>[nuovo, ...prev]);
              setProspettoSel([]);
              alert(`✓ Prospetto ${nuovo.numero} creato\\nTotale: € ${fmt(Math.round(totale))}\\n${righeOk.length} righe\\n\\nOra puoi inviarlo a ${agSel.nome} ${agSel.cognome} e attendere la sua fattura.`);
              setShowProspetto(nuovo.id);
            };

            // Aggiorna prospetto
            const aggProspetto = (id, patch) => {
              setProspetti(prev=>prev.map(p=>p.id===id?{...p,...patch}:p));
            };

            // Annulla prospetto
            const annullaProspetto = (id) => {
              if(!window.confirm("Annullare questo prospetto? Le pratiche torneranno disponibili per un nuovo prospetto.")) return;
              aggProspetto(id, {statoFlow:"annullato"});
              setShowProspetto(null);
            };

            // Elimina prospetto definitivo
            const eliminaProspetto = (id) => {
              if(!window.confirm("Eliminare DEFINITIVAMENTE questo prospetto? Operazione irreversibile.")) return;
              setProspetti(prev=>prev.filter(p=>p.id!==id));
              setShowProspetto(null);
            };

            // Prospetto attualmente visualizzato
            const prAttivo = showProspetto ? prospetti.find(p=>p.id===showProspetto) : null;

            return(<div style={S.sec}>
              {/* HEADER */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:"1rem"}}>
                <div>
                  <p style={{fontSize:11,color:BRAND.oroD,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>🧾 Fatture Agenti</p>
                  <h2 style={{margin:0,fontSize:20,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>Gestione compensi e fatture collaboratori</h2>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <select style={S.sel} value={fatAgente} onChange={e=>{setFatAgente(e.target.value);setProspettoSel([]);}}>
                    <option value="">Seleziona agente...</option>
                    {agentiOperativi.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}
                  </select>
                  {agSel&&<Sel value={fatAnno} onChange={setFatAnno}>
                    <option value="Tutti">Tutti gli anni</option>
                    {anniVend.map(a=><option key={a}>{a}</option>)}
                  </Sel>}
                </div>
              </div>

              {/* Sub-tabs (sempre visibili — Riepilogo è accessibile anche senza agente selezionato) */}
              <div style={{display:"flex",gap:6,marginBottom:"1rem",borderBottom:"0.5px solid #e8e5e0",paddingBottom:"0.5rem",flexWrap:"wrap"}}>
                {[
                  {v:"riepilogo",l:"📊 Riepilogo"},
                  ...(agSel?[{v:"quote",l:"🧾 Quote maturate"},{v:"prospetti",l:`📋 Prospetti (${prospettiAg.length})`}]:[]),
                ].map(o=>(
                  <button key={o.v} onClick={()=>setFatSubTab(o.v)} style={{...S.btn,fontSize:13,padding:"6px 14px",background:fatSubTab===o.v?BRAND.oro:"transparent",color:fatSubTab===o.v?"#fff":BRAND.grigio,border:`1px solid ${fatSubTab===o.v?BRAND.oro:"transparent"}`,fontWeight:fatSubTab===o.v?600:500}}>{o.l}</button>
                ))}
              </div>

              {!agSel&&fatSubTab!=="riepilogo"&&<div style={{textAlign:"center",padding:"3rem",color:"#bbb"}}>
                <p style={{fontSize:14}}>Seleziona un agente per gestire i suoi compensi e prospetti, oppure apri il <strong style={{color:BRAND.oroD}}>📊 Riepilogo</strong> per vedere la vista d'insieme.</p>
              </div>}

              {/* ────────────────────── TAB QUOTE MATURATE ────────────────────── */}
              {agSel&&fatSubTab==="quote"&&<>
                {/* 3 KPI */}
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10,marginBottom:"1.25rem"}}>
                  <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #BA7517`,padding:"1rem",textAlign:"center"}}>
                    <p style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 6px",fontWeight:700}}>Da fatturare</p>
                    <p style={{fontSize:22,fontWeight:700,color:"#BA7517",fontFamily:"Georgia,serif",margin:0}}>€ {fmt(Math.round(totDaFatturare))}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"3px 0 0"}}>{righeDisponibili.length} righe disponibili</p>
                  </div>
                  <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #185FA5`,padding:"1rem",textAlign:"center"}}>
                    <p style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 6px",fontWeight:700}}>In prospetto attivo</p>
                    <p style={{fontSize:22,fontWeight:700,color:"#185FA5",fontFamily:"Georgia,serif",margin:0}}>€ {fmt(Math.round(totInProspetto))}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"3px 0 0"}}>{prospettiAttivi.length} prospett{prospettiAttivi.length===1?"o":"i"}</p>
                  </div>
                  <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #0F6E56`,padding:"1rem",textAlign:"center"}}>
                    <p style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 6px",fontWeight:700}}>Già pagato</p>
                    <p style={{fontSize:22,fontWeight:700,color:"#0F6E56",fontFamily:"Georgia,serif",margin:0}}>€ {fmt(Math.round(totPagato))}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"3px 0 0"}}>{prospettiPagati.length} prospett{prospettiPagati.length===1?"o":"i"} chius{prospettiPagati.length===1?"o":"i"}</p>
                  </div>
                </div>

                {/* Tabella righe disponibili */}
                <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1rem"}}>
                  <div style={{padding:"10px 14px",background:"#FDFBF7",borderBottom:"0.5px solid #e8e5e0",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                    <p style={{margin:0,fontSize:13,fontWeight:600,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>Quote disponibili da inserire in un prospetto</p>
                    <span style={{fontSize:12,color:"#888"}}>{righeDisponibili.length} righe</span>
                  </div>
                  {righeDisponibili.length===0?(
                    <div style={{padding:"2rem 1rem",textAlign:"center",color:"#aaa",fontSize:13}}>Nessuna quota disponibile per {agSel.nome}. Tutte le quote sono già in prospetti attivi o non ci sono ancora pratiche con quote.</div>
                  ):(
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
                        <thead><tr style={{background:"#fafaf8"}}>
                          <th style={{padding:"8px 10px",width:36,borderBottom:"0.5px solid #e8e5e0"}}>
                            <input type="checkbox" checked={prospettoSel.length>0&&prospettoSel.length===righeDisponibili.length} onChange={e=>setProspettoSel(e.target.checked?righeDisponibili.map(r=>r.key):[])}/>
                          </th>
                          <th style={{...S.th,fontSize:10}}>Pratica</th>
                          <th style={{...S.th,fontSize:10}}>Data</th>
                          <th style={{...S.th,fontSize:10}}>Ruolo</th>
                          <th style={{...S.th,fontSize:10,textAlign:"center"}}>Cliente pagato?</th>
                          <th style={{...S.th,fontSize:10,textAlign:"right"}}>Quota</th>
                        </tr></thead>
                        <tbody>
                          {righeDisponibili.map(r=>{
                            const isSel = prospettoSel.includes(r.key);
                            const cli = stCli(r.v);
                            return(<tr key={r.key} style={{background:isSel?`${BRAND.oro}10`:"#fff",cursor:"pointer"}} onClick={()=>toggleRiga(r.key)}>
                              <td style={{padding:"8px 10px",borderBottom:"0.5px solid #f0f0f0"}}><input type="checkbox" checked={isSel} onChange={()=>toggleRiga(r.key)} onClick={e=>e.stopPropagation()}/></td>
                              <td style={{...S.td,borderBottom:"0.5px solid #f0f0f0"}}><strong>{r.v.comuneImmobile}</strong> — {r.v.indirizzoImmobile}</td>
                              <td style={{...S.td,color:"#888",fontSize:12,borderBottom:"0.5px solid #f0f0f0",whiteSpace:"nowrap"}}>{fmtD(dataCompAgenzia(r.v))}</td>
                              <td style={{...S.td,borderBottom:"0.5px solid #f0f0f0"}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:ruoloBg[r.ruolo],color:ruoloClr[r.ruolo],fontWeight:600}}>{ruoloLbl[r.ruolo]}</span></td>
                              <td style={{...S.td,textAlign:"center",borderBottom:"0.5px solid #f0f0f0"}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:cli.bg,color:cli.clr,fontWeight:600}}>{cli.ic} {cli.lbl}</span></td>
                              <td style={{...S.td,textAlign:"right",fontWeight:600,borderBottom:"0.5px solid #f0f0f0"}}>€ {fmt(Math.round(r.importo))}</td>
                            </tr>);
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Footer azione */}
                  {prospettoSel.length>0&&<div style={{padding:"12px 14px",background:`${BRAND.oro}11`,borderTop:`1px solid ${BRAND.oro}55`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                    <span style={{fontSize:13,color:BRAND.grigio,fontWeight:500}}>{prospettoSel.length} riga{prospettoSel.length>1?"e":""} selezionate · <strong>€ {fmt(Math.round(righeDisponibili.filter(r=>prospettoSel.includes(r.key)).reduce((s,r)=>s+r.importo,0)))}</strong></span>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setProspettoSel([])} style={{...S.btn,fontSize:12,padding:"6px 12px"}}>Annulla</button>
                      <button onClick={creaProspetto} style={{...S.btn,fontSize:12,padding:"6px 14px",background:BRAND.oro,color:"#fff",border:"none",fontWeight:600}}>📋 Crea prospetto {prossimoNumeroP()} →</button>
                    </div>
                  </div>}
                </div>
              </>}

              {/* ────────────────────── TAB PROSPETTI EMESSI ────────────────────── */}
              {agSel&&fatSubTab==="prospetti"&&<>
                {prospettiAg.length===0?(
                  <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"3rem 1rem",textAlign:"center",color:"#aaa"}}>
                    <p style={{fontSize:14,margin:0}}>Nessun prospetto emesso per {agSel.nome}.</p>
                    <p style={{fontSize:12,margin:"6px 0 0"}}>Vai su "Quote maturate" per crearne uno.</p>
                  </div>
                ):(
                  <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden"}}>
                    <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
                      <thead><tr style={{background:"#fafaf8"}}>
                        {["Prospetto","Data","Pratiche","Importo","N° fatt. agente","Stato","Azioni"].map(h=><th key={h} style={{...S.th,fontSize:10}}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {prospettiAg.map(p=>{
                          const cfg = cfgStatoP[p.statoFlow]||cfgStatoP["inviato"];
                          return(<tr key={p.id} style={{background:p.statoFlow==="annullato"?"#fafafa":"#fff",opacity:p.statoFlow==="annullato"?0.6:1}}>
                            <td style={{...S.td,fontWeight:600,color:BRAND.oroD,borderBottom:"0.5px solid #f0f0f0"}}>{p.numero}</td>
                            <td style={{...S.td,color:"#888",fontSize:12,borderBottom:"0.5px solid #f0f0f0",whiteSpace:"nowrap"}}>{fmtD(p.dataCreazione)}</td>
                            <td style={{...S.td,fontSize:12,color:"#666",borderBottom:"0.5px solid #f0f0f0"}}>{(p.righe||[]).length} pratich{(p.righe||[]).length===1?"a":"e"}</td>
                            <td style={{...S.td,textAlign:"right",fontWeight:600,borderBottom:"0.5px solid #f0f0f0"}}>€ {fmt(Math.round(Number(p.totale||0)))}</td>
                            <td style={{...S.td,fontSize:12,borderBottom:"0.5px solid #f0f0f0"}}>
                              {p.numFatturaAg?<><strong>{p.numFatturaAg}</strong>{p.dataFatturaAg&&<span style={{color:"#888"}}> ({fmtD(p.dataFatturaAg)})</span>}</>:<span style={{color:"#bbb",fontStyle:"italic"}}>in attesa</span>}
                            </td>
                            <td style={{...S.td,borderBottom:"0.5px solid #f0f0f0"}}><span style={{fontSize:11,padding:"3px 10px",borderRadius:4,background:cfg.bg,color:cfg.clr,fontWeight:600}}>{cfg.ic} {cfg.lbl}{p.statoFlow==="pagato"&&p.dataPagamento?` ${fmtD(p.dataPagamento)}`:""}</span></td>
                            <td style={{...S.td,borderBottom:"0.5px solid #f0f0f0"}}>
                              <div style={{display:"flex",gap:6}}>
                                <button onClick={()=>setShowProspetto(p.id)} title="Apri/modifica" style={{background:"none",border:"0.5px solid #ddd",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,color:BRAND.oroD,fontWeight:600}}>Apri</button>
                                <button onClick={()=>setStampaProspetto(p)} title="Stampa PDF" style={{background:"none",border:"0.5px solid #ddd",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:13}}>🖨</button>
                              </div>
                            </td>
                          </tr>);
                        })}
                      </tbody>
                    </table></div>
                  </div>
                )}
              </>}

              {/* ────────────────────── TAB RIEPILOGO (vista d'insieme di tutti gli agenti) ────────────────────── */}
              {fatSubTab==="riepilogo"&&(()=>{
                // Per ogni agente operativo, calcolo i totali
                const annoRiep = fatAnno || annoCorrente;
                const calcolaTotaliAgente = (agId) => {
                  // Quote disponibili (non in prospetto attivo) per l'agente nell'anno
                  let totDaFatturareAg = 0;
                  venduti.forEach(v=>{
                    if(annoRiep!=="Tutti" && getAnno(dataCompAgenzia(v))!==annoRiep) return;
                    ["listing","acquirente","buyerListing","buyer"].forEach(ruolo=>{
                      const importo = calcQuotaPerRuolo(v, agId, ruolo);
                      if(importo<=0) return;
                      const key = `${v.id}_${ruolo}_${agId}`;
                      if(venditoIdOccupati.has(key)) return;
                      totDaFatturareAg += importo;
                    });
                  });
                  // Prospetti dell'agente nell'anno
                  const prospAg = prospetti.filter(p=>p.agenteId===agId && (annoRiep==="Tutti" || (p.dataCreazione||"").startsWith(annoRiep)));
                  const inProspAttivo = prospAg.filter(p=>p.statoFlow!=="annullato"&&p.statoFlow!=="pagato").reduce((s,p)=>s+Number(p.totale||0),0);
                  const pagatoAnno = prospAg.filter(p=>p.statoFlow==="pagato").reduce((s,p)=>s+Number(p.totale||0),0);
                  return {agId, totDaFatturareAg, inProspAttivo, pagatoAnno, totale:totDaFatturareAg+inProspAttivo+pagatoAnno, nProsp:prospAg.length};
                };
                const righeRiep = agentiOperativi.map(a=>({ag:a, ...calcolaTotaliAgente(a.id)}));
                // Ordino per "In attesa pagamento" decrescente (chi devi pagare prima)
                righeRiep.sort((a,b)=>b.inProspAttivo-a.inProspAttivo);
                // Totali generali
                const totGenDaFatt = righeRiep.reduce((s,r)=>s+r.totDaFatturareAg,0);
                const totGenAttesa = righeRiep.reduce((s,r)=>s+r.inProspAttivo,0);
                const totGenPagato = righeRiep.reduce((s,r)=>s+r.pagatoAnno,0);
                const totGenTutto = totGenDaFatt + totGenAttesa + totGenPagato;

                // Lista cronologica pagamenti dell'anno
                const pagamentiAnno = prospetti
                  .filter(p=>p.statoFlow==="pagato" && p.dataPagamento && (annoRiep==="Tutti" || p.dataPagamento.startsWith(annoRiep)))
                  .sort((a,b)=>(b.dataPagamento||"").localeCompare(a.dataPagamento||""));

                return(<>
                  {/* Selettore anno */}
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:"1rem",flexWrap:"wrap"}}>
                    <label style={{fontSize:12,color:"#888",fontWeight:600}}>Anno:</label>
                    <Sel value={fatAnno||annoCorrente} onChange={setFatAnno}>
                      <option value="Tutti">Tutti gli anni</option>
                      {anniVend.map(a=><option key={a}>{a}</option>)}
                    </Sel>
                    <button onClick={()=>setStampaProspetto({_tipoRiepilogo:"aggregato", _anno:annoRiep, _righe:righeRiep, _totali:{totGenDaFatt,totGenAttesa,totGenPagato,totGenTutto}})} style={{...S.btn,fontSize:12,padding:"6px 14px",marginLeft:"auto"}}>🖨 Stampa riepilogo</button>
                    <button onClick={()=>setStampaProspetto({_tipoRiepilogo:"dettagliato", _anno:annoRiep, _righe:righeRiep, _pagamenti:pagamentiAnno})} style={{...S.btn,fontSize:12,padding:"6px 14px"}}>🖨 Stampa dettagliato</button>
                  </div>

                  {/* 4 KPI generali */}
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
                    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #BA7517`,padding:"1rem",textAlign:"center"}}>
                      <p style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 6px",fontWeight:700}}>Da fatturare</p>
                      <p style={{fontSize:20,fontWeight:700,color:"#BA7517",fontFamily:"Georgia,serif",margin:0}}>€ {fmt(Math.round(totGenDaFatt))}</p>
                      <p style={{fontSize:10,color:"#aaa",margin:"3px 0 0"}}>quote disponibili</p>
                    </div>
                    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #185FA5`,padding:"1rem",textAlign:"center"}}>
                      <p style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 6px",fontWeight:700}}>In attesa pagamento</p>
                      <p style={{fontSize:20,fontWeight:700,color:"#185FA5",fontFamily:"Georgia,serif",margin:0}}>€ {fmt(Math.round(totGenAttesa))}</p>
                      <p style={{fontSize:10,color:"#aaa",margin:"3px 0 0"}}>prospetti aperti</p>
                    </div>
                    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #0F6E56`,padding:"1rem",textAlign:"center"}}>
                      <p style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 6px",fontWeight:700}}>Già pagato {annoRiep}</p>
                      <p style={{fontSize:20,fontWeight:700,color:"#0F6E56",fontFamily:"Georgia,serif",margin:0}}>€ {fmt(Math.round(totGenPagato))}</p>
                      <p style={{fontSize:10,color:"#aaa",margin:"3px 0 0"}}>bonifici effettuati</p>
                    </div>
                    <div style={{background:`linear-gradient(135deg, ${BRAND.oro}18, ${BRAND.oro}08)`,borderRadius:10,border:`1px solid ${BRAND.oro}55`,borderTop:`3px solid ${BRAND.oro}`,padding:"1rem",textAlign:"center"}}>
                      <p style={{fontSize:10,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 6px",fontWeight:700}}>Totale movimentato</p>
                      <p style={{fontSize:20,fontWeight:700,color:BRAND.oroD,fontFamily:"Georgia,serif",margin:0}}>€ {fmt(Math.round(totGenTutto))}</p>
                      <p style={{fontSize:10,color:BRAND.oroD,margin:"3px 0 0",opacity:0.7}}>anno {annoRiep}</p>
                    </div>
                  </div>

                  {/* Tabella per agente */}
                  <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1.25rem"}}>
                    <div style={{padding:"10px 14px",background:"#FDFBF7",borderBottom:"0.5px solid #e8e5e0"}}>
                      <p style={{margin:0,fontSize:13,fontWeight:600,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>Dettaglio per agente · ordinato per priorità di pagamento</p>
                      <p style={{margin:"3px 0 0",fontSize:11,color:"#888"}}>Gli agenti con prospetti in attesa di bonifico appaiono in cima. Clicca su una riga per aprire la vista di quell'agente.</p>
                    </div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
                        <thead><tr style={{background:"#fafaf8"}}>
                          {["Agente","N° prosp.","Da fatturare","In attesa pagam.","Pagato " + annoRiep,"Totale"].map((h,i)=><th key={h} style={{...S.th,fontSize:10,textAlign:i<2?"left":"right"}}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {righeRiep.map(r=>(<tr key={r.agId} onClick={()=>{setFatAgente(String(r.agId));setFatSubTab("quote");}} style={{cursor:"pointer",borderBottom:"0.5px solid #f0f0f0"}}>
                            <td style={{...S.td,fontWeight:500}}>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{r.ag.nome.charAt(0)}</div>
                                <div>
                                  <div style={{fontSize:13,color:BRAND.grigio,fontWeight:600}}>{r.ag.nome} {r.ag.cognome}</div>
                                  <div style={{fontSize:10,color:"#aaa"}}>{r.ag.profilo}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{...S.td,color:"#888"}}>{r.nProsp}</td>
                            <td style={{...S.td,textAlign:"right",color:r.totDaFatturareAg>0?"#BA7517":"#ccc",fontWeight:r.totDaFatturareAg>0?600:400}}>{r.totDaFatturareAg>0?`€ ${fmt(Math.round(r.totDaFatturareAg))}`:"—"}</td>
                            <td style={{...S.td,textAlign:"right",color:r.inProspAttivo>0?"#185FA5":"#ccc",fontWeight:r.inProspAttivo>0?700:400}}>{r.inProspAttivo>0?`€ ${fmt(Math.round(r.inProspAttivo))}`:"—"}</td>
                            <td style={{...S.td,textAlign:"right",color:r.pagatoAnno>0?"#0F6E56":"#ccc",fontWeight:r.pagatoAnno>0?600:400}}>{r.pagatoAnno>0?`€ ${fmt(Math.round(r.pagatoAnno))}`:"—"}</td>
                            <td style={{...S.td,textAlign:"right",color:BRAND.oroD,fontWeight:700}}>€ {fmt(Math.round(r.totale))}</td>
                          </tr>))}
                        </tbody>
                        <tfoot><tr style={{background:`${BRAND.oro}15`,fontWeight:700}}>
                          <td style={{padding:"10px 12px",fontFamily:"Georgia,serif",borderTop:`1.5px solid ${BRAND.oro}`}}>TOTALE</td>
                          <td style={{padding:"10px 12px",borderTop:`1.5px solid ${BRAND.oro}`,color:"#888"}}>{righeRiep.reduce((s,r)=>s+r.nProsp,0)}</td>
                          <td style={{padding:"10px 12px",textAlign:"right",color:"#BA7517",borderTop:`1.5px solid ${BRAND.oro}`}}>€ {fmt(Math.round(totGenDaFatt))}</td>
                          <td style={{padding:"10px 12px",textAlign:"right",color:"#185FA5",borderTop:`1.5px solid ${BRAND.oro}`}}>€ {fmt(Math.round(totGenAttesa))}</td>
                          <td style={{padding:"10px 12px",textAlign:"right",color:"#0F6E56",borderTop:`1.5px solid ${BRAND.oro}`}}>€ {fmt(Math.round(totGenPagato))}</td>
                          <td style={{padding:"10px 12px",textAlign:"right",color:BRAND.oroD,borderTop:`1.5px solid ${BRAND.oro}`,fontSize:14}}>€ {fmt(Math.round(totGenTutto))}</td>
                        </tr></tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Pagamenti effettuati nell'anno */}
                  {pagamentiAnno.length>0&&<div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",background:"#FDFBF7",borderBottom:"0.5px solid #e8e5e0"}}>
                      <p style={{margin:0,fontSize:13,fontWeight:600,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>Bonifici effettuati nel {annoRiep}</p>
                      <p style={{margin:"3px 0 0",fontSize:11,color:"#888"}}>{pagamentiAnno.length} pagament{pagamentiAnno.length===1?"o":"i"} · totale € {fmt(Math.round(totGenPagato))}</p>
                    </div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
                        <thead><tr style={{background:"#fafaf8"}}>
                          {["Data bonifico","Agente","Prospetto","N° fatt. agente","Importo"].map((h,i)=><th key={h} style={{...S.th,fontSize:10,textAlign:i<4?"left":"right"}}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {pagamentiAnno.map(p=>{
                            const ag = agenti.find(a=>a.id===p.agenteId);
                            return(<tr key={p.id} onClick={()=>{setFatAgente(String(p.agenteId));setFatSubTab("prospetti");setTimeout(()=>setShowProspetto(p.id),100);}} style={{cursor:"pointer",borderBottom:"0.5px solid #f0f0f0"}}>
                              <td style={{...S.td,color:"#888",whiteSpace:"nowrap"}}>{fmtD(p.dataPagamento)}</td>
                              <td style={{...S.td,fontWeight:500}}>{ag?.nome} {ag?.cognome}</td>
                              <td style={{...S.td,fontWeight:600,color:BRAND.oroD}}>{p.numero}</td>
                              <td style={{...S.td,fontSize:12}}>{p.numFatturaAg||<span style={{color:"#bbb",fontStyle:"italic"}}>—</span>}</td>
                              <td style={{...S.td,textAlign:"right",fontWeight:600,color:"#0F6E56"}}>€ {fmt(Math.round(Number(p.totale||0)))}</td>
                            </tr>);
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>}
                </>);
              })()}


              {prAttivo&&(()=>{
                const cfg = cfgStatoP[prAttivo.statoFlow]||cfgStatoP["inviato"];
                const agProsp = agenti.find(a=>a.id===prAttivo.agenteId);
                return(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowProspetto(null)}>
                  <div style={{...S.modal,maxWidth:680}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem",paddingBottom:"0.875rem",borderBottom:`2px solid ${BRAND.oro}`,flexWrap:"wrap",gap:8}}>
                      <div>
                        <p style={{fontSize:11,color:BRAND.oroD,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>Prospetto</p>
                        <h3 style={{margin:0,fontSize:22,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>{prAttivo.numero}</h3>
                        <p style={{margin:"4px 0 0",fontSize:13,color:"#666"}}>Beneficiario: <strong>{agProsp?.nome} {agProsp?.cognome}</strong></p>
                        <p style={{margin:"2px 0 0",fontSize:11,color:"#aaa"}}>Creato il {fmtD(prAttivo.dataCreazione)}</p>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:12,padding:"4px 12px",borderRadius:4,background:cfg.bg,color:cfg.clr,fontWeight:600}}>{cfg.ic} {cfg.lbl}</span>
                        <button onClick={()=>setShowProspetto(null)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#888",padding:0,lineHeight:1}}>×</button>
                      </div>
                    </div>

                    {/* Righe del prospetto */}
                    <p style={{margin:"0 0 8px",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Dettaglio righe</p>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:"1rem"}}>
                      <thead><tr style={{background:"#fafaf8"}}>
                        <th style={{padding:"6px 8px",textAlign:"left",fontWeight:600,color:"#666",borderBottom:"0.5px solid #e8e5e0"}}>Pratica</th>
                        <th style={{padding:"6px 8px",textAlign:"left",fontWeight:600,color:"#666",borderBottom:"0.5px solid #e8e5e0"}}>Ruolo</th>
                        <th style={{padding:"6px 8px",textAlign:"right",fontWeight:600,color:"#666",borderBottom:"0.5px solid #e8e5e0"}}>Importo</th>
                      </tr></thead>
                      <tbody>
                        {(prAttivo.righe||[]).map((r,i)=>{
                          const v = venduti.find(x=>x.id===r.venditoId);
                          if(!v) return(<tr key={i}><td colSpan={3} style={{padding:"6px 8px",color:"#aaa",fontStyle:"italic"}}>Pratica eliminata</td></tr>);
                          return(<tr key={i} style={{borderBottom:"0.5px solid #f5f5f5"}}>
                            <td style={{padding:"6px 8px"}}><strong>{v.comuneImmobile}</strong> — {v.indirizzoImmobile}<div style={{fontSize:10,color:"#aaa"}}>{v.nominativoVenditore?`Vend: ${v.nominativoVenditore}`:""} {v.nomeAcquirente?` · Acq: ${v.nomeAcquirente}`:""}</div></td>
                            <td style={{padding:"6px 8px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:ruoloBg[r.ruolo],color:ruoloClr[r.ruolo],fontWeight:600}}>{ruoloLbl[r.ruolo]}</span></td>
                            <td style={{padding:"6px 8px",textAlign:"right",fontWeight:600}}>€ {fmt(Math.round(r.importo))}</td>
                          </tr>);
                        })}
                      </tbody>
                      <tfoot><tr style={{background:`${BRAND.oro}15`,fontWeight:700}}>
                        <td colSpan={2} style={{padding:"8px",borderTop:`1.5px solid ${BRAND.oro}`}}>TOTALE</td>
                        <td style={{padding:"8px",textAlign:"right",fontSize:14,color:BRAND.oroD,borderTop:`1.5px solid ${BRAND.oro}`}}>€ {fmt(Math.round(Number(prAttivo.totale||0)))}</td>
                      </tr></tfoot>
                    </table>

                    {/* Sezione fattura agente */}
                    {prAttivo.statoFlow!=="annullato"&&<>
                      <p style={{margin:"1rem 0 8px",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Fattura ricevuta dall'agente</p>
                      <div style={{background:"#fafaf8",borderRadius:8,padding:"12px 14px",marginBottom:"1rem"}}>
                        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
                          <div>
                            <label style={{fontSize:11,color:"#888",fontWeight:500,display:"block",marginBottom:4}}>N° fattura agente</label>
                            <input type="text" value={prAttivo.numFatturaAg||""} placeholder="es. 18/2026"
                              onChange={e=>aggProspetto(prAttivo.id,{numFatturaAg:e.target.value, statoFlow:e.target.value&&prAttivo.statoFlow==="inviato"?"fatturato":prAttivo.statoFlow})}
                              style={{...S.inp,width:"100%"}}/>
                          </div>
                          <div>
                            <label style={{fontSize:11,color:"#888",fontWeight:500,display:"block",marginBottom:4}}>Data emissione fattura</label>
                            <input type="date" value={prAttivo.dataFatturaAg||""}
                              onChange={e=>aggProspetto(prAttivo.id,{dataFatturaAg:e.target.value})}
                              style={{...S.inp,width:"100%"}}/>
                          </div>
                        </div>
                      </div>

                      {/* Sezione pagamento */}
                      <p style={{margin:"1rem 0 8px",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Pagamento bonifico</p>
                      <div style={{background:"#fafaf8",borderRadius:8,padding:"12px 14px",marginBottom:"1rem"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10}}>
                          <div>
                            <label style={{fontSize:11,color:"#888",fontWeight:500,display:"block",marginBottom:4}}>Data bonifico</label>
                            <input type="date" value={prAttivo.dataPagamento||""}
                              onChange={e=>{
                                const nuovaData = e.target.value;
                                const nuovoStato = nuovaData ? "pagato" : (prAttivo.numFatturaAg?"fatturato":"inviato");
                                aggProspetto(prAttivo.id,{dataPagamento:nuovaData, statoFlow:nuovoStato});
                              }}
                              style={{...S.inp,width:"100%",maxWidth:240}}/>
                            <p style={{margin:"4px 0 0",fontSize:10,color:"#aaa"}}>Metodo: bonifico bancario (default)</p>
                          </div>
                        </div>
                      </div>

                      {/* Note */}
                      <p style={{margin:"1rem 0 8px",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Note (opzionale)</p>
                      <textarea value={prAttivo.note||""} onChange={e=>aggProspetto(prAttivo.id,{note:e.target.value})} placeholder="es. eventuali appunti..." style={{...S.inp,width:"100%",minHeight:60,resize:"vertical",fontFamily:"inherit",marginBottom:"1rem"}}/>
                    </>}

                    {prAttivo.statoFlow==="annullato"&&<div style={{background:"#FCEBEB",border:"1px solid #E24B4A33",borderRadius:8,padding:"10px 14px",marginBottom:"1rem",fontSize:12,color:"#791F1F"}}>
                      ⚠ Questo prospetto è stato annullato. Le pratiche sono tornate disponibili per essere inserite in un nuovo prospetto.
                    </div>}

                    {/* Azioni in basso */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"0.875rem",borderTop:"0.5px solid #e8e5e0",flexWrap:"wrap",gap:8}}>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>setStampaProspetto(prAttivo)} style={{...S.btn,fontSize:12,padding:"6px 14px",fontWeight:600}}>🖨 Stampa / PDF</button>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        {prAttivo.statoFlow!=="pagato"&&prAttivo.statoFlow!=="annullato"&&<button onClick={()=>annullaProspetto(prAttivo.id)} style={{...S.btn,fontSize:12,padding:"6px 14px",color:"#A32D2D",border:"0.5px solid #E24B4A66"}}>Annulla prospetto</button>}
                        {prAttivo.statoFlow==="annullato"&&<button onClick={()=>eliminaProspetto(prAttivo.id)} style={{...S.btn,fontSize:12,padding:"6px 14px",color:"#fff",background:"#A32D2D",border:"none"}}>🗑 Elimina definitivamente</button>}
                        <button onClick={()=>setShowProspetto(null)} style={{...S.btnP,fontSize:12,padding:"6px 14px"}}>Chiudi</button>
                      </div>
                    </div>
                  </div>
                </div>);
              })()}

              {/* ────────────────────── STAMPA PROSPETTO / RIEPILOGO (PDF-friendly) ────────────────────── */}
              {stampaProspetto&&(()=>{
                // Branch 1: stampa singolo prospetto (comportamento originale)
                // Branch 2: stampa riepilogo aggregato (_tipoRiepilogo === "aggregato")
                // Branch 3: stampa riepilogo dettagliato (_tipoRiepilogo === "dettagliato")
                const isRiepilogoAgg = stampaProspetto._tipoRiepilogo==="aggregato";
                const isRiepilogoDett = stampaProspetto._tipoRiepilogo==="dettagliato";
                const isProspettoSingolo = !isRiepilogoAgg && !isRiepilogoDett;
                const agProsp = isProspettoSingolo ? agenti.find(a=>a.id===stampaProspetto.agenteId) : null;
                return(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setStampaProspetto(null)}>
                  <div style={{...S.modal,maxWidth:780,maxHeight:"90vh",overflowY:"auto"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",gap:8}}>
                      <p style={{margin:0,fontSize:13,color:"#888"}}>Anteprima stampa</p>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>window.print()} style={{...S.btnP,fontSize:12,padding:"6px 14px"}}>🖨 Stampa</button>
                        <button onClick={()=>setStampaProspetto(null)} style={{...S.btn,fontSize:12,padding:"6px 14px"}}>Chiudi</button>
                      </div>
                    </div>
                    <div style={{background:"#fff",border:`1px solid ${BRAND.oro}`,borderRadius:10,padding:"2rem",color:BRAND.grigio}} id="stampa-prospetto-area">
                    {/* ════════════════════ BRANCH: STAMPA PROSPETTO SINGOLO ════════════════════ */}
                    {isProspettoSingolo&&<>
                      {/* Intestazione */}
                      <div style={{borderBottom:`2px solid ${BRAND.oro}`,paddingBottom:"1.25rem",marginBottom:"1.25rem",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                        <div>
                          <div style={{fontSize:32,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif",letterSpacing:"-0.02em"}}>casa</div>
                          <div style={{fontSize:10,letterSpacing:"0.3em",color:BRAND.grigio,borderTop:`1px solid ${BRAND.grigio}`,paddingTop:3,marginTop:2}}>IMMOBILIARE</div>
                          <p style={{margin:"8px 0 0",fontSize:11,color:"#888"}}>Càsa Immobiliare Varese</p>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <p style={{fontSize:11,color:"#888",margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.1em"}}>Prospetto compensi</p>
                          <p style={{fontSize:24,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif",margin:"0 0 4px"}}>{stampaProspetto.numero}</p>
                          <p style={{fontSize:12,color:"#666",margin:0}}>{fmtD(stampaProspetto.dataCreazione)}</p>
                        </div>
                      </div>

                      {/* Beneficiario */}
                      <div style={{marginBottom:"1.5rem"}}>
                        <p style={{margin:0,fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Beneficiario</p>
                        <p style={{margin:"4px 0 0",fontSize:18,fontWeight:600,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>{agProsp?.nome} {agProsp?.cognome}</p>
                        <p style={{margin:"2px 0 0",fontSize:12,color:"#888"}}>{agProsp?.profilo}</p>
                      </div>

                      {/* Tabella pratiche */}
                      <p style={{margin:"0 0 10px",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Dettaglio pratiche</p>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead><tr style={{background:"#F1EFE8"}}>
                          <th style={{textAlign:"left",padding:"8px 10px",fontWeight:600,fontSize:11,color:BRAND.grigio}}>Pratica / Immobile</th>
                          <th style={{textAlign:"left",padding:"8px 10px",fontWeight:600,fontSize:11,color:BRAND.grigio}}>Cliente</th>
                          <th style={{textAlign:"left",padding:"8px 10px",fontWeight:600,fontSize:11,color:BRAND.grigio}}>Ruolo</th>
                          <th style={{textAlign:"right",padding:"8px 10px",fontWeight:600,fontSize:11,color:BRAND.grigio}}>Importo</th>
                        </tr></thead>
                        <tbody>
                          {(stampaProspetto.righe||[]).map((r,i)=>{
                            const v = venduti.find(x=>x.id===r.venditoId);
                            if(!v) return null;
                            const cliente = r.ruolo==="listing"||r.ruolo==="buyerListing" ? (v.nominativoVenditore||"—") : (v.nomeAcquirente||"—");
                            return(<tr key={i} style={{borderBottom:"0.5px solid #D3D1C7"}}>
                              <td style={{padding:"8px 10px"}}><strong>{v.comuneImmobile}</strong> — {v.indirizzoImmobile}</td>
                              <td style={{padding:"8px 10px",color:"#666"}}>{cliente}</td>
                              <td style={{padding:"8px 10px",color:"#666"}}>{ruoloLbl[r.ruolo]}</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:500}}>€ {fmt(Math.round(r.importo))}</td>
                            </tr>);
                          })}
                        </tbody>
                        <tfoot><tr>
                          <td colSpan={3} style={{padding:"12px 10px",fontWeight:700,fontSize:13,borderTop:`2px solid ${BRAND.grigio}`}}>TOTALE DA FATTURARE</td>
                          <td style={{padding:"12px 10px",textAlign:"right",fontWeight:700,fontSize:16,color:BRAND.oroD,borderTop:`2px solid ${BRAND.grigio}`,fontFamily:"Georgia,serif"}}>€ {fmt(Math.round(Number(stampaProspetto.totale||0)))}</td>
                        </tr></tfoot>
                      </table>

                      <div style={{marginTop:"1.5rem",padding:"12px 14px",background:"#F1EFE8",borderRadius:6,fontSize:11,color:"#5F5E5A",lineHeight:1.6}}>
                        Cortesemente emettere fattura per l'importo indicato. Modalità di pagamento concordata: bonifico bancario.
                      </div>

                      {stampaProspetto.note&&<div style={{marginTop:"1rem",padding:"10px 14px",background:"#fafaf8",borderRadius:6,fontSize:11,color:"#666",lineHeight:1.6,fontStyle:"italic"}}>
                        <strong>Note:</strong> {stampaProspetto.note}
                      </div>}
                    </>}

                    {/* ════════════════════ BRANCH: STAMPA RIEPILOGO AGGREGATO ════════════════════ */}
                    {isRiepilogoAgg&&<>
                      <div style={{borderBottom:`2px solid ${BRAND.oro}`,paddingBottom:"1.25rem",marginBottom:"1.25rem",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                        <div>
                          <div style={{fontSize:32,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif",letterSpacing:"-0.02em"}}>casa</div>
                          <div style={{fontSize:10,letterSpacing:"0.3em",color:BRAND.grigio,borderTop:`1px solid ${BRAND.grigio}`,paddingTop:3,marginTop:2}}>IMMOBILIARE</div>
                          <p style={{margin:"8px 0 0",fontSize:11,color:"#888"}}>Càsa Immobiliare Varese</p>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <p style={{fontSize:11,color:"#888",margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.1em"}}>Riepilogo compensi agenti</p>
                          <p style={{fontSize:24,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif",margin:"0 0 4px"}}>Anno {stampaProspetto._anno}</p>
                          <p style={{fontSize:12,color:"#666",margin:0}}>Generato il {fmtD(todayStr())}</p>
                        </div>
                      </div>

                      <p style={{margin:"0 0 10px",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Vista d'insieme — tutti gli agenti</p>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead><tr style={{background:"#F1EFE8"}}>
                          {["Agente","Profilo","Da fatturare","In attesa pag.","Pagato","Totale"].map((h,i)=><th key={h} style={{textAlign:i<2?"left":"right",padding:"8px 10px",fontWeight:600,fontSize:11,color:BRAND.grigio}}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {(stampaProspetto._righe||[]).map(r=>(<tr key={r.agId} style={{borderBottom:"0.5px solid #D3D1C7"}}>
                            <td style={{padding:"8px 10px",fontWeight:500}}>{r.ag.nome} {r.ag.cognome}</td>
                            <td style={{padding:"8px 10px",color:"#666",fontSize:11}}>{r.ag.profilo}</td>
                            <td style={{padding:"8px 10px",textAlign:"right"}}>{r.totDaFatturareAg>0?`€ ${fmt(Math.round(r.totDaFatturareAg))}`:"—"}</td>
                            <td style={{padding:"8px 10px",textAlign:"right",fontWeight:r.inProspAttivo>0?600:400}}>{r.inProspAttivo>0?`€ ${fmt(Math.round(r.inProspAttivo))}`:"—"}</td>
                            <td style={{padding:"8px 10px",textAlign:"right"}}>{r.pagatoAnno>0?`€ ${fmt(Math.round(r.pagatoAnno))}`:"—"}</td>
                            <td style={{padding:"8px 10px",textAlign:"right",fontWeight:600}}>€ {fmt(Math.round(r.totale))}</td>
                          </tr>))}
                        </tbody>
                        <tfoot><tr>
                          <td colSpan={2} style={{padding:"12px 10px",fontWeight:700,fontSize:12,borderTop:`2px solid ${BRAND.grigio}`}}>TOTALI GENERALI</td>
                          <td style={{padding:"12px 10px",textAlign:"right",fontWeight:700,borderTop:`2px solid ${BRAND.grigio}`}}>€ {fmt(Math.round(stampaProspetto._totali.totGenDaFatt))}</td>
                          <td style={{padding:"12px 10px",textAlign:"right",fontWeight:700,borderTop:`2px solid ${BRAND.grigio}`}}>€ {fmt(Math.round(stampaProspetto._totali.totGenAttesa))}</td>
                          <td style={{padding:"12px 10px",textAlign:"right",fontWeight:700,borderTop:`2px solid ${BRAND.grigio}`}}>€ {fmt(Math.round(stampaProspetto._totali.totGenPagato))}</td>
                          <td style={{padding:"12px 10px",textAlign:"right",fontWeight:700,fontSize:14,color:BRAND.oroD,borderTop:`2px solid ${BRAND.grigio}`,fontFamily:"Georgia,serif"}}>€ {fmt(Math.round(stampaProspetto._totali.totGenTutto))}</td>
                        </tr></tfoot>
                      </table>

                      <div style={{marginTop:"1.5rem",padding:"12px 14px",background:"#F1EFE8",borderRadius:6,fontSize:11,color:"#5F5E5A",lineHeight:1.6}}>
                        Documento di sintesi compensi agenti per l'anno {stampaProspetto._anno}. Per il dettaglio analitico per agente, consultare il prospetto stampabile dettagliato.
                      </div>
                    </>}

                    {/* ════════════════════ BRANCH: STAMPA RIEPILOGO DETTAGLIATO ════════════════════ */}
                    {isRiepilogoDett&&<>
                      <div style={{borderBottom:`2px solid ${BRAND.oro}`,paddingBottom:"1.25rem",marginBottom:"1.25rem",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                        <div>
                          <div style={{fontSize:32,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif",letterSpacing:"-0.02em"}}>casa</div>
                          <div style={{fontSize:10,letterSpacing:"0.3em",color:BRAND.grigio,borderTop:`1px solid ${BRAND.grigio}`,paddingTop:3,marginTop:2}}>IMMOBILIARE</div>
                          <p style={{margin:"8px 0 0",fontSize:11,color:"#888"}}>Càsa Immobiliare Varese</p>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <p style={{fontSize:11,color:"#888",margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.1em"}}>Riepilogo dettagliato</p>
                          <p style={{fontSize:24,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif",margin:"0 0 4px"}}>Anno {stampaProspetto._anno}</p>
                          <p style={{fontSize:12,color:"#666",margin:0}}>Generato il {fmtD(todayStr())}</p>
                        </div>
                      </div>

                      <p style={{margin:"0 0 10px",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Bonifici effettuati nell'anno</p>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:"1.5rem"}}>
                        <thead><tr style={{background:"#F1EFE8"}}>
                          {["Data","Agente","Prospetto","N° fatt.","Importo"].map((h,i)=><th key={h} style={{textAlign:i<4?"left":"right",padding:"8px 10px",fontWeight:600,fontSize:11,color:BRAND.grigio}}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {(stampaProspetto._pagamenti||[]).map(p=>{
                            const ag = agenti.find(a=>a.id===p.agenteId);
                            return(<tr key={p.id} style={{borderBottom:"0.5px solid #D3D1C7"}}>
                              <td style={{padding:"8px 10px",color:"#666",whiteSpace:"nowrap"}}>{fmtD(p.dataPagamento)}</td>
                              <td style={{padding:"8px 10px",fontWeight:500}}>{ag?.nome} {ag?.cognome}</td>
                              <td style={{padding:"8px 10px",fontWeight:500,color:BRAND.oroD}}>{p.numero}</td>
                              <td style={{padding:"8px 10px",fontSize:11}}>{p.numFatturaAg||"—"}</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:600}}>€ {fmt(Math.round(Number(p.totale||0)))}</td>
                            </tr>);
                          })}
                        </tbody>
                        <tfoot><tr>
                          <td colSpan={4} style={{padding:"12px 10px",fontWeight:700,fontSize:13,borderTop:`2px solid ${BRAND.grigio}`}}>TOTALE PAGATO {stampaProspetto._anno}</td>
                          <td style={{padding:"12px 10px",textAlign:"right",fontWeight:700,fontSize:16,color:BRAND.oroD,borderTop:`2px solid ${BRAND.grigio}`,fontFamily:"Georgia,serif"}}>€ {fmt(Math.round((stampaProspetto._pagamenti||[]).reduce((s,p)=>s+Number(p.totale||0),0)))}</td>
                        </tr></tfoot>
                      </table>

                      {/* Per ogni agente con pagamenti, dettaglio pratiche */}
                      {(stampaProspetto._righe||[]).filter(r=>r.pagatoAnno>0).map(r=>{
                        const prospAgPagati = prospetti.filter(p=>p.agenteId===r.agId && p.statoFlow==="pagato" && (stampaProspetto._anno==="Tutti" || (p.dataPagamento||"").startsWith(stampaProspetto._anno)));
                        if(prospAgPagati.length===0) return null;
                        return(<div key={r.agId} style={{marginTop:"1.25rem",paddingTop:"1.25rem",borderTop:"0.5px solid #D3D1C7"}}>
                          <p style={{margin:"0 0 8px",fontSize:13,fontWeight:600,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>{r.ag.nome} {r.ag.cognome} — totale pagato: € {fmt(Math.round(r.pagatoAnno))}</p>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                            <thead><tr><th style={{textAlign:"left",padding:"5px 8px",fontWeight:600,color:"#888"}}>Prospetto</th><th style={{textAlign:"left",padding:"5px 8px",fontWeight:600,color:"#888"}}>Data bonif.</th><th style={{textAlign:"left",padding:"5px 8px",fontWeight:600,color:"#888"}}>N° fatt.</th><th style={{textAlign:"left",padding:"5px 8px",fontWeight:600,color:"#888"}}>Pratiche</th><th style={{textAlign:"right",padding:"5px 8px",fontWeight:600,color:"#888"}}>Importo</th></tr></thead>
                            <tbody>
                              {prospAgPagati.map(p=>(<tr key={p.id} style={{borderBottom:"0.5px solid #F1EFE8"}}>
                                <td style={{padding:"4px 8px",color:BRAND.oroD,fontWeight:500}}>{p.numero}</td>
                                <td style={{padding:"4px 8px",color:"#666"}}>{fmtD(p.dataPagamento)}</td>
                                <td style={{padding:"4px 8px",color:"#666"}}>{p.numFatturaAg||"—"}</td>
                                <td style={{padding:"4px 8px",color:"#666"}}>{(p.righe||[]).length}</td>
                                <td style={{padding:"4px 8px",textAlign:"right",fontWeight:500}}>€ {fmt(Math.round(Number(p.totale||0)))}</td>
                              </tr>))}
                            </tbody>
                          </table>
                        </div>);
                      })}
                    </>}
                    </div>
                  </div>
                </div>);
              })()}

            </div>);
          })()}

          {/* AGENTI */}
          {tab==="Agenti"&&(<div style={S.sec}>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}><button style={S.btnP} onClick={()=>{setFormAgente({nome:"",cognome:"",profilo:"Consulente",tipo:"Interno",percListing:0,percAcquirente:0,email:"",password:"",attivo:true});setShowAgente("new");}}>+ Nuovo agente</button></div>
            <div style={S.tblWrap}><table style={{...S.tbl,minWidth:500}}>
              <thead><tr>{["Nome","Profilo","Email accesso","Password","Stato","% L","% A","Azioni"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{agenti.map(a=>(<tr key={a.id} style={{opacity:a.attivo===false?0.6:1}}>
                <td style={S.td}><strong>{a.nome} {a.cognome}</strong></td>
                <td style={S.td}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,fontWeight:500,background:a.profilo==="Broker"?`${BRAND.oro}22`:a.profilo==="Consulente"?"#EAF4FB":"#F0F0F0",color:a.profilo==="Broker"?BRAND.oroD:a.profilo==="Consulente"?"#2980B9":"#666"}}>{a.profilo}</span></td>
                <td style={S.td}><span style={{fontSize:12,color:a.email?"#555":"#ccc"}}>{a.email||"—"}</span></td>
                <td style={S.td}><span style={{fontSize:12,color:a.password?"#555":"#ccc",letterSpacing:a.password?"0.15em":"normal"}}>{a.password?"••••••••":"—"}</span></td>
                <td style={S.tdC}>
                  {a.profilo==="Broker"
                    ? <span style={{fontSize:11,color:"#aaa"}}>—</span>
                    : <span style={{fontSize:11,padding:"2px 8px",borderRadius:4,fontWeight:500,background:a.attivo!==false?"#E9F7EF":"#FDECEA",color:a.attivo!==false?"#27AE60":"#E74C3C",border:`0.5px solid ${a.attivo!==false?"#27AE60":"#E74C3C"}`}}>{a.attivo!==false?"Attivo":"Bloccato"}</span>
                  }
                </td>
                <td style={S.tdC}>{a.profilo==="Broker"?"—":`${a.percListing}%`}</td>
                <td style={S.tdC}>{a.profilo==="Broker"?"—":`${a.percAcquirente}%`}</td>
                <td style={S.td} onClick={e=>e.stopPropagation()}><div style={{display:"flex",gap:4}}>
                  <button style={{...S.btnP,fontSize:12,padding:"4px 8px"}} onClick={()=>{setFormAgente({...a});setShowAgente(a);}}>Modifica</button>
                  {a.profilo!=="Broker"&&<button style={{...S.btn,fontSize:12,padding:"4px 8px",color:a.attivo!==false?"#E74C3C":"#27AE60",borderColor:a.attivo!==false?"#E74C3C":"#27AE60"}} onClick={()=>setAgenti(agenti.map(x=>x.id===a.id?{...x,attivo:a.attivo===false}:x))}>{a.attivo!==false?"🔒 Blocca":"🔓 Attiva"}</button>}
                  {a.profilo!=="Broker"&&<button style={S.btnD} onClick={()=>{if(window.confirm(`Eliminare ${a.nome} ${a.cognome}?`))setAgenti(agenti.filter(x=>x.id!==a.id));}}>Elimina</button>}
                </div></td>
              </tr>))}</tbody>
            </table></div>
            <p style={{fontSize:11,color:"#aaa",marginTop:8}}>💡 La password è visibile solo in modifica. Gli agenti bloccati non possono accedere ma i loro dati restano invariati.</p>
          </div>)}


          {/* ── TAB COSTI ── */}
          {/* ── TAB BREAK EVEN ── */}
          {tab==="Break Even"&&(isBroker||isBackOffice)&&(<div style={S.sec}>
            <div style={{display:"flex",gap:12,marginBottom:"1.5rem",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
              <h2 style={{fontSize:16,fontWeight:600,margin:0,color:"#2C2C2C"}}>📉 Break Even — {costiAnno}</h2>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <select style={S.sel} value={costiAnno} onChange={e=>setCostiAnno(e.target.value)}>
                  {[...new Set([annoCorrente,...Object.keys(costi),...Object.keys(breakEvenManuale||{})])].sort().reverse().map(a=><option key={a}>{a}</option>)}
                </select>
                <div style={{display:"flex",gap:4}}>
                  {[["fissi","Solo fissi"],["fissi+variabili","Fissi + Variabili"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setCostiBreakevenMode(v)} style={{fontSize:11,padding:"5px 12px",borderRadius:6,border:`1px solid ${costiBreakevenMode===v?"#E74C3C":"#ddd"}`,background:costiBreakevenMode===v?"#FDECEA":"#fff",color:costiBreakevenMode===v?"#E74C3C":"#888",cursor:"pointer",fontWeight:costiBreakevenMode===v?600:400}}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            {(()=>{
              // Calcolo preventivo (catCosti) e consuntivo (speseCosti)
              // === LOGICA PREVISIONALE INTELLIGENTE (uguale al TAB Costi) ===
              let annoPrevBE=costiAnno;
              const catAnnosBE=(()=>{
                const byAnno=catCosti.filter(x=>String(x.anno)===costiAnno&&!x.agentId);
                const haDatiPieni = byAnno.some(c => Number(c.totaleAnno||0) > 0);
                if(byAnno.length>0 && haDatiPieni) return byAnno;
                // Fallback: cerco l'anno più recente CON dati pieni
                const tuttiAnni=[...new Set(catCosti.filter(x=>!x.agentId).map(x=>x.anno))].sort((a,b)=>b-a);
                for(const anno of tuttiAnni){
                  if(String(anno)===costiAnno) continue;
                  const cats = catCosti.filter(x=>x.anno===anno&&!x.agentId);
                  if(cats.some(c=>Number(c.totaleAnno||0)>0)){
                    annoPrevBE=String(anno);
                    return cats;
                  }
                }
                return byAnno;
              })();
              const isBEprevAnnoPrec = annoPrevBE!==costiAnno;
              const speseAnnoBE=speseCosti[costiAnno]||[];
              const fissi=catAnnosBE.filter(c=>c.tipo==="fisso");
              const variabili=catAnnosBE.filter(c=>c.tipo==="variabile");
              const totPrevFissi=fissi.reduce((s,c)=>s+Number(c.totaleAnno||0),0);
              const totPrevVar=variabili.reduce((s,c)=>s+Number(c.totaleAnno||0),0);
              const totPrevAnnuo=totPrevFissi+totPrevVar;
              const totSpFissi=fissi.reduce((s,cat)=>s+speseAnnoBE.filter(x=>x.catId===cat.id&&cat.tipo==="fisso").reduce((a,x)=>a+Number(x.importo||0),0),0);
              const totSpVar=variabili.reduce((s,cat)=>s+speseAnnoBE.filter(x=>x.catId===cat.id&&cat.tipo==="variabile").reduce((a,x)=>a+Number(x.importo||0),0),0);
              const totConsuntivo=totSpFissi+totSpVar;

              // Riferimenti automatici (per il fallback se BE manuale non impostato)
              const prevRif = costiBreakevenMode==="fissi" ? totPrevFissi : totPrevAnnuo;
              const consRif = costiBreakevenMode==="fissi" ? totSpFissi : totConsuntivo;
              const autoRif = consRif>0 ? consRif : prevRif;

              // BREAK EVEN MANUALE per anno (con fallback all'automatico)
              const beManualeAnno = Number((breakEvenManuale||{})[costiAnno]||0);
              const puntoBE = beManualeAnno>0 ? beManualeAnno : autoRif;
              const isManuale = beManualeAnno>0;
              const puntoBELabel = costiBreakevenMode==="fissi" ? "Solo costi fissi" : "Costi fissi + variabili";
              const costoMensile = puntoBE>0 ? puntoBE/12 : 0;

              // Quota Agenzia (allineata alla Dashboard)
              // Formula: (pV+pA) - quoteAgentiNonBroker - quoteBuyer, con controllo pV>0 e pA>0
              const vendAnno=venduti.filter(v=>v.categoria==="vendita"&&getAnno(dataCompAgenzia(v))===costiAnno);
              const nonBroker = agenti.filter(a=>a.profilo!=="Broker");
              const calcQuotaAg=(vend,useIncassato)=>vend.reduce((s,v)=>{
                const pV=useIncassato?calcolaIncassatoV(v):Number(v.provvVenditore||0);
                const pA=useIncassato?calcolaIncassatoA(v):Number(v.provvAcquirente||0);
                let qAg=0, qBuy=0;
                nonBroker.forEach(a=>{
                  if(v.agenteListing===a.id && pV>0) qAg+=pV*(Number(v.percListing||0)/100);
                  if(v.agenteAcquirente===a.id && pA>0) qAg+=pA*(Number(v.percAcquirente||0)/100);
                });
                if(v.buyerListing && v.agenteListing!==v.buyerListing && pV>0)
                  qBuy+=pV*(Number(v.percBuyerListing||0)/100);
                if(v.buyer && v.agenteAcquirente!==v.buyer && pA>0)
                  qBuy+=pA*(Number(v.percBuyer||0)/100);
                return s + Math.max(0, (pV+pA) - qAg - qBuy);
              },0);

              const quotaAgTot=calcQuotaAg(vendAnno,false);
              const quotaAgInc=calcQuotaAg(vendAnno,true);
              const quotaAgDaInc=Math.max(0,quotaAgTot-quotaAgInc);

              const meseTot=costoMensile>0?Math.round(quotaAgTot/costoMensile*10)/10:0;
              const meseInc=costoMensile>0?Math.round(quotaAgInc/costoMensile*10)/10:0;
              const meseCoperti=new Date().getFullYear()===Number(costiAnno)?new Date().getMonth()+1:12;

              const percTot=puntoBE>0?Math.min(100,Math.round(quotaAgTot/puntoBE*100)):0;
              const percInc=puntoBE>0?Math.min(100,Math.round(quotaAgInc/puntoBE*100)):0;

              const beRaggiuntoTot=quotaAgTot>=puntoBE&&puntoBE>0;

              const setBEManuale=(val)=>{
                if(isReadOnly) return;
                const nuovo={...breakEvenManuale};
                if(!val||Number(val)<=0) delete nuovo[costiAnno];
                else nuovo[costiAnno]=Number(val);
                setBreakEvenManuale(nuovo);
              };

              return(<>
                {/* BOX 1: INPUT BREAK EVEN MANUALE */}
                <div style={{background:"#fff",borderRadius:12,border:`1.5px solid ${isManuale?"#27AE60":BRAND.oro}`,padding:"1.25rem 1.5rem",marginBottom:"1.25rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem",flexWrap:"wrap",gap:12}}>
                    <div style={{flex:1,minWidth:280}}>
                      <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:isManuale?"#27AE60":BRAND.oroD,margin:"0 0 4px"}}>
                        🎯 Imposta il tuo Punto di Break Even ({costiAnno})
                      </p>
                      <p style={{fontSize:12,color:"#888",margin:"0 0 10px"}}>
                        {isManuale?"✓ Valore impostato manualmente":"⚠ Non impostato — uso il valore automatico (preventivo/consuntivo)"}
                      </p>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:22,fontWeight:700,color:isManuale?"#27AE60":"#888"}}>€</span>
                        <input
                          type="number" min="0" step="1000"
                          style={{fontSize:32,fontWeight:700,border:"none",borderBottom:`2px solid ${isManuale?"#27AE60":"#ddd"}`,background:"transparent",color:isManuale?"#27AE60":"#888",outline:"none",fontFamily:"inherit",padding:"4px 0",width:240,textAlign:"left"}}
                          value={beManualeAnno||""}
                          placeholder={fmt(Math.round(autoRif))}
                          onChange={e=>setBEManuale(e.target.value)}
                          disabled={isReadOnly}
                        />
                        {isManuale&&!isReadOnly&&<button onClick={()=>setBEManuale(0)} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"0.5px solid #ddd",background:"#fafaf8",color:"#888",cursor:"pointer",fontFamily:"inherit"}}>✕ Azzera</button>}
                      </div>
                      {!isReadOnly&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
                        <button onClick={()=>setBEManuale(Math.round(totPrevAnnuo))} style={{fontSize:11,padding:"4px 12px",borderRadius:6,border:"0.5px solid #4A90D9",background:"#EAF4FB",color:"#0C447C",cursor:totPrevAnnuo===0?"not-allowed":"pointer",fontFamily:"inherit",opacity:totPrevAnnuo===0?0.4:1}} disabled={totPrevAnnuo===0}>
                          Usa preventivo: € {fmt(Math.round(totPrevAnnuo))}
                        </button>
                        {totConsuntivo>0&&<button onClick={()=>setBEManuale(Math.round(totConsuntivo))} style={{fontSize:11,padding:"4px 12px",borderRadius:6,border:"0.5px solid #E67E22",background:"#FEF0E0",color:"#E67E22",cursor:"pointer",fontFamily:"inherit"}}>
                          Usa consuntivo: € {fmt(Math.round(totConsuntivo))}
                        </button>}
                      </div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,minWidth:180}}>
                      <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>{puntoBELabel}</p>
                      <p style={{fontSize:13,color:"#aaa",margin:0}}>€ {fmt(Math.round(costoMensile))}<span style={{fontSize:11}}>/mese</span></p>
                      <div style={{marginTop:10,padding:"8px 10px",background:"#fafaf8",borderRadius:6,fontSize:11,lineHeight:1.6,textAlign:"left"}}>
                        <div style={{color:"#888",fontWeight:600,marginBottom:3}}>📊 Riferimenti automatici</div>
                        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#888"}}>Preventivo{isBEprevAnnoPrec?` (da ${annoPrevBE})`:""}:</span><strong style={{color:"#2980B9"}}>€ {fmt(Math.round(totPrevAnnuo))}</strong></div>
                        <div style={{display:"flex",justifyContent:"space-between",paddingLeft:8,fontSize:10,color:"#aaa"}}><span>↳ fissi:</span><span>€ {fmt(Math.round(totPrevFissi))}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between",paddingLeft:8,fontSize:10,color:"#aaa"}}><span>↳ variabili:</span><span>€ {fmt(Math.round(totPrevVar))}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}><span style={{color:"#888"}}>Consuntivo {costiAnno}:</span><strong style={{color:totConsuntivo>0?"#E67E22":"#ccc"}}>€ {fmt(Math.round(totConsuntivo))}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOX 2: QUOTA AGENZIA TOTALE vs BE */}
                <div style={{background:"#fff",borderRadius:12,border:`1.5px solid ${beRaggiuntoTot?"#27AE60":"#E74C3C"}`,padding:"1.25rem 1.5rem",marginBottom:"1.25rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
                    <div>
                      <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:"#888",margin:"0 0 4px"}}>💰 Quota Agenzia — Fatturato totale (incassato + da incassare)</p>
                      <p style={{fontSize:28,fontWeight:700,margin:0,color:beRaggiuntoTot?"#27AE60":"#2C2C2C"}}>€ {fmt(quotaAgTot)}</p>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:22,fontWeight:700,color:beRaggiuntoTot?"#27AE60":"#E74C3C"}}>{percTot}%</div>
                      <div style={{fontSize:11,color:"#aaa"}}>del break even</div>
                    </div>
                  </div>
                  <div style={{height:18,background:"#f0f0f0",borderRadius:9,overflow:"hidden",position:"relative",marginBottom:8}}>
                    <div style={{height:"100%",width:`${percTot}%`,background:beRaggiuntoTot?"#27AE60":"linear-gradient(90deg,#E74C3C,#C0392B)",borderRadius:9,transition:"width .6s ease",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:8}}>
                      {percTot>15&&<span style={{fontSize:11,fontWeight:600,color:"#fff"}}>€ {fmt(quotaAgTot)}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#888",flexWrap:"wrap",gap:6}}>
                    <span>Break Even: <strong style={{color:isManuale?"#27AE60":"#E74C3C"}}>€ {fmt(puntoBE)}</strong> {isManuale&&<span style={{fontSize:10,color:"#27AE60"}}>(manuale)</span>}</span>
                    {beRaggiuntoTot
                      ?<span style={{color:"#27AE60",fontWeight:600}}>✅ Break Even raggiunto! Utile: +€ {fmt(quotaAgTot-puntoBE)}</span>
                      :puntoBE>0?<span style={{color:"#E74C3C",fontWeight:500}}>⚠ Mancano: <strong>€ {fmt(puntoBE-quotaAgTot)}</strong></span>:<span style={{color:"#aaa"}}>Imposta il BE per vedere il progresso</span>}
                  </div>
                </div>

                {/* BOX 3: SITUAZIONE CASSA + PROIEZIONE */}
                <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"1.25rem 1.5rem",marginBottom:"1.25rem"}}>
                  <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:"#888",margin:"0 0 1rem"}}>✅ Situazione cassa e proiezione</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"1rem"}}>
                    <div style={{background:"#E9F7EF",borderRadius:8,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"#27AE60",fontWeight:500,marginBottom:4}}>Incassato oggi</div>
                      <div style={{fontSize:22,fontWeight:700,color:"#27AE60"}}>€ {fmt(quotaAgInc)}</div>
                      <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{puntoBE>0?`${meseInc} mesi di costi coperti`:"—"}</div>
                    </div>
                    <div style={{background:"#EAF4FB",borderRadius:8,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"#2980B9",fontWeight:500,marginBottom:4}}>Da incassare (già tuoi)</div>
                      <div style={{fontSize:22,fontWeight:700,color:"#2980B9"}}>€ {fmt(quotaAgDaInc)}</div>
                      <div style={{fontSize:11,color:"#aaa",marginTop:2}}>Clienti che devono ancora pagare</div>
                    </div>
                  </div>
                  <div style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:4,flexWrap:"wrap",gap:6}}>
                      <span>Incassato: <strong style={{color:"#27AE60"}}>€ {fmt(quotaAgInc)}</strong> + Da incassare: <strong style={{color:"#2980B9"}}>€ {fmt(quotaAgDaInc)}</strong></span>
                      <span>BE: <strong>€ {fmt(puntoBE)}</strong></span>
                    </div>
                    <div style={{height:14,background:"#f0f0f0",borderRadius:7,overflow:"hidden",display:"flex"}}>
                      <div style={{height:"100%",width:`${percInc}%`,background:"#27AE60",transition:"width .6s ease"}}/>
                      <div style={{height:"100%",width:`${Math.min(100-percInc,Math.max(0,percTot-percInc))}%`,background:"#2980B9",opacity:.7,transition:"width .6s ease"}}/>
                    </div>
                    <div style={{display:"flex",gap:12,marginTop:4,fontSize:10,color:"#aaa",flexWrap:"wrap"}}>
                      <span style={{color:"#27AE60"}}>■ Incassato {percInc}%</span>
                      <span style={{color:"#2980B9"}}>■ Da incassare {Math.max(0,percTot-percInc)}%</span>
                      <span>□ Mancante {Math.max(0,100-percTot)}%</span>
                    </div>
                  </div>
                  {puntoBE>0&&<div style={{background:"#fafaf8",borderRadius:8,padding:"10px 14px",marginTop:8}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,fontSize:12}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#aaa",marginBottom:2}}>Costo mensile</div>
                        <div style={{fontSize:16,fontWeight:600,color:"#E74C3C"}}>€ {fmt(Math.round(costoMensile))}</div>
                      </div>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#aaa",marginBottom:2}}>Mesi coperti (incassato)</div>
                        <div style={{fontSize:16,fontWeight:600,color:meseInc>=meseCoperti?"#27AE60":"#E67E22"}}>{meseInc}</div>
                        <div style={{fontSize:10,color:"#aaa"}}>{meseInc>=meseCoperti?"✅ in pari":"su "+meseCoperti+" trascorsi"}</div>
                      </div>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#aaa",marginBottom:2}}>Mesi coperti (totale)</div>
                        <div style={{fontSize:16,fontWeight:600,color:meseTot>=meseCoperti?"#27AE60":"#E67E22"}}>{meseTot}</div>
                        <div style={{fontSize:10,color:"#aaa"}}>{meseTot>=12?"✅ anno coperto":meseTot>=meseCoperti?"✅ in pari":"su "+meseCoperti+" trascorsi"}</div>
                      </div>
                    </div>
                    {quotaAgInc<costoMensile*meseCoperti&&quotaAgTot>=costoMensile*meseCoperti&&(
                      <div style={{marginTop:8,padding:"6px 10px",background:"#EAF4FB",borderRadius:6,fontSize:11,color:"#2980B9",fontWeight:500}}>
                        💡 Sei sotto con il solo incassato, ma con i {fmt(Math.round(quotaAgDaInc))}€ già maturati da incassare saresti in pari — stai aspettando i pagamenti dei clienti.
                      </div>
                    )}
                    {quotaAgTot<costoMensile*meseCoperti&&(
                      <div style={{marginTop:8,padding:"6px 10px",background:"#FDECEA",borderRadius:6,fontSize:11,color:"#E74C3C",fontWeight:500}}>
                        ⚠ Anche considerando i crediti da incassare, la quota agenzia non copre ancora le spese del periodo. Mancano: € {fmt(Math.round(costoMensile*meseCoperti-quotaAgTot))}
                      </div>
                    )}
                  </div>}
                </div>

                {/* BOX 4: OBIETTIVI */}
                {(()=>{
                  const mesiAnno=Array.from({length:12},(_,i)=>`${costiAnno}-${String(i+1).padStart(2,"0")}`);
                  const obFattAutoPerAgente=agenti.map(ag=>{
                    const obMesi=mesiAnno.map(m=>{
                      const ob=(obiettiviOp[ag.id]||{})[m]||{};
                      const proposti=ob.proposti||ob||{};
                      return Number(proposti.fatturato||proposti.fatturatoBruto||0);
                    });
                    const maxOb=Math.max(...obMesi);
                    return maxOb>0?maxOb*12:0;
                  });
                  const obFattTeamAuto=obFattAutoPerAgente.reduce((s,v)=>s+v,0);
                  const obFattEffettivo=obFattTeamAuto>0?obFattTeamAuto:obiettivoFatturato;
                  const fattLordo=vendAnno.reduce((s,v)=>s+Number(v.provvVenditore||0)+Number(v.provvAcquirente||0),0);
                  const percFatt=obFattEffettivo>0?Math.min(100,Math.round(fattLordo/obFattEffettivo*100)):0;
                  const percQuota=obiettivoQuotaAgenzia>0?Math.min(100,Math.round(quotaAgTot/obiettivoQuotaAgenzia*100)):0;

                  return(<div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"1.25rem 1.5rem"}}>
                    <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:"#888",margin:"0 0 1rem"}}>🎯 Obiettivi annuali {costiAnno}</p>

                    <div style={{marginBottom:"1rem",padding:"10px 14px",background:"#FDFBF7",borderRadius:8,border:"0.5px solid #e8e5e0"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:4}}>
                        <div>
                          <span style={{fontSize:12,fontWeight:500,color:"#555"}}>Fatturato lordo team</span>
                          {obFattTeamAuto>0
                            ?<span style={{fontSize:10,color:"#27AE60",marginLeft:6,padding:"1px 6px",borderRadius:3,background:"#E9F7EF"}}>✓ auto da obiettivi agenti</span>
                            :<span style={{fontSize:10,color:"#aaa",marginLeft:6,padding:"1px 6px",borderRadius:3,background:"#f0f0f0"}}>inserisci manualmente</span>}
                        </div>
                        <span style={{fontSize:18,fontWeight:700,color:BRAND.oroD}}>€ {fmt(obFattEffettivo||0)}</span>
                      </div>
                      {obFattTeamAuto>0&&<div style={{fontSize:11,color:"#aaa",marginBottom:8}}>
                        Somma obiettivi: {agenti.filter((_,i)=>obFattAutoPerAgente[i]>0).map(a=>`${a.nome}: € ${fmt(obFattAutoPerAgente[agenti.indexOf(a)])}`).join(" · ")}
                      </div>}
                      {obFattTeamAuto===0&&<div style={{marginBottom:8}}>
                        <input type="number" style={{...S.inp,margin:0}} value={obiettivoFatturato||""} placeholder="es. 300.000" onChange={e=>{if(isReadOnly)return;setObiettivoFatturato(Number(e.target.value))}}/>
                        <div style={{fontSize:10,color:"#aaa",marginTop:4}}>Oppure imposta gli obiettivi mensili degli agenti in Operatività → Obiettivi per il calcolo automatico</div>
                      </div>}
                      {obFattEffettivo>0&&(<>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:3}}>
                          <span>Realizzato: € {fmt(fattLordo)}</span>
                          <span style={{fontWeight:600,color:percFatt>=100?"#27AE60":BRAND.oroD}}>{percFatt}%</span>
                        </div>
                        <div style={{height:8,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${percFatt}%`,background:percFatt>=100?"#27AE60":BRAND.oro,borderRadius:4}}/>
                        </div>
                      </>)}
                    </div>

                    <div style={{padding:"10px 14px",background:"#FDFBF7",borderRadius:8,border:"0.5px solid #e8e5e0"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:4}}>
                        <div>
                          <span style={{fontSize:12,fontWeight:500,color:"#555"}}>Obiettivo quota agenzia</span>
                          <span style={{fontSize:10,color:"#aaa",marginLeft:6}}>per coprire BE + utile</span>
                        </div>
                        {obiettivoQuotaAgenzia>0&&<span style={{fontSize:18,fontWeight:700,color:percQuota>=100?"#27AE60":"#E67E22"}}>€ {fmt(obiettivoQuotaAgenzia)}</span>}
                      </div>
                      <input type="number" style={{...S.inp,margin:"0 0 8px"}} value={obiettivoQuotaAgenzia||""} placeholder={puntoBE>0?`es. ${fmt(Math.round(puntoBE*1.2))} (BE + 20% utile)`:"es. 240.000"} onChange={e=>{if(isReadOnly)return;setObiettivoQuotaAgenzia(Number(e.target.value))}}/>
                      {obiettivoQuotaAgenzia>0&&(<>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:3}}>
                          <span>Quota agenzia attuale: € {fmt(quotaAgTot)}</span>
                          <span style={{fontWeight:600,color:percQuota>=100?"#27AE60":"#E67E22"}}>{percQuota}%</span>
                        </div>
                        <div style={{height:8,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${percQuota}%`,background:percQuota>=100?"#27AE60":"#E67E22",borderRadius:4}}/>
                        </div>
                        {obiettivoQuotaAgenzia>0&&puntoBE>0&&<div style={{fontSize:10,color:"#aaa",marginTop:4}}>
                          Break Even: € {fmt(puntoBE)} · Utile previsto: € {fmt(obiettivoQuotaAgenzia-puntoBE)} ({Math.round((obiettivoQuotaAgenzia/puntoBE-1)*100)}%)
                        </div>}
                      </>)}
                    </div>
                  </div>);
                })()}
              </>);
            })()}
          </div>)}

          {/* ── TAB COSTI — Gestione voci ── */}
          {tab==="Costi"&&isReadOnly&&(()=>{
            // Vista costi sola lettura per Coach
            const agId=coachIsAgenzia?null:myAgentId;
            const annoSel=annoCorrente;
            return(<div style={S.sec}>
              <div style={{background:"#EAF4FB",border:"0.5px solid #2980B944",borderRadius:8,padding:"8px 14px",marginBottom:"1.25rem",display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#0C447C"}}>
                👁 <strong>Sola lettura</strong> — puoi vedere i dati ma non modificarli
              </div>
              {/* Costi agenzia */}
              {(isBroker||isBackOffice||coachIsAgenzia)&&(()=>{
                const voci=costi[annoSel]||mkCosti();
                const totPrev=voci.reduce((s,v)=>s+Number(v.prevMensile||0)*12,0);
                const totCons=voci.reduce((s,v)=>s+(v.spese||[]).reduce((a,x)=>a+Number(x.importo||0),0),0);
                return(<div>
                  <div style={{display:"flex",gap:10,marginBottom:"1rem",flexWrap:"wrap"}}>
                    <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"12px 16px",flex:1,minWidth:140}}>
                      <div style={{fontSize:11,color:"#888",marginBottom:4}}>Previsto anno {annoSel}</div>
                      <div style={{fontSize:20,fontWeight:600,color:"#2c2c2c"}}>€ {fmt(totPrev)}</div>
                    </div>
                    <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"12px 16px",flex:1,minWidth:140}}>
                      <div style={{fontSize:11,color:"#888",marginBottom:4}}>Consuntivo</div>
                      <div style={{fontSize:20,fontWeight:600,color:totCons>totPrev?"#E74C3C":"#27AE60"}}>€ {fmt(totCons)}</div>
                    </div>
                  </div>
                  <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,overflow:"hidden"}}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr style={{background:"#F8F8F6"}}>
                        {["Voce","Tipo","Prev. mensile","Prev. annuo","Consuntivo"].map(h=><th key={h} style={{padding:"8px 12px",fontSize:11,fontWeight:500,color:"#888",textAlign:"left",borderBottom:"1px solid #eee"}}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {voci.map((v,i)=>(
                          <tr key={i} style={{borderBottom:"0.5px solid #f5f5f5"}}>
                            <td style={{padding:"7px 12px",fontSize:12,fontWeight:500}}>{v.voce}</td>
                            <td style={{padding:"7px 12px",fontSize:11,color:"#888"}}>{v.tipo||"fisso"}</td>
                            <td style={{padding:"7px 12px",fontSize:12}}>€ {fmt(Number(v.prevMensile||0))}</td>
                            <td style={{padding:"7px 12px",fontSize:12}}>€ {fmt(Number(v.prevMensile||0)*12)}</td>
                            <td style={{padding:"7px 12px",fontSize:12,color:(v.spese||[]).reduce((s,x)=>s+Number(x.importo||0),0)>Number(v.prevMensile||0)*12?"#E74C3C":"#27AE60",fontWeight:500}}>€ {fmt((v.spese||[]).reduce((s,x)=>s+Number(x.importo||0),0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>);
              })()}
              {/* Costi agente */}
              {!coachIsAgenzia&&agId&&(()=>{
                const mieVoci=costiAgente[agId]?.[annoSel]||mkCosti();
                const totPrev=mieVoci.reduce((s,v)=>s+Number(v.prevMensile||0)*12,0);
                const totCons=mieVoci.reduce((s,v)=>s+(v.spese||[]).reduce((a,x)=>a+Number(x.importo||0),0),0);
                const ag=agenti.find(a=>a.id===agId);
                return(<div>
                  <h3 style={{fontSize:14,fontWeight:600,margin:"1.25rem 0 0.75rem"}}>Costi personali — {ag?.nome} {ag?.cognome}</h3>
                  <div style={{display:"flex",gap:10,marginBottom:"1rem",flexWrap:"wrap"}}>
                    <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"12px 16px",flex:1}}>
                      <div style={{fontSize:11,color:"#888",marginBottom:4}}>Previsto anno {annoSel}</div>
                      <div style={{fontSize:20,fontWeight:600}}>€ {fmt(totPrev)}</div>
                    </div>
                    <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"12px 16px",flex:1}}>
                      <div style={{fontSize:11,color:"#888",marginBottom:4}}>Consuntivo</div>
                      <div style={{fontSize:20,fontWeight:600,color:totCons>totPrev?"#E74C3C":"#27AE60"}}>€ {fmt(totCons)}</div>
                    </div>
                  </div>
                  <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,overflow:"hidden"}}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr style={{background:"#F8F8F6"}}>
                        {["Voce","Prev. mensile","Consuntivo"].map(h=><th key={h} style={{padding:"8px 12px",fontSize:11,fontWeight:500,color:"#888",textAlign:"left",borderBottom:"1px solid #eee"}}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {mieVoci.map((v,i)=>(
                          <tr key={i} style={{borderBottom:"0.5px solid #f5f5f5"}}>
                            <td style={{padding:"7px 12px",fontSize:12,fontWeight:500}}>{v.voce}</td>
                            <td style={{padding:"7px 12px",fontSize:12}}>€ {fmt(Number(v.prevMensile||0))}</td>
                            <td style={{padding:"7px 12px",fontSize:12,fontWeight:500,color:(v.spese||[]).reduce((s,x)=>s+Number(x.importo||0),0)>Number(v.prevMensile||0)*12?"#E74C3C":"#27AE60"}}>€ {fmt((v.spese||[]).reduce((s,x)=>s+Number(x.importo||0),0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>);
              })()}
            </div>);
          })()}
          {tab==="Costi"&&(isBroker||isBackOffice)&&!isReadOnly&&(()=>{
            const annoC=costiAnno||annoCorrente;
            // === LOGICA PREVISIONALE INTELLIGENTE ===
            // 1. Cerco categorie nell'anno selezionato CON ALMENO UNA con totaleAnno > 0
            // 2. Se non trovo dati significativi, fallback all'anno più recente con dati pieni
            // 3. Le SPESE REALI restano sempre dell'anno selezionato (per tracciare le spese 2026 nel 2026)
            let annoPrevisionale=annoC;
            const catAnnoC=(()=>{
              const byAnno=catCosti.filter(x=>String(x.anno)===annoC&&!x.agentId);
              // Controllo se le categorie dell'anno selezionato sono "piene" (almeno una con totale > 0)
              const haDatiPieni = byAnno.some(c => Number(c.totaleAnno||0) > 0);
              if(byAnno.length>0 && haDatiPieni) return byAnno;
              // Fallback: cerco l'anno più recente CON dati pieni (almeno una categoria > 0)
              const tuttiAnni=[...new Set(catCosti.filter(x=>!x.agentId).map(x=>x.anno))].sort((a,b)=>b-a);
              for(const anno of tuttiAnni){
                if(String(anno)===annoC) continue; // già controllato
                const cats = catCosti.filter(x=>x.anno===anno&&!x.agentId);
                if(cats.some(c=>Number(c.totaleAnno||0)>0)){
                  annoPrevisionale=String(anno);
                  return cats;
                }
              }
              // Nessun anno con dati pieni: ritorno comunque le categorie dell'anno selezionato (anche vuote)
              return byAnno;
            })();
            const isPrevAnnoPrec=annoPrevisionale!==annoC;
            const speseAnnoC=speseCosti[annoC]||[];
            const oggi6=todayStr();
            const totPrev=catAnnoC.reduce((s,c)=>s+Number(c.totaleAnno||0),0);
            const totSpeso=speseAnnoC.reduce((s,x)=>s+Number(x.importo||0),0);
            const percSpeso=totPrev>0?Math.min(100,Math.round(totSpeso/totPrev*100)):null;
            const addSpesa=(sp)=>{
              const id="sp_"+Date.now();
              setSpeseCosti(prev=>({...prev,[annoC]:[...(prev[annoC]||[]),{id,...sp}]}));
              setFormSpesa(null);
            };
            const delSpesa=(id)=>setSpeseCosti(prev=>({...prev,[annoC]:(prev[annoC]||[]).filter(s=>s.id!==id)}));
            const speseByCat=(catId)=>speseAnnoC.filter(s=>s.catId===catId);
            const ANNI_C=[...new Set([...catCosti.map(c=>String(c.anno)),annoCorrente])].sort((a,b)=>b-a);
            const sC2={background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"14px 16px"};
            return(<div style={S.sec}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:10}}>
                <div>
                  <h2 style={{fontSize:16,fontWeight:600,margin:0,color:BRAND.grigio}}>💰 Costi Agenzia</h2>
                  <div style={{fontSize:12,color:"#888",marginTop:3}}>Anno {annoC} — spese reali vs previsionale</div>
                  {isPrevAnnoPrec&&<div style={{fontSize:11,color:"#A8863A",marginTop:4,padding:"3px 8px",background:"#FDF6EC",borderRadius:4,display:"inline-block",border:"0.5px solid #C9A96E44"}}>📅 Previsionale di riferimento: anno {annoPrevisionale} (categorie {annoC} non ancora configurate)</div>}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <select style={S.sel} value={annoC} onChange={e=>setCostiAnno(e.target.value)}>
                    {ANNI_C.map(a=><option key={a}>{a}</option>)}
                  </select>
                  <button onClick={()=>setFormSpesa({data:oggi6,descrizione:"",importo:"",catId:"",note:""})} style={{...S.btnP,fontSize:12,padding:"6px 14px"}}>+ Aggiungi spesa</button>
                </div>
              </div>

              {/* SUB-TAB: Anno corrente | Confronto Anni */}
              <div style={{display:"flex",gap:6,marginBottom:"1.25rem",borderBottom:"1px solid #eee",paddingBottom:"0.5rem"}}>
                {[{v:"anno",l:"📅 Anno corrente"},{v:"confronto",l:"📊 Confronto Anni"}].map(o=>(
                  <button key={o.v} onClick={()=>setCostiSubTab(o.v)} style={{...S.btn,fontSize:13,padding:"6px 14px",background:costiSubTab===o.v?BRAND.oro:"transparent",color:costiSubTab===o.v?"#fff":BRAND.grigio,border:`1px solid ${costiSubTab===o.v?BRAND.oro:"transparent"}`,fontWeight:costiSubTab===o.v?600:500}}>{o.l}</button>
                ))}
              </div>

              {costiSubTab==="anno"&&<>

              {/* KPI */}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:"1.5rem"}}>
                {[
                  ["Previsionale "+(isPrevAnnoPrec?annoPrevisionale:"anno"),"€ "+fmt(Math.round(totPrev)),"#E74C3C",null,isPrevAnnoPrec?"da anno "+annoPrevisionale+" (fallback)":"da Impostazioni → Categorie"],
                  ["Speso YTD","€ "+fmt(Math.round(totSpeso)),"#E67E22",percSpeso,percSpeso!=null?percSpeso+"% del previsionale":""],
                  ["Fissi / mese","€ "+fmt(Math.round(catAnnoC.filter(c=>c.tipo==="fisso").reduce((s,c)=>s+Number(c.totaleAnno||0),0)/12)),"#185FA5",null,"stima mensile"],
                  ["Rimanente","€ "+fmt(Math.max(0,Math.round(totPrev-totSpeso))),"#27AE60",null,"previsionale non ancora speso"],
                ].map(([lbl,val,clr,perc,sub])=>(
                  <div key={lbl} style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem",textAlign:"center",borderTop:`3px solid ${clr}`}}>
                    <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>{lbl}</div>
                    <div style={{fontSize:22,fontWeight:700,color:clr,marginBottom:4}}>{val}</div>
                    {perc!=null&&<div style={{height:4,background:"#f0f0f0",borderRadius:2,overflow:"hidden",margin:"4px 0"}}><div style={{height:"100%",width:perc+"%",background:perc>=100?"#E74C3C":perc>=70?"#E67E22":clr,borderRadius:2}}/></div>}
                    <div style={{fontSize:10,color:"#aaa"}}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Form aggiungi spesa */}
              {formSpesa&&<div style={{...sC2,border:"1px solid #A8863A",marginBottom:"1.5rem"}}>
                <div style={{fontSize:13,fontWeight:600,color:"#633806",marginBottom:12}}>+ Nuova spesa — {annoC}</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 110px 110px 150px",gap:10,marginBottom:10}}>
                  <div><label style={S.lbl}>Data</label><input type="date" style={S.inp} value={formSpesa.data} onChange={e=>setFormSpesa({...formSpesa,data:e.target.value})}/></div>
                  <div><label style={S.lbl}>Descrizione</label><input style={S.inp} value={formSpesa.descrizione} placeholder="es. Bolletta maggio" onChange={e=>setFormSpesa({...formSpesa,descrizione:e.target.value})}/></div>
                  <div><label style={S.lbl}>Importo (€)</label><input type="number" min="0" style={S.inp} value={formSpesa.importo} placeholder="0" onChange={e=>setFormSpesa({...formSpesa,importo:e.target.value})}/></div>
                  <div><label style={S.lbl}>Tipologia</label>
                    <select style={S.inp} value={formSpesa.tipo||""} onChange={e=>setFormSpesa({...formSpesa,tipo:e.target.value,catId:""})}>
                      <option value="">Seleziona...</option>
                      <option value="fisso">📌 Fisso</option>
                      <option value="variabile">📊 Variabile</option>
                    </select>
                  </div>
                  <div><label style={S.lbl}>Categoria</label>
                    <select style={S.inp} value={formSpesa.catId} onChange={e=>setFormSpesa({...formSpesa,catId:e.target.value})} disabled={!formSpesa.tipo}>
                      <option value="">{!formSpesa.tipo?"Prima scegli tipologia":"Seleziona..."}</option>
                      {formSpesa.tipo&&catCosti.filter(c=>c.tipo===formSpesa.tipo&&!c.agentId).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:10}}><label style={S.lbl}>Note (opzionale)</label><input style={S.inp} value={formSpesa.note||""} placeholder="Annotazioni..." onChange={e=>setFormSpesa({...formSpesa,note:e.target.value})}/></div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setFormSpesa(null)} style={{...S.btn,fontSize:12}}>Annulla</button>
                  <button onClick={()=>{if(!formSpesa.descrizione||!formSpesa.importo||!formSpesa.catId)return alert("Compila descrizione, importo, tipologia e categoria");addSpesa(formSpesa);}} style={{...S.btnP,fontSize:12,padding:"7px 18px"}}>💾 Salva spesa</button>
                </div>
              </div>}

              {/* Categorie con spese */}
              <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1.5rem"}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:4,height:18,borderRadius:2,background:"#E74C3C"}}/>
                  <span style={{fontSize:13,fontWeight:600,color:"#E74C3C"}}>Spese per categoria</span>
                  <span style={{fontSize:11,color:"#aaa",marginLeft:"auto"}}>{speseAnnoC.length} spese inserite</span>
                </div>
                {catAnnoC.length===0&&<div style={{padding:"2rem",textAlign:"center",color:"#bbb",fontSize:12}}>Nessuna categoria configurata per {annoC}.<br/>Vai in Impostazioni → Categorie Costi.</div>}
                {["fisso","variabile"].map(tipo=>{
                  const cats=catAnnoC.filter(c=>c.tipo===tipo);
                  if(cats.length===0) return null;
                  const totTipo=cats.reduce((s,c)=>s+Number(c.totaleAnno||0),0);
                  const spasTipo=cats.reduce((s,c)=>s+speseByCat(c.id).reduce((a,x)=>a+Number(x.importo||0),0),0);
                  return(<div key={tipo}>
                    <div style={{padding:"7px 16px",background:tipo==="fisso"?"#E6F1FB22":"#EEEDFE22",borderBottom:"0.5px solid #eee",display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:10,fontWeight:700,color:tipo==="fisso"?"#185FA5":"#533AB7",textTransform:"uppercase",letterSpacing:".08em"}}>{tipo==="fisso"?"📌 Fissi":"📊 Variabili"}</span>
                      <span style={{fontSize:11,color:"#aaa",marginLeft:"auto"}}>Prev: € {fmt(Math.round(totTipo))} · Speso: € {fmt(Math.round(spasTipo))}</span>
                    </div>
                    {cats.map(cat=>{
                      const spese=speseByCat(cat.id).sort((a,b)=>b.data?.localeCompare(a.data||"")||0);
                      const totCat=spese.reduce((s,x)=>s+Number(x.importo||0),0);
                      const percCat=cat.totaleAnno>0?Math.min(100,Math.round(totCat/cat.totaleAnno*100)):null;
                      const expanded=costiCatExpand[cat.id];
                      const over=cat.totaleAnno>0&&totCat>cat.totaleAnno;
                      return(<div key={cat.id}>
                        <div onClick={()=>setCostiCatExpand(prev=>({...prev,[cat.id]:!prev[cat.id]}))}
                          style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",cursor:"pointer",borderBottom:"0.5px solid #f5f5f5",background:expanded?"#fafaf8":"#fff",transition:"background .15s"}}>
                          <span style={{fontSize:11,color:"#aaa",width:12}}>{expanded?"▼":"▶"}</span>
                          <span style={{fontSize:13,fontWeight:500,flex:1}}>{cat.nome}</span>
                          {spese.length>0&&<span style={{fontSize:10,color:"#aaa"}}>{spese.length} spese</span>}
                          <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                            <div style={{textAlign:"right",minWidth:80}}>
                              <div style={{fontSize:10,color:"#aaa"}}>Prev.</div>
                              <div style={{fontSize:12,fontWeight:500,color:"#888"}}>€ {fmt(Math.round(cat.totaleAnno||0))}</div>
                            </div>
                            <div style={{textAlign:"right",minWidth:80}}>
                              <div style={{fontSize:10,color:"#aaa"}}>Speso</div>
                              <div style={{fontSize:13,fontWeight:600,color:over?"#E74C3C":totCat>0?"#0F6E56":"#bbb"}}>€ {fmt(Math.round(totCat))}</div>
                            </div>
                            <div style={{width:60}}>
                              {percCat!=null&&<><div style={{height:4,background:"#f0f0f0",borderRadius:2,overflow:"hidden",marginBottom:2}}><div style={{height:"100%",width:percCat+"%",background:over?"#E74C3C":percCat>=70?"#E67E22":"#0F6E56",borderRadius:2}}/></div><div style={{fontSize:9,color:"#aaa",textAlign:"right"}}>{percCat}%</div></>}
                            </div>
                          </div>
                        </div>
                        {expanded&&<div style={{background:"#fafaf8",borderBottom:"0.5px solid #f0f0f0"}}>
                          {spese.length===0&&<div style={{padding:"12px 16px",fontSize:12,color:"#bbb",fontStyle:"italic",paddingLeft:40}}>Nessuna spesa inserita</div>}
                          {spese.map(sp=>(
                            <div key={sp.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px 8px 40px",borderBottom:"0.5px solid #f0f0f0"}}>
                              <div style={{width:34,height:34,borderRadius:8,background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#888",flexShrink:0,fontWeight:500}}>{sp.data?fmtD(sp.data).slice(0,5):"—"}</div>
                              <div style={{flex:1}}>
                                <div style={{fontSize:13,fontWeight:500}}>{sp.descrizione}</div>
                                {sp.note&&<div style={{fontSize:11,color:"#aaa"}}>{sp.note}</div>}
                              </div>
                              <div style={{fontSize:14,fontWeight:700,color:"#E74C3C",flexShrink:0}}>€ {fmt(Number(sp.importo||0))}</div>
                              <button onClick={()=>delSpesa(sp.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#ddd",padding:"0 4px"}} title="Elimina">🗑</button>
                            </div>
                          ))}
                          <div style={{padding:"8px 16px 8px 40px"}}>
                            <button onClick={()=>setFormSpesa({data:oggi6,descrizione:"",importo:"",catId:cat.id,note:""})}
                              style={{fontSize:11,padding:"4px 12px",borderRadius:6,border:"0.5px dashed #A8863A",background:"#FDF6EC",color:"#A8863A",cursor:"pointer",fontFamily:"inherit"}}>
                              + Aggiungi spesa qui
                            </button>
                          </div>
                        </div>}
                      </div>);
                    })}
                  </div>);
                })}
                {/* Totale */}
                <div style={{background:"#FFFBF0",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"2px solid #f0e8d0"}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#633806"}}>TOTALE {annoC}</span>
                  <div style={{display:"flex",gap:24}}>
                    <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#aaa"}}>Previsionale</div><div style={{fontSize:14,fontWeight:700,color:"#633806"}}>€ {fmt(Math.round(totPrev))}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#aaa"}}>Speso YTD</div><div style={{fontSize:14,fontWeight:700,color:"#E67E22"}}>€ {fmt(Math.round(totSpeso))}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#aaa"}}>Rimanente</div><div style={{fontSize:14,fontWeight:700,color:"#27AE60"}}>€ {fmt(Math.max(0,Math.round(totPrev-totSpeso)))}</div></div>
                  </div>
                </div>
              </div>
              </>}

              {/* ===== SUB-TAB CONFRONTO ANNI ===== */}
              {costiSubTab==="confronto"&&(()=>{
                // Raccolgo tutti gli anni che hanno categorie o spese
                const anniCat = [...new Set(catCosti.filter(c=>!c.agentId).map(c=>String(c.anno)))];
                const anniSpese = Object.keys(speseCosti).filter(k=>/^\d{4}$/.test(k));
                const anniDisp = [...new Set([...anniCat,...anniSpese])].sort();
                if(anniDisp.length===0){
                  return(<div style={{textAlign:"center",padding:"3rem 1rem",color:"#888"}}>
                    <p style={{fontSize:14}}>Nessun dato disponibile per il confronto.</p>
                    <p style={{fontSize:12,color:"#aaa"}}>Configura le categorie in Impostazioni e inserisci spese per vedere il confronto.</p>
                  </div>);
                }

                // Costruisco un dizionario unico di "voci di costo":
                // - key = nome categoria normalizzato (lowercase, trim)
                // - value = {nome, tipo, perAnno:{2025:{prev, speso}, 2026:{prev, speso}, ...}}
                const voci = {};
                catCosti.filter(c=>!c.agentId).forEach(c=>{
                  const key = (c.nome||"").toLowerCase().trim();
                  if(!key||key==="nuova categoria") return;
                  if(!voci[key]){
                    voci[key]={nome:c.nome, tipo:c.tipo||"fisso", perAnno:{}};
                  }
                  const anno=String(c.anno);
                  if(!voci[key].perAnno[anno]) voci[key].perAnno[anno]={prev:0,speso:0,catId:c.id};
                  voci[key].perAnno[anno].prev = Number(c.totaleAnno||0);
                  voci[key].perAnno[anno].catId = c.id;
                });
                // Ora aggrego le spese per categoria/anno
                Object.keys(speseCosti).forEach(annoKey=>{
                  if(!/^\d{4}$/.test(annoKey)) return; // skip chiavi tipo "ag_1_2025"
                  const speseAnno = speseCosti[annoKey]||[];
                  speseAnno.forEach(sp=>{
                    // Trovo a quale "voce" appartiene cercando il catId nelle categorie
                    const cat = catCosti.find(c=>c.id===sp.catId&&!c.agentId);
                    if(!cat) return;
                    const key = (cat.nome||"").toLowerCase().trim();
                    if(!voci[key]) return;
                    if(!voci[key].perAnno[annoKey]) voci[key].perAnno[annoKey]={prev:0,speso:0};
                    voci[key].perAnno[annoKey].speso += Number(sp.importo||0);
                  });
                });

                // Calcolo totali per anno e per tipo
                const totaliPerAnno = {};
                anniDisp.forEach(a=>{
                  totaliPerAnno[a]={prevFissi:0,prevVar:0,spesoFissi:0,spesoVar:0,prevTot:0,spesoTot:0};
                });
                Object.values(voci).forEach(v=>{
                  anniDisp.forEach(a=>{
                    const d=v.perAnno[a]||{prev:0,speso:0};
                    if(v.tipo==="fisso"){
                      totaliPerAnno[a].prevFissi+=d.prev;
                      totaliPerAnno[a].spesoFissi+=d.speso;
                    } else {
                      totaliPerAnno[a].prevVar+=d.prev;
                      totaliPerAnno[a].spesoVar+=d.speso;
                    }
                    totaliPerAnno[a].prevTot+=d.prev;
                    totaliPerAnno[a].spesoTot+=d.speso;
                  });
                });

                // Helper: calcolo variazione % tra due valori
                const calcVar=(curr, prev)=>{
                  if(!prev||prev===0) return null;
                  return Math.round((curr-prev)/prev*100);
                };
                const renderVar=(perc)=>{
                  if(perc===null||perc===undefined) return <span style={{color:"#ccc"}}>—</span>;
                  if(perc===0) return <span style={{color:"#888",fontWeight:600}}>=</span>;
                  const isUp=perc>0;
                  const clr = isUp?"#E74C3C":"#27AE60";
                  const arrow = isUp?"↑":"↓";
                  return <span style={{color:clr,fontWeight:700,fontSize:11}}>{arrow} {Math.abs(perc)}%</span>;
                };

                // Separazione voci per tipo (fissi e variabili)
                const vociFissi = Object.values(voci).filter(v=>v.tipo==="fisso").sort((a,b)=>a.nome.localeCompare(b.nome));
                const vociVar = Object.values(voci).filter(v=>v.tipo==="variabile").sort((a,b)=>a.nome.localeCompare(b.nome));

                // Stili tabella
                const thStyle={padding:"8px 10px",fontSize:10,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"right",borderBottom:"1px solid #e8e5e0",background:"#fafaf8"};
                const thStyleLeft={...thStyle,textAlign:"left"};
                const tdStyle={padding:"7px 10px",fontSize:13,color:BRAND.grigio,textAlign:"right",borderBottom:"0.5px solid #f0f0f0"};
                const tdStyleLeft={...tdStyle,textAlign:"left",fontWeight:500};

                // Funzione per renderizzare una riga di voce
                const renderRigaVoce=(v)=>{
                  const importi = anniDisp.map(a=>v.perAnno[a]||{prev:0,speso:0});
                  // Mostro il valore "rappresentativo" per anno: speso se presente, altrimenti prev
                  const valori = importi.map(d=>d.speso>0?d.speso:d.prev);
                  const haAlmenoUnValore = valori.some(v=>v>0);
                  if(!haAlmenoUnValore) return null;
                  // Variazione: confronto ultimo anno con dati vs precedente con dati
                  let variazione=null;
                  for(let i=valori.length-1;i>0;i--){
                    if(valori[i]>0 && valori[i-1]>0){
                      variazione=calcVar(valori[i],valori[i-1]);
                      break;
                    }
                  }
                  return(<tr key={v.nome}>
                    <td style={tdStyleLeft}>{v.nome}</td>
                    {importi.map((d,i)=>(
                      <td key={i} style={tdStyle}>
                        {d.speso>0?<span style={{color:"#E67E22",fontWeight:600}}>€ {fmt(Math.round(d.speso))}</span>
                         :d.prev>0?<span style={{color:"#888"}}>€ {fmt(Math.round(d.prev))}<sub style={{fontSize:8,marginLeft:2,color:"#bbb"}}>prev</sub></span>
                         :<span style={{color:"#ddd"}}>—</span>}
                      </td>
                    ))}
                    <td style={{...tdStyle,minWidth:80}}>{renderVar(variazione)}</td>
                  </tr>);
                };

                return(<>
                  <div style={{background:"#FDFBF7",border:"1px solid #C9A96E33",borderLeft:`4px solid ${BRAND.oro}`,borderRadius:8,padding:"10px 14px",marginBottom:"1.25rem",fontSize:12,color:"#7E5109",lineHeight:1.6}}>
                    <strong>📊 Confronto Anni:</strong> tabella comparativa multi-anno delle voci di costo. I valori <span style={{color:"#E67E22",fontWeight:700}}>arancioni</span> sono spese reali consuntivate; i valori <span style={{color:"#888"}}>grigi</span> con "prev" sono previsionali non ancora speso. La colonna <strong>Variazione</strong> confronta gli ultimi due anni con dati reali.
                  </div>

                  <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1.5rem"}}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead>
                        <tr>
                          <th style={thStyleLeft}>Categoria</th>
                          {anniDisp.map(a=><th key={a} style={thStyle}>{a}</th>)}
                          <th style={thStyle}>Var.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vociFissi.length>0&&<tr><td colSpan={anniDisp.length+2} style={{padding:"10px 10px 6px",fontSize:11,fontWeight:700,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.08em",background:"#FDFBF7"}}>📌 Costi Fissi</td></tr>}
                        {vociFissi.map(v=>renderRigaVoce(v))}
                        {vociFissi.length>0&&<tr style={{background:"#FDFBF7"}}>
                          <td style={{...tdStyleLeft,fontWeight:700,color:BRAND.oroD}}>Totale Fissi</td>
                          {anniDisp.map(a=>{
                            const t=totaliPerAnno[a];
                            const valore = t.spesoFissi>0?t.spesoFissi:t.prevFissi;
                            return <td key={a} style={{...tdStyle,fontWeight:700,color:BRAND.oroD}}>€ {fmt(Math.round(valore))}</td>;
                          })}
                          <td style={tdStyle}>{(()=>{
                            const vals=anniDisp.map(a=>(totaliPerAnno[a].spesoFissi>0?totaliPerAnno[a].spesoFissi:totaliPerAnno[a].prevFissi));
                            for(let i=vals.length-1;i>0;i--) if(vals[i]>0&&vals[i-1]>0) return renderVar(calcVar(vals[i],vals[i-1]));
                            return renderVar(null);
                          })()}</td>
                        </tr>}

                        {vociVar.length>0&&<tr><td colSpan={anniDisp.length+2} style={{padding:"14px 10px 6px",fontSize:11,fontWeight:700,color:"#8E44AD",textTransform:"uppercase",letterSpacing:"0.08em",background:"#FDFBF7"}}>📊 Costi Variabili</td></tr>}
                        {vociVar.map(v=>renderRigaVoce(v))}
                        {vociVar.length>0&&<tr style={{background:"#FDFBF7"}}>
                          <td style={{...tdStyleLeft,fontWeight:700,color:"#8E44AD"}}>Totale Variabili</td>
                          {anniDisp.map(a=>{
                            const t=totaliPerAnno[a];
                            const valore = t.spesoVar>0?t.spesoVar:t.prevVar;
                            return <td key={a} style={{...tdStyle,fontWeight:700,color:"#8E44AD"}}>€ {fmt(Math.round(valore))}</td>;
                          })}
                          <td style={tdStyle}>{(()=>{
                            const vals=anniDisp.map(a=>(totaliPerAnno[a].spesoVar>0?totaliPerAnno[a].spesoVar:totaliPerAnno[a].prevVar));
                            for(let i=vals.length-1;i>0;i--) if(vals[i]>0&&vals[i-1]>0) return renderVar(calcVar(vals[i],vals[i-1]));
                            return renderVar(null);
                          })()}</td>
                        </tr>}

                        <tr style={{background:`${BRAND.oro}22`}}>
                          <td style={{...tdStyleLeft,fontWeight:800,color:BRAND.grigio,fontSize:14,borderTop:`2px solid ${BRAND.oro}`}}>TOTALE GENERALE</td>
                          {anniDisp.map(a=>{
                            const t=totaliPerAnno[a];
                            const valore = t.spesoTot>0?t.spesoTot:t.prevTot;
                            return <td key={a} style={{...tdStyle,fontWeight:800,color:BRAND.grigio,fontSize:14,borderTop:`2px solid ${BRAND.oro}`}}>€ {fmt(Math.round(valore))}</td>;
                          })}
                          <td style={{...tdStyle,borderTop:`2px solid ${BRAND.oro}`}}>{(()=>{
                            const vals=anniDisp.map(a=>(totaliPerAnno[a].spesoTot>0?totaliPerAnno[a].spesoTot:totaliPerAnno[a].prevTot));
                            for(let i=vals.length-1;i>0;i--) if(vals[i]>0&&vals[i-1]>0) return renderVar(calcVar(vals[i],vals[i-1]));
                            return renderVar(null);
                          })()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{fontSize:11,color:"#888",lineHeight:1.6,padding:"8px 12px",background:"#fafaf8",borderRadius:6}}>
                    <strong>Note:</strong> il confronto avviene per nome categoria (normalizzato). Se rinomini una categoria, il confronto storico per quella voce si interromperà. Le variazioni in <span style={{color:"#E74C3C",fontWeight:700}}>↑ rosso</span> indicano aumento di spesa, in <span style={{color:"#27AE60",fontWeight:700}}>↓ verde</span> indicano risparmio.
                  </div>
                </>);
              })()}

            </div>);
          })()}

          {/* COSTI & BREAK EVEN AGENTE (solo per agenti non-Broker) */}
          {tab==="Costi"&&!isBroker&&!isReadOnly&&myAgentId&&(()=>{
            const agId6=utente?.agentId||myAgentId;
            const annoC=costiAnnoAg||annoCorrente;
            const CAT_AG_DEFAULT=[
              {id:"ag1",nome:"Carburante",totaleAnno:0,tipo:"variabile"},
              {id:"ag2",nome:"Telefono cellulare",totaleAnno:0,tipo:"fisso"},
              {id:"ag3",nome:"Corsi di formazione",totaleAnno:0,tipo:"variabile"},
              {id:"ag4",nome:"Abbigliamento professionale",totaleAnno:0,tipo:"variabile"},
              {id:"ag5",nome:"Software & App",totaleAnno:0,tipo:"fisso"},
              {id:"ag6",nome:"Materiale promozionale",totaleAnno:0,tipo:"variabile"},
              {id:"ag7",nome:"Spese auto",totaleAnno:0,tipo:"variabile"},
              {id:"ag8",nome:"Varie",totaleAnno:0,tipo:"variabile"},
            ];
            // Categorie agente: filtro per agentId e anno
            const keyAg=`ag_${agId6}`;
            const catAgAll=catCosti.filter(c=>String(c.agentId)===String(agId6)||(!c.agentId&&!c.isAgency));
            // Se non ha categorie proprie, usa default
            const catAgAnno=catCosti.filter(c=>String(c.agentId)===String(agId6)&&String(c.anno)===annoC);
            const hasCat=catAgAnno.length>0;
            const speseAgAnno=(speseCosti[`${agId6}_${annoC}`]||[]);
            const oggi7=todayStr();
            const totPrevAg=catAgAnno.reduce((s,c)=>s+Number(c.totaleAnno||0),0);
            const totSpesoAg=speseAgAnno.reduce((s,x)=>s+Number(x.importo||0),0);
            const percAg=totPrevAg>0?Math.min(100,Math.round(totSpesoAg/totPrevAg*100)):null;
            const addCatAg=(cat)=>{
              const id="ag_"+agId6+"_"+Date.now();
              setCatCosti(prev=>[...prev,{...cat,id,agentId:agId6,anno:Number(annoC)}]);
            };
            const updCatAg=(id,campo,val)=>setCatCosti(prev=>prev.map(c=>c.id===id?{...c,[campo]:val}:c));
            const delCatAg=(id)=>{if(window.confirm("Eliminare categoria?"))setCatCosti(prev=>prev.filter(c=>c.id!==id));};
            const initCatAg=()=>{
              const nuove=CAT_AG_DEFAULT.map(cat=>({
                ...cat,
                id:"ag_"+String(agId6)+"_"+cat.id+"_"+annoC,
                agentId:agId6,
                anno:Number(annoC)
              }));
              setCatCosti(prev=>{
                const next=[...prev,...nuove];
                return next;
              });
            };
            const copiaAnnoAg=()=>{
              const nextAnno=Number(annoC)+1;
              const existing=catCosti.filter(c=>String(c.agentId)===String(agId6)&&Number(c.anno)===nextAnno);
              if(existing.length>0){if(!window.confirm(`Esistono già ${existing.length} categorie per ${nextAnno}. Sovrascrivere?`))return;}
              const nuove=catAgAnno.map(c=>({...c,id:c.id+"_"+nextAnno,anno:nextAnno,totaleAnno:0}));
              setCatCosti(prev=>[...prev.filter(c=>!(c.agentId===agId6&&c.anno===nextAnno)),...nuove]);
              setCostiAnnoAg(String(nextAnno));
            };
            const addSpesaAg=(sp)=>{
              const id="sp_"+Date.now();
              setSpeseCosti(prev=>({...prev,[`${agId6}_${annoC}`]:[...(prev[`${agId6}_${annoC}`]||[]),{id,...sp}]}));
              setFormSpesa(null);
            };
            const delSpesaAg=(id)=>setSpeseCosti(prev=>({...prev,[`${agId6}_${annoC}`]:(prev[`${agId6}_${annoC}`]||[]).filter(s=>s.id!==id)}));
            const speseByCatAg=(catId)=>speseAgAnno.filter(s=>s.catId===catId);
            const ANNI_AG=[...new Set(catCosti.filter(c=>c.agentId===agId6).map(c=>String(c.anno)).concat([annoCorrente]))].sort((a,b)=>b-a);
            const sC3={background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"14px 16px"};
            return(<div style={S.sec}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:10}}>
                <div>
                  <h2 style={{fontSize:16,fontWeight:600,margin:0,color:BRAND.grigio}}>💰 I miei costi</h2>
                  <div style={{fontSize:12,color:"#888",marginTop:3}}>Anno {annoC} — spese personali</div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <select style={S.sel} value={annoC} onChange={e=>setCostiAnnoAg(e.target.value)}>
                    {ANNI_AG.map(a=><option key={a}>{a}</option>)}
                  </select>
                  {hasCat&&<button onClick={copiaAnnoAg} style={{...S.btn,fontSize:11,background:"#E1F5EE",border:"0.5px solid #27AE60",color:"#085041"}}>📥 Usa {annoC} come base {Number(annoC)+1}</button>}
                  <button onClick={()=>setShowGestCat(!showGestCat)} style={{...S.btn,fontSize:11,background:showGestCat?"#EEEDFE":"#fafaf8",border:`0.5px solid ${showGestCat?"#533AB7":"#ddd"}`,color:showGestCat?"#533AB7":"#888"}}>⚙ Gestisci categorie</button>
                  {hasCat&&<button onClick={()=>setFormSpesa({data:oggi7,descrizione:"",importo:"",catId:"",note:""})} style={{...S.btnP,fontSize:12,padding:"6px 14px"}}>+ Aggiungi spesa</button>}
                </div>
              </div>

              {/* Setup iniziale */}
              {!hasCat&&<div style={{...sC3,border:"1px dashed #A8863A",textAlign:"center",padding:"2rem",marginBottom:"1.5rem"}}>
                <div style={{fontSize:28,marginBottom:12}}>💰</div>
                <div style={{fontSize:14,fontWeight:600,color:"#633806",marginBottom:6}}>Configura i tuoi costi personali</div>
                <div style={{fontSize:12,color:"#888",marginBottom:"1.5rem"}}>Crea le categorie di spesa per l'anno {annoC}.<br/>Puoi partire dalle categorie suggerite o crearne di personalizzate.</div>
                <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                  <button onClick={initCatAg} style={{...S.btnP,fontSize:12,padding:"8px 20px"}}>🚀 Usa categorie suggerite</button>
                  <button onClick={()=>{setShowGestCat(true);}} style={{...S.btn,fontSize:12,padding:"8px 16px"}}>+ Crea categorie personalizzate</button>
                </div>
              </div>}

              {/* Gestione categorie inline */}
              {showGestCat&&<div style={{...sC3,border:"1px solid #533AB7",marginBottom:"1.5rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#533AB7"}}>⚙ Le mie categorie — {annoC}</span>
                  <button onClick={()=>setShowGestCat(false)} style={{...S.btn,fontSize:11}}>✕ Chiudi</button>
                </div>
                {catAgAnno.length===0&&<div style={{fontSize:12,color:"#bbb",fontStyle:"italic",marginBottom:10}}>Nessuna categoria. Aggiungine una qui sotto.</div>}
                {catAgAnno.map(cat=>(
                  <div key={cat.id} style={{display:"grid",gridTemplateColumns:"1fr 120px 100px 40px",gap:8,alignItems:"center",padding:"7px 0",borderBottom:"0.5px solid #f5f5f5"}}>
                    <input style={{...S.inp,margin:0,fontSize:12}} value={cat.nome} onChange={e=>updCatAg(cat.id,"nome",e.target.value)}/>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:11,color:"#888"}}>€</span>
                      <input type="number" min="0" style={{...S.inp,margin:0,fontSize:12,textAlign:"right"}} value={cat.totaleAnno||""} placeholder="Prev. anno" onChange={e=>updCatAg(cat.id,"totaleAnno",Number(e.target.value))}/>
                    </div>
                    <select style={{...S.sel,fontSize:11}} value={cat.tipo} onChange={e=>updCatAg(cat.id,"tipo",e.target.value)}>
                      <option value="fisso">Fisso</option>
                      <option value="variabile">Variabile</option>
                    </select>
                    <button onClick={()=>delCatAg(cat.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#ddd"}}>🗑</button>
                  </div>
                ))}
                {formNuovaCatAg!==null
                  ?<div style={{display:"grid",gridTemplateColumns:"1fr 120px 100px auto",gap:8,alignItems:"center",marginTop:10}}>
                    <input autoFocus style={{...S.inp,margin:0,fontSize:12}} value={formNuovaCatAg.nome||""} placeholder="Nome categoria..." onChange={e=>setFormNuovaCatAg({...formNuovaCatAg,nome:e.target.value})} onKeyDown={e=>{if(e.key==="Enter"&&formNuovaCatAg.nome?.trim()){addCatAg({...formNuovaCatAg,totaleAnno:Number(formNuovaCatAg.totale||0)});setFormNuovaCatAg(null);}}}/>
                    <input type="number" style={{...S.inp,margin:0,fontSize:12}} value={formNuovaCatAg.totale||""} placeholder="Prev. (€)" onChange={e=>setFormNuovaCatAg({...formNuovaCatAg,totale:e.target.value})}/>
                    <select style={{...S.sel,fontSize:11}} value={formNuovaCatAg.tipo||"variabile"} onChange={e=>setFormNuovaCatAg({...formNuovaCatAg,tipo:e.target.value})}>
                      <option value="fisso">Fisso</option>
                      <option value="variabile">Variabile</option>
                    </select>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>{if(formNuovaCatAg.nome?.trim()){addCatAg({...formNuovaCatAg,totaleAnno:Number(formNuovaCatAg.totale||0)});setFormNuovaCatAg(null);}}} style={{...S.btnP,fontSize:11,padding:"5px 10px"}}>✓</button>
                      <button onClick={()=>setFormNuovaCatAg(null)} style={{...S.btn,fontSize:11,padding:"5px 8px"}}>✕</button>
                    </div>
                  </div>
                  :<button onClick={()=>setFormNuovaCatAg({nome:"",totale:"",tipo:"variabile"})} style={{...S.btn,fontSize:11,marginTop:10,width:"100%"}}>+ Aggiungi categoria</button>
                }
              </div>}

              {/* KPI */}
              {hasCat&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:"1.5rem"}}>
                {[
                  ["Previsionale anno","€ "+fmt(Math.round(totPrevAg)),"#E74C3C",null,"da categorie configurate"],
                  ["Speso YTD","€ "+fmt(Math.round(totSpesoAg)),"#E67E22",percAg,percAg!=null?percAg+"% del previsionale":""],
                  ["Fissi / mese","€ "+fmt(Math.round(catAgAnno.filter(c=>c.tipo==="fisso").reduce((s,c)=>s+Number(c.totaleAnno||0),0)/12)),"#185FA5",null,"stima mensile"],
                  ["Rimanente","€ "+fmt(Math.max(0,Math.round(totPrevAg-totSpesoAg))),"#27AE60",null,"previsionale residuo"],
                ].map(([lbl,val,clr,perc,sub])=>(
                  <div key={lbl} style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem",textAlign:"center",borderTop:`3px solid ${clr}`}}>
                    <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>{lbl}</div>
                    <div style={{fontSize:22,fontWeight:700,color:clr,marginBottom:4}}>{val}</div>
                    {perc!=null&&<div style={{height:4,background:"#f0f0f0",borderRadius:2,overflow:"hidden",margin:"4px 0"}}><div style={{height:"100%",width:perc+"%",background:perc>=100?"#E74C3C":perc>=70?"#E67E22":clr,borderRadius:2}}/></div>}
                    <div style={{fontSize:10,color:"#aaa"}}>{sub}</div>
                  </div>
                ))}
              </div>}

              {/* Form aggiungi spesa */}
              {formSpesa&&<div style={{...sC3,border:"1px solid #A8863A",marginBottom:"1.5rem"}}>
                <div style={{fontSize:13,fontWeight:600,color:"#633806",marginBottom:12}}>+ Nuova spesa — {annoC}</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 120px 160px",gap:10,marginBottom:10}}>
                  <div><label style={S.lbl}>Data</label><input type="date" style={S.inp} value={formSpesa.data} onChange={e=>setFormSpesa({...formSpesa,data:e.target.value})}/></div>
                  <div><label style={S.lbl}>Descrizione</label><input style={S.inp} value={formSpesa.descrizione} placeholder="es. Benzina" onChange={e=>setFormSpesa({...formSpesa,descrizione:e.target.value})}/></div>
                  <div><label style={S.lbl}>Importo (€)</label><input type="number" min="0" style={S.inp} value={formSpesa.importo} placeholder="0" onChange={e=>setFormSpesa({...formSpesa,importo:e.target.value})}/></div>
                  <div><label style={S.lbl}>Categoria</label>
                    <select style={S.inp} value={formSpesa.catId} onChange={e=>setFormSpesa({...formSpesa,catId:e.target.value})}>
                      <option value="">Seleziona...</option>
                      {catAgAnno.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:10}}><label style={S.lbl}>Note (opzionale)</label><input style={S.inp} value={formSpesa.note||""} placeholder="Annotazioni..." onChange={e=>setFormSpesa({...formSpesa,note:e.target.value})}/></div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setFormSpesa(null)} style={{...S.btn,fontSize:12}}>Annulla</button>
                  <button onClick={()=>{if(!formSpesa.descrizione||!formSpesa.importo||!formSpesa.catId)return alert("Compila descrizione, importo e categoria");addSpesaAg(formSpesa);}} style={{...S.btnP,fontSize:12,padding:"7px 18px"}}>💾 Salva</button>
                </div>
              </div>}

              {/* Categorie con spese */}
              {hasCat&&<div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",overflow:"hidden"}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:4,height:18,borderRadius:2,background:"#E74C3C"}}/>
                  <span style={{fontSize:13,fontWeight:600,color:"#E74C3C"}}>Le mie spese per categoria</span>
                  <span style={{fontSize:11,color:"#aaa",marginLeft:"auto"}}>{speseAgAnno.length} spese · anno {annoC}</span>
                </div>
                {(()=>{
                  const catFissiAg=catAgAnno.filter(x=>x.tipo==="fisso");
                  const catVariAg=catAgAnno.filter(x=>x.tipo==="variabile");
                  const renderRiga=(cat)=>{
                    const spese=speseByCatAg(cat.id).sort((a,b)=>(b.data||"").localeCompare(a.data||""));
                    const totCat=spese.reduce((s,x)=>s+Number(x.importo||0),0);
                    const percCat=cat.totaleAnno>0?Math.min(100,Math.round(totCat/cat.totaleAnno*100)):null;
                    const over=cat.totaleAnno>0&&totCat>cat.totaleAnno;
                    const expanded=costiCatExpand[cat.id];
                    return(<div key={cat.id}>
                      <div onClick={()=>setCostiCatExpand(prev=>({...prev,[cat.id]:!prev[cat.id]}))}
                        style={{display:"flex",alignItems:"center",padding:"10px 16px",cursor:"pointer",borderBottom:"0.5px solid #f5f5f5",gap:8}}>
                        <span style={{fontSize:12,color:"#aaa",flexShrink:0}}>▶</span>
                        <span style={{flex:1,fontSize:13,fontWeight:500,color:"#2c2c2c"}}>{cat.nome}</span>
                        {over&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:6,background:"#FDECEA",color:"#E74C3C",fontWeight:600}}>⚠</span>}
                        <div style={{textAlign:"right",minWidth:160}}>
                          {cat.totaleAnno>0&&<div style={{height:3,background:"#f0f0f0",borderRadius:2,overflow:"hidden",marginBottom:3,width:80,marginLeft:"auto"}}>
                            <div style={{height:"100%",width:(percCat||0)+"%",background:over?"#E74C3C":percCat>=80?"#E67E22":"#533AB7",borderRadius:2}}/>
                          </div>}
                          <div style={{display:"flex",gap:16,justifyContent:"flex-end"}}>
                            <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#aaa"}}>Prev.</div><div style={{fontSize:12,fontWeight:500,color:"#aaa"}}>€ {fmt(cat.totaleAnno||0)}</div></div>
                            <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#aaa"}}>Speso</div><div style={{fontSize:12,fontWeight:500,color:over?"#E74C3C":"#533AB7"}}>€ {fmt(totCat)}</div></div>
                          </div>
                        </div>
                      </div>
                      {expanded&&<div style={{background:"#fafaf8",padding:"8px 16px 8px 32px",borderBottom:"0.5px solid #f0f0f0"}}>
                        {spese.length===0&&<p style={{fontSize:12,color:"#bbb",fontStyle:"italic",margin:"4px 0"}}>Nessuna spesa inserita</p>}
                        {spese.map(sp=>(
                          <div key={sp.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"0.5px solid #f8f8f8"}}>
                            <span style={{fontSize:11,color:"#aaa",minWidth:36}}>{sp.data?fmtD(sp.data).slice(0,5):"—"}</span>
                            <span style={{flex:1,fontSize:12}}>{sp.descrizione||"—"}</span>
                            <span style={{fontSize:12,fontWeight:500,color:"#533AB7"}}>€ {fmt(Number(sp.importo||0))}</span>
                            <button onClick={()=>setSpeseCosti(prev=>({...prev,[`${agId6}_${annoC}`]:(prev[`${agId6}_${annoC}`]||[]).filter(s=>s.id!==sp.id)}))}
                              style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:13}}
                              onMouseEnter={e=>e.currentTarget.style.color="#E74C3C"} onMouseLeave={e=>e.currentTarget.style.color="#ddd"}>×</button>
                          </div>
                        ))}
                        <button onClick={()=>setFormSpesa({catId:cat.id,data:todayStr(),importo:"",descrizione:"",tipo:cat.tipo,note:""})}
                          style={{fontSize:11,marginTop:6,padding:"4px 12px",borderRadius:6,border:"0.5px dashed "+BRAND.oro,background:"#FDF6EC",color:BRAND.oroD,cursor:"pointer",fontFamily:"inherit"}}>
                          + Aggiungi spesa qui
                        </button>
                      </div>}
                    </div>);
                  };
                  return(<>
                    {/* FISSI */}
                    {catFissiAg.length>0&&<div style={{marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderBottom:"2px solid #185FA5",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:"#185FA5",textTransform:"uppercase",letterSpacing:".06em"}}>📌 Fissi</span>
                        <span style={{fontSize:11,color:"#aaa",marginLeft:"auto"}}>Prev: <strong style={{color:"#185FA5"}}>€ {fmt(catFissiAg.reduce((s,c)=>s+Number(c.totaleAnno||0),0))}</strong> · Speso: <strong style={{color:"#185FA5"}}>€ {fmt(catFissiAg.reduce((s,cat)=>s+speseByCatAg(cat.id).reduce((a,x)=>a+Number(x.importo||0),0),0))}</strong></span>
                      </div>
                      {catFissiAg.map(cat=><React.Fragment key={cat.id}>{renderRiga(cat)}</React.Fragment>)}
                    </div>}
                    {/* VARIABILI */}
                    {catVariAg.length>0&&<div style={{marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderBottom:"2px solid #533AB7",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:"#533AB7",textTransform:"uppercase",letterSpacing:".06em"}}>📊 Variabili</span>
                        <span style={{fontSize:11,color:"#aaa",marginLeft:"auto"}}>Prev: <strong style={{color:"#533AB7"}}>€ {fmt(catVariAg.reduce((s,c)=>s+Number(c.totaleAnno||0),0))}</strong> · Speso: <strong style={{color:"#533AB7"}}>€ {fmt(catVariAg.reduce((s,cat)=>s+speseByCatAg(cat.id).reduce((a,x)=>a+Number(x.importo||0),0),0))}</strong></span>
                      </div>
                      {catVariAg.map(cat=><React.Fragment key={cat.id}>{renderRiga(cat)}</React.Fragment>)}
                    </div>}
                  </>);
                })()}
                {/* Totale */}
                <div style={{background:"#FFFBF0",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"2px solid #f0e8d0"}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#633806"}}>TOTALE {annoC}</span>
                  <div style={{display:"flex",gap:24}}>
                    {totPrevAg>0&&<div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#aaa"}}>Previsionale</div><div style={{fontSize:14,fontWeight:700,color:"#633806"}}>€ {fmt(Math.round(totPrevAg))}</div></div>}
                    <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#aaa"}}>Speso YTD</div><div style={{fontSize:14,fontWeight:700,color:"#E67E22"}}>€ {fmt(Math.round(totSpesoAg))}</div></div>
                    {totPrevAg>0&&<div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#aaa"}}>Rimanente</div><div style={{fontSize:14,fontWeight:700,color:"#27AE60"}}>€ {fmt(Math.max(0,Math.round(totPrevAg-totSpesoAg)))}</div></div>}
                  </div>
                </div>
              </div>}
            </div>);
          })()}

          {/* ── BREAK EVEN AGENTE ── */}
          {tab==="Break Even"&&!isBroker&&!isBackOffice&&myAgentId&&(()=>{
            const ag=agenti.find(a=>a.id===myAgentId);
            // Usa nuovo sistema catCosti per agente
            const costiAnnoBE=String(costiAgenteAnno||annoCorrente);
            const catAgBE=(()=>{
              const byAnno=catCosti.filter(x=>x.agentId===myAgentId&&String(x.anno)===costiAnnoBE);
              if(byAnno.length>0) return byAnno;
              const anni=[...new Set(catCosti.filter(x=>x.agentId===myAgentId).map(x=>x.anno))].sort((a,b)=>b-a);
              return anni.length>0?catCosti.filter(x=>x.agentId===myAgentId&&x.anno===anni[0]):[];
            })();
            const speseAgBE=speseCosti[`${myAgentId}_${costiAnnoBE}`]||[];
            const totPrevAnno=catAgBE.reduce((s,c)=>s+Number(c.totaleAnno||0),0);
            const totConsuntivo=catAgBE.reduce((s,cat)=>s+speseAgBE.filter(x=>x.catId===cat.id).reduce((a,x)=>a+Number(x.importo||0),0),0);
            const puntoBE=totConsuntivo>0?totConsuntivo:totPrevAnno;
            const costoMensile=puntoBE/12;

            // Quota agente nell'anno
            const myVendBE=venduti.filter(v=>getAnno(dataCompAgenzia(v))===costiAgenteAnno&&(v.agenteListing===myAgentId||v.agenteAcquirente===myAgentId||v.buyerListing===myAgentId||v.buyer===myAgentId));
            const calcQuotaAg=(vend,useInc)=>vend.reduce((s,v)=>{
              const pV=useInc?calcolaIncassatoV(v):Number(v.provvVenditore||0);
              const pA=useInc?calcolaIncassatoA(v):Number(v.provvAcquirente||0);
              let q=0;
              if(v.agenteListing===myAgentId) q+=pV*(Number(v.percListing||0)/100);
              if(v.agenteAcquirente===myAgentId) q+=pA*(Number(v.percAcquirente||0)/100);
              if(v.buyerListing===myAgentId&&v.agenteListing!==myAgentId) q+=pV*(Number(v.percBuyerListing||0)/100);
              if(v.buyer===myAgentId&&v.agenteAcquirente!==myAgentId) q+=pA*(Number(v.percBuyer||0)/100);
              return s+q;
            },0);
            const quotaTot=calcQuotaAg(myVendBE,false);
            const quotaInc=calcQuotaAg(myVendBE,true);
            const quotaDaInc=quotaTot-quotaInc;
            const percTot=puntoBE>0?Math.min(100,Math.round(quotaTot/puntoBE*100)):0;
            const percInc=puntoBE>0?Math.min(100,Math.round(quotaInc/puntoBE*100)):0;
            const beRaggiuntoTot=quotaTot>=puntoBE&&puntoBE>0;
            const meseCoperti=new Date().getFullYear()===Number(costiAgenteAnno)?new Date().getMonth()+1:12;
            const meseInc=costoMensile>0?Math.round(quotaInc/costoMensile*10)/10:0;
            const meseTot=costoMensile>0?Math.round(quotaTot/costoMensile*10)/10:0;

            return(<div style={S.sec}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",flexWrap:"wrap",gap:8}}>
                <h2 style={{fontSize:16,fontWeight:600,margin:0}}>📉 Break Even — {ag?.nome} {ag?.cognome} · {costiAgenteAnno}</h2>
                <select style={S.sel} value={costiAgenteAnno} onChange={e=>setCostiAgenteAnno(e.target.value)}>
                  {[...new Set([annoCorrente,...Object.keys(costiAgente[myAgentId]||{})])].sort().reverse().map(a=><option key={a}>{a}</option>)}
                </select>
              </div>

              {puntoBE===0?(<div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"2rem",textAlign:"center"}}>
                <p style={{fontSize:14,color:"#aaa",margin:"0 0 12px"}}>Nessuna spesa inserita per {costiAgenteAnno}</p>
                <p style={{fontSize:12,color:"#aaa"}}>Vai al TAB <strong>Costi</strong> e inserisci le tue voci di spesa per vedere il Break Even</p>
              </div>):(<>
                {/* Box 1: Punto BE */}
                <div style={{background:"linear-gradient(135deg,#2C2C2C,#3D3D3D)",borderRadius:12,padding:"1.25rem 1.5rem",marginBottom:"1.25rem",color:"#fff"}}>
                  <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".1em",color:"#aaa",margin:"0 0 6px"}}>Il tuo Punto di Break Even</p>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:8}}>
                    <p style={{fontSize:36,fontWeight:700,margin:0}}>€ {fmt(puntoBE)}</p>
                    <div style={{textAlign:"right"}}>
                      <p style={{fontSize:13,margin:"0 0 2px",color:"#ccc"}}>€ {fmt(Math.round(costoMensile))}<span style={{fontSize:11,color:"#aaa"}}>/mese</span></p>
                      <p style={{fontSize:11,color:"#aaa",margin:0}}>{totConsuntivo>0?"Consuntivo reale":"Previsionale"}</p>
                    </div>
                  </div>
                </div>

                {/* Box 2: Quota agente vs BE */}
                <div style={{background:"#fff",borderRadius:12,border:`1.5px solid ${beRaggiuntoTot?"#27AE60":"#E74C3C"}`,padding:"1.25rem 1.5rem",marginBottom:"1.25rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
                    <div>
                      <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:"#888",margin:"0 0 4px"}}>💰 Quota agente totale (incassato + da incassare)</p>
                      <p style={{fontSize:28,fontWeight:700,margin:0,color:beRaggiuntoTot?"#27AE60":"#2C2C2C"}}>€ {fmt(quotaTot)}</p>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:22,fontWeight:700,color:beRaggiuntoTot?"#27AE60":"#E74C3C"}}>{percTot}%</div>
                      <div style={{fontSize:11,color:"#aaa"}}>del break even</div>
                    </div>
                  </div>
                  <div style={{height:16,background:"#f0f0f0",borderRadius:8,overflow:"hidden",marginBottom:8}}>
                    <div style={{height:"100%",width:`${percTot}%`,background:beRaggiuntoTot?"#27AE60":"linear-gradient(90deg,#E74C3C,#C0392B)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:8}}>
                      {percTot>15&&<span style={{fontSize:11,fontWeight:600,color:"#fff"}}>€ {fmt(quotaTot)}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#888"}}>
                    <span>BE: <strong style={{color:"#E74C3C"}}>€ {fmt(puntoBE)}</strong></span>
                    {beRaggiuntoTot
                      ?<span style={{color:"#27AE60",fontWeight:600}}>✅ Break Even raggiunto! Utile: +€ {fmt(quotaTot-puntoBE)}</span>
                      :<span style={{color:"#E74C3C",fontWeight:500}}>⚠ Mancano: <strong>€ {fmt(puntoBE-quotaTot)}</strong></span>}
                  </div>
                </div>

                {/* Box 3: Cassa */}
                <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"1.25rem 1.5rem"}}>
                  <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:"#888",margin:"0 0 1rem"}}>✅ Situazione cassa</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"1rem"}}>
                    <div style={{background:"#E9F7EF",borderRadius:8,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"#27AE60",fontWeight:500,marginBottom:4}}>Incassato oggi</div>
                      <div style={{fontSize:22,fontWeight:700,color:"#27AE60"}}>€ {fmt(quotaInc)}</div>
                      <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{meseInc} mesi coperti</div>
                    </div>
                    <div style={{background:"#EAF4FB",borderRadius:8,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"#2980B9",fontWeight:500,marginBottom:4}}>Da incassare (già tuoi)</div>
                      <div style={{fontSize:22,fontWeight:700,color:"#2980B9"}}>€ {fmt(quotaDaInc)}</div>
                      <div style={{fontSize:11,color:"#aaa",marginTop:2}}>Crediti da incassare</div>
                    </div>
                  </div>
                  <div style={{height:12,background:"#f0f0f0",borderRadius:6,overflow:"hidden",display:"flex",marginBottom:6}}>
                    <div style={{height:"100%",width:`${percInc}%`,background:"#27AE60",transition:"width .6s"}}/>
                    <div style={{height:"100%",width:`${Math.min(100-percInc,Math.max(0,percTot-percInc))}%`,background:"#2980B9",opacity:.7,transition:"width .6s"}}/>
                  </div>
                  <div style={{display:"flex",gap:12,fontSize:10,color:"#aaa",marginBottom:"1rem"}}>
                    <span style={{color:"#27AE60"}}>■ Incassato {percInc}%</span>
                    <span style={{color:"#2980B9"}}>■ Da incassare {Math.max(0,percTot-percInc)}%</span>
                    <span>□ Mancante {Math.max(0,100-percTot)}%</span>
                  </div>
                  <div style={{background:"#fafaf8",borderRadius:8,padding:"10px 14px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,fontSize:12,textAlign:"center"}}>
                      <div><div style={{fontSize:10,color:"#aaa",marginBottom:2}}>Costo mensile</div><div style={{fontSize:16,fontWeight:600,color:"#E74C3C"}}>€ {fmt(Math.round(costoMensile))}</div></div>
                      <div><div style={{fontSize:10,color:"#aaa",marginBottom:2}}>Mesi coperti (inc.)</div><div style={{fontSize:16,fontWeight:600,color:meseInc>=meseCoperti?"#27AE60":"#E67E22"}}>{meseInc}</div><div style={{fontSize:10,color:"#aaa"}}>{meseInc>=meseCoperti?"✅ in pari":"su "+meseCoperti+" trascorsi"}</div></div>
                      <div><div style={{fontSize:10,color:"#aaa",marginBottom:2}}>Mesi coperti (tot.)</div><div style={{fontSize:16,fontWeight:600,color:meseTot>=meseCoperti?"#27AE60":"#E67E22"}}>{meseTot}</div><div style={{fontSize:10,color:"#aaa"}}>{meseTot>=12?"✅ anno coperto":meseTot>=meseCoperti?"✅ in pari":"su "+meseCoperti+" trascorsi"}</div></div>
                    </div>
                  </div>
                </div>
              </>)}
            </div>);
          })()}


          {tab==="Fatture Agente"&&!isBroker&&!isBackOffice&&myAgentId&&(()=>{
            const agMio = agenti.find(a=>a.id===myAgentId);
            if(!agMio) return null;

            // === Helpers (stessi del broker per coerenza) ===
            const calcQuotaPerRuolo = (v, agId, ruolo) => {
              if(ruolo==="listing"&&Number(v.agenteListing)===agId) return Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
              if(ruolo==="acquirente"&&Number(v.agenteAcquirente)===agId) return Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
              if(ruolo==="buyerListing"&&Number(v.buyerListing)===agId&&Number(v.agenteListing)!==agId) return Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;
              if(ruolo==="buyer"&&Number(v.buyer)===agId&&Number(v.agenteAcquirente)!==agId) return Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;
              return 0;
            };
            const calcPercIncasso = (v) => {
              const provTot = Number(v.provvVenditore||0)+Number(v.provvAcquirente||0);
              if(provTot===0) return 0;
              const incTot = calcolaIncassatoV(v)+calcolaIncassatoA(v);
              return Math.round(incTot/provTot*100);
            };
            const stCli = (v) => {
              const p = calcPercIncasso(v);
              if(p>=100) return {lbl:"Sì",clr:"#0F6E56",bg:"#E1F5EE",ic:"✓"};
              if(p>0) return {lbl:`${p}%`,clr:"#BA7517",bg:"#FAEEDA",ic:"⏳"};
              return {lbl:"No",clr:"#A32D2D",bg:"#FCEBEB",ic:"✕"};
            };
            const ruoloLbl = {"listing":"Listing","acquirente":"Acquirente","buyerListing":"Buyer L","buyer":"Buyer"};
            const ruoloClr = {"listing":"#0C447C","acquirente":"#3C3489","buyerListing":"#633806","buyer":"#A32D2D"};
            const ruoloBg = {"listing":"#E6F1FB","acquirente":"#EEEDFE","buyerListing":"#FAEEDA","buyer":"#FCEBEB"};
            const cfgStatoP = {
              "inviato":{lbl:"Da fatturare",clr:"#0C447C",bg:"#E6F1FB",ic:"✉",hint:"Il broker ha preparato il prospetto, devi emettere fattura"},
              "fatturato":{lbl:"In attesa bonifico",clr:"#633806",bg:"#FAEEDA",ic:"⏳",hint:"La tua fattura è registrata, in attesa di pagamento dal broker"},
              "pagato":{lbl:"Incassato",clr:"#0F6E56",bg:"#E1F5EE",ic:"✓",hint:"Bonifico ricevuto"},
              "annullato":{lbl:"Annullato",clr:"#666",bg:"#F1EFE8",ic:"—",hint:"Prospetto annullato"},
            };

            // === venditoId/ruolo già in un prospetto NON annullato (queste sono "in lavorazione") ===
            const venditoIdOccupati = new Set();
            prospetti.forEach(p=>{
              if(p.statoFlow==="annullato") return;
              (p.righe||[]).forEach(r=>{
                venditoIdOccupati.add(`${r.venditoId}_${r.ruolo}_${p.agenteId}`);
              });
            });

            // === Quote maturate disponibili (non ancora in prospetto) ===
            const annoSel = fatAgAnno || annoCorrente;
            const righeDisponibili = (()=>{
              const out = [];
              venduti.forEach(v=>{
                if(annoSel!=="Tutti" && getAnno(dataCompAgenzia(v))!==annoSel) return;
                ["listing","acquirente","buyerListing","buyer"].forEach(ruolo=>{
                  const importo = calcQuotaPerRuolo(v, myAgentId, ruolo);
                  if(importo<=0) return;
                  const key = `${v.id}_${ruolo}_${myAgentId}`;
                  if(venditoIdOccupati.has(key)) return;
                  out.push({venditoId:v.id, v, ruolo, importo, key});
                });
              });
              return out.sort((a,b)=>(dataCompAgenzia(b.v)||"").localeCompare(dataCompAgenzia(a.v)||""));
            })();

            // === I MIEI prospetti (filtrati per anno) ===
            // Per i prospetti PAGATI: filtro per anno di dataPagamento (criterio cassa)
            // Per gli altri (inviato/fatturato/annullato): filtro per anno di dataCreazione (sono "aperti")
            const mieiProspetti = prospetti
              .filter(p=>p.agenteId===myAgentId)
              .filter(p=>{
                if(annoSel==="Tutti") return true;
                if(p.statoFlow==="pagato") return (p.dataPagamento||"").startsWith(annoSel);
                return (p.dataCreazione||"").startsWith(annoSel);
              })
              .sort((a,b)=>(b.dataCreazione||"").localeCompare(a.dataCreazione||""));

            // === KPI ===
            // CRITERIO DI CASSA per l'agente: "Già incassato" filtra per anno di dataPagamento (bonifico effettivo)
            // Le altre voci (Da fatturare, In attesa) sono "aperte" e non hanno anno definitivo finché non vengono pagate
            const totDaFatturare = righeDisponibili.reduce((s,r)=>s+r.importo,0);
            // Da fatturare/In attesa bonifico: tutti i prospetti dell'agente che non sono pagati né annullati (no filtro anno)
            const prospAttiviTot = prospetti.filter(p=>p.agenteId===myAgentId);
            const totDaEmettere = prospAttiviTot.filter(p=>p.statoFlow==="inviato").reduce((s,p)=>s+Number(p.totale||0),0);
            const totInAttesa = prospAttiviTot.filter(p=>p.statoFlow==="fatturato").reduce((s,p)=>s+Number(p.totale||0),0);
            // Già incassato: prospetti pagati con dataPagamento nell'anno selezionato (criterio CASSA per l'agente)
            const prospPagatiAnno = prospAttiviTot.filter(p=>p.statoFlow==="pagato" && p.dataPagamento && (annoSel==="Tutti" || p.dataPagamento.startsWith(annoSel)));
            const totIncassato = prospPagatiAnno.reduce((s,p)=>s+Number(p.totale||0),0);
            const nDaFatt = prospAttiviTot.filter(p=>p.statoFlow==="inviato").length;
            const nInAttesa = prospAttiviTot.filter(p=>p.statoFlow==="fatturato").length;
            const nPagati = prospPagatiAnno.length;

            // === Modale dettaglio prospetto aperto (solo lettura per agente) ===
            const prAttivoMio = showProspettoAg ? mieiProspetti.find(p=>p.id===showProspettoAg) : null;

            // === Anni disponibili ===
            const anniMieiSet = new Set();
            venduti.forEach(v=>{
              if(Number(v.agenteListing)===myAgentId||Number(v.agenteAcquirente)===myAgentId||Number(v.buyerListing)===myAgentId||Number(v.buyer)===myAgentId){
                const a = getAnno(dataCompAgenzia(v));
                if(a) anniMieiSet.add(a);
              }
            });
            prospetti.filter(p=>p.agenteId===myAgentId).forEach(p=>{
              const a = (p.dataCreazione||"").substring(0,4);
              if(a) anniMieiSet.add(a);
            });
            anniMieiSet.add(String(annoCorrente));
            const anniMieiArr = [...anniMieiSet].sort().reverse();

            return(<div style={S.sec}>
              {/* HEADER */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:"1.25rem",padding:"1rem 1.25rem",background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0"}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#fff",flexShrink:0}}>{agMio.nome.charAt(0)}</div>
                  <div>
                    <p style={{fontSize:11,color:BRAND.oroD,margin:"0 0 2px",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>🧾 Le mie fatture</p>
                    <h2 style={{margin:0,fontSize:18,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>{agMio.nome} {agMio.cognome}</h2>
                    <p style={{margin:"2px 0 0",fontSize:12,color:"#888"}}>Compensi maturati, fatture emesse, bonifici ricevuti</p>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <label style={{fontSize:11,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Anno:</label>
                  <select style={S.sel} value={annoSel} onChange={e=>setFatAgAnno(e.target.value)}>
                    {anniMieiArr.map(a=><option key={a} value={a}>{a}</option>)}
                    <option value="Tutti">Tutti gli anni</option>
                  </select>
                </div>
              </div>

              {/* Banner didascalico */}
              <div style={{background:"#EAF4FB",border:"1px solid #2980B944",borderLeft:"4px solid #2980B9",borderRadius:8,padding:"10px 14px",marginBottom:"1.25rem",fontSize:12,color:"#1B5C8C",lineHeight:1.5}}>
                <strong>💡 Come funziona:</strong> il broker prepara un <strong>prospetto</strong> con le tue quote maturate → tu emetti la <strong>fattura</strong> per quell'importo → il broker la registra e ti paga con bonifico.
                <br/><strong style={{color:BRAND.oroD}}>📅 Criterio di cassa:</strong> i bonifici sono conteggiati nell'anno in cui sono stati <strong>effettivamente ricevuti</strong> (data bonifico), non l'anno della pratica. Questo allinea il dato a quello che vede il tuo commercialista.
              </div>

              {/* 4 KPI */}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #BA7517`,padding:"1rem",textAlign:"center"}}>
                  <p style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 6px",fontWeight:700}}>Quote disponibili</p>
                  <p style={{fontSize:20,fontWeight:700,color:"#BA7517",fontFamily:"Georgia,serif",margin:0}}>€ {fmt(Math.round(totDaFatturare))}</p>
                  <p style={{fontSize:10,color:"#aaa",margin:"3px 0 0"}}>{righeDisponibili.length} righe in attesa prospetto</p>
                </div>
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #0C447C`,padding:"1rem",textAlign:"center"}}>
                  <p style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 6px",fontWeight:700}}>Da fatturare</p>
                  <p style={{fontSize:20,fontWeight:700,color:"#0C447C",fontFamily:"Georgia,serif",margin:0}}>€ {fmt(Math.round(totDaEmettere))}</p>
                  <p style={{fontSize:10,color:"#aaa",margin:"3px 0 0"}}>{nDaFatt} prospett{nDaFatt===1?"o":"i"} ricevut{nDaFatt===1?"o":"i"}</p>
                </div>
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #633806`,padding:"1rem",textAlign:"center"}}>
                  <p style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 6px",fontWeight:700}}>In attesa bonifico</p>
                  <p style={{fontSize:20,fontWeight:700,color:"#633806",fontFamily:"Georgia,serif",margin:0}}>€ {fmt(Math.round(totInAttesa))}</p>
                  <p style={{fontSize:10,color:"#aaa",margin:"3px 0 0"}}>{nInAttesa} fattur{nInAttesa===1?"a":"e"} emess{nInAttesa===1?"a":"e"}</p>
                </div>
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #0F6E56`,padding:"1rem",textAlign:"center"}}>
                  <p style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 6px",fontWeight:700}}>Già incassato</p>
                  <p style={{fontSize:20,fontWeight:700,color:"#0F6E56",fontFamily:"Georgia,serif",margin:0}}>€ {fmt(Math.round(totIncassato))}</p>
                  <p style={{fontSize:10,color:"#aaa",margin:"3px 0 0"}}>{nPagati} bonifici ricevuti</p>
                </div>
              </div>

              {/* SEZIONE 1: I miei prospetti */}
              <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1.25rem"}}>
                <div style={{padding:"10px 14px",background:"#FDFBF7",borderBottom:"0.5px solid #e8e5e0"}}>
                  <p style={{margin:0,fontSize:13,fontWeight:600,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>📋 Prospetti ricevuti dal broker</p>
                  <p style={{margin:"3px 0 0",fontSize:11,color:"#888"}}>{mieiProspetti.length} prospett{mieiProspetti.length===1?"o":"i"} {annoSel==="Tutti"?"in totale":"nel "+annoSel} · Clicca per vedere il dettaglio</p>
                </div>
                {mieiProspetti.length===0?(
                  <div style={{padding:"2rem 1rem",textAlign:"center",color:"#aaa",fontSize:13}}>
                    Nessun prospetto ricevuto {annoSel==="Tutti"?"":"nel "+annoSel}.<br/>
                    <span style={{fontSize:11,color:"#bbb"}}>Quando il broker preparerà i tuoi compensi vedrai i prospetti qui.</span>
                  </div>
                ):(
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
                      <thead><tr style={{background:"#fafaf8"}}>
                        {["Prospetto","Data","Pratiche","Importo","N° mia fattura","Stato"].map(h=><th key={h} style={{...S.th,fontSize:10}}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {mieiProspetti.map(p=>{
                          const cfg = cfgStatoP[p.statoFlow]||cfgStatoP["inviato"];
                          return(<tr key={p.id} onClick={()=>setShowProspettoAg(p.id)} style={{cursor:"pointer",borderBottom:"0.5px solid #f0f0f0",background:p.statoFlow==="annullato"?"#fafafa":"#fff",opacity:p.statoFlow==="annullato"?0.6:1}}>
                            <td style={{...S.td,fontWeight:600,color:BRAND.oroD}}>{p.numero}</td>
                            <td style={{...S.td,color:"#888",fontSize:12,whiteSpace:"nowrap"}}>{fmtD(p.dataCreazione)}</td>
                            <td style={{...S.td,fontSize:12,color:"#666"}}>{(p.righe||[]).length} pratich{(p.righe||[]).length===1?"a":"e"}</td>
                            <td style={{...S.td,textAlign:"right",fontWeight:600}}>€ {fmt(Math.round(Number(p.totale||0)))}</td>
                            <td style={{...S.td,fontSize:12}}>
                              {p.numFatturaAg?<><strong>{p.numFatturaAg}</strong>{p.dataFatturaAg&&<span style={{color:"#888"}}> ({fmtD(p.dataFatturaAg)})</span>}</>:<span style={{color:"#bbb",fontStyle:"italic"}}>da emettere</span>}
                            </td>
                            <td style={{...S.td}}><span style={{fontSize:11,padding:"3px 10px",borderRadius:4,background:cfg.bg,color:cfg.clr,fontWeight:600}}>{cfg.ic} {cfg.lbl}{p.statoFlow==="pagato"&&p.dataPagamento?` ${fmtD(p.dataPagamento)}`:""}</span></td>
                          </tr>);
                        })}
                      </tbody>
                      {mieiProspetti.length>0&&<tfoot><tr style={{background:`${BRAND.oro}15`,fontWeight:700}}>
                        <td colSpan={3} style={{padding:"10px 12px",fontFamily:"Georgia,serif",borderTop:`1.5px solid ${BRAND.oro}`}}>TOTALE</td>
                        <td style={{padding:"10px 12px",textAlign:"right",color:BRAND.oroD,borderTop:`1.5px solid ${BRAND.oro}`,fontSize:14}}>€ {fmt(Math.round(mieiProspetti.reduce((s,p)=>p.statoFlow==="annullato"?s:s+Number(p.totale||0),0)))}</td>
                        <td colSpan={2} style={{padding:"10px 12px",borderTop:`1.5px solid ${BRAND.oro}`}}/>
                      </tr></tfoot>}
                    </table>
                  </div>
                )}
              </div>

              {/* SEZIONE 2: Quote maturate non ancora in prospetto (informativo) */}
              {righeDisponibili.length>0&&<div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1.25rem"}}>
                <div style={{padding:"10px 14px",background:"#FDFBF7",borderBottom:"0.5px solid #e8e5e0",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <div>
                    <p style={{margin:0,fontSize:13,fontWeight:600,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🧾 Quote disponibili (in attesa di prospetto dal broker)</p>
                    <p style={{margin:"3px 0 0",fontSize:11,color:"#888"}}>Pratiche dove hai maturato una quota che il broker non ha ancora inserito in un prospetto</p>
                  </div>
                  <span style={{fontSize:12,color:"#888"}}>{righeDisponibili.length} righe · € {fmt(Math.round(totDaFatturare))}</span>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
                    <thead><tr style={{background:"#fafaf8"}}>
                      {["Pratica","Data","Ruolo","Cliente ha pagato?","Quota"].map((h,i)=><th key={h} style={{...S.th,fontSize:10,textAlign:i===4?"right":(i===3?"center":"left")}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {righeDisponibili.map(r=>{
                        const cli = stCli(r.v);
                        return(<tr key={r.key} style={{borderBottom:"0.5px solid #f0f0f0"}}>
                          <td style={{...S.td}}><strong>{r.v.comuneImmobile}</strong> — {r.v.indirizzoImmobile}</td>
                          <td style={{...S.td,color:"#888",fontSize:12,whiteSpace:"nowrap"}}>{fmtD(dataCompAgenzia(r.v))}</td>
                          <td style={{...S.td}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:ruoloBg[r.ruolo],color:ruoloClr[r.ruolo],fontWeight:600}}>{ruoloLbl[r.ruolo]}</span></td>
                          <td style={{...S.td,textAlign:"center"}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:cli.bg,color:cli.clr,fontWeight:600}}>{cli.ic} {cli.lbl}</span></td>
                          <td style={{...S.td,textAlign:"right",fontWeight:600,color:"#BA7517"}}>€ {fmt(Math.round(r.importo))}</td>
                        </tr>);
                      })}
                    </tbody>
                  </table>
                </div>
              </div>}

              {/* ────────────────────── MODALE DETTAGLIO PROSPETTO (SOLA LETTURA) ────────────────────── */}
              {prAttivoMio&&(()=>{
                const cfg = cfgStatoP[prAttivoMio.statoFlow]||cfgStatoP["inviato"];
                return(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowProspettoAg(null)}>
                  <div style={{...S.modal,maxWidth:620}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem",paddingBottom:"0.875rem",borderBottom:`2px solid ${BRAND.oro}`,flexWrap:"wrap",gap:8}}>
                      <div>
                        <p style={{fontSize:11,color:BRAND.oroD,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>Prospetto ricevuto</p>
                        <h3 style={{margin:0,fontSize:22,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>{prAttivoMio.numero}</h3>
                        <p style={{margin:"4px 0 0",fontSize:12,color:"#888"}}>Creato dal broker il {fmtD(prAttivoMio.dataCreazione)}</p>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:12,padding:"4px 12px",borderRadius:4,background:cfg.bg,color:cfg.clr,fontWeight:600}}>{cfg.ic} {cfg.lbl}</span>
                        <button onClick={()=>setShowProspettoAg(null)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#888",padding:0,lineHeight:1}}>×</button>
                      </div>
                    </div>

                    {/* Hint stato */}
                    <div style={{background:cfg.bg,border:`1px solid ${cfg.clr}33`,borderLeft:`4px solid ${cfg.clr}`,borderRadius:6,padding:"10px 12px",marginBottom:"1rem",fontSize:12,color:cfg.clr,lineHeight:1.5}}>
                      {cfg.hint}
                    </div>

                    {/* Righe del prospetto */}
                    <p style={{margin:"0 0 8px",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Dettaglio pratiche</p>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:"1rem"}}>
                      <thead><tr style={{background:"#fafaf8"}}>
                        <th style={{padding:"6px 8px",textAlign:"left",fontWeight:600,color:"#666",borderBottom:"0.5px solid #e8e5e0"}}>Pratica</th>
                        <th style={{padding:"6px 8px",textAlign:"left",fontWeight:600,color:"#666",borderBottom:"0.5px solid #e8e5e0"}}>Cliente</th>
                        <th style={{padding:"6px 8px",textAlign:"left",fontWeight:600,color:"#666",borderBottom:"0.5px solid #e8e5e0"}}>Ruolo</th>
                        <th style={{padding:"6px 8px",textAlign:"right",fontWeight:600,color:"#666",borderBottom:"0.5px solid #e8e5e0"}}>Importo</th>
                      </tr></thead>
                      <tbody>
                        {(prAttivoMio.righe||[]).map((r,i)=>{
                          const v = venduti.find(x=>x.id===r.venditoId);
                          if(!v) return(<tr key={i}><td colSpan={4} style={{padding:"6px 8px",color:"#aaa",fontStyle:"italic"}}>Pratica eliminata</td></tr>);
                          const cliente = r.ruolo==="listing"||r.ruolo==="buyerListing" ? (v.nominativoVenditore||"—") : (v.nomeAcquirente||"—");
                          return(<tr key={i} style={{borderBottom:"0.5px solid #f5f5f5"}}>
                            <td style={{padding:"6px 8px"}}><strong>{v.comuneImmobile}</strong> — {v.indirizzoImmobile}</td>
                            <td style={{padding:"6px 8px",color:"#666"}}>{cliente}</td>
                            <td style={{padding:"6px 8px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:ruoloBg[r.ruolo],color:ruoloClr[r.ruolo],fontWeight:600}}>{ruoloLbl[r.ruolo]}</span></td>
                            <td style={{padding:"6px 8px",textAlign:"right",fontWeight:600}}>€ {fmt(Math.round(r.importo))}</td>
                          </tr>);
                        })}
                      </tbody>
                      <tfoot><tr style={{background:`${BRAND.oro}15`,fontWeight:700}}>
                        <td colSpan={3} style={{padding:"8px",borderTop:`1.5px solid ${BRAND.oro}`}}>TOTALE</td>
                        <td style={{padding:"8px",textAlign:"right",fontSize:14,color:BRAND.oroD,borderTop:`1.5px solid ${BRAND.oro}`}}>€ {fmt(Math.round(Number(prAttivoMio.totale||0)))}</td>
                      </tr></tfoot>
                    </table>

                    {/* Info fattura emessa (sola lettura) */}
                    {prAttivoMio.numFatturaAg&&<>
                      <p style={{margin:"1rem 0 8px",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>La tua fattura registrata</p>
                      <div style={{background:"#fafaf8",borderRadius:8,padding:"12px 14px",marginBottom:"1rem",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
                        <div>
                          <p style={{margin:"0 0 2px",fontSize:10,color:"#888"}}>N° fattura</p>
                          <p style={{margin:0,fontSize:14,fontWeight:600,color:BRAND.grigio}}>{prAttivoMio.numFatturaAg}</p>
                        </div>
                        {prAttivoMio.dataFatturaAg&&<div>
                          <p style={{margin:"0 0 2px",fontSize:10,color:"#888"}}>Data emissione</p>
                          <p style={{margin:0,fontSize:14,fontWeight:600,color:BRAND.grigio}}>{fmtD(prAttivoMio.dataFatturaAg)}</p>
                        </div>}
                      </div>
                    </>}

                    {/* Info bonifico (sola lettura) */}
                    {prAttivoMio.dataPagamento&&<>
                      <p style={{margin:"1rem 0 8px",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Bonifico ricevuto</p>
                      <div style={{background:"#E1F5EE",border:"1px solid #0F6E5644",borderRadius:8,padding:"12px 14px",marginBottom:"1rem"}}>
                        <p style={{margin:0,fontSize:14,fontWeight:600,color:"#0F6E56"}}>✓ Pagato il {fmtD(prAttivoMio.dataPagamento)}</p>
                        <p style={{margin:"3px 0 0",fontSize:11,color:"#0F6E56",opacity:0.8}}>Importo: € {fmt(Math.round(Number(prAttivoMio.totale||0)))} · Metodo: bonifico bancario</p>
                      </div>
                    </>}

                    {/* Note (se ci sono, sola lettura) */}
                    {prAttivoMio.note&&<>
                      <p style={{margin:"1rem 0 8px",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Note del broker</p>
                      <div style={{background:"#fafaf8",borderRadius:8,padding:"10px 14px",marginBottom:"1rem",fontSize:12,color:"#666",fontStyle:"italic",lineHeight:1.5}}>{prAttivoMio.note}</div>
                    </>}

                    {/* Bottoni in basso */}
                    <div style={{display:"flex",justifyContent:"flex-end",paddingTop:"0.875rem",borderTop:"0.5px solid #e8e5e0"}}>
                      <button onClick={()=>setShowProspettoAg(null)} style={{...S.btnP,fontSize:12,padding:"6px 14px"}}>Chiudi</button>
                    </div>
                  </div>
                </div>);
              })()}

            </div>);
          })()}


          {/* OPERATIVITÀ */}
          {tab==="Operatività"&&(()=>{
            // Agente corrente (broker vede tutti, agente vede solo sé)
            const agentiVisibili = (isBroker||isBackOffice) ? agenti : agenti.filter(a=>a.id===myAgentId);
            const agIdSel = (isBroker||isBackOffice) ? (opAgenteSel==="Tutti"?null:Number(opAgenteSel)) : myAgentId;

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

                <button style={{width:"100%",padding:11,background:opSaved?"#27AE60":"#A8863A",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",transition:"background .3s"}} onClick={()=>{
                  if(isReadOnly)return;
                  const cached=opFormCache[cacheKey]||{};
                  salvaGiornata(agId,data,cached);
                  setOpSaved(true);
                  setTimeout(()=>setOpSaved(false),2000);
                }} disabled={isReadOnly} style={{width:"100%",padding:11,background:isReadOnly?"#ccc":"#A8863A",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:isReadOnly?"not-allowed":"pointer",transition:"background .3s"}}>{isReadOnly?"👁 Solo lettura":isReadOnly?"👁 Solo lettura":opSaved?"✓ Salvato!":"Salva giornata"}</button>
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
                  const brokerVedeSeStesso = (isBroker||isBackOffice) && (opAgenteSel==="Tutti"||opAgenteSel===""||opAgenteSel==="self"||opAgenteSel===String(myAgentId));
                  const agIdSel = (isBroker||isBackOffice)
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
                      {(isBroker||isBackOffice)&&<select style={{...S.sel,fontSize:14,padding:"8px 14px",minWidth:220}} value={opAgenteSel} onChange={e=>setOpAgenteSel(e.target.value)}>
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
                      {(isBroker||isBackOffice)&&<select style={S.sel} value={brokerVedeSeStesso?"self":opAgenteSel} onChange={e=>setOpAgenteSel(e.target.value)}>
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
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <h3 style={{margin:0,fontSize:16,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🎯 Azioni oggi</h3>
                      <span style={{fontSize:12,color:BRAND.oroD,fontWeight:600,padding:"3px 10px",background:`${BRAND.oro}15`,borderRadius:10}}>💡 = suggerito · clicca per impostare</span>
                    </div>

                    {/* Legenda colonne (compatta, una sola volta) */}
                    <div style={{display:"grid",gridTemplateColumns:"4px 1fr 130px 100px 55px",alignItems:"center",gap:10,padding:"0 1.25rem 6px",fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>
                      <div></div>
                      <div>Azione</div>
                      <div style={{textAlign:"center"}}>Fatto / Target</div>
                      <div style={{textAlign:"center"}}>Progresso</div>
                      <div style={{textAlign:"right"}}>%</div>
                    </div>

                    {GRUPPI_AZIONI.map(gruppo=>{
                      const azioniDelGruppo = azioniAttive.filter(a=>a.gruppo===gruppo.id);
                      if(azioniDelGruppo.length===0) return null;
                      const colorGruppo = gruppo.id==="telefono"?"#2980B9":gruppo.id==="scritto"?"#8E44AD":gruppo.id==="social"?"#E91E63":"#E67E22";
                      return(<div key={gruppo.id} style={{background:"#fff",border:`1px solid #e8e5e0`,borderLeft:`4px solid ${colorGruppo}`,borderRadius:10,padding:"1rem 1.25rem",marginBottom:"0.875rem",boxShadow:"0 1px 3px rgba(0,0,0,0.03)"}}>
                        <p style={{margin:"0 0 12px",fontSize:12,color:colorGruppo,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:800}}>{gruppo.icona} {gruppo.nome}</p>
                        {azioniDelGruppo.map((az,idx)=>{
                          const dati = azioniOggi[az.id]||{};
                          const target = Number(dati.target||0);
                          const fatto = Number(dati.fatto||0);
                          const consigliato = getConsigliato(az);
                          const perc = target>0 ? Math.min(100, Math.round(fatto/target*100)) : 0;
                          const completata = target>0&&fatto>=target;
                          const daFare = target>0&&fatto<target;
                          const clr = completata?"#27AE60":perc>=66?"#A8863A":perc>=33?"#E67E22":perc>0?"#E74C3C":"#bbb";
                          const isLast = idx===azioniDelGruppo.length-1;
                          return(<div key={az.id} style={{padding:"10px 0",borderBottom:isLast?"none":"0.5px solid #f0f0f0"}}>
                            <div style={{display:"grid",gridTemplateColumns:"4px 1fr 130px 100px 55px",alignItems:"center",gap:10}}>
                              <div style={{width:4,height:32,background:daFare?BRAND.oro:completata?"#27AE60":"transparent",borderRadius:2}}/>
                              <div>
                                <p style={{margin:0,fontSize:14,fontWeight:600,color:BRAND.grigio,textDecoration:completata?"line-through":"none",opacity:completata?0.65:1}}>
                                  {az.nome}
                                  {daFare&&<span style={{fontSize:10,color:"#fff",marginLeft:8,padding:"2px 8px",borderRadius:4,background:BRAND.oro,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>DA FARE</span>}
                                  {completata&&<span style={{fontSize:10,color:"#fff",marginLeft:8,padding:"2px 8px",borderRadius:4,background:"#27AE60",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>✓ FATTO</span>}
                                </p>
                                {consigliato>0&&target===0&&puoModificare&&<p style={{margin:"3px 0 0",fontSize:11}}>
                                  <button onClick={()=>aggiornaAzione(az.id,{target:consigliato})} style={{background:"none",border:"none",color:"#2980B9",cursor:"pointer",padding:0,fontSize:11,fontWeight:600,fontFamily:"inherit",textDecoration:"underline dotted"}}>💡 Consigliato: {consigliato} · clicca per impostare</button>
                                </p>}
                                {consigliato>0&&target>0&&target!==consigliato&&<p style={{margin:"3px 0 0",fontSize:10,color:"#888"}}>💡 Consigliato: {consigliato}</p>}
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
                                <input type="number" min="0" value={fatto===0?"":fatto} placeholder="0" disabled={!puoModificare}
                                  onChange={e=>aggiornaAzione(az.id,{fatto:e.target.value===""?0:Number(e.target.value)})}
                                  style={inpNumGrande} title="Fatto"/>
                                <span style={{fontSize:14,color:"#aaa",fontWeight:600}}>/</span>
                                <input type="number" min="0" value={target===0?"":target} placeholder="0" disabled={!puoModificare}
                                  onChange={e=>aggiornaAzione(az.id,{target:e.target.value===""?0:Number(e.target.value)})}
                                  style={inpNum} title="Target"/>
                              </div>
                              <div style={{height:8,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${perc}%`,background:clr,transition:"width .4s",borderRadius:4}}/>
                              </div>
                              <div style={{fontSize:13,fontWeight:700,color:clr,textAlign:"right"}}>{target>0?`${perc}%`:"—"}</div>
                            </div>
                            {/* Selettore tipo volantino */}
                            {az.hasTipoVolantino&&(target>0||fatto>0)&&<div style={{marginTop:8,marginLeft:14,padding:"8px 12px",background:"#FDFBF7",borderRadius:6,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                              <span style={{fontSize:11,color:"#888",fontWeight:600}}>TIPO:</span>
                              {TIPI_VOLANTINO.map(tv=>(
                                <button key={tv} onClick={()=>puoModificare&&aggiornaAzione(az.id,{tipoVolantino:dati.tipoVolantino===tv?"":tv})} disabled={!puoModificare} style={{fontSize:11,padding:"4px 10px",borderRadius:5,border:`1px solid ${dati.tipoVolantino===tv?BRAND.oro:"#ddd"}`,background:dati.tipoVolantino===tv?BRAND.oro:"#fff",color:dati.tipoVolantino===tv?"#fff":"#666",cursor:puoModificare?"pointer":"default",fontFamily:"inherit",fontWeight:dati.tipoVolantino===tv?700:500}}>{tv}</button>
                              ))}
                              <input type="text" placeholder="Zona (es. Bizzozero)" value={dati.zona||""} disabled={!puoModificare}
                                onChange={e=>aggiornaAzione(az.id,{zona:e.target.value})}
                                style={{flex:1,minWidth:120,padding:"4px 10px",fontSize:12,border:"1px solid #ddd",borderRadius:5,fontFamily:"inherit"}}/>
                            </div>}
                          </div>);
                        })}
                      </div>);
                    })}

                    {/* ====== CONSEGUENZE OGGI ====== */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"1.75rem",marginBottom:10}}>
                      <h3 style={{margin:0,fontSize:16,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🔄 Conseguenze oggi</h3>
                      <span style={{fontSize:12,color:"#888",fontWeight:500}}>output diretti delle azioni</span>
                    </div>
                    <div style={{background:"#fff",border:"1px solid #e8e5e0",borderRadius:10,padding:"0.875rem 1.25rem",marginBottom:"1.5rem",boxShadow:"0 1px 3px rgba(0,0,0,0.03)"}}>
                      {CATALOGO_CONSEGUENZE_DEFAULT.map((c,idx)=>{
                        const val = Number(conseguenzeOggi[c.id]||0);
                        const isLast = idx===CATALOGO_CONSEGUENZE_DEFAULT.length-1;
                        return(<div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:isLast?"none":"0.5px solid #f0f0f0"}}>
                          <span style={{fontSize:18}}>{c.icona}</span>
                          <p style={{margin:0,fontSize:14,fontWeight:600,flex:1,color:BRAND.grigio}}>{c.nome}</p>
                          <input type="number" min="0" value={val===0?"":val} placeholder="0" disabled={!puoModificare}
                            onChange={e=>aggiornaConseguenza(c.id,e.target.value)}
                            style={{...inpNumGrande,color:val>0?c.clr:"#bbb",border:`1.5px solid ${val>0?c.clr:BRAND.oro+"88"}`}}/>
                        </div>);
                      })}
                    </div>

                    {/* ====== TEMPO DEDICATO ====== */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <h3 style={{margin:0,fontSize:16,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>⏱️ Tempo dedicato</h3>
                      <span style={{fontSize:12,color:"#888",fontWeight:500}}>ore investite per categoria</span>
                    </div>
                    <div style={{background:"#fff",border:"1px solid #e8e5e0",borderRadius:10,padding:"0.875rem 1.25rem",marginBottom:"1.5rem",boxShadow:"0 1px 3px rgba(0,0,0,0.03)"}}>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
                        {CATALOGO_TEMPO_DEFAULT.map(t=>{
                          const val=Number(tempoOggi[t.id]||0);
                          return(<div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"#FDFBF7",borderRadius:6,borderLeft:`3px solid ${t.clr}`}}>
                            <p style={{margin:0,fontSize:13,fontWeight:600,flex:1,color:BRAND.grigio}}>{t.nome}</p>
                            <input type="number" min="0" step="0.5" value={val===0?"":val} placeholder="0" disabled={!puoModificare}
                              onChange={e=>aggiornaTempo(t.id,e.target.value)}
                              style={{...inpNum,width:56,color:val>0?t.clr:"#bbb",borderColor:val>0?t.clr:"#ddd"}}/>
                            <span style={{fontSize:11,color:"#888",fontWeight:600}}>h</span>
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
                  const brokerVedeSeStesso = (isBroker||isBackOffice) && (opAgenteSel==="Tutti"||opAgenteSel===""||opAgenteSel==="self"||opAgenteSel===String(myAgentId));
                  const isAgg = (isBroker||isBackOffice) && opAgenteSel==="team";
                  const agIdSelW = isAgg ? null :
                    (isBroker||isBackOffice)
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
                      {(isBroker||isBackOffice)&&<select style={S.sel} value={isAgg?"team":(brokerVedeSeStesso?"self":opAgenteSel)} onChange={e=>setOpAgenteSel(e.target.value)}>
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
                  const brokerVedeSeStesso = (isBroker||isBackOffice) && (opAgenteSel==="Tutti"||opAgenteSel===""||opAgenteSel==="self"||opAgenteSel===String(myAgentId));
                  const isAgg = (isBroker||isBackOffice) && opAgenteSel==="team";
                  const agIdSelM = isAgg ? null :
                    (isBroker||isBackOffice)
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
                      {(isBroker||isBackOffice)&&<select style={S.sel} value={isAgg?"team":(brokerVedeSeStesso?"self":opAgenteSel)} onChange={e=>setOpAgenteSel(e.target.value)}>
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
                    {(isBroker||isBackOffice)&&<select style={S.sel} value={opAgenteSel} onChange={e=>setOpAgenteSel(e.target.value)}>
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
                          <p style={{fontSize:12,color:"#888",margin:0}}>Obiettivi personali · {opMeseSel} · {(isBroker||isBackOffice)?"imposta obiettivi per l'agente":"modifica i tuoi obiettivi"}</p>
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
                      {(isBroker||isBackOffice)&&(<div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"1rem 1.25rem"}}>
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
                  {(isBroker||isBackOffice)&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem",padding:"10px 14px",background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0"}}>
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
                    <div style={{...sCard2,display:"flex",alignItems:"center",gap:12,marginBottom:"1.25rem",borderLeft:`4px solid ${proiezioneFineAnno>=obFattPiano?"#27AE60":"#E67E22"}`}}>
                      <span style={{fontSize:28}}>{proiezioneFineAnno>=obFattPiano?"🎉":"📅"}</span>
                      <div>
                        {proiezioneFineAnno>=obFattPiano
                          ?<p style={{fontSize:14,fontWeight:600,color:"#27AE60",margin:"0 0 2px"}}>A questo ritmo supererai l'obiettivo — proiezione € {fmt(proiezioneFineAnno)}</p>
                          :<p style={{fontSize:14,fontWeight:600,color:"#2c2c2c",margin:"0 0 2px"}}>A questo ritmo chiuderai a € {fmt(proiezioneFineAnno)} — mancano € {fmt(Math.max(0,obFattPiano-proiezioneFineAnno))}</p>
                        }
                        {obFattPiano>proiezioneFineAnno&&<p style={{fontSize:12,color:"#888",margin:0}}>Accelera di +€ {fmt(Math.round((obFattPiano-fattYTD4)/Math.max(1,12-meseCorr)))} / mese nei prossimi {12-meseCorr} mesi</p>}
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
          {tab==="Gestione Pratiche"&&(()=>{
            const isErica = myAgentId===5;
            const canEditErica = canEditPratiche;
            const canEditAgente = (inc) => canEditPratiche||(inc&&inc.agenteListing===myAgentId);
            const canSee2=(i)=>canViewAll||isErica||i.agenteListing===myAgentId;
            const incAttivi=incarichi.filter(i=>!i.archiviato&&i.categoria==="vendita"&&canSee2(i));
            const fasi=fasiConfig||FASI;

            // Calcola avanzamento pratica
            const getPr=(incId)=>(pratiche||{})[incId]||{fasi:{}};
            const totAzioni=fasi.reduce((s,f)=>s+f.azioni.length,0);
            const fatte=(incId)=>fasi.reduce((s,f)=>s+f.azioni.filter(a=>(getPr(incId).fasi[f.k]||{})[a.k]?.fatto).length,0);
            const percAv=(incId)=>totAzioni>0?Math.round(fatte(incId)/totAzioni*100):0;
            const alertsInc=(incId)=>{const al=[];fasi.forEach(f=>f.azioni.filter(a=>a.alert).forEach(a=>{if(!(getPr(incId).fasi[f.k]||{})[a.k]?.fatto)al.push(a);}));return al;};
            const faseCorrente=(incId)=>{const pr=getPr(incId);let last=null;fasi.forEach(f=>{if(Object.values(pr.fasi[f.k]||{}).some(a=>a.fatto))last=f;});return last||fasi[0];};

            // Categorie — usa statoInc che è già calcolato correttamente
            const tuttiVendita=incarichi.filter(i=>i.categoria==="vendita"&&!i.archiviato&&canSee2(i));
            const poolBase=gpCategoria==="attive"
              ? tuttiVendita.filter(i=>statoInc(i)==="Attivo")
              : gpCategoria==="venduti"
              ? tuttiVendita.filter(i=>statoInc(i)==="Venduto")
              : tuttiVendita.filter(i=>statoInc(i)==="Scaduto");

            const incFiltrati=poolBase.filter(i=>{
              if(gpCategoria!=="attive"&&gpAnno!=="Tutti"&&(i.dataInizio||"").slice(0,4)!==gpAnno)return false;
              if(gpFiltroFase!=="Tutte"){
                const fi=fasi.findIndex(f=>f.k===faseCorrente(i.id)?.k);
                if(gpFiltroFase==="acq"&&fi>=3)return false;
                if(gpFiltroFase==="prop"&&(fi<3||fi>=7))return false;
                if(gpFiltroFase==="rogito"&&(fi<7||fi>=9))return false;
                if(gpFiltroFase==="post"&&fi<9)return false;
              }
              if(gpFiltroAlert&&alertsInc(i.id).length===0)return false;
              // Ricerca testuale (live, multi-parola)
              if(!matchSearch(searchPratiche, i.comune, i.indirizzo, i.tipologia, i.nominativo, i.note)) return false;
              return true;
            });

            // Colori fase
            const faseClr=(k)=>{
              const f=fasi.find(f=>f.k===k);
              if(!f)return"#888";
              if(f.fase<=3)return"#185FA5";
              if(f.fase<=6)return"#854F0B";
              if(f.fase<=8)return"#533AB7";
              return"#3B6D11";
            };
            const RUOLO_CLR={agente:{bg:"#EEEDFE",cl:"#3C3489"},erica:{bg:"#E1F5EE",cl:"#085041"},broker:{bg:"#E6F1FB",cl:"#0C447C"},entrambi:{bg:"#FAEEDA",cl:"#633806"},tutti:{bg:"#EAF3DE",cl:"#3B6D11"}};

            // Salva azione pratica con data automatica
            const toggleAzione=(incId,faseK,azK)=>{
              const pr=getPr(incId);
              const fasiPr={...pr.fasi};
              const fasePr={...(fasiPr[faseK]||{})};
              const azPr={...(fasePr[azK]||{})};
              if(azPr.fatto){delete azPr.data;azPr.fatto=false;}
              else{azPr.fatto=true;azPr.data=todayStr();azPr.daChi=utente?.nome||"?";}
              fasePr[azK]=azPr;fasiPr[faseK]=fasePr;
              if(!isReadOnly)setPratiche({...pratiche,[incId]:{...pr,fasi:fasiPr}});
            };
            const setDataAzione=(incId,faseK,azK,data)=>{
              const pr=getPr(incId);
              const fasiPr={...pr.fasi,[faseK]:{...(pr.fasi[faseK]||{}),[azK]:{...(pr.fasi[faseK]?.[azK]||{}),data}}};
              if(!isReadOnly)setPratiche({...pratiche,[incId]:{...pr,fasi:fasiPr}});
            };

            // Vista SCHEDA pratica singola
            if(gpPraticaSel){
              const inc=incAttivi.find(i=>i.id===gpPraticaSel);
              if(!inc)return(<div style={S.sec}><button style={S.btn} onClick={()=>setGpPraticaSel(null)}>← Torna alla lista</button></div>);
              const pr=getPr(inc.id);
              const al=alertsInc(inc.id);
              return(<div style={S.sec}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem",flexWrap:"wrap"}}>
                  <button style={{...S.btn,fontSize:12}} onClick={()=>setGpPraticaSel(null)}>← Lista pratiche</button>
                  <button style={{...S.btn,fontSize:12,color:"#A8863A",borderColor:"#A8863A"}} onClick={()=>{setGpPraticaSel(null);setTab("Incarichi");}}>🏠 Vai all'incarico</button>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:600}}>{inc.comune} — {inc.indirizzo}</div>
                    <div style={{fontSize:12,color:"#888"}}>{inc.nominativo} · {nomAg(inc.agenteListing)}</div>
                  </div>
                  {al.length>0&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"#FCEBEB",color:"#A32D2D",fontWeight:500}}>⚠ {al.length} alert</span>}
                </div>
                {/* Timeline */}
                <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:"1.25rem",overflowX:"auto",padding:"4px 0"}}>
                  {fasi.map((f,i)=>{
                    const hasFatto=Object.values(pr.fasi[f.k]||{}).some(a=>a.fatto);
                    const isAtt=faseCorrente(inc.id)?.k===f.k;
                    const clr=faseClr(f.k);
                    return(<React.Fragment key={f.k}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0,cursor:"pointer"}} title={f.n}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:hasFatto?clr:isAtt?clr+"33":"#f0f0f0",border:`2px solid ${hasFatto||isAtt?clr:"#ddd"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:hasFatto?"#fff":isAtt?clr:"#aaa"}}>{i+1}</div>
                        <div style={{fontSize:9,color:hasFatto?clr:isAtt?clr:"#aaa",whiteSpace:"nowrap",maxWidth:50,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis"}}>{f.n.split(" ")[0]}</div>
                      </div>
                      {i<fasi.length-1&&<div style={{height:2,width:20,background:hasFatto?clr:"#eee",flexShrink:0,marginBottom:12}}/>}
                    </React.Fragment>);
                  })}
                </div>
                {/* Fasi con azioni */}
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
                  {fasi.map(f=>{
                    const clr=faseClr(f.k);
                    const fatte2=f.azioni.filter(a=>(pr.fasi[f.k]||{})[a.k]?.fatto).length;
                    const perc=f.azioni.length>0?Math.round(fatte2/f.azioni.length*100):0;
                    return(<div key={f.k} style={{background:"#fff",borderRadius:10,border:`0.5px solid ${clr}44`,overflow:"hidden"}}>
                      <div style={{background:clr+"18",padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:600,color:clr}}>{f.n}</div>
                          <div style={{height:3,background:"#f0f0f0",borderRadius:2,marginTop:4,overflow:"hidden"}}><div style={{height:"100%",width:`${perc}%`,background:clr,borderRadius:2}}/></div>
                        </div>
                        <span style={{fontSize:11,color:clr,fontWeight:500}}>{fatte2}/{f.azioni.length}</span>
                      </div>
                      {f.azioni.map(az=>{
                        const azPr=(pr.fasi[f.k]||{})[az.k]||{};
                        const rclr=RUOLO_CLR[az.ruolo]||RUOLO_CLR.agente;
                        return(<div key={az.k} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 12px",borderBottom:"0.5px solid #f5f5f5",opacity:canEditAgente(inc)?1:0.7}}>
                          <div onClick={()=>canEditAgente(inc)&&toggleAzione(inc.id,f.k,az.k)} style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${azPr.fatto?clr:"#ddd"}`,background:azPr.fatto?clr:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,marginTop:1}}>
                            {azPr.fatto&&<span style={{fontSize:10,color:"#fff",lineHeight:1}}>✓</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:11,color:azPr.fatto?"#888":"#2c2c2c",textDecoration:azPr.fatto?"line-through":"none"}}>{az.lbl}</div>
                            <div style={{display:"flex",gap:5,marginTop:3,alignItems:"center",flexWrap:"wrap"}}>
                              <span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:rclr.bg,color:rclr.cl,fontWeight:500}}>{az.ruolo==="agente"?"Agente":az.ruolo==="erica"?"Erica RT":az.ruolo==="broker"?"Broker":az.ruolo==="entrambi"?"Ag+Erica":"Tutti"}</span>
                              {azPr.fatto&&<input type="date" style={{fontSize:10,border:"none",background:"transparent",color:"#27AE60",cursor:"pointer",padding:0,fontFamily:"inherit"}} value={azPr.data||""} onChange={e=>setDataAzione(inc.id,f.k,az.k,e.target.value)}/>}
                              {azPr.fatto&&azPr.daChi&&azPr.daChi!==az.ruolo&&<span style={{fontSize:10,color:"#aaa",fontStyle:"italic"}}>da {azPr.daChi}</span>}
                              {!azPr.fatto&&az.alert&&<span style={{fontSize:10,color:"#E74C3C"}}>⚠ alert</span>}
                            </div>
                          </div>
                        </div>);
                      })}
                    </div>);
                  })}
                </div>
              </div>);
            }

            // Vista LISTA o KANBAN
            return(<div style={S.sec}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
                <h2 style={{fontSize:16,fontWeight:600,margin:0}}>Gestione Pratiche <span style={{fontSize:13,color:"#888",fontWeight:400}}>({incFiltrati.length} {gpCategoria==="attive"?"attive":gpCategoria==="venduti"?"vendute":"scadute"}{gpAnno!=="Tutti"?` · ${gpAnno}`:""})</span></h2>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                {/* Categoria */}
                <div style={{display:"flex",background:"#f0f0f0",borderRadius:7,padding:3,gap:2}}>
                  {[["attive","✅ Attive"],["venduti","🏆 Venduti"],["scaduti","⏰ Scaduti"]].map(([v,l])=>(
                    <button key={v} onClick={()=>{setGpCategoria(v);setGpFiltroFase("Tutte");if(v==="attive")setGpAnno("Tutti");else setGpAnno(annoCorrente);}} style={{padding:"4px 12px",fontSize:11,borderRadius:5,border:"none",background:gpCategoria===v?"#fff":"transparent",color:gpCategoria===v?"#A8863A":"#888",fontWeight:gpCategoria===v?600:400,cursor:"pointer",fontFamily:"inherit",boxShadow:gpCategoria===v?"0 1px 3px rgba(0,0,0,.1)":"none"}}>{l}</button>
                  ))}
                </div>
                {/* Anno — solo per venduti e scaduti */}
                {gpCategoria!=="attive"&&<select style={S.sel} value={gpAnno} onChange={e=>setGpAnno(e.target.value)}>
                  <option value="Tutti">Tutti gli anni</option>
                  {[...new Set([annoCorrente,...incarichi.map(i=>(i.dataInizio||"").slice(0,4)).filter(Boolean)])].sort().reverse().map(a=><option key={a}>{a}</option>)}
                </select>}
                <div style={{display:"flex",gap:6,background:"#f0f0f0",borderRadius:7,padding:3}}>
                  {[["lista","☰ Lista"],["kanban","⧉ Kanban"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setGpVista(v)} style={{padding:"4px 12px",fontSize:11,borderRadius:5,border:"none",background:gpVista===v?"#fff":"transparent",color:gpVista===v?"#A8863A":"#888",fontWeight:gpVista===v?600:400,cursor:"pointer",fontFamily:"inherit",boxShadow:gpVista===v?"0 1px 3px rgba(0,0,0,.1)":"none"}}>{l}</button>
                  ))}
                </div>
                </div>
              </div>
              {/* Filtri macro-fase */}
              <div style={{display:"flex",gap:6,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
                {[
                  ["Tutte","Tutte","#185FA5",poolBase.length],
                  ["acq","Acquisizione","#185FA5",poolBase.filter(i=>fasi.findIndex(f=>f.k===faseCorrente(i.id)?.k)<3).length],
                  ["prop","Proposta / Prelim.","#854F0B",poolBase.filter(i=>{const fi=fasi.findIndex(f=>f.k===faseCorrente(i.id)?.k);return fi>=3&&fi<7;}).length],
                  ["rogito","Rogito","#533AB7",poolBase.filter(i=>{const fi=fasi.findIndex(f=>f.k===faseCorrente(i.id)?.k);return fi>=7&&fi<9;}).length],
                  ["post","Post rogito","#3B6D11",poolBase.filter(i=>fasi.findIndex(f=>f.k===faseCorrente(i.id)?.k)>=9).length],
                ].map(([v,lbl,clr,n])=>(
                  <button key={v} onClick={()=>setGpFiltroFase(v)} style={{padding:"4px 12px",fontSize:11,borderRadius:16,border:`0.5px solid ${gpFiltroFase===v?clr:"#ddd"}`,background:gpFiltroFase===v?clr+"18":"#fff",color:gpFiltroFase===v?clr:"#888",cursor:"pointer",fontFamily:"inherit",fontWeight:gpFiltroFase===v?500:400}}>{lbl} ({n})</button>
                ))}
                <button onClick={()=>setGpFiltroAlert(!gpFiltroAlert)} style={{padding:"4px 12px",fontSize:11,borderRadius:16,border:`0.5px solid ${gpFiltroAlert?"#E74C3C":"#ddd"}`,background:gpFiltroAlert?"#FCEBEB":"#fff",color:gpFiltroAlert?"#A32D2D":"#888",cursor:"pointer",fontFamily:"inherit"}}>⚠ Alert ({poolBase.filter(i=>alertsInc(i.id).length>0).length})</button>
                <div style={{marginLeft:"auto"}}><SearchBar value={searchPratiche} onChange={setSearchPratiche} placeholder="Cerca pratica..." nResults={incFiltrati.length}/></div>
              </div>

              {/* VISTA LISTA */}
              {gpVista==="lista"&&<div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 80px 100px 100px 100px 60px",padding:"7px 14px",background:"#fafaf8",borderBottom:"1px solid #eee"}}>
                  {["Immobile / Venditore","Agente","Fase attuale","Avanzamento","Prossima azione","Alert"].map(h=><span key={h} style={{fontSize:11,color:"#888",fontWeight:500}}>{h}</span>)}
                </div>
                {incFiltrati.length===0&&<div style={{padding:"2rem",textAlign:"center",color:"#bbb",fontSize:13}}>Nessuna pratica trovata</div>}
                {incFiltrati.map(inc=>{
                  const al=alertsInc(inc.id);
                  const fc=faseCorrente(inc.id);
                  const clr=faseClr(fc?.k);
                  const prossima=fasi.flatMap(f=>f.azioni.map(a=>({...a,faseK:f.k}))).find(a=>!(getPr(inc.id).fasi[a.faseK]||{})[a.k]?.fatto);
                  const perc=percAv(inc.id);
                  return(<div key={inc.id} style={{display:"grid",gridTemplateColumns:"2fr 80px 100px 100px 100px 60px",padding:"10px 14px",borderBottom:"0.5px solid #f5f5f5",borderLeft:`3px solid ${al.length>0?"#E74C3C":perc===100?"#27AE60":clr}`,cursor:"pointer",alignItems:"center"}} onClick={()=>setGpPraticaSel(inc.id)}>
                    <div><div style={{fontSize:13,fontWeight:500}}>{inc.comune} — {inc.indirizzo}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>{inc.nominativo}</div></div>
                    <div style={{fontSize:11,color:"#888"}}>{nomAg(inc.agenteListing)}</div>
                    <div><span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:clr+"18",color:clr,fontWeight:500}}>{fc?.n?.split(" ").slice(0,2).join(" ")||"—"}</span></div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{flex:1,height:4,background:"#f0f0f0",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${perc}%`,background:perc===100?"#27AE60":clr,borderRadius:2}}/></div>
                      <span style={{fontSize:10,color:"#888",minWidth:28}}>{perc}%</span>
                    </div>
                    <div style={{fontSize:11,color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{prossima?.lbl?.split(" ").slice(0,3).join(" ")||"—"}</div>
                    <div>{al.length>0?<span style={{fontSize:11,padding:"2px 7px",borderRadius:10,background:"#FCEBEB",color:"#A32D2D",fontWeight:500}}>{al.length} ⚠</span>:<span style={{fontSize:11,color:"#aaa"}}>—</span>}</div>
                  </div>);
                })}
              </div>}

              {/* VISTA KANBAN */}
              {gpVista==="kanban"&&(()=>{
                const gruppi=[
                  {lbl:"Fase 1-3",clr:"#185FA5",ks:fasi.filter(f=>f.fase<=3).map(f=>f.k)},
                  {lbl:"Fase 4-6",clr:"#854F0B",ks:fasi.filter(f=>f.fase>3&&f.fase<=6).map(f=>f.k)},
                  {lbl:"Fase 7-8",clr:"#533AB7",ks:fasi.filter(f=>f.fase>6&&f.fase<=8).map(f=>f.k)},
                  {lbl:"Fase 9-10",clr:"#3B6D11",ks:fasi.filter(f=>f.fase>8).map(f=>f.k)},
                ];
                return(<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                  {gruppi.map(({lbl,clr,ks})=>{
                    const incGruppo=incFiltrati.filter(i=>ks.includes(faseCorrente(i.id)?.k));
                    return(<div key={lbl} style={{background:"#fafal8",borderRadius:10,padding:8,border:`0.5px solid ${clr}33`}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:clr}}/>
                        <span style={{fontSize:12,fontWeight:500,color:clr,flex:1}}>{lbl}</span>
                        <span style={{fontSize:11,padding:"1px 6px",borderRadius:8,background:clr+"18",color:clr}}>{incGruppo.length}</span>
                      </div>
                      {incGruppo.map(inc=>{
                        const al=alertsInc(inc.id);
                        const perc=percAv(inc.id);
                        return(<div key={inc.id} style={{background:"#fff",borderRadius:8,padding:"8px 10px",marginBottom:6,border:`0.5px solid ${al.length>0?"#E74C3C44":"#e8e5e0"}`,cursor:"pointer",borderLeft:`3px solid ${al.length>0?"#E74C3C":clr}`}} onClick={()=>setGpPraticaSel(inc.id)}>
                          <div style={{fontSize:12,fontWeight:500,marginBottom:3}}>{inc.comune} — {inc.indirizzo}</div>
                          <div style={{fontSize:11,color:"#888",marginBottom:5}}>{inc.nominativo} · {nomAg(inc.agenteListing)}</div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{flex:1,height:3,background:"#f0f0f0",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${perc}%`,background:perc===100?"#27AE60":clr,borderRadius:2}}/></div>
                            <span style={{fontSize:10,color:"#888"}}>{perc}%</span>
                            {al.length>0&&<span style={{fontSize:10,padding:"1px 5px",borderRadius:6,background:"#FCEBEB",color:"#A32D2D"}}>{al.length}⚠</span>}
                          </div>
                        </div>);
                      })}
                      {incGruppo.length===0&&<div style={{fontSize:11,color:"#bbb",textAlign:"center",padding:"8px 0"}}>Nessuna pratica</div>}
                    </div>);
                  })}
                </div>);
              })()}
            </div>);
          })()}

          {/* IL MIO REPORT (solo agente) */}
          {tab==="Il mio report"&&!isBroker&&myAgentId&&(()=>{
            const ag=agenti.find(a=>a.id===myAgentId);
            if(!ag) return null;

            // === ANNI DISPONIBILI ===
            const anniMieiSet = new Set();
            venduti.forEach(v=>{
              if(Number(v.agenteListing)===myAgentId||Number(v.agenteAcquirente)===myAgentId||Number(v.buyerListing)===myAgentId||Number(v.buyer)===myAgentId){
                const a = getAnno(dataCompAgenzia(v));
                if(a) anniMieiSet.add(a);
              }
            });
            incarichi.forEach(i=>{
              if(Number(i.agenteListing)===myAgentId){
                const a = getAnno(i.dataInizio);
                if(a) anniMieiSet.add(a);
              }
            });
            anniMieiSet.add(String(annoCorrente));
            const anniMieiArr = [...anniMieiSet].sort().reverse();

            // === Helper: calcola le metriche di un anno per l'agente (STESSA LOGICA tabella Produzione Agenti broker) ===
            const calcolaAnno = (anno) => {
              // Filtro venduti per anno (data competenza agenzia)
              const vendAnno = venduti.filter(v=>{
                const hasRuolo = Number(v.agenteListing)===myAgentId||Number(v.agenteAcquirente)===myAgentId||Number(v.buyerListing)===myAgentId||Number(v.buyer)===myAgentId;
                if(!hasRuolo) return false;
                if(anno!=="Tutti" && getAnno(dataCompAgenzia(v))!==anno) return false;
                return true;
              });
              // Incarichi: solo agenteListing
              const incAnno = incarichi.filter(i=>Number(i.agenteListing)===myAgentId&&!i.archiviato&&(anno==="Tutti"||getAnno(i.dataInizio)===anno)).length;
              // N° transazioni Venditore (listing) e Acquirente (NON conta buyer)
              const nTV = vendAnno.filter(v=>Number(v.agenteListing)===myAgentId&&Number(v.provvVenditore||0)>0&&!v.agenziaEsterna).length;
              const nTA = vendAnno.filter(v=>Number(v.agenteAcquirente)===myAgentId&&Number(v.provvAcquirente||0)>0).length;
              // Provv. Agenzia (Versione A: solo ruoli principali, NIENTE buyer)
              const provvAgenzia = vendAnno.reduce((s,v)=>{
                let p=0;
                if(Number(v.agenteListing)===myAgentId) p+=Number(v.provvVenditore||0);
                if(Number(v.agenteAcquirente)===myAgentId) p+=Number(v.provvAcquirente||0);
                return s+p;
              },0);
              // Incassato (Versione A: solo ruoli principali) - vista AGENZIA (data competenza)
              const incassato = vendAnno.reduce((s,v)=>{
                let p=0;
                if(Number(v.agenteListing)===myAgentId) p+=calcolaIncassatoV(v);
                if(Number(v.agenteAcquirente)===myAgentId) p+=calcolaIncassatoA(v);
                return s+p;
              },0);
              // INCASSATO AGENTE (criterio cassa): somma dei prospetti PAGATI con dataPagamento nell'anno
              // Questo è quanto l'agente ha ricevuto in tasca nell'anno solare (utile per dichiarazioni fiscali)
              const incassatoAgente = prospetti.filter(p=>
                p.agenteId===myAgentId &&
                p.statoFlow==="pagato" &&
                p.dataPagamento &&
                (anno==="Tutti" || p.dataPagamento.startsWith(anno))
              ).reduce((s,p)=>s+Number(p.totale||0),0);
              // Quota Agente (ruoli principali) + Quota Buyer (ruoli buyer) — tutte le quote maturate
              const quotaAg = vendAnno.reduce((s,v)=>{
                let q=0;
                if(Number(v.agenteListing)===myAgentId) q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
                if(Number(v.agenteAcquirente)===myAgentId) q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
                return s+q;
              },0);
              const quotaBuy = vendAnno.reduce((s,v)=>{
                let q=0;
                if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId) q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;
                if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId) q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;
                return s+q;
              },0);
              return {vendAnno, incAnno, nTV, nTA, provvAgenzia, incassato, incassatoAgente, quotaAg, quotaBuy, quotaTot:quotaAg+quotaBuy};
            };

            // === DATI ANNO SELEZIONATO ===
            const annoSel = mioRepAnno||String(annoCorrente);
            const datiSel = calcolaAnno(annoSel);

            // === FILTRO MESE per la tabella pratiche ===
            const mesiMio = Array.from(new Set(datiSel.vendAnno.map(v=>getMese(dataCompAgenzia(v))).filter(Boolean))).sort().reverse();
            const pratFiltrate = datiSel.vendAnno.filter(v=>{
              if(mioRepMese!=="Tutti" && getMese(dataCompAgenzia(v))!==mioRepMese) return false;
              return true;
            });

            // === DATI MULTI-ANNO (ultimi 5 anni max) ===
            const datiMulti = anniMieiArr.slice(0,5).map(a=>({anno:a, ...calcolaAnno(a)}));

            // === TOP MOMENTS dell'anno selezionato ===
            // Filosofia coerente con i 5 KPI: SOLO ruoli principali (Listing + Acquirente), NO buyer
            const topMoments = (()=>{
              if(datiSel.vendAnno.length===0 && datiSel.incAnno===0) return null;

              // Helper: pratiche dove sono RUOLO PRINCIPALE (Listing o Acquirente, no buyer)
              const isRuoloPrincipale = (v) => Number(v.agenteListing)===myAgentId || Number(v.agenteAcquirente)===myAgentId;
              const pratPrincipali = datiSel.vendAnno.filter(isRuoloPrincipale);

              // 🥇 Vendita più alta (prezzo immobile) — solo dove sono Listing o Acquirente
              const vendPrezzo = pratPrincipali.filter(v=>Number(v.prezzoVendita||0)>0);
              const venditaPiuAlta = vendPrezzo.length>0 ? vendPrezzo.reduce((a,b)=>Number(b.prezzoVendita||0)>Number(a.prezzoVendita||0)?b:a, vendPrezzo[0]) : null;

              // 💰 Quota maggiore incassata — calcolo solo sulla Quota Agente (versione A, no buyer)
              const pratConQuota = pratPrincipali.map(v=>{
                // Quota Agente (versione A: solo ruoli principali, NIENTE buyer)
                let qAg=0;
                if(Number(v.agenteListing)===myAgentId) qAg+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
                if(Number(v.agenteAcquirente)===myAgentId) qAg+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
                // Quanto ho realmente incassato di questa quota (proporzionale alla % incassata dal cliente)
                const provTotPrat = Number(v.provvVenditore||0)+Number(v.provvAcquirente||0);
                const incTotPrat = calcolaIncassatoV(v)+calcolaIncassatoA(v);
                const percIncasso = provTotPrat>0 ? incTotPrat/provTotPrat : 0;
                const qIncassata = qAg*percIncasso;
                return {v, qTot:qAg, qIncassata};
              }).filter(x=>x.qIncassata>0);
              const quotaMaxIncassata = pratConQuota.length>0 ? pratConQuota.reduce((a,b)=>b.qIncassata>a.qIncassata?b:a, pratConQuota[0]) : null;

              // 📈 Mese migliore — per Quota TOTALE Ag+Buyer (include sostegno da ruoli buyer)
              // Filosofia: questo box racconta "qual è il mese in cui ho guadagnato di più", includendo anche
              // il contributo da Buyer perché è comunque guadagno reale e mostra il valore della collaborazione.
              const perMese = {};
              datiSel.vendAnno.forEach(v=>{
                let qAg=0, qBuy=0;
                if(Number(v.agenteListing)===myAgentId) qAg+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
                if(Number(v.agenteAcquirente)===myAgentId) qAg+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
                if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId) qBuy+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;
                if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId) qBuy+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;
                const q=qAg+qBuy;
                if(q<=0) return;
                const m = getMese(dataCompAgenzia(v));
                if(!m) return;
                if(!perMese[m]) perMese[m]={mese:m, totale:0, totAg:0, totBuy:0, count:0};
                perMese[m].totale += q;
                perMese[m].totAg += qAg;
                perMese[m].totBuy += qBuy;
                perMese[m].count += 1;
              });
              const meseMigliore = Object.values(perMese).length>0 ? Object.values(perMese).reduce((a,b)=>b.totale>a.totale?b:a, Object.values(perMese)[0]) : null;

              // 🏆 Record acquisizioni mensili (mese con più incarichi nuovi) - già OK, solo agenteListing
              const incPerMese = {};
              incarichi.filter(i=>Number(i.agenteListing)===myAgentId&&!i.archiviato&&(annoSel==="Tutti"||getAnno(i.dataInizio)===annoSel)).forEach(i=>{
                const m = getMese(i.dataInizio);
                if(!m) return;
                if(!incPerMese[m]) incPerMese[m]={mese:m, count:0};
                incPerMese[m].count += 1;
              });
              const recordAcquisizioni = Object.values(incPerMese).length>0 ? Object.values(incPerMese).reduce((a,b)=>b.count>a.count?b:a, Object.values(incPerMese)[0]) : null;

              return {venditaPiuAlta, quotaMaxIncassata, meseMigliore, recordAcquisizioni};
            })();

            const colRuolo={"Listing":"#2980B9","Acquirente":"#8E44AD","Buyer L":"#E67E22","Buyer":"#E74C3C"};
            const ruoloInV=v=>{
              if(Number(v.agenteListing)===myAgentId)return "Listing";
              if(Number(v.agenteAcquirente)===myAgentId)return "Acquirente";
              if(Number(v.buyerListing)===myAgentId)return "Buyer L";
              if(Number(v.buyer)===myAgentId)return "Buyer";
              return "—";
            };

            return(
              <div style={S.sec}>
                {/* HEADER */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:"1.5rem",padding:"1rem 1.25rem",background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#fff",flexShrink:0}}>{ag.nome.charAt(0)}</div>
                    <div>
                      <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 2px",color:BRAND.grigio,fontFamily:"Georgia,serif"}}>{ag.nome} {ag.cognome}</h2>
                      <p style={{fontSize:12,color:"#888",margin:0}}>{ag.profilo} · La tua produzione in Càsa Immobiliare</p>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <label style={{fontSize:11,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Anno:</label>
                    <select style={S.sel} value={annoSel} onChange={e=>{setMioRepAnno(e.target.value);setMioRepMese("Tutti");}}>
                      {anniMieiArr.map(a=><option key={a} value={a}>{a}</option>)}
                      <option value="Tutti">Tutti gli anni</option>
                    </select>
                  </div>
                </div>

                {/* NOTA: vedi anche Fatture Agente per i pagamenti */}
                <div style={{background:"#EAF4FB",border:"1px solid #2980B944",borderLeft:"4px solid #2980B9",borderRadius:8,padding:"10px 14px",marginBottom:"1.25rem",fontSize:12,color:"#1B5C8C",lineHeight:1.5}}>
                  <strong>💡 Cosa vedi qui:</strong> la tua <strong>produzione professionale</strong> — incarichi acquisiti, transazioni chiuse, provvigione generata per l'agenzia, e le tue quote maturate.
                  <br/><strong style={{color:BRAND.oroD}}>📅 KPI "Incassato in tasca":</strong> usa il <strong>criterio di cassa</strong> (anno in cui hai effettivamente ricevuto il bonifico), così puoi confrontarlo con la dichiarazione fiscale. Per il dettaglio dei singoli prospetti vai in <strong>Le mie fatture</strong>.
                </div>

                {/* 5 KPI ANNO SELEZIONATO — stesse colonne tabella "Produzione Agenti" broker */}
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(5,1fr)",gap:10,marginBottom:"1.5rem"}}>
                  {[
                    {l:"Incarichi",v:datiSel.incAnno,c:"#4A90D9",ic:"📋",sub:"acquisiti da te"},
                    {l:"N° Transazioni",v:`${datiSel.nTV+datiSel.nTA}`,sub:`${datiSel.nTV} V · ${datiSel.nTA} A`,c:BRAND.oroD,ic:"🤝"},
                    {l:"Provv. Agenzia",v:`€ ${fmt(Math.round(datiSel.provvAgenzia))}`,sub:"da te generata",c:"#27AE60",ic:"💰"},
                    {l:"Incassato in tasca",v:`€ ${fmt(Math.round(datiSel.incassatoAgente))}`,sub:`bonifici ${annoSel} (cassa)`,c:"#E67E22",ic:"💵"},
                    {l:"Tot Ag+Buyer",v:`€ ${fmt(Math.round(datiSel.quotaTot))}`,sub:`Ag €${fmt(Math.round(datiSel.quotaAg))} · B €${fmt(Math.round(datiSel.quotaBuy))}`,c:"#8E44AD",ic:"🎯"},
                  ].map(({l,v,sub,c,ic})=>(
                    <div key={l} style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"14px 16px",borderTop:`3px solid ${c}`,position:"relative"}}>
                      <div style={{fontSize:18,marginBottom:4}}>{ic}</div>
                      <p style={{fontSize:10,color:"#888",margin:"0 0 4px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{l}</p>
                      <p style={{fontSize:18,fontWeight:700,margin:0,color:c,fontFamily:"Georgia,serif"}}>{v}</p>
                      {sub&&<p style={{fontSize:10,color:"#aaa",margin:"3px 0 0"}}>{sub}</p>}
                    </div>
                  ))}
                </div>

                {/* CONFRONTO MULTI-ANNO con le stesse 5 metriche */}
                {datiMulti.length>1&&(()=>{
                  const renderVar = (curr, prev) => {
                    if(!prev||prev===0){
                      if(curr>0) return <span style={{fontSize:10,color:"#27AE60",fontWeight:700}}>NUOVO</span>;
                      return <span style={{color:"#ccc",fontSize:10}}>—</span>;
                    }
                    const perc = Math.round((curr-prev)/prev*100);
                    if(perc===0) return <span style={{color:"#888",fontSize:10,fontWeight:600}}>=</span>;
                    const clr = perc>0?"#27AE60":"#E74C3C";
                    const arrow = perc>0?"↑":"↓";
                    return <span style={{color:clr,fontSize:10,fontWeight:700}}>{arrow} {Math.abs(perc)}%</span>;
                  };
                  return(<div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1.5rem"}}>
                    <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>📈 Confronto multi-anno</h3>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:500}}>
                        <thead><tr style={{background:"#FDFBF7"}}>
                          <th style={{padding:"10px 12px",fontSize:11,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"left",borderBottom:`2px solid ${BRAND.oro}33`}}>Metrica</th>
                          {datiMulti.map((d,idx)=>(<th key={d.anno} style={{padding:"10px 12px",fontSize:11,fontWeight:700,color:idx===0?BRAND.oroD:"#666",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"right",borderBottom:`2px solid ${BRAND.oro}33`,minWidth:90}}>{d.anno}{idx===0&&d.anno===String(annoCorrente)?" YTD":""}</th>))}
                          <th style={{padding:"10px 12px",fontSize:11,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"right",borderBottom:`2px solid ${BRAND.oro}33`}}>Var</th>
                        </tr></thead>
                        <tbody>
                          {[
                            {lbl:"Incarichi", calc:d=>d.incAnno, format:v=>v||"—", clr:"#4A90D9"},
                            {lbl:"N° Transazioni", calc:d=>d.nTV+d.nTA, format:v=>v||"—", clr:BRAND.oroD},
                            {lbl:"Provv. Agenzia (€)", calc:d=>d.provvAgenzia, format:v=>v>0?`€ ${fmt(Math.round(v))}`:"—", clr:"#27AE60"},
                            {lbl:"Incassato in tasca (€)", calc:d=>d.incassatoAgente, format:v=>v>0?`€ ${fmt(Math.round(v))}`:"—", clr:"#E67E22"},
                            {lbl:"Tot Ag+Buyer (€)", calc:d=>d.quotaTot, format:v=>v>0?`€ ${fmt(Math.round(v))}`:"—", clr:"#8E44AD"},
                          ].map(riga=>{
                            const valori = datiMulti.map(d=>riga.calc(d));
                            return(<tr key={riga.lbl} style={{borderBottom:"0.5px solid #f5f5f5"}}>
                              <td style={{padding:"8px 12px",fontSize:13,color:BRAND.grigio,fontWeight:500}}>{riga.lbl}</td>
                              {valori.map((v,idx)=>(<td key={idx} style={{padding:"8px 12px",fontSize:13,fontWeight:idx===0?700:500,color:idx===0?riga.clr:"#666",textAlign:"right"}}>{riga.format(v)}</td>))}
                              <td style={{padding:"8px 12px",textAlign:"right"}}>{renderVar(valori[0], valori[1])}</td>
                            </tr>);
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p style={{margin:"10px 0 0",fontSize:11,color:"#888"}}>La colonna <strong style={{color:BRAND.oroD}}>"Var"</strong> confronta l'anno corrente con l'anno precedente. <strong>YTD</strong> = Year-to-Date (da gennaio a oggi).</p>
                  </div>);
                })()}

                {/* TOP MOMENTS - 4 box */}
                {topMoments&&(<div style={{background:`linear-gradient(135deg, ${BRAND.oro}15 0%, ${BRAND.oro}05 100%)`,border:`1.5px solid ${BRAND.oro}55`,borderRadius:12,padding:"1.25rem 1.5rem",marginBottom:"1.5rem"}}>
                  <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:BRAND.oroD,fontFamily:"Georgia,serif"}}>✨ Top moments {annoSel}</h3>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(4,1fr)",gap:12}}>

                    {/* 🥇 Vendita più alta (prezzo immobile) */}
                    <div style={{background:"#fff",borderRadius:10,padding:"14px 16px",border:`1px solid ${BRAND.oro}33`}}>
                      <div style={{fontSize:24,marginBottom:6}}>🥇</div>
                      <p style={{fontSize:10,color:"#888",margin:"0 0 4px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Vendita più alta</p>
                      {topMoments.venditaPiuAlta ? (<>
                        <p style={{fontSize:20,fontWeight:700,margin:"0 0 4px",color:BRAND.oroD,fontFamily:"Georgia,serif"}}>€ {fmt(Math.round(Number(topMoments.venditaPiuAlta.prezzoVendita||0)))}</p>
                        <p style={{fontSize:12,color:BRAND.grigio,margin:0,fontWeight:500}}>{topMoments.venditaPiuAlta.comuneImmobile} — {topMoments.venditaPiuAlta.indirizzoImmobile||""}</p>
                        <p style={{fontSize:10,color:"#888",margin:"4px 0 0"}}>{fmtD(dataCompAgenzia(topMoments.venditaPiuAlta))}</p>
                      </>) : (<p style={{fontSize:12,color:"#aaa",margin:0,fontStyle:"italic"}}>Nessuna vendita</p>)}
                    </div>

                    {/* 💰 Quota maggiore incassata */}
                    <div style={{background:"#fff",borderRadius:10,padding:"14px 16px",border:`1px solid ${BRAND.oro}33`}}>
                      <div style={{fontSize:24,marginBottom:6}}>💰</div>
                      <p style={{fontSize:10,color:"#888",margin:"0 0 4px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Quota maggiore incassata</p>
                      {topMoments.quotaMaxIncassata ? (<>
                        <p style={{fontSize:20,fontWeight:700,margin:"0 0 4px",color:"#27AE60",fontFamily:"Georgia,serif"}}>€ {fmt(Math.round(topMoments.quotaMaxIncassata.qIncassata))}</p>
                        <p style={{fontSize:12,color:BRAND.grigio,margin:0,fontWeight:500}}>{topMoments.quotaMaxIncassata.v.comuneImmobile} — {topMoments.quotaMaxIncassata.v.indirizzoImmobile||""}</p>
                        <p style={{fontSize:10,color:"#888",margin:"4px 0 0"}}>su maturato € {fmt(Math.round(topMoments.quotaMaxIncassata.qTot))}</p>
                      </>) : (<p style={{fontSize:12,color:"#aaa",margin:0,fontStyle:"italic"}}>Nessun incasso</p>)}
                    </div>

                    {/* 📈 Mese migliore (per quota) */}
                    <div style={{background:"#fff",borderRadius:10,padding:"14px 16px",border:`1px solid ${BRAND.oro}33`}}>
                      <div style={{fontSize:24,marginBottom:6}}>📈</div>
                      <p style={{fontSize:10,color:"#888",margin:"0 0 4px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Mese migliore</p>
                      {topMoments.meseMigliore ? (<>
                        <p style={{fontSize:20,fontWeight:700,margin:"0 0 4px",color:"#8E44AD",fontFamily:"Georgia,serif"}}>€ {fmt(Math.round(topMoments.meseMigliore.totale))}</p>
                        <p style={{fontSize:12,color:BRAND.grigio,margin:0,fontWeight:500}}>{fmtMese(topMoments.meseMigliore.mese)}</p>
                        <p style={{fontSize:10,color:"#888",margin:"4px 0 0"}}>Ag €{fmt(Math.round(topMoments.meseMigliore.totAg))} · B €{fmt(Math.round(topMoments.meseMigliore.totBuy))}</p>
                        <p style={{fontSize:10,color:"#aaa",margin:"2px 0 0"}}>{topMoments.meseMigliore.count} pratic{topMoments.meseMigliore.count===1?"a":"he"}</p>
                      </>) : (<p style={{fontSize:12,color:"#aaa",margin:0,fontStyle:"italic"}}>Nessuna quota</p>)}
                    </div>

                    {/* 🏆 Record acquisizioni mensili */}
                    <div style={{background:"#fff",borderRadius:10,padding:"14px 16px",border:`1px solid ${BRAND.oro}33`}}>
                      <div style={{fontSize:24,marginBottom:6}}>🏆</div>
                      <p style={{fontSize:10,color:"#888",margin:"0 0 4px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Record acquisizioni</p>
                      {topMoments.recordAcquisizioni ? (<>
                        <p style={{fontSize:20,fontWeight:700,margin:"0 0 4px",color:"#4A90D9",fontFamily:"Georgia,serif"}}>{topMoments.recordAcquisizioni.count}</p>
                        <p style={{fontSize:12,color:BRAND.grigio,margin:0,fontWeight:500}}>{fmtMese(topMoments.recordAcquisizioni.mese)}</p>
                        <p style={{fontSize:10,color:"#888",margin:"4px 0 0"}}>incarichi acquisiti in un mese</p>
                      </>) : (<p style={{fontSize:12,color:"#aaa",margin:0,fontStyle:"italic"}}>Nessun incarico</p>)}
                    </div>

                  </div>
                </div>)}

                {/* LISTA PRATICHE - tabella collassabile */}
                <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden"}}>
                  <div style={{padding:"12px 16px",background:"#FDFBF7",borderBottom:showMioTabella?"0.5px solid #eee":"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",flexWrap:"wrap",gap:8}} onClick={()=>setShowMioTabella(v=>!v)}>
                    <div>
                      <h3 style={{margin:0,fontSize:14,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>📋 Lista pratiche {annoSel} ({pratFiltrate.length})</h3>
                      <p style={{margin:"3px 0 0",fontSize:11,color:"#888"}}>tutte le pratiche dove hai avuto un ruolo</p>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      {showMioTabella&&mesiMio.length>1&&<select style={{...S.sel,fontSize:12,padding:"4px 10px"}} value={mioRepMese} onChange={e=>{setMioRepMese(e.target.value);e.stopPropagation();}} onClick={e=>e.stopPropagation()}>
                        <option value="Tutti">Tutti i mesi</option>
                        {mesiMio.map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}
                      </select>}
                      <button style={{background:"none",border:`0.5px solid #ddd`,borderRadius:6,padding:"4px 14px",fontSize:12,cursor:"pointer",color:BRAND.oroD,fontWeight:600}}>{showMioTabella?"▲ Nascondi":"▼ Mostra"}</button>
                    </div>
                  </div>
                  {showMioTabella&&<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:650}}>
                    <thead><tr style={{background:"#fafaf8"}}>{["Ruolo","Data","Immobile","Venditore","Acquirente","Prezzo","Quota Ag.","Quota Buyer","Stato"].map(h=><th key={h} style={{...S.th,fontSize:11}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {pratFiltrate.length===0&&<tr><td colSpan={9} style={{padding:"2rem",textAlign:"center",color:"#bbb"}}>Nessuna pratica nel periodo</td></tr>}
                      {pratFiltrate.map((v,idx)=>{
                        const ruolo=ruoloInV(v);
                        const qAg=(()=>{let q=0;if(Number(v.agenteListing)===myAgentId)q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;if(Number(v.agenteAcquirente)===myAgentId)q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;return q;})();
                        const qBuy=(()=>{let q=0;if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId)q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId)q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;return q;})();
                        const cfg=STATI_INCASSO[calcolaStatoIncasso(v)]||STATI_INCASSO["Da incassare"];
                        return(<tr key={v.id} style={{background:idx%2===0?"#fff":"#fafafa"}}>
                          <td style={S.td}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:`${colRuolo[ruolo]||"#eee"}22`,color:colRuolo[ruolo]||"#666",fontWeight:600,border:`0.5px solid ${colRuolo[ruolo]||"#ccc"}44`}}>{ruolo}</span></td>
                          <td style={{...S.td,color:"#888",whiteSpace:"nowrap"}}>{fmtD(dataCompAgenzia(v))}</td>
                          <td style={S.td}><strong>{v.comuneImmobile}</strong> — {v.indirizzoImmobile}</td>
                          <td style={S.td}>{v.nominativoVenditore||"—"}</td>
                          <td style={S.td}>{v.nomeAcquirente||"—"}</td>
                          <td style={{...S.td,textAlign:"right"}}>€ {fmtN(v.prezzoVendita)}</td>
                          <td style={{...S.td,textAlign:"right",fontWeight:600,color:"#8E44AD"}}>{qAg>0?`€ ${fmt(Math.round(qAg))}`:"—"}</td>
                          <td style={{...S.td,textAlign:"right",fontWeight:600,color:"#2980B9"}}>{qBuy>0?`€ ${fmt(Math.round(qBuy))}`:"—"}</td>
                          <td style={S.td}><span style={bdg(cfg)}>{calcolaStatoIncasso(v)}</span></td>
                        </tr>);
                      })}
                    </tbody>
                    {pratFiltrate.length>0&&<tfoot><tr style={{background:BRAND.beige,fontWeight:600,fontSize:12}}>
                      <td colSpan={5} style={{padding:"10px 12px"}}>TOTALE ({pratFiltrate.length})</td>
                      <td style={{padding:"10px 12px",textAlign:"right",color:BRAND.oroD}}>€ {fmt(Math.round(datiSel.provvAgenzia))}</td>
                      <td style={{padding:"10px 12px",textAlign:"right",color:"#8E44AD"}}>€ {fmt(Math.round(datiSel.quotaAg))}</td>
                      <td style={{padding:"10px 12px",textAlign:"right",color:"#2980B9"}}>€ {fmt(Math.round(datiSel.quotaBuy))}</td>
                      <td style={{padding:"10px 12px"}}/>
                    </tr></tfoot>}
                  </table></div>}
                </div>

              </div>
            );
          })()}



          {/* ── WAR ROOM ── */}
          {tab==="War Room"&&(()=>{
            const oggi2=todayStr();
            const sfidaAtt2=sfide.find(s=>s.dal<=oggi2&&s.al>=oggi2&&!s.conclusa);
            const sfideStor=sfide.filter(s=>s.al<oggi2||s.conclusa);
            const agentiProd=agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false);
            const agentiTabelle=agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false);
            const METR2={acquisizioni:"🏠 Acquisizioni",fatturato:"💰 Fatturato",chiamate:"📞 Chiamate",chiamate_ci:"📞 C.Influenza",chiamate_cp:"📞 C.Passati",chiamate_freddo:"📞 Freddo",oh:"🚪 Open House",proposte:"📝 Proposte",appuntamenti:"🤝 Appuntamenti",immVisitati:"👁 Imm. visitati",postSocial:"📱 Post social"};
            const PCLR2=["#D4AC0D","#888","#CD7F32","#555","#777"];
            const PEMOJI2=["🥇","🥈","🥉","4°","5°"];
            const getPeriodo=()=>{
              const d=new Date();const y=d.getFullYear();const m=d.getMonth();
              if(warPeriodo==="settimana"){const day=d.getDay()||7;const lun=new Date(d);lun.setDate(d.getDate()-day+1);const sab=new Date(lun);sab.setDate(lun.getDate()+5);return[lun.toISOString().slice(0,10),sab.toISOString().slice(0,10)];}
              if(warPeriodo==="mese"){return[`${y}-${String(m+1).padStart(2,"0")}-01`,new Date(y,m+1,0).toISOString().slice(0,10)];}
              if(warPeriodo==="anno"){return[`${warAnno||y}-01-01`,`${warAnno||y}-12-31`];}
              return[warDal,warAl];
            };
            const [dal2,al2]=getPeriodo();
            const calcM2=(agId,metr,d1,d2)=>{
              const agIdN=Number(agId);
              const incP=incarichi.filter(i=>Number(i.agenteListing)===agIdN&&i.dataInizio>=d1&&i.dataInizio<=d2);
              const vendP=venduti.filter(v=>{const dc=dataCompAgenzia(v);return(Number(v.agenteListing)===agIdN||Number(v.agenteAcquirente)===agIdN)&&dc>=d1&&dc<=d2;});
              const opAg=operativita[agIdN]||operativita[String(agIdN)]||{};
              const gg=Object.entries(opAg).filter(([d])=>d&&d>=d1&&d<=d2);
              const sumOp=k=>gg.reduce((s,[,g])=>s+Number(g[k]||0),0);
              const sumCt=k=>gg.reduce((s,[,g])=>s+Number((g.chiamate_tipi||{})[k]||0),0);
              const chTot=gg.reduce((s,[,g])=>{const ct=g.chiamate_tipi||{};return s+Object.values(ct).reduce((a,v)=>a+Number(v||0),0);},0);
              const volant=gg.reduce((s,[,g])=>s+((g.attImm||[]).filter(x=>x.lettAMV||x.lettOH).length),0);
              switch(metr){
                case "acquisizioni": return incP.length;
                case "fatturato": return vendP.reduce((s,v)=>{let p=0;if(Number(v.agenteListing)===agIdN)p+=Number(v.provvVenditore||0);if(Number(v.agenteAcquirente)===agIdN)p+=Number(v.provvAcquirente||0);return s+p;},0);
                case "chiamate": return chTot;
                case "chiamate_ci": return sumCt("centri_inf");
                case "chiamate_cp": return sumCt("clienti_pass");
                case "chiamate_freddo": return sumCt("freddo");
                case "oh": return sumOp("ohNum");
                case "proposte": return proposte.filter(p=>(p.agenteListing===agId||p.agenteAcquirente===agId)&&(p.dataStato||"")>=d1&&(p.dataStato||"")<=d2).length;
                case "appuntamenti": return sumOp("appuntamenti");
                case "immVisitati": return sumOp("immVisitati");
                case "postSocial": return sumOp("postSocial");
                case "volantini": return volant;
                case "oreTel": return sumOp("oreTel");
                default: return 0;
              }
            };
            const clTeam=agentiProd.map(ag=>({ag,val:calcM2(ag.id,sfidaAtt2?sfidaAtt2.metrica:"acquisizioni",dal2,al2)})).sort((a,b)=>b.val-a.val);
            const ggR=sfidaAtt2?Math.max(0,Math.round((new Date(sfidaAtt2.al)-new Date())/86400000)):0;

            // ── VISTA AGENTE ──
            if(!isBroker&&!isBackOffice&&myAgentId){
              const ag=agenti.find(a=>a.id===myAgentId)||{};
              const obAg=obiettivoAgente[myAgentId]||{};
              const obFatt=Number(obAg.fatturato||0);
              const mieFatt=calcM2(myAgentId,"fatturato",dal2,al2);
              const mieAcq=calcM2(myAgentId,"acquisizioni",dal2,al2);
              const mieCh=calcM2(myAgentId,"chiamate",dal2,al2);
              const mieCi=calcM2(myAgentId,"chiamate_ci",dal2,al2);
              const mieAppt=calcM2(myAgentId,"appuntamenti",dal2,al2);
              const mieOH=calcM2(myAgentId,"oh",dal2,al2);
              const mieVol=calcM2(myAgentId,"volantini",dal2,al2);
              const mieSocial=calcM2(myAgentId,"postSocial",dal2,al2);
              const mieOreT=calcM2(myAgentId,"oreTel",dal2,al2);
              const mieVisit=calcM2(myAgentId,"immVisitati",dal2,al2);
              const percFatt=obFatt>0?Math.min(100,Math.round(mieFatt/obFatt*100)):null;
              const miaPos=clTeam.findIndex(x=>x.ag.id===myAgentId);
              const mioVal=clTeam[miaPos]?.val||0;
              const CARD={background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"1rem 1.25rem"};
              const MSEC={background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 12px",textAlign:"center"};
              return(<div style={S.sec}>
                {/* Header agente */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.25rem",flexWrap:"wrap",gap:8}}>
                  <div>
                    <h2 style={{fontSize:16,fontWeight:600,margin:0}}>🏆 War Room</h2>
                    <div style={{fontSize:12,color:"#888",marginTop:3}}>{ag.nome} {ag.cognome} · {fmtD(dal2)} → {fmtD(al2)}</div>
                  </div>
                  <div style={{display:"flex",background:"#f0f0f0",borderRadius:7,padding:3,gap:2}}>
                    {[["settimana","Settimana"],["mese","Mese"],["anno","Anno"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setWarPeriodo(v)} style={{padding:"4px 10px",fontSize:11,borderRadius:5,border:"none",background:warPeriodo===v?"#fff":"transparent",color:warPeriodo===v?"#A8863A":"#888",fontWeight:warPeriodo===v?600:400,cursor:"pointer",fontFamily:"inherit",boxShadow:warPeriodo===v?"0 1px 3px rgba(0,0,0,.1)":"none"}}>{l}</button>
                    ))}
                  </div>
                </div>

                {/* KPI risultati agente — stile bozza */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
                  <div style={MSEC}>
                    <div style={{fontSize:11,color:"#888",marginBottom:6}}>💰 Fatturato</div>
                    <div style={{fontSize:22,fontWeight:600,color:"#085041"}}>€ {fmt(mieFatt)}</div>
                    {percFatt!==null&&<>
                      <div style={{height:4,background:"#e0e0e0",borderRadius:2,overflow:"hidden",margin:"6px 0 3px"}}>
                        <div style={{height:"100%",width:`${percFatt}%`,background:percFatt>=100?"#27AE60":percFatt>=70?"#E67E22":"#0F6E56",borderRadius:2}}/>
                      </div>
                      <div style={{fontSize:10,color:"#3B6D11"}}>{percFatt}% — obj € {fmt(obFatt)}</div>
                    </>}
                  </div>
                  <div style={MSEC}>
                    <div style={{fontSize:11,color:"#888",marginBottom:6}}>🏠 Acquisizioni</div>
                    <div style={{fontSize:22,fontWeight:600,color:"#185FA5"}}>{mieAcq}</div>
                    <div style={{fontSize:10,color:"#888",marginTop:6}}>nel periodo</div>
                  </div>
                  <div style={MSEC}>
                    <div style={{fontSize:11,color:"#888",marginBottom:6}}>📞 Chiamate</div>
                    <div style={{fontSize:22,fontWeight:600,color:"#533AB7"}}>{mieCh}</div>
                    <div style={{fontSize:10,color:"#888",marginTop:6}}>di cui {mieCi} CI</div>
                  </div>
                  <div style={MSEC}>
                    <div style={{fontSize:11,color:"#888",marginBottom:6}}>🤝 Appuntamenti</div>
                    <div style={{fontSize:22,fontWeight:600,color:"#854F0B"}}>{mieAppt}</div>
                    <div style={{fontSize:10,color:"#888",marginTop:6}}>acquisizione</div>
                  </div>
                </div>

                {/* Traguardo volante agente */}
                {sfidaAtt2&&<div style={{background:"linear-gradient(135deg,#FAEEDA,#FDF6EC)",border:"0.5px solid #D4AC0D44",borderRadius:10,padding:"1rem",marginBottom:"1rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:6}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#633806"}}>🏆 {sfidaAtt2.nome}</div>
                      <div style={{fontSize:11,color:"#888"}}>{METR2[sfidaAtt2.metrica]} · 🎁 {sfidaAtt2.premio}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,color:"#888"}}>Scade tra</div>
                      <div style={{fontSize:22,fontWeight:600,color:ggR<=3?"#E74C3C":ggR<=7?"#E67E22":"#D4AC0D",lineHeight:1}}>{ggR}gg</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div style={{background:"#fff",borderRadius:8,padding:"10px 12px",textAlign:"center",border:"0.5px solid #D4AC0D44"}}>
                      <div style={{fontSize:28,marginBottom:4}}>{PEMOJI2[miaPos>=0?miaPos:4]}</div>
                      <div style={{fontSize:11,color:"#888"}}>La tua posizione</div>
                      <div style={{fontSize:20,fontWeight:600,color:PCLR2[miaPos>=0?miaPos:4]}}>{miaPos+1}° su {agentiProd.length}</div>
                    </div>
                    <div style={{background:"#fff",borderRadius:8,padding:"10px 12px",textAlign:"center",border:"0.5px solid #f0f0f0"}}>
                      <div style={{fontSize:11,color:"#888",marginBottom:6}}>Il tuo risultato</div>
                      <div style={{fontSize:22,fontWeight:600,color:"#633806"}}>{sfidaAtt2.metrica==="fatturato"?`€ ${fmt(mioVal)}`:mioVal}</div>
                      {clTeam[0]&&miaPos>0&&<div style={{fontSize:10,color:"#aaa",marginTop:3}}>
                        {sfidaAtt2.metrica==="fatturato"?`€ ${fmt(clTeam[0].val-mioVal)}`:(clTeam[0].val-mioVal)} dal 1°
                      </div>}
                    </div>
                  </div>
                  {/* Mini classifica */}
                  <div style={{marginTop:10}}>
                    {clTeam.slice(0,3).map(({ag:agC,val},i)=>(
                      <div key={agC.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px",borderRadius:5,background:agC.id===myAgentId?"#FDF6EC":"transparent",marginBottom:2}}>
                        <span style={{fontSize:12,fontWeight:agC.id===myAgentId?600:400,color:agC.id===myAgentId?"#633806":"#555"}}>{PEMOJI2[i]} {agC.nome} {agC.cognome||""}</span>
                        <span style={{fontSize:12,fontWeight:600,color:PCLR2[i]}}>{sfidaAtt2.metrica==="fatturato"?`€ ${fmt(val)}`:val}</span>
                      </div>
                    ))}
                  </div>
                </div>}

                {/* Attività di processo agente */}
                <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#533AB7",textTransform:"uppercase",letterSpacing:".06em",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:4,height:14,borderRadius:2,background:"#533AB7"}}/>Attività di processo
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                    {[["📞 Chiamate tot.",mieCh,"#533AB7"],["👥 C.Influenza",mieCi,"#185FA5"],["📄 Volantini",mieVol,"#854F0B"],["📱 Social",mieSocial,"#3C3489"],["⏱ Ore tel.",`${mieOreT}h`,"#888"],["🏠 Visitati",mieVisit,"#0F6E56"],["🚪 OH",mieOH,"#D85A30"],["🤝 Appt.",mieAppt,"#A8863A"]].map(([lbl,val,clr])=>(
                      <div key={lbl} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#888",marginBottom:5}}>{lbl}</div>
                        <div style={{fontSize:18,fontWeight:600,color:clr}}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fonti incarichi agente */}
                {(()=>{
                  const mieInc=incarichi.filter(i=>i.agenteListing===myAgentId&&i.dataInizio>=dal2&&i.dataInizio<=al2);
                  const byFonte=mieInc.reduce((acc,i)=>{const f=i.fonte||"Altro";acc[f]=(acc[f]||0)+1;return acc;},{});
                  const sorted=Object.entries(byFonte).sort((a,b)=>b[1]-a[1]);
                  if(sorted.length===0)return null;
                  const totF=mieInc.length;
                  return(<div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#185FA5",textTransform:"uppercase",letterSpacing:".06em",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:4,height:14,borderRadius:2,background:"#185FA5"}}/>Fonti incarichi nel periodo
                    </div>
                    {sorted.map(([f,n])=>(
                      <div key={f} style={{marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:12,fontWeight:500}}>{f}</span>
                          <span style={{fontSize:12,fontWeight:600,color:"#185FA5"}}>{n} <span style={{color:"#aaa",fontWeight:400}}>({Math.round(n/totF*100)}%)</span></span>
                        </div>
                        <div style={{height:5,background:"#f0f0f0",borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${Math.round(n/totF*100)}%`,background:"#185FA5",borderRadius:3}}/>
                        </div>
                      </div>
                    ))}
                  </div>);
                })()}

              </div>);
            }

            // ── VISTA BROKER / BACKOFFICE ──
            if(warRiunione) return(<div style={{position:"fixed",inset:0,background:"#1C1C1E",zIndex:9000,overflowY:"auto",padding:"1.5rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
                <div style={{fontSize:18,fontWeight:700,color:"#fff"}}>🏆 WAR ROOM · {fmtD(dal2)} → {fmtD(al2)}</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setWarOscura(!warOscura)} style={{fontSize:12,padding:"5px 12px",borderRadius:6,border:`0.5px solid ${warOscura?"#E74C3C":"#444"}`,background:warOscura?"#A32D2D":"transparent",color:warOscura?"#fff":"#aaa",cursor:"pointer",fontFamily:"inherit"}}>{warOscura?"👁 Mostra":"🔒 Oscura €"}</button>
                  <button onClick={()=>setWarRiunione(false)} style={{fontSize:12,padding:"5px 14px",borderRadius:6,border:"0.5px solid #444",background:"transparent",color:"#aaa",cursor:"pointer",fontFamily:"inherit"}}>✕ Esci</button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(agentiProd.length,4)},1fr)`,gap:12,marginBottom:"1.5rem"}}>
                {agentiProd.map((ag,idx)=>{
                  const AVBG=["#FAEEDA","#E6F1FB","#EEEDFE","#EAF3DE"];
                  const AVCL=["#412402","#0C447C","#3C3489","#173404"];
                  const isLdr=clTeam[0]?.ag?.id===ag.id;
                  return(<div key={ag.id} style={{background:isLdr?"#1A2A0A":"#1C2333",borderRadius:12,padding:"1.25rem",border:`0.5px solid ${isLdr?"#D4AC0D44":"#2D3748"}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                      <div style={{width:40,height:40,borderRadius:"50%",background:isLdr?"#EF9F27":AVBG[idx%4],display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:isLdr?"#412402":AVCL[idx%4]}}>{ag.nome.charAt(0)}</div>
                      <div><div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{ag.nome} {ag.cognome||""}</div>{isLdr&&<span style={{fontSize:11,color:"#D4AC0D"}}>🥇 Leader</span>}</div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[["💰 Fatturato",warOscura?"••••":"€ "+fmt(calcM2(ag.id,"fatturato",dal2,al2))],["🏠 Acquisizioni",""+calcM2(ag.id,"acquisizioni",dal2,al2)],["📞 Chiamate",""+calcM2(ag.id,"chiamate",dal2,al2)],["🤝 Appt. acq.",""+calcM2(ag.id,"appuntamenti",dal2,al2)]].map(([lbl,val])=>(
                        <div key={lbl} style={{background:"#323236",borderRadius:8,padding:"8px",textAlign:"center"}}>
                          <div style={{fontSize:10,color:"#666",marginBottom:4}}>{lbl}</div>
                          <div style={{fontSize:18,fontWeight:700,color:"#fff"}}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>);
                })}
              </div>
              {sfidaAtt2&&<div style={{background:"#28282E",borderRadius:12,border:"0.5px solid #D4AC0D44",padding:"1.25rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div><div style={{fontSize:16,fontWeight:700,color:"#D4AC0D"}}>🏆 {sfidaAtt2.nome}</div><div style={{fontSize:12,color:"#888"}}>{METR2[sfidaAtt2.metrica]} · 🎁 {sfidaAtt2.premio}</div></div>
                  <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#666"}}>Scade tra</div><div style={{fontSize:28,fontWeight:700,color:ggR<=3?"#E74C3C":"#D4AC0D"}}>{ggR}gg</div></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(agentiProd.length,4)},1fr)`,gap:8}}>
                  {clTeam.slice(0,4).map(({ag,val},i)=>(
                    <div key={ag.id} style={{background:"#323236",borderRadius:8,padding:"10px",textAlign:"center",border:`0.5px solid ${PCLR2[i]}44`}}>
                      <div style={{fontSize:20}}>{PEMOJI2[i]}</div>
                      <div style={{fontSize:12,color:"#ccc",marginTop:4}}>{ag.nome}</div>
                      <div style={{fontSize:16,fontWeight:700,color:PCLR2[i]}}>{warOscura&&sfidaAtt2.metrica==="fatturato"?"••••":sfidaAtt2.metrica==="fatturato"?"€"+fmt(val):val}</div>
                    </div>
                  ))}
                </div>
              </div>}
            </div>);
            return(<div style={S.sec}>
              {/* Header con sub-tab e periodo */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.25rem",flexWrap:"wrap",gap:10}}>
                <div style={{display:"flex",gap:0,borderBottom:"2px solid #e8e5e0"}}>
                  {[["performance","📊 Performance"],["traguardo","🏆 Traguardo Volante"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setWarSubTab(v)} style={{padding:"8px 18px",fontSize:13,border:"none",background:"none",borderBottom:`2px solid ${warSubTab===v?"#A8863A":"transparent"}`,color:warSubTab===v?"#A8863A":"#888",fontWeight:warSubTab===v?600:400,cursor:"pointer",fontFamily:"inherit",marginBottom:-2}}>{l}</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <div style={{display:"flex",background:"#f0f0f0",borderRadius:7,padding:3,gap:2}}>
                    {[["settimana","Settimana"],["mese","Mese"],["anno","Anno"],["custom","Custom"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setWarPeriodo(v)} style={{padding:"4px 10px",fontSize:11,borderRadius:5,border:"none",background:warPeriodo===v?"#fff":"transparent",color:warPeriodo===v?"#A8863A":"#888",fontWeight:warPeriodo===v?600:400,cursor:"pointer",fontFamily:"inherit",boxShadow:warPeriodo===v?"0 1px 3px rgba(0,0,0,.1)":"none"}}>{l}</button>
                    ))}
                  </div>
                  {warPeriodo==="custom"&&<div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="date" style={S.sel} value={warDal} onChange={e=>setWarDal(e.target.value)}/>
                    <span style={{fontSize:12,color:"#888"}}>→</span>
                    <input type="date" style={S.sel} value={warAl} onChange={e=>setWarAl(e.target.value)}/>
                  </div>}
                  <span style={{fontSize:11,color:"#aaa"}}>{fmtD(dal2)} → {fmtD(al2)}</span>
                  <button onClick={()=>setWarOscura(!warOscura)} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:`0.5px solid ${warOscura?"#E74C3C":"#ddd"}`,background:warOscura?"#FCEBEB":"transparent",color:warOscura?"#A32D2D":"#888",cursor:"pointer",fontFamily:"inherit"}}>{warOscura?"👁 Mostra €":"🔒 Oscura €"}</button>
                  <button onClick={()=>setWarRiunione(true)} style={{fontSize:11,padding:"4px 12px",borderRadius:6,border:"0.5px solid #2C2C2A",background:"#2C2C2A",color:"#D4AC0D",cursor:"pointer",fontFamily:"inherit"}}>📺 Riunione</button>
                </div>
              </div>
              {warSubTab==="traguardo"&&<div>
              {/* Traguardo volante */}
              {sfidaAtt2?(
                <div style={{background:"linear-gradient(135deg,#FAEEDA,#FDF6EC)",border:"0.5px solid #D4AC0D44",borderRadius:12,padding:"1.25rem",marginBottom:"1.25rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,color:"#633806"}}>🏆 {sfidaAtt2.nome}</div>
                      <div style={{fontSize:12,color:"#888",marginTop:3}}>{METR2[sfidaAtt2.metrica]} · {fmtD(sfidaAtt2.dal)} → {fmtD(sfidaAtt2.al)} · 🎁 {sfidaAtt2.premio}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:10,color:"#888"}}>Scade tra</div>
                        <div style={{fontSize:28,fontWeight:600,color:ggR<=3?"#E74C3C":ggR<=7?"#E67E22":"#D4AC0D",lineHeight:1}}>{ggR}<span style={{fontSize:14,fontWeight:400,color:"#888"}}> gg</span></div>
                      </div>
                      <button onClick={()=>{const snap=agentiProd.map(ag=>({agId:ag.id,nome:ag.nome,cognome:ag.cognome||"",val:calcM2(ag.id,sfidaAtt2.metrica,sfidaAtt2.dal,sfidaAtt2.al)})).sort((a,b)=>b.val-a.val);setSfide(sfide.map(s=>s===sfidaAtt2?{...s,conclusa:true,snapshot:snap}:s));}} style={{...S.btnD,fontSize:11,padding:"5px 12px"}}>Concludi</button>
                    </div>
                  </div>
                  {sfidaAtt2.obiettivo>0&&(()=>{
                    const tot=agentiProd.reduce((s,ag)=>s+calcM2(ag.id,sfidaAtt2.metrica,sfidaAtt2.dal,sfidaAtt2.al),0);
                    const perc=Math.min(100,Math.round(tot/sfidaAtt2.obiettivo*100));
                    return(<div style={{marginBottom:"1rem"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <span style={{fontSize:12,color:"#888"}}>Obiettivo team: {sfidaAtt2.metrica==="fatturato"?`€ ${fmt(sfidaAtt2.obiettivo)}`:sfidaAtt2.obiettivo}</span>
                        <span style={{fontSize:12,fontWeight:600,color:perc>=100?"#27AE60":perc>=70?"#E67E22":"#854F0B"}}>{perc}%</span>
                      </div>
                      <div style={{height:6,background:"#e8d9b0",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${perc}%`,background:perc>=100?"#27AE60":perc>=70?"#E67E22":"#EF9F27",borderRadius:3}}/>
                      </div>
                    </div>);
                  })()}
                  <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(agentiProd.length,4)},1fr)`,gap:8}}>
                    {clTeam.slice(0,4).map(({ag,val},i)=>(
                      <div key={ag.id} style={{background:i===0?"#fff":"rgba(255,255,255,.6)",borderRadius:10,padding:"10px 8px",textAlign:"center",border:`0.5px solid ${i===0?"#D4AC0D44":"#e8d9b044"}`}}>
                        <div style={{fontSize:20,marginBottom:5}}>{PEMOJI2[i]}</div>
                        <div style={{width:32,height:32,borderRadius:"50%",background:i===0?"#EF9F27":"#e8e5e0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:i===0?"#412402":"#888",margin:"0 auto 6px"}}>{ag.nome.charAt(0)}</div>
                        <div style={{fontSize:12,fontWeight:500,color:"#2c2c2c"}}>{ag.nome}</div>
                        <div style={{fontSize:11,color:"#888"}}>{ag.cognome||""}</div>
                        <div style={{fontSize:18,fontWeight:600,color:PCLR2[i],marginTop:5}}>{sfidaAtt2.metrica==="fatturato"?`€${fmt(val)}`:val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ):(
                <div style={{background:"#fafaf8",borderRadius:12,border:"0.5px dashed #ddd",padding:"1.25rem",marginBottom:"1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:"#aaa"}}>Nessun traguardo volante attivo</div>
                    <div style={{fontSize:12,color:"#bbb",marginTop:3}}>Crea una sfida per motivare il team</div>
                  </div>
                  <button onClick={()=>setShowFormSfida(true)} style={{...S.btnP,fontSize:12,padding:"7px 16px"}}>+ Crea sfida</button>
                </div>
              )}

              </div>}
              {warSubTab==="performance"&&<div>
                {(()=>{
                  const tF=agentiProd.reduce((s,ag)=>s+calcM2(ag.id,"fatturato",dal2,al2),0);
                  const tA=agentiProd.reduce((s,ag)=>s+calcM2(ag.id,"acquisizioni",dal2,al2),0);
                  const tC=agentiProd.reduce((s,ag)=>s+calcM2(ag.id,"chiamate",dal2,al2),0);
                  const tO=agentiProd.reduce((s,ag)=>s+calcM2(ag.id,"oh",dal2,al2),0);
                  const pF=obiettivoFatturato>0?Math.min(100,Math.round(tF/obiettivoFatturato*100)):null;
                  const AVBG=["#FAEEDA","#E6F1FB","#EEEDFE","#EAF3DE"];
                  const AVCL=["#412402","#0C447C","#3C3489","#173404"];
                  return(<div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:"1.5rem"}}>
                      {[["💰 Fatturato team",warOscura?"€ ••••••":(warOscura?"€ ••••":"€ "+fmt(tF)),"#0F6E56",warOscura?null:pF,warOscura?"":pF!=null?pF+"% — obj € "+fmt(obiettivoFatturato):""],
                        ["🏠 Acquisizioni",tA,"#185FA5",null,"nel periodo"],
                        ["📞 Chiamate",tC,"#533AB7",null,"totali"],
                        ["🤝 Appunt. acq.",agentiProd.reduce((s,ag)=>s+calcM2(ag.id,"appuntamenti",dal2,al2),0),"#854F0B",null,"acquisizione"]
                      ].map(([l,v,c,p,s])=>(
                        <div key={l} style={{background:"#fff",borderRadius:10,padding:"1rem",textAlign:"center",boxShadow:"inset 0 3px 0 "+c+", 0 0 0 1px "+c+"33"}}>
                          <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>{l}</div>
                          <div style={{fontSize:26,fontWeight:600,color:c,marginBottom:4}}>{v}</div>
                          {p!=null&&<div style={{height:5,background:"#f0f0f0",borderRadius:3,overflow:"hidden",margin:"4px 0"}}><div style={{height:"100%",width:p+"%",background:p>=100?"#27AE60":p>=70?"#E67E22":c,borderRadius:3}}/></div>}
                          <div style={{fontSize:10,color:"#aaa"}}>{s}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1.5rem"}}>
                      <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:4,height:18,borderRadius:2,background:"#533AB7",flexShrink:0}}/>
                        <span style={{fontSize:13,fontWeight:600,color:"#533AB7"}}>Attività di processo</span>
                        <span style={{fontSize:11,color:"#aaa",marginLeft:"auto"}}>{fmtD(dal2)} → {fmtD(al2)}</span>
                      </div>
                      <div style={{overflowX:"auto"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",minWidth:580}}>
                          <thead><tr style={{background:"#fafaf8"}}>
                            <th style={{padding:"8px 14px",fontSize:11,fontWeight:600,color:"#888",textAlign:"left",borderBottom:"1px solid #eee",minWidth:150}}>Agente</th>
                            {["📞 Chiam.","CI","🤝 Appt.","🏠 Visit.","⏱ Ore tel.","📄 Volant.","📱 Social","🚪 OH"].map(h=>(
                              <th key={h} style={{padding:"8px 10px",fontSize:11,fontWeight:600,color:"#888",textAlign:"right",borderBottom:"1px solid #eee"}}>{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {agentiProd.map((ag,idx)=>{
                              const isLdr=clTeam[0]?.ag?.id===ag.id;
                              return(<tr key={ag.id} style={{borderBottom:"0.5px solid #f5f5f5",background:isLdr?"#FEF9EC":"#fff"}}>
                                <td style={{padding:"10px 14px"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                                    <div style={{width:32,height:32,borderRadius:"50%",background:isLdr?"#EF9F27":AVBG[idx%4],display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isLdr?"#412402":AVCL[idx%4],flexShrink:0}}>{ag.nome.charAt(0)}</div>
                                    <div>
                                      <div style={{fontSize:12,fontWeight:isLdr?600:400}}>{ag.nome} {ag.cognome||""}</div>
                                      {isLdr&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:"#E1F5EE",color:"#085041",fontWeight:600}}>🥇 Leader</span>}
                                    </div>
                                  </div>
                                </td>
                                {[calcM2(ag.id,"chiamate",dal2,al2),calcM2(ag.id,"chiamate_ci",dal2,al2),calcM2(ag.id,"appuntamenti",dal2,al2),calcM2(ag.id,"immVisitati",dal2,al2),calcM2(ag.id,"oreTel",dal2,al2)+"h",calcM2(ag.id,"volantini",dal2,al2),calcM2(ag.id,"postSocial",dal2,al2),calcM2(ag.id,"oh",dal2,al2)].map((v,j)=>(
                                  <td key={j} style={{padding:"10px 10px",fontSize:13,textAlign:"right",fontWeight:isLdr?600:400,color:isLdr?"#854F0B":"#2c2c2c"}}>{v}</td>
                                ))}
                              </tr>);
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",overflow:"hidden"}}>
                      <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:4,height:18,borderRadius:2,background:"#0F6E56",flexShrink:0}}/>
                        <span style={{fontSize:13,fontWeight:600,color:"#0F6E56"}}>Risultati finali</span>
                      </div>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead><tr style={{background:"#fafaf8"}}>
                          <th style={{padding:"8px 14px",fontSize:11,fontWeight:600,color:"#888",textAlign:"left",borderBottom:"1px solid #eee"}}>Agente</th>
                          {["Acq.","Transaz.","Proposte","T.medio","Fatturato"].map(h=>(
                            <th key={h} style={{padding:"8px 12px",fontSize:11,fontWeight:600,color:"#888",textAlign:"right",borderBottom:"1px solid #eee"}}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {agentiTabelle.map((ag,idx)=>{
                            const isLdr=clTeam[0]?.ag?.id===ag.id;
                            const vendAg=venduti.filter(v=>{const dc=dataCompAgenzia(v);return(Number(v.agenteListing)===ag.id||Number(v.agenteAcquirente)===ag.id)&&dc>=dal2&&dc<=al2;});
                            const tMed=vendAg.length>0?Math.round(vendAg.reduce((s,v)=>{const inc=incarichi.find(i=>proposte.find(p=>p.id===v.propostaId&&p.incaricoId===i.id));if(!inc?.dataInizio||!v.dataAtto)return s;return s+Math.round((new Date(v.dataAtto)-new Date(inc.dataInizio))/86400000);},0)/vendAg.length):null;
                            return(<tr key={ag.id} style={{borderBottom:"0.5px solid #f5f5f5",background:isLdr?"#FEF9EC":"#fff"}}>
                              <td style={{padding:"10px 14px"}}>
                                <div style={{display:"flex",alignItems:"center",gap:10}}>
                                  <div style={{width:32,height:32,borderRadius:"50%",background:isLdr?"#EF9F27":AVBG[idx%4],display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isLdr?"#412402":AVCL[idx%4]}}>{ag.nome.charAt(0)}</div>
                                  <span style={{fontSize:12,fontWeight:isLdr?600:400}}>{ag.nome} {ag.cognome||""}</span>
                                </div>
                              </td>
                              <td style={{padding:"10px 12px",fontSize:13,textAlign:"right"}}>{calcM2(ag.id,"acquisizioni",dal2,al2)}</td>
                              <td style={{padding:"10px 12px",fontSize:13,textAlign:"right"}}>{vendAg.length}</td>
                              <td style={{padding:"10px 12px",fontSize:13,textAlign:"right"}}>{calcM2(ag.id,"proposte",dal2,al2)}</td>
                              <td style={{padding:"10px 12px",fontSize:12,textAlign:"right",color:"#888"}}>{tMed!=null?tMed+" gg":"—"}</td>
                              <td style={{padding:"10px 12px",fontSize:13,textAlign:"right",fontWeight:600,color:"#085041"}}>{warOscura?"€ ••••":"€ "+fmt(calcM2(ag.id,"fatturato",dal2,al2))}</td>
                            </tr>);
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>);
                })()}
              </div>}
              {warSubTab==="traguardo"&&<div>
              {/* Storico sfide */}
              {sfideStor.length>0&&(<div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1.25rem"}}>
                <div style={{background:"#fafal8",padding:"10px 16px",borderBottom:"0.5px solid #e8e5e0"}}>
                  <span style={{fontSize:13,fontWeight:600}}>🏅 Storico traguardi ({sfideStor.length})</span>
                </div>
                <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                  {sfideStor.map((s,i)=>{
                    const cl=s.snapshot?s.snapshot.map(x=>({ag:agenti.find(a=>a.id===x.agId)||{nome:x.nome,cognome:""},val:x.val})):agentiProd.map(ag=>({ag,val:calcM2(ag.id,s.metrica,s.dal,s.al)})).sort((a,b)=>b.val-a.val);
                    const top3=cl.filter(x=>x.val>0).slice(0,3);
                    return(<div key={i} style={{borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden"}}>
                      <div style={{background:"#2C2C2A",padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:"#fff"}}>🏆 {s.nome}</div>
                          <div style={{fontSize:11,color:"#888"}}>{fmtD(s.dal)} → {fmtD(s.al)} · {METR2[s.metrica]||s.metrica}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:11,color:"#EF9F27"}}>🎁 {s.premio||"—"}</span>
                          {s.snapshot&&<span style={{fontSize:10,color:"#27AE60"}}>✓</span>}
                          <button style={{...S.btnD,fontSize:10,padding:"2px 8px"}} onClick={()=>setSfide(sfide.filter((_,j)=>j!==sfide.indexOf(s)))}>Elimina</button>
                        </div>
                      </div>
                      <div style={{padding:"10px 14px",display:"flex",gap:8,flexWrap:"wrap"}}>
                        {top3.map(({ag,val},idx)=>(
                          <div key={ag?.id||idx} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:8,background:idx===0?"#FDF6EC":"var(--color-background-secondary)",border:`0.5px solid ${["#D4AC0D44","#88888844","#CD7F3244"][idx]}`,flex:idx===0?"1 1 auto":"0 0 auto"}}>
                            <span style={{fontSize:idx===0?20:15}}>{["🥇","🥈","🥉"][idx]}</span>
                            <div>
                              <div style={{fontSize:idx===0?13:11,fontWeight:500,color:PCLR2[idx]}}>{ag?.nome||"—"} {ag?.cognome||""}</div>
                              <div style={{fontSize:idx===0?16:13,fontWeight:600,color:PCLR2[idx]}}>{s.metrica==="fatturato"?`€ ${fmt(val)}`:val}</div>
                            </div>
                          </div>
                        ))}
                        {top3.length===0&&<span style={{fontSize:12,color:"#aaa",fontStyle:"italic"}}>Nessun dato</span>}
                      </div>
                    </div>);
                  })}
                </div>
              </div>)}

              {/* Form nuova sfida */}
              {showFormSfida&&(<div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"1.25rem",marginBottom:"1.25rem"}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  + Nuova sfida <button style={{...S.btn,fontSize:11}} onClick={()=>setShowFormSfida(false)}>✕</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <div><label style={S.lbl}>Nome sfida</label><input style={S.inp} value={formSfida.nome||""} placeholder="es. Sprint maggio" onChange={e=>setFormSfida({...formSfida,nome:e.target.value})}/></div>
                  <div><label style={S.lbl}>Metrica</label><select style={S.inp} value={formSfida.metrica||"acquisizioni"} onChange={e=>setFormSfida({...formSfida,metrica:e.target.value})}>
                    {Object.entries(METR2).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select></div>
                  <div><label style={S.lbl}>Dal</label><input type="date" style={S.inp} value={formSfida.dal||dal2} onChange={e=>setFormSfida({...formSfida,dal:e.target.value})}/></div>
                  <div><label style={S.lbl}>Al</label><input type="date" style={S.inp} value={formSfida.al||al2} onChange={e=>setFormSfida({...formSfida,al:e.target.value})}/></div>
                  <div><label style={S.lbl}>Premio</label><input style={S.inp} value={formSfida.premio||""} placeholder="es. Cena per 2" onChange={e=>setFormSfida({...formSfida,premio:e.target.value})}/></div>
                  <div><label style={S.lbl}>Obiettivo team (opz.)</label><input type="number" style={S.inp} value={formSfida.obiettivo||""} placeholder="0" onChange={e=>setFormSfida({...formSfida,obiettivo:Number(e.target.value)})}/></div>
                </div>
                <button style={{...S.btnP,width:"100%",padding:9}} onClick={()=>{if(!formSfida.nome||!formSfida.dal||!formSfida.al)return;setSfide([...sfide,{...formSfida,metrica:formSfida.metrica||"acquisizioni"}]);setFormSfida({});setShowFormSfida(false);}}>🏆 Crea sfida</button>
              </div>)}

              {!showFormSfida&&isBroker&&!sfidaAtt2&&<button onClick={()=>setShowFormSfida(true)} style={{...S.btnP,fontSize:12,padding:"8px 18px"}}>+ Crea nuovo traguardo</button>}
              </div>}

            </div>);
          })()}

          {/* ── ONE-TO-ONE ── */}
          {tab==="One-to-One"&&(isBroker||isBackOffice)&&(<div style={S.sec}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem",flexWrap:"wrap",gap:8}}>
              <h2 style={{fontSize:16,fontWeight:600,margin:0}}>🤝 One-to-One — Incontri con gli agenti</h2>
            </div>
            {/* Selezione agente */}
            <div style={{display:"flex",gap:8,marginBottom:"1.25rem",flexWrap:"wrap"}}>
              {agenti.filter(a=>["Consulente","Collaboratore"].includes(a.profilo)&&a.id!==5).map(ag=>{
                const nInc=(oneToOne[ag.id]||[]).length;
                const isSel=otoAgSel===ag.id;
                return(<button key={ag.id} onClick={()=>setOtoAgSel(ag.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:8,border:`1.5px solid ${isSel?BRAND.oro:"var(--color-border-tertiary)"}`,background:isSel?"#FDF6EC":"var(--color-background-primary)",cursor:"pointer"}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{ag.nome.charAt(0)}</div>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:12,fontWeight:500,color:isSel?BRAND.oroD:"var(--color-text-primary)"}}>{ag.nome} {ag.cognome}</div>
                    <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>{nInc} incontri</div>
                  </div>
                </button>);
              })}
            </div>

            {otoAgSel&&(()=>{
              const ag=agenti.find(a=>a.id===otoAgSel);
              const incontri=(oneToOne[otoAgSel]||[]).sort((a,b)=>b.data.localeCompare(a.data));
              const salvaIncontro=()=>{
                if(!otoForm.data) return;
                const nuovo={id:Date.now(),...otoForm};
                setOneToOne(prev=>({...prev,[otoAgSel]:[...(prev[otoAgSel]||[]),nuovo]}));
                setOtoForm({data:todayStr(),noteIncontro:"",obiettivi:"",criticita:"",azioni:"",notePrivate:""});
              };
              return(<div>
                {/* Form nuovo incontro — card stile professionale */}
                <div style={{background:"#fff",borderRadius:12,border:`1.5px solid ${BRAND.oro}66`,padding:"1.5rem",marginBottom:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem",paddingBottom:"1rem",borderBottom:"0.5px solid #f0f0f0"}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff"}}>{ag?.nome?.charAt(0)}</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:"#2c2c2c"}}>+ Nuovo incontro — {ag?.nome} {ag?.cognome}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>Le note pubbliche saranno visibili all'agente</div>
                    </div>
                    <input type="date" style={{...S.inp,marginLeft:"auto",width:"auto"}} value={otoForm.data} onChange={e=>setOtoForm({...otoForm,data:e.target.value})}/>
                  </div>
                  {/* Sezione pubblica */}
                  <div style={{background:"#fafaf8",borderRadius:8,padding:"12px 14px",marginBottom:12,border:"0.5px solid #e8e5e0"}}>
                    <div style={{fontSize:10,fontWeight:600,color:"#27AE60",textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>📋 Sezione pubblica — visibile all'agente</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      {[["noteIncontro","📝 Note incontro","es. Abbiamo parlato di...","1fr"],["obiettivi","🎯 Obiettivi concordati","es. 15 chiamate/giorno, 2 acquisizioni...","1fr"],["criticita","⚠ Criticità emerse","es. difficoltà nella negoziazione...","1fr"],["azioni","✅ Azioni da fare","es. corso negoziazione entro venerdì...","1fr"]].map(([k,lbl,ph])=>(
                        <div key={k}>
                          <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3,fontWeight:500}}>{lbl}</label>
                          <textarea style={{width:"100%",fontSize:12,padding:"7px 9px",borderRadius:6,border:"0.5px solid #ddd",resize:"none",background:"#fff",lineHeight:1.5}} rows={2} placeholder={ph} value={otoForm[k]||""} onChange={e=>setOtoForm({...otoForm,[k]:e.target.value})}/>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Sezione privata */}
                  <div style={{background:"#FDFBF5",borderRadius:8,padding:"12px 14px",marginBottom:14,border:"1px dashed #D4AC0D66"}}>
                    <div style={{fontSize:10,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>🔒 Note private — visibili solo al broker</div>
                    <textarea style={{width:"100%",fontSize:12,padding:"7px 9px",borderRadius:6,border:"0.5px solid #D4AC0D44",resize:"none",background:"#fff",lineHeight:1.5}} rows={3} placeholder="Considerazioni personali, valutazioni riservate, piani di sviluppo..." value={otoForm.notePrivate||""} onChange={e=>setOtoForm({...otoForm,notePrivate:e.target.value})}/>
                  </div>
                  <button style={{...S.btnP,width:"100%",padding:10,fontSize:13}} onClick={salvaIncontro}>💾 Salva incontro</button>
                </div>

                {/* Storico incontri — cards timeline */}
                {incontri.length>0&&(<div>
                  <div style={{fontSize:11,fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>{incontri.length} incontri registrati</div>
                  {incontri.map((inc,i)=>{
                    const isOpen=otoOpen===inc.id;
                    const hasAzioni=!!inc.azioni; const hasCrit=!!inc.criticita;
                    return(<div key={inc.id} style={{background:"#fff",borderRadius:12,border:`0.5px solid ${isOpen?"#A8863A":"#e8e5e0"}`,marginBottom:10,overflow:"hidden",transition:"border-color .2s"}}>
                      {/* Card header */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",cursor:"pointer",background:isOpen?"#FDFBF7":"#fff",borderBottom:isOpen?"0.5px solid #f0f0f0":"none"}} onClick={()=>setOtoOpen(isOpen?null:inc.id)}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro}88,${BRAND.oro})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{String(incontri.length-i).padStart(2,"0")}</div>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:"#2c2c2c"}}>{fmtD(inc.data)}</div>
                            <div style={{display:"flex",gap:5,marginTop:2}}>
                              {hasAzioni&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:3,background:"#E9F7EF",color:"#085041",fontWeight:500}}>✅ azioni</span>}
                              {hasCrit&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:3,background:"#FDECEA",color:"#A32D2D",fontWeight:500}}>⚠ criticità</span>}
                              {inc.obiettivi&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:3,background:"#EAF3DE",color:"#3B6D11",fontWeight:500}}>🎯 obiettivi</span>}
                            </div>
                          </div>
                        </div>
                        <span style={{fontSize:13,color:"#aaa",flexShrink:0}}>{isOpen?"▲":"▼"}</span>
                      </div>
                      {/* Card body */}
                      {isOpen&&<div style={{padding:"14px 16px"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                          {[["📝 Note incontro","noteIncontro","#f8f8f8","#555"],["🎯 Obiettivi","obiettivi","#EAF3DE","#3B6D11"],["⚠ Criticità","criticita","#FDECEA","#A32D2D"],["✅ Azioni da fare","azioni","#E9F7EF","#085041"]].map(([lbl,k,bg,clr])=>inc[k]&&(
                            <div key={k} style={{padding:"10px 12px",background:bg,borderRadius:8,border:`0.5px solid ${bg}`}}>
                              <div style={{fontSize:10,fontWeight:600,color:clr,textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>{lbl}</div>
                              <div style={{fontSize:12,color:"#2c2c2c",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{inc[k]}</div>
                            </div>
                          ))}
                        </div>
                        {inc.notePrivate&&isBroker&&(
                          <div style={{padding:"10px 12px",background:"#FDFBF5",borderRadius:8,border:"1px dashed #D4AC0D66",marginBottom:8}}>
                            <div style={{fontSize:10,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>🔒 Note private broker</div>
                            <div style={{fontSize:12,color:"#2c2c2c",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{inc.notePrivate}</div>
                          </div>
                        )}
                        {isBroker&&<button style={{...S.btnD,fontSize:10,padding:"3px 10px",marginTop:4}} onClick={()=>setOneToOne(prev=>({...prev,[otoAgSel]:prev[otoAgSel].filter(x=>x.id!==inc.id)}))}>Elimina incontro</button>}
                      </div>}
                    </div>);
                  })}
                </div>)}
              </div>);
            })()}
          </div>)}

          {/* One-to-One AGENTE — solo la propria scheda */}
          {tab==="One-to-One"&&!isBroker&&myAgentId&&(<div style={S.sec}>
            <h2 style={{fontSize:16,fontWeight:600,margin:"0 0 1.25rem"}}>🤝 I miei One-to-One</h2>
            {(()=>{
              const ag=agenti.find(a=>a.id===myAgentId);
              const incontri=((oneToOne[myAgentId]||[]).filter(i=>i.noteIncontro||i.obiettivi||i.criticita||i.azioni||i[`noteAgente_${myAgentId}`])).sort((a,b)=>b.data.localeCompare(a.data));
              const salvaNoteAgente=(incId,nota)=>{
                setOneToOne(prev=>({...prev,[myAgentId]:prev[myAgentId].map(x=>x.id===incId?{...x,[`noteAgente_${myAgentId}`]:nota}:x)}));
              };
              if(incontri.length===0) return(<div style={{background:"#fafaf8",borderRadius:10,padding:"2rem",textAlign:"center",border:"0.5px solid #e8e5e0"}}><p style={{fontSize:13,color:"#aaa"}}>Nessun incontro registrato ancora — il broker inserirà le note degli incontri qui</p></div>);
              return(<div>
                <div style={{fontSize:11,color:"#aaa",textTransform:"uppercase",letterSpacing:".08em",marginBottom:12,fontWeight:600}}>{incontri.length} incontri registrati</div>
                {incontri.map((inc,i)=>{
                  const isOpen=otoOpen===inc.id;
                  return(<div key={inc.id} style={{background:"#fff",borderRadius:12,border:`0.5px solid ${isOpen?"#A8863A":"#e8e5e0"}`,marginBottom:10,overflow:"hidden"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",cursor:"pointer",background:isOpen?"#FDFBF7":"#fff",borderBottom:isOpen?"0.5px solid #f0f0f0":"none"}} onClick={()=>setOtoOpen(isOpen?null:inc.id)}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro}88,${BRAND.oro})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{String(incontri.length-i).padStart(2,"0")}</div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:"#2c2c2c"}}>{fmtD(inc.data)}</div>
                          <div style={{display:"flex",gap:5,marginTop:2}}>
                            {inc.azioni&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:3,background:"#E9F7EF",color:"#085041",fontWeight:500}}>✅ azioni</span>}
                            {inc.criticita&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:3,background:"#FDECEA",color:"#A32D2D",fontWeight:500}}>⚠ criticità</span>}
                            {inc.obiettivi&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:3,background:"#EAF3DE",color:"#3B6D11",fontWeight:500}}>🎯 obiettivi</span>}
                          </div>
                        </div>
                      </div>
                      <span style={{fontSize:13,color:"#aaa"}}>{isOpen?"▲":"▼"}</span>
                    </div>
                    {isOpen&&<div style={{padding:"14px 16px"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                        {[["📝 Note incontro","noteIncontro","#f8f8f8","#555"],["🎯 Obiettivi","obiettivi","#EAF3DE","#3B6D11"],["⚠ Criticità","criticita","#FDECEA","#A32D2D"],["✅ Azioni da fare","azioni","#E9F7EF","#085041"]].map(([lbl,k,bg,clr])=>inc[k]&&(
                          <div key={k} style={{padding:"10px 12px",background:bg,borderRadius:8}}>
                            <div style={{fontSize:10,fontWeight:600,color:clr,textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>{lbl}</div>
                            <div style={{fontSize:12,color:"#2c2c2c",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{inc[k]}</div>
                          </div>
                        ))}
                      </div>
                      {/* Note personali agente */}
                      <div style={{background:"#EAF4FB",borderRadius:8,padding:"10px 12px",border:"1px dashed #2980B944"}}>
                        <div style={{fontSize:10,fontWeight:600,color:"#2980B9",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>📓 Le mie note personali (private, solo tu le vedi)</div>
                        <textarea style={{width:"100%",fontSize:12,padding:"6px 8px",borderRadius:5,border:"0.5px solid #2980B944",resize:"none",background:"#fff",lineHeight:1.5}} rows={3} value={inc[`noteAgente_${myAgentId}`]||""} placeholder="Le tue riflessioni, domande da fare al prossimo incontro..." onChange={e=>salvaNoteAgente(inc.id,e.target.value)}/>
                        <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
                          <button style={{...S.btn,fontSize:11,padding:"4px 14px",background:"#2980B9",color:"#fff",border:"none"}} onClick={()=>salvaNoteAgente(inc.id,inc[`noteAgente_${myAgentId}`]||"")}>💾 Salva note</button>
                        </div>
                      </div>
                    </div>}
                  </div>);
                })}
              </div>);
            })()}
          </div>)}

          {/* STATISTICHE */}
          {tab==="Statistiche"&&(()=>{
            // ── helpers ──────────────────────────────────────────────────────
            // Data di riferimento per le statistiche = dataVendita (quando la proposta è accettata)
            const dataRifVend = v => dataCompAgenzia(v);

            // Calcola provvigione standard per un lato (venditore o acquirente)
            const provvStd = (prezzo, lato) => {
              const p = Number(prezzo||0);
              if(p<=0) return 0;
              const perc = lato==="V" ? Number(provvStandard.percVend||3)/100 : Number(provvStandard.percAcq||4)/100;
              const minimo = p < Number(provvStandard.soglia||120000)
                ? (lato==="V" ? Number(provvStandard.minVend||3500) : Number(provvStandard.minAcq||4000))
                : 0;
              return Math.max(p*perc, minimo);
            };

            // Calcola sconto su un venduto (differenza standard - reale, solo se provv > 0)
            const calcolaSconto = v => {
              const pV=Number(v.provvVenditore||0);
              const pA=Number(v.provvAcquirente||0);
              const prezzoV=Number(v.prezzoVendita||0);
              // transazione venditore: conta solo se provvVenditore > 0 e NON è collaborazione esterna
              const isTransV = pV>0 && !v.agenziaEsterna;
              // transazione acquirente: conta solo se provvAcquirente > 0
              const isTransA = pA>0;
              const stdV = isTransV ? provvStd(prezzoV,"V") : 0;
              const stdA = isTransA ? provvStd(prezzoV,"A") : 0;
              return {
                scontoV: isTransV ? Math.max(0, stdV-pV) : 0,
                scontoA: isTransA ? Math.max(0, stdA-pA) : 0,
                stdV, stdA, isTransV, isTransA,
                prezzoV, pV, pA,
              };
            };

            // Anno/anni disponibili basati su dataVendita
            const anniStat = Array.from(new Set(venduti.filter(v=>v.categoria==="vendita").map(v=>getAnno(dataRifVend(v))).filter(Boolean))).sort().reverse();
            const anniIncStat = Array.from(new Set(incarichi.filter(i=>i.categoria==="vendita").map(i=>getAnno(i.dataInizio)).filter(Boolean))).sort().reverse();
            const tuttiAnni = Array.from(new Set([...anniStat,...anniIncStat,annoCorrente])).sort().reverse();

            // statAnno e statSubTab sono gestiti a livello App

            // Vendite filtrate per anno (provv > 0 su almeno un lato, categoria vendita)
            const vendStat = venduti.filter(v=>{
              if(v.categoria!=="vendita") return false;
              const pV=Number(v.provvVenditore||0);
              const pA=Number(v.provvAcquirente||0);
              if(pV===0&&pA===0) return false; // escludi provv €0
              // Agente vede solo le proprie pratiche
              if(!isBroker&&!isBackOffice&&myAgentId&&Number(v.agenteListing)!==myAgentId&&Number(v.agenteAcquirente)!==myAgentId) return false;
              if(statAnno!=="Tutti"&&getAnno(dataRifVend(v))!==statAnno) return false;
              return true;
            });

            // Incarichi acquisiti nell'anno (filtrati per agente se non broker)
            const incStat = incarichi.filter(i=>i.categoria==="vendita"&&(statAnno==="Tutti"||getAnno(i.dataInizio)===statAnno)&&(isBroker||isBackOffice||!myAgentId||i.agenteListing===myAgentId));

            // Transazioni: venditore = provvVenditore>0 + NON collaborazione esterna; acquirente = provvAcquirente>0
            const transV = vendStat.filter(v=>Number(v.provvVenditore||0)>0&&!v.agenziaEsterna);
            const transA = vendStat.filter(v=>Number(v.provvAcquirente||0)>0);
            const nTransV = transV.length;
            const nTransA = transA.length;
            const nTransTot = nTransV + nTransA;

            // Valore medio transazione venditore (provvigione media lato V)
            const valMedioV = nTransV>0 ? transV.reduce((s,v)=>s+Number(v.provvVenditore||0),0)/nTransV : 0;
            // Valore medio transazione acquirente
            const valMedioA = nTransA>0 ? transA.reduce((s,v)=>s+Number(v.provvAcquirente||0),0)/nTransA : 0;

            // % media sul prezzo (solo transazioni con prezzo > 0)
            const percMedioV = transV.filter(v=>v.prezzoVendita>0).length>0
              ? transV.filter(v=>v.prezzoVendita>0).reduce((s,v)=>s+Number(v.provvVenditore||0)/Number(v.prezzoVendita)*100,0)/transV.filter(v=>v.prezzoVendita>0).length : 0;
            const percMedioA = transA.filter(v=>v.prezzoVendita>0).length>0
              ? transA.filter(v=>v.prezzoVendita>0).reduce((s,v)=>s+Number(v.provvAcquirente||0)/Number(v.prezzoVendita)*100,0)/transA.filter(v=>v.prezzoVendita>0).length : 0;

            // Prezzo medio immobile (solo vendite con prezzo > 0)
            const vendConPrezzo = vendStat.filter(v=>Number(v.prezzoVendita||0)>0);
            const prezzoMedio = vendConPrezzo.length>0 ? vendConPrezzo.reduce((s,v)=>s+Number(v.prezzoVendita||0),0)/vendConPrezzo.length : 0;

            // Sconto totale aggregato
            const scontiAgg = vendStat.reduce((s,v)=>{const sc=calcolaSconto(v);return{scontoV:s.scontoV+sc.scontoV,scontoA:s.scontoA+sc.scontoA};},{scontoV:0,scontoA:0});
            const scontoTot = scontiAgg.scontoV+scontiAgg.scontoA;

            // Distribuzione per fonte (incarichi)
            const perFonte = {};
            incStat.forEach(i=>{const f=i.fonte||"N/D";perFonte[f]=(perFonte[f]||0)+1;});
            const fontiOrd = Object.entries(perFonte).sort((a,b)=>b[1]-a[1]);
            const maxFonte = Math.max(...fontiOrd.map(f=>f[1]),1);

            // Distribuzione per tipologia (vendite)
            const perTip = {};
            vendStat.forEach(v=>{const t=v.tipologia||"Altro";perTip[t]=(perTip[t]||0)+1;});
            const tipOrd = Object.entries(perTip).sort((a,b)=>b[1]-a[1]);
            const maxTip = Math.max(...tipOrd.map(t=>t[1]),1);

            // ── REPORT AGENTI ────────────────────────────────────────────────
            const agentiReport = agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(ag=>{
              // Vendite dove l'agente è LISTING o ACQUIRENTE (non solo buyer)
              const vendAg = vendStat.filter(v=>{
                const isListing = v.agenteListing===ag.id && Number(v.provvVenditore||0)>0 && !v.agenziaEsterna;
                const isAcq = v.agenteAcquirente===ag.id && Number(v.provvAcquirente||0)>0;
                return isListing||isAcq;
              });
              const nTV = vendAg.filter(v=>v.agenteListing===ag.id&&Number(v.provvVenditore||0)>0&&!v.agenziaEsterna).length;
              const nTA = vendAg.filter(v=>v.agenteAcquirente===ag.id&&Number(v.provvAcquirente||0)>0).length;
              const prezziAg = vendAg.filter(v=>Number(v.prezzoVendita||0)>0).map(v=>Number(v.prezzoVendita||0));
              const prezzoMedioAg = prezziAg.length>0?prezziAg.reduce((s,p)=>s+p,0)/prezziAg.length:0;
              // Sconto agente: somma sconti su pratiche dove è listing o acquirente
              const scontoAg = vendAg.reduce((s,v)=>{
                const sc=calcolaSconto(v);
                let tot=0;
                if(v.agenteListing===ag.id&&Number(v.provvVenditore||0)>0&&!v.agenziaEsterna) tot+=sc.scontoV;
                if(v.agenteAcquirente===ag.id&&Number(v.provvAcquirente||0)>0) tot+=sc.scontoA;
                return s+tot;
              },0);
              // Quota agente (solo Listing/Acquirente, non Buyer)
              const quotaAg = vendAg.reduce((s,v)=>{
                let q=0;
                if(v.agenteListing===ag.id) q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
                if(v.agenteAcquirente===ag.id) q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
                return s+q;
              },0);
              return {ag, nTV, nTA, nTot:nTV+nTA, prezzoMedioAg, scontoAg, quotaAg, nPratiche:vendAg.length};
            });

            const COLORI=["#C9A96E","#4A90D9","#27AE60","#8E44AD","#E67E22","#E74C3C","#1ABC9C","#F39C12"];
            const sCard={background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"16px 20px"};
            const sLbl={fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 2px"};

            return(
              <div style={S.sec}>
                {/* Header + filtro anno */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
                  <div>
                    <h2 style={{fontSize:16,fontWeight:600,margin:"0 0 2px",color:BRAND.grigio}}>📈 Statistiche & Prestazioni</h2>
                    <p style={{fontSize:11,color:"#aaa",margin:0}}>Data riferimento: data accettazione proposta (non data atto) · Escluse provv. €0</p>
                  </div>
                  <select style={S.sel} value={statAnno} onChange={e=>setStatAnno(e.target.value)}>
                    <option value="Tutti">Tutti gli anni</option>
                    {tuttiAnni.map(a=><option key={a}>{a}</option>)}
                  </select>
                </div>

                {/* Sotto-tab */}
                <div style={{display:"flex",gap:8,marginBottom:"1.25rem",borderBottom:"1px solid #eee",paddingBottom:"0.75rem"}}>
                  {[
                    {v:"generali",l:"📊 Generali"},
                    ...(isBroker||isBackOffice?[{v:"agenti",l:"👥 Report agenti"}]:[]),
                    {v:"trend",l:"📈 Trend & Andamento"},
                    {v:"funnel",l:"🔄 Funnel & Conversioni"},
                  ].map(o=>(
                    <button key={o.v} onClick={()=>setStatSubTab(o.v)} style={{
                      padding:"7px 18px",fontSize:13,cursor:"pointer",border:"none",background:"none",
                      borderBottom:`2px solid ${statSubTab===o.v?BRAND.oro:"transparent"}`,
                      color:statSubTab===o.v?BRAND.oroD:BRAND.grigio,fontWeight:statSubTab===o.v?600:400,
                      fontFamily:"inherit",transition:"all 0.15s"
                    }}>{o.l}</button>
                  ))}
                </div>

                {/* ── STATISTICHE GENERALI ── */}
                {statSubTab==="generali"&&(<>

                                  <p style={{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 10px"}}>Transazioni</p>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
                    {/* Valore medio transazione Càsa — (provvV + provvA) / 2 */}
                    {(()=>{
                      const provvV=nTransV>0?transV.reduce((s,v)=>s+Number(v.provvVenditore||0),0)/nTransV:0;
                      const provvA=nTransA>0?transA.reduce((s,v)=>s+Number(v.provvAcquirente||0),0)/nTransA:0;
                      const mediaCasa=(provvV+provvA)/2;
                      return(<div style={{...sCard,borderTop:`3px solid ${BRAND.oroD}`,gridColumn:"1"}}>
                        <p style={sLbl}>Valore medio transazione Càsa</p>
                        <p style={{fontSize:28,fontWeight:700,color:BRAND.oroD,margin:"4px 0 2px"}}>€ {fmt(Math.round(mediaCasa))}</p>
                        <p style={{fontSize:11,color:"#888",margin:0}}>media (provv.V + provv.A) ÷ 2</p>
                      </div>);
                    })()}
                    {/* Transazioni totali */}
                    <div style={{...sCard,borderTop:`3px solid ${BRAND.grigio}`}}>
                      <p style={sLbl}>Transazioni totali</p>
                      <p style={{fontSize:32,fontWeight:700,color:BRAND.oroD,margin:"4px 0 2px"}}>{nTransTot}</p>
                      <p style={{fontSize:11,color:"#888",margin:0}}>
                        <span style={{color:"#2980B9",fontWeight:500}}>{nTransV} venditore</span>
                        {" · "}
                        <span style={{color:"#8E44AD",fontWeight:500}}>{nTransA} acquirente</span>
                      </p>
                    </div>
                    {/* Valore medio trans Venditore */}
                    <div style={{...sCard,borderTop:"3px solid #2980B9"}}>
                      <p style={sLbl}>Valore medio trans. Venditore</p>
                      <p style={{fontSize:22,fontWeight:700,color:"#2980B9",margin:"4px 0 2px"}}>€ {fmt(valMedioV)}</p>
                      <p style={{fontSize:11,color:"#888",margin:0}}>{percMedioV>0?`${percMedioV.toFixed(2)}% sul prezzo`:"—"}</p>
                    </div>
                    {/* Valore medio trans Acquirente */}
                    <div style={{...sCard,borderTop:"3px solid #8E44AD"}}>
                      <p style={sLbl}>Valore medio trans. Acquirente</p>
                      <p style={{fontSize:22,fontWeight:700,color:"#8E44AD",margin:"4px 0 2px"}}>€ {fmt(valMedioA)}</p>
                      <p style={{fontSize:11,color:"#888",margin:0}}>{percMedioA>0?`${percMedioA.toFixed(2)}% sul prezzo`:"—"}</p>
                    </div>
                  </div>

                  {/* Sezione IMMOBILI */}
                  <p style={{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 10px"}}>Immobili</p>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10,marginBottom:"1.25rem"}}>
                    <div style={{...sCard,borderTop:"3px solid #E67E22"}}>
                      <p style={sLbl}>Prezzo medio compravendita</p>
                      <p style={{fontSize:22,fontWeight:700,color:"#E67E22",margin:"4px 0 2px"}}>€ {fmtN(prezzoMedio)}</p>
                      <p style={{fontSize:11,color:"#888",margin:0}}>{vendConPrezzo.length} immobili trattati</p>
                    </div>
                    <div style={{...sCard,borderTop:"3px solid #E74C3C"}}>
                      <p style={sLbl}>Sconto totale applicato</p>
                      <p style={{fontSize:22,fontWeight:700,color:"#E74C3C",margin:"4px 0 2px"}}>€ {fmt(scontoTot)}</p>
                      <p style={{fontSize:11,color:"#888",margin:0}}>
                        V: € {fmt(scontiAgg.scontoV)} · A: € {fmt(scontiAgg.scontoA)}
                      </p>
                    </div>
                    <div style={{...sCard,borderTop:"3px solid #1ABC9C"}}>
                      <p style={sLbl}>Fatturato lordo</p>
                      <p style={{fontSize:22,fontWeight:700,color:"#1ABC9C",margin:"4px 0 2px"}}>
                        € {fmt(vendStat.reduce((s,v)=>s+Number(v.provvVenditore||0)+Number(v.provvAcquirente||0),0))}
                      </p>
                      <p style={{fontSize:11,color:"#888",margin:0}}>provv. V + A su {vendStat.length} vendite</p>
                    </div>
                  </div>

                  {/* Dettaglio sconto per vendita — collassabile */}
                  {vendStat.some(v=>{const sc=calcolaSconto(v);return sc.scontoV>0||sc.scontoA>0;})&&(
                    <div style={{...sCard,marginBottom:"1.25rem"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setStatShowSconti(v=>!v)}>
                        <p style={{...sLbl,margin:0}}>Dettaglio sconti per vendita</p>
                        <button style={{background:"none",border:`0.5px solid #ddd`,borderRadius:6,padding:"4px 12px",fontSize:12,cursor:"pointer",color:BRAND.oroD,display:"flex",alignItems:"center",gap:5}}>
                          {statShowSconti?"▲ Nascondi":"▼ Vedi dettaglio"}
                        </button>
                      </div>
                      {statShowSconti&&(
                        <div style={{marginTop:14,overflowX:"auto"}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:560}}>
                            <thead>
                              <tr style={{background:"#fafaf8"}}>
                                {["Data","Immobile","Prezzo","Provv.V reale","Provv.V std","Sconto V","Provv.A reale","Provv.A std","Sconto A","Tot. sconto"].map(h=>(
                                  <th key={h} style={{padding:"7px 10px",borderBottom:"0.5px solid #eee",color:"#888",fontWeight:500,fontSize:11,textAlign:"right",whiteSpace:"nowrap"}}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {vendStat.map(v=>{
                                const sc=calcolaSconto(v);
                                const scTot=sc.scontoV+sc.scontoA;
                                if(!sc.isTransV&&!sc.isTransA) return null;
                                return(
                                  <tr key={v.id} style={{background:scTot>0?"#FEF9E7":"#fff"}}>
                                    <td style={{padding:"7px 10px",borderBottom:"0.5px solid #f5f5f5",color:"#888",whiteSpace:"nowrap"}}>{fmtD(dataRifVend(v))}</td>
                                    <td style={{padding:"7px 10px",borderBottom:"0.5px solid #f5f5f5",fontWeight:500}}>{v.comuneImmobile} — {v.indirizzoImmobile}</td>
                                    <td style={{padding:"7px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right"}}>€ {fmtN(sc.prezzoV)}</td>
                                    <td style={{padding:"7px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right",color:"#2980B9"}}>{sc.isTransV?`€ ${fmt(sc.pV)}`:"—"}</td>
                                    <td style={{padding:"7px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right",color:"#aaa"}}>{sc.isTransV?`€ ${fmt(sc.stdV)}`:"—"}</td>
                                    <td style={{padding:"7px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right",fontWeight:600,color:sc.scontoV>0?"#E74C3C":"#27AE60"}}>{sc.isTransV?(sc.scontoV>0?`-€ ${fmt(sc.scontoV)}`:"✓"):"—"}</td>
                                    <td style={{padding:"7px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right",color:"#8E44AD"}}>{sc.isTransA?`€ ${fmt(sc.pA)}`:"—"}</td>
                                    <td style={{padding:"7px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right",color:"#aaa"}}>{sc.isTransA?`€ ${fmt(sc.stdA)}`:"—"}</td>
                                    <td style={{padding:"7px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right",fontWeight:600,color:sc.scontoA>0?"#E74C3C":"#27AE60"}}>{sc.isTransA?(sc.scontoA>0?`-€ ${fmt(sc.scontoA)}`:"✓"):"—"}</td>
                                    <td style={{padding:"7px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right",fontWeight:700,color:scTot>0?"#E74C3C":"#27AE60"}}>{scTot>0?`-€ ${fmt(scTot)}`:"✓"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr style={{background:BRAND.beige,fontWeight:600}}>
                                <td colSpan={5} style={{padding:"8px 10px",fontSize:12}}>Totale sconti</td>
                                <td style={{padding:"8px 10px",textAlign:"right",color:"#E74C3C"}}>-€ {fmt(scontiAgg.scontoV)}</td>
                                <td colSpan={2} style={{padding:"8px 10px"}}/>
                                <td style={{padding:"8px 10px",textAlign:"right",color:"#E74C3C"}}>-€ {fmt(scontiAgg.scontoA)}</td>
                                <td style={{padding:"8px 10px",textAlign:"right",color:"#E74C3C"}}>-€ {fmt(scontoTot)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fonti + Tipologie */}
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:"1.25rem"}}>
                    <div style={sCard}>
                      <p style={{...sLbl,marginBottom:12}}>Incarichi per fonte</p>
                      {fontiOrd.length===0&&<p style={{color:"#bbb",fontSize:13,margin:0}}>Nessun dato</p>}
                      {fontiOrd.map(([f,cnt],i)=>{
                        const perc=cnt/maxFonte*100;
                        return(
                          <div key={f} style={{marginBottom:9}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                              <span style={{color:"#555"}}>{f}</span>
                              <span style={{fontWeight:500,color:COLORI[i%COLORI.length]}}>{cnt}</span>
                            </div>
                            <div style={{height:7,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${perc}%`,background:COLORI[i%COLORI.length],borderRadius:4}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={sCard}>
                      <p style={{...sLbl,marginBottom:12}}>Vendite per tipologia immobile</p>
                      {tipOrd.length===0&&<p style={{color:"#bbb",fontSize:13,margin:0}}>Nessun dato</p>}
                      {tipOrd.map(([t,cnt],i)=>{
                        const perc=cnt/maxTip*100;
                        return(
                          <div key={t} style={{marginBottom:9}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                              <span style={{color:"#555"}}>{t}</span>
                              <span style={{fontWeight:500,color:COLORI[i%COLORI.length]}}>{cnt}</span>
                            </div>
                            <div style={{height:7,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${perc}%`,background:COLORI[i%COLORI.length],borderRadius:4}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>)}

                {/* ── REPORT AGENTI ── */}
                {statSubTab==="agenti"&&(<>
                  <div style={{...sCard,marginBottom:"1.25rem"}}>
                    <p style={{...sLbl,marginBottom:14}}>Performance agenti — transazioni, medie e sconti</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"0 0 14px"}}>
                      Contano solo le pratiche dove l'agente è Listing (lato V) o Acquirente (lato A) con provvigione &gt; 0
                    </p>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:620}}>
                        <thead>
                          <tr style={{background:"#fafaf8"}}>
                            {["Agente","Profilo","Trans. V","Trans. A","Tot. Trans.","Prezzo medio immobile","Quota agente","Sconto applicato"].map(h=>(
                              <th key={h} style={{padding:"9px 10px",borderBottom:"0.5px solid #eee",color:"#888",fontWeight:500,fontSize:11,textAlign:h==="Agente"||h==="Profilo"?"left":"right",whiteSpace:"nowrap"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {agentiReport.map(({ag,nTV,nTA,nTot,prezzoMedioAg,scontoAg,quotaAg,nPratiche},idx)=>(
                            <tr key={ag.id} style={{background:idx%2===0?"#fff":"#fafafa"}}>
                              <td style={{padding:"10px 10px",borderBottom:"0.5px solid #f5f5f5"}}>
                                <div style={{display:"flex",alignItems:"center",gap:8}}>
                                  <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{ag.nome.charAt(0)}</div>
                                  <span style={{fontWeight:500}}>{ag.nome} {ag.cognome}</span>
                                </div>
                              </td>
                              <td style={{padding:"10px 10px",borderBottom:"0.5px solid #f5f5f5"}}>
                                <span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:ag.profilo==="Broker"?`${BRAND.oro}22`:ag.profilo==="Consulente"?"#EAF4FB":"#F0F0F0",color:ag.profilo==="Broker"?BRAND.oroD:ag.profilo==="Consulente"?"#2980B9":"#666",fontWeight:500}}>{ag.profilo}</span>
                              </td>
                              <td style={{padding:"10px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right"}}>
                                <span style={{fontWeight:600,color:"#2980B9"}}>{nTV}</span>
                              </td>
                              <td style={{padding:"10px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right"}}>
                                <span style={{fontWeight:600,color:"#8E44AD"}}>{nTA}</span>
                              </td>
                              <td style={{padding:"10px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right"}}>
                                <span style={{fontWeight:700,color:BRAND.oroD}}>{nTot}</span>
                              </td>
                              <td style={{padding:"10px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right"}}>
                                {prezzoMedioAg>0?`€ ${fmtN(prezzoMedioAg)}`:"—"}
                              </td>
                              <td style={{padding:"10px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right",fontWeight:500,color:"#27AE60"}}>
                                {quotaAg>0?`€ ${fmt(quotaAg)}`:"—"}
                              </td>
                              <td style={{padding:"10px 10px",borderBottom:"0.5px solid #f5f5f5",textAlign:"right",fontWeight:600,color:scontoAg>0?"#E74C3C":"#aaa"}}>
                                {scontoAg>0?`-€ ${fmt(scontoAg)}`:"✓"}
                              </td>
                            </tr>
                          ))}
                          {agentiReport.length===0&&<tr><td colSpan={8} style={{padding:"2rem",textAlign:"center",color:"#bbb"}}>Nessun dato per l'anno selezionato</td></tr>}
                        </tbody>
                        {agentiReport.some(a=>a.nTot>0)&&(
                          <tfoot>
                            <tr style={{background:BRAND.beige,fontWeight:600,fontSize:13}}>
                              <td colSpan={2} style={{padding:"9px 10px",color:BRAND.grigio}}>TOTALE</td>
                              <td style={{padding:"9px 10px",textAlign:"right",color:"#2980B9"}}>{agentiReport.reduce((s,a)=>s+a.nTV,0)}</td>
                              <td style={{padding:"9px 10px",textAlign:"right",color:"#8E44AD"}}>{agentiReport.reduce((s,a)=>s+a.nTA,0)}</td>
                              <td style={{padding:"9px 10px",textAlign:"right",color:BRAND.oroD}}>{agentiReport.reduce((s,a)=>s+a.nTot,0)}</td>
                              <td style={{padding:"9px 10px"}}/>
                              <td style={{padding:"9px 10px",textAlign:"right",color:"#27AE60"}}>€ {fmt(agentiReport.reduce((s,a)=>s+a.quotaAg,0))}</td>
                              <td style={{padding:"9px 10px",textAlign:"right",color:"#E74C3C"}}>-€ {fmt(agentiReport.reduce((s,a)=>s+a.scontoAg,0))}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>

                  {/* Dettaglio sconto per agente */}
                  {agentiReport.filter(a=>a.scontoAg>0).length>0&&(
                    <div style={{...sCard,marginBottom:"1.25rem"}}>
                      <p style={{...sLbl,marginBottom:12}}>Dettaglio sconto per agente</p>
                      {agentiReport.filter(a=>a.scontoAg>0).map(({ag,scontoAg})=>(
                        <div key={ag.id} style={{marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,marginBottom:4}}>
                            <span style={{fontWeight:500}}>{ag.nome} {ag.cognome}</span>
                            <span style={{fontWeight:700,color:"#E74C3C"}}>-€ {fmt(scontoAg)}</span>
                          </div>
                          {/* Mini barra: sconto rispetto al totale */}
                          <div style={{height:6,background:"#f0f0f0",borderRadius:3,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${Math.min(100,scontoAg/Math.max(scontoTot,1)*100)}%`,background:"#E74C3C",borderRadius:3}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>)}

                {/* ══════════════════════════════════════════════════════ */}
                {/* ── TREND & ANDAMENTO ── */}
                {/* ══════════════════════════════════════════════════════ */}
                {statSubTab==="trend"&&(()=>{
                  // === SELETTORI: agente + periodo ===
                  const brokerVedeSeStesso = (isBroker||isBackOffice) && (statAgente==="Tutti"||statAgente===""||statAgente==="self"||statAgente===String(myAgentId));
                  const isAgg = (isBroker||isBackOffice) && statAgente==="team";
                  const agIdT = isAgg ? null :
                    (isBroker||isBackOffice)
                      ? (brokerVedeSeStesso ? myAgentId : Number(statAgente))
                      : myAgentId;

                  // Periodo: "ytd" = da gennaio a oggi, altrimenti N mesi rolling indietro
                  const isYTD = statPeriodoMesi==="ytd";
                  const oggi = new Date();
                  const oggiMese = oggi.getMonth(); // 0-11
                  const oggiAnno = oggi.getFullYear();
                  // Genero array di mesi
                  const mesiPeriodo = [];
                  if(isYTD){
                    // Da gennaio dell'anno corrente fino al mese corrente
                    for(let m=0; m<=oggiMese; m++){
                      const d = new Date(oggiAnno, m, 1);
                      mesiPeriodo.push({
                        key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
                        label: ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"][d.getMonth()],
                        anno: d.getFullYear(),
                        mese: d.getMonth()+1,
                      });
                    }
                  } else {
                    const nMesi = Number(statPeriodoMesi||12);
                    for(let i=nMesi-1; i>=0; i--){
                      const d = new Date(oggiAnno, oggiMese-i, 1);
                      mesiPeriodo.push({
                        key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
                        label: ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"][d.getMonth()],
                        anno: d.getFullYear(),
                        mese: d.getMonth()+1,
                      });
                    }
                  }
                  const nMesi = mesiPeriodo.length;

                  // === AGGREGAZIONE: per ogni mese, calcolo i dati ===
                  const aggregaMeseAgente = (agId, meseKey) => {
                    const dati = oggiDati[agId]||{};
                    const aggr = {azioni:0, conseguenze:0, ore:0, perAzione:{}, perConseg:{}};
                    Object.entries(dati).forEach(([k,g])=>{
                      if(!k.startsWith(meseKey)) return;
                      const az=g.azioni||{}, co=g.conseguenze||{}, tp=g.tempo||{};
                      Object.entries(az).forEach(([azId,v])=>{
                        const f = Number(v.fatto||0);
                        aggr.azioni += f;
                        aggr.perAzione[azId] = (aggr.perAzione[azId]||0)+f;
                      });
                      Object.entries(co).forEach(([cId,v])=>{
                        const n = Number(v||0);
                        aggr.conseguenze += n;
                        aggr.perConseg[cId] = (aggr.perConseg[cId]||0)+n;
                      });
                      Object.values(tp).forEach(v=>{ aggr.ore += Number(v||0); });
                    });
                    return aggr;
                  };

                  const aggregaMese = (meseKey) => {
                    if(isAgg){
                      const operativi = agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false);
                      const merged = {azioni:0, conseguenze:0, ore:0, perAzione:{}, perConseg:{}, fatturato:0, acquisizioni:0, agentiAttivi:0};
                      operativi.forEach(ag=>{
                        const a = aggregaMeseAgente(ag.id, meseKey);
                        if(a.azioni>0) merged.agentiAttivi++;
                        merged.azioni += a.azioni;
                        merged.conseguenze += a.conseguenze;
                        merged.ore += a.ore;
                        Object.entries(a.perAzione).forEach(([k,v])=>{ merged.perAzione[k]=(merged.perAzione[k]||0)+v; });
                        Object.entries(a.perConseg).forEach(([k,v])=>{ merged.perConseg[k]=(merged.perConseg[k]||0)+v; });
                      });
                      // Fatturato + acquisizioni team da venduti/incarichi
                      venduti.filter(v=>{
                        const dr = dataCompAgenzia(v);
                        return dr&&dr.startsWith(meseKey);
                      }).forEach(v=>{
                        merged.fatturato += Number(v.provvVenditore||0) + Number(v.provvAcquirente||0);
                      });
                      merged.acquisizioni = incarichi.filter(i=>i.categoria==="vendita"&&(i.dataInizio||"").startsWith(meseKey)&&!i.archiviato).length;
                      return merged;
                    } else {
                      const a = aggregaMeseAgente(agIdT, meseKey);
                      // Fatturato dell'agente
                      a.fatturato = venduti.filter(v=>{
                        const dr = dataCompAgenzia(v);
                        if(!dr||!dr.startsWith(meseKey)) return false;
                        return v.agenteListing===agIdT||v.agenteAcquirente===agIdT||v.buyerListing===agIdT||v.buyer===agIdT;
                      }).reduce((s,v)=>{
                        let p=0;
                        if(v.agenteListing===agIdT) p+=Number(v.provvVenditore||0);
                        if(v.agenteAcquirente===agIdT) p+=Number(v.provvAcquirente||0);
                        return s+p;
                      },0);
                      a.acquisizioni = incarichi.filter(i=>i.agenteListing===agIdT&&(i.dataInizio||"").startsWith(meseKey)&&!i.archiviato).length;
                      return a;
                    }
                  };

                  const datiPerMese = mesiPeriodo.map(m=>({...m, ...aggregaMese(m.key)}));

                  // === KPI TOTALI PERIODO ===
                  const totFatt = datiPerMese.reduce((s,m)=>s+m.fatturato,0);
                  const totAcq = datiPerMese.reduce((s,m)=>s+m.acquisizioni,0);
                  const totAzioni = datiPerMese.reduce((s,m)=>s+m.azioni,0);
                  const totOre = datiPerMese.reduce((s,m)=>s+m.ore,0);
                  const maxFatt = Math.max(...datiPerMese.map(m=>m.fatturato), 0);
                  const maxAcq = Math.max(...datiPerMese.map(m=>m.acquisizioni), 0);
                  const maxAzioni = Math.max(...datiPerMese.map(m=>m.azioni), 0);

                  // Calcolo trend: confronto prima metà vs seconda metà periodo
                  const meta = Math.floor(datiPerMese.length/2);
                  const fattPrimaMeta = datiPerMese.slice(0,meta).reduce((s,m)=>s+m.fatturato,0);
                  const fattSecondaMeta = datiPerMese.slice(meta).reduce((s,m)=>s+m.fatturato,0);
                  const trendFatt = fattPrimaMeta>0 ? Math.round((fattSecondaMeta-fattPrimaMeta)/fattPrimaMeta*100) : null;
                  const acqPrimaMeta = datiPerMese.slice(0,meta).reduce((s,m)=>s+m.acquisizioni,0);
                  const acqSecondaMeta = datiPerMese.slice(meta).reduce((s,m)=>s+m.acquisizioni,0);
                  const trendAcq = acqPrimaMeta>0 ? Math.round((acqSecondaMeta-acqPrimaMeta)/acqPrimaMeta*100) : null;

                  // === Confronto YoY (Year-over-Year) ===
                  // Confronto mese corrente con stesso mese anno scorso
                  const meseCorr = `${oggiAnno}-${String(oggiMese+1).padStart(2,"0")}`;
                  const meseAnnoScorso = `${oggiAnno-1}-${String(oggiMese+1).padStart(2,"0")}`;
                  const dCorr = aggregaMese(meseCorr);
                  const dPrec = aggregaMese(meseAnnoScorso);
                  const yoyFatt = dPrec.fatturato>0 ? Math.round((dCorr.fatturato-dPrec.fatturato)/dPrec.fatturato*100) : null;
                  const yoyAcq = dPrec.acquisizioni>0 ? Math.round((dCorr.acquisizioni-dPrec.acquisizioni)/dPrec.acquisizioni*100) : null;
                  const yoyAzioni = dPrec.azioni>0 ? Math.round((dCorr.azioni-dPrec.azioni)/dPrec.azioni*100) : null;

                  const agSelT = !isAgg ? agenti.find(a=>a.id===agIdT) : null;
                  const renderTrend = (v) => {
                    if(v===null||v===undefined) return <span style={{color:"#bbb",fontSize:11}}>—</span>;
                    if(v===0) return <span style={{color:"#888",fontSize:11,fontWeight:600}}>=</span>;
                    const isUp = v>0;
                    return <span style={{color:isUp?"#27AE60":"#E74C3C",fontSize:12,fontWeight:700}}>{isUp?"↑":"↓"} {Math.abs(v)}%</span>;
                  };

                  return(<>
                    {/* SELETTORI */}
                    <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center",flexWrap:"wrap"}}>
                      <select style={S.sel} value={String(statPeriodoMesi)} onChange={e=>setStatPeriodoMesi(e.target.value)}>
                        <option value="ytd">📅 Anno corrente (gen → oggi)</option>
                        <option value="3">Ultimi 3 mesi</option>
                        <option value="6">Ultimi 6 mesi</option>
                        <option value="12">Ultimi 12 mesi</option>
                        <option value="24">Ultimi 24 mesi</option>
                      </select>
                      {(isBroker||isBackOffice)&&<select style={S.sel} value={isAgg?"team":(brokerVedeSeStesso?"self":statAgente)} onChange={e=>setStatAgente(e.target.value)}>
                        <option value="self">🏠 I miei dati</option>
                        <option value="team">👥 Vista team aggregata</option>
                        <optgroup label="Singolo agente">
                          {agenti.filter(a=>["Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false&&a.id!==myAgentId).map(a=><option key={a.id} value={a.id}>👤 {a.nome} {a.cognome}</option>)}
                        </optgroup>
                      </select>}
                    </div>

                    {/* HEADER */}
                    <div style={{background:`linear-gradient(135deg, ${BRAND.oro}18 0%, ${BRAND.oro}08 100%)`,borderRadius:14,padding:"1.25rem 1.5rem",marginBottom:"1.25rem",border:`1.5px solid ${BRAND.oro}55`}}>
                      <p style={{fontSize:11,color:BRAND.oroD,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>📈 Trend & Andamento</p>
                      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>{isAgg?"Vista team aggregata":(agSelT?`${agSelT.nome} ${agSelT.cognome}`:"—")}</h2>
                      <p style={{fontSize:12,color:"#666",margin:"4px 0 0",fontWeight:500}}>{isYTD?`Anno ${oggiAnno}`:`Ultimi ${nMesi} mesi`} · da {mesiPeriodo[0].label} {mesiPeriodo[0].anno} a {mesiPeriodo[mesiPeriodo.length-1].label} {mesiPeriodo[mesiPeriodo.length-1].anno}</p>
                    </div>

                    {/* KPI TOTALI */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:"1.5rem"}}>
                      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid ${BRAND.oro}`,padding:"1rem",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6,fontWeight:700}}>Fatturato periodo</div>
                        <div style={{fontSize:22,fontWeight:700,color:BRAND.oroD,fontFamily:"Georgia,serif"}}>€ {fmt(Math.round(totFatt))}</div>
                        <div style={{fontSize:11,marginTop:4}}>trend: {renderTrend(trendFatt)}</div>
                      </div>
                      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #2980B9`,padding:"1rem",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6,fontWeight:700}}>Acquisizioni</div>
                        <div style={{fontSize:22,fontWeight:700,color:"#2980B9",fontFamily:"Georgia,serif"}}>{totAcq}</div>
                        <div style={{fontSize:11,marginTop:4}}>trend: {renderTrend(trendAcq)}</div>
                      </div>
                      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #8E44AD`,padding:"1rem",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6,fontWeight:700}}>Azioni totali</div>
                        <div style={{fontSize:22,fontWeight:700,color:"#8E44AD",fontFamily:"Georgia,serif"}}>{totAzioni}</div>
                        <div style={{fontSize:11,color:"#888",marginTop:4}}>~ {Math.round(totAzioni/nMesi)} / mese</div>
                      </div>
                      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e8e5e0",borderTop:`3px solid #E67E22`,padding:"1rem",textAlign:"center"}}>
                        <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6,fontWeight:700}}>Ore lavorate</div>
                        <div style={{fontSize:22,fontWeight:700,color:"#E67E22",fontFamily:"Georgia,serif"}}>{totOre.toFixed(0)}<span style={{fontSize:14,marginLeft:2}}>h</span></div>
                        <div style={{fontSize:11,color:"#888",marginTop:4}}>~ {(totOre/nMesi).toFixed(1)}h / mese</div>
                      </div>
                    </div>

                    {/* GRAFICO BARRE FATTURATO MESE PER MESE */}
                    <div style={{background:"#fff",border:"1px solid #e8e5e0",borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:6}}>
                        <h3 style={{margin:0,fontSize:14,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>💰 Fatturato mese per mese</h3>
                        <p style={{margin:0,fontSize:11,color:"#888"}}>max: € {fmt(Math.round(maxFatt))}</p>
                      </div>
                      {maxFatt===0 ? (
                        <p style={{fontSize:12,color:"#aaa",fontStyle:"italic",textAlign:"center",padding:"1.5rem 0"}}>Nessun dato di fatturato nel periodo selezionato.</p>
                      ) : (
                        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:160,padding:"0 6px"}}>
                          {datiPerMese.map(m=>{
                            const h = maxFatt>0 ? (m.fatturato/maxFatt)*140 : 0;
                            const isVuoto = m.fatturato===0;
                            return(<div key={m.key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                              <div style={{fontSize:10,fontWeight:600,color:isVuoto?"#ccc":BRAND.oroD,height:14}}>{m.fatturato>0?`€${fmt(Math.round(m.fatturato/1000))}k`:""}</div>
                              <div style={{width:"100%",height:h,background:isVuoto?"#f0f0f0":`linear-gradient(180deg, ${BRAND.oro} 0%, ${BRAND.oroD} 100%)`,borderRadius:"4px 4px 0 0",minHeight:isVuoto?2:6,transition:"height .4s"}} title={`${m.label} ${m.anno}: € ${fmt(Math.round(m.fatturato))}`}/>
                              <div style={{fontSize:10,color:"#888",textTransform:"uppercase",fontWeight:600}}>{m.label}</div>
                              {m.label==="Gen"&&<div style={{fontSize:9,color:"#bbb"}}>{m.anno}</div>}
                            </div>);
                          })}
                        </div>
                      )}
                    </div>

                    {/* GRAFICO BARRE ACQUISIZIONI E AZIONI */}
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:"1.25rem"}}>
                      <div style={{background:"#fff",border:"1px solid #e8e5e0",borderRadius:10,padding:"1rem 1.25rem"}}>
                        <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🏠 Acquisizioni mese per mese</h3>
                        {maxAcq===0 ? (
                          <p style={{fontSize:12,color:"#aaa",fontStyle:"italic",textAlign:"center",padding:"1rem 0"}}>Nessuna acquisizione nel periodo.</p>
                        ) : (
                          <div style={{display:"flex",alignItems:"flex-end",gap:4,height:120}}>
                            {datiPerMese.map(m=>{
                              const h = maxAcq>0 ? (m.acquisizioni/maxAcq)*100 : 0;
                              const isVuoto = m.acquisizioni===0;
                              return(<div key={m.key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                                <div style={{fontSize:10,fontWeight:600,color:isVuoto?"#ccc":"#2980B9",height:12}}>{m.acquisizioni||""}</div>
                                <div style={{width:"100%",height:h,background:isVuoto?"#f0f0f0":"#2980B9",borderRadius:"3px 3px 0 0",minHeight:isVuoto?2:4}}/>
                                <div style={{fontSize:9,color:"#888",fontWeight:500}}>{m.label.charAt(0)}</div>
                              </div>);
                            })}
                          </div>
                        )}
                      </div>
                      <div style={{background:"#fff",border:"1px solid #e8e5e0",borderRadius:10,padding:"1rem 1.25rem"}}>
                        <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🎯 Azioni mese per mese</h3>
                        {maxAzioni===0 ? (
                          <p style={{fontSize:12,color:"#aaa",fontStyle:"italic",textAlign:"center",padding:"1rem 0"}}>Nessuna azione nel periodo.</p>
                        ) : (
                          <div style={{display:"flex",alignItems:"flex-end",gap:4,height:120}}>
                            {datiPerMese.map(m=>{
                              const h = maxAzioni>0 ? (m.azioni/maxAzioni)*100 : 0;
                              const isVuoto = m.azioni===0;
                              return(<div key={m.key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                                <div style={{fontSize:10,fontWeight:600,color:isVuoto?"#ccc":"#8E44AD",height:12}}>{m.azioni||""}</div>
                                <div style={{width:"100%",height:h,background:isVuoto?"#f0f0f0":"#8E44AD",borderRadius:"3px 3px 0 0",minHeight:isVuoto?2:4}}/>
                                <div style={{fontSize:9,color:"#888",fontWeight:500}}>{m.label.charAt(0)}</div>
                              </div>);
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CONFRONTO YoY */}
                    <div style={{background:"#fff",border:"1px solid #e8e5e0",borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
                      <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>📅 Confronto Year-over-Year</h3>
                      <p style={{margin:"0 0 12px",fontSize:11,color:"#888"}}>Stesso mese di quest'anno vs anno scorso</p>
                      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:12}}>
                        {[
                          {lbl:"Fatturato",valC:`€ ${fmt(Math.round(dCorr.fatturato))}`,valP:`€ ${fmt(Math.round(dPrec.fatturato))}`,yoy:yoyFatt,clr:BRAND.oroD},
                          {lbl:"Acquisizioni",valC:dCorr.acquisizioni,valP:dPrec.acquisizioni,yoy:yoyAcq,clr:"#2980B9"},
                          {lbl:"Azioni",valC:dCorr.azioni,valP:dPrec.azioni,yoy:yoyAzioni,clr:"#8E44AD"},
                        ].map(item=>(<div key={item.lbl} style={{background:"#FDFBF7",borderRadius:8,padding:"12px 14px"}}>
                          <p style={{margin:"0 0 8px",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>{item.lbl}</p>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
                            <div>
                              <p style={{margin:0,fontSize:18,fontWeight:700,color:item.clr,fontFamily:"Georgia,serif"}}>{item.valC}</p>
                              <p style={{margin:"2px 0 0",fontSize:10,color:"#888"}}>quest'anno · {meseCorr}</p>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <p style={{margin:0,fontSize:14,fontWeight:500,color:"#888"}}>{item.valP}</p>
                              <p style={{margin:"2px 0 0",fontSize:10,color:"#aaa"}}>anno scorso</p>
                            </div>
                          </div>
                          <div style={{marginTop:10,paddingTop:8,borderTop:"0.5px solid #e8e5e0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:11,color:"#888",fontWeight:500}}>variazione</span>
                            {renderTrend(item.yoy)}
                          </div>
                        </div>))}
                      </div>
                    </div>

                    {/* HEATMAP SETTIMANALE */}
                    {(()=>{
                      const dati = isAgg ? null : (oggiDati[agIdT]||{});
                      if(isAgg) return null;
                      // Costruisco una mappa data → intensità (% azioni completate)
                      const ggSetti = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
                      const mappa = {}; // {YYYY-MM-DD: perc}
                      Object.entries(dati||{}).forEach(([k,g])=>{
                        const az = g.azioni||{};
                        let f=0, t=0;
                        Object.values(az).forEach(v=>{ f+=Number(v.fatto||0); t+=Number(v.target||0); });
                        if(t>0) mappa[k] = Math.min(100, Math.round(f/t*100));
                        else if(f>0) mappa[k] = 50;
                      });
                      // Costruisco una griglia dell'ultimo periodo richiesto: settimane (colonne) × giorni (righe)
                      const giorni = nMesi*30; // approssimato
                      const inizio = new Date(oggi);
                      inizio.setDate(inizio.getDate()-giorni);
                      // Allineo a lunedì
                      const dayInizio = inizio.getDay();
                      const shiftToMon = dayInizio===0?-6:(1-dayInizio);
                      inizio.setDate(inizio.getDate()+shiftToMon);
                      // Costruisco le settimane
                      const settimane = [];
                      let cursore = new Date(inizio);
                      while(cursore<=oggi){
                        const settimana = [];
                        for(let d=0; d<7; d++){
                          const dd = new Date(cursore);
                          const k = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`;
                          settimana.push({k, perc: mappa[k]||0, isFut:dd>oggi, date:dd});
                          cursore.setDate(cursore.getDate()+1);
                        }
                        settimane.push(settimana);
                      }
                      const colorPerc = (p) => {
                        if(p===0) return "#f5f5f5";
                        if(p>=80) return "#27AE60";
                        if(p>=50) return BRAND.oro;
                        if(p>=25) return "#E67E22";
                        return "#E74C3C";
                      };
                      return(<div style={{background:"#fff",border:"1px solid #e8e5e0",borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:6}}>
                          <h3 style={{margin:0,fontSize:14,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🗓 Heatmap giornaliera</h3>
                          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:10,color:"#888"}}>
                            <span>0%</span>
                            {[10,30,55,80,100].map(p=><div key={p} style={{width:14,height:14,background:colorPerc(p),borderRadius:2}}/>)}
                            <span>100%</span>
                          </div>
                        </div>
                        <div style={{overflowX:"auto"}}>
                          <div style={{display:"flex",gap:2,minWidth:settimane.length*15}}>
                            <div style={{display:"flex",flexDirection:"column",gap:2,marginRight:4,fontSize:9,color:"#aaa",fontWeight:600}}>
                              {ggSetti.map(g=><div key={g} style={{height:11,display:"flex",alignItems:"center"}}>{g}</div>)}
                            </div>
                            {settimane.map((settim,i)=>(
                              <div key={i} style={{display:"flex",flexDirection:"column",gap:2}}>
                                {settim.map(d=>(<div key={d.k} title={`${d.k}: ${d.perc}%`} style={{width:11,height:11,background:d.isFut?"transparent":colorPerc(d.perc),borderRadius:2,border:d.isFut?"1px dashed #e0e0e0":"none"}}/>))}
                              </div>
                            ))}
                          </div>
                        </div>
                        <p style={{margin:"10px 0 0",fontSize:11,color:"#888",lineHeight:1.5}}>Ogni quadratino è un giorno. Più scuro/intenso = più obiettivi raggiunti. Aiuta a vedere se ci sono giorni della settimana in cui produci meno.</p>
                      </div>);
                    })()}

                  </>);
                })()}

                {/* ══════════════════════════════════════════════════════ */}
                {/* ── FUNNEL & CONVERSIONI ── */}
                {/* ══════════════════════════════════════════════════════ */}
                {statSubTab==="funnel"&&(()=>{
                  // === SELETTORI: agente + periodo ===
                  const brokerVedeSeStessoF = (isBroker||isBackOffice) && (statAgente==="Tutti"||statAgente===""||statAgente==="self"||statAgente===String(myAgentId));
                  const isAggF = (isBroker||isBackOffice) && statAgente==="team";
                  const agIdF = isAggF ? null :
                    (isBroker||isBackOffice)
                      ? (brokerVedeSeStessoF ? myAgentId : Number(statAgente))
                      : myAgentId;

                  // Periodo: "mese" / "trimestre" / "anno" / "tutto"
                  const oggi = new Date();
                  const oggiStr = `${oggi.getFullYear()}-${String(oggi.getMonth()+1).padStart(2,"0")}-${String(oggi.getDate()).padStart(2,"0")}`;
                  const inizioPeriodo = (()=>{
                    const d = new Date(oggi);
                    if(statFunnelPeriodo==="mese"){ d.setDate(1); }
                    else if(statFunnelPeriodo==="trimestre"){ d.setMonth(d.getMonth()-3); d.setDate(1); }
                    else if(statFunnelPeriodo==="anno"){ d.setFullYear(d.getFullYear(),0,1); }
                    else { return null; } // tutto
                    return d;
                  })();
                  const inizioStr = inizioPeriodo ? `${inizioPeriodo.getFullYear()}-${String(inizioPeriodo.getMonth()+1).padStart(2,"0")}-${String(inizioPeriodo.getDate()).padStart(2,"0")}` : null;

                  // === AGGREGAZIONE: somma azioni/conseguenze per ogni agente nel periodo ===
                  const aggregaAgenteFunnel = (agId) => {
                    const dati = oggiDati[agId]||{};
                    const aggr = {azioni:{}, conseg:{}};
                    Object.entries(dati).forEach(([k,g])=>{
                      if(inizioStr && k<inizioStr) return;
                      const az=g.azioni||{}, co=g.conseguenze||{};
                      Object.entries(az).forEach(([azId,v])=>{
                        aggr.azioni[azId] = (aggr.azioni[azId]||0)+Number(v.fatto||0);
                      });
                      Object.entries(co).forEach(([cId,v])=>{
                        aggr.conseg[cId] = (aggr.conseg[cId]||0)+Number(v||0);
                      });
                    });
                    return aggr;
                  };

                  const aggregaFunnel = (()=>{
                    if(isAggF){
                      const operativi = agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false);
                      const merged = {azioni:{}, conseg:{}};
                      operativi.forEach(ag=>{
                        const a = aggregaAgenteFunnel(ag.id);
                        Object.entries(a.azioni).forEach(([k,v])=>{ merged.azioni[k]=(merged.azioni[k]||0)+v; });
                        Object.entries(a.conseg).forEach(([k,v])=>{ merged.conseg[k]=(merged.conseg[k]||0)+v; });
                      });
                      return merged;
                    } else {
                      return aggregaAgenteFunnel(agIdF);
                    }
                  })();

                  // === Conta acquisizioni da incarichi e rogiti da venduti nel periodo ===
                  let acquisFunnel = 0;
                  let rogitiFunnel = 0;
                  let prelimFunnel = 0;
                  let visiteAcq = 0;
                  let proposteAccett = 0;
                  if(isAggF){
                    const operativi = agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=>a.id);
                    acquisFunnel = incarichi.filter(i=>operativi.includes(i.agenteListing)&&i.categoria==="vendita"&&!i.archiviato&&(!inizioStr||(i.dataInizio||"")>=inizioStr)).length;
                    rogitiFunnel = venduti.filter(v=>{
                      const dr = dataCompAgenzia(v);
                      if(inizioStr && (!dr||dr<inizioStr)) return false;
                      return v.stato==="Rogitata"||v.dataRogito;
                    }).length;
                  } else {
                    acquisFunnel = incarichi.filter(i=>i.agenteListing===agIdF&&i.categoria==="vendita"&&!i.archiviato&&(!inizioStr||(i.dataInizio||"")>=inizioStr)).length;
                    rogitiFunnel = venduti.filter(v=>{
                      const dr = dataCompAgenzia(v);
                      if(inizioStr && (!dr||dr<inizioStr)) return false;
                      return (v.agenteListing===agIdF||v.agenteAcquirente===agIdF) && (v.stato==="Rogitata"||v.dataRogito);
                    }).length;
                  }

                  // ====== FUNNEL ACQUISIZIONE (lato venditore) ======
                  // Catena: Chiamate proprietari → Appt acq fissati → Immobili visti → Presentazioni → Follow-up → Acquisizioni firmate
                  const fAcq = [
                    {id:"chiam_prop", lbl:"Chiamate proprietari", val:Number(aggregaFunnel.azioni.chiam_prop||0), icon:"📞", clr:"#2980B9", source:"azione"},
                    {id:"appt_acq_fissati", lbl:"Appt. acquisizione fissati", val:Number(aggregaFunnel.conseg.appt_acq_fissati||0), icon:"📅", clr:"#A8863A", source:"conseguenza"},
                    {id:"immobili_visti", lbl:"Immobili visti", val:Number(aggregaFunnel.conseg.immobili_visti||0), icon:"🏠", clr:"#A8863A", source:"conseguenza"},
                    {id:"presentazioni", lbl:"Presentazioni Val + PM", val:Number(aggregaFunnel.conseg.presentazioni||0), icon:"📊", clr:"#A8863A", source:"conseguenza"},
                    {id:"follow_val", lbl:"Follow-up post-valutazione", val:Number(aggregaFunnel.conseg.follow_val||0), icon:"🔄", clr:"#A8863A", source:"conseguenza"},
                    {id:"acquisizioni", lbl:"Acquisizioni firmate", val:acquisFunnel, icon:"✅", clr:"#27AE60", source:"sistema"},
                  ];

                  // ====== FUNNEL VENDITA (lato acquirente) ======
                  const fVend = [
                    {id:"incarichi_attivi", lbl:"Incarichi attivi nel periodo", val:acquisFunnel, icon:"📋", clr:"#2980B9", source:"sistema"},
                    {id:"appt_acq_clienti", lbl:"Appt. con acquirenti", val:Number(aggregaFunnel.conseg.appt_acq_clienti||0), icon:"🤝", clr:"#8E44AD", source:"conseguenza"},
                    {id:"oh_effettuati", lbl:"Visite Open House", val:Number(aggregaFunnel.conseg.oh_effettuati||0), icon:"🏠", clr:"#E74C3C", source:"conseguenza"},
                    {id:"proposte_pres", lbl:"Proposte presentate", val:Number(aggregaFunnel.conseg.proposte_pres||0), icon:"📄", clr:"#27AE60", source:"conseguenza"},
                    {id:"proposte_acc", lbl:"Proposte accettate", val:Number(aggregaFunnel.conseg.proposte_acc||0), icon:"✅", clr:"#27AE60", source:"conseguenza"},
                    {id:"preliminari", lbl:"Preliminari firmati", val:Number(aggregaFunnel.conseg.preliminari||0), icon:"✍️", clr:"#27AE60", source:"conseguenza"},
                    {id:"rogiti", lbl:"Rogiti", val:rogitiFunnel, icon:"🎉", clr:"#27AE60", source:"sistema"},
                  ];

                  // Helper: calcolo conversione
                  const calcConv = (curr, prev) => {
                    if(!prev||prev===0) return null;
                    return Math.round(curr/prev*100);
                  };
                  const clrConv = (p) => {
                    if(p===null) return "#bbb";
                    if(p>=70) return "#27AE60";
                    if(p>=40) return BRAND.oroD;
                    if(p>=20) return "#E67E22";
                    return "#E74C3C";
                  };

                  // ====== RENDER FUNNEL ======
                  const renderFunnel = (funnel, titolo, color) => {
                    const max = Math.max(...funnel.map(f=>f.val), 1);
                    return(<div style={{background:"#fff",border:"1px solid #e8e5e0",borderLeft:`4px solid ${color}`,borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
                      <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>{titolo}</h3>
                      {funnel.map((f,i)=>{
                        const width = max>0 ? Math.max(15, (f.val/max)*100) : 15;
                        const conv = i>0 ? calcConv(f.val, funnel[i-1].val) : null;
                        const clr = clrConv(conv);
                        return(<div key={f.id} style={{marginBottom:10}}>
                          {i>0 && (
                            <div style={{display:"flex",justifyContent:"center",margin:"4px 0"}}>
                              <div style={{fontSize:10,color:"#aaa",padding:"2px 8px",background:"#FDFBF7",borderRadius:10,border:`0.5px solid ${clr}33`,display:"flex",alignItems:"center",gap:4}}>
                                ↓ conversione: <strong style={{color:clr,fontSize:11}}>{conv!==null?`${conv}%`:"—"}</strong>
                              </div>
                            </div>
                          )}
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{minWidth:200,display:"flex",alignItems:"center",gap:8}}>
                              <span style={{fontSize:18}}>{f.icon}</span>
                              <span style={{fontSize:13,color:BRAND.grigio,fontWeight:600}}>{f.lbl}</span>
                            </div>
                            <div style={{flex:1,position:"relative",height:28,background:"#f5f5f5",borderRadius:6,overflow:"hidden"}}>
                              <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${width}%`,background:`linear-gradient(90deg, ${f.clr}, ${f.clr}DD)`,borderRadius:6,transition:"width .4s",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:10}}>
                                <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{f.val}</span>
                              </div>
                            </div>
                            {f.source==="azione" && <span style={{fontSize:9,color:"#888",padding:"2px 6px",background:"#EAF4FB",borderRadius:3,fontWeight:600}}>AZIONE</span>}
                            {f.source==="conseguenza" && <span style={{fontSize:9,color:"#888",padding:"2px 6px",background:"#FDFBF7",borderRadius:3,fontWeight:600}}>CONSEG.</span>}
                            {f.source==="sistema" && <span style={{fontSize:9,color:"#888",padding:"2px 6px",background:"#E1F5EE",borderRadius:3,fontWeight:600}}>DATI</span>}
                          </div>
                        </div>);
                      })}

                      {/* Conversione complessiva top→bottom */}
                      {funnel[0].val>0 && (()=>{
                        const top = funnel[0].val;
                        const bottom = funnel[funnel.length-1].val;
                        const convTot = calcConv(bottom, top);
                        return(<div style={{marginTop:14,paddingTop:12,borderTop:`1.5px solid ${color}33`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                          <span style={{fontSize:12,color:"#888",fontWeight:600}}>Conversione complessiva ({funnel[0].lbl.toLowerCase()} → {funnel[funnel.length-1].lbl.toLowerCase()}):</span>
                          <strong style={{fontSize:16,color:clrConv(convTot),fontWeight:700,fontFamily:"Georgia,serif"}}>{convTot!==null?`${convTot}%`:"—"}</strong>
                        </div>);
                      })()}
                    </div>);
                  };

                  // === TASSI CHIAVE per box riassuntivo ===
                  const tassiChiave = [];
                  if(fAcq[0].val>0 && fAcq[1].val>0){
                    tassiChiave.push({lbl:"Chiamate → Appt", val:Math.round(fAcq[1].val/fAcq[0].val*100), clr:"#2980B9"});
                  }
                  if(fAcq[3].val>0 && fAcq[5].val>0){
                    tassiChiave.push({lbl:"Presentazioni → Acquisizioni", val:Math.round(fAcq[5].val/fAcq[3].val*100), clr:"#A8863A"});
                  }
                  if(fVend[3].val>0 && fVend[4].val>0){
                    tassiChiave.push({lbl:"Proposte → Accettate", val:Math.round(fVend[4].val/fVend[3].val*100), clr:"#27AE60"});
                  }
                  if(fVend[5].val>0 && fVend[6].val>0){
                    tassiChiave.push({lbl:"Preliminari → Rogiti", val:Math.round(fVend[6].val/fVend[5].val*100), clr:"#27AE60"});
                  }

                  // Costo per acquisizione
                  const totAzionLista = ["chiam_prop","chiam_pass","chiam_infl","chiam_priv","chiam_freddo","chiam_zona","follow_notizie","follow_mirino","lettere"];
                  const totAzioniInvestite = totAzionLista.reduce((s,k)=>s+Number(aggregaFunnel.azioni[k]||0),0);
                  const costoPerAcq = acquisFunnel>0 ? Math.round(totAzioniInvestite/acquisFunnel) : null;

                  const agSelF = !isAggF ? agenti.find(a=>a.id===agIdF) : null;

                  return(<>
                    {/* SELETTORI */}
                    <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center",flexWrap:"wrap"}}>
                      <select style={S.sel} value={statFunnelPeriodo} onChange={e=>setStatFunnelPeriodo(e.target.value)}>
                        <option value="mese">📅 Mese corrente</option>
                        <option value="trimestre">📅 Ultimo trimestre</option>
                        <option value="anno">📅 Anno corrente</option>
                        <option value="tutto">📅 Tutto</option>
                      </select>
                      {(isBroker||isBackOffice)&&<select style={S.sel} value={isAggF?"team":(brokerVedeSeStessoF?"self":statAgente)} onChange={e=>setStatAgente(e.target.value)}>
                        <option value="self">🏠 I miei dati</option>
                        <option value="team">👥 Vista team aggregata</option>
                        <optgroup label="Singolo agente">
                          {agenti.filter(a=>["Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false&&a.id!==myAgentId).map(a=><option key={a.id} value={a.id}>👤 {a.nome} {a.cognome}</option>)}
                        </optgroup>
                      </select>}
                    </div>

                    {/* HEADER */}
                    <div style={{background:`linear-gradient(135deg, ${BRAND.oro}18 0%, ${BRAND.oro}08 100%)`,borderRadius:14,padding:"1.25rem 1.5rem",marginBottom:"1.25rem",border:`1.5px solid ${BRAND.oro}55`}}>
                      <p style={{fontSize:11,color:BRAND.oroD,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700}}>🔄 Funnel & Conversioni</p>
                      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>{isAggF?"Vista team aggregata":(agSelF?`${agSelF.nome} ${agSelF.cognome}`:"—")}</h2>
                      <p style={{fontSize:12,color:"#666",margin:"4px 0 0",fontWeight:500}}>Periodo: {statFunnelPeriodo==="mese"?"mese corrente":statFunnelPeriodo==="trimestre"?"ultimo trimestre":statFunnelPeriodo==="anno"?"anno corrente":"dati totali"}{inizioStr?` · dal ${inizioStr.split("-").reverse().join("/")}`:""}</p>
                    </div>

                    {/* TASSI CHIAVE */}
                    {tassiChiave.length>0&&<div style={{background:"#fff",border:"1px solid #e8e5e0",borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
                      <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>🎯 Tassi di conversione chiave</h3>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
                        {tassiChiave.map(t=>(<div key={t.lbl} style={{background:"#FDFBF7",borderRadius:8,padding:"12px 14px",borderLeft:`3px solid ${t.clr}`}}>
                          <p style={{margin:"0 0 4px",fontSize:11,color:"#888",fontWeight:600}}>{t.lbl}</p>
                          <p style={{margin:0,fontSize:24,fontWeight:800,color:t.clr,fontFamily:"Georgia,serif"}}>{t.val}%</p>
                        </div>))}
                        {costoPerAcq!==null&&<div style={{background:"#FDFBF7",borderRadius:8,padding:"12px 14px",borderLeft:`3px solid #E67E22`}}>
                          <p style={{margin:"0 0 4px",fontSize:11,color:"#888",fontWeight:600}}>Costo per acquisizione</p>
                          <p style={{margin:0,fontSize:24,fontWeight:800,color:"#E67E22",fontFamily:"Georgia,serif"}}>{costoPerAcq}</p>
                          <p style={{margin:"3px 0 0",fontSize:10,color:"#aaa"}}>azioni / acquisizione</p>
                        </div>}
                      </div>
                    </div>}

                    {/* FUNNEL ACQUISIZIONE */}
                    {renderFunnel(fAcq, "🎯 Funnel Acquisizione (lato venditore)", BRAND.oro)}

                    {/* FUNNEL VENDITA */}
                    {renderFunnel(fVend, "💼 Funnel Vendita (lato acquirente)", "#27AE60")}

                    {/* TABELLA CONVERSIONI PER AGENTE - solo broker, solo vista team */}
                    {(isBroker||isBackOffice)&&isAggF&&(()=>{
                      const operativi = agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false);
                      const righeAg = operativi.map(ag=>{
                        const a = aggregaAgenteFunnel(ag.id);
                        const chiam = Number(a.azioni.chiam_prop||0);
                        const appt = Number(a.conseg.appt_acq_fissati||0);
                        const pres = Number(a.conseg.presentazioni||0);
                        const acq = incarichi.filter(i=>i.agenteListing===ag.id&&i.categoria==="vendita"&&!i.archiviato&&(!inizioStr||(i.dataInizio||"")>=inizioStr)).length;
                        return {ag, chiam, appt, pres, acq, c1:calcConv(appt,chiam), c2:calcConv(pres,appt), c3:calcConv(acq,pres), cTot:calcConv(acq,chiam)};
                      });
                      return(<div style={{background:"#fff",border:"1px solid #e8e5e0",borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
                        <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>👥 Conversioni per agente</h3>
                        <div style={{overflowX:"auto"}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:600}}>
                            <thead><tr style={{background:"#FDFBF7"}}>
                              <th style={{padding:"8px 10px",fontSize:10,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"left",borderBottom:"1px solid #e8e5e0"}}>Agente</th>
                              <th style={{padding:"8px 10px",fontSize:10,fontWeight:700,color:"#666",textAlign:"right",borderBottom:"1px solid #e8e5e0"}}>📞 Chiam</th>
                              <th style={{padding:"8px 10px",fontSize:10,fontWeight:700,color:"#666",textAlign:"right",borderBottom:"1px solid #e8e5e0"}}>→ Appt</th>
                              <th style={{padding:"8px 10px",fontSize:10,fontWeight:700,color:"#666",textAlign:"right",borderBottom:"1px solid #e8e5e0"}}>→ Pres</th>
                              <th style={{padding:"8px 10px",fontSize:10,fontWeight:700,color:"#666",textAlign:"right",borderBottom:"1px solid #e8e5e0"}}>→ Acq</th>
                              <th style={{padding:"8px 10px",fontSize:10,fontWeight:700,color:"#666",textAlign:"right",borderBottom:"1px solid #e8e5e0"}}>Conv tot</th>
                            </tr></thead>
                            <tbody>
                              {righeAg.map(r=>(<tr key={r.ag.id}>
                                <td style={{padding:"8px 10px",fontSize:13,color:BRAND.grigio,fontWeight:500,borderBottom:"0.5px solid #f5f5f5"}}>{r.ag.nome} {r.ag.cognome}</td>
                                <td style={{padding:"8px 10px",fontSize:13,textAlign:"right",color:BRAND.grigio,borderBottom:"0.5px solid #f5f5f5"}}>{r.chiam||"—"}</td>
                                <td style={{padding:"8px 10px",fontSize:12,textAlign:"right",borderBottom:"0.5px solid #f5f5f5"}}>{r.appt||"—"} {r.c1!==null&&<small style={{color:clrConv(r.c1),fontWeight:600}}>({r.c1}%)</small>}</td>
                                <td style={{padding:"8px 10px",fontSize:12,textAlign:"right",borderBottom:"0.5px solid #f5f5f5"}}>{r.pres||"—"} {r.c2!==null&&<small style={{color:clrConv(r.c2),fontWeight:600}}>({r.c2}%)</small>}</td>
                                <td style={{padding:"8px 10px",fontSize:12,textAlign:"right",borderBottom:"0.5px solid #f5f5f5"}}>{r.acq||"—"} {r.c3!==null&&<small style={{color:clrConv(r.c3),fontWeight:600}}>({r.c3}%)</small>}</td>
                                <td style={{padding:"8px 10px",fontSize:13,textAlign:"right",fontWeight:700,color:clrConv(r.cTot),borderBottom:"0.5px solid #f5f5f5"}}>{r.cTot!==null?`${r.cTot}%`:"—"}</td>
                              </tr>))}
                            </tbody>
                          </table>
                        </div>
                        <p style={{margin:"10px 0 0",fontSize:11,color:"#888",lineHeight:1.5}}>Confronta i tassi di conversione tra agenti per identificare punti di forza e aree di coaching nei one-to-one.</p>
                      </div>);
                    })()}

                  </>);
                })()}

              </div>
            );
          })()}

          {/* IMPOSTAZIONI */}
          {tab==="Guida"&&(<div style={{...S.sec,padding:0,background:"var(--color-background-tertiary)"}}>
            <div style={{maxWidth:900,margin:"0 auto",padding:"1.5rem"}}>

              {/* HERO */}
              <div style={{background:"linear-gradient(135deg,#633806,#A8863A)",borderRadius:16,padding:"2rem 2.5rem",color:"#fff",marginBottom:"2rem"}}>
                <h1 style={{fontFamily:"Georgia,serif",fontSize:28,marginBottom:6,fontWeight:400}}>Manuale d'uso</h1>
                <p style={{fontSize:14,opacity:.85}}>Gestionale Càsa Immobiliare Varese · Guida completa per tutti i profili</p>
                <div style={{display:"flex",gap:8,marginTop:"1rem",flexWrap:"wrap"}}>
                  {["🏅 Broker","🏠 Agente","📋 Back Office","👁 Coach"].map(b=>(
                    <span key={b} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,.2)",color:"#fff"}}>{b}</span>
                  ))}
                </div>
              </div>

              {/* SEZIONI */}
              {[
                {id:"profili",icon:"👥",bg:"#FDF6EC",titolo:"Profili utente",sub:"Cosa può vedere e fare ogni profilo",contenuto:(<>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {[["🏅 Broker","#A8863A","Accesso completo a tutte le sezioni. Vede i dati di tutti gli agenti. Gestisce fatture, impostazioni, traguardi volanti e report.","Antonello Di Rita"],
                      ["🏠 Agente","#27AE60","Vede solo i propri dati. Inserisce operatività, incarichi, proposte. Ha accesso a War Room e Piano Produzione personale.","Luca · Riccardo · Fabio"],
                      ["📋 Back Office","#185FA5","Accesso simile al Broker. Si occupa principalmente della Gestione Pratiche RT. Non appare in report e classifiche.","Erica"],
                      ["👁 Coach","#533AB7","Modalità sola lettura. Vede tutti i dati ma non può modificare nulla. Banner blu visibile in ogni pagina.","Solo lettura"],
                    ].map(([titolo,clr,desc,chi])=>(
                      <div key={titolo} style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem",borderTop:`3px solid ${clr}`}}>
                        <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>{titolo}</div>
                        <p style={{fontSize:12,color:"#555",marginBottom:6}}>{desc}</p>
                        <span style={{fontSize:10,background:clr+"15",color:clr,padding:"2px 8px",borderRadius:10,fontWeight:600}}>{chi}</span>
                      </div>
                    ))}
                  </div>
                </>)},
                {id:"operativita",icon:"📅",bg:"#E6F1FB",titolo:"Operatività",sub:"Registrazione attività quotidiane e piano di produzione",contenuto:(<>
                  <p style={{fontSize:13,color:"#555",marginBottom:"1rem"}}>Sezione centrale per l'agente. Si divide in <strong>Attività</strong> e <strong>Piano Produzione</strong>.</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:"1rem"}}>
                    {[["📆 Settimana","Vista settimanale con box per ogni giorno. Mostra le attività inserite con icone colorate. Sotto i box appare l'Obiettivo del giorno con 8 card (Chiamate, Appuntamenti, Acquisizioni, Visitati, Ore ricerca, Social, Notizie, Volantini)."],
                      ["✏️ Inserimento","Inserisci le attività del giorno o della settimana (inserimento massivo Lun-Ven). Compila chiamate per tipo, attività immobili, sviluppo/social."],
                      ["📊 Report mensile","Riepilogo del mese: totale chiamate, appuntamenti, immobili visitati, OH. Tabella giorno per giorno."],
                      ["🎯 Obiettivi","Imposta obiettivi mensili e monitora il progresso con barre colorate."],
                    ].map(([t,d])=>(
                      <div key={t} style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                        <div style={{fontSize:13,fontWeight:600,marginBottom:5}}>{t}</div>
                        <p style={{fontSize:12,color:"#555",margin:0}}>{d}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#FDF6EC",borderLeft:"3px solid #A8863A",borderRadius:"0 8px 8px 0",padding:"10px 14px",fontSize:12,color:"#633806"}}>
                    <strong>🎯 Piano Produzione</strong><br/>Inserisci l'obiettivo fatturato annuale → il sistema calcola automaticamente transazioni necessarie, immobili da vendere, acquisizioni/mese, appuntamenti/settimana. Ratio: conv. acquisizioni 65%, conv. appuntamenti 40%, ogni immobile = 2 transazioni.
                  </div>
                </>)},
                {id:"incarichi",icon:"📋",bg:"#E1F5EE",titolo:"Incarichi",sub:"Gestione degli incarichi di vendita e affitto",contenuto:(<>
                  <p style={{fontSize:13,color:"#555",marginBottom:"1rem"}}>Mostra di default tutti gli incarichi <strong>Attivi</strong> di tutti gli anni. Usa i filtri per anno, mese, stato o agente.</p>
                  <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem",marginBottom:"1rem"}}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>➕ Creare un incarico</div>
                    {["Premi + Nuovo incarico in alto a destra","Compila: indirizzo, tipologia, prezzo, agente listing, data inizio/scadenza, fonte","Premi Salva"].map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:10,marginBottom:6,alignItems:"flex-start"}}>
                        <div style={{width:20,height:20,borderRadius:"50%",background:"#A8863A",color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                        <span style={{fontSize:12,color:"#555"}}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#FDF6EC",borderLeft:"3px solid #A8863A",borderRadius:"0 8px 8px 0",padding:"10px 14px",fontSize:12,color:"#633806"}}>
                    <strong>📋 Pratica RT</strong> — Da ogni incarico puoi aprire la pratica RT collegata con il bottone "📋 Apri pratica RT" nell'accordion.
                  </div>
                </>)},
                {id:"proposte",icon:"📝",bg:"#FEF3E2",titolo:"Proposte",sub:"Gestione delle proposte di acquisto",contenuto:(<>
                  <p style={{fontSize:13,color:"#555",marginBottom:"1rem"}}>Ogni proposta è collegata a un incarico. Lo stato evolve da "In attesa" fino ad "Accettata" o "Rifiutata".</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                    {[["🔵 In attesa","#4A90D9"],["🟡 Vincolata","#D4AC0D"],["🟠 Controproposta","#E67E22"],["🟢 Accettata","#27AE60"],["🔴 Rifiutata","#E74C3C"],["❌ Mancata chiusura","#922B21"]].map(([s,c])=>(
                      <div key={s} style={{background:"#fff",borderRadius:8,border:"0.5px solid #e8e5e0",padding:"8px 10px",borderTop:`2px solid ${c}`}}>
                        <div style={{fontSize:11,fontWeight:500,color:c}}>{s}</div>
                      </div>
                    ))}
                  </div>
                </>)},
                {id:"venduti",icon:"🏠",bg:"#E1F5EE",titolo:"Venduti",sub:"Rogiti conclusi e provvigioni",contenuto:(<>
                  <p style={{fontSize:13,color:"#555",marginBottom:"1rem"}}>Quando una proposta viene accettata, si crea un Venduto. Gestisci provvigioni e pagamenti.</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[["Provv. Venditore","Provvigione incassata lato venditore"],["Provv. Acquirente","Provvigione incassata lato acquirente"],["Data atto","Data rogito notarile"],["Stato pagamento","Da pagare / Parziale / Pagato"],["Competenza agenzia","Data contabile diversa (opzionale)"],["Agente acquirente","Se diverso dall'agente listing"]].map(([k,v])=>(
                      <div key={k} style={{background:"#fff",borderRadius:8,border:"0.5px solid #e8e5e0",padding:"8px 12px"}}>
                        <div style={{fontSize:11,fontWeight:600,color:"#2c2c2c"}}>{k}</div>
                        <div style={{fontSize:11,color:"#888"}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </>)},
                {id:"pratiche",icon:"📁",bg:"#EEEDFE",titolo:"Gestione Pratiche RT",sub:"Iter rogito per ogni vendita",contenuto:(<>
                  <p style={{fontSize:13,color:"#555",marginBottom:"1rem"}}>Traccia l'avanzamento burocratico dall'accettazione proposta al rogito. Principalmente gestita dal Back Office.</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:"1rem"}}>
                    <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:5}}>Vista Lista</div>
                      <p style={{fontSize:12,color:"#555",margin:0}}>Tabella con barra avanzamento %, fase attuale, prossima azione, alert colorati a sinistra.</p>
                    </div>
                    <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:5}}>Vista Kanban</div>
                      <p style={{fontSize:12,color:"#555",margin:0}}>4 colonne per macro-fase: Apertura → Istruttoria → Chiusura → Rogito.</p>
                    </div>
                  </div>
                  <div style={{background:"#FDF6EC",borderLeft:"3px solid #A8863A",borderRadius:"0 8px 8px 0",padding:"10px 14px",fontSize:12,color:"#633806"}}>
                    <strong>⚙ Personalizzazione</strong> — In Impostazioni → "Fasi & Azioni" puoi aggiungere, modificare e riordinare le azioni di ogni fase.
                  </div>
                </>)},
                {id:"warroom",icon:"🏆",bg:"#FDF6EC",titolo:"War Room",sub:"Centro di comando — performance team",contenuto:(<>
                  <p style={{fontSize:13,color:"#555",marginBottom:"1rem"}}>Si divide in <strong>📊 Performance</strong> e <strong>🏆 Traguardo Volante</strong>.</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:"1rem"}}>
                    <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:5}}>📊 Performance</div>
                      <p style={{fontSize:12,color:"#555",margin:0}}>KPI team, tabella attività di processo per agente, risultati finali, fonti incarichi.</p>
                    </div>
                    <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:5}}>🏆 Traguardo Volante</div>
                      <p style={{fontSize:12,color:"#555",margin:0}}>Sfide a tempo con classifica e podio. Crea sfide con nome, metrica, periodo e premio.</p>
                    </div>
                    <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:5}}>📺 Modalità Riunione</div>
                      <p style={{fontSize:12,color:"#555",margin:0}}>Vista fullscreen su sfondo scuro — ideale per proiettare in riunione di team.</p>
                    </div>
                    <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:5}}>🔒 Oscura €</div>
                      <p style={{fontSize:12,color:"#555",margin:0}}>Nasconde tutti i valori monetari — utile quando lo schermo è visibile a clienti.</p>
                    </div>
                  </div>
                </>)},
                {id:"impostazioni",icon:"⚙️",bg:"#fafaf8",titolo:"Impostazioni",sub:"Solo Broker — configurazione globale",contenuto:(<>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:5}}>⚙ Generali</div>
                      <p style={{fontSize:12,color:"#555",margin:0}}>Obiettivo fatturato annuale team, quota agenzia (%) trattenuta sulle provvigioni.</p>
                    </div>
                    <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:5}}>📋 Fasi & Azioni</div>
                      <p style={{fontSize:12,color:"#555",margin:0}}>Personalizza le fasi Gestione Pratiche: aggiungi, modifica, riordina azioni. Bottone ↺ Default per ripristinare.</p>
                    </div>
                  </div>
                </>)},
              ].map(({id,icon,bg,titolo,sub,contenuto})=>(
                <div key={id} style={{marginBottom:"2rem"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:"1rem",paddingBottom:".75rem",borderBottom:"2px solid #e8e5e0"}}>
                    <div style={{width:40,height:40,borderRadius:10,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{icon}</div>
                    <div>
                      <div style={{fontSize:18,fontWeight:600,color:"#633806",fontFamily:"Georgia,serif"}}>{titolo}</div>
                      <div style={{fontSize:12,color:"#888"}}>{sub}</div>
                    </div>
                  </div>
                  {contenuto}
                </div>
              ))}

              <div style={{background:"#FDF6EC",borderLeft:"3px solid #A8863A",borderRadius:"0 8px 8px 0",padding:"12px 16px",marginTop:"2rem"}}>
                <div style={{fontSize:13,fontWeight:600,color:"#633806",marginBottom:3}}>📞 Supporto</div>
                <div style={{fontSize:12,color:"#854F0B"}}>Per assistenza tecnica sull'applicazione contattare il team di sviluppo. Per problemi di accesso rivolgersi al Broker.</div>
              </div>
              <p style={{textAlign:"center",color:"#aaa",fontSize:11,marginTop:"1.5rem"}}>Gestionale Càsa Immobiliare Varese · v1.0 · Maggio 2026</p>
            </div>
          </div>)}

          {tab==="Impostazioni"&&(<div style={S.sec}>
            <div style={{display:"flex",borderBottom:"1px solid #eee",marginBottom:"1.5rem"}}>{[["generale","⚙ Generali"],["fasi","📋 Fasi & Azioni"],["costi","💰 Categorie Costi"]].map(([v,l])=>(<button key={v} onClick={()=>setImpSezione(v)} style={{padding:"8px 18px",fontSize:13,cursor:"pointer",border:"none",background:"none",borderBottom:`2px solid ${impSezione===v?"#A8863A":"transparent"}`,color:impSezione===v?"#A8863A":"#666",fontWeight:impSezione===v?600:400,fontFamily:"inherit",marginBottom:-1}}>{l}</button>))}</div>

            {impSezione==="costi"&&(isBroker||isBackOffice)&&(()=>{
              const annoNum=Number(impCostiAnno);
              const catAnno=catCosti.filter(c=>c.anno===annoNum);
              const catFisse=catAnno.filter(c=>c.tipo==="fisso");
              const catVar=catAnno.filter(c=>c.tipo==="variabile");
              const totFissi=catFisse.reduce((s,c)=>s+Number(c.totaleAnno||0),0);
              const totVar=catVar.reduce((s,c)=>s+Number(c.totaleAnno||0),0);
              const anniDisp=[...new Set(catCosti.map(c=>c.anno))].sort((a,b)=>b-a);
              const annoCorrente2=new Date().getFullYear();
              const copiaAnnoSucc=()=>{
                const nextAnno=annoNum+1;
                const existing=catCosti.filter(c=>c.anno===nextAnno);
                if(existing.length>0){if(!window.confirm(`Esistono già ${existing.length} categorie per ${nextAnno}. Sovrascrivere?`))return;}
                const nuove=catAnno.map(c=>({...c,id:c.id+"_"+nextAnno,anno:nextAnno}));
                setCatCosti(prev=>[...prev.filter(c=>c.anno!==nextAnno),...nuove]);
                setImpCostiAnno(String(nextAnno));
              };
              const updCat=(id,campo,val)=>setCatCosti(prev=>prev.map(c=>c.id===id?{...c,[campo]:val}:c));
              const delCat=(id)=>{if(window.confirm("Eliminare questa categoria?"))setCatCosti(prev=>prev.filter(c=>c.id!==id));};
              const addCat=()=>{
                if(!formNuovaCat?.nome?.trim())return;
                const newId="lx_"+Date.now();
                setCatCosti(prev=>[...prev,{id:newId,nome:formNuovaCat.nome,totaleAnno:Number(formNuovaCat.totale||0),tipo:formNuovaCat.tipo||"fisso",anno:annoNum}]);
                setFormNuovaCat(null);
              };
              const renderCatList=(cats,tipo)=>(
                <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{padding:"10px 16px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",gap:8,background:tipo==="fisso"?"#E6F1FB22":"#EEEDFE22"}}>
                    <div style={{width:4,height:16,borderRadius:2,background:tipo==="fisso"?"#185FA5":"#533AB7"}}/>
                    <span style={{fontSize:12,fontWeight:700,color:tipo==="fisso"?"#185FA5":"#533AB7",textTransform:"uppercase",letterSpacing:".08em"}}>
                      {tipo==="fisso"?"📌 Costi Fissi":"📊 Costi Variabili"}
                    </span>
                    <span style={{fontSize:11,color:"#aaa",marginLeft:"auto"}}>
                      Totale previsionale: <strong>€ {fmt(tipo==="fisso"?totFissi:totVar)}</strong>
                    </span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 130px 110px 40px",gap:0,padding:"7px 14px",background:"#fafal8",borderBottom:"1px solid #eee"}}>
                    {["Categoria","Totale annuo","Stima/mese",""].map((h,i)=>(
                      <div key={i} style={{fontSize:10,fontWeight:600,color:"#888",textAlign:i===1||i===2?"right":"left"}}>{h}</div>
                    ))}
                  </div>
                  {cats.map(cat=>(
                    <div key={cat.id} style={{display:"grid",gridTemplateColumns:"1fr 130px 110px 40px",gap:0,padding:"9px 14px",borderBottom:"0.5px solid #f5f5f5",alignItems:"center"}}>
                      {catCostiEditId===cat.id
                        ?<input autoFocus style={{...S.inp,margin:0,fontSize:12}} value={cat.nome} onChange={e=>updCat(cat.id,"nome",e.target.value)} onBlur={()=>setCatCostiEditId(null)}/>
                        :<div style={{fontSize:13,fontWeight:500,cursor:"pointer"}} onDoubleClick={()=>setCatCostiEditId(cat.id)}>{cat.nome}</div>
                      }
                      <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end"}}>
                        <span style={{fontSize:12,color:"#888"}}>€</span>
                        <input type="number" min="0" style={{width:90,textAlign:"right",fontSize:13,fontWeight:600,border:"0.5px solid #e8e5e0",borderRadius:5,padding:"3px 6px",fontFamily:"inherit",color:tipo==="fisso"?"#185FA5":"#533AB7"}}
                          value={cat.totaleAnno||""} placeholder="0"
                          onChange={e=>updCat(cat.id,"totaleAnno",Number(e.target.value))}/>
                      </div>
                      <div style={{fontSize:12,color:"#aaa",textAlign:"right"}}>~ € {fmt(Math.round(Number(cat.totaleAnno||0)/12))}</div>
                      <button onClick={()=>delCat(cat.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:15,color:"#ddd",padding:"0 4px"}} title="Elimina">🗑</button>
                    </div>
                  ))}
                  {cats.length===0&&<div style={{padding:"1.5rem",textAlign:"center",color:"#bbb",fontSize:12,fontStyle:"italic"}}>Nessuna categoria {tipo}. Aggiungi con il bottone in basso.</div>}
                </div>
              );
              return(<div>
                {/* Header anno + azioni */}
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.5rem",flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:12,color:"#888"}}>Anno:</span>
                    <div style={{display:"flex",background:"#f0f0f0",borderRadius:7,padding:3,gap:2}}>
                      {(anniDisp.length>0?anniDisp:[2025,2026]).map(a=>(
                        <button key={a} onClick={()=>setImpCostiAnno(String(a))} style={{padding:"4px 12px",fontSize:11,borderRadius:5,border:"none",background:impCostiAnno===String(a)?"#fff":"transparent",color:impCostiAnno===String(a)?"#A8863A":"#888",fontWeight:impCostiAnno===String(a)?600:400,cursor:"pointer",fontFamily:"inherit",boxShadow:impCostiAnno===String(a)?"0 1px 3px rgba(0,0,0,.1)":"none"}}>{a}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={copiaAnnoSucc} style={{...S.btn,fontSize:11,background:"#E1F5EE",border:"0.5px solid #27AE60",color:"#085041"}}>
                    📥 Usa {annoNum} come base {annoNum+1}
                  </button>
                  <button onClick={()=>setFormNuovaCat({nome:"",totale:"",tipo:"fisso"})} style={{...S.btnP,fontSize:11,padding:"5px 14px",marginLeft:"auto"}}>
                    + Nuova categoria
                  </button>
                </div>

                {/* Totale generale */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:"1.5rem"}}>
                  {[["📌 Totale fissi",totFissi,"#185FA5"],["📊 Totale variabili",totVar,"#533AB7"],["💰 Totale generale",totFissi+totVar,"#633806"]].map(([lbl,val,clr])=>(
                    <div key={lbl} style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem",textAlign:"center",borderTop:`3px solid ${clr}`}}>
                      <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>{lbl}</div>
                      <div style={{fontSize:22,fontWeight:700,color:clr}}>€ {fmt(Math.round(val))}</div>
                      <div style={{fontSize:10,color:"#aaa",marginTop:4}}>~ € {fmt(Math.round(val/12))} / mese</div>
                    </div>
                  ))}
                </div>

                {/* Form nuova categoria */}
                {formNuovaCat&&<div style={{background:"#fff",borderRadius:10,border:"0.5px solid #A8863A",padding:"1rem",marginBottom:"1.25rem"}}>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:10,color:"#633806"}}>+ Nuova categoria — anno {annoNum}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 140px 120px auto",gap:10,alignItems:"flex-end"}}>
                    <div>
                      <label style={S.lbl}>Nome categoria</label>
                      <input style={S.inp} value={formNuovaCat.nome} placeholder="es. Assicurazione Professionale" onChange={e=>setFormNuovaCat({...formNuovaCat,nome:e.target.value})} onKeyDown={e=>e.key==="Enter"&&addCat()}/>
                    </div>
                    <div>
                      <label style={S.lbl}>Totale annuo (€)</label>
                      <input type="number" style={S.inp} value={formNuovaCat.totale} placeholder="0" onChange={e=>setFormNuovaCat({...formNuovaCat,totale:e.target.value})}/>
                    </div>
                    <div>
                      <label style={S.lbl}>Tipo</label>
                      <select style={S.inp} value={formNuovaCat.tipo} onChange={e=>setFormNuovaCat({...formNuovaCat,tipo:e.target.value})}>
                        <option value="fisso">Fisso</option>
                        <option value="variabile">Variabile</option>
                      </select>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={addCat} style={{...S.btnP,padding:"7px 14px",fontSize:12}}>Aggiungi</button>
                      <button onClick={()=>setFormNuovaCat(null)} style={{...S.btn,padding:"7px 10px",fontSize:12}}>✕</button>
                    </div>
                  </div>
                </div>}

                {renderCatList(catFisse,"fisso")}
                {renderCatList(catVar,"variabile")}
                <div style={{background:"#FDF6EC",borderLeft:"3px solid #A8863A",borderRadius:"0 8px 8px 0",padding:"10px 14px",fontSize:12,color:"#633806"}}>
                  <strong>💡 Come funziona</strong> — Modifica i totali annui in questa pagina. Usa "📥 Usa {annoNum} come base {annoNum+1}" per copiare il previsionale nell\'anno successivo. Le spese reali le inserisci nel tab Costi.
                </div>
              </div>);
            })()}
            {impSezione==="fasi"&&isBroker&&(()=>{const fasi=fasiConfig||FASI;const RUOLI=["agente","erica","broker","entrambi","tutti"];const RLB={agente:"Agente",erica:"Erica RT",broker:"Broker",entrambi:"Ag+Erica",tutti:"Tutti"};const fi=Math.min(impFaseSel,fasi.length-1);const fo=fasi[fi]||fasi[0];const updAz=(ai,upd)=>setFasiConfig(fasi.map((f,i)=>i!==fi?f:{...f,azioni:f.azioni.map((a,j)=>j!==ai?a:{...a,...upd})}));const delAz=(ai)=>setFasiConfig(fasi.map((f,i)=>i!==fi?f:{...f,azioni:f.azioni.filter((_,j)=>j!==ai)}));const mvAz=(ai,d)=>{const nf=fasi.map((f,i)=>{if(i!==fi)return f;const az=[...f.azioni];[az[ai],az[ai+d]]=[az[ai+d],az[ai]];return{...f,azioni:az};});setFasiConfig(nf);};const addAz=()=>{if(!formNuovaAzione.lbl.trim())return;setFasiConfig(fasi.map((f,i)=>i!==fi?f:{...f,azioni:[...f.azioni,{k:"az_"+Date.now(),...formNuovaAzione}]}));setFormNuovaAzione({lbl:"",ruolo:"agente",alert:false});};return(<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:12,color:"#888"}}>{fasi.length} fasi · {fasi.reduce((s,f)=>s+f.azioni.length,0)} azioni</span>{fasiConfig&&<button style={{...S.btn,fontSize:11,color:"#E74C3C"}} onClick={()=>{if(window.confirm("Ripristinare default?"))setFasiConfig(null);}}>↺ Default</button>}</div><div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>{fasi.map((f,i)=>(
                  <span key={f.k||i} style={{display:"inline-flex",alignItems:"center",gap:2,marginBottom:4}}>
                    <button onClick={()=>setImpFaseSel(i)} style={{padding:"4px 10px",fontSize:11,borderRadius:16,border:`0.5px solid ${fi===i?"#A8863A":"#ddd"}`,background:fi===i?"#FEF9E7":"#fff",color:fi===i?"#A8863A":"#888",cursor:"pointer",fontFamily:"inherit",fontWeight:fi===i?500:400}}>{i+1}. {f.n}</button>
                    {fi===i&&<>
                      <button title="Rinomina" style={{border:"0.5px solid #ddd",borderRadius:5,background:"#fff",cursor:"pointer",fontSize:10,padding:"2px 5px"}} onClick={()=>{const nn=window.prompt("Nuovo nome:",f.n);if(nn?.trim())setFasiConfig(fasi.map((x,j)=>j===i?{...x,n:nn.trim()}:x));}}>✏️</button>
                      {fasi.length>1&&<button title="Elimina" style={{border:"0.5px solid #FDECEC",borderRadius:5,background:"#FDECEC",cursor:"pointer",fontSize:10,padding:"2px 5px",color:"#A32D2D"}} onClick={()=>{if(window.confirm(`Eliminare "${f.n}"?`)){setFasiConfig(fasi.filter((_,j)=>j!==i));setImpFaseSel(Math.max(0,i-1));}}}>🗑</button>}
                    </>}
                  </span>
                ))}
                <button style={{fontSize:12,fontWeight:600,padding:"6px 16px",borderRadius:8,border:"none",background:"#A8863A",color:"#fff",cursor:"pointer",fontFamily:"inherit",marginLeft:4}} onClick={()=>{const nn=window.prompt("Nome nuova fase:");if(nn?.trim()){setFasiConfig([...fasi,{k:"f_"+Date.now(),n:nn.trim(),azioni:[]}]);setImpFaseSel(fasi.length);}}}> + Nuova fase</button></div><div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:10}}><div style={{background:"#fafaf8",padding:"8px 14px",borderBottom:"0.5px solid #e8e5e0",display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:13,fontWeight:600}}>{fo.n}</span><span style={{fontSize:11,color:"#aaa"}}>{fo.timing}</span><span style={{fontSize:11,color:"#888",marginLeft:"auto"}}>{fo.azioni.length} azioni</span></div>{fo.azioni.map((az,ai)=>(<div key={az.k} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderBottom:"0.5px solid #f5f5f5"}}><div style={{display:"flex",gap:1}}><button style={{...S.btn,padding:"1px 4px",fontSize:10,opacity:ai===0?0.3:1}} disabled={ai===0} onClick={()=>mvAz(ai,-1)}>▲</button><button style={{...S.btn,padding:"1px 4px",fontSize:10,opacity:ai===fo.azioni.length-1?0.3:1}} disabled={ai===fo.azioni.length-1} onClick={()=>mvAz(ai,1)}>▼</button></div><input style={{...S.inp,margin:0,flex:1,fontSize:12}} key={`az_${fi}_${ai}`} defaultValue={az.lbl} onBlur={e=>{if(e.target.value.trim())updAz(ai,{lbl:e.target.value.trim()});}}/><select style={{...S.sel,fontSize:11,padding:"4px 6px"}} value={az.ruolo||"agente"} onChange={e=>updAz(ai,{ruolo:e.target.value})}>{RUOLI.map(r=><option key={r} value={r}>{RLB[r]}</option>)}</select><label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#E74C3C",cursor:"pointer",whiteSpace:"nowrap"}}><input type="checkbox" checked={az.alert||false} onChange={e=>updAz(ai,{alert:e.target.checked})}/> Alert</label><button style={{...S.btnD,padding:"2px 6px",fontSize:11}} onClick={()=>delAz(ai)}>✕</button></div>))}<div style={{padding:"8px 14px",background:"#fafaf8",borderTop:"0.5px solid #e8e5e0",display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><input style={{...S.inp,margin:0,flex:2,minWidth:140,fontSize:12}} value={formNuovaAzione.lbl} placeholder="+ Nuova azione..." onChange={e=>setFormNuovaAzione({...formNuovaAzione,lbl:e.target.value})} onKeyDown={e=>e.key==="Enter"&&addAz()}/><select style={{...S.sel,fontSize:11}} value={formNuovaAzione.ruolo} onChange={e=>setFormNuovaAzione({...formNuovaAzione,ruolo:e.target.value})}>{RUOLI.map(r=><option key={r} value={r}>{RLB[r]}</option>)}</select><label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,cursor:"pointer"}}><input type="checkbox" checked={formNuovaAzione.alert||false} onChange={e=>setFormNuovaAzione({...formNuovaAzione,alert:e.target.checked})}/> Alert</label><button style={{...S.btnP,fontSize:12,padding:"5px 12px"}} onClick={addAz}>+ Aggiungi</button></div></div></div>);})()}
            {impSezione==="generale"&&<div>
            {/* PARAMETRI PROVVIGIONI STANDARD */}
            <h3 style={{fontSize:14,fontWeight:600,margin:"0 0 4px",color:BRAND.grigio}}>Parametri provvigioni standard</h3>
            <p style={{fontSize:12,color:"#aaa",margin:"0 0 12px"}}>Usati per calcolare lo "sconto" nella sezione Statistiche. Le provvigioni sotto soglia usano i minimi fissi invece della percentuale.</p>
            <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"16px 20px",marginBottom:"1rem"}}>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(5,1fr)",gap:12}}>
                <div>
                  <label style={S.lbl}>% Standard Venditore</label>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <input style={S.inp} type="number" step="0.1" min="0" max="10" value={provvStandard.percVend} onChange={e=>setProvvStandard({...provvStandard,percVend:Number(e.target.value)})}/>
                    <span style={{fontSize:12,color:"#888",flexShrink:0}}>%</span>
                  </div>
                </div>
                <div>
                  <label style={S.lbl}>% Standard Acquirente</label>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <input style={S.inp} type="number" step="0.1" min="0" max="10" value={provvStandard.percAcq} onChange={e=>setProvvStandard({...provvStandard,percAcq:Number(e.target.value)})}/>
                    <span style={{fontSize:12,color:"#888",flexShrink:0}}>%</span>
                  </div>
                </div>
                <div>
                  <label style={S.lbl}>Soglia prezzo (EUR)</label>
                  <input style={S.inp} type="number" step="1000" min="0" value={provvStandard.soglia} onChange={e=>setProvvStandard({...provvStandard,soglia:Number(e.target.value)})}/>
                </div>
                <div>
                  <label style={S.lbl}>Min. Venditore sotto soglia (€)</label>
                  <input style={S.inp} type="number" step="100" min="0" value={provvStandard.minVend} onChange={e=>setProvvStandard({...provvStandard,minVend:Number(e.target.value)})}/>
                </div>
                <div>
                  <label style={S.lbl}>Min. Acquirente sotto soglia (€)</label>
                  <input style={S.inp} type="number" step="100" min="0" value={provvStandard.minAcq} onChange={e=>setProvvStandard({...provvStandard,minAcq:Number(e.target.value)})}/>
                </div>
              </div>
              <div style={{marginTop:12,padding:"10px 12px",background:BRAND.beige,borderRadius:8,fontSize:12,color:"#666"}}>
                <strong style={{color:BRAND.oroD}}>Come funziona:</strong> se il prezzo &lt; € {fmtN(provvStandard.soglia)}, lo standard è max(% × prezzo, minimo fisso). Altrimenti solo la percentuale.
                Esempio sotto soglia: Venditore = max({provvStandard.percVend}% × prezzo, € {fmtN(provvStandard.minVend)}) · Acquirente = max({provvStandard.percAcq}% × prezzo, € {fmtN(provvStandard.minAcq)})
              </div>
            </div>
            <div style={S.divider}/>
            <SettSec title="Fonti incarico" items={fonti} setItems={setFonti} ph="Nuova fonte..."/>
            <div style={S.divider}/>
            <SettSec title="Tipi volantino / lettera" items={tipiVolantino} setItems={setTipiVolantino} ph="Nuovo tipo..."/>
            <div style={S.divider}/>
            <SettSec title="Tipi attività sviluppo" items={tipiSviluppo} setItems={setTipiSviluppo} ph="Nuova attività..."/>
            <div style={S.divider}/>
            <SettSec title="Tipologie immobile" items={tipologie} setItems={setTipologie} ph="Nuova tipologia..."/>
            <div style={S.divider}/>
            <SettSec title="Tipi di vincolo" items={vincoli} setItems={setVincoli} ph="Nuovo vincolo..."/>
            <div style={S.divider}/>
            <SettSec title="Tipi diniego vincolo" items={tipiNeg} setItems={setTipiNeg} ph="Nuovo tipo diniego..."/>
            <div style={S.divider}/>
            <h3 style={{fontSize:14,fontWeight:500,margin:"0 0 8px"}}>Backup dati</h3>
            <p style={{fontSize:12,color:"#aaa",margin:"0 0 10px"}}>I dati vengono salvati automaticamente nel browser. Usa Esporta/Importa per backup esterni o per condividere i dati tra dispositivi.</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button style={S.btnP} onClick={esporta}>⬇ Esporta JSON</button>
              <button style={S.btn} onClick={()=>importRef.current.click()}>⬆ Importa JSON</button>
              <button style={{...S.btnD,marginLeft:"auto"}} onClick={()=>{if(window.confirm("Attenzione: questa operazione cancella TUTTI i dati dal browser e ripristina i dati di esempio. Sei sicuro?")){{localStorage.removeItem(LS_KEY);window.location.reload();}}}}>🗑 Azzera tutti i dati</button>
            </div>
            </div>}
          </div>)}

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
            <div><label style={S.lbl}>Agente Listing</label><select style={S.inp} value={formInc.agenteListing||""} onChange={e=>setFormInc({...formInc,agenteListing:e.target.value})}><option value="">Seleziona</option>{agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
            <div><label style={S.lbl}>% Provv. Listing</label><input style={S.inp} type="number" step="0.1" value={formInc.percListing||""} onChange={e=>setFormInc({...formInc,percListing:e.target.value})}/></div>
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
            <div><label style={S.lbl}>% Provvigione</label><input style={S.inp} type="number" step="0.1" placeholder="es. 3" value={formInc.percProvv||""} onChange={e=>{const perc=Number(e.target.value);const prezzo=Number(formInc.prezzoRichiesto||0);setFormInc({...formInc,percProvv:e.target.value,provvPrevista:prezzo>0?Math.round(prezzo*perc/100):formInc.provvPrevista});}}/></div>
            <div><label style={S.lbl}>Provvigione prevista (EUR) — calcolata o manuale</label><div style={{position:"relative"}}><input style={S.inp} type="number" value={formInc.provvPrevista||""} onChange={e=>setFormInc({...formInc,provvPrevista:e.target.value,percProvv:""})} placeholder="Calcolata automaticamente dalla %"/>{formInc.provvPrevista>0&&<span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:BRAND.oroD,pointerEvents:"none",background:"#fff",paddingLeft:4}}>= € {fmtN(formInc.provvPrevista)}</span>}</div></div>
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
            <div><label style={S.lbl}>Agente Acquirente</label><select style={S.inp} value={formProp.agenteAcquirente||""} onChange={e=>setFormProp({...formProp,agenteAcquirente:e.target.value})}><option value="">Seleziona</option>{agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
            <div><label style={S.lbl}>% Provv. Agente Acquirente</label><input style={S.inp} type="number" step="0.1" placeholder="es. 40" value={formProp.percAcquirente||""} onChange={e=>setFormProp({...formProp,percAcquirente:e.target.value})}/></div>
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
              </select>
            </div>
            {formStatoProp.esitoVincolo==="Positivo"&&(
              <div style={{marginBottom:10}}>
                <label style={S.lbl}>Data esito vincolo positivo</label>
                <input style={{...S.inp,maxWidth:200}} type="date" value={formStatoProp.dataEsitoVincolo||""} onChange={e=>setFormStatoProp({...formStatoProp,dataEsitoVincolo:e.target.value})}/>
              </div>
            )}
            <p style={{fontSize:11,color:"#aaa",margin:"8px 0 0"}}>In caso di esito negativo, gestire manualmente cambiando lo stato in Rifiutata o Mancata Chiusura.</p>
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
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1.25rem"}}><button style={S.btn} onClick={()=>setShowAgente(null)}>Annulla</button><button style={S.btnP} onClick={()=>{if(!formAgente.nome||!formAgente.cognome)return;if(showAgente==="new")setAgenti([...agenti,{...formAgente,id:Date.now(),attivo:formAgente.attivo!==false,inReport:["Broker","Consulente","Collaboratore"].includes(formAgente.profilo||"Consulente")?formAgente.inReport!==false:false}]);else setAgenti(agenti.map(a=>a.id===showAgente.id?{...formAgente,id:a.id,inReport:["Broker","Consulente","Collaboratore"].includes(formAgente.profilo||"Consulente")?formAgente.inReport!==false:false}:a));setShowAgente(null);}}>Salva</button></div>
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

    </div>
  );
}
