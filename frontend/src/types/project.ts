import type { SentenceStatus } from './sentence'

export interface Project {
  id: number
  name: string
  description?: string | null
  language: string
  amrVersion: string
  roleSetVersion: string
  validationRuleVersion: string
  versionTag: string
}

export interface ProjectSummary {
  projectId: number
  totalSentences: number
  statuses: Record<SentenceStatus | string, number>
  assignmentsByRole: Record<string, number>
  annotations: number
  reviews: number
  adjudications: number
}
