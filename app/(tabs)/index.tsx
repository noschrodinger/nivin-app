import { Ionicons, Octicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { PluginManager } from '../services/pluginManager';
import { StreamService } from '../services/streamService';
import { TMDB } from '../services/tmdbService';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const [trending, setTrending] = useState<any[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);

  const [baseBgUri, setBaseBgUri] = useState<string | null>(null);
  const [overlayBgUri, setOverlayBgUri] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {

    const fetchAllData = async () => {

      try {

        setLoading(true);

        const [trendingData, moviesData, seriesData] = await Promise.all([
          TMDB.getTrending(),
          TMDB.getMovies(),
          TMDB.getSeries()
        ]);

        setTrending(trendingData || []);
        setMovies(moviesData || []);
        setSeries(seriesData || []);

      } catch (error) {

        console.error("Error en la descarga de datos:", error);

      } finally {

        setLoading(false);

      }

    };

    fetchAllData();

  }, []);

  useEffect(() => {

    const top5 = (trending || []).slice(0, 5);

    if (top5.length > 0 && baseBgUri == null) {

      setBaseBgUri(top5[0].poster);

    }

  }, [trending, baseBgUri]);

  useEffect(() => {

    const top5 = (trending || []).slice(0, 5);
    const newItem = top5[activeIndex];

    if (!newItem) return;

    const newUri = newItem.poster;

    if (!baseBgUri) {

      setBaseBgUri(newUri);
      return;

    }

    if (newUri === baseBgUri) return;

    setOverlayBgUri(newUri);

    fadeAnim.setValue(0);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {

      setOverlayBgUri(null);
      setBaseBgUri(newUri);
      fadeAnim.setValue(0);

    });

  }, [activeIndex, trending]);

  const navigateToDetails = (item: any) => {

    router.push({
      pathname: "/details/[id]",
      params: {
        id: String(item.id),
        title: item.title,
        poster: item.poster,
        backdrop: item.backdrop,
        description: item.description,
        type: item.type
      }
    });

  };

  // 🎬 REPRODUCIR DIRECTAMENTE
  const handlePlay = async (item: any) => {

    try {

      const plugins = await PluginManager.getInstalled();

      if (plugins.length === 0) {

        console.warn("No hay plugins instalados");
        return;

      }

      const plugin = plugins[0];

      const stream = await StreamService.getMovieStream(
        plugin,
        String(item.id)
      );

      if (!stream) {

        console.warn("No se encontró stream");
        return;

      }

      router.push({
        pathname: "/player/[url]",
        params: {
          url: encodeURIComponent(stream)
        }
      });

    } catch (err) {

      console.error("Error reproduciendo:", err);

    }

  };

  const handleScroll = (event: any) => {

    const native = event?.nativeEvent;

    if (!native) return;

    const slideSize = native.layoutMeasurement?.width || width;

    const index = Math.round((native.contentOffset?.x || 0) / slideSize);

    if (index !== activeIndex && index >= 0 && index < 5) {

      setActiveIndex(index);

    }

  };

  const renderMovieCard = ({ item }: any) => (

    <TouchableOpacity
      style={styles.card}
      onPress={() => navigateToDetails(item)}
    >
      <Image source={{ uri: item.poster }} style={styles.poster} />
    </TouchableOpacity>

  );

  if (loading) {

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );

  }

  const top5Trending = (trending || []).slice(0, 5);

  return (

    <View style={styles.mainContainer}>

      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {baseBgUri && (

        <View style={StyleSheet.absoluteFillObject}>

          <Image
            source={{ uri: baseBgUri }}
            style={styles.dynamicBackground}
            blurRadius={80}
            fadeDuration={0}
          />

          {overlayBgUri && (

            <Animated.Image
              source={{ uri: overlayBgUri }}
              style={[
                styles.dynamicBackground,
                { position: 'absolute', top: 0, left: 0, opacity: fadeAnim }
              ]}
              blurRadius={80}
            />

          )}

          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)', '#000', '#000']}
            locations={[0, 0.4, 0.6, 1]}
            style={StyleSheet.absoluteFillObject}
          />

        </View>

      )}

      <View style={styles.headerAbsolute}>

        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.logoMock}
        />

        <View style={styles.rightIcons}>
          <TouchableOpacity style={styles.iconButton}>

            <Octicons name="download" size={28} color="white" />

          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={26} color="white" />
          </TouchableOpacity>
        </View>

      </View>

      <ScrollView style={styles.container}>

        <View style={styles.heroWrapper}>

          <FlatList
            data={top5Trending}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            keyExtractor={(item) => `hero-${item.id}`}
            renderItem={({ item }) => (

              <View style={styles.heroSlide}>

                <TouchableOpacity
                  onPress={() => navigateToDetails(item)}
                  activeOpacity={0.9}
                >

                  <View style={styles.heroPosterContainer}>

                    <Image
                      source={{ uri: item.poster }}
                      style={styles.heroPoster}
                    />

                  </View>

                </TouchableOpacity>

                <View style={styles.heroButtonsContainer}>

                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => handlePlay(item)}
                  >

                    <Ionicons name="play" size={24} color="black" />

                    <Text style={styles.playButtonText}>
                      Reproducir
                    </Text>

                  </TouchableOpacity>

                  <TouchableOpacity style={styles.listButton}>

                    <Ionicons name="add" size={24} color="white" />

                    <Text style={styles.listButtonText}>
                      Mi lista
                    </Text>

                  </TouchableOpacity>

                </View>

              </View>

            )}
          />

        </View>

        <View style={styles.content}>

          <Text style={styles.rowTitle}>Series imperdibles</Text>

          <FlatList
            horizontal
            data={series}
            renderItem={renderMovieCard}
            keyExtractor={(item) => `series-${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listPadding}
          />

          <Text style={[styles.rowTitle, { marginTop: 25 }]}>
            Películas que podrían gustarte
          </Text>

          <FlatList
            horizontal
            data={movies}
            renderItem={renderMovieCard}
            keyExtractor={(item) => `movie-${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listPadding}
          />

        </View>

        <View style={{ height: 60 }} />

      </ScrollView>

    </View>

  );

}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },

  dynamicBackground: { width: '100%', height: height * 0.7, opacity: 0.8, resizeMode: 'cover' },

  headerAbsolute: {
    position: 'absolute', top: 40, width: '100%', zIndex: 100,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center'
  },
  logoMock: { width: 30, height: 40, resizeMode: 'contain', opacity: 0 },

  rightIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 6, marginLeft: 8 },

  heroWrapper: { height: height * 0.75, width: width },
  heroSlide: { width: width, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 40 },

  heroPosterContainer: {
    width: width * 0.75,
    height: width * 1.1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 15,
  },
  heroPoster: { width: '100%', height: '100%' },

  heroTop10Text: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: 20, marginBottom: 15 },

  heroButtonsContainer: { flexDirection: 'row', justifyContent: 'center', width: '80%' },
  playButton: {
    flex: 1, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', paddingVertical: 10, borderRadius: 5, marginRight: 8
  },
  playButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold', marginLeft: 5 },
  listButton: {
    flex: 1, backgroundColor: 'rgba(51, 51, 51, 0.8)', flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', paddingVertical: 10, borderRadius: 5
  },
  listButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 5 },

  content: { marginTop: -20, zIndex: 10 },
  rowTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10, paddingLeft: 15 },
  listPadding: { paddingLeft: 15, paddingRight: 20 },
  card: { marginRight: 10, width: 110 },
  poster: { width: 110, height: 160, borderRadius: 6, backgroundColor: '#1a1a1a' },
});