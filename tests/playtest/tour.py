"""Grand tour c00-m00: plays the whole hands-on tutorial by clicking, like a player, from a fresh save.
Used by chapter0.py (and so by chain.sh); run alone: python3 tour.py <screenshot folder>."""
import sys
from playwright.sync_api import sync_playwright
from common import Game

APPS = {
    'Home': 'home', 'Repository Explorer': 'repository', 'System and Spaces': 'sysmonitor', 'Capacities': 'capacities',
    'Task Logs': 'tasklogs', 'Expensive Statement Logs': 'statements', 'Elastic Compute Nodes': 'ecn', 'Data Integration': 'monitor',
    'Search': 'catalog', 'Marketplace Data Products': 'marketplace', 'Semantic Onboarding': 'semantic', 'Business Builder': 'business',
    'Data Builder': 'builder', 'Connections': 'connections', 'Space Management': 'spaces', 'Translation': 'translation',
    'Transport': 'transport', 'Data Sharing Cockpit': 'sharing', 'Security': 'security', 'System': 'system',
}
GROUPS = ['monitoring', 'catalog', 'apps', 'utilities']
ANSWERS = [('cost', 0), ('prod', 1), ('lang', 2), ('old', 3), ('names', 4)]


def open_app(pg, app):
    """Click an app like a player: open its group first if it is folded."""
    if not pg.locator(f'.nav [data-view="{app}"]').count():
        for grp in GROUPS:
            pg.click(f'.nav [data-group="{grp}"]')
            if pg.locator(f'.nav [data-view="{app}"]').count():
                break
            pg.click(f'.nav [data-group="{grp}"]')
    pg.click(f'.nav [data-view="{app}"]')


def act(g, title):
    pg = g.pg
    if title in APPS:
        return open_app(pg, APPS[title])
    if title == 'Open the navigation':
        return pg.click('#nav-toggle')
    if title == 'The glossary':
        return pg.click('#glossary-open')
    if title == 'How to play':
        return pg.click('#guide-close') if pg.locator('.guide-overlay').count() else pg.click('#guide-open')
    if title == 'The user menu':
        return pg.click('#shell-user')
    if title == 'Settings':
        return pg.click('[data-um="settings"]')
    if title == 'Your settings':
        return pg.click('[data-set="ui"]')
    if title in ('Close Settings',):
        return pg.click('.dialog [data-act="cancel"]')
    if title == 'Pick a space':
        return pg.click('[data-space="RHN_ENTRY"]')
    if title == 'Try a grey tile':
        return pg.click('[data-new="analytic"]')
    if title == 'What it said':
        return pg.click('.dialog [type="submit"]')
    if title == 'The Import menu':
        return pg.click('#import-menu-btn')
    if title == 'Open a table':
        return pg.click('[data-open="RHN_ENTRY.BILLING_CONTRACTS"]')
    if title == 'Data Preview':
        return pg.click('#run')
    if title == 'Back to the space':
        return pg.click('#ed-back')
    if title == 'Your answers':
        for q, v in ANSWERS:
            g.answer(q, v)
        return None
    if title == 'Check your work':
        return pg.click('#check')
    raise AssertionError(f'no action for tour step {title!r}')


def play_grand_tour(g, shots=True):
    """Plays the tutorial that opened with c00-m00. Returns the number of steps."""
    pg = g.pg
    pg.wait_for_selector('.tour-card')
    steps = 0
    seen_apps = []
    while pg.locator('.tour-card').count() and steps < 120:
        title = pg.inner_text('.tour-card h2')
        count = pg.inner_text('.tour-count')
        acting = 'your turn' in count.lower()
        steps += 1
        if acting:
            act(g, title)
            pg.wait_for_selector('.tour-card.done', timeout=8000)
            if title in APPS:
                seen_apps.append(title)
                pg.wait_for_timeout(300)
                if shots and title in ('Data Integration', 'Data Builder', 'Security', 'Glossary', 'The glossary', 'Your settings', 'Data Preview'):
                    g.shot(f'tour-{APPS[title]}')
            nxt = pg.locator('.tour-card [data-act="next"].primary')
            if nxt.count():
                nxt.click()  # stay steps wait for Next
            pg.wait_for_timeout(900)
        else:
            pg.wait_for_timeout(300)
            if shots and title in ('The project in one picture', 'The editor toolbar', 'Create something', 'Monitoring'):
                g.shot('tour-' + title.lower().replace(' ', '-'))
            pg.click('[data-act="next"]')
            pg.wait_for_timeout(250)
    print(f'   TOUR: {steps} steps, {len(seen_apps)} apps opened by clicking')
    pg.wait_for_timeout(500)
    gain = pg.locator('.success .gain').all_inner_texts()
    if gain:
        print('   GAIN', gain)  # the last tour step pressed Check my solution
    return steps


if __name__ == '__main__':
    S = sys.argv[1] if len(sys.argv) > 1 else '.'
    with sync_playwright() as p:
        g = Game(p, S, expanded_nav=False)  # the real default: folded
        g.start()
        assert g.pg.locator('.app.nav-collapsed').count(), 'navigation should start folded'
        print('   MISSION:', g.pg.inner_text('.mission-head'))
        play_grand_tour(g)
        g.check('c00-m00 by tutorial', show_ok=True)
        g.done()
