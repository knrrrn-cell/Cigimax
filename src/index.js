const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 7000;

const MANIFEST = {
  id: 'org.cizgimax.nuvio',
  version: '1.1.0',
  name: 'ÇizgiMax Scraper (Pro)',
  description: 'ÇizgiMax içeriklerini Nuvio üzerinde dinamik olarak izleyin.',
  resources: ['stream'],
  types: ['series', 'anime', 'movie'],
  idPrefixes: ['cizgimax']
};

app.get('/manifest.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(MANIFEST);
});

app.get('/stream/:type/:id.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.params;
  let browser = null;

  try {
    const targetUrl = `https://cizgimax.online/${id}`;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let streamUrl = null;

    // Sayfadaki video/m3u8/iframe ağ isteklerini dinle
    page.on('request', request => {
      const url = request.url();
      if (url.includes('.m3u8') || url.includes('/embed/') || url.includes('video')) {
        if (!streamUrl && !url.includes('google') && !url.includes('analytics')) {
          streamUrl = url;
        }
      }
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 25000 });

    if (!streamUrl) {
      const iframeSrc = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe ? iframe.src : null;
      });
      streamUrl = iframeSrc;
    }

    if (streamUrl) {
      return res.json({
        streams: [
          {
            title: 'ÇizgiMax - Canlı Kaynak',
            url: streamUrl.startsWith('//') ? `https:${streamUrl}` : streamUrl
          }
        ]
      });
    }
  } catch (error) {
    console.error('ÇizgiMax Bot Hatası:', error.message);
  } finally {
    if (browser) await browser.close();
  }

  res.json({ streams: [] });
});

app.listen(PORT, () => console.log(`ÇizgiMax Nuvio Eklentisi ${PORT} portunda aktif!`));
