"""Apps that complete the tenant (sandbox, all missions solved): System and Spaces, Capacities, Elastic Compute Nodes,
Marketplace Data Products, Translation, Data Sharing Cockpit. Typical mistakes first, then the right way; reload keeps state.
Usage: python3 extras.py <screenshot folder>"""
import sys
from playwright.sync_api import sync_playwright
from common import Game

S = sys.argv[1] if len(sys.argv) > 1 else '.'


def ok(cond, label):
    print(('   ok  ' if cond else '   FAIL ') + label)
    assert cond, label


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start()
    g.skip_tutorial()
    pg.wait_for_timeout(1500)
    g.nav('home'); pg.click('#save-sandbox'); pg.wait_for_timeout(2500)

    # System and Spaces
    g.nav('sysmonitor')
    ok(pg.locator('#sm-dashboard .ext-card').count() >= 8, 'System and Spaces dashboard tiles')
    g.shot('ext-sysmon')
    pg.click('[data-sm-tab="spaces"]')
    ok(pg.locator('#sm-spaces [data-space-row]').count() >= 3, 'spaces table')
    pg.click('[data-sm-tab="dashboard"]')
    pg.click('[data-to="tasklogs"]'); pg.wait_for_timeout(300)
    ok(pg.locator('.view-title', has_text='Task Logs').count() == 1, 'View Logs opens Task Logs')

    # Capacities
    g.nav('capacities')
    ok(pg.locator('#cap-kpis .ext-kpi').count() == 4, 'four CU cards')
    ok(pg.locator('.ext-bar').count() >= 1, 'daily bars')
    g.shot('ext-capacities')
    pg.select_option('#cap-range', 'last')
    pg.click('[data-cap-chart="cumulative"]')
    pg.click('[data-cap-tab="spaces"]')
    ok(pg.locator('#cap-spaces tbody tr').count() >= 3, 'CU per space')

    # Elastic Compute Nodes: bad name, no space, then right
    g.nav('ecn')
    pg.click('#ecn-create'); pg.fill('.dialog [name="name"]', 'Month End'); pg.click('.dialog button[type="submit"]')
    ok('lowercase' in pg.inner_text('.dialog .form-error'), 'name rule')
    pg.fill('.dialog [name="name"]', 'monthend'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    pg.click('[data-ecn-start="monthend"]'); pg.wait_for_timeout(200)
    ok('no space' in pg.inner_text('.toast'), 'start without space refused')
    pg.click('#ecn-edit'); pg.check('.dialog [name="space"][value="RHN_REP"]'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    pg.click('[data-ecn-start="monthend"]'); pg.wait_for_timeout(200)
    ok(pg.locator('[data-ecn-stop="monthend"]').count() == 1, 'node running')
    pg.click('[data-ecn-stop="monthend"]'); pg.wait_for_timeout(200)
    ok(pg.inner_text('#ecn-used').startswith('4'), 'billed 4 block-hours')
    g.shot('ext-ecn')

    # Marketplace: free install, key product without key, request, install with key
    g.nav('marketplace')
    pg.click('[data-mp="mp-holidays"]'); pg.click('#mp-install')
    pg.select_option('.dialog [name="space"]', 'RHN_REP'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(800)
    pg.click('[data-mp="mp-weather"]'); pg.click('#mp-install')
    pg.select_option('.dialog [name="space"]', 'RHN_HARM'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    ok('license key' in pg.inner_text('.dialog .form-error'), 'key required')
    pg.click('.dialog [data-act="cancel"]')
    pg.click('#mp-request'); pg.wait_for_timeout(200)
    key = pg.inner_text('#mp-mail .mono')
    pg.click('#mp-install'); pg.fill('.dialog [name="key"]', key.lower())
    pg.select_option('.dialog [name="space"]', 'RHN_HARM'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(800)
    g.shot('ext-marketplace')
    pg.click('[data-mp-tab="installed"]')
    ok(pg.locator('#mp-installed tbody tr').count() == 2, 'two products installed')

    # the installed table has data in the Data Builder
    g.space('RHN_HARM')
    ok(pg.locator('#object-list [data-open="RHN_HARM.MP_WEATHER_DAILY"]').count() == 1, 'weather table in RHN_HARM')

    # Translation
    g.nav('translation')
    pg.click('[data-tr-space="RHN_REP"]')
    first = pg.locator('[data-tr-add]').first.get_attribute('data-tr-add')
    pg.click(f'[data-tr-add="{first}"]')
    pg.click(f'[data-tr-edit="{first}"]'); pg.fill('.dialog [name="de"]', 'Verbrauch je Netzgebiet'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    ok('Translated' in pg.inner_text(f'[data-tr="{first}"]'), 'translated')
    g.shot('ext-translation')

    # Data Sharing Cockpit: list without profile impossible; profile, product without description, then listed
    g.nav('sharing')
    pg.fill('#ds-profile-form [name="name"]', 'Stadtwerke Rheinau'); pg.fill('#ds-profile-form [name="email"]', 'nope')
    pg.click('#ds-profile-form button[type="submit"]')
    ok('email' in pg.inner_text('#ds-profile .form-error'), 'email checked')
    pg.fill('#ds-profile-form [name="email"]', 'data@rheinau.example'); pg.click('#ds-profile-form button[type="submit"]'); pg.wait_for_timeout(300)
    pg.click('#ds-new'); pg.fill('.dialog [name="name"]', 'Consumption per Grid Area')
    pg.locator('.dialog [name="obj"]').first.check(); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    pg.locator('[data-ds-list]').first.click(); pg.wait_for_timeout(200)
    ok('description' in pg.inner_text('.toast'), 'listing needs a description')
    pg.locator('[data-ds-edit]').first.click()
    pg.fill('.dialog [name="description"]', 'Monthly consumption in kWh per grid area, updated every night.')
    pg.select_option('.dialog [name="contract"]', 'License Key'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    pg.locator('[data-ds-list]').first.click(); pg.wait_for_timeout(200)
    ok('Listed' in pg.inner_text('#ds-products'), 'product listed')
    pg.click('[data-ds-tab="licenses"]'); pg.click('#ds-license'); pg.fill('.dialog [name="customer"]', 'Stadtwerke Lindenau')
    pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    ok('RHN-' in pg.inner_text('#ds-licenses'), 'license key generated')
    g.shot('ext-sharing')
    g.nav('marketplace'); pg.click('[data-mp-tab="browse"]')
    ok(pg.locator('#mp-list', has_text='Consumption per Grid Area').count() == 1, 'own product in the marketplace')

    g.reload()
    g.nav('ecn'); ok(pg.locator('[data-ecn="monthend"]').count() == 1, 'node after reload')
    g.nav('marketplace'); pg.click('[data-mp-tab="installed"]'); ok(pg.locator('#mp-installed tbody tr').count() == 2, 'installs after reload')
    g.space('RHN_HARM'); pg.click('#object-list [data-open="RHN_HARM.MP_WEATHER_DAILY"]'); pg.wait_for_timeout(600)
    print('   GAIN extras')
    g.done()
