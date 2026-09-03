import { useState } from 'react'

export function useLocalStorage(key: string, initial: string): [string, (value: string) => void] {
  const [value, setValue] = useState<string>(() => {
    try {
      return localStorage.getItem(key) ?? initial
    } catch {
      return initial
    }
  })

  const update = (next: string) => {
    setValue(next)
    try {
      if (next) localStorage.setItem(key, next)
      else localStorage.removeItem(key)
    } catch {
      // storage unavailable, ignore
    }
  }

  return [value, update]
}
