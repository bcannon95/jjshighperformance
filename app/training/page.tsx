'use client';
import { useState } from 'react';
import {
  Play,
  ChevronRight,
  Tag,
  Dumbbell,
  Clock,
  Flame,
  CheckCircle2,
} from 'lucide-react';

const programs = [
  {
    id: 1,
    name: "Jaimee's Program",
    tag: 'MAIN',
    weeks: 12,
    days: 4,
    description: 'Full body strength and conditioning program',
  },
];

const workouts = [
  {
    id: 1,
    day: 'Day 1',
    name: 'Upper Body Strength',
    exercises: 6,
    duration: '45 min',
    calories: 320,
    completed: true,
  },
  {
    id: 2,
    day: 'Day 2',
    name: 'Lower Body Power',
    exercises: 5,
    duration: '50 min',
    calories: 380,
    completed: true,
  },
  {
    id: 3,
    day: 'Day 3',
    name: 'HIIT Cardio',
    exercises: 8,
    duration: '30 min',
    calories: 420,
    completed: false,
  },
  {
    id: 4,
    day: 'Day 4',
    name: 'Full Body Circuit',
    exercises: 7,
    duration: '55 min',
    calories: 400,
    completed: false,
  },
];

const exercises = [
  {
    name: 'Barbell Back Squat',
    sets: 4,
    reps: '8-10',
    rest: '90s',
    muscles: 'Quads, Glutes',
  },
  {
    name: 'Romanian Deadlift',
    sets: 3,
    reps: '10-12',
    rest: '90s',
    muscles: 'Hamstrings, Lower Back',
  },
  {
    name: 'Leg Press',
    sets: 3,
    reps: '12-15',
    rest: '60s',
    muscles: 'Quads, Glutes',
  },
  {
    name: 'Walking Lunges',
    sets: 3,
    reps: '12 each',
    rest: '60s',
    muscles: 'Quads, Glutes, Hamstrings',
  },
  {
    name: 'Leg Curl',
    sets: 3,
    reps: '12-15',
    rest: '60s',
    muscles: 'Hamstrings',
  },
];

export default function TrainingPage() {
  const [selectedProgram, setSelectedProgram] = useState(programs[0]);
  const [selectedWorkout, setSelectedWorkout] = useState(workouts[2]);

  return (
    <div className="flex h-full bg-gray-50">
      <div className="w-72 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            Training Programs
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {programs.map((program) => (
            <button
              key={program.id}
              onClick={() => setSelectedProgram(program)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedProgram.id === program.id
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-900">
                  {program.name}
                </span>
                {program.tag && (
                  <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    <Tag size={10} />
                    {program.tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{program.description}</p>
              <div className="flex gap-3 mt-3">
                <span className="text-xs text-gray-400">
                  {program.weeks} weeks
                </span>
                <span className="text-xs text-gray-400">
                  {program.days} days/week
                </span>
              </div>
            </button>
          ))}
        </div>
        <div className="border-t border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Workouts
          </p>
          <div className="space-y-2">
            {workouts.map((workout) => (
              <button
                key={workout.id}
                onClick={() => setSelectedWorkout(workout)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                  selectedWorkout.id === workout.id
                    ? 'bg-gray-900 text-white'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {workout.completed ? (
                  <CheckCircle2
                    size={16}
                    className={
                      selectedWorkout.id === workout.id
                        ? 'text-yellow-400'
                        : 'text-green-500'
                    }
                  />
                ) : (
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      selectedWorkout.id === workout.id
                        ? 'border-gray-400'
                        : 'border-gray-300'
                    }`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{workout.day}</p>
                  <p
                    className={`text-xs truncate ${
                      selectedWorkout.id === workout.id
                        ? 'text-gray-300'
                        : 'text-gray-500'
                    }`}
                  >
                    {workout.name}
                  </p>
                </div>
                <ChevronRight size={14} className="flex-shrink-0 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {selectedWorkout && (
          <>
            <div className="bg-white border-b border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    {selectedWorkout.day}
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedWorkout.name}
                  </h3>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-gray-900 rounded-xl font-semibold text-sm hover:bg-yellow-500 transition-colors">
                  <Play size={16} fill="currentColor" />
                  Start Workout
                </button>
              </div>
              <div className="flex gap-6 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Dumbbell size={15} className="text-gray-400" />
                  {selectedWorkout.exercises} exercises
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock size={15} className="text-gray-400" />
                  {selectedWorkout.duration}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Flame size={15} className="text-gray-400" />
                  {selectedWorkout.calories} kcal
                </div>
              </div>
            </div>

            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Exercises
              </h4>
              <div className="space-y-3">
                {exercises.map((exercise, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-yellow-400 font-bold text-sm">
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {exercise.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {exercise.muscles}
                      </p>
                    </div>
                    <div className="flex gap-6 text-center">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">
                          Sets
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          {exercise.sets}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">
                          Reps
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          {exercise.reps}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">
                          Rest
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          {exercise.rest}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
