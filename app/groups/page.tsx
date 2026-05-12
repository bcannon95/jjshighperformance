'use client'
import {useState} from 'react'
import {Users,Lock} from 'lucide-react'

export default function GroupsPage(){
  const [joined,setJoined]=useState([0,2])
  const groups=[
    {id:0,name:'Weight Loss Warriors',members:142,desc:'Support group for sustainable weight loss journeys',icon:'⚖️',private:false},
    {id:1,name:'Strength & Power',members:89,desc:'Heavy lifting, powerlifting, and strength training focused',icon:'🏋️',private:false},
    {id:2,name:'JJS Health Clients',members:34,desc:'Private group for JJS Health & Fitness clients only',icon:'🌟',private:true},
    {id:3,name:'Morning Warriors',members:67,desc:'Early risers who train before 7am every day',icon:'🌅',private:false},
    {id:4,name:'Nutrition Nerds',members:203,desc:'Deep dive into nutrition science and meal planning',icon:'🥗',private:false},
    {id:5,name:'Running Club',members:118,desc:'Casual and competitive runners of all abilities welcome',icon:'🏃',private:false}
  ]
  const toggle=(id)=>setJoined(j=>j.includes(id)?j.filter(x=>x!==id):[...j,id])
  return (
    <div style={{padding:'32px',background:'#f9fafb',minHeight:'100%'}}>
      <h1 style={{fontSize:'24px',fontWeight:'700',marginBottom:'8px'}}>Groups</h1>
      <p style={{color:'#6b7280',marginBottom:'32px'}}>Connect with others on the same journey</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'16px'}}>
        {groups.map((g)=>{
          const isJoined=joined.includes(g.id)
          return (
            <div key={g.id} style={{background:'white',borderRadius:'12px',padding:'24px',border:isJoined?'2px solid #2563eb':'1px solid #e5e7eb'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'32px'}}>{g.icon}</span>
                  <div>
                    <div style={{fontWeight:'700',fontSize:'16px',display:'flex',alignItems:'center',gap:'6px'}}>{g.name}{g.private&&<Lock size={13} color='#6b7280' />}</div>
                    <div style={{display:'flex',alignItems:'center',gap:'4px',color:'#6b7280',fontSize:'13px'}}><Users size={13} />{g.members} members</div>
                  </div>
                </div>
                <button onClick={()=>toggle(g.id)} style={{padding:'6px 16px',borderRadius:'20px',border:isJoined?'1px solid #2563eb':'1px solid #e5e7eb',background:isJoined?'#eff6ff':'white',color:isJoined?'#2563eb':'#374151',fontWeight:'600',fontSize:'13px',cursor:'pointer'}}>{isJoined?'Joined':'Join'}</button>
              </div>
              <p style={{fontSize:'14px',color:'#6b7280',lineHeight:'1.5'}}>{g.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
