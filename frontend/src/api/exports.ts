import type {
  ExportHistoryEntry,
  ExportJob,
  ExportJobRequest,
  ExportPayload,
  ExportRequestPayload,
} from '@/types/export'

import { apiClient } from './client'

const mapJob = (payload: Record<string, unknown>): ExportJob => ({
  id: Number(payload.id),
  projectId: Number(payload.project_id ?? payload.projectId ?? 0),
  createdBy: Number(payload.created_by ?? payload.createdBy ?? 0),
  status: String(payload.status ?? 'queued') as ExportJob['status'],
  format: String(payload.format ?? 'json') as ExportJob['format'],
  level: String(payload.level ?? 'all') as ExportJob['level'],
  piiStrategy: String(payload.pii_strategy ?? payload.piiStrategy ?? 'anonymize') as ExportJob['piiStrategy'],
  resultPath: (payload.result_path as string | null | undefined) ?? null,
  errorMessage: (payload.error_message as string | null | undefined) ?? null,
  createdAt: String(payload.created_at ?? ''),
  updatedAt: String(payload.updated_at ?? ''),
})

export const exportsApi = {
  async requestExport(projectId: number, payload: ExportRequestPayload): Promise<ExportPayload> {
    const { data } = await apiClient.get<Record<string, unknown>>(`/exports/project/${projectId}`, {
      params: {
        format: payload.format,
        level: payload.level,
        pii_strategy: payload.piiStrategy,
        include_manifest: payload.includeManifest ?? true,
        include_failed: payload.includeFailed ?? false,
        include_rejected: payload.includeRejected ?? false,
      },
    })

    return {
      projectId: Number(data.project_id ?? projectId),
      exportedAt: String(data.exported_at ?? ''),
      records: (data.records as unknown[]) ?? [],
      failedSubmissions: (data.failed_submissions as unknown[]) ?? [],
      manifest: (data.manifest as Record<string, unknown> | null | undefined) ?? null,
    }
  },

  async createJob(projectId: number, payload: ExportJobRequest): Promise<ExportJob> {
    const { data } = await apiClient.post<Record<string, unknown>>(`/exports/project/${projectId}/jobs`, {
      project_id: payload.projectId,
      format: payload.format,
      level: payload.level,
      pii_strategy: payload.piiStrategy,
    })
    return mapJob(data)
  },

  async getJob(jobId: number): Promise<ExportJob> {
    const { data } = await apiClient.get<Record<string, unknown>>(`/exports/jobs/${jobId}`)
    return mapJob(data)
  },
}

export const toHistoryEntry = (job: ExportJob): ExportHistoryEntry => ({
  id: `job-${job.id}`,
  type: 'job',
  projectId: job.projectId,
  jobId: job.id,
  status: job.status,
  level: job.level,
  piiStrategy: job.piiStrategy,
  includeFailed: false,
  includeRejected: false,
  startedAt: job.createdAt,
  completedAt: ['completed', 'failed'].includes(job.status) ? job.updatedAt : undefined,
  fileName: job.resultPath ?? undefined,
  resultPath: job.resultPath,
})
