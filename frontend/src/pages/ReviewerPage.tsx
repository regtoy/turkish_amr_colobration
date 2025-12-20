import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { queryKeys } from '@/api/queryKeys'
import { sentencesApi } from '@/api/sentences'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/ToastProvider'
import { AnnotationCard } from '@/components/workspace/AnnotationCard'
import { PenmanDiff } from '@/components/workspace/PenmanDiff'
import { ValidationSummary } from '@/components/workspace/ValidationSummary'
import type { ReviewDecision } from '@/types/review'
import type { SentenceItem } from '@/types/sentence'

export const ReviewerPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const [sentenceIdInput, setSentenceIdInput] = useState<string>('1')
  const [sentenceId, setSentenceId] = useState<number | null>(1)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<number | null>(null)
  const [compareAnnotationId, setCompareAnnotationId] = useState<number | null>(null)
  const [decision, setDecision] = useState<ReviewDecision>('approve')
  const [score, setScore] = useState<string>('1.0')
  const [comment, setComment] = useState<string>('')
  const [isMultiAnnotator, setIsMultiAnnotator] = useState<boolean>(false)

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

  const reviewsQuery = useQuery({
    queryKey: sentenceId ? queryKeys.reviews(sentenceId) : ['sentence', 'reviews', 'idle'],
    queryFn: () => sentencesApi.reviews(sentenceId!),
    enabled: !!sentenceId,
  })

  const reviewMutation = useMutation({
    mutationFn: () =>
      sentencesApi.submitReview(sentenceId!, {
        annotationId: selectedAnnotationId!,
        decision,
        score: score ? Number(score) : null,
        comment,
        isMultiAnnotator,
      }),
    onMutate: async () => {
      if (!sentenceId) return undefined
      await queryClient.cancelQueries({ queryKey: queryKeys.sentence(sentenceId) })
      const previous = queryClient.getQueryData<SentenceItem>(queryKeys.sentence(sentenceId))
      queryClient.setQueryData<SentenceItem | undefined>(queryKeys.sentence(sentenceId), (old) =>
        old ? { ...old, status: decision === 'reject' ? 'IN_REVIEW' : 'ADJUDICATED' } : old,
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (sentenceId && context?.previous) {
        queryClient.setQueryData(queryKeys.sentence(sentenceId), context.previous)
      }
      showToast(t('pages.reviewer.reviewError', { error: parseError(error) }), { variant: 'error' })
    },
    onSuccess: () => {
      if (sentenceId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.sentence(sentenceId) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.reviews(sentenceId) })
      }
      showToast(t('pages.reviewer.reviewSuccess'), { variant: 'success' })
    },
  })

  const currentSentence = sentenceQuery.data

  const effectiveSelectedId = selectedAnnotationId ?? annotationsQuery.data?.[0]?.id ?? null
  const effectiveCompareId =
    compareAnnotationId ?? (annotationsQuery.data && annotationsQuery.data.length > 1 ? annotationsQuery.data[1]?.id ?? null : null)

  const selectedAnnotation = annotationsQuery.data?.find((item) => item.id === effectiveSelectedId)
  const compareAnnotation = annotationsQuery.data?.find((item) => item.id === effectiveCompareId)

  const loadSentence = () => {
    const numeric = Number(sentenceIdInput)
    if (Number.isNaN(numeric)) {
      showToast(t('pages.reviewer.invalidId'), { variant: 'warning' })
      return
    }
    setSelectedAnnotationId(null)
    setCompareAnnotationId(null)
    setSentenceId(numeric)
  }

  const renderReviewHistory = useMemo(() => {
    if (!reviewsQuery.data?.length) return null
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle2" fontWeight={700}>
          {t('pages.reviewer.previousReviews')}
        </Typography>
        {reviewsQuery.data.map((review) => (
          <Chip
            key={review.id}
            label={`#${review.id} • ${review.decision} • ${review.score ?? '-'}`}
            variant="outlined"
            color="primary"
          />
        ))}
      </Stack>
    )
  }, [reviewsQuery.data, t])

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }}>
            <TextField
              label={t('pages.reviewer.sentenceId')}
              value={sentenceIdInput}
              onChange={(event) => setSentenceIdInput(event.target.value)}
              size="small"
              sx={{ maxWidth: 240 }}
            />
            <Button variant="contained" onClick={loadSentence} disabled={sentenceQuery.isFetching}>
              {t('pages.reviewer.loadSentence')}
            </Button>
            {currentSentence && (
              <Chip
                label={`${t('pages.reviewer.currentStatus')}: ${t(`pages.dashboard.statusLabels.${currentSentence.status}`)}`}
                color="primary"
                variant="outlined"
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {sentenceQuery.isLoading && <Spinner label={t('status.loading')} />}

      {sentenceQuery.isError && (
        <Alert severity="error">{t('pages.reviewer.fetchError', { error: parseError(sentenceQuery.error) })}</Alert>
      )}

      {currentSentence && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>
                {t('pages.reviewer.sentenceText')}
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
        <Alert severity="error">{t('pages.reviewer.fetchError', { error: parseError(annotationsQuery.error) })}</Alert>
      )}

      {annotationsQuery.data && (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Typography variant="h6" fontWeight={700} flexGrow={1}>
              {t('pages.reviewer.annotationList')}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="selected-annotation">{t('pages.reviewer.pickAnnotation')}</InputLabel>
              <Select
                labelId="selected-annotation"
                value={selectedAnnotationId ?? effectiveSelectedId ?? ''}
                label={t('pages.reviewer.pickAnnotation')}
                onChange={(event) => setSelectedAnnotationId(Number(event.target.value))}
              >
                {annotationsQuery.data.map((annotation) => (
                  <MenuItem key={annotation.id} value={annotation.id}>
                    #{annotation.id} — {annotation.authorId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="compare-annotation">{t('pages.reviewer.compareWith')}</InputLabel>
              <Select
                labelId="compare-annotation"
                value={compareAnnotationId ?? effectiveCompareId ?? ''}
                label={t('pages.reviewer.compareWith')}
                onChange={(event) => setCompareAnnotationId(event.target.value ? Number(event.target.value) : null)}
              >
                <MenuItem value="">{t('pages.reviewer.noCompare')}</MenuItem>
                {annotationsQuery.data.map((annotation) => (
                  <MenuItem key={annotation.id} value={annotation.id}>
                    #{annotation.id} — {annotation.authorId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Box flex={1}>
              {selectedAnnotation ? (
                <AnnotationCard annotation={selectedAnnotation} />
              ) : (
                <Alert severity="info">{t('pages.reviewer.noSelection')}</Alert>
              )}
              {selectedAnnotation?.validityReport && (
                <Box mt={2}>
                  <ValidationSummary title={t('pages.reviewer.validationReport')} report={selectedAnnotation.validityReport} />
                </Box>
              )}
              {renderReviewHistory}
            </Box>

            <Box flex={1}>
              <PenmanDiff left={selectedAnnotation?.penmanText} right={compareAnnotation?.penmanText} />
            </Box>
          </Stack>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>
                  {t('pages.reviewer.decisionForm')}
                </Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="decision-label">{t('pages.reviewer.decision')}</InputLabel>
                    <Select
                      labelId="decision-label"
                      value={decision}
                      label={t('pages.reviewer.decision')}
                      onChange={(event) => setDecision(event.target.value as ReviewDecision)}
                    >
                      <MenuItem value="approve">{t('pages.reviewer.decisions.approve')}</MenuItem>
                      <MenuItem value="needs_fix">{t('pages.reviewer.decisions.needsFix')}</MenuItem>
                      <MenuItem value="reject">{t('pages.reviewer.decisions.reject')}</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label={t('pages.reviewer.score')}
                    value={score}
                    onChange={(event) => setScore(event.target.value)}
                    type="number"
                    size="small"
                    fullWidth
                  />
                  <FormControl fullWidth size="small">
                    <InputLabel id="multi-annotator">{t('pages.reviewer.multiAnnotator')}</InputLabel>
                    <Select
                      labelId="multi-annotator"
                      value={isMultiAnnotator ? 'true' : 'false'}
                      label={t('pages.reviewer.multiAnnotator')}
                      onChange={(event) => setIsMultiAnnotator(event.target.value === 'true')}
                    >
                      <MenuItem value="false">{t('pages.reviewer.multiAnnotatorFalse')}</MenuItem>
                      <MenuItem value="true">{t('pages.reviewer.multiAnnotatorTrue')}</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
                <TextField
                  label={t('pages.reviewer.comment')}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  multiline
                  minRows={2}
                  fullWidth
                />
                <Divider />
                <Button
                  variant="contained"
                  onClick={() => reviewMutation.mutate()}
                  disabled={!selectedAnnotationId || reviewMutation.isPending || !sentenceId}
                >
                  {t('pages.reviewer.submit')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Stack>
  )
}
