import { Stack } from '@mui/material'
import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { projectsApi } from '@/api/projects'
import { type AssignmentPayload, sentencesApi } from '@/api/sentences'
import { useAuthContext } from '@/auth/AuthProvider'
import { AssignmentDialog } from '@/components/dashboard/AssignmentDialog'
import { ExportPanel } from '@/components/dashboard/export/ExportPanel'
import { ProjectGrid } from '@/components/dashboard/ProjectGrid'
import { ProjectSummaryCards } from '@/components/dashboard/ProjectSummaryCards'
import { type TaskAction, TaskList } from '@/components/dashboard/TaskList'
import { useToast } from '@/components/ui/ToastProvider'
import type { Project, ProjectSummary } from '@/types/project'
import type { SentenceItem } from '@/types/sentence'

export const DashboardPage = () => {
  const { t } = useTranslation()
  const { user } = useAuthContext()
  const { showToast } = useToast()

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [projectSummary, setProjectSummary] = useState<ProjectSummary | null>(null)
  const [sentences, setSentences] = useState<SentenceItem[]>([])
  const [isProjectsLoading, setIsProjectsLoading] = useState<boolean>(false)
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false)
  const [isSentencesLoading, setIsSentencesLoading] = useState<boolean>(false)
  const [isAssigning, setIsAssigning] = useState<boolean>(false)
  const [selectedTask, setSelectedTask] = useState<SentenceItem | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const parseErrorMessage = useCallback(
    (error: unknown): string => {
      if (axios.isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string })?.detail
        return detail || error.message
      }
      return t('pages.dashboard.genericError')
    },
    [t],
  )

  const fetchProjects = useCallback(async () => {
    setIsProjectsLoading(true)
    try {
      const data = await projectsApi.list()
      setProjects(data)
      if (!selectedProjectId && data.length) {
        setSelectedProjectId(data[0].id)
      }
    } catch (error) {
      showToast(t('pages.dashboard.fetchProjectsError', { error: parseErrorMessage(error) }), {
        variant: 'error',
      })
    } finally {
      setIsProjectsLoading(false)
    }
  }, [parseErrorMessage, selectedProjectId, showToast, t])

  const fetchSummary = useCallback(
    async (projectId: number) => {
      setIsSummaryLoading(true)
      setSummaryError(null)
      try {
        const data = await projectsApi.summary(projectId)
        setProjectSummary(data)
      } catch (error) {
        const message = parseErrorMessage(error)
        setProjectSummary(null)
        setSummaryError(message)
        const variant = axios.isAxiosError(error) && error.response?.status === 403 ? 'warning' : 'error'
        showToast(t('pages.dashboard.fetchSummaryError', { error: message }), { variant })
      } finally {
        setIsSummaryLoading(false)
      }
    },
    [parseErrorMessage, showToast, t],
  )

  const fetchSentences = useCallback(
    async (projectId: number) => {
      setIsSentencesLoading(true)
      try {
        const data = await sentencesApi.byProject(projectId)
        setSentences(data)
      } catch (error) {
        setSentences([])
        showToast(t('pages.dashboard.fetchSentencesError', { error: parseErrorMessage(error) }), {
          variant: 'error',
        })
      } finally {
        setIsSentencesLoading(false)
      }
    },
    [parseErrorMessage, showToast, t],
  )

  useEffect(() => {
    void fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectSummary(null)
      setSentences([])
      return
    }
    void fetchSummary(selectedProjectId)
    void fetchSentences(selectedProjectId)
  }, [fetchSentences, fetchSummary, selectedProjectId])

  const handleTaskAction = (action: TaskAction, task: SentenceItem) => {
    if (action === 'assign') {
      setSelectedTask(task)
      return
    }
    showToast(
      t('pages.dashboard.actionPlaceholder', {
        action: t(`pages.dashboard.actions.${action}`),
        sentenceId: task.id,
      }),
      { variant: 'info' },
    )
  }

  const handleAssign = async (payload: AssignmentPayload) => {
    if (!selectedTask) return
    setIsAssigning(true)
    try {
      await sentencesApi.assign(selectedTask.id, payload)
      showToast(t('pages.dashboard.assignSuccess', { sentenceId: selectedTask.id }), {
        variant: 'success',
      })
      const projectId = selectedTask.projectId ?? selectedProjectId
      if (projectId) {
        await fetchSentences(projectId)
      }
    } catch (error) {
      showToast(t('pages.dashboard.assignError', { error: parseErrorMessage(error) }), {
        variant: 'error',
      })
    } finally {
      setIsAssigning(false)
      setSelectedTask(null)
    }
  }

  return (
    <Stack spacing={3}>
      <ProjectGrid
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelect={(projectId) => setSelectedProjectId(projectId)}
        isLoading={isProjectsLoading}
      />

      <ProjectSummaryCards summary={projectSummary} isLoading={isSummaryLoading} error={summaryError} />

      <ExportPanel projectId={selectedProjectId} />

      <TaskList
        tasks={sentences}
        isLoading={isSentencesLoading}
        userRole={user?.role}
        onAction={handleTaskAction}
      />

      {selectedTask && (
        <AssignmentDialog
          key={selectedTask.id}
          open
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSubmit={handleAssign}
          isSubmitting={isAssigning}
        />
      )}
    </Stack>
  )
}
