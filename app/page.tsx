'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import {
  Settings,
  Menu,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Trophy,
  Dumbbell,
  Timer,
  Scale,
  Camera,
  Moon,
  X,
  Check,
} from 'lucide-react';

const defaultProgressWidgets = [
  { label: 'Steps', value: null, unit: '', date: null, hidden: false },
  { label: 'Sleep', value: null, unit: '', date: null, hidden: false },
  { label: 'Caloric Burn', value: null, unit: '', date: null, hidden: false },
  { label: 'Body Weight', value: null, unit: 'kg', date: null, hidden: false },
  { label: 'Body Fat', value: null, unit: '', date: null, hidden: false },
  { label: 'Photos', value: null, unit: '', date: null, hidden: false },
  { label: 'Caloric Intake', value: null, unit: '', date: null, hidden: false },
  { label: 'Resting HR', value: null, unit: '', date: null, hidden: false },
  { label: 'Blood Pressure', value: null, unit: '', date: null, hidden: false },
  { label: 'Lean Mass', value: null, unit: '', date: null, hidden: false },
];

const ADD_OPTIONS = [
  { id: 'workout', label: 'Workout', icon: Dumbbell, description: 'Log a training session' },
  { id: 'cardio', label: 'Cardio', icon: Timer, description: 'Log a cardio session' },
  { id: 'body-stats', label: 'Body Stats', icon: Scale, description: 'Record weight & measurements' },
  { id: 'photos', label: 'Photos', icon: Camera, description: 'Upload progress photos' },
  { id: 'sleep', label: 'Sleep', icon: Moon, description: 'Log your sleep' },
] as const;

type TaskType = typeof ADD_OPTIONS[number]['id'];

// Map app task types <-> calendar_events.event_type values.
const EVENT_TYPE: Record<TaskType, string> = {
  workout: 'workout',
  cardio: 'activity',
  'body-stats': 'bodystats',
  photos: 'photo',
  sleep: 'sleep',
};

function eventTypeToTaskType(eventType: string | null): TaskType {
  const found = (Object.keys(EVENT_TYPE) as TaskType[]).find(
    (k) => EVENT_TYPE[k] === eventType
  );
  return found ?? 'workout';
}

interface Task {
  id: string;        // client-side key
  dbId: number;      // calendar_events.id (used for update/delete)
  type: TaskType;
  label: string;
  done: boolean;
  date: string;
}

const CARDIO_ACTIVITIES = ['Running', 'Cycling', 'Swimming', 'Walking', 'Rowing', 'Elliptical'];
const SLEEP_HOURS = Array.from({ length: 25 }, (_, i) => i * 0.5).filter((h) => h >= 3 && h <= 12);
// Timezone-safe YYYY-MM-DD from a local Date (avoids toISOString UTC shift)
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Dashboard() {
  const { clientId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<{ icon: string; name: string; date: string }[]>([]);
  const [totalBadges, setTotalBadges] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [progressWidgets, setProgressWidgets] = useState(defaultProgressWidgets);
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const [draftWidgets, setDraftWidgets] = useState(defaultProgressWidgets);
  const [draggedWidget, setDraggedWidget] = useState<{ label: string; from: 'displayed' | 'hidden' } | null>(null);

  // Load latest body weight + earned badges on mount
  useEffect(() => {
    if (!clientId) return;
    // Latest body weight
    supabase
      .from('body_weight_logs')
      .select('weight_kg, logged_at')
      .eq('client_id', clientId)
      .order('logged_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          const { weight_kg, logged_at } = data[0];
          const dateLabel = new Date(logged_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
          setProgressWidgets((prev) =>
            prev.map((w) => w.label === 'Body Weight' ? { ...w, value: Number(weight_kg), date: dateLabel } : w)
          );
        }
      });
    // Top 3 earned badges + total count
    Promise.all([
      supabase
        .from('client_badges')
        .select('earned_at, badges(name, icon_url)')
        .eq('client_id', clientId)
        .order('earned_at', { ascending: false })
        .limit(3),
      supabase.from('badges').select('id', { count: 'exact', head: true }),
    ]).then(([earnedRes, totalRes]) => {
      if (earnedRes.data) {
        setEarnedBadges(
          earnedRes.data.map((r: any) => ({
            icon: r.badges?.icon_url ?? '🏅',
            name: r.badges?.name ?? 'Badge',
            date: new Date(r.earned_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
          }))
        );
      }
      setTotalBadges(totalRes.count ?? 0);
    });
  }, [clientId]);

  // Load workout definitions from the client's active program / current phase
  useEffect(() => {
    if (!clientId) return;
    async function loadWorkoutDefs() {
      const { data: programs } = await supabase
        .from('client_programs')
        .select('id')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .order('is_main', { ascending: false })
        .limit(1);
      const programId = programs?.[0]?.id;
      if (!programId) return;

      const today = toDateStr(new Date());
      const { data: phases } = await supabase
        .from('training_phases')
        .select('id, start_date, end_date, order_index')
        .eq('client_program_id', programId)
        .order('order_index', { ascending: true });
      const phase =
        phases?.find((p) => p.start_date && p.end_date && p.start_date <= today && p.end_date >= today) ??
        phases?.[0];
      if (!phase) return;

      const { data: defs } = await supabase
        .from('workout_definitions')
        .select('id, name')
        .eq('training_phase_id', phase.id)
        .order('id', { ascending: true });
      if (defs) setWorkoutDefs(defs);
    }
    loadWorkoutDefs();
  }, [clientId]);

  // Calendar / date navigation
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);
  const [calCursor, setCalCursor] = useState(() => new Date());
  const calRef = useRef<HTMLDivElement>(null);

  // Shared modal fields
  const [modalDate, setModalDate] = useState(() => toDateStr(new Date()));
  const [repeat, setRepeat] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<TaskType[]>([]);

  // Per-type panel state
  const [workoutProgram, setWorkoutProgram] = useState('');
  const [workoutDefId, setWorkoutDefId] = useState<number | null>(null);
  const [workoutDefs, setWorkoutDefs] = useState<{ id: number; name: string }[]>([]);
  const [cardioActivity, setCardioActivity] = useState(CARDIO_ACTIVITIES[0]);
  const [cardioTarget, setCardioTarget] = useState<'none' | 'distance' | 'time' | 'custom'>('none');
  const [cardioTargetValue, setCardioTargetValue] = useState('');
  const [bodyStatsEnabled, setBodyStatsEnabled] = useState(false);
  const [photosEnabled, setPhotosEnabled] = useState(false);
  const [bedtime, setBedtime] = useState('22:30');
  const [sleepHours, setSleepHours] = useState(8);

  const [activePanel, setActivePanel] = useState<TaskType>('workout');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowModal(false);
    }
    if (showModal) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showModal]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    }
    if (showCalendar) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showCalendar]);

  const todayStr = toDateStr(new Date());

  // Turn a calendar_events row into the UI Task shape.
  function rowToTask(row: {
    id: number;
    event_type: string | null;
    scheduled_date: string;
    completed_at: string | null;
    notes: string | null;
  }): Task {
    const type = eventTypeToTaskType(row.event_type);
    const opt = ADD_OPTIONS.find((o) => o.id === type)!;
    return {
      id: `db-${row.id}`,
      dbId: row.id,
      type,
      label: row.notes || opt.label,
      done: row.completed_at != null,
      date: row.scheduled_date,
    };
  }

  // Load events for the selected date whenever it changes.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // Guard against a request that never resolves (e.g. bad URL, network stall)
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase request timed out after 10s')), 10000)
        );
        const query = supabase
          .from('calendar_events')
          .select('id, event_type, scheduled_date, completed_at, notes')
          .eq('client_id', clientId)
          .eq('scheduled_date', selectedDate)
          .order('id', { ascending: true });
        const { data, error } = (await Promise.race([query, timeout])) as Awaited<typeof query>;
        if (cancelled) return;
        if (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to load calendar_events:', error.message);
          setTasks([]);
        } else {
          setTasks((data ?? []).map(rowToTask));
        }
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error('Error loading calendar_events:', err);
        setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, clientId]);


  function formatHeader(dateStr: string) {
    if (dateStr === todayStr) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === toDateStr(yesterday)) return 'Yesterday';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === toDateStr(tomorrow)) return 'Tomorrow';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function stepDay(delta: number) {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(toDateStr(d));
    setCalCursor(new Date(d));
  }

  function goToday() {
    setSelectedDate(todayStr);
    setCalCursor(new Date());
    setShowCalendar(false);
  }

  function pickDate(dateStr: string) {
    setSelectedDate(dateStr);
    setShowCalendar(false);
  }

  function stepMonth(delta: number) {
    setCalCursor((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  }

  // Monday-first grid of dates (as YYYY-MM-DD) for the month shown by calCursor,
  // padded with leading/trailing days from adjacent months.
  function buildCalendarGrid() {
    const year = calCursor.getFullYear();
    const month = calCursor.getMonth();
    const first = new Date(year, month, 1);
    // JS: 0=Sun..6=Sat; convert to Monday-first offset
    const lead = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - lead);
    const cells: { date: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({
        date: toDateStr(d),
        inMonth: d.getMonth() === month,
      });
    }
    return cells;
  }

  function openModal() {
    setSelectedTypes([]);
    setActivePanel('workout');
    setModalDate(selectedDate);
    setRepeat(false);
    setWorkoutProgram('');
    setWorkoutDefId(null);
    setShowModal(true);
  }

  function toggleType(id: TaskType) {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
    setActivePanel(id);
  }

  // Computed wake time from bedtime + hours
  function computeWakeTime() {
    const [h, m] = bedtime.split(':').map(Number);
    const start = h * 60 + m;
    const end = (start + sleepHours * 60) % (24 * 60);
    const wh = Math.floor(end / 60);
    const wm = Math.round(end % 60);
    return `${String(wh).padStart(2, '0')}:${String(wm).padStart(2, '0')}`;
  }

  // Whether a given selected type has valid content to be added
  function typeIsValid(id: TaskType) {
    if (id === 'workout') return workoutProgram !== '';
    if (id === 'cardio') {
      if (cardioTarget === 'none') return true;
      return cardioTargetValue.trim() !== '';
    }
    if (id === 'body-stats') return bodyStatsEnabled;
    if (id === 'photos') return photosEnabled;
    if (id === 'sleep') return sleepHours > 0;
    return false;
  }

  const canAdd =
    selectedTypes.length > 0 && selectedTypes.every((t) => typeIsValid(t));

  function buildLabel(id: TaskType) {
    const opt = ADD_OPTIONS.find((o) => o.id === id)!;
    if (id === 'cardio') {
      const target =
        cardioTarget === 'none'
          ? ''
          : ` — ${cardioTargetValue}${cardioTarget === 'distance' ? ' km' : cardioTarget === 'time' ? ' min' : ''}`;
      return `${cardioActivity}${target}`;
    }
    if (id === 'workout' && workoutProgram) return workoutProgram;
    if (id === 'sleep') return `Sleep — ${sleepHours}h (wake ${computeWakeTime()})`;
    return opt.label;
  }

  async function handleAdd() {
    if (!canAdd) return;
    setShowModal(false);
    // NOTE: calendar_events.id has no DB default, so we generate a numeric id
    // client-side. Date.now()+index avoids collisions with Trainerize ids.
    const base = Date.now();
    const rows = selectedTypes.map((id, i) => ({
      id: base + i,
      client_id: clientId,
      event_type: EVENT_TYPE[id],
      scheduled_date: modalDate,
      notes: buildLabel(id),
      status: 'scheduled',
      completed_at: null,
      ...(id === 'workout' && workoutDefId ? { workout_def_id: workoutDefId } : {}),
    }));
    // Optimistic update
    const optimistic: Task[] = rows.map((r) => ({
      id: `db-${r.id}`,
      dbId: r.id,
      type: eventTypeToTaskType(r.event_type),
      label: r.notes,
      done: false,
      date: r.scheduled_date,
    }));
    if (modalDate === selectedDate) setTasks((prev) => [...prev, ...optimistic]);
    const { error } = await supabase.from('calendar_events').insert(rows);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add events:', error.message);
      // Roll back optimistic insert on failure
      if (modalDate === selectedDate) {
        const failedIds = new Set(optimistic.map((t) => t.dbId));
        setTasks((prev) => prev.filter((t) => !failedIds.has(t.dbId)));
      }
    }
  }

  async function toggleTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nowDone = !task.done;
    // Optimistic
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: nowDone } : t)));
    const { error } = await supabase
      .from('calendar_events')
      .update({
        completed_at: nowDone ? new Date().toISOString() : null,
        status: nowDone ? 'completed' : 'scheduled',
      })
      .eq('id', task.dbId);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update event:', error.message);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !nowDone } : t)));
    }
  }

  async function removeTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    // Optimistic
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', task.dbId);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete event:', error.message);
      setTasks((prev) => [...prev, task]);
    }
  }

  const visibleTasks = tasks.filter((t) => t.date === selectedDate);

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      {/* THINGS TO DO TODAY */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-jj-grey/30 dark:border-gray-700 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base sm:text-lg tracking-wide sm:tracking-widest text-gray-700 dark:text-gray-200 uppercase">
            Things To Do <span className="text-brand">{formatHeader(selectedDate)}</span>
          </h2>
          <div className="flex items-center gap-2 text-jj-blue">
            <button
              onClick={openModal}
              className="hover:text-jj-blue/70 p-1 rounded transition-colors"
              aria-label="Add activity"
            >
              <Plus size={16} />
            </button>

            {/* Jump to today */}
            <button
              onClick={goToday}
              disabled={selectedDate === todayStr}
              className={`hidden sm:block text-xs font-heading tracking-widest uppercase px-2 py-1 rounded transition-colors ${selectedDate === todayStr
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:text-jj-blue/70'
                }`}
              aria-label="Go to today"
            >
              Today
            </button>

            {/* Date picker */}
            <div className="relative" ref={calRef}>
              <button
                onClick={() => setShowCalendar((v) => !v)}
                className={`hover:text-jj-blue/70 p-1 rounded transition-colors ${showCalendar ? 'text-brand' : ''}`}
                aria-label="Open calendar"
              >
                <Calendar size={16} />
              </button>

              {showCalendar && (
                <div className="absolute right-0 top-8 z-50 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-jj-grey/20 dark:border-gray-700 p-3">
                  {/* month header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <button onClick={() => stepMonth(-1)} className="p-1 text-jj-grey hover:text-jj-blue">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {calCursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => stepMonth(1)} className="p-1 text-jj-grey hover:text-jj-blue">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  {/* weekday headers (Monday-first) */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                      <div key={d} className="text-center text-[11px] font-medium text-jj-grey dark:text-gray-500">
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* day grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {buildCalendarGrid().map((cell) => {
                      const isSelected = cell.date === selectedDate;
                      const isTodayCell = cell.date === todayStr;
                      return (
                        <button
                          key={cell.date}
                          onClick={() => pickDate(cell.date)}
                          className={`h-8 text-sm rounded-lg transition-colors ${isSelected
                              ? 'bg-brand text-white font-medium'
                              : isTodayCell
                                ? 'text-brand font-medium hover:bg-jj-neutral dark:hover:bg-gray-700'
                                : cell.inMonth
                                  ? 'text-gray-700 dark:text-gray-300 hover:bg-jj-neutral dark:hover:bg-gray-700'
                                  : 'text-jj-grey/40 dark:text-gray-600 hover:bg-jj-neutral dark:hover:bg-gray-700'
                            }`}
                        >
                          {Number(cell.date.slice(8, 10))}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Day step */}
            <button onClick={() => stepDay(-1)} className="hover:text-jj-blue/70 p-1" aria-label="Previous day"><ChevronLeft size={16} /></button>
            <button onClick={() => stepDay(1)} className="hover:text-jj-blue/70 p-1" aria-label="Next day"><ChevronRight size={16} /></button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-jj-grey dark:text-gray-500 py-4 text-center">Loading…</p>
        ) : visibleTasks.length === 0 ? (
          <p className="text-sm text-jj-grey dark:text-gray-500 py-4 text-center">
            Nothing added yet — hit <span className="text-brand font-medium">+</span> to add activities.
          </p>
        ) : (
          <div className="space-y-1">
            {visibleTasks.map((task) => {
              const opt = ADD_OPTIONS.find((o) => o.id === task.type)!;
              const Icon = opt.icon;
              return (
                <div key={task.id} className="flex items-center gap-3 py-2.5 border-b border-jj-grey/10 dark:border-gray-700 last:border-0">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${task.done ? 'bg-brand border-brand' : 'border-jj-grey dark:border-gray-600'
                      }`}
                  >
                    {task.done && <Check size={14} className="text-white" />}
                  </button>
                  <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-brand" />
                  </div>
                  <span className={`flex-1 text-sm font-medium transition-colors ${task.done ? 'line-through text-jj-grey dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'
                    }`}>
                    {task.label}
                  </span>
                  <button
                    onClick={() => removeTask(task.id)}
                    className="text-jj-grey/40 hover:text-jj-coral dark:hover:text-red-400 transition-colors p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PROGRESS */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-jj-grey/30 dark:border-gray-700 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg tracking-widest text-gray-700 dark:text-gray-200 uppercase">
            Progress
          </h2>
          <div className="flex gap-2 text-jj-blue">
            <button><TrendingUp size={18} /></button>
            <button onClick={() => { setDraftWidgets(progressWidgets); setShowWidgetConfig(true); }}><Settings size={18} /></button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {progressWidgets.filter((w) => !w.hidden).map((w) => (
            <div
              key={w.label}
              className="border border-jj-grey/20 dark:border-gray-700 rounded-xl p-3"
            >
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{w.label}</p>
              {w.value !== null ? (
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-800 dark:text-white">{w.value}</span>
                  <span className="text-sm text-jj-grey dark:text-gray-500 ml-1">{w.unit}</span>
                </div>
              ) : (
                <p className="text-jj-grey/40 dark:text-gray-700 text-xl mt-3">···</p>
              )}
            </div>
          ))}
        </div>

        {/* ACHIEVEMENTS */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-jj-grey/30 dark:border-gray-700 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg tracking-widest text-gray-700 dark:text-gray-200 uppercase">
        Achievements
        </h2>
        <Link href="/badges" className="text-xs font-medium text-jj-blue hover:underline">
        View All
        </Link>
        </div>
        <p className="text-sm text-jj-grey dark:text-gray-400 mb-4">You&apos;ve earned {earnedBadges.length} of {totalBadges} badges</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {earnedBadges.map((a) => (
        <div key={a.name} className="border-2 border-brand rounded-xl p-3 text-center bg-white dark:bg-gray-800">
        <div className="text-3xl mb-2">{a.icon}</div>
        <p className="text-sm font-bold text-gray-800 dark:text-white">{a.name}</p>
        <p className="text-xs text-brand font-semibold mt-1">{a.date}</p>
        </div>
        ))}
        </div>
        </div>
        
        {/* CONFIGURE WIDGETS MODAL */}
        {showWidgetConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowWidgetConfig(false)}
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg tracking-widest text-gray-700 dark:text-gray-200 uppercase">
                  Configure dashboard widgets
                </h3>
                <button onClick={() => setShowWidgetConfig(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-jj-grey dark:text-gray-400 mb-2 uppercase tracking-wide">Displayed Tiles</p>
                  <div
                    className="min-h-[140px] border border-jj-grey/20 dark:border-gray-700 rounded-lg p-2 space-y-1"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (!draggedWidget) return;
                      setDraftWidgets((prev) => prev.map((w) => (w.label === draggedWidget.label ? { ...w, hidden: false } : w)));
                      setDraggedWidget(null);
                    }}
                  >
                    {draftWidgets.filter((w) => !w.hidden).map((w) => (
                      <div
                        key={w.label}
                        draggable
                        onDragStart={() => setDraggedWidget({ label: w.label, from: 'displayed' })}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.stopPropagation();
                          if (!draggedWidget) return;
                          setDraftWidgets((prev) => {
                            const moved = prev.find((x) => x.label === draggedWidget.label);
                            if (!moved) return prev;
                            const rest = prev.filter((x) => x.label !== draggedWidget.label);
                            const targetIndex = rest.findIndex((x) => x.label === w.label);
                            const updated = { ...moved, hidden: false };
                            rest.splice(targetIndex, 0, updated);
                            return rest;
                          });
                          setDraggedWidget(null);
                        }}
                        className="flex items-center gap-2 px-2 py-2 bg-white dark:bg-gray-800 border border-jj-grey/20 dark:border-gray-700 rounded-lg cursor-move text-sm text-gray-700 dark:text-gray-200"
                      >
                        <Menu size={14} className="text-jj-grey" />
                        {w.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-jj-grey dark:text-gray-400 mb-2 uppercase tracking-wide">Hidden Tiles</p>
                  <div
                    className="min-h-[140px] border border-dashed border-jj-grey/30 dark:border-gray-700 rounded-lg p-2 space-y-1"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (!draggedWidget) return;
                      setDraftWidgets((prev) => prev.map((w) => (w.label === draggedWidget.label ? { ...w, hidden: true } : w)));
                      setDraggedWidget(null);
                    }}
                  >
                    {draftWidgets.filter((w) => w.hidden).length === 0 ? (
                      <p className="text-xs text-jj-grey/50 text-center mt-6">Drag tiles here to hide them</p>
                    ) : (
                      draftWidgets.filter((w) => w.hidden).map((w) => (
                        <div
                          key={w.label}
                          draggable
                          onDragStart={() => setDraggedWidget({ label: w.label, from: 'hidden' })}
                          className="flex items-center gap-2 px-2 py-2 bg-white dark:bg-gray-800 border border-jj-grey/20 dark:border-gray-700 rounded-lg cursor-move text-sm text-gray-500 dark:text-gray-400"
                        >
                          <Menu size={14} className="text-jj-grey" />
                          {w.label}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowWidgetConfig(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-jj-grey/30 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setProgressWidgets(draftWidgets); setShowWidgetConfig(false); }}
                  className="px-4 py-2 text-sm rounded-lg bg-jj-blue text-white"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD ACTIVITY MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          <div
            ref={modalRef}
            className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-jj-grey/20 dark:border-gray-700 overflow-hidden"
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-jj-grey/15 dark:border-gray-700">
              <h3 className="font-heading text-base tracking-widest text-gray-700 dark:text-gray-100 uppercase">
                Add Activity
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAdd}
                  disabled={!canAdd}
                  className={`text-sm font-heading tracking-widest uppercase px-4 py-1.5 rounded-lg transition-colors ${canAdd
                      ? 'bg-brand text-white hover:bg-brand/90'
                      : 'bg-jj-grey/20 text-jj-grey cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                    }`}
                >
                  Add
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-jj-grey hover:text-jj-coral transition-colors p-1"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* shared date + repeat */}
            <div className="flex items-center justify-between px-5 py-3 bg-jj-neutral/50 dark:bg-gray-800/50 border-b border-jj-grey/15 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-jj-blue" />
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="text-sm bg-transparent text-gray-700 dark:text-gray-200 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setRepeat((v) => !v)}
                className={`text-xs font-medium transition-colors ${repeat ? 'text-brand' : 'text-jj-blue hover:text-jj-blue/70'
                  }`}
              >
                {repeat ? '✓ Repeats' : 'Setup repeat option'}
              </button>
            </div>

            {/* body: left types / right panel */}
            <div className="flex" style={{ minHeight: '320px' }}>
              {/* left: multi-select type list */}
              <div className="w-52 border-r border-jj-grey/15 dark:border-gray-700 py-2 shrink-0">
                {ADD_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const checked = selectedTypes.includes(option.id);
                  const active = activePanel === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleType(option.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-jj-neutral dark:bg-gray-800' : 'hover:bg-jj-neutral/60 dark:hover:bg-gray-800/60'
                        }`}
                    >
                      <span
                        className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${checked ? 'bg-brand border-brand' : 'border-jj-grey dark:border-gray-600'
                          }`}
                      >
                        {checked && <Check size={12} className="text-white" />}
                      </span>
                      <Icon size={16} className={active ? 'text-brand' : 'text-jj-grey dark:text-gray-400'} />
                      <span className={`text-sm font-medium ${active ? 'text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* right: active type panel */}
              <div className="flex-1 p-5">
                {/* WORKOUT */}
                {activePanel === 'workout' && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Workout</p>
                    {workoutDefs.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                        No workouts found in your current training program.
                      </p>
                    ) : (
                      <>
                        <label className="flex items-center gap-3 p-3 rounded-lg border border-jj-grey/20 dark:border-gray-700 cursor-pointer">
                          <input
                            type="radio"
                            name="workoutSource"
                            checked={workoutProgram !== ''}
                            onChange={() => {
                              setWorkoutProgram(workoutDefs[0].name);
                              setWorkoutDefId(workoutDefs[0].id);
                            }}
                            className="accent-brand"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Select from current training program</span>
                        </label>
                        {workoutProgram && (
                          <select
                            value={workoutDefId ?? ''}
                            onChange={(e) => {
                              const def = workoutDefs.find((d) => String(d.id) === e.target.value);
                              if (def) { setWorkoutProgram(def.name); setWorkoutDefId(def.id); }
                            }}
                            className="mt-3 w-full text-sm rounded-lg border border-jj-grey/20 dark:border-gray-700 bg-transparent dark:bg-gray-800 px-3 py-2 text-gray-700 dark:text-gray-200"
                          >
                            {workoutDefs.map((d) => (
                              <option key={d.id} value={String(d.id)}>{d.name}</option>
                            ))}
                          </select>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* CARDIO */}
                {activePanel === 'cardio' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-jj-grey dark:text-gray-400 uppercase tracking-wide">Activity</label>
                      <select
                        value={cardioActivity}
                        onChange={(e) => setCardioActivity(e.target.value)}
                        className="mt-1 w-full text-sm rounded-lg border border-jj-grey/20 dark:border-gray-700 bg-transparent dark:bg-gray-800 px-3 py-2 text-gray-700 dark:text-gray-200"
                      >
                        {CARDIO_ACTIVITIES.map((a) => (
                          <option key={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-jj-grey dark:text-gray-400 uppercase tracking-wide">Target</label>
                      <div className="mt-2 space-y-2">
                        {([
                          ['none', 'None'],
                          ['distance', 'Distance (km)'],
                          ['time', 'Time (min)'],
                          ['custom', 'Add my own target'],
                        ] as const).map(([val, lbl]) => (
                          <label key={val} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="cardioTarget"
                              checked={cardioTarget === val}
                              onChange={() => setCardioTarget(val)}
                              className="accent-brand"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{lbl}</span>
                          </label>
                        ))}
                      </div>
                      {cardioTarget !== 'none' && (
                        <input
                          type="text"
                          value={cardioTargetValue}
                          onChange={(e) => setCardioTargetValue(e.target.value)}
                          placeholder={cardioTarget === 'distance' ? 'e.g. 5' : cardioTarget === 'time' ? 'e.g. 30' : 'Describe target'}
                          className="mt-2 w-full text-sm rounded-lg border border-jj-grey/20 dark:border-gray-700 bg-transparent dark:bg-gray-800 px-3 py-2 text-gray-700 dark:text-gray-200"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* BODY STATS */}
                {activePanel === 'body-stats' && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Body stats</p>
                    {!bodyStatsEnabled ? (
                      <div className="text-center py-8">
                        <Scale size={28} className="text-jj-grey/40 mx-auto mb-3" />
                        <p className="text-sm text-jj-grey dark:text-gray-500 mb-3">No body stats added yet.</p>
                        <button
                          onClick={() => setBodyStatsEnabled(true)}
                          className="text-sm text-jj-blue hover:text-jj-blue/70 font-medium"
                        >
                          + Add Body stats
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-jj-grey/20 dark:border-gray-700">
                        <Check size={16} className="text-brand" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Body stats entry queued for this date</span>
                      </div>
                    )}
                  </div>
                )}

                {/* PHOTOS */}
                {activePanel === 'photos' && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Photos</p>
                    {!photosEnabled ? (
                      <div className="text-center py-8">
                        <Camera size={28} className="text-jj-grey/40 mx-auto mb-3" />
                        <p className="text-sm text-jj-grey dark:text-gray-500 mb-3">No photos added yet.</p>
                        <button
                          onClick={() => setPhotosEnabled(true)}
                          className="text-sm text-jj-blue hover:text-jj-blue/70 font-medium"
                        >
                          + Add Photos
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-jj-grey/20 dark:border-gray-700">
                        <Check size={16} className="text-brand" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Progress photos entry queued for this date</span>
                      </div>
                    )}
                  </div>
                )}

                {/* SLEEP */}
                {activePanel === 'sleep' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-jj-grey dark:text-gray-400 uppercase tracking-wide">Bedtime</label>
                      <input
                        type="time"
                        value={bedtime}
                        onChange={(e) => setBedtime(e.target.value)}
                        className="mt-1 w-full text-sm rounded-lg border border-jj-grey/20 dark:border-gray-700 bg-transparent dark:bg-gray-800 px-3 py-2 text-gray-700 dark:text-gray-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-jj-grey dark:text-gray-400 uppercase tracking-wide">Sleeping for</label>
                      <select
                        value={sleepHours}
                        onChange={(e) => setSleepHours(Number(e.target.value))}
                        className="mt-1 w-full text-sm rounded-lg border border-jj-grey/20 dark:border-gray-700 bg-transparent dark:bg-gray-800 px-3 py-2 text-gray-700 dark:text-gray-200"
                      >
                        {SLEEP_HOURS.map((h) => (
                          <option key={h} value={h}>{h} hours</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-sm text-jj-grey dark:text-gray-500">
                      Wake time: <span className="text-brand font-medium">{computeWakeTime()}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

