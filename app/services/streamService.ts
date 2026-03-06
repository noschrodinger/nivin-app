// app/services/streamService.ts
// Versión robusta: intenta parsear JSON, y si la respuesta es HTML intenta extraer .m3u8, <source> o <iframe>.
export const StreamService = {
  // Intenta conseguir un stream directo para una película
  async getMovieStream(plugin: any, tmdbId: string): Promise<string | null> {
    if (!plugin || !plugin.api) {
      console.warn('StreamService.getMovieStream: plugin inválido o sin api', plugin);
      return null;
    }
    const url = `${plugin.api.replace(/\/$/, '')}/movie/${tmdbId}`;
    return await fetchAndExtractStream(url);
  },

  // Intenta conseguir un stream directo para un episodio
  async getEpisodeStream(plugin: any, tmdbId: string, season: number, episode: number): Promise<string | null> {
    if (!plugin || !plugin.api) {
      console.warn('StreamService.getEpisodeStream: plugin inválido o sin api', plugin);
      return null;
    }
    const url = `${plugin.api.replace(/\/$/, '')}/tv/${tmdbId}/${season}/${episode}`;
    return await fetchAndExtractStream(url);
  }
};

/* -------------------------
   Helpers
   ------------------------- */

async function fetchAndExtractStream(url: string, depth = 0): Promise<string | null> {
  try {
    const res = await fetch(url, { method: 'GET' });
    const text = await res.text();

    // LOG para debug (solo primeras 2000 chars para no spamear)
    console.log(`StreamService.fetchAndExtractStream -> ${url} (status ${res.status})`);
    console.log(text.slice(0, 2000));

    // 1) Intentar parsear JSON (si el endpoint devuelve JSON)
    try {
      const json = JSON.parse(text);
      // casos comunes: { streamUrl: "..." } o { url: "..." } o array ...
      if (typeof json === 'string') return json;
      if (json.streamUrl) return json.streamUrl;
      if (json.url) return json.url;
      if (Array.isArray(json) && json.length > 0) {
        // si es un array de objetos con url/streamUrl:
        const candidate = json.find((x: any) => x.streamUrl || x.url);
        if (candidate) return candidate.streamUrl || candidate.url;
      }
      // si es JSON pero no contiene stream, continuamos para intentar extraer del HTML (poco probable)
    } catch (err) {
      // No es JSON -> probablemente HTML. Procedemos a buscar enlaces útiles.
      // console.log('Respuesta no JSON, intentando extraer desde HTML...');
    }

    // 2) Si es HTML: buscar .m3u8 directo
    const m3u8 = text.match(/https?:\/\/[^"'\s>]+\.m3u8/);
    if (m3u8 && m3u8[0]) {
      console.log('StreamService: encontró m3u8 directo ->', m3u8[0]);
      return decodeHtmlEntities(m3u8[0]);
    }

    // 3) Buscar <source src="..."> o <video src="...">
    const source = text.match(/<source[^>]*src=['"]([^'"]+)['"]/i) || text.match(/<video[^>]*src=['"]([^'"]+)['"]/i);
    if (source && source[1]) {
      console.log('StreamService: encontró <source> ->', source[1]);
      return decodeHtmlEntities(source[1]);
    }

    // 4) Buscar <iframe src="...">
    const iframe = text.match(/<iframe[^>]*src=['"]([^'"]+)['"]/i);
    if (iframe && iframe[1]) {
      let iframeUrl = iframe[1];
      iframeUrl = resolveRelativeUrl(url, iframeUrl);
      console.log('StreamService: encontró iframe ->', iframeUrl);

      // Si el iframe apunta a un .m3u8 o a un JSON, intentar extraer (recursividad controlada)
      if (/\.(m3u8|mp4)(\?|$)/i.test(iframeUrl)) {
        return iframeUrl;
      }
      if (depth < 2) {
        // fetch al iframe para intentar extraer m3u8 dentro
        return await fetchAndExtractStream(iframeUrl, depth + 1);
      }
    }

    // 5) Buscar urls dentro de javascript (p.ej. sources: ["...m3u8"])
    const jsUrl = text.match(/["'](https?:\/\/[^"']+\.(m3u8|mp4)[^"']*)["']/i);
    if (jsUrl && jsUrl[1]) {
      console.log('StreamService: encontró URL dentro de JS ->', jsUrl[1]);
      return decodeHtmlEntities(jsUrl[1]);
    }

    // 6) Si llegamos hasta acá, no pudimos extraer un stream
    console.warn('StreamService: no se encontró stream en la respuesta de:', url);
    return null;

  } catch (err: any) {
    console.error('Error en fetchAndExtractStream:', err);
    // Si el error proviene de parse JSON antiguo, lo convertimos en null y devolvemos un mensaje legible
    return null;
  }
}

/* -------------------------
   Utilidades pequeñas
   ------------------------- */

function decodeHtmlEntities(str: string) {
  try {
    // algunos links vienen codificados (&amp;)
    return str.replace(/&amp;/g, '&');
  } catch {
    return str;
  }
}

function resolveRelativeUrl(base: string, maybeRelative: string) {
  try {
    if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
    const baseUrl = new URL(base);
    const resolved = new URL(maybeRelative, baseUrl).toString();
    return resolved;
  } catch {
    return maybeRelative;
  }
}