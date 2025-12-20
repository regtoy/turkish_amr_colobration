export type ReviewDecision = 'approve' | 'needs_fix' | 'reject'

export interface ReviewItem {
  id: number
  annotationId: number
  reviewerId: number
  decision: ReviewDecision
  score?: number | null
  comment?: string | null
  createdAt?: string
}
