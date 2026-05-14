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
  { id:"Incarichi",       icon:"📋", label:"Incarichi" },
  { id:"Proposte",        icon:"📝", label:"Proposte" },
  { id:"Venduti",         icon:"🏠", label:"Venduti" },
  { id:"Il mio report",   icon:"📊", label:"Il mio report" },
  { id:"Report Agenti",   icon:"📊", label:"Report Agenti" },
  { id:"Fatture Agenti",  icon:"🧾", label:"Fatture Agenti" },
  { id:"Fatture Agente",  icon:"🧾", label:"Le mie fatture" },
  { id:"Costi & Break Even", icon:"📉", label:"Costi & Break Even" },
  { id:"Statistiche",     icon:"📈", label:"Statistiche" },
  { id:"Agenti",          icon:"👥", label:"Agenti" },
  { id:"Impostazioni",    icon:"⚙️", label:"Impostazioni" },
];
const fmt  = n => Number(n||0).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtN = n => Number(n||0).toLocaleString("it-IT",{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtD = iso => iso ? new Date(iso).toLocaleDateString("it-IT") : "—";
const nowISO = () => new Date().toISOString();
const todayStr = () => new Date().toISOString().slice(0,10);
const getAnno = d => d ? String(d).substring(0,4) : "";
const getMese = d => d ? String(d).substring(0,7) : "";
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
  "Carburante","Telefono","Marketing personale","Formazione / Corsi",
  "Pranzi e cene di lavoro","Abbonamenti professionali","Materiali promozionali","Altro"
];
const mkCostiAgente = () => VOCI_COSTO_AGENTE_DEFAULT.map((v,i)=>({id:i+1,voce:v,prevMensile:0,frequenza:"mensile",spese:[]}));

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
  "Locazione Ufficio","Spese Condominiali","Utenza Elettricita","Utenza GAS",
  "Telefonia Fissa","Telefonia Cellulare","Pulizie","Assicurazione Ufficio",
  "Imposte Pubblicitarie","Ufficio Multifunzione Canone","Commercialista SRL",
  "Consulente Paghe","Compenso Amministratore","Stipendio Erica Guglielmana",
  "Stipendi x collaborazioni","Tasse / Contributi x Dipendenti",
  "Immobiliare.it","Idealista.it & Casa.it","Sponsorizzazioni Squadre",
  "Gestim + Sito e Hosting","Software - Servizi Professionali","FIAIP",
  "Assicurazioni Professionali","Altre Assicurazioni","Agente Strategico Abbonamento"
];
const mkCosti = () => VOCI_COSTO.map((v,i)=>({id:i+1,voce:v,prevMensile:0,frequenza:"mensile",spese:[]}));
const MESI_KEYS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const mesiNomi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const totSpeseVoce = voce => (voce.spese||[]).reduce((s,x)=>s+Number(x.importo||0),0);
const freqMultiplier = f => ({mensile:12,trimestrale:4,semestrale:2,annuale:1}[f]||12);
const prevAnnuoVoce = voce => Number(voce.prevMensile||0) * freqMultiplier(voce.frequenza||"mensile");
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
          onLogin({id:ag.id,nome:`${ag.nome} ${ag.cognome}`,ruolo:ag.profilo==="Broker"?"Broker":"Agente",agentId:ag.id});
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
  const TAB_AGENTE = ["Dashboard","Incarichi","Proposte","Venduti","Il mio report","Statistiche","Costi & Break Even","Fatture Agente"];
  const tabsVisibili = TAB_CONFIG.filter(t=>{
    if(isBroker) return t.id !== "Il mio report" && t.id !== "Fatture Agente";
    return TAB_AGENTE.includes(t.id);
  });
  return (
    <div style={{width:220,minWidth:220,background:"#2C2C2C",display:"flex",flexDirection:"column",height:"100vh",position:"sticky",top:0,flexShrink:0}}>
      <div style={{padding:"1.5rem 1.25rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{fontSize:28,fontWeight:700,color:"#fff",fontFamily:"Georgia,serif"}}>c<span style={{color:BRAND.oro}}>à</span>sa</div>
        <div style={{fontSize:8,letterSpacing:"0.3em",color:"rgba(255,255,255,0.4)",borderTop:"1px solid rgba(255,255,255,0.2)",paddingTop:3,marginTop:3}}>IMMOBILIARE</div>
        <div style={{marginTop:8,fontSize:11,color:"rgba(255,255,255,0.35)"}}>{isBroker?"Gestionale interno":"Area agente"}</div>
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
  const [fA,setFA]=useState("Tutti"); const [fM,setFM]=useState("Tutti");
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

export default function App() {
  const isMobile=useIsMobile();
  const [utente,setUtente]=useState(null);
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
  const [costiAnno,setCostiAnno]=useState(annoCorrente);
  const [obiettivoFatturato,setObiettivoFatturato]=useState(_ls?.obiettivoFatturato||0);
  const [obiettivoQuotaAgenzia,setObiettivoQuotaAgenzia]=useState(_ls?.obiettivoQuotaAgenzia||0);
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
  // nF,nT,nV,nN removed - SettSec manages its own local state to fix cursor bug
  const [subInc,setSubInc]=useState("vendita"); const [subProp,setSubProp]=useState("vendita"); const [subVend,setSubVend]=useState("vendita");
  const [fIncStato,setFIncStato]=useState("Tutti"); const [fIncAnno,setFIncAnno]=useState("Tutti"); const [fIncMese,setFIncMese]=useState("Tutti"); const [fIncAg,setFIncAg]=useState("Tutti");
  const [fPropStato,setFPropStato]=useState("Tutti"); const [fPropAnno,setFPropAnno]=useState("Tutti"); const [fPropMese,setFPropMese]=useState("Tutti"); const [fPropAg,setFPropAg]=useState("Tutti");
  const [fVendStato,setFVendStato]=useState("Tutti"); const [fVendAnno,setFVendAnno]=useState("Tutti"); const [fVendAg,setFVendAg]=useState("Tutti");
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
  const [mioRepAnno,setMioRepAnno]=useState("Tutti");
  const [mioRepMese,setMioRepMese]=useState("Tutti");
  const [showMioTabella,setShowMioTabella]=useState(true);
  const [mioFatAnno,setMioFatAnno]=useState("Tutti");
  const [mioFatMese,setMioFatMese]=useState("Tutti");
  const [mioFatStato,setMioFatStato]=useState("Tutti");

  const isBroker = utente?.ruolo==="Broker";
  const myAgentId = utente?.agentId||null;

  // Costi personali agente (per agente loggato)
  const [costiAgente,setCostiAgente]=useState(_ls?.costiAgente||{});
  const [costiAgenteAnno,setCostiAgenteAnno]=useState(annoCorrente);
  const [modalCostoVoceAg,setModalCostoVoceAg]=useState(null);
  const [formNuovaSpesaAg,setFormNuovaSpesaAg]=useState({data:todayStr(),importo:"",desc:""});
  const [obiettivoAgente,setObiettivoAgente]=useState(_ls?.obiettivoAgente||{});
  const importRef=useRef();
  const [showMobileMenu,setShowMobileMenu]=useState(false);

  // Carica dati da Supabase all'avvio
  useEffect(()=>{
    caricaDB().then(data=>{
      if(data&&Object.keys(data).length>0){
        if(data.agenti) setAgenti(data.agenti);
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
    const payload = {agenti,incarichi,proposte,venduti,archiviati,archiviatiProp,archiviatiVend,fonti,tipologie,vincoli,tipiNeg,pagamentiFatture,costi,obiettivoFatturato,obiettivoQuotaAgenzia,provvStandard,costiAgente,obiettivoAgente};
    salvaLS(payload); // salva anche in locale come backup
    setDbSaving(true);
    const t=setTimeout(()=>{
      salvaDB(payload).finally(()=>setDbSaving(false));
    },1500); // debounce 1.5s per non sovraccaricare
    return ()=>clearTimeout(t);
  },[agenti,incarichi,proposte,venduti,archiviati,archiviatiProp,archiviatiVend,fonti,tipologie,vincoli,tipiNeg,pagamentiFatture,costi,obiettivoFatturato,obiettivoQuotaAgenzia,provvStandard,costiAgente,obiettivoAgente,dbLoaded]);

  const nomAg=id=>{const a=agenti.find(a=>a.id===Number(id));return a?`${a.nome} ${a.cognome}`:"—";};
  const statoInc=i=>i.stato==="Venduto"?"Venduto":i.stato==="Locato"?"Locato":isScad(i.scadenza)?"Scaduto":"Attivo";

  // Verifica se un incarico ha proposte bloccanti attive
  const hasPropBloccante = incId => proposte.some(p=>p.incaricoId===incId&&STATI_BLOCCANTI.includes(p.stato));

  const anniInc=useMemo(()=>Array.from(new Set(incarichi.map(i=>getAnno(i.dataInizio)).filter(Boolean))).sort().reverse(),[incarichi]);
  const anniProp=useMemo(()=>Array.from(new Set(proposte.map(p=>getAnno(p.dataStato)).filter(Boolean))).sort().reverse(),[proposte]);
  const anniVend=useMemo(()=>Array.from(new Set(venduti.map(v=>getAnno(v.dataVendita||v.dataAtto||"")).filter(Boolean))).sort().reverse(),[venduti]);
  const mesiInc=useMemo(()=>Array.from(new Set(incarichi.filter(i=>fIncAnno==="Tutti"||getAnno(i.dataInizio)===fIncAnno).map(i=>getMese(i.dataInizio)).filter(Boolean))).sort().reverse(),[incarichi,fIncAnno]);
  const mesiProp=useMemo(()=>Array.from(new Set(proposte.filter(p=>fPropAnno==="Tutti"||getAnno(p.dataStato)===fPropAnno).map(p=>getMese(p.dataStato)).filter(Boolean))).sort().reverse(),[proposte,fPropAnno]);
  const mesiFat=useMemo(()=>Array.from(new Set(venduti.filter(v=>fatAnno==="Tutti"||getAnno(v.dataVendita||v.dataAtto||"")===fatAnno).map(v=>getMese(v.dataVendita||v.dataAtto||"")).filter(Boolean))).sort().reverse(),[venduti,fatAnno]);
  const mesiReport=useMemo(()=>Array.from(new Set(venduti.filter(v=>reportAnno==="Tutti"||getAnno(v.dataVendita||v.dataAtto||"")===reportAnno).map(v=>getMese(v.dataVendita||v.dataAtto||"")).filter(Boolean))).sort().reverse(),[venduti,reportAnno]);

  const incFiltrati=useMemo(()=>incarichi.filter(i=>{
    if(i.archiviato&&!mostraArchiviati) return false;
    if(i.categoria!==subInc) return false;
    // Agente vede solo i propri incarichi
    if(!isBroker&&myAgentId&&i.agenteListing!==myAgentId) return false;
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
      if(!isBroker&&myAgentId&&i.agenteListing!==myAgentId)return false;
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
    if(fVendAnno!=="Tutti"&&getAnno(v.dataVendita||v.dataAtto||"")!==fVendAnno) return false;
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
    const dataRif=v.dataVendita||v.dataAtto||"";
    return getAnno(dataRif)===dashAnno;
  }),[venduti,dashAnno]);
  const dashInc=useMemo(()=>incarichi.filter(i=>i.categoria==="vendita"&&!i.archiviato&&(dashAnno==="Tutti"||getAnno(i.dataInizio)===dashAnno)),[incarichi,dashAnno]);
  const vendReport=useMemo(()=>venduti.filter(v=>{
    const dataRif=v.competenzaAgenteDiversa&&v.dataCompetenzaAgente?v.dataCompetenzaAgente:(v.dataVendita||v.dataAtto||"");
    if(reportAnno!=="Tutti"&&getAnno(dataRif)!==reportAnno)return false;
    if(reportMese!=="Tutti"&&getMese(dataRif)!==reportMese)return false;
    return true;
  }),[venduti,reportAnno,reportMese]);

  // Dashboard calcoli — tutti useMemo per aggiornamento in tempo reale
  const dashCalcoli = useMemo(()=>{
    const tuttiVendVendita = venduti.filter(v=>v.categoria==="vendita");
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
  },[venduti,agenti]);

  const {incassato:dashIncassato, daIncassare:dashDaIncassare,
         qAgInc, qBuyInc, qAgenziaInc, qAgRes, qBuyRes, qAgenziaRes} = dashCalcoli;

  const propVincolo=proposte.filter(p=>["Accettata con Vincolo","In attesa / Vincolata"].includes(p.stato)&&p.categoria==="vendita"&&(dashAnno==="Tutti"||getAnno(p.dataStato)===dashAnno));
  const dashSospeso=propVincolo.reduce((s,p)=>s+Number(p.provvVenditore||0)+Number(p.provvAcquirente||0),0);

  const agentiFattura=useMemo(()=>agenti.filter(a=>a.profilo!=="Broker"),[agenti]);
  const fatAg=agenti.find(a=>a.id===Number(fatAgente));
  const fatturaDati=useMemo(()=>{
    if(!fatAgente) return [];
    const ag=agenti.find(a=>a.id===Number(fatAgente));
    if(!ag||ag.profilo==="Broker") return [];
    return venduti.filter(v=>{
      const stato=calcolaStatoIncasso(v);
      // Filtra per stato incasso se selezionato
      if(fatStatoIncasso!=="Tutti"&&stato!==fatStatoIncasso) return false;
      // Usa dataCompetenzaAgente se presente, altrimenti dataVendita
      const dataRif=v.competenzaAgenteDiversa&&v.dataCompetenzaAgente?v.dataCompetenzaAgente:(v.dataVendita||v.dataAtto||"");
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
  const salvaInc=()=>{
    if(!formInc.nominativo||!formInc.comune)return;
    const inc={...formInc,id:showInc==="new"?Date.now():showInc.id,prezzoRichiesto:Number(formInc.prezzoRichiesto),prezzoReale:Number(formInc.prezzoReale),provvPrevista:Number(formInc.provvPrevista),agenteListing:Number(formInc.agenteListing)||null,buyerListing:formInc.buyerListing?Number(formInc.buyerListing):null,percListing:Number(formInc.percListing||0),percBuyerListing:Number(formInc.percBuyerListing||0)};
    showInc==="new"?setIncarichi([...incarichi,inc]):setIncarichi(incarichi.map(i=>i.id===showInc.id?inc:i));
    setShowInc(null);
  };

  const emptyProp=(cat="vendita",inc=null)=>({categoria:cat,tipo:inc?"da_incarico":"collaborazione",incaricoId:inc?inc.id:null,agenteListing:inc?inc.agenteListing:null,percListing:inc?inc.percListing:0,buyerListing:inc?inc.buyerListing:null,percBuyerListing:inc?inc.percBuyerListing:0,comuneImmobile:inc?inc.comune:"",indirizzoImmobile:inc?inc.indirizzo:"",tipologia:inc?inc.tipologia:"",nominativoVenditore:inc?inc.nominativo:"",agenziaEsterna:"",agenteAcquirente:"",percAcquirente:"",percProvvVenditore:"",percProvvAcquirente:"",buyer:"",percBuyer:0,nomeAcquirente:"",prezzoOfferto:"",vincolata:false,tipoVincolo:"",termineSubordine:"",scadenzaProposta:"",provvVenditore:inc?inc.provvPrevista:"",provvAcquirente:"",stato:"In attesa",noteStato:"",dataStato:todayStr(),dataVendita:"",dataAccettazione:"",storico:[{stato:"In attesa",data:nowISO()}],controproposte:[]});
  const salvaProp=()=>{
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

  const salvaStatoProp=()=>{
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
      const nv={id:Date.now(),categoria:p.categoria,propostaId:p.id,incaricoId:p.incaricoId,comuneImmobile:p.comuneImmobile,indirizzoImmobile:p.indirizzoImmobile,tipologia:p.tipologia,nominativoVenditore:p.nominativoVenditore,nomeAcquirente:p.nomeAcquirente,agenteListing:p.agenteListing,percListing:Number(p.percListing||0),buyerListing:p.buyerListing,percBuyerListing:Number(p.percBuyerListing||0),agenteAcquirente:p.agenteAcquirente,percAcquirente:Number(p.percAcquirente||ag?.percAcquirente||0),buyer:p.buyer,percBuyer:Number(p.percBuyer||0),prezzoVendita:Number(p.prezzoOfferto),provvVenditore:Number(p.provvVenditore||inc?.provvPrevista||0),provvAcquirente:Number(p.provvAcquirente||0),tipoAtto:"Preliminare",dataAtto:"",dataVendita:formStatoProp.dataEsitoVincolo||formStatoProp.dataAccettazione||"",statoIncasso:"Da incassare",acc1V:0,dataAcc1V:"",noteAcc1V:"",acc2V:0,dataAcc2V:"",noteAcc2V:"",saldoV:0,dataSaldoV:"",noteSaldoV:"",acc1A:0,dataAcc1A:"",noteAcc1A:"",acc2A:0,dataAcc2A:"",noteAcc2A:"",saldoA:0,dataSaldoA:"",noteSaldoA:"",incassatoVenditore:0,incassatoAcquirente:0,scadenzaIncasso:"",agenziaEsterna:p.agenziaEsterna||null,note:"",bloccato:false,dataCompetenzaAgente:"",competenzaAgenteDiversa:false};
      setVenduti([...venduti,nv]);
      if(p.incaricoId)setIncarichi(incarichi.map(i=>i.id===p.incaricoId?{...i,stato:p.categoria==="affitto"?"Locato":"Venduto"}:i));
    }
    // Vincolo negativo: NON cambia stato, rimane in attesa/vincolata (gestione manuale)
    setShowGestProp(null);
  };

  const salvaVend=()=>{if(!showGestVend)return;const u={...showGestVend,...formVend};u.statoIncasso=calcolaStatoIncasso(u);setVenduti(venduti.map(v=>v.id===showGestVend.id?u:v));setShowGestVend(null);};
  const salvaPagamento=()=>{if(!showPagamento)return;setPagamentiFatture({...pagamentiFatture,[showPagamento.key]:{...formPagamento,importoPagato:Number(formPagamento.importoPagato||0)}});setShowPagamento(null);};
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
    setCosti({...costi,[modalCostoVoce.anno]:voci});
    setModalCostoVoce({...modalCostoVoce,voce:voci[modalCostoVoce.idx]});
    setFormNuovaSpesa({data:todayStr(),importo:"",desc:""});
  };

  if(!utente) return <LoginPage onLogin={setUtente}/>;
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
            <button style={{...S.btn,color:"#c0392b",fontSize:12}} onClick={()=>setUtente(null)}>Esci</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>

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
              const myVendAnno = myVendTutti.filter(v=>dashAnno==="Tutti"||getAnno(v.dataVendita||v.dataAtto||"")===dashAnno);

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
              const nTransV = myVendAnno.filter(v=>Number(v.agenteListing)===myAgentId&&Number(v.provvVenditore||0)>0&&!v.agenziaEsterna).length;
              const nTransA = myVendAnno.filter(v=>Number(v.agenteAcquirente)===myAgentId&&Number(v.provvAcquirente||0)>0).length;

              // Produzione Agente = provv agenzia dove è Listing o Acquirente
              const produzione = myVendAnno.reduce((s,v)=>{
                let p=0;
                if(Number(v.agenteListing)===myAgentId) p+=Number(v.provvVenditore||0);
                if(Number(v.agenteAcquirente)===myAgentId) p+=Number(v.provvAcquirente||0);
                return s+p;
              },0);
              const quotaAgenziaSuProd = myVendAnno.reduce((s,v)=>{
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

              const BF=({titolo,colore,emoji,totale,sub1L,sub1V,sub2L,sub2V})=>(
                <div style={{background:"#fff",borderRadius:10,border:`0.5px solid ${colore}44`,padding:"14px 16px",borderTop:`3px solid ${colore}`}}>
                  <p style={{fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 4px"}}>{emoji} {titolo}</p>
                  <p style={{fontSize:22,fontWeight:700,color:colore,margin:"0 0 8px"}}>€ {fmt(totale)}</p>
                  <div style={{borderTop:"0.5px solid #f0f0f0",paddingTop:6,display:"flex",flexDirection:"column",gap:3}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:"#aaa"}}>{sub1L}</span><span style={{fontWeight:500,color:"#555"}}>€ {fmt(sub1V)}</span></div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:"#aaa"}}>{sub2L}</span><span style={{fontWeight:500,color:"#555"}}>€ {fmt(sub2V)}</span></div>
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
                  <BF titolo="Produzione Agente" colore="#27AE60" emoji="📋" totale={produzione} sub1L="Quota Agenzia" sub1V={quotaAgenziaSuProd} sub2L="Quota Agente" sub2V={quotaAgente}/>
                  <BF titolo="Quota Incassata" colore="#2980B9" emoji="✅" totale={totIncassato} sub1L="Quota Agente" sub1V={incassatoAgente} sub2L="Quota Buyer" sub2V={incassatoBuyer}/>
                  <BF titolo="Da Incassare" colore="#E67E22" emoji="⏳" totale={totDaInc} sub1L="Quota Agente" sub1V={daIncAssAgente} sub2L="Quota Buyer" sub2V={daIncAssBuyer}/>
                  <BF titolo="Totale Maturato" colore={BRAND.oroD} emoji="💰" totale={totMaturato} sub1L="Quota Agente" sub1V={quotaAgente} sub2L="Quota Buyer" sub2V={quotaBuyer}/>
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
                    <td style={S.tdS}/>
                  </tr></tfoot>
                </table>
              ):<div style={{padding:"1rem",textAlign:"center",fontSize:13,color:"#bbb"}}>Nessuna proposta vincolata</div>}
            </div>
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
                <button style={S.btnP} onClick={()=>{setFormInc(emptyInc(subInc));setShowInc("new");}}>+ Nuovo incarico</button>
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
            <div style={S.tblWrap}><table style={S.tbl}>
              <thead>
                <tr>
                  <th style={{...S.th,minWidth:70}}>Fonte</th>
                  <th style={{...S.th,minWidth:130,position:"sticky",left:0,zIndex:2,background:"#fafaf8",boxShadow:"2px 0 3px rgba(0,0,0,0.08)"}}>Nominativo</th>
                  <th style={{...S.th,minWidth:90,position:"sticky",left:130,zIndex:2,background:"#fafaf8",boxShadow:"2px 0 3px rgba(0,0,0,0.08)"}}>Comune</th>
                  <th style={{...S.th,minWidth:130,position:"sticky",left:220,zIndex:2,background:"#fafaf8",boxShadow:"2px 0 3px rgba(0,0,0,0.08)"}}>Indirizzo</th>
                  <th style={{...S.th,minWidth:100}}>Tipologia</th>
                  <th style={{...S.th,minWidth:85}}>Inizio</th>
                  <th style={{...S.th,minWidth:85}}>Scadenza</th>
                  <th style={{...S.thL,borderLeft:"2px solid #2980B944",minWidth:110}}>Ag. Listing</th>
                  <th style={{...S.thL,minWidth:100}}>Buyer L.</th>
                  <th style={{...S.thL,borderRight:"2px solid #2980B944",minWidth:20}}></th>
                  <th style={{...S.thA,borderLeft:"2px solid #8E44AD44",minWidth:110}}>Ag. Acq.</th>
                  <th style={{...S.thA,borderRight:"2px solid #8E44AD44",minWidth:100}}>Buyer</th>
                  <th style={{...S.th,minWidth:100}}>Prezzo rich.</th>
                  <th style={{...S.th,minWidth:90}}>Provv.</th>
                  <th style={{...S.th,minWidth:80}}>Stato</th>
                  <th style={{...S.th,minWidth:110}}>Proposta</th>
                  <th style={{...S.th,minWidth:160}}>Azioni</th>
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
                return(<tr key={inc.id} style={{background:rowBg,opacity:inc.archiviato?0.7:1}}>
                  <td style={S.td}>{inc.fonte}</td>
                  <td style={{...S.td,position:"sticky",left:0,background:rowBg||"#fff",zIndex:1,boxShadow:"2px 0 3px rgba(0,0,0,0.06)"}}>
                    {isVenduto?(
                      <button style={{background:"none",border:"none",cursor:"pointer",color:BRAND.oroD,fontWeight:600,fontSize:13,padding:0,textDecoration:"underline"}} onClick={()=>setSchedaIncarico({incarico:inc,venduto:vendCorr,proposta:proposte.find(p=>p.incaricoId===inc.id&&p.stato==="Accettata")})}>
                        {inc.nominativo}
                      </button>
                    ):<strong>{inc.nominativo}</strong>}
                  </td>
                  <td style={{...S.td,position:"sticky",left:130,background:rowBg||"#fff",zIndex:1,boxShadow:"2px 0 3px rgba(0,0,0,0.06)"}}>{inc.comune}</td><td style={{...S.td,position:"sticky",left:220,background:rowBg||"#fff",zIndex:1,boxShadow:"2px 0 3px rgba(0,0,0,0.06)"}}>{inc.indirizzo}</td><td style={S.td}>{inc.tipologia}</td>
                  <td style={S.td}>{fmtD(inc.dataInizio)}</td>
                  <td style={{...S.td,color:s==="Scaduto"?"#E74C3C":"inherit",fontWeight:s==="Scaduto"?500:400}}>{fmtD(inc.scadenza)}</td>

                  <td style={{...S.tdL,borderLeft:"2px solid #2980B922"}}>{nomAg(inc.agenteListing)}</td>
                  <td style={S.tdL}>{inc.buyerListing?nomAg(inc.buyerListing):"—"}</td>
                  <td style={{...S.tdL,borderRight:"2px solid #2980B922"}}></td>
                  <td style={{...S.tdA,borderLeft:"2px solid #8E44AD22"}}>{vendCorr?nomAg(vendCorr.agenteAcquirente):"—"}</td>
                  <td style={{...S.tdA,borderRight:"2px solid #8E44AD22"}}>{vendCorr?.buyer?nomAg(vendCorr.buyer):"—"}</td>
                  <td style={S.tdR}>
                    {(inc.storicoRibassi||[]).length>0
                      ? <span style={{color:"#bbb",textDecoration:"line-through",fontSize:12}}>€ {fmtN(inc.prezzoRichiesto)}</span>
                      : <span>€ {fmtN(inc.prezzoRichiesto)}</span>
                    }
                    {(inc.storicoRibassi||[]).length>0&&<><br/><span style={{fontWeight:600,color:BRAND.oroD}}>€ {fmtN(inc.storicoRibassi[inc.storicoRibassi.length-1].prezzo)}</span></>}
                  </td>
                  <td style={S.tdR}>€ {fmt(inc.provvPrevista)}</td>
                  <td style={S.td}><span style={bdg(cfg)}>{s}</span></td>
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
                  <td style={S.td}>
                    <div style={{display:"flex",gap:4}}>
                      {!isVenduto&&!inc.archiviato&&<button style={{...S.btn,fontSize:12,padding:"4px 8px"}} onClick={()=>{setFormInc({...inc,agenteListing:inc.agenteListing||"",buyerListing:inc.buyerListing||""});setShowInc(inc);}}>✏️</button>}
                      {!isVenduto&&!inc.archiviato&&<button style={{...S.btn,fontSize:12,padding:"4px 8px",color:BRAND.oroD,borderColor:BRAND.oro}} title="Registra ribasso prezzo" onClick={()=>{setShowRibasso(inc);setFormRibasso({data:todayStr(),prezzo:"",note:""});}}>↘ Ribasso</button>}
                      {!isVenduto&&!hasPropAttiva&&!inc.archiviato&&<button style={S.btnG} onClick={()=>{setFormProp(emptyProp(inc.categoria,inc));setShowProp("new");}}>+ Proposta</button>}
                      {!inc.archiviato?<button style={S.btnD} title="Archivia" onClick={()=>{if(window.confirm(`Archiviare "${inc.nominativo}"? Potrai ripristinarlo in seguito.`))archiviaInc(inc.id);}}>📦</button>
                      :<button style={{...S.btn,fontSize:12,padding:"4px 8px",color:"#27AE60"}} onClick={()=>ripristinaInc(inc.id)}>↩ Ripristina</button>}
                    </div>
                  </td>
                </tr>);
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
                <button style={S.btnP} onClick={()=>{setFormProp(emptyProp(subProp));setShowProp("new");}}>+ Nuova proposta (collab.)</button>
              </div>
            </div>
            <FiltriProp/>
            <div style={S.cnt}>{[["In attesa",cntProp.attesa,"#4A90D9"],["Con vincolo",cntProp.vincolo,"#D4AC0D"],["Accettate",cntProp.accettate,"#27AE60"],["Non concluse",cntProp.rifiutate,"#E74C3C"]].map(([l,n,c])=>(<div key={l} style={S.cntBox(c)}><span style={{fontSize:24,fontWeight:700,color:c}}>{n}</span><span style={{fontSize:12,color:"#aaa"}}>{l}</span></div>))}</div>
            <div style={S.tblWrap}><table style={S.tbl}>
              <thead><tr>
                <th style={{...S.th,minWidth:80,position:"sticky",left:0,zIndex:2,background:"#fafaf8",boxShadow:"2px 0 3px rgba(0,0,0,0.08)"}}>Tipo</th>
                <th style={{...S.th,minWidth:85,position:"sticky",left:80,zIndex:2,background:"#fafaf8",boxShadow:"2px 0 3px rgba(0,0,0,0.08)"}}>Data</th>
                <th style={{...S.th,minWidth:90,position:"sticky",left:165,zIndex:2,background:"#fafaf8",boxShadow:"2px 0 3px rgba(0,0,0,0.08)"}}>Comune</th>
                <th style={{...S.th,minWidth:130}}>Indirizzo</th>
                <th style={{...S.th,minWidth:120}}>Venditore</th><th style={S.th}>Acquirente</th>
                <th style={{...S.thA,borderLeft:"2px solid #8E44AD44"}}>Ag. Acq.</th><th style={S.thA}>Buyer</th><th style={{...S.thA,borderRight:"2px solid #8E44AD44"}}></th>
                <th style={S.th}>Prezzo</th><th style={S.th}>Vincolo</th><th style={S.th}>Provv.V.</th><th style={S.th}>Provv.A.</th><th style={S.th}>Stato</th><th style={S.th}>Azioni</th>
              </tr></thead>
              <tbody>{propFiltrate.map(p=>{
                const cfg=STATI_PROP[p.stato]||STATI_PROP["In attesa"];
                const puoGestire=!["Rifiutata","Mancata Chiusura","Accettata"].includes(p.stato);
                return(<tr key={p.id}>
                  <td style={{...S.td,position:"sticky",left:0,background:"#fff",zIndex:1,boxShadow:"2px 0 3px rgba(0,0,0,0.06)"}}><span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:p.tipo==="da_incarico"?"#EAF4FB":"#FEF0E0",color:p.tipo==="da_incarico"?"#2980B9":"#E67E22"}}>{p.tipo==="da_incarico"?"Incarico":"Collab."}</span></td>
                  <td style={{...S.td,position:"sticky",left:80,background:"#fff",zIndex:1,boxShadow:"2px 0 3px rgba(0,0,0,0.06)"}}>{fmtD(p.dataStato)}</td>
                  <td style={{...S.td,position:"sticky",left:165,background:"#fff",zIndex:1,boxShadow:"2px 0 3px rgba(0,0,0,0.06)"}}>{p.comuneImmobile}</td>
                  <td style={S.td}>{p.indirizzoImmobile}<br/><span style={{fontSize:11,color:"#aaa"}}>{p.tipologia}</span></td>
                  <td style={S.td}>{p.nominativoVenditore}</td>
                  <td style={S.td}>{p.nomeAcquirente}</td>
                  <td style={{...S.tdA,borderLeft:"2px solid #8E44AD22"}}>{nomAg(p.agenteAcquirente)}</td>
                  <td style={S.tdA}>{p.buyer?nomAg(p.buyer):"—"}</td>
                  <td style={{...S.tdA,borderRight:"2px solid #8E44AD22"}}></td>
                  <td style={S.tdR}>€ {fmtN(p.prezzoOfferto)}</td>
                  <td style={S.td}>{p.vincolata?<span style={{fontSize:11,color:BRAND.oroD,fontWeight:500}}>{p.tipoVincolo||"Si"}</span>:<span style={{color:"#ccc",fontSize:11}}>No</span>}</td>
                  <td style={S.tdR}>€ {fmt(p.provvVenditore||0)}</td>
                  <td style={S.tdR}>€ {fmt(p.provvAcquirente||0)}</td>
                  <td style={S.td}><span style={bdg(cfg)}>{cfg.s} {cfg.label}</span></td>
                  <td style={S.td}>
                    <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                      {puoGestire&&<button style={S.btnP} onClick={()=>{setFormStatoProp({stato:p.stato,noteStato:"",contropropostaPrezzo:"",esitoVincolo:"",tipoNegazione:"",rispostaAcquirente:"",dataAccettazione:p.dataAccettazione||"",dataEsitoVincolo:""});setShowGestProp(p);}}>Gestisci</button>}
                      {!puoGestire&&["Accettata","Accettata con Vincolo"].includes(p.stato)&&<span style={{fontSize:12,padding:"3px 10px",borderRadius:6,background:"#E9F7EF",color:"#27AE60",fontWeight:600,border:"0.5px solid #27AE6044"}}>✓ Conclusa</span>}
                      {!puoGestire&&!["Accettata","Accettata con Vincolo"].includes(p.stato)&&<span style={{fontSize:11,color:"#aaa",fontStyle:"italic"}}>{p.stato}</span>}
                      <button style={{...S.btn,fontSize:12,padding:"4px 8px"}} title="Modifica proposta" onClick={()=>{setFormProp({...p});setShowProp("edit");}}>✏️</button>
                      <button style={{...S.btnD,fontSize:11,padding:"3px 8px"}} title="Archivia" onClick={()=>{if(window.confirm(`Archiviare la proposta per "${p.nomeAcquirente}"?`))archiviaProp(p.id);}}>📦</button>
                    </div>
                  </td>
                </tr>);
              })}
              {propFiltrate.length===0&&<tr><td colSpan={13} style={{...S.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessuna proposta trovata</td></tr>}
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
            <div style={S.tblWrap}><table style={S.tbl}>
              <thead><tr>
                <th style={{...S.th,minWidth:90,position:"sticky",left:0,zIndex:2,background:"#fafaf8",boxShadow:"2px 0 3px rgba(0,0,0,0.08)"}}>Comune</th>
                <th style={{...S.th,minWidth:130,position:"sticky",left:90,zIndex:2,background:"#fafaf8",boxShadow:"2px 0 3px rgba(0,0,0,0.08)"}}>Indirizzo</th>
                <th style={{...S.th,minWidth:120}}>Venditore</th>
                <th style={{...S.th,minWidth:120}}>Acquirente</th>
                <th style={{...S.thL,borderLeft:"2px solid #2980B944"}}>Ag. Listing</th><th style={S.thL}>Buyer L.</th><th style={{...S.thL,borderRight:"2px solid #2980B944"}}></th>
                <th style={{...S.thA,borderLeft:"2px solid #8E44AD44"}}>Ag. Acq.</th><th style={{...S.thA,borderRight:"2px solid #8E44AD44"}}>Buyer</th>
                <th style={S.th}>Prezzo</th><th style={S.th}>Provv.V.</th><th style={S.th}>Provv.A.</th><th style={S.th}>Tipo atto</th><th style={S.th}>Data atto</th><th style={S.th}>Inc.V.</th><th style={S.th}>Inc.A.</th><th style={S.th}>Scad.</th><th style={S.th}>Stato</th><th style={S.th}>Azioni</th>
              </tr></thead>
              <tbody>{vendFiltrati.map(v=>{
                const statoI=calcolaStatoIncasso(v);
                const cfg=STATI_INCASSO[statoI]||STATI_INCASSO["Da incassare"];
                return(<tr key={v.id} style={{opacity:v.bloccato?0.85:1}}>
                  <td style={{...S.td,position:"sticky",left:0,background:"#fff",zIndex:1,boxShadow:"2px 0 3px rgba(0,0,0,0.06)"}}>{v.comuneImmobile}</td>
                  <td style={{...S.td,position:"sticky",left:90,background:"#fff",zIndex:1,boxShadow:"2px 0 3px rgba(0,0,0,0.06)"}}><strong>{v.indirizzoImmobile}</strong><br/><span style={{fontSize:11,color:"#aaa"}}>{v.tipologia}</span></td>
                  <td style={S.td}>{v.nominativoVenditore}</td>
                  <td style={S.td}>{v.nomeAcquirente}</td>
                  <td style={{...S.tdL,borderLeft:"2px solid #2980B922"}}>{v.agenteListing?nomAg(v.agenteListing):<span style={{fontSize:11,color:BRAND.oroD}}>{v.agenziaEsterna||"Est."}</span>}</td>
                  <td style={S.tdL}>{v.buyerListing?nomAg(v.buyerListing):"—"}</td>
                  <td style={{...S.tdL,borderRight:"2px solid #2980B922"}}></td>
                  <td style={{...S.tdA,borderLeft:"2px solid #8E44AD22"}}>{nomAg(v.agenteAcquirente)}</td>
                  <td style={{...S.tdA,borderRight:"2px solid #8E44AD22"}}>{v.buyer?nomAg(v.buyer):"—"}</td>
                  <td style={S.tdR}>€ {fmtN(v.prezzoVendita)}</td>
                  <td style={S.tdR}>€ {fmt(v.provvVenditore)}</td><td style={S.tdR}>€ {fmt(v.provvAcquirente)}</td>
                  <td style={S.td}>{v.tipoAtto||"—"}</td>
                  <td style={S.td}>
                    {v.dataAtto?fmtD(v.dataAtto):"—"}
                    {v.competenzaAgenteDiversa&&v.dataCompetenzaAgente&&(
                      <><br/><span style={{fontSize:10,color:"#8E44AD",fontStyle:"italic"}}>Ag: {fmtD(v.dataCompetenzaAgente)}</span></>
                    )}
                  </td>
                  <td style={S.tdR}>{calcolaIncassatoV(v)>0?`€ ${fmt(calcolaIncassatoV(v))}`:"—"}</td>
                  <td style={S.tdR}>{calcolaIncassatoA(v)>0?`€ ${fmt(calcolaIncassatoA(v))}`:"—"}</td>
                  <td style={S.td}>{v.scadenzaIncasso?fmtD(v.scadenzaIncasso):"—"}</td>
                  <td style={S.td}><span style={bdg(cfg)}>{statoI}</span></td>
                  <td style={S.td}><div style={{display:"flex",gap:4,alignItems:"center"}}>
                    {!v.bloccato&&<><button style={{...S.btnP,fontSize:12,padding:"4px 8px",background:"#2980B9",borderColor:"#2980B9"}} onClick={()=>setShowIncassoLato({vend:v,lato:"V"})}>V</button>
                    <button style={{...S.btnP,fontSize:12,padding:"4px 8px",background:"#8E44AD",borderColor:"#8E44AD"}} onClick={()=>setShowIncassoLato({vend:v,lato:"A"})}>A</button>
                    <button style={{...S.btn,fontSize:12,padding:"4px 8px"}} onClick={()=>{setFormVend({...v});setShowGestVend(v);}}>✏️</button></>}
                    <button title={v.bloccato?"Sblocca pratica":"Blocca pratica"} style={{...S.btn,fontSize:14,padding:"4px 8px",color:v.bloccato?"#27AE60":"#E67E22"}} onClick={()=>setVenduti(venduti.map(x=>x.id===v.id?{...x,bloccato:!x.bloccato}:x))}>{v.bloccato?"🔓":"🔒"}</button>
                    <button style={{...S.btnD,fontSize:11,padding:"3px 8px"}} title="Archivia" onClick={()=>{if(window.confirm(`Archiviare "${v.nominativoVenditore} - ${v.nomeAcquirente}"?`))archiviaVend(v.id);}}>📦</button>
                  </div></td>
                </tr>);
              })}
              {vendFiltrati.length===0&&<tr><td colSpan={16} style={{...S.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessun venduto trovato</td></tr>}
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
            <div style={{...S.tblWrap,overflowX:"auto"}}><table style={{...S.tbl,minWidth:isMobile?500:400}}>
              <thead><tr>{["Agente","Profilo","Incarichi","N° Trans.","Provv. Agenzia","Incassato","Quota Agente","Quota Buyer","Tot. Agente+Buyer"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{agenti.map(ag=>{
                const vAg=vendReport.filter(v=>v.agenteListing===ag.id||v.agenteAcquirente===ag.id||v.buyerListing===ag.id||v.buyer===ag.id);
                const incAg=incarichi.filter(i=>i.agenteListing===ag.id&&!i.archiviato&&(reportAnno==="Tutti"||getAnno(i.dataInizio)===reportAnno)).length;
                const nTV=vAg.filter(v=>v.agenteListing===ag.id&&Number(v.provvVenditore||0)>0&&!v.agenziaEsterna).length;
                const nTA=vAg.filter(v=>v.agenteAcquirente===ag.id&&Number(v.provvAcquirente||0)>0).length;
                const genTot=vAg.reduce((s,v)=>{
                  let t=0;
                  if(v.agenteListing===ag.id) t+=Number(v.provvVenditore||0);
                  if(v.agenteAcquirente===ag.id) t+=Number(v.provvAcquirente||0);
                  return s+t;
                },0);
                const incTot=vAg.reduce((s,v)=>{
                  let t=0;
                  if(v.agenteListing===ag.id) t+=calcolaIncassatoV(v);
                  if(v.agenteAcquirente===ag.id) t+=calcolaIncassatoA(v);
                  return s+t;
                },0);
                // Quota solo da ruoli Listing/Acquirente
                const quotaAg=vAg.reduce((s,v)=>{
                  let q=0;
                  if(v.agenteListing===ag.id) q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
                  if(v.agenteAcquirente===ag.id) q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
                  return s+q;
                },0);
                // Quota solo da ruolo Buyer
                const quotaBuy=vAg.reduce((s,v)=>{
                  let q=0;
                  if(v.buyerListing===ag.id&&v.agenteListing!==ag.id) q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;
                  if(v.buyer===ag.id&&v.agenteAcquirente!==ag.id) q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;
                  return s+q;
                },0);
                const quotaTot=quotaAg+quotaBuy;
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


          {/* COSTI & BREAK EVEN */}
          {tab==="Costi & Break Even"&&isBroker&&(<div style={S.sec}>
            {/* Anno selector */}
            <div style={{display:"flex",gap:12,marginBottom:"1.25rem",flexWrap:"wrap",alignItems:"center"}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <label style={{fontSize:13,color:"#888"}}>Anno:</label>
                <select style={S.sel} value={costiAnno} onChange={e=>{setCostiAnno(e.target.value);if(!costi[e.target.value])setCosti({...costi,[e.target.value]:mkCosti()});}}>
                  {[...new Set([annoCorrente,...Object.keys(costi)])].sort().reverse().map(a=><option key={a}>{a}</option>)}
                  <option value={String(Number(annoCorrente)+1)}>{Number(annoCorrente)+1}</option>
                </select>
              </div>
            </div>

            {/* KPI Break Even */}
            {(()=>{
              const vociAnno = costi[costiAnno]||mkCosti();
              const totPrevAnnuo = vociAnno.reduce((s,v)=>s+prevAnnuoVoce(v),0);
              const totPrevMensile = totPrevAnnuo/12;
              const vendAnno = venduti.filter(v=>getAnno(v.dataVendita||v.dataAtto||"")===costiAnno);
              const fatturatoLordo = vendAnno.reduce((s,v)=>s+calcolaIncassatoV(v)+calcolaIncassatoA(v),0);
              const quotaAgenti = vendAnno.reduce((s,v)=>s+agenti.filter(a=>a.profilo!=="Broker").reduce((sa,a)=>{
                const incV=calcolaIncassatoV(v); const incA=calcolaIncassatoA(v);
                const pV=Number(v.provvVenditore||0); const pA=Number(v.provvAcquirente||0);
                let q=0;
                if(v.agenteListing===a.id&&pV>0) q+=incV*(Number(v.percListing||0)/100);
                if(v.agenteAcquirente===a.id&&pA>0) q+=incA*(Number(v.percAcquirente||0)/100);
                if(v.buyerListing===a.id&&v.agenteListing!==a.id&&pV>0) q+=incV*(Number(v.percBuyerListing||0)/100);
                if(v.buyer===a.id&&v.agenteAcquirente!==a.id&&pA>0) q+=incA*(Number(v.percBuyer||0)/100);
                return sa+q;
              },0),0);
              const quotaBuyer = vendAnno.reduce((s,v)=>{
                const incV=calcolaIncassatoV(v); const incA=calcolaIncassatoA(v);
                const pV=Number(v.provvVenditore||0); const pA=Number(v.provvAcquirente||0);
                let q=0;
                if(v.buyerListing&&v.agenteListing!==v.buyerListing&&pV>0) q+=incV*(Number(v.percBuyerListing||0)/100);
                if(v.buyer&&v.agenteAcquirente!==v.buyer&&pA>0) q+=incA*(Number(v.percBuyer||0)/100);
                return s+q;
              },0);
              const quotaAgenzia = fatturatoLordo - quotaAgenti - quotaBuyer;
              const totConsuntivo = vociAnno.reduce((s,v)=>s+totSpeseVoce(v),0);
              const costiRif = totConsuntivo>0?totConsuntivo:totPrevAnnuo;
              const margine = quotaAgenzia - costiRif;
              const percCopertura = totPrevAnnuo>0?(quotaAgenzia/totPrevAnnuo*100).toFixed(1):null;

              // Obiettivo fatturato dagli agenti (somma automatica)
              const obFatAgenti = agenti.filter(a=>a.profilo!=="Broker").reduce((s,a)=>s+Number((obiettivoAgente[a.id]||{}).fatturato||0),0);

              return(<>
                {/* Obiettivi input — 2 campi */}
                <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"14px 18px",marginBottom:"1.25rem"}}>
                  <p style={{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 12px"}}>Obiettivi anno {costiAnno}</p>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
                    <div>
                      <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>
                        Obiettivo Fatturato Lordo Agenzia (€)
                        {obFatAgenti>0&&<span style={{color:BRAND.oroD,marginLeft:8,fontWeight:500}}>· da agenti: € {fmt(obFatAgenti)}</span>}
                      </label>
                      <input style={{...S.inp,margin:0}} type="number" placeholder="es. 300000" value={obiettivoFatturato||""} onChange={e=>setObiettivoFatturato(Number(e.target.value))}/>
                      {obFatAgenti>0&&obiettivoFatturato===0&&(
                        <button style={{fontSize:11,color:BRAND.oroD,background:"none",border:`0.5px solid ${BRAND.oro}`,borderRadius:5,padding:"3px 8px",cursor:"pointer",marginTop:4}} onClick={()=>setObiettivoFatturato(obFatAgenti)}>
                          Usa somma agenti: € {fmt(obFatAgenti)}
                        </button>
                      )}
                    </div>
                    <div>
                      <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>
                        Obiettivo Quota Agenzia (Break Even) (€)
                        {totPrevAnnuo>0&&<span style={{color:"#E74C3C",marginLeft:8,fontWeight:500}}>· costi prev.: € {fmt(totPrevAnnuo)}</span>}
                      </label>
                      <input style={{...S.inp,margin:0}} type="number" placeholder={`es. ${fmt(totPrevAnnuo||180000)}`} value={obiettivoQuotaAgenzia||""} onChange={e=>setObiettivoQuotaAgenzia(Number(e.target.value))}/>
                      {totPrevAnnuo>0&&obiettivoQuotaAgenzia===0&&(
                        <button style={{fontSize:11,color:"#E74C3C",background:"none",border:"0.5px solid #E74C3C",borderRadius:5,padding:"3px 8px",cursor:"pointer",marginTop:4}} onClick={()=>setObiettivoQuotaAgenzia(totPrevAnnuo)}>
                          Usa costi previsionali: € {fmt(totPrevAnnuo)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* KPI 4 cards */}
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
                  <div style={S.card("#27AE60")}>
                    <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Quota Agenzia {costiAnno}</p>
                    <p style={{fontSize:22,fontWeight:600,margin:0,color:"#27AE60"}}>€ {fmt(quotaAgenzia)}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>Lordo: € {fmt(fatturatoLordo)}</p>
                  </div>
                  <div style={S.card("#E74C3C")}>
                    <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Costi previsionali annui</p>
                    <p style={{fontSize:22,fontWeight:600,margin:0,color:"#E74C3C"}}>€ {fmt(totPrevAnnuo)}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>€ {fmt(Math.round(totPrevMensile))}/mese</p>
                  </div>
                  <div style={S.card("#E67E22")}>
                    <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Costi consuntivi inseriti</p>
                    <p style={{fontSize:22,fontWeight:600,margin:0,color:"#E67E22"}}>€ {fmt(totConsuntivo)}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>{totConsuntivo===0?"Uso previsionali come riferimento":percCopertura+"% copertura costi"}</p>
                  </div>
                  <div style={S.card(margine>=0?"#27AE60":"#E74C3C")}>
                    <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Margine agenzia</p>
                    <p style={{fontSize:22,fontWeight:600,margin:0,color:margine>=0?"#27AE60":"#E74C3C"}}>{margine>=0?"+":""}€ {fmt(margine)}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>{totConsuntivo>0?"vs consuntivi":"vs previsionali"}</p>
                  </div>
                </div>

                {/* Riepilogo quote */}
                <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem",marginBottom:"1.25rem"}}>
                  <p style={{fontSize:12,fontWeight:500,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 10px"}}>Composizione fatturato {costiAnno}</p>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10}}>
                    <div style={{textAlign:"center",padding:"10px",background:BRAND.beige,borderRadius:8}}>
                      <p style={{fontSize:11,color:"#888",margin:"0 0 3px"}}>Quota Agenzia</p>
                      <p style={{fontSize:16,fontWeight:600,margin:0,color:"#27AE60"}}>€ {fmt(quotaAgenzia)}</p>
                      <p style={{fontSize:11,color:"#aaa",margin:"3px 0 0"}}>{fatturatoLordo>0?((quotaAgenzia/fatturatoLordo)*100).toFixed(1)+"% del lordo":"—"}</p>
                    </div>
                    <div style={{textAlign:"center",padding:"10px",background:BRAND.beige,borderRadius:8}}>
                      <p style={{fontSize:11,color:"#888",margin:"0 0 3px"}}>Quota Agenti</p>
                      <p style={{fontSize:16,fontWeight:600,margin:0,color:"#2980B9"}}>€ {fmt(quotaAgenti)}</p>
                      <p style={{fontSize:11,color:"#aaa",margin:"3px 0 0"}}>{fatturatoLordo>0?((quotaAgenti/fatturatoLordo)*100).toFixed(1)+"% del lordo":"—"}</p>
                    </div>
                    <div style={{textAlign:"center",padding:"10px",background:BRAND.beige,borderRadius:8}}>
                      <p style={{fontSize:11,color:"#888",margin:"0 0 3px"}}>Quota Buyer</p>
                      <p style={{fontSize:16,fontWeight:600,margin:0,color:"#8E44AD"}}>€ {fmt(quotaBuyer)}</p>
                      <p style={{fontSize:11,color:"#aaa",margin:"3px 0 0"}}>{fatturatoLordo>0?((quotaBuyer/fatturatoLordo)*100).toFixed(1)+"% del lordo":"—"}</p>
                    </div>
                  </div>
                </div>

                {/* BARRA 1 — Fatturato lordo vs Obiettivo fatturato */}
                {obiettivoFatturato>0&&(
                  <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem",marginBottom:"1rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:4}}>
                      <div>
                        <span style={{fontSize:13,fontWeight:600,color:BRAND.grigio}}>📊 Obiettivo 1 — Fatturato lordo agenzia</span>
                        <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Tutte le provvigioni incassate (V+A), prima della distribuzione agli agenti</p>
                      </div>
                      <span style={{fontSize:14,fontWeight:700,color:fatturatoLordo>=obiettivoFatturato?"#27AE60":BRAND.oroD}}>€ {fmt(fatturatoLordo)} / € {fmt(obiettivoFatturato)}</span>
                    </div>
                    <div style={{background:"#f0f0f0",borderRadius:8,height:20,overflow:"hidden",position:"relative"}}>
                      <div style={{height:"100%",borderRadius:8,background:fatturatoLordo>=obiettivoFatturato?"#27AE60":`linear-gradient(90deg,${BRAND.oro},#A8863A)`,width:`${Math.min(100,fatturatoLordo/obiettivoFatturato*100)}%`,transition:"width 0.5s ease"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#aaa",flexWrap:"wrap",gap:4}}>
                      <span>Raggiunto: <strong style={{color:BRAND.oroD}}>{(fatturatoLordo/obiettivoFatturato*100).toFixed(1)}%</strong></span>
                      {fatturatoLordo<obiettivoFatturato
                        ?<span style={{color:"#E67E22"}}>Mancano <strong>€ {fmt(obiettivoFatturato-fatturatoLordo)}</strong> al fatturato obiettivo</span>
                        :<span style={{color:"#27AE60",fontWeight:600}}>🎉 Obiettivo fatturato raggiunto!</span>}
                    </div>
                  </div>
                )}

                {/* BARRA 2 — Quota Agenzia vs Break Even (costi) */}
                {(obiettivoQuotaAgenzia>0||costiRif>0)&&(
                  <div style={{background:"#fff",borderRadius:10,border:`1px solid ${quotaAgenzia>=costiRif?"#27AE6044":"#E74C3C44"}`,padding:"1rem",marginBottom:"1.25rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:4}}>
                      <div>
                        <span style={{fontSize:13,fontWeight:600,color:BRAND.grigio}}>🎯 Obiettivo 2 — Quota Agenzia vs Break Even</span>
                        <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Ciò che resta all'agenzia dopo le provvigioni agenti — deve coprire i costi fissi</p>
                      </div>
                      <span style={{fontSize:14,fontWeight:700,color:quotaAgenzia>=costiRif?"#27AE60":"#E74C3C"}}>€ {fmt(quotaAgenzia)} / € {fmt(obiettivoQuotaAgenzia>0?obiettivoQuotaAgenzia:costiRif)}</span>
                    </div>
                    <div style={{background:"#f0f0f0",borderRadius:8,height:20,overflow:"hidden",position:"relative"}}>
                      {/* Barra quota agenzia */}
                      <div style={{height:"100%",borderRadius:8,background:quotaAgenzia>=costiRif?"#27AE60":"linear-gradient(90deg,#E74C3C,#C0392B)",width:`${Math.min(100,quotaAgenzia/Math.max(obiettivoQuotaAgenzia||costiRif,1)*100)}%`,transition:"width 0.5s ease"}}/>
                      {/* Linea break even (costi) se obiettivo diverso dai costi */}
                      {obiettivoQuotaAgenzia>0&&costiRif>0&&obiettivoQuotaAgenzia!==costiRif&&(
                        <div style={{position:"absolute",top:0,bottom:0,left:`${Math.min(100,costiRif/obiettivoQuotaAgenzia*100)}%`,width:2,background:"#E74C3C",opacity:0.8}}/>
                      )}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,flexWrap:"wrap",gap:4}}>
                      <span style={{color:"#aaa"}}>
                        Break Even ({totConsuntivo>0?"consuntivo":"previsionale"}): <strong style={{color:"#E74C3C"}}>€ {fmt(costiRif)}</strong>
                        {totPrevMensile>0&&<span> · € {fmt(Math.round(totPrevMensile))}/mese</span>}
                      </span>
                      {quotaAgenzia<costiRif
                        ?<span style={{color:"#E74C3C",fontWeight:500}}>⚠ Deficit: <strong>€ {fmt(costiRif-quotaAgenzia)}</strong> da coprire</span>
                        :<span style={{color:"#27AE60",fontWeight:600}}>✅ Break Even raggiunto! Margine: +€ {fmt(margine)}</span>}
                    </div>
                    {obiettivoQuotaAgenzia>0&&<div style={{marginTop:6,fontSize:11,color:"#aaa",textAlign:"right"}}>Obiettivo quota: {(quotaAgenzia/obiettivoQuotaAgenzia*100).toFixed(1)}% raggiunto{quotaAgenzia<obiettivoQuotaAgenzia?` · mancano € ${fmt(obiettivoQuotaAgenzia-quotaAgenzia)}`:""}</div>}
                  </div>
                )}
                {obiettivoFatturato===0&&obiettivoQuotaAgenzia===0&&<p style={{fontSize:12,color:"#aaa",textAlign:"center",margin:"0 0 1rem"}}>💡 Imposta gli obiettivi qui sopra per visualizzare le barre di avanzamento</p>}
              </>);
            })()}

            {/* Tabella voci di costo — spese singole per categoria */}
            <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden"}}>
              <div style={{padding:"12px 16px",background:"#fafaf8",borderBottom:"0.5px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <span style={{fontSize:13,fontWeight:500}}>Voci di costo — {costiAnno}</span>
                  {(()=>{const voci=costi[costiAnno]||mkCosti();const totSp=voci.reduce((s,v)=>s+totSpeseVoce(v),0);const totPr=voci.reduce((s,v)=>s+prevAnnuoVoce(v),0);return totSp>0&&(<span style={{fontSize:12,padding:"3px 10px",borderRadius:6,background:"#E9F7EF",color:"#27AE60",fontWeight:500}}>Totale spese: € {fmt(totSp)} {totPr>0?`/ € ${fmt(totPr)} prev.`:""}</span>);})()}
                </div>
                <button style={S.btnP} onClick={()=>{
                  const n=window.prompt("Nome della nuova voce di costo:");
                  if(!n||!n.trim()) return;
                  const v=[...(costi[costiAnno]||mkCosti())];
                  v.push({id:Date.now(),voce:n.trim(),prevMensile:0,spese:[]});
                  setCosti({...costi,[costiAnno]:v});
                }}>+ Aggiungi voce</button>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr>
                  <th style={{...S.th,minWidth:200}}>Voce di costo</th>
                  <th style={{...S.th,textAlign:"right",color:BRAND.oroD,background:"#FDF6EC"}}>Importo rata</th>
                  <th style={{...S.th,color:BRAND.oroD,background:"#FDF6EC"}}>Frequenza</th>
                  <th style={{...S.th,textAlign:"right",color:BRAND.oroD,background:"#FDF6EC"}}>Prev. annuo</th>
                  <th style={{...S.th,textAlign:"right",color:"#27AE60"}}>Tot. spese</th>
                  <th style={{...S.th,textAlign:"right"}}>Diff. vs prev.</th>
                  <th style={{...S.th,textAlign:"center"}}>Spese</th>
                  <th style={S.th}></th>
                </tr></thead>
                <tbody>
                  {(costi[costiAnno]||mkCosti()).map((voce,idx)=>{
                    const prevAnnuo=prevAnnuoVoce(voce);
                    const tot=totSpeseVoce(voce);
                    const diff=tot-prevAnnuo;
                    const nSpese=(voce.spese||[]).length;
                    return(<tr key={voce.id} style={{background:idx%2===0?"#fff":"#fafafa"}}>
                      <td style={{...S.td,fontWeight:500}}>{voce.voce}</td>
                      <td style={{padding:"6px 8px",borderBottom:"0.5px solid #f5f5f5",background:"#FDF6EC"}}>
                        <input type="number" style={{width:"100%",fontSize:13,padding:"5px 8px",borderRadius:5,border:"0.5px solid #ddd",textAlign:"right",background:"transparent",boxSizing:"border-box"}}
                          value={voce.prevMensile||""} placeholder="0"
                          onChange={e=>{const v=[...(costi[costiAnno]||mkCosti())];v[idx]={...v[idx],prevMensile:Number(e.target.value)};setCosti({...costi,[costiAnno]:v});}}/>
                      </td>
                      <td style={{padding:"6px 8px",borderBottom:"0.5px solid #f5f5f5",background:"#FDF6EC"}}>
                        <select style={{fontSize:12,padding:"4px 6px",borderRadius:5,border:"0.5px solid #ddd",background:"transparent",width:"100%",color:BRAND.oroD,fontWeight:500}}
                          value={voce.frequenza||"mensile"}
                          onChange={e=>{const v=[...(costi[costiAnno]||mkCosti())];v[idx]={...v[idx],frequenza:e.target.value};setCosti({...costi,[costiAnno]:v});}}>
                          <option value="mensile">Mensile ×12</option>
                          <option value="trimestrale">Trimestrale ×4</option>
                          <option value="semestrale">Semestrale ×2</option>
                          <option value="annuale">Annuale ×1</option>
                        </select>
                      </td>
                      <td style={{...S.tdR,fontWeight:500,color:BRAND.oroD,background:"#FDF6EC"}}>€ {fmt(prevAnnuoVoce(voce))}</td>
                      <td style={{...S.tdR,fontWeight:500,color:tot>0?"#27AE60":"#ccc"}}>{tot>0?`€ ${fmt(tot)}`:"—"}</td>
                      <td style={{...S.tdR,fontWeight:500,color:diff>0?"#E74C3C":diff<0?"#27AE60":"#aaa"}}>{tot>0?(diff!==0?(diff>0?"+":"")+fmt(diff):"—"):"—"}</td>
                      <td style={S.tdC}>
                        <button style={{fontSize:12,padding:"4px 12px",borderRadius:6,border:`0.5px solid ${nSpese>0?BRAND.oro:"#ddd"}`,background:nSpese>0?`${BRAND.oro}18`:"transparent",color:nSpese>0?BRAND.oroD:"#999",cursor:"pointer"}}
                          onClick={()=>{setModalCostoVoce({voce,idx,anno:costiAnno});setFormNuovaSpesa({data:todayStr(),importo:"",desc:""});}}>
                          {nSpese>0?`${nSpese} ${nSpese===1?"spesa":"spese"}`:"Aggiungi"}
                        </button>
                      </td>
                      <td style={S.tdC}>
                        <button style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:16,lineHeight:1}}
                          onClick={()=>{if(window.confirm(`Eliminare "${voce.voce}" e tutte le sue spese?`)){const v=[...(costi[costiAnno]||mkCosti())];v.splice(idx,1);setCosti({...costi,[costiAnno]:v});}}}
                          onMouseEnter={e=>e.currentTarget.style.color="#E74C3C"} onMouseLeave={e=>e.currentTarget.style.color="#ddd"}>✕</button>
                      </td>
                    </tr>);
                  })}
                </tbody>
                <tfoot>{(()=>{
                  const voci=costi[costiAnno]||mkCosti();
                  const totPrevA=voci.reduce((s,v)=>s+prevAnnuoVoce(v),0);
                  const totSpTot=voci.reduce((s,v)=>s+totSpeseVoce(v),0);
                  const diffTot=totSpTot-totPrevA;
                  return(<tr style={{background:BRAND.beige,fontWeight:500,fontSize:13}}>
                    <td style={S.td}>TOTALE</td>
                    <td style={{...S.tdR,color:BRAND.oroD,background:"#FDF6EC"}} colSpan={2}></td>
                    <td style={{...S.tdR,color:BRAND.oroD,background:"#FDF6EC"}}>€ {fmt(totPrevA)}</td>
                    <td style={{...S.tdR,color:"#27AE60"}}>€ {fmt(totSpTot)}</td>
                    <td style={{...S.tdR,color:diffTot>0?"#E74C3C":diffTot<0?"#27AE60":"#aaa"}}>{totSpTot>0?(diffTot!==0?(diffTot>0?"+":"")+fmt(diffTot):"—"):"—"}</td>
                    <td colSpan={2}/>
                  </tr>);
                })()}</tfoot>
              </table>
            </div>
          </div>)}

          {/* COSTI & BREAK EVEN AGENTE (solo per agenti non-Broker) */}
          {tab==="Costi & Break Even"&&!isBroker&&myAgentId&&(()=>{
            const ag = agenti.find(a=>a.id===myAgentId);
            const mieVoci = costiAgente[myAgentId]?.[costiAgenteAnno] || mkCostiAgente();
            const salvaMieVoci = (nuove) => setCostiAgente({...costiAgente,[myAgentId]:{...(costiAgente[myAgentId]||{}),[costiAgenteAnno]:nuove}});
            const prevAnnuoVoceAg = v => {const p=Number(v.prevMensile||0);const f=v.frequenza||"mensile";return p*(f==="mensile"?12:f==="trimestrale"?4:f==="semestrale"?2:1);};
            const totSpeseVoceAg = v => (v.spese||[]).reduce((s,x)=>s+Number(x.importo||0),0);
            const totPrevAnno = mieVoci.reduce((s,v)=>s+prevAnnuoVoceAg(v),0);
            const totConsuntivo = mieVoci.reduce((s,v)=>s+totSpeseVoceAg(v),0);
            return(
              <div style={S.sec}>
                {/* Header anno */}
                <div style={{display:"flex",gap:12,marginBottom:"1.25rem",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <h2 style={{fontSize:16,fontWeight:600,margin:"0 0 2px",color:BRAND.grigio}}>💼 Le mie spese — {ag?.nome} {ag?.cognome}</h2>
                    <p style={{fontSize:11,color:"#aaa",margin:0}}>Voci personali visibili solo a te</p>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <label style={{fontSize:13,color:"#888"}}>Anno:</label>
                    <select style={S.sel} value={costiAgenteAnno} onChange={e=>setCostiAgenteAnno(e.target.value)}>
                      {[...new Set([annoCorrente,...Object.keys(costiAgente[myAgentId]||{})])].sort().reverse().map(a=><option key={a}>{a}</option>)}
                      <option value={String(Number(annoCorrente)+1)}>{Number(annoCorrente)+1}</option>
                    </select>
                  </div>
                </div>

                {/* KPI produzione agente vs costi — come broker */}
                {(()=>{
                  const vendAnnoAg=venduti.filter(v=>getAnno(v.dataVendita||v.dataAtto||"")===costiAgenteAnno&&(Number(v.agenteListing)===myAgentId||Number(v.agenteAcquirente)===myAgentId||Number(v.buyerListing)===myAgentId||Number(v.buyer)===myAgentId));
                  // Produzione agente = provv agenzia lato listing+acquirente (non buyer)
                  const produzione=vendAnnoAg.reduce((s,v)=>{
                    let p=0;
                    if(Number(v.agenteListing)===myAgentId)p+=Number(v.provvVenditore||0);
                    if(Number(v.agenteAcquirente)===myAgentId)p+=Number(v.provvAcquirente||0);
                    return s+p;
                  },0);
                  // Quota agente incassata (tutti i ruoli)
                  const quotaIncassataAg=vendAnnoAg.reduce((s,v)=>{
                    let q=0;
                    if(Number(v.agenteListing)===myAgentId)q+=calcolaIncassatoV(v)*Number(v.percListing||0)/100;
                    if(Number(v.agenteAcquirente)===myAgentId)q+=calcolaIncassatoA(v)*Number(v.percAcquirente||0)/100;
                    if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId)q+=calcolaIncassatoV(v)*Number(v.percBuyerListing||0)/100;
                    if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId)q+=calcolaIncassatoA(v)*Number(v.percBuyer||0)/100;
                    return s+q;
                  },0);
                  const obFat=Number((obiettivoAgente[myAgentId]||{}).fatturato||0);
                  const obQuota=Number((obiettivoAgente[myAgentId]||{}).quota||0);
                  const percFat=obFat>0?Math.min(100,produzione/obFat*100):0;
                  const percQuota=obQuota>0?Math.min(100,quotaIncassataAg/obQuota*100):0;
                  const costiRif=totConsuntivo>0?totConsuntivo:totPrevAnno;
                  const margine=quotaIncassataAg-costiRif;

                  const updOb=(k,v)=>setObiettivoAgente({...obiettivoAgente,[myAgentId]:{...(obiettivoAgente[myAgentId]||{}),fatturato:obFat,quota:obQuota,[k]:Number(v)}});

                  return(<>
                    {/* Obiettivi input + 4 KPI */}
                    <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"14px 18px",marginBottom:"1.25rem"}}>
                      <p style={{fontSize:11,fontWeight:600,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 12px"}}>Obiettivi anno {costiAgenteAnno}</p>
                      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
                        <div>
                          <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Obiettivo fatturato agenzia prodotto (€)</label>
                          <input style={{...S.inp,margin:0}} type="number" placeholder="es. 150000" value={obFat||""} onChange={e=>updOb("fatturato",e.target.value)}/>
                        </div>
                        <div>
                          <label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Obiettivo quota incassata agente (€)</label>
                          <input style={{...S.inp,margin:0}} type="number" placeholder="es. 40000" value={obQuota||""} onChange={e=>updOb("quota",e.target.value)}/>
                        </div>
                      </div>
                    </div>

                    {/* 4 KPI */}
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
                      <div style={S.card("#27AE60")}>
                        <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Produzione {costiAgenteAnno}</p>
                        <p style={{fontSize:22,fontWeight:600,margin:0,color:"#27AE60"}}>€ {fmt(produzione)}</p>
                        <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>Listing + Acquirente</p>
                      </div>
                      <div style={S.card("#2980B9")}>
                        <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Quota incassata {costiAgenteAnno}</p>
                        <p style={{fontSize:22,fontWeight:600,margin:0,color:"#2980B9"}}>€ {fmt(quotaIncassataAg)}</p>
                        <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>Ag. + Buyer</p>
                      </div>
                      <div style={S.card("#E67E22")}>
                        <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Costi {costiAgenteAnno}</p>
                        <p style={{fontSize:22,fontWeight:600,margin:0,color:"#E67E22"}}>€ {fmt(costiRif)}</p>
                        <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>{totConsuntivo>0?"consuntivi":"previsionali"}</p>
                      </div>
                      <div style={S.card(margine>=0?"#27AE60":"#E74C3C")}>
                        <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Margine agente</p>
                        <p style={{fontSize:22,fontWeight:600,margin:0,color:margine>=0?"#27AE60":"#E74C3C"}}>{margine>=0?"+":""}€ {fmt(margine)}</p>
                        <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>quota - costi</p>
                      </div>
                    </div>

                    {/* Barra 1: Produzione vs Obiettivo fatturato */}
                    {obFat>0&&(
                      <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem",marginBottom:"1.25rem"}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:4}}>
                          <span style={{fontSize:13,fontWeight:500,color:BRAND.grigio}}>Produzione agenzia vs obiettivo {costiAgenteAnno}</span>
                          <span style={{fontSize:13,fontWeight:600,color:produzione>=obFat?"#27AE60":BRAND.oroD}}>€ {fmt(produzione)} / € {fmt(obFat)}</span>
                        </div>
                        <div style={{background:"#f0f0f0",borderRadius:8,height:16,overflow:"hidden"}}>
                          <div style={{height:"100%",borderRadius:8,background:produzione>=obFat?"#27AE60":`linear-gradient(90deg,${BRAND.oro},#A8863A)`,width:`${percFat}%`,transition:"width 0.5s ease"}}/>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#aaa"}}>
                          <span>Costi previsionali: € {fmt(totPrevAnno)}</span>
                          <span>{percFat.toFixed(1)}% raggiunto</span>
                          {produzione<obFat&&<span style={{color:"#E67E22"}}>Mancano € {fmt(obFat-produzione)}</span>}
                          {produzione>=obFat&&<span style={{color:"#27AE60",fontWeight:500}}>Obiettivo raggiunto! 🎉</span>}
                        </div>
                      </div>
                    )}

                    {/* Barra 2: Quota incassata vs Obiettivo quota */}
                    {obQuota>0&&(
                      <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"1rem",marginBottom:"1.25rem"}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:4}}>
                          <span style={{fontSize:13,fontWeight:500,color:BRAND.grigio}}>Quota incassata agente vs obiettivo {costiAgenteAnno}</span>
                          <span style={{fontSize:13,fontWeight:600,color:quotaIncassataAg>=obQuota?"#27AE60":"#2980B9"}}>€ {fmt(quotaIncassataAg)} / € {fmt(obQuota)}</span>
                        </div>
                        <div style={{background:"#f0f0f0",borderRadius:8,height:16,overflow:"hidden"}}>
                          <div style={{height:"100%",borderRadius:8,background:quotaIncassataAg>=obQuota?"#27AE60":"linear-gradient(90deg,#2980B9,#1A5F8A)",width:`${percQuota}%`,transition:"width 0.5s ease"}}/>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#aaa"}}>
                          <span>Ag: € {fmt(vendAnnoAg.reduce((s,v)=>{let q=0;if(Number(v.agenteListing)===myAgentId)q+=calcolaIncassatoV(v)*Number(v.percListing||0)/100;if(Number(v.agenteAcquirente)===myAgentId)q+=calcolaIncassatoA(v)*Number(v.percAcquirente||0)/100;return s+q;},0))} · Buyer: € {fmt(vendAnnoAg.reduce((s,v)=>{let q=0;if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId)q+=calcolaIncassatoV(v)*Number(v.percBuyerListing||0)/100;if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId)q+=calcolaIncassatoA(v)*Number(v.percBuyer||0)/100;return s+q;},0))}</span>
                          <span>{percQuota.toFixed(1)}% raggiunto</span>
                          {quotaIncassataAg<obQuota&&<span style={{color:"#2980B9"}}>Mancano € {fmt(obQuota-quotaIncassataAg)}</span>}
                          {quotaIncassataAg>=obQuota&&<span style={{color:"#27AE60",fontWeight:500}}>Obiettivo raggiunto! 🎉</span>}
                        </div>
                      </div>
                    )}
                    {(obFat===0||obQuota===0)&&<p style={{fontSize:12,color:"#aaa",margin:"0 0 1rem",textAlign:"center"}}>💡 Imposta gli obiettivi qui sopra per visualizzare le barre di avanzamento</p>}
                  </>);
                })()}

                {/* KPI spese personali — togliendo i 3 box ridondanti, solo totale */}
                <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,padding:"12px 16px",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <p style={{fontSize:13,fontWeight:500,color:BRAND.grigio,margin:0}}>Le mie spese — {ag?.nome} {ag?.cognome} · {costiAgenteAnno}</p>
                  <div style={{display:"flex",gap:16,alignItems:"center"}}>
                    {totPrevAnno>0&&<span style={{fontSize:12,color:"#888"}}>Prev.: <strong style={{color:BRAND.oroD}}>€ {fmt(totPrevAnno)}</strong></span>}
                    <span style={{fontSize:12,color:"#888"}}>Spese: <strong style={{color:totConsuntivo>totPrevAnno&&totPrevAnno>0?"#E74C3C":"#27AE60"}}>€ {fmt(totConsuntivo)}</strong></span>
                  </div>
                </div>
                {/* Tabella voci */}
                <div style={{background:"#fff",border:"0.5px solid #e8e5e0",borderRadius:10,overflow:"hidden",marginBottom:"1rem"}}>
                  <div style={{padding:"12px 16px",borderBottom:"0.5px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <p style={{fontSize:13,fontWeight:500,color:BRAND.grigio,margin:0}}>Voci di costo</p>
                      {totConsuntivo>0&&<span style={{fontSize:12,padding:"3px 10px",borderRadius:6,background:"#E9F7EF",color:"#27AE60",fontWeight:500}}>Totale spese: € {fmt(totConsuntivo)}</span>}
                    </div>
                    <button style={S.btnP} onClick={()=>{const nuove=[...mieVoci,{id:Date.now(),voce:"Nuova voce",prevMensile:0,frequenza:"mensile",spese:[]}];salvaMieVoci(nuove);}}>+ Aggiungi voce</button>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{background:"#fafaf8"}}>{["Voce","Freq.","Prev./periodo","Prev. annuo","Consuntivo","Scostamento","Spese",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {mieVoci.map((voce,idx)=>{
                        const prevA=prevAnnuoVoceAg(voce);
                        const tot=totSpeseVoceAg(voce);
                        const diff=tot-prevA;
                        const nSpese=(voce.spese||[]).length;
                        return(<tr key={voce.id||idx}>
                          <td style={S.td}><input style={{...S.inp,margin:0,fontSize:13,border:"none",background:"transparent",padding:"2px 0",width:"100%"}} value={voce.voce} onChange={e=>{const nuove=[...mieVoci];nuove[idx]={...nuove[idx],voce:e.target.value};salvaMieVoci(nuove);}}/></td>
                          <td style={S.tdC}>
                            <select style={{...S.inp,margin:0,fontSize:12,padding:"3px 6px"}} value={voce.frequenza||"mensile"} onChange={e=>{const nuove=[...mieVoci];nuove[idx]={...nuove[idx],frequenza:e.target.value};salvaMieVoci(nuove);}}>
                              <option value="mensile">Mens. ×12</option><option value="trimestrale">Trim. ×4</option><option value="semestrale">Sem. ×2</option><option value="annuale">Ann. ×1</option>
                            </select>
                          </td>
                          <td style={S.tdR}><input style={{...S.inp,margin:0,fontSize:13,textAlign:"right",border:"none",background:"transparent",padding:"2px 4px",width:80}} type="number" value={voce.prevMensile||""} placeholder="0" onChange={e=>{const nuove=[...mieVoci];nuove[idx]={...nuove[idx],prevMensile:Number(e.target.value)};salvaMieVoci(nuove);}}/></td>
                          <td style={{...S.tdR,fontWeight:500,color:BRAND.oroD,background:"#FDF6EC"}}>€ {fmt(prevA)}</td>
                          <td style={{...S.tdR,fontWeight:500,color:tot>0?"#27AE60":"#ccc"}}>{tot>0?`€ ${fmt(tot)}`:"—"}</td>
                          <td style={{...S.tdR,fontWeight:500,color:diff>0?"#E74C3C":diff<0?"#27AE60":"#aaa"}}>{tot>0&&diff!==0?(diff>0?"+":"")+fmt(diff):"—"}</td>
                          <td style={S.tdC}>
                            <button style={{fontSize:12,padding:"4px 12px",borderRadius:6,border:`0.5px solid ${nSpese>0?BRAND.oro:"#ddd"}`,background:nSpese>0?`${BRAND.oro}18`:"transparent",color:nSpese>0?BRAND.oroD:"#999",cursor:"pointer"}}
                              onClick={()=>{setModalCostoVoceAg({voce,idx,anno:costiAgenteAnno});setFormNuovaSpesaAg({data:todayStr(),importo:"",desc:""});}}>
                              {nSpese>0?`${nSpese} spese`:"Aggiungi"}
                            </button>
                          </td>
                          <td style={S.tdC}>
                            <button style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:16,lineHeight:1}}
                              onClick={()=>{if(window.confirm(`Eliminare "${voce.voce}"?`)){const nuove=[...mieVoci];nuove.splice(idx,1);salvaMieVoci(nuove);}}}
                              onMouseEnter={e=>e.currentTarget.style.color="#E74C3C"} onMouseLeave={e=>e.currentTarget.style.color="#ddd"}>✕</button>
                          </td>
                        </tr>);
                      })}
                    </tbody>
                  </table>
                </div>

                {/* MODAL SPESE VOCE AGENTE */}
                {modalCostoVoceAg&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setModalCostoVoceAg(null)}>
                  <div style={{...S.modal,width:"min(96vw,520px)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem"}}>
                      <div><h2 style={{fontSize:16,fontWeight:500,margin:"0 0 3px",color:BRAND.grigio}}>{modalCostoVoceAg.voce.voce}</h2><p style={{fontSize:12,color:"#aaa",margin:0}}>Previsionale annuo: <strong style={{color:BRAND.oroD}}>€ {fmt(prevAnnuoVoceAg(modalCostoVoceAg.voce))}</strong></p></div>
                      <button onClick={()=>setModalCostoVoceAg(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#ccc",padding:0}}>✕</button>
                    </div>
                    <div style={{background:BRAND.beige,borderRadius:8,padding:"12px 14px",marginBottom:"1rem"}}>
                      <p style={{fontSize:12,fontWeight:500,color:BRAND.oroD,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 10px"}}>Aggiungi spesa</p>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        <div><label style={S.lbl}>Data</label><input style={S.inp} type="date" value={formNuovaSpesaAg.data} onChange={e=>setFormNuovaSpesaAg({...formNuovaSpesaAg,data:e.target.value})}/></div>
                        <div><label style={S.lbl}>Importo (€)</label><input style={S.inp} type="number" placeholder="0" value={formNuovaSpesaAg.importo} onChange={e=>setFormNuovaSpesaAg({...formNuovaSpesaAg,importo:e.target.value})}/></div>
                      </div>
                      <div style={{marginBottom:8}}><label style={S.lbl}>Descrizione</label><input style={S.inp} type="text" placeholder="es. Carburante, Pranzo cliente..." value={formNuovaSpesaAg.desc} onChange={e=>setFormNuovaSpesaAg({...formNuovaSpesaAg,desc:e.target.value})} onKeyDown={e=>{if(e.key==="Enter"&&formNuovaSpesaAg.importo){const nuove=[...mieVoci];const idx=modalCostoVoceAg.idx;nuove[idx]={...nuove[idx],spese:[...(nuove[idx].spese||[]),{id:Date.now(),data:formNuovaSpesaAg.data,importo:Number(formNuovaSpesaAg.importo),desc:formNuovaSpesaAg.desc}]};salvaMieVoci(nuove);setModalCostoVoceAg({...modalCostoVoceAg,voce:nuove[idx]});setFormNuovaSpesaAg({data:todayStr(),importo:"",desc:""});}}}/></div>
                      <button style={{...S.btnP,width:"100%"}} onClick={()=>{if(!formNuovaSpesaAg.importo)return;const nuove=[...mieVoci];const idx=modalCostoVoceAg.idx;nuove[idx]={...nuove[idx],spese:[...(nuove[idx].spese||[]),{id:Date.now(),data:formNuovaSpesaAg.data,importo:Number(formNuovaSpesaAg.importo),desc:formNuovaSpesaAg.desc}]};salvaMieVoci(nuove);setModalCostoVoceAg({...modalCostoVoceAg,voce:nuove[idx]});setFormNuovaSpesaAg({data:todayStr(),importo:"",desc:""});}}>+ Aggiungi spesa</button>
                    </div>
                    <div style={{maxHeight:300,overflowY:"auto"}}>
                      {(modalCostoVoceAg.voce.spese||[]).sort((a,b)=>b.data?.localeCompare(a.data||"")||0).map(s=>(
                        <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#fff",borderRadius:6,border:"0.5px solid #e8e5e0",marginBottom:4}}>
                          <span style={{fontSize:12,color:"#aaa",minWidth:78}}>{fmtD(s.data)}</span>
                          <span style={{fontSize:13,flex:1,color:BRAND.grigio}}>{s.desc||"—"}</span>
                          <span style={{fontSize:13,fontWeight:500,color:BRAND.grigio}}>€ {fmt(s.importo)}</span>
                          <button style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:16,lineHeight:1,padding:0,flexShrink:0}}
                            onClick={()=>{const nuove=[...mieVoci];const idx=modalCostoVoceAg.idx;nuove[idx]={...nuove[idx],spese:nuove[idx].spese.filter(x=>x.id!==s.id)};salvaMieVoci(nuove);setModalCostoVoceAg({...modalCostoVoceAg,voce:nuove[idx]});}}
                            onMouseEnter={e=>e.currentTarget.style.color="#E74C3C"} onMouseLeave={e=>e.currentTarget.style.color="#ddd"}>✕</button>
                        </div>
                      ))}
                      {(modalCostoVoceAg.voce.spese||[]).length===0&&<p style={{textAlign:"center",color:"#bbb",fontSize:13,margin:"1rem 0"}}>Nessuna spesa inserita</p>}
                    </div>
                    {(modalCostoVoceAg.voce.spese||[]).length>0&&(
                      <div style={{borderTop:"0.5px solid #eee",paddingTop:12,marginTop:8,display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontSize:13,color:"#888"}}>{(modalCostoVoceAg.voce.spese||[]).length} spese</span>
                        <strong style={{fontSize:15,color:"#27AE60"}}>€ {fmt(totSpeseVoceAg(modalCostoVoceAg.voce))}</strong>
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:"flex-end",marginTop:"1rem"}}><button style={S.btnP} onClick={()=>setModalCostoVoceAg(null)}>Chiudi</button></div>
                  </div>
                </div>)}
              </div>
            );
          })()}

          {/* LE MIE FATTURE (solo agente) */}
          {tab==="Fatture Agente"&&!isBroker&&myAgentId&&(()=>{
            const ag=agenti.find(a=>a.id===myAgentId);
            // Tutte le pratiche dove l'agente ha un ruolo e ha incassato qualcosa
            const tuttiMiei=venduti.filter(v=>{
              const hasRuolo=Number(v.agenteListing)===myAgentId||Number(v.agenteAcquirente)===myAgentId||Number(v.buyerListing)===myAgentId||Number(v.buyer)===myAgentId;
              if(!hasRuolo) return false;
              return true;
            }).sort((a,b)=>(b.dataVendita||b.dataAtto||"").localeCompare(a.dataVendita||a.dataAtto||""));

            const anniMioFat=Array.from(new Set(tuttiMiei.map(v=>getAnno(v.dataVendita||v.dataAtto||"")).filter(Boolean))).sort().reverse();
            const mesiMioFat=Array.from(new Set(tuttiMiei.filter(v=>mioFatAnno==="Tutti"||getAnno(v.dataVendita||v.dataAtto||"")===mioFatAnno).map(v=>getMese(v.dataVendita||v.dataAtto||"")).filter(Boolean))).sort().reverse();

            const myFatDati=tuttiMiei.filter(v=>{
              const dataRif=v.dataVendita||v.dataAtto||"";
              if(mioFatAnno!=="Tutti"&&getAnno(dataRif)!==mioFatAnno) return false;
              if(mioFatMese!=="Tutti"&&getMese(dataRif)!==mioFatMese) return false;
              if(mioFatStato!=="Tutti"){
                // Filtro su stato pagamento Agenzia→Agente
                const key=`${v.id}_${myAgentId}`;
                const pag=pagamentiFatture[key]||{stato:"Da pagare"};
                if(pag.stato!==mioFatStato) return false;
              }
              return true;
            });

            // Quota TOTALE maturata (su provv totale, non solo incassata)
            const calcolaQuotaMiaTot=(v)=>{
              let q=0;
              if(Number(v.agenteListing)===myAgentId) q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100;
              if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId) q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;
              if(Number(v.agenteAcquirente)===myAgentId) q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100;
              if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId) q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;
              return q;
            };
            // Quota INCASSATA (solo sulla parte già incassata dall'agenzia)
            const calcolaQuotaMiaInc=(v)=>{
              let q=0;
              if(Number(v.agenteListing)===myAgentId) q+=calcolaIncassatoV(v)*Number(v.percListing||0)/100;
              if(Number(v.buyerListing)===myAgentId&&Number(v.agenteListing)!==myAgentId) q+=calcolaIncassatoV(v)*Number(v.percBuyerListing||0)/100;
              if(Number(v.agenteAcquirente)===myAgentId) q+=calcolaIncassatoA(v)*Number(v.percAcquirente||0)/100;
              if(Number(v.buyer)===myAgentId&&Number(v.agenteAcquirente)!==myAgentId) q+=calcolaIncassatoA(v)*Number(v.percBuyer||0)/100;
              return q;
            };

            // KPI globali (tutti, senza filtri)
            const totFatture=tuttiMiei.reduce((s,v)=>s+calcolaQuotaMiaTot(v),0);
            const totIncassato=tuttiMiei.reduce((s,v)=>s+calcolaQuotaMiaInc(v),0);
            const totDaInc=totFatture-totIncassato;

            // Per la lista filtrata usiamo la quota totale maturata
            const calcolaQuotaMiaV=(v)=>calcolaQuotaMiaTot(v);
            const totMia=myFatDati.reduce((s,v)=>s+calcolaQuotaMiaTot(v),0);

            // Stato pagamento agente (basato su pagamentiFatture)
            const getPagAg=v=>{
              const key=`${v.id}_${myAgentId}`;
              return pagamentiFatture[key]||{stato:"Da pagare",importoPagato:0,dataPagamento:""};
            };
            const cfgStatoFat={
              "Pagato":{bg:"#E9F7EF",clr:"#27AE60",s:"✅"},
              "Parziale":{bg:"#FEF0E0",clr:"#E67E22",s:"⏳"},
              "Da pagare":{bg:"#FDECEA",clr:"#E74C3C",s:"🔴"},
            };

            return(
              <div style={S.sec}>
                <div style={{marginBottom:"1rem"}}>
                  <h2 style={{fontSize:16,fontWeight:600,margin:"0 0 2px",color:BRAND.grigio}}>🧾 Le mie fatture — {ag?.nome} {ag?.cognome}</h2>
                  <p style={{fontSize:11,color:"#aaa",margin:0}}>Sola lettura · quota provvigionale sulle pratiche dove intervieni</p>
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
                    <option value="Tutti">Tutti gli stati pagamento</option>
                    <option value="Da pagare">Da pagare</option>
                    <option value="Parziale">Pagato parzialmente</option>
                    <option value="Pagato">Pagato</option>
                  </Sel>
                </div>
                {/* KPI — 3 box corretti */}
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10,marginBottom:"1.25rem"}}>
                  <div style={S.card(BRAND.oroD)}>
                    <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Totale fatture maturate</p>
                    <p style={{fontSize:22,fontWeight:600,margin:0,color:BRAND.oroD}}>€ {fmt(totFatture)}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>{tuttiMiei.length} pratiche totali</p>
                  </div>
                  <div style={S.card("#27AE60")}>
                    <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Incassato</p>
                    <p style={{fontSize:22,fontWeight:600,margin:0,color:"#27AE60"}}>€ {fmt(totIncassato)}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>quota già ricevuta</p>
                  </div>
                  <div style={S.card(totDaInc>0?"#E67E22":"#27AE60")}>
                    <p style={{fontSize:11,color:"#888",margin:"0 0 4px"}}>Da incassare</p>
                    <p style={{fontSize:22,fontWeight:600,margin:0,color:totDaInc>0?"#E67E22":"#27AE60"}}>€ {fmt(totDaInc)}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>quota in attesa</p>
                  </div>
                </div>
                {myFatDati.length===0&&<div style={{textAlign:"center",padding:"3rem",color:"#bbb"}}>Nessuna pratica nel periodo</div>}
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
                        <p style={{fontSize:12,color:"#aaa",margin:0}}>Rif.: {fmtD(v.dataVendita||v.dataAtto)} | Prezzo: <strong style={{color:BRAND.oroD}}>€ {fmtN(v.prezzoVendita)}</strong></p>
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                        <span style={{fontSize:11,padding:"3px 9px",borderRadius:4,background:cfgInc.bg,color:cfgInc.clr,fontWeight:500}}>Agenzia: {cfgInc.s} {statoInc}</span>
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

          {/* STATISTICHE */}
          {tab==="Statistiche"&&(()=>{
            // ── helpers ──────────────────────────────────────────────────────
            // Data di riferimento per le statistiche = dataVendita (quando la proposta è accettata)
            const dataRifVend = v => v.dataVendita||v.dataAtto||"";

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
            const agentiReport = agenti.map(ag=>{
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
                    {/* Transazioni totali */}
                    <div style={{...sCard,borderTop:`3px solid ${BRAND.oroD}`}}>
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
                    {/* Incarichi acquisiti */}
                    <div style={{...sCard,borderTop:"3px solid #27AE60"}}>
                      <p style={sLbl}>Incarichi acquisiti</p>
                      <p style={{fontSize:32,fontWeight:700,color:"#27AE60",margin:"4px 0 2px"}}>{incStat.length}</p>
                      <p style={{fontSize:11,color:"#888",margin:0}}>vendite{statAnno!=="Tutti"?` nel ${statAnno}`:""}</p>
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
          {tab==="Impostazioni"&&(<div style={S.sec}>
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
                    setShowProp("new");
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
            <div>{showInc!=="new"&&<button style={S.btnG} onClick={()=>{setFormProp(emptyProp(showInc.categoria,showInc));setShowInc(null);setShowProp("new");}}>+ Crea Proposta</button>}</div>
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
          <div style={{marginBottom:"1rem",padding:"10px 14px",background:BRAND.beige,borderRadius:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:formVend.competenzaAgenteDiversa?10:0}}>
              <input type="checkbox" id="compDiv" checked={formVend.competenzaAgenteDiversa||false} onChange={e=>setFormVend({...formVend,competenzaAgenteDiversa:e.target.checked,dataCompetenzaAgente:e.target.checked?formVend.dataCompetenzaAgente:""})}/>
              <label htmlFor="compDiv" style={{fontSize:13,cursor:"pointer"}}>Competenza agente diversa da data atto</label>
            </div>
            {formVend.competenzaAgenteDiversa&&(
              <div style={{marginTop:8}}>
                <label style={S.lbl}>Data competenza agente (per fatture agenti)</label>
                <input style={{...S.inp,maxWidth:200}} type="date" value={formVend.dataCompetenzaAgente||""} onChange={e=>setFormVend({...formVend,dataCompetenzaAgente:e.target.value})}/>
                <p style={{fontSize:11,color:"#aaa",margin:"4px 0 0"}}>La dashboard agenzia usa sempre la data atto. Le fatture agenti useranno questa data.</p>
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
          <div style={S.g2}><div><label style={S.lbl}>Profilo</label><select style={S.inp} value={formAgente.profilo||"Consulente"} onChange={e=>setFormAgente({...formAgente,profilo:e.target.value,percListing:e.target.value==="Broker"?0:formAgente.percListing,percAcquirente:e.target.value==="Broker"?0:formAgente.percAcquirente})}><option>Broker</option><option>Consulente</option><option>Collaboratore</option></select></div><div><label style={S.lbl}>Tipo</label><select style={S.inp} value={formAgente.tipo||"Interno"} onChange={e=>setFormAgente({...formAgente,tipo:e.target.value})}><option>Interno</option><option>Esterno</option></select></div></div>
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
              {(!formAgente.email||!formAgente.password)&&<p style={{fontSize:11,color:"#aaa",margin:"6px 0 0"}}>Senza email e password l'agente non può accedere al gestionale.</p>}
            </div>
          </>)}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1.25rem"}}><button style={S.btn} onClick={()=>setShowAgente(null)}>Annulla</button><button style={S.btnP} onClick={()=>{if(!formAgente.nome||!formAgente.cognome)return;if(showAgente==="new")setAgenti([...agenti,{...formAgente,id:Date.now(),attivo:formAgente.attivo!==false}]);else setAgenti(agenti.map(a=>a.id===showAgente.id?{...formAgente,id:a.id}:a));setShowAgente(null);}}>Salva</button></div>
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
                        setCosti({...costi,[modalCostoVoce.anno]:voci});
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
