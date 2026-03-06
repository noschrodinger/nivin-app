// app/(tabs)/settings.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { PluginManager } from '../services/pluginManager';

type Repo = {
  name?: string;
  url: string;
};

const STORAGE_KEY = 'nivin_repos';

export default function SettingsScreen() {

  const router = useRouter();

  const [url, setUrl] = useState('');
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRepos();
  }, []);

  const loadRepos = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setRepos(JSON.parse(raw));
      } else {
        setRepos([]);
      }
    } catch (err) {
      console.error("Error cargando repos:", err);
    }
  };

  const saveRepos = async (newRepos: Repo[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRepos));
      setRepos(newRepos);
    } catch (err) {
      console.error("Error guardando repos:", err);
    }
  };

  const handleAddRepo = async () => {

    const trimmed = url.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Pegá la URL del repositorio.');
      return;
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      Alert.alert('URL inválida', 'La URL debe empezar con http:// o https://');
      return;
    }

    setLoading(true);

    try {
      // fetch y validar que retorne JSON
      let json: any = null;
      try {
        const res = await fetch(trimmed, { method: 'GET' });
        const text = await res.text();

        try {
          json = JSON.parse(text);
        } catch (parseErr) {
          console.warn('El recurso remoto no devolvió JSON válido (texto recibido):', text.slice(0, 200));
          Alert.alert('Error', 'La URL no devuelve JSON válido. Asegurate de usar el link "raw" si es GitHub.');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error fetchando repo:', err);
        Alert.alert('Error', 'No se pudo descargar el repositorio. Revisa la URL o tu conexión.');
        setLoading(false);
        return;
      }

      // estructura mínima
      const repoName = (json && typeof json === 'object' && json.name) ? String(json.name) : trimmed;
      const pluginsRaw = Array.isArray(json.plugins) ? json.plugins : [];

      // evitar duplicados por url
      const exists = repos.find(r => r.url === trimmed);
      if (exists) {
        Alert.alert('Duplicado', 'Ese repositorio ya está agregado.');
        setLoading(false);
        return;
      }

      const newRepo: Repo = { name: repoName, url: trimmed };
      const newRepos = [...repos, newRepo];
      await saveRepos(newRepos);

      // instalar plugins si vienen en el repo
      if (pluginsRaw.length > 0) {
        // Normalización sencilla: si plugin.baseUrl existe, mapear a api
        const normalized = pluginsRaw.map((p: any) => ({
          ...p,
          api: p.api || p.baseUrl || p.base_url || p.baseURL || p.endpoint || undefined
        }));

        await PluginManager.installMany(normalized);
        const installed = await PluginManager.getInstalled();
        const installedCount = installed.length;
        Alert.alert('Repositorio agregado', `Repo agregado y ${pluginsRaw.length} plugins procesados. Plugins instalados totales: ${installedCount}.`);
        console.log('Settings: plugins instalados tras agregar repo:', installed);
      } else {
        Alert.alert('Repositorio agregado', 'Se agregó el repo pero no contiene plugins fatales (campo plugins vacío).');
        console.warn('Repo agregado sin plugins:', trimmed);
      }

      setUrl('');
      Keyboard.dismiss();

    } catch (err) {
      console.error('Error agregando repo:', err);
      Alert.alert('Error', 'No se pudo agregar el repositorio.');
    } finally {
      setLoading(false);
    }

  };

  const handleRemoveRepo = (item: Repo) => {
    Alert.alert(
      'Eliminar repositorio',
      `¿Querés eliminar "${item.name ?? item.url}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const newRepos = repos.filter(r => r.url !== item.url);
            await saveRepos(newRepos);
          }
        }
      ]
    );
  };

  const renderRepo = ({ item }: { item: Repo }) => (
    <View style={styles.repoRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.repoName}>{item.name ?? item.url}</Text>
        <Text style={styles.repoUrl} numberOfLines={1}>
          {item.url}
        </Text>
      </View>

      <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveRepo(item)}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajustes</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Repositorios</Text>

        <Text style={styles.helperText}>
          Pegá la URL del repo (JSON). Ej: https://raw.githubusercontent.com/usuario/repo/main/repos.json
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="https://..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={url}
            onChangeText={setUrl}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="url"
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddRepo} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.addBtnText}>Agregar</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ height: 12 }} />

        <FlatList
          data={repos}
          keyExtractor={(item) => item.url}
          renderItem={renderRepo}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No hay repositorios agregados.</Text>
          )}
        />

      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Nivin — repositorios personales</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 16 },
  header: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  section: { marginTop: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  helperText: { color: 'rgba(255,255,255,0.6)', marginBottom: 10 },

  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    color: '#fff',
    marginRight: 8
  },
  addBtn: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: '#000', fontWeight: '700' },

  repoRow: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  repoName: { color: '#fff', fontWeight: '700', marginBottom: 2 },
  repoUrl: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  removeBtn: { marginLeft: 12, padding: 6, backgroundColor: 'rgba(255,0,0,0.12)', borderRadius: 6 },

  emptyText: { color: 'rgba(255,255,255,0.6)', marginTop: 12 },

  footer: { paddingVertical: 18, alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 }
});