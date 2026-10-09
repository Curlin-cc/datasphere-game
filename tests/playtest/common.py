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
        self.pg.click(f'.nav [data-view="{app}"]')
        self.pg.wait_for_timeout(250)

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
