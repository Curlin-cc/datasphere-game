"""Chapter 4 (Inbound layer): profiling with a scratch SQL view; typical mistakes and right answers.
Also checks the v3 → v4 save migration (old chapter 0 progress becomes chapter 4)."""
import sys, json
from playwright.sync_api import sync_playwright
from common import Game, save_before, SPACES

S = sys.argv[1] if len(sys.argv) > 1 else '.'
TENANT = {"spaces": SPACES, "shares": [], "activeSpace": "RHN_IN"}
with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start(save_before(4, 'c04-m01', TENANT))
    g.walk_tutorial()
    print('   view after tutorial:', pg.inner_text('.ed-title'))
    sql = g.sql
    # m01
    sql("SELECT * FROM RHN_IN.BILLING_CONTRACTS"); g.check('m01 select star')
    sql("SELECT GRID_AREA, SRC_SYS_ID, COUNT(*) FROM RHN_IN.BILLING_CONTRACTS GROUP BY 1,2"); g.check('m01 by source')
    g.answer('source', 0); sql("select count(*) n, grid_area from rhn_in.billing_contracts group by grid_area"); g.check('m01 right query, wrong answer')
    g.answer('source', 1); g.answer('count', 2); g.check('m01 solved')
    g.next_mission()
    # m02
    sql("SELECT STATUS, COUNT(*) AS N, SUM(NET_AMOUNT) AS G FROM RHN_IN.BILLING_INVOICES GROUP BY STATUS"); g.check('m02 net')
    sql("SELECT SUM(NET_AMOUNT+TAX_AMOUNT) AS GROSS, STATUS, COUNT(*) AS N FROM RHN_IN.BILLING_INVOICES GROUP BY STATUS"); g.answer('unpaid', 2); g.check('m02 solved')
    g.next_mission()
    # m03
    sql("SELECT INVOICE_ID, CONTRACT_ID, DUE_DATE, NET_AMOUNT+TAX_AMOUNT AS GROSS FROM RHN_IN.BILLING_INVOICES WHERE STATUS='OVERDUE' ORDER BY GROSS LIMIT 10"); g.check('m03 asc')
    sql("SELECT INVOICE_ID, CONTRACT_ID, DUE_DATE, NET_AMOUNT+TAX_AMOUNT AS GROSS FROM RHN_IN.BILLING_INVOICES WHERE STATUS='OVERDUE' ORDER BY GROSS DESC LIMIT 10"); g.check('m03 solved')
    g.next_mission()
    # m04: a deployed view in inbound triggers Calin's warning (dialog is auto-accepted in tests)
    sql("SELECT g.REGION, COUNT(*) AS N FROM RHN_IN.BILLING_CONTRACTS c, RHN_IN.GRID_AREAS g GROUP BY g.REGION"); g.check('m04 cross join')
    sql("SELECT g.REGION, COUNT(*) AS CONTRACTS FROM RHN_IN.BILLING_CONTRACTS c LEFT JOIN RHN_IN.GRID_AREAS g ON c.GRID_AREA = g.GRID_AREA GROUP BY g.REGION")
    pg.click('#run'); pg.wait_for_selector('.result-status')
    g.shot('c4-view')
    g.answer('lost', 1); g.check('m04 solved')
    # save and deploy the view, reload, view must still exist and run
    pg.fill('#prop-business', 'Contracts per Region')
    print('   suggested technical name:', pg.input_value('#prop-technical'))
    pg.click('#ed-deploy'); pg.wait_for_timeout(500)
    print('   status:', pg.inner_text('.ed-toolbar .status'))
    g.reload()
    g.nav('repository')
    print('   repository:', pg.locator('#repo-list tr', has_text='CONTRACTS_PER_REGION').inner_text().replace('\t', ' | '))
    pg.click('[data-open="RHN_IN.CONTRACTS_PER_REGION"]'); pg.wait_for_selector('#editor')
    pg.click('#run'); pg.wait_for_selector('.result-status')
    print('   preview after reload:', pg.inner_text('.result-status'))
    g.done()

# v3 → v4 migration: an old save with the old chapter 0 solved
with sync_playwright() as p:
    g = Game(p, S)
    old = {"version": 3, "xp": 120, "currentMission": "c00-m04", "tutorialsSeen": ["c00-m01"],
           "missions": {f"c00-m0{i}": {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 30} for i in range(1, 5)},
           "tenant": {"spaces": SPACES[:1], "shares": [], "activeSpace": "RHN_IN"}}
    g.start(old)
    d = json.loads(g.pg.evaluate("localStorage.getItem('dsg-progress-v3')"))
    print('MIGRATION:', d['version'], d['xp'], d['currentMission'], sorted(k for k, v in d['missions'].items() if v['done']))
    g.done()
