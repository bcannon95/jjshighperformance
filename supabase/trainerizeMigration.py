# migrate.py  —  Trainerize → Supabase
# pip install requests supabase python-dotenv

import os, time, datetime, logging
from dotenv import load_dotenv
import requests
from supabase import create_client, Client

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── CONFIG ────────────────────────────────────────────────────────────────────
TZ_API_BASE   = "https://api.trainerize.com/v03"
TZ_TOKEN      = os.getenv("TZ_TOKEN")
OWNER_USER_ID = int(os.getenv("TZ_OWNER_ID", "10545130"))
GROUP_ID      = int(os.getenv("TZ_GROUP_ID",  "355342"))
SUPABASE_URL  = os.getenv("SUPABASE_URL")
SUPABASE_KEY  = os.getenv("SUPABASE_SERVICE_KEY")
UNIT_WEIGHT   = "kg"
UNIT_DISTANCE = "km"
UNIT_BODYSTATS = "cm"

# ── HELPERS ───────────────────────────────────────────────────────────────────
def tz_headers():
    return {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TZ_TOKEN}",
        "TR-From": "web",
        "dateToday": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
    }

def tz_post(endpoint, body=None, retries=3):
    url = f"{TZ_API_BASE}/{endpoint}"
    for attempt in range(retries):
        try:
            r = requests.post(url, headers=tz_headers(), json=body or {}, timeout=30)
            if r.status_code == 429:
                wait = int(r.headers.get("Retry-After", 10))
                log.warning(f"Rate limited on {endpoint}, waiting {wait}s...")
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            if attempt == retries - 1:
                log.error(f"Failed {endpoint}: {e}")
                return {}
            time.sleep(2 ** attempt)
    return {}

def upsert(sb: Client, table, rows, on_conflict="id"):
    if not rows:
        return
    for i in range(0, len(rows), 500):
        chunk = rows[i:i+500]
        try:
            sb.table(table).upsert(chunk, on_conflict=on_conflict).execute()
            log.info(f"  ✓ {table}: {len(chunk)} rows")
        except Exception as e:
            log.error(f"  ✗ {table}: {e}")

def dt(val):
    """Parse Trainerize datetime string → ISO for Postgres."""
    if not val:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.datetime.strptime(val, fmt).isoformat()
        except ValueError:
            continue
    return val


# ── TRAINERS ──────────────────────────────────────────────────────────────────
# Table: trainers(id, first_name, last_name, email, role, last_active, tz_group_id, synced_at)
def migrate_trainers(sb):
    log.info("── trainers")
    data = tz_post("user/getTrainerList")
    rows = []
    for t in data.get("users", []):
        rows.append({
            "id":          t["id"],
            "first_name":  t.get("firstName"),
            "last_name":   t.get("lastName"),
            "email":       t.get("email"),
            "role":        t.get("role"),
            "last_active": dt(t.get("latestSignedIn")),
            "tz_group_id": GROUP_ID,
            "synced_at":   datetime.datetime.utcnow().isoformat(),
        })
    upsert(sb, "trainers", rows)


# ── LOCATIONS ─────────────────────────────────────────────────────────────────
# Table: locations(id, name, type, city, country, group_id)
def migrate_locations(sb):
    log.info("── locations")
    data = tz_post("location/getList", {"groupID": GROUP_ID})
    rows = []
    for loc in data.get("locations", []):
        rows.append({
            "id":       loc["id"],
            "name":     loc.get("name"),
            "type":     loc.get("type"),
            "city":     loc.get("city"),
            "country":  loc.get("country"),
            "group_id": GROUP_ID,
        })
    upsert(sb, "locations", rows)


# ── TAGS ──────────────────────────────────────────────────────────────────────
# Table: tags(id, name, color)
def migrate_tags(sb):
    log.info("── tags")
    data = tz_post("userTag/getList")
    rows = []
    for t in data.get("userTags", []):
        rows.append({
            "id":    t["id"],
            "name":  t.get("name"),
            "color": t.get("color"),      # may be null
        })
    upsert(sb, "tags", rows)


# ── CLIENTS ───────────────────────────────────────────────────────────────────
# Table: clients(id, first_name, last_name, email, phone, date_of_birth, gender,
#   profile_image_url, status, account_type, trainer_id, location_id,
#   unit_weight, unit_distance, unit_bodystats, last_signed_in, last_message_sent,
#   date_joined, synced_at)
# Table: client_tags(client_id, tag_id)

VIEWS = ["activeClient", "prospect", "pendingClient", "basicClient", "deactivatedClient"]

def fetch_all_clients_list(limit=None):
    seen, all_clients = set(), []
    for view in VIEWS:
        if limit and len(all_clients) >= limit:
            break
        start = 0
        while True:
            data = tz_post("user/getClientList", {
                "userID": OWNER_USER_ID, "view": view, "sort": "name",
                "start": start, "count": 50, "verbose": True, "filter": {},
            })
            batch = data.get("users", [])
            total = data.get("total", 0)
            for c in batch:
                if c["id"] not in seen:
                    seen.add(c["id"])
                    c["_view"] = view
                    all_clients.append(c)
                    if limit and len(all_clients) >= limit:
                        log.info(f"  test mode: capped at {limit} clients")
                        return all_clients
            log.info(f"  {view}: {start + len(batch)}/{total}")
            if start + len(batch) >= total or not batch:
                break
            start += 50
            time.sleep(0.2)
    return all_clients

def migrate_clients(sb, limit=None):
    log.info("── clients")
    clients_list = fetch_all_clients_list(limit=limit)
    log.info(f"  Total unique clients: {len(clients_list)}")

    client_rows, tag_rows = [], []

    for i, c in enumerate(clients_list):
        p_data = tz_post("user/getProfile", {"usersid": [c["id"]], "unitBodystats": UNIT_BODYSTATS})
        p = (p_data.get("usrProfile") or [{}])[0] or c

        client_rows.append({
            "id":             p.get("id") or c["id"],
            "first_name":     p.get("firstName")   or c.get("firstName"),
            "last_name":      p.get("lastName")    or c.get("lastName"),
            "email":          p.get("email")       or c.get("email"),
            "phone":          p.get("phone"),
            "date_of_birth":  p.get("birthDate"),
            "gender":         p.get("sex"),
            "profile_image_url": p.get("profileIconUrl"),
            "status":         p.get("status")      or c.get("status"),
            # account_type maps to messaging role e.g. "fullAccessWithTwoWayMessage"
            "account_type":   p.get("role")        or c.get("role"),
            "trainer_id":     p.get("trainerID")   or c.get("trainerID"),
            "location_id":    p.get("locationID"),
            "unit_weight":    p.get("unitWeight",   UNIT_WEIGHT),
            "unit_distance":  p.get("unitDistance", UNIT_DISTANCE),
            "unit_bodystats": p.get("unitBodystats", UNIT_BODYSTATS),
            "last_signed_in": dt(p.get("latestSignedIn")),
            "last_message_sent": dt(p.get("latestMessageDate")),
            "date_joined":    dt(p.get("created")),
            "synced_at":      datetime.datetime.utcnow().isoformat(),
        })

        for tag in (p.get("tags") or []):
            if isinstance(tag, dict) and tag.get("id"):
                tag_rows.append({"client_id": c["id"], "tag_id": tag["id"]})

        if (i + 1) % 10 == 0:
            log.info(f"  Profiled {i+1}/{len(clients_list)}")
        time.sleep(0.15)

    upsert(sb, "clients", client_rows)
    upsert(sb, "client_tags", tag_rows, on_conflict="client_id,tag_id")
    return clients_list


# ── USER GROUPS ───────────────────────────────────────────────────────────────
# Table: user_groups(id, name, description, icon_url, program_id, leader_id, created_at)
# Table: user_group_members(group_id, client_id, role, joined_at)
def migrate_groups(sb):
    log.info("── user_groups")
    data = tz_post("userGroup/getList")
    rows = []
    for g in data.get("userGroups", []):
        rows.append({
            "id":          g["id"],
            "name":        g.get("name"),
            "description": g.get("description"),
            "icon_url":    g.get("icon"),
            "program_id":  (g.get("masterProgram") or {}).get("id"),
            "leader_id":   None,   # populated separately via member list
            "created_at":  dt(g.get("createdAt")),
        })
    upsert(sb, "user_groups", rows)


# ── PROGRAMS + TRAINING PHASES + WORKOUT DEFINITIONS ─────────────────────────
# programs(id, name, description, trainer_id, created_at, updated_at)
# client_programs(id, client_id, program_id, name, is_main, start_date, end_date, status, created_at)
# training_phases(id, client_program_id, name, start_date, end_date, week_count, order_index)
# workout_definitions(id, training_phase_id, name, description, est_duration_min, equipment, created_at, updated_at)
# workout_exercises(id, workout_def_id, exercise_id, exercise_name, order_index, superset_group,
#                   sets, reps_min, reps_max, rest_seconds, notes, type)

def migrate_programs_for_client(sb, client_id):
    prog_data = tz_post("program/getUserProgramList", {"userID": client_id})
    cp_rows = []

    for p in prog_data.get("programs", []):
        # Upsert master program first so client_programs FK (program_id) is satisfied
        if p.get("id"):
            upsert(sb, "programs", [{
                "id":          p["id"],
                "name":        p.get("name"),
                "description": p.get("description"),
                "trainer_id":  p.get("trainerID"),
                "created_at":  dt(p.get("created")),
                "updated_at":  dt(p.get("modified")),
            }])

        cp_row = {
            "id":         p["userProgramID"],
            "client_id":  client_id,
            "program_id": p.get("id"),
            "name":       p.get("name"),
            "is_main":    p.get("subscribeType") == "core",
            "start_date": p.get("startDate"),
            "end_date":   p.get("endDate"),
            "status":     "active" if not p.get("isEmpty") else "empty",
            "created_at": None,
        }
        if not p.get("userProgramID") or p.get("isEmpty"):
            continue

        cp_rows.append(cp_row)
        # Upsert now so training_phases FK (client_program_id) is satisfied
        upsert(sb, "client_programs", [cp_row])

        # Training phases
        phase_data = tz_post("program/getUserProgramTrainingPlanList", {
            "userID": client_id, "userProgramID": p["userProgramID"],
        })
        phase_rows = []
        for idx, plan in enumerate(phase_data.get("plans", [])):
            phase_row = {
                "id":               plan["id"],
                "client_program_id": p["userProgramID"],
                "name":             plan.get("name"),
                "start_date":       plan.get("startDate"),
                "end_date":         plan.get("endDate"),
                "week_count":       plan.get("duration"),
                "order_index":      idx,
            }
            phase_rows.append(phase_row)
            # Upsert the phase now so workout_definitions FK is satisfied
            upsert(sb, "training_phases", [phase_row])

            # Workout definitions
            wd_data = tz_post("trainingPlan/getWorkoutDefList", {
                "planID": plan["id"], "start": 0, "count": 100,
                "sort": "name", "searchTerm": "",
                "filter": {"equipments": None, "duration": None},
            })
            wd_rows, ex_rows, exercise_lib_rows = [], [], []
            for w in wd_data.get("workouts", []):
                # est_duration_min: API returns seconds, convert
                est_min = round(w.get("duration", 0) / 60) if w.get("duration") else None
                equipment = list({
                    tag["name"] for ex in w.get("exercises", [])
                    for tag in (ex.get("tags") or [])
                    if tag.get("type") == "equipment"
                })
                wd_rows.append({
                    "id":               w["id"],
                    "training_phase_id": plan["id"],
                    "name":             w.get("name"),
                    "description":      w.get("instruction"),
                    "est_duration_min": est_min,
                    "equipment":        equipment or None,
                    "created_at":       None,
                    "updated_at":       None,
                })
                for ex_idx, ex in enumerate(w.get("exercises", [])):
                    # Seed the exercises library table so the FK is satisfied
                    if ex.get("id"):
                        ex_equipment = [t["name"] for t in (ex.get("tags") or [])
                                        if isinstance(t, dict) and t.get("type") == "equipment"]
                        ex_muscles   = [t["name"] for t in (ex.get("tags") or [])
                                        if isinstance(t, dict) and t.get("type") == "muscleGroup"]
                        exercise_lib_rows.append({
                            "id":            ex["id"],
                            "name":          ex.get("name"),
                            "category":      ex.get("category"),
                            "equipment":     ex_equipment or None,
                            "muscle_groups": ex_muscles or None,
                            "video_url":     ex.get("videoUrl"),
                            "thumbnail_url": ex.get("thumbnail") or ex.get("thumbnailUrl"),
                            "created_by":    None,
                        })
                    # Parse reps from target string e.g. "8-10 reps" or "10 reps"
                    target = ex.get("target") or ""
                    reps_min, reps_max = None, None
                    if "reps" in target.lower():
                        import re
                        nums = re.findall(r'\d+', target)
                        if len(nums) >= 2:
                            reps_min, reps_max = int(nums[0]), int(nums[1])
                        elif len(nums) == 1:
                            reps_min = reps_max = int(nums[0])

                    ex_rows.append({
                        "id":            f"{w['id']}_{ex_idx}",  # composite — no native ID on exercise slot
                        "workout_def_id": w["id"],
                        "exercise_id":   ex.get("id"),
                        "exercise_name": ex.get("name"),
                        "order_index":   ex_idx,
                        "superset_group": ex.get("superSetID"),
                        "sets":          ex.get("sets"),
                        "reps_min":      reps_min,
                        "reps_max":      reps_max,
                        "rest_seconds":  ex.get("restTime"),
                        "notes":         ex.get("note"),
                        "type":          ex.get("recordType"),   # 'strength','cardio'
                    })

            upsert(sb, "exercises", exercise_lib_rows)
            upsert(sb, "workout_definitions", wd_rows)
            upsert(sb, "workout_exercises", ex_rows, on_conflict="id")

        upsert(sb, "training_phases", phase_rows)

    upsert(sb, "client_programs", cp_rows)

def migrate_all_programs(sb, clients):
    log.info("── programs / phases / workouts")
    for i, c in enumerate(clients):
        log.info(f"  [{i+1}/{len(clients)}] client {c['id']}")
        migrate_programs_for_client(sb, c["id"])
        time.sleep(0.3)


# ── CALENDAR EVENTS ───────────────────────────────────────────────────────────
# calendar_events(id, client_id, event_type, workout_def_id, scheduled_date,
#   completed_at, status, rpe_rating, notes, client_program_id)
def migrate_calendar_for_client(sb, client_id, start_date, end_date):
    data = tz_post("calendar/getList", {
        "userid": client_id, "startDate": start_date, "endDate": end_date,
        "unitDistance": UNIT_DISTANCE, "unitWeight": UNIT_WEIGHT,
        "filter": {"userPrograms": []},
    })
    rows = []
    for day in data.get("calendar", {}).values():
        date = day.get("date")
        for item in day.get("items", []):
            detail = item.get("detail") or {}
            rows.append({
                "id":               item["id"],
                "client_id":        client_id,
                "event_type":       item.get("type"),
                "workout_def_id":   detail.get("workoutID"),
                "scheduled_date":   date,
                "completed_at":     dt(detail.get("completedAt") or detail.get("completedDate")),
                "status":           item.get("status"),
                "rpe_rating":       detail.get("rpe"),
                "notes":            item.get("subtitle"),
                "client_program_id": item.get("userProgramID"),
            })
    upsert(sb, "calendar_events", rows)

def migrate_all_calendars(sb, clients):
    log.info("── calendar_events")
    start = "2023-01-01"
    end   = datetime.date.today().isoformat()
    for i, c in enumerate(clients):
        log.info(f"  [{i+1}/{len(clients)}] client {c['id']}")
        migrate_calendar_for_client(sb, c["id"], start, end)
        time.sleep(0.3)


# ── BODY WEIGHT LOGS ──────────────────────────────────────────────────────────
# body_weight_logs(id, client_id, logged_at, weight_kg, source)
def migrate_body_weight(sb, clients):
    log.info("── body_weight_logs")
    for c in clients:
        data = tz_post("graph/GetBodyWeightAverages", {
            "userID": c["id"], "startDate": "2020-01-01",
            "endDate": datetime.date.today().isoformat(), "unitWeight": UNIT_WEIGHT,
        })
        rows = []
        for week in data.get("weeks", []):
            if week.get("average") is None:
                continue
            rows.append({
                # Use week_start as the logged_at date, no native per-day ID so generate one
                "client_id":  c["id"],
                "logged_at":  week.get("weekStart"),
                "weight_kg":  week.get("average"),
                "source":     "trainerize",
            })
        upsert(sb, "body_weight_logs", on_conflict="client_id,logged_at",
               rows=rows)
        time.sleep(0.2)


# ── BIOMETRIC LOGS ────────────────────────────────────────────────────────────
# biometric_logs(id, client_id, logged_at, metric, value, unit)
def migrate_biometrics(sb, clients):
    log.info("── biometric_logs")
    metrics = ["weight", "fat", "muscle", "water", "bone", "visceralFat", "bmi"]
    for c in clients:
        rows = []
        for metric in metrics:
            data = tz_post("graph/getBodystats", {
                "userID": c["id"], "startDate": "2020-01-01",
                "endDate": datetime.date.today().isoformat(),
                "type": metric, "unitBodystats": UNIT_BODYSTATS,
            })
            for pt in data.get("points", []):
                if pt.get("value") is None:
                    continue
                rows.append({
                    "client_id": c["id"],
                    "logged_at": pt.get("date"),
                    "metric":    metric,
                    "value":     pt.get("value"),
                    "unit":      UNIT_BODYSTATS if metric not in ("weight", "fat", "bmi") else UNIT_WEIGHT,
                })
        upsert(sb, "biometric_logs", rows, on_conflict="client_id,logged_at,metric")
        time.sleep(0.2)


# ── DAILY NUTRITION LOGS ──────────────────────────────────────────────────────
# daily_nutrition_logs(id, client_id, logged_date, calories, protein_g, carbs_g,
#   fat_g, fiber_g, water_ml, compliance_pct)
def migrate_nutrition(sb, clients):
    log.info("── daily_nutrition_logs")
    for c in clients:
        data = tz_post("dailyNutrition/getList", {
            "userID": c["id"],
            "startDate": "2023-01-01",
            "endDate": datetime.date.today().isoformat(),
        })
        rows = []
        for n in data.get("nutrition", []) or []:
            rows.append({
                "client_id":      c["id"],
                "logged_date":    n.get("date"),
                "calories":       round(n.get("calories") or n.get("energy") or 0) or None,
                "protein_g":      n.get("protein"),
                "carbs_g":        n.get("carbs") or n.get("carbohydrates"),
                "fat_g":          n.get("fat"),
                "fiber_g":        n.get("fiber"),
                "water_ml":       n.get("water"),
                "compliance_pct": n.get("compliance"),
            })
        upsert(sb, "daily_nutrition_logs", rows, on_conflict="client_id,logged_date")
        time.sleep(0.2)


# ── SLEEP LOGS ────────────────────────────────────────────────────────────────
# sleep_logs(id, client_id, date, hours, source)
def migrate_sleep(sb, clients):
    log.info("── sleep_logs")
    for c in clients:
        data = tz_post("healthData/getListSleep", {
            "userID": c["id"],
            "startDate": "2023-01-01",
            "endDate": datetime.date.today().isoformat(),
        })
        rows = []
        for s in data.get("list", []) or []:
            rows.append({
                "client_id": c["id"],
                "date":      s.get("date"),
                "hours":     s.get("value") or s.get("hours"),
                "source":    s.get("source", "trainerize"),
            })
        upsert(sb, "sleep_logs", rows, on_conflict="client_id,date")
        time.sleep(0.2)


# ── DAILY HEALTH DATA (steps, calories, active minutes) ──────────────────────
# daily_health_data(id, client_id, date, steps, calories_burned, active_minutes, source)
def migrate_daily_health(sb, clients):
    log.info("── daily_health_data")
    for c in clients:
        data = tz_post("healthData/getList", {
            "userID": c["id"],
            "startDate": "2023-01-01",
            "endDate": datetime.date.today().isoformat(),
        })
        rows = []
        for d in data.get("list", []) or []:
            rows.append({
                "client_id":      c["id"],
                "date":           d.get("date"),
                "steps":          d.get("steps"),
                "calories_burned": d.get("calories") or d.get("caloriesBurned"),
                "active_minutes": d.get("activeMinutes"),
                "source":         d.get("source", "trainerize"),
            })
        upsert(sb, "daily_health_data", rows, on_conflict="client_id,date")
        time.sleep(0.2)


# ── GOALS ─────────────────────────────────────────────────────────────────────
# goals(id, client_id, title, description, target_date, achieved, achieved_at, created_at)
def migrate_goals(sb, clients):
    log.info("── goals")
    for c in clients:
        rows = []
        for achieved in (False, True):
            data = tz_post("goal/getList", {
                "userID": c["id"], "achieved": achieved,
                "unitWeight": UNIT_WEIGHT, "start": 0, "count": 100,
            })
            for g in data.get("goals", []):
                rows.append({
                    "id":          g["id"],
                    "client_id":   c["id"],
                    "title":       g.get("title") or g.get("name"),
                    "description": g.get("description"),
                    "target_date": g.get("targetDate"),
                    "achieved":    g.get("achieved", False),
                    "achieved_at": dt(g.get("achievedDate")),
                    "created_at":  dt(g.get("created")),
                })
        upsert(sb, "goals", rows)
        time.sleep(0.2)


# ── HABITS ────────────────────────────────────────────────────────────────────
# habits(id, client_id, name, description, frequency, status, goal_id, created_at)
def migrate_habits(sb, clients):
    log.info("── habits")
    for c in clients:
        rows = []
        for status in ("current", "past"):
            data = tz_post("habits/getList", {"userID": c["id"], "status": status})
            for h in data.get("habits", []):
                rows.append({
                    "id":          h["id"],
                    "client_id":   c["id"],
                    "name":        h.get("name") or h.get("title"),
                    "description": h.get("description"),
                    "frequency":   h.get("frequency"),
                    "status":      status,
                    "goal_id":     h.get("goalID"),
                    "created_at":  dt(h.get("created")),
                })
        upsert(sb, "habits", rows)
        time.sleep(0.2)


# ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────
# subscriptions(id, client_id, product_name, status, amount_cents, currency,
#   billing_period, start_date, end_date, next_billing, created_at)
def migrate_subscriptions(sb, clients):
    log.info("── subscriptions")
    for c in clients:
        data = tz_post("store/getSubscriptionList", {
            "filter": {
                "userID": c["id"],
                "subscriptionStatuses": ["pending","upcoming","active","canceled","failing"],
            },
            "search": "", "sort": "dateCreated",
            "start": None, "count": None, "verifyCoupon": True,
        })
        rows = []
        for s in data.get("subscriptions", []):
            rows.append({
                "id":             s["id"],
                "client_id":      c["id"],
                "product_name":   s.get("productName") or s.get("name"),
                "status":         s.get("status"),
                "amount_cents":   int((s.get("price") or 0) * 100),
                "currency":       s.get("currency", "AUD"),
                "billing_period": s.get("billingPeriod") or s.get("frequency"),
                "start_date":     s.get("startDate"),
                "end_date":       s.get("endDate"),
                "next_billing":   s.get("nextBillingDate"),
                "created_at":     dt(s.get("dateCreated")),
            })
        upsert(sb, "subscriptions", rows)
        time.sleep(0.1)


# ── SESSION CREDITS ───────────────────────────────────────────────────────────
# session_credits(id, client_id, total_credits, used_credits, expires_at, created_at)
def migrate_session_credits(sb, clients):
    log.info("── session_credits")
    for c in clients:
        data = tz_post("sessionCredit/getCreditList", {"userID": c["id"]})
        rows = []
        for cr in data.get("credits", data.get("sessionCredits", [])):
            rows.append({
                "client_id":     c["id"],
                "total_credits": cr.get("total") or cr.get("totalCredits"),
                "used_credits":  cr.get("used")  or cr.get("usedCredits"),
                "expires_at":    cr.get("expiryDate"),
                "created_at":    dt(cr.get("created")),
            })
        upsert(sb, "session_credits", rows, on_conflict="client_id")
        time.sleep(0.1)


# ── MEAL PLANS ────────────────────────────────────────────────────────────────
# meal_plans(id, client_id, name, type, pdf_url, created_at, updated_at)
def migrate_meal_plans(sb, clients):
    log.info("── meal_plans")
    for c in clients:
        rows = []
        for endpoint, plan_type in [("mealPlan/get", "smart"), ("mealPlan/GetFlexiblePlan", "flexible")]:
            data = tz_post(endpoint, {"userId": c["id"]})
            plan = data.get("mealPlan") or data.get("plan") or data.get("flexiblePlan")
            if not plan:
                continue
            rows.append({
                "id":         plan.get("id") or f"{c['id']}_{plan_type}",
                "client_id":  c["id"],
                "name":       plan.get("name"),
                "type":       plan_type,
                "pdf_url":    plan.get("pdfUrl") or plan.get("fileUrl"),
                "created_at": dt(plan.get("created")),
                "updated_at": dt(plan.get("modified")),
            })
        upsert(sb, "meal_plans", rows)
        time.sleep(0.1)


# ── NUTRITION GOALS ───────────────────────────────────────────────────────────
# nutrition_goals(id, client_id, calories, protein_g, carbs_g, fat_g, fiber_g,
#   effective_from, created_at)
def migrate_nutrition_goals(sb, clients):
    log.info("── nutrition_goals")
    for c in clients:
        data = tz_post("goal/getNutrition", {"userID": c["id"]})
        goal = data.get("nutritionGoal") or data.get("goal") or data
        if not goal or not isinstance(goal, dict):
            continue
        row = {
            "client_id":      c["id"],
            "calories":       goal.get("calories") or goal.get("energy"),
            "protein_g":      goal.get("protein"),
            "carbs_g":        goal.get("carbs") or goal.get("carbohydrates"),
            "fat_g":          goal.get("fat"),
            "fiber_g":        goal.get("fiber"),
            "effective_from": goal.get("startDate") or datetime.date.today().isoformat(),
            "created_at":     dt(goal.get("created")),
        }
        upsert(sb, "nutrition_goals", [row], on_conflict="client_id,effective_from")
        time.sleep(0.1)


# ── MAIN ──────────────────────────────────────────────────────────────────────
def run(steps=None, test_limit=None):
    if not TZ_TOKEN:
        raise ValueError("TZ_TOKEN not set")
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY not set")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    if test_limit:
        log.info(f"TEST MODE — limiting to {test_limit} client(s)")

    all_steps = steps or [
        "trainers", "locations", "tags", "clients", "groups",
        "programs", "calendars", "body_weight", "biometrics",
        "nutrition", "sleep", "daily_health",
        "goals", "habits", "subscriptions", "session_credits",
        "meal_plans", "nutrition_goals",
    ]

    clients = None
    t0 = time.time()

    for step in all_steps:
        log.info(f"\n{'='*50}\n{step.upper()}\n{'='*50}")
        if step == "trainers":         migrate_trainers(sb)
        elif step == "locations":      migrate_locations(sb)
        elif step == "tags":           migrate_tags(sb)
        elif step == "clients":
            clients = migrate_clients(sb, limit=test_limit)
        elif step == "groups":         migrate_groups(sb)
        else:
            # All remaining steps need the client list
            if clients is None:
                log.info("  Fetching client list first...")
                clients = fetch_all_clients_list(limit=test_limit)
            if step == "programs":         migrate_all_programs(sb, clients)
            elif step == "calendars":      migrate_all_calendars(sb, clients)
            elif step == "body_weight":    migrate_body_weight(sb, clients)
            elif step == "biometrics":     migrate_biometrics(sb, clients)
            elif step == "nutrition":      migrate_nutrition(sb, clients)
            elif step == "sleep":          migrate_sleep(sb, clients)
            elif step == "daily_health":   migrate_daily_health(sb, clients)
            elif step == "goals":          migrate_goals(sb, clients)
            elif step == "habits":         migrate_habits(sb, clients)
            elif step == "subscriptions":  migrate_subscriptions(sb, clients)
            elif step == "session_credits": migrate_session_credits(sb, clients)
            elif step == "meal_plans":     migrate_meal_plans(sb, clients)
            elif step == "nutrition_goals": migrate_nutrition_goals(sb, clients)

    log.info(f"\n✓ Done in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    import sys
    # Run specific steps:  python migrate.py trainers clients programs
    # Test with 3 clients: python migrate.py --test 3
    # Test + specific steps: python migrate.py --test 3 clients programs
    args = sys.argv[1:]
    test_limit = None
    if "--test" in args:
        idx = args.index("--test")
        test_limit = int(args[idx + 1])
        args = args[:idx] + args[idx + 2:]
    run(steps=args or None, test_limit=test_limit)