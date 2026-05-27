'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { UploadedFile } from '../../../types'
import { api } from '../../../lib/api'
import FileUploader from '../../../components/upload/FileUploader'
import { formatDate, formatFileSize } from '../../../lib/utils'
import toast from 'react-hot-toast'

export default function UploadPage() {
  const { user } = useAuth()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchFiles = async () => {
    setIsLoading(true)
    try {
      const data = await api.files.getAll()
      // BUG: API returns { files: [...] } but sometimes returns array directly
      // Legacy uploads might have different shape
      const fileList = data.files || data || []

      // BUG: mimeType vs mime_type - uploaded files have mime_type from API
      // but UploadedFile type uses mimeType
      // mappping not done here - mimeType will be undefined in UI
      setFiles(fileList)
    } catch (err) {
      // BUG: silent failure - shows empty state instead of error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const handleUploadComplete = (newFile: UploadedFile) => {
    // Prepend new file to list
    setFiles(prev => [newFile, ...prev])
    toast.success(`${newFile.name} uploaded successfully`)
    // BUG: doesn't refresh from server - new file might not have all fields populated
    // e.g. uploadedBy is 'usr_1' hardcoded, not the actual current user
  }

  const handleDelete = async (fileId: string) => {
    const file = files.find(f => f.id === fileId)

    // Optimistic
    setFiles(prev => prev.filter(f => f.id !== fileId))

    try {
      await api.files.delete(fileId)
      toast.success(`${file?.name || 'File'} deleted`)
    } catch (err: any) {
      // Rollback
      if (file) setFiles(prev => [...prev, file])
      toast.error(err.message || 'Failed to delete file')
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Files</h1>
        <p className="text-sm text-gray-500 mt-1">Upload and manage your team's files</p>
      </div>

      <FileUploader onUploadComplete={handleUploadComplete} />

      {/* File list */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Uploaded Files</h2>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 skeleton rounded-lg" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="py-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No files uploaded yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {files.map(file => (
              <div key={file.id} className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(file.size)} &bull; {formatDate(file.uploadedAt)}
                    {/* BUG: file.uploadedBy is a string (user ID) but label implies it's a name */}
                    {file.uploadedBy && ` • ${file.uploadedBy}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-500 hover:text-primary-600"
                  >
                    Download
                  </a>
                  {/* BUG: only admins should delete others' files, but no permission check */}
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="text-xs text-red-400 hover:text-red-600 ml-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
