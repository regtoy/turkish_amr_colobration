import type { Project, ProjectSummary } from '@/types/project'

import { apiClient } from './client'

export const projectsApi = {
  async list(): Promise<Project[]> {
    const { data } = await apiClient.get<Array<Record<string, unknown>>>('/projects')
    return data.map((item) => ({
      id: Number(item.id),
      name: String(item.name),
      description: (item.description as string | null | undefined) ?? null,
      language: String(item.language ?? ''),
      amrVersion: String(item.amr_version ?? item.amrVersion ?? ''),
      roleSetVersion: String(item.role_set_version ?? item.roleSetVersion ?? ''),
      validationRuleVersion: String(item.validation_rule_version ?? item.validationRuleVersion ?? ''),
      versionTag: String(item.version_tag ?? item.versionTag ?? ''),
    }))
  },

  async summary(projectId: number): Promise<ProjectSummary> {
    const { data } = await apiClient.get<Record<string, unknown>>(`/projects/${projectId}/summary`)
    const statuses = (data.statuses as Record<string, number>) ?? {}
    const assignmentsByRole = (data.assignments_by_role as Record<string, number>) ?? {}
    return {
      projectId: Number(data.project_id ?? projectId),
      totalSentences: Number(data.total_sentences ?? 0),
      statuses,
      assignmentsByRole,
      annotations: Number(data.annotations ?? 0),
      reviews: Number(data.reviews ?? 0),
      adjudications: Number(data.adjudications ?? 0),
    }
  },
}
