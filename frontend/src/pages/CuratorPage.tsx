import { Alert, Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { queryKeys } from '@/api/queryKeys'
import { sentencesApi } from '@/api/sentences'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/ToastProvider'
import { AdjudicationForm } from '@/components/workspace/AdjudicationForm'
import { AnnotationCard } from '@/components/workspace/AnnotationCard'
import { PenmanDiff } from '@/components/workspace/PenmanDiff'
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

  const reviewsQuery = useQuery({
    queryKey: sentenceId ? queryKeys.reviews(sentenceId) : ['sentence', 'reviews', 'idle'],
    queryFn: () => sentencesApi.reviews(sentenceId!),
    enabled: !!sentenceId,
  })

  const adjudicationSources = adjudicationQuery.data?.sourceAnnotationIds ?? []
  const adjudicationFinalPenman = adjudicationQuery.data?.finalPenman ?? ''
  const adjudicationDecisionNote = adjudicationQuery.data?.decisionNote ?? ''
  const effectiveSelectedSources = selectedSources.length ? selectedSources : adjudicationSources
  const primaryAnnotation =
    annotationsQuery.data?.find((annotation) => annotation.id === effectiveSelectedSources[0]) ??
    annotationsQuery.data?.[0]
  const secondaryAnnotation = annotationsQuery.data?.find((annotation) => annotation.id === effectiveSelectedSources[1])
  const effectiveFinalPenman = finalPenman || adjudicationFinalPenman || primaryAnnotation?.penmanText || ''
  const effectiveDecisionNote = decisionNote || adjudicationDecisionNote

  const penmanForActions = effectiveFinalPenman

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
        decisionNote: effectiveDecisionNote,
        sourceAnnotationIds: effectiveSelectedSources,
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
    mutationFn: () => sentencesApi.reopen(sentenceId!, effectiveDecisionNote),
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
    setSelectedSources((prev) => {
      const base = prev.length ? prev : adjudicationSources
      return base.includes(annotationId) ? base.filter((id) => id !== annotationId) : [...base, annotationId]
    })
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
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <Typography variant="h6" fontWeight={700} flexGrow={1}>
                    {t('pages.curator.annotationSelection')}
                  </Typography>
                  <Chip
                    label={t('pages.curator.selectedCount', { count: effectiveSelectedSources.length })}
                    variant="outlined"
                  />
                </Stack>
                <Grid container spacing={2}>
                  {annotationsQuery.data.map((annotation) => (
                    <Grid item xs={12} md={6} key={annotation.id}>
                      <AnnotationCard
                        annotation={annotation}
                        selected={effectiveSelectedSources.includes(annotation.id)}
                        onSelect={() => toggleSource(annotation.id)}
                        actionLabel={
                          effectiveSelectedSources.includes(annotation.id) ? t('pages.curator.selected') : undefined
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
                <Divider />
                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {t('pages.reviewer.previousReviews')}
                  </Typography>
                  {reviewsQuery.isLoading && <Spinner label={t('status.loading')} />}
                  {reviewsQuery.isError && (
                    <Alert severity="error">
                      {t('pages.curator.fetchError', { error: parseError(reviewsQuery.error) })}
                    </Alert>
                  )}
                  {!reviewsQuery.isLoading && !reviewsQuery.isError && !reviewsQuery.data?.length ? (
                    <Typography color="text.secondary">
                      {t('pages.reviewer.noReviews', { defaultValue: 'Bu cümle için inceleme bulunmuyor.' })}
                    </Typography>
                  ) : null}
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {reviewsQuery.data?.map((review) => (
                      <Chip
                        key={review.id}
                        label={`#${review.id} • ${review.decision} • ${review.score ?? '-'}`}
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>
                  {t('pages.curator.validationPanel')}
                </Typography>
                <ValidationSummary
                  title={t('pages.curator.validationPanel')}
                  report={primaryAnnotation?.validityReport}
                  emptyMessage={t('pages.curator.validationEmpty', { defaultValue: 'Seçilen anotasyon için validasyon yok.' })}
                />
                <PenmanDiff
                  left={primaryAnnotation?.penmanText}
                  right={secondaryAnnotation?.penmanText}
                  title={t('pages.curator.diffPanel', { defaultValue: 'Kaynak Diff' })}
                  leftLabel={primaryAnnotation ? `#${primaryAnnotation.id}` : undefined}
                  rightLabel={secondaryAnnotation ? `#${secondaryAnnotation.id}` : undefined}
                  emptyText={t('pages.curator.diffEmpty', { defaultValue: 'Karşılaştırmak için en az bir anotasyon seçin.' })}
                />
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <AdjudicationForm
                finalPenman={effectiveFinalPenman}
                decisionNote={effectiveDecisionNote}
                selectedSourceIds={effectiveSelectedSources}
                annotations={annotationsQuery.data}
                validationReport={lastValidation}
                isValidating={validationMutation.isPending}
                isSubmitting={adjudicateMutation.isPending}
                actionsDisabled={!sentenceId}
                onPenmanChange={setFinalPenman}
                onDecisionNoteChange={setDecisionNote}
                onToggleSource={toggleSource}
                onValidate={() => {
                  if (!sentenceId) return
                  validationMutation.mutate()
                }}
                onSubmit={() => {
                  if (!sentenceId) return
                  adjudicateMutation.mutate()
                }}
                extraActions={
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
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
                }
              />
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {t('pages.curator.lastAdjudication', {
                    defaultValue: 'Önceki adjudication',
                    id: adjudicationQuery.data?.id ?? '',
                    curator: adjudicationQuery.data?.curatorId ?? '',
                  })}
                </Typography>
                {adjudicationQuery.isLoading && <Spinner label={t('status.loading')} />}
                {adjudicationQuery.isError && (
                  <Alert severity="error">
                    {t('pages.curator.adjudicateError', { error: parseError(adjudicationQuery.error) })}
                  </Alert>
                )}
                {!adjudicationQuery.isLoading && !adjudicationQuery.isError && !adjudicationQuery.data && (
                  <Alert severity="info">
                    {t('pages.reviewer.noAdjudication', {
                      defaultValue: 'Bu cümle için adjudication kaydı bulunamadı.',
                    })}
                  </Alert>
                )}
                {adjudicationQuery.data && (
                  <Stack spacing={1}>
                    <Alert severity="info">
                      {t('pages.curator.lastAdjudication', {
                        id: adjudicationQuery.data.id,
                        curator: adjudicationQuery.data.curatorId,
                      })}
                    </Alert>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {adjudicationQuery.data.sourceAnnotationIds?.map((id) => (
                        <Chip key={id} size="small" label={`#${id}`} variant="outlined" />
                      ))}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {t('pages.reviewer.finalPenmanPreview', { defaultValue: 'Son PENMAN' })}
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        backgroundColor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        whiteSpace: 'pre-wrap',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {adjudicationQuery.data.finalPenman}
                    </Box>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Stack>
  )
}
