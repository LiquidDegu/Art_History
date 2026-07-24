# Art History

A Duolingo-style mobile app teaching art history through bite-sized lessons
and quizzes, from Antiquity to Modern/Contemporary. See
[`docs/art-history-app-project-plan.md`](docs/art-history-app-project-plan.md)
for the full product plan, data model, and build roadmap, and
[`docs/art-history-app-prototype.jsx`](docs/art-history-app-prototype.jsx) for
the reference UI prototype (interaction/feel only — not production code, per
the plan's Section 0).

## Status

Build Roadmap Step 1 only (see plan Section 9): the [content
pipeline](backend/README.md) that pulls and normalizes a public-domain
artwork sample into the plan's Section 5 data model, currently from three of
the plan's six named CC0 sources (Met, Cleveland, Art Institute of Chicago —
see `backend/README.md` for why Smithsonian/NGA/Getty aren't wired up yet).
Nothing from later steps (app shell, local persistence, PocketBase backend,
auth, push notifications, monetization) has been started yet.

## Layout

```
docs/     product plan + reference UI prototype
backend/  self-hosted backend + content pipeline (Step 1 so far)
```
