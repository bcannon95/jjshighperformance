'use client';

import { useState, useEffect } from 'react';
import {
  User, Ruler, Bell, Video, Lock, Coins,
  CreditCard, ShoppingBag, Receipt, Pencil, Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

const SECTIONS = [
  { id: 'profile',          label: 'Profile',              Icon: User },
  { id: 'units',            label: 'Units',                Icon: Ruler },
  { id: 'notifications',    label: 'Notifications',        Icon: Bell },
  { id: 'exercise-videos',  label: 'Exercise Videos',      Icon: Video },
  { id: 'password',         label: 'Change Password',      Icon: Lock },
  { id: 'session-credits',  label: 'Session Credits',      Icon: Coins },
  { id: 'payment',          label: 'Payment Information',  Icon: CreditCard },
  { id: 'purchases',        label: 'Purchases',            Icon: ShoppingBag },
  { id: 'transactions',     label: 'Transaction History',  Icon: Receipt },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

const NOTIFICATION_CATEGORIES = [
  'Group Activities',
  'Private Messages',
  'New Comments',
  'Payment Events',
  'Trainer updates my account',
  'Events Scheduled',
  'Challenge Activities',
];

type Invoice = {
  id: number;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  issued_at: string | null;
  paid_at: string | null;
};

const INPUT_CLS =
  'w-full px-3 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand';

const SAVE_BTN_CLS =
  'mt-6 px-6 py-2.5 bg-gray-900 text-brand rounded-md text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2';

function SuccessMsg({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
      <Check size={14} /> {children}
    </p>
  );
}

export default function AccountPage() {
  const { user, clientId } = useAuth();
  const [active, setActive] = useState<SectionId>('profile');

  // ── Session Credits ────────────────────────────────────────────────────────
  const [sessionCredits, setSessionCredits] = useState<{
    total_credits: number; used_credits: number; expires_at: string | null;
  } | null>(null);

  // ── Invoices ───────────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // ── Profile ───────────────────────────────────────────────────────────────
  const [editingProfile, setEditingProfile] = useState(false);
  const [fullName, setFullName]     = useState('');
  const [phone, setPhone]           = useState('');
  const [location, setLocation]     = useState('');
  const [birthdate, setBirthdate]   = useState('');
  const [height, setHeight]         = useState('');
  const [sex, setSex]               = useState('');
  const [timezone, setTimezone]     = useState('');
  const [profileSaving, setProfileSaving]   = useState(false);
  const [profileError, setProfileError]     = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // ── Units ─────────────────────────────────────────────────────────────────
  const [weightUnit, setWeightUnit]         = useState('kg');
  const [distanceUnit, setDistanceUnit]     = useState('kilometers');
  const [bodyStatsUnit, setBodyStatsUnit]   = useState('centimeters');
  const [unitsSaving, setUnitsSaving]       = useState(false);
  const [unitsSuccess, setUnitsSuccess]     = useState(false);

  // ── Exercise videos ───────────────────────────────────────────────────────
  const [videoPref, setVideoPref]       = useState('Male first');
  const [videoSaving, setVideoSaving]   = useState(false);
  const [videoSuccess, setVideoSuccess] = useState(false);

  // ── Notifications ─────────────────────────────────────────────────────────
  const [pushEnabled, setPushEnabled]   = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [categoryPrefs, setCategoryPrefs] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c, true]))
  );
  const [notifSaving, setNotifSaving]   = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  // ── Password ──────────────────────────────────────────────────────────────
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving]   = useState(false);
  const [passwordError, setPasswordError]     = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // ── Load session credits ───────────────────────────────────────────────────
  useEffect(() => {
    if (!clientId) return;
    supabase
      .from('session_credits')
      .select('total_credits, used_credits, expires_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => setSessionCredits(data?.[0] ?? null));
  }, [clientId]);

  // ── Load invoices ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!clientId) return;
    setInvoicesLoading(true);
    supabase
      .from('invoices')
      .select('id, amount_cents, currency, status, issued_at, paid_at')
      .eq('client_id', clientId)
      .order('issued_at', { ascending: false })
      .then(({ data }) => {
        setInvoices((data as Invoice[]) ?? []);
        setInvoicesLoading(false);
      });
  }, [clientId]);

  // ── Load from user_metadata on mount ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const m = user.user_metadata ?? {};
    setFullName(m.full_name ?? '');
    setPhone(m.phone ?? '');
    setLocation(m.location ?? '');
    setBirthdate(m.birthdate ?? '');
    setHeight(m.height ?? '');
    setSex(m.sex ?? '');
    setTimezone(m.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    setWeightUnit(m.weight_unit ?? 'kg');
    setDistanceUnit(m.distance_unit ?? 'kilometers');
    setBodyStatsUnit(m.body_stats_unit ?? 'centimeters');
    setVideoPref(m.video_pref ?? 'Male first');
    setPushEnabled(m.notification_push ?? true);
    setEmailEnabled(m.notification_email ?? true);
    if (m.notification_categories) setCategoryPrefs(m.notification_categories);
  }, [user]);

  const email = user?.email ?? '';
  const initials = fullName
    ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function saveProfile() {
    setProfileSaving(true);
    setProfileError(null);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, phone, location, birthdate, height, sex, timezone },
    });
    setProfileSaving(false);
    if (error) {
      setProfileError(error.message || 'Failed to save profile.');
    } else {
      setEditingProfile(false);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  }

  async function saveUnits() {
    setUnitsSaving(true);
    await supabase.auth.updateUser({
      data: { weight_unit: weightUnit, distance_unit: distanceUnit, body_stats_unit: bodyStatsUnit },
    });
    setUnitsSaving(false);
    setUnitsSuccess(true);
    setTimeout(() => setUnitsSuccess(false), 3000);
  }

  async function saveVideoPref() {
    setVideoSaving(true);
    await supabase.auth.updateUser({ data: { video_pref: videoPref } });
    setVideoSaving(false);
    setVideoSuccess(true);
    setTimeout(() => setVideoSuccess(false), 3000);
  }

  async function saveNotifications() {
    setNotifSaving(true);
    await supabase.auth.updateUser({
      data: {
        notification_push: pushEnabled,
        notification_email: emailEnabled,
        notification_categories: categoryPrefs,
      },
    });
    setNotifSaving(false);
    setNotifSuccess(true);
    setTimeout(() => setNotifSuccess(false), 3000);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message || 'Failed to update password.');
      } else {
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess(true);
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch {
      setPasswordError('An unexpected error occurred.');
    } finally {
      setPasswordSaving(false);
    }
  }

  function toggleCategory(cat: string) {
    setCategoryPrefs((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  // ── Shared select/input styles ─────────────────────────────────────────────
  const selectCls = INPUT_CLS;

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

        {/* ── PROFILE ──────────────────────────────────────────────────────── */}
        {active === 'profile' && (
          <div className="max-w-2xl">
            <div className="flex justify-end">
              <button
                onClick={() => { setEditingProfile((v) => !v); setProfileError(null); }}
                className="flex items-center gap-1.5 px-4 py-1.5 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-jj-neutral dark:hover:bg-gray-800"
              >
                <Pencil size={14} />
                {editingProfile ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {/* Avatar + name */}
            <div className="text-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gray-900 flex items-center justify-center text-brand text-3xl font-bold mx-auto mb-3">
                {initials}
              </div>
              {editingProfile ? (
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className={`mt-1 text-center max-w-xs mx-auto block ${INPUT_CLS}`}
                />
              ) : (
                <h3 className="font-heading text-3xl text-gray-900 dark:text-white">
                  {fullName || email || '—'}
                </h3>
              )}
            </div>

            {/* Fields */}
            <div className="space-y-5">
              {/* Email — always read-only */}
              <div>
                <p className="text-lg text-gray-500 dark:text-gray-400">Email Address</p>
                <p className="text-gray-400 dark:text-gray-500">{email || '—'}</p>
              </div>

              {/* Phone */}
              <div>
                <p className="text-lg text-gray-500 dark:text-gray-400">Phone Number</p>
                {editingProfile ? (
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`mt-1 ${INPUT_CLS}`} placeholder="e.g. 0400 000 000" />
                ) : (
                  <p className="text-gray-400 dark:text-gray-500">{phone || '—'}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <p className="text-lg text-gray-500 dark:text-gray-400">Location</p>
                {editingProfile ? (
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={`mt-1 ${INPUT_CLS}`} placeholder="e.g. Sydney, NSW" />
                ) : (
                  <p className="text-gray-400 dark:text-gray-500">{location || '—'}</p>
                )}
              </div>

              {/* Birthdate */}
              <div>
                <p className="text-lg text-gray-500 dark:text-gray-400">Birthdate</p>
                {editingProfile ? (
                  <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className={`mt-1 ${INPUT_CLS}`} />
                ) : (
                  <p className="text-gray-400 dark:text-gray-500">
                    {birthdate ? new Date(birthdate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                )}
              </div>

              {/* Height */}
              <div>
                <p className="text-lg text-gray-500 dark:text-gray-400">Height</p>
                {editingProfile ? (
                  <input type="text" value={height} onChange={(e) => setHeight(e.target.value)} className={`mt-1 ${INPUT_CLS}`} placeholder="e.g. 183 cm" />
                ) : (
                  <p className="text-gray-400 dark:text-gray-500">{height || '—'}</p>
                )}
              </div>

              {/* Sex */}
              <div>
                <p className="text-lg text-gray-500 dark:text-gray-400">Sex</p>
                {editingProfile ? (
                  <select value={sex} onChange={(e) => setSex(e.target.value)} className={`mt-1 ${selectCls}`}>
                    <option value="">— Select —</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </select>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500">{sex || '—'}</p>
                )}
              </div>

              {/* Timezone */}
              <div>
                <p className="text-lg text-gray-500 dark:text-gray-400">Timezone</p>
                {editingProfile ? (
                  <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={`mt-1 ${INPUT_CLS}`} />
                ) : (
                  <p className="text-gray-400 dark:text-gray-500">{timezone || '—'}</p>
                )}
              </div>
            </div>

            {profileError && (
              <p className="mt-4 text-sm text-red-500 dark:text-red-400">{profileError}</p>
            )}
            {editingProfile && (
              <button onClick={saveProfile} disabled={profileSaving} className={SAVE_BTN_CLS}>
                {profileSaving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
            {profileSuccess && <SuccessMsg>Profile saved.</SuccessMsg>}
          </div>
        )}

        {/* ── UNITS ─────────────────────────────────────────────────────────── */}
        {active === 'units' && (
          <div className="max-w-lg">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Units</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  How do you wish to enter your weight?
                </label>
                <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)} className={selectCls}>
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  For cardio exercises, how do you wish to enter distance?
                </label>
                <select value={distanceUnit} onChange={(e) => setDistanceUnit(e.target.value)} className={selectCls}>
                  <option value="kilometers">kilometers</option>
                  <option value="miles">miles</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  How do you wish to enter body stats?
                </label>
                <select value={bodyStatsUnit} onChange={(e) => setBodyStatsUnit(e.target.value)} className={selectCls}>
                  <option value="centimeters">centimeters</option>
                  <option value="inches">inches</option>
                </select>
              </div>
            </div>
            <button onClick={saveUnits} disabled={unitsSaving} className={SAVE_BTN_CLS}>
              {unitsSuccess && <Check size={14} />}
              {unitsSaving ? 'Saving…' : unitsSuccess ? 'Saved' : 'Save'}
            </button>
          </div>
        )}

        {/* ── NOTIFICATIONS ─────────────────────────────────────────────────── */}
        {active === 'notifications' && (
          <div className="max-w-2xl">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Notifications</h3>
            <div className="space-y-4 mb-8">
              <label className="flex items-center justify-between p-3 border border-jj-grey/30 dark:border-gray-700 rounded-lg cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Browser Push Notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Send notifications to web and mobile applications.</p>
                </div>
                <input type="checkbox" checked={pushEnabled} onChange={() => setPushEnabled((v) => !v)} className="w-5 h-5 accent-brand" />
              </label>
              <label className="flex items-center justify-between p-3 border border-jj-grey/30 dark:border-gray-700 rounded-lg cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Email Notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sent to {email}.</p>
                </div>
                <input type="checkbox" checked={emailEnabled} onChange={() => setEmailEnabled((v) => !v)} className="w-5 h-5 accent-brand" />
              </label>
            </div>
            <p className="text-sm font-heading tracking-wide uppercase text-jj-grey dark:text-gray-500 mb-2">
              General Notifications
            </p>
            <div className="divide-y divide-jj-grey/15 dark:divide-gray-700 border border-jj-grey/30 dark:border-gray-700 rounded-lg mb-6">
              {NOTIFICATION_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{cat}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500 dark:text-gray-400">In-app</span>
                    <input
                      type="checkbox"
                      checked={categoryPrefs[cat]}
                      onChange={() => toggleCategory(cat)}
                      className="w-4 h-4 accent-brand"
                    />
                  </label>
                </div>
              ))}
            </div>
            <button onClick={saveNotifications} disabled={notifSaving} className={SAVE_BTN_CLS}>
              {notifSuccess && <Check size={14} />}
              {notifSaving ? 'Saving…' : notifSuccess ? 'Saved' : 'Save'}
            </button>
          </div>
        )}

        {/* ── EXERCISE VIDEOS ───────────────────────────────────────────────── */}
        {active === 'exercise-videos' && (
          <div className="max-w-lg">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Exercise Videos</h3>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Exercise video preference
            </label>
            <select value={videoPref} onChange={(e) => setVideoPref(e.target.value)} className={selectCls}>
              <option>Male first</option>
              <option>Female first</option>
            </select>
            <button onClick={saveVideoPref} disabled={videoSaving} className={SAVE_BTN_CLS}>
              {videoSuccess && <Check size={14} />}
              {videoSaving ? 'Saving…' : videoSuccess ? 'Saved' : 'Save'}
            </button>
          </div>
        )}

        {/* ── CHANGE PASSWORD ───────────────────────────────────────────────── */}
        {active === 'password' && (
          <div className="max-w-md">
            <h3 className="font-heading text-2xl mb-2 text-gray-900 dark:text-white">Change Password</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Enter and confirm your new password below.
            </p>
            <form onSubmit={handlePasswordChange}>
              <div className="mb-3.5">
                <label className="block text-[13px] font-medium mb-1 text-gray-700 dark:text-gray-300">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={INPUT_CLS}
                />
              </div>
              <div className="mb-3.5">
                <label className="block text-[13px] font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={INPUT_CLS}
                />
              </div>
              {passwordError && (
                <p className="mb-3 text-sm text-red-500 dark:text-red-400">{passwordError}</p>
              )}
              {passwordSuccess && (
                <SuccessMsg>Password updated.</SuccessMsg>
              )}
              <button
                type="submit"
                disabled={passwordSaving}
                className="mt-4 px-6 py-2.5 bg-gray-900 text-brand rounded-md text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
              >
                {passwordSaving ? 'Updating…' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* ── SESSION CREDITS ───────────────────────────────────────────────── */}
        {active === 'session-credits' && (
          <div className="max-w-2xl">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Session Credits</h3>
            {sessionCredits ? (
              <div className="p-6 border border-jj-grey/30 dark:border-gray-700 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Remaining</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {sessionCredits.total_credits - sessionCredits.used_credits}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Used</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{sessionCredits.used_credits} of {sessionCredits.total_credits}</span>
                </div>
                {sessionCredits.expires_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Expires</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {new Date(sessionCredits.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-jj-grey/40 dark:border-gray-700 rounded-lg">
                <Coins size={28} className="text-jj-grey/40 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No Session Credits</p>
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENT INFORMATION ───────────────────────────────────────────── */}
        {active === 'payment' && (
          <div className="max-w-2xl">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Payment info</h3>
            <div className="flex items-center justify-between p-4 border border-jj-grey/30 dark:border-gray-700 rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <CreditCard size={22} className="text-jj-blue" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">MasterCard •••• 8607</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expiration: 1/2029</p>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand/15 text-brand">Default</span>
              </div>
              <button className="text-sm text-jj-coral hover:underline">Delete</button>
            </div>
            <button className="px-4 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-jj-neutral dark:hover:bg-gray-800">
              + Add payment method
            </button>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              Card details are entered securely on the payment provider — never stored here.
            </p>
          </div>
        )}

        {/* ── PURCHASES ─────────────────────────────────────────────────────── */}
        {active === 'purchases' && (
          <div className="max-w-2xl">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Purchases</h3>
            <div className="space-y-6">
              {(['Main Product', 'Add-ons', 'Session Packs'] as const).map((title) => (
                <div key={title}>
                  <p className="text-sm font-heading tracking-wide uppercase text-jj-grey dark:text-gray-500 mb-2">{title}</p>
                  <div className="p-4 border border-jj-grey/30 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                    No {title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TRANSACTION HISTORY ───────────────────────────────────────────── */}
        {active === 'transactions' && (
          <div className="max-w-2xl">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Transaction History</h3>
            {invoicesLoading ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Loading transactions...</p>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No transactions yet.</p>
            ) : (
              <div className="space-y-4">
                {invoices.map((inv) => {
                  const amount = inv.amount_cents != null
                    ? (inv.amount_cents / 100).toLocaleString(undefined, { style: 'currency', currency: inv.currency ?? 'AUD' })
                    : '—';
                  return (
                    <div key={inv.id} className="p-4 border border-jj-grey/30 dark:border-gray-700 rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Invoice #{inv.id}</p>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-jj-grey/15 text-jj-grey dark:text-gray-400 shrink-0 capitalize">
                          {inv.status ?? 'unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{amount}</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {inv.paid_at
                            ? `Paid ${new Date(inv.paid_at).toLocaleDateString()}`
                            : inv.issued_at
                            ? `Issued ${new Date(inv.issued_at).toLocaleDateString()}`
                            : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
