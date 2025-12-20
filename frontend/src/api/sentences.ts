import type { AdjudicationItem } from '@/types/adjudication'
import type { AnnotationItem } from '@/types/annotation'
import type { ReviewItem } from '@/types/review'
import type { SentenceItem, SentenceStatus } from '@/types/sentence'
import { inferAssignmentRole } from '@/types/sentence'
import type { ValidationReport } from '@/types/validation'

import { apiClient } from './client'

interface RawSentence {
  id: number
  project_id: number
  text: string
  source?: string | null
  difficulty_tag?: string | null
  status: SentenceStatus
  created_at?: string
  updated_at?: string
  assignment_role?: string | null
}

interface RawAnnotation {
  id: number
  sentence_id: number
  assignment_id?: number | null
  author_id: number
  penman_text: string
  validity_report?: string | null
  created_at?: string
}

interface RawReview {
  id: number
  annotation_id: number
  reviewer_id: number
  decision: ReviewItem['decision']
  score?: number | null
  comment?: string | null
  created_at?: string
}

interface RawAdjudication {
  id: number
  sentence_id: number
  curator_id: number
  final_penman: string
  decision_note?: string | null
  source_annotation_ids?: number[] | null
  created_at?: string
}

interface ValidationResponse {
  is_valid: boolean
  amr_version: string
  role_set_version: string
  rule_version: string
  canonical_penman?: string | null
  errors: Array<{ code: string; message: string; context?: Record<string, unknown> }>
  warnings: Array<{ code: string; message: string; context?: Record<string, unknown> }>
}

const mapSentence = (data: RawSentence): SentenceItem => {
  const status = data.status as SentenceStatus
  const assignmentRole = (data.assignment_role as SentenceItem['assignmentRole']) ?? null
  return {
    id: data.id,
    projectId: data.project_id,
    text: data.text,
    source: data.source,
    difficultyTag: data.difficulty_tag,
    status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    assignmentRole: assignmentRole ?? inferAssignmentRole(status),
  }
}

const mapValidationResponse = (payload: ValidationResponse): ValidationReport => ({
  isValid: payload.is_valid,
  amrVersion: payload.amr_version,
  roleSetVersion: payload.role_set_version,
  ruleVersion: payload.rule_version,
  canonicalPenman: payload.canonical_penman,
  errors: payload.errors.map((issue) => ({
    code: issue.code,
    message: issue.message,
    context: issue.context,
  })),
  warnings: payload.warnings.map((issue) => ({
    code: issue.code,
    message: issue.message,
    context: issue.context,
  })),
})

const parseValidationReport = (payload?: string | null): ValidationReport | null => {
  if (!payload) return null
  try {
    const data = JSON.parse(payload) as ValidationResponse
    return mapValidationResponse(data)
  } catch (error) {
    console.error('Failed to parse validation report', error)
    return null
  }
}

export const sentencesApi = {
  async byProject(projectId: number): Promise<SentenceItem[]> {
    const { data } = await apiClient.get<RawSentence[]>(`/sentences/project/${projectId}`)
    return data.map(mapSentence)
  },

  async get(sentenceId: number): Promise<SentenceItem> {
    const { data } = await apiClient.get<RawSentence>(`/sentences/${sentenceId}`)
    return mapSentence(data)
  },

  async annotations(sentenceId: number): Promise<AnnotationItem[]> {
    const { data } = await apiClient.get<RawAnnotation[]>(`/sentences/${sentenceId}/annotations`)
    return data.map((item) => ({
      id: item.id,
      sentenceId: item.sentence_id,
      assignmentId: item.assignment_id,
      authorId: item.author_id,
      penmanText: item.penman_text,
      validityReport: parseValidationReport(item.validity_report),
      createdAt: item.created_at,
    }))
  },

  async reviews(sentenceId: number): Promise<ReviewItem[]> {
    const { data } = await apiClient.get<RawReview[]>(`/sentences/${sentenceId}/reviews`)
    return data.map((item) => ({
      id: item.id,
      annotationId: item.annotation_id,
      reviewerId: item.reviewer_id,
      decision: item.decision,
      score: item.score,
      comment: item.comment,
      createdAt: item.created_at,
    }))
  },

  async adjudication(sentenceId: number): Promise<AdjudicationItem | null> {
    const { data } = await apiClient.get<RawAdjudication | null>(`/sentences/${sentenceId}/adjudication`)
    if (!data) return null
    return {
      id: data.id,
      sentenceId: data.sentence_id,
      curatorId: data.curator_id,
      finalPenman: data.final_penman,
      decisionNote: data.decision_note,
      sourceAnnotationIds: data.source_annotation_ids,
      createdAt: data.created_at,
    }
  },

  async validate(sentenceId: number, penmanText: string): Promise<ValidationReport> {
    const { data } = await apiClient.post<ValidationResponse>(`/sentences/${sentenceId}/validate`, {
      penman_text: penmanText,
    })
    return mapValidationResponse(data)
  },

  async submitAnnotation(sentenceId: number, penmanText: string): Promise<AnnotationItem> {
    const { data } = await apiClient.post<RawAnnotation>(`/sentences/${sentenceId}/submit`, {
      penman_text: penmanText,
    })
    return {
      id: data.id,
      sentenceId: data.sentence_id,
      assignmentId: data.assignment_id,
      authorId: data.author_id,
      penmanText: data.penman_text,
      validityReport: parseValidationReport(data.validity_report),
      createdAt: data.created_at,
    }
  },

  async submitReview(
    sentenceId: number,
    payload: { annotationId: number; decision: ReviewItem['decision']; score?: number | null; comment?: string | null; isMultiAnnotator?: boolean },
  ): Promise<SentenceItem> {
    const { data } = await apiClient.post<RawSentence>(`/sentences/${sentenceId}/review`, {
      annotation_id: payload.annotationId,
      decision: payload.decision,
      score: payload.score,
      comment: payload.comment,
      is_multi_annotator: payload.isMultiAnnotator ?? false,
    })
    return mapSentence(data)
  },

  async adjudicate(
    sentenceId: number,
    payload: { finalPenman: string; decisionNote?: string | null; sourceAnnotationIds?: number[] | null },
  ): Promise<AdjudicationItem> {
    const { data } = await apiClient.post<RawAdjudication>(`/sentences/${sentenceId}/adjudicate`, {
      final_penman: payload.finalPenman,
      decision_note: payload.decisionNote,
      source_annotation_ids: payload.sourceAnnotationIds,
    })
    return {
      id: data.id,
      sentenceId: data.sentence_id,
      curatorId: data.curator_id,
      finalPenman: data.final_penman,
      decisionNote: data.decision_note,
      sourceAnnotationIds: data.source_annotation_ids,
      createdAt: data.created_at,
    }
  },

  async accept(sentenceId: number): Promise<SentenceItem> {
    const { data } = await apiClient.post<RawSentence>(`/sentences/${sentenceId}/accept`)
    return mapSentence(data)
  },

  async reopen(sentenceId: number, reason?: string | null): Promise<SentenceItem> {
    const { data } = await apiClient.post<RawSentence>(`/sentences/${sentenceId}/reopen`, { reason })
    return mapSentence(data)
  },
}
