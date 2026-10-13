"""Chapter 12, OData and OAuth (c12-m08): an API Access client (401), an Interactive Usage client with a wrong redirect URI (400),
the right client while the consumption view does not exist (404), then built in RHN_PRES, exposed and deployed (200). Reload keeps the clients.
Second run: the hands-on tutorial. Start state: chapter12_data.py with c12-m01..m07 solved."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter12_data import TENANT12

S = sys.argv[1] if len(sys.argv) > 1 else '.'
D = 'RHN_PRES.RHN_PR_V_GRID_AREAS'
V_SQL = 'SELECT GRID_AREA, GRID_AREA_NAME, REGION FROM RHN_DSL.RHN_DS_D_GRID_AREA'
REDIRECT = 'https://rheinau-planning.eu10.sapanalytics.cloud/oauth/client/redirect'


def start_save():
    save = save_before(12, 'c12-m08', TENANT12)
    for m in ['c12-m01', 'c12-m02', 'c12-m03', 'c12-m04', 'c12-m05', 'c12-m06', 'c12-m07']:
        save["missions"][m] = {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 40, "events": []}
    return save


def tour(pg, t):
    pg.wait_for_function("t => document.querySelector('.tour-card h2')?.textContent === t", arg=t, timeout=8000)
    print('   step:', t)


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg

    def admin_apps():
        g.nav('system'); pg.click('.nav [data-sys="administration"]'); pg.click('[data-admin="apps"]'); pg.wait_for_selector('#oauth-list')

    def add_client(name, purpose, redirect, extra=None):
        pg.click('#oauth-add'); pg.fill('.dialog [name="name"]', name); pg.select_option('.dialog [name="purpose"]', purpose)
        if pg.locator('.dialog [name="redirect"]').is_visible():
            pg.fill('.dialog [name="redirect"]', redirect)
        if extra:
            extra()
        pg.click('.dialog [type="submit"]'); pg.wait_for_timeout(200)
        err = pg.locator('.form-error')
        if err.count() and err.inner_text().strip():
            print('   FORM ERROR:', err.inner_text()); pg.click('.dialog [data-act="cancel"]'); return
        print('   added:', pg.inner_text('.dialog dl').split('\n')[1][:40]); pg.click('.dialog [data-act="cancel"]')

    def test(name, obj='RHN_DSL.RHN_DS_D_GRID_AREA'):
        pg.click(f'[data-oauth-test="{name}"]'); pg.select_option('.dialog [name="object"]', obj)
        pg.click('.dialog [type="submit"]'); pg.wait_for_selector('.odata-status')
        print('   test', name, '→', pg.inner_text('.odata-status')[:150].replace('\n', ' '))
        pg.click('.dialog [data-act="cancel"]')

    g.start(start_save())
    g.skip_tutorial()
    admin_apps()
    add_client('Planning robot', 'API Access', '')
    test('Planning robot')
    # Technical User: needs user ID, roles and expiry; token lifetime 60 s – 1 day
    add_client('Catalog robot', 'Technical User', '')                     # refused: no user ID
    def tech():
        pg.fill('.dialog [name="userid"]', 'catalog_tech_user'); pg.check('.dialog [name="role"][value="DW Viewer"]')
        pg.fill('.dialog [name="lifetime"]', '25'); pg.select_option('.dialog [name="lifetime-unit"]', 'Hours')
    add_client('Catalog robot', 'Technical User', '', tech)              # refused: 25 hours
    def tech_ok():
        tech(); pg.fill('.dialog [name="lifetime"]', '12'); pg.select_option('.dialog [name="lifetime-unit"]', 'Hours')
    add_client('Catalog robot', 'Technical User', '', tech_ok)
    assert 'CATALOG_TECH_USER' in pg.inner_text('#oauth-list') and '12 Hours' in pg.inner_text('#oauth-list')
    test('Catalog robot')
    add_client('SAC Planning', 'Interactive Usage', '')                 # refused: needs a redirect URI
    add_client('SAC Planning', 'Interactive Usage', REDIRECT.replace('planning', 'planing'))
    test('SAC Planning')
    g.answer('purpose', 1)
    g.check('m08 wrong redirect, not exposed')
    pg.click('[data-oauth-delete="SAC Planning"]'); pg.wait_for_timeout(200)
    add_client('SAC Planning', 'Interactive Usage', REDIRECT)
    test('SAC Planning')                                                 # 404: the dimension of RHN_DSL is not exposed
    g.shot('c12-oauth')
    g.space('RHN_PRES')
    g.new_view(V_SQL, 'RHN_PR_V_GRID_AREAS', 'Grid Areas for Planning')
    pg.check('#prop-expose'); pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    admin_apps()
    pg.click('[data-oauth-test="SAC Planning"]'); pg.select_option('.dialog [name="object"]', D)
    pg.click('.dialog [type="submit"]'); pg.wait_for_selector('.odata-status')
    print('   test → ', pg.inner_text('.odata-status')[:120].replace('\n', ' '))
    g.shot('c12-odata')
    pg.click('.dialog [data-act="cancel"]')
    g.check('m08 solved')
    g.reload()
    admin_apps()
    print('   clients after reload:', pg.locator('#oauth-list [data-oauth-test]').count())
    g.done()

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start(start_save())
    tour(pg, 'Data out through OData'); pg.click('.tour-card [data-act="next"]')
    tour(pg, 'Space RHN_PRES'); g.space('RHN_PRES')
    tour(pg, 'New SQL View'); pg.click('[data-new="sqlview"]')
    tour(pg, 'Three columns'); g.sql(V_SQL); pg.click('#run')
    tour(pg, 'Names'); pg.fill('#prop-business', 'Grid Areas for Planning'); pg.fill('#prop-technical', 'RHN_PR_V_GRID_AREAS')
    tour(pg, 'Save'); pg.click('#ed-save')
    tour(pg, 'Deploy'); pg.click('#ed-deploy')
    tour(pg, 'Expose and deploy'); pg.check('#prop-expose'); pg.click('#ed-deploy')
    tour(pg, 'App Integration'); pg.click('#oauth-add')
    tour(pg, 'Purpose and redirect URI')
    pg.fill('.dialog [name="name"]', 'SAC Planning'); pg.fill('.dialog [name="redirect"]', REDIRECT); pg.click('.dialog [type="submit"]')
    pg.wait_for_selector('.dialog dl'); pg.click('.dialog [data-act="cancel"]')
    tour(pg, 'Test the call')
    pg.click('[data-oauth-test="SAC Planning"]'); pg.select_option('.dialog [name="object"]', D); pg.click('.dialog [type="submit"]')
    pg.wait_for_selector('.odata-status'); pg.click('.dialog [data-act="cancel"]')
    tour(pg, 'Your answers')
    g.done()
