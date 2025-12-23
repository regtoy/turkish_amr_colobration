export type ExportLevel = 'gold' | 'silver' | 'all' | 'failed' | 'rejected'

export type ExportFormat = 'json' | 'manifest+json'

export type PiiStrategy = 'include' | 'anonymize' | 'strip'

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface ExportPayload {
  projectId: number
  exportedAt: string
  records: unknown[]
  failedSubmissions: unknown[]
  manifest?: Record<string, unknown> | null
}

export interface ExportJob {
  id: number
  projectId: number
  createdBy: number
  status: JobStatus
  format: ExportFormat
  level: ExportLevel
  piiStrategy: PiiStrategy
  includeManifest: boolean
  includeFailed: boolean
  includeRejected: boolean
  resultPath?: string | null
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}

export interface ExportJobRequest {
  projectId: number
  format: ExportFormat
  level: ExportLevel
  piiStrategy: PiiStrategy
  includeManifest?: boolean
  includeFailed?: boolean
  includeRejected?: boolean
}

export interface ExportRequestPayload extends ExportJobRequest {
  includeManifest?: boolean
  includeFailed?: boolean
  includeRejected?: boolean
}

export interface ExportHistoryEntry {
  id: string
  type: 'download' | 'job'
  projectId: number
  jobId?: number
  status: JobStatus | 'completed'
  level: ExportLevel
  piiStrategy: PiiStrategy
  includeFailed: boolean
  includeRejected: boolean
  startedAt: string
  completedAt?: string
  fileName?: string
  localUrl?: string
  resultPath?: string | null
  downloadUrl?: string
}
