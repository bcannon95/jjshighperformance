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
    <div className="p-8 bg-jj-neutral dark:bg-gray-950 min-h-full">
      <h1 className="font-heading text-4xl mb-2 text-gray-900 dark:text-white">Badges</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">You have earned {earned.length} of {earned.length+locked.length} badges</p>
      <h2 className="font-heading text-2xl mb-4 text-gray-900 dark:text-white">Earned Badges</h2>
      <div className="grid grid-cols-3 gap-4 mb-10">
        {earned.map((b,i)=>(
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border-2 border-brand" style={{boxShadow:'0 2px 8px rgba(212,222,38,0.15)'}}>
            <div className="text-4xl mb-3">{b.icon}</div>
            <div className="font-bold mb-1.5 text-gray-900 dark:text-white">{b.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{b.desc}</div>
            <div className="text-[11px] text-brand font-semibold">Earned {b.date}</div>
          </div>
        ))}
      </div>
      <h2 className="font-heading text-2xl mb-4 text-gray-900 dark:text-white">Locked Badges</h2>
      <div className="grid grid-cols-3 gap-4">
        {locked.map((b,i)=>(
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border border-jj-grey/30 dark:border-gray-700 opacity-60">
            <div className="text-4xl mb-3 grayscale">{b.icon}</div>
            <div className="font-bold mb-1.5 text-gray-900 dark:text-white">{b.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{b.desc}</div>
            <div className="text-[11px] text-jj-grey dark:text-gray-500 mt-2">🔒 Locked</div>
          </div>
        ))}
      </div>
    </div>
  )
}
