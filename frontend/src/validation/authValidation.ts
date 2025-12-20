export const isRequired = (value: string) => value.trim().length > 0

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export const isValidPasswordLength = (value: string, min = 6) => value.length >= min
