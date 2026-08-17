'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type ProgramRow = {
  id: number;
  name: string | null;
  description: string | null;
  created_at: string | null;
  trainers: { first_name: string | null; last_name: string | null } | null;
};

type ClientProgramLite = {
  program_id: number | null;
};

type ExerciseRow = {
  id: number;
  name: string | null;
  category: string | null;
  equipment: string[] | null;
  muscle_groups: string[] | null;
};

type FormRow = {
  id: number;
  name: string | null;
  questions: unknown;
  created_at: string | null;
};

const tabs = [
  { key: 'programs', label: 'Programs' },
  { key: 'exercises', label: 'Exercises' },
  { key: 'forms', label: 'Forms' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('programs');
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [clientPrograms, setClientPrograms] = useState<ClientProgramLite[]>([]);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [forms, setForms] = useState<FormRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [
        { data: programData },
        { data: clientProgramData },
        { data: exerciseData },
        { data: formData },
      ] = await Promise.all([
        supabase
          .from('programs')
          .select('id, name, description, created_at, trainers(first_name, last_name)')
          .order('created_at', { ascending: false }),
        supabase.from('client_programs').select('program_id'),
        supabase
          .from('exercises')
          .select('id, name, category, equipment, muscle_groups')
          .order('name', { ascending: true }),
        supabase
          .from('form_definitions')
          .select('id, name, questions, created_at')
          .order('created_at', { ascending: false }),
      ]);

      setPrograms((programData as unknown as ProgramRow[]) ?? []);
      setClientPrograms((clientProgramData as unknown as ClientProgramLite[]) ?? []);
      setExercises((exerciseData as unknown as ExerciseRow[]) ?? []);
      setForms((formData as unknown as FormRow[]) ?? []);
      setLoading(false);
    }

    load();
  }, []);

  const assignmentCounts = useMemo(() => {
    const map = new Map<number, number>();
    clientPrograms.forEach((cp) => {
      if (!cp.program_id) return;
      map.set(cp.program_id, (map.get(cp.program_id) ?? 0) + 1);
    });
    return map;
  }, [clientPrograms]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-jj-grey dark:text-white">
          Content Library
        </h1>
      </div>

      <div className="flex gap-1 rounded-lg bg-jj-neutral dark:bg-gray-800 p-1 mb-4 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-jj-grey dark:text-white shadow-sm'
                : 'text-jj-grey/60 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {activeTab === 'programs' && (
          <table className="w-full text-sm">
            <thead className="bg-jj-neutral dark:bg-gray-800 text-left text-jj-grey/60 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Program</th>
                <th className="px-4 py-3 font-medium">Created By</th>
                <th className="px-4 py-3 font-medium">Assigned Clients</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
              {!loading && programs.map((program) => (
                <tr key={program.id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-jj-grey dark:text-white">{program.name}</p>
                    {program.description && (
                      <p className="text-xs text-jj-grey/60 dark:text-gray-400 line-clamp-1">
                        {program.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                    {program.trainers
                      ? `${program.trainers.first_name ?? ''} ${program.trainers.last_name ?? ''}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                    {assignmentCounts.get(program.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                    {program.created_at
                      ? new Date(program.created_at).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'exercises' && (
          <table className="w-full text-sm">
            <thead className="bg-jj-neutral dark:bg-gray-800 text-left text-jj-grey/60 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Exercise</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Muscle Groups</th>
                <th className="px-4 py-3 font-medium">Equipment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
              {!loading && exercises.map((exercise) => (
                <tr key={exercise.id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-jj-grey dark:text-white">
                    {exercise.name}
                  </td>
                  <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400 capitalize">
                    {exercise.category ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                    {exercise.muscle_groups && exercise.muscle_groups.length > 0
                      ? exercise.muscle_groups.join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                    {exercise.equipment && exercise.equipment.length > 0
                      ? exercise.equipment.join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'forms' && (
          <table className="w-full text-sm">
            <thead className="bg-jj-neutral dark:bg-gray-800 text-left text-jj-grey/60 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Form</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
              {!loading && forms.map((form) => {
                const questionCount = Array.isArray(form.questions) ? form.questions.length : 0;
                return (
                  <tr key={form.id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-jj-grey dark:text-white">
                      {form.name}
                    </td>
                    <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                      {questionCount}
                    </td>
                    <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                      {form.created_at
                        ? new Date(form.created_at).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {loading && (
          <div className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
            Loading content...
          </div>
        )}

        {!loading && activeTab === 'programs' && programs.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
            No programs found.
          </div>
        )}

        {!loading && activeTab === 'exercises' && exercises.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
            No exercises found.
          </div>
        )}

        {!loading && activeTab === 'forms' && forms.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
            No forms found.
          </div>
        )}
      </div>
    </div>
  );
}
