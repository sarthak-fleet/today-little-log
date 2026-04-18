# Urgency-First Redesign — 2026-04-18 (v2, vision-informed)

## Context

User (Sarthak, 25) owns this app as personal tool. Feels life slipping into TV / mobile games / anime / novelty rabbit holes. Keystone broken habit: sleep. Goals: (1) better SWE, (2) 84→70 kg retaining muscle, (3) better-paying job. Motivation drivers: gamification + fear of wasted time. Public accountability + guilt don't move him. All data permissions open.

Mandate: "do everything it takes" to make app forcibly confront him every open. Long vision dump at `memory/project_vision_dump_2026-04-18.md` — personal features kept, social/text-app/monetization cut.

Warm orange palette reverted 2026-04-18.

## 6-Wave Roadmap

### Wave 1 — Time Urgency Core + Identity Anchor

Feel: first-open slap. Every surface counts down.

1. ShockCard daily blocking modal — day N / 30,000, % lived, memento quote, single dismiss. (built)
2. `/life` page — Tim Urban 4680-week grid. (built)
3. Tab title live countdown. (built)
4. Navbar urgency amp — bolder, seconds tick, red pulse when <2h waking-window left.
5. Page footer stamp — "Xh dead · Yh left." (built)
6. Hero copy rewrite — memento framing.
7. Highest-Self identity statement — user sets once ("I am a focused engineer at 70kg who sleeps 11–7"). Shown on ShockCard + home.
8. Sidebar "Life" entry wired.

### Wave 2 — Sleep Lock + URGE + Mana + PSI Journal

Feel: force mechanics. Novelty trap defused. Keystone protected.

9. Sleep target — user sets bedtime + wake. After bedtime, aggressive overlay (dim red, "SLEEP. NOW.") blocks app for 15 min (can dismiss w/ score penalty). Wake-by-target = bonus XP. Log sleep hours morning.
10. **URGE button** — big CTA. Tap when tempted (new game / YT / TV binge). Triggers 5-min breathing timer + prompts ("Will this matter in 7 days?" "What am I avoiding?"). Creates 24h cooldown entry; if still wants after 24h, allow.
11. Mana Mode — tasks have mana cost (1–10). Daily mana bank auto-refills based on sleep quality. Task picker recommends by remaining mana. Recurring tasks self-adjust cost from completion history.
12. PSI Journal — morning 2-line entry → LLM estimates brain-pressure 1-100. <60 = push hard day, >80 = recovery day. Schedule + Mana bank modulate accordingly. Uses existing ChatBot infra.

### Wave 3 — Schedule Engine + Food + Weight + Dev

Feel: make-my-day + goal-aligned logging.

13. Schedule builder from habits+tasks — existing `/schedule` expanded. Drag-drop timeslots. Tasks pulled from mana-aware priority queue.
14. Schedule check-in flow — per-block: done / skipped / extra-time / less-time / why. Each logs to activity JSON on profile. First wrong marked → assumes rest correct until next wrong.
15. Failure + deviation log table — feeds Wave 4 coach + next-day recalibration.
16. Food log — custom items table w/ macros. Daily calorie + protein/fat/carb tally. Recommend food based on remaining macros (target depends on weight-phase: cut / maintain / muscle-retain). Fast-add by search.
17. Weight tracker — daily kg, chart, trajectory line to 75 and 70kg, days-to-target from 14d slope.
18. Dev ritual tracker — daily LeetCode/system-design timer, GitHub commit count (manual or via PAT later), deep-work pomodoro cluster, weekly output summary.
19. Screen-time manual log — TV/games/anime minutes vs deep-work minutes. Visible ratio. Later: browser extension + iOS Shortcut.

### Wave 4 — AI Coach + "What to Do Today" + Goal Probability + Always-Open Ritual

Feel: opening the app solves decision fatigue and tells user their odds.

20. AM intent screen — 3 lines + "if I don't do this I'll regret…" + sleep input from last night + today's PSI.
21. PM review — wins / wastes / 1-10 score. Feeds LifeScore + coach.
22. "What can I do today?" page — takes habits + tasks + mood + PSI + mana + time-left-in-day → recommends ranked list. Random-task picker button for decision paralysis.
23. Eisenhower quadrants view for the day — urgent/important grid. Tasks drag between.
24. Goal probability engine — each of user's 3 core goals (SWE, 70kg, better-job) shows live probability of success at target date. Probability shifts with every activity log (positive/negative delta). Daily history chart.
25. Weekly "what did you achieve" + weekly gratitude prompts — Sunday PM review.
26. AI Personal Coach — single agent reading all logs. Proposes daily plan. Nags when stats drift. Uses existing ChatBot infra, new system prompt. Can reply with a joke if input nonsensical.
27. Quick-log — `Q` keystroke / FAB on mobile: 1-tap weight / water / workout / temptation / win.
28. Home dashboard rewrite — card grid: days-left, LifeScore, intent, sleep-last-night, weight trend, streak, top-waste-this-week, goal probabilities, mana remaining. Glance-able.
29. Voice journal — audiopen-style record button. Whisper transcribe. Extract mood + feed PSI. Uses @saas-maker/ai.

### Wave 5 — Life RPG / Level Up

Feel: King's League Odyssey for self. Fear-of-loss loop.

30. XP + LifeScore 0-100 (decays 1pt/day idle).
31. Life-RPG stat sheet — Strength (gym), Mind (dev hours + leet), Discipline (sleep on time), Resilience (hit weekly weight), Craft (ship code), Health (food macros hit). Stats rise from logged activity.
32. Streaks — consecutive AM+PM + sleep-on-time. Break = XP burn + big red alert.
33. Daily quest generator — 3 quests / day from habits+tasks+goals, grant XP + stats.
34. Habit upgrade chain — habits evolve (30min walk → run → HIIT). User picks upgrade when ready; app gates on mastery threshold.
35. Alter ego per time-block — "The Engineer" 9-12am, "The Athlete" 6-8pm. Shown in navbar.

### Wave 6 — CUT (2026-04-18)

User has a separate app for spaced-repetition / Feynman / reading. Scope removed.

## Non-Goals (explicit)

- Social / groups / accountability partner / Blindfold / shareable schedules
- Multi-user / assignee flow / team features / FocusMate
- Monetization / corporate billing / gifted subs / affiliate
- Text App / code-message product (separate)
- Mental Health Duolingo clone (cherry-pick nag style only)

## Deferred (not this quarter)

- WhatsApp / Siri / GCal live listening
- OCR handwritten notes
- Onboarding quiz / MyFreeTimeInAWeek
- Alter-ego voice packs / soundtrack generation

## Ship Order

1. Wave 1 wire-up + ship + deploy. Get feedback.
2. Wave 2 (sleep + URGE + mana + PSI). Requires schema changes + @saas-maker/ai hook for PSI.
3. Wave 3 (schedule + food + weight + dev). Biggest data-model wave.
4. Wave 4 (coach + dashboards + voice).
5. Wave 5 (RPG + quests).

Each wave: own PR, own deploy, tested end-to-end in browser before next wave starts.
