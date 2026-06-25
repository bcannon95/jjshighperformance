# JJS App — Supabase Database Schema (`public`)

Project: `tglfymxwpryfibknfith` · 32 tables · `id` is the primary key unless noted.
Types: `int8`=bigint, `numeric`, `int4`=integer, `timestamptz`=timestamp with time zone.

## People & Org

### trainers
| column | type | null |
|---|---|---|
| id | bigint | NO |
| first_name | text | YES |
| last_name | text | YES |
| email | text | YES |
| role | text | YES |
| last_active | timestamptz | YES |
| tz_group_id | bigint | YES |
| synced_at | timestamptz | YES |

### clients
| column | type | null |
|---|---|---|
| id | bigint | NO |
| first_name | text | YES |
| last_name | text | YES |
| email | text | YES |
| phone | text | YES |
| date_of_birth | date | YES |
| gender | text | YES |
| profile_image_url | text | YES |
| status | text | YES |
| account_type | text | YES |
| trainer_id | bigint | YES |
| location_id | bigint | YES |
| unit_weight | text | YES |
| unit_distance | text | YES |
| unit_bodystats | text | YES |
| last_signed_in | timestamptz | YES |
| last_message_sent | timestamptz | YES |
| date_joined | timestamptz | YES |
| synced_at | timestamptz | YES |

### locations
| column | type | null |
|---|---|---|
| id | bigint | NO |
| name | text | YES |
| type | text | YES |
| city | text | YES |
| country | text | YES |
| group_id | bigint | YES |

### tags
| column | type | null |
|---|---|---|
| id | bigint | NO |
| name | text | YES |
| color | text | YES |

### client_tags  *(composite PK: client_id + tag_id)*
| column | type | null |
|---|---|---|
| client_id | bigint | NO |
| tag_id | bigint | NO |

### user_groups
| column | type | null |
|---|---|---|
| id | bigint | NO |
| name | text | YES |
| description | text | YES |
| icon_url | text | YES |
| program_id | bigint | YES |
| leader_id | bigint | YES |
| created_at | timestamptz | YES |

### user_group_members  *(composite PK: group_id + client_id)*
| column | type | null |
|---|---|---|
| group_id | bigint | NO |
| client_id | bigint | NO |
| role | text | YES |
| joined_at | timestamptz | YES |

## Programs & Training

### programs
| column | type | null |
|---|---|---|
| id | bigint | NO |
| name | text | YES |
| description | text | YES |
| trainer_id | bigint | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |

### client_programs
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| program_id | bigint | YES |
| name | text | YES |
| is_main | boolean | YES |
| start_date | date | YES |
| end_date | date | YES |
| status | text | YES |
| created_at | timestamptz | YES |

### training_phases
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_program_id | bigint | YES |
| name | text | YES |
| start_date | date | YES |
| end_date | date | YES |
| week_count | integer | YES |
| order_index | integer | YES |

### workout_definitions
| column | type | null |
|---|---|---|
| id | bigint | NO |
| training_phase_id | bigint | YES |
| name | text | YES |
| description | text | YES |
| est_duration_min | integer | YES |
| equipment | array | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |

### workout_exercises
| column | type | null |
|---|---|---|
| id | bigint | NO |
| workout_def_id | bigint | YES |
| exercise_id | bigint | YES |
| exercise_name | text | YES |
| order_index | integer | YES |
| superset_group | integer | YES |
| sets | integer | YES |
| reps_min | integer | YES |
| reps_max | integer | YES |
| rest_seconds | integer | YES |
| notes | text | YES |
| type | text | YES |

### exercises  *(exercise library)*
| column | type | null |
|---|---|---|
| id | bigint | NO |
| name | text | YES |
| category | text | YES |
| equipment | array | YES |
| muscle_groups | array | YES |
| video_url | text | YES |
| thumbnail_url | text | YES |
| created_by | bigint | YES |

## Calendar & Workout Logging

### calendar_events
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| event_type | text | YES |
| workout_def_id | bigint | YES |
| scheduled_date | date | YES |
| completed_at | timestamptz | YES |
| status | text | YES |
| rpe_rating | integer | YES |
| notes | text | YES |
| client_program_id | bigint | YES |

### workout_logs
| column | type | null |
|---|---|---|
| id | bigint | NO |
| calendar_event_id | bigint | YES |
| client_id | bigint | YES |
| workout_def_id | bigint | YES |
| completed_at | timestamptz | YES |
| duration_min | integer | YES |
| rpe_rating | integer | YES |
| notes | text | YES |

### workout_log_sets
| column | type | null |
|---|---|---|
| id | bigint | NO |
| workout_log_id | bigint | YES |
| exercise_id | bigint | YES |
| set_number | integer | YES |
| reps_completed | integer | YES |
| weight_kg | numeric | YES |
| duration_seconds | integer | YES |
| distance_km | numeric | YES |
| is_personal_best | boolean | YES |
| notes | text | YES |

### cardio_logs
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| calendar_event_id | bigint | YES |
| activity_type | text | YES |
| logged_at | timestamptz | YES |
| duration_min | integer | YES |
| distance_km | numeric | YES |
| calories_burned | integer | YES |
| avg_heart_rate | integer | YES |
| steps | integer | YES |
| source | text | YES |

## Body & Health Metrics

### body_weight_logs
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| logged_at | date | YES |
| weight_kg | numeric | YES |
| source | text | YES |

### body_measurement_logs
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| logged_at | date | YES |
| neck_cm | numeric | YES |
| chest_cm | numeric | YES |
| waist_cm | numeric | YES |
| hips_cm | numeric | YES |
| left_arm_cm | numeric | YES |
| right_arm_cm | numeric | YES |
| left_thigh_cm | numeric | YES |
| right_thigh_cm | numeric | YES |
| left_calf_cm | numeric | YES |
| right_calf_cm | numeric | YES |

### biometric_logs
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| logged_at | date | YES |
| metric | text | YES |
| value | numeric | YES |
| unit | text | YES |

### sleep_logs
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| date | date | YES |
| hours | numeric | YES |
| source | text | YES |

### daily_health_data
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| date | date | YES |
| steps | integer | YES |
| calories_burned | integer | YES |
| active_minutes | integer | YES |
| source | text | YES |

## Nutrition

### daily_nutrition_logs
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| logged_date | date | YES |
| calories | integer | YES |
| protein_g | numeric | YES |
| carbs_g | numeric | YES |
| fat_g | numeric | YES |
| fiber_g | numeric | YES |
| water_ml | integer | YES |
| compliance_pct | integer | YES |

### nutrition_goals
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| calories | integer | YES |
| protein_g | integer | YES |
| carbs_g | integer | YES |
| fat_g | integer | YES |
| fiber_g | integer | YES |
| effective_from | date | YES |
| created_at | timestamptz | YES |

### meal_plans
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| name | text | YES |
| type | text | YES |
| pdf_url | text | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |

## Goals, Habits & Forms

### goals
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| title | text | YES |
| description | text | YES |
| target_date | date | YES |
| achieved | boolean | YES |
| achieved_at | timestamptz | YES |
| created_at | timestamptz | YES |

### habits
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| name | text | YES |
| description | text | YES |
| frequency | text | YES |
| status | text | YES |
| goal_id | bigint | YES |
| created_at | timestamptz | YES |

### form_definitions
| column | type | null |
|---|---|---|
| id | bigint | NO |
| name | text | YES |
| questions | jsonb | YES |
| created_at | timestamptz | YES |

### form_responses
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| form_id | bigint | YES |
| submitted_at | timestamptz | YES |
| answers | jsonb | YES |

## Billing

### subscriptions
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| product_name | text | YES |
| status | text | YES |
| amount_cents | integer | YES |
| currency | text | YES |
| billing_period | text | YES |
| start_date | date | YES |
| end_date | date | YES |
| next_billing | date | YES |
| created_at | timestamptz | YES |

### invoices
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| amount_cents | integer | YES |
| currency | text | YES |
| status | text | YES |
| issued_at | timestamptz | YES |
| paid_at | timestamptz | YES |

### session_credits
| column | type | null |
|---|---|---|
| id | bigint | NO |
| client_id | bigint | YES |
| total_credits | integer | YES |
| used_credits | integer | YES |
| expires_at | date | YES |
| created_at | timestamptz | YES |