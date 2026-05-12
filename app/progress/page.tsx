'use client'
import {useState} from 'react'
import {TrendingDown,TrendingUp,Minus} from 'lucide-react'

export default function ProgressPage(){
  const [tab,setTab]=useState('weight')
  const metrics=[
    {label:'Weight',current:'72.4 kg',change:'-3.2 kg',trend:'down',good:true},
    {label:'Body Fat',current:'18.2%',change:'-2.1%',trend:'down',good:true},
    {label:'Muscle Mass',current:'58.6 kg',change:'+1.4 kg',trend:'up',good:true},
    {label:'BMI',current:'23.1',change:'-0.8',trend:'down',good:true}
  ]
  const weightData=[
    {week:'Week 1',val:75.6},{week:'Week 2',val:74.8},{week:'Week 3',val:74.1},
    {week:'Week 4',val:73.5},{week:'Week 5',val:73.0},{week:'Week 6',val:72.4}
  ]
  const maxVal=Math.max(...weightData.map(d=>d.val))
  const minVal=Math.min(...weightData.map(d=>d.val))
  const measurements=[
    {part:'Chest',start:'102 cm',current:'98 cm',change:'-4 cm'},
    {part:'Waist',start:'88 cm',current:'83 cm',change:'-5 cm'},
    {part:'Hips',start:'96 cm',current:'93 cm',change:'-3 cm'},
    {part:'Left Arm',start:'34 cm',current:'35 cm',change:'+1 cm'},
    {part:'Right Arm',start:'34 cm',current:'35 cm',change:'+1 cm'},
    {part:'Left Thigh',start:'58 cm',current:'56 cm',change:'-2 cm'}
  ]
  return (
    <div style={{padding:'32px',background:'#f9fafb',minHeight:'100%'}}>
      <h1 style={{fontSize:'24px',fontWeight:'700',marginBottom:'24px'}}>Progress</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'32px'}}>
        {metrics.map((m,i)=>(
          <div key={i} style={{background:'white',borderRadius:'12px',padding:'20px',border:'1px solid #e5e7eb'}}>
            <div style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px'}}>{m.label}</div>
            <div style={{fontSize:'24px',fontWeight:'700',marginBottom:'6px'}}>{m.current}</div>
            <div style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'13px',color:m.good?'#16a34a':'#dc2626'}}>{m.trend==='down'?<TrendingDown size={14}/>:m.trend==='up'?<TrendingUp size={14}/>:<Minus size={14}/>}{m.change} vs start</div>
          </div>
        ))}
      </div>
      <div style={{background:'white',borderRadius:'12px',padding:'24px',border:'1px solid #e5e7eb',marginBottom:'24px'}}>
        <h2 style={{fontSize:'16px',fontWeight:'600',marginBottom:'20px'}}>Weight Trend (6 Weeks)</h2>
        <div style={{display:'flex',alignItems:'flex-end',gap:'8px',height:'120px'}}>
          {weightData.map((d,i)=>{
            const pct=(d.val-minVal)/(maxVal-minVal||1)
            const h=Math.max(20,Math.round((1-pct)*100)+20)
            return (
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'6px'}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:'#2563eb'}}>{d.val}</div>
                <div style={{width:'100%',background:i===weightData.length-1?'#2563eb':'#bfdbfe',borderRadius:'4px 4px 0 0',height:h+'px'}}></div>
                <div style={{fontSize:'10px',color:'#6b7280'}}>{d.week}</div>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{background:'white',borderRadius:'12px',padding:'24px',border:'1px solid #e5e7eb'}}>
        <h2 style={{fontSize:'16px',fontWeight:'600',marginBottom:'16px'}}>Body Measurements</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px'}}>
          {measurements.map((m,i)=>(
            <div key={i} style={{background:'#f9fafb',borderRadius:'8px',padding:'14px'}}>
              <div style={{fontWeight:'600',marginBottom:'8px'}}>{m.part}</div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'4px'}}>
                <span style={{color:'#6b7280'}}>Start</span><span>{m.start}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'6px'}}>
                <span style={{color:'#6b7280'}}>Now</span><span style={{fontWeight:'600'}}>{m.current}</span>
              </div>
              <div style={{fontSize:'12px',color:m.change.startsWith('-')?'#16a34a':'#2563eb',fontWeight:'600'}}>{m.change}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
