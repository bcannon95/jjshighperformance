'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';

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

  const [showNewProgram, setShowNewProgram] = useState(false);
  const [progForm, setProgForm] = useState({ name: '', description: '' });
  const [progSaving, setProgSaving] = useState(false);
  const [progError, setProgError] = useState<string | null>(null);

  const [showNewExercise, setShowNewExercise] = useState(false);
  const [exForm, setExForm] = useState({ name: '', category: '', muscleGroups: '', equipment: '' });
  const [exSaving, setExSaving] = useState(false);
  const [exError, setExError] = useState<string | null>(null);

  type Question = { id: number; label: string; type: string; options: string };
  const [showNewForm, setShowNewForm] = useState(false);
  const [fName, setFName] = useState('');
  const [fQuestions, setFQuestions] = useState<Question[]>([]);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadContent() {
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

  useEffect(() => { loadContent(); }, []);

  const assignmentCounts = useMemo(() => {
    const map = new Map<number, number>();
    clientPrograms.forEach((cp) => {
      if (!cp.program_id) return;
      map.set(cp.program_id, (map.get(cp.program_id) ?? 0) + 1);
    });
    return map;
  }, [clientPrograms]);

  async function handleCreateProgram(e: React.FormEvent) {
    e.preventDefault();
    setProgSaving(true);
    setProgError(null);
    try {
      const res = await fetch('/api/admin/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create program');
      setShowNewProgram(false);
      setProgForm({ name: '', description: '' });
      await loadContent();
    } catch (err: unknown) {
      setProgError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setProgSaving(false);
    }
  }

  async function handleCreateExercise(e: React.FormEvent) {
    e.preventDefault();
    setExSaving(true); setExError(null);
    try {
      const { error } = await supabase.from('exercises').insert({
        name: exForm.name.trim(),
        category: exForm.category.trim() || null,
        muscle_groups: exForm.muscleGroups ? exForm.muscleGroups.split(',').map(s => s.trim()).filter(Boolean) : [],
        equipment: exForm.equipment ? exForm.equipment.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      if (error) throw error;
      setShowNewExercise(false);
      setExForm({ name: '', category: '', muscleGroups: '', equipment: '' });
      await loadContent();
    } catch (err: unknown) {
      setExError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setExSaving(false);
    }
  }

  async function handleCreateForm(e: React.FormEvent) {
    e.preventDefault();
    setFormSaving(true); setFormError(null);
    try {
      const questions = fQuestions.map(q => ({
        id: q.id,
        label: q.label,
        type: q.type,
        ...(q.options.trim() ? { options: q.options.split(',').map(s => s.trim()).filter(Boolean) } : {}),
      }));
      const { error } = await supabase.from('form_definitions').insert({
        name: fName.trim(),
        questions,
      });
      if (error) throw error;
      setShowNewForm(false);
      setFName(''); setFQuestions([]);
      await loadContent();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setFormSaving(false);
    }
  }

  function addQuestion() {
    setFQuestions(prev => [...prev, { id: Date.now(), label: '', type: 'text', options: '' }]);
  }
  function updateQuestion(id: number, field: keyof Question, value: string) {
    setFQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  }
  function removeQuestion(id: number) {
    setFQuestions(prev => prev.filter(q => q.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Content Library</h1>
        {activeTab === 'programs' && (
          <button
            onClick={() => { setProgForm({ name: '', description: '' }); setProgError(null); setShowNewProgram(true); }}
            className="rounded-lg bg-brand text-white text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            + New Program
          </button>
        )}
        {activeTab === 'exercises' && (
          <button
            onClick={() => { setExForm({ name: '', category: '', muscleGroups: '', equipment: '' }); setExError(null); setShowNewExercise(true); }}
            className="rounded-lg bg-brand text-white text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            + New Exercise
          </button>
        )}
        {activeTab === 'forms' && (
          <button
            onClick={() => { setFName(''); setFQuestions([]); setFormError(null); setShowNewForm(true); }}
            className="rounded-lg bg-brand text-white text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            + New Form
          </button>
        )}
      </div>

      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-4 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {activeTab === 'programs' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Program</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Created By</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Assigned</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
              {!loading && programs.map((program) => (
                <tr key={program.id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{program.name}</p>
                    {program.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {program.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {program.trainers
                      ? `${program.trainers.first_name ?? ''} ${program.trainers.last_name ?? ''}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {assignmentCounts.get(program.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {program.created_at ? new Date(program.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'exercises' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Exercise</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Muscle Groups</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Equipment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
              {!loading && exercises.map((exercise) => (
                <tr key={exercise.id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {exercise.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize hidden sm:table-cell">
                    {exercise.category ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {exercise.muscle_groups?.length ? exercise.muscle_groups.join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {exercise.equipment?.length ? exercise.equipment.join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'forms' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Form</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
              {!loading && forms.map((form) => {
                const questionCount = Array.isArray(form.questions) ? form.questions.length : 0;
                return (
                  <tr key={form.id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{form.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{questionCount}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                      {form.created_at ? new Date(form.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {loading && (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading content...</div>
        )}
        {!loading && activeTab === 'programs' && programs.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No programs yet.</div>
        )}
        {!loading && activeTab === 'exercises' && exercises.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No exercises found.</div>
        )}
        {!loading && activeTab === 'forms' && forms.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No forms found.</div>
        )}
      </div>

      {/* New Exercise modal */}
      {showNewExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Exercise</h2>
              <button onClick={() => setShowNewExercise(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateExercise} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" required value={exForm.name} onChange={e => setExForm({ ...exForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select value={exForm.category} onChange={e => setExForm({ ...exForm, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="">— Select —</option>
                  {['strength', 'cardio', 'flexibility', 'mobility', 'plyometric', 'core'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Muscle Groups <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                <input type="text" placeholder="e.g. chest, triceps, shoulders" value={exForm.muscleGroups} onChange={e => setExForm({ ...exForm, muscleGroups: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Equipment <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                <input type="text" placeholder="e.g. barbell, bench" value={exForm.equipment} onChange={e => setExForm({ ...exForm, equipment: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              {exError && <p className="text-sm text-red-600 dark:text-red-400">{exError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewExercise(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button type="submit" disabled={exSaving}
                  className="rounded-lg bg-brand text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-60">
                  {exSaving ? 'Creating…' : 'Create Exercise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Form modal */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Form</h2>
              <button onClick={() => setShowNewForm(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateForm} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 pb-4 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Form name *</label>
                  <input type="text" required value={fName} onChange={e => setFName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Questions *</label>
                    <button type="button" onClick={addQuestion}
                      className="text-xs text-brand hover:underline font-medium">
                      + Add question
                    </button>
                  </div>
                  {fQuestions.length === 0 && (
                    <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                      No questions yet — click &quot;Add question&quot; to start.
                    </p>
                  )}
                  <div className="space-y-3">
                    {fQuestions.map((q, i) => (
                      <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Q{i + 1}</span>
                          <button type="button" onClick={() => removeQuestion(q.id)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                        </div>
                        <input type="text" placeholder="Question label *" required value={q.label}
                          onChange={e => updateQuestion(q.id, 'label', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand" />
                        <select value={q.type} onChange={e => updateQuestion(q.id, 'type', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand">
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="yes_no">Yes / No</option>
                          <option value="select">Select (single)</option>
                          <option value="multiselect">Select (multiple)</option>
                        </select>
                        {(q.type === 'select' || q.type === 'multiselect') && (
                          <input type="text" placeholder="Options (comma-separated)" value={q.options}
                            onChange={e => updateQuestion(q.id, 'options', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
                <button type="button" onClick={() => setShowNewForm(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
                <button type="submit" disabled={formSaving || fQuestions.length === 0}
                  className="rounded-lg bg-brand text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-60">
                  {formSaving ? 'Creating…' : 'Create Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Program modal */}
      {showNewProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Program</h2>
              <button onClick={() => setShowNewProgram(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Program name *</label>
                <input
                  type="text"
                  required
                  value={progForm.name}
                  onChange={(e) => setProgForm({ ...progForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={progForm.description}
                  onChange={(e) => setProgForm({ ...progForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                />
              </div>

              {progError && <p className="text-sm text-red-600 dark:text-red-400">{progError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProgram(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={progSaving}
                  className="rounded-lg bg-brand text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-60"
                >
                  {progSaving ? 'Creating…' : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
