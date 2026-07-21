'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Play, ChevronRight, Tag, Dumbbell, Clock, CheckCircle2 } from 'lucide-react';

type ClientProgram = {
  id: number;
  name: string;
  is_main: boolean;
  status: string | null;
};

type TrainingPhase = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  order_index: number | null;
};

type WorkoutDefinition = {
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
  video_url: string | null;
  thumbnail_url: string | null;
};

export default function TrainingPage() {
  const { clientId } = useAuth();
  const [programs, setPrograms] = useState<ClientProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [phases, setPhases] = useState<TrainingPhase[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingComplete, setTogglingComplete] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    async function loadPrograms() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('client_programs')
          .select('id, name, is_main, status')
          .eq('client_id', clientId)
          .eq('status', 'active')
          .order('is_main', { ascending: false })
          .order('id', { ascending: true });
        if (cancelled) return;
        if (error) throw error;
        const list = data ?? [];
        setPrograms(list);
        const main = list.find((p) => p.is_main) ?? list[0];
        if (main) setSelectedProgramId(main.id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load programs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPrograms();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!selectedProgramId) return;
    let cancelled = false;
    async function loadPhases() {
      try {
        const { data, error } = await supabase
          .from('training_phases')
          .select('id, name, start_date, end_date, order_index')
          .eq('client_program_id', selectedProgramId)
          .order('order_index', { ascending: true });
        if (cancelled) return;
        if (error) throw error;
        const list = data ?? [];
        setPhases(list);
        const today = new Date().toISOString().slice(0, 10);
        const current = list.find(
          (p) => p.start_date && p.end_date && p.start_date <= today && p.end_date >= today
        );
        const pick = current ?? list[0];
        setSelectedPhaseId(pick ? pick.id : null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load phases');
      }
    }
    loadPhases();
    return () => {
      cancelled = true;
    };
  }, [selectedProgramId]);

  useEffect(() => {
    if (!selectedPhaseId) {
      setWorkouts([]);
      setSelectedWorkoutId(null);
      return;
    }
    let cancelled = false;
    async function loadWorkouts() {
      try {
        const { data, error } = await supabase
          .from('workout_definitions')
          .select('id, name, description, est_duration_min')
          .eq('training_phase_id', selectedPhaseId)
          .order('id', { ascending: true });
        if (cancelled) return;
        if (error) throw error;
        const list = data ?? [];
        setWorkouts(list);
        setSelectedWorkoutId(list.length > 0 ? list[0].id : null);

        const ids = list.map((w) => w.id);
        if (ids.length > 0) {
          const { data: logs } = await supabase
            .from('workout_logs')
            .select('workout_def_id')
            .eq('client_id', clientId)
            .in('workout_def_id', ids);
          if (!cancelled && logs) {
            setCompletedIds(new Set(logs.map((l) => l.workout_def_id)));
          }
        } else {
          setCompletedIds(new Set());
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load workouts');
      }
    }
    loadWorkouts();
    return () => {
      cancelled = true;
    };
  }, [selectedPhaseId]);

  useEffect(() => {
    if (!selectedWorkoutId) {
      setExercises([]);
      return;
    }
    let cancelled = false;
    async function loadExercises() {
      setExercisesLoading(true);
      setExpandedExercise(null);
      try {
        const { data, error } = await supabase
          .from('workout_exercises')
          .select(
            'id, exercise_name, sets, reps_min, reps_max, rest_seconds, notes, order_index, exercises(video_url, thumbnail_url)'
          )
          .eq('workout_def_id', selectedWorkoutId)
          .order('order_index', { ascending: true });
        if (cancelled) return;
        if (error) throw error;
        const mapped = (data ?? []).map((row: any) => ({
          id: row.id,
          exercise_name: row.exercise_name,
          sets: row.sets,
          reps_min: row.reps_min,
          reps_max: row.reps_max,
          rest_seconds: row.rest_seconds,
          notes: row.notes,
          order_index: row.order_index,
          video_url: row.exercises?.video_url ?? null,
          thumbnail_url: row.exercises?.thumbnail_url ?? null,
        }));
        setExercises(mapped);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load exercises');
      } finally {
        if (!cancelled) setExercisesLoading(false);
      }
    }
    loadExercises();
    return () => {
      cancelled = true;
    };
  }, [selectedWorkoutId]);

  const selectedPhase = phases.find((p) => p.id === selectedPhaseId) ?? null;
  const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId) ?? null;
  const isCompleted = selectedWorkoutId ? completedIds.has(selectedWorkoutId) : false;

  async function toggleWorkoutComplete() {
    if (!selectedWorkoutId || togglingComplete) return;
    setTogglingComplete(true);
    const wasCompleted = completedIds.has(selectedWorkoutId);
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (wasCompleted) next.delete(selectedWorkoutId);
      else next.add(selectedWorkoutId);
      return next;
    });
    try {
      if (wasCompleted) {
        const { error } = await supabase
          .from('workout_logs')
          .delete()
          .eq('client_id', clientId)
          .eq('workout_def_id', selectedWorkoutId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('workout_logs').insert({
          client_id: clientId,
          workout_def_id: selectedWorkoutId,
          completed_at: new Date().toISOString(),
          duration_min: selectedWorkout?.est_duration_min ?? null,
        });
        if (error) throw error;
      }
    } catch (e) {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (wasCompleted) next.add(selectedWorkoutId);
        else next.delete(selectedWorkoutId);
        return next;
      });
      // eslint-disable-next-line no-console
      console.error('Failed to update workout completion:', e instanceof Error ? e.message : e);
    } finally {
      setTogglingComplete(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-jj-grey dark:text-gray-400">Loading training program…</div>;
  }

  if (error && programs.length === 0) {
    return <div className="p-8 text-red-500">Couldn&apos;t load your training program: {error}</div>;
  }

  return (
    <div className="flex gap-6 p-6">
      <aside className="w-72 flex-shrink-0 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h2 className="text-sm font-semibold text-jj-grey dark:text-gray-400 mb-3">Training Program</h2>
          <div className="space-y-1">
            {programs.map((program) => (
              <button
                key={program.id}
                onClick={() => setSelectedProgramId(program.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${program.id === selectedProgramId
                    ? 'bg-jj-blue text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                <span className="truncate">{program.name}</span>
                {program.is_main && (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wide bg-brand text-black px-1.5 py-0.5 rounded flex-shrink-0">
                    Main
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {phases.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <h2 className="text-sm font-semibold text-jj-grey dark:text-gray-400 mb-3">Phase</h2>
            <div className="space-y-1">
              {phases.map((phase) => (
                <button
                  key={phase.id}
                  onClick={() => setSelectedPhaseId(phase.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${phase.id === selectedPhaseId
                      ? 'bg-jj-blue text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  {phase.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h2 className="text-sm font-semibold text-jj-grey dark:text-gray-400 mb-3">Workouts</h2>
          {workouts.length === 0 ? (
            <p className="text-sm text-gray-400">No workouts in this phase yet.</p>
          ) : (
            <div className="space-y-1">
              {workouts.map((workout) => (
                <button
                  key={workout.id}
                  onClick={() => setSelectedWorkoutId(workout.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${workout.id === selectedWorkoutId
                      ? 'bg-jj-blue text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  {completedIds.has(workout.id) ? (
                    <CheckCircle2 size={16} className="text-brand flex-shrink-0" />
                  ) : (
                    <span className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="truncate">{workout.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 space-y-6">
        {!selectedWorkout ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center text-gray-400">
            Select a workout to get started.
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{selectedWorkout.name}</h1>
                  {selectedPhase && (
                    <p className="text-sm text-jj-grey dark:text-gray-400 mt-1">{selectedPhase.name}</p>
                  )}
                </div>
                <button
                  onClick={toggleWorkoutComplete}
                  disabled={togglingComplete}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${isCompleted
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-jj-blue text-white hover:opacity-90'
                    }`}
                >
                  <CheckCircle2 size={16} />
                  {isCompleted ? 'Completed' : 'Mark Complete'}
                </button>
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm text-jj-grey dark:text-gray-400">
                {selectedWorkout.est_duration_min && (
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {selectedWorkout.est_duration_min} min
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Dumbbell size={14} /> {exercises.length} exercise{exercises.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {selectedWorkout.description && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h2 className="text-sm font-semibold text-jj-grey dark:text-gray-400 mb-2 flex items-center gap-2">
                  <Tag size={14} /> Instructions
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {selectedWorkout.description}
                </p>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              <h2 className="text-sm font-semibold text-jj-grey dark:text-gray-400 p-6 pb-0">Exercises</h2>
              {exercisesLoading ? (
                <p className="text-sm text-gray-400 p-6">Loading exercises…</p>
              ) : exercises.length === 0 ? (
                <p className="text-sm text-gray-400 p-6">No exercises added yet for this workout.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700 mt-4">
                  {exercises.map((exercise) => (
                    <div key={exercise.id} className="overflow-hidden">
                      <button
                        onClick={() =>
                          setExpandedExercise(expandedExercise === exercise.id ? null : exercise.id)
                        }
                        className="w-full flex items-center gap-4 p-4 text-left"
                      >
                        <Dumbbell size={18} className="text-jj-blue flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {exercise.exercise_name}
                          </p>
                          <p className="text-xs text-jj-grey dark:text-gray-400">
                            {exercise.sets ?? '\u2013'} sets \u00d7 {exercise.reps_min ?? '\u2013'}
                            {exercise.reps_max && exercise.reps_max !== exercise.reps_min
                              ? `-${exercise.reps_max}`
                              : ''}{' '}
                            reps
                            {exercise.rest_seconds ? ` \u00b7 ${exercise.rest_seconds}s rest` : ''}
                          </p>
                        </div>
                        <ChevronRight
                          size={18}
                          className={`text-gray-400 flex-shrink-0 transition-transform ${expandedExercise === exercise.id ? 'rotate-90' : ''
                            }`}
                        />
                      </button>
                      {expandedExercise === exercise.id && (
                        <div className="px-4 pb-4">
                          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg aspect-video flex items-center justify-center mb-3">
                            <Play size={32} className="text-gray-400" />
                          </div>
                          {exercise.notes ? (
                            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                              {exercise.notes}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400">No additional notes for this exercise.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}