// app/services/pluginManager.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Plugin } from "../types"; // <-- import del tipo compartido

const STORAGE_KEY = "installed_plugins";

export const PluginManager = {
  async getInstalled(): Promise<Plugin[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = data ? JSON.parse(data) : [];
      console.log("PluginManager.getInstalled ->", parsed.length, "plugins");
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("PluginManager.getInstalled error:", err);
      return [];
    }
  },

  async install(raw: any): Promise<Plugin | null> {
    try {
      const p = normalizePlugin(raw);
      if (!p.id) {
        console.warn("PluginManager.install: plugin sin id, se ignora", raw);
        return null;
      }

      const current = await this.getInstalled();
      const exists = current.find(x => x.id === p.id);
      let newList: Plugin[];

      if (exists) {
        newList = current.map(x => x.id === p.id ? { ...x, ...p } : x);
      } else {
        newList = [...current, p];
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
      console.log(`PluginManager.install -> instalado/actualizado: ${p.id}`);
      return p;
    } catch (err) {
      console.error("PluginManager.install error:", err);
      return null;
    }
  },

  async installMany(rawPlugins: any[] = []): Promise<Plugin[]> {
    try {
      if (!Array.isArray(rawPlugins) || rawPlugins.length === 0) return await this.getInstalled();
      for (const rp of rawPlugins) {
        await this.install(rp);
      }
      const final = await this.getInstalled();
      console.log(`PluginManager.installMany -> total instalados: ${final.length}`);
      return final;
    } catch (err) {
      console.error("PluginManager.installMany error:", err);
      return await this.getInstalled();
    }
  },

  async remove(id: string): Promise<boolean> {
    try {
      const current = await this.getInstalled();
      const filtered = current.filter(p => p.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log(`PluginManager.remove -> eliminado ${id}`);
      return true;
    } catch (err) {
      console.error("PluginManager.remove error:", err);
      return false;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log("PluginManager.clearAll -> todos los plugins eliminados");
    } catch (err) {
      console.error("PluginManager.clearAll error:", err);
    }
  },

  async getById(id: string) {
    const all = await this.getInstalled();
    return all.find(p => p.id === id);
  }
};

function normalizePlugin(raw: any): Plugin {
  if (!raw) return { id: "" } as Plugin;
  const id = String(raw.id || raw.name || raw.title || "").trim();
  const name = raw.name || raw.title || raw.id || id;
  const api = raw.api || raw.baseUrl || raw.base_url || raw.baseURL || raw.endpoint || raw.url;
  const routes = raw.routes || raw.route || raw.routesMap;
  return {
    id,
    name,
    type: raw.type || raw.kind || undefined,
    api,
    script: raw.script || raw.source || undefined,
    routes,
    version: raw.version,
    meta: raw.meta || {}
  };
}