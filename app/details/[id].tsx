import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { TMDB, getSeasonEpisodes, getTrailerKey } from '../services/tmdbService';

import { PluginManager } from '../services/pluginManager';
import { StreamService } from '../services/streamService';

const { width } = Dimensions.get('window');

const API_KEY = 'efeed9526bd765139b97d324e601ee0c';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_PATH = 'https://image.tmdb.org';

export default function DetailsScreen() {

const router = useRouter();

const { id, title, poster, backdrop, description, type } = useLocalSearchParams() as any;

const [details, setDetails] = useState<any>(null);
const [loading, setLoading] = useState(true);
const [showVideo, setShowVideo] = useState(false);
const [trailerKey, setTrailerKey] = useState<string | null>(null);
const [episodesList, setEpisodesList] = useState<any[] | null>(null);

const [selectedSeason, setSelectedSeason] = useState<number>(1);
const [showSeasonPicker, setShowSeasonPicker] = useState<boolean>(false);

const [resolving, setResolving] = useState<boolean>(false);

useEffect(() => {

let mounted = true;

const fetchAll = async () => {

try {

setLoading(true);

const fullData = await TMDB.getDetails(String(id), String(type));
if (!mounted) return;

setDetails(fullData);

try {

const key = await getTrailerKey(String(id), type as "movie" | "tv");
if (mounted) setTrailerKey(key);

} catch {}

if (type === 'tv') {

try {

const eps = await getSeasonEpisodes(String(id), selectedSeason);
if (mounted) setEpisodesList(eps);

} catch {

if (mounted) setEpisodesList([]);

}

}

} catch (error) {

console.error('Error cargando detalles', error);

} finally {

if (mounted) setLoading(false);

}

};

fetchAll();

return () => {

mounted = false;

};

}, [id, type]);

useEffect(() => {

const loadSeason = async () => {

if (type !== 'tv') return;

setLoading(true);

try {

const eps = await getSeasonEpisodes(String(id), selectedSeason);
setEpisodesList(eps);

} catch {

setEpisodesList([]);

} finally {

setLoading(false);

}

};

loadSeason();

}, [selectedSeason]);

if (loading && !details) {

return (

<View style={styles.loadingContainer}>

<ActivityIndicator size="large" color="#E50914" />

</View>

);

}

const seasonsCount = details?.number_of_seasons ?? 1;

function buildEmbedUrl(plugin: any, mediaType: string, tmdbId: string, season?: number, episode?: number) {

console.log("BUILD EMBED URL");
console.log("Plugin:", plugin);
console.log("MediaType:", mediaType);
console.log("TMDB:", tmdbId);
console.log("Season:", season);
console.log("Episode:", episode);

if (mediaType === 'movie') {

return plugin.api + plugin.routes.movie.replace('{tmdbId}', tmdbId);

}

return plugin.api +

plugin.routes.tv

.replace('{tmdbId}', tmdbId)

.replace('{season}', String(season))

.replace('{episode}', String(episode));

}

// PLAY GENERAL

const handlePlay = async () => {

if (resolving) return;

setResolving(true);

try {

const plugins = await PluginManager.getInstalled();

if (!plugins.length) {

alert('No hay plugins instalados');

return;

}

const plugin = plugins[0];

let streamUrl: string | null = null;

// EMBED PLUGIN

if (plugin.type === 'embed') {

if (type === 'movie') {

streamUrl = buildEmbedUrl(plugin, 'movie', String(id));

} else {

const ep = episodesList?.[0]?.episode_number ?? 1;

streamUrl = buildEmbedUrl(plugin, 'tv', String(id), selectedSeason, ep);

}

} else {

// FUTUROS PLUGINS API

if (type === 'movie') {

streamUrl = await StreamService.getMovieStream(plugin, String(id));

} else {

const ep = episodesList?.[0]?.episode_number ?? 1;

streamUrl = await StreamService.getEpisodeStream(plugin, String(id), selectedSeason, ep);



}

}

console.log("PLUGIN USADO:", plugin);
console.log("STREAM URL GENERADA:", streamUrl);

if (!streamUrl) {

alert('No se encontró stream');

return;

}


router.push({

pathname: '/player/[url]',

params: { url: encodeURIComponent(streamUrl) }

});

} catch (err) {

console.error(err);

alert('Error reproduciendo');

} finally {

setResolving(false);

}

};

// PLAY EPISODIO

const handlePlayEpisode = async (episode: any) => {

if (resolving) return;

setResolving(true);

try {

const plugins = await PluginManager.getInstalled();

if (!plugins.length) {

alert('No hay plugins');

return;

}

const plugin = plugins[0];

let streamUrl = null;

if (plugin.type === 'embed') {

streamUrl = buildEmbedUrl(

plugin,

'tv',

String(id),

selectedSeason,

episode.episode_number

);

} else {

streamUrl = await StreamService.getEpisodeStream(



plugin,

String(id),

selectedSeason,

episode.episode_number

);

}

if (!streamUrl) {

alert('No se encontró stream');

return;

}

router.push({

pathname: '/player/[url]',

params: { url: encodeURIComponent(streamUrl) }

});

} catch (err) {

console.error(err);

alert('Error reproduciendo episodio');

} finally {

setResolving(false);

}

};

return (

<View style={styles.mainContainer}>

<StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>

<Ionicons name="arrow-back" size={28} color="white" />

</TouchableOpacity>

<ScrollView contentContainerStyle={{ paddingBottom: 60 }}>

<View style={styles.videoContainer}>

{trailerKey && showVideo ? (

<WebView

style={{ width: width, height: width * 0.56 }}

source={{

uri: `https://www.youtube.com/embed/${trailerKey}?autoplay=1`

}}

/>

) : (

<TouchableOpacity

onPress={() => trailerKey && setShowVideo(true)}

style={styles.fullTouchClick}

>

<Image source={{ uri: backdrop || poster }} style={styles.videoBackground} />

<View style={styles.playOverlay}>

<Ionicons name="play" size={60} color="white" />

</View>

</TouchableOpacity>

)}

</View>

<View style={styles.infoContainer}>

<Text style={styles.title}>{title}</Text>

<TouchableOpacity style={styles.playButton} onPress={handlePlay}>

<Ionicons name="play" size={22} color="black" />

<Text style={styles.playButtonText}>Ver</Text>

</TouchableOpacity>

<Text style={styles.synopsis}>{description}</Text>

</View>

{type === 'tv' && episodesList && (

<View style={styles.episodesSection}>

<FlatList

data={episodesList}

keyExtractor={(item, i) => String(i)}

scrollEnabled={false}

renderItem={({ item }) => (

<TouchableOpacity

style={styles.episodeCard}

onPress={() => handlePlayEpisode(item)}

>

<Image source={{ uri: item.still }} style={styles.episodeThumbnail} />

<View style={styles.episodeInfo}>

<Text style={styles.episodeTitle}>

{item.episode_number}. {item.name}

</Text>

</View>

</TouchableOpacity>

)}

/>

</View>

)}

</ScrollView>

</View>

);

}

const styles = StyleSheet.create({

mainContainer: { flex: 1, backgroundColor: '#000' },

loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

backButton: { position: 'absolute', top: 50, left: 15, zIndex: 10 },

videoContainer: { width: '100%', height: width * 0.56 },

videoBackground: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover', opacity: 0.6 },

fullTouchClick: { flex: 1, justifyContent: 'center', alignItems: 'center' },

playOverlay: { justifyContent: 'center', alignItems: 'center' },

infoContainer: { padding: 15 },

title: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 10 },

playButton: {

backgroundColor: 'white',

flexDirection: 'row',

justifyContent: 'center',

alignItems: 'center',

paddingVertical: 12,

borderRadius: 4,

marginBottom: 15

},

playButtonText: { color: 'black', fontWeight: 'bold', marginLeft: 8 },

synopsis: { color: '#ccc', lineHeight: 22 },

episodesSection: { marginTop: 20 },

episodeCard: { flexDirection: 'row', padding: 15, alignItems: 'center' },

episodeThumbnail: { width: 120, height: 70, backgroundColor: '#222' },

episodeInfo: { marginLeft: 10, flex: 1 },

episodeTitle: { color: 'white', fontSize: 15 }

});