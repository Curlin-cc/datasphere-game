import sys, json
from playwright.sync_api import sync_playwright
S=sys.argv[1] if len(sys.argv) > 1 else "."
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1500,'height':950})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type=='error' and errs.append(m.text))
    pg.goto('http://localhost:5199/'); pg.wait_for_selector('.tour-card', timeout=60000)
    def skip():
        if pg.locator('.tour-card').count(): pg.click('[data-act="skip"]')
    skip()
    def sql(q):
        pg.click('.cm-content'); pg.keyboard.press('Control+a'); pg.keyboard.press('Delete'); pg.keyboard.insert_text(q)
    def check(label):
        pg.click('#check'); pg.wait_for_selector('#check:not([disabled])'); pg.wait_for_timeout(200)
        items=pg.locator('.check-list li').all_inner_texts()
        rev=pg.locator('.review').all_inner_texts()
        gain=pg.locator('.success .gain').all_inner_texts()
        print(f'--- {label}'); [print('  ',i.replace('\n',' | ')) for i in items]
        if rev: print('   REVIEW:', rev[0].replace('\n',' | ')[:250])
        if gain: print('   GAIN:', gain)
    def answer(qid,i): pg.check(f'input[name="q-{qid}"][value="{i}"]')
    # m01
    sql("SELECT * FROM RHN_IN.BILLING_CONTRACTS"); check('m01 select star')
    sql("SELECT GRID_AREA, SRC_SYS_ID, COUNT(*) FROM RHN_IN.BILLING_CONTRACTS GROUP BY 1,2"); check('m01 by source')
    answer('source',0); sql("select count(*) n, grid_area from rhn_in.billing_contracts group by grid_area"); check('m01 right query, wrong answer, no answer2')
    answer('source',1); answer('count',2); check('m01 solved')
    pg.screenshot(path=f'{S}/m01.png')
    pg.click('#next-mission'); pg.wait_for_selector('.tour-card'); skip()
    # m02
    sql("SELECT STATUS, COUNT(*) AS N, SUM(NET_AMOUNT) AS G FROM RHN_IN.BILLING_INVOICES GROUP BY STATUS"); check('m02 net')
    sql("SELECT SUM(NET_AMOUNT+TAX_AMOUNT) AS GROSS, STATUS, COUNT(*) AS N FROM RHN_IN.BILLING_INVOICES GROUP BY STATUS"); answer('unpaid',2); check('m02 solved (reordered cols)')
    pg.click('#next-mission'); pg.wait_for_selector('.tour-card'); skip()
    # m03
    sql("SELECT INVOICE_ID, CONTRACT_ID, DUE_DATE, NET_AMOUNT+TAX_AMOUNT AS GROSS FROM RHN_IN.BILLING_INVOICES WHERE STATUS='OVERDUE' ORDER BY GROSS LIMIT 10"); check('m03 asc')
    sql("SELECT INVOICE_ID, CONTRACT_ID, DUE_DATE, NET_AMOUNT+TAX_AMOUNT AS GROSS FROM RHN_IN.BILLING_INVOICES WHERE STATUS='OVERDUE' ORDER BY GROSS DESC"); check('m03 no limit')
    sql("SELECT INVOICE_ID, CONTRACT_ID, DUE_DATE, NET_AMOUNT+TAX_AMOUNT AS GROSS FROM RHN_IN.BILLING_INVOICES WHERE STATUS='OVERDUE' ORDER BY GROSS DESC LIMIT 10"); check('m03 solved')
    pg.click('#next-mission'); pg.wait_for_selector('.tour-card'); skip()
    # m04
    sql("SELECT g.REGION, COUNT(*) AS N FROM RHN_IN.BILLING_CONTRACTS c, RHN_IN.GRID_AREAS g GROUP BY g.REGION"); check('m04 cross join')
    sql("SELECT g.REGION, COUNT(*) AS CONTRACTS FROM RHN_IN.BILLING_CONTRACTS c LEFT JOIN RHN_IN.GRID_AREAS g ON c.GRID_AREA = g.GRID_AREA GROUP BY g.REGION"); answer('lost',1); check('m04 solved left join')
    pg.screenshot(path=f'{S}/m04.png', full_page=False)
    print('XP topbar:', pg.inner_text('#rank').replace('\n',' '))
    pg.click('[data-view="home"]'); pg.wait_for_selector('.progress'); pg.screenshot(path=f'{S}/home.png')
    print('HOME:', pg.inner_text('.progress-row').replace('\n',' '))
    save=pg.evaluate("localStorage.getItem('dsg-progress-v3')")
    d=json.loads(save); print('SAVE xp', d['xp'], {k:(v['done'],v['xpEarned'],v['attempts']) for k,v in d['missions'].items()})
    pg.reload(); pg.wait_for_selector('.mission-head'); print('after reload:', pg.inner_text('.mission-head .where'), '|', pg.inner_text('#rank').replace('\n',' '))
    print('ERRORS', errs)
    b.close()
