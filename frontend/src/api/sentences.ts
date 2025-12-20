import type { SentenceItem, SentenceStatus } from '@/types/sentence'
import { inferAssignmentRole } from '@/types/sentence'

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

export const sentencesApi = {
  async byProject(projectId: number): Promise<SentenceItem[]> {
    const { data } = await apiClient.get<RawSentence[]>(`/sentences/project/${projectId}`)

    return data.map((item) => {
      const status = item.status as SentenceStatus
      const assignmentRole = (item.assignment_role as SentenceItem['assignmentRole']) ?? null
      return {
        id: item.id,
        projectId: item.project_id,
        text: item.text,
        source: item.source,
        difficultyTag: item.difficulty_tag,
        status,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        assignmentRole: assignmentRole ?? inferAssignmentRole(status),
      }
    })
  },
}
