"""Helpers for the headless playtests (Playwright, Python). Dev server: npx vite --port 5199 --strictPort"""
import json

URL = 'http://localhost:5199/'
SPACES = [
    {"id": "RHN_IN", "name": "Rheinau Inbound", "diskGB": 40, "memoryGB": 8, "priority": 3},
    {"id": "RHN_HARM", "name": "Rheinau Harmonization", "diskGB": 36, "memoryGB": 8, "priority": 3},
    {"id": "RHN_REP", "name": "Rheinau Reporting", "diskGB": 20, "memoryGB": 10, "priority": 5},
]
CH = {
    0: ['c00-m01', 'c00-m02', 'c00-m03', 'c00-m04'],
    1: ['c01-m01', 'c01-m02', 'c01-m03', 'c01-m04'],
    2: ['c02-m01', 'c02-m02', 'c02-m03'],
    3: ['c03-m01', 'c03-m02', 'c03-m03', 'c03-m04', 'c03-m05', 'c03-m06'],
    4: ['c04-m01', 'c04-m02', 'c04-m03', 'c04-m04'],
    5: ['c05-m01', 'c05-m02', 'c05-m03', 'c05-m04', 'c05-m05'],
    6: ['c06-m01', 'c06-m02', 'c06-m03', 'c06-m04', 'c06-m05'],
    7: ['c07-m01', 'c07-m02', 'c07-m03', 'c07-m04', 'c07-m05'],
    8: ['c08-m01', 'c08-m02', 'c08-m03', 'c08-m04'],
    9: ['c09-m01', 'c09-m02', 'c09-m03', 'c09-m04'],
    10: ['c10-m01', 'c10-m02', 'c10-m03', 'c10-m04'],
    11: ['c11-m01', 'c11-m02', 'c11-m03'],
    12: ['c12-m01', 'c12-m02', 'c12-m03', 'c12-m04', 'c12-m05', 'c12-m06', 'c12-m07', 'c12-m08', 'c12-m09', 'c12-m10', 'c12-m11'],
}


def save_before(chapter, current, tenant=None, xp=200):
    """A v4 save with every mission of the chapters before `chapter` solved."""
    done = [m for c, ms in CH.items() if c < chapter for m in ms]
    return {"version": 4, "xp": xp, "currentMission": current, "tutorialsSeen": [],
            "missions": {m: {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 25, "events": []} for m in done},
            "tenant": tenant or {"spaces": SPACES[:1], "shares": [], "activeSpace": "RHN_IN"}}


class Game:
    def __init__(self, p, shots='.'):
        self.shots = shots
        self.errors = []
        self.b = p.chromium.launch()
        self.pg = self.b.new_page(viewport={'width': 1500, 'height': 950})
        self.pg.on('pageerror', lambda e: self.errors.append(str(e)))
        self.pg.on('dialog', lambda d: d.accept())

    def start(self, save=None):
        if save is not None:
            self.pg.add_init_script(
                "if(!sessionStorage.getItem('seeded')){localStorage.setItem('dsg-progress-v3', %s);sessionStorage.setItem('seeded','1')}"
                % json.dumps(json.dumps(save)))
        self.pg.goto(URL)
        self.pg.wait_for_selector('.mission-head', timeout=60000)
        self.pg.wait_for_timeout(300)

    def walk_tutorial(self, show=True):
        n = 0
        while self.pg.locator('.tour-card').count() and n < 80:
            if show:
                print('  tour:', self.pg.inner_text('.tour-card h2'))
            self.pg.click('[data-act="next"]')
            self.pg.wait_for_timeout(250)
            n += 1

    def skip_tutorial(self):
        if self.pg.locator('.tour-card').count():
            self.pg.click('[data-act="skip"]')

    def nav(self, app):
        """Open an app from the side navigation; opens a closed group (Monitoring, Catalog & Marketplace) first."""
        if not self.pg.locator(f'.nav [data-view="{app}"]').count():
            for grp in ['monitoring', 'catalog', 'apps', 'utilities']:
                self.pg.click(f'.nav [data-group="{grp}"]')
                if self.pg.locator(f'.nav [data-view="{app}"]').count():
                    break
                self.pg.click(f'.nav [data-group="{grp}"]')
        self.pg.click(f'.nav [data-view="{app}"]')
        self.pg.wait_for_timeout(250)
        # Monitor and Connections start with the space cards once per visit: take the current space.
        for grid in ['#mon-spaces', '#conn-spaces']:
            if self.pg.locator(grid).count():
                self.pg.click(f'{grid} [aria-current="true"]')
                self.pg.wait_for_timeout(200)

    def answer(self, qid, i):
        self.pg.check(f'input[name="q-{qid}"][value="{i}"]')

    def sql(self, text):
        self.pg.click('.cm-content')
        self.pg.keyboard.press('Control+a')
        self.pg.keyboard.press('Delete')
        self.pg.keyboard.insert_text(text)

    def check(self, label, show_ok=False):
        self.pg.click('#check')
        self.pg.wait_for_selector('#check:not([disabled])')
        self.pg.wait_for_timeout(200)
        print('---', label)
        for i in self.pg.locator('.check-list li').all_inner_texts():
            if show_ok or i.startswith('✗'):
                print('  ', i.replace('\n', ' | '))
        for r in self.pg.locator('.review').all_inner_texts():
            print('   REVIEW:', r.replace('\n', ' | ')[:240])
        g = self.pg.locator('.success .gain').all_inner_texts()
        if g:
            print('   GAIN', g)
        return bool(g)

    def next_mission(self):
        self.pg.click('#next-mission')
        self.pg.wait_for_timeout(300)
        self.skip_tutorial()

    # ---- Data Builder helpers (chapter 5+)
    def space(self, sid):
        """Open the Data Builder in space sid (picker or switch)."""
        self.nav('builder')
        if not self.pg.locator('#space-picker').count():
            self.pg.click('#space-switch'); self.pg.wait_for_selector('#space-picker')
        self.pg.click(f'[data-space="{sid}"]'); self.pg.wait_for_selector('#new-tiles')

    def share(self, key, to):
        """Share SPACE.OBJECT with space `to` from the object list (the builder must show the owner space)."""
        self.pg.click(f'[data-share="{key}"]')
        self.pg.check(f'.share-targets input[value="{to}"]')
        self.pg.click('.dialog button[type="submit"]'); self.pg.wait_for_timeout(250)

    def new_view(self, sql, technical=None, business=None, deploy=True):
        """New SQL view in the current space; with a technical name it is saved (and deployed)."""
        self.pg.click('[data-new="sqlview"]'); self.pg.wait_for_selector('#editor')
        self.sql(sql)
        if technical:
            self.pg.fill('#prop-business', business or technical.title())
            self.pg.fill('#prop-technical', technical)
            self.pg.click('#ed-deploy' if deploy else '#ed-save'); self.pg.wait_for_timeout(600)

    def edit_view(self, key, sql, deploy=True):
        """Open a view from the object list, replace its SQL, save or deploy."""
        self.pg.click(f'#object-list [data-open="{key}"]'); self.pg.wait_for_selector('#editor')
        self.sql(sql)
        self.pg.click('#ed-deploy' if deploy else '#ed-save'); self.pg.wait_for_timeout(600)

    def semantics(self, usage, roles=None, assoc=None, deploy=True):
        """In the open saved view: semantic usage, column roles {col: role}, associations [target key], then deploy."""
        self.pg.select_option('#prop-semantic', usage)
        self.pg.wait_for_selector('#column-roles')
        for col, role in (roles or {}).items():
            self.pg.select_option(f'#column-roles select[data-col="{col}"]', role)
        for target in assoc or []:
            self.pg.click('#assoc-add')
            self.pg.select_option('#assoc-target', target)
            self.pg.click('.dialog button[type="submit"]'); self.pg.wait_for_timeout(150)
        if deploy:
            self.pg.click('#ed-deploy'); self.pg.wait_for_timeout(600)

    def toast(self):
        t = self.pg.locator('.toast').all_inner_texts()
        return t[-1] if t else ''

    def shot(self, name):
        self.pg.screenshot(path=f'{self.shots}/{name}.png')

    def reload(self):
        self.pg.reload()
        self.pg.wait_for_selector('.mission-head', timeout=60000)
        self.skip_tutorial()

    def done(self):
        real = [e for e in self.errors if 'TUNNEL' not in e]
        print('ERRORS', real)
        self.b.close()
