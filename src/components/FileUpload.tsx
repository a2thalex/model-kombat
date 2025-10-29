import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileText, Image, Music, AlertCircle } from 'lucide-react'
import {
  validateFile,
  formatFileSize,
  getFileTypeCategory,
  type UploadedFile,
} from '../services/file-upload'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  uploadedFiles: UploadedFile[]
  onRemoveFile: (fileId: string) => void
  maxFiles?: number
  disabled?: boolean
}

export function FileUpload({
  onFilesSelected,
  uploadedFiles,
  onRemoveFile,
  maxFiles = 5,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const processFiles = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return

      const fileArray = Array.from(files)
      const errors: string[] = []
      const validFiles: File[] = []

      // Check max files limit
      if (uploadedFiles.length + fileArray.length > maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed. Currently have ${uploadedFiles.length}.`)
        setValidationErrors(errors)
        return
      }

      // Validate each file
      fileArray.forEach((file) => {
        const validation = validateFile(file)
        if (validation.valid) {
          validFiles.push(file)
        } else {
          errors.push(`${file.name}: ${validation.error}`)
        }
      })

      setValidationErrors(errors)

      if (validFiles.length > 0) {
        onFilesSelected(validFiles)
      }
    },
    [disabled, uploadedFiles.length, maxFiles, onFilesSelected]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      processFiles(e.dataTransfer.files)
    },
    [processFiles]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files)
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [processFiles]
  )

  const handleButtonClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  const getFileIcon = (type: string) => {
    const category = getFileTypeCategory(type)
    switch (category) {
      case 'image':
        return <Image className="h-5 w-5" />
      case 'audio':
        return <Music className="h-5 w-5" />
      case 'pdf':
        return <FileText className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-gray-500'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,audio/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragging ? 'text-purple-500' : 'text-gray-400'}`} />

        <p className="text-sm font-medium mb-2">
          {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>

        <p className="text-xs text-gray-400">
          Supports: Images (JPEG, PNG, GIF, WebP), PDFs, Audio (MP3, WAV, OGG, WebM)
        </p>

        <p className="text-xs text-gray-500 mt-2">
          Max {maxFiles} files • Max 10MB per image • Max 20MB per PDF • Max 25MB per audio
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-500 mb-2">File Upload Errors:</p>
              <ul className="text-xs text-red-400 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-300">
            Uploaded Files ({uploadedFiles.length}/{maxFiles})
          </p>

          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3 border border-gray-700"
              >
                {/* File Icon */}
                <div className="flex-shrink-0 text-gray-400">
                  {getFileIcon(file.type)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {getFileTypeCategory(file.type)}
                  </p>
                </div>

                {/* Preview for images */}
                {getFileTypeCategory(file.type) === 'image' && (
                  <div className="flex-shrink-0">
                    <img
                      src={file.url}
                      alt={file.name}
                      className="h-12 w-12 object-cover rounded border border-gray-600"
                    />
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={() => onRemoveFile(file.id)}
                  disabled={disabled}
                  className="flex-shrink-0 p-1.5 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      {uploadedFiles.length === 0 && (
        <p className="text-xs text-center text-gray-500">
          Upload images for vision models, PDFs for document analysis, or audio for transcription
        </p>
      )}
    </div>
  )
}
