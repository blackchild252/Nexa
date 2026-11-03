# Planner Contract

Every App Builder task should produce a machine-readable task record before coding.

Required fields:
- `taskId`
- `request`
- `affectedAreas`
- `architectureConstraints`
- `preserve`
- `testsRequired`
- `destructiveChanges`
- `approvalRequired`
- `acceptanceCriteria`

The planner must explicitly identify existing functionality that must remain unchanged.

Template: `docs/builder/TASK_TEMPLATE.json`.
