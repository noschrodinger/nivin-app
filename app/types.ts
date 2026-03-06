export interface MediaItem {
  id: string;
  title: string;
  poster: string;
  backdrop: string;
  description: string;
  videoUrl: string;
  releaseDate?: string;
  rating?: string;
}

export type Plugin = {
  id: string;
  name?: string;               // opcional para evitar problemas cuando el repo no provee name
  type?: string;               // 'embed' | 'direct' | 'movie' | 'tv' | etc
  api?: string;                // endpoint base que usa StreamService (p. ej. baseUrl)
  script?: string;             // si el plugin viene como script externo
  routes?: Record<string,string>;
  version?: string | number;
  meta?: Record<string, any>;
};

export type Repository = {
  name?: string;
  version?: string | number;
  url?: string;
  plugins?: Plugin[];
};