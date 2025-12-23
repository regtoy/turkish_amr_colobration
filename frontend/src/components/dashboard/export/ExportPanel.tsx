import { Card, CardContent, Stack, Typography } from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import { saveAs } from 'file-saver'
import { useEffect, useMemo, useState } from 'react'

import { exportsApi, toHistoryEntry } from '@/api/exports'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/ToastProvider'
import type { ExportHistoryEntry } from '@/types/export'

import type { ExportFormValues } from './ExportForm'
import { ExportForm } from './ExportForm'
import { ExportHistoryTable } from './ExportHistoryTable'

interface ExportPanelProps {
  projectId: number | null
}

const loadHistory = (): ExportHistoryEntry[] => {
  const raw = localStorage.getItem('export-history')
  if (!raw) return []
  try {
    return JSON.parse(raw) as ExportHistoryEntry[]
  } catch (error) {
    console.error('History parse error', error)
    return []
  }
}

const persistHistory = (entries: ExportHistoryEntry[]) => {
  localStorage.setItem('export-history', JSON.stringify(entries))
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ projectId }) => {
  const { showToast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [history, setHistory] = useState<ExportHistoryEntry[]>(() => loadHistory())
  const [pollingJobs, setPollingJobs] = useState<number[]>([])

  const historyByProject = useMemo(() => history.filter((item) => (projectId ? item.projectId === projectId : true)), [history, projectId])

  useEffect(() => {
    persistHistory(history)
  }, [history])

  const addHistory = (entry: ExportHistoryEntry) => {
    setHistory((prev) => [entry, ...prev].slice(0, 50))
  }

  const handleDownload = async (values: ExportFormValues) => {
    if (!projectId) return
    setIsSubmitting(true)
    setError(null)
    try {
      const payload = await exportsApi.requestExport(projectId, {
        projectId,
        format: values.format,
        level: values.level,
        piiStrategy: values.piiStrategy,
        includeManifest: true,
        includeFailed: values.includeFailed,
        includeRejected: values.includeRejected,
      })
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const fileName = `project-${projectId}-${values.level}-export.json`
      saveAs(blob, fileName)
      addHistory({
        id: `p${projectId}-${Date.now()}`,
        type: 'download',
        projectId,
        status: 'completed',
        level: values.level,
        piiStrategy: values.piiStrategy,
        includeFailed: values.includeFailed,
        includeRejected: values.includeRejected,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        fileName,
        localUrl: URL.createObjectURL(blob),
      })
      showToast('Export indirildi', { variant: 'success' })
    } catch (err) {
      console.error(err)
      setError('Export alınamadı, lütfen tekrar deneyin')
      showToast('Export sırasında hata oluştu', { variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const pollJob = async (jobId: number) => {
    try {
      const job = await exportsApi.getJob(jobId)
      setHistory((prev) => {
        const next = prev.map((entry) => (entry.jobId === job.id ? { ...entry, ...toHistoryEntry(job) } : entry))
        return next
      })
      if (job.status === 'running' || job.status === 'queued') {
        setTimeout(() => void pollJob(jobId), 2000)
      } else {
        setPollingJobs((prev) => prev.filter((id) => id !== jobId))
      }
    } catch (err) {
      console.error(err)
      setError('Job durumu alınamadı')
    }
  }

  const handleCreateJob = async (values: ExportFormValues) => {
    if (!projectId) return
    setIsSubmitting(true)
    setError(null)
    try {
      const job = await exportsApi.createJob(projectId, {
        projectId,
        format: values.format,
        level: values.level,
        piiStrategy: values.piiStrategy,
        includeManifest: values.format === 'manifest+json',
        includeFailed: values.includeFailed,
        includeRejected: values.includeRejected,
      })
      const entry = toHistoryEntry(job)
      addHistory(entry)
      setPollingJobs((prev) => [...prev, job.id])
      void pollJob(job.id)
      showToast('Export job kuyruğa alındı', { variant: 'info' })
    } catch (err) {
      console.error(err)
      setError('Job oluşturulamadı')
      showToast('Job oluşturulamadı', { variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!projectId) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography color="text.secondary">Export için bir proje seçin.</Typography>
        </CardContent>
      </Card>
    )
  }

  const isPolling = pollingJobs.length > 0

  return (
    <Card variant="outlined">
      <CardContent>
        <Grid container spacing={2} alignItems="stretch">
          <Grid item xs={12} md={5}>
            <ExportForm onDownload={handleDownload} onCreateJob={handleCreateJob} isSubmitting={isSubmitting} error={error} />
            {isPolling && (
              <Stack direction="row" spacing={1} alignItems="center" mt={2}>
                <Spinner label="" />
                <Typography variant="body2" color="text.secondary">
                  Arka plan job çalışıyor...
                </Typography>
              </Stack>
            )}
          </Grid>
          <Grid item xs={12} md={7}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              İndirme geçmişi ve audit (isteğe bağlı)
            </Typography>
            <ExportHistoryTable items={historyByProject} error={error} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
