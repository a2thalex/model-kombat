import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'
import { logger } from '../utils/logger'

// File type configurations
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  pdfs: ['application/pdf'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
} as const

export const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  pdf: 20 * 1024 * 1024, // 20MB
  audio: 25 * 1024 * 1024, // 25MB
} as const

export interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  url: string
  storageRef: string
  base64?: string // For images that need to be sent directly to API
  uploadedAt: Date
}

export interface FileUploadOptions {
  userId: string
  convertToBase64?: boolean // For vision models that need base64
}

/**
 * Validates file type and size
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allAllowedTypes = [
    ...ALLOWED_FILE_TYPES.images,
    ...ALLOWED_FILE_TYPES.pdfs,
    ...ALLOWED_FILE_TYPES.audio,
  ] as readonly string[]

  if (!allAllowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not supported. Allowed types: images (JPEG, PNG, GIF, WebP), PDFs, and audio files.`,
    }
  }

  // Check file size
  let maxSize = MAX_FILE_SIZES.image
  if ((ALLOWED_FILE_TYPES.pdfs as readonly string[]).includes(file.type)) {
    maxSize = MAX_FILE_SIZES.pdf
  } else if ((ALLOWED_FILE_TYPES.audio as readonly string[]).includes(file.type)) {
    maxSize = MAX_FILE_SIZES.audio
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(0)}MB.`,
    }
  }

  return { valid: true }
}

/**
 * Converts a file to base64 string (for images to be sent to vision models)
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove data:image/xxx;base64, prefix
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    reader.onerror = (error) => reject(error)
  })
}

/**
 * Uploads a file to Firebase Storage
 */
export async function uploadFile(
  file: File,
  options: FileUploadOptions
): Promise<UploadedFile> {
  try {
    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Create unique file path
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `users/${options.userId}/uploads/${timestamp}_${sanitizedName}`

    logger.info('Uploading file to Firebase Storage', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath,
    })

    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)

    // Convert to base64 if requested (for images)
    let base64: string | undefined
    if (
      options.convertToBase64 &&
      (ALLOWED_FILE_TYPES.images as readonly string[]).includes(file.type)
    ) {
      base64 = await fileToBase64(file)
    }

    const uploadedFile: UploadedFile = {
      id: timestamp.toString(),
      name: file.name,
      type: file.type,
      size: file.size,
      url: downloadURL,
      storageRef: storagePath,
      base64,
      uploadedAt: new Date(),
    }

    logger.info('File uploaded successfully', { fileName: file.name, url: downloadURL })

    return uploadedFile
  } catch (error) {
    logger.error('File upload failed', error, { fileName: file.name })
    throw error
  }
}

/**
 * Uploads multiple files
 */
export async function uploadFiles(
  files: File[],
  options: FileUploadOptions
): Promise<UploadedFile[]> {
  logger.info('Uploading multiple files', { count: files.length })

  const uploadPromises = files.map((file) => uploadFile(file, options))
  const results = await Promise.allSettled(uploadPromises)

  const successful: UploadedFile[] = []
  const failed: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value)
    } else {
      failed.push(`${files[index].name}: ${result.reason.message}`)
    }
  })

  if (failed.length > 0) {
    logger.warn('Some files failed to upload', { failed })
  }

  return successful
}

/**
 * Deletes a file from Firebase Storage
 */
export async function deleteFile(storageRefPath: string): Promise<void> {
  try {
    const fileRef = ref(storage, storageRefPath)
    await deleteObject(fileRef)
    logger.info('File deleted successfully', { storageRefPath })
  } catch (error) {
    logger.error('File deletion failed', error, { storageRefPath })
    throw error
  }
}

/**
 * Gets the file type category
 */
export function getFileTypeCategory(
  mimeType: string
): 'image' | 'pdf' | 'audio' | 'unknown' {
  if ((ALLOWED_FILE_TYPES.images as readonly string[]).includes(mimeType)) return 'image'
  if ((ALLOWED_FILE_TYPES.pdfs as readonly string[]).includes(mimeType)) return 'pdf'
  if ((ALLOWED_FILE_TYPES.audio as readonly string[]).includes(mimeType)) return 'audio'
  return 'unknown'
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
