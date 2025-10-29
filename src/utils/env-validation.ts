/**
 * Environment Variable Validation
 *
 * Validates required environment variables at application startup
 * to catch configuration errors early.
 */

interface EnvVar {
  name: string
  required: boolean
  description: string
  validate?: (value: string) => boolean
  errorMessage?: string
}

const ENV_SCHEMA: EnvVar[] = [
  {
    name: 'VITE_FIREBASE_API_KEY',
    required: false, // Optional - app can work with localStorage
    description: 'Firebase API Key for authentication and database'
  },
  {
    name: 'VITE_FIREBASE_AUTH_DOMAIN',
    required: false,
    description: 'Firebase Auth Domain'
  },
  {
    name: 'VITE_FIREBASE_PROJECT_ID',
    required: false,
    description: 'Firebase Project ID'
  },
  {
    name: 'VITE_FIREBASE_STORAGE_BUCKET',
    required: false,
    description: 'Firebase Storage Bucket'
  },
  {
    name: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    required: false,
    description: 'Firebase Messaging Sender ID'
  },
  {
    name: 'VITE_FIREBASE_APP_ID',
    required: false,
    description: 'Firebase App ID'
  },
  {
    name: 'VITE_ENV',
    required: false,
    description: 'Environment (development, staging, production)',
    validate: (value: string) => ['development', 'staging', 'production'].includes(value),
    errorMessage: 'Must be one of: development, staging, production'
  },
  {
    name: 'VITE_USE_EMULATORS',
    required: false,
    description: 'Whether to use Firebase emulators',
    validate: (value: string) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'Must be "true" or "false"'
  }
]

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  missing: string[]
}

/**
 * Validate all environment variables according to schema
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const missing: string[] = []

  for (const envVar of ENV_SCHEMA) {
    const value = import.meta.env[envVar.name]

    // Check if required variable is missing
    if (envVar.required && !value) {
      errors.push(`Missing required environment variable: ${envVar.name}`)
      errors.push(`  Description: ${envVar.description}`)
      missing.push(envVar.name)
      continue
    }

    // Warn about optional missing variables
    if (!envVar.required && !value) {
      warnings.push(`Optional environment variable not set: ${envVar.name}`)
      warnings.push(`  Description: ${envVar.description}`)
      continue
    }

    // Validate value if validator function exists
    if (value && envVar.validate && !envVar.validate(value)) {
      errors.push(`Invalid value for ${envVar.name}: "${value}"`)
      if (envVar.errorMessage) {
        errors.push(`  ${envVar.errorMessage}`)
      }
    }
  }

  // Check for Firebase config completeness
  const firebaseVars = ENV_SCHEMA.filter(v => v.name.startsWith('VITE_FIREBASE'))
  const firebaseSet = firebaseVars.filter(v => import.meta.env[v.name])

  if (firebaseSet.length > 0 && firebaseSet.length < firebaseVars.length) {
    warnings.push('Incomplete Firebase configuration detected')
    warnings.push('Some Firebase variables are set but not all. This may cause issues.')
    warnings.push('Either set all Firebase variables or none (app will use localStorage)')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missing
  }
}

/**
 * Get a typed environment variable with fallback
 */
export function getEnv(key: string, fallback?: string): string {
  const value = import.meta.env[key]
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) {
      return fallback
    }
    throw new Error(`Environment variable ${key} is not set and no fallback provided`)
  }
  return value
}

/**
 * Get boolean environment variable
 */
export function getEnvBoolean(key: string, fallback: boolean = false): boolean {
  const value = import.meta.env[key]
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return value.toLowerCase() === 'true'
}

/**
 * Get number environment variable
 */
export function getEnvNumber(key: string, fallback?: number): number {
  const value = import.meta.env[key]
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) {
      return fallback
    }
    throw new Error(`Environment variable ${key} is not set and no fallback provided`)
  }
  const num = Number(value)
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} is not a valid number: ${value}`)
  }
  return num
}

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET &&
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID
  )
}

/**
 * Get current environment
 */
export function getCurrentEnv(): 'development' | 'staging' | 'production' {
  const env = import.meta.env.VITE_ENV || 'development'
  if (['development', 'staging', 'production'].includes(env)) {
    return env as 'development' | 'staging' | 'production'
  }
  return 'development'
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV || getCurrentEnv() === 'development'
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD || getCurrentEnv() === 'production'
}

/**
 * Print validation results to console (development only)
 */
export function printValidationResults(result: ValidationResult): void {
  if (!import.meta.env.DEV) return

  console.group('🔍 Environment Variable Validation')

  if (result.valid) {
    console.log('✅ All required environment variables are valid')
  } else {
    console.error('❌ Environment validation failed')
  }

  if (result.errors.length > 0) {
    console.group('❌ Errors:')
    result.errors.forEach(error => console.error(error))
    console.groupEnd()
  }

  if (result.warnings.length > 0) {
    console.group('⚠️  Warnings:')
    result.warnings.forEach(warning => console.warn(warning))
    console.groupEnd()
  }

  // Show configured features
  console.group('📋 Feature Configuration:')
  console.log('Firebase:', isFirebaseConfigured() ? '✅ Configured' : '❌ Not configured (using localStorage)')
  console.log('Environment:', getCurrentEnv())
  console.log('Development Mode:', isDevelopment())
  console.log('Emulators:', getEnvBoolean('VITE_USE_EMULATORS') ? '✅ Enabled' : '❌ Disabled')
  console.groupEnd()

  console.groupEnd()
}
