import sys, json
from playwright.sync_api import sync_playwright
S=sys.argv[1] if len(sys.argv) > 1 else "."; errs=[]
done=["c00-m01","c00-m02","c00-m03","c00-m04","c01-m01","c01-m02","c01-m03","c01-m04"]
save={"version":3,"xp":250,"currentMission":"c02-m01","tutorialsSeen":[],"missions":{m:{"hintsOpen":0,"answers":{},"attempts":1,"done":True,"xpEarned":30} for m in done},
 "tenant":{"spaces":[{"id":"RHN_IN","name":"Rheinau Inbound","diskGB":40,"memoryGB":8,"priority":3},{"id":"RHN_HARM","name":"Rheinau Harmonization","diskGB":36,"memoryGB":8,"priority":3},{"id":"RHN_REP","name":"Rheinau Reporting","diskGB":20,"memoryGB":10,"priority":5}],
 "shares":[{"object":"RHN_IN.BILLING_CONTRACTS","to":"RHN_HARM"},{"object":"RHN_IN.GRID_AREAS","to":"RHN_HARM"}],"activeSpace":"RHN_IN"}}
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1500,'height':950})
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('dialog', lambda d: d.accept())
    pg.add_init_script("if(!sessionStorage.getItem('i')){localStorage.setItem('dsg-progress-v3', %s);sessionStorage.setItem('i','1')}" % json.dumps(json.dumps(save)))
    pg.goto('http://localhost:5199/'); pg.wait_for_selector('.tour-card', timeout=60000)
    n=0
    while pg.locator('.tour-card').count() and n<10:
        print('  tour:', pg.inner_text('.tour-card h2')); pg.click('[data-act="next"]'); pg.wait_for_timeout(300); n+=1
    def check(label, show_ok=False):
        pg.click('#check'); pg.wait_for_selector('#check:not([disabled])'); pg.wait_for_timeout(200)
        print('---',label)
        for i in pg.locator('.check-list li').all_inner_texts():
            if show_ok or i.startswith('✗'): print('  ', i.replace('\n',' | '))
        g=pg.locator('.success .gain').all_inner_texts()
        if g: print('   GAIN', g)
    def role(id, tpl, scope, edit=False):
        if edit: pg.click(f'[data-role-edit="{id}"]')
        else: pg.click('#create-role'); pg.fill('[name="id"]', id)
        pg.select_option('[name="template"]', tpl)
        for cb in pg.locator('[name="scope"]').all():
            (cb.check() if cb.get_attribute('value') in scope else cb.uncheck())
        pg.click('.dialog [type="submit"]'); pg.wait_for_timeout(250)
        e=pg.locator('.form-error')
        if e.count() and e.inner_text().strip(): print('   FORM ERROR:', e.inner_text()); pg.click('[data-act="cancel"]')
    pg.click('[data-view="security"]'); pg.wait_for_selector('#create-role')
    role('rhn modeler','MODELER',['RHN_HARM'])
    role('RHN_SPACE_ADMIN','SPACE_ADMIN',['RHN_IN','RHN_HARM','RHN_REP'])
    role('RHN_INTEGRATOR','INTEGRATOR',['RHN_IN'])
    role('RHN_MODELER','MODELER',['RHN_HARM','RHN_REP'])
    role('VIEWER','VIEWER',['RHN_IN','RHN_HARM','RHN_REP'])
    role('RHN_CONSUMER','CONSUMER',['RHN_REP'])
    pg.check('input[name="q-global"][value="0"]'); check('m01 mistakes')
    pg.click('[data-role-delete="VIEWER"]'); pg.wait_for_timeout(200)
    role('RHN_VIEWER','VIEWER',['RHN_IN','RHN_HARM','RHN_REP'])
    role('RHN_SPACE_ADMIN','SPACE_ADMIN',['RHN_HARM','RHN_REP'],edit=True)
    role('RHN_MODELER','MODELER',['RHN_IN','RHN_HARM','RHN_REP'],edit=True)
    check('m01 solved')
    pg.screenshot(path=f'{S}/roles.png')
    pg.click('#next-mission'); pg.wait_for_selector('.tour-card'); pg.click('[data-act="skip"]')
    pg.click('[data-tab="users"]'); pg.wait_for_selector('#user-list')
    def assign(user, admin=False, roles={}):
        pg.click(f'[data-user="{user}"]'); pg.wait_for_selector('.dialog')
        (pg.check if admin else pg.uncheck)('[name="admin"]')
        for cb in pg.locator('.dialog input[type=checkbox]:not([name="admin"])').all():
            r=cb.get_attribute('name')[2:]; sp=cb.get_attribute('value')
            (cb.check() if sp in roles.get(r,[]) else cb.uncheck())
        pg.click('.dialog [type="submit"]'); pg.wait_for_timeout(250)
    assign('jbecker', admin=True)
    assign('cmucea', roles={'RHN_SPACE_ADMIN':['RHN_HARM','RHN_REP'],'RHN_MODELER':['RHN_HARM','RHN_REP']})
    assign('lhoffmann', admin=True, roles={'RHN_INTEGRATOR':['RHN_IN']})
    assign('tschulz', roles={'RHN_MODELER':['RHN_HARM','RHN_REP']})
    assign('swolf', roles={'RHN_VIEWER':['RHN_IN','RHN_HARM']})
    assign('plindner', roles={'RHN_VIEWER':['RHN_REP']})
    assign('mbrandt', roles={'RHN_CONSUMER':['RHN_REP']})
    pg.check('input[name="q-lena"][value="2"]'); check('m02 mistakes')
    assign('lhoffmann', roles={'RHN_INTEGRATOR':['RHN_IN'],'RHN_MODELER':['RHN_IN']})
    assign('tschulz', roles={'RHN_MODELER':['RHN_HARM']})
    assign('swolf', roles={'RHN_VIEWER':['RHN_IN','RHN_HARM','RHN_REP']})
    assign('plindner', roles={'RHN_CONSUMER':['RHN_REP']})
    assign('ademir', roles={'RHN_CONSUMER':['RHN_REP']})
    check('m02 solved')
    pg.screenshot(path=f'{S}/users.png')
    pg.click('#next-mission'); pg.wait_for_selector('.tour-card'); pg.click('[data-act="skip"]')
    pg.click('[data-view="security"]'); pg.wait_for_timeout(300)
    if pg.locator('[data-tab="users"]').count(): pg.click('[data-tab="users"]')
    pg.wait_for_selector('[data-user="nkrueger"]')
    assign('nkrueger', roles={'RHN_MODELER':['RHN_HARM']})
    assign('tschulz', roles={'RHN_MODELER':['RHN_HARM','RHN_REP']})
    pg.check('input[name="q-who"][value="1"]'); pg.check('input[name="q-rows"][value="2"]'); check('m03 forgot to remove')
    assign('tschulz', roles={'RHN_MODELER':['RHN_REP']})
    check('m03 solved')
    pg.reload(); pg.wait_for_selector('.mission-head'); pg.click('[data-view="security"]'); pg.click('[data-tab="users"]'); pg.wait_for_selector('#user-list')
    print('AFTER RELOAD tim:', pg.locator('#user-list tr', has_text='Tim Schulz').inner_text().replace('\n',' ').replace('\t',' ')[-60:])
    print('ERRORS', errs); b.close()
