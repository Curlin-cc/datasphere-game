"""Guided mode (Curlin, 14.10.2026): choice at the start of a new game, Settings › Guidance, auto-advance, auto-open of
navigation steps with the learning-aid note, no auto-open over an editor with unsaved changes, self-directed = old behaviour."""
import json
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter5_data import TENANT5

S = sys.argv[1] if len(sys.argv) > 1 else '.'
DONE = {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 30, "events": []}
fails = []


def ok(cond, label):
    print('  ', 'PASS' if cond else 'FAIL', label)
    if not cond:
        fails.append(label)


def title(pg):
    return pg.inner_text('.tour-card h2') if pg.locator('.tour-card').count() else None


def wait_title(pg, t, timeout=6000):
    pg.wait_for_function("t => document.querySelector('.tour-card h2')?.textContent === t", arg=t, timeout=timeout)


def saved(pg):
    return json.loads(pg.evaluate("localStorage.getItem('dsg-progress-v3')"))


def m02(mode):
    s = save_before(0, 'c00-m02', xp=30)
    s['missions'] = {'c00-m00': DONE, 'c00-m01': DONE}
    s['guidance'] = mode
    return s


with sync_playwright() as p:
    # 1. New game: the choice comes up once, names the learning aid, Guided is stored.
    g = Game(p, S); pg = g.pg
    # Pick Guided before the shared auto-confirm (common.py) clicks the default button.
    pg.add_init_script("""new MutationObserver(() => { const dlg = document.querySelector('.mode-dlg');
        if (dlg && !dlg.dataset.seen) { dlg.dataset.seen = '1'; dlg.querySelector('[type="submit"]').dataset.auto = '1';
          window.__tourAtChoice = !!document.querySelector('.tour-card');
          setTimeout(() => { window.__modeText = dlg.innerText; dlg.querySelector('[data-mode="guided"]').click(); }, 100); } })
        .observe(document, { childList: true, subtree: true });""")
    g.start()
    pg.wait_for_function("!!window.__modeText", timeout=15000)
    pg.wait_for_timeout(300)
    text = pg.evaluate("window.__modeText || ''")
    ok('Guided' in text and 'Self-directed' in text, 'choice dialog shows Guided and Self-directed')
    ok('learning aid' in text and 'real SAP Datasphere' in text, 'choice dialog labels guided mode as a learning aid')
    ok(pg.evaluate("window.__tourAtChoice") is False, 'choice comes before the first tutorial window')
    pg.wait_for_selector('.tour-card', timeout=6000)
    ok(pg.locator('.tour.guided').count() == 1, 'first tutorial opens after the choice, already guided')
    ok(saved(pg).get('guidance') == 'guided', 'choice stored in the save')
    g.shot('gm-start')
    g.b.close()

    # 2. Old save with progress and no setting: no question, behaves as before.
    g = Game(p, S); pg = g.pg
    g.start(m02(None)); pg.wait_for_timeout(400)
    ok(pg.locator('.mode-dlg').count() == 0, 'existing save is not asked')
    ok(saved(pg).get('guidance') == 'self', 'existing save defaults to self-directed')
    # Self-directed: the navigation step waits for the click.
    wait_title(pg, 'Spaces first'); pg.click('.tour-card [data-act="next"]')
    wait_title(pg, 'Open Data Builder'); pg.wait_for_timeout(2000)
    ok(title(pg) == 'Open Data Builder', 'self-directed: nothing opens by itself')
    ok(pg.locator('.tour-aid').count() == 0, 'self-directed: no learning-aid note')
    # Settings › Guidance switches to guided and persists.
    pg.click('.tour-card [data-act="skip"]')
    pg.click('#shell-user')
    pg.click('[data-um="settings"]'); pg.click('[data-set="guidance"]')
    ok('learning aid' in pg.inner_text('#set-pane'), 'Settings › Guidance shows the learning-aid note')
    pg.check('[name="set-guidance"][value="guided"]'); pg.wait_for_timeout(200)
    ok(saved(pg).get('guidance') == 'guided', 'Settings switch to guided is saved')
    g.b.close()

    # 3. Guided: passive step keeps the page clickable, navigation opens by itself with the note, the tour moves on.
    g = Game(p, S); pg = g.pg
    g.start(m02('guided'))
    wait_title(pg, 'Spaces first')
    ok(pg.evaluate("getComputedStyle(document.querySelector('.tour')).pointerEvents") == 'none', 'guided: page stays clickable in passive steps')
    ok(pg.evaluate("getComputedStyle(document.querySelector('.tour-spot')).animationName") == 'tour-pulse', 'guided: target pulses')
    pg.click('.tour-card [data-act="next"]')
    wait_title(pg, 'Open Data Builder')
    pg.wait_for_selector('.tour-aid', timeout=4000)
    ok('Learning aid' in pg.inner_text('.tour-aid'), 'guided: auto-open is labelled as a learning aid')
    wait_title(pg, 'Select RHN_ENTRY', timeout=6000)
    ok(pg.locator('.nav [data-view="builder"][aria-current="page"]').count() == 1, 'guided: Data Builder opened by itself, tour moved on')
    g.shot('gm-auto-open')
    g.b.close()

    # 4. Guided, editor with unsaved changes: the game opens nothing over it, the text stays, the step waits.
    g = Game(p, S); pg = g.pg
    s = save_before(5, 'c05-m01', TENANT5); s['guidance'] = 'guided'
    g.start(s)
    g.skip_tutorial()
    g.nav('builder')
    if pg.locator('#space-picker').count() == 0:
        pg.click('#space-switch')
    pg.click('[data-space="RHN_ENTRY"]'); pg.wait_for_selector('#new-tiles')
    pg.click('[data-new="sqlview"]'); pg.wait_for_selector('#editor'); pg.wait_for_timeout(300)
    g.sql('SELECT CONTRACT_ID FROM RHN_ENTRY.BILLING_CONTRACTS -- unsaved work')
    pg.click('#tutorial-open')
    for _ in range(12):
        if title(pg) == 'Space RHN_DSL':
            break
        if title(pg) and pg.locator('.tour-card:not(.acting) [data-act="next"]').count():
            pg.click('.tour-card [data-act="next"]')
        pg.wait_for_timeout(300)
    wait_title(pg, 'Space RHN_DSL')
    pg.wait_for_timeout(2000)
    ok(title(pg) == 'Space RHN_DSL', 'unsaved editor: step waits')
    ok('unsaved work' in pg.inner_text('.cm-content'), 'unsaved editor: SQL text kept')
    ok('unsaved changes' in (pg.inner_text('.tour-aid') if pg.locator('.tour-aid').count() else ''), 'unsaved editor: note explains why nothing opened')
    g.shot('gm-unsaved')
    print('ERRORS', g.errors)
    g.b.close()

    # 5. Guided, editor open without changes (new local table): counts as clean, so the space still opens by itself.
    g = Game(p, S); pg = g.pg
    s = save_before(5, 'c05-m01', TENANT5); s['guidance'] = 'guided'
    g.start(s)
    g.skip_tutorial()
    g.space('RHN_ENTRY')
    pg.click('[data-new="table"]'); pg.wait_for_timeout(800)
    pg.click('#tutorial-open')
    for _ in range(12):
        if title(pg) == 'Space RHN_DSL':
            break
        if title(pg) and pg.locator('.tour-card:not(.acting) [data-act="next"]').count():
            pg.click('.tour-card:not(.acting) [data-act="next"]')
        pg.wait_for_timeout(300)
    pg.wait_for_function("document.querySelector('.tour-card h2')?.textContent !== 'Space RHN_DSL'", timeout=6000)
    ok('RHN_DSL' in pg.inner_text('#space-switch'), 'clean editor (no changes): space opened by itself')

    # 6. Guided, a half-filled Security form (Create a Scoped Role dialog): nothing opens over it.
    g.skip_tutorial()
    g.nav('security'); pg.click('.nav [data-sec="roles"]'); pg.wait_for_timeout(400)
    pg.click('#add-role'); pg.click('#create-role'); pg.wait_for_selector('.guide-overlay form input')
    pg.locator('.guide-overlay form input:not([readonly])').first.fill('RHN_PLAYTEST')
    pg.evaluate("document.querySelector('#tutorial-open').click()")
    for _ in range(12):
        if title(pg) == 'Open Data Builder':
            break
        if title(pg) and pg.locator('.tour-card:not(.acting) [data-act="next"]').count():
            pg.evaluate("document.querySelector('.tour-card [data-act=\"next\"]').click()")
        pg.wait_for_timeout(300)
    pg.wait_for_timeout(2000)
    ok(title(pg) == 'Open Data Builder' and pg.locator('.nav [data-view="builder"][aria-current="page"]').count() == 0
       and pg.locator('.guide-overlay form input').count() > 0, 'unsaved Security form: nothing opened, dialog kept')
    # The learning-aid note scales with the font size setting (--fs, PR #14).
    sizes = pg.evaluate("() => { const e = document.querySelector('.tour-aid'); const a = parseFloat(getComputedStyle(e).fontSize);"
                        " document.documentElement.style.setProperty('--fs', '1.3'); const b = parseFloat(getComputedStyle(e).fontSize);"
                        " document.documentElement.style.removeProperty('--fs'); return [a, b]; }")
    ok(abs(sizes[1] - sizes[0] * 1.3) < 0.3, f'learning-aid note scales with --fs {sizes}')
    print('ERRORS', g.errors)
    g.b.close()

    # 7. Self-directed: Next never opens or switches an app or space; the card says where to go and waits.
    g = Game(p, S); pg = g.pg
    s = save_before(5, 'c05-m01', TENANT5); s['guidance'] = 'self'
    g.start(s)
    g.skip_tutorial()
    g.space('RHN_ENTRY')
    pg.click('[data-new="sqlview"]'); pg.wait_for_selector('#editor'); pg.wait_for_timeout(300)
    g.sql('SELECT CONTRACT_ID FROM RHN_ENTRY.BILLING_CONTRACTS -- self-directed work')
    pg.click('#tutorial-open')
    for _ in range(12):
        if title(pg) == 'Space RHN_DSL':
            break
        if title(pg) and pg.locator('.tour-card:not(.acting) [data-act="next"]:not([disabled])').count():
            pg.click('.tour-card:not(.acting) [data-act="next"]')
        pg.wait_for_timeout(300)
    wait_title(pg, 'Space RHN_DSL'); pg.wait_for_timeout(1500)
    ok(pg.locator('#editor').count() == 1 and 'self-directed work' in pg.inner_text('.cm-content'), 'self-directed: Next leaves the view as it is (editor and SQL stay)')
    ok('Go to' in (pg.inner_text('.tour-aid') if pg.locator('.tour-aid').count() else ''), 'self-directed: card says where to go')
    g.shot('gm-self-goto')
    # The player goes there: the step is done by itself.
    g.space('RHN_DSL'); pg.wait_for_timeout(1500)
    ok(title(pg) != 'Space RHN_DSL', 'self-directed: step done once the player is there')

    # 7b. Self-directed from Home: Next through the whole intro, the app never changes.
    g.skip_tutorial()
    g.nav('home')
    pg.evaluate("document.querySelector('#tutorial-open').click()")
    for _ in range(8):
        pg.wait_for_timeout(300)
        if pg.locator('.tour-card:not(.acting) [data-act="next"]:not([disabled])').count():
            pg.click('.tour-card [data-act="next"]')
    ok(pg.locator('.nav [data-view="home"][aria-current="page"]').count() == 1, f'self-directed: still on Home after Next ({title(pg)})')
    g.b.close()

    # 4b. Guided: the unsaved-work note goes away after Save, and the held page opens.
    g = Game(p, S); pg = g.pg
    s = save_before(5, 'c05-m01', TENANT5); s['guidance'] = 'guided'
    g.start(s)
    g.skip_tutorial()
    g.space('RHN_ENTRY')
    pg.click('[data-new="sqlview"]'); pg.wait_for_selector('#editor'); pg.wait_for_timeout(300)
    g.sql('SELECT CONTRACT_ID FROM RHN_ENTRY.BILLING_CONTRACTS')
    pg.click('#tutorial-open')
    for _ in range(12):
        if title(pg) == 'Space RHN_DSL':
            break
        if title(pg) and pg.locator('.tour-card:not(.acting) [data-act="next"]').count():
            pg.click('.tour-card:not(.acting) [data-act="next"]')
        pg.wait_for_timeout(300)
    wait_title(pg, 'Space RHN_DSL'); pg.wait_for_timeout(1500)
    ok(pg.locator('.tour-aid.unsaved').count() == 1, 'guided: unsaved note shown')
    pg.fill('#prop-business', 'Playtest View'); pg.fill('#prop-technical', 'PLAYTEST_VIEW')
    pg.click('#ed-save'); pg.wait_for_timeout(1500)
    ok(pg.locator('.tour-aid.unsaved').count() == 0, 'guided: unsaved note gone after Save')
    ok(pg.locator('#new-tiles').count() == 1 or title(pg) != 'Space RHN_DSL', 'guided: held page opens after Save')

    # 8. Loading the sandbox keeps the chosen mode.
    g.skip_tutorial()
    g.nav('home'); pg.click('#save-sandbox'); pg.wait_for_timeout(2500)
    ok(saved(pg).get('guidance') == 'guided', 'sandbox keeps the chosen mode (guided)')
    print('ERRORS', g.errors)
    g.b.close()

print('guided_mode:', 'all passed' if not fails else f'FAILED {fails}')
if not fails:
    print('   GAIN guided_mode')
if fails:
    raise SystemExit(1)
