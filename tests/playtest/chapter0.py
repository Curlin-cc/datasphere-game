"""Chapter 0 (Find your way): fresh save, navigation, space picker, repository explorer, save vs deploy."""
import sys
from playwright.sync_api import sync_playwright
from common import Game

S = sys.argv[1] if len(sys.argv) > 1 else '.'
with sync_playwright() as p:
    g = Game(p, S)
    g.start()
    g.walk_tutorial()
    # m01: questions first, without visiting apps
    for q, v in [('space', 1), ('view', 0), ('load', 2), ('role', 3), ('source', 0)]: g.answer(q, v)
    g.check('m01 nothing visited, one wrong')
    for app in ['repository', 'builder', 'monitor', 'connections', 'spaces', 'security']:
        g.nav(app)
    g.shot('c0-info')
    g.answer('source', 4)
    g.check('m01 solved')
    g.next_mission()
    # m02
    g.nav('builder')
    g.pg.click('[data-space="RHN_ENTRY"]'); g.pg.wait_for_selector('#object-list')
    g.shot('c0-landing')
    g.pg.click('#new-tiles [data-new="replication"]'); g.pg.wait_for_selector('.dialog'); print('   TILE INFO:', g.pg.inner_text('.dialog p.muted')); g.pg.click('.dialog [type=submit]')
    g.pg.click('[data-open="RHN_ENTRY.BILLING_CONTRACTS"]'); g.pg.wait_for_selector('#column-list')
    g.answer('cols', 1); g.answer('src', 2)
    g.check('m02 no preview')
    g.pg.click('#run'); g.pg.wait_for_selector('.result-status')
    g.shot('c0-table')
    g.check('m02 solved')
    g.next_mission()
    # m03
    g.nav('repository')
    g.pg.fill('#repo-search', 'meter'); g.pg.wait_for_timeout(600)
    print('   SEARCH:', g.pg.inner_text('#repo-count'))
    g.pg.click('[data-open="RHN_ENTRY.METER_READINGS"]'); g.pg.wait_for_selector('#column-list')
    g.nav('repository'); g.pg.fill('#repo-search', ''); g.pg.select_option('#repo-space', 'RHN_ENTRY')
    print('   COUNT:', g.pg.inner_text('#repo-count'))
    g.answer('space', 0); g.answer('kind', 1); g.answer('count', 1)
    g.check('m03 solved')
    g.next_mission()
    # m04
    g.nav('builder')
    g.pg.click('[data-open="RHN_ENTRY.BILLING_CONTRACTS"]'); g.pg.wait_for_selector('#prop-business')
    g.pg.fill('#prop-business', 'Billing Contracts'); g.pg.click('#ed-save'); g.pg.wait_for_timeout(300)
    print('   STATUS after save:', g.pg.inner_text('.ed-toolbar .status'))
    g.answer('changes', 1); g.answer('names', 1)
    g.check('m04 saved only')
    g.pg.click('#ed-deploy'); g.pg.wait_for_timeout(400)
    print('   STATUS after deploy:', g.pg.inner_text('.ed-toolbar .status'))
    g.shot('c0-deployed')
    g.check('m04 solved')
    g.reload()
    g.nav('repository')
    print('AFTER RELOAD:', g.pg.locator('#repo-list tr', has_text='BILLING_CONTRACTS').inner_text().replace('\t', ' | '))
    g.done()
