"""Hands-on tutorials: play the tutorial of several missions by doing each step on the page while the tour is open.
Checks that clicks reach the page through the tour and that the tour moves on by itself."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before, SPACES

S = sys.argv[1] if len(sys.argv) > 1 else '.'


def title(pg):
    return pg.inner_text('.tour-card h2') if pg.locator('.tour-card').count() else None


def expect(pg, t, timeout=6000):
    """Wait until the tour shows step title t."""
    pg.wait_for_function("t => document.querySelector('.tour-card h2')?.textContent === t", arg=t, timeout=timeout)
    print('   step:', t)


def nexts(pg, n=1):
    for _ in range(n):
        pg.click('.tour-card [data-act="next"]'); pg.wait_for_timeout(200)


def answer_all(g, answers):
    for q, v in answers.items():
        g.answer(q, v)


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg

    # ---------------- c00-m01: intro (5 passive steps), then six apps by clicking the navigation
    g.start(save_before(0, 'c00-m01', xp=0))
    expect(pg, 'Welcome to the training tenant'); nexts(pg, 5)
    for app, label in [('repository', 'Repository Explorer'), ('builder', 'Data Builder'), ('monitor', 'Data Integration Monitor'),
                       ('connections', 'Connections'), ('spaces', 'Space Management'), ('security', 'Security')]:
        expect(pg, f'Open {label}')
        if not pg.locator(f'.nav [data-view="{app}"]').count():
            pg.click('.nav [data-group="monitoring"]')
        pg.click(f'.nav [data-view="{app}"]')
    expect(pg, 'Your map'); g.shot('g-c00-map'); nexts(pg)
    expect(pg, 'Your answers')
    answer_all(g, {'space': 1, 'view': 0, 'load': 2, 'role': 3, 'source': 4})
    expect(pg, 'Check your work')
    pg.click('#check'); pg.wait_for_timeout(1200)
    print('   tour open after check:', pg.locator('.tour-card').count())
    print('   checks:', [t.split('\n')[0] for t in pg.locator('.check-list li').all_inner_texts()])

    # ---------------- c00-m02: builder, space, table, preview
    pg.click('#next-mission'); pg.wait_for_timeout(400)
    expect(pg, 'Spaces first'); nexts(pg)
    expect(pg, 'Open Data Builder'); pg.click('.nav [data-view="builder"]')
    expect(pg, 'Select RHN_IN')
    g.shot('g-c00-space')
    pg.click('[data-space="RHN_IN"]')
    expect(pg, 'The start page'); nexts(pg)
    expect(pg, 'Open the contracts'); pg.click('#object-list [data-open="RHN_IN.BILLING_CONTRACTS"]')
    expect(pg, 'The editor'); nexts(pg)
    expect(pg, 'Data Preview'); pg.click('#run')
    expect(pg, 'Read the rows'); nexts(pg)
    expect(pg, 'Your answers'); answer_all(g, {'cols': 1, 'src': 2})
    expect(pg, 'Check your work'); pg.click('#check'); pg.wait_for_timeout(1200)
    print('   gain:', pg.locator('.success .gain').all_inner_texts())

    # ---------------- c00-m04: save and deploy (fresh save)
    g.b.close()
    g = Game(p, S); pg = g.pg
    g.start(save_before(0, 'c00-m04') | {"missions": {m: {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 20, "events": []} for m in ['c00-m01', 'c00-m02', 'c00-m03']}})
    expect(pg, 'Two names'); nexts(pg, 2)
    expect(pg, 'Open the contracts'); pg.click('#object-list [data-open="RHN_IN.BILLING_CONTRACTS"]')
    expect(pg, 'The business name'); pg.fill('#prop-business', 'Billing Contracts')
    expect(pg, 'Save'); pg.click('#ed-save')
    expect(pg, 'Look at the status'); g.shot('g-c00-status'); nexts(pg)
    expect(pg, 'Deploy'); pg.click('#ed-deploy')
    expect(pg, 'Deployed'); nexts(pg)
    expect(pg, 'Your answers'); answer_all(g, {'changes': 1, 'names': 1})
    expect(pg, 'Check your work'); pg.click('#check'); pg.wait_for_timeout(1200)
    print('   gain:', pg.locator('.success .gain').all_inner_texts())

    # ---------------- c01-m01: create a space inside a dialog while the tour points at its fields
    g.b.close()
    g = Game(p, S); pg = g.pg
    g.start(save_before(1, 'c01-m01'))
    expect(pg, 'Chapter 1: Space concept'); nexts(pg, 2)
    expect(pg, 'Open Space Management'); pg.click('.nav [data-view="spaces"]')
    expect(pg, 'What is there'); nexts(pg)
    expect(pg, 'Tenant capacity'); nexts(pg)
    expect(pg, 'Create a space'); pg.click('#create-space')
    expect(pg, 'The space name'); pg.fill('[name="name"]', 'Rheinau Harmonization')
    expect(pg, 'The space ID'); g.shot('g-c01-dialog'); pg.fill('[name="id"]', 'RHN_HARM')
    expect(pg, 'Create'); pg.click('.dialog [type="submit"]')
    expect(pg, 'Now the reporting space')
    pg.click('#create-space'); pg.fill('[name="name"]', 'Rheinau Reporting'); pg.fill('[name="id"]', 'RHN_REP'); pg.click('.dialog [type="submit"]')
    expect(pg, 'Your answers'); g.answer('why', 1)
    expect(pg, 'Check your work'); pg.click('#check'); pg.wait_for_timeout(1200)
    print('   gain:', pg.locator('.success .gain').all_inner_texts())

    # ---------------- c03-m01: connection with type picker, validate, close dialog
    g.b.close()
    g = Game(p, S); pg = g.pg
    g.start(save_before(3, 'c03-m01', {"spaces": SPACES, "shares": [], "activeSpace": "RHN_HARM"}))
    expect(pg, 'Chapter 3: Data integration'); nexts(pg, 2)
    expect(pg, 'Open Connections'); pg.click('.nav [data-view="connections"]')
    expect(pg, 'Select the space'); pg.select_option('#conn-space', 'RHN_IN')
    expect(pg, 'Create'); pg.click('#conn-create')
    expect(pg, 'Pick the type'); g.shot('g-c03-types'); pg.click('[data-type="S4HANA_CLOUD"]')
    expect(pg, 'The properties')
    pg.fill('[name="host"]', 'billing.rheinau-s4.example'); pg.select_option('[name="auth"]', 'OAuth 2.0')
    pg.fill('[name="business"]', 'S/4HANA Billing'); pg.fill('[name="technical"]', 'RHN_S4U'); pg.click('.dialog [type="submit"]')
    expect(pg, 'Select it'); pg.check('[name="conn-sel"][value="RHN_S4U"]')
    expect(pg, 'Validate'); pg.click('#conn-validate')
    expect(pg, 'Read the result'); g.shot('g-c03-validate'); pg.click('.dialog [type="submit"]')
    expect(pg, 'Your answers'); answer_all(g, {'who': 1, 'import': 0})
    expect(pg, 'Check your work'); pg.click('#check'); pg.wait_for_timeout(1200)
    print('   gain:', pg.locator('.success .gain').all_inner_texts())

    # ---------------- skip step and Show me
    pg.click('#next-mission'); pg.wait_for_timeout(400)
    expect(pg, 'Cloud and on-premise'); nexts(pg)
    expect(pg, 'Open Connections')   # already open: counts as done
    expect(pg, 'Create')
    nexts(pg)                         # Skip step
    print('   after skip:', title(pg))
    g.skip_tutorial()
    pg.click('#task [data-task="2"]'); pg.wait_for_timeout(300)
    expect(pg, 'Open System'); pg.click('.nav [data-view="system"]')
    expect(pg, 'Data Integration'); pg.click('.sub-nav [data-tab="integration"]')
    expect(pg, 'The Cloud Connector'); g.shot('g-c03-cc'); nexts(pg)
    expect(pg, 'Security'); pg.click('.sub-nav [data-tab="security"]')
    expect(pg, 'Upload'); pg.click('#cert-upload'); pg.check('[name="file"][value="Rheinau Root CA"]'); pg.click('.dialog [type="submit"]')
    pg.wait_for_timeout(1200)
    print('   Show me finished, tour open:', pg.locator('.tour-card').count())
    g.done()

# ---------------- c05-m01 and c05-m02: build and change a harmonization view while the tour waits
from chapter5_data import CONTRACTS, KEYS, TENANT5  # noqa: E402

with sync_playwright() as p:
    g = Game(p, S); pg = g.pg
    g.start(save_before(5, 'c05-m01', TENANT5))
    expect(pg, 'Chapter 5: Harmonization'); nexts(pg, 2)
    expect(pg, 'Open Data Builder'); pg.click('.nav [data-view="builder"]')
    expect(pg, 'Space RHN_HARM')
    if pg.locator('#space-picker').count() == 0:
        pg.click('#space-switch')
    pg.click('[data-space="RHN_HARM"]')
    expect(pg, 'Shared with RHN_HARM'); nexts(pg)
    expect(pg, 'New SQL View'); pg.click('[data-new="sqlview"]')
    expect(pg, 'An example to start from'); g.shot('g-c05-example')
    pg.click('.tour-card [data-act="example"]') if pg.locator('.tour-card [data-act="example"]').count() else None
    g.sql(CONTRACTS); pg.click('#run')
    expect(pg, 'Check before you save'); nexts(pg)
    expect(pg, 'Names'); pg.fill('#prop-business', 'Contracts (harmonized)'); pg.fill('#prop-technical', 'RHN_HA_V_CONTRACTS')
    expect(pg, 'Save'); pg.click('#ed-save')
    expect(pg, 'Deploy'); pg.click('#ed-deploy')
    expect(pg, 'Your answers'); g.answer('where', 1)
    expect(pg, 'Check your work'); pg.click('#check'); pg.wait_for_timeout(1500)
    print('   gain:', pg.locator('.success .gain').all_inner_texts())

    pg.click('#next-mission'); pg.wait_for_timeout(400)
    expect(pg, 'Change a deployed view'); nexts(pg, 2)
    expect(pg, 'Space RHN_IN'); pg.click('#space-switch'); pg.click('[data-space="RHN_IN"]')
    expect(pg, 'Share LEGACY_CUSTOMER_MAP')
    pg.click('[data-share="RHN_IN.LEGACY_CUSTOMER_MAP"]'); pg.check('.share-targets input[value="RHN_HARM"]'); pg.click('.dialog button[type="submit"]')
    expect(pg, 'Space RHN_HARM'); pg.click('#space-switch'); pg.click('[data-space="RHN_HARM"]')
    expect(pg, 'Open the view'); pg.click('#object-list [data-open="RHN_HARM.RHN_HA_V_CONTRACTS"]')
    expect(pg, 'Impact and Lineage'); g.shot('g-c05-lineage'); nexts(pg)
    expect(pg, 'Sources'); nexts(pg)
    expect(pg, 'Change the SQL'); g.sql(KEYS); pg.click('#run')
    expect(pg, 'Save'); pg.click('#ed-save')
    expect(pg, 'Changes to Deploy'); nexts(pg)
    expect(pg, 'Deploy'); pg.click('#ed-deploy')
    expect(pg, 'Your answers'); g.answer('orphans', 3)
    expect(pg, 'Check your work'); pg.click('#check'); pg.wait_for_timeout(1500)
    print('   gain:', pg.locator('.success .gain').all_inner_texts())
    g.done()

# ---------------- c06-m01: 1:1 view, share, dimension with key while the tour waits
from chapter6_data import TENANT6  # noqa: E402

with sync_playwright() as p:
    g = Game(p, S); pg = g.pg
    g.start(save_before(6, 'c06-m01', TENANT6))
    expect(pg, 'Chapter 6: Semantics'); nexts(pg, 2)
    expect(pg, 'Space RHN_HARM'); pg.click('#space-switch'); pg.click('[data-space="RHN_HARM"]')
    expect(pg, 'New SQL View'); pg.click('[data-new="sqlview"]')
    expect(pg, 'All columns, no logic'); g.sql('SELECT GRID_AREA, GRID_AREA_NAME, REGION, SRC_SYS_ID FROM RHN_IN.GRID_AREAS'); pg.click('#run')
    expect(pg, 'Names'); pg.fill('#prop-business', 'Grid Areas (harmonized)'); pg.fill('#prop-technical', 'RHN_HA_V_GRID_AREAS')
    expect(pg, 'Save'); pg.click('#ed-save')
    expect(pg, 'Deploy'); pg.click('#ed-deploy')
    expect(pg, 'Back to the start page'); pg.click('#ed-back')
    expect(pg, 'Share RHN_HA_V_GRID_AREAS')
    pg.click('[data-share="RHN_HARM.RHN_HA_V_GRID_AREAS"]'); pg.check('.share-targets input[value="RHN_REP"]'); pg.click('.dialog button[type="submit"]')
    expect(pg, 'Space RHN_REP'); pg.click('#space-switch'); pg.click('[data-space="RHN_REP"]')
    expect(pg, 'New SQL View'); pg.click('[data-new="sqlview"]')
    expect(pg, 'Three columns'); g.sql('SELECT GRID_AREA, GRID_AREA_NAME, REGION FROM RHN_HARM.RHN_HA_V_GRID_AREAS'); pg.click('#run')
    expect(pg, 'Names'); pg.fill('#prop-business', 'Grid Area'); pg.fill('#prop-technical', 'RHN_REP_D_GRID_AREA')
    expect(pg, 'Save'); pg.click('#ed-save')
    expect(pg, 'Semantic Usage'); pg.select_option('#prop-semantic', 'Dimension')
    expect(pg, 'The key'); pg.wait_for_selector('#column-roles'); g.shot('g-c06-key')
    pg.select_option('#column-roles select[data-col="GRID_AREA"]', 'Key')
    expect(pg, 'Deploy'); pg.click('#ed-deploy')
    expect(pg, 'Your answers'); g.answer('usage', 1); g.answer('layer', 1)
    expect(pg, 'Check your work'); pg.click('#check'); pg.wait_for_timeout(1500)
    print('   gain:', pg.locator('.success .gain').all_inner_texts())
    g.done()

# ---------------- c07-m01: analytic model on the invoice fact while the tour waits
from chapter7_data import TENANT7  # noqa: E402

with sync_playwright() as p:
    g = Game(p, S); pg = g.pg
    g.start(save_before(7, 'c07-m01', TENANT7))
    expect(pg, 'Chapter 7: Analytic Model'); nexts(pg, 2)
    if title(pg) == 'Space RHN_REP':
        pg.click('#space-switch, [data-space="RHN_REP"]'); pg.click('[data-space="RHN_REP"]') if pg.locator('[data-space="RHN_REP"]').count() else None
    expect(pg, 'New Analytic Model'); pg.click('[data-new="analytic"]')
    expect(pg, 'The fact source'); g.shot('g-c07-picker'); pg.click('[data-fact="RHN_REP.RHN_REP_F_INVOICES"]')
    expect(pg, 'The fact'); pg.click('[data-node="fact"]')
    expect(pg, 'Measures of the fact'); nexts(pg)
    expect(pg, 'Dimensions from associations')
    pg.click('[data-add-dim="RHN_REP.RHN_REP_D_GRID_AREA"]'); pg.click('[data-add-dim="RHN_REP.RHN_REP_D_TARIFF"]')
    expect(pg, 'Attributes of a dimension'); g.shot('g-c07-dims'); nexts(pg)
    expect(pg, 'The whole model'); pg.click('.am-canvas-hint')
    expect(pg, 'Names'); pg.fill('#prop-business', 'Invoices Model'); pg.fill('#prop-technical', 'RHN_REP_AM_INVOICES')
    expect(pg, 'Save'); pg.click('#ed-save')
    expect(pg, 'Deploy'); pg.click('#ed-deploy')
    expect(pg, 'Data Preview')
    for i in pg.locator('[data-pmeas]').all():
        i.set_checked(i.get_attribute('data-pmeas') == 'NET_AMOUNT')
    pg.check('[data-prow="RHN_REP_D_TARIFF.TARIFF_NAME"]'); pg.click('#run')
    expect(pg, 'Your answers'); g.answer('tariff', 1)
    expect(pg, 'Check your work'); pg.click('#check'); pg.wait_for_timeout(1500)
    print('   gain:', pg.locator('.success .gain').all_inner_texts())
    g.done()

# ---------------- c08-m01: permissions table in the Data Editor while the tour waits
from chapter8_data import TENANT8  # noqa: E402

with sync_playwright() as p:
    g = Game(p, S); pg = g.pg
    g.start(save_before(8, 'c08-m01', TENANT8))
    expect(pg, 'Chapter 8: Data access controls'); nexts(pg, 2)
    if title(pg) == 'Space RHN_REP':
        pg.click('[data-space="RHN_REP"]') if pg.locator('[data-space="RHN_REP"]').count() else None
    expect(pg, 'New Table'); pg.click('[data-new="table"]')
    expect(pg, 'Columns')
    pg.fill('[data-col-name="0"]', 'USER_ID'); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    pg.click('#tbl-add-col'); pg.fill('[data-col-name="1"]', 'GRID_AREA'); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    pg.check('[data-col-key="1"]')
    expect(pg, 'Data Editor')
    for i, (u, a) in enumerate([('PLINDNER', 'NORTH'), ('PLINDNER', 'EAST'), ('PLINDNER', 'SOUTH'), ('PLINDNER', 'WEST'),
                                ('MBRANDT', 'NORTH'), ('MBRANDT', 'EAST'), ('ADEMIR', 'SOUTH'), ('ADEMIR', 'WEST')]):
        pg.click('#tbl-add-row'); pg.fill(f'[data-cell="{i}:0"]', u); pg.fill(f'[data-cell="{i}:1"]', a)
    expect(pg, 'Names'); g.shot('g-c08-table'); pg.fill('#prop-business', 'Permissions'); pg.fill('#prop-technical', 'RHN_REP_T_PERMISSIONS')
    expect(pg, 'Deploy'); pg.click('#ed-deploy')
    expect(pg, 'Your answers'); g.answer('why-area', 1); g.answer('who', 1)
    expect(pg, 'Check your work'); pg.click('#check'); pg.wait_for_timeout(1500)
    print('   gain:', pg.locator('.success .gain').all_inner_texts())
    g.done()

# ---------------- c09-m02: View Analyzer, persist, preview while the tour waits
from chapter9_data import TENANT9  # noqa: E402

with sync_playwright() as p:
    g = Game(p, S); pg = g.pg
    s9 = save_before(9, 'c09-m02', TENANT9)
    s9["missions"]["c09-m01"] = {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 40, "events": []}
    g.start(s9)
    expect(pg, 'The View Analyzer'); nexts(pg)
    expect(pg, 'Views in RHN_REP'); pg.click('[data-vw="RHN_REP_F_CONSUMPTION"]')
    expect(pg, 'View Analyzer'); pg.click('#vw-analyzer')
    expect(pg, 'Read the stack'); g.shot('g-c09-analyzer'); nexts(pg)
    expect(pg, 'Change the space'); pg.select_option('#mon-space', 'RHN_HARM')
    expect(pg, 'Start Data Persistence'); pg.click('[data-vw="RHN_HA_V_METER_READINGS"]'); pg.click('#vw-persist')
    expect(pg, 'Open the model'); pg.click('[data-list="models"]'); pg.click('#object-list [data-open="RHN_REP.RHN_REP_AM_CONSUMPTION"]')
    expect(pg, 'Runtime at production volume'); pg.click('#run')
    expect(pg, 'Your answers'); g.answer('why-here', 1); g.answer('after', 1)
    expect(pg, 'Check your work'); pg.click('#check'); pg.wait_for_timeout(1500)
    print('   gain:', pg.locator('.success .gain').all_inner_texts())
    g.done()

# ---------------- c10-m01: task chain in RHN_IN while the tour waits
from chapter10_data import TENANT10  # noqa: E402

with sync_playwright() as p:
    g = Game(p, S); pg = g.pg
    g.start(save_before(10, 'c10-m01', TENANT10))
    expect(pg, 'Chapter 10: Operations'); nexts(pg, 2)
    expect(pg, 'New Task Chain'); pg.click('[data-new="taskchain"]')

    def add(key):
        pg.click('#chain-add'); pg.check(f'.dialog [name="step"][value="{key}"]'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    expect(pg, 'Add the CRM flow'); add('RHN_IN.RHN_IN_RF_CRM')
    expect(pg, 'And the meter readings?'); add('RHN_IN.RHN_IN_RF_MDM'); pg.click('.dialog [data-act="cancel"]')
    expect(pg, 'Names and Deploy'); pg.fill('#prop-business', 'CRM file'); pg.fill('#prop-technical', 'RHN_IN_TC_CRM'); pg.click('#ed-deploy')
    expect(pg, 'Run'); g.shot('g-c10-chain'); pg.click('#chain-run')
    expect(pg, 'Share with RHN_HARM'); g.share('RHN_IN.RHN_IN_TC_CRM', 'RHN_HARM')
    expect(pg, 'Remove the old schedule'); pg.click('[data-flow="RHN_IN_RF_CRM"]'); pg.click('#flow-schedule')
    pg.check('[name="freq"][value="None"]'); pg.click('.dialog button[type="submit"]')
    expect(pg, 'Your answers'); g.answer('delta', 1)
    expect(pg, 'Check your work'); pg.click('#check'); pg.wait_for_timeout(1500)
    print('   gain:', pg.locator('.success .gain').all_inner_texts())
    g.done()
