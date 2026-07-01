'use client';

import { useState } from 'react';
import {
  User,
  Ruler,
  Bell,
  Video,
  Lock,
  Coins,
  CreditCard,
  ShoppingBag,
  Receipt,
  Pencil,
} from 'lucide-react';

const SECTIONS = [
  { id: 'profile', label: 'Profile', Icon: User },
  { id: 'units', label: 'Units', Icon: Ruler },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'exercise-videos', label: 'Exercise Videos', Icon: Video },
  { id: 'password', label: 'Change Password', Icon: Lock },
  { id: 'session-credits', label: 'Session Credits', Icon: Coins },
  { id: 'payment', label: 'Payment Information', Icon: CreditCard },
  { id: 'purchases', label: 'Purchases', Icon: ShoppingBag },
  { id: 'transactions', label: 'Transaction History', Icon: Receipt },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

const PROFILE_FIELDS: { label: string; value: string }[] = [
  { label: 'Email Address', value: 'jaimee.tarlinton9@gmail.com' },
  { label: 'Phone Number', value: '0422740389' },
  { label: 'Location', value: '' },
  { label: 'Birthdate', value: '2 Oct 1992' },
  { label: 'Height', value: '183 cm' },
  { label: 'Sex', value: 'Male' },
  { label: 'Timezone', value: '(GMT+10:00) Canberra, Melbourne, Sydney' },
];

const NOTIFICATION_CATEGORIES = [
  'Group Activities',
  'Private Messages',
  'New Comments',
  'Payment Events',
  'Trainer updates my account',
  'Events Scheduled',
  'Challenge Activities',
];

const TRANSACTIONS = [
  {
    name: '2-Week Extension - Preseason Package',
    kind: 'Add-on',
    status: 'Expired',
    price: '$0.00',
    note: '(100% discount)',
    expires: '5 Feb 2026',
  },
  {
    name: '8-Week Performance Foundations In-Season Package',
    kind: 'Main Product',
    status: 'Expired',
    price: '$0.00',
    note: '(100% discount)',
    expires: '5 Feb 2026',
  },
];

export default function AccountPage() {
  const [active, setActive] = useState<SectionId>('profile');
  const [editingProfile, setEditingProfile] = useState(false);

  // Units
  const [weightUnit, setWeightUnit] = useState('kg');
  const [distanceUnit, setDistanceUnit] = useState('kilometers');
  const [bodyStatsUnit, setBodyStatsUnit] = useState('centimeters');

  // Exercise videos
  const [videoPref, setVideoPref] = useState('Male first');

  // Notification channels + per-category in-app toggles
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [categoryPrefs, setCategoryPrefs] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c, true]))
  );

  function toggleCategory(cat: string) {
    setCategoryPrefs((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  return (
    <div className="flex h-full bg-jj-neutral dark:bg-gray-950">
      {/* Sidebar */}
      <div className="w-60 bg-white dark:bg-gray-900 border-r border-jj-grey/40 dark:border-gray-700 py-6 shrink-0">
        <h2 className="font-heading text-2xl px-5 pb-4 text-gray-900 dark:text-white">My Account</h2>
        {SECTIONS.map((s) => {
          const isActive = active === s.id;
          const Icon = s.Icon;
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

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* PROFILE */}
        {active === 'profile' && (
          <div className="max-w-2xl">
            <div className="flex justify-end">
              <button
                onClick={() => setEditingProfile((v) => !v)}
                className="flex items-center gap-1.5 px-4 py-1.5 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-jj-neutral dark:hover:bg-gray-800"
              >
                <Pencil size={14} />
                {editingProfile ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <div className="text-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gray-900 flex items-center justify-center text-brand text-3xl font-bold mx-auto mb-3">
                JT
              </div>
              <h3 className="font-heading text-3xl text-gray-900 dark:text-white">Jaimee Tarlinton</h3>
              {editingProfile && (
                <button className="mt-3 px-4 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-jj-neutral dark:hover:bg-gray-800">
                  Change Photo
                </button>
              )}
            </div>
            <div className="space-y-5">
              {PROFILE_FIELDS.map((f) => (
                <div key={f.label}>
                  <p className="text-lg text-gray-500 dark:text-gray-400">{f.label}</p>
                  {editingProfile ? (
                    <input
                      defaultValue={f.value}
                      className="mt-1 w-full px-3 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500">{f.value || '\u2014'}</p>
                  )}
                </div>
              ))}
            </div>
            {editingProfile && (
              <button
                onClick={() => setEditingProfile(false)}
                className="mt-6 px-6 py-2.5 bg-gray-900 text-brand rounded-md text-sm font-semibold hover:bg-gray-800"
              >
                Save Changes
              </button>
            )}
          </div>
        )}

        {/* UNITS */}
        {active === 'units' && (
          <div className="max-w-lg">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Units</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">How do you wish to enter your weight in?</label>
                <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} className="w-full px-3 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">For cardio exercises, how do you wish to enter distance?</label>
                <select value={distanceUnit} onChange={(e) => setDistanceUnit(e.target.value)} className="w-full px-3 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="kilometers">kilometers</option>
                  <option value="miles">miles</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">How do you wish to enter body stats?</label>
                <select value={bodyStatsUnit} onChange={(e) => setBodyStatsUnit(e.target.value)} className="w-full px-3 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="centimeters">centimeters</option>
                  <option value="inches">inches</option>
                </select>
              </div>
            </div>
            <button className="mt-6 px-6 py-2.5 bg-gray-900 text-brand rounded-md text-sm font-semibold hover:bg-gray-800">Save</button>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {active === 'notifications' && (
          <div className="max-w-2xl">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Notifications</h3>
            <div className="space-y-4 mb-8">
              <label className="flex items-center justify-between p-3 border border-jj-grey/30 dark:border-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Browser Push Notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Send notifications to web and mobile applications.</p>
                </div>
                <input type="checkbox" checked={pushEnabled} onChange={() => setPushEnabled((v) => !v)} className="w-5 h-5 accent-brand" />
              </label>
              <label className="flex items-center justify-between p-3 border border-jj-grey/30 dark:border-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Email Notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sent to jaimee.tarlinton9@gmail.com.</p>
                </div>
                <input type="checkbox" checked={emailEnabled} onChange={() => setEmailEnabled((v) => !v)} className="w-5 h-5 accent-brand" />
              </label>
            </div>
            <p className="text-sm font-heading tracking-wide uppercase text-jj-grey dark:text-gray-500 mb-2">General Notifications</p>
            <div className="divide-y divide-jj-grey/15 dark:divide-gray-700 border border-jj-grey/30 dark:border-gray-700 rounded-lg">
              {NOTIFICATION_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{cat}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500 dark:text-gray-400">In-app</span>
                    <input type="checkbox" checked={categoryPrefs[cat]} onChange={() => toggleCategory(cat)} className="w-4 h-4 accent-brand" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXERCISE VIDEOS */}
        {active === 'exercise-videos' && (
          <div className="max-w-lg">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Exercise Videos</h3>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Exercise videos</label>
            <select value={videoPref} onChange={(e) => setVideoPref(e.target.value)} className="w-full px-3 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand">
              <option>Male first</option>
              <option>Female first</option>
            </select>
            <button className="mt-6 px-6 py-2.5 bg-gray-900 text-brand rounded-md text-sm font-semibold hover:bg-gray-800">Save</button>
          </div>
        )}

        {/* CHANGE PASSWORD */}
        {active === 'password' && (
          <div className="max-w-md">
            <h3 className="font-heading text-2xl mb-2 text-gray-900 dark:text-white">Change Password</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">To change your password, please provide your current password and your new password.</p>
            {['Original Password', 'Your new password', 'Confirm new password'].map((l) => (
              <div key={l} className="mb-3.5">
                <label className="block text-[13px] font-medium mb-1 text-gray-700 dark:text-gray-300">{l}</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            ))}
            <button className="mt-2 px-6 py-2.5 bg-gray-900 text-brand rounded-md text-sm font-semibold hover:bg-gray-800">Change Password</button>
          </div>
        )}

        {/* SESSION CREDITS */}
        {active === 'session-credits' && (
          <div className="max-w-2xl">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Session Credits</h3>
            <div className="text-center py-12 border border-dashed border-jj-grey/40 dark:border-gray-700 rounded-lg">
              <Coins size={28} className="text-jj-grey/40 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No Session Credits</p>
            </div>
          </div>
        )}

        {/* PAYMENT INFORMATION */}
        {active === 'payment' && (
          <div className="max-w-2xl">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Payment info</h3>
            <div className="flex items-center justify-between p-4 border border-jj-grey/30 dark:border-gray-700 rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <CreditCard size={22} className="text-jj-blue" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">MasterCard \u2022\u2022\u2022\u2022 8607</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expiration: 1/2029</p>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand/15 text-brand">Default</span>
              </div>
              <button className="text-sm text-jj-coral hover:underline">Delete</button>
            </div>
            <button className="px-4 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-jj-neutral dark:hover:bg-gray-800">
              + Add payment method
            </button>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">Card details are entered securely on the payment provider &mdash; never stored here.</p>
          </div>
        )}

        {/* PURCHASES */}
        {active === 'purchases' && (
          <div className="max-w-2xl">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Purchases</h3>
            <div className="space-y-6">
              {[
                ['Main Product', 'No Main Product'],
                ['Add-ons', 'No Add-ons'],
                ['Session Packs', 'No Session Packs'],
              ].map(([title, empty]) => (
                <div key={title}>
                  <p className="text-sm font-heading tracking-wide uppercase text-jj-grey dark:text-gray-500 mb-2">{title}</p>
                  <div className="p-4 border border-jj-grey/30 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">{empty}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRANSACTION HISTORY */}
        {active === 'transactions' && (
          <div className="max-w-2xl">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Transaction History</h3>
            <div className="space-y-4">
              {TRANSACTIONS.map((t) => (
                <div key={t.name} className="p-4 border border-jj-grey/30 dark:border-gray-700 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.kind}</p>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-jj-grey/15 text-jj-grey dark:text-gray-400 shrink-0">{t.status}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{t.price} <span className="text-gray-400 dark:text-gray-500">{t.note}</span></span>
                    <span className="text-gray-500 dark:text-gray-400">Expires on {t.expires}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

