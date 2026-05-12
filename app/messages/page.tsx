'use client'
import {useState} from 'react'
import {Send,Search,ChevronRight} from 'lucide-react'

export default function MessagesPage(){
  const [sel,setSel]=useState(0)
  const [msg,setMsg]=useState('')
  const threads=[
    {id:0,name:'Coach Sarah',avatar:'CS',last:'Great job on your workout today!',time:'2m ago',unread:2,msgs:[
      {from:'coach',text:'Hey Jaimee! How did the workout feel today?',time:'10:30 AM'},
      {from:'me',text:'It was tough but I pushed through!',time:'10:35 AM'},
      {from:'coach',text:'Great job on your workout today!',time:'10:40 AM'}
    ]},
    {id:1,name:'Trainer Mike',avatar:'TM',last:'Check your meal plan update',time:'1h ago',unread:0,msgs:[
      {from:'coach',text:'I updated your meal plan for next week.',time:'9:00 AM'},
      {from:'coach',text:'Check your meal plan update',time:'9:05 AM'}
    ]},
    {id:2,name:'Support Team',avatar:'ST',last:'Your query has been resolved',time:'Yesterday',unread:0,msgs:[
      {from:'coach',text:'Your query has been resolved',time:'Yesterday'}
    ]}
  ]
  const active=threads[sel]
  return (
    <div style={{display:'flex',height:'100%',background:'#f9fafb'}}>
      <div style={{width:'300px',background:'white',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'16px',borderBottom:'1px solid #e5e7eb'}}>
          <h2 style={{fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>Messages</h2>
          <div style={{display:'flex',alignItems:'center',gap:'8px',background:'#f3f4f6',borderRadius:'8px',padding:'8px 12px'}}>
            <Search size={16} color='#9ca3af' />
            <input placeholder='Search messages...' style={{border:'none',background:'transparent',outline:'none',fontSize:'14px',width:'100%'}} />
          </div>
        </div>
        <div style={{overflowY:'auto',flex:'1'}}>
          {threads.map((t)=>(
            <button key={t.id} onClick={()=>setSel(t.id)} style={{width:'100%',display:'flex',alignItems:'flex-start',gap:'12px',padding:'14px 16px',border:'none',borderBottom:'1px solid #f3f4f6',cursor:'pointer',background:sel===t.id?'#eff6ff':'white',textAlign:'left'}}>
              <div style={{width:'42px',height:'42px',borderRadius:'50%',background:'#2563eb',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'13px',flexShrink:0}}>{t.avatar}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontWeight:'600',fontSize:'14px'}}>{t.name}</span>
                  <span style={{fontSize:'12px',color:'#6b7280'}}>{t.time}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'13px',color:'#6b7280',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'160px'}}>{t.last}</span>
                  {t.unread>0 && <span style={{background:'#2563eb',color:'white',borderRadius:'50%',width:'20px',height:'20px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'700'}}>{t.unread}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #e5e7eb',background:'white',display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'#2563eb',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700'}}>{active.avatar}</div>
          <div>
            <div style={{fontWeight:'600'}}>{active.name}</div>
            <div style={{fontSize:'12px',color:'#22c55e'}}>Online</div>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'20px',display:'flex',flexDirection:'column',gap:'12px'}}>
          {active.msgs.map((m,i)=>(
            <div key={i} style={{display:'flex',justifyContent:m.from==='me'?'flex-end':'flex-start'}}>
              <div style={{maxWidth:'60%',padding:'10px 14px',borderRadius:m.from==='me'?'16px 16px 4px 16px':'16px 16px 16px 4px',background:m.from==='me'?'#2563eb':'white',color:m.from==='me'?'white':'#111827',border:m.from==='me'?'none':'1px solid #e5e7eb',fontSize:'14px'}}>
                <div>{m.text}</div>
                <div style={{fontSize:'11px',opacity:0.7,marginTop:'4px',textAlign:'right'}}>{m.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{padding:'16px 20px',borderTop:'1px solid #e5e7eb',background:'white',display:'flex',gap:'10px',alignItems:'center'}}>
          <input value={msg} onChange={(e)=>setMsg(e.target.value)} placeholder='Type a message...' style={{flex:1,padding:'10px 16px',border:'1px solid #e5e7eb',borderRadius:'24px',outline:'none',fontSize:'14px'}} />
          <button onClick={()=>setMsg('')} style={{width:'40px',height:'40px',borderRadius:'50%',background:'#2563eb',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Send size={18} color='white' /></button>
        </div>
      </div>
    </div>
  )
}
