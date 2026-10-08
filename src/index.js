const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

const MANIFEST = {
  id: 'org.cizgimax.nuvio',
  version: '2.0.0',
  name: 'ÇizgiMax Addon',
  description: 'ÇizgiMax tüm alternatif kaynak çekici (Vidmoly, Playru, Sibnet)',
  resources: ['stream'],
  types: ['series', 'anime', 'movie'],
  idPrefixes: ['miraculous', 'cizgimax', 'tt']
};

app.get('/manifest.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(MANIFEST);
});

app.get('/stream/:type/:id.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.params;

  try {
    // ID uzantısı kontrolü
    const targetUrl = id.startsWith('http') ? id : `https://cizgimax.online/${id}/`;

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://cizgimax.online/'
      }
    });

    const html = response.data;
    const streams = [];

    // 1. Option etiketleri arasındaki embed linklerini yakala (Vidmoly, Playru, vb.)
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

    // 2. Eğer option etiketi bulunamazsa iframe linklerini tara
    if (streams.length === 0) {
      const iframeMatches = [...html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)];
      for (const match of iframeMatches) {
        let src = match[1];
        if (!src.includes('facebook') && !src.includes('google') && !src.includes('disqus')) {
          if (src.startsWith('//')) src = `https:${src}`;
          streams.push({
            title: 'ÇizgiMax - Varsayılan Oyuncu',
            url: src
          });
        }
      }
    }

    if (streams.length > 0) {
      return res.json({ streams });
    }

  } catch (error) {
    console.error('ÇizgiMax Ayrıştırma Hatası:', error.message);
  }

  res.json({ streams: [] });
});

app.listen(PORT, () => console.log(`ÇizgiMax Eklentisi ${PORT} portunda aktif!`));
