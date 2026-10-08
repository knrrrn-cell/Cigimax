const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

const MANIFEST = {
  id: 'org.cizgimax.nuvio',
  version: '1.2.0',
  name: 'ÇizgiMax Scraper',
  description: 'ÇizgiMax doğrudan video kaynağı çekici',
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

  try {
    const targetUrl = `https://cizgimax.online/${id}`;
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://cizgimax.online/'
      }
    });

    const html = response.data;

    // 1. Durum: Sayfa kaynağında geçen .m3u8 veya .mp4 bağlantılarını regex ile ara
    const streamMatch = html.match(/(https?:\/\/[^"' ]+\.(?:m3u8|mp4)[^"' ]*)/i) || 
                        html.match(/file:\s*["']([^"']+)["']/i) ||
                        html.match(/source:\s*["']([^"']+)["']/i);

    if (streamMatch && streamMatch[1]) {
      return res.json({
        streams: [
          {
            title: 'ÇizgiMax - Doğrudan Yayın',
            url: streamMatch[1]
          }
        ]
      });
    }
  } catch (error) {
    console.error('ÇizgiMax Kaynak Çekme Hatası:', error.message);
  }

  res.json({ streams: [] });
});

app.listen(PORT, () => console.log(`Eklenti ${PORT} portunda aktif!`));
