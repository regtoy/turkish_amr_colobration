export interface AdjudicationItem {
  id: number
  sentenceId: number
  curatorId: number
  finalPenman: string
  decisionNote?: string | null
  sourceAnnotationIds?: number[] | null
  createdAt?: string
}
