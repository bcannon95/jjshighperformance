'use client'
export default function BadgesPage(){
  const earned=[
    {icon:'🏆',name:'First Workout',desc:'Completed your first workout',date:'Jan 5, 2026'},
    {icon:'🔥',name:'7-Day Streak',desc:'Worked out 7 days in a row',date:'Jan 12, 2026'},
    {icon:'💪',name:'Strength Milestone',desc:'Lifted 100kg for the first time',date:'Jan 20, 2026'},
    {icon:'🥗',name:'Nutrition Pro',desc:'Hit your macros 5 days straight',date:'Feb 1, 2026'},
    {icon:'⚡',name:'Speed Demon',desc:'Completed a workout in under 30min',date:'Feb 10, 2026'},
    {icon:'🎯',name:'Goal Setter',desc:'Set your first fitness goal',date:'Jan 1, 2026'}
  ]
  const locked=[
    {icon:'🌟',name:'30-Day Streak',desc:'Work out 30 days in a row'},
    {icon:'🏋️',name:'Beast Mode',desc:'Lift 150kg in a single session'},
    {icon:'🚀',name:'Consistency King',desc:'Complete 50 workouts total'},
    {icon:'🎖️',name:'Elite Athlete',desc:'Reach level 10 fitness score'}
  ]
  return (
    <div style={{padding:'32px',background:'#f9fafb',minHeight:'100%'}}>
      <h1 style={{fontSize:'24px',fontWeight:'700',marginBottom:'8px'}}>Badges</h1>
      <p style={{color:'#6b7280',marginBottom:'32px'}}>You have earned {earned.length} of {earned.length+locked.length} badges</p>
      <h2 style={{fontSize:'16px',fontWeight:'600',marginBottom:'16px',color:'#111827'}}>Earned Badges</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'40px'}}>
        {earned.map((b,i)=>(
          <div key={i} style={{background:'white',borderRadius:'12px',padding:'24px',textAlign:'center',border:'2px solid #fbbf24',boxShadow:'0 2px 8px rgba(251,191,36,0.15)'}}>
            <div style={{fontSize:'40px',marginBottom:'12px'}}>{b.icon}</div>
            <div style={{fontWeight:'700',marginBottom:'6px'}}>{b.name}</div>
            <div style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px'}}>{b.desc}</div>
            <div style={{fontSize:'11px',color:'#fbbf24',fontWeight:'600'}}>Earned {b.date}</div>
          </div>
        ))}
      </div>
      <h2 style={{fontSize:'16px',fontWeight:'600',marginBottom:'16px',color:'#111827'}}>Locked Badges</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
        {locked.map((b,i)=>(
          <div key={i} style={{background:'white',borderRadius:'12px',padding:'24px',textAlign:'center',border:'1px solid #e5e7eb',opacity:0.6}}>
            <div style={{fontSize:'40px',marginBottom:'12px',filter:'grayscale(1)'}}>{b.icon}</div>
            <div style={{fontWeight:'700',marginBottom:'6px'}}>{b.name}</div>
            <div style={{fontSize:'12px',color:'#6b7280'}}>{b.desc}</div>
            <div style={{fontSize:'11px',color:'#9ca3af',marginTop:'8px'}}>🔒 Locked</div>
          </div>
        ))}
      </div>
    </div>
  )
}
