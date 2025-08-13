import React, { useMemo, useRef, useState } from 'react'

function fmtSec(s){const m=Math.floor(s/60),r=s%60;return `${m}:${String(r).padStart(2,'0')}`}

export default function App(){
  const [tab,setTab]=useState('plan')
  const [data,setData]=useState(()=>{
    try{const v=localStorage.getItem('wb_data');return v?JSON.parse(v):{plans:[],history:[]}}catch{return {plans:[],history:[]}}})
  const [activePlan,setActivePlan]=useState(()=>localStorage.getItem('wb_activePlan')||null)
  const fileRef=useRef(null)
  const [isRunning,setIsRunning]=useState(false)
  const [elapsed,setElapsed]=useState(0)
  const [rest,setRest]=useState(0)
  React.useEffect(()=>{localStorage.setItem('wb_data',JSON.stringify(data))},[data])
  React.useEffect(()=>{localStorage.setItem('wb_activePlan',activePlan||'')},[activePlan])
  React.useEffect(()=>{if(!isRunning) return; const t0=Date.now()-elapsed*1000; const id=setInterval(()=>setElapsed(Math.floor((Date.now()-t0)/1000)),250); return ()=>clearInterval(id)},[isRunning])

  const plan = useMemo(()=> data.plans?.find(p=>p.id===activePlan) || data.plans?.[0] || null,[data,activePlan])

  function importJSON(file){
    const fr = new FileReader()
    fr.onload = () => {
      try{
        const j = JSON.parse(fr.result)
        // Support both our exported structure and the dedicated plan file
        if(j.weekly_schedule){
          const p = {
            id: 'plan-1',
            name: j.weekly_schedule[0]?.title || 'Plan hebdo',
            notes: 'Importé',
            items: []
          }
          setData({ ...data, plans:[p], schedule:j.weekly_schedule, tracking:j.tracking, user:j.user })
          setActivePlan(p.id)
        } else {
          setData(j)
          setActivePlan(j.plans?.[0]?.id || null)
        }
      }catch(e){ alert('Fichier invalide'); }
    }
    fr.readAsText(file)
  }

  function exportJSON(){
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='workoutbuddy_backup.json'; a.click()
  }

  const today = useMemo(()=>{
    if(!data.schedule) return []
    return data.schedule
  },[data])

  return (
    <div className="container">
      <div className="header">
        <div className="title">WorkoutBuddy — Coach d’entraînement</div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn" onClick={exportJSON}>Exporter</button>
          <label className="btn"><input ref={fileRef} type="file" accept=".json" style={{display:'none'}} onChange={(e)=>e.target.files?.[0]&&importJSON(e.target.files[0])}/>Importer</label>
        </div>
      </div>

      <div className="tabs">
        <button className={'tab '+(tab==='plan'?'active':'')} onClick={()=>setTab('plan')}>Plan</button>
        <button className={'tab '+(tab==='session'?'active':'')} onClick={()=>setTab('session')}>Session</button>
        <button className={'tab '+(tab==='stats'?'active':'')} onClick={()=>setTab('stats')}>Stats</button>
      </div>

      {tab==='plan' && (
        <div className="grid">
          <div className="card">
            <div style={{fontWeight:700,marginBottom:8}}>Mes plans</div>
            {data.schedule? (
              <div className="list">
                {today.map((d,i)=>(
                  <button key={i} className="btn" style={{marginBottom:8}}>
                    <span>{d.day} — {d.title}</span><span>›</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <p className="muted">Importe d’abord ton plan JSON pour afficher ton programme.</p>
              </>
            )}
            <div>
              <div className="label">Notes</div>
              <textarea className="textarea" placeholder="Notes générales…"></textarea>
            </div>
          </div>

          <div className="card">
            <div style={{fontWeight:700,marginBottom:8}}>Construction du plan</div>
            {!data.schedule && <p className="muted">Après import, tes exercices s’affichent ici par jour.</p>}
            {data.schedule && (
              <div>
                {data.schedule.map((d,i)=>(
                  <div key={i} style={{borderTop:'1px solid #e5e7eb',paddingTop:12,marginTop:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                      <div><strong>{d.day} · {d.title}</strong></div>
                      <div className="muted">{(d.tags||[]).map(t=>(<span className="pill" key={t}>{t}</span>))}</div>
                    </div>
                    {(d.exercises||[]).map((ex,idx)=>(
                      <div key={idx} className="series">
                        <div>
                          <div><strong>{ex.name || (ex.a?.name+' / '+ex.b?.name)}</strong></div>
                          <small>{ex.reps?`Reps: ${ex.reps}`:''} {ex.rest_sec?`· Repos: ${ex.rest_sec}s`:''} {ex.tempo?`· Tempo: ${ex.tempo}`:''}</small><br/>
                          {ex.start_weight_kg? <small>Charge de départ: {ex.start_weight_kg} kg</small>: null}
                        </div>
                        <div className="right">
                          <div>
                            <div className="label">Rép.</div>
                            <input className="input" type="number" defaultValue={ex.reps && typeof ex.reps==='string' ? parseInt(ex.reps): 0} />
                          </div>
                          <div>
                            <div className="label">Poids</div>
                            <input className="input" type="number" defaultValue={ex.start_weight_kg||0}/>
                          </div>
                          <div>
                            <div className="label">Repos</div>
                            <input className="input" type="number" defaultValue={parseInt(ex.rest_sec||60)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='session' && (
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div><strong>Session en cours</strong></div>
            <div className="timer">{fmtSec(elapsed)}</div>
          </div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <button className="btn primary" onClick={()=>setIsRunning(true)}>Démarrer</button>
            <button className="btn" onClick={()=>setIsRunning(false)}>Pause</button>
            <button className="btn" onClick={()=>{setIsRunning(false); alert('Séance enregistrée');}}>Terminer & enregistrer</button>
            <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
              <span className="muted">Repos: {fmtSec(rest)}</span>
              <button className="btn" onClick={()=>setRest(60)}>+60s</button>
            </div>
          </div>
          {!data.schedule && <p className="muted">Importe d’abord ton plan JSON.</p>}
          {data.schedule && data.schedule[0]?.exercises?.slice(0,8).map((ex,idx)=>(
            <div key={idx} className="series">
              <div>
                <div><strong>{ex.name}</strong></div>
                <small>{(ex.start_weight_kg? ex.start_weight_kg+' kg · ' : '')}{ex.reps? ex.reps+' reps · ':''}{ex.tempo? ex.tempo:''}</small>
              </div>
              <div className="right"><button className="btn">Repos</button><span className="muted">Série ✔</span></div>
            </div>
          ))}
        </div>
      )}

      {tab==='stats' && (
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
          <div className="card">
            <div style={{fontWeight:700,marginBottom:8}}>Historique des sessions</div>
            <ul style={{listStyle:'none',padding:0,margin:0}}>
              {(data.history||[]).slice(-5).reverse().map((h,i)=>(
                <li key={i} className="series">
                  <div>
                    <div><strong>{h.planName||'Séance'}</strong></div>
                    <small>{new Date(h.date||Date.now()).toLocaleString()} · {fmtSec(h.totalDurationSec||0)} · Volume {Math.round(h.totalVolume||0)}</small>
                  </div>
                </li>
              ))}
              {(!data.history || data.history.length===0) && <li className="muted">Aucune session enregistrée pour l’instant.</li>}
            </ul>
          </div>
          <div className="card">
            <div style={{fontWeight:700,marginBottom:8}}>Tendance (10 dernières)</div>
            <div className="chart">Graphique durée & volume (placeholder)</div>
          </div>
        </div>
      )}

      <footer>Données stockées localement (navigateur). Prototype — usage personnel.</footer>
    </div>
  )
}
