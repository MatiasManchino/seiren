//--------------WORKER---------------
// en los dominios propios (.com.ar y .com) muestra el cartel de "muy pronto"
// en workers.dev sigue el sitio completo para revisarlo, sin que google lo indexe
// para lanzar el sitio: PRONTO = false y subir

const PRONTO = true;

// las mismas de _headers (las respuestas que pasan por aca no siempre las llevan)
const CABECERAS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const revision = url.hostname.endsWith('.workers.dev');

    // una pagina es lo que no tiene extension (o termina en .html)
    const esPagina = !/\.[a-z0-9]+$/i.test(url.pathname.replace(/\.html$/i, ''));

    let res;
    if (PRONTO && !revision && esPagina) {
      res = await env.ASSETS.fetch(new Request(new URL('/pronto', url), request));
    } else {
      res = await env.ASSETS.fetch(request);
    }

    res = new Response(res.body, res);
    for (const [k, v] of Object.entries(CABECERAS)) {
      if (!res.headers.has(k)) res.headers.set(k, v);
    }
    if (revision) res.headers.set('X-Robots-Tag', 'noindex');
    return res;
  },
};
