import { OCIEnvironment } from '@/types/multitenancy'

type QueryMode = 'single' | 'parallel' | 'sequential'

interface MultitenancyState {
  environments: OCIEnvironment[]
  queryMode: QueryMode
}

/**
 * Simple singleton service to manage multitenancy configuration
 * on the client. Data is persisted to localStorage when available.
 */
export class MultitenancyService {
  private static instance: MultitenancyService
  private environments: OCIEnvironment[] = []
  private queryMode: QueryMode = 'parallel'

  private constructor() {
    this.load()
  }

  static getInstance(): MultitenancyService {
    if (!this.instance) {
      this.instance = new MultitenancyService()
    }
    return this.instance
  }

  private load() {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('multitenancy-config')
      if (raw) {
        const data: MultitenancyState = JSON.parse(raw)
        if (Array.isArray(data.environments)) {
          this.environments = data.environments
        }
        if (data.queryMode) {
          this.queryMode = data.queryMode
        }
      }
    } catch (err) {
      console.warn('Failed to load multitenancy config', err)
    }
  }

  private save() {
    if (typeof window === 'undefined') return
    try {
      const data: MultitenancyState = {
        environments: this.environments,
        queryMode: this.queryMode,
      }
      window.localStorage.setItem('multitenancy-config', JSON.stringify(data))
    } catch (err) {
      console.warn('Failed to persist multitenancy config', err)
    }
  }

  getEnvironments(): OCIEnvironment[] {
    return [...this.environments]
  }

  getActiveEnvironments(): OCIEnvironment[] {
    return this.environments.filter((e) => e.isActive)
  }

  addEnvironment(env: OCIEnvironment) {
    this.environments.push(env)
    if (env.isDefault) {
      this.setDefaultEnvironment(env.id)
    }
    this.save()
  }

  updateEnvironment(id: string, updates: Partial<OCIEnvironment>) {
    const idx = this.environments.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Environment not found')
    const updated = { ...this.environments[idx], ...updates }
    this.environments[idx] = updated
    if (updates.isDefault) {
      this.setDefaultEnvironment(id)
    }
    this.save()
  }

  removeEnvironment(id: string) {
    this.environments = this.environments.filter((e) => e.id !== id)
    // ensure at least one environment is default
    if (!this.environments.some((e) => e.isDefault) && this.environments[0]) {
      this.environments[0].isDefault = true
    }
    this.save()
  }

  getDefaultEnvironment(): OCIEnvironment | null {
    return this.environments.find((e) => e.isDefault) || null
  }

  setDefaultEnvironment(id: string) {
    this.environments = this.environments.map((env) => ({
      ...env,
      isDefault: env.id === id,
    }))
    this.save()
  }

  getQueryMode(): QueryMode {
    return this.queryMode
  }

  setQueryMode(mode: QueryMode) {
    this.queryMode = mode
    this.save()
  }
}

export default MultitenancyService
