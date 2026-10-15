"""Unsaved changes in guided mode (review of #13, 14.10.2026): change a SQL text, a form field, a data-flow node or a table,
do not save, open the tutorial and press Next. The step's page must not open over the work and the unsaved note must show;
after Save the note goes and the held page opens. Editors that draw #main again on every change (data flow, table) must
keep counting as unsaved. Start: progress up to chapter 12 (all builder tiles open), mission c05-m01, editor in RHN_ENTRY; the held step is
'Space RHN_DSL' (guided_mode.py plays the same step)."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter12_data import TENANT12

S = sys.argv[1] if len(sys.argv) > 1 else '.'
DONE = {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 40, "events": []}
fails = []


def ok(cond, label):
    print('  ', 'PASS' if cond else 'FAIL', label)
    if not cond:
        fails.append(label)


def title(pg):
    return pg.inner_text('.tour-card h2') if pg.locator('.tour-card').count() else None


def unsaved(pg):
    """pageUnsaved() straight from the module (the dev server serves the same instance)."""
    pg.wait_for_timeout(400)
    return pg.evaluate("import('/src/dirty.ts').then(m => m.pageUnsaved())")


def case(p, name, open_editor, change, save, redraw=None):
    print('---', name)
    g = Game(p, S); pg = g.pg
    s = save_before(12, 'c05-m01', TENANT12); s['guidance'] = 'guided'
    for m in [f'c12-m0{i}' for i in range(1, 10)]:
        s['missions'][m] = DONE
    s['tenant'] = dict(s['tenant'], activeSpace='RHN_ENTRY')
    g.start(s); g.skip_tutorial(); g.space('RHN_ENTRY')
    open_editor(pg, g); pg.wait_for_timeout(600)
    ok(unsaved(pg) is False, f'{name}: freshly opened editor is clean')
    change(pg, g)
    ok(unsaved(pg) is True, f'{name}: change counts as unsaved')
    if redraw:
        redraw(pg)
        ok(unsaved(pg) is True, f'{name}: still unsaved after the editor drew itself again')
    pg.evaluate("document.querySelector('#tutorial-open').click()")
    # Next through the intro, decided in one go in the page so a card that just became the hands-on step is never skipped.
    for _ in range(15):
        if pg.evaluate("""() => { const c = document.querySelector('.tour-card'); if (!c) return false;
            if (c.querySelector('h2')?.textContent === 'Space RHN_DSL') return true;
            if (!c.classList.contains('acting')) c.querySelector('[data-act="next"]')?.click(); return false; }"""):
            break
        pg.wait_for_timeout(300)
    pg.wait_for_timeout(1500)
    ok(title(pg) == 'Space RHN_DSL' and pg.locator('.editor-page').count() == 1 
       and 'RHN_ENTRY' in pg.inner_text('.ed-title small'),
       f'{name}: Next opens nothing over the work')
    ok(pg.locator('.tour-aid.unsaved').count() == 1, f'{name}: unsaved note shown')
    save(pg, g); pg.wait_for_timeout(1800)
    ok(pg.locator('.tour-aid.unsaved').count() == 0, f'{name}: note gone after Save')
    pg.wait_for_selector('#space-switch', timeout=6000)
    ok('RHN_DSL' in pg.inner_text('#space-switch'), f'{name}: held space opens after Save')
    print('ERRORS', g.errors)
    if g.errors:
        fails.append(f'{name}: page errors')
    g.b.close()


def open_sql(pg, g):
    pg.click('[data-new="sqlview"]'); pg.wait_for_selector('#editor'); pg.wait_for_timeout(300)


def save_sql(name):
    def f(pg, g):
        pg.fill('#prop-business', name); pg.fill('#prop-technical', name.upper().replace(' ', '_'))
        g.sql('SELECT CONTRACT_ID FROM RHN_ENTRY.BILLING_CONTRACTS'); pg.click('#ed-save')
    return f


def open_df(pg, g):
    pg.click('[data-new="dataflow"]'); pg.wait_for_selector('#df-canvas')


def change_df(pg, g):
    opts = pg.eval_on_selector_all('#df-source option', 'os => os.map(o => o.value).filter(Boolean)')
    pg.select_option('#df-source', opts[0])


def save_df(pg, g):
    pg.click('#df-general'); pg.wait_for_timeout(200)
    pg.fill('#prop-business', 'Dirty Check Flow'); pg.wait_for_timeout(100)
    pg.click('#ed-save')


def open_table(pg, g):
    pg.click('[data-new="table"]'); pg.wait_for_selector('#tbl-add-col')


def save_table(pg, g):
    pg.fill('#prop-technical', 'DIRTY_CHECK_TABLE'); pg.wait_for_timeout(100)
    pg.click('#ed-save')


with sync_playwright() as p:
    case(p, 'SQL text', open_sql, lambda pg, g: g.sql('SELECT CONTRACT_ID FROM RHN_ENTRY.BILLING_CONTRACTS -- unsaved'), save_sql('Dirty Check View'))
    case(p, 'form field', open_sql, lambda pg, g: pg.fill('#prop-business', 'Dirty Check Name'), save_sql('Dirty Check Name'))
    case(p, 'data-flow node', open_df, change_df, save_df,
         redraw=lambda pg: (pg.click('[data-node="target"]'), pg.wait_for_timeout(300)))
    case(p, 'local table', open_table, lambda pg, g: pg.fill('#prop-business', 'Dirty Check Table'), save_table,
         redraw=lambda pg: (pg.click('#tbl-add-col'), pg.wait_for_timeout(300)))

print('dirty_check:', 'all passed' if not fails else f'FAILED {fails}')
if not fails:
    print('   GAIN dirty_check')
if fails:
    raise SystemExit(1)
