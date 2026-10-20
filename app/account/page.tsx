'use client';

import { useState, useEffect } from 'react';
import {
  User, Ruler, Bell, Video, Lock, Coins,
  CreditCard, ShoppingBag, Receipt, Pencil, Check, X,
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

  // ── Payment ───────────────────────────────────────────────────────────────
  const [showAddPayment, setShowAddPayment] = useState(false);

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
  const [pushEnabled, setPushEnabled]   = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [categoryPrefs, setCategoryPrefs] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c, false]))
  );
  const [notifSaving, setNotifSaving]     = useState(false);
  const [notifSuccess, setNotifSuccess]   = useState(false);
  const [pushStatus, setPushStatus]       = useState<'idle' | 'requesting' | 'denied' | 'unsupported'>('idle');

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

  async function subscribeToPush(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported');
      return false;
    }
    setPushStatus('requesting');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setPushStatus('denied');
      setPushEnabled(false);
      return false;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });
      const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await supabase.from('push_subscriptions').upsert(
        { user_id: clientId, user_type: 'client', endpoint, p256dh: keys.p256dh, auth_key: keys.auth, push_enabled: true },
        { onConflict: 'endpoint' }
      );
      setPushStatus('idle');
      return true;
    } catch {
      setPushStatus('idle');
      return false;
    }
  }

  async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.toJSON().endpoint!);
      await sub.unsubscribe();
    }
  }

  async function handlePushToggle() {
    const next = !pushEnabled;
    if (next) {
      const ok = await subscribeToPush();
      if (ok) setPushEnabled(true);
    } else {
      await unsubscribeFromPush();
      setPushEnabled(false);
    }
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
    <div className="flex flex-col md:flex-row h-full bg-jj-neutral dark:bg-gray-950">
      {/* Sidebar — desktop: vertical left panel | mobile: horizontal scroll tabs */}
      <div className="md:w-60 bg-white dark:bg-gray-900 md:border-r border-b border-jj-grey/40 dark:border-gray-700 md:py-6 shrink-0">
        <h2 className="font-heading text-2xl px-5 py-4 md:pb-4 md:pt-0 text-gray-900 dark:text-white hidden md:block">My Account</h2>
        {/* Mobile: horizontal scrollable tabs */}
        <div className="flex md:hidden overflow-x-auto gap-1 px-3 py-2">
          {SECTIONS.map((s) => {
            const isActive = active === s.id;
            const Icon = s.Icon;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-brand text-white'
                    : 'bg-jj-neutral dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon size={13} />
                {s.label}
              </button>
            );
          })}
        </div>
        {/* Desktop: vertical list */}
        <div className="hidden md:block">
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
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">

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
              <div className="flex items-center justify-between p-3 border border-jj-grey/30 dark:border-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Browser Push Notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {pushStatus === 'requesting' ? 'Requesting permission…' :
                     pushStatus === 'denied'     ? 'Permission denied — enable in browser settings.' :
                     pushStatus === 'unsupported'? 'Not supported on this browser.' :
                     'Notify you about messages and updates.'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  onChange={handlePushToggle}
                  disabled={pushStatus === 'requesting'}
                  className="w-5 h-5 accent-brand disabled:opacity-50"
                />
              </div>
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
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Payment Information</h3>
            <div className="text-center py-12 border border-dashed border-jj-grey/40 dark:border-gray-700 rounded-lg mb-4">
              <CreditCard size={28} className="text-jj-grey/40 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No payment methods on file.</p>
            </div>
            <button
              onClick={() => setShowAddPayment(true)}
              className="px-4 py-2 border border-jj-grey/40 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-jj-neutral dark:hover:bg-gray-800"
            >
              + Add payment method
            </button>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              Card details are entered securely on the payment provider — never stored here.
            </p>

            {showAddPayment && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddPayment(false)} />
                <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading text-lg tracking-widest text-gray-700 dark:text-gray-200 uppercase">
                      Add Payment Method
                    </h3>
                    <button onClick={() => setShowAddPayment(false)}>
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex flex-col items-center text-center py-4 gap-3">
                    <CreditCard size={36} className="text-jj-blue" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Payment methods are managed by your trainer.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Contact JJ&apos;s High Performance to update your billing details or add a new card.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddPayment(false)}
                    className="mt-2 w-full py-2.5 rounded-lg bg-gray-900 text-brand text-sm font-semibold"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PURCHASES ─────────────────────────────────────────────────────── */}
        {active === 'purchases' && (
          <div className="max-w-2xl">
            <h3 className="font-heading text-2xl mb-6 text-gray-900 dark:text-white">Purchases</h3>
            <div className="space-y-6">
              <div>
                <p className="text-sm font-heading tracking-wide uppercase text-jj-grey dark:text-gray-500 mb-2">Main Product</p>
                <div className="p-4 border border-jj-grey/30 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                  No active subscription. Contact your trainer to get set up.
                </div>
              </div>
              <div>
                <p className="text-sm font-heading tracking-wide uppercase text-jj-grey dark:text-gray-500 mb-2">Add-ons</p>
                <div className="p-4 border border-jj-grey/30 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                  No add-ons purchased.
                </div>
              </div>
              <div>
                <p className="text-sm font-heading tracking-wide uppercase text-jj-grey dark:text-gray-500 mb-2">Session Packs</p>
                <div className="p-4 border border-jj-grey/30 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                  No session packs purchased.
                </div>
              </div>
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
