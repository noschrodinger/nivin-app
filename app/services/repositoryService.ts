export interface Plugin {
  id: string
  name: string
  type: "movie" | "tv"
  api: string
}

export interface Repository {
  name: string
  version: number
  plugins: Plugin[]
}

export const RepositoryService = {

  async loadRepository(url: string): Promise<Repository | null> {
    try {

      const response = await fetch(url)
      const data = await response.json()

      console.log("Repositorio cargado:", data)
      console.log("Plugins del repo:", data.plugins)

      return data

    } catch (error) {

      console.error("Error cargando repositorio:", error)
      return null

    }
  }

}