'use client';
import { useState } from 'react';
import { User, Lock, ShoppingBag, CreditCard } from 'lucide-react';

export default function AccountPage() {
  const [active, setActive] = useState('profile');
  const sections = [
    { id: 'profile', label: 'Profile', Icon: User },
    { id: 'password', label: 'Password', Icon: Lock },
    { id: 'purchases', label: 'Purchases', Icon: ShoppingBag },
    { id: 'transactions', label: 'Transactions', Icon: CreditCard },
  ];

  return (
    <div className="flex h-full bg-jj-neutral dark:bg-gray-950">
      <div className="w-56 bg-white dark:bg-gray-900 border-r border-jj-grey/40 dark:border-gray-700 py-6 shrink-0">
        <h2 className="font-heading text-2xl px-5 pb-4 text-gray-900 dark:text-white">Account</h2>
        {sections.map((s) => {
          const Icon = s.Icon;
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-sm font-medium border-l-[3px] transition-colors ${
                isActive
                  ? 'border-brand bg-brand/10 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-700 dark:text-gray-400 hover:bg-jj-neutral dark:hover:bg-gray-800'
              }`}
            >
              <Icon size={16} />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        {active === 'profile' && (
          <div>
            <h3 className="font-heading text-2xl mb-5 text-gray-900 dark:text-white">Profile Information</h3>
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center text-brand text-2xl font-bold mx-auto mb-3">
                JT
              </div>
              <button className="px-4 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-jj-neutral dark:hover:bg-gray-800">
                Change Photo
              </button>
            </div>
            {[
              ['First Name', 'Jaimee'],
              ['Last Name', 'Smith'],
              ['Email', 'jaimee@email.com'],
              ['Phone', '+61 400 000 000'],
            ].map(([l, v]) => (
              <div key={l} className="mb-3.5">
                <label className="block text-[13px] font-medium mb-1 text-gray-700 dark:text-gray-300">{l}</label>
                <input
                  defaultValue={v}
                  className="w-full px-3 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            ))}
            <button className="mt-2 px-6 py-2.5 bg-gray-900 text-brand rounded-md text-sm font-semibold hover:bg-gray-800">
              Save Changes
            </button>
          </div>
        )}

        {active === 'password' && (
          <div>
            <h3 className="font-heading text-2xl mb-5 text-gray-900 dark:text-white">Change Password</h3>
            {['Current Password', 'New Password', 'Confirm Password'].map((l) => (
              <div key={l} className="mb-3.5">
                <label className="block text-[13px] font-medium mb-1 text-gray-700 dark:text-gray-300">{l}</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            ))}
            <button className="mt-2 px-6 py-2.5 bg-gray-900 text-brand rounded-md text-sm font-semibold hover:bg-gray-800">
              Update Password
            </button>
          </div>
        )}

        {active === 'purchases' && (
          <div>
            <h3 className="font-heading text-2xl mb-5 text-gray-900 dark:text-white">My Purchases</h3>
            {[
              { name: '12-Week Transformation', date: 'Jan 15, 2026', price: '$99/mo', status: 'Active' },
              { name: 'Nutrition Coaching', date: 'Dec 1, 2025', price: '$49/mo', status: 'Active' },
            ].map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between border border-jj-grey/30 dark:border-gray-700 rounded-lg p-4 mb-3 bg-white dark:bg-gray-800"
              >
                <div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">{p.name}</div>
                  <div className="text-[13px] text-gray-500 dark:text-gray-400">{p.date} · {p.price}</div>
                </div>
                <span className="px-2.5 py-1 bg-brand/20 text-gray-900 dark:text-gray-100 rounded-full text-xs font-medium">
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {active === 'transactions' && (
          <div>
            <h3 className="font-heading text-2xl mb-5 text-gray-900 dark:text-white">Transactions</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-jj-grey/30 dark:border-gray-700">
                  {['Date', 'Description', 'Amount', 'Status'].map((h) => (
                    <th key={h} className="text-left p-2 text-[13px] text-gray-500 dark:text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { date: 'Jan 15', desc: '12-Week Program', amt: '$99', st: 'Paid' },
                  { date: 'Dec 1', desc: 'Nutrition Package', amt: '$49', st: 'Paid' },
                ].map((t, i) => (
                  <tr key={i} className="border-b border-jj-grey/20 dark:border-gray-800 text-sm text-gray-900 dark:text-gray-300">
                    <td className="p-2 py-3">{t.date}</td>
                    <td className="p-2 py-3">{t.desc}</td>
                    <td className="p-2 py-3">{t.amt}</td>
                    <td className="p-2 py-3">
                      <span className="px-2 py-0.5 bg-brand/20 text-gray-900 dark:text-gray-100 rounded-full text-xs font-medium">
                        {t.st}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
