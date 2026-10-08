const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

const manifest = {
  id: 'org.cizgimax.nuvio',
  version: '1.0.1',
  name: 'ÇizgiMax Scraper',
  description: 'Test sürümü',
  resources: ['stream'],
  types: ['movie', 'series'],
  idPrefixes: ['tt']
};

app.use((req, res, next) => {
  console.log('İSTEK:', req.method, req.url);
  next();
});

app.get('/manifest.json', (req, res) => res.json(manifest));

app.get('/stream/:type/:id.json', (req, res) => {
  res.json({
    streams: [{
      name: 'TEST',
      title: 'Test Akışı',
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    }]
  });
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => console.log('Aktif, port', PORT));
