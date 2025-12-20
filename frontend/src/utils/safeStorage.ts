const inMemoryStore = new Map<string, string>()

const getBrowserStorage = () => {
  if (typeof window === 'undefined') return null

  try {
    const testKey = '__storage_test__'
    window.localStorage.setItem(testKey, testKey)
    window.localStorage.removeItem(testKey)
    return window.localStorage
  } catch (error) {
    console.warn('Falling back to in-memory storage:', error)
    return null
  }
}

const storage = getBrowserStorage()

export const safeStorage = {
  getItem(key: string) {
    if (storage) return storage.getItem(key)
    return inMemoryStore.get(key) ?? null
  },
  setItem(key: string, value: string) {
    if (storage) {
      storage.setItem(key, value)
      return
    }

    inMemoryStore.set(key, value)
  },
  removeItem(key: string) {
    if (storage) {
      storage.removeItem(key)
      return
    }

    inMemoryStore.delete(key)
  },
}
