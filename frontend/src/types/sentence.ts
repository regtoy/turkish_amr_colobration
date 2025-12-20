import type { Role } from './auth'

export type SentenceStatus = 'NEW' | 'ASSIGNED' | 'SUBMITTED' | 'IN_REVIEW' | 'ADJUDICATED' | 'ACCEPTED'

export interface SentenceItem {
  id: number
  projectId: number
  text: string
  status: SentenceStatus
  source?: string | null
  difficultyTag?: string | null
  createdAt?: string
  updatedAt?: string
  assignmentRole?: Role | null
}

export const inferAssignmentRole = (status: SentenceStatus): Role => {
  switch (status) {
    case 'NEW':
    case 'ASSIGNED':
    case 'SUBMITTED':
      return 'annotator'
    case 'IN_REVIEW':
      return 'reviewer'
    case 'ADJUDICATED':
    case 'ACCEPTED':
      return 'curator'
    default:
      return 'guest'
  }
}
