"""Chapter 12, hierarchies (c12-m05, c12-m06): tree without region prefix (duplicate nodes) first, then right; association;
node table with grid areas first, control as Single Values first, old control left on the fact, then right; checks as users.
Start state: chapter12_data.py with c12-m01..m04 solved."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter12_data import TENANT12

S = sys.argv[1] if len(sys.argv) > 1 else '.'
H, D_GRID, F_INV = 'RHN_DSL.RHN_DS_H_GRID_AREA', 'RHN_DSL.RHN_DS_D_GRID_AREA', 'RHN_DSL.RHN_DS_F_INVOICES'
TREE = ("SELECT 'RHEINAU' AS NODE_ID, NULL AS PARENT_ID, 'Stadtwerke Rheinau' AS NODE_NAME "
        "UNION ALL SELECT DISTINCT {r}REGION, 'RHEINAU', 'Region ' || REGION FROM RHN_DSL.RHN_DS_V_GRID_AREAS "
        "UNION ALL SELECT GRID_AREA, {r}REGION, GRID_AREA_NAME FROM RHN_DSL.RHN_DS_V_GRID_AREAS")

save = save_before(12, 'c12-m05', TENANT12)
for m in ['c12-m01', 'c12-m02', 'c12-m03', 'c12-m04']:
    save["missions"][m] = {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 40, "events": []}

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg

    def deploy():
        pg.click('#ed-deploy'); pg.wait_for_timeout(600)
        t = g.toast()
        if 'fail' in t.lower() or 'enter' in t.lower():
            print('   DEPLOY:', t)

    def model_as(user):
        g.space('RHN_PRES'); pg.click('[data-list="models"]')
        pg.click('#object-list [data-open="RHN_PRES.RHN_PR_AM_INVOICES"]'); pg.wait_for_selector('#am-pivot')
        pg.check('[data-prow="RHN_DS_D_GRID_AREA.REGION"]'); pg.select_option('#am-as', user); pg.click('#run')
        pg.wait_for_selector('#am-out .result-status')
        return [r.replace('\t', ' | ') for r in pg.locator('#am-out tbody tr').all_inner_texts()]

    g.start(save)
    g.walk_tutorial(show=False)

    # ---------------- m05: duplicate node IDs first
    g.space('RHN_DSL')
    g.new_view(TREE.format(r=''), 'RHN_DS_H_GRID_AREA', 'Grid Area Hierarchy')
    pg.click('#run'); pg.wait_for_selector('#results .result-status')
    g.semantics('Hierarchy', {'PARENT_ID': 'Parent', 'NODE_ID': 'Child', 'NODE_NAME': 'Attribute'})
    g.answer('why-tree', 1)
    g.check('m05 no prefix, no association')
    g.space('RHN_DSL')
    g.edit_view(H, TREE.format(r="'R_' || "))
    g.space('RHN_DSL')
    pg.click(f'#object-list [data-open="{D_GRID}"]'); pg.wait_for_selector('#editor')
    pg.click('#assoc-add'); pg.select_option('#assoc-target', H); pg.wait_for_timeout(150)
    print('   mapping:', pg.inner_text('.dialog').replace('\n', ' | ')[:200])
    pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(150)
    deploy()
    g.check('m05 solved')
    g.next_mission()

    # ---------------- m06
    g.space('RHN_DSL')
    pg.click('[data-new="table"]'); pg.wait_for_selector('#tbl-columns')
    pg.fill('[data-col-name="0"]', 'USER_ID'); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    pg.click('#tbl-add-col'); pg.fill('[data-col-name="1"]', 'NODE_ID'); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    pg.check('[data-col-key="1"]'); pg.wait_for_timeout(100)
    for i, (u, n) in enumerate([('PLINDNER', 'RHEINAU'), ('MBRANDT', 'NORTH'), ('ADEMIR', 'SOUTH')]):
        pg.click('#tbl-add-row'); pg.fill(f'[data-cell="{i}:0"]', u); pg.fill(f'[data-cell="{i}:1"]', n)
    pg.fill('#prop-business', 'Permission Nodes'); pg.fill('#prop-technical', 'RHN_DS_T_PERMISSION_NODES')
    deploy()
    g.answer('new-area', 1)
    g.check('m06 grid area nodes, no control')
    pg.fill('[data-cell="1:1"]', 'R_NORTH'); pg.fill('[data-cell="2:1"]', 'R_SOUTH'); deploy()
    # control: Single Values first
    g.space('RHN_DSL')
    pg.click('[data-new="dac"]'); pg.wait_for_selector('#dac-entity')
    pg.select_option('#dac-entity', 'RHN_DSL.RHN_DS_T_PERMISSION_NODES'); pg.wait_for_selector('#dac-identifier:not([disabled])')
    pg.select_option('#dac-identifier', 'USER_ID'); pg.wait_for_timeout(100); pg.check('[data-criterion="NODE_ID"]')
    pg.fill('#prop-business', 'Region Access'); pg.fill('#prop-technical', 'RHN_DS_DAC_REGION')
    deploy()
    g.check('m06 single values')
    pg.select_option('#dac-structure', 'Hierarchy'); pg.wait_for_selector('#dac-hierarchy')
    pg.select_option('#dac-hierarchy', H); pg.check('[data-criterion="NODE_ID"]')
    pg.click('#run'); pg.wait_for_selector('#results .result-status')
    print('   DAC preview:', [r.replace('\t', ' | ') for r in pg.locator('#results tbody tr').all_inner_texts()])
    g.shot('c12-dac-hierarchy')
    deploy()
    # assign next to the old control
    g.space('RHN_DSL')
    pg.click(f'#object-list [data-open="{F_INV}"]'); pg.wait_for_selector('#editor')
    pg.click('#run'); pg.wait_for_selector('#dac-assign')
    pg.click('#dac-assign'); pg.select_option('#dac-pick', 'RHN_DSL.RHN_DS_DAC_REGION'); pg.wait_for_timeout(150)
    pg.select_option('[data-map="NODE_ID"]', 'GRID_AREA')
    pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(150)
    deploy()
    print('   MBRANDT (both):', model_as('MBRANDT'))
    g.check('m06 old control still assigned')
    g.space('RHN_DSL'); pg.click('[data-list="all"]')
    pg.click(f'#object-list [data-open="{F_INV}"]'); pg.wait_for_selector('#editor')
    pg.click('#run'); pg.wait_for_selector('[data-dac-del="0"]')
    pg.click('[data-dac-del="0"]'); deploy()
    print('   MBRANDT:', model_as('MBRANDT'))
    g.shot('c12-model-markus')
    g.check('m06 solved')
    print('   new badges:', pg.locator('#badge-new b').all_inner_texts())
    g.done()
