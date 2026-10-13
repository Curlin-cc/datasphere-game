"""Chapter 9 (Persistence and Performance): expensive statement tracing, Expensive Statement Logs, View Analyzer, persisting
the harmonized meter readings, schedule, and the limits (protected source, small view). Plays typical mistakes first.
Start state: chapter9_data.py."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter9_data import TENANT9

S = sys.argv[1] if len(sys.argv) > 1 else '.'

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg

    def tracing(on, ms):
        g.nav('system'); pg.click('[data-tab="monitoring"]'); pg.wait_for_selector('#tracing-form')
        pg.set_checked('#tracing-on', on); pg.select_option('#tracing-threshold', str(ms))
        pg.click('#tracing-form button[type="submit"]'); pg.wait_for_timeout(800)

    def views(space, name=None):
        g.nav('monitor'); pg.select_option('#mon-space', space); pg.wait_for_timeout(200)
        pg.click('[data-mon-tab="views"]'); pg.wait_for_selector('#view-list')
        if name:
            pg.click(f'[data-vw="{name}"]'); pg.wait_for_selector('#view-detail')

    def act(btn):
        pg.click(btn); pg.wait_for_timeout(700)
        print('   ', btn, '→', g.toast())

    def model_runtime():
        g.space('RHN_PRES')
        pg.click('[data-list="models"]')
        pg.click('#object-list [data-open="RHN_PRES.RHN_PR_AM_CONSUMPTION"]'); pg.wait_for_selector('#am-pivot')
        pg.check('[data-prow="RHN_DS_D_GRID_AREA.REGION"]'); pg.click('#run')
        pg.wait_for_selector('#am-out .result-status')
        print('   model:', pg.inner_text('#am-out .result-status'))

    g.start(save_before(9, 'c09-m01', TENANT9))
    g.walk_tutorial(show=False)

    # ---------------- m01: nothing done, then threshold 5000, then right
    g.check('m01 nothing done')
    tracing(True, 5000)
    g.nav('statements')
    print('   statements:', pg.locator('#statement-list tbody tr').count())
    g.answer('slowest', 0); g.answer('howlong', 1)
    g.check('m01 threshold 5000, wrong answers')
    tracing(True, 1000)
    g.nav('statements'); pg.select_option('#st-sort', 'duration'); pg.wait_for_timeout(200)
    print('   top:', pg.locator('#statement-list tbody tr').first.inner_text().replace('\t', ' | '))
    g.shot('c9-statements')
    g.answer('slowest', 1); g.answer('howlong', 2)
    g.check('m01 solved')
    g.next_mission()

    # ---------------- m02: persist the fact first (wrong level), then the readings
    views('RHN_DSL', 'RHN_DS_F_CONSUMPTION')
    act('#vw-analyzer'); pg.wait_for_selector('#analyzer')
    g.shot('c9-analyzer')
    act('#vw-persist')
    model_runtime()
    g.answer('why-here', 1); g.answer('after', 1)
    g.check('m02 fact persisted')
    views('RHN_DSL', 'RHN_DS_F_CONSUMPTION'); act('#vw-remove')
    views('RHN_DSL', 'RHN_DS_V_METER_READINGS'); act('#vw-persist')
    print('   run log:', pg.inner_text('#run-log').replace('\n', ' | ')[:300])
    g.shot('c9-persisted')
    model_runtime()
    g.check('m02 solved')
    g.next_mission()

    # ---------------- m03: weekly first, then daily; reload keeps the snapshot
    views('RHN_DSL', 'RHN_DS_V_METER_READINGS')
    pg.click('#vw-schedule'); pg.check('[name="freq"][value="Weekly"]'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    g.answer('between', 0); g.answer('cost', 1)
    g.check('m03 weekly, wrong answer')
    pg.click('#vw-schedule'); pg.check('[name="freq"][value="Daily"]'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    g.answer('between', 1)
    g.reload()
    views('RHN_DSL')
    print('   after reload:', pg.locator('#view-list tbody tr', has_text='RHN_DS_V_METER_READINGS').inner_text().replace('\t', ' | '))
    g.check('m03 solved')
    g.next_mission()
    pg.wait_for_timeout(800)

    # ---------------- m04: the protected view fails; tariffs: remove data but keep schedule, then right
    views('RHN_PRES', 'RHN_PR_V_REGION_REVENUE'); act('#vw-persist')
    print('   run log:', pg.inner_text('#run-log').replace('\n', ' | ')[:400])
    g.shot('c9-failed')
    views('RHN_DSL', 'RHN_DS_V_TARIFFS'); act('#vw-remove')
    g.answer('why-fail', 1); g.answer('instead', 0)
    g.check('m04 schedule left, wrong answer')
    views('RHN_DSL', 'RHN_DS_V_TARIFFS')
    pg.click('#vw-schedule'); pg.check('[name="freq"][value="None"]'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    g.answer('instead', 1)
    g.check('m04 solved')
    g.done()
