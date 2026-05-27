import { NextRequest, NextResponse } from 'next/server'

// File upload tracking
let uploads: any[] = []

export async function POST(req: NextRequest) {
  try {
    // BUG: no file size validation at API level
    // NEXT_PUBLIC_MAX_FILE_SIZE is env var but only checked client-side
    // Server accepts any size file

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // BUG: no file type validation - any file type accepted
    // TODO: CHOJI-189 - add mime type allowlist

    const buffer = await file.arrayBuffer()
    const bytes = Buffer.from(buffer)

    // Simulate S3 upload (actually just stores metadata, not real file)
    const fileRecord = {
      id: `file_${Date.now()}`,
      name: file.name,
      originalName: file.name,
      size: file.size,
      mime_type: file.type, // BUG: snake_case here but UploadedFile type uses mimeType
      url: `https://choji-uploads.s3.amazonaws.com/fake/${file.name}`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'usr_1', // BUG: hardcoded - no auth context
      status: 'complete',
    }

    uploads.push(fileRecord)

    // BUG: returns record without mimeType field (uses mime_type instead)
    // Frontend UploadedFile type has mimeType but not mime_type
    // So file.mimeType will be undefined in the UI
    return NextResponse.json({ file: fileRecord, success: true })
  } catch (err: any) {
    console.error('[upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ files: uploads })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fileId = searchParams.get('id')

  if (!fileId) {
    return NextResponse.json({ error: 'File ID required' }, { status: 400 })
  }

  const index = uploads.findIndex(f => f.id === fileId)
  if (index === -1) {
    // BUG: returns 200 for non-existent files (idempotent delete)
    // But some UI code checks for 404 to show error
    return NextResponse.json({ success: true, message: 'File not found' }, { status: 200 })
  }

  uploads.splice(index, 1)
  return NextResponse.json({ success: true })
}
