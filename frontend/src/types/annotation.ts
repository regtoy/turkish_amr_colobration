import type { ValidationReport } from './validation'

export interface AnnotationItem {
  id: number
  sentenceId: number
  assignmentId?: number | null
  authorId: number
  penmanText: string
  validityReport?: ValidationReport | null
  createdAt?: string
}
