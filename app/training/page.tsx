'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, CheckCircle2, Circle, Clock, Dumbbell, Tag, Play } from 'lucide-react';

type ClientProgram   = { id: number; name: string; is_main: boolean; status: string | null };
type TrainingPhase   = { id: number; name: string; start_date: string | null; end_date: string | null; order_index: number | null };
type WorkoutDef      = { id: number; name: string; description: string | null; est_duration_min: number | null };
type WorkoutExercise = {
  id: number; exercise_name: string; sets: number | null;
  reps_min: number | null; reps_max: number | null; rest_seconds: number | null;
  notes: string | null; order_index: number | null; video_url: string | null; thumbnail_url: string | null;
};

export default function TrainingPage() {
  const { clientId } = useAuth();

  const [programs, setPrograms]             = useState<ClientProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [phases, setPhases]                 = useState<TrainingPhase[]>([]);
  const [selectedPhaseId, setSelectedPhaseId]     = useState<number | null>(null);
  const [workouts, setWorkouts]             = useState<WorkoutDef[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  const [exercises, setExercises]           = useState<WorkoutExercise[]>([]);
  const [completedIds, setCompletedIds]     = useState<Set<number>>(new Set());
  const [loading, setLoading]               = useState(true);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [togglingComplete, setTogglingComplete] = useState(false);
  const [expandedExId, setExpandedExId]     = useState<number | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('client_programs')
      .select('id, name, is_main, status')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('is_main', { ascending: false })
      .order('id', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        const list = data ?? [];
        setPrograms(list);
        const main = list.find(p => p.is_main) ?? list[0];
        if (main) setSelectedProgramId(main.id);
        setLoading(false);
      });
    return () => { cancelled = true };
  }, [clientId]);

  useEffect(() => {
    if (!selectedProgramId) return;
    let cancelled = false;
    supabase
      .from('training_phases')
      .select('id, name, start_date, end_date, order_index')
      .eq('client_program_id', selectedProgramId)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        const list = data ?? [];
        setPhases(list);
        const today = new Date().toISOString().slice(0, 10);
        const current = list.find(p => p.start_date && p.end_date && p.start_date <= today && p.end_date >= today);
        setSelectedPhaseId((current ?? list[0])?.id ?? null);
      });
    return () => { cancelled = true };
  }, [selectedProgramId]);

  useEffect(() => {
    if (!selectedPhaseId) { setWorkouts([]); setSelectedWorkoutId(null); return; }
    let cancelled = false;
    supabase
      .from('workout_definitions')
      .select('id, name, description, est_duration_min')
      .eq('training_phase_id', selectedPhaseId)
      .order('id', { ascending: true })
      .then(async ({ data }) => {
        if (cancelled) return;
        const list = data ?? [];
        setWorkouts(list);
        setSelectedWorkoutId(null);
        const ids = list.map(w => w.id);
        if (ids.length > 0) {
          const { data: logs } = await supabase
            .from('workout_logs')
            .select('workout_def_id')
            .eq('client_id', clientId)
            .in('workout_def_id', ids);
          if (!cancelled && logs) setCompletedIds(new Set(logs.map(l => l.workout_def_id)));
        } else {
          setCompletedIds(new Set());
        }
      });
    return () => { cancelled = true };
  }, [selectedPhaseId, clientId]);

  useEffect(() => {
    if (!selectedWorkoutId) { setExercises([]); return; }
    let cancelled = false;
    setExercisesLoading(true);
    setExpandedExId(null);
    supabase
      .from('workout_exercises')
      .select('id, exercise_name, sets, reps_min, reps_max, rest_seconds, notes, order_index, exercises(video_url, thumbnail_url)')
      .eq('workout_def_id', selectedWorkoutId)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setExercises((data ?? []).map((row: any) => ({
          id: row.id, exercise_name: row.exercise_name, sets: row.sets,
          reps_min: row.reps_min, reps_max: row.reps_max, rest_seconds: row.rest_seconds,
          notes: row.notes, order_index: row.order_index,
          video_url: row.exercises?.video_url ?? null,
          thumbnail_url: row.exercises?.thumbnail_url ?? null,
        })));
        setExercisesLoading(false);
      });
    return () => { cancelled = true };
  }, [selectedWorkoutId]);

  async function toggleComplete(workoutId: number, durationMin: number | null) {
    if (togglingComplete) return;
    setTogglingComplete(true);
    const wasCompleted = completedIds.has(workoutId);
    setCompletedIds(prev => {
      const next = new Set(prev);
      wasCompleted ? next.delete(workoutId) : next.add(workoutId);
      return next;
    });
    if (wasCompleted) {
      await supabase.from('workout_logs').delete().eq('client_id', clientId).eq('workout_def_id', workoutId);
    } else {
      await supabase.from('workout_logs').insert({ client_id: clientId, workout_def_id: workoutId, completed_at: new Date().toISOString(), duration_min: durationMin });
    }
    setTogglingComplete(false);
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const selectedWorkout = workouts.find(w => w.id === selectedWorkoutId) ?? null;
  const selectedPhase   = phases.find(p => p.id === selectedPhaseId) ?? null;
  const isCompleted     = selectedWorkoutId ? completedIds.has(selectedWorkoutId) : false;

  // ── Pill style helpers ────────────────────────────────────────────────────

  const pillActive = 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold';
  const pillIdle   = 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700';

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-full w-48 animate-pulse" />
        <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-full w-32 animate-pulse" />
        {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[60vh] text-center">
        <Dumbbell size={40} className="text-gray-200 dark:text-gray-700 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">No active training program</p>
        <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">Your trainer will assign one shortly.</p>
      </div>
    );
  }

  // ── Workout detail view (mobile full-screen) ───────────────────────────────

  if (selectedWorkout) {
    return (
      <div className="flex flex-col bg-jj-neutral dark:bg-gray-950 min-h-full">

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
          <button
            onClick={() => setSelectedWorkoutId(null)}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-900 dark:text-white truncate">{selectedWorkout.name}</h1>
            {selectedPhase && <p className="text-xs text-gray-400 truncate">{selectedPhase.name}</p>}
          </div>
          <button
            onClick={() => toggleComplete(selectedWorkout.id, selectedWorkout.est_duration_min)}
            disabled={togglingComplete}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold shrink-0 ${
              isCompleted
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-jj-blue text-white'
            }`}
          >
            <CheckCircle2 size={15} />
            {isCompleted ? 'Done' : 'Mark done'}
          </button>
        </div>

        {/* Meta */}
        <div className="px-4 py-3 flex items-center gap-4 text-xs text-gray-400 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          {selectedWorkout.est_duration_min && (
            <span className="flex items-center gap-1"><Clock size={13} /> {selectedWorkout.est_duration_min} min</span>
          )}
          <span className="flex items-center gap-1"><Dumbbell size={13} /> {exercises.length} exercise{exercises.length === 1 ? '' : 's'}</span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {selectedWorkout.description && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Tag size={12} /> Instructions
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {selectedWorkout.description}
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest px-4 pt-4 pb-2">Exercises</p>
            {exercisesLoading ? (
              <div className="p-4 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : exercises.length === 0 ? (
              <div className="px-4 pb-4 text-center py-6">
                <p className="text-sm text-gray-400">No exercises added for this workout yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {exercises.map((ex) => (
                  <div key={ex.id}>
                    <button
                      onClick={() => setExpandedExId(expandedExId === ex.id ? null : ex.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-jj-blue/10 flex items-center justify-center shrink-0">
                        <Dumbbell size={15} className="text-jj-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ex.exercise_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {ex.sets ?? '–'} sets × {ex.reps_min ?? '–'}{ex.reps_max && ex.reps_max !== ex.reps_min ? `–${ex.reps_max}` : ''} reps
                          {ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ''}
                        </p>
                      </div>
                      <span className={`text-gray-300 dark:text-gray-600 transition-transform ${expandedExId === ex.id ? 'rotate-90' : ''}`}>
                        ›
                      </span>
                    </button>
                    {expandedExId === ex.id && (
                      <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-800/50">
                        <div className="bg-gray-200 dark:bg-gray-800 rounded-xl aspect-video flex items-center justify-center mb-3">
                          <Play size={28} className="text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {ex.notes ?? 'No notes for this exercise.'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Workout list view ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-jj-neutral dark:bg-gray-950 min-h-full">

      {/* Program pills */}
      {programs.length > 1 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {programs.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProgramId(p.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm transition-colors ${p.id === selectedProgramId ? pillActive : pillIdle}`}
              >
                {p.name}
                {p.is_main && <span className="ml-1.5 text-[10px] opacity-60">Main</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Phase pills */}
      {phases.length > 0 && (
        <div className="px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {phases.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPhaseId(p.id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors ${p.id === selectedPhaseId ? pillActive : pillIdle}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Workout list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-2">
        {workouts.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center mt-2">
            <Dumbbell size={32} className="mx-auto text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-sm text-gray-400">No workouts in this phase yet.</p>
          </div>
        ) : (
          workouts.map((w, i) => {
            const done = completedIds.has(w.id);
            return (
              <button
                key={w.id}
                onClick={() => setSelectedWorkoutId(w.id)}
                className="w-full bg-white dark:bg-gray-900 rounded-2xl p-4 flex items-center gap-4 text-left active:opacity-80"
              >
                {/* Number / check */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {done
                    ? <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                    : <Circle size={20} className="text-gray-300 dark:text-gray-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm truncate ${done ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                    {w.name}
                  </p>
                  {w.est_duration_min && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock size={11} /> {w.est_duration_min} min
                    </p>
                  )}
                </div>
                <span className="text-gray-300 dark:text-gray-600 text-xl">›</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
