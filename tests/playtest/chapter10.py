"""Chapter 10 (Operations): task chain in RHN_IN (CRM flow, delta flow refused), shared and nested in the nightly chain of
RHN_HARM (wrong order first), notification, schedule; the 2 a.m. failure (Tim's CAST) traced and fixed; Task Logs.
Start state: chapter10_data.py."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter10_data import TENANT10
from chapter6_data import CUSTOMERS

S = sys.argv[1] if len(sys.argv) > 1 else '.'
IN_CHAIN, NIGHTLY = 'RHN_IN.RHN_IN_TC_CRM', 'RHN_HARM.RHN_HARM_TC_NIGHTLY'

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg

    def add_step(key, expect_error=False):
        pg.click('#chain-add'); pg.wait_for_selector('.dialog')
        pg.check(f'.dialog [name="step"][value="{key}"]'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
        if pg.locator('.dialog').count():
            print('   refused:', pg.inner_text('.dialog .form-error')[:160])
            pg.click('.dialog [data-act="cancel"]')

    def new_chain(space, business, technical):
        g.space(space)
        pg.click('[data-new="taskchain"]'); pg.wait_for_selector('#chain-steps')
        pg.fill('#prop-business', business); pg.fill('#prop-technical', technical)

    def deploy():
        pg.click('#ed-deploy'); pg.wait_for_timeout(500)
        print('   deploy:', g.toast()[:140])

    def schedule(btn, freq):
        pg.click(btn); pg.check(f'[name="freq"][value="{freq}"]'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)

    def monitor(space, tab, name=None, attr=None):
        g.nav('monitor'); pg.select_option('#mon-space', space); pg.wait_for_timeout(200)
        pg.click(f'[data-mon-tab="{tab}"]'); pg.wait_for_timeout(200)
        if name:
            pg.click(f'[{attr}="{name}"]'); pg.wait_for_timeout(200)

    g.start(save_before(10, 'c10-m01', TENANT10))
    g.walk_tutorial(show=False)

    # ---------------- m01: chain in RHN_IN, delta flow refused, share, flow schedule left first
    new_chain('RHN_IN', 'CRM file', 'RHN_IN_TC_CRM')
    add_step('RHN_IN.RHN_IN_RF_CRM')
    add_step('RHN_IN.RHN_IN_RF_MDM', True)
    deploy()
    pg.click('#chain-run'); pg.wait_for_timeout(1200)
    print('   run:', g.toast()[:120])
    g.shot('c10-chain-in')
    g.answer('delta', 0)
    g.check('m01 not shared, schedule left, wrong answer')
    g.space('RHN_IN'); g.share(IN_CHAIN, 'RHN_HARM')
    monitor('RHN_IN', 'flows', 'RHN_IN_RF_CRM', 'data-flow'); schedule('#flow-schedule', 'None')
    g.answer('delta', 1)
    g.check('m01 solved')
    g.next_mission()

    # ---------------- m02: wrong order and no email first
    new_chain('RHN_HARM', 'Nightly', 'RHN_HARM_TC_NIGHTLY')
    add_step('RHN_HARM.RHN_HA_V_CUSTOMERS'); add_step(IN_CHAIN); add_step('RHN_HARM.RHN_HA_V_METER_READINGS')
    deploy()
    pg.click('#chain-run'); pg.wait_for_timeout(2000)
    g.answer('order', 1)
    g.check('m02 wrong order, no email, no schedule')
    pg.click('[data-up="1"]'); pg.wait_for_timeout(100)
    pg.check('#notify-fail'); pg.fill('#notify-to', 'LHOFFMANN, you@rheinau.example')
    deploy()
    schedule('#chain-schedule', 'Daily')
    pg.click('#chain-run'); pg.wait_for_timeout(2500)
    print('   steps:', pg.locator('#step-list tbody tr').all_inner_texts())
    g.shot('c10-nightly')
    g.check('m02 readings schedule left')
    monitor('RHN_HARM', 'views', 'RHN_HA_V_METER_READINGS', 'data-vw'); schedule('#vw-schedule', 'None')
    g.check('m02 solved')
    g.next_mission()
    pg.wait_for_timeout(3000)

    # ---------------- m03: the failed night, trace, fix, rerun
    monitor('RHN_HARM', 'chains', 'RHN_HARM_TC_NIGHTLY', 'data-chain')
    print('   failed run:', pg.inner_text('#run-log').replace('\n', ' | ')[:500])
    g.shot('c10-failed')
    pg.click('[data-step-open="RHN_HARM.RHN_HA_V_CUSTOMERS"]'); pg.wait_for_timeout(400)
    print('   view log:', pg.inner_text('#run-log').replace('\n', ' | ')[:300])
    g.answer('why-deploy', 1)
    g.check('m03 before the fix')
    g.space('RHN_HARM')
    g.edit_view('RHN_HARM.RHN_HA_V_CUSTOMERS', f"SELECT x.*, CAST(SUBSTR(x.CUSTOMER_ID, 3) AS INTEGER) AS CUSTOMER_NO\nFROM (\n{CUSTOMERS}\n) x")
    print('   deploy:', g.toast()[:120])
    g.check('m03 fixed, chain not rerun')
    monitor('RHN_HARM', 'chains', 'RHN_HARM_TC_NIGHTLY', 'data-chain'); pg.click('#chain-run'); pg.wait_for_timeout(2500)
    g.check('m03 solved')
    g.next_mission()
    pg.wait_for_timeout(500)

    # ---------------- m04: task logs
    g.nav('tasklogs'); pg.select_option('#tl-status', 'Failed'); pg.wait_for_timeout(200)
    print('   failed:', [r.replace('\t', ' | ') for r in pg.locator('#tasklog-list tbody tr').all_inner_texts()])
    g.answer('which', 1); g.answer('cause', 0); g.answer('why-logs', 1)
    g.check('m04 nothing opened, wrong cause')
    pg.locator('[data-log-row="RHN_IN.RHN_IN_RF_S4U"] [data-log]').first.click(); pg.wait_for_timeout(200)
    g.shot('c10-tasklogs')
    g.answer('cause', 1)
    g.check('m04 solved')
    g.done()
