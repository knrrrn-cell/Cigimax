const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

const MANIFEST = {
  id: 'org.cizgimax.nuvio',
  version: '2.5.0',
  name: 'ÇizgiMax Addon',
  description: 'ÇizgiMax IMDB ve Türkçe İsim Eşleştirmeli Yayın Sağlayıcı',
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
    let targetUrl = '';

    // Eğer istek IMDB ID olarak geldiyse (Örn: tt1865718:1:1)
    if (id.startsWith('tt')) {
      const parts = id.split(':');
      const imdbId = parts[0];
      const season = parts[1] || '1';
      const episode = parts[2] || '1';

      // 1. IMDB ID'den dizinin İngilizce/Türkçe adını Cinemeta API ile öğren
      const metaRes = await axios.get(`https://v3-cinemeta.strem.io/meta/${req.params.type}/${imdbId}.json`);
      const showName = metaRes.data?.meta?.name;

      if (showName) {
        // Dizi adını ÇizgiMax URL formatına dönüştür (Örn: Gravity Falls -> gravity-falls)
        const slug = showName
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-');

        targetUrl = `https://cizgimax.online/${slug}-${season}-sezon-${episode}-bolum-izle/`;
      }
    } else {
      targetUrl = `https://cizgimax.online/${id}/`;
    }

    if (!targetUrl) return res.json({ streams: [] });

    // 2. ÇizgiMax sayfasını çek ve video alternatiflerini tara
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://cizgimax.online/'
      }
    });

    const html = response.data;
    const streams = [];

    // Option etiketlerindeki Vidmoly, Playru, Sibnet vb. linkleri yakala
    const optionMatches = [...html.matchAll(/<option[^>]+value=["']([^"']+)["'][^>]*>([^<]+)<\/option>/gi)];
    
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
    console.error('ÇizgiMax Eşleştirme Hatası:', error.message);
  }

  res.json({ streams: [] });
});

app.listen(PORT, () => console.log(`ÇizgiMax Eklentisi ${PORT} portunda aktif!`));
