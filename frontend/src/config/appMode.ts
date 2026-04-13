const DEV_MODE_TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export const SHOW_DEV_MODE = DEV_MODE_TRUE_VALUES.has(
    (import.meta.env.VITE_SHOW_DEV_MODE ?? '').toLowerCase()
)
