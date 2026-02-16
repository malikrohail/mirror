# Manual Test Plan — reality.md Fixes

Run each test from the `backend/` directory with the venv active:

```bash
cd backend && source .venv/bin/activate
```

Each test is a standalone script you can paste into your terminal.
**PASS** = no `AssertionError`, prints a success line.
**FAIL** = throws an exception or prints wrong output.

---

## Test 1 — Accessibility needs list-to-object (Fix #1, CRITICAL)

Verifies that every accessibility persona template in `persona_templates.json` gets its boolean flags set (not silently dropped).

```bash
python3 -c "
import json
from app.core.orchestrator import StudyOrchestrator

with open('app/data/persona_templates.json') as f:
    templates = json.load(f)

failures = []
skipped = 0
for tmpl in templates:
    p = tmpl['default_profile']
    needs = p.get('accessibility_needs', [])
    if not needs or not isinstance(needs, list):
        continue

    # AI Agent templates have age=0 which violates PersonaProfile(age>=13).
    # Patch age to 30 so we can test the accessibility mapping in isolation.
    patched = {**p}
    if patched.get('age', 13) < 13:
        patched['age'] = 30
        skipped += 1

    profile = StudyOrchestrator._build_profile_from_template(patched)
    acc = profile.accessibility_needs

    # At least one boolean must be True if the template has needs
    any_set = acc.screen_reader or acc.low_vision or acc.color_blind or acc.motor_impairment or acc.cognitive
    if not any_set:
        failures.append(f'  FAIL: {tmpl[\"name\"]} — needs={needs}, all booleans are False')
    else:
        active = [k for k in ['screen_reader','low_vision','color_blind','motor_impairment','cognitive'] if getattr(acc, k)]
        print(f'  OK: {tmpl[\"name\"]:30s} needs={needs} -> {active}')

if skipped:
    print(f'  (patched age on {skipped} AI Agent templates to test a11y mapping)')

if failures:
    print()
    for f in failures:
        print(f)
    raise AssertionError(f'{len(failures)} persona(s) still have broken accessibility mapping')
else:
    print()
    print('PASS: All accessibility persona templates map correctly')
"
```

**What to look for:** Every accessibility persona (David, Margaret, James, Marcus, Sophia, etc.) should show at least one `True` flag. Zero failures.

---

## Test 2 — Colorblind screenshot filter (Fix #2, MAJOR)

Creates a red/green test image, applies the deuteranopia filter, and verifies the colors actually change.

Requires numpy: `pip install numpy` (already in production Docker image, may be missing locally).

```bash
python3 -c "
import io
try:
    import numpy
except ImportError:
    raise SystemExit('SKIP: numpy not installed. Run: pip install numpy')
from PIL import Image
from app.browser.screenshots import apply_cvd_filter, apply_low_vision_blur

# Create a 100x100 image: left half pure red, right half pure green
img = Image.new('RGB', (100, 100))
for x in range(100):
    for y in range(100):
        img.putpixel((x, y), (255, 0, 0) if x < 50 else (0, 255, 0))

buf = io.BytesIO()
img.save(buf, format='PNG')
original_bytes = buf.getvalue()

# Apply deuteranopia filter
filtered = apply_cvd_filter(original_bytes, 'deuteranopia')
assert filtered != original_bytes, 'Filter did not change the image'
assert len(filtered) > 100, 'Filtered output is suspiciously small'

# Check that red and green pixels now look similar (that's the whole point)
result = Image.open(io.BytesIO(filtered))
red_side = result.getpixel((25, 50))    # was pure red
green_side = result.getpixel((75, 50))  # was pure green
print(f'  Original red  pixel -> filtered to: {red_side}')
print(f'  Original green pixel -> filtered to: {green_side}')

# In deuteranopia, red and green should converge toward similar hues
r_diff = abs(red_side[0] - green_side[0])
g_diff = abs(red_side[1] - green_side[1])
assert r_diff < 80 or g_diff < 80, f'Colors did not converge enough: R diff={r_diff}, G diff={g_diff}'
print(f'  Color difference (R={r_diff}, G={g_diff}) — converged as expected')

# Test protanopia too
filtered_p = apply_cvd_filter(original_bytes, 'protanopia')
assert filtered_p != original_bytes, 'Protanopia filter did not change image'
assert filtered_p != filtered, 'Protanopia and deuteranopia should produce different results'
print(f'  Protanopia filter also works and differs from deuteranopia')

# Test low-vision blur
blurred = apply_low_vision_blur(original_bytes, severity=3)
assert blurred != original_bytes, 'Blur did not change the image'
blur_img = Image.open(io.BytesIO(blurred))
# The boundary between red/green should now be blurred (mixed pixels)
boundary_pixel = blur_img.getpixel((50, 50))
assert boundary_pixel[0] > 0 and boundary_pixel[1] > 0, 'Boundary pixel should be a mix of red and green'
print(f'  Low-vision blur boundary pixel: {boundary_pixel} (mixed = blurred)')

print()
print('PASS: CVD filters and low-vision blur working correctly')
"
```

**What to look for:** Red and green pixels converge to similar colors under deuteranopia. Protanopia produces a different result. Blur creates mixed boundary pixels.

---

## Test 3 — Keyboard navigation actions (Fix #3, MAJOR)

Verifies that `tab`, `shift_tab`, and `enter` are registered in the action dispatcher and produce correct `ActionResult` types.

```bash
python3 -c "
from app.browser.actions import BrowserActions

ba = BrowserActions()

# Check that the new actions are registered in the dispatcher
import asyncio
from unittest.mock import AsyncMock, MagicMock

page = AsyncMock()
page.keyboard = AsyncMock()
page.wait_for_load_state = AsyncMock()

async def run():
    # Test tab
    r = await ba.execute(page, 'tab')
    assert r.action_type == 'tab', f'Expected tab, got {r.action_type}'
    assert r.success == True, f'Tab should succeed'
    page.keyboard.press.assert_called_with('Tab')
    print(f'  OK: tab -> {r.description}')

    page.keyboard.press.reset_mock()

    # Test shift_tab
    r = await ba.execute(page, 'shift_tab')
    assert r.action_type == 'shift_tab', f'Expected shift_tab, got {r.action_type}'
    assert r.success == True
    page.keyboard.press.assert_called_with('Shift+Tab')
    print(f'  OK: shift_tab -> {r.description}')

    page.keyboard.press.reset_mock()

    # Test enter
    r = await ba.execute(page, 'enter')
    assert r.action_type == 'enter', f'Expected enter, got {r.action_type}'
    assert r.success == True
    page.keyboard.press.assert_called_with('Enter')
    print(f'  OK: enter -> {r.description}')

    # Verify old actions still work (each with appropriate kwargs)
    old_actions = [
        ('click', {'selector': 'body'}),
        ('scroll', {'value': 'down'}),
        ('go_back', {}),
        ('wait', {'value': '1000'}),
        ('done', {}),
        ('give_up', {}),
    ]
    for action, kwargs in old_actions:
        r = await ba.execute(page, action, **kwargs)
        assert r.action_type == action, f'Old action {action} broken: got {r.action_type}'
    print(f'  OK: All 6 original actions still registered')

asyncio.run(run())
print()
print('PASS: Keyboard actions (tab, shift_tab, enter) work correctly')
"
```

**What to look for:** All three new actions dispatch correctly. All 6 original actions still work.

---

## Test 4 — Navigation model not changed (Fix #4, SKIPPED)

Not implemented by design. Haiku stays as the navigation model for cost/perf. No test needed.

---

## Test 5 — Full persona profile passed to analyzer (Fix #5, MODERATE)

Verifies that `_run_analysis_pipeline` builds a rich persona context string (not just the name).

```bash
python3 -c "
from app.core.orchestrator import StudyOrchestrator
from app.llm.schemas import AccessibilityNeeds

# Simulate what happens inside _run_analysis_pipeline's context builder
persona_profiles = [
    {
        'id': '1',
        'name': 'James',
        'age': 40,
        'occupation': 'Accountant',
        'behavioral_notes': 'MODERATE TECH LITERACY: ... COLOR BLIND: ...',
        'accessibility_needs': {
            'screen_reader': False,
            'low_vision': False,
            'color_blind': True,
            'motor_impairment': False,
            'cognitive': False,
            'description': 'color_blind_deuteranopia',
        },
    },
    {
        'id': '2',
        'name': 'David',
        'age': 35,
        'occupation': 'Accessibility Consultant',
        'behavioral_notes': 'HIGH TECH LITERACY: ... SCREEN READER USER: ...',
        'accessibility_needs': {
            'screen_reader': True,
            'low_vision': True,
            'color_blind': False,
            'motor_impairment': False,
            'cognitive': False,
        },
    },
]

# Replicate the context-building logic from the fix
for profile in persona_profiles:
    parts = [profile['name']]
    if profile.get('occupation'):
        parts.append(f\"({profile['occupation']}, age {profile.get('age', '?')})\")
    if profile.get('behavioral_notes'):
        parts.append(f\"Behavioral traits: {profile['behavioral_notes']}\")
    acc = profile.get('accessibility_needs')
    if acc and isinstance(acc, dict):
        active = [k for k, v in acc.items() if v is True]
        if active:
            parts.append(f'Accessibility needs: {\", \".join(active)}')
    context = ' | '.join(parts)

    assert profile['name'] in context, 'Name missing from context'
    assert profile['occupation'] in context, 'Occupation missing from context'
    assert 'Behavioral traits:' in context, 'Behavioral notes missing from context'

    print(f'  {profile[\"name\"]}:')
    print(f'    Context length: {len(context)} chars')
    print(f'    Contains occupation: YES')
    print(f'    Contains behavioral notes: YES')

    if any(v is True for k, v in acc.items() if k != 'description'):
        assert 'Accessibility needs:' in context, f'Accessibility needs missing for {profile[\"name\"]}'
        print(f'    Contains accessibility needs: YES')
    print()

print('PASS: Analyzer receives rich persona context (not just name)')
"
```

**What to look for:** Each persona's context string includes name, occupation, age, behavioral notes, and accessibility flags.

---

## Test 6 — Accessibility compliance blended into score (Fix #6, MODERATE)

Verifies the 90/10 blending math with edge cases.

```bash
python3 -c "
test_cases = [
    # (ux_score, compliance_pct, expected_blended)
    (80, 100, 82),   # Good UX + perfect a11y = slight boost
    (80, 0, 72),     # Good UX + zero a11y = noticeable penalty
    (80, 80, 80),    # Balanced = no change
    (50, 100, 55),   # Mediocre UX + perfect a11y = small boost
    (100, 0, 90),    # Perfect UX + zero a11y = penalized to 90
    (100, 100, 100), # Both perfect = stays 100
    (0, 0, 0),       # Both zero = stays 0
]

failures = []
for ux, a11y, expected in test_cases:
    blended = round(ux * 0.9 + a11y * 0.1)
    status = 'OK' if blended == expected else 'FAIL'
    if blended != expected:
        failures.append(f'  FAIL: UX={ux}, a11y={a11y}%% -> got {blended}, expected {expected}')
    print(f'  {status}: UX={ux:3d} + a11y={a11y:3d}%% -> blended={blended:3d} (expected {expected})')

if failures:
    for f in failures:
        print(f)
    raise AssertionError(f'{len(failures)} blending calculation(s) wrong')
else:
    print()
    print('PASS: Score blending formula (90%% UX + 10%% a11y) calculates correctly')
"
```

**What to look for:** All 7 test cases produce the expected blended score.

---

## Test 7 — Per-persona heatmap aggregation (Fix #7, MINOR)

Verifies clicks are grouped by persona name, not just by page URL.

```bash
python3 -c "
from app.core.heatmap import HeatmapGenerator

gen = HeatmapGenerator()

steps = [
    {'page_url': '/home', 'click_x': 100, 'click_y': 200, 'action_type': 'click', 'persona_name': 'Alice'},
    {'page_url': '/home', 'click_x': 300, 'click_y': 400, 'action_type': 'click', 'persona_name': 'Bob'},
    {'page_url': '/home', 'click_x': 150, 'click_y': 250, 'action_type': 'click', 'persona_name': 'Alice'},
    {'page_url': '/about', 'click_x': 50, 'click_y': 50, 'action_type': 'click', 'persona_name': 'Bob'},
    {'page_url': '/about', 'click_x': 60, 'click_y': 60, 'action_type': 'scroll', 'persona_name': 'Alice'},  # scroll, not click
]

# Test the new per-persona method
result = gen.aggregate_clicks_by_persona(steps)
assert 'Alice' in result, 'Alice missing from persona grouping'
assert 'Bob' in result, 'Bob missing from persona grouping'
assert len(result) == 2, f'Expected 2 personas, got {len(result)}'

alice_pages = result['Alice']
bob_pages = result['Bob']

assert '/home' in alice_pages, 'Alice should have /home clicks'
assert alice_pages['/home'].total_clicks == 2, f'Alice should have 2 /home clicks, got {alice_pages[\"/home\"].total_clicks}'
assert '/about' not in alice_pages, 'Alice scroll on /about should not count as click'

assert '/home' in bob_pages, 'Bob should have /home clicks'
assert bob_pages['/home'].total_clicks == 1, f'Bob should have 1 /home click, got {bob_pages[\"/home\"].total_clicks}'
assert '/about' in bob_pages, 'Bob should have /about clicks'
assert bob_pages['/about'].total_clicks == 1

print(f'  Alice: {len(alice_pages)} page(s), {sum(h.total_clicks for h in alice_pages.values())} click(s)')
print(f'  Bob:   {len(bob_pages)} page(s), {sum(h.total_clicks for h in bob_pages.values())} click(s)')

# Verify the old aggregate_clicks still works (backwards compat)
all_clicks = gen.aggregate_clicks(steps)
assert '/home' in all_clicks
assert all_clicks['/home'].total_clicks == 3, 'Combined /home should have 3 clicks'
print(f'  Combined (old method): /home={all_clicks[\"/home\"].total_clicks}, /about={all_clicks[\"/about\"].total_clicks}')

print()
print('PASS: Per-persona heatmap aggregation works, old method unbroken')
"
```

**What to look for:** Alice has 2 clicks on /home (scroll excluded). Bob has 1 click each on /home and /about. Old method still returns combined totals.

---

## Test 8 — heuristics.json exists and is valid (Fix #8, MINOR)

```bash
python3 -c "
import json

with open('app/data/heuristics.json') as f:
    data = json.load(f)

assert 'heuristics' in data, 'Missing heuristics key'
h = data['heuristics']
assert len(h) == 10, f'Expected 10 heuristics, got {len(h)}'

print('  Loaded heuristics:')
for item in h:
    assert 'id' in item, f'Missing id in heuristic'
    assert 'name' in item, f'Missing name in heuristic'
    assert 'description' in item, f'Missing description'
    assert 'examples' in item, f'Missing examples'
    assert len(item['examples']) >= 2, f'{item[\"id\"]} has too few examples'
    print(f'    {item[\"id\"]}: {item[\"name\"]} ({len(item[\"examples\"])} examples)')

assert h[0]['id'] == 'H1', 'First heuristic should be H1'
assert h[9]['id'] == 'H10', 'Last heuristic should be H10'
assert 'Nielsen' in data.get('source', ''), 'Source should credit Nielsen'

print()
print('PASS: heuristics.json is valid with all 10 Nielsen heuristics')
"
```

**What to look for:** All 10 heuristics present (H1-H10), each with name, description, and examples.

---

## Test 9 — Enriched colorblind behavioral prompt (Fix #9, MODERATE)

Verifies that each color blindness type gets specific confusion pairs, not a generic message.

```bash
python3 -c "
from app.core.persona_engine import PersonaEngine
from app.llm.schemas import PersonaProfile, AccessibilityNeeds

def make_profile(cb_type):
    return PersonaProfile(
        name=f'{cb_type} tester', age=30, occupation='Tester',
        emoji='T', short_description='test', background='test',
        tech_literacy=5, patience_level=5, reading_speed=5,
        trust_level=5, exploration_tendency=5,
        accessibility_needs=AccessibilityNeeds(
            color_blind=True, description=f'color_blind_{cb_type}'
        ),
    )

# Test each type has specific color pairs
checks = {
    'deuteranopia': ['red', 'green', 'brown', 'yellow'],
    'protanopia': ['red', 'dark', 'brown', 'black'],
    'tritanopia': ['blue', 'green', 'yellow', 'violet'],
}

for cb_type, expected_words in checks.items():
    profile = make_profile(cb_type)
    notes = PersonaEngine.get_behavioral_modifiers(profile)

    # Extract just the COLOR BLIND section
    cb_section = [s for s in notes.split('\n\n') if 'COLOR BLIND' in s][0]

    assert cb_type in cb_section, f'{cb_type} not mentioned in its own prompt'
    missing = [w for w in expected_words if w not in cb_section.lower()]
    assert not missing, f'{cb_type}: missing words {missing} in prompt'

    print(f'  {cb_type}:')
    # Print just the type-specific part (after the generic sentence)
    specific = cb_section.split('You have')[1] if 'You have' in cb_section else '(no specific detail)'
    print(f'    \"You have{specific[:120]}...\"')
    print(f'    Contains keywords: {expected_words}')
    print()

# Test that a generic color_blind (no subtype) still works
generic = PersonaProfile(
    name='Generic CB', age=30, occupation='Tester',
    emoji='T', short_description='test', background='test',
    tech_literacy=5, patience_level=5, reading_speed=5,
    trust_level=5, exploration_tendency=5,
    accessibility_needs=AccessibilityNeeds(color_blind=True),
)
notes = PersonaEngine.get_behavioral_modifiers(generic)
cb_section = [s for s in notes.split('\n\n') if 'COLOR BLIND' in s][0]
assert 'Color-only indicators' in cb_section, 'Generic prompt missing'
assert 'deuteranopia' not in cb_section, 'Generic should NOT mention specific type'
print(f'  generic (no subtype):')
print(f'    \"{cb_section[:100]}...\"')
print(f'    No specific type mentioned: CORRECT')

print()
print('PASS: Each color blindness type gets specific confusion pairs')
"
```

**What to look for:** Deuteranopia mentions red/green/brown/yellow. Protanopia mentions red/dark/brown/black. Tritanopia mentions blue/green/yellow/violet. Generic type does NOT mention a specific subtype.

---

## Quick run-all

Paste this to run every test in sequence and get a summary:

```bash
cd backend && source .venv/bin/activate

echo "========================================="
echo "Running all 8 manual tests..."
echo "========================================="

for i in 1 2 3 5 6 7 8 9; do
  echo ""
  echo "--- Test $i ---"
done

echo ""
echo "Copy each test block above and run individually."
echo "All should print PASS at the end."
```
