'use client'
import {useState} from 'react'

export default function MealPlanPage(){
  const [day,setDay]=useState(0)
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const meals={
    0:[{type:'Breakfast',name:'Oats with Berries',cal:380,p:18,c:58,f:9,time:'7:00 AM'},{type:'Lunch',name:'Chicken & Rice Bowl',cal:520,p:42,c:55,f:8,time:'12:30 PM'},{type:'Snack',name:'Greek Yogurt',cal:150,p:17,c:10,f:3,time:'3:30 PM'},{type:'Dinner',name:'Salmon with Veggies',cal:480,p:38,c:22,f:22,time:'7:00 PM'}],
    1:[{type:'Breakfast',name:'Protein Pancakes',cal:410,p:32,c:48,f:8,time:'7:00 AM'},{type:'Lunch',name:'Turkey Wrap',cal:490,p:38,c:46,f:12,time:'12:30 PM'},{type:'Snack',name:'Almonds',cal:170,p:6,c:6,f:15,time:'3:30 PM'},{type:'Dinner',name:'Beef Stir Fry',cal:510,p:36,c:42,f:16,time:'7:00 PM'}]
  }
  const todayMeals=meals[day]||meals[0]
  const totals=todayMeals.reduce((a,m)=>({cal:a.cal+m.cal,p:a.p+m.p,c:a.c+m.c,f:a.f+m.f}),{cal:0,p:0,c:0,f:0})
  const typeColors={Breakfast:'#fef3c7',Lunch:'#dbeafe',Snack:'#f0fdf4',Dinner:'#fce7f3'}
  const typeText={Breakfast:'#d97706',Lunch:'#2563eb',Snack:'#16a34a',Dinner:'#be185d'}
  return (
    <div style={{padding:'32px',background:'#f9fafb',minHeight:'100%'}}>
      <h1 style={{fontSize:'24px',fontWeight:'700',marginBottom:'24px'}}>Meal Plan</h1>
      <div style={{display:'flex',gap:'8px',marginBottom:'28px',background:'white',padding:'8px',borderRadius:'12px',border:'1px solid #e5e7eb'}}>
        {days.map((d,i)=>(
          <button key={i} onClick={()=>setDay(i)} style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',background:day===i?'#2563eb':'transparent',color:day===i?'white':'#374151',fontWeight:day===i?'700':'400',cursor:'pointer',fontSize:'13px'}}>{d}</button>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'28px'}}>
        {[{label:'Calories',val:totals.cal,unit:'kcal',color:'#f97316'},{label:'Protein',val:totals.p,unit:'g',color:'#2563eb'},{label:'Carbs',val:totals.c,unit:'g',color:'#f59e0b'},{label:'Fat',val:totals.f,unit:'g',color:'#10b981'}].map((m,i)=>(
          <div key={i} style={{background:'white',borderRadius:'10px',padding:'16px',border:'1px solid #e5e7eb',textAlign:'center'}}>
            <div style={{fontSize:'22px',fontWeight:'700',color:m.color}}>{m.val}{m.unit}</div>
            <div style={{fontSize:'12px',color:'#6b7280',marginTop:'4px'}}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        {todayMeals.map((m,i)=>(
          <div key={i} style={{background:'white',borderRadius:'12px',padding:'20px',border:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
              <span style={{padding:'4px 10px',borderRadius:'20px',background:typeColors[m.type],color:typeText[m.type],fontSize:'12px',fontWeight:'600'}}>{m.type}</span>
              <div>
                <div style={{fontWeight:'600',marginBottom:'2px'}}>{m.name}</div>
                <div style={{fontSize:'12px',color:'#6b7280'}}>{m.time}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:'16px',fontSize:'13px',color:'#6b7280'}}>
              <span style={{fontWeight:'600',color:'#f97316'}}>{m.cal} kcal</span>
              <span>P: {m.p}g</span><span>C: {m.c}g</span><span>F: {m.f}g</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
