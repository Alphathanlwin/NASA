# Archived: Garvesty prototype (not built, not deployed)

This folder preserves the Garvesty implementation that lived on `main` at
commit `a2bf7e0` before the FieldShift build was merged in.

It is kept only as a record of the team's earlier direction: IoT sensor
ingest, hybrid physics/ML timeseries, and a ten-screen dashboard. It is not
installed, imported, tested or deployed by this repository. The active
application is the FieldShift digital twin described in
[`docs/FieldShift_Digital_Twin_Project.md`](../../docs/FieldShift_Digital_Twin_Project.md).

Why it is not the submitted product:

- It predicts yields and uses sensor/ML outputs that cannot be verified for
  the demo fields within the challenge window.
- Its screens do not follow the agreed analysis flow (field → plans →
  scenario → data & quality) or the provenance rules in the project spec.
- Large build artefacts (`.venv`, `node_modules`, `dist`, pnpm store) were
  tracked in Git on that branch; they have been untracked.

The commits are still reachable in history through the merge commit, so no
work was discarded. To inspect the original tree:

```bash
git log --oneline a2bf7e0
git show a2bf7e0:backend/app/services/iot.py
```
