interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: unknown) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const z = Number(Array.isArray(req.query?.z) ? req.query.z[0] : req.query?.z);
  const x = Number(Array.isArray(req.query?.x) ? req.query.x[0] : req.query?.x);
  const y = Number(Array.isArray(req.query?.y) ? req.query.y[0] : req.query?.y);

  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y) || z < 0 || z > 19) {
    return res.status(400).send('Invalid tile coordinates');
  }

  if (req.method === 'HEAD') {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send('');
  }

  const sub = ['a', 'b', 'c', 'd'][(x + y) % 4];
  const urls = [
    `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
    `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const upstream = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'GangwonIeoraMapProxy/1.0',
        },
      });
      clearTimeout(timer);

      if (upstream.ok) {
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(buf);
      }
    } catch {
      // try next upstream
    }
  }

  return res.status(502).send('Tile unavailable');
}
