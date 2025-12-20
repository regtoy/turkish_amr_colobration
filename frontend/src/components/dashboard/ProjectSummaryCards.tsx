import { Card, CardContent, Chip, Divider, Grid2 as Grid, Skeleton, Stack, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { ProjectSummary } from '@/types/project'
import type { SentenceStatus } from '@/types/sentence'

interface ProjectSummaryCardsProps {
  summary: ProjectSummary | null
  isLoading?: boolean
  error?: string | null
}

const statusOrder: SentenceStatus[] = [
  'NEW',
  'ASSIGNED',
  'SUBMITTED',
  'IN_REVIEW',
  'ADJUDICATED',
  'ACCEPTED',
]

const assignmentOrder = ['annotator', 'reviewer', 'curator', 'admin', 'assignment_engine']

export const ProjectSummaryCards: React.FC<ProjectSummaryCardsProps> = ({ summary, isLoading, error }) => {
  const { t } = useTranslation()

  const assignments = useMemo(() => {
    if (!summary) return []
    const entries = Object.entries(summary.assignmentsByRole)
    return entries.sort((a, b) => {
      const aIndex = assignmentOrder.indexOf(a[0])
      const bIndex = assignmentOrder.indexOf(b[0])
      if (aIndex === -1 && bIndex === -1) return b[1] - a[1]
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [summary])

  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Grid key={idx} size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Skeleton width="60%" />
                <Skeleton height={32} />
                <Skeleton width="40%" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    )
  }

  if (!summary) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            {t('pages.dashboard.summaryUnavailable')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error || t('pages.dashboard.summaryHelper')}
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                {t('pages.dashboard.overview')}
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                {summary.totalSentences.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('pages.dashboard.totalSentences')}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip size="small" label={`${t('pages.dashboard.annotations')}: ${summary.annotations}`} />
                <Chip size="small" label={`${t('pages.dashboard.reviews')}: ${summary.reviews}`} />
                <Chip size="small" label={`${t('pages.dashboard.adjudications')}: ${summary.adjudications}`} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" color="text.secondary">
                {t('pages.dashboard.statusBreakdown')}
              </Typography>
              <Stack spacing={1}>
                {statusOrder.map((status) => (
                  <Stack
                    key={status}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" color="default" label={t(`pages.dashboard.statusLabels.${status}`)} />
                    </Stack>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {summary.statuses[status] ?? 0}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" color="text.secondary">
                {t('pages.dashboard.assignmentBreakdown')}
              </Typography>
              <Stack spacing={1}>
                {assignments.map(([role, count]) => (
                  <Stack
                    key={role}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="body2">{t(`pages.dashboard.assignmentLabels.${role}`)}</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {count}
                    </Typography>
                  </Stack>
                ))}
                {!assignments.length && (
                  <Typography variant="body2" color="text.secondary">
                    {t('pages.dashboard.noAssignments')}
                  </Typography>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
