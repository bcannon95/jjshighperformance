'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2, Dumbbell, Clock, X,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

type Phase = {
  id: number;
  name: string;
  order_index: number | null;
  week_count: number | null;
};

type Workout = {
  id: number;
  name: string;
  description: string | null;
  est_duration_min: number | null;
};

type WorkoutExercise = {
  id: number;
  exercise_name: string;
  sets: number | null;
  reps_min: number | null;
  reps_max: number | null;
  rest_seconds: number | null;
  notes: string | null;
  order_index: number | null;
  exercise_id: number | null;
};

type ExerciseSuggestion = { id: number; name: string; category: string | null };

const INPUT =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 ' +
  'px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand';

// ── Component ────────────────────────────────────────────────────────────────

interface ProgramBuilderProps {
  clientProgramId: number;
  programName: string;
  clientName: string;
  onBack: () => void;
}

export default function ProgramBuilder({
  clientProgramId,
  programName,
  clientName,
  onBack,
}: ProgramBuilderProps) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  // workoutsMap: phaseId → Workout[] | 'loading'
  const [workoutsMap, setWorkoutsMap] = useState<Map<number, Workout[] | 'loading'>>(new Map());
  // exercisesMap: workoutId → WorkoutExercise[] | 'loading'
  const [exercisesMap, setExercisesMap] = useState<Map<number, WorkoutExercise[] | 'loading'>>(new Map());

  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<number>>(new Set());

  // Add phase
  const [addPhaseOpen, setAddPhaseOpen] = useState(false);
  const [addPhaseName, setAddPhaseName] = useState('');
  const [addPhaseSaving, setAddPhaseSaving] = useState(false);

  // Add workout
  const [addWorkoutPhaseId, setAddWorkoutPhaseId] = useState<number | null>(null);
  const [addWorkoutForm, setAddWorkoutForm] = useState({ name: '', description: '', est_duration_min: '' });
  const [addWorkoutSaving, setAddWorkoutSaving] = useState(false);
  const [addWorkoutError, setAddWorkoutError] = useState<string | null>(null);

  // Add exercise
  const [addExWorkoutId, setAddExWorkoutId] = useState<number | null>(null);
  const [addExForm, setAddExForm] = useState({
    exercise_name: '', exercise_id: '', sets: '', reps_min: '', reps_max: '', rest_seconds: '',
  });
  const [addExSaving, setAddExSaving] = useState(false);
  const [addExError, setAddExError] = useState<string | null>(null);
  const [exSuggestions, setExSuggestions] = useState<ExerciseSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load phases on mount ─────────────────────────────────────────────────

  useEffect(() => {
    loadPhases();
  }, [clientProgramId]);

  async function loadPhases() {
    setLoading(true);
    const res = await fetch(`/api/admin/client-programs/${clientProgramId}/phases`);
    const json = await res.json();
    setPhases(json.data ?? []);
    setLoading(false);
  }

  // ── Phase expand / workouts ──────────────────────────────────────────────

  async function togglePhase(phaseId: number) {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) { next.delete(phaseId); return next; }
      next.add(phaseId);
      return next;
    });
    if (!workoutsMap.has(phaseId)) {
      setWorkoutsMap((prev) => new Map(prev).set(phaseId, 'loading'));
      const res = await fetch(`/api/admin/phases/${phaseId}/workouts`);
      const json = await res.json();
      setWorkoutsMap((prev) => new Map(prev).set(phaseId, json.data ?? []));
    }
  }

  // ── Workout expand / exercises ───────────────────────────────────────────

  async function toggleWorkout(workoutId: number) {
    setExpandedWorkouts((prev) => {
      const next = new Set(prev);
      if (next.has(workoutId)) { next.delete(workoutId); return next; }
      next.add(workoutId);
      return next;
    });
    if (!exercisesMap.has(workoutId)) {
      setExercisesMap((prev) => new Map(prev).set(workoutId, 'loading'));
      const res = await fetch(`/api/admin/workouts/${workoutId}/exercises`);
      const json = await res.json();
      setExercisesMap((prev) => new Map(prev).set(workoutId, json.data ?? []));
    }
  }

  // ── Add phase ────────────────────────────────────────────────────────────

  async function handleAddPhase(e: React.FormEvent) {
    e.preventDefault();
    if (!addPhaseName.trim()) return;
    setAddPhaseSaving(true);
    const res = await fetch(`/api/admin/client-programs/${clientProgramId}/phases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addPhaseName.trim() }),
    });
    const json = await res.json();
    if (res.ok) {
      setPhases((prev) => [...prev, json.data]);
      setAddPhaseName('');
      setAddPhaseOpen(false);
    }
    setAddPhaseSaving(false);
  }

  async function deletePhase(phaseId: number) {
    if (!confirm('Delete this phase and all its workouts?')) return;
    await fetch(`/api/admin/phases/${phaseId}`, { method: 'DELETE' });
    setPhases((prev) => prev.filter((p) => p.id !== phaseId));
    setWorkoutsMap((prev) => { const m = new Map(prev); m.delete(phaseId); return m; });
    setExpandedPhases((prev) => { const s = new Set(prev); s.delete(phaseId); return s; });
  }

  // ── Add workout ──────────────────────────────────────────────────────────

  function openAddWorkout(phaseId: number) {
    setAddWorkoutPhaseId(phaseId);
    setAddWorkoutForm({ name: '', description: '', est_duration_min: '' });
    setAddWorkoutError(null);
  }

  async function handleAddWorkout(e: React.FormEvent) {
    e.preventDefault();
    if (!addWorkoutPhaseId) return;
    setAddWorkoutSaving(true);
    setAddWorkoutError(null);
    const res = await fetch(`/api/admin/phases/${addWorkoutPhaseId}/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addWorkoutForm),
    });
    const json = await res.json();
    if (!res.ok) { setAddWorkoutError(json.error ?? 'Failed'); setAddWorkoutSaving(false); return; }
    setWorkoutsMap((prev) => {
      const existing = prev.get(addWorkoutPhaseId);
      const list = Array.isArray(existing) ? existing : [];
      return new Map(prev).set(addWorkoutPhaseId, [...list, json.data]);
    });
    setAddWorkoutPhaseId(null);
    setAddWorkoutSaving(false);
  }

  async function deleteWorkout(phaseId: number, workoutId: number) {
    if (!confirm('Delete this workout and all its exercises?')) return;
    await fetch(`/api/admin/workouts/${workoutId}`, { method: 'DELETE' });
    setWorkoutsMap((prev) => {
      const existing = prev.get(phaseId);
      if (!Array.isArray(existing)) return prev;
      return new Map(prev).set(phaseId, existing.filter((w) => w.id !== workoutId));
    });
    setExpandedWorkouts((prev) => { const s = new Set(prev); s.delete(workoutId); return s; });
    setExercisesMap((prev) => { const m = new Map(prev); m.delete(workoutId); return m; });
  }

  // ── Add exercise ─────────────────────────────────────────────────────────

  function openAddExercise(workoutId: number) {
    setAddExWorkoutId(workoutId);
    setAddExForm({ exercise_name: '', exercise_id: '', sets: '', reps_min: '', reps_max: '', rest_seconds: '' });
    setAddExError(null);
    setExSuggestions([]);
  }

  async function searchExercises(query: string) {
    if (!query.trim()) { setExSuggestions([]); setShowSuggestions(false); return; }
    const { data } = await supabase
      .from('exercises')
      .select('id, name, category')
      .ilike('name', `%${query}%`)
      .limit(8);
    setExSuggestions((data as ExerciseSuggestion[]) ?? []);
    setShowSuggestions(true);
  }

  function handleExerciseNameChange(value: string) {
    setAddExForm((f) => ({ ...f, exercise_name: value, exercise_id: '' }));
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => searchExercises(value), 250);
  }

  function selectSuggestion(s: ExerciseSuggestion) {
    setAddExForm((f) => ({ ...f, exercise_name: s.name, exercise_id: String(s.id) }));
    setShowSuggestions(false);
  }

  async function handleAddExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!addExWorkoutId) return;
    setAddExSaving(true);
    setAddExError(null);
    const res = await fetch(`/api/admin/workouts/${addExWorkoutId}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...addExForm,
        exercise_id: addExForm.exercise_id ? parseInt(addExForm.exercise_id) : null,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setAddExError(json.error ?? 'Failed'); setAddExSaving(false); return; }
    setExercisesMap((prev) => {
      const existing = prev.get(addExWorkoutId);
      const list = Array.isArray(existing) ? existing : [];
      return new Map(prev).set(addExWorkoutId, [...list, json.data]);
    });
    setAddExWorkoutId(null);
    setAddExSaving(false);
  }

  async function deleteExercise(workoutId: number, exId: number) {
    await fetch(`/api/admin/workouts/${workoutId}/exercises/${exId}`, { method: 'DELETE' });
    setExercisesMap((prev) => {
      const existing = prev.get(workoutId);
      if (!Array.isArray(existing)) return prev;
      return new Map(prev).set(workoutId, existing.filter((e) => e.id !== exId));
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{programName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{clientName}</p>
        </div>
      </div>

      {/* Phases header + add */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Phases
        </p>
        <button
          onClick={() => { setAddPhaseOpen(true); setAddPhaseName(''); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-lg hover:opacity-90"
        >
          <Plus size={13} /> Add Phase
        </button>
      </div>

      {/* Add phase inline form */}
      {addPhaseOpen && (
        <form
          onSubmit={handleAddPhase}
          className="flex gap-2 items-center p-3 rounded-xl border border-brand/30 bg-brand/5 dark:bg-brand/10"
        >
          <input
            autoFocus
            required
            value={addPhaseName}
            onChange={(e) => setAddPhaseName(e.target.value)}
            placeholder="Phase name…"
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={addPhaseSaving}
            className="px-3 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {addPhaseSaving ? 'Adding…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => setAddPhaseOpen(false)}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </form>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && phases.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No phases yet. Add a phase to start building this program.
          </p>
        </div>
      )}

      {/* Phases list */}
      <div className="space-y-3">
        {phases.map((phase) => {
          const phaseOpen = expandedPhases.has(phase.id);
          const workouts = workoutsMap.get(phase.id);
          const workoutList = Array.isArray(workouts) ? workouts : [];

          return (
            <div
              key={phase.id}
              className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
            >
              {/* Phase header */}
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                >
                  {phaseOpen
                    ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {phase.name}
                  </span>
                  {Array.isArray(workouts) && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {workoutList.length} workout{workoutList.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => deletePhase(phase.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                  title="Delete phase"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Workouts */}
              {phaseOpen && (
                <div className="border-t border-jj-grey/10 dark:border-gray-800">
                  {workouts === 'loading' && (
                    <div className="px-4 py-3 space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  )}

                  {Array.isArray(workouts) && workoutList.length === 0 && (
                    <p className="px-6 py-3 text-sm text-gray-400 dark:text-gray-500">
                      No workouts yet.
                    </p>
                  )}

                  {Array.isArray(workouts) && workoutList.map((workout) => {
                    const workoutOpen = expandedWorkouts.has(workout.id);
                    const exercises = exercisesMap.get(workout.id);
                    const exerciseList = Array.isArray(exercises) ? exercises : [];

                    return (
                      <div key={workout.id} className="border-b border-jj-grey/10 dark:border-gray-800 last:border-0">
                        {/* Workout row */}
                        <div className="flex items-center gap-2 px-6 py-2.5">
                          <button
                            onClick={() => toggleWorkout(workout.id)}
                            className="flex items-center gap-2 flex-1 text-left min-w-0"
                          >
                            {workoutOpen
                              ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
                              : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                              {workout.name}
                            </span>
                            <span className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                              {workout.est_duration_min && (
                                <span className="flex items-center gap-1">
                                  <Clock size={11} /> {workout.est_duration_min}m
                                </span>
                              )}
                              {Array.isArray(exercises) && (
                                <span className="flex items-center gap-1">
                                  <Dumbbell size={11} /> {exerciseList.length}
                                </span>
                              )}
                            </span>
                          </button>
                          <button
                            onClick={() => deleteWorkout(phase.id, workout.id)}
                            className="p-1 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                            title="Delete workout"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Exercises */}
                        {workoutOpen && (
                          <div className="bg-gray-50 dark:bg-gray-800/50 px-6 pb-3 pt-1">
                            {exercises === 'loading' && (
                              <div className="space-y-1.5 py-2">
                                {[1, 2].map((i) => (
                                  <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                ))}
                              </div>
                            )}

                            {Array.isArray(exercises) && exerciseList.length === 0 && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 py-2">
                                No exercises yet.
                              </p>
                            )}

                            {Array.isArray(exercises) && exerciseList.map((ex, idx) => (
                              <div
                                key={ex.id}
                                className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                              >
                                <span className="text-xs text-gray-400 w-4 shrink-0">{idx + 1}</span>
                                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">
                                  {ex.exercise_name}
                                </span>
                                <span className="text-xs text-gray-400 shrink-0">
                                  {ex.sets ?? '—'}×{ex.reps_min ?? '—'}
                                  {ex.reps_max && ex.reps_max !== ex.reps_min ? `–${ex.reps_max}` : ''}
                                  {ex.rest_seconds ? ` · ${ex.rest_seconds}s` : ''}
                                </span>
                                <button
                                  onClick={() => deleteExercise(workout.id, ex.id)}
                                  className="p-1 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                                  title="Remove exercise"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}

                            {/* Add exercise button */}
                            {addExWorkoutId === workout.id ? (
                              <form
                                onSubmit={handleAddExercise}
                                className="mt-3 space-y-2 p-3 rounded-lg border border-brand/20 bg-white dark:bg-gray-900"
                              >
                                <div className="relative">
                                  <input
                                    autoFocus
                                    value={addExForm.exercise_name}
                                    onChange={(e) => handleExerciseNameChange(e.target.value)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                    placeholder="Exercise name…"
                                    className={INPUT}
                                    required
                                  />
                                  {showSuggestions && exSuggestions.length > 0 && (
                                    <div
                                      ref={suggestionsRef}
                                      className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                                    >
                                      {exSuggestions.map((s) => (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onMouseDown={() => selectSuggestion(s)}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                          <span className="flex-1 text-gray-900 dark:text-white truncate">{s.name}</span>
                                          {s.category && (
                                            <span className="text-xs text-gray-400 capitalize shrink-0">{s.category}</span>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sets</label>
                                    <input
                                      type="number" min="1" placeholder="4"
                                      value={addExForm.sets}
                                      onChange={(e) => setAddExForm((f) => ({ ...f, sets: e.target.value }))}
                                      className={INPUT}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Reps min</label>
                                    <input
                                      type="number" min="1" placeholder="8"
                                      value={addExForm.reps_min}
                                      onChange={(e) => setAddExForm((f) => ({ ...f, reps_min: e.target.value }))}
                                      className={INPUT}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Reps max</label>
                                    <input
                                      type="number" min="1" placeholder="10"
                                      value={addExForm.reps_max}
                                      onChange={(e) => setAddExForm((f) => ({ ...f, reps_max: e.target.value }))}
                                      className={INPUT}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Rest (s)</label>
                                    <input
                                      type="number" min="0" placeholder="90"
                                      value={addExForm.rest_seconds}
                                      onChange={(e) => setAddExForm((f) => ({ ...f, rest_seconds: e.target.value }))}
                                      className={INPUT}
                                    />
                                  </div>
                                </div>
                                {addExError && <p className="text-xs text-red-500">{addExError}</p>}
                                <div className="flex gap-2">
                                  <button
                                    type="submit"
                                    disabled={addExSaving}
                                    className="px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
                                  >
                                    {addExSaving ? 'Adding…' : 'Add Exercise'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAddExWorkoutId(null)}
                                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <button
                                onClick={() => openAddExercise(workout.id)}
                                className="mt-2 flex items-center gap-1 text-xs text-brand hover:underline"
                              >
                                <Plus size={12} /> Add exercise
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add workout */}
                  {Array.isArray(workouts) && (
                    addWorkoutPhaseId === phase.id ? (
                      <form
                        onSubmit={handleAddWorkout}
                        className="px-4 pb-3 pt-2 space-y-2 border-t border-jj-grey/10 dark:border-gray-800"
                      >
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Workout name *</label>
                            <input
                              autoFocus
                              required
                              value={addWorkoutForm.name}
                              onChange={(e) => setAddWorkoutForm((f) => ({ ...f, name: e.target.value }))}
                              className={INPUT}
                              placeholder="e.g. Upper Body A"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Duration (min)</label>
                            <input
                              type="number" min="1" placeholder="60"
                              value={addWorkoutForm.est_duration_min}
                              onChange={(e) => setAddWorkoutForm((f) => ({ ...f, est_duration_min: e.target.value }))}
                              className={INPUT}
                            />
                          </div>
                        </div>
                        {addWorkoutError && <p className="text-xs text-red-500">{addWorkoutError}</p>}
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={addWorkoutSaving}
                            className="px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
                          >
                            {addWorkoutSaving ? 'Adding…' : 'Add Workout'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddWorkoutPhaseId(null)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="px-4 pb-3 pt-2 border-t border-jj-grey/10 dark:border-gray-800">
                        <button
                          onClick={() => openAddWorkout(phase.id)}
                          className="flex items-center gap-1 text-xs text-brand hover:underline"
                        >
                          <Plus size={12} /> Add workout
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
