'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { X, Clock, ChefHat, Utensils } from 'lucide-react';

type MealPlan = {
  id: number;
  name: string | null;
  goal_calories: number | null;
  goal_protein_g: number | null;
};

type MealPlanDay = {
  id: number;
  day_number: number;
};

type RecipeSummary = {
  id: number;
  name: string;
  image_url: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  serving_size: string | null;
};

type MealPlanMeal = {
  id: number;
  category: string;
  order_index: number | null;
  recipes: RecipeSummary | null;
};

type RecipeIngredient = {
  id: number;
  quantity: string | null;
  unit: string | null;
  name: string | null;
  order_index: number | null;
};

type RecipeDetail = RecipeSummary & {
  prep_minutes: number | null;
  cook_minutes: number | null;
  allergens: string[] | null;
  tags: string[] | null;
  directions: string[] | null;
};

const categoryStyles: Record<string, { bg: string; text: string }> = {
  Breakfast: { bg: 'bg-jj-orange/20', text: 'text-jj-orange' },
  Lunch: { bg: 'bg-jj-blue/20', text: 'text-jj-blue' },
  Snack: { bg: 'bg-brand/20', text: 'text-gray-700 dark:text-gray-200' },
  Dinner: { bg: 'bg-jj-coral/20', text: 'text-jj-coral' },
};

export default function MealPlanPage() {
  const { clientId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [days, setDays] = useState<MealPlanDay[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [meals, setMeals] = useState<MealPlanMeal[]>([]);
  const [mealsLoading, setMealsLoading] = useState(false);

  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [alternatives, setAlternatives] = useState<RecipeSummary[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    async function loadMealPlan() {
      setLoading(true);
      const { data: planRows, error: planError } = await supabase
        .from('meal_plans')
        .select('id, name, goal_calories, goal_protein_g')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (planError) {
        console.error('Error loading meal plan:', planError);
        setLoading(false);
        return;
      }

      const plan = planRows?.[0] ?? null;
      setMealPlan(plan);

      if (!plan) {
        setDays([]);
        setLoading(false);
        return;
      }

      const { data: dayRows, error: dayError } = await supabase
        .from('meal_plan_days')
        .select('id, day_number')
        .eq('meal_plan_id', plan.id)
        .order('day_number', { ascending: true });

      if (dayError) {
        console.error('Error loading meal plan days:', dayError);
        setLoading(false);
        return;
      }

      setDays(dayRows ?? []);
      setSelectedDayId(dayRows?.[0]?.id ?? null);
      setLoading(false);
    }

    loadMealPlan();
  }, [clientId]);

  useEffect(() => {
    async function loadMeals() {
      if (!selectedDayId) {
        setMeals([]);
        return;
      }
      setMealsLoading(true);
      const { data, error } = await supabase
        .from('meal_plan_meals')
        .select('id, category, order_index, recipes(id, name, image_url, calories, protein_g, carbs_g, fat_g, serving_size)')
        .eq('meal_plan_day_id', selectedDayId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading meals:', error);
        setMeals([]);
        setMealsLoading(false);
        return;
      }

      setMeals((data ?? []) as unknown as MealPlanMeal[]);
      setMealsLoading(false);
    }

    loadMeals();
  }, [selectedDayId]);

  async function openRecipe(recipeId: number) {
    setRecipeLoading(true);
    setSelectedRecipe(null);
    setIngredients([]);
    setAlternatives([]);

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, name, image_url, calories, protein_g, carbs_g, fat_g, serving_size, prep_minutes, cook_minutes, allergens, tags, directions')
      .eq('id', recipeId)
      .single();

    if (recipeError || !recipe) {
      console.error('Error loading recipe:', recipeError);
      setRecipeLoading(false);
      return;
    }

    setSelectedRecipe(recipe);

    const { data: ingredientRows } = await supabase
      .from('recipe_ingredients')
      .select('id, quantity, unit, name, order_index')
      .eq('recipe_id', recipeId)
      .order('order_index', { ascending: true });

    setIngredients(ingredientRows ?? []);

    const { data: altRows } = await supabase
      .from('recipe_alternatives')
      .select('alternative_recipe_id')
      .eq('recipe_id', recipeId);

    const altIds = (altRows ?? []).map((r) => r.alternative_recipe_id).filter(Boolean);

    if (altIds.length > 0) {
      const { data: altRecipes } = await supabase
        .from('recipes')
        .select('id, name, image_url, calories, protein_g, carbs_g, fat_g, serving_size')
        .in('id', altIds);

      setAlternatives(altRecipes ?? []);
    }

    setRecipeLoading(false);
  }

  const totals = meals.reduce(
    (acc, m) => {
      if (m.recipes) {
        acc.calories += m.recipes.calories ?? 0;
        acc.protein += m.recipes.protein_g ?? 0;
      }
      return acc;
    },
    { calories: 0, protein: 0 }
  );

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500 dark:text-gray-400">Loading meal plan...</p>
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Meal Plan</h1>
        <p className="text-gray-500 dark:text-gray-400">
          No meal plan has been set up for this client yet.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        {mealPlan.name || 'Meal Plan'}
      </h1>

      {days.length > 0 && (
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          {days.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDayId(d.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                selectedDayId === d.id
                  ? 'border-jj-orange text-jj-orange'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              }`}
            >
              Day {d.day_number}
            </button>
          ))}
        </div>
      )}

      {(mealPlan.goal_calories || mealPlan.goal_protein_g) && (
        <div className="flex gap-6 mb-8">
          {mealPlan.goal_calories && (
            <div className="flex flex-col items-center justify-center w-32 h-32 rounded-full border-2 border-jj-orange/40">
              <span className="text-xl font-semibold text-gray-900 dark:text-white">{totals.calories}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Calories</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Goal: {mealPlan.goal_calories}</span>
            </div>
          )}
          {mealPlan.goal_protein_g && (
            <div className="flex flex-col items-center justify-center w-32 h-32 rounded-full border-2 border-jj-blue/40">
              <span className="text-xl font-semibold text-gray-900 dark:text-white">{totals.protein}g</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Protein</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Goal: {mealPlan.goal_protein_g}g</span>
            </div>
          )}
        </div>
      )}

      {mealsLoading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading meals...</p>
      ) : meals.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No meals have been added for this day yet.</p>
      ) : (
        <div className="space-y-6">
          {meals.map((meal, i) => {
            const showHeader = i === 0 || meals[i - 1].category !== meal.category;
            const style = categoryStyles[meal.category] ?? { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' };
            const recipe = meal.recipes;

            return (
              <div key={meal.id}>
                {showHeader && (
                  <h2 className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 uppercase mb-2">
                    {meal.category}
                  </h2>
                )}
                {recipe ? (
                  <button
                    onClick={() => openRecipe(recipe.id)}
                    className="w-full flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl px-5 py-4 text-left hover:ring-2 hover:ring-jj-orange/40 transition"
                  >
                    {recipe.image_url ? (
                      <img src={recipe.image_url} alt={recipe.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <Utensils size={20} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                          {meal.category}
                        </span>
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">{recipe.name}</span>
                      </div>
                      {recipe.serving_size && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{recipe.serving_size}</span>
                      )}
                    </div>
                    <div className="flex gap-4 text-[13px] text-gray-500 dark:text-gray-400 flex-shrink-0">
                      <span className="font-semibold text-jj-orange">{recipe.calories ?? 0} kcal</span>
                      <span>P: {recipe.protein_g ?? 0}g</span>
                      <span>C: {recipe.carbs_g ?? 0}g</span>
                      <span>F: {recipe.fat_g ?? 0}g</span>
                    </div>
                  </button>
                ) : (
                  <div className="px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-400">
                    No recipe assigned
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(selectedRecipe || recipeLoading) && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedRecipe(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>

            {recipeLoading || !selectedRecipe ? (
              <p className="text-gray-500 dark:text-gray-400 py-10 text-center">Loading recipe...</p>
            ) : (
              <>
                {selectedRecipe.image_url && (
                  <img
                    src={selectedRecipe.image_url}
                    alt={selectedRecipe.name}
                    className="w-full h-40 object-cover rounded-xl mb-4"
                  />
                )}
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{selectedRecipe.name}</h2>
                {selectedRecipe.serving_size && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{selectedRecipe.serving_size}</p>
                )}

                {selectedRecipe.allergens && selectedRecipe.allergens.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Recipe contains {selectedRecipe.allergens.join(', ')}
                  </p>
                )}

                <div className="flex gap-4 mb-4 text-sm">
                  {selectedRecipe.prep_minutes != null && (
                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <Clock size={14} /> Prep {selectedRecipe.prep_minutes}m
                    </span>
                  )}
                  {selectedRecipe.cook_minutes != null && (
                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <ChefHat size={14} /> Cook {selectedRecipe.cook_minutes}m
                    </span>
                  )}
                </div>

                <div className="flex gap-4 mb-5 text-sm font-semibold">
                  <span className="text-jj-orange">{selectedRecipe.calories ?? 0} Cal</span>
                  <span className="text-gray-500 dark:text-gray-400 font-normal">
                    {selectedRecipe.protein_g ?? 0}g Protein, {selectedRecipe.carbs_g ?? 0}g Carbs, {selectedRecipe.fat_g ?? 0}g Fat
                  </span>
                </div>

                {ingredients.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Ingredients</h3>
                    <ul className="space-y-1">
                      {ingredients.map((ing) => (
                        <li key={ing.id} className="text-sm text-gray-600 dark:text-gray-300">
                          {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(' ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedRecipe.directions && selectedRecipe.directions.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Directions</h3>
                    <ol className="space-y-2 list-decimal list-inside">
                      {selectedRecipe.directions.map((step, idx) => (
                        <li key={idx} className="text-sm text-gray-600 dark:text-gray-300">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {alternatives.length > 0 && (
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Alternative recipes</h3>
                    <ul className="space-y-1">
                      {alternatives.map((alt) => (
                        <li key={alt.id} className="text-sm text-gray-600 dark:text-gray-300">
                          {alt.name} {alt.calories ? `(${alt.calories} Cal)` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-4">
                    {selectedRecipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
