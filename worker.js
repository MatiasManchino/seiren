//--------------WORKER---------------
// www.seirenkenpo.com.ar es el unico dominio para google: los otros redirigen ahi (301)
// mientras PRONTO: solo existe "/" con el cartel, lo demas va a "/" (302)
// workers.dev es el sitio de revision: sin indexar y solo con la llave del link
// para lanzar el sitio: PRONTO = false y subir

const PRONTO = true;

const CANONICO = 'www.seirenkenpo.com.ar';
const ALIAS = ['seirenkenpo.com.ar', 'seirenkenpo.com', 'www.seirenkenpo.com'];

// llave de workers.dev: se entra una vez con ?llave=... y queda una cookie por 60 dias
// aca va solo el sha-256, la llave no esta en el repo (esta en LEEME-SITIO.md, que no se sube)
const LLAVE_SHA256 = '019961f1235d9bd21092d0db0418419f0ed2925dbfb81f2a9b5f36f21bccd6a6';

// las mismas de _headers (las respuestas que pasan por aca no siempre las llevan)
const CABECERAS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
};

const NO_INDEXAR = 'noindex, nofollow, noarchive';

// mientras PRONTO el sitemap anuncia solo el inicio
const SITEMAP_PRONTO = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://' + CANONICO + '/</loc>\n  </url>\n</urlset>\n';

async function sha256(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function galleta(request, nombre) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + nombre + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;
    const revision = host.endsWith('.workers.dev');

    // un solo dominio y siempre https
    if (ALIAS.includes(host) || (host === CANONICO && url.protocol === 'http:')) {
      return Response.redirect('https://' + CANONICO + url.pathname + url.search, 301);
    }

    if (revision) {
      // que ningun buscador lo rastree
      if (url.pathname === '/robots.txt') {
        return new Response('User-agent: *\nDisallow: /\n', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': NO_INDEXAR },
        });
      }
      // entrada con la llave: queda la cookie y se saca la llave de la direccion
      if (url.searchParams.has('llave')) {
        const llave = url.searchParams.get('llave');
        url.searchParams.delete('llave');
        const h = new Headers({ Location: url.pathname + url.search, 'Cache-Control': 'no-store', 'X-Robots-Tag': NO_INDEXAR });
        if ((await sha256(llave)) === LLAVE_SHA256) {
          h.append('Set-Cookie', 'llave=' + encodeURIComponent(llave) + '; Max-Age=5184000; Path=/; Secure; HttpOnly; SameSite=Lax');
        }
        return new Response(null, { status: 302, headers: h });
      }
    }

    // una pagina es lo que no tiene extension (o termina en .html)
    const esPagina = !/\.[a-z0-9]+$/i.test(url.pathname.replace(/\.html$/i, ''));
    const adentro = revision && (await sha256(galleta(request, 'llave'))) === LLAVE_SHA256;
    const cartel = () => env.ASSETS.fetch(new Request(new URL('/pronto', url), request));

    let res;
    if (revision) {
      if (adentro) res = await env.ASSETS.fetch(request);
      else res = esPagina ? await cartel() : await env.ASSETS.fetch(new Request(new URL('/no-existe', url), request));
    } else if (PRONTO) {
      if (url.pathname === '/sitemap.xml') {
        return new Response(SITEMAP_PRONTO, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
      }
      if (esPagina && url.pathname !== '/') return Response.redirect(new URL('/', url).toString(), 302);
      res = esPagina ? await cartel() : await env.ASSETS.fetch(request);
    } else {
      res = await env.ASSETS.fetch(request);
    }

    res = new Response(res.body, res);
    for (const [k, v] of Object.entries(CABECERAS)) {
      if (!res.headers.has(k)) res.headers.set(k, v);
    }
    if (revision) {
      res.headers.set('X-Robots-Tag', NO_INDEXAR);
      res.headers.set('Cache-Control', 'no-store');
    }
    return res;
  },
};
