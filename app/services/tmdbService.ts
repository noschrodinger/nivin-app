const API_KEY = 'efeed9526bd765139b97d324e601ee0c'; // Ponga su llave aquí cuando la tenga
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_PATH = 'https://image.tmdb.org';

// Interfaz para que TS no te tire errores de tipo "any"
export interface MediaItem {
  id: string;
  title: string;
  poster: string;
  backdrop: string;
  description: string;
  year: string;
  type: 'movie' | 'tv'; // Agregamos esto para el embed
}

const formatResult = (m: any, type: 'movie' | 'tv'): MediaItem => ({
  id: m.id.toString(),
  title: m.title || m.name, // Las series usan 'name'
  poster: m.poster_path ? `${IMG_PATH}${m.poster_path}` : 'https://via.placeholder.com',
  backdrop: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
  description: m.overview,
  year: (m.release_date || m.first_air_date)?.split('-')[0] || 'N/A',
  type: type
});

export const TMDB = {
  // 1. Tendencias (Para el Hero y la primera fila)
  getTrending: async () => {
    const response = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}&language=es-MX`);
    const data = await response.json();
    return data.results.map((m: any) => ({
      id: m.id,
      title: m.title || m.name, // Las series usan 'name', las películas 'title'
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      backdrop: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
      description: m.overview,
      type: m.media_type // 'movie' o 'tv'
    }));
  },

  // 2. Películas Populares
  getMovies: async () => {
    const response = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=es-MX&sort_by=popularity.desc`);
    const data = await response.json();
    return data.results.map((m: any) => ({
      id: m.id,
      title: m.title,
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      backdrop: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
      description: m.overview,
      type: 'movie'
    }));
  },

  // 3. Series Populares
  getSeries: async () => {
    const response = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=es-MX&sort_by=popularity.desc`);
    const data = await response.json();
    return data.results.map((m: any) => ({
      id: m.id,
      title: m.name,
      poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      backdrop: `https://image.tmdb.org/t/p/original${m.backdrop_path}`,
      description: m.overview,
      type: 'tv'
    }));
  },

  // 4. Obtener detalles completos de una película o serie
  getDetails: async (id: string, type: string) => {
    // Usamos append_to_response para traer los actores y las clasificaciones de edad de un solo golpe
    const endpoint = type === 'tv' 
      ? `/tv/${id}?api_key=${API_KEY}&language=es-MX&append_to_response=credits,content_ratings`
      : `/movie/${id}?api_key=${API_KEY}&language=es-MX&append_to_response=credits,release_dates`;
    
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    
    // Extraer 3 actores principales
    const cast = data.credits?.cast?.slice(0, 3).map((c: any) => c.name).join(', ') || 'No disponible';
    
    // Extraer director o creador
    let creators = 'No disponible';
    if (type === 'tv') {
      creators = data.created_by?.map((c: any) => c.name).join(', ') || creators;
    } else {
      const director = data.credits?.crew?.find((c: any) => c.job === 'Director');
      creators = director ? director.name : creators;
    }

    return {
      ...data,
      cast,
      creators,
      year: type === 'tv' ? data.first_air_date?.split('-')[0] : data.release_date?.split('-')[0],
      duration: type === 'tv' ? `${data.number_of_seasons} temporadas` : `${data.runtime} min`,
      episodes: type === 'tv' ? data.number_of_episodes : null,
      ageRating: '16+' // Dato estático por ahora para no complicar el parseo de regiones
    };
  }
}; // Fin del objeto TMDB



// Actualizado para manejar Series y Películas en el Embed
export const getVideoLink = (id: string, type: 'movie' | 'tv' = 'movie') => {
  return `https://vidsrc.me/${type}?tmdb=${id}`;
};

/* ---------------------------
   FUNCIONES AGREGADAS (no modifican nada arriba)
   --------------------------- */

/**
 * Trae los episodios de una temporada específica (por defecto temporada 1).
 * Devuelve un array normalizado con: episode_number, name, runtime, still, id
 */
export const getSeasonEpisodes = async (tvId: string, seasonNumber: number = 1) => {
  try {
    const resp = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}&language=es-MX`);
    if (!resp.ok) {
      console.warn(`getSeasonEpisodes: respuesta no OK (${resp.status})`);
      return [];
    }
    const data = await resp.json();
    return (data?.episodes || []).map((e: any) => ({
      episode_number: e.episode_number ?? e.order ?? null,
      name: e.name ?? 'Sin título',
      runtime: e.runtime ?? (e.episode_run_time && e.episode_run_time[0]) ?? null,
      still: e.still_path ? `${IMG_PATH}/t/p/w300${e.still_path}` : null,
      id: e.id ?? `${tvId}-s${seasonNumber}-e${e.episode_number ?? Math.random()}`
    }));
  } catch (err) {
    console.error('Error en getSeasonEpisodes:', err);
    return [];
  }
};

/**
 * Busca el trailer en la lista de videos de TMDB y devuelve la "key" de YouTube (o null si no hay).
 */
export const getTrailerKey = async (id: string, type: 'movie' | 'tv' = 'movie') => {
  try {
    const resp = await fetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}&language=es-MX`);
    if (!resp.ok) {
      console.warn(`getTrailerKey: respuesta no OK (${resp.status})`);
      return null;
    }
    const data = await resp.json();
    const trailer = (data.results || []).find(
      (v: any) =>
        v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
    return trailer ? trailer.key : null;
  } catch (err) {
    console.error('Error en getTrailerKey:', err);
    return null;
  }
};