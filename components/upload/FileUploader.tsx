'use client'

// BUG: multiple issues in this component:
// 1. No AbortController - ongoing upload not cancelled on unmount (memory leak)
// 2. Multiple simultaneous uploads possible (no queue)
// 3. File size checked client-side only - server accepts any size

import { useState, useRef, useCallback } from 'react'
import { UploadedFile } from '../../types'
import { api } from '../../lib/api'
import { formatFileSize } from '../../lib/utils'

const MAX_FILE_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760')

interface Props {
  onUploadComplete: (file: UploadedFile) => void
}

export default function FileUploader({ onUploadComplete }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<{ name: string; progress: number; error?: string }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      // BUG: shows alert instead of inline error
      alert(`File "${file.name}" exceeds the ${formatFileSize(MAX_FILE_SIZE)} limit`)
      return
    }

    const uploadEntry = { name: file.name, progress: 0 }
    // BUG: appends to uploads array instead of replacing if same filename uploaded twice
    setUploads(prev => [...prev, uploadEntry])

    try {
      const result = await api.files.upload(file, (progress) => {
        setUploads(prev =>
          prev.map(u => u.name === file.name ? { ...u, progress } : u)
          // BUG: matches by name - if two files have same name, both progress bars update
        )
      })

      setUploads(prev => prev.filter(u => u.name !== file.name))
      // BUG: result.file has mime_type not mimeType (API schema mismatch)
      onUploadComplete(result.file || result)
    } catch (err: any) {
      setUploads(prev =>
        prev.map(u => u.name === file.name ? { ...u, error: err.message } : u)
      )
    }
    // BUG: no finally block - if component unmounts mid-upload, the axios request
    // continues and may call setUploads on an unmounted component
  }, [onUploadComplete])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    // BUG: no limit on concurrent uploads - all files start uploading simultaneously
    Array.from(files).forEach(uploadFile)
  }, [uploadFile])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <svg className="w-8 h-8 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm font-medium text-gray-600">Drop files here or click to upload</p>
        <p className="text-xs text-gray-400 mt-1">Max {formatFileSize(MAX_FILE_SIZE)} per file</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          // BUG: input value not reset after upload - can't re-upload same file
        />
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-700 truncate max-w-xs">{upload.name}</span>
                {upload.error ? (
                  <span className="text-xs text-red-500">{upload.error}</span>
                ) : (
                  <span className="text-xs text-gray-400">{upload.progress}%</span>
                )}
              </div>
              {!upload.error && (
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-200"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
