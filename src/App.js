import React, { useState, useMemo, useRef } from "react";


const PROFILI = ["Broker","Consulente","Collaboratore","Segnalatore"];
const TIPOLOGIE = ["4 locali","Villa","2 locali","Porzione","Appartamento","Casa singola","Terreno edificabile","Altro"];
const VINCOLI_DEF = ["Mutuo","Sanatoria","Successione","Permuta","Altro"];
const TABS = ["Dashboard","Proposte","Venduti","Report Agenti","Fattura Agente","Costi & Break Even","Agenti","Impostazioni"];

const STATI_CFG = {
  Proposta:              {clr:"#4A90D9",bg:"#E8F1FB",label:"Proposta",semaforo:"🔵"},
  Controproposta:        {clr:"#E67E22",bg:"#FEF0E0",label:"Controproposta",semaforo:"🟡"},
  Rifiutata:             {clr:"#C0392B",bg:"#FDECEA",label:"Rifiutata",semaforo:"🔴"},
  "Mancata Chiusura":    {clr:"#922B21",bg:"#FADBD8",label:"Mancata Chiusura",semaforo:"🔴"},
  "Accettata con Vincolo":{clr:"#D4AC0D",bg:"#FEF9E7",label:"Acc. con Vincolo",semaforo:"🟡"},
  Accettata:             {clr:"#27AE60",bg:"#E9F7EF",label:"Accettata",semaforo:"🟢"},
  Preliminare:           {clr:"#2980B9",bg:"#EAF4FB",label:"Preliminare",semaforo:"🔵"},
  "Rogito Diretto":      {clr:"#8E44AD",bg:"#F5EEF8",label:"Rogito Diretto",semaforo:"🟣"},
  Incassato:             {clr:"#1E8449",bg:"#D5F5E3",label:"Incassato",semaforo:"🟢"},
};

const PROSSIMI = {
  Proposta:              ["Controproposta","Rifiutata","Accettata con Vincolo","Accettata"],
  Controproposta:        ["Accettata","Mancata Chiusura","Accettata con Vincolo"],
  "Accettata con Vincolo":["Accettata","Rifiutata"],
  Accettata:             ["Preliminare","Rogito Diretto"],
  Preliminare:           ["Incassato"],
  "Rogito Diretto":      ["Incassato"],
  Rifiutata:[],"Mancata Chiusura":[],Incassato:[],
};

const STATI_VENDUTI = ["Accettata","Accettata con Vincolo","Preliminare","Rogito Diretto","Incassato"];
const STATI_CHIUSI  = ["Rifiutata","Mancata Chiusura"];
const BRAND = {oro:"#C9A96E",oroD:"#A8863A",grigio:"#4A4A4A",beige:"#F2F0EB",beigeB:"#EDE8DE"};
const MESI_NOMI = ["","Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

const fmt  = n => Number(n||0).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtN = n => Number(n||0).toLocaleString("it-IT",{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtDate = iso => iso?new Date(iso).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
const nowISO = () => new Date().toISOString();
const getAnno = d => d?d.substring(0,4):"—";
const fmtMese = m => { if(!m) return m; const p=m.split("-"); return MESI_NOMI[parseInt(p[1])]+" "+p[0]; };

const badgeStyle = stato => {
  const c=STATI_CFG[stato]||{clr:"#888",bg:"#eee"};
  return {display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:5,fontSize:11,fontWeight:500,background:c.bg,color:c.clr,border:`0.5px solid ${c.clr}`,whiteSpace:"nowrap"};
};

const provvEffettive = p => {
  const tv = p.provvVenditoreConf!==undefined?Number(p.provvVenditoreConf):Number(p.provvVenditore||0);
  const ta = p.provvAcquirenteConf!==undefined?Number(p.provvAcquirenteConf):Number(p.provvAcquirente||0);
  return {tv,ta};
};

const calcolaQuote = (p,agenti) => {
  const {tv,ta}=provvEffettive(p);
  const agL=agenti.find(a=>a.id===p.agenteListing),agA=agenti.find(a=>a.id===p.agenteAcquirente);
  const percL=agL?.profilo==="Broker"?0:Number(p.percListingConf??p.percListing??0);
  const percA=agA?.profilo==="Broker"?0:Number(p.percAcquirenteConf??p.percAcquirente??0);
  const qBL=p.buyerL?tv*Number(p.percBuyerL||0)/100:0;
  const qB=p.buyer?ta*Number(p.percBuyer||0)/100:0;
  const qLA=tv*percL/100,qAA=ta*percA/100;
  return {tv,ta,quotaListingAgente:qLA,quotaAcquirenteAgente:qAA,quotaBuyerL:qBL,quotaBuyer:qB,quotaAgenziaL:tv-qLA-qBL,quotaAgenziaA:ta-qAA-qB};
};

const INIT_AGENTI = [
  {id:1,nome:"Antonello",cognome:"Di Rita",profilo:"Broker",tipo:"Interno",percListing:0,percAcquirente:0},
  {id:2,nome:"Luca",cognome:"Pagliara",profilo:"Consulente",tipo:"Interno",percListing:40,percAcquirente:40},
  {id:3,nome:"Riccardo",cognome:"Di Rita",profilo:"Collaboratore",tipo:"Interno",percListing:20,percAcquirente:20},
  {id:4,nome:"Fabio",cognome:"Portinaro",profilo:"Collaboratore",tipo:"Interno",percListing:40,percAcquirente:40},
];

const VOCI_COSTO_DEFAULT = [
  "Locazione Ufficio","Spese Condominiali","Utenza Elettricità","Utenza GAS","Telefonia Fissa","Telefonia Cellulare","Pulizie","Assicurazione Ufficio","Imposte Pubblicitarie","Ufficio Multifunzione Canone - CIPE -","Commercialista SRL","Consulente Paghe","Compenso Amministratore","Stipendio Erica Guglielmana","Stipendi x collaborazioni","Tasse / Contributi x Dipendenti","Immobiliare.it","Idealista.it & Casa.it","Sponsorizzazioni Squadre","Gestim + Sito e Hosting mail","Software - Servizi Professionali","FIAIP (Nazionale + Prov + Sister)","Assicurazioni Professionali","Altre Assicurazioni","Agente Strategico Abbonamento"
];

const mkCostoAnno = anno => VOCI_COSTO_DEFAULT.map((voce,i)=>({
  id:i+1, voce, tipo:"Fisso", frequenza:"Mensile",
  importoPrevisionale:0, consuntivi:{},
}));

const INIT_COSTI = {
  "2026": mkCostoAnno("2026"),
};

const INIT_OBIETTIVI = {"2026":{fatturato:360000,compensoTarget:5000}};

const mkStorico = stato => [{stato,data:nowISO()}];

const INIT_PROPOSTE = [
  {id:1,dataProposta:"2025-12",agenteListing:1,percListing:0,percListingConf:0,buyerL:3,percBuyerL:10,comune:"Barasso",indirizzo:"Via Cassini 1",tipologia:"4 locali",venditore:"Fam. Tresoldi",acquirente:"Armellini",agenteAcquirente:1,percAcquirente:0,percAcquirenteConf:0,buyer:3,percBuyer:20,prezzoVendita:180000,prezzoAccettato:180000,vincolata:false,tipoVincolo:"",dataVincolo:"",esitoVincolo:false,tipoAtto:"Preliminare",dataAtto:"2026-01-05",accontoProvv:0,provvVenditore:5400,provvAcquirente:7200,provvVenditoreConf:5400,provvAcquirenteConf:7200,stato:"Incassato",noteStato:"",storico:[{stato:"Proposta",data:"2025-12-01T10:00:00.000Z"},{stato:"Accettata",data:"2025-12-10T10:00:00.000Z"},{stato:"Incassato",data:"2026-01-20T09:00:00.000Z"}]},
  {id:2,dataProposta:"2025-12",agenteListing:1,percListing:0,percListingConf:0,buyerL:null,percBuyerL:0,comune:"Malnate",indirizzo:"Via Buozzi",tipologia:"Villa",venditore:"Fam. Marasciulo",acquirente:"Bottinelli",agenteAcquirente:1,percAcquirente:0,percAcquirenteConf:0,buyer:null,percBuyer:0,prezzoVendita:355000,prezzoAccettato:355000,vincolata:false,tipoVincolo:"",dataVincolo:"",esitoVincolo:false,tipoAtto:"Rogito Diretto",dataAtto:"2026-01-18",accontoProvv:0,provvVenditore:0,provvAcquirente:14200,provvVenditoreConf:0,provvAcquirenteConf:14200,stato:"Incassato",noteStato:"",storico:[{stato:"Proposta",data:"2025-12-02T11:00:00.000Z"},{stato:"Incassato",data:"2026-01-20T10:00:00.000Z"}]},
  {id:3,dataProposta:"2025-12",agenteListing:2,percListing:40,percListingConf:40,buyerL:null,percBuyerL:0,comune:"Malnate",indirizzo:"Viale Kenneky",tipologia:"2 locali",venditore:"Ventura",acquirente:"Di Leo",agenteAcquirente:2,percAcquirente:40,percAcquirenteConf:40,buyer:null,percBuyer:0,prezzoVendita:7000,prezzoAccettato:7000,vincolata:false,tipoVincolo:"",dataVincolo:"",esitoVincolo:false,tipoAtto:"Preliminare",dataAtto:"",accontoProvv:0,provvVenditore:0,provvAcquirente:3000,provvVenditoreConf:0,provvAcquirenteConf:3000,stato:"Incassato",noteStato:"",storico:[{stato:"Proposta",data:"2025-12-05T09:00:00.000Z"},{stato:"Incassato",data:"2026-02-01T08:00:00.000Z"}]},
  {id:4,dataProposta:"2026-02",agenteListing:1,percListing:0,buyerL:null,percBuyerL:0,comune:"Gazzada Schianno",indirizzo:"Via Carducci",tipologia:"Villa",venditore:"Scala Domenico",acquirente:"Roncari Leonardo",agenteAcquirente:1,percAcquirente:0,buyer:3,percBuyer:20,prezzoVendita:282000,prezzoAccettato:null,vincolata:true,tipoVincolo:"Mutuo",dataVincolo:"2026-06-30",esitoVincolo:false,tipoAtto:"Preliminare",dataAtto:"",accontoProvv:0,provvVenditore:1640,provvAcquirente:11200,stato:"Accettata con Vincolo",noteStato:"In attesa risposta banca",storico:[{stato:"Proposta",data:"2026-02-10T10:00:00.000Z"},{stato:"Accettata con Vincolo",data:"2026-02-28T15:00:00.000Z"}]},
  {id:5,dataProposta:"2026-01",agenteListing:2,percListing:40,buyerL:null,percBuyerL:0,comune:"Induno Olona",indirizzo:"Via Porro",tipologia:"Villa",venditore:"Frengulo",acquirente:"Pagliara Enrico",agenteAcquirente:2,percAcquirente:40,buyer:null,percBuyer:0,prezzoVendita:368500,prezzoAccettato:365000,vincolata:false,tipoVincolo:"",dataVincolo:"",esitoVincolo:false,tipoAtto:"Preliminare",dataAtto:"2026-03-10",accontoProvv:3000,provvVenditore:0,provvAcquirente:7370,percListingConf:40,percAcquirenteConf:38,provvVenditoreConf:0,provvAcquirenteConf:6935,stato:"Preliminare",noteStato:"",storico:[{stato:"Proposta",data:"2026-01-15T09:00:00.000Z"},{stato:"Preliminare",data:"2026-03-10T11:00:00.000Z"}]},
  {id:6,dataProposta:"2026-03",agenteListing:1,percListing:0,buyerL:null,percBuyerL:0,comune:"Varese",indirizzo:"Via del Bacino",tipologia:"3 locali",venditore:"Riganti Eleonora",acquirente:"Castiglioni Miriam",agenteAcquirente:1,percAcquirente:0,buyer:3,percBuyer:20,prezzoVendita:240000,prezzoAccettato:null,vincolata:false,tipoVincolo:"",dataVincolo:"",esitoVincolo:false,tipoAtto:"Preliminare",dataAtto:"",accontoProvv:0,provvVenditore:7200,provvAcquirente:7960,stato:"Controproposta",noteStato:"Venditore chiede 250.000€",storico:[{stato:"Proposta",data:"2026-03-01T10:00:00.000Z"},{stato:"Controproposta",data:"2026-03-15T14:00:00.000Z",note:"Venditore chiede 250.000€"}]},
];

const emptyForm = () => ({dataProposta:"",agenteListing:"",percListing:0,buyerL:"",percBuyerL:0,comune:"",indirizzo:"",tipologia:"",venditore:"",acquirente:"",agenteAcquirente:"",percAcquirente:0,buyer:"",percBuyer:0,prezzoVendita:"",prezzoAccettato:"",vincolata:false,tipoVincolo:"",dataVincolo:"",esitoVincolo:false,tipoAtto:"Preliminare",dataAtto:"",accontoProvv:0,provvVenditore:0,provvAcquirente:0,stato:"Proposta",noteStato:""});
const emptyAg = () => ({nome:"",cognome:"",profilo:"Consulente",tipo:"Interno",percListing:0,percAcquirente:0});

const Logo = () => (
  <div style={{lineHeight:1}}>
    <div style={{fontSize:24,fontWeight:700,color:BRAND.grigio,letterSpacing:"-0.5px",fontFamily:"Georgia,serif"}}>c<span style={{color:BRAND.oro}}>à</span>sa</div>
    <div style={{fontSize:8,letterSpacing:"0.25em",color:BRAND.grigio,borderTop:`1px solid ${BRAND.grigio}`,paddingTop:2,marginTop:1}}>IMMOBILIARE</div>
  </div>
);

const USERS = [
  {email:"adirita@casaimmobiliarevarese.it", password:"Dalmata1518", nome:"Antonello Di Rita", ruolo:"Broker"}
];

function LoginPage({onLogin}) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [errore,setErrore]=useState("");
  const [loading,setLoading]=useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(()=>{
      const user=USERS.find(u=>u.email===email&&u.password===password);
      if(user){onLogin(user);}
      else{setErrore("Email o password non corretti.");setLoading(false);}
    },600);
  };

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg, ${BRAND.oro} 0%, #A8863A 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      {/* Logo grande */}
      <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
        <div style={{fontSize:64,fontWeight:700,color:"#fff",letterSpacing:"-2px",fontFamily:"Georgia,serif",lineHeight:1}}>
          c<span style={{color:"#fff",opacity:.85}}>à</span>sa
        </div>
        <div style={{width:180,height:1,background:"rgba(255,255,255,0.6)",margin:"10px auto 8px"}}/>
        <div style={{fontSize:14,letterSpacing:"0.35em",color:"rgba(255,255,255,0.9)",fontWeight:400}}>IMMOBILIARE</div>
      </div>

      {/* Card login */}
      <div style={{background:"#fff",borderRadius:16,padding:"2rem 2.5rem",width:"min(90vw,380px)",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <h2 style={{fontSize:18,fontWeight:500,color:BRAND.grigio,margin:"0 0 6px",textAlign:"center"}}>Accedi al gestionale</h2>
        <p style={{fontSize:13,color:"#aaa",textAlign:"center",margin:"0 0 1.5rem"}}>Inserisci le tue credenziali</p>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12,color:"#999",display:"block",marginBottom:4}}>Email</label>
          <input
            style={{width:"100%",fontSize:14,padding:"10px 12px",borderRadius:8,border:`1.5px solid ${errore?"#e74c3c":"#ddd"}`,boxSizing:"border-box",color:BRAND.grigio,outline:"none"}}
            type="email" value={email} onChange={e=>{setEmail(e.target.value);setErrore("");}}
            placeholder="email@casaimmobiliarevarese.it"
            onKeyDown={e=>e.key==="Enter"&&handleLogin()}
          />
        </div>
        <div style={{marginBottom:errore?8:20}}>
          <label style={{fontSize:12,color:"#999",display:"block",marginBottom:4}}>Password</label>
          <input
            style={{width:"100%",fontSize:14,padding:"10px 12px",borderRadius:8,border:`1.5px solid ${errore?"#e74c3c":"#ddd"}`,boxSizing:"border-box",color:BRAND.grigio,outline:"none"}}
            type="password" value={password} onChange={e=>{setPassword(e.target.value);setErrore("");}}
            placeholder="••••••••"
            onKeyDown={e=>e.key==="Enter"&&handleLogin()}
          />
        </div>
        {errore&&<p style={{fontSize:12,color:"#e74c3c",margin:"0 0 16px",textAlign:"center"}}>{errore}</p>}
        <button
          onClick={handleLogin}
          style={{width:"100%",padding:"12px",fontSize:15,fontWeight:600,borderRadius:8,border:"none",background:`linear-gradient(135deg, ${BRAND.oro}, #A8863A)`,color:"#fff",cursor:"pointer",opacity:loading?0.7:1}}
        >{loading?"Accesso in corso...":"Accedi"}</button>
      </div>

      <p style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:"2rem"}}>© {new Date().getFullYear()} Càsa Immobiliare — Varese</p>
    </div>
  );
}

export default function App() {
  const [utente,setUtente]=useState(null);
  if(!utente) return <LoginPage onLogin={setUtente}/>;

  const [tab,setTab]=useState("Dashboard");
  const [agenti,setAgenti]=useState(INIT_AGENTI);
  const [proposte,setProposte]=useState(INIT_PROPOSTE);
  const [vincoli,setVincoli]=useState(VINCOLI_DEF);
  const [nuovoVincolo,setNuovoVincolo]=useState("");
  const [costi,setCosti]=useState(INIT_COSTI);
  const [obiettivi,setObiettivi]=useState(INIT_OBIETTIVI);
  const [costiAnno,setCostiAnno]=useState("2026");
  const [showFormCosto,setShowFormCosto]=useState(false);
  const [editCostoId,setEditCostoId]=useState(null);
  const [formCosto,setFormCosto]=useState({voce:"",tipo:"Fisso",frequenza:"Mensile",importoPrevisionale:0});
  const [showConsuntivo,setShowConsuntivo]=useState(null);
  const [consuntivoMese,setConsuntivoMese]=useState("");
  const [consuntivoImporto,setConsuntivoImporto]=useState("");
  const [showProp,setShowProp]=useState(false);
  const [editPropId,setEditPropId]=useState(null);
  const [form,setForm]=useState(emptyForm());
  const [showAg,setShowAg]=useState(false);
  const [editAgId,setEditAgId]=useState(null);
  const [formAg,setFormAg]=useState(emptyAg());
  const [showStorico,setShowStorico]=useState(null);
  const [showAvanza,setShowAvanza]=useState(null);
  const [avForm,setAvForm]=useState({});
  const [fStato,setFStato]=useState("Tutti");
  const [fAgente,setFAgente]=useState("Tutti");
  const [fMese,setFMese]=useState("Tutti");
  const [fAnno,setFAnno]=useState("Tutti");
  const [vendMese,setVendMese]=useState("Tutti");
  const [vendAnno,setVendAnno]=useState("Tutti");
  const [rAgente,setRAgente]=useState("Tutti");
  const [rMese,setRMese]=useState("Tutti");
  const [rAnno,setRAnno]=useState("Tutti");
  const [dashAnno,setDashAnno]=useState("Tutti");
  const [fatAgente,setFatAgente]=useState("");
  const [fatAnno,setFatAnno]=useState("Tutti");
  const [fatMese,setFatMese]=useState("Tutti");
  const importRef=useRef();

  const nomAg=id=>{const a=agenti.find(a=>a.id===Number(id));return a?`${a.nome} ${a.cognome}`:"—";};
  const mesi=useMemo(()=>Array.from(new Set(proposte.map(p=>p.dataProposta))).sort().reverse(),[proposte]);
  const anni=useMemo(()=>Array.from(new Set(proposte.map(p=>getAnno(p.dataProposta)))).sort().reverse(),[proposte]);
  const totProvv=p=>{const {tv,ta}=provvEffettive(p);return tv+ta;};

  const filterAM=(p,anno,mese)=>{
    if(anno!=="Tutti"&&getAnno(p.dataProposta)!==anno) return false;
    if(mese!=="Tutti"&&p.dataProposta!==mese) return false;
    return true;
  };

  // ── COSTI ──
  const costiAnnoCorrente = useMemo(()=>costi[costiAnno]||[],[costi,costiAnno]);

  const totalePrevisionale = useMemo(()=>costiAnnoCorrente.reduce((s,c)=>{
    const imp=Number(c.importoPrevisionale||0);
    return s+(c.frequenza==="Mensile"?imp*12:imp);
  },0),[costiAnnoCorrente]);

  const totaleConsuntivo = useMemo(()=>costiAnnoCorrente.reduce((s,c)=>{
    return s+Object.values(c.consuntivi||{}).reduce((a,v)=>a+Number(v||0),0);
  },0),[costiAnnoCorrente]);

  // Quota netta agenzia incassata nell'anno selezionato
  const quotaNettoAgenzia = useMemo(()=>{
    return proposte.filter(p=>p.stato==="Incassato"&&getAnno(p.dataProposta)===costiAnno).reduce((s,p)=>{
      const q=calcolaQuote(p,agenti);return s+q.quotaAgenziaL+q.quotaAgenziaA;
    },0);
  },[proposte,agenti,costiAnno]);

  const quotaNettoAgenziaPrevisionale = useMemo(()=>{
    return proposte.filter(p=>["Accettata","Preliminare","Rogito Diretto","Incassato"].includes(p.stato)&&getAnno(p.dataProposta)===costiAnno).reduce((s,p)=>{
      const q=calcolaQuote(p,agenti);return s+q.quotaAgenziaL+q.quotaAgenziaA;
    },0);
  },[proposte,agenti,costiAnno]);

  const obiettivoAnno = obiettivi[costiAnno]||{fatturato:0,compensoTarget:0};
  const breakEvenBase = totalePrevisionale;
  const breakEvenObiettivo = totalePrevisionale+(Number(obiettivoAnno.compensoTarget||0)*12);

  // Consuntivo per mese (quota netta agenzia)
  const consuntiviMensili = useMemo(()=>{
    const map={};
    for(let m=1;m<=12;m++){
      const key=`${costiAnno}-${String(m).padStart(2,"0")}`;
      const incassato=proposte.filter(p=>p.stato==="Incassato"&&p.dataProposta===key).reduce((s,p)=>{const q=calcolaQuote(p,agenti);return s+q.quotaAgenziaL+q.quotaAgenziaA;},0);
      const spese=costiAnnoCorrente.reduce((s,c)=>s+Number((c.consuntivi||{})[key]||0),0);
      map[key]={incassato,spese,netto:incassato-spese};
    }
    return map;
  },[proposte,agenti,costiAnnoCorrente,costiAnno]);

  const salvaCosto=()=>{
    if(!formCosto.voce) return;
    const annoCorrente=costi[costiAnno]||[];
    if(editCostoId){
      setCosti({...costi,[costiAnno]:annoCorrente.map(c=>c.id===editCostoId?{...c,...formCosto}:c)});
    } else {
      const newId=Date.now();
      setCosti({...costi,[costiAnno]:[...annoCorrente,{id:newId,...formCosto,consuntivi:{}}]});
    }
    setShowFormCosto(false);setEditCostoId(null);setFormCosto({voce:"",tipo:"Fisso",frequenza:"Mensile",importoPrevisionale:0});
  };

  const eliminaCosto=id=>setCosti({...costi,[costiAnno]:(costi[costiAnno]||[]).filter(c=>c.id!==id)});

  const salvaConsuntivo=()=>{
    if(!showConsuntivo||!consuntivoMese||consuntivoImporto==="") return;
    setCosti({...costi,[costiAnno]:(costi[costiAnno]||[]).map(c=>c.id===showConsuntivo.id?{...c,consuntivi:{...c.consuntivi,[consuntivoMese]:Number(consuntivoImporto)}}:c)});
    setShowConsuntivo(null);setConsuntivoMese("");setConsuntivoImporto("");
  };

  const aggiungiAnno=(anno)=>{
    if(!anno||costi[anno]) return;
    setCosti({...costi,[anno]:mkCostoAnno(anno)});
    setObiettivi({...obiettivi,[anno]:{fatturato:0,compensoTarget:0}});
    setCostiAnno(anno);
  };

  // ── FORM HANDLERS ──
  const hFormChange=(k,v)=>{
    const u={...form,[k]:v};
    if(k==="agenteListing"){const a=agenti.find(a=>a.id===Number(v));if(a)u.percListing=a.percListing;}
    if(k==="agenteAcquirente"){const a=agenti.find(a=>a.id===Number(v));if(a)u.percAcquirente=a.percAcquirente;}
    if(k==="buyerL"){const a=agenti.find(a=>a.id===Number(v));if(a)u.percBuyerL=a.percListing;}
    if(k==="buyer"){const a=agenti.find(a=>a.id===Number(v));if(a)u.percBuyer=a.percAcquirente;}
    if(["prezzoVendita","percListing","percAcquirente"].includes(k)){
      const pv=Number(k==="prezzoVendita"?v:u.prezzoVendita||0);
      const pL=Number(k==="percListing"?v:u.percListing||0);
      const pA=Number(k==="percAcquirente"?v:u.percAcquirente||0);
      if(pv>0){u.provvVenditore=parseFloat((pv*pL/100).toFixed(2));u.provvAcquirente=parseFloat((pv*pA/100).toFixed(2));}
    }
    setForm(u);
  };

  const hAvChange=(k,v)=>{
    const u={...avForm,[k]:v};
    const prezzo=Number(k==="prezzoAccettato"?v:u.prezzoAccettato||showAvanza?.p?.prezzoVendita||0);
    if(["prezzoAccettato","percListingConf","percAcquirenteConf"].includes(k)&&prezzo>0){
      if(u.percListingConf>=0) u.provvVenditoreConf=parseFloat((prezzo*Number(u.percListingConf)/100).toFixed(2));
      if(u.percAcquirenteConf>=0) u.provvAcquirenteConf=parseFloat((prezzo*Number(u.percAcquirenteConf)/100).toFixed(2));
    }
    setAvForm(u);
  };

  const salvaProposta=()=>{
    if(!form.dataProposta||!form.comune||!form.venditore) return;
    const p={...form,prezzoVendita:Number(form.prezzoVendita),provvVenditore:Number(form.provvVenditore),provvAcquirente:Number(form.provvAcquirente),agenteListing:Number(form.agenteListing)||null,agenteAcquirente:Number(form.agenteAcquirente)||null,buyerL:form.buyerL?Number(form.buyerL):null,buyer:form.buyer?Number(form.buyer):null};
    if(editPropId){setProposte(proposte.map(x=>{if(x.id!==editPropId) return x;const st=x.storico||[];const last=st[st.length-1];return {...p,id:editPropId,storico:(!last||last.stato!==p.stato)?[...st,{stato:p.stato,data:nowISO()}]:st};}));setEditPropId(null);}
    else setProposte([...proposte,{...p,id:Date.now(),storico:mkStorico(p.stato)}]);
    setShowProp(false);setForm(emptyForm());
  };

  const apriAvanza=(p)=>{
    const next=PROSSIMI[p.stato]||[];if(next.length===0) return;
    setShowAvanza({p,next});
    setAvForm({stato:next[0],noteStato:"",prezzoAccettato:p.prezzoAccettato||p.prezzoVendita||"",percListingConf:p.percListingConf??p.percListing??0,percAcquirenteConf:p.percAcquirenteConf??p.percAcquirente??0,provvVenditoreConf:p.provvVenditoreConf??p.provvVenditore??0,provvAcquirenteConf:p.provvAcquirenteConf??p.provvAcquirente??0,tipoAtto:p.tipoAtto||"Preliminare",dataAtto:p.dataAtto||"",accontoProvv:p.accontoProvv||0,tipoVincolo:p.tipoVincolo||"",dataVincolo:p.dataVincolo||"",esitoVincolo:false});
  };

  const salvaAvanza=()=>{
    if(!showAvanza) return;
    let nuovoStato=avForm.stato;
    if(avForm.stato==="Accettata con Vincolo"&&avForm.esitoVincolo) nuovoStato="Accettata";
    setProposte(proposte.map(p=>{
      if(p.id!==showAvanza.p.id) return p;
      const agg={stato:nuovoStato,noteStato:avForm.noteStato||"",storico:[...(p.storico||[]),{stato:nuovoStato,data:nowISO(),note:avForm.noteStato||""}]};
      if(["Accettata","Preliminare","Rogito Diretto","Incassato"].includes(nuovoStato)){agg.prezzoAccettato=Number(avForm.prezzoAccettato||p.prezzoVendita);agg.percListingConf=Number(avForm.percListingConf);agg.percAcquirenteConf=Number(avForm.percAcquirenteConf);agg.provvVenditoreConf=Number(avForm.provvVenditoreConf);agg.provvAcquirenteConf=Number(avForm.provvAcquirenteConf);}
      if(["Preliminare","Rogito Diretto"].includes(nuovoStato)){agg.tipoAtto=nuovoStato;agg.dataAtto=avForm.dataAtto;agg.accontoProvv=Number(avForm.accontoProvv);}
      if(avForm.tipoVincolo){agg.tipoVincolo=avForm.tipoVincolo;agg.dataVincolo=avForm.dataVincolo;agg.vincolata=true;}
      return {...p,...agg};
    }));
    setShowAvanza(null);
  };

  const apriEditProp=p=>{setForm({...p,buyerL:p.buyerL||"",buyer:p.buyer||"",agenteListing:p.agenteListing||"",agenteAcquirente:p.agenteAcquirente||""});setEditPropId(p.id);setShowProp(true);};
  const eliminaProp=id=>setProposte(proposte.filter(p=>p.id!==id));
  const salvaAgente=()=>{if(!formAg.nome||!formAg.cognome) return;if(editAgId){setAgenti(agenti.map(a=>a.id===editAgId?{...formAg,id:editAgId}:a));setEditAgId(null);}else setAgenti([...agenti,{...formAg,id:Date.now()}]);setShowAg(false);setFormAg(emptyAg());};
  const apriEditAg=a=>{setFormAg({...a});setEditAgId(a.id);setShowAg(true);};
  const esportaDati=()=>{const blob=new Blob([JSON.stringify({agenti,proposte,vincoli,costi,obiettivi},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`gestionale_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);};
  const importaDati=e=>{const file=e.target.files[0];if(!file) return;const reader=new FileReader();reader.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.agenti)setAgenti(d.agenti);if(d.proposte)setProposte(d.proposte);if(d.vincoli)setVincoli(d.vincoli);if(d.costi)setCosti(d.costi);if(d.obiettivi)setObiettivi(d.obiettivi);alert("Dati importati!");}catch{alert("File non valido.");}};reader.readAsText(file);e.target.value="";};

  const propFiltrate=useMemo(()=>proposte.filter(p=>{if(fStato!=="Tutti"&&p.stato!==fStato) return false;if(fAgente!=="Tutti"){const id=Number(fAgente);if(p.agenteListing!==id&&p.agenteAcquirente!==id&&p.buyer!==id&&p.buyerL!==id) return false;}return filterAM(p,fAnno,fMese);}),[proposte,fStato,fAgente,fAnno,fMese]);
  const venduti=useMemo(()=>proposte.filter(p=>STATI_VENDUTI.includes(p.stato)&&filterAM(p,vendAnno,vendMese)),[proposte,vendAnno,vendMese]);
  const dashProposte=useMemo(()=>proposte.filter(p=>dashAnno==="Tutti"||getAnno(p.dataProposta)===dashAnno),[proposte,dashAnno]);
  const dashboard=useMemo(()=>{const calc=arr=>{let tot=0,agenzia=0,agQ=0,listing=0,acq=0,buyerTot=0;arr.forEach(p=>{const q=calcolaQuote(p,agenti);tot+=q.tv+q.ta;listing+=q.quotaListingAgente;agQ+=q.quotaListingAgente+q.quotaAcquirenteAgente;acq+=q.quotaAcquirenteAgente;buyerTot+=q.quotaBuyerL+q.quotaBuyer;agenzia+=q.quotaAgenziaL+q.quotaAgenziaA;});return {tot,agenzia,agenti:agQ,listing,acquirente:acq,buyer:buyerTot};};return {incassato:calc(dashProposte.filter(p=>p.stato==="Incassato")),venduto:calc(dashProposte.filter(p=>["Accettata","Preliminare","Rogito Diretto"].includes(p.stato))),inCorso:calc(dashProposte.filter(p=>["Proposta","Controproposta","Accettata con Vincolo"].includes(p.stato)))};;},[dashProposte,agenti]);
  const reportData=useMemo(()=>{const agF=rAgente==="Tutti"?agenti:agenti.filter(a=>a.id===Number(rAgente));return agF.map(ag=>{const pF=proposte.filter(p=>p.stato==="Incassato"&&filterAM(p,rAnno,rMese)&&(p.agenteListing===ag.id||p.agenteAcquirente===ag.id||p.buyer===ag.id||p.buyerL===ag.id));let prod=0,qa=0,ib=0;pF.forEach(p=>{const q=calcolaQuote(p,agenti);if(p.agenteListing===ag.id){prod+=q.tv;if(ag.profilo!=="Broker")qa+=q.quotaListingAgente;}if(p.agenteAcquirente===ag.id){prod+=q.ta;if(ag.profilo!=="Broker")qa+=q.quotaAcquirenteAgente;}if(p.buyerL===ag.id&&p.agenteListing!==ag.id)ib+=q.quotaBuyerL;if(p.buyer===ag.id&&p.agenteAcquirente!==ag.id)ib+=q.quotaBuyer;});return {...ag,nPratiche:pF.length,produzione:prod,quotaAg:qa,quotaAgenzia:prod-qa,incassatoBuyer:ib,pratiche:pF};});},[agenti,proposte,rAgente,rAnno,rMese]);
  const agentiFattura=useMemo(()=>agenti.filter(a=>a.profilo!=="Broker"),[agenti]);
  const fatAg=agenti.find(a=>a.id===Number(fatAgente));
  const fatturaDati=useMemo(()=>{if(!fatAgente) return [];const ag=agenti.find(a=>a.id===Number(fatAgente));if(!ag||ag.profilo==="Broker") return [];return proposte.filter(p=>p.stato==="Incassato"&&filterAM(p,fatAnno,fatMese)&&(p.agenteListing===ag.id||p.agenteAcquirente===ag.id||p.buyerL===ag.id||p.buyer===ag.id)).map(p=>{const q=calcolaQuote(p,agenti);const righe=[];if(p.agenteListing===ag.id&&q.tv>0) righe.push({tipo:"Venditore",cliente:p.venditore,provvAgenzia:q.tv,percAg:Number(p.percListingConf??p.percListing??0),quotaAg:q.quotaListingAgente});if(p.agenteAcquirente===ag.id&&q.ta>0) righe.push({tipo:"Acquirente",cliente:p.acquirente,provvAgenzia:q.ta,percAg:Number(p.percAcquirenteConf??p.percAcquirente??0),quotaAg:q.quotaAcquirenteAgente});if(p.buyerL===ag.id&&p.agenteListing!==ag.id&&q.quotaBuyerL>0) righe.push({tipo:"Buyer L",cliente:p.venditore,provvAgenzia:q.tv,percAg:Number(p.percBuyerL||0),quotaAg:q.quotaBuyerL});if(p.buyer===ag.id&&p.agenteAcquirente!==ag.id&&q.quotaBuyer>0) righe.push({tipo:"Buyer",cliente:p.acquirente,provvAgenzia:q.ta,percAg:Number(p.percBuyer||0),quotaAg:q.quotaBuyer});return {p,righe,totPratica:righe.reduce((s,r)=>s+r.quotaAg,0)};}).filter(x=>x.righe.length>0);},[agenti,proposte,fatAgente,fatAnno,fatMese]);
  const totaleImponibile=useMemo(()=>fatturaDati.reduce((s,x)=>s+x.totPratica,0),[fatturaDati]);

  const incassTot=dashProposte.filter(p=>p.stato==="Incassato").reduce((s,p)=>s+totProvv(p),0);
  const vendTot=dashProposte.filter(p=>["Accettata","Preliminare","Rogito Diretto"].includes(p.stato)).reduce((s,p)=>s+totProvv(p),0);

  const percBreakEven = breakEvenBase>0?Math.min(100,Math.round(quotaNettoAgenzia/breakEvenBase*100)):0;
  const percObiettivo = breakEvenObiettivo>0?Math.min(100,Math.round(quotaNettoAgenzia/breakEvenObiettivo*100)):0;

  // STYLES
  const S={
    wrap:{fontFamily:"var(--font-sans)",color:BRAND.grigio,paddingBottom:"2rem",background:BRAND.beige,minHeight:"100vh"},
    hdr:{padding:"1rem 1.25rem 0",borderBottom:"0.5px solid #ddd",marginBottom:"1rem",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"},
    hdrRow:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:".75rem"},
    tabs:{display:"flex",gap:2,flexWrap:"wrap"},
    tab:a=>({padding:"7px 14px",fontSize:12,cursor:"pointer",border:"none",background:a?BRAND.beige:"transparent",color:a?BRAND.grigio:"#999",borderBottom:a?`2px solid ${BRAND.oro}`:"2px solid transparent",fontWeight:a?500:400}),
    sec:{padding:"0 1.25rem"},
    g3:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:"1.25rem"},
    g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10},
    card:clr=>({background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",padding:"10px 14px",borderLeft:`3px solid ${clr}`}),
    fRow:{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"},
    sel:{fontSize:13,padding:"5px 8px",borderRadius:6,border:"0.5px solid #ccc",background:"#fff",color:BRAND.grigio},
    btn:{padding:"6px 12px",fontSize:13,borderRadius:6,border:"0.5px solid #ccc",background:"#fff",cursor:"pointer",color:BRAND.grigio},
    btnP:{padding:"7px 14px",fontSize:13,borderRadius:6,border:`1px solid ${BRAND.oro}`,background:BRAND.oro,cursor:"pointer",color:"#fff",fontWeight:500},
    btnOut:{padding:"7px 14px",fontSize:13,borderRadius:6,border:`1px solid ${BRAND.oro}`,background:"transparent",cursor:"pointer",color:BRAND.oro,fontWeight:500},
    btnSm:{padding:"4px 10px",fontSize:12,borderRadius:5,border:"0.5px solid #ccc",background:"#fff",cursor:"pointer",color:BRAND.grigio},
    btnDanger:{padding:"6px 12px",fontSize:13,borderRadius:6,border:"0.5px solid #fcc",background:"#fff",cursor:"pointer",color:"#c0392b"},
    tblWrap:{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"auto",marginBottom:"1rem"},
    tbl:{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:900},
    th:{textAlign:"left",padding:"9px 12px",borderBottom:"0.5px solid #eee",color:"#999",fontWeight:500,fontSize:12,whiteSpace:"nowrap",background:"#fafaf8"},
    td:{padding:"9px 12px",borderBottom:"0.5px solid #f5f5f5",verticalAlign:"middle"},
    tdR:{padding:"9px 12px",borderBottom:"0.5px solid #f5f5f5",verticalAlign:"middle",textAlign:"right",fontVariantNumeric:"tabular-nums"},
    totRow:{background:BRAND.beige,fontWeight:500},
    prevBox:{background:"#fff",borderRadius:10,border:`1px solid ${BRAND.oro}44`,padding:"1rem 1.25rem",marginBottom:"1.25rem"},
    overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200},
    modal:{background:"#fff",borderRadius:12,border:"0.5px solid #ddd",padding:"1.5rem",width:"min(96vw,660px)",maxHeight:"90vh",overflowY:"auto"},
    lbl:{fontSize:12,color:"#999",display:"block",marginBottom:3},
    inp:{width:"100%",fontSize:13,padding:"7px 9px",borderRadius:6,border:"0.5px solid #ccc",background:"#fff",color:BRAND.grigio,boxSizing:"border-box"},
    sezTitle:{fontSize:15,fontWeight:500,margin:"0 0 .75rem"},
    tagRow:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8},
    tag:{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:6,background:BRAND.beige,border:"0.5px solid #ddd",fontSize:13},
    tagX:{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:14,lineHeight:1,padding:0},
    storicoStep:l=>({padding:"8px 12px",borderLeft:`2px solid ${l?BRAND.oro:"#ddd"}`,marginLeft:8,marginBottom:4,position:"relative"}),
    dot:l=>({width:8,height:8,borderRadius:"50%",background:l?BRAND.oro:"#ddd",position:"absolute",left:-5,top:10}),
    fatturaWrap:{background:"#fff",border:`1px solid ${BRAND.oro}`,borderRadius:10,padding:"1.5rem",marginTop:"1rem"},
    fatturaHdr:{borderBottom:`2px solid ${BRAND.oro}`,paddingBottom:"1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:8},
    pratCard:{border:"0.5px solid #eee",borderRadius:8,padding:"1rem",marginBottom:"0.75rem",background:BRAND.beige},
    rigaBox:{background:"#fff",borderRadius:6,border:"0.5px solid #ddd",padding:"8px 12px",marginBottom:6},
    rigaTipo:{fontSize:11,fontWeight:500,color:BRAND.oro,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3},
    rigaRow:{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:2},
    totBox:{background:BRAND.oro,borderRadius:8,padding:"1rem 1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"1.25rem"},
    confBox:{background:"#F0FFF4",border:"1px solid #27AE60",borderRadius:8,padding:"1rem",marginBottom:10},
    warnBox:{background:"#FFFBEB",border:"1px solid #D4AC0D",borderRadius:8,padding:"1rem",marginBottom:10},
    progressBar:(perc,clr)=>({height:14,borderRadius:7,background:`linear-gradient(to right, ${clr} ${perc}%, #eee ${perc}%)`,marginTop:4}),
  };

  const AnnoSel=({value,onChange})=>(<select style={S.sel} value={value} onChange={e=>onChange(e.target.value)}><option value="Tutti">Tutti gli anni</option>{anni.map(a=><option key={a}>{a}</option>)}</select>);
  const MeseSel=({value,onChange,anno})=>(<select style={S.sel} value={value} onChange={e=>onChange(e.target.value)}><option value="Tutti">Tutti i mesi</option>{mesi.filter(m=>anno==="Tutti"||m.startsWith(anno)).map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}</select>);

  const DashCard=({label,tot,sub,clr})=>(
    <div style={S.card(clr)}>
      <p style={{fontSize:12,color:clr,margin:0,opacity:.85}}>{label}</p>
      <p style={{fontSize:22,fontWeight:500,color:clr,margin:"3px 0 6px"}}>€ {fmt(tot)}</p>
      {sub.map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderTop:`0.5px solid ${clr}22`,marginTop:2}}><span style={{fontSize:11,color:"#aaa"}}>{k}</span><span style={{fontSize:11,fontWeight:500,color:clr}}>€ {fmt(v)}</span></div>)}
    </div>
  );

  const ConfermaProvv=()=>(
    <div style={S.confBox}>
      <p style={{fontSize:13,fontWeight:500,margin:"0 0 10px",color:"#1E8449"}}>Conferma prezzo e provvigioni</p>
      <div style={S.g2}>
        <div><label style={S.lbl}>Prezzo accettato (€)</label><input style={S.inp} type="number" value={avForm.prezzoAccettato||""} onChange={e=>hAvChange("prezzoAccettato",e.target.value)}/></div>
        <div/>
        <div><label style={S.lbl}>% Listing confermata</label><input style={S.inp} type="number" step="0.1" value={avForm.percListingConf??""} onChange={e=>hAvChange("percListingConf",e.target.value)}/></div>
        <div><label style={S.lbl}>Provv. venditore (€)</label><input style={S.inp} type="number" value={avForm.provvVenditoreConf??""} onChange={e=>setAvForm({...avForm,provvVenditoreConf:e.target.value})}/></div>
        <div><label style={S.lbl}>% Acquirente confermata</label><input style={S.inp} type="number" step="0.1" value={avForm.percAcquirenteConf??""} onChange={e=>hAvChange("percAcquirenteConf",e.target.value)}/></div>
        <div><label style={S.lbl}>Provv. acquirente (€)</label><input style={S.inp} type="number" value={avForm.provvAcquirenteConf??""} onChange={e=>setAvForm({...avForm,provvAcquirenteConf:e.target.value})}/></div>
      </div>
    </div>
  );

  const anniCosti=Object.keys(costi).sort().reverse();

  return (
    <div style={S.wrap}>
      <div style={S.hdr}>
        <div style={S.hdrRow}>
          <Logo/>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:13,color:"#aaa"}}>👤 {utente.nome}</span>
            <button style={S.btnOut} onClick={esportaDati}>⬇ Esporta</button>
            <button style={S.btn} onClick={()=>importRef.current.click()}>⬆ Importa</button>
            <input ref={importRef} type="file" accept=".json" style={{display:"none"}} onChange={importaDati}/>
            <button style={{...S.btn,color:"#c0392b"}} onClick={()=>setUtente(null)}>Esci</button>
          </div>
        </div>
        <div style={S.tabs}>{TABS.map(t=><button key={t} style={S.tab(tab===t)} onClick={()=>setTab(t)}>{t}</button>)}</div>
      </div>

      {/* DASHBOARD */}
      {tab==="Dashboard"&&(
        <div style={S.sec}>
          <div style={S.fRow}><AnnoSel value={dashAnno} onChange={setDashAnno}/></div>
          <div style={S.g3}>
            <DashCard label="Incassato" tot={dashboard.incassato.tot} clr={STATI_CFG.Incassato.clr} sub={[["Agenzia",dashboard.incassato.agenzia],["Agenti",dashboard.incassato.agenti],["Buyer",dashboard.incassato.buyer]]}/>
            <DashCard label="Venduto — da incassare" tot={dashboard.venduto.tot} clr={STATI_CFG.Accettata.clr} sub={[["Agenzia",dashboard.venduto.agenzia],["Agenti",dashboard.venduto.agenti],["Buyer",dashboard.venduto.buyer]]}/>
            <DashCard label="In trattativa" tot={dashboard.inCorso.tot} clr={STATI_CFG.Proposta.clr} sub={[["Agenzia",dashboard.inCorso.agenzia],["Agenti",dashboard.inCorso.agenti],["Buyer",dashboard.inCorso.buyer]]}/>
          </div>
          <div style={S.prevBox}>
            <div style={{display:"flex",gap:"2rem",flexWrap:"wrap"}}>
              {[["Previsionale",`€ ${fmt(incassTot+vendTot)}`],["Pratiche attive",dashProposte.filter(p=>!["Rifiutata","Incassato","Mancata Chiusura"].includes(p.stato)).length],["Incassate",dashProposte.filter(p=>p.stato==="Incassato").length],["Con vincolo",dashProposte.filter(p=>p.stato==="Accettata con Vincolo").length],["Non concluse",dashProposte.filter(p=>STATI_CHIUSI.includes(p.stato)).length]].map(([l,v])=>(
                <div key={l}><p style={{fontSize:12,color:"#aaa",margin:"0 0 2px"}}>{l}</p><p style={{fontSize:20,fontWeight:500,margin:0}}>{v}</p></div>
              ))}
            </div>
          </div>
          <div style={S.tblWrap}>
            <table style={{...S.tbl,minWidth:600}}>
              <thead><tr>{["Agente","Profilo","Pratiche inc.","Produzione","Inc. Buyer","Quota agente","Quota agenzia"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{agenti.map(ag=>{const pInc=dashProposte.filter(p=>p.stato==="Incassato"&&(p.agenteListing===ag.id||p.agenteAcquirente===ag.id||p.buyer===ag.id||p.buyerL===ag.id));let prod=0,qa=0,ib=0;pInc.forEach(p=>{const q=calcolaQuote(p,agenti);if(p.agenteListing===ag.id){prod+=q.tv;if(ag.profilo!=="Broker")qa+=q.quotaListingAgente;}if(p.agenteAcquirente===ag.id){prod+=q.ta;if(ag.profilo!=="Broker")qa+=q.quotaAcquirenteAgente;}if(p.buyerL===ag.id&&p.agenteListing!==ag.id)ib+=q.quotaBuyerL;if(p.buyer===ag.id&&p.agenteAcquirente!==ag.id)ib+=q.quotaBuyer;});return(<tr key={ag.id}><td style={S.td}><strong>{ag.nome} {ag.cognome}</strong></td><td style={S.td}>{ag.profilo}</td><td style={S.td}>{pInc.length}</td><td style={S.tdR}>€ {fmt(prod)}</td><td style={S.tdR}>{ib>0?`€ ${fmt(ib)}`:"—"}</td><td style={S.tdR}>{ag.profilo==="Broker"?"—":`€ ${fmt(qa)}`}</td><td style={S.tdR}>€ {fmt(prod-qa)}</td></tr>);})}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROPOSTE */}
      {tab==="Proposte"&&(
        <div style={S.sec}>
          <div style={S.fRow}>
            <AnnoSel value={fAnno} onChange={setFAnno}/>
            <MeseSel value={fMese} onChange={setFMese} anno={fAnno}/>
            <select style={S.sel} value={fStato} onChange={e=>setFStato(e.target.value)}><option value="Tutti">Tutti gli stati</option>{Object.keys(STATI_CFG).map(s=><option key={s}>{s}</option>)}</select>
            <select style={S.sel} value={fAgente} onChange={e=>setFAgente(e.target.value)}><option value="Tutti">Tutti gli agenti</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select>
            <div style={{flex:1}}/><button style={S.btnP} onClick={()=>{setEditPropId(null);setForm(emptyForm());setShowProp(true);}}>+ Nuova proposta</button>
          </div>
          <div style={S.tblWrap}>
            <table style={S.tbl}>
              <thead><tr>{["Data prop.","Ag. Listing","Buyer L","Ag. Acquirente","Buyer","Comune / Indirizzo","Venditore","Acquirente","Prezzo offerto","Prezzo accettato","Provv. V.","Provv. A.","Vincolo","Stato","Azioni"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {propFiltrate.map(p=>{const q=calcolaQuote(p,agenti);const cfg=STATI_CFG[p.stato]||{clr:"#888"};const prossimi=PROSSIMI[p.stato]||[];
                  return(<tr key={p.id} style={{background:STATI_CHIUSI.includes(p.stato)?"#FDF8F8":undefined}}>
                    <td style={S.td}><strong>{p.dataProposta}</strong></td>
                    <td style={S.td}>{nomAg(p.agenteListing)}<br/><span style={{fontSize:11,color:"#bbb"}}>{p.percListingConf!==undefined?`${p.percListingConf}% ✓`:p.percListing+"%"}</span></td>
                    <td style={S.td}>{p.buyerL?<>{nomAg(p.buyerL)}<br/><span style={{fontSize:11,color:"#bbb"}}>{p.percBuyerL}%</span></>:"—"}</td>
                    <td style={S.td}>{nomAg(p.agenteAcquirente)}<br/><span style={{fontSize:11,color:"#bbb"}}>{p.percAcquirenteConf!==undefined?`${p.percAcquirenteConf}% ✓`:p.percAcquirente+"%"}</span></td>
                    <td style={S.td}>{p.buyer?<>{nomAg(p.buyer)}<br/><span style={{fontSize:11,color:"#bbb"}}>{p.percBuyer}%</span></>:"—"}</td>
                    <td style={S.td}><strong>{p.comune}</strong><br/><span style={{fontSize:11,color:"#aaa"}}>{p.indirizzo}·{p.tipologia}</span></td>
                    <td style={S.td}>{p.venditore}</td><td style={S.td}>{p.acquirente}</td>
                    <td style={S.tdR}>€ {fmtN(p.prezzoVendita)}</td>
                    <td style={S.tdR}>{p.prezzoAccettato?<strong style={{color:BRAND.oroD}}>€ {fmtN(p.prezzoAccettato)}</strong>:<span style={{color:"#ccc"}}>—</span>}</td>
                    <td style={S.tdR}>€ {fmt(q.tv)}</td><td style={S.tdR}>€ {fmt(q.ta)}</td>
                    <td style={S.td}>{p.vincolata?<><span style={{fontSize:11,fontWeight:500,color:BRAND.oroD}}>{p.tipoVincolo}</span><br/><span style={{fontSize:10,color:"#aaa"}}>{p.dataVincolo}</span></>:<span style={{color:"#ccc",fontSize:11}}>—</span>}</td>
                    <td style={S.td}><span style={badgeStyle(p.stato)}>{cfg.semaforo} {cfg.label||p.stato}</span>{p.noteStato&&<div style={{fontSize:11,color:"#aaa",marginTop:2,maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={p.noteStato}>{p.noteStato}</div>}</td>
                    <td style={S.td}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{prossimi.length>0&&<button style={S.btnP} onClick={()=>apriAvanza(p)}>Avanza →</button>}<button style={S.btn} onClick={()=>apriEditProp(p)}>✎</button><button style={S.btn} onClick={()=>setShowStorico(p)}>⏱</button><button style={S.btnDanger} onClick={()=>eliminaProp(p.id)}>✕</button></div></td>
                  </tr>);})}
                {propFiltrate.length===0&&<tr><td colSpan={15} style={{...S.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessuna proposta trovata</td></tr>}
              </tbody>
              {propFiltrate.length>0&&(<tfoot><tr style={S.totRow}><td colSpan={9} style={S.td}>Totale ({propFiltrate.length})</td><td style={S.td}/><td style={S.tdR}>€ {fmt(propFiltrate.reduce((s,p)=>s+calcolaQuote(p,agenti).tv,0))}</td><td style={S.tdR}>€ {fmt(propFiltrate.reduce((s,p)=>s+calcolaQuote(p,agenti).ta,0))}</td><td colSpan={3} style={S.td}><strong>Tot: € {fmt(propFiltrate.reduce((s,p)=>s+totProvv(p),0))}</strong></td></tr></tfoot>)}
            </table>
          </div>
        </div>
      )}

      {/* VENDUTI */}
      {tab==="Venduti"&&(
        <div style={S.sec}>
          <div style={S.fRow}><AnnoSel value={vendAnno} onChange={setVendAnno}/><MeseSel value={vendMese} onChange={setVendMese} anno={vendAnno}/><div style={{flex:1}}/><span style={{fontSize:13,color:"#aaa"}}>Accettate · Preliminare · Rogito Diretto · Incassate</span></div>
          <div style={S.tblWrap}>
            <table style={S.tbl}>
              <thead><tr>{["Data","Ag. Listing","BuyerL","Ag. Acq.","Buyer","Immobile","Venditore","Acquirente","Prezzo offerto","Prezzo accettato","% List.","Provv.V.","BuyerL€","Netto V.","% Acq.","Provv.A.","Buyer€","Netto A.","Tipo atto","Data atto","Acconto","Stato"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {venduti.map(p=>{const q=calcolaQuote(p,agenti);return(<tr key={p.id}>
                  <td style={S.td}>{p.dataProposta}</td>
                  <td style={S.td}>{nomAg(p.agenteListing)}</td><td style={S.td}>{p.buyerL?nomAg(p.buyerL):"—"}</td>
                  <td style={S.td}>{nomAg(p.agenteAcquirente)}</td><td style={S.td}>{p.buyer?nomAg(p.buyer):"—"}</td>
                  <td style={S.td}><strong>{p.comune}</strong><br/><span style={{fontSize:11,color:"#aaa"}}>{p.indirizzo}·{p.tipologia}</span></td>
                  <td style={S.td}>{p.venditore}</td><td style={S.td}>{p.acquirente}</td>
                  <td style={S.tdR}>€ {fmtN(p.prezzoVendita)}</td>
                  <td style={{...S.tdR,fontWeight:500,color:BRAND.oroD}}>€ {fmtN(p.prezzoAccettato||p.prezzoVendita)}</td>
                  <td style={S.tdR}>{p.percListingConf??p.percListing}%</td>
                  <td style={S.tdR}>€ {fmt(q.tv)}</td>
                  <td style={S.tdR}>{q.quotaBuyerL>0?`€ ${fmt(q.quotaBuyerL)}`:"—"}</td>
                  <td style={{...S.tdR,fontWeight:500}}>€ {fmt(q.quotaAgenziaL)}</td>
                  <td style={S.tdR}>{p.percAcquirenteConf??p.percAcquirente}%</td>
                  <td style={S.tdR}>€ {fmt(q.ta)}</td>
                  <td style={S.tdR}>{q.quotaBuyer>0?`€ ${fmt(q.quotaBuyer)}`:"—"}</td>
                  <td style={{...S.tdR,fontWeight:500}}>€ {fmt(q.quotaAgenziaA)}</td>
                  <td style={S.td}><span style={{fontSize:12,fontWeight:500,color:p.tipoAtto==="Rogito Diretto"?BRAND.oroD:BRAND.grigio}}>{p.tipoAtto||"—"}</span></td>
                  <td style={S.td}><span style={{fontSize:12,color:"#aaa"}}>{p.dataAtto||"—"}</span></td>
                  <td style={S.tdR}>{Number(p.accontoProvv)>0?`€ ${fmt(p.accontoProvv)}`:"—"}</td>
                  <td style={S.td}><span style={badgeStyle(p.stato)}>{STATI_CFG[p.stato]?.semaforo} {STATI_CFG[p.stato]?.label||p.stato}</span></td>
                </tr>);})}
                {venduti.length===0&&<tr><td colSpan={22} style={{...S.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessun venduto trovato</td></tr>}
              </tbody>
              {venduti.length>0&&(<tfoot><tr style={S.totRow}><td colSpan={11} style={S.td}>Totale ({venduti.length})</td><td style={S.tdR}>€ {fmt(venduti.reduce((s,p)=>s+calcolaQuote(p,agenti).tv,0))}</td><td style={S.tdR}>€ {fmt(venduti.reduce((s,p)=>s+calcolaQuote(p,agenti).quotaBuyerL,0))}</td><td style={S.tdR}>€ {fmt(venduti.reduce((s,p)=>s+calcolaQuote(p,agenti).quotaAgenziaL,0))}</td><td style={S.td}/><td style={S.tdR}>€ {fmt(venduti.reduce((s,p)=>s+calcolaQuote(p,agenti).ta,0))}</td><td style={S.tdR}>€ {fmt(venduti.reduce((s,p)=>s+calcolaQuote(p,agenti).quotaBuyer,0))}</td><td style={S.tdR}>€ {fmt(venduti.reduce((s,p)=>s+calcolaQuote(p,agenti).quotaAgenziaA,0))}</td><td colSpan={4} style={S.td}/></tr></tfoot>)}
            </table>
          </div>
        </div>
      )}

      {/* REPORT AGENTI */}
      {tab==="Report Agenti"&&(
        <div style={S.sec}>
          <div style={S.fRow}><AnnoSel value={rAnno} onChange={setRAnno}/><MeseSel value={rMese} onChange={setRMese} anno={rAnno}/><select style={S.sel} value={rAgente} onChange={e=>setRAgente(e.target.value)}><option value="Tutti">Tutti gli agenti</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
          <div style={S.tblWrap}><table style={{...S.tbl,minWidth:600}}><thead><tr>{["Agente","Profilo","Tipo","Pratiche","Produzione","% Ag.","Quota agente","Quota agenzia","Inc. come Buyer"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead><tbody>{reportData.map(a=>(<tr key={a.id}><td style={S.td}><strong>{a.nome} {a.cognome}</strong></td><td style={S.td}>{a.profilo}</td><td style={S.td}>{a.tipo}</td><td style={S.td}>{a.nPratiche}</td><td style={S.tdR}>€ {fmt(a.produzione)}</td><td style={S.td}>{a.profilo==="Broker"?"—":`${a.percListing}%`}</td><td style={S.tdR}>{a.profilo==="Broker"?"—":`€ ${fmt(a.quotaAg)}`}</td><td style={S.tdR}>€ {fmt(a.quotaAgenzia)}</td><td style={S.tdR}>{a.incassatoBuyer>0?`€ ${fmt(a.incassatoBuyer)}`:"—"}</td></tr>))}</tbody>{reportData.length>0&&(<tfoot><tr style={S.totRow}><td colSpan={4} style={S.td}>Totale</td><td style={S.tdR}>€ {fmt(reportData.reduce((s,a)=>s+a.produzione,0))}</td><td style={S.td}/><td style={S.tdR}>€ {fmt(reportData.reduce((s,a)=>s+a.quotaAg,0))}</td><td style={S.tdR}>€ {fmt(reportData.reduce((s,a)=>s+a.quotaAgenzia,0))}</td><td style={S.tdR}>€ {fmt(reportData.reduce((s,a)=>s+a.incassatoBuyer,0))}</td></tr></tfoot>)}</table></div>
        </div>
      )}

      {/* FATTURA AGENTE */}
      {tab==="Fattura Agente"&&(
        <div style={S.sec}>
          <div style={S.fRow}><select style={S.sel} value={fatAgente} onChange={e=>setFatAgente(e.target.value)}><option value="">Seleziona agente...</option>{agentiFattura.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome} — {a.profilo}</option>)}</select><AnnoSel value={fatAnno} onChange={setFatAnno}/><MeseSel value={fatMese} onChange={setFatMese} anno={fatAnno}/><div style={{flex:1}}/>{fatturaDati.length>0&&<button style={S.btnP} onClick={()=>window.print()}>🖨 Stampa</button>}</div>
          {!fatAgente&&<div style={{textAlign:"center",padding:"3rem",color:"#bbb"}}>Seleziona un agente</div>}
          {fatAgente&&fatturaDati.length===0&&<div style={{textAlign:"center",padding:"3rem",color:"#bbb"}}>Nessuna pratica incassata nel periodo</div>}
          {fatAgente&&fatturaDati.length>0&&(
            <div style={S.fatturaWrap}>
              <div style={S.fatturaHdr}><Logo/><div style={{textAlign:"right"}}><p style={{fontSize:12,color:"#aaa",margin:"0 0 2px"}}>Nota provvigioni</p><p style={{fontSize:16,fontWeight:500,margin:"0 0 2px"}}>{fatAg?.nome} {fatAg?.cognome}</p><p style={{fontSize:12,color:"#aaa",margin:0}}>{fatMese!=="Tutti"?fmtMese(fatMese):fatAnno!=="Tutti"?`Anno ${fatAnno}`:"Tutto il periodo"} — {new Date().toLocaleDateString("it-IT")}</p></div></div>
              {fatturaDati.map(({p,righe,totPratica},i)=>(
                <div key={p.id} style={S.pratCard}>
                  <p style={{fontSize:14,fontWeight:500,margin:"0 0 4px"}}>{i+1}. {p.comune} — {p.indirizzo} <span style={{fontSize:12,color:"#aaa",fontWeight:400}}>({p.tipologia})</span></p>
                  <p style={{fontSize:12,color:"#aaa",margin:"0 0 .5rem"}}>Prezzo accettato: <strong style={{color:BRAND.oroD}}>€ {fmtN(p.prezzoAccettato||p.prezzoVendita)}</strong></p>
                  {righe.map((r,j)=>(<div key={j} style={S.rigaBox}><p style={S.rigaTipo}>{r.tipo}</p><div style={S.rigaRow}><span style={{color:"#888"}}>Cliente:</span><span style={{fontWeight:500}}>{r.cliente}</span></div><div style={S.rigaRow}><span style={{color:"#888"}}>Provv. agenzia ({r.percAg}%):</span><span>€ {fmt(r.provvAgenzia)}</span></div><div style={S.rigaRow}><span style={{color:"#888"}}>Quota agente:</span><span style={{fontWeight:500,color:BRAND.oroD}}>€ {fmt(r.quotaAg)}</span></div></div>))}
                  <p style={{textAlign:"right",fontSize:13,fontWeight:500,color:BRAND.oroD,marginTop:4}}>Subtotale: € {fmt(totPratica)}</p>
                </div>
              ))}
              <div style={S.totBox}><span style={{fontSize:14,fontWeight:500,color:"#fff"}}>TOTALE IMPONIBILE DA FATTURARE</span><span style={{fontSize:22,fontWeight:700,color:"#fff"}}>€ {fmt(totaleImponibile)}</span></div>
            </div>
          )}
        </div>
      )}

      {/* COSTI & BREAK EVEN */}
      {tab==="Costi & Break Even"&&(
        <div style={S.sec}>
          {/* Selezione anno e obiettivi */}
          <div style={S.fRow}>
            {anniCosti.map(a=><button key={a} style={{...S.btn,fontWeight:a===costiAnno?600:400,borderColor:a===costiAnno?BRAND.oro:"#ccc",color:a===costiAnno?BRAND.oro:BRAND.grigio}} onClick={()=>setCostiAnno(a)}>{a}</button>)}
            <button style={S.btnOut} onClick={()=>{const a=prompt("Anno da aggiungere (es. 2027):");if(a) aggiungiAnno(a.trim());}}>+ Anno</button>
            <div style={{flex:1}}/>
            <button style={S.btnP} onClick={()=>{setEditCostoId(null);setFormCosto({voce:"",tipo:"Fisso",frequenza:"Mensile",importoPrevisionale:0});setShowFormCosto(true);}}>+ Voce di costo</button>
          </div>

          {/* Obiettivi anno */}
          <div style={{...S.prevBox,marginBottom:"1rem"}}>
            <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap",alignItems:"flex-end"}}>
              <div>
                <p style={{fontSize:12,color:"#aaa",margin:"0 0 4px"}}>Obiettivo fatturato anno {costiAnno}</p>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:13}}>€</span>
                  <input style={{...S.inp,width:130}} type="number" value={obiettivoAnno.fatturato||""} onChange={e=>setObiettivi({...obiettivi,[costiAnno]:{...obiettivoAnno,fatturato:Number(e.target.value)}})} placeholder="es. 360000"/>
                </div>
              </div>
              <div>
                <p style={{fontSize:12,color:"#aaa",margin:"0 0 4px"}}>Compenso mensile obiettivo</p>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:13}}>€</span>
                  <input style={{...S.inp,width:120}} type="number" value={obiettivoAnno.compensoTarget||""} onChange={e=>setObiettivi({...obiettivi,[costiAnno]:{...obiettivoAnno,compensoTarget:Number(e.target.value)}})} placeholder="es. 5000"/>
                </div>
              </div>
              <div style={{flex:1}}/>
              <div style={{textAlign:"right"}}>
                <p style={{fontSize:12,color:"#aaa",margin:"0 0 2px"}}>Totale costi previsionali {costiAnno}</p>
                <p style={{fontSize:22,fontWeight:600,margin:0,color:BRAND.grigio}}>€ {fmt(totalePrevisionale)}</p>
              </div>
            </div>
          </div>

          {/* Break Even Cards */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:"1.25rem"}}>
            {/* Break Even Base */}
            <div style={{...S.card(STATI_CFG.Accettata.clr),padding:"1rem 1.25rem"}}>
              <p style={{fontSize:13,fontWeight:500,margin:"0 0 4px",color:STATI_CFG.Accettata.clr}}>🎯 Break Even Base</p>
              <p style={{fontSize:11,color:"#aaa",margin:"0 0 10px"}}>Quota netta agenzia necessaria per coprire tutti i costi</p>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,color:"#666"}}>Costi totali previsti:</span>
                <span style={{fontSize:13,fontWeight:500}}>€ {fmt(breakEvenBase)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,color:"#666"}}>Quota netta incassata:</span>
                <span style={{fontSize:13,fontWeight:500,color:STATI_CFG.Incassato.clr}}>€ {fmt(quotaNettoAgenzia)}</span>
              </div>
              <div style={S.progressBar(percBreakEven,STATI_CFG.Accettata.clr)}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                <span style={{fontSize:12,color:"#aaa"}}>{percBreakEven}% raggiunto</span>
                <span style={{fontSize:12,fontWeight:500,color:quotaNettoAgenzia>=breakEvenBase?"#27AE60":"#E67E22"}}>
                  {quotaNettoAgenzia>=breakEvenBase?`✅ Superato di € ${fmt(quotaNettoAgenzia-breakEvenBase)}`:`Mancano € ${fmt(breakEvenBase-quotaNettoAgenzia)}`}
                </span>
              </div>
            </div>
            {/* Break Even Obiettivo */}
            <div style={{...S.card(BRAND.oro),padding:"1rem 1.25rem"}}>
              <p style={{fontSize:13,fontWeight:500,margin:"0 0 4px",color:BRAND.oroD}}>🏆 Break Even Obiettivo</p>
              <p style={{fontSize:11,color:"#aaa",margin:"0 0 10px"}}>Costi + compenso obiettivo € {fmt(Number(obiettivoAnno.compensoTarget)*12)}/anno</p>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,color:"#666"}}>Target totale:</span>
                <span style={{fontSize:13,fontWeight:500}}>€ {fmt(breakEvenObiettivo)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,color:"#666"}}>Quota netta incassata:</span>
                <span style={{fontSize:13,fontWeight:500,color:STATI_CFG.Incassato.clr}}>€ {fmt(quotaNettoAgenzia)}</span>
              </div>
              <div style={S.progressBar(percObiettivo,BRAND.oro)}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                <span style={{fontSize:12,color:"#aaa"}}>{percObiettivo}% raggiunto</span>
                <span style={{fontSize:12,fontWeight:500,color:quotaNettoAgenzia>=breakEvenObiettivo?"#27AE60":BRAND.oroD}}>
                  {quotaNettoAgenzia>=breakEvenObiettivo?`✅ Superato di € ${fmt(quotaNettoAgenzia-breakEvenObiettivo)}`:`Mancano € ${fmt(breakEvenObiettivo-quotaNettoAgenzia)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Riepilogo mensile */}
          <div style={{...S.tblWrap,marginBottom:"1rem"}}>
            <div style={{padding:"10px 16px",background:"#fafaf8",borderBottom:"0.5px solid #eee",fontSize:13,fontWeight:500,color:"#666"}}>Andamento mensile {costiAnno}</div>
            <table style={{...S.tbl,minWidth:400}}>
              <thead><tr>{["Mese","Quota netta incassata","Spese consuntive","Saldo mese","Cumulato quota netta"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {Array.from({length:12},(_,i)=>{
                  const m=`${costiAnno}-${String(i+1).padStart(2,"0")}`;
                  const d=consuntiviMensili[m]||{incassato:0,spese:0,netto:0};
                  const cumul=Array.from({length:i+1},(_,j)=>{const mk=`${costiAnno}-${String(j+1).padStart(2,"0")}`;return (consuntiviMensili[mk]||{incassato:0}).incassato;}).reduce((a,b)=>a+b,0);
                  return(<tr key={m}>
                    <td style={S.td}>{MESI_NOMI[i+1]}</td>
                    <td style={S.tdR}>{d.incassato>0?<span style={{color:STATI_CFG.Incassato.clr,fontWeight:500}}>€ {fmt(d.incassato)}</span>:<span style={{color:"#ddd"}}>—</span>}</td>
                    <td style={S.tdR}>{d.spese>0?<span style={{color:"#E74C3C"}}>€ {fmt(d.spese)}</span>:<span style={{color:"#ddd"}}>—</span>}</td>
                    <td style={S.tdR}><span style={{color:d.netto>=0?"#27AE60":"#E74C3C",fontWeight:500}}>{d.incassato>0||d.spese>0?`€ ${fmt(d.netto)}`:"—"}</span></td>
                    <td style={S.tdR}>
                      {cumul>0&&<>
                        <span style={{fontWeight:500,color:cumul>=breakEvenBase?"#27AE60":BRAND.oroD}}>€ {fmt(cumul)}</span>
                        {cumul>=breakEvenBase&&<span style={{fontSize:11,marginLeft:4,color:"#27AE60"}}>✅ BE</span>}
                      </>}
                      {cumul===0&&<span style={{color:"#ddd"}}>—</span>}
                    </td>
                  </tr>);
                })}
              </tbody>
              <tfoot><tr style={S.totRow}>
                <td style={S.td}>Totale anno</td>
                <td style={S.tdR}>€ {fmt(quotaNettoAgenzia)}</td>
                <td style={S.tdR}>€ {fmt(totaleConsuntivo)}</td>
                <td style={S.tdR}><strong>€ {fmt(quotaNettoAgenzia-totaleConsuntivo)}</strong></td>
                <td style={S.td}/>
              </tr></tfoot>
            </table>
          </div>

          {/* Tabella voci di costo */}
          <div style={S.tblWrap}>
            <div style={{padding:"10px 16px",background:"#fafaf8",borderBottom:"0.5px solid #eee",fontSize:13,fontWeight:500,color:"#666"}}>Voci di costo {costiAnno}</div>
            <table style={{...S.tbl,minWidth:700}}>
              <thead><tr>{["Voce","Tipo","Frequenza","Importo previsionale","Totale annuo prev.","Consuntivo inserito","Azioni"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {costiAnnoCorrente.map(c=>{
                  const annuo=c.frequenza==="Mensile"?Number(c.importoPrevisionale||0)*12:Number(c.importoPrevisionale||0);
                  const cons=Object.values(c.consuntivi||{}).reduce((a,v)=>a+Number(v||0),0);
                  return(<tr key={c.id}>
                    <td style={S.td}><strong>{c.voce}</strong></td>
                    <td style={S.td}><span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:c.tipo==="Fisso"?"#EAF4FB":"#FEF0E0",color:c.tipo==="Fisso"?"#2980B9":"#E67E22"}}>{c.tipo}</span></td>
                    <td style={S.td}>{c.frequenza}</td>
                    <td style={S.tdR}>€ {fmt(c.importoPrevisionale||0)}<span style={{fontSize:11,color:"#aaa"}}> /{c.frequenza==="Mensile"?"mese":"anno"}</span></td>
                    <td style={S.tdR}><strong>€ {fmt(annuo)}</strong></td>
                    <td style={S.tdR}>{cons>0?<span style={{color:"#E74C3C",fontWeight:500}}>€ {fmt(cons)}</span>:<span style={{color:"#ddd"}}>—</span>}</td>
                    <td style={S.td}>
                      <div style={{display:"flex",gap:4}}>
                        <button style={S.btnSm} onClick={()=>setShowConsuntivo(c)}>+ Consuntivo</button>
                        <button style={S.btnSm} onClick={()=>{setFormCosto({voce:c.voce,tipo:c.tipo,frequenza:c.frequenza,importoPrevisionale:c.importoPrevisionale});setEditCostoId(c.id);setShowFormCosto(true);}}>✎</button>
                        <button style={{...S.btnSm,color:"#c0392b"}} onClick={()=>eliminaCosto(c.id)}>✕</button>
                      </div>
                    </td>
                  </tr>);
                })}
              </tbody>
              <tfoot><tr style={S.totRow}>
                <td colSpan={4} style={S.td}>Totale</td>
                <td style={S.tdR}><strong>€ {fmt(totalePrevisionale)}</strong></td>
                <td style={S.tdR}>{totaleConsuntivo>0?<strong style={{color:"#E74C3C"}}>€ {fmt(totaleConsuntivo)}</strong>:"—"}</td>
                <td style={S.td}/>
              </tr></tfoot>
            </table>
          </div>
        </div>
      )}

      {/* AGENTI */}
      {tab==="Agenti"&&(
        <div style={S.sec}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}><button style={S.btnP} onClick={()=>{setEditAgId(null);setFormAg(emptyAg());setShowAg(true);}}>+ Nuovo agente</button></div>
          <div style={S.tblWrap}><table style={{...S.tbl,minWidth:500}}><thead><tr>{["Nome","Cognome","Profilo","Tipo","% Listing","% Acquirente","Azioni"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead><tbody>{agenti.map(a=>(<tr key={a.id}><td style={S.td}>{a.nome}</td><td style={S.td}>{a.cognome}</td><td style={S.td}>{a.profilo}</td><td style={S.td}>{a.tipo}</td><td style={S.td}>{a.profilo==="Broker"?"—":`${a.percListing}%`}</td><td style={S.td}>{a.profilo==="Broker"?"—":`${a.percAcquirente}%`}</td><td style={S.td}><div style={{display:"flex",gap:4}}><button style={S.btn} onClick={()=>apriEditAg(a)}>Modifica</button><button style={S.btnDanger} onClick={()=>setAgenti(agenti.filter(x=>x.id!==a.id))}>Elimina</button></div></td></tr>))}</tbody></table></div>
        </div>
      )}

      {/* IMPOSTAZIONI */}
      {tab==="Impostazioni"&&(
        <div style={S.sec}>
          <div style={{marginBottom:"1.5rem"}}><h2 style={S.sezTitle}>Tipi di vincolo</h2><div style={S.tagRow}>{vincoli.map(v=><span key={v} style={S.tag}>{v}<button style={S.tagX} onClick={()=>setVincoli(vincoli.filter(x=>x!==v))}>✕</button></span>)}</div><div style={{display:"flex",gap:8,maxWidth:360}}><input style={S.inp} placeholder="Nuovo tipo vincolo..." value={nuovoVincolo} onChange={e=>setNuovoVincolo(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&nuovoVincolo.trim()){setVincoli([...vincoli,nuovoVincolo.trim()]);setNuovoVincolo("");}}}/><button style={S.btnP} onClick={()=>{if(nuovoVincolo.trim()){setVincoli([...vincoli,nuovoVincolo.trim()]);setNuovoVincolo("");}}}>Aggiungi</button></div></div>
          <div style={{borderTop:"0.5px solid #eee",paddingTop:"1.25rem"}}><h2 style={S.sezTitle}>Backup dati</h2><p style={{fontSize:13,color:"#aaa",marginBottom:"0.75rem"}}>Esporta tutti i dati in JSON (proposte, agenti, costi, obiettivi). Importa per ripristinarli.</p><div style={{display:"flex",gap:8}}><button style={S.btnP} onClick={esportaDati}>⬇ Esporta JSON</button><button style={S.btn} onClick={()=>importRef.current.click()}>⬆ Importa JSON</button></div></div>
        </div>
      )}

      {/* MODAL FORM COSTO */}
      {showFormCosto&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowFormCosto(false)}>
          <div style={{...S.modal,width:"min(96vw,440px)"}}>
            <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 1rem"}}>{editCostoId?"Modifica voce":"Nuova voce di costo"}</h2>
            <div style={{marginBottom:10}}><label style={S.lbl}>Voce di costo</label><input style={S.inp} value={formCosto.voce} onChange={e=>setFormCosto({...formCosto,voce:e.target.value})} placeholder="es. Affitto ufficio"/></div>
            <div style={S.g2}>
              <div><label style={S.lbl}>Tipo</label><select style={S.inp} value={formCosto.tipo} onChange={e=>setFormCosto({...formCosto,tipo:e.target.value})}><option>Fisso</option><option>Variabile</option></select></div>
              <div><label style={S.lbl}>Frequenza</label><select style={S.inp} value={formCosto.frequenza} onChange={e=>setFormCosto({...formCosto,frequenza:e.target.value})}><option>Mensile</option><option>Annuale</option></select></div>
            </div>
            <div style={{marginBottom:10}}><label style={S.lbl}>Importo previsionale (€) {formCosto.frequenza==="Mensile"?"al mese":"all'anno"}</label><input style={S.inp} type="number" value={formCosto.importoPrevisionale} onChange={e=>setFormCosto({...formCosto,importoPrevisionale:Number(e.target.value)})}/></div>
            {formCosto.frequenza==="Mensile"&&Number(formCosto.importoPrevisionale)>0&&<p style={{fontSize:12,color:"#aaa",margin:"0 0 10px"}}>Totale annuo previsto: <strong>€ {fmt(Number(formCosto.importoPrevisionale)*12)}</strong></p>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem"}}><button style={S.btn} onClick={()=>{setShowFormCosto(false);setEditCostoId(null);}}>Annulla</button><button style={S.btnP} onClick={salvaCosto}>Salva</button></div>
          </div>
        </div>
      )}

      {/* MODAL CONSUNTIVO */}
      {showConsuntivo&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowConsuntivo(null)}>
          <div style={{...S.modal,width:"min(96vw,420px)"}}>
            <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 4px"}}>Inserisci consuntivo</h2>
            <p style={{fontSize:13,color:"#aaa",margin:"0 0 1rem"}}>{showConsuntivo.voce}</p>
            <div style={S.g2}>
              <div><label style={S.lbl}>Mese</label><select style={S.inp} value={consuntivoMese} onChange={e=>setConsuntivoMese(e.target.value)}><option value="">Seleziona mese</option>{Array.from({length:12},(_,i)=>{const m=`${costiAnno}-${String(i+1).padStart(2,"0")}`;return <option key={m} value={m}>{MESI_NOMI[i+1]}</option>;})}</select></div>
              <div><label style={S.lbl}>Importo effettivo (€)</label><input style={S.inp} type="number" value={consuntivoImporto} onChange={e=>setConsuntivoImporto(e.target.value)}/></div>
            </div>
            {consuntivoMese&&showConsuntivo.consuntivi?.[consuntivoMese]&&<p style={{fontSize:12,color:"#aaa"}}>Già inserito: € {fmt(showConsuntivo.consuntivi[consuntivoMese])}</p>}
            <div style={{marginTop:"1rem"}}>
              <p style={{fontSize:12,color:"#aaa",marginBottom:6}}>Tutti i consuntivi inseriti:</p>
              {Object.entries(showConsuntivo.consuntivi||{}).filter(([,v])=>Number(v)>0).map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0",borderBottom:"0.5px solid #f0f0f0"}}><span>{fmtMese(k)}</span><span style={{color:"#E74C3C",fontWeight:500}}>€ {fmt(v)}</span></div>)}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem"}}><button style={S.btn} onClick={()=>setShowConsuntivo(null)}>Chiudi</button><button style={S.btnP} onClick={salvaConsuntivo}>Salva</button></div>
          </div>
        </div>
      )}

      {/* MODAL AVANZA */}
      {showAvanza&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowAvanza(null)}>
          <div style={S.modal}>
            <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 4px"}}>Avanza stato pratica</h2>
            <p style={{fontSize:13,color:"#aaa",margin:"0 0 1rem"}}>{showAvanza.p.comune} — {showAvanza.p.indirizzo} · Prezzo offerto: <strong>€ {fmtN(showAvanza.p.prezzoVendita)}</strong></p>
            <div style={{marginBottom:12}}><label style={S.lbl}>Nuovo stato</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{showAvanza.next.map(s=>(<button key={s} onClick={()=>setAvForm({...avForm,stato:s})} style={{...S.btn,border:`1.5px solid ${avForm.stato===s?STATI_CFG[s]?.clr:"#ddd"}`,background:avForm.stato===s?STATI_CFG[s]?.bg:"#fff",color:avForm.stato===s?STATI_CFG[s]?.clr:BRAND.grigio,fontWeight:avForm.stato===s?500:400}}>{STATI_CFG[s]?.semaforo} {s}</button>))}</div></div>
            {["Rifiutata","Mancata Chiusura","Controproposta"].includes(avForm.stato)&&(<div style={S.warnBox}><label style={S.lbl}>{avForm.stato==="Controproposta"?"Prezzo/note controproposta":avForm.stato==="Mancata Chiusura"?"Motivo mancata chiusura":"Motivo rifiuto"}</label><textarea style={{...S.inp,resize:"vertical",minHeight:64}} value={avForm.noteStato||""} onChange={e=>setAvForm({...avForm,noteStato:e.target.value})}/></div>)}
            {avForm.stato==="Accettata con Vincolo"&&(<div style={S.warnBox}><p style={{fontSize:13,fontWeight:500,margin:"0 0 10px",color:"#D4AC0D"}}>Dettagli vincolo</p><div style={S.g2}><div><label style={S.lbl}>Tipo vincolo</label><select style={S.inp} value={avForm.tipoVincolo||""} onChange={e=>setAvForm({...avForm,tipoVincolo:e.target.value})}><option value="">Seleziona</option>{vincoli.map(v=><option key={v}>{v}</option>)}</select></div><div><label style={S.lbl}>Scadenza</label><input style={S.inp} type="date" value={avForm.dataVincolo||""} onChange={e=>setAvForm({...avForm,dataVincolo:e.target.value})}/></div></div><div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><input type="checkbox" id="esito" checked={avForm.esitoVincolo} onChange={e=>setAvForm({...avForm,esitoVincolo:e.target.checked})}/><label htmlFor="esito" style={{fontSize:13}}>Esito positivo → diventa <strong>Accettata</strong></label></div></div>)}
            {avForm.stato==="Accettata"&&<ConfermaProvv/>}
            {["Preliminare","Rogito Diretto"].includes(avForm.stato)&&(<><ConfermaProvv/><div style={{...S.confBox,background:"#EAF4FB",borderColor:"#2980B9"}}><p style={{fontSize:13,fontWeight:500,margin:"0 0 10px",color:"#2980B9"}}>Dettagli atto</p><div style={S.g2}><div><label style={S.lbl}>Data atto</label><input style={S.inp} type="date" value={avForm.dataAtto||""} onChange={e=>setAvForm({...avForm,dataAtto:e.target.value})}/></div><div><label style={S.lbl}>Acconto provvigioni (€)</label><input style={S.inp} type="number" value={avForm.accontoProvv||0} onChange={e=>setAvForm({...avForm,accontoProvv:e.target.value})}/></div></div></div></>)}
            {avForm.stato==="Incassato"&&(<div style={{marginBottom:10}}><label style={S.lbl}>Note</label><textarea style={{...S.inp,resize:"vertical",minHeight:48}} value={avForm.noteStato||""} onChange={e=>setAvForm({...avForm,noteStato:e.target.value})}/></div>)}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem"}}><button style={S.btn} onClick={()=>setShowAvanza(null)}>Annulla</button><button style={S.btnP} onClick={salvaAvanza}>Conferma</button></div>
          </div>
        </div>
      )}

      {/* MODAL PROPOSTA */}
      {showProp&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowProp(false)}>
          <div style={S.modal}>
            <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 1rem"}}>{editPropId?"Modifica proposta":"Nuova proposta"}</h2>
            <div style={S.g2}>
              <div><label style={S.lbl}>Data proposta (aaaa-mm)</label><input style={S.inp} value={form.dataProposta} onChange={e=>hFormChange("dataProposta",e.target.value)} placeholder="2026-04"/></div>
              <div><label style={S.lbl}>Stato iniziale</label><select style={S.inp} value={form.stato} onChange={e=>hFormChange("stato",e.target.value)}>{Object.keys(STATI_CFG).map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={S.lbl}>Comune</label><input style={S.inp} value={form.comune} onChange={e=>hFormChange("comune",e.target.value)}/></div>
              <div><label style={S.lbl}>Indirizzo</label><input style={S.inp} value={form.indirizzo} onChange={e=>hFormChange("indirizzo",e.target.value)}/></div>
              <div><label style={S.lbl}>Tipologia</label><select style={S.inp} value={form.tipologia} onChange={e=>hFormChange("tipologia",e.target.value)}><option value="">Seleziona</option>{TIPOLOGIE.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={S.lbl}>Prezzo offerto (€)</label><input style={S.inp} type="number" value={form.prezzoVendita} onChange={e=>hFormChange("prezzoVendita",e.target.value)}/></div>
              <div><label style={S.lbl}>Cliente venditore</label><input style={S.inp} value={form.venditore} onChange={e=>hFormChange("venditore",e.target.value)}/></div>
              <div><label style={S.lbl}>Cliente acquirente</label><input style={S.inp} value={form.acquirente} onChange={e=>hFormChange("acquirente",e.target.value)}/></div>
            </div>
            <p style={{fontSize:13,fontWeight:500,margin:"8px 0 6px",borderTop:"0.5px solid #eee",paddingTop:10}}>Lato venditore</p>
            <div style={S.g2}>
              <div><label style={S.lbl}>Agente listing</label><select style={S.inp} value={form.agenteListing} onChange={e=>hFormChange("agenteListing",e.target.value)}><option value="">Seleziona</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome} ({a.profilo})</option>)}</select></div>
              <div><label style={S.lbl}>% Listing pattuita</label><input style={S.inp} type="number" step="0.1" value={form.percListing} onChange={e=>hFormChange("percListing",e.target.value)}/></div>
              <div><label style={S.lbl}>Buyer L (opzionale)</label><select style={S.inp} value={form.buyerL} onChange={e=>hFormChange("buyerL",e.target.value)}><option value="">Nessuno</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
              <div><label style={S.lbl}>% Buyer L</label><input style={S.inp} type="number" step="0.1" value={form.percBuyerL} onChange={e=>hFormChange("percBuyerL",e.target.value)}/></div>
              <div><label style={S.lbl}>Provv. venditore stimata (€)</label><input style={S.inp} type="number" value={form.provvVenditore} onChange={e=>hFormChange("provvVenditore",e.target.value)}/></div>
            </div>
            <p style={{fontSize:13,fontWeight:500,margin:"8px 0 6px",borderTop:"0.5px solid #eee",paddingTop:10}}>Lato acquirente</p>
            <div style={S.g2}>
              <div><label style={S.lbl}>Agente acquirente</label><select style={S.inp} value={form.agenteAcquirente} onChange={e=>hFormChange("agenteAcquirente",e.target.value)}><option value="">Seleziona</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome} ({a.profilo})</option>)}</select></div>
              <div><label style={S.lbl}>% Acquirente pattuita</label><input style={S.inp} type="number" step="0.1" value={form.percAcquirente} onChange={e=>hFormChange("percAcquirente",e.target.value)}/></div>
              <div><label style={S.lbl}>Buyer (opzionale)</label><select style={S.inp} value={form.buyer} onChange={e=>hFormChange("buyer",e.target.value)}><option value="">Nessuno</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
              <div><label style={S.lbl}>% Buyer</label><input style={S.inp} type="number" step="0.1" value={form.percBuyer} onChange={e=>hFormChange("percBuyer",e.target.value)}/></div>
              <div><label style={S.lbl}>Provv. acquirente stimata (€)</label><input style={S.inp} type="number" value={form.provvAcquirente} onChange={e=>hFormChange("provvAcquirente",e.target.value)}/></div>
            </div>
            <div style={{marginTop:8}}><label style={S.lbl}>Note</label><textarea style={{...S.inp,resize:"vertical",minHeight:48}} value={form.noteStato||""} onChange={e=>hFormChange("noteStato",e.target.value)}/></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem"}}><button style={S.btn} onClick={()=>{setShowProp(false);setEditPropId(null);}}>Annulla</button><button style={S.btnP} onClick={salvaProposta}>Salva</button></div>
          </div>
        </div>
      )}

      {/* MODAL AGENTE */}
      {showAg&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowAg(false)}>
          <div style={{...S.modal,width:"min(96vw,420px)"}}>
            <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 1rem"}}>{editAgId?"Modifica agente":"Nuovo agente"}</h2>
            <div style={S.g2}>
              <div><label style={S.lbl}>Nome</label><input style={S.inp} value={formAg.nome} onChange={e=>setFormAg({...formAg,nome:e.target.value})}/></div>
              <div><label style={S.lbl}>Cognome</label><input style={S.inp} value={formAg.cognome} onChange={e=>setFormAg({...formAg,cognome:e.target.value})}/></div>
              <div><label style={S.lbl}>Profilo</label><select style={S.inp} value={formAg.profilo} onChange={e=>setFormAg({...formAg,profilo:e.target.value})}>{PROFILI.map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label style={S.lbl}>Tipo</label><select style={S.inp} value={formAg.tipo} onChange={e=>setFormAg({...formAg,tipo:e.target.value})}><option>Interno</option><option>Agenzia esterna</option></select></div>
              {formAg.profilo!=="Broker"&&<><div><label style={S.lbl}>% default Listing</label><input style={S.inp} type="number" step="0.1" value={formAg.percListing} onChange={e=>setFormAg({...formAg,percListing:Number(e.target.value)})}/></div><div><label style={S.lbl}>% default Acquirente</label><input style={S.inp} type="number" step="0.1" value={formAg.percAcquirente} onChange={e=>setFormAg({...formAg,percAcquirente:Number(e.target.value)})}/></div></>}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem"}}><button style={S.btn} onClick={()=>{setShowAg(false);setEditAgId(null);}}>Annulla</button><button style={S.btnP} onClick={salvaAgente}>Salva</button></div>
          </div>
        </div>
      )}

      {/* MODAL STORICO */}
      {showStorico&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowStorico(null)}>
          <div style={{...S.modal,width:"min(96vw,420px)"}}>
            <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 4px"}}>Storico stati</h2>
            <p style={{fontSize:13,color:"#aaa",margin:"0 0 1.25rem"}}>{showStorico.comune} — {showStorico.indirizzo}</p>
            {(showStorico.storico||[]).map((s,i,arr)=>{const l=i===arr.length-1;return(<div key={i} style={S.storicoStep(l)}><div style={S.dot(l)}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><span style={badgeStyle(s.stato)}>{STATI_CFG[s.stato]?.semaforo} {s.stato}</span><span style={{fontSize:11,color:"#aaa"}}>{fmtDate(s.data)}</span></div>{s.note&&<p style={{fontSize:12,color:"#aaa",margin:"4px 0 0",fontStyle:"italic"}}>{s.note}</p>}</div>);})}
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:"1rem"}}><button style={S.btn} onClick={()=>setShowStorico(null)}>Chiudi</button></div>
          </div>
        </div>
      )}
    </div>
  );
}