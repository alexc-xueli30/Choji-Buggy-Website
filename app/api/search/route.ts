import { NextRequest, NextResponse } from 'next/server'

// Mock search data
const SEARCH_DATA = [
  { id: 'res_1', type: 'user', title: 'Alex Chen', description: 'admin@choji.io', score: 0.95, createdAt: 1702944000, url: '/team' },
  { id: 'res_2', type: 'user', title: 'Sam Taylor', description: 'member@choji.io', score: 0.90, createdAt: 1704067200, url: '/team' },
  { id: 'res_3', type: 'file', title: 'Q4 Report.pdf', description: 'Uploaded Jan 2024', score: 0.85, createdAt: 1704153600, url: '/upload' },
  { id: 'res_4', type: 'file', title: 'Product Roadmap.docx', description: 'Updated Feb 2024', score: 0.80, createdAt: 1706745600, url: '/upload' },
  { id: 'res_5', type: 'message', title: 'Budget discussion', description: 'Sarah: What about Q1 budget?', score: 0.75, createdAt: 1707350400, url: '/dashboard' },
  { id: 'res_6', type: 'task', title: 'Fix login bug', description: 'Priority: High', score: 0.70, createdAt: 1707436800, url: '/dashboard' },
  // BUG: type 'task' is not in SearchResult union type - will cause TS issues on frontend
  { id: 'res_7', type: 'comment', title: 'Re: roadmap', description: 'Agreed, let\'s move this to Q2', score: 0.65, createdAt: 1707523200, url: '/dashboard' },
  // BUG: type 'comment' also not in type definition
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const type = searchParams.get('type')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  if (!q) {
    return NextResponse.json({ results: [], total: 0 })
  }

  // Simple fuzzy match (very naive)
  let results = SEARCH_DATA.filter(item => {
    const queryLower = q.toLowerCase()
    return (
      item.title.toLowerCase().includes(queryLower) ||
      item.description.toLowerCase().includes(queryLower)
    )
  })

  if (type) {
    results = results.filter(r => r.type === type)
  }

  // BUG: createdAt returned as number (Unix timestamp) but SearchResult type expects string
  // Frontend formatDate with typeof check should handle this, but formatDateTime won't

  // BUG: sometimes returns different response shape (A/B test that was never cleaned up)
  if (Math.random() < 0.3) {
    // Old format - returns array directly
    return NextResponse.json(results.slice(0, pageSize))
  }

  // New format
  return NextResponse.json({
    results: results.slice((page - 1) * pageSize, page * pageSize),
    total: results.length,
    page,
    pageSize,
    // BUG: hasNextPage not returned, frontend can't implement pagination
  })
}
