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

const BRAND = {oro:"#C9A96E",oroD:"#A8863A",grigio:"#4A4A4A",beige:"#F2F0EB"};
const MESI_NOMI = ["","Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const TAB_CONFIG = [
  { id:"Dashboard",       icon:"⊞",  label:"Dashboard" },
  { id:"Operatività",     icon:"📅", label:"Operatività" },
  { id:"Gestione Pratiche", icon:"📁", label:"Gestione Pratiche" },
  { id:"Incarichi",       icon:"📋", label:"Incarichi" },
  { id:"Proposte",        icon:"📝", label:"Proposte" },
  { id:"Venduti",         icon:"🏠", label:"Venduti" },
  { id:"Il mio report",   icon:"📊", label:"Il mio report" },
  { id:"Report Agenti",   icon:"📊", label:"Report Agenti" },
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

const STATI_INC = { Attivo:{clr:"#27AE60",bg:"#E9F7EF"}, Scaduto:{clr:"#E74C3C",bg:"#FDECEA"}, Venduto:{clr:"#C9A96E",bg:"#FDF6EC"}, Locato:{clr:"#8E44AD",bg:"#F5EEF8"} };
const STATI_PROP = {
  "In attesa":{clr:"#4A90D9",bg:"#E8F1FB",s:"🔵",label:"In attesa"},
  "In attesa / Vincolata":{clr:"#D4AC0D",bg:"#FEF9E7",s:"🟡",label:"In att./Vincolata"},
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
const STATI_BLOCCANTI = ["In attesa","Controproposta","In attesa / Vincolata"];

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
  const TAB_BACKOFFICE=TAB_CONFIG.map(t=>t.id).filter(id=>id!=="Il mio report"&&id!=="Fatture Agente"&&id!=="Break Even"&&id!=="Costi");
  const tabsVisibili = TAB_CONFIG.filter(t=>{
    if(isBroker) return t.id !== "Il mio report" && t.id !== "Fatture Agente";
    if(isBackOffice) return TAB_BACKOFFICE.includes(t.id);
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

function SchedaAgente({agente,venduti,incarichi,onClose}) {
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
        {showTabella&&<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
          <thead><tr>{["Data","Immobile","Ruolo","Provv. Agenzia","Quota Agente","Quota Buyer","Stato"].map(h=><th key={h} style={Ss.th}>{h}</th>)}</tr></thead>
          <tbody>
            {prat.map(v=>{
              const ruoli=[];
              if(v.agenteListing===agente.id)ruoli.push("Listing");if(v.agenteAcquirente===agente.id)ruoli.push("Acquirente");
              if(v.buyerListing===agente.id&&v.agenteListing!==agente.id)ruoli.push("Buyer L.");if(v.buyer===agente.id&&v.agenteAcquirente!==agente.id)ruoli.push("Buyer");
              const qAg=(()=>{let q=0;if(v.agenteListing===agente.id)q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;if(v.agenteAcquirente===agente.id)q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;return q;})();
              const qBuy=(()=>{let q=0;if(v.buyerListing===agente.id&&v.agenteListing!==agente.id)q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;if(v.buyer===agente.id&&v.agenteAcquirente!==agente.id)q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;return q;})();
              const provvAg=(()=>{let p=0;if(v.agenteListing===agente.id)p+=Number(v.provvVenditore||0);if(v.agenteAcquirente===agente.id)p+=Number(v.provvAcquirente||0);return p;})();
              const cfg=STATI_INCASSO[calcolaStatoIncasso(v)]||STATI_INCASSO["Da incassare"];
              return(<tr key={v.id}>
                <td style={Ss.td}>{fmtD(v.dataVendita||v.dataAtto)}</td>
                <td style={Ss.td}><strong>{v.comuneImmobile}</strong> — {v.indirizzoImmobile}<br/><span style={{fontSize:11,color:"#aaa"}}>{v.tipologia}</span></td>
                <td style={Ss.td}>{ruoli.map(r=><span key={r} style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:"#EAF4FB",color:"#2980B9",marginRight:4,fontWeight:500}}>{r}</span>)}</td>
                <td style={{...Ss.tdR,color:"#aaa"}}>€ {fmt(Number(v.provvVenditore||0)+Number(v.provvAcquirente||0))}</td>
                <td style={{...Ss.tdR,fontWeight:600,color:"#8E44AD"}}>{qAg>0?`€ ${fmt(qAg)}`:"—"}</td>
                <td style={{...Ss.tdR,fontWeight:600,color:"#2980B9"}}>{qBuy>0?`€ ${fmt(qBuy)}`:"—"}</td>
                <td style={Ss.td}><span style={bdg(cfg)}>{calcolaStatoIncasso(v)}</span></td>
              </tr>);
            })}
            {prat.length===0&&<tr><td colSpan={7} style={{...Ss.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessuna pratica nel periodo</td></tr>}
          </tbody>
          {prat.length>0&&<tfoot><tr style={{background:"#F2F0EB",fontWeight:500}}>
            <td colSpan={3} style={Ss.td}>Totale</td>
            <td style={{...Ss.tdR,color:BRAND.oroD}}>€ {fmt(totP)}</td>
            <td style={{...Ss.tdR,color:"#8E44AD"}}>{totQ>0?`€ ${fmt(totQ)}`:"—"}</td>
            <td style={{...Ss.tdR,color:"#2980B9"}}>{totQBuy>0?`€ ${fmt(totQBuy)}`:"—"}</td>
            <td style={Ss.td}/>
          </tr></tfoot>}
        </table></div>}
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
export default function App() {
  const isMobile=useIsMobile();
  const [utente,setUtente]=useState(()=>{try{const u=sessionStorage.getItem("casa_utente");return u?JSON.parse(u):null;}catch(e){return null;}});
  const handleLogin=(u)=>{try{sessionStorage.setItem("casa_utente",JSON.stringify(u));}catch(e){}setUtente(u);};
  const handleLogout=()=>{try{sessionStorage.removeItem("casa_utente");}catch(e){}setUtente(null);};
  const [tab,setTab]=useState("Dashboard");
  // Carica da localStorage se disponibile, altrimenti usa dati iniziali
  const _ls = caricaLS();
  const [dbLoaded,setDbLoaded]=useState(false);
  const [dbSaving,setDbSaving]=useState(false);
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
  const [catCosti,setCatCosti]=useState(_ls?.catCosti||CAT_COSTI_DEFAULT);
  const [speseCosti,setSpeseCosti]=useState(_ls?.speseCosti||{});
  const [impCostiAnno,setImpCostiAnno]=useState(String(new Date().getFullYear()));
  const [impCostiTipo,setImpCostiTipo]=useState("fisso");
  const [formNuovaCat,setFormNuovaCat]=useState(null);
  const [catCostiEditId,setCatCostiEditId]=useState(null);
  const [formSpesa,setFormSpesa]=useState(null);
  const [costiCatExpand,setCostiCatExpand]=useState({});
  const [costiAnno,setCostiAnno]=useState(annoCorrente);
  const [obiettivoFatturato,setObiettivoFatturato]=useState(_ls?.obiettivoFatturato||0);
  const [obiettivoQuotaAgenzia,setObiettivoQuotaAgenzia]=useState(_ls?.obiettivoQuotaAgenzia||0);
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
  const [opSubTab,setOpSubTab]=useState("settimana");
  const [opMainTab,setOpMainTab]=useState("attivita");
  const [opDataSel,setOpDataSel]=useState(todayStr());
  const [opMeseSel,setOpMeseSel]=useState(annoCorrente+"-"+String(new Date().getMonth()+1).padStart(2,"0"));
  const [opAgenteSel,setOpAgenteSel]=useState("Tutti");
  // Gestione Pratiche: {incaricoId: {fasi:{}, checklistA:{}, checklistB:{}, checklistC:{}, note:""}}
  const [pratiche,setPratiche]=useState(_ls?.pratiche||{});
  const [gpIncSel,setGpIncSel]=useState(null);
  const [gpSubTab,setGpSubTab]=useState("pipeline");
  const [gpFiltroStato,setGpFiltroStato]=useState("Tutti");
  const [gpVista,setGpVista]=useState("lista");
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
  const [fIncStato,setFIncStato]=useState("Attivo"); const [fIncAnno,setFIncAnno]=useState("Tutti"); const [fIncMese,setFIncMese]=useState("Tutti"); const [fIncAg,setFIncAg]=useState("Tutti");
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
  const [showPagamento,setShowPagamento]=useState(null); const [formPagamento,setFormPagamento]=useState({});
  const [provvStandard,setProvvStandard]=useState(_ls?.provvStandard||{percVend:3,percAcq:4,soglia:120000,minVend:3500,minAcq:4000});
  const [statSubTab,setStatSubTab]=useState("generali");
  const [statAnno,setStatAnno]=useState(annoCorrente);
  const [statShowSconti,setStatShowSconti]=useState(false);
  const [showSospesi,setShowSospesi]=useState(false);
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
        if(data.obiettiviOp) setObiettiviOp(data.obiettiviOp);
        if(data.pratiche) setPratiche(data.pratiche);
        if(data.pagamentiFatture) setPagamentiFatture(data.pagamentiFatture);
        if(data.costi) setCosti(data.costi);
        if(data.obiettivoFatturato!==undefined) setObiettivoFatturato(data.obiettivoFatturato);
        if(data.obiettivoQuotaAgenzia!==undefined) setObiettivoQuotaAgenzia(data.obiettivoQuotaAgenzia);
        if(data.provvStandard) setProvvStandard(data.provvStandard);
        if(data.costiAgente) setCostiAgente(data.costiAgente);
        if(data.obiettivoAgente) setObiettivoAgente(data.obiettivoAgente);
      }
      setDbLoaded(true);
    });
  },[]);

  // Auto-salvataggio su Supabase + localStorage ad ogni modifica
  useEffect(()=>{
    if(!dbLoaded) return; // non salvare prima di aver caricato
    const payload = {agenti,incarichi,proposte,venduti,archiviati,archiviatiProp,archiviatiVend,fonti,tipologie,vincoli,tipiNeg,tipiVolantino,tipiSviluppo,operativita,obiettiviOp,pratiche,pagamentiFatture,costi,obiettivoFatturato,obiettivoQuotaAgenzia,obiettivoAgente,provvStandard,costiAgente,obiettivoAgente,sfide,oneToOne,fasiConfig};
    salvaLS(payload); // salva anche in locale come backup
    setDbSaving(true);
    const t=setTimeout(()=>{
      salvaDB(payload).finally(()=>setDbSaving(false));
    },1500); // debounce 1.5s per non sovraccaricare
    return ()=>clearTimeout(t);
  },[agenti,incarichi,proposte,venduti,archiviati,archiviatiProp,archiviatiVend,fonti,tipologie,vincoli,tipiNeg,tipiVolantino,tipiSviluppo,operativita,obiettiviOp,pratiche,pagamentiFatture,costi,obiettivoFatturato,obiettivoQuotaAgenzia,obiettivoAgente,provvStandard,costiAgente,obiettivoAgente,dbLoaded]);

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
    // Agente vede solo i propri incarichi
    if(!canViewAll&&myAgentId&&i.agenteListing!==myAgentId) return false;
    const s=statoInc(i);
    if(fIncStato!=="Tutti"&&s!==fIncStato) return false;
    if(fIncAnno!=="Tutti"&&getAnno(i.dataInizio)!==fIncAnno) return false;
    if(fIncMese!=="Tutti"&&getMese(i.dataInizio)!==fIncMese) return false;
    if(fIncAg!=="Tutti"&&i.agenteListing!==Number(fIncAg)) return false;
    return true;
  }),[incarichi,subInc,fIncStato,fIncAnno,fIncMese,fIncAg,mostraArchiviati,isBroker,myAgentId]);

  const cntInc=useMemo(()=>{
    const b=incarichi.filter(i=>{
      if(i.archiviato)return false;
      if(i.categoria!==subInc)return false;
      // Agente vede solo i propri
      if(!canViewAll&&myAgentId&&i.agenteListing!==myAgentId)return false;
      if(fIncAnno!=="Tutti"&&getAnno(i.dataInizio)!==fIncAnno)return false;
      if(fIncMese!=="Tutti"&&getMese(i.dataInizio)!==fIncMese)return false;
      if(isBroker&&fIncAg!=="Tutti"&&i.agenteListing!==Number(fIncAg))return false;
      return true;
    });
    return{attivi:b.filter(i=>statoInc(i)==="Attivo").length,scaduti:b.filter(i=>statoInc(i)==="Scaduto").length,venduti:b.filter(i=>statoInc(i)==="Venduto"||statoInc(i)==="Locato").length};
  },[incarichi,subInc,fIncAnno,fIncMese,fIncAg,isBroker,myAgentId]);

  const propFiltrate=useMemo(()=>proposte.filter(p=>{
    if(p.categoria!==subProp) return false;
    // Agente vede solo le proprie proposte
    if(!isBroker&&myAgentId&&Number(p.agenteAcquirente)!==myAgentId&&Number(p.agenteListing)!==myAgentId) return false;
    if(fPropStato!=="Tutti"&&p.stato!==fPropStato) return false;
    if(fPropAnno!=="Tutti"&&getAnno(p.dataStato)!==fPropAnno) return false;
    if(fPropMese!=="Tutti"&&getMese(p.dataStato)!==fPropMese) return false;
    if(fPropAg!=="Tutti"&&Number(p.agenteAcquirente)!==Number(fPropAg)&&Number(p.agenteListing)!==Number(fPropAg)) return false;
    return true;
  }),[proposte,subProp,fPropStato,fPropAnno,fPropMese,fPropAg,isBroker,myAgentId]);

  const cntProp=useMemo(()=>({attesa:propFiltrate.filter(p=>["In attesa","In attesa / Vincolata"].includes(p.stato)).length,vincolo:propFiltrate.filter(p=>p.stato==="Accettata con Vincolo").length,accettate:propFiltrate.filter(p=>p.stato==="Accettata").length,rifiutate:propFiltrate.filter(p=>["Rifiutata","Mancata Chiusura"].includes(p.stato)).length}),[propFiltrate]);

  const vendFiltrati=useMemo(()=>venduti.filter(v=>{
    if(v.categoria!==subVend) return false;
    // Agente vede solo i propri venduti
    if(!isBroker&&myAgentId&&Number(v.agenteListing)!==myAgentId&&Number(v.agenteAcquirente)!==myAgentId) return false;
    const stato=calcolaStatoIncasso(v);
    if(fVendStato!=="Tutti"&&stato!==fVendStato) return false;
    if(fVendAnno!=="Tutti"&&getAnno(dataCompAgenzia(v))!==fVendAnno) return false;
    if(fVendAg!=="Tutti"&&Number(v.agenteListing)!==Number(fVendAg)&&Number(v.agenteAcquirente)!==Number(fVendAg)) return false;
    return true;
  }),[venduti,subVend,fVendStato,fVendAnno,fVendAg,isBroker,myAgentId]);

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

  const propVincolo=proposte.filter(p=>["Accettata con Vincolo","In attesa / Vincolata"].includes(p.stato)&&p.categoria==="vendita"&&(dashAnno==="Tutti"||getAnno(p.dataStato)===dashAnno));
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

  const Sel=({value,onChange,children})=>(<select style={S.sel} value={value} onChange={e=>onChange(e.target.value)}>{children}</select>);
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
    {isBroker&&<Sel value={fIncAg} onChange={setFIncAg}><option value="Tutti">Tutti gli agenti</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</Sel>}
  </div>);
  const FiltriProp=()=>(<div style={S.fRow}>
    <Sel value={fPropAnno} onChange={v=>{setFPropAnno(v);setFPropMese("Tutti");}}><option value="Tutti">Tutti gli anni</option>{anniProp.map(a=><option key={a}>{a}</option>)}</Sel>
    <Sel value={fPropMese} onChange={setFPropMese}><option value="Tutti">Tutti i mesi</option>{mesiProp.map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}</Sel>
    <Sel value={fPropStato} onChange={setFPropStato}><option value="Tutti">Tutti gli stati</option>{Object.keys(STATI_PROP).map(s=><option key={s}>{s}</option>)}</Sel>
    {isBroker&&<Sel value={fPropAg} onChange={setFPropAg}><option value="Tutti">Tutti gli agenti</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</Sel>}
  </div>);
  const FiltriVend=()=>(<div style={S.fRow}>
    <Sel value={fVendAnno} onChange={setFVendAnno}><option value="Tutti">Tutti gli anni</option>{anniVend.map(a=><option key={a}>{a}</option>)}</Sel>
    <Sel value={fVendStato} onChange={setFVendStato}><option value="Tutti">Tutti gli stati</option>{Object.keys(STATI_INCASSO).map(s=><option key={s}>{s}</option>)}</Sel>
    {isBroker&&<Sel value={fVendAg} onChange={setFVendAg}><option value="Tutti">Tutti gli agenti</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</Sel>}
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
            {!isBroker&&myAgentId&&(()=>{
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
              const incassatoAgente = myVendAnno.reduce((s,v)=>{
                let q=0;
                if(Number(v.agenteListing)===myAgentId) q+=calcolaIncassatoV(v)*Number(v.percListing||0)/100;
                if(Number(v.agenteAcquirente)===myAgentId) q+=calcolaIncassatoA(v)*Number(v.percAcquirente||0)/100;
                return s+q;
              },0);
              const incassatoBuyer = myVendAnno.reduce((s,v)=>{
                let q=0;
                if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId) q+=calcolaIncassatoV(v)*Number(v.percBuyerListing||0)/100;
                if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId) q+=calcolaIncassatoA(v)*Number(v.percBuyer||0)/100;
                return s+q;
              },0);
              const totIncassato = incassatoAgente + incassatoBuyer;
              const daIncAssAgente = Math.max(0, quotaAgente - incassatoAgente);
              const daIncAssBuyer = Math.max(0, quotaBuyer - incassatoBuyer);
              const totDaInc = daIncAssAgente + daIncAssBuyer;
              const totMaturato = quotaAgente + quotaBuyer;

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

                {/* IN ATTESA / CONTROPROPOSTA — sempre visibile */}
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #4A90D955",overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#E8F1FB",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"0.5px solid #4A90D933"}}>
                    <div>
                      <span style={{fontSize:13,fontWeight:600,color:"#2980B9"}}>🔵 IN ATTESA / CONTROPROPOSTA — Proposte attive in corso di trattativa</span>
                      <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Provvigioni potenziali su proposte ancora aperte</p>
                    </div>
                    <span style={{fontSize:18,fontWeight:700,color:"#2980B9",marginLeft:16,whiteSpace:"nowrap"}}>{myPropAttive.length>0?`€ ${fmt(myPropAttive.reduce((s,p)=>s+Number(p.provvVenditore||0)+Number(p.provvAcquirente||0),0))}`:"—"}</span>
                  </div>
                  {myPropAttive.length>0?(
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
                  ):<div style={{padding:"1rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna proposta in attesa</div>}
                </div>

                {/* VINCOLATE — sempre visibile */}
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #D4AC0D55",overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#FEF9E7",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"0.5px solid #D4AC0D44"}}>
                    <div>
                      <span style={{fontSize:13,fontWeight:600,color:"#D4AC0D"}}>Vincolate — Proposte accettate con vincolo in attesa di esito</span>
                      <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Provvigioni previste ma non certe: dipendono dall'esito del vincolo</p>
                    </div>
                    <span style={{fontSize:18,fontWeight:700,color:"#D4AC0D",marginLeft:16,whiteSpace:"nowrap"}}>{myPropVincolo.length>0?`€ ${fmt(myPropVincolo.reduce((s,p)=>s+Number(p.provvVenditore||0)+Number(p.provvAcquirente||0),0))}`:"—"}</span>
                  </div>
                  {myPropVincolo.length>0?(
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
                  ):<div style={{padding:"1rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna proposta vincolata</div>}
                </div>
              </>);
            })()}
            {!isBroker&&(()=>{
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
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":sfidaAtt?"1fr 1fr":"1fr 1fr",gap:10}}>
                <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem"}}>
                  <p style={{fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".08em",margin:"0 0 8px"}}>📅 Prossimi rogiti</p>
                  {myRog.length===0?<p style={{fontSize:12,color:"#bbb",textAlign:"center"}}>Nessun rogito nei prossimi 30 giorni</p>
                  :myRog.map(v=>{const gg=Math.round((toD(v.dataAtto)-oggiD)/86400000);return(<div key={v.id} style={{padding:"6px 0",borderBottom:"0.5px solid #f5f5f5"}}><div style={{fontSize:12,fontWeight:500}}>{v.comuneImmobile} — {v.indirizzoImmobile}</div><div style={{display:"flex",justifyContent:"space-between",marginTop:2}}><span style={{fontSize:11,color:"#888"}}>{v.nominativoVenditore}</span><span style={{fontSize:11,fontWeight:600,color:gg<=7?"#E74C3C":gg<=15?"#E67E22":"#27AE60"}}>{gg===0?"Oggi!":gg===1?"Domani":gg+" gg"}</span></div></div>);})}
                </div>
                <div style={{background:"#fff",borderRadius:10,border:`0.5px solid ${myAl.length>0?"#E74C3C44":"#e8e5e0"}`,padding:"1rem"}}>
                  <p style={{fontSize:11,fontWeight:600,color:myAl.length>0?"#E74C3C":"#888",textTransform:"uppercase",letterSpacing:".08em",margin:"0 0 8px"}}>{myAl.length>0?"⚠ Alert pratiche":"✅ Pratiche"}{myAl.length>0&&<span style={{marginLeft:6,fontSize:10,padding:"1px 6px",borderRadius:3,background:"#FDECEA"}}>{myAl.length}</span>}</p>
                  {myAl.length===0?<p style={{fontSize:12,color:"#bbb",textAlign:"center"}}>Tutto in regola!</p>
                  :myAl.slice(0,3).map(({inc,al})=>(<div key={inc.id} style={{padding:"6px 0",borderBottom:"0.5px solid #f5f5f5"}}><div style={{fontSize:12,fontWeight:500}}>{inc.comune} — {inc.indirizzo}</div><div style={{fontSize:11,color:"#E74C3C",marginTop:2}}>{al[0].lbl}{al.length>1?` +${al.length-1}`:""}</div></div>))}
                </div>
              </div></div>);
            })()}
            {/* ── DASHBOARD BROKER (invariata) ── */}
            {isBroker&&(<>
            <div style={S.fRow}><Sel value={dashAnno} onChange={setDashAnno}><option value="Tutti">Tutti gli anni</option>{[...new Set([annoCorrente,...anniVend])].sort().reverse().map(a=><option key={a}>{a}</option>)}</Sel></div>
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
              const propAttesa=proposte.filter(p=>["In attesa","Controproposta"].includes(p.stato)&&p.categoria==="vendita"&&(dashAnno==="Tutti"||getAnno(p.dataStato)===dashAnno));
              const totAttesa=propAttesa.reduce((s,p)=>s+Number(p.provvVenditore||0)+Number(p.provvAcquirente||0),0);
              return(
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #4A90D955",overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#E8F1FB",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"0.5px solid #4A90D933"}}>
                    <div><span style={{fontSize:13,fontWeight:600,color:"#2980B9"}}>🔵 IN ATTESA / CONTROPROPOSTA — Proposte attive in corso di trattativa</span><p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Provvigioni potenziali su proposte ancora aperte</p></div>
                    <span style={{fontSize:18,fontWeight:700,color:"#2980B9",marginLeft:16,whiteSpace:"nowrap"}}>{propAttesa.length>0?`€ ${fmt(totAttesa)}`:"—"}</span>
                  </div>
                  {propAttesa.length>0?(
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
                  ):<div style={{padding:"1rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna proposta in attesa</div>}
                </div>
              );
            })()}

            {/* VINCOLATE */}
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #D4AC0D55",overflow:"hidden",marginBottom:"1.25rem"}}>
              <div style={{background:"#FEF9E7",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"0.5px solid #D4AC0D44"}}>
                <div><span style={{fontSize:13,fontWeight:600,color:"#D4AC0D"}}>Vincolate — Proposte accettate con vincolo in attesa di esito</span><p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Provvigioni previste ma non certe: dipendono dall'esito del vincolo</p></div>
                <span style={{fontSize:18,fontWeight:700,color:"#D4AC0D",marginLeft:16,whiteSpace:"nowrap"}}>{propVincolo.length>0?`€ ${fmt(dashSospeso)}`:"—"}</span>
              </div>
              {propVincolo.length>0?(
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
              ):<div style={{padding:"1rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna proposta vincolata</div>}
            </div>
            {isBroker&&(()=>{
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
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
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
              </div></div>);
            })()}
            </>)}
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
            <FiltriInc/>
            <div style={S.cnt}>
              {[["Attivi",cntInc.attivi,STATI_INC.Attivo.clr],["Scaduti",cntInc.scaduti,STATI_INC.Scaduto.clr],[subInc==="affitto"?"Locati":"Venduti",cntInc.venduti,STATI_INC.Venduto.clr]].map(([l,n,c])=>(<div key={l} style={S.cntBox(c)}><span style={{fontSize:24,fontWeight:700,color:c}}>{n}</span><span style={{fontSize:12,color:"#aaa"}}>{l}</span></div>))}
              <div style={{...S.cntBox(BRAND.oroD),marginLeft:"auto",borderTop:`3px solid ${BRAND.oroD}`,borderLeft:"none",minWidth:110}}>
                <span style={{fontSize:22,fontWeight:700,color:BRAND.oroD}}>{incarichi.filter(i=>i.categoria===subInc&&!i.archiviato&&getAnno(i.dataInizio)===annoCorrente&&(isBroker||!myAgentId||i.agenteListing===myAgentId)).length}</span>
                <span style={{fontSize:11,color:BRAND.oroD,fontWeight:500}}>Acquisiti {annoCorrente}</span>
                <span style={{fontSize:10,color:"#aaa"}}>{isBroker?"totali agenzia":"tuoi anno corrente"}</span>
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
                const rowBg=inc.archiviato?"#fafafa":hasPropAttiva?(propAttivaVinc?"#FEF9E7":"#FEF0E0"):"white";
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
                      {inc.agenteListing&&<span style={{color:"#2980B9"}}>L: {nomAg(inc.agenteListing)}{inc.percListing?` ${inc.percListing}%`:""}</span>}
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
                      {!isVenduto&&!inc.archiviato&&<button style={{...S.btn,fontSize:12,padding:"4px 8px"}} onClick={()=>{setFormInc({...inc,agenteListing:inc.agenteListing||"",buyerListing:inc.buyerListing||""});setShowInc(inc);}}>✏️</button>}
                      {!isVenduto&&!inc.archiviato&&<button style={{...S.btn,fontSize:12,padding:"4px 8px",color:BRAND.oroD,borderColor:BRAND.oro}} onClick={()=>{setShowRibasso(inc);setFormRibasso({data:todayStr(),prezzo:"",note:""});}}>↘</button>}
                      {!isVenduto&&!hasPropAttiva&&!inc.archiviato&&<button style={S.btnG} onClick={()=>{setFormProp(emptyProp(inc.categoria,inc));if(!isReadOnly)setShowProp("new");}}>+ Prop.</button>}
                      {!inc.archiviato?<button style={S.btnD} onClick={()=>{if(window.confirm(`Archiviare?`))archiviaInc(inc.id);}}>📦</button>
                      :<button style={{...S.btn,fontSize:12,padding:"4px 8px",color:"#27AE60"}} onClick={()=>ripristinaInc(inc.id)}>↩</button>}
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
                        {[["Listing",inc.agenteListing,`${inc.percListing||50}%`],["Buyer L.",inc.buyerListing,`${inc.percBuyerListing||0}%`],["Acquirente",vendCorr?.agenteAcquirente,`${vendCorr?.percAcquirente||0}%`],["Buyer",vendCorr?.buyer,`${vendCorr?.percBuyer||0}%`]].filter(([,id])=>id).map(([k,id,p])=>(
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
            <FiltriProp/>
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
            <FiltriVend/>
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
                      {v.agenteListing?<span style={{color:"#2980B9"}}>L: {nomAg(v.agenteListing)}{v.percListing?` ${v.percListing}%`:""}</span>:v.agenziaEsterna?<span style={{color:BRAND.oroD,fontSize:10}}>{v.agenziaEsterna}</span>:null}
                      {v.buyerListing&&<span style={{color:"#2980B9",opacity:.8}}>BL: {nomAg(v.buyerListing)}{v.percBuyerListing?` ${v.percBuyerListing}%`:""}</span>}
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
                      {!v.bloccato&&<><button style={{...S.btnP,fontSize:11,padding:"3px 7px",background:"#2980B9",borderColor:"#2980B9"}} onClick={()=>setShowIncassoLato({vend:v,lato:"V"})}>V</button>
                      <button style={{...S.btnP,fontSize:11,padding:"3px 7px",background:"#8E44AD",borderColor:"#8E44AD"}} onClick={()=>setShowIncassoLato({vend:v,lato:"A"})}>A</button>
                      <button style={{...S.btn,fontSize:11,padding:"3px 7px"}} onClick={()=>{setFormVend({...v});if(!isReadOnly)setShowGestVend(v);}}>✏️</button></>}
                      <button style={{...S.btn,fontSize:11,padding:"3px 7px",color:v.bloccato?"#27AE60":"#E67E22"}} onClick={()=>setVenduti(venduti.map(x=>x.id===v.id?{...x,bloccato:!x.bloccato}:x))}>{v.bloccato?"🔓":"🔒"}</button>
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
          {tab==="Fatture Agenti"&&(<div style={S.sec}>
            <div style={S.fRow}>
              <select style={S.sel} value={fatAgente} onChange={e=>setFatAgente(e.target.value)}><option value="">Seleziona agente...</option>{agentiFattura.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome} — {a.profilo}</option>)}</select>
              <Sel value={fatAnno} onChange={setFatAnno}><option value="Tutti">Tutti gli anni</option>{anniVend.map(a=><option key={a}>{a}</option>)}</Sel>
              <Sel value={fatMese} onChange={setFatMese}><option value="Tutti">Tutti i mesi</option>{mesiFat.map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}</Sel>
              <Sel value={fatStatoIncasso} onChange={setFatStatoIncasso}>
                <option value="Tutti">Tutti gli stati</option>
                <option value="Da incassare">Da incassare</option>
                <option value="Parziale">Parziale</option>
                <option value="Incassato">Incassato</option>
              </Sel>
              <div style={{flex:1}}/>{fatturaDati.length>0&&<button style={S.btnP} onClick={()=>window.print()}>Stampa</button>}
            </div>
            {!fatAgente&&<div style={{textAlign:"center",padding:"3rem",color:"#bbb"}}>Seleziona un agente per visualizzare la nota provvigioni</div>}
            {fatAgente&&fatturaDati.length===0&&<div style={{textAlign:"center",padding:"3rem",color:"#bbb"}}>Nessuna pratica incassata nel periodo</div>}
            {fatAgente&&fatturaDati.length>0&&(<div style={{background:"#fff",border:`1px solid ${BRAND.oro}`,borderRadius:10,padding:"1.5rem"}}>
              <div style={{borderBottom:`2px solid ${BRAND.oro}`,paddingBottom:"1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div><div style={{fontSize:24,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>casa</div><div style={{fontSize:8,letterSpacing:"0.25em",color:BRAND.grigio,borderTop:`1px solid ${BRAND.grigio}`,paddingTop:2,marginTop:1}}>IMMOBILIARE</div></div>
                <div style={{textAlign:"right"}}><p style={{fontSize:12,color:"#aaa",margin:"0 0 2px"}}>Nota provvigioni</p><p style={{fontSize:16,fontWeight:500,margin:"0 0 2px"}}>{fatAg?.nome} {fatAg?.cognome}</p><p style={{fontSize:12,color:"#aaa",margin:0}}>{fatMese!=="Tutti"?fmtMese(fatMese):fatAnno!=="Tutti"?`Anno ${fatAnno}`:"Tutto il periodo"} — {new Date().toLocaleDateString("it-IT")}</p></div>
              </div>
              <div style={{display:"flex",gap:10,marginBottom:"1.25rem"}}>
                <div style={{flex:1,background:"#E9F7EF",borderRadius:8,padding:"10px 14px"}}><p style={{fontSize:11,color:"#27AE60",margin:"0 0 3px",fontWeight:500}}>TOTALE IMPONIBILE</p><p style={{fontSize:20,fontWeight:700,color:"#27AE60",margin:0}}>€ {fmt(totImponibile)}</p></div>
                <div style={{flex:1,background:"#EAF4FB",borderRadius:8,padding:"10px 14px"}}><p style={{fontSize:11,color:"#2980B9",margin:"0 0 3px",fontWeight:500}}>PAGATO</p><p style={{fontSize:20,fontWeight:700,color:"#2980B9",margin:0}}>€ {fmt(totPagato)}</p></div>
                <div style={{flex:1,background:"#FEF0E0",borderRadius:8,padding:"10px 14px"}}><p style={{fontSize:11,color:"#E67E22",margin:"0 0 3px",fontWeight:500}}>DA PAGARE</p><p style={{fontSize:20,fontWeight:700,color:"#E67E22",margin:0}}>€ {fmt(totImponibile-totPagato)}</p></div>
              </div>
              {fatturaDati.map(({v,righe,totPratica,key,pag},i)=>{
                const cfgPag=STATI_FATTURA[pag.stato]||STATI_FATTURA["Da pagare"];
                return(<div key={v.id} style={{border:"0.5px solid #eee",borderRadius:8,padding:"1rem",marginBottom:"0.75rem",background:BRAND.beige}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div><p style={{fontSize:14,fontWeight:500,margin:"0 0 2px"}}>{i+1}. {v.comuneImmobile} — {v.indirizzoImmobile}</p><p style={{fontSize:12,color:"#aaa",margin:0}}>Prezzo: <strong style={{color:BRAND.oroD}}>€ {fmtN(v.prezzoVendita)}</strong> | Rif.: {fmtD(v.dataVendita||v.dataAtto)} {v.dataAtto&&v.dataVendita&&v.dataAtto!==v.dataVendita?`| Atto: ${fmtD(v.dataAtto)}`:""}</p></div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}><span style={bdg(cfgPag)}>{pag.stato}</span><button style={{...S.btnP,fontSize:12,padding:"4px 10px"}} onClick={()=>{setShowPagamento({key,pratica:`${v.comuneImmobile} — ${v.indirizzoImmobile}`,totPratica});setFormPagamento({...pag});}}>Pagamento</button></div>
                  </div>
                  {righe.map((r,j)=>(<div key={j} style={{background:"#fff",borderRadius:6,border:"0.5px solid #ddd",padding:"8px 12px",marginBottom:6}}>
                    <p style={{fontSize:11,fontWeight:500,color:BRAND.oro,textTransform:"uppercase",margin:"0 0 3px"}}>{r.tipo}</p>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:2}}><span style={{color:"#888"}}>Cliente:</span><span style={{fontWeight:500}}>{r.cliente}</span></div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:2}}><span style={{color:"#888"}}>Provv. agenzia ({r.percAg}%):</span><span>€ {fmt(r.provvAgenzia)}</span></div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"#888"}}>Quota agente:</span><span style={{fontWeight:500,color:BRAND.oroD}}>€ {fmt(r.quotaAg)}</span></div>
                  </div>))}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                    <p style={{fontSize:13,fontWeight:500,color:BRAND.oroD,margin:0}}>Subtotale: € {fmt(totPratica)}</p>
                    {Number(pag.importoPagato)>0&&<p style={{fontSize:12,color:"#2980B9",margin:0}}>Pagato: € {fmt(pag.importoPagato)}{pag.dataPagamento?` (${fmtD(pag.dataPagamento)})`:""}</p>}
                  </div>
                </div>);
              })}
            </div>)}
          </div>)}

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
          {tab==="Break Even"&&isBroker&&(<div style={S.sec}>
            <div style={{display:"flex",gap:12,marginBottom:"1.5rem",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
              <h2 style={{fontSize:16,fontWeight:600,margin:0,color:"#2C2C2C"}}>📉 Break Even — {costiAnno}</h2>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <select style={S.sel} value={costiAnno} onChange={e=>setCostiAnno(e.target.value)}>
                  {[...new Set([annoCorrente,...Object.keys(costi)])].sort().reverse().map(a=><option key={a}>{a}</option>)}
                </select>
                <div style={{display:"flex",gap:4}}>
                  {[["fissi","Solo fissi"],["fissi+variabili","Fissi + Variabili"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setCostiBreakevenMode(v)} style={{fontSize:11,padding:"5px 12px",borderRadius:6,border:`1px solid ${costiBreakevenMode===v?"#E74C3C":"#ddd"}`,background:costiBreakevenMode===v?"#FDECEA":"#fff",color:costiBreakevenMode===v?"#E74C3C":"#888",cursor:"pointer",fontWeight:costiBreakevenMode===v?600:400}}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            {(()=>{
              const vociAnno=costi[costiAnno]||mkCosti();
              const vociConTipo=vociAnno.map(v=>({...v,tipo:v.tipo||"fisso"}));
              const fissi=vociConTipo.filter(v=>v.tipo==="fisso");
              const variabili=vociConTipo.filter(v=>v.tipo==="variabile");
              const totPrevFissi=fissi.reduce((s,v)=>s+prevAnnuoVoce(v),0);
              const totPrevVar=variabili.reduce((s,v)=>s+prevAnnuoVoce(v),0);
              const totSpFissi=fissi.reduce((s,v)=>s+totSpeseVoce(v),0);
              const totSpVar=variabili.reduce((s,v)=>s+totSpeseVoce(v),0);
              const totConsuntivo=totSpFissi+totSpVar;
              const totPrevAnnuo=totPrevFissi+totPrevVar;

              // Punto di Break Even = spese (preventivo o consuntivo se disponibile)
              const puntoBE = costiBreakevenMode==="fissi"
                ? (totSpFissi>0?totSpFissi:totPrevFissi)
                : (totConsuntivo>0?totConsuntivo:totPrevAnnuo);
              const puntoBELabel = costiBreakevenMode==="fissi" ? "Solo costi fissi" : "Costi fissi + variabili";
              const costoMensile = puntoBE/12;

              // Fatturato anno
              const vendAnno=venduti.filter(v=>getAnno(dataCompAgenzia(v))===costiAnno);

              // Quota Agenzia TOTALE (incassato + da incassare)
              const calcQuotaAg=(vend,useIncassato)=>vend.reduce((s,v)=>{
                const pV=useIncassato?calcolaIncassatoV(v):Number(v.provvVenditore||0);
                const pA=useIncassato?calcolaIncassatoA(v):Number(v.provvAcquirente||0);
                let qa=pV+pA;
                agenti.filter(a=>a.profilo!=="Broker").forEach(a=>{
                  if(v.agenteListing===a.id) qa-=pV*(Number(v.percListing||0)/100);
                  if(v.agenteAcquirente===a.id) qa-=pA*(Number(v.percAcquirente||0)/100);
                  if(v.buyerListing===a.id&&v.agenteListing!==a.id) qa-=pV*(Number(v.percBuyerListing||0)/100);
                  if(v.buyer===a.id&&v.agenteAcquirente!==a.id) qa-=pA*(Number(v.percBuyer||0)/100);
                });
                return s+Math.max(0,qa);
              },0);

              const quotaAgTot=calcQuotaAg(vendAnno,false);   // su totale pattuito
              const quotaAgInc=calcQuotaAg(vendAnno,true);    // su incassato
              const quotaAgDaInc=quotaAgTot-quotaAgInc;       // già maturata, non ancora incassata

              const meseTot=puntoBE>0?Math.round(quotaAgTot/costoMensile*10)/10:0;
              const meseInc=puntoBE>0?Math.round(quotaAgInc/costoMensile*10)/10:0;
              const meseCoperti=new Date().getFullYear()===Number(costiAnno)?new Date().getMonth()+1:12;

              const percTot=puntoBE>0?Math.min(100,Math.round(quotaAgTot/puntoBE*100)):0;
              const percInc=puntoBE>0?Math.min(100,Math.round(quotaAgInc/puntoBE*100)):0;

              const beRaggiuntoTot=quotaAgTot>=puntoBE;
              const beRaggiuntoInc=quotaAgInc>=puntoBE;

              return(<>
                {/* ── BOX 1: PUNTO DI BREAK EVEN ── */}
                <div style={{background:"linear-gradient(135deg,#2C2C2C,#3D3D3D)",borderRadius:12,padding:"1.25rem 1.5rem",marginBottom:"1.25rem",color:"#fff"}}>
                  <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".1em",color:"#aaa",margin:"0 0 6px"}}>Punto di Break Even ({puntoBELabel})</p>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:8}}>
                    <p style={{fontSize:36,fontWeight:700,margin:0,color:"#fff"}}>€ {fmt(puntoBE)}</p>
                    <div style={{textAlign:"right"}}>
                      <p style={{fontSize:13,margin:"0 0 2px",color:"#ccc"}}>€ {fmt(Math.round(costoMensile))}<span style={{fontSize:11,color:"#aaa"}}>/mese</span></p>
                      {costiBreakevenMode==="fissi"&&totPrevVar>0&&<p style={{fontSize:11,color:"#E67E22",margin:0}}>+€ {fmt(Math.round(totPrevVar))} var. esclusi</p>}
                      {totConsuntivo>0&&<p style={{fontSize:11,color:"#aaa",margin:0}}>Consuntivo reale: € {fmt(totConsuntivo)}</p>}
                    </div>
                  </div>
                </div>

                {/* ── BOX 2: QUOTA AGENZIA TOTALE vs BE ── */}
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
                  {/* Barra principale */}
                  <div style={{height:18,background:"#f0f0f0",borderRadius:9,overflow:"hidden",position:"relative",marginBottom:8}}>
                    <div style={{height:"100%",width:`${percTot}%`,background:beRaggiuntoTot?"#27AE60":"linear-gradient(90deg,#E74C3C,#C0392B)",borderRadius:9,transition:"width .6s ease",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:8}}>
                      {percTot>15&&<span style={{fontSize:11,fontWeight:600,color:"#fff"}}>€ {fmt(quotaAgTot)}</span>}
                    </div>
                    {/* Linea BE */}
                    <div style={{position:"absolute",top:0,bottom:0,left:"100%",width:2,background:"#2C2C2C",opacity:.3}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#888"}}>
                    <span>Break Even: <strong style={{color:"#E74C3C"}}>€ {fmt(puntoBE)}</strong></span>
                    {beRaggiuntoTot
                      ?<span style={{color:"#27AE60",fontWeight:600}}>✅ Break Even raggiunto! Utile: +€ {fmt(quotaAgTot-puntoBE)}</span>
                      :<span style={{color:"#E74C3C",fontWeight:500}}>⚠ Mancano: <strong>€ {fmt(puntoBE-quotaAgTot)}</strong></span>}
                  </div>
                </div>

                {/* ── BOX 3: SITUAZIONE CASSA + PROIEZIONE ── */}
                <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"1.25rem 1.5rem",marginBottom:"1.25rem"}}>
                  <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:"#888",margin:"0 0 1rem"}}>✅ Situazione cassa e proiezione</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"1rem"}}>
                    <div style={{background:"#E9F7EF",borderRadius:8,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"#27AE60",fontWeight:500,marginBottom:4}}>Incassato oggi</div>
                      <div style={{fontSize:22,fontWeight:700,color:"#27AE60"}}>€ {fmt(quotaAgInc)}</div>
                      <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{meseInc} mesi di costi coperti</div>
                    </div>
                    <div style={{background:"#EAF4FB",borderRadius:8,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"#2980B9",fontWeight:500,marginBottom:4}}>Da incassare (già tuoi)</div>
                      <div style={{fontSize:22,fontWeight:700,color:"#2980B9"}}>€ {fmt(quotaAgDaInc)}</div>
                      <div style={{fontSize:11,color:"#aaa",marginTop:2}}>Clienti che devono ancora pagare</div>
                    </div>
                  </div>
                  {/* Barra incassato + da incassare */}
                  <div style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:4}}>
                      <span>Incassato: <strong style={{color:"#27AE60"}}>€ {fmt(quotaAgInc)}</strong> + Da incassare: <strong style={{color:"#2980B9"}}>€ {fmt(quotaAgDaInc)}</strong></span>
                      <span>BE: <strong>€ {fmt(puntoBE)}</strong></span>
                    </div>
                    <div style={{height:14,background:"#f0f0f0",borderRadius:7,overflow:"hidden",display:"flex"}}>
                      <div style={{height:"100%",width:`${percInc}%`,background:"#27AE60",transition:"width .6s ease"}}/>
                      <div style={{height:"100%",width:`${Math.min(100-percInc,Math.max(0,percTot-percInc))}%`,background:"#2980B9",opacity:.7,transition:"width .6s ease"}}/>
                    </div>
                    <div style={{display:"flex",gap:12,marginTop:4,fontSize:10,color:"#aaa"}}>
                      <span style={{color:"#27AE60"}}>■ Incassato {percInc}%</span>
                      <span style={{color:"#2980B9"}}>■ Da incassare {Math.max(0,percTot-percInc)}%</span>
                      <span>□ Mancante {Math.max(0,100-percTot)}%</span>
                    </div>
                  </div>
                  {/* Analisi mesi */}
                  <div style={{background:"#fafaf8",borderRadius:8,padding:"10px 14px",marginTop:8}}>
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
                  </div>
                </div>

                {/* ── BOX 4: OBIETTIVI ── */}
                {(()=>{
                  // Obiettivo fatturato automatico = somma obiettivi fatturato agenti dall'anno selezionato
                  // Gli obiettivi sono mensili, sommiamo su tutti i mesi dell'anno
                  const mesiAnno=Array.from({length:12},(_,i)=>`${costiAnno}-${String(i+1).padStart(2,"0")}`);
                  const obFattAutoPerAgente=agenti.map(ag=>{
                    // Prendi il massimo obiettivo mensile impostato per quell'agente nell'anno
                    const obMesi=mesiAnno.map(m=>{
                      const ob=(obiettiviOp[ag.id]||{})[m]||{};
                      const proposti=ob.proposti||ob||{};
                      return Number(proposti.fatturato||proposti.fatturatoBruto||0);
                    });
                    // Se hanno impostato un obiettivo mensile fatturato, moltiplica x12
                    // Altrimenti non lo contiamo
                    const maxOb=Math.max(...obMesi);
                    return maxOb>0?maxOb*12:0;
                  });
                  const obFattTeamAuto=obFattAutoPerAgente.reduce((s,v)=>s+v,0);
                  // Usa automatico se disponibile, altrimenti manuale
                  const obFattEffettivo=obFattTeamAuto>0?obFattTeamAuto:obiettivoFatturato;
                  const fattLordo=vendAnno.reduce((s,v)=>s+Number(v.provvVenditore||0)+Number(v.provvAcquirente||0),0);
                  const percFatt=obFattEffettivo>0?Math.min(100,Math.round(fattLordo/obFattEffettivo*100)):0;
                  const percQuota=obiettivoQuotaAgenzia>0?Math.min(100,Math.round(quotaAgTot/obiettivoQuotaAgenzia*100)):0;

                  return(<div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"1.25rem 1.5rem"}}>
                    <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:"#888",margin:"0 0 1rem"}}>🎯 Obiettivi annuali {costiAnno}</p>

                    {/* Obiettivo fatturato — automatico da somma agenti */}
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
                        Somma obiettivi: {agenti.filter((_,i)=>obFattAutoPerAgente[i]>0).map((a,i)=>`${a.nome}: € ${fmt(obFattAutoPerAgente[agenti.indexOf(a)])}`).join(" · ")}
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

                    {/* Obiettivo quota agenzia — sempre manuale */}
                    <div style={{padding:"10px 14px",background:"#FDFBF7",borderRadius:8,border:"0.5px solid #e8e5e0"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:4}}>
                        <div>
                          <span style={{fontSize:12,fontWeight:500,color:"#555"}}>Obiettivo quota agenzia</span>
                          <span style={{fontSize:10,color:"#aaa",marginLeft:6}}>per coprire BE + utile</span>
                        </div>
                        {obiettivoQuotaAgenzia>0&&<span style={{fontSize:18,fontWeight:700,color:percQuota>=100?"#27AE60":"#E67E22"}}>€ {fmt(obiettivoQuotaAgenzia)}</span>}
                      </div>
                      <input type="number" style={{...S.inp,margin:"0 0 8px"}} value={obiettivoQuotaAgenzia||""} placeholder={`es. ${fmt(Math.round(puntoBE*1.2))} (BE + 20% utile)`} onChange={e=>{if(isReadOnly)return;setObiettivoQuotaAgenzia(Number(e.target.value))}}/>
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
          {tab==="Costi"&&isBroker&&!isReadOnly&&(()=>{
            const annoC=costiAnno||annoCorrente;
            const catAnnoC=catCosti.filter(c=>String(c.anno)===annoC);
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
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <select style={S.sel} value={annoC} onChange={e=>setCostiAnno(e.target.value)}>
                    {ANNI_C.map(a=><option key={a}>{a}</option>)}
                  </select>
                  <button onClick={()=>setFormSpesa({data:oggi6,descrizione:"",importo:"",catId:"",note:""})} style={{...S.btnP,fontSize:12,padding:"6px 14px"}}>+ Aggiungi spesa</button>
                </div>
              </div>

              {/* KPI */}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:"1.5rem"}}>
                {[
                  ["Previsionale anno","€ "+fmt(Math.round(totPrev)),"#E74C3C",null,"da Impostazioni → Categorie"],
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
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 120px 160px",gap:10,marginBottom:10}}>
                  <div><label style={S.lbl}>Data</label><input type="date" style={S.inp} value={formSpesa.data} onChange={e=>setFormSpesa({...formSpesa,data:e.target.value})}/></div>
                  <div><label style={S.lbl}>Descrizione</label><input style={S.inp} value={formSpesa.descrizione} placeholder="es. Bolletta maggio" onChange={e=>setFormSpesa({...formSpesa,descrizione:e.target.value})}/></div>
                  <div><label style={S.lbl}>Importo (€)</label><input type="number" min="0" style={S.inp} value={formSpesa.importo} placeholder="0" onChange={e=>setFormSpesa({...formSpesa,importo:e.target.value})}/></div>
                  <div><label style={S.lbl}>Categoria</label>
                    <select style={S.inp} value={formSpesa.catId} onChange={e=>setFormSpesa({...formSpesa,catId:e.target.value})}>
                      <option value="">Seleziona...</option>
                      {["fisso","variabile"].map(tipo=>(
                        <optgroup key={tipo} label={tipo==="fisso"?"📌 Fissi":"📊 Variabili"}>
                          {catAnnoC.filter(c=>c.tipo===tipo).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:10}}><label style={S.lbl}>Note (opzionale)</label><input style={S.inp} value={formSpesa.note||""} placeholder="Annotazioni..." onChange={e=>setFormSpesa({...formSpesa,note:e.target.value})}/></div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setFormSpesa(null)} style={{...S.btn,fontSize:12}}>Annulla</button>
                  <button onClick={()=>{if(!formSpesa.descrizione||!formSpesa.importo||!formSpesa.catId)return alert("Compila descrizione, importo e categoria");addSpesa(formSpesa);}} style={{...S.btnP,fontSize:12,padding:"7px 18px"}}>💾 Salva spesa</button>
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
            </div>);
          })()}

          {/* COSTI & BREAK EVEN AGENTE (solo per agenti non-Broker) */}
          {tab==="Costi"&&!isBroker&&!isReadOnly&&myAgentId&&(()=>{
            const agId6=myAgentId;
            const annoC=costiAnno||annoCorrente;
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
            const catAgAll=catCosti.filter(c=>c.agentId===agId6||(!c.agentId&&!c.isAgency));
            // Se non ha categorie proprie, usa default
            const catAgAnno=catCosti.filter(c=>c.agentId===agId6&&String(c.anno)===annoC);
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
              CAT_AG_DEFAULT.forEach(cat=>{
                const id="ag_"+agId6+"_"+cat.id+"_"+annoC;
                setCatCosti(prev=>[...prev,{...cat,id,agentId:agId6,anno:Number(annoC)}]);
              });
            };
            const copiaAnnoAg=()=>{
              const nextAnno=Number(annoC)+1;
              const existing=catCosti.filter(c=>c.agentId===agId6&&c.anno===nextAnno);
              if(existing.length>0){if(!window.confirm(`Esistono già ${existing.length} categorie per ${nextAnno}. Sovrascrivere?`))return;}
              const nuove=catAgAnno.map(c=>({...c,id:c.id+"_"+nextAnno,anno:nextAnno,totaleAnno:0}));
              setCatCosti(prev=>[...prev.filter(c=>!(c.agentId===agId6&&c.anno===nextAnno)),...nuove]);
              setCostiAnno(String(nextAnno));
            };
            const addSpesaAg=(sp)=>{
              const id="sp_"+Date.now();
              setSpeseCosti(prev=>({...prev,[`${agId6}_${annoC}`]:[...(prev[`${agId6}_${annoC}`]||[]),{id,...sp}]}));
              setFormSpesa(null);
            };
            const delSpesaAg=(id)=>setSpeseCosti(prev=>({...prev,[`${agId6}_${annoC}`]:(prev[`${agId6}_${annoC}`]||[]).filter(s=>s.id!==id)}));
            const speseByCatAg=(catId)=>speseAgAnno.filter(s=>s.catId===catId);
            const ANNI_AG=[...new Set(catCosti.filter(c=>c.agentId===agId6).map(c=>String(c.anno)).concat([annoCorrente]))].sort((a,b)=>b-a);
            const [showGestCat,setShowGestCat]=useState(false);
            const [formNuovaCatAg,setFormNuovaCatAg]=useState(null);
            const sC3={background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"14px 16px"};
            return(<div style={S.sec}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:10}}>
                <div>
                  <h2 style={{fontSize:16,fontWeight:600,margin:0,color:BRAND.grigio}}>💰 I miei costi</h2>
                  <div style={{fontSize:12,color:"#888",marginTop:3}}>Anno {annoC} — spese personali</div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <select style={S.sel} value={annoC} onChange={e=>setCostiAnno(e.target.value)}>
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
                {catAgAnno.map(cat=>{
                  const spese=speseByCatAg(cat.id).sort((a,b)=>(b.data||"").localeCompare(a.data||""));
                  const totCat=spese.reduce((s,x)=>s+Number(x.importo||0),0);
                  const percCat=cat.totaleAnno>0?Math.min(100,Math.round(totCat/cat.totaleAnno*100)):null;
                  const over=cat.totaleAnno>0&&totCat>cat.totaleAnno;
                  const expanded=costiCatExpand[cat.id];
                  return(<div key={cat.id}>
                    <div onClick={()=>setCostiCatExpand(prev=>({...prev,[cat.id]:!prev[cat.id]}))}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",cursor:"pointer",borderBottom:"0.5px solid #f5f5f5",background:expanded?"#fafaf8":"#fff"}}>
                      <span style={{fontSize:11,color:"#aaa",width:12}}>{expanded?"▼":"▶"}</span>
                      <span style={{fontSize:13,fontWeight:500,flex:1}}>{cat.nome}</span>
                      <span style={{fontSize:10,color:cat.tipo==="fisso"?"#185FA5":"#533AB7"}}>{cat.tipo}</span>
                      {spese.length>0&&<span style={{fontSize:10,color:"#aaa"}}>{spese.length} spese</span>}
                      <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                        {cat.totaleAnno>0&&<div style={{textAlign:"right",minWidth:70}}>
                          <div style={{fontSize:10,color:"#aaa"}}>Prev.</div>
                          <div style={{fontSize:12,color:"#888"}}>€ {fmt(cat.totaleAnno)}</div>
                        </div>}
                        <div style={{textAlign:"right",minWidth:80}}>
                          <div style={{fontSize:10,color:"#aaa"}}>Speso</div>
                          <div style={{fontSize:13,fontWeight:600,color:over?"#E74C3C":totCat>0?"#0F6E56":"#bbb"}}>€ {fmt(Math.round(totCat))}</div>
                        </div>
                        {percCat!=null&&<div style={{width:50}}>
                          <div style={{height:4,background:"#f0f0f0",borderRadius:2,overflow:"hidden",marginBottom:2}}><div style={{height:"100%",width:percCat+"%",background:over?"#E74C3C":percCat>=70?"#E67E22":"#0F6E56",borderRadius:2}}/></div>
                          <div style={{fontSize:9,color:"#aaa",textAlign:"right"}}>{percCat}%</div>
                        </div>}
                      </div>
                    </div>
                    {expanded&&<div style={{background:"#fafaf8",borderBottom:"0.5px solid #f0f0f0"}}>
                      {spese.length===0&&<div style={{padding:"12px 16px 8px 40px",fontSize:12,color:"#bbb",fontStyle:"italic"}}>Nessuna spesa inserita</div>}
                      {spese.map(sp=>(
                        <div key={sp.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px 8px 40px",borderBottom:"0.5px solid #f0f0f0"}}>
                          <div style={{width:34,height:34,borderRadius:8,background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#888",flexShrink:0,fontWeight:500}}>{sp.data?fmtD(sp.data).slice(0,5):"—"}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:500}}>{sp.descrizione}</div>
                            {sp.note&&<div style={{fontSize:11,color:"#aaa"}}>{sp.note}</div>}
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"#E74C3C",flexShrink:0}}>€ {fmt(Number(sp.importo||0))}</div>
                          <button onClick={()=>delSpesaAg(sp.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#ddd"}}>🗑</button>
                        </div>
                      ))}
                      <div style={{padding:"8px 16px 8px 40px"}}>
                        <button onClick={()=>setFormSpesa({data:oggi7,descrizione:"",importo:"",catId:cat.id,note:""})}
                          style={{fontSize:11,padding:"4px 12px",borderRadius:6,border:"0.5px dashed #A8863A",background:"#FDF6EC",color:"#A8863A",cursor:"pointer",fontFamily:"inherit"}}>
                          + Aggiungi spesa qui
                        </button>
                      </div>
                    </div>}
                  </div>);
                })}
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
          {tab==="Break Even"&&!isBroker&&myAgentId&&(()=>{
            const ag=agenti.find(a=>a.id===myAgentId);
            const mieVoci=costiAgente[myAgentId]?.[costiAgenteAnno]||mkCostiAgente();
            const prevAnnuoVoceAg=v=>{const p=Number(v.prevMensile||0);const f=v.frequenza||"mensile";return p*(f==="mensile"?12:f==="trimestrale"?4:f==="semestrale"?2:1);};
            const totSpeseVoceAg=v=>(v.spese||[]).reduce((s,x)=>s+Number(x.importo||0),0);
            const totPrevAnno=mieVoci.reduce((s,v)=>s+prevAnnuoVoceAg(v),0);
            const totConsuntivo=mieVoci.reduce((s,v)=>s+totSpeseVoceAg(v),0);
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


          {tab==="Fatture Agente"&&!isBroker&&myAgentId&&(()=>{
            const ag=agenti.find(a=>a.id===myAgentId);
            // Tutte le pratiche dove l'agente ha un ruolo e ha incassato qualcosa
            const tuttiMiei=venduti.filter(v=>{
              const hasRuolo=Number(v.agenteListing)===myAgentId||Number(v.agenteAcquirente)===myAgentId||Number(v.buyerListing)===myAgentId||Number(v.buyer)===myAgentId;
              if(!hasRuolo) return false;
              return true;
            }).sort((a,b)=>(b.dataVendita||b.dataAtto||"").localeCompare(a.dataVendita||a.dataAtto||""));

            const anniMioFat=Array.from(new Set(tuttiMiei.map(v=>getAnno(dataCompAgenzia(v))).filter(Boolean))).sort().reverse();
            const mesiMioFat=Array.from(new Set(tuttiMiei.filter(v=>mioFatAnno==="Tutti"||getAnno(dataCompAgenzia(v))===mioFatAnno).map(v=>getMese(dataCompAgenzia(v))).filter(Boolean))).sort().reverse();

            // Stato pagamento agente — cerca con chiave numerica e stringa
            const getPagAg=v=>{
              const key=`${v.id}_${Number(myAgentId)}`;
              const raw=pagamentiFatture[key]||{stato:"Da pagare",importoPagato:0,dataPagamento:""};
              // Normalizza "Pagato parzialmente" → "Parziale"
              return {...raw, stato:normStatoPag(raw.stato)};
            };

            const myFatDati=tuttiMiei.filter(v=>{
              const dataRif=dataCompAgenzia(v);
              if(mioFatAnno!=="Tutti"&&getAnno(dataRif)!==mioFatAnno) return false;
              if(mioFatMese!=="Tutti"&&getMese(dataRif)!==mioFatMese) return false;
              if(mioFatStato!=="Tutti"){
                const pag=getPagAg(v); // già normalizzato da normStatoPag
                if(pag.stato!==mioFatStato) return false;
              }
              return true;
            });

            // Quota TOTALE maturata (su provv totale — quello che spetta all'agente)
            const calcolaQuotaMiaTot=(v)=>{
              let q=0;
              if(Number(v.agenteListing)===myAgentId) q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
              if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId) q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;
              if(Number(v.agenteAcquirente)===myAgentId) q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
              if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId) q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;
              return q;
            };

            // KPI basati su pagamento AGENZIA → AGENTE (pagamentiFatture)
            // "Pagato" = agenzia ha già pagato l'agente
            const totFatture=tuttiMiei.reduce((s,v)=>s+calcolaQuotaMiaTot(v),0);

            // Già pagato dall'agenzia all'agente (usa getPagAg)
            const totPagatoAgente=tuttiMiei.reduce((s,v)=>{
              const pag=getPagAg(v);
              if(pag.stato==="Pagato") return s+calcolaQuotaMiaTot(v);
              if(pag.stato==="Parziale") return s+Number(pag.importoPagato||0);
              return s;
            },0);
            const totDaPagare=Math.max(0,totFatture-totPagatoAgente);
            const totTransazioni=tuttiMiei.reduce((s,v)=>{
              let n=0;
              if(Number(v.agenteListing)===myAgentId&&Number(v.provvVenditore||0)>0&&!v.agenziaEsterna) n++;
              if(Number(v.agenteAcquirente)===myAgentId&&Number(v.provvAcquirente||0)>0) n++;
              if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId&&Number(v.provvVenditore||0)>0) n++;
              if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId&&Number(v.provvAcquirente||0)>0) n++;
              return s+n;
            },0);
            const cfgStatoFat={
              "Pagato":{bg:"#E9F7EF",clr:"#27AE60",s:"✅"},
              "Parziale":{bg:"#FEF0E0",clr:"#E67E22",s:"⏳"},
              "Pagato parzialmente":{bg:"#FEF0E0",clr:"#E67E22",s:"⏳"},
              "Da pagare":{bg:"#FDECEA",clr:"#E74C3C",s:"🔴"},
            };

            return(
              <div style={S.sec}>
                <div style={{marginBottom:"1rem"}}>
                  <h2 style={{fontSize:16,fontWeight:600,margin:"0 0 2px",color:BRAND.grigio}}>🧾 Le mie fatture — {ag?.nome} {ag?.cognome}</h2>
                  <p style={{fontSize:11,color:"#aaa",margin:0}}>Quota provvigionale maturata · stato pagamento <strong>Agenzia → Agente</strong></p>
                </div>
                {/* Filtri */}
                <div style={S.fRow}>
                  <Sel value={mioFatAnno} onChange={v=>{setMioFatAnno(v);setMioFatMese("Tutti");}}>
                    <option value="Tutti">Tutti gli anni</option>{anniMioFat.map(a=><option key={a}>{a}</option>)}
                  </Sel>
                  <Sel value={mioFatMese} onChange={setMioFatMese}>
                    <option value="Tutti">Tutti i mesi</option>{mesiMioFat.map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}
                  </Sel>
                  <Sel value={mioFatStato} onChange={setMioFatStato}>
                    <option value="Tutti">Tutti gli stati</option>
                    <option value="Da pagare">🔴 Da pagare</option>
                    <option value="Parziale">⏳ Pagato parzialmente</option>
                    <option value="Pagato">✅ Pagato</option>
                  </Sel>
                </div>
                {/* KPI — 3 box: Agenzia→Agente */}
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10,marginBottom:"1.25rem"}}>
                  <div style={S.card(BRAND.oroD)}>
                    <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Quota totale maturata</p>
                    <p style={{fontSize:22,fontWeight:600,margin:0,color:BRAND.oroD}}>€ {fmt(totFatture)}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>{totTransazioni} transazioni · ciò che ti spetta</p>
                  </div>
                  <div style={S.card("#27AE60")}>
                    <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Pagato dall'agenzia</p>
                    <p style={{fontSize:22,fontWeight:600,margin:0,color:"#27AE60"}}>€ {fmt(totPagatoAgente)}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>{tuttiMiei.filter(v=>{const p=getPagAg(v);return p.stato==="Pagato"||p.stato==="Parziale";}).length} trans. pagate/parziali</p>
                  </div>
                  <div style={S.card(totDaPagare>0?"#E74C3C":"#27AE60")}>
                    <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Da pagare dall'agenzia</p>
                    <p style={{fontSize:22,fontWeight:600,margin:0,color:totDaPagare>0?"#E74C3C":"#27AE60"}}>€ {fmt(totDaPagare)}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>{tuttiMiei.filter(v=>getPagAg(v).stato==="Da pagare").length} trans. in attesa</p>
                  </div>
                </div>
                {(mioFatAnno!=="Tutti"||mioFatMese!=="Tutti"||mioFatStato!=="Tutti")&&<div style={{fontSize:12,color:"#888",marginBottom:"0.75rem",padding:"6px 12px",background:"#f5f5f5",borderRadius:6}}>Filtro attivo · {myFatDati.length} transazioni · <strong style={{color:BRAND.oroD}}>€ {fmt(myFatDati.reduce((s,v)=>s+calcolaQuotaMiaTot(v),0))}</strong></div>}
                {myFatDati.length===0&&<div style={{textAlign:"center",padding:"3rem",color:"#bbb"}}>Nessuna pratica nel periodo / stato selezionato</div>}
                {myFatDati.map((v,i)=>{
                  const ruoli=[];
                  if(Number(v.agenteListing)===myAgentId) ruoli.push({tipo:"Listing",provvTot:Number(v.provvVenditore||0),provvInc:calcolaIncassatoV(v),perc:Number(v.percListing||0),quotaTot:Number(v.provvVenditore||0)*Number(v.percListing||0)/100,quotaInc:calcolaIncassatoV(v)*Number(v.percListing||0)/100,cliente:v.nominativoVenditore});
                  if(Number(v.agenteAcquirente)===myAgentId) ruoli.push({tipo:"Acquirente",provvTot:Number(v.provvAcquirente||0),provvInc:calcolaIncassatoA(v),perc:Number(v.percAcquirente||0),quotaTot:Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100,quotaInc:calcolaIncassatoA(v)*Number(v.percAcquirente||0)/100,cliente:v.nomeAcquirente});
                  if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId) ruoli.push({tipo:"Buyer L",provvTot:Number(v.provvVenditore||0),provvInc:calcolaIncassatoV(v),perc:Number(v.percBuyerListing||0),quotaTot:Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100,quotaInc:calcolaIncassatoV(v)*Number(v.percBuyerListing||0)/100,cliente:v.nominativoVenditore});
                  if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId) ruoli.push({tipo:"Buyer",provvTot:Number(v.provvAcquirente||0),provvInc:calcolaIncassatoA(v),perc:Number(v.percBuyer||0),quotaTot:Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100,quotaInc:calcolaIncassatoA(v)*Number(v.percBuyer||0)/100,cliente:v.nomeAcquirente});
                  const totPraticaTot=ruoli.reduce((s,r)=>s+r.quotaTot,0);
                  const totPraticaInc=ruoli.reduce((s,r)=>s+r.quotaInc,0);
                  const statoInc=calcolaStatoIncasso(v);
                  const cfgInc=STATI_INCASSO[statoInc]||STATI_INCASSO["Da incassare"];
                  const pag=getPagAg(v);
                  const cfgPag=cfgStatoFat[pag.stato]||cfgStatoFat["Da pagare"];
                  if(totPraticaTot===0) return null;
                  return(<div key={v.id} style={{border:`0.5px solid ${cfgInc.clr}33`,borderRadius:8,padding:"1rem",marginBottom:"0.75rem",background:"#fff"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:6}}>
                      <div>
                        <p style={{fontSize:14,fontWeight:500,margin:"0 0 2px"}}>{i+1}. {v.comuneImmobile} — {v.indirizzoImmobile}</p>
                        <p style={{fontSize:12,color:"#aaa",margin:0}}>Competenza: <strong style={{color:BRAND.oroD}}>{fmtD(dataCompAgenzia(v))}</strong>{v.dataAtto?` · Rogito: ${fmtD(v.dataAtto)}`:""} · Prezzo: <strong style={{color:BRAND.oroD}}>€ {fmtN(v.prezzoVendita)}</strong></p>
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                        <span style={{fontSize:11,padding:"3px 9px",borderRadius:4,background:cfgInc.bg,color:cfgInc.clr,fontWeight:500}}>🏢 {cfgInc.s} {calcolaStatoIncasso(v)}</span>
                        <span style={{fontSize:11,padding:"3px 9px",borderRadius:4,background:cfgPag.bg,color:cfgPag.clr,fontWeight:500}}>{cfgPag.s} {pag.stato}</span>
                        {pag.dataPagamento&&<span style={{fontSize:11,color:"#aaa"}}>Pagato {fmtD(pag.dataPagamento)}</span>}
                      </div>
                    </div>
                    {ruoli.filter(r=>r.quotaTot>0).map((r,j)=>(<div key={j} style={{background:BRAND.beige,borderRadius:6,border:"0.5px solid #e8e5e0",padding:"8px 12px",marginBottom:6}}>
                      <p style={{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",margin:"0 0 4px"}}>{r.tipo}</p>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2}}><span style={{color:"#888"}}>Cliente</span><span style={{fontWeight:500}}>{r.cliente}</span></div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2}}><span style={{color:"#888"}}>Provv. agenzia (tot/inc.)</span><span>€ {fmt(r.provvTot)} / € {fmt(r.provvInc)}</span></div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:r.quotaTot!==r.quotaInc?2:0}}><span style={{color:"#888"}}>Quota totale ({r.perc}%)</span><span style={{fontWeight:600,color:BRAND.oroD}}>€ {fmt(r.quotaTot)}</span></div>
                      {r.quotaTot!==r.quotaInc&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:"#888"}}>di cui incassata</span><span style={{fontWeight:500,color:"#27AE60"}}>€ {fmt(r.quotaInc)}</span></div>}
                    </div>))}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                      <span style={{fontSize:12,color:"#888"}}>Subtotale: <strong style={{color:BRAND.oroD}}>€ {fmt(totPraticaTot)}</strong></span>
                      {totPraticaTot!==totPraticaInc&&<span style={{fontSize:12,color:"#27AE60"}}>Incassata: <strong>€ {fmt(totPraticaInc)}</strong> · Da inc.: <strong style={{color:"#E67E22"}}>€ {fmt(totPraticaTot-totPraticaInc)}</strong></span>}
                    </div>
                  </div>);
                })}
              </div>
            );
          })()}

          {/* OPERATIVITÀ */}
          {tab==="Operatività"&&(()=>{
            // Agente corrente (broker vede tutti, agente vede solo sé)
            const agentiVisibili = isBroker ? agenti : agenti.filter(a=>a.id===myAgentId);
            const agIdSel = isBroker ? (opAgenteSel==="Tutti"?null:Number(opAgenteSel)) : myAgentId;

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
                  {[{v:"settimana",l:"📆 Settimana"},{v:"inserimento",l:"✏️ Inserimento"},{v:"report",l:"📊 Report mensile"},{v:"obiettivi",l:"🎯 Obiettivi"}].map(o=>(
                    <button key={o.v} onClick={()=>setOpSubTab(o.v)} style={{padding:"6px 16px",fontSize:13,cursor:"pointer",border:"none",background:"none",borderBottom:`2px solid ${opSubTab===o.v?"#A8863A":"transparent"}`,color:opSubTab===o.v?"#A8863A":"#666",fontWeight:opSubTab===o.v?600:400,fontFamily:"inherit"}}>
                      {o.l}
                    </button>
                  ))}
                </div>

                {/* ── VISTA SETTIMANA ── */}
                {opSubTab==="settimana"&&(<>
                  <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center",flexWrap:"wrap"}}>
                    <input type="date" style={{...S.sel}} value={opDataSel} onChange={e=>setOpDataSel(e.target.value)}/>
                    {isBroker&&<select style={S.sel} value={opAgenteSel} onChange={e=>setOpAgenteSel(e.target.value)}>
                      <option value="Tutti">Tutti gli agenti</option>
                      {agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}
                    </select>}
                    <span style={{fontSize:12,color:"#aaa"}}>{fmtD(lunedi)} – {fmtD(sabato)}</span>
                  </div>

                  {/* Vista agente singolo */}
                  {(opAgenteSel!=="Tutti"||!isBroker)&&(()=>{
                    const agId = isBroker?Number(opAgenteSel):myAgentId;
                    const ag = agenti.find(a=>a.id===agId);
                    if(!ag) return <p style={{color:"#aaa"}}>Seleziona un agente</p>;
                    return(<>
                      <div style={{...S2.card,marginBottom:"1rem"}}>
                        <p style={S2.sec}>Settimana — {ag.nome} {ag.cognome}</p>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
                          {settimana.map((d,i)=>{
                            const g=getGiornata(agId,d);
                            const int=intensita(agId,d);
                            const cfg=INT_CFG[int];
                            const isSab=i===5;
                            const isOggi=d===todayStr();
                            return(<div key={d} style={{background:cfg.bg,borderRadius:8,padding:"8px 10px",border:isOggi?"2px solid #A8863A":isSab?"1.5px solid #D85A30":"0.5px solid #e8e5e0",cursor:"pointer"}} onClick={()=>{setOpDataSel(d);setOpSubTab("inserimento");}}>
                              <div style={{fontSize:10,fontWeight:600,color:isSab?"#D85A30":isOggi?"#A8863A":cfg.clr,marginBottom:4}}>{fmtGg(d)}{isSab?" 🏠":""}</div>
                              {int==="vuoto"?<span style={{fontSize:10,color:"#ccc",fontStyle:"italic"}}>vuoto</span>:(<>
                                {g.chiamate>0&&<div style={{fontSize:10,color:cfg.clr}}>📞 {g.chiamate}</div>}
                                {g.appuntamenti>0&&<div style={{fontSize:10,color:cfg.clr}}>🤝 {g.appuntamenti}</div>}
                                {(g.ohImmobili||[]).length>0&&<div style={{fontSize:10,color:"#D85A30"}}>🏠 OH</div>}
                              </>)}
                            </div>);
                          })}
                        </div>
                      </div>
                    </>);
                  })()}

                  {/* Vista team (broker - tutti) */}
                  {isBroker&&opAgenteSel==="Tutti"&&(<div style={S2.card}>
                    <p style={S2.sec}>Team — settimana {fmtD(lunedi)} / {fmtD(sabato)}</p>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:520}}>
                        <thead><tr style={{background:"#fafaf8"}}>
                          {["Agente","Giorni","Chiamate","Appt.","OH","Acquisiz.","Post"].map(h=><th key={h} style={{...S.th,fontSize:11}}>{h}</th>)}
                        </tr></thead>
                        <tbody>{agenti.map(ag=>{
                          const totGiorni = settimana.filter(d=>intensita(ag.id,d)!=="vuoto").length;
                          const sum = k => settimana.reduce((s,d)=>s+Number(getGiornata(ag.id,d)[k]||0),0);
                          const ohN = settimana.reduce((s,d)=>s+(getGiornata(ag.id,d).ohImmobili||[]).length,0);
                          const clrGg = totGiorni===6?"#27AE60":totGiorni>=4?"#D4AC0D":"#E74C3C";
                          return(<tr key={ag.id} style={{borderBottom:"0.5px solid #f5f5f5"}}>
                            <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,#C9A96E,#A8863A)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{ag.nome.charAt(0)}</div>{ag.nome} {ag.cognome}</div></td>
                            <td style={{...S.tdC}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:clrGg+"22",color:clrGg,fontWeight:600}}>{totGiorni}/6</span></td>
                            <td style={{...S.tdC,fontWeight:500,color:"#185FA5"}}>{sum("chiamate")||"—"}</td>
                            <td style={{...S.tdC,color:"#633806"}}>{sum("appuntamenti")||"—"}</td>
                            <td style={{...S.tdC,color:"#D85A30"}}>{ohN||"—"}</td>
                            <td style={{...S.tdC,color:"#533AB7"}}>{sum("acquisizioni")||"—"}</td>
                            <td style={{...S.tdC,color:"#3B6D11"}}>{sum("postSocial")||"—"}</td>
                          </tr>);
                        })}</tbody>
                      </table>
                    </div>
                  </div>)}

                  {/* ── OBIETTIVO DEL GIORNO ── */}
                  {(()=>{
                    const agentiProd5=agenti.filter(a=>a.inReport!==false&&["Broker","Consulente","Collaboratore"].includes(a.profilo));
                    const agIdOggi=isBroker?(Number(opAgenteSel==="Tutti"?agentiProd5[0]?.id:opAgenteSel)||agentiProd5[0]?.id):myAgentId;
                    if(!agIdOggi) return null;
                    const oggi5=todayStr();
                    const opAg5=operativita[agIdOggi]||operativita[String(agIdOggi)]||{};
                    const gOggi=opAg5[oggi5]||{};
                    const obAg5=(obiettivoAgente[agIdOggi])||{};
                    const obChSett=Number(obAg5.chiamate||0);
                    const obChDay=obChSett>0?Math.round(obChSett/5):0;
                    const obApptSett=Number(obAg5.appuntamenti||0);
                    const obApptDay=obApptSett>0?Math.round(obApptSett/5):0;
                    const obSocDay=Number(obAg5.postSocial||0);
                    const ct=gOggi.chiamate_tipi||{};
                    const chOggi=Object.values(ct).reduce((s,v)=>s+Number(v||0),0);
                    const apptOggi=Number(gOggi.appuntamenti||0);
                    const acqOggi=incarichi.filter(i=>Number(i.agenteListing)===agIdOggi&&i.dataInizio===oggi5).length;
                    const socialOggi=Number(gOggi.postSocial||0);
                    const visitOggi=Number(gOggi.immVisitati||0);
                    const agNome5=agenti.find(a=>a.id===agIdOggi);
                    const GNOMI=["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
                    const giornoNome=GNOMI[new Date(oggi5).getDay()];
                    const totOb=[obChDay,obApptDay].filter(o=>o>0).length;
                    const totOk=[obChDay>0&&chOggi>=obChDay,obApptDay>0&&apptOggi>=obApptDay].filter(Boolean).length;
                    const msg=totOb===0?"Imposta gli obiettivi nel Piano Produzione per vedere i progressi":
                      totOk===totOb?"🔥 Tutti gli obiettivi del giorno raggiunti! Ottimo lavoro!":
                      chOggi>0||apptOggi>0?"💪 Stai andando bene — continua così!":
                      "🎯 Inizia la giornata — registra le tue attività!";
                    const sC={background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"14px 16px"};
                    const sL={fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 4px"};
                    return(<div style={{marginTop:"1.5rem"}}>
                      <p style={{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 10px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span>⚡ Obiettivo del giorno</span>
                        <span style={{fontWeight:400,color:"#888",textTransform:"none",letterSpacing:0}}>— {giornoNome} {fmtD(oggi5)}</span>
                        {isBroker&&agNome5&&<span style={{fontWeight:400,color:"#aaa",textTransform:"none",letterSpacing:0,marginLeft:"auto"}}>{agNome5.nome} {agNome5.cognome||""}</span>}
                      </p>
                      {(()=>{
                        const oreRicOggi=Number(gOggi.oreRicerca||0);
                        const notizieOggi=Number(gOggi.notizie||0);
                        const volantiniOggi=Number(gOggi.volantini||0);
                        const obOreRic=Number(obAg5.oreRicerca||0);
                        const obNotizie=Number(obAg5.notizie||0);
                        const obVolantini=Number(obAg5.volantini||0);
                        const items=[
                          ["📞 Chiamate",chOggi,obChDay,"#533AB7"],
                          ["🤝 Appt. acq.",apptOggi,obApptDay,"#A8863A"],
                          ["🏠 Acquisizioni",acqOggi,0,"#0F6E56"],
                          ["👁 Imm. visitati",visitOggi,0,"#185FA5"],
                          ["⏱ Ore ricerca",oreRicOggi,obOreRic,"#854F0B"],
                          ["📱 Post/Video",socialOggi,obSocDay,"#8E44AD"],
                          ["📰 Notizie",notizieOggi,obNotizie,"#2980B9"],
                          ["✉️ Volantini",volantiniOggi,obVolantini,"#D35400"],
                        ];
                        return(<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr 1fr":"repeat(8,1fr)",gap:8,marginBottom:"1rem"}}>
                          {items.map(([lbl,val,obj,clr])=>{
                            const perc=obj>0?Math.min(100,Math.round(val/obj*100)):null;
                            const ok=obj>0&&val>=obj;
                            return(<div key={lbl} style={{background:"#fff",borderRadius:8,border:"0.5px solid #e8e5e0",borderTop:`3px solid ${ok?"#27AE60":clr}`,padding:"8px 6px",textAlign:"center",position:"relative"}}>
                              {ok&&<span style={{position:"absolute",top:3,right:5,fontSize:10}}>✅</span>}
                              <p style={{fontSize:9,color:"#888",textTransform:"uppercase",letterSpacing:".05em",margin:"0 0 3px",lineHeight:1.2}}>{lbl}</p>
                              <p style={{fontSize:24,fontWeight:700,color:ok?"#27AE60":clr,margin:"2px 0",lineHeight:1}}>{val}</p>
                              {obj>0&&<><div style={{height:3,background:"#f0f0f0",borderRadius:2,overflow:"hidden",margin:"3px 0 2px"}}><div style={{height:"100%",width:perc+"%",background:ok?"#27AE60":perc>=70?"#E67E22":clr,borderRadius:2}}/></div><p style={{fontSize:9,color:ok?"#27AE60":"#aaa",margin:0}}>{perc}%</p></>}
                              {obj===0&&<p style={{fontSize:9,color:"#ddd",margin:"2px 0 0"}}>—</p>}
                            </div>);
                          })}
                        </div>);
                      })()}
                      <div style={{...sC,display:"flex",alignItems:"center",gap:12,borderLeft:`4px solid ${totOk===totOb&&totOb>0?"#27AE60":"#A8863A"}`}}>
                        <span style={{fontSize:22}}>{totOk===totOb&&totOb>0?"🏆":"💡"}</span>
                        <p style={{fontSize:13,color:"#2c2c2c",margin:0,fontWeight:500}}>{msg}</p>
                      </div>
                      {/* Obiettivi giornalieri manuali */}
                      {!isReadOnly&&<div style={{...sC,marginTop:10}}>
                        <p style={{fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Imposta obiettivo giornaliero</p>
                        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8}}>
                          {[["📞 Chiamate","chiamate","#533AB7"],["🤝 Appt. acq.","appuntamenti","#A8863A"],["📱 Post/Video","postSocial","#8E44AD"],["⏱ Ore ricerca","oreRicerca","#854F0B"],["📰 Notizie","notizie","#2980B9"],["✉️ Volantini","volantini","#D35400"]].map(([lbl,k,clr])=>{
                            const cur=Number(obAg5[k]||0);
                            const set=(v)=>setObiettivoAgente(prev=>({...prev,[agIdOggi]:{...(prev[agIdOggi]||{}),[k]:Math.max(0,v)}}));
                            return(<div key={k} style={{background:"#fafaf8",borderRadius:8,padding:"8px 10px",border:"0.5px solid #eee"}}>
                              <p style={{fontSize:9,color:clr,textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 5px",fontWeight:600}}>{lbl}</p>
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                <button onClick={()=>set(cur-1)} style={{width:24,height:24,borderRadius:5,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:14,lineHeight:1}}>−</button>
                                <input type="number" min="0" style={{flex:1,textAlign:"center",fontSize:16,fontWeight:700,color:clr,border:"none",background:"transparent",outline:"none",fontFamily:"inherit"}}
                                  value={cur||""} placeholder="0"
                                  onChange={e=>set(Number(e.target.value))}/>
                                <button onClick={()=>set(cur+1)} style={{width:24,height:24,borderRadius:5,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:14,lineHeight:1}}>+</button>
                              </div>
                            </div>);
                          })}
                        </div>
                      </div>}
                    </div>);
                  })()}
                </>)}

                {/* ── INSERIMENTO GIORNATA ── */}
                {opSubTab==="inserimento"&&(<>
                  <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center",flexWrap:"wrap"}}>
                    {/* Toggle giorno/settimana */}
                    <div style={{display:"flex",background:"#f0f0f0",borderRadius:7,padding:3,gap:2}}>
                      {[["giorno","📅 Giorno"],["settimana","📆 Settimana"]].map(([v,l])=>(
                        <button key={v} onClick={()=>setOpModoInserimento(v)} style={{padding:"4px 12px",fontSize:11,borderRadius:5,border:"none",background:opModoInserimento===v?"#fff":"transparent",color:opModoInserimento===v?"#A8863A":"#888",fontWeight:opModoInserimento===v?600:400,cursor:"pointer",fontFamily:"inherit",boxShadow:opModoInserimento===v?"0 1px 3px rgba(0,0,0,.1)":"none"}}>{l}</button>
                      ))}
                    </div>
                    <input type="date" style={S.sel} value={opDataSel} onChange={e=>setOpDataSel(e.target.value)}/>
                    {isBroker&&<select style={S.sel} value={opAgenteSel} onChange={e=>setOpAgenteSel(e.target.value)}>
                      <option value="Tutti">Tutti gli agenti</option>
                      {agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}
                    </select>}
                    <span style={{fontSize:12,padding:"4px 10px",borderRadius:6,background:"#FEF9E7",color:"#A8863A",border:"0.5px solid #C9A96E"}}>
                      {opModoInserimento==="giorno"?fmtD(opDataSel):`Settimana dal ${fmtD(lunedi)} al ${fmtD(sabato)}`}{new Date(opDataSel).getDay()===6?" — Sabato 🏠":""}
                    </span>
                  </div>
                  {opModoInserimento==="giorno"&&(()=>{
                    const agId=isBroker?(Number(opAgenteSel==="Tutti"?agenti[0]?.id:opAgenteSel)||agenti[0]?.id):myAgentId;
                    if(!agId) return null;
                    return <FormGiornata agId={agId} data={opDataSel}/>;
                  })()}
                  {opModoInserimento==="settimana"&&(()=>{
                    const agId=isBroker?(Number(opAgenteSel==="Tutti"?agenti[0]?.id:opAgenteSel)||agenti[0]?.id):myAgentId;
                    if(!agId) return null;
                    const giorniSett=Array.from({length:6},(_,i)=>{const d=new Date(lunedi);d.setDate(d.getDate()+i);return d.toISOString().slice(0,10);});
                    const nomG=["Lun","Mar","Mer","Gio","Ven","Sab"];
                    // Totali settimana dai dati esistenti
                    const totSett={};
                    giorniSett.forEach(d=>{
                      const g=operativita[agId]?.[d]||{};
                      const ct=g.chiamate_tipi||{};
                      ["centri_inf","clienti_pass","freddo","zona_vol","privati","followup"].forEach(k=>{
                        totSett[k]=(totSett[k]||0)+Number(ct[k]||0);
                      });
                      ["appuntamenti","valutazioni","immVisitati","apptAcq","ohNum","propPresentate","preliminari","rogiti","postSocial","video","stories","oreTel","oreZona","oreSviluppo","oreAmm"].forEach(k=>{
                        totSett[k]=(totSett[k]||0)+Number(g[k]||0);
                      });
                    });
                    // Stato locale per il form massivo
                    const formSett={...totSett,...opFormSett};
                    const setFormSett=setOpFormSett;
                    const updS=(k,delta)=>setOpFormSett(p=>({...totSett,...p,[k]:Math.max(0,(Number({...totSett,...p}[k]||0))+delta)}));

                    const salvaSett=()=>{
                      const ggLav=giorniSett.filter((_,i)=>i<5);
                      const d5=(tot,i)=>{const n=Number(tot||0);return Math.floor(n/5)+(i===4?n%5:0);};
                      ggLav.forEach((d,i)=>{
                        const ct={};
                        ["centri_inf","clienti_pass","freddo","zona_vol","privati","followup"].forEach(k=>{ct[k]=d5(formSett[k],i);});
                        const totCh=Object.values(ct).reduce((s,v)=>s+v,0);
                        const g={chiamate_tipi:ct,chiamate:totCh};
                        ["appuntamenti","valutazioni","immVisitati","apptAcq","propPresentate","preliminari","rogiti","postSocial","video","stories","oreTel","oreZona","oreSviluppo","oreAmm"].forEach(k=>{g[k]=d5(formSett[k],i);});
                        salvaGiornata(agId,d,g);
                      });
                      // OH va al sabato
                      if(Number(formSett.ohNum||0)>0) salvaGiornata(agId,giorniSett[5],{ohNum:Number(formSett.ohNum||0)});
                      alert("✓ Dati settimanali salvati!");
                    };
                    const Stepper2=({label,k,clr="#2c2c2c"})=>(
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"0.5px solid #f5f5f5"}}>
                        <span style={{fontSize:12,color:clr}}>{label}</span>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <button style={{width:28,height:28,borderRadius:5,border:"0.5px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:15,fontFamily:"inherit"}} onClick={()=>updS(k,-1)}>−</button>
                          <span style={{fontSize:14,fontWeight:600,minWidth:30,textAlign:"center"}}>{formSett[k]||0}</span>
                          <button style={{width:28,height:28,borderRadius:5,border:"0.5px solid #ddd",background:"#f5f5f5",cursor:"pointer",fontSize:15,fontFamily:"inherit"}} onClick={()=>updS(k,1)}>+</button>
                        </div>
                      </div>
                    );
                    return(<div>
                      {/* Header settimana */}
                      <div style={{background:"#fafaf8",borderRadius:10,padding:"10px 14px",marginBottom:10,border:"0.5px solid #e8e5e0",display:"flex",gap:6,flexWrap:"wrap"}}>
                        {giorniSett.map((d,i)=>{
                          const g=operativita[agId]?.[d]||{};
                          const hasData=Object.values(g).some(v=>Number(v||0)>0);
                          return(<div key={d} style={{flex:1,minWidth:40,textAlign:"center",padding:"6px 4px",background:hasData?"#E9F7EF":"#fff",borderRadius:6,border:`0.5px solid ${hasData?"#C0DD97":"#eee"}`}}>
                            <div style={{fontSize:9,color:"#aaa"}}>{nomG[i]}</div>
                            <div style={{fontSize:12,fontWeight:600,color:hasData?"#27AE60":"#aaa"}}>{new Date(d).getDate()}</div>
                            {hasData&&<div style={{fontSize:9,color:"#27AE60"}}>✓</div>}
                          </div>);
                        })}
                      </div>
                      <div style={{background:"#EAF4FB",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#2980B9"}}>
                        💡 Inserisci i <strong>totali settimanali</strong> — verranno distribuiti automaticamente sui giorni lavorativi (Lun-Ven)
                      </div>
                      {/* Form massivo completo */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                        {/* CHIAMATE */}
                        <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"12px 14px"}}>
                          <div style={{fontSize:11,fontWeight:600,color:"#185FA5",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>📞 Chiamate settimanali</div>
                          <Stepper2 label="Centri d'influenza" k="centri_inf"/>
                          <Stepper2 label="Clienti passati" k="clienti_pass"/>
                          <Stepper2 label="Privati" k="privati"/>
                          <Stepper2 label="Generica / Freddo" k="freddo"/>
                          <Stepper2 label="Zona post volantino" k="zona_vol"/>
                          <Stepper2 label="Follow-up notizie" k="followup"/>
                        </div>
                        {/* ACQUISIZIONE */}
                        <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"12px 14px"}}>
                          <div style={{fontSize:11,fontWeight:600,color:"#A8863A",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>🏠 Acquisizione</div>
                          <Stepper2 label="Appt. fissati" k="appuntamenti"/>
                          <Stepper2 label="Presentaz./Valutaz." k="valutazioni"/>
                          <Stepper2 label="Immobili visitati" k="immVisitati"/>
                          <Stepper2 label="Ore telefono" k="oreTel"/>
                          <Stepper2 label="Ore zona" k="oreZona"/>
                        </div>
                        {/* VENDITA */}
                        <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"12px 14px"}}>
                          <div style={{fontSize:11,fontWeight:600,color:"#533AB7",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>🤝 Vendita</div>
                          <Stepper2 label="Appt. acquirenti" k="apptAcq"/>
                          <Stepper2 label="OH effettuati" k="ohNum"/>
                          <Stepper2 label="Proposte presentate" k="propPresentate"/>
                          <Stepper2 label="Preliminari" k="preliminari"/>
                          <Stepper2 label="Rogiti" k="rogiti"/>
                        </div>
                        {/* SOCIAL + SVILUPPO */}
                        <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"12px 14px"}}>
                          <div style={{fontSize:11,fontWeight:600,color:"#3C3489",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>📱 Social</div>
                          <Stepper2 label="Post pubblicati" k="postSocial"/>
                          <Stepper2 label="Video" k="video"/>
                          <Stepper2 label="Stories / Reels" k="stories"/>
                          <div style={{fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8,marginTop:10}}>⏱ Ore</div>
                          <Stepper2 label="Ore sviluppo" k="oreSviluppo"/>
                          <Stepper2 label="Ore amministrativo" k="oreAmm"/>
                        </div>
                      </div>
                      <button style={{width:"100%",padding:11,background:"#A8863A",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"}} onClick={salvaSett}>
                        💾 Salva settimana e distribuisci sui giorni
                      </button>
                    </div>);
                  })()}
                </>)}

                {/* ── REPORT MENSILE ── */}
                {opSubTab==="report"&&(<>
                  <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center",flexWrap:"wrap"}}>
                    <input type="month" style={S.sel} value={opMeseSel} onChange={e=>setOpMeseSel(e.target.value)}/>
                    {isBroker&&<select style={S.sel} value={opAgenteSel} onChange={e=>setOpAgenteSel(e.target.value)}>
                      <option value="Tutti">Tutti gli agenti</option>
                      {agenti.filter(a=>["Broker","Consulente","Collaboratore"].includes(a.profilo)&&a.inReport!==false).map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}
                    </select>}
                  </div>

                  {/* Report agente singolo — agenti vedono sempre il proprio */}
                  {(!isBroker||(isBroker&&opAgenteSel!=="Tutti"))&&(()=>{
                    const agId=isBroker?Number(opAgenteSel):myAgentId;
                    if(!agId) return null;
                    const ag=agenti.find(a=>a.id===agId);
                    const r=calcReport(agId,opMeseSel);
                    const ob=(getObiettivi(agId,opMeseSel).approvati||getObiettivi(agId,opMeseSel).proposti)||{};
                    const perc=(v,k)=>ob[k]>0?Math.min(100,Math.round(v/ob[k]*100)):null;
                    const kpi=(lbl,val,obk,clr)=>{
                      const p=ob[obk]>0?Math.min(100,Math.round(Number(val)/ob[obk]*100)):null;
                      return(<div key={lbl} style={S2.kpi}>
                        <div style={{fontSize:10,color:"#888"}}>{lbl}</div>
                        <div style={{fontSize:18,fontWeight:500,color:clr,margin:"2px 0"}}>{val}</div>
                        {p!==null&&<><div style={{fontSize:10,color:"#aaa"}}>obj. {ob[obk]} · {p}%</div>{S2.bar(p,clr)}</>}
                      </div>);
                    };
                    const reportPropCount=Object.values(operativita[agId]||{}).reduce((s,g)=>s+((g.attImm||[]).filter(x=>x.reportProp).length),0);
                    const ribassiCount=Object.values(operativita[agId]||{}).reduce((s,g)=>s+((g.attImm||[]).filter(x=>x.ribasso).length),0);
                    return(<>
                      <div style={S2.card}>
                        <p style={S2.sec}>{ag?.nome} {ag?.cognome} — {opMeseSel}</p>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:"1rem"}}>
                          {kpi("Giorni compilati",r.giorniCompilati,"giorni","#185FA5")}
                          {kpi("Chiamate",r.chiamate,"chiamate","#3B6D11")}
                          {kpi("Appuntamenti",r.appuntamenti,"appuntamenti","#633806")}
                          {kpi("Acquisizioni",r.acquisizioni,"acquisizioni","#533AB7")}
                          {kpi("Proposte presentate",r.propPresentate,"propPresentate","#185FA5")}
                          {kpi("Proposte accettate",r.propAccettate,"propAccettate","#27AE60")}
                          {kpi("Preliminari",r.preliminari,"preliminari","#A8863A")}
                          {kpi("Open House",r.ohNum,"oh","#D85A30")}
                          {kpi("Report proprietari",reportPropCount,"reportProp","#A8863A")}
                          {kpi("Ribassi proposti",ribassiCount,"ribassi","#E74C3C")}
                        </div>
                        <p style={{...S2.sec,marginBottom:8}}>Distribuzione ore</p>
                        {[["Ricerca/acquisizione",r.oreRicerca,"#185FA5"],["Operativo/vendite",(r.immVisitati*0.5+r.valutazioni*1.5),"#633806"],["Open House",(r.ohNum*2),"#D85A30"],["Sviluppo",r.oreSviluppo,"#533AB7"],["Marketing",r.oreMarketing,"#3B6D11"],["Amministrativo",r.oreAmm,"#888780"]].map(([lbl,val,clr])=>{
                          const tot=r.oreRicerca+(r.immVisitati*0.5+r.valutazioni*1.5)+(r.ohNum*2)+r.oreSviluppo+r.oreMarketing+r.oreAmm||1;
                          const p=Math.round(val/tot*100);
                          return(<div key={lbl} style={{marginBottom:8}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{color:"#555"}}>{lbl}</span><span style={{fontWeight:500,color:clr}}>{val}h <span style={{color:"#aaa",fontWeight:400}}>({p}%)</span></span></div>
                            <div style={{height:6,background:"#f0f0f0",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:clr,borderRadius:3}}/></div>
                          </div>);
                        })}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:"1rem"}}>
                          <div style={S2.kpi}><div style={{fontSize:10,color:"#888"}}>Visite OH totali</div><div style={{fontSize:18,fontWeight:500,color:"#D85A30"}}>{r.ohVisite}</div></div>
                          <div style={S2.kpi}><div style={{fontSize:10,color:"#888"}}>Post social</div><div style={{fontSize:18,fontWeight:500,color:"#3B6D11"}}>{r.postSocial}</div></div>
                          <div style={S2.kpi}><div style={{fontSize:10,color:"#888"}}>Rogiti</div><div style={{fontSize:18,fontWeight:500,color:"#A8863A"}}>{r.rogiti}</div></div>
                        </div>
                      </div>
                    </>);
                  })()}

                  {/* Report team (broker - tutti) */}
                  {isBroker&&opAgenteSel==="Tutti"&&(<div style={S2.card}>
                    <p style={S2.sec}>Team — {opMeseSel}</p>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:580}}>
                        <thead><tr style={{background:"#fafaf8"}}>
                          {["Agente","Giorni","Chiamate","Appt.","Acq.","Prop.","Prelim.","OH","Post"].map(h=><th key={h} style={{...S.th,fontSize:11}}>{h}</th>)}
                        </tr></thead>
                        <tbody>{agenti.map(ag=>{
                          const r=calcReport(ag.id,opMeseSel);
                          return(<tr key={ag.id} style={{borderBottom:"0.5px solid #f5f5f5"}}>
                            <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,#C9A96E,#A8863A)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{ag.nome.charAt(0)}</div>{ag.nome} {ag.cognome}</div></td>
                            <td style={S.tdC}><span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:r.giorniCompilati>15?"#E9F7EF":r.giorniCompilati>8?"#FEF9E7":"#FDECEA",color:r.giorniCompilati>15?"#27AE60":r.giorniCompilati>8?"#D4AC0D":"#E74C3C",fontWeight:600}}>{r.giorniCompilati}</span></td>
                            <td style={{...S.tdC,color:"#185FA5",fontWeight:500}}>{r.chiamate||"—"}</td>
                            <td style={{...S.tdC,color:"#633806"}}>{r.appuntamenti||"—"}</td>
                            <td style={{...S.tdC,color:"#533AB7",fontWeight:500}}>{r.acquisizioni||"—"}</td>
                            <td style={{...S.tdC,color:"#27AE60"}}>{r.propAccettate||"—"}</td>
                            <td style={{...S.tdC,color:"#A8863A"}}>{r.preliminari||"—"}</td>
                            <td style={{...S.tdC,color:"#D85A30"}}>{r.ohNum||"—"}</td>
                            <td style={{...S.tdC,color:"#3B6D11"}}>{r.postSocial||"—"}</td>
                          </tr>);
                        })}</tbody>
                      </table>
                    </div>
                  </div>)}
                </>)}

                {/* ── OBIETTIVI ── */}
                {opSubTab==="obiettivi"&&(<>
                  <div style={{display:"flex",gap:8,marginBottom:"1.25rem",alignItems:"center",flexWrap:"wrap"}}>
                    <input type="month" style={S.sel} value={opMeseSel} onChange={e=>setOpMeseSel(e.target.value)}/>
                    {isBroker&&<select style={S.sel} value={opAgenteSel} onChange={e=>setOpAgenteSel(e.target.value)}>
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
                          <p style={{fontSize:12,color:"#888",margin:0}}>Obiettivi personali · {opMeseSel} · {isBroker?"imposta obiettivi per l'agente":"modifica i tuoi obiettivi"}</p>
                        </div>
                      </div>

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
                              value={ob[k]||""} placeholder="0"
                              onChange={e=>upd(k,e.target.value)}/>
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
                      {isBroker&&(<div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"1rem 1.25rem"}}>
                        <p style={{fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 12px"}}>Obiettivi team — {opMeseSel}</p>
                        <div style={{overflowX:"auto"}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:500}}>
                            <thead><tr style={{background:"#fafaf8"}}>
                              {["Agente","📞","🤝","🏠","🚪","📝","% media"].map(h=><th key={h} style={{...S.th,fontSize:11,textAlign:"center"}}>{h}</th>)}
                            </tr></thead>
                            <tbody>{agenti.map(a=>{
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
                    {/* ── SEZIONE ANNUALE ── */}
                    {(()=>{
                      const agId2=isBroker?(Number(opAgenteSel==="Tutti"?agenti[0]?.id:opAgenteSel)||agenti[0]?.id):myAgentId;
                      if(!agId2) return null;
                      const annoSel2=opMeseSel.slice(0,4);
                      const obAnn=(obiettivoAgente[agId2])||{};
                      const obFattAnn=Number(obAnn.fatturato||0);
                      const obAcqAnn=Number(obAnn.acquisizioni||0);
                      const obChSett=Number(obAnn.chiamate||0);
                      const obChAnn=obChSett*52;
                      // Calcola YTD
                      const oggi3=todayStr();
                      const dal3=`${annoSel2}-01-01`;
                      const al3=`${annoSel2}-12-31`;
                      const vendAg=venduti.filter(v=>{const dc=dataCompAgenzia(v);return(Number(v.agenteListing)===agId2||Number(v.agenteAcquirente)===agId2)&&dc>=dal3&&dc<=oggi3;});
                      const fattYTD=vendAg.reduce((s,v)=>{let p=0;if(Number(v.agenteListing)===agId2)p+=Number(v.provvVenditore||0);if(Number(v.agenteAcquirente)===agId2)p+=Number(v.provvAcquirente||0);return s+p;},0);
                      const acqYTD=incarichi.filter(i=>Number(i.agenteListing)===agId2&&i.dataInizio>=dal3&&i.dataInizio<=oggi3).length;
                      const opAg2=operativita[agId2]||operativita[String(agId2)]||{};
                      const ggYTD=Object.entries(opAg2).filter(([d])=>d>=dal3&&d<=oggi3);
                      const chYTD=ggYTD.reduce((s,[,g])=>{const ct=g.chiamate_tipi||{};return s+Object.values(ct).reduce((a,v2)=>a+Number(v2||0),0);},0);
                      const percF=obFattAnn>0?Math.min(100,Math.round(fattYTD/obFattAnn*100)):null;
                      const percA=obAcqAnn>0?Math.min(100,Math.round(acqYTD/obAcqAnn*100)):null;
                      const percC=obChAnn>0?Math.min(100,Math.round(chYTD/obChAnn*100)):null;
                      // Report mese per mese
                      const mesi=Array.from({length:12},(_,i)=>`${annoSel2}-${String(i+1).padStart(2,"0")}`);
                      const obMensile=obFattAnn>0?Math.round(obFattAnn/12):null;
                      return(<>
                        {/* Imposta obiettivi annuali agente */}
                        <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"1.25rem",marginTop:"1.5rem",marginBottom:"1rem"}}>
                          <div style={{fontSize:12,fontWeight:600,color:"#A8863A",textTransform:"uppercase",letterSpacing:".06em",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:4,height:16,borderRadius:2,background:"#A8863A"}}/>
                            Obiettivi annuali {annoSel2}
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                            {[["💰 Fatturato annuale","fatturato","€","es. 200000"],["🏠 Acquisizioni annuali","acquisizioni","","es. 24"],["📞 Chiamate / settimana","chiamate","","es. 40"]].map(([lbl,k,pre,ph])=>(
                              <div key={k} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 12px"}}>
                                <div style={{fontSize:11,color:"#888",marginBottom:6}}>{lbl}</div>
                                <div style={{display:"flex",alignItems:"center",gap:4}}>
                                  {pre&&<span style={{fontSize:13,color:"#888"}}>{pre}</span>}
                                  <input type="number" min="0" style={{width:"100%",fontSize:16,fontWeight:600,border:"none",background:"transparent",color:"#2c2c2c",outline:"none",fontFamily:"inherit"}}
                                    value={obAnn[k]||""} placeholder={ph}
                                    onChange={e=>setObiettivoAgente(prev=>({...prev,[agId2]:{...(prev[agId2]||{}),[k]:Number(e.target.value)}}))}/>
                                </div>
                                <div style={{fontSize:10,color:"#aaa",marginTop:4}}>
                                  {k==="fatturato"&&obFattAnn>0?`= € ${fmt(Math.round(obFattAnn/12))} / mese`:""}
                                  {k==="acquisizioni"&&obAcqAnn>0?`= ${Math.ceil(obAcqAnn/12)} / mese`:""}
                                  {k==="chiamate"&&obChSett>0?`= ${Math.round(obChSett/5)} / giorno lavorativo`:""}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* YTD vs obiettivo */}
                        <div style={{background:"#fff",borderRadius:12,border:"0.5px solid #e8e5e0",padding:"1.25rem",marginBottom:"1rem"}}>
                          <div style={{fontSize:12,fontWeight:600,color:"#0F6E56",textTransform:"uppercase",letterSpacing:".06em",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:4,height:16,borderRadius:2,background:"#0F6E56"}}/>
                            Produzione YTD — {annoSel2}
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                            {[
                              ["💰 Fatturato","€ "+fmt(fattYTD),"#0F6E56",percF,obFattAnn>0?"obj € "+fmt(obFattAnn):"Nessun obiettivo",obFattAnn>0?"mancano € "+fmt(Math.max(0,obFattAnn-fattYTD)):""],
                              ["🏠 Acquisizioni",acqYTD,"#185FA5",percA,obAcqAnn>0?"obj "+obAcqAnn:"Nessun obiettivo",obAcqAnn>0?"mancano "+(Math.max(0,obAcqAnn-acqYTD)):""],
                              ["📞 Chiamate YTD",chYTD,"#533AB7",percC,obChAnn>0?"obj "+obChAnn+" ann.":"Nessun obiettivo",obChAnn>0?"mancano "+(Math.max(0,obChAnn-chYTD)):""],
                            ].map(([lbl,val,clr,perc,sub,manca])=>(
                              <div key={lbl} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"12px",textAlign:"center"}}>
                                <div style={{fontSize:11,color:"#888",marginBottom:6}}>{lbl}</div>
                                <div style={{fontSize:22,fontWeight:600,color:clr}}>{val}</div>
                                {perc!=null&&<>
                                  <div style={{height:5,background:"#e0e0e0",borderRadius:3,overflow:"hidden",margin:"6px 0 3px"}}>
                                    <div style={{height:"100%",width:perc+"%",background:perc>=100?"#27AE60":perc>=70?"#E67E22":clr,borderRadius:3}}/>
                                  </div>
                                  <div style={{fontSize:10,color:perc>=100?"#27AE60":perc>=70?"#E67E22":"#888"}}>{perc}% — {manca}</div>
                                </>}
                                {perc==null&&<div style={{fontSize:10,color:"#aaa",marginTop:6}}>{sub}</div>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Report annuale mese per mese */}
                        <div style={{background:"#fff",borderRadius:12,border:"1px solid #e8e5e0",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
                          <div style={{padding:"12px 16px",borderBottom:"2px solid #533AB7",display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:4,height:18,borderRadius:2,background:"#533AB7",flexShrink:0}}/>
                            <span style={{fontSize:13,fontWeight:600,color:"#533AB7"}}>Report annuale {annoSel2} — mese per mese</span>
                            {obMensile>0&&<span style={{fontSize:11,color:"#aaa",marginLeft:"auto"}}>obj mensile: € {fmt(obMensile)}</span>}
                          </div>
                          <div style={{overflowX:"auto"}}>
                            <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                              <thead><tr style={{background:"#F4F1FA"}}>
                                <th style={{padding:"8px 14px",fontSize:11,fontWeight:600,color:"#533AB7",textAlign:"left",borderBottom:"2px solid #EEEDFE"}}>Mese</th>
                                <th style={{padding:"8px 12px",fontSize:11,fontWeight:600,color:"#533AB7",textAlign:"right",borderBottom:"2px solid #EEEDFE"}}>Fatturato</th>
                                <th style={{padding:"8px 12px",fontSize:11,fontWeight:600,color:"#533AB7",textAlign:"right",borderBottom:"2px solid #EEEDFE"}}>vs obj</th>
                                <th style={{padding:"8px 12px",fontSize:11,fontWeight:600,color:"#533AB7",textAlign:"right",borderBottom:"2px solid #EEEDFE"}}>Acq.</th>
                                <th style={{padding:"8px 12px",fontSize:11,fontWeight:600,color:"#533AB7",textAlign:"right",borderBottom:"2px solid #EEEDFE"}}>Chiam.</th>
                                <th style={{padding:"8px 14px",fontSize:11,fontWeight:600,color:"#533AB7",textAlign:"left",borderBottom:"2px solid #EEEDFE",minWidth:100}}>Progress</th>
                              </tr></thead>
                              <tbody>
                                {mesi.map((m,mIdx)=>{
                                  const isFut=m>oggi3.slice(0,7);
                                  const isCurr=m===oggi3.slice(0,7);
                                  const vAg=venduti.filter(v=>{const dc=dataCompAgenzia(v);return(Number(v.agenteListing)===agId2||Number(v.agenteAcquirente)===agId2)&&dc.startsWith(m);});
                                  const fM=vAg.reduce((s,v)=>{let p=0;if(Number(v.agenteListing)===agId2)p+=Number(v.provvVenditore||0);if(Number(v.agenteAcquirente)===agId2)p+=Number(v.provvAcquirente||0);return s+p;},0);
                                  const aM=incarichi.filter(i=>Number(i.agenteListing)===agId2&&i.dataInizio?.startsWith(m)).length;
                                  const cM=Object.entries(opAg2).filter(([d])=>d.startsWith(m)).reduce((s,[,g])=>{const ct=g.chiamate_tipi||{};return s+Object.values(ct).reduce((a,v2)=>a+Number(v2||0),0);},0);
                                  const percM=obMensile&&!isFut?Math.min(100,Math.round(fM/obMensile*100)):null;
                                  const MNOMI=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
                                  const clrPerc=percM===null?"#aaa":percM>=100?"#27AE60":percM>=70?"#E67E22":"#E74C3C";
                                  const bgPerc=percM===null?"transparent":percM>=100?"#E1F5EE":percM>=70?"#FEF3E2":"#FDECEC";
                                  return(<tr key={m} style={{borderBottom:"0.5px solid #EEEDFE",background:isCurr?"#F4F1FA":isFut?"transparent":"#fff"}}>
                                    <td style={{padding:"9px 14px",fontSize:12,fontWeight:isCurr?600:400,color:isFut?"#bbb":"#2c2c2c",borderLeft:isCurr?"3px solid #533AB7":"3px solid transparent"}}>
                                      {MNOMI[mIdx]}{isCurr&&<span style={{fontSize:10,marginLeft:6,padding:"1px 6px",borderRadius:6,background:"#533AB7",color:"#fff"}}>in corso</span>}
                                    </td>
                                    <td style={{padding:"9px 12px",fontSize:13,textAlign:"right",fontWeight:fM>0?500:400,color:isFut?"#bbb":fM>0?"#085041":"#ccc"}}>{isFut?"—":fM>0?"€ "+fmt(fM):"€ 0"}</td>
                                    <td style={{padding:"9px 12px",textAlign:"right"}}>
                                      {percM!==null?<span style={{fontSize:12,fontWeight:600,color:clrPerc,background:bgPerc,padding:"2px 8px",borderRadius:6}}>{percM}%</span>:<span style={{color:"#ccc",fontSize:12}}>—</span>}
                                    </td>
                                    <td style={{padding:"9px 12px",fontSize:13,textAlign:"right",color:isFut?"#bbb":aM>0?"#185FA5":"#ccc"}}>{isFut?"—":aM||"—"}</td>
                                    <td style={{padding:"9px 12px",fontSize:13,textAlign:"right",color:isFut?"#bbb":cM>0?"#533AB7":"#ccc"}}>{isFut?"—":cM||"—"}</td>
                                    <td style={{padding:"9px 14px"}}>
                                      {!isFut&&<div style={{display:"flex",alignItems:"center",gap:6}}>
                                        <div style={{flex:1,height:6,background:"#EEEDFE",borderRadius:3,overflow:"hidden",minWidth:60}}>
                                          <div style={{height:"100%",width:Math.min(100,percM||0)+"%",background:percM>=100?"#27AE60":percM>=70?"#E67E22":"#533AB7",borderRadius:3,transition:"width .3s"}}/>
                                        </div>
                                      </div>}
                                    </td>
                                  </tr>);
                                })}
                                {/* Totale anno */}
                                {(()=>{
                                  const totF=mesi.reduce((s,m)=>{if(m>oggi3.slice(0,7))return s;const vAg=venduti.filter(v=>{const dc=dataCompAgenzia(v);return(Number(v.agenteListing)===agId2||Number(v.agenteAcquirente)===agId2)&&dc.startsWith(m);});return s+vAg.reduce((a,v)=>{let p=0;if(Number(v.agenteListing)===agId2)p+=Number(v.provvVenditore||0);if(Number(v.agenteAcquirente)===agId2)p+=Number(v.provvAcquirente||0);return a+p;},0);},0);
                                  const totA=incarichi.filter(i=>Number(i.agenteListing)===agId2&&i.dataInizio?.startsWith(annoSel2)).length;
                                  const percTot=obFattAnn>0?Math.min(100,Math.round(totF/obFattAnn*100)):null;
                                  return(<tr style={{background:"#F4F1FA",borderTop:"2px solid #EEEDFE"}}>
                                    <td style={{padding:"10px 14px",fontSize:12,fontWeight:600,color:"#533AB7",borderLeft:"3px solid #533AB7"}}>Totale {annoSel2}</td>
                                    <td style={{padding:"10px 12px",fontSize:13,textAlign:"right",fontWeight:700,color:"#085041"}}>{"€ "+fmt(totF)}</td>
                                    <td style={{padding:"10px 12px",textAlign:"right"}}>{percTot!==null?<span style={{fontSize:12,fontWeight:700,color:percTot>=100?"#27AE60":percTot>=70?"#E67E22":"#E74C3C",background:percTot>=100?"#E1F5EE":percTot>=70?"#FEF3E2":"#FDECEC",padding:"2px 8px",borderRadius:6}}>{percTot}%</span>:<span style={{color:"#ccc",fontSize:12}}>—</span>}</td>
                                    <td style={{padding:"10px 12px",fontSize:13,textAlign:"right",fontWeight:600,color:"#185FA5"}}>{totA||"—"}</td>
                                    <td style={{padding:"10px 12px",fontSize:12,textAlign:"right",color:"#aaa"}}>YTD</td>
                                    <td style={{padding:"10px 14px"}}>
                                      {percTot!==null&&<div style={{display:"flex",alignItems:"center",gap:6}}>
                                        <div style={{flex:1,height:6,background:"#EEEDFE",borderRadius:3,overflow:"hidden",minWidth:60}}>
                                          <div style={{height:"100%",width:percTot+"%",background:percTot>=100?"#27AE60":percTot>=70?"#E67E22":"#533AB7",borderRadius:3}}/>
                                        </div>
                                      </div>}
                                    </td>
                                  </tr>);
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>);
                    })()}
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
                  {isBroker&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem",padding:"10px 14px",background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0"}}>
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
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:revisioni.length>0?"1rem":0}}>
                        <span style={{fontSize:12,color:"#888"}}>{revisioni.length===0?"Nessuna revisione registrata":revisioni.length+" revisioni"}</span>
                        {!isReadOnly&&<button onClick={()=>{
                          const motivo=prompt("Motivo della revisione:");
                          if(!motivo) return;
                          const nuovoOb=Number(prompt("Nuovo obiettivo fatturato €:"));
                          if(!nuovoOb) return;
                          const rev={data:oggi4,motivo,vecchio:obFattPiano,nuovo:nuovoOb};
                          setObiettivoAgente(prev=>({...prev,[agIdPiano]:{...(prev[agIdPiano]||{}),fatturato:nuovoOb,revisioni:[...(prev[agIdPiano]?.revisioni||[]),rev]}}));
                        }} style={{...S.btnP,fontSize:11,padding:"4px 14px"}}>+ Revisiona</button>}
                      </div>
                      {revisioni.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {revisioni.map((r,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,background:"#fafaf8",border:"0.5px solid #eee"}}>
                            <div style={{width:10,height:10,borderRadius:"50%",background:r.nuovo>r.vecchio?"#27AE60":"#E67E22",flexShrink:0}}/>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:500}}>{r.motivo}</div>
                              <div style={{fontSize:11,color:"#888"}}>{fmtD(r.data)} · da € {fmt(r.vecchio)} → € {fmt(r.nuovo)}</div>
                            </div>
                            <div style={{fontSize:14,fontWeight:700,color:r.nuovo>r.vecchio?"#27AE60":"#E67E22"}}>€ {fmt(r.nuovo)}</div>
                          </div>
                        ))}
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
            const anniMio=Array.from(new Set(venduti.map(v=>getAnno(v.dataVendita||v.dataAtto||"")).filter(Boolean))).sort().reverse();
            const mesiMio=Array.from(new Set(venduti.filter(v=>mioRepAnno==="Tutti"||getAnno(v.dataVendita||v.dataAtto||"")===mioRepAnno).map(v=>getMese(v.dataVendita||v.dataAtto||"")).filter(Boolean))).sort().reverse();
            const prat=venduti.filter(v=>{
              if(!(Number(v.agenteListing)===ag.id||Number(v.agenteAcquirente)===ag.id||Number(v.buyerListing)===ag.id||Number(v.buyer)===ag.id))return false;
              if(mioRepAnno!=="Tutti"&&getAnno(v.dataVendita||v.dataAtto||"")!==mioRepAnno)return false;
              if(mioRepMese!=="Tutti"&&getMese(v.dataVendita||v.dataAtto||"")!==mioRepMese)return false;
              return true;
            });
            const incAcq=incarichi.filter(i=>i.categoria==="vendita"&&i.agenteListing===ag.id&&(mioRepAnno==="Tutti"||getAnno(i.dataInizio)===mioRepAnno)).length;
            const nTV=prat.filter(v=>Number(v.agenteListing)===ag.id&&Number(v.provvVenditore||0)>0&&!v.agenziaEsterna).length;
            const nTA=prat.filter(v=>Number(v.agenteAcquirente)===ag.id&&Number(v.provvAcquirente||0)>0).length;
            const produzione=prat.reduce((s,v)=>{let p=0;if(Number(v.agenteListing)===ag.id)p+=Number(v.provvVenditore||0);if(Number(v.agenteAcquirente)===ag.id)p+=Number(v.provvAcquirente||0);return s+p;},0);
            const incassatoProd=prat.reduce((s,v)=>{let p=0;if(Number(v.agenteListing)===ag.id)p+=calcolaIncassatoV(v);if(Number(v.agenteAcquirente)===ag.id)p+=calcolaIncassatoA(v);return s+p;},0);
            const quotaAg=prat.reduce((s,v)=>{let q=0;if(Number(v.agenteListing)===ag.id)q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;if(Number(v.agenteAcquirente)===ag.id)q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;return s+q;},0);
            const quotaBuy=prat.reduce((s,v)=>{let q=0;if(Number(v.buyerListing)===ag.id&&Number(v.agenteListing)!==ag.id)q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;if(Number(v.buyer)===ag.id&&Number(v.agenteAcquirente)!==ag.id)q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;return s+q;},0);
            const colRuolo={"Listing":"#2980B9","Acquirente":"#8E44AD","Buyer L":"#E67E22","Buyer":"#E74C3C"};
            const ruoloInV=v=>{if(Number(v.agenteListing)===ag.id)return "Listing";if(Number(v.agenteAcquirente)===ag.id)return "Acquirente";if(Number(v.buyerListing)===ag.id)return "Buyer L";if(Number(v.buyer)===ag.id)return "Buyer";return "—";};
            const calcolaQuotaAg=v=>{let q=0;if(Number(v.agenteListing)===ag.id)q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;if(Number(v.agenteAcquirente)===ag.id)q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;if(Number(v.buyerListing)===ag.id&&Number(v.agenteListing)!==ag.id)q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;if(Number(v.buyer)===ag.id&&Number(v.agenteAcquirente)!==ag.id)q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;return q;};
            return(
              <div style={S.sec}>
                <div style={{marginBottom:"1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#fff",flexShrink:0}}>{ag.nome.charAt(0)}</div>
                    <div>
                      <h2 style={{fontSize:17,fontWeight:600,margin:"0 0 2px",color:BRAND.grigio}}>{ag.nome} {ag.cognome}</h2>
                      <p style={{fontSize:12,color:"#aaa",margin:0}}>{ag.profilo} · {incAcq} incarichi nel periodo</p>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <select style={{...S.sel}} value={mioRepAnno} onChange={e=>{setMioRepAnno(e.target.value);setMioRepMese("Tutti");}}><option value="Tutti">Tutti gli anni</option>{anniMio.map(a=><option key={a}>{a}</option>)}</select>
                    <select style={{...S.sel}} value={mioRepMese} onChange={e=>setMioRepMese(e.target.value)}><option value="Tutti">Tutti i mesi</option>{mesiMio.map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}</select>
                  </div>
                </div>
                {/* KPI — schema SchedaAgente */}
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(5,1fr)",gap:10,marginBottom:"1.25rem"}}>
                  {[
                    {l:"Incarichi",v:incAcq,c:"#4A90D9"},
                    {l:"N° Transazioni",v:`${nTV+nTA}`,sub:`${nTV}V · ${nTA}A`,c:BRAND.oroD},
                    {l:"Produzione Agente",v:`€ ${fmt(produzione)}`,sub:"Listing+Acq.",c:"#27AE60"},
                    {l:"Incassato",v:`€ ${fmt(incassatoProd)}`,sub:"Listing+Acq.",c:"#E67E22"},
                    {l:"Quota Ag.+Buyer",v:`€ ${fmt(quotaAg+quotaBuy)}`,sub:`Ag: € ${fmt(quotaAg)} · B: € ${fmt(quotaBuy)}`,c:"#8E44AD"},
                  ].map(({l,v,sub,c})=>(
                    <div key={l} style={{background:"#fff",borderRadius:8,border:"0.5px solid #e8e5e0",padding:"12px 14px",borderLeft:`3px solid ${c}`}}>
                      <p style={{fontSize:11,color:"#888",margin:"0 0 3px"}}>{l}</p>
                      <p style={{fontSize:16,fontWeight:600,margin:0,color:c}}>{v}</p>
                      {sub&&<p style={{fontSize:10,color:"#aaa",margin:"2px 0 0"}}>{sub}</p>}
                    </div>
                  ))}
                </div>
                {/* Tabella collassabile */}
                <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden"}}>
                  <div style={{padding:"10px 16px",background:"#fafaf8",borderBottom:showMioTabella?"0.5px solid #eee":"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setShowMioTabella(v=>!v)}>
                    <span style={{fontSize:13,fontWeight:500,color:BRAND.grigio}}>Lista pratiche ({prat.length})</span>
                    <button style={{background:"none",border:`0.5px solid #ddd`,borderRadius:6,padding:"3px 12px",fontSize:12,cursor:"pointer",color:BRAND.oroD}}>{showMioTabella?"▲ Nascondi":"▼ Mostra"}</button>
                  </div>
                  {showMioTabella&&<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:650}}>
                    <thead><tr style={{background:"#fafaf8"}}>{["Ruolo","Data","Immobile","Venditore","Acquirente","Prezzo","Provv. Ag.","Quota Ag.","Quota Buyer","Stato"].map(h=><th key={h} style={{...S.th,fontSize:11}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {prat.length===0&&<tr><td colSpan={10} style={{padding:"2rem",textAlign:"center",color:"#bbb"}}>Nessuna pratica nel periodo</td></tr>}
                      {prat.map((v,idx)=>{
                        const ruolo=ruoloInV(v);
                        const qAg=(()=>{let q=0;if(Number(v.agenteListing)===ag.id)q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;if(Number(v.agenteAcquirente)===ag.id)q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;return q;})();
                        const qBuy=(()=>{let q=0;if(Number(v.buyerListing)===ag.id&&Number(v.agenteListing)!==ag.id)q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;if(Number(v.buyer)===ag.id&&Number(v.agenteAcquirente)!==ag.id)q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;return q;})();
                        const provvAg=(()=>{let p=0;if(Number(v.agenteListing)===ag.id)p+=Number(v.provvVenditore||0);if(Number(v.agenteAcquirente)===ag.id)p+=Number(v.provvAcquirente||0);return p;})();
                        const cfg=STATI_INCASSO[calcolaStatoIncasso(v)]||STATI_INCASSO["Da incassare"];
                        return(<tr key={v.id} style={{background:idx%2===0?"#fff":"#fafafa"}}>
                          <td style={S.td}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:`${colRuolo[ruolo]||"#eee"}22`,color:colRuolo[ruolo]||"#666",fontWeight:600,border:`0.5px solid ${colRuolo[ruolo]||"#ccc"}44`}}>{ruolo}</span></td>
                          <td style={{...S.td,color:"#888",whiteSpace:"nowrap"}}>{fmtD(v.dataVendita||v.dataAtto||"")}</td>
                          <td style={S.td}><strong>{v.comuneImmobile}</strong> — {v.indirizzoImmobile}</td>
                          <td style={S.td}>{v.nominativoVenditore||"—"}</td>
                          <td style={S.td}>{v.nomeAcquirente||"—"}</td>
                          <td style={{...S.td,textAlign:"right"}}>€ {fmtN(v.prezzoVendita)}</td>
                          <td style={{...S.td,textAlign:"right",color:"#aaa"}}>€ {fmt(Number(v.provvVenditore||0)+Number(v.provvAcquirente||0))}</td>
                          <td style={{...S.td,textAlign:"right",fontWeight:600,color:"#8E44AD"}}>{qAg>0?`€ ${fmt(qAg)}`:"—"}</td>
                          <td style={{...S.td,textAlign:"right",fontWeight:600,color:"#2980B9"}}>{qBuy>0?`€ ${fmt(qBuy)}`:"—"}</td>
                          <td style={S.td}><span style={bdg(cfg)}>{calcolaStatoIncasso(v)}</span></td>
                        </tr>);
                      })}
                    </tbody>
                    {prat.length>0&&<tfoot><tr style={{background:BRAND.beige,fontWeight:600,fontSize:12}}>
                      <td colSpan={6} style={{padding:"9px 12px"}}>TOTALE ({prat.length})</td>
                      <td style={{padding:"9px 12px",textAlign:"right",color:BRAND.oroD}}>€ {fmt(produzione)}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",color:"#8E44AD"}}>€ {fmt(quotaAg)}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",color:"#2980B9"}}>€ {fmt(quotaBuy)}</td>
                      <td style={{padding:"9px 12px"}}/>
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
            const agentiTabelle=agenti.filter(a=>!["Coach","Collaborazione Agenzia","Back Office"].includes(a.profilo)&&a.id!==5);
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
          {tab==="One-to-One"&&isBroker&&(<div style={S.sec}>
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
              if(!isBroker&&myAgentId&&Number(v.agenteListing)!==myAgentId&&Number(v.agenteAcquirente)!==myAgentId) return false;
              if(statAnno!=="Tutti"&&getAnno(dataRifVend(v))!==statAnno) return false;
              return true;
            });

            // Incarichi acquisiti nell'anno (filtrati per agente se non broker)
            const incStat = incarichi.filter(i=>i.categoria==="vendita"&&(statAnno==="Tutti"||getAnno(i.dataInizio)===statAnno)&&(isBroker||!myAgentId||i.agenteListing===myAgentId));

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
                  {[{v:"generali",l:"Statistiche generali"},...(isBroker?[{v:"agenti",l:"Report agenti"}]:[])].map(o=>(
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

                  {/* Sezione TRANSAZIONI */}
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

            {impSezione==="costi"&&isBroker&&(()=>{
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
            {impSezione==="fasi"&&isBroker&&(()=>{const fasi=fasiConfig||FASI;const RUOLI=["agente","erica","broker","entrambi","tutti"];const RLB={agente:"Agente",erica:"Erica RT",broker:"Broker",entrambi:"Ag+Erica",tutti:"Tutti"};const fi=Math.min(impFaseSel,fasi.length-1);const fo=fasi[fi]||fasi[0];const updAz=(ai,upd)=>setFasiConfig(fasi.map((f,i)=>i!==fi?f:{...f,azioni:f.azioni.map((a,j)=>j!==ai?a:{...a,...upd})}));const delAz=(ai)=>setFasiConfig(fasi.map((f,i)=>i!==fi?f:{...f,azioni:f.azioni.filter((_,j)=>j!==ai)}));const mvAz=(ai,d)=>{const nf=fasi.map((f,i)=>{if(i!==fi)return f;const az=[...f.azioni];[az[ai],az[ai+d]]=[az[ai+d],az[ai]];return{...f,azioni:az};});setFasiConfig(nf);};const addAz=()=>{if(!formNuovaAzione.lbl.trim())return;setFasiConfig(fasi.map((f,i)=>i!==fi?f:{...f,azioni:[...f.azioni,{k:"az_"+Date.now(),...formNuovaAzione}]}));setFormNuovaAzione({lbl:"",ruolo:"agente",alert:false});};return(<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:12,color:"#888"}}>{fasi.length} fasi · {fasi.reduce((s,f)=>s+f.azioni.length,0)} azioni</span>{fasiConfig&&<button style={{...S.btn,fontSize:11,color:"#E74C3C"}} onClick={()=>{if(window.confirm("Ripristinare default?"))setFasiConfig(null);}}>↺ Default</button>}</div><div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>{fasi.map((f,i)=><button key={f.k} onClick={()=>setImpFaseSel(i)} style={{padding:"4px 10px",fontSize:11,borderRadius:16,border:`0.5px solid ${fi===i?"#A8863A":"#ddd"}`,background:fi===i?"#FEF9E7":"#fff",color:fi===i?"#A8863A":"#888",cursor:"pointer",fontFamily:"inherit",fontWeight:fi===i?500:400}}>{i+1}. {f.n}</button>)}</div><div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden",marginBottom:10}}><div style={{background:"#fafaf8",padding:"8px 14px",borderBottom:"0.5px solid #e8e5e0",display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:13,fontWeight:600}}>{fo.n}</span><span style={{fontSize:11,color:"#aaa"}}>{fo.timing}</span><span style={{fontSize:11,color:"#888",marginLeft:"auto"}}>{fo.azioni.length} azioni</span></div>{fo.azioni.map((az,ai)=>(<div key={az.k} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderBottom:"0.5px solid #f5f5f5"}}><div style={{display:"flex",gap:1}}><button style={{...S.btn,padding:"1px 4px",fontSize:10,opacity:ai===0?0.3:1}} disabled={ai===0} onClick={()=>mvAz(ai,-1)}>▲</button><button style={{...S.btn,padding:"1px 4px",fontSize:10,opacity:ai===fo.azioni.length-1?0.3:1}} disabled={ai===fo.azioni.length-1} onClick={()=>mvAz(ai,1)}>▼</button></div><input style={{...S.inp,margin:0,flex:1,fontSize:12}} value={az.lbl} onChange={e=>updAz(ai,{lbl:e.target.value})}/><select style={{...S.sel,fontSize:11,padding:"4px 6px"}} value={az.ruolo||"agente"} onChange={e=>updAz(ai,{ruolo:e.target.value})}>{RUOLI.map(r=><option key={r} value={r}>{RLB[r]}</option>)}</select><label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#E74C3C",cursor:"pointer",whiteSpace:"nowrap"}}><input type="checkbox" checked={az.alert||false} onChange={e=>updAz(ai,{alert:e.target.checked})}/> Alert</label><button style={{...S.btnD,padding:"2px 6px",fontSize:11}} onClick={()=>delAz(ai)}>✕</button></div>))}<div style={{padding:"8px 14px",background:"#fafaf8",borderTop:"0.5px solid #e8e5e0",display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><input style={{...S.inp,margin:0,flex:2,minWidth:140,fontSize:12}} value={formNuovaAzione.lbl} placeholder="+ Nuova azione..." onChange={e=>setFormNuovaAzione({...formNuovaAzione,lbl:e.target.value})} onKeyDown={e=>e.key==="Enter"&&addAz()}/><select style={{...S.sel,fontSize:11}} value={formNuovaAzione.ruolo} onChange={e=>setFormNuovaAzione({...formNuovaAzione,ruolo:e.target.value})}>{RUOLI.map(r=><option key={r} value={r}>{RLB[r]}</option>)}</select><label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,cursor:"pointer"}}><input type="checkbox" checked={formNuovaAzione.alert||false} onChange={e=>setFormNuovaAzione({...formNuovaAzione,alert:e.target.checked})}/> Alert</label><button style={{...S.btnP,fontSize:12,padding:"5px 12px"}} onClick={addAz}>+ Aggiungi</button></div></div></div>);})()}
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

      {schedaAgente&&<SchedaAgente agente={schedaAgente} venduti={vendReport} incarichi={incarichi} onClose={()=>setSchedaAgente(null)}/>}

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
      {showRibasso&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowRibasso(null)}>
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
      {showInc&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowInc(null)}>
        <div style={S.modal}>
          <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 1rem"}}>{showInc==="new"?"Nuovo":"Modifica"} incarico — {formInc.categoria==="affitto"?"Affitto":"Vendita"}</h2>
          <div style={S.g2}>
            <div><label style={S.lbl}>Agente Listing</label><select style={S.inp} value={formInc.agenteListing||""} onChange={e=>setFormInc({...formInc,agenteListing:e.target.value})}><option value="">Seleziona</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
            <div><label style={S.lbl}>% Provv. Listing</label><input style={S.inp} type="number" step="0.1" value={formInc.percListing||""} onChange={e=>setFormInc({...formInc,percListing:e.target.value})}/></div>
            <div><label style={S.lbl}>Buyer Listing (opz.)</label><select style={S.inp} value={formInc.buyerListing||""} onChange={e=>setFormInc({...formInc,buyerListing:e.target.value})}><option value="">Nessuno</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
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
      {showProp&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowProp(null)}>
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
            <div><label style={S.lbl}>Agente Acquirente</label><select style={S.inp} value={formProp.agenteAcquirente||""} onChange={e=>setFormProp({...formProp,agenteAcquirente:e.target.value})}><option value="">Seleziona</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
            <div><label style={S.lbl}>% Provv. Agente Acquirente</label><input style={S.inp} type="number" step="0.1" placeholder="es. 40" value={formProp.percAcquirente||""} onChange={e=>setFormProp({...formProp,percAcquirente:e.target.value})}/></div>
            <div><label style={S.lbl}>Buyer (opzionale)</label><select style={S.inp} value={formProp.buyer||""} onChange={e=>setFormProp({...formProp,buyer:e.target.value})}><option value="">Nessuno</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
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
      {showGestProp&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowGestProp(null)}>
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
      {showGestVend&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowGestVend(null)}>
        <div style={S.modal}>
          <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 4px"}}>Modifica pratica</h2>
          <p style={{fontSize:13,color:"#aaa",margin:"0 0 1rem"}}>{showGestVend.comuneImmobile} — V: {showGestVend.nominativoVenditore} | A: {showGestVend.nomeAcquirente}</p>
          <div style={S.hl}><p style={{fontSize:13,fontWeight:500,margin:"0 0 8px"}}>Provvigioni</p><div style={S.g2}><div><label style={S.lbl}>Provv. venditore (EUR)</label><input style={S.inp} type="number" value={formVend.provvVenditore||""} onChange={e=>setFormVend({...formVend,provvVenditore:Number(e.target.value)})}/></div><div><label style={S.lbl}>Provv. acquirente (EUR)</label><input style={S.inp} type="number" value={formVend.provvAcquirente||""} onChange={e=>setFormVend({...formVend,provvAcquirente:Number(e.target.value)})}/></div></div></div>
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
      {showAgente&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowAgente(null)}>
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
      {modalCostoVoce&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setModalCostoVoce(null)}>
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
      {showPagamento&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowPagamento(null)}>
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
