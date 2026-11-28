// Renders scene.js product mock-ups in headless Chromium, serving local files through Playwright routing.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
(async () => {
  const [, , list, size = '900'] = process.argv;
  const b = await chromium.launch();
  for (const p of list.split(',')) {
    const pg = await b.newPage({ viewport: { width: +size, height: +size } });
    await pg.route('http://mock.local/**', (route) => {
      const f = path.join(__dirname, new URL(route.request().url()).pathname);
      if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' });
      route.fulfill({ status: 200, contentType: types[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    });
    pg.on('console', m => console.log(p, m.type(), m.text()));
    pg.on('pageerror', e => console.log(p, 'ERR', e.message));
    await pg.goto(`http://mock.local/index.html?p=${p}&s=${size}${process.env.EXTRA||''}`);
    await pg.waitForFunction('window.DONE===true', null, { timeout: 300000 });
    await pg.locator('canvas').screenshot({ path: `out_${p}.png` });
    console.log('done', p);
  }
  await b.close();
})();
