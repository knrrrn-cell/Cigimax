const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

const MANIFEST = {
  id: 'org.cizgimax.nuvio',
  version: '3.0.0',
  name: 'ÇizgiMax Pro',
  description: 'ÇizgiMax Arama Motoru Entegrasyonlu Yayın Sağlayıcı',
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

      // Cinemeta üzerinden dizi/film adını al
      const metaRes = await axios.get(`https://v3-cinemeta.strem.io/meta/${req.params.type}/${imdbId}.json`);
      searchTitle = metaRes.data?.meta?.name;
    } else {
      searchTitle = id;
    }

    if (!searchTitle) return res.json({ streams: [] });

    // 1. ÇizgiMax Arama Motorunda Diziyi Ara
    const searchUrl = `https://cizgimax.online/?s=${encodeURIComponent(searchTitle)}`;
    const searchRes = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://cizgimax.online/'
      }
    });

    const searchHtml = searchRes.data;
    
    // Arama sonuçlarından ilk dizi/film sayfasının linkini çek
    const firstResultMatch = searchHtml.match(/<a[^>]+href=["'](https?:\/\/cizgimax\.online\/[^"']+)["'][^>]*>/i);
    let targetUrl = '';

    if (firstResultMatch && firstResultMatch[1]) {
      let mainPageUrl = firstResultMatch[1];
      if (mainPageUrl.endsWith('/')) mainPageUrl = mainPageUrl.slice(0, -1);
      
      // Bölüm URL'sini oluştur
      targetUrl = `${mainPageUrl}-${season}-sezon-${episode}-bolum-izle/`;
    } else {
      // Doğrudan slug denemesi
      const slug = searchTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
      targetUrl = `https://cizgimax.online/${slug}-${season}-sezon-${episode}-bolum-izle/`;
    }

    // 2. Bölüm Sayfasını Çek ve Player Linklerini Yakala
    const pageRes = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://cizgimax.online/'
      }
    });

    const pageHtml = pageRes.data;
    const streams = [];

    // Player seçeneklerini tara (Vidmoly, Playru, Sibnet)
    const optionMatches = [...pageHtml.matchAll(/<option[^>]+value=["']([^"']+)["'][^>]*>([^<]+)<\/option>/gi)];
    
    for (const match of optionMatches) {
      let embedUrl = match[1];
      const name = match[2].trim();

      if (embedUrl && (embedUrl.includes('http') || embedUrl.startsWith('//'))) {
        if (embedUrl.startsWith('//')) embedUrl = `https:${embedUrl}`;
        
        streams.push({
          title: `ÇizgiMax - ${name}`,
          url: embedUrl
        });
      }
    }

    if (streams.length > 0) {
      return res.json({ streams });
    }

  } catch (error) {
    console.error('ÇizgiMax Pro Hata:', error.message);
  }

  res.json({ streams: [] });
});

app.listen(PORT, () => console.log(`ÇizgiMax Pro Eklentisi ${PORT} portunda aktif!`));
