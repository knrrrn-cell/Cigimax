const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

const MANIFEST = {
  id: 'org.cizgimax.nuvio',
  version: '3.1.0',
  name: 'ÇizgiMax Pro',
  description: 'ÇizgiMax Hızlı Yayın Sağlayıcı',
  resources: ['stream'],
  types: ['series', 'anime', 'movie'],
  idPrefixes: ['tt', 'cizgimax']
};

app.get('/manifest.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(MANIFEST);
});

app.get('/stream/:type/:id.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.params;

  try {
    let searchTitle = '';
    let season = '1';
    let episode = '1';

    if (id.startsWith('tt')) {
      const parts = id.split(':');
      const imdbId = parts[0];
      season = parts[1] || '1';
      episode = parts[2] || '1';

      // Hızlı Cinemeta İsteği (1.5sn zaman aşımı limitli)
      const metaRes = await axios.get(`https://v3-cinemeta.strem.io/meta/${req.params.type}/${imdbId}.json`, { timeout: 1500 });
      searchTitle = metaRes.data?.meta?.name;
    } else {
      searchTitle = id;
    }

    if (!searchTitle) return res.json({ streams: [] });

    // Temel slug ve Arama Slug'larını Paralel Hazırla
    const cleanSlug = searchTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    
    // Olası ÇizgiMax bağlantı formatları
    const candidateUrls = [
      `https://cizgimax.online/${cleanSlug}-${season}-sezon-${episode}-bolum-izle/`,
      `https://cizgimax.online/${cleanSlug}/`
    ];

    // İki adresi de aynı anda tara (Hangisi hızlı dönerse)
    const streamPromises = candidateUrls.map(async (targetUrl) => {
      try {
        const response = await axios.get(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'https://cizgimax.online/'
          },
          timeout: 2000
        });

        const html = response.data;
        const foundStreams = [];

        // Player alternatiflerini tara (Vidmoly, Playru, Sibnet)
        const optionMatches = [...html.matchAll(/<option[^>]+value=["']([^"']+)["'][^>]*>([^<]+)<\/option>/gi)];
        
        for (const match of optionMatches) {
          let embedUrl = match[1];
          const name = match[2].trim();

          if (embedUrl && (embedUrl.includes('http') || embedUrl.startsWith('//'))) {
            if (embedUrl.startsWith('//')) embedUrl = `https:${embedUrl}`;
            foundStreams.push({
              title: `ÇizgiMax - ${name}`,
              url: embedUrl
            });
          }
        }
        return foundStreams;
      } catch (e) {
        return [];
      }
    });

    const results = await Promise.all(streamPromises);
    const streams = results.flat();

    if (streams.length > 0) {
      return res.json({ streams });
    }

  } catch (error) {
    console.error('Hızlı Tarama Hatası:', error.message);
  }

  // Zaman aşımına düşmemesi için boş yayın dizisini anında dön
  res.json({ streams: [] });
});

app.listen(PORT, () => console.log(`ÇizgiMax Hızlı Eklenti ${PORT} portunda aktif!`));
