# Mirror — Production Fix Plan

**Created:** 2026-02-14
**Issues:** Heatmap not working, Replay showing only one screenshot, Issue type categorization

---

## Issue 1: Heatmap Not Working

### Root Cause

The heatmap data exists in the database — the completed study has `click_x`/`click_y` values stored on steps 1-3. However, two problems prevent heatmaps from rendering:

1. **Some click actions have NULL coordinates** — Steps 4-5 have `click_x = NULL` because the navigator only captures click position when `action.selector` is present AND the element is found. If the CSS selector fails to resolve, coordinates are skipped.
2. **Heatmap page depends on page screenshots** — The heatmap overlay renders on top of a page screenshot. If the screenshot URL returns a 404 (which happens if the storage path doesn't resolve through the API correctly), the heatmap renders but is invisible (no background image).

### Database Evidence

```
step_number | action_type | click_x | click_y
1           | click       | 886     | 402
2           | click       | 886     | 402
3           | click       | 886     | 402
4           | type        | NULL    | NULL     ← expected (not a click)
5           | click       | NULL    | NULL     ← bug: click but no coords
```

### Fix Plan

#### Fix 1a: Capture click coordinates even when selector fails
**File:** `backend/app/core/navigator.py` (~line 435-450)

Currently, click position is only captured if the selector resolves. Change the logic to:
1. Try to get element bounding box from the selector first (current behavior)
2. If selector fails, fall back to using the accessibility tree to find the element's position
3. As a last resort, capture the mouse position after the click action via `page.evaluate('({x: window.lastClickX, y: window.lastClickY})')`

```python
# In _execute_action(), before the click:
click_x, click_y = None, None
if action_type == "click" and selector:
    try:
        click_x, click_y = await self._screenshots.get_click_position(page, selector)
    except Exception:
        # Fallback: get viewport center or last known position
        viewport = page.viewport_size
        if viewport:
            click_x = viewport["width"] // 2
            click_y = viewport["height"] // 2
```

#### Fix 1b: Ensure heatmap API returns correct screenshot URLs
**File:** `backend/app/services/session_service.py` (~line 89-159)

The `get_heatmap_data()` method builds `page_screenshots` dict. Verify that:
1. Screenshot paths use the same format as the screenshots API expects
2. The path is relative (e.g., `studies/{id}/sessions/{id}/steps/step_001.png`)

**File:** `backend/app/api/v1/screenshots.py`

Verify the screenshot serving route handles the full path correctly. The Docker volume mounts data at `/app/data`, so the full path should resolve to `/app/data/studies/...`.

#### Fix 1c: Handle empty heatmap data gracefully on frontend
**File:** `frontend/src/components/heatmap/click-heatmap.tsx`

Add a meaningful empty state when no click data exists:
```tsx
if (data.data_points.length === 0) {
  return <EmptyState message="No click data recorded for this study" />;
}
```

### Files to Change
- `backend/app/core/navigator.py` — click position fallback
- `backend/app/services/session_service.py` — verify screenshot path format
- `backend/app/api/v1/screenshots.py` — verify path resolution
- `frontend/src/components/heatmap/click-heatmap.tsx` — empty state

---

## Issue 2: Session Replay Showing Only One Screenshot

### Root Cause

The replay infrastructure is fully implemented (arrow navigation, timeline, keyboard shortcuts, autoplay). All 5 screenshots exist on disk. The problem is likely one of:

1. **Screenshot API returning 404** — The `screenshot_path` stored in the DB is `studies/{study_id}/sessions/{session_id}/steps/step_001.png` but the screenshot serving endpoint may not resolve this path correctly against the Docker volume mount.
2. **Frontend not navigating steps** — The replay defaults to step 1 and may not be showing the step navigation controls if the session data doesn't load correctly.

### Database Evidence

All 5 steps have valid `screenshot_path` values. All 5 PNG files exist on disk (164KB-215KB each).

### Fix Plan

#### Fix 2a: Verify screenshot serving works end-to-end
**Test command:**
```bash
curl -s -o /dev/null -w '%{http_code}' https://www.miror.tech/api/v1/screenshots/studies/69356ede-79bf-417c-a0eb-3d2fe62e9daa/sessions/191a062d-5925-4844-942d-9287bd77229d/steps/step_001.png
```

If this returns 404, the issue is in the screenshot serving route.

**File:** `backend/app/api/v1/screenshots.py`

Check that `FileStorage.get_screenshot_full_path()` resolves paths relative to `STORAGE_PATH` (which is `/app/data` in the Docker container).

**File:** `backend/app/storage/file_storage.py`

Verify `get_screenshot_full_path()` correctly joins `base_path + screenshot_path`:
```python
def get_screenshot_full_path(self, relative_path: str) -> Path:
    return self.base_path / relative_path  # Should produce /app/data/studies/...
```

#### Fix 2b: Ensure step navigation renders properly
**File:** `frontend/src/components/session/session-replay.tsx`

The replay component uses:
```typescript
const step = session?.steps.find((s) => s.step_number === currentStep);
```

Verify that `session.steps` actually contains all steps (not just the first one). Check the API response:
```bash
curl -s https://www.miror.tech/api/v1/sessions/{session_id} | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Steps: {len(d.get(\"steps\", []))}')
for s in d.get('steps', []):
    print(f'  Step {s[\"step_number\"]}: screenshot={s.get(\"screenshot_path\", \"NONE\")[:60]}')
"
```

#### Fix 2c: Add explicit prev/next arrows if missing from UI
**File:** `frontend/src/components/session/step-controls.tsx`

The step controls component already exists with prev/next buttons. But verify it's rendered in the replay page. The session-replay.tsx imports and renders `StepControls`:

```tsx
<StepControls
  currentStep={currentStep}
  totalSteps={totalSteps}
  isPlaying={isPlaying}
  onPrevious={() => setCurrentStep((s) => Math.max(1, s - 1))}
  onNext={() => setCurrentStep((s) => Math.min(totalSteps, s + 1))}
  onTogglePlay={() => setIsPlaying((p) => !p)}
  onJumpToStart={() => setCurrentStep(1)}
  onJumpToEnd={() => setCurrentStep(totalSteps)}
/>
```

If step controls are not visible, check if `totalSteps` is 0 (which would indicate the steps array is empty in the frontend).

### Files to Change
- `backend/app/api/v1/screenshots.py` — verify path resolution
- `backend/app/storage/file_storage.py` — verify path joining
- `frontend/src/components/session/session-replay.tsx` — debug step loading
- `frontend/src/components/session/step-controls.tsx` — verify rendering

---

## Issue 3: Issue Type Categorization Endpoint

### Current State

Issues currently have:
- `severity`: critical | major | minor | enhancement
- `heuristic`: Nielsen's 10 heuristic name (text, e.g., "Error prevention")
- `wcag_criterion`: WCAG code (nullable, e.g., "1.4.3")

There is **no `type` field**. The user wants issues categorized as:
- **UX** — general usability improvements (layout, flow, clarity)
- **Accessibility** — a11y/WCAG issues (contrast, keyboard, screen reader)
- **Error** — broken functionality (failed clicks, 404s, unresponsive elements)
- **Performance** — slow loads, lag, timeouts

### Fix Plan

#### Fix 3a: Add `issue_type` column to the database

**New migration:** `backend/alembic/versions/005_add_issue_type.py`

```python
def upgrade():
    op.add_column('issues', sa.Column('issue_type', sa.String(50), nullable=True, server_default='ux'))
    # Backfill existing issues based on heuristic/wcag fields
    op.execute("""
        UPDATE issues SET issue_type = 'accessibility'
        WHERE wcag_criterion IS NOT NULL
           OR heuristic ILIKE '%accessibility%';
    """)
    op.execute("""
        UPDATE issues SET issue_type = 'error'
        WHERE heuristic ILIKE '%error%'
           OR heuristic ILIKE '%recovery%'
           OR description ILIKE '%broken%'
           OR description ILIKE '%404%'
           OR description ILIKE '%failed%'
           OR description ILIKE '%unresponsive%';
    """)
    op.execute("""
        UPDATE issues SET issue_type = 'performance'
        WHERE description ILIKE '%slow%'
           OR description ILIKE '%loading%'
           OR description ILIKE '%timeout%'
           OR description ILIKE '%lag%';
    """)
    # Everything else stays as 'ux' (the default)
    op.execute("UPDATE issues SET issue_type = 'ux' WHERE issue_type IS NULL;")
    op.alter_column('issues', 'issue_type', nullable=False)
```

#### Fix 3b: Update the Issue model

**File:** `backend/app/models/issue.py`

```python
import enum

class IssueType(str, enum.Enum):
    UX = "ux"
    ACCESSIBILITY = "accessibility"
    ERROR = "error"
    PERFORMANCE = "performance"

class Issue(Base, UUIDMixin, TimestampMixin):
    # ... existing fields ...
    issue_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="ux"
    )
```

#### Fix 3c: Update LLM schemas to output issue type

**File:** `backend/app/llm/schemas.py`

```python
class IssueType(str, Enum):
    ux = "ux"
    accessibility = "accessibility"
    error = "error"
    performance = "performance"

class UXIssue(BaseModel):
    element: str
    description: str
    severity: Severity
    heuristic: str
    wcag_criterion: str | None = None
    recommendation: str
    issue_type: IssueType = IssueType.ux  # NEW
```

#### Fix 3d: Update LLM prompts to classify issue type

**File:** `backend/app/llm/prompts.py`

Add to the navigation and screenshot analysis prompts:

```
For each issue, classify its type:
- "ux" — general usability (layout, flow, clarity, readability, consistency)
- "accessibility" — WCAG/a11y issues (contrast, keyboard nav, screen reader, alt text)
- "error" — broken functionality (failed clicks, 404s, unresponsive elements, JS errors)
- "performance" — slow loads, lag, timeouts, large images, render blocking
```

#### Fix 3e: Update API endpoint with type filter

**File:** `backend/app/api/v1/sessions.py` (the issues endpoint)

```python
@router.get("/studies/{study_id}/issues", response_model=list[IssueOut])
async def list_issues(
    study_id: uuid.UUID,
    severity: str | None = None,
    issue_type: str | None = None,  # NEW
    persona_id: uuid.UUID | None = None,
    page_url: str | None = None,
    db: AsyncSession = Depends(get_db),
):
```

Add filtering:
```python
if issue_type:
    query = query.where(Issue.issue_type == issue_type)
```

#### Fix 3f: Update API response schema

**File:** `backend/app/schemas/session.py` (or wherever IssueOut is defined)

```python
class IssueOut(BaseModel):
    # ... existing fields ...
    issue_type: str = "ux"  # NEW
```

#### Fix 3g: Update frontend types

**File:** `frontend/src/types/index.ts`

```typescript
export type IssueType = 'ux' | 'accessibility' | 'error' | 'performance';

export interface IssueOut {
  // ... existing fields ...
  issue_type: IssueType;
}
```

#### Fix 3h: Add type filter to frontend issues tab

**File:** `frontend/src/components/results/issues-tab.tsx`

Add a second filter row for issue type alongside the existing severity filter:

```tsx
const ISSUE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'ux', label: 'UX', icon: Layout },
  { value: 'accessibility', label: 'Accessibility', icon: Eye },
  { value: 'error', label: 'Error', icon: AlertTriangle },
  { value: 'performance', label: 'Performance', icon: Zap },
];

const [typeFilter, setTypeFilter] = useState<string>('all');

const filtered = useMemo(() => {
  let result = issues ?? [];
  if (typeFilter !== 'all') result = result.filter(i => i.issue_type === typeFilter);
  if (severityFilter !== 'all') result = result.filter(i => i.severity === severityFilter);
  return result;
}, [issues, typeFilter, severityFilter]);
```

#### Fix 3i: Add type badge to issue cards

**File:** `frontend/src/components/results/issue-card.tsx`

Add a colored badge showing the issue type:

```tsx
const TYPE_COLORS = {
  ux: 'bg-blue-50 text-blue-700 border-blue-200',
  accessibility: 'bg-purple-50 text-purple-700 border-purple-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  performance: 'bg-amber-50 text-amber-700 border-amber-200',
};
```

### Files to Change
- `backend/alembic/versions/005_add_issue_type.py` — new migration
- `backend/app/models/issue.py` — add IssueType enum + column
- `backend/app/llm/schemas.py` — add issue_type to UXIssue
- `backend/app/llm/prompts.py` — instruct LLM to classify types
- `backend/app/api/v1/sessions.py` — add type filter param
- `backend/app/schemas/session.py` — add issue_type to IssueOut
- `frontend/src/types/index.ts` — add IssueType type
- `frontend/src/components/results/issues-tab.tsx` — add type filter UI
- `frontend/src/components/results/issue-card.tsx` — add type badge

---

## Summary

| Issue | Root Cause | Effort | Priority |
|-------|-----------|--------|----------|
| Heatmap not working | Click coords sometimes NULL + screenshot path resolution | Small | High |
| Replay one screenshot | Screenshot API path resolution + verify step loading | Small | High |
| Issue type endpoint | No type field exists — needs DB migration + LLM prompt + frontend | Medium | Medium |

### Suggested Order of Implementation

1. **Fix screenshot serving** (unblocks both heatmap + replay)
2. **Fix heatmap click data** (coordinates fallback)
3. **Add issue type** (DB → LLM → API → frontend)

### Total Files Changed: ~15
### Estimated Implementation Time: 1-2 sessions
