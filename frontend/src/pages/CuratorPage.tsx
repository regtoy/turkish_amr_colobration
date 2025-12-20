import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { queryKeys } from '@/api/queryKeys'
import { sentencesApi } from '@/api/sentences'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/ToastProvider'
import { AnnotationCard } from '@/components/workspace/AnnotationCard'
import { PenmanDiff } from '@/components/workspace/PenmanDiff'
import { PenmanEditor } from '@/components/workspace/PenmanEditor'
import { ValidationSummary } from '@/components/workspace/ValidationSummary'
import type { SentenceItem } from '@/types/sentence'
import type { ValidationReport } from '@/types/validation'

export const CuratorPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const [sentenceIdInput, setSentenceIdInput] = useState<string>('1')
  const [sentenceId, setSentenceId] = useState<number | null>(1)
  const [selectedSources, setSelectedSources] = useState<number[]>([])
  const [finalPenman, setFinalPenman] = useState<string>('')
  const [decisionNote, setDecisionNote] = useState<string>('')
  const [lastValidation, setLastValidation] = useState<ValidationReport | null>(null)

  const parseError = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const detail = (error.response?.data as { detail?: string })?.detail
      return detail || error.message
    }
    return 'Bilinmeyen hata'
  }

  const sentenceQuery = useQuery({
    queryKey: sentenceId ? queryKeys.sentence(sentenceId) : ['sentence', 'idle'],
    queryFn: () => sentencesApi.get(sentenceId!),
    enabled: !!sentenceId,
  })

  const annotationsQuery = useQuery({
    queryKey: sentenceId ? queryKeys.annotations(sentenceId) : ['sentence', 'annotations', 'idle'],
    queryFn: () => sentencesApi.annotations(sentenceId!),
    enabled: !!sentenceId,
  })

  const adjudicationQuery = useQuery({
    queryKey: sentenceId ? queryKeys.adjudication(sentenceId) : ['sentence', 'adjudication', 'idle'],
    queryFn: () => sentencesApi.adjudication(sentenceId!),
    enabled: !!sentenceId,
  })

  const penmanForActions = finalPenman || adjudicationQuery.data?.finalPenman || ''

  const validationMutation = useMutation({
    mutationFn: () => sentencesApi.validate(sentenceId!, penmanForActions),
    onSuccess: (report) => {
      setLastValidation(report)
      showToast(t('pages.curator.validationSuccess'), { variant: 'success' })
    },
    onError: (error) => {
      showToast(t('pages.curator.validationError', { error: parseError(error) }), { variant: 'error' })
    },
  })

  const adjudicateMutation = useMutation({
    mutationFn: () =>
      sentencesApi.adjudicate(sentenceId!, {
        finalPenman: penmanForActions,
        decisionNote,
        sourceAnnotationIds: selectedSources,
      }),
    onMutate: async () => {
      if (!sentenceId) return undefined
      await queryClient.cancelQueries({ queryKey: queryKeys.sentence(sentenceId) })
      const previous = queryClient.getQueryData<SentenceItem>(queryKeys.sentence(sentenceId))
      queryClient.setQueryData<SentenceItem | undefined>(queryKeys.sentence(sentenceId), (old) =>
        old ? { ...old, status: 'ADJUDICATED' } : old,
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (sentenceId && context?.previous) {
        queryClient.setQueryData(queryKeys.sentence(sentenceId), context.previous)
      }
      showToast(t('pages.curator.adjudicateError', { error: parseError(error) }), { variant: 'error' })
    },
    onSuccess: () => {
      if (sentenceId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.adjudication(sentenceId) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.sentence(sentenceId) })
      }
      showToast(t('pages.curator.adjudicateSuccess'), { variant: 'success' })
    },
  })

  const acceptMutation = useMutation({
    mutationFn: () => sentencesApi.accept(sentenceId!),
    onMutate: async () => {
      if (!sentenceId) return undefined
      await queryClient.cancelQueries({ queryKey: queryKeys.sentence(sentenceId) })
      const previous = queryClient.getQueryData<SentenceItem>(queryKeys.sentence(sentenceId))
      queryClient.setQueryData<SentenceItem | undefined>(queryKeys.sentence(sentenceId), (old) =>
        old ? { ...old, status: 'ACCEPTED' } : old,
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (sentenceId && context?.previous) {
        queryClient.setQueryData(queryKeys.sentence(sentenceId), context.previous)
      }
      showToast(t('pages.curator.acceptError', { error: parseError(error) }), { variant: 'error' })
    },
    onSuccess: () => {
      if (sentenceId) void queryClient.invalidateQueries({ queryKey: queryKeys.sentence(sentenceId) })
      showToast(t('pages.curator.acceptSuccess'), { variant: 'success' })
    },
  })

  const reopenMutation = useMutation({
    mutationFn: () => sentencesApi.reopen(sentenceId!, decisionNote),
    onMutate: async () => {
      if (!sentenceId) return undefined
      await queryClient.cancelQueries({ queryKey: queryKeys.sentence(sentenceId) })
      const previous = queryClient.getQueryData<SentenceItem>(queryKeys.sentence(sentenceId))
      queryClient.setQueryData<SentenceItem | undefined>(queryKeys.sentence(sentenceId), (old) =>
        old ? { ...old, status: 'IN_REVIEW' } : old,
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (sentenceId && context?.previous) {
        queryClient.setQueryData(queryKeys.sentence(sentenceId), context.previous)
      }
      showToast(t('pages.curator.reopenError', { error: parseError(error) }), { variant: 'error' })
    },
    onSuccess: () => {
      if (sentenceId) void queryClient.invalidateQueries({ queryKey: queryKeys.sentence(sentenceId) })
      showToast(t('pages.curator.reopenSuccess'), { variant: 'info' })
    },
  })

  const currentSentence = sentenceQuery.data

  const toggleSource = (annotationId: number) => {
    setSelectedSources((prev) =>
      prev.includes(annotationId) ? prev.filter((id) => id !== annotationId) : [...prev, annotationId],
    )
  }

  const loadSentence = () => {
    const numeric = Number(sentenceIdInput)
    if (Number.isNaN(numeric)) {
      showToast(t('pages.curator.invalidId'), { variant: 'warning' })
      return
    }
    setSelectedSources([])
    setFinalPenman('')
    setDecisionNote('')
    setLastValidation(null)
    setSentenceId(numeric)
  }

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }}>
            <TextField
              label={t('pages.curator.sentenceId')}
              value={sentenceIdInput}
              onChange={(event) => setSentenceIdInput(event.target.value)}
              size="small"
              sx={{ maxWidth: 240 }}
            />
            <Button variant="contained" onClick={loadSentence} disabled={sentenceQuery.isFetching}>
              {t('pages.curator.loadSentence')}
            </Button>
            {currentSentence && (
              <Chip
                label={`${t('pages.curator.currentStatus')}: ${t(`pages.dashboard.statusLabels.${currentSentence.status}`)}`}
                color="primary"
                variant="outlined"
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {sentenceQuery.isLoading && <Spinner label={t('status.loading')} />}
      {sentenceQuery.isError && (
        <Alert severity="error">{t('pages.curator.fetchError', { error: parseError(sentenceQuery.error) })}</Alert>
      )}

      {currentSentence && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="h6" fontWeight={700}>
                {t('pages.curator.sentenceText')}
              </Typography>
              <Typography color="text.secondary">{currentSentence.text}</Typography>
              <Stack direction="row" spacing={1}>
                {currentSentence.source && <Chip size="small" label={`${t('pages.dashboard.source')}: ${currentSentence.source}`} />}
                {currentSentence.difficultyTag && (
                  <Chip size="small" label={`${t('pages.dashboard.difficulty')}: ${currentSentence.difficultyTag}`} />
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {annotationsQuery.isLoading && <Spinner label={t('status.loading')} />}
      {annotationsQuery.isError && (
        <Alert severity="error">{t('pages.curator.fetchError', { error: parseError(annotationsQuery.error) })}</Alert>
      )}

      {annotationsQuery.data && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" fontWeight={700} flexGrow={1}>
                  {t('pages.curator.annotationSelection')}
                </Typography>
                <Chip label={t('pages.curator.selectedCount', { count: selectedSources.length })} variant="outlined" />
              </Stack>
              <Grid container spacing={2}>
                {annotationsQuery.data.map((annotation) => (
                  <Grid item xs={12} md={6} key={annotation.id}>
                    <AnnotationCard
                      annotation={annotation}
                      selected={selectedSources.includes(annotation.id)}
                      onSelect={() => toggleSource(annotation.id)}
                      actionLabel={selectedSources.includes(annotation.id) ? t('pages.curator.selected') : undefined}
                    />
                  </Grid>
                ))}
              </Grid>
              <Divider />
              <PenmanDiff
                left={annotationsQuery.data.find((a) => a.id === selectedSources[0])?.penmanText}
                right={annotationsQuery.data.find((a) => a.id === selectedSources[1])?.penmanText}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={700}>
              {t('pages.curator.finalEditor')}
            </Typography>
            <PenmanEditor
              label={t('pages.curator.finalPenman')}
              value={penmanForActions}
              onChange={setFinalPenman}
              placeholder="(a / agree-01 :ARG0 (p / person))"
            />
            <TextField
              label={t('pages.curator.decisionNote')}
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              multiline
              minRows={2}
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Button
                variant="outlined"
                onClick={() => validationMutation.mutate()}
                disabled={!penmanForActions || validationMutation.isPending || !sentenceId}
              >
                {t('pages.curator.validate')}
              </Button>
              <Button
                variant="contained"
                onClick={() => adjudicateMutation.mutate()}
                disabled={!penmanForActions || adjudicateMutation.isPending || !sentenceId}
              >
                {t('pages.curator.adjudicate')}
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending || !sentenceId}
              >
                {t('pages.curator.accept')}
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => reopenMutation.mutate()}
                disabled={reopenMutation.isPending || !sentenceId}
              >
                {t('pages.curator.reopen')}
              </Button>
            </Stack>
            <ValidationSummary
              report={lastValidation}
              isLoading={validationMutation.isPending}
              title={t('pages.curator.validationPanel')}
            />
            {adjudicationQuery.data && (
              <Alert severity="info">
                {t('pages.curator.lastAdjudication', {
                  id: adjudicationQuery.data.id,
                  curator: adjudicationQuery.data.curatorId,
                })}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
