import React, { useState, useMemo, useRef } from "react";

const BRAND = {oro:"#C9A96E",oroD:"#A8863A",grigio:"#4A4A4A",beige:"#F2F0EB"};
const MESI_NOMI = ["","Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const TAB_CONFIG = [
  { id:"Dashboard",     icon:"⊞",  label:"Dashboard" },
  { id:"Incarichi",     icon:"📋", label:"Incarichi" },
  { id:"Proposte",      icon:"📝", label:"Proposte" },
  { id:"Venduti",       icon:"🏠", label:"Venduti" },
  { id:"Report Agenti", icon:"📊", label:"Report Agenti" },
  { id:"Fatture Agenti",icon:"🧾", label:"Fatture Agenti" },
  { id:"Agenti",        icon:"👥", label:"Agenti" },
  { id:"Impostazioni",  icon:"⚙️", label:"Impostazioni" },
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
const STATI_INC = { Attivo:{clr:"#27AE60",bg:"#E9F7EF"}, Scaduto:{clr:"#E74C3C",bg:"#FDECEA"}, Venduto:{clr:"#C9A96E",bg:"#FDF6EC"}, Locato:{clr:"#8E44AD",bg:"#F5EEF8"} };
const STATI_PROP = {
  "In attesa":{clr:"#4A90D9",bg:"#E8F1FB",s:"🔵",label:"In attesa"},
  "Controproposta":{clr:"#E67E22",bg:"#FEF0E0",s:"🟡",label:"Controproposta"},
  "Rifiutata":{clr:"#C0392B",bg:"#FDECEA",s:"🔴",label:"Rifiutata"},
  "Mancata Chiusura":{clr:"#922B21",bg:"#FADBD8",s:"🔴",label:"Mancata Chiusura"},
  "Accettata con Vincolo":{clr:"#D4AC0D",bg:"#FEF9E7",s:"🟡",label:"Acc. con Vincolo"},
  "Accettata":{clr:"#27AE60",bg:"#E9F7EF",s:"🟢",label:"Accettata"},
};
const STATI_INCASSO = {"Da incassare":{clr:"#E67E22",bg:"#FEF0E0"},"Parziale":{clr:"#D4AC0D",bg:"#FEF9E7"},"Incassato":{clr:"#27AE60",bg:"#E9F7EF"}};
const STATI_FATTURA = {"Da pagare":{clr:"#E67E22",bg:"#FEF0E0"},"Pagato parzialmente":{clr:"#D4AC0D",bg:"#FEF9E7"},"Pagato":{clr:"#27AE60",bg:"#E9F7EF"}};
const bdg = cfg => ({display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:5,fontSize:11,fontWeight:500,background:cfg?.bg||"#eee",color:cfg?.clr||"#333",border:`0.5px solid ${cfg?.clr||"#ccc"}`,whiteSpace:"nowrap"});
const USERS = [{email:"adirita@casaimmobiliarevarese.it",password:"Dalmata1518",nome:"Antonello Di Rita",ruolo:"Broker"}];
const INIT_AGENTI = [
  {id:1,nome:"Antonello",cognome:"Di Rita",profilo:"Broker",tipo:"Interno",percListing:0,percAcquirente:0},
  {id:2,nome:"Luca",cognome:"Pagliara",profilo:"Consulente",tipo:"Interno",percListing:40,percAcquirente:40},
  {id:3,nome:"Riccardo",cognome:"Di Rita",profilo:"Collaboratore",tipo:"Interno",percListing:20,percAcquirente:20},
  {id:4,nome:"Fabio",cognome:"Portinaro",profilo:"Collaboratore",tipo:"Interno",percListing:40,percAcquirente:40},
];
const INIT_INCARICHI = [
  {id:1,categoria:"vendita",agenteListing:1,percListing:0,buyerListing:3,percBuyerListing:10,fonte:"CP/CDI",nominativo:"Tresoldi - Caretti",comune:"Barasso",indirizzo:"Via Cassini 1",tipologia:"Villa",dataInizio:"2025-05-07",scadenza:"2025-12-31",prezzoRichiesto:205000,prezzoReale:200000,provvPrevista:6150,note:"",stato:"Venduto"},
  {id:2,categoria:"vendita",agenteListing:2,percListing:40,buyerListing:null,percBuyerListing:0,fonte:"CP/CDI",nominativo:"Ventura",comune:"Malnate",indirizzo:"Viale Kennedy 15",tipologia:"Bilocale",dataInizio:"2025-04-02",scadenza:"2025-10-01",prezzoRichiesto:89000,prezzoReale:85000,provvPrevista:2000,note:"",stato:"Attivo"},
  {id:3,categoria:"vendita",agenteListing:1,percListing:0,buyerListing:3,percBuyerListing:10,fonte:"CP/CDI",nominativo:"Scala Domenico",comune:"Gazzada Schianno",indirizzo:"Via Carducci",tipologia:"Villa",dataInizio:"2025-09-01",scadenza:"2026-02-28",prezzoRichiesto:310000,prezzoReale:290000,provvPrevista:9300,note:"",stato:"Attivo"},
  {id:4,categoria:"affitto",agenteListing:2,percListing:40,buyerListing:null,percBuyerListing:0,fonte:"Privati",nominativo:"Rossi Mario",comune:"Varese",indirizzo:"Via Roma 10",tipologia:"Bilocale",dataInizio:"2025-10-01",scadenza:"2026-04-01",prezzoRichiesto:800,prezzoReale:750,provvPrevista:750,note:"",stato:"Attivo"},
];
const INIT_PROPOSTE = [
  {id:1,categoria:"vendita",tipo:"da_incarico",incaricoId:1,agenteListing:1,percListing:0,buyerListing:3,percBuyerListing:10,comuneImmobile:"Barasso",indirizzoImmobile:"Via Cassini 1",tipologia:"Villa",nominativoVenditore:"Tresoldi - Caretti",agenziaEsterna:null,agenteAcquirente:1,percAcquirente:0,buyer:3,percBuyer:20,nomeAcquirente:"Armellini",prezzoOfferto:180000,vincolata:false,tipoVincolo:"",termineSubordine:"",scadenzaProposta:"2025-12-20",provvVenditore:5400,provvAcquirente:7200,stato:"Accettata",noteStato:"",dataStato:"2025-12-10",storico:[]},
  {id:2,categoria:"vendita",tipo:"da_incarico",incaricoId:3,agenteListing:1,percListing:0,buyerListing:null,percBuyerListing:0,comuneImmobile:"Gazzada Schianno",indirizzoImmobile:"Via Carducci",tipologia:"Villa",nominativoVenditore:"Scala Domenico",agenziaEsterna:null,agenteAcquirente:2,percAcquirente:40,buyer:null,percBuyer:0,nomeAcquirente:"Roncari Leonardo",prezzoOfferto:270000,vincolata:true,tipoVincolo:"Mutuo",termineSubordine:"2026-05-01",scadenzaProposta:"2026-03-15",provvVenditore:1640,provvAcquirente:8000,stato:"In attesa",noteStato:"",dataStato:"2026-02-10",storico:[]},
];
const INIT_VENDUTI = [
  {id:1,categoria:"vendita",propostaId:1,incaricoId:1,comuneImmobile:"Barasso",indirizzoImmobile:"Via Cassini 1",tipologia:"Villa",nominativoVenditore:"Tresoldi - Caretti",nomeAcquirente:"Armellini",agenteListing:1,percListing:0,buyerListing:3,percBuyerListing:10,agenteAcquirente:1,percAcquirente:0,buyer:3,percBuyer:20,prezzoVendita:180000,provvVenditore:5400,provvAcquirente:7200,tipoAtto:"Preliminare",dataAtto:"2026-01-05",acc1V:5400,dataAcc1V:"2026-01-05",noteAcc1V:"Acconto firma preliminare",acc2V:0,dataAcc2V:"",noteAcc2V:"",saldoV:0,dataSaldoV:"",noteSaldoV:"",acc1A:3600,dataAcc1A:"2026-01-05",noteAcc1A:"Acconto firma preliminare",acc2A:0,dataAcc2A:"",noteAcc2A:"",saldoA:0,dataSaldoA:"",noteSaldoA:"",scadenzaIncasso:"2026-06-30",agenziaEsterna:null,note:""},
];
const calcolaIncassatoV = v => Number(v.acc1V||0)+Number(v.acc2V||0)+Number(v.saldoV||0);
const calcolaIncassatoA = v => Number(v.acc1A||0)+Number(v.acc2A||0)+Number(v.saldoA||0);
const calcolaStatoIncasso = v => { const t=Number(v.provvVenditore||0)+Number(v.provvAcquirente||0); const i=calcolaIncassatoV(v)+calcolaIncassatoA(v); if(i===0)return"Da incassare"; if(i>=t)return"Incassato"; return"Parziale"; };
const calcolaQuotaAgente = (v,agId) => { let q=0; if(v.agenteListing===agId)q+=Number(v.provvVenditore||0)*Number(v.percListing||0)/100; if(v.agenteAcquirente===agId)q+=Number(v.provvAcquirente||0)*Number(v.percAcquirente||0)/100; if(v.buyerListing===agId&&v.agenteListing!==agId)q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100; if(v.buyer===agId&&v.agenteAcquirente!==agId)q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100; return q; };

function LoginPage({onLogin}) {
  const [em,setEm]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [load,setLoad]=useState(false);
  const go=()=>{setLoad(true);setTimeout(()=>{const u=USERS.find(u=>u.email===em&&u.password===pw);if(u)onLogin(u);else{setErr("Credenziali non corrette.");setLoad(false);}},600);};
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
  return (
    <div style={{width:220,minWidth:220,background:"#2C2C2C",display:"flex",flexDirection:"column",height:"100vh",position:"sticky",top:0,flexShrink:0}}>
      <div style={{padding:"1.5rem 1.25rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{fontSize:28,fontWeight:700,color:"#fff",fontFamily:"Georgia,serif"}}>c<span style={{color:BRAND.oro}}>à</span>sa</div>
        <div style={{fontSize:8,letterSpacing:"0.3em",color:"rgba(255,255,255,0.4)",borderTop:"1px solid rgba(255,255,255,0.2)",paddingTop:3,marginTop:3}}>IMMOBILIARE</div>
        <div style={{marginTop:8,fontSize:11,color:"rgba(255,255,255,0.35)"}}>Gestionale interno</div>
      </div>
      <nav style={{flex:1,padding:"0.75rem 0",overflowY:"auto"}}>
        {TAB_CONFIG.map(t=>{
          const active=tab===t.id;
          return(<button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 1.25rem",background:active?`${BRAND.oro}22`:"transparent",border:"none",borderLeft:active?`3px solid ${BRAND.oro}`:"3px solid transparent",color:active?BRAND.oro:"rgba(255,255,255,0.55)",fontSize:13,fontWeight:active?600:400,cursor:"pointer",textAlign:"left"}}
            onMouseEnter={e=>{if(!active){e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="rgba(255,255,255,0.85)";}}}
            onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.55)";}}}
          ><span style={{fontSize:15,width:18,textAlign:"center",flexShrink:0}}>{t.icon}</span><span>{t.label}</span></button>);
        })}
      </nav>
      <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",margin:"0 1.25rem"}}/>
      <div style={{padding:"0.75rem 1rem"}}>
        <button onClick={onEsporta} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",background:"transparent",border:`1px solid rgba(201,169,110,0.4)`,borderRadius:6,color:BRAND.oro,fontSize:12,cursor:"pointer",marginBottom:6}}>⬇ Esporta dati</button>
        <button onClick={()=>importRef.current.click()} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",background:"transparent",border:"1px solid rgba(255,255,255,0.12)",borderRadius:6,color:"rgba(255,255,255,0.45)",fontSize:12,cursor:"pointer"}}>⬆ Importa dati</button>
        <input ref={importRef} type="file" accept=".json" style={{display:"none"}} onChange={onImporta}/>
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
        <span style={{fontSize:13,fontWeight:600,color:res>0?"#E67E22":res===0?"#27AE60":"#E74C3C"}}>{res>0?`Residuo: € ${fmt(res)}`:res===0?"✅ Saldato":"⚠️ Eccesso"}</span>
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

function SchedaAgente({agente,venduti,onClose}) {
  const [fA,setFA]=useState("Tutti"); const [fM,setFM]=useState("Tutti");
  const anni=useMemo(()=>Array.from(new Set(venduti.map(v=>getAnno(v.dataAtto||"")).filter(Boolean))).sort().reverse(),[venduti]);
  const mesi=useMemo(()=>Array.from(new Set(venduti.filter(v=>fA==="Tutti"||getAnno(v.dataAtto||"")===fA).map(v=>getMese(v.dataAtto||"")).filter(Boolean))).sort().reverse(),[venduti,fA]);
  const prat=useMemo(()=>venduti.filter(v=>{const c=v.agenteListing===agente.id||v.agenteAcquirente===agente.id||v.buyerListing===agente.id||v.buyer===agente.id;if(!c)return false;if(fA!=="Tutti"&&getAnno(v.dataAtto||"")!==fA)return false;if(fM!=="Tutti"&&getMese(v.dataAtto||"")!==fM)return false;return true;}),[venduti,agente,fA,fM]);
  const totP=prat.reduce((s,v)=>s+Number(v.provvVenditore||0)+Number(v.provvAcquirente||0),0);
  const totI=prat.reduce((s,v)=>s+calcolaIncassatoV(v)+calcolaIncassatoA(v),0);
  const totQ=prat.reduce((s,v)=>s+calcolaQuotaAgente(v,agente.id),0);
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
        {[["Pratiche",prat.length,"#4A90D9"],["Provv. Agenzia","€ "+fmt(totP),BRAND.oro],["Incassato","€ "+fmt(totI),"#27AE60"],["Quota Agente","€ "+fmt(totQ),"#8E44AD"]].map(([l,v,c])=>(
          <div key={l} style={{background:"#fff",borderRadius:8,border:"0.5px solid #e8e5e0",padding:"12px 14px",borderLeft:`3px solid ${c}`}}><p style={{fontSize:11,color:"#888",margin:"0 0 3px"}}>{l}</p><p style={{fontSize:18,fontWeight:600,margin:0,color:c}}>{v}</p></div>
        ))}
      </div>
      <div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"auto"}}>
        <div style={{padding:"10px 14px",background:"#fafaf8",borderBottom:"0.5px solid #eee",fontSize:13,fontWeight:500,color:"#666"}}>Pratiche ({prat.length})</div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600}}>
          <thead><tr>{["Data atto","Immobile","Ruolo","Provv. Agenzia","Quota Agente","Stato"].map(h=><th key={h} style={Ss.th}>{h}</th>)}</tr></thead>
          <tbody>
            {prat.map(v=>{
              const ruoli=[];
              if(v.agenteListing===agente.id)ruoli.push("Listing");if(v.agenteAcquirente===agente.id)ruoli.push("Acquirente");
              if(v.buyerListing===agente.id&&v.agenteListing!==agente.id)ruoli.push("Buyer L.");if(v.buyer===agente.id&&v.agenteAcquirente!==agente.id)ruoli.push("Buyer");
              const q=calcolaQuotaAgente(v,agente.id);const cfg=STATI_INCASSO[v.statoIncasso]||STATI_INCASSO["Da incassare"];
              return(<tr key={v.id}>
                <td style={Ss.td}>{fmtD(v.dataAtto)}</td>
                <td style={Ss.td}><strong>{v.comuneImmobile}</strong> — {v.indirizzoImmobile}<br/><span style={{fontSize:11,color:"#aaa"}}>{v.tipologia}</span></td>
                <td style={Ss.td}>{ruoli.map(r=><span key={r} style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:"#EAF4FB",color:"#2980B9",marginRight:4,fontWeight:500}}>{r}</span>)}</td>
                <td style={Ss.tdR}>€ {fmt(Number(v.provvVenditore||0)+Number(v.provvAcquirente||0))}</td>
                <td style={{...Ss.tdR,fontWeight:600,color:"#8E44AD"}}>€ {fmt(q)}</td>
                <td style={Ss.td}><span style={bdg(cfg)}>{v.statoIncasso}</span></td>
              </tr>);
            })}
            {prat.length===0&&<tr><td colSpan={6} style={{...Ss.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessuna pratica nel periodo</td></tr>}
          </tbody>
          {prat.length>0&&<tfoot><tr style={{background:"#F2F0EB",fontWeight:500}}><td colSpan={3} style={Ss.td}>Totale</td><td style={Ss.tdR}>€ {fmt(totP)}</td><td style={{...Ss.tdR,color:"#8E44AD"}}>€ {fmt(totQ)}</td><td style={Ss.td}/></tr></tfoot>}
        </table>
      </div>
    </div>
  </div>);
}

export default function App() {
  const [utente,setUtente]=useState(null);
  const [tab,setTab]=useState("Dashboard");
  const [agenti,setAgenti]=useState(INIT_AGENTI);
  const [incarichi,setIncarichi]=useState(INIT_INCARICHI);
  const [proposte,setProposte]=useState(INIT_PROPOSTE);
  const [venduti,setVenduti]=useState(INIT_VENDUTI);
  const [fonti,setFonti]=useState(["CP/CDI","Zona","Privati","Agenzia Esterna","Passaparola"]);
  const [tipologie,setTipologie]=useState(["Monolocale","Bilocale","Trilocale","Quadrilocale","Villa","Casa singola","Porzione","Appartamento","Terreno edificabile","Negozio","Ufficio"]);
  const [vincoli,setVincoli]=useState(["Mutuo","Sanatoria","Successione","Permuta","Altro"]);
  const [tipiNeg,setTipiNeg]=useState(["Mutuo negato","Pratica rifiutata","Rinuncia acquirente","Problemi catastali","Altro"]);
  const [nF,setNF]=useState(""); const [nT,setNT]=useState(""); const [nV,setNV]=useState(""); const [nN,setNN]=useState("");
  const [subInc,setSubInc]=useState("vendita"); const [subProp,setSubProp]=useState("vendita"); const [subVend,setSubVend]=useState("vendita");
  const [fIncStato,setFIncStato]=useState("Tutti"); const [fIncAnno,setFIncAnno]=useState("Tutti"); const [fIncMese,setFIncMese]=useState("Tutti"); const [fIncAg,setFIncAg]=useState("Tutti");
  const [fPropStato,setFPropStato]=useState("Tutti"); const [fPropAnno,setFPropAnno]=useState("Tutti"); const [fPropMese,setFPropMese]=useState("Tutti"); const [fPropAg,setFPropAg]=useState("Tutti");
  const [fVendStato,setFVendStato]=useState("Tutti"); const [fVendAnno,setFVendAnno]=useState("Tutti"); const [fVendAg,setFVendAg]=useState("Tutti");
  const [dashAnno,setDashAnno]=useState(annoCorrente);
  const [reportAnno,setReportAnno]=useState(annoCorrente); const [reportMese,setReportMese]=useState("Tutti");
  const [fatAgente,setFatAgente]=useState(""); const [fatAnno,setFatAnno]=useState(annoCorrente); const [fatMese,setFatMese]=useState("Tutti");
  const [showInc,setShowInc]=useState(null); const [showProp,setShowProp]=useState(null); const [showGestProp,setShowGestProp]=useState(null); const [showGestVend,setShowGestVend]=useState(null);
  const [formInc,setFormInc]=useState({}); const [formProp,setFormProp]=useState({}); const [formStatoProp,setFormStatoProp]=useState({}); const [formVend,setFormVend]=useState({});
  const [showIncassoLato,setShowIncassoLato]=useState(null);
  const [showAgente,setShowAgente]=useState(null); const [formAgente,setFormAgente]=useState({});
  const [schedaAgente,setSchedaAgente]=useState(null);
  const [pagamentiFatture,setPagamentiFatture]=useState({});
  const [showPagamento,setShowPagamento]=useState(null); const [formPagamento,setFormPagamento]=useState({});
  const importRef=useRef();

  const nomAg=id=>{const a=agenti.find(a=>a.id===Number(id));return a?`${a.nome} ${a.cognome}`:"—";};
  const statoInc=i=>i.stato==="Venduto"?"Venduto":i.stato==="Locato"?"Locato":isScad(i.scadenza)?"Scaduto":"Attivo";

  const anniInc=useMemo(()=>Array.from(new Set(incarichi.map(i=>getAnno(i.dataInizio)).filter(Boolean))).sort().reverse(),[incarichi]);
  const anniProp=useMemo(()=>Array.from(new Set(proposte.map(p=>getAnno(p.dataStato)).filter(Boolean))).sort().reverse(),[proposte]);
  const anniVend=useMemo(()=>Array.from(new Set(venduti.map(v=>getAnno(v.dataAtto||"")).filter(Boolean))).sort().reverse(),[venduti]);
  const mesiInc=useMemo(()=>Array.from(new Set(incarichi.filter(i=>fIncAnno==="Tutti"||getAnno(i.dataInizio)===fIncAnno).map(i=>getMese(i.dataInizio)).filter(Boolean))).sort().reverse(),[incarichi,fIncAnno]);
  const mesiProp=useMemo(()=>Array.from(new Set(proposte.filter(p=>fPropAnno==="Tutti"||getAnno(p.dataStato)===fPropAnno).map(p=>getMese(p.dataStato)).filter(Boolean))).sort().reverse(),[proposte,fPropAnno]);
  const mesiFat=useMemo(()=>Array.from(new Set(venduti.filter(v=>fatAnno==="Tutti"||getAnno(v.dataAtto||"")===fatAnno).map(v=>getMese(v.dataAtto||"")).filter(Boolean))).sort().reverse(),[venduti,fatAnno]);
  const mesiReport=useMemo(()=>Array.from(new Set(venduti.filter(v=>reportAnno==="Tutti"||getAnno(v.dataAtto||"")===reportAnno).map(v=>getMese(v.dataAtto||"")).filter(Boolean))).sort().reverse(),[venduti,reportAnno]);

  const incFiltrati=useMemo(()=>incarichi.filter(i=>{if(i.categoria!==subInc)return false;const s=statoInc(i);if(fIncStato!=="Tutti"&&s!==fIncStato)return false;if(fIncAnno!=="Tutti"&&getAnno(i.dataInizio)!==fIncAnno)return false;if(fIncMese!=="Tutti"&&getMese(i.dataInizio)!==fIncMese)return false;if(fIncAg!=="Tutti"&&i.agenteListing!==Number(fIncAg))return false;return true;}),[incarichi,subInc,fIncStato,fIncAnno,fIncMese,fIncAg]);
  const cntInc=useMemo(()=>{const b=incarichi.filter(i=>{if(i.categoria!==subInc)return false;if(fIncAnno!=="Tutti"&&getAnno(i.dataInizio)!==fIncAnno)return false;if(fIncMese!=="Tutti"&&getMese(i.dataInizio)!==fIncMese)return false;if(fIncAg!=="Tutti"&&i.agenteListing!==Number(fIncAg))return false;return true;});return{attivi:b.filter(i=>statoInc(i)==="Attivo").length,scaduti:b.filter(i=>statoInc(i)==="Scaduto").length,venduti:b.filter(i=>statoInc(i)==="Venduto"||statoInc(i)==="Locato").length};},[incarichi,subInc,fIncAnno,fIncMese,fIncAg]);
  const propFiltrate=useMemo(()=>proposte.filter(p=>{if(p.categoria!==subProp)return false;if(fPropStato!=="Tutti"&&p.stato!==fPropStato)return false;if(fPropAnno!=="Tutti"&&getAnno(p.dataStato)!==fPropAnno)return false;if(fPropMese!=="Tutti"&&getMese(p.dataStato)!==fPropMese)return false;if(fPropAg!=="Tutti"&&Number(p.agenteAcquirente)!==Number(fPropAg)&&Number(p.agenteListing)!==Number(fPropAg))return false;return true;}),[proposte,subProp,fPropStato,fPropAnno,fPropMese,fPropAg]);
  const cntProp=useMemo(()=>({attesa:propFiltrate.filter(p=>p.stato==="In attesa").length,vincolo:propFiltrate.filter(p=>p.stato==="Accettata con Vincolo").length,accettate:propFiltrate.filter(p=>p.stato==="Accettata").length,rifiutate:propFiltrate.filter(p=>["Rifiutata","Mancata Chiusura"].includes(p.stato)).length}),[propFiltrate]);
  const vendFiltrati=useMemo(()=>venduti.filter(v=>{if(v.categoria!==subVend)return false;if(fVendStato!=="Tutti"&&v.statoIncasso!==fVendStato)return false;if(fVendAnno!=="Tutti"&&getAnno(v.dataAtto||"")!==fVendAnno)return false;if(fVendAg!=="Tutti"&&Number(v.agenteListing)!==Number(fVendAg)&&Number(v.agenteAcquirente)!==Number(fVendAg))return false;return true;}),[venduti,subVend,fVendStato,fVendAnno,fVendAg]);
  const cntVend=useMemo(()=>({daIncassare:vendFiltrati.filter(v=>v.statoIncasso==="Da incassare").length,parziale:vendFiltrati.filter(v=>v.statoIncasso==="Parziale").length,incassato:vendFiltrati.filter(v=>v.statoIncasso==="Incassato").length}),[vendFiltrati]);
  const dashVend=useMemo(()=>venduti.filter(v=>v.categoria==="vendita"&&(dashAnno==="Tutti"||getAnno(v.dataAtto||"")===dashAnno)),[venduti,dashAnno]);
  const dashInc=useMemo(()=>incarichi.filter(i=>i.categoria==="vendita"&&(dashAnno==="Tutti"||getAnno(i.dataInizio)===dashAnno)),[incarichi,dashAnno]);
  const vendReport=useMemo(()=>venduti.filter(v=>{if(reportAnno!=="Tutti"&&getAnno(v.dataAtto||"")!==reportAnno)return false;if(reportMese!=="Tutti"&&getMese(v.dataAtto||"")!==reportMese)return false;return true;}),[venduti,reportAnno,reportMese]);

  // Dashboard calcoli
  const dashVendInc=dashVend.filter(v=>v.statoIncasso==="Incassato");
  const dashVendNoInc=dashVend.filter(v=>v.statoIncasso!=="Incassato");
  const dashIncassato=dashVendInc.reduce((s,v)=>s+Number(v.provvVenditore||0)+Number(v.provvAcquirente||0),0);
  const dashDaIncassare=dashVendNoInc.reduce((s,v)=>s+(Number(v.provvVenditore||0)+Number(v.provvAcquirente||0)-calcolaIncassatoV(v)-calcolaIncassatoA(v)),0);
  const propVincolo=proposte.filter(p=>p.stato==="Accettata con Vincolo"&&p.categoria==="vendita"&&(dashAnno==="Tutti"||getAnno(p.dataStato)===dashAnno));
  const dashSospeso=propVincolo.reduce((s,p)=>s+Number(p.provvVenditore||0)+Number(p.provvAcquirente||0),0);
  const calcQAg=(vArr)=>vArr.reduce((s,v)=>s+agenti.filter(a=>a.profilo!=="Broker").reduce((sa,a)=>sa+calcolaQuotaAgente(v,a.id),0),0);
  const calcQBuy=(vArr)=>vArr.reduce((s,v)=>s+(Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100)+(Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100),0);
  const calcQAgenzia=(vArr)=>vArr.reduce((s,v)=>{const tot=Number(v.provvVenditore||0)+Number(v.provvAcquirente||0);const qA=agenti.filter(a=>a.profilo!=="Broker").reduce((sa,a)=>sa+calcolaQuotaAgente(v,a.id),0);const qB=(Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100)+(Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100);return s+(tot-qA-qB);},0);

  const agentiFattura=useMemo(()=>agenti.filter(a=>a.profilo!=="Broker"),[agenti]);
  const fatAg=agenti.find(a=>a.id===Number(fatAgente));
  const fatturaDati=useMemo(()=>{
    if(!fatAgente) return [];
    const ag=agenti.find(a=>a.id===Number(fatAgente));
    if(!ag||ag.profilo==="Broker") return [];
    return venduti.filter(v=>{if(v.statoIncasso==="Da incassare")return false;if(fatAnno!=="Tutti"&&getAnno(v.dataAtto||"")!==fatAnno)return false;if(fatMese!=="Tutti"&&getMese(v.dataAtto||"")!==fatMese)return false;return v.agenteListing===ag.id||v.agenteAcquirente===ag.id||v.buyerListing===ag.id||v.buyer===ag.id;}).map(v=>{
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
  },[agenti,venduti,fatAgente,fatAnno,fatMese,pagamentiFatture]);
  const totImponibile=fatturaDati.reduce((s,x)=>s+x.totPratica,0);
  const totPagato=fatturaDati.reduce((s,x)=>s+Number(x.pag.importoPagato||0),0);

  const emptyInc=(cat="vendita")=>({categoria:cat,agenteListing:"",percListing:0,buyerListing:"",percBuyerListing:0,fonte:"",nominativo:"",comune:"",indirizzo:"",tipologia:"",dataInizio:todayStr(),scadenza:"",prezzoRichiesto:"",prezzoReale:"",provvPrevista:"",note:"",stato:"Attivo"});
  const salvaInc=()=>{if(!formInc.nominativo||!formInc.comune)return;const inc={...formInc,id:showInc==="new"?Date.now():showInc.id,prezzoRichiesto:Number(formInc.prezzoRichiesto),prezzoReale:Number(formInc.prezzoReale),provvPrevista:Number(formInc.provvPrevista),agenteListing:Number(formInc.agenteListing)||null,buyerListing:formInc.buyerListing?Number(formInc.buyerListing):null,percListing:Number(formInc.percListing||0),percBuyerListing:Number(formInc.percBuyerListing||0)};showInc==="new"?setIncarichi([...incarichi,inc]):setIncarichi(incarichi.map(i=>i.id===showInc.id?inc:i));setShowInc(null);};
  const emptyProp=(cat="vendita",inc=null)=>({categoria:cat,tipo:inc?"da_incarico":"collaborazione",incaricoId:inc?inc.id:null,agenteListing:inc?inc.agenteListing:null,percListing:inc?inc.percListing:0,buyerListing:inc?inc.buyerListing:null,percBuyerListing:inc?inc.percBuyerListing:0,comuneImmobile:inc?inc.comune:"",indirizzoImmobile:inc?inc.indirizzo:"",tipologia:inc?inc.tipologia:"",nominativoVenditore:inc?inc.nominativo:"",agenziaEsterna:"",agenteAcquirente:"",percAcquirente:"",buyer:"",percBuyer:0,nomeAcquirente:"",prezzoOfferto:"",vincolata:false,tipoVincolo:"",termineSubordine:"",scadenzaProposta:"",provvVenditore:inc?inc.provvPrevista:"",provvAcquirente:"",stato:"In attesa",noteStato:"",dataStato:todayStr(),storico:[{stato:"In attesa",data:nowISO()}]});
  const salvaProp=()=>{if(!formProp.comuneImmobile||!formProp.nomeAcquirente)return;const p={...formProp,id:Date.now(),prezzoOfferto:Number(formProp.prezzoOfferto),provvAcquirente:Number(formProp.provvAcquirente),provvVenditore:Number(formProp.provvVenditore),agenteAcquirente:Number(formProp.agenteAcquirente)||null,buyer:formProp.buyer?Number(formProp.buyer):null,percAcquirente:Number(formProp.percAcquirente||0)};setProposte([...proposte,p]);setShowProp(null);};
  const salvaStatoProp=()=>{
    if(!showGestProp)return;const p=showGestProp;const ns=formStatoProp.stato||p.stato;
    const upd={...p,...formStatoProp,stato:ns,storico:[...(p.storico||[]),{stato:ns,data:nowISO(),note:formStatoProp.noteStato||""}]};
    setProposte(proposte.map(x=>x.id===p.id?upd:x));
    if(ns==="Accettata"||(ns==="Accettata con Vincolo"&&formStatoProp.esitoVincolo==="Positivo")){
      const inc=incarichi.find(i=>i.id===p.incaricoId);const ag=agenti.find(a=>a.id===p.agenteAcquirente);
      const nv={id:Date.now(),categoria:p.categoria,propostaId:p.id,incaricoId:p.incaricoId,comuneImmobile:p.comuneImmobile,indirizzoImmobile:p.indirizzoImmobile,tipologia:p.tipologia,nominativoVenditore:p.nominativoVenditore,nomeAcquirente:p.nomeAcquirente,agenteListing:p.agenteListing,percListing:Number(p.percListing||0),buyerListing:p.buyerListing,percBuyerListing:Number(p.percBuyerListing||0),agenteAcquirente:p.agenteAcquirente,percAcquirente:Number(p.percAcquirente||ag?.percAcquirente||0),buyer:p.buyer,percBuyer:Number(p.percBuyer||0),prezzoVendita:Number(p.prezzoOfferto),provvVenditore:Number(p.provvVenditore||inc?.provvPrevista||0),provvAcquirente:Number(p.provvAcquirente||0),tipoAtto:"Preliminare",dataAtto:"",statoIncasso:"Da incassare",acc1V:0,dataAcc1V:"",noteAcc1V:"",acc2V:0,dataAcc2V:"",noteAcc2V:"",saldoV:0,dataSaldoV:"",noteSaldoV:"",acc1A:0,dataAcc1A:"",noteAcc1A:"",acc2A:0,dataAcc2A:"",noteAcc2A:"",saldoA:0,dataSaldoA:"",noteSaldoA:"",incassatoVenditore:0,incassatoAcquirente:0,scadenzaIncasso:"",agenziaEsterna:p.agenziaEsterna||null,note:""};
      setVenduti([...venduti,nv]);
      if(p.incaricoId)setIncarichi(incarichi.map(i=>i.id===p.incaricoId?{...i,stato:p.categoria==="affitto"?"Locato":"Venduto"}:i));
    }
    setShowGestProp(null);
  };
  const salvaVend=()=>{if(!showGestVend)return;const u={...showGestVend,...formVend,incassatoVenditore:calcolaIncassatoV(formVend),incassatoAcquirente:calcolaIncassatoA(formVend)};u.statoIncasso=calcolaStatoIncasso(u);setVenduti(venduti.map(v=>v.id===showGestVend.id?u:v));setShowGestVend(null);};
  const salvaPagamento=()=>{if(!showPagamento)return;setPagamentiFatture({...pagamentiFatture,[showPagamento.key]:{...formPagamento,importoPagato:Number(formPagamento.importoPagato||0)}});setShowPagamento(null);};
  const esporta=()=>{const b=new Blob([JSON.stringify({agenti,incarichi,proposte,venduti,fonti,tipologie,vincoli,tipiNeg,pagamentiFatture},null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`gestionale_${todayStr()}.json`;a.click();URL.revokeObjectURL(u);};
  const importa=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.agenti)setAgenti(d.agenti);if(d.incarichi)setIncarichi(d.incarichi);if(d.proposte)setProposte(d.proposte);if(d.venduti)setVenduti(d.venduti);if(d.fonti)setFonti(d.fonti);if(d.tipologie)setTipologie(d.tipologie);if(d.vincoli)setVincoli(d.vincoli);if(d.tipiNeg)setTipiNeg(d.tipiNeg);if(d.pagamentiFatture)setPagamentiFatture(d.pagamentiFatture);alert("Importato!");}catch{alert("File non valido.");}};r.readAsText(f);e.target.value="";};

  if(!utente) return <LoginPage onLogin={setUtente}/>;

  const S={
    sec:{padding:"1.5rem",flex:1,overflowY:"auto",minWidth:0},
    g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10},
    g4:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"},
    fRow:{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"},
    sel:{fontSize:13,padding:"5px 8px",borderRadius:6,border:"0.5px solid #ccc",background:"#fff",color:BRAND.grigio},
    btn:{padding:"6px 12px",fontSize:13,borderRadius:6,border:"0.5px solid #ccc",background:"#fff",cursor:"pointer",color:BRAND.grigio},
    btnP:{padding:"7px 14px",fontSize:13,borderRadius:6,border:`1px solid ${BRAND.oro}`,background:BRAND.oro,cursor:"pointer",color:"#fff",fontWeight:500},
    btnG:{padding:"7px 14px",fontSize:13,borderRadius:6,border:"1px solid #27AE60",background:"#27AE60",cursor:"pointer",color:"#fff",fontWeight:500},
    btnD:{padding:"6px 12px",fontSize:13,borderRadius:6,border:"0.5px solid #fcc",background:"#fff",cursor:"pointer",color:"#c0392b"},
    subTab:a=>({padding:"6px 14px",fontSize:13,cursor:"pointer",border:`1px solid ${a?BRAND.oro:"#ddd"}`,background:a?BRAND.oro:"#fff",color:a?"#fff":BRAND.grigio,borderRadius:6,fontWeight:a?500:400}),
    tblWrap:{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"auto",marginBottom:"1rem"},
    tbl:{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700},
    th:{textAlign:"left",padding:"9px 12px",borderBottom:"0.5px solid #eee",color:"#999",fontWeight:500,fontSize:12,whiteSpace:"nowrap",background:"#fafaf8"},
    td:{padding:"9px 12px",borderBottom:"0.5px solid #f5f5f5",verticalAlign:"middle"},
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
  };

  const Sel=({value,onChange,children})=>(<select style={S.sel} value={value} onChange={e=>onChange(e.target.value)}>{children}</select>);
  const SubTabs=({value,onChange,options})=>(<div style={{display:"flex",gap:8}}>{options.map(o=><button key={o.v} style={S.subTab(value===o.v)} onClick={()=>onChange(o.v)}>{o.l}</button>)}</div>);
  const SettSec=({title,items,setItems,val,setVal,ph})=>(<div style={{marginBottom:"1.25rem"}}><h3 style={{fontSize:14,fontWeight:500,margin:"0 0 8px"}}>{title}</h3><div style={S.tagRow}>{items.map(v=><span key={v} style={S.tag}>{v}<button style={S.tagX} onClick={()=>setItems(items.filter(x=>x!==v))}>✕</button></span>)}</div><div style={{display:"flex",gap:8,maxWidth:380}}><input style={S.inp} placeholder={ph} value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&val.trim()){setItems([...items,val.trim()]);setVal("");}}} /><button style={S.btnP} onClick={()=>{if(val.trim()){setItems([...items,val.trim()]);setVal("");}}}>+</button></div></div>);
  const FiltriInc=()=>(<div style={S.fRow}><Sel value={fIncAnno} onChange={v=>{setFIncAnno(v);setFIncMese("Tutti");}}><option value="Tutti">Tutti gli anni</option>{anniInc.map(a=><option key={a}>{a}</option>)}</Sel><Sel value={fIncMese} onChange={setFIncMese}><option value="Tutti">Tutti i mesi</option>{mesiInc.map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}</Sel><Sel value={fIncStato} onChange={setFIncStato}><option value="Tutti">Tutti gli stati</option>{["Attivo","Scaduto",subInc==="affitto"?"Locato":"Venduto"].map(s=><option key={s}>{s}</option>)}</Sel><Sel value={fIncAg} onChange={setFIncAg}><option value="Tutti">Tutti gli agenti</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</Sel></div>);
  const FiltriProp=()=>(<div style={S.fRow}><Sel value={fPropAnno} onChange={v=>{setFPropAnno(v);setFPropMese("Tutti");}}><option value="Tutti">Tutti gli anni</option>{anniProp.map(a=><option key={a}>{a}</option>)}</Sel><Sel value={fPropMese} onChange={setFPropMese}><option value="Tutti">Tutti i mesi</option>{mesiProp.map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}</Sel><Sel value={fPropStato} onChange={setFPropStato}><option value="Tutti">Tutti gli stati</option>{Object.keys(STATI_PROP).map(s=><option key={s}>{s}</option>)}</Sel><Sel value={fPropAg} onChange={setFPropAg}><option value="Tutti">Tutti gli agenti</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</Sel></div>);
  const FiltriVend=()=>(<div style={S.fRow}><Sel value={fVendAnno} onChange={setFVendAnno}><option value="Tutti">Tutti gli anni</option>{anniVend.map(a=><option key={a}>{a}</option>)}</Sel><Sel value={fVendStato} onChange={setFVendStato}><option value="Tutti">Tutti gli stati</option>{Object.keys(STATI_INCASSO).map(s=><option key={s}>{s}</option>)}</Sel><Sel value={fVendAg} onChange={setFVendAg}><option value="Tutti">Tutti gli agenti</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</Sel></div>);

  const BloccoFin=({titolo,colore,emoji,totale,vArr})=>(<div style={{background:"#fff",borderRadius:10,border:"0.5px solid #e8e5e0",overflow:"hidden"}}><div style={{background:colore,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:600,color:"#fff"}}>{emoji} {titolo}</span><span style={{fontSize:20,fontWeight:700,color:"#fff"}}>€ {fmt(totale)}</span></div><div style={{padding:"10px 16px"}}>{[["Quota Agenzia",calcQAgenzia(vArr),colore],["Quota Agenti",calcQAg(vArr),"#2980B9"],["Quota Buyer",calcQBuy(vArr),"#8E44AD"]].map(([l,v,c])=>(<div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid #f5f5f5",fontSize:13}}><span style={{color:"#888"}}>{l}</span><span style={{fontWeight:500,color:c}}>€ {fmt(v)}</span></div>))}</div></div>);

  const currentTabCfg=TAB_CONFIG.find(t=>t.id===tab);

  return(
    <div style={{display:"flex",height:"100vh",background:BRAND.beige,overflow:"hidden",fontFamily:"'Georgia',serif",color:BRAND.grigio}}>
      <Sidebar tab={tab} setTab={setTab} utente={utente} onEsporta={esporta} onImporta={importa} importRef={importRef}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:"#fff",borderBottom:"0.5px solid #e8e5e0",padding:"0.875rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>{currentTabCfg?.icon}</span><h1 style={{fontSize:15,fontWeight:600,margin:0}}>{currentTabCfg?.label}</h1></div>
          <button style={{...S.btn,color:"#c0392b",fontSize:12}} onClick={()=>setUtente(null)}>Esci</button>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>

          {/* DASHBOARD */}
          {tab==="Dashboard"&&(<div style={S.sec}>
            <div style={S.fRow}><Sel value={dashAnno} onChange={setDashAnno}><option value="Tutti">Tutti gli anni</option>{[...new Set([annoCorrente,...anniVend])].sort().reverse().map(a=><option key={a}>{a}</option>)}</Sel></div>
            <div style={S.g4}>
              <div style={S.card(STATI_INC.Attivo.clr)}><p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>Incarichi attivi</p><p style={{fontSize:28,fontWeight:600,margin:0,color:STATI_INC.Attivo.clr}}>{dashInc.filter(i=>statoInc(i)==="Attivo").length}</p></div>
              <div style={S.card(STATI_INC.Scaduto.clr)}><p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>Incarichi scaduti</p><p style={{fontSize:28,fontWeight:600,margin:0,color:STATI_INC.Scaduto.clr}}>{dashInc.filter(i=>statoInc(i)==="Scaduto").length}</p></div>
              <div style={S.card(STATI_INC.Venduto.clr)}><p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>Venduti</p><p style={{fontSize:28,fontWeight:600,margin:0,color:STATI_INC.Venduto.clr}}>{dashVend.length}</p></div>
              <div style={S.card("#4A90D9")}><p style={{fontSize:12,color:"#888",margin:"0 0 4px"}}>Proposte attive</p><p style={{fontSize:28,fontWeight:600,margin:0,color:"#4A90D9"}}>{proposte.filter(p=>p.categoria==="vendita"&&["In attesa","Controproposta","Accettata con Vincolo"].includes(p.stato)).length}</p></div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"1.25rem"}}>
              <BloccoFin titolo="INCASSATO" colore="#27AE60" emoji="✅" totale={dashIncassato} vArr={dashVendInc}/>
              <BloccoFin titolo="DA INCASSARE" colore="#E67E22" emoji="⏳" totale={dashDaIncassare} vArr={dashVendNoInc}/>
            </div>

            {/* SOSPESI — provvigioni certe maturate, da riscuotere */}
            {(()=>{
              const sospesi=dashVend.filter(v=>v.statoIncasso==="Da incassare"||v.statoIncasso==="Parziale");
              const righe=[];
              sospesi.forEach(v=>{
                const residuoV=Number(v.provvVenditore||0)-calcolaIncassatoV(v);
                const residuoA=Number(v.provvAcquirente||0)-calcolaIncassatoA(v);
                if(residuoV>0) righe.push({v,lato:"V",nominativo:v.nominativoVenditore,agente:nomAg(v.agenteListing),giaInc:calcolaIncassatoV(v),residuo:residuoV,scadenza:v.scadenzaIncasso});
                if(residuoA>0) righe.push({v,lato:"A",nominativo:v.nomeAcquirente,agente:nomAg(v.agenteAcquirente),giaInc:calcolaIncassatoA(v),residuo:residuoA,scadenza:v.scadenzaIncasso});
              });
              const totSospesi=righe.reduce((s,r)=>s+r.residuo,0);
              if(righe.length===0) return null;
              return(
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #E67E2244",overflow:"hidden",marginBottom:"1.25rem"}}>
                  <div style={{background:"#FEF0E0",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"0.5px solid #E67E2233"}}>
                    <div>
                      <span style={{fontSize:13,fontWeight:600,color:"#E67E22"}}>🕐 SOSPESI DA INCASSARE — Provvigioni maturate, da riscuotere</span>
                      <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Pratiche concluse con provvigioni ancora da incassare totalmente o parzialmente</p>
                    </div>
                    <span style={{fontSize:18,fontWeight:700,color:"#E67E22",marginLeft:16,whiteSpace:"nowrap"}}>€ {fmt(totSospesi)}</span>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>
                      {["Lato","Agente","Nominativo","Immobile","Già incassato","Residuo","Scadenza"].map(h=><th key={h} style={S.thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>{righe.map((r,i)=>(
                      <tr key={i}>
                        <td style={S.tdS}><span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:r.lato==="V"?"#EAF4FB":"#F5EEF8",color:r.lato==="V"?"#2980B9":"#8E44AD",fontWeight:500}}>{r.lato==="V"?"Venditore":"Acquirente"}</span></td>
                        <td style={S.tdS}>{r.agente}</td>
                        <td style={{...S.tdS,fontWeight:500}}>{r.nominativo}</td>
                        <td style={S.tdS}>{r.v.comuneImmobile} — {r.v.indirizzoImmobile}</td>
                        <td style={{...S.tdRS,color:"#27AE60"}}>{r.giaInc>0?`€ ${fmt(r.giaInc)}`:"—"}</td>
                        <td style={{...S.tdRS,fontWeight:600,color:"#E67E22"}}>€ {fmt(r.residuo)}</td>
                        <td style={{...S.tdS,color:r.scadenza&&new Date(r.scadenza)<new Date()?"#E74C3C":"inherit"}}>{r.scadenza?fmtD(r.scadenza):"—"}</td>
                      </tr>
                    ))}</tbody>
                    <tfoot><tr style={{background:BRAND.beige,fontWeight:500}}>
                      <td colSpan={4} style={S.tdS}>Totale residuo ({righe.length} {righe.length===1?"voce":"voci"})</td>
                      <td style={{...S.tdRS,color:"#27AE60"}}>€ {fmt(righe.reduce((s,r)=>s+r.giaInc,0))}</td>
                      <td style={{...S.tdRS,color:"#E67E22"}}>€ {fmt(totSospesi)}</td>
                      <td style={S.tdS}/>
                    </tr></tfoot>
                  </table>
                </div>
              );
            })()}

            {/* VINCOLATE — proposte con vincolo, previsione */}
            {propVincolo.length>0&&(<div style={{background:"#fff",borderRadius:10,border:"1px solid #D4AC0D55",overflow:"hidden",marginBottom:"1.25rem"}}>
              <div style={{background:"#FEF9E7",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"0.5px solid #D4AC0D44"}}>
                <div>
                  <span style={{fontSize:13,fontWeight:600,color:"#D4AC0D"}}>🔗 VINCOLATE — Proposte accettate con vincolo in attesa di esito</span>
                  <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Provvigioni previste ma non certe: dipendono dall'esito del vincolo (es. mutuo)</p>
                </div>
                <span style={{fontSize:18,fontWeight:700,color:"#D4AC0D",marginLeft:16,whiteSpace:"nowrap"}}>€ {fmt(dashSospeso)}</span>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  {["Venditore","Acquirente","Immobile","Vincolo","Scadenza vincolo","Provv. prevista"].map(h=><th key={h} style={S.thS}>{h}</th>)}
                </tr></thead>
                <tbody>{propVincolo.map(p=>(
                  <tr key={p.id}>
                    <td style={{...S.tdS,fontWeight:500}}>{p.nominativoVenditore}</td>
                    <td style={S.tdS}>{p.nomeAcquirente}</td>
                    <td style={S.tdS}>{p.comuneImmobile} — {p.indirizzoImmobile}</td>
                    <td style={S.tdS}><span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:"#FEF9E7",color:"#A8863A",fontWeight:500,border:"0.5px solid #D4AC0D44"}}>{p.tipoVincolo||"Generico"}</span></td>
                    <td style={{...S.tdS,color:p.termineSubordine&&new Date(p.termineSubordine)<new Date()?"#E74C3C":"inherit"}}>{p.termineSubordine?fmtD(p.termineSubordine):"—"}</td>
                    <td style={{...S.tdRS,fontWeight:600,color:"#D4AC0D"}}>€ {fmt(Number(p.provvVenditore||0)+Number(p.provvAcquirente||0))}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr style={{background:BRAND.beige,fontWeight:500}}>
                  <td colSpan={5} style={S.tdS}>Totale provvigioni vincolate ({propVincolo.length})</td>
                  <td style={{...S.tdRS,color:"#D4AC0D"}}>€ {fmt(dashSospeso)}</td>
                </tr></tfoot>
              </table>
            </div>)}

          </div>)}

          {/* INCARICHI */}
          {tab==="Incarichi"&&(<div style={S.sec}>
            <div style={S.pageHdr}><SubTabs value={subInc} onChange={v=>{setSubInc(v);setFIncStato("Tutti");}} options={[{v:"vendita",l:"🏠 Vendite"},{v:"affitto",l:"🔑 Affitti"}]}/><button style={S.btnP} onClick={()=>{setFormInc(emptyInc(subInc));setShowInc("new");}}>+ Nuovo incarico</button></div>
            <FiltriInc/>
            <div style={S.cnt}>{[["Attivi",cntInc.attivi,STATI_INC.Attivo.clr],["Scaduti",cntInc.scaduti,STATI_INC.Scaduto.clr],[subInc==="affitto"?"Locati":"Venduti",cntInc.venduti,STATI_INC.Venduto.clr]].map(([l,n,c])=>(<div key={l} style={S.cntBox(c)}><span style={{fontSize:24,fontWeight:700,color:c}}>{n}</span><span style={{fontSize:12,color:"#aaa"}}>{l}</span></div>))}</div>
            <div style={S.tblWrap}><table style={S.tbl}>
              <thead><tr>{["Ag. Listing","% L","Buyer L","% BL","Fonte","Nominativo","Comune","Indirizzo","Tipologia","Inizio","Scadenza","Prezzo rich.","Prezzo reale","Diff%","Provv. prev.","Stato","Azioni"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{incFiltrati.map(inc=>{
                const s=statoInc(inc);const cfg=STATI_INC[s]||STATI_INC.Attivo;
                const diff=inc.prezzoRichiesto&&inc.prezzoReale?((inc.prezzoRichiesto-inc.prezzoReale)/inc.prezzoRichiesto*100).toFixed(1):null;
                return(<tr key={inc.id} style={{cursor:"pointer"}} onClick={()=>{setFormInc({...inc,agenteListing:inc.agenteListing||"",buyerListing:inc.buyerListing||""});setShowInc(inc);}}>
                  <td style={S.td}>{nomAg(inc.agenteListing)}</td><td style={S.td}>{inc.percListing}%</td>
                  <td style={S.td}>{inc.buyerListing?nomAg(inc.buyerListing):"—"}</td><td style={S.td}>{inc.buyerListing?`${inc.percBuyerListing}%`:"—"}</td>
                  <td style={S.td}>{inc.fonte}</td><td style={S.td}><strong>{inc.nominativo}</strong></td>
                  <td style={S.td}>{inc.comune}</td><td style={S.td}>{inc.indirizzo}</td><td style={S.td}>{inc.tipologia}</td>
                  <td style={S.td}>{fmtD(inc.dataInizio)}</td>
                  <td style={{...S.td,color:s==="Scaduto"?"#E74C3C":"inherit",fontWeight:s==="Scaduto"?500:400}}>{fmtD(inc.scadenza)}</td>
                  <td style={S.tdR}>€ {fmtN(inc.prezzoRichiesto)}</td><td style={S.tdR}>{inc.prezzoReale?`€ ${fmtN(inc.prezzoReale)}`:"—"}</td>
                  <td style={{...S.tdR,color:diff>10?"#E74C3C":"inherit"}}>{diff?`${diff}%`:"—"}</td>
                  <td style={S.tdR}>€ {fmt(inc.provvPrevista)}</td>
                  <td style={S.td}><span style={bdg(cfg)}>{s}</span></td>
                  <td style={S.td} onClick={e=>e.stopPropagation()}><div style={{display:"flex",gap:4}}>{s!=="Venduto"&&s!=="Locato"&&<button style={S.btnG} onClick={()=>{setFormProp(emptyProp(inc.categoria,inc));setShowProp("new");}}>+ Proposta</button>}<button style={S.btnD} onClick={()=>setIncarichi(incarichi.filter(i=>i.id!==inc.id))}>✕</button></div></td>
                </tr>);
              })}
              {incFiltrati.length===0&&<tr><td colSpan={17} style={{...S.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessun incarico trovato</td></tr>}
              </tbody>
            </table></div>
          </div>)}

          {/* PROPOSTE */}
          {tab==="Proposte"&&(<div style={S.sec}>
            <div style={S.pageHdr}><SubTabs value={subProp} onChange={v=>{setSubProp(v);setFPropStato("Tutti");}} options={[{v:"vendita",l:"🏠 Vendite"},{v:"affitto",l:"🔑 Affitti"}]}/><button style={S.btnP} onClick={()=>{setFormProp(emptyProp(subProp));setShowProp("new");}}>+ Nuova proposta (collab.)</button></div>
            <FiltriProp/>
            <div style={S.cnt}>{[["In attesa",cntProp.attesa,"#4A90D9"],["Con vincolo",cntProp.vincolo,"#D4AC0D"],["Accettate",cntProp.accettate,"#27AE60"],["Non concluse",cntProp.rifiutate,"#E74C3C"]].map(([l,n,c])=>(<div key={l} style={S.cntBox(c)}><span style={{fontSize:24,fontWeight:700,color:c}}>{n}</span><span style={{fontSize:12,color:"#aaa"}}>{l}</span></div>))}</div>
            <div style={S.tblWrap}><table style={S.tbl}>
              <thead><tr>{["Tipo","Data","Comune","Indirizzo","Venditore","Acquirente","Ag. Acq.","% Acq.","Buyer","Prezzo","Vincolo","Provv.V.","Provv.A.","Stato","Azioni"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{propFiltrate.map(p=>{
                const cfg=STATI_PROP[p.stato]||STATI_PROP["In attesa"];
                const puoGestire=!["Rifiutata","Mancata Chiusura","Accettata"].includes(p.stato);
                return(<tr key={p.id}>
                  <td style={S.td}><span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:p.tipo==="da_incarico"?"#EAF4FB":"#FEF0E0",color:p.tipo==="da_incarico"?"#2980B9":"#E67E22"}}>{p.tipo==="da_incarico"?"Incarico":"Collab."}</span></td>
                  <td style={S.td}>{fmtD(p.dataStato)}</td>
                  <td style={S.td}>{p.comuneImmobile}</td>
                  <td style={S.td}>{p.indirizzoImmobile}<br/><span style={{fontSize:11,color:"#aaa"}}>{p.tipologia}</span></td>
                  <td style={S.td}>{p.tipo==="collaborazione"&&p.agenziaEsterna?<><span style={{fontSize:10,color:BRAND.oroD}}>{p.agenziaEsterna}</span><br/></>:null}{p.nominativoVenditore}</td>
                  <td style={S.td}>{p.nomeAcquirente}</td>
                  <td style={S.td}>{nomAg(p.agenteAcquirente)}</td>
                  <td style={S.td}>{p.percAcquirente||0}%</td>
                  <td style={S.td}>{p.buyer?<>{nomAg(p.buyer)}<br/><span style={{fontSize:11,color:"#aaa"}}>{p.percBuyer}%</span></>:"—"}</td>
                  <td style={S.tdR}>€ {fmtN(p.prezzoOfferto)}</td>
                  <td style={S.td}>{p.vincolata?<span style={{fontSize:11,color:BRAND.oroD,fontWeight:500}}>{p.tipoVincolo||"Sì"}</span>:<span style={{color:"#ccc",fontSize:11}}>No</span>}</td>
                  <td style={S.tdR}>€ {fmt(p.provvVenditore||0)}</td>
                  <td style={S.tdR}>€ {fmt(p.provvAcquirente||0)}</td>
                  <td style={S.td}><span style={bdg(cfg)}>{cfg.s} {cfg.label}</span></td>
                  <td style={S.td}>{puoGestire?<button style={S.btnP} onClick={()=>{setFormStatoProp({stato:p.stato,noteStato:"",contropropostaPrezzo:"",esitoVincolo:"",tipoNegazione:""});setShowGestProp(p);}}>Gestisci →</button>:<span style={{fontSize:11,color:"#aaa",fontStyle:"italic"}}>{p.noteStato||p.stato}</span>}</td>
                </tr>);
              })}
              {propFiltrate.length===0&&<tr><td colSpan={15} style={{...S.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessuna proposta trovata</td></tr>}
              </tbody>
            </table></div>
          </div>)}

          {/* VENDUTI */}
          {tab==="Venduti"&&(<div style={S.sec}>
            <div style={{marginBottom:"1rem"}}><SubTabs value={subVend} onChange={v=>{setSubVend(v);setFVendStato("Tutti");}} options={[{v:"vendita",l:"🏠 Vendite"},{v:"affitto",l:"🔑 Locazioni"}]}/></div>
            <FiltriVend/>
            <div style={S.cnt}>{[["Da incassare",cntVend.daIncassare,"#E67E22"],["Parziale",cntVend.parziale,"#D4AC0D"],["Incassato",cntVend.incassato,"#27AE60"]].map(([l,n,c])=>(<div key={l} style={S.cntBox(c)}><span style={{fontSize:24,fontWeight:700,color:c}}>{n}</span><span style={{fontSize:12,color:"#aaa"}}>{l}</span></div>))}</div>
            <div style={S.tblWrap}><table style={S.tbl}>
              <thead><tr>{["Comune","Indirizzo","Venditore","Acquirente","Ag.L","%L","BuyerL","%BL","Ag.A","%A","Buyer","%B","Prezzo","Provv.V.","Provv.A.","Tipo atto","Data atto","Inc.V.","Inc.A.","Scad.","Stato","Azioni"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{vendFiltrati.map(v=>{
                const cfg=STATI_INCASSO[v.statoIncasso]||STATI_INCASSO["Da incassare"];
                return(<tr key={v.id}>
                  <td style={S.td}>{v.comuneImmobile}</td>
                  <td style={S.td}><strong>{v.indirizzoImmobile}</strong><br/><span style={{fontSize:11,color:"#aaa"}}>{v.tipologia}</span></td>
                  <td style={S.td}>{v.nominativoVenditore}</td><td style={S.td}>{v.nomeAcquirente}</td>
                  <td style={S.td}>{v.agenteListing?nomAg(v.agenteListing):<span style={{fontSize:11,color:BRAND.oroD}}>{v.agenziaEsterna||"Est."}</span>}</td>
                  <td style={S.td}>{v.percListing}%</td>
                  <td style={S.td}>{v.buyerListing?nomAg(v.buyerListing):"—"}</td><td style={S.td}>{v.buyerListing?`${v.percBuyerListing}%`:"—"}</td>
                  <td style={S.td}>{nomAg(v.agenteAcquirente)}</td><td style={S.td}>{v.percAcquirente}%</td>
                  <td style={S.td}>{v.buyer?nomAg(v.buyer):"—"}</td><td style={S.td}>{v.buyer?`${v.percBuyer}%`:"—"}</td>
                  <td style={S.tdR}>€ {fmtN(v.prezzoVendita)}</td>
                  <td style={S.tdR}>€ {fmt(v.provvVenditore)}</td><td style={S.tdR}>€ {fmt(v.provvAcquirente)}</td>
                  <td style={S.td}>{v.tipoAtto||"—"}</td><td style={S.td}>{v.dataAtto?fmtD(v.dataAtto):"—"}</td>
                  <td style={S.tdR}>{calcolaIncassatoV(v)>0?`€ ${fmt(calcolaIncassatoV(v))}`:"—"}</td>
                  <td style={S.tdR}>{calcolaIncassatoA(v)>0?`€ ${fmt(calcolaIncassatoA(v))}`:"—"}</td>
                  <td style={S.td}>{v.scadenzaIncasso?fmtD(v.scadenzaIncasso):"—"}</td>
                  <td style={S.td}><span style={bdg(cfg)}>{v.statoIncasso}</span></td>
                  <td style={S.td}><div style={{display:"flex",gap:4}}>
                    <button style={{...S.btnP,fontSize:12,padding:"4px 8px",background:"#2980B9",borderColor:"#2980B9"}} onClick={()=>setShowIncassoLato({vend:v,lato:"V"})}>V</button>
                    <button style={{...S.btnP,fontSize:12,padding:"4px 8px",background:"#8E44AD",borderColor:"#8E44AD"}} onClick={()=>setShowIncassoLato({vend:v,lato:"A"})}>A</button>
                    <button style={S.btnP} onClick={()=>{setFormVend({...v});setShowGestVend(v);}}>✏️</button>
                  </div></td>
                </tr>);
              })}
              {vendFiltrati.length===0&&<tr><td colSpan={22} style={{...S.td,textAlign:"center",color:"#bbb",padding:"2rem"}}>Nessun venduto trovato</td></tr>}
              </tbody>
              {vendFiltrati.length>0&&<tfoot><tr style={S.totRow}>
                <td colSpan={12} style={S.td}>Totale ({vendFiltrati.length})</td><td style={S.td}/>
                <td style={S.tdR}>€ {fmt(vendFiltrati.reduce((s,v)=>s+Number(v.provvVenditore||0),0))}</td>
                <td style={S.tdR}>€ {fmt(vendFiltrati.reduce((s,v)=>s+Number(v.provvAcquirente||0),0))}</td>
                <td style={S.td}/><td style={S.td}/>
                <td style={S.tdR}>€ {fmt(vendFiltrati.reduce((s,v)=>s+calcolaIncassatoV(v),0))}</td>
                <td style={S.tdR}>€ {fmt(vendFiltrati.reduce((s,v)=>s+calcolaIncassatoA(v),0))}</td>
                <td colSpan={3} style={S.td}/>
              </tr></tfoot>}
            </table></div>
          </div>)}

          {/* REPORT AGENTI */}
          {tab==="Report Agenti"&&(<div style={S.sec}>
            <div style={S.fRow}>
              <Sel value={reportAnno} onChange={v=>{setReportAnno(v);setReportMese("Tutti");}}><option value="Tutti">Tutti gli anni</option>{anniVend.map(a=><option key={a}>{a}</option>)}</Sel>
              <Sel value={reportMese} onChange={setReportMese}><option value="Tutti">Tutti i mesi</option>{mesiReport.map(m=><option key={m} value={m}>{fmtMese(m)}</option>)}</Sel>
              <span style={{fontSize:12,color:"#aaa",marginLeft:4}}>👆 Clicca su un agente per il dettaglio</span>
            </div>
            <div style={S.tblWrap}><table style={{...S.tbl,minWidth:400}}>
              <thead><tr>{["Agente","Profilo","Pratiche","Provv. Agenzia","Incassato","Quota Agente","Quota Buyer"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{agenti.map(ag=>{
                const vAg=vendReport.filter(v=>v.agenteListing===ag.id||v.agenteAcquirente===ag.id||v.buyerListing===ag.id||v.buyer===ag.id);
                const genTot=vAg.reduce((s,v)=>s+Number(v.provvVenditore||0)+Number(v.provvAcquirente||0),0);
                const incTot=vAg.reduce((s,v)=>s+calcolaIncassatoV(v)+calcolaIncassatoA(v),0);
                const quotaAg=vAg.reduce((s,v)=>s+calcolaQuotaAgente(v,ag.id),0);
                const quotaBuy=vAg.reduce((s,v)=>{let q=0;if(v.buyerListing===ag.id&&v.agenteListing!==ag.id)q+=Number(v.provvVenditore||0)*Number(v.percBuyerListing||0)/100;if(v.buyer===ag.id&&v.agenteAcquirente!==ag.id)q+=Number(v.provvAcquirente||0)*Number(v.percBuyer||0)/100;return s+q;},0);
                return(<tr key={ag.id} style={{cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#fafaf8"}
                  onMouseLeave={e=>e.currentTarget.style.background=""}
                  onClick={()=>setSchedaAgente(ag)}>
                  <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${BRAND.oro},#A8863A)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{ag.nome.charAt(0)}</div><strong>{ag.nome} {ag.cognome}</strong></div></td>
                  <td style={S.td}><span style={{fontSize:11,padding:"2px 7px",borderRadius:4,background:ag.profilo==="Broker"?`${BRAND.oro}22`:"#EAF4FB",color:ag.profilo==="Broker"?BRAND.oroD:"#2980B9",fontWeight:500}}>{ag.profilo}</span></td>
                  <td style={S.td}>{vAg.length}</td>
                  <td style={S.tdR}>€ {fmt(genTot)}</td>
                  <td style={S.tdR}>€ {fmt(incTot)}</td>
                  <td style={{...S.tdR,color:"#8E44AD",fontWeight:500}}>{ag.profilo==="Broker"?"—":`€ ${fmt(quotaAg)}`}</td>
                  <td style={{...S.tdR,color:"#2980B9",fontWeight:500}}>{quotaBuy>0?`€ ${fmt(quotaBuy)}`:"—"}</td>
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
              <div style={{flex:1}}/>{fatturaDati.length>0&&<button style={S.btnP} onClick={()=>window.print()}>🖨 Stampa</button>}
            </div>
            {!fatAgente&&<div style={{textAlign:"center",padding:"3rem",color:"#bbb"}}>Seleziona un agente per visualizzare la nota provvigioni</div>}
            {fatAgente&&fatturaDati.length===0&&<div style={{textAlign:"center",padding:"3rem",color:"#bbb"}}>Nessuna pratica incassata nel periodo</div>}
            {fatAgente&&fatturaDati.length>0&&(<div style={{background:"#fff",border:`1px solid ${BRAND.oro}`,borderRadius:10,padding:"1.5rem"}}>
              <div style={{borderBottom:`2px solid ${BRAND.oro}`,paddingBottom:"1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div><div style={{fontSize:24,fontWeight:700,color:BRAND.grigio,fontFamily:"Georgia,serif"}}>c<span style={{color:BRAND.oro}}>à</span>sa</div><div style={{fontSize:8,letterSpacing:"0.25em",color:BRAND.grigio,borderTop:`1px solid ${BRAND.grigio}`,paddingTop:2,marginTop:1}}>IMMOBILIARE</div></div>
                <div style={{textAlign:"right"}}><p style={{fontSize:12,color:"#aaa",margin:"0 0 2px"}}>Nota provvigioni</p><p style={{fontSize:16,fontWeight:500,margin:"0 0 2px"}}>{fatAg?.nome} {fatAg?.cognome}</p><p style={{fontSize:12,color:"#aaa",margin:0}}>{fatMese!=="Tutti"?fmtMese(fatMese):fatAnno!=="Tutti"?`Anno ${fatAnno}`:"Tutto il periodo"} — {new Date().toLocaleDateString("it-IT")}</p></div>
              </div>
              <div style={{display:"flex",gap:10,marginBottom:"1.25rem"}}>
                <div style={{flex:1,background:"#E9F7EF",borderRadius:8,padding:"10px 14px",border:"1px solid #27AE6033"}}><p style={{fontSize:11,color:"#27AE60",margin:"0 0 3px",fontWeight:500}}>TOTALE IMPONIBILE</p><p style={{fontSize:20,fontWeight:700,color:"#27AE60",margin:0}}>€ {fmt(totImponibile)}</p></div>
                <div style={{flex:1,background:"#EAF4FB",borderRadius:8,padding:"10px 14px",border:"1px solid #2980B933"}}><p style={{fontSize:11,color:"#2980B9",margin:"0 0 3px",fontWeight:500}}>PAGATO</p><p style={{fontSize:20,fontWeight:700,color:"#2980B9",margin:0}}>€ {fmt(totPagato)}</p></div>
                <div style={{flex:1,background:"#FEF0E0",borderRadius:8,padding:"10px 14px",border:"1px solid #E67E2233"}}><p style={{fontSize:11,color:"#E67E22",margin:"0 0 3px",fontWeight:500}}>DA PAGARE</p><p style={{fontSize:20,fontWeight:700,color:"#E67E22",margin:0}}>€ {fmt(totImponibile-totPagato)}</p></div>
              </div>
              {fatturaDati.map(({v,righe,totPratica,key,pag},i)=>{
                const cfgPag=STATI_FATTURA[pag.stato]||STATI_FATTURA["Da pagare"];
                return(<div key={v.id} style={{border:"0.5px solid #eee",borderRadius:8,padding:"1rem",marginBottom:"0.75rem",background:BRAND.beige}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div><p style={{fontSize:14,fontWeight:500,margin:"0 0 2px"}}>{i+1}. {v.comuneImmobile} — {v.indirizzoImmobile} <span style={{fontSize:12,color:"#aaa",fontWeight:400}}>({v.tipologia})</span></p><p style={{fontSize:12,color:"#aaa",margin:0}}>Prezzo: <strong style={{color:BRAND.oroD}}>€ {fmtN(v.prezzoVendita)}</strong> | Atto: {fmtD(v.dataAtto)}</p></div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}><span style={bdg(cfgPag)}>{pag.stato}</span><button style={{...S.btnP,fontSize:12,padding:"4px 10px"}} onClick={()=>{setShowPagamento({key,pratica:`${v.comuneImmobile} — ${v.indirizzoImmobile}`,totPratica});setFormPagamento({...pag});}}>✏️ Pagamento</button></div>
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
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}><button style={S.btnP} onClick={()=>{setFormAgente({nome:"",cognome:"",profilo:"Consulente",tipo:"Interno",percListing:0,percAcquirente:0});setShowAgente("new");}}>+ Nuovo agente</button></div>
            <div style={S.tblWrap}><table style={{...S.tbl,minWidth:400}}>
              <thead><tr>{["Nome","Cognome","Profilo","Tipo","% Listing","% Acquirente","Azioni"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{agenti.map(a=>(<tr key={a.id} style={{cursor:"pointer"}} onClick={()=>{setFormAgente({...a});setShowAgente(a);}}>
                <td style={S.td}><strong>{a.nome}</strong></td><td style={S.td}>{a.cognome}</td>
                <td style={S.td}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,fontWeight:500,background:a.profilo==="Broker"?`${BRAND.oro}22`:a.profilo==="Consulente"?"#EAF4FB":"#F0F0F0",color:a.profilo==="Broker"?BRAND.oroD:a.profilo==="Consulente"?"#2980B9":"#666"}}>{a.profilo}</span></td>
                <td style={S.td}>{a.tipo||"Interno"}</td>
                <td style={S.td}>{a.profilo==="Broker"?"—":`${a.percListing}%`}</td>
                <td style={S.td}>{a.profilo==="Broker"?"—":`${a.percAcquirente}%`}</td>
                <td style={S.td} onClick={e=>e.stopPropagation()}><div style={{display:"flex",gap:4}}>
                  <button style={{...S.btnP,fontSize:12,padding:"4px 8px"}} onClick={()=>{setFormAgente({...a});setShowAgente(a);}}>✏️ Modifica</button>
                  {a.profilo!=="Broker"&&<button style={S.btnD} onClick={()=>{if(window.confirm(`Eliminare ${a.nome} ${a.cognome}?`))setAgenti(agenti.filter(x=>x.id!==a.id));}}>✕</button>}
                </div></td>
              </tr>))}</tbody>
            </table></div>
          </div>)}

          {/* IMPOSTAZIONI */}
          {tab==="Impostazioni"&&(<div style={S.sec}>
            <SettSec title="Fonti incarico" items={fonti} setItems={setFonti} val={nF} setVal={setNF} ph="Nuova fonte..."/>
            <div style={S.divider}/>
            <SettSec title="Tipologie immobile" items={tipologie} setItems={setTipologie} val={nT} setVal={setNT} ph="Nuova tipologia..."/>
            <div style={S.divider}/>
            <SettSec title="Tipi di vincolo" items={vincoli} setItems={setVincoli} val={nV} setVal={setNV} ph="Nuovo vincolo..."/>
            <div style={S.divider}/>
            <SettSec title="Tipi diniego vincolo" items={tipiNeg} setItems={setTipiNeg} val={nN} setVal={setNN} ph="Nuovo tipo diniego..."/>
            <div style={S.divider}/>
            <h3 style={{fontSize:14,fontWeight:500,margin:"0 0 8px"}}>Backup dati</h3>
            <div style={{display:"flex",gap:8}}><button style={S.btnP} onClick={esporta}>⬇ Esporta JSON</button><button style={S.btn} onClick={()=>importRef.current.click()}>⬆ Importa JSON</button></div>
          </div>)}

        </div>
      </div>

      {schedaAgente&&<SchedaAgente agente={schedaAgente} venduti={vendReport} onClose={()=>setSchedaAgente(null)}/>}

      {/* MODAL INCARICO */}
      {showInc&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowInc(null)}>
        <div style={S.modal}>
          <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 1rem"}}>{showInc==="new"?"Nuovo":"Modifica"} incarico — {formInc.categoria==="affitto"?"🔑 Affitto":"🏠 Vendita"}</h2>
          <div style={S.g2}>
            <div><label style={S.lbl}>Agente Listing</label><select style={S.inp} value={formInc.agenteListing||""} onChange={e=>setFormInc({...formInc,agenteListing:e.target.value})}><option value="">Seleziona</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
            <div><label style={S.lbl}>% Provv. Listing</label><input style={S.inp} type="number" step="0.1" value={formInc.percListing||0} onChange={e=>setFormInc({...formInc,percListing:e.target.value})}/></div>
            <div><label style={S.lbl}>Buyer Listing (opz.)</label><select style={S.inp} value={formInc.buyerListing||""} onChange={e=>setFormInc({...formInc,buyerListing:e.target.value})}><option value="">Nessuno</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
            <div><label style={S.lbl}>% Buyer Listing</label><input style={S.inp} type="number" step="0.1" value={formInc.percBuyerListing||0} onChange={e=>setFormInc({...formInc,percBuyerListing:e.target.value})}/></div>
            <div><label style={S.lbl}>Fonte</label><select style={S.inp} value={formInc.fonte||""} onChange={e=>setFormInc({...formInc,fonte:e.target.value})}><option value="">Seleziona</option>{fonti.map(f=><option key={f}>{f}</option>)}</select></div>
            <div><label style={S.lbl}>Nominativo venditore</label><input style={S.inp} value={formInc.nominativo||""} onChange={e=>setFormInc({...formInc,nominativo:e.target.value})}/></div>
            <div><label style={S.lbl}>Comune</label><input style={S.inp} value={formInc.comune||""} onChange={e=>setFormInc({...formInc,comune:e.target.value})}/></div>
            <div><label style={S.lbl}>Indirizzo</label><input style={S.inp} value={formInc.indirizzo||""} onChange={e=>setFormInc({...formInc,indirizzo:e.target.value})}/></div>
            <div><label style={S.lbl}>Tipologia</label><select style={S.inp} value={formInc.tipologia||""} onChange={e=>setFormInc({...formInc,tipologia:e.target.value})}><option value="">Seleziona</option>{tipologie.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={S.lbl}>Data inizio</label><input style={S.inp} type="date" value={formInc.dataInizio||""} onChange={e=>setFormInc({...formInc,dataInizio:e.target.value})}/></div>
            <div><label style={S.lbl}>Scadenza</label><input style={S.inp} type="date" value={formInc.scadenza||""} onChange={e=>setFormInc({...formInc,scadenza:e.target.value})}/></div>
            <div><label style={S.lbl}>{formInc.categoria==="affitto"?"Canone mensile (€)":"Prezzo richiesto (€)"}</label><input style={S.inp} type="number" value={formInc.prezzoRichiesto||""} onChange={e=>setFormInc({...formInc,prezzoRichiesto:e.target.value})}/></div>
            <div><label style={S.lbl}>{formInc.categoria==="affitto"?"Canone reale (€)":"Prezzo reale stimato (€)"}</label><input style={S.inp} type="number" value={formInc.prezzoReale||""} onChange={e=>setFormInc({...formInc,prezzoReale:e.target.value})}/></div>
            <div><label style={S.lbl}>Provvigione prevista (€)</label><input style={S.inp} type="number" value={formInc.provvPrevista||""} onChange={e=>setFormInc({...formInc,provvPrevista:e.target.value})}/></div>
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
          <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 4px"}}>Nuova proposta</h2>
          <p style={{fontSize:13,color:BRAND.oroD,margin:"0 0 1rem"}}>{formProp.tipo==="da_incarico"?"📋 Da incarico":"🤝 Collaborazione"}</p>
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
            <div><label style={S.lbl}>Nome acquirente</label><input style={S.inp} value={formProp.nomeAcquirente||""} onChange={e=>setFormProp({...formProp,nomeAcquirente:e.target.value})}/></div>
            <div><label style={S.lbl}>Agente acquirente</label><select style={S.inp} value={formProp.agenteAcquirente||""} onChange={e=>setFormProp({...formProp,agenteAcquirente:e.target.value})}><option value="">Seleziona</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
            <div><label style={S.lbl}>% Provv. Acquirente</label><input style={S.inp} type="number" step="0.1" value={formProp.percAcquirente||""} onChange={e=>setFormProp({...formProp,percAcquirente:e.target.value})}/></div>
            <div><label style={S.lbl}>Buyer</label><select style={S.inp} value={formProp.buyer||""} onChange={e=>setFormProp({...formProp,buyer:e.target.value})}><option value="">Nessuno</option>{agenti.map(a=><option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}</select></div>
            <div><label style={S.lbl}>% Buyer</label><input style={S.inp} type="number" step="0.1" value={formProp.percBuyer||0} onChange={e=>setFormProp({...formProp,percBuyer:e.target.value})}/></div>
            <div><label style={S.lbl}>Prezzo offerto (€)</label><input style={S.inp} type="number" value={formProp.prezzoOfferto||""} onChange={e=>setFormProp({...formProp,prezzoOfferto:e.target.value})}/></div>
            <div><label style={S.lbl}>Provv. venditore (€)</label><input style={S.inp} type="number" value={formProp.provvVenditore||""} onChange={e=>setFormProp({...formProp,provvVenditore:e.target.value})}/></div>
            <div><label style={S.lbl}>Provv. acquirente (€)</label><input style={S.inp} type="number" value={formProp.provvAcquirente||""} onChange={e=>setFormProp({...formProp,provvAcquirente:e.target.value})}/></div>
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
          <div style={{marginBottom:12}}>
            <label style={S.lbl}>Risposta del venditore</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["Accettata","Controproposta","Rifiutata","Mancata Chiusura",...(showGestProp.vincolata?["Accettata con Vincolo"]:[])].map(s=>{const cfg=STATI_PROP[s];const sel=formStatoProp.stato===s;return(<button key={s} onClick={()=>setFormStatoProp({...formStatoProp,stato:s})} style={{...S.btn,border:`1.5px solid ${sel?cfg?.clr:"#ddd"}`,background:sel?cfg?.bg:"#fff",color:sel?cfg?.clr:BRAND.grigio,fontWeight:sel?500:400}}>{cfg?.s} {s}</button>);})}
            </div>
          </div>
          {formStatoProp.stato==="Controproposta"&&(<div style={S.g2}><div><label style={S.lbl}>Nuovo prezzo (€)</label><input style={S.inp} type="number" value={formStatoProp.contropropostaPrezzo||""} onChange={e=>setFormStatoProp({...formStatoProp,contropropostaPrezzo:e.target.value})}/></div><div><label style={S.lbl}>Note</label><input style={S.inp} value={formStatoProp.noteStato||""} onChange={e=>setFormStatoProp({...formStatoProp,noteStato:e.target.value})}/></div></div>)}
          {["Rifiutata","Mancata Chiusura"].includes(formStatoProp.stato)&&(<div><label style={S.lbl}>Motivo</label><textarea style={{...S.inp,resize:"vertical",minHeight:64}} value={formStatoProp.noteStato||""} onChange={e=>setFormStatoProp({...formStatoProp,noteStato:e.target.value})}/></div>)}
          {formStatoProp.stato==="Accettata con Vincolo"&&(<div style={S.warnBox}>
            <p style={{fontSize:13,fontWeight:500,margin:"0 0 8px",color:"#D4AC0D"}}>Gestione vincolo</p>
            <div style={S.g2}>
              <div><label style={S.lbl}>Esito vincolo</label><select style={S.inp} value={formStatoProp.esitoVincolo||""} onChange={e=>setFormStatoProp({...formStatoProp,esitoVincolo:e.target.value})}><option value="">In attesa</option><option value="Positivo">✅ Positivo → va in Venduti</option><option value="Negativo">❌ Negativo</option></select></div>
              {formStatoProp.esitoVincolo==="Negativo"&&<div><label style={S.lbl}>Tipo diniego</label><select style={S.inp} value={formStatoProp.tipoNegazione||""} onChange={e=>setFormStatoProp({...formStatoProp,tipoNegazione:e.target.value})}><option value="">Seleziona</option>{tipiNeg.map(t=><option key={t}>{t}</option>)}</select></div>}
            </div>
          </div>)}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem"}}><button style={S.btn} onClick={()=>setShowGestProp(null)}>Annulla</button><button style={S.btnP} onClick={salvaStatoProp}>Conferma</button></div>
        </div>
      </div>)}

      {/* MODAL GESTIONE VENDUTO */}
      {showGestVend&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowGestVend(null)}>
        <div style={S.modal}>
          <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 4px"}}>Modifica pratica</h2>
          <p style={{fontSize:13,color:"#aaa",margin:"0 0 1rem"}}>{showGestVend.comuneImmobile} — {showGestVend.indirizzoImmobile} | V: {showGestVend.nominativoVenditore} | A: {showGestVend.nomeAcquirente}</p>
          <div style={S.hl}><p style={{fontSize:13,fontWeight:500,margin:"0 0 8px"}}>Provvigioni</p><div style={S.g2}><div><label style={S.lbl}>Provv. venditore (€)</label><input style={S.inp} type="number" value={formVend.provvVenditore||0} onChange={e=>setFormVend({...formVend,provvVenditore:Number(e.target.value)})}/></div><div><label style={S.lbl}>Provv. acquirente (€)</label><input style={S.inp} type="number" value={formVend.provvAcquirente||0} onChange={e=>setFormVend({...formVend,provvAcquirente:Number(e.target.value)})}/></div></div></div>
          <div style={S.g2}><div><label style={S.lbl}>Tipo atto</label><select style={S.inp} value={formVend.tipoAtto||"Preliminare"} onChange={e=>setFormVend({...formVend,tipoAtto:e.target.value})}><option>Preliminare</option><option>Rogito Diretto</option><option>Rogito</option></select></div><div><label style={S.lbl}>Data atto</label><input style={S.inp} type="date" value={formVend.dataAtto||""} onChange={e=>setFormVend({...formVend,dataAtto:e.target.value})}/></div></div>
          <div style={{marginBottom:"1rem"}}><label style={S.lbl}>Scadenza incasso</label><input style={{...S.inp,maxWidth:200}} type="date" value={formVend.scadenzaIncasso||""} onChange={e=>setFormVend({...formVend,scadenzaIncasso:e.target.value})}/></div>
          <p style={{fontSize:12,color:"#aaa",fontStyle:"italic",margin:"0 0 1rem"}}>💡 Per acconti e saldo usa i pulsanti V / A nella tabella Venduti</p>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button style={S.btn} onClick={()=>setShowGestVend(null)}>Annulla</button><button style={S.btnP} onClick={salvaVend}>Salva</button></div>
        </div>
      </div>)}

      {showIncassoLato&&(<ModalIncassoLato vend={showIncassoLato.vend} lato={showIncassoLato.lato} onSave={upd=>{setVenduti(venduti.map(v=>v.id===upd.id?upd:v));setShowIncassoLato(null);}} onClose={()=>setShowIncassoLato(null)}/>)}

      {/* MODAL AGENTE */}
      {showAgente&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowAgente(null)}>
        <div style={{...S.modal,width:"min(96vw,480px)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}><h2 style={{fontSize:17,fontWeight:500,margin:0}}>{showAgente==="new"?"Nuovo agente":"Modifica agente"}</h2><button onClick={()=>setShowAgente(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#ccc",padding:0}}>✕</button></div>
          <div style={S.g2}><div><label style={S.lbl}>Nome</label><input style={S.inp} value={formAgente.nome||""} onChange={e=>setFormAgente({...formAgente,nome:e.target.value})}/></div><div><label style={S.lbl}>Cognome</label><input style={S.inp} value={formAgente.cognome||""} onChange={e=>setFormAgente({...formAgente,cognome:e.target.value})}/></div></div>
          <div style={S.g2}><div><label style={S.lbl}>Profilo</label><select style={S.inp} value={formAgente.profilo||"Consulente"} onChange={e=>setFormAgente({...formAgente,profilo:e.target.value,percListing:e.target.value==="Broker"?0:formAgente.percListing,percAcquirente:e.target.value==="Broker"?0:formAgente.percAcquirente})}><option>Broker</option><option>Consulente</option><option>Collaboratore</option></select></div><div><label style={S.lbl}>Tipo</label><select style={S.inp} value={formAgente.tipo||"Interno"} onChange={e=>setFormAgente({...formAgente,tipo:e.target.value})}><option>Interno</option><option>Esterno</option></select></div></div>
          {formAgente.profilo!=="Broker"&&(<div style={S.g2}><div><label style={S.lbl}>% Provv. Listing</label><input style={S.inp} type="number" min="0" max="100" step="0.5" value={formAgente.percListing||0} onChange={e=>setFormAgente({...formAgente,percListing:Number(e.target.value)})}/></div><div><label style={S.lbl}>% Provv. Acquirente</label><input style={S.inp} type="number" min="0" max="100" step="0.5" value={formAgente.percAcquirente||0} onChange={e=>setFormAgente({...formAgente,percAcquirente:Number(e.target.value)})}/></div></div>)}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1.25rem"}}><button style={S.btn} onClick={()=>setShowAgente(null)}>Annulla</button><button style={S.btnP} onClick={()=>{if(!formAgente.nome||!formAgente.cognome)return;if(showAgente==="new")setAgenti([...agenti,{...formAgente,id:Date.now()}]);else setAgenti(agenti.map(a=>a.id===showAgente.id?{...formAgente,id:a.id}:a));setShowAgente(null);}}>Salva</button></div>
        </div>
      </div>)}

      {/* MODAL PAGAMENTO FATTURA */}
      {showPagamento&&(<div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowPagamento(null)}>
        <div style={{...S.modal,width:"min(96vw,460px)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}><h2 style={{fontSize:16,fontWeight:500,margin:0}}>Gestione pagamento</h2><button onClick={()=>setShowPagamento(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#ccc",padding:0}}>✕</button></div>
          <p style={{fontSize:12,color:"#aaa",margin:"0 0 1rem"}}>{showPagamento.pratica}</p>
          <div style={{background:`${BRAND.oro}18`,border:`1px solid ${BRAND.oro}44`,borderRadius:8,padding:"10px 14px",marginBottom:"1rem"}}><span style={{fontSize:13}}>Importo da fatturare: <strong style={{color:BRAND.oroD}}>€ {fmt(showPagamento.totPratica)}</strong></span></div>
          <div style={{marginBottom:10}}>
            <label style={S.lbl}>Stato pagamento</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{Object.entries(STATI_FATTURA).map(([stato,cfg])=>{const sel=formPagamento.stato===stato;return(<button key={stato} onClick={()=>setFormPagamento({...formPagamento,stato})} style={{...S.btn,border:`1.5px solid ${sel?cfg.clr:"#ddd"}`,background:sel?cfg.bg:"#fff",color:sel?cfg.clr:BRAND.grigio,fontWeight:sel?500:400,fontSize:12}}>{stato}</button>);})}</div>
          </div>
          <div style={S.g2}><div><label style={S.lbl}>Importo pagato (€)</label><input style={S.inp} type="number" value={formPagamento.importoPagato||""} onChange={e=>setFormPagamento({...formPagamento,importoPagato:e.target.value})} placeholder="0"/></div><div><label style={S.lbl}>Data pagamento</label><input style={S.inp} type="date" value={formPagamento.dataPagamento||""} onChange={e=>setFormPagamento({...formPagamento,dataPagamento:e.target.value})}/></div></div>
          <div><label style={S.lbl}>Note</label><input style={S.inp} value={formPagamento.note||""} onChange={e=>setFormPagamento({...formPagamento,note:e.target.value})} placeholder="es. Bonifico ricevuto"/></div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1rem"}}><button style={S.btn} onClick={()=>setShowPagamento(null)}>Annulla</button><button style={S.btnP} onClick={salvaPagamento}>Salva</button></div>
        </div>
      </div>)}

    </div>
  );
}
