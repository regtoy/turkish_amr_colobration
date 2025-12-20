import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
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
import { PenmanEditor } from '@/components/workspace/PenmanEditor'
import { ValidationSummary } from '@/components/workspace/ValidationSummary'
import type { SentenceItem } from '@/types/sentence'
import type { ValidationReport } from '@/types/validation'

export const AnnotatorPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const [sentenceIdInput, setSentenceIdInput] = useState<string>('1')
  const [sentenceId, setSentenceId] = useState<number | null>(1)
  const [penmanText, setPenmanText] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
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

  const validationMutation = useMutation({
    mutationFn: () => sentencesApi.validate(sentenceId!, penmanText),
    onSuccess: (report) => {
      setLastValidation(report)
      showToast(t('pages.annotator.validationSuccess'), { variant: 'success' })
    },
    onError: (error) => {
      showToast(t('pages.annotator.validationError', { error: parseError(error) }), { variant: 'error' })
    },
  })

  const submitMutation = useMutation({
    mutationFn: () => sentencesApi.submitAnnotation(sentenceId!, penmanText),
    onMutate: async () => {
      if (!sentenceId) return undefined
      await queryClient.cancelQueries({ queryKey: queryKeys.sentence(sentenceId) })
      const previous = queryClient.getQueryData<SentenceItem>(queryKeys.sentence(sentenceId))
      queryClient.setQueryData<SentenceItem | undefined>(queryKeys.sentence(sentenceId), (old) =>
        old ? { ...old, status: 'SUBMITTED' } : old,
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (sentenceId && context?.previous) {
        queryClient.setQueryData(queryKeys.sentence(sentenceId), context.previous)
      }
      showToast(t('pages.annotator.submitError', { error: parseError(error) }), { variant: 'error' })
    },
    onSuccess: (annotation) => {
      if (sentenceId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.annotations(sentenceId) })
      }
      setLastValidation(annotation.validityReport ?? null)
      showToast(t('pages.annotator.submitSuccess'), { variant: 'success' })
    },
  })

  const currentSentence = sentenceQuery.data
  const validationTitle = useMemo(() => t('pages.annotator.validationPanel'), [t])

  const loadSentence = () => {
    const numeric = Number(sentenceIdInput)
    if (Number.isNaN(numeric)) {
      showToast(t('pages.annotator.invalidId'), { variant: 'warning' })
      return
    }
    setPenmanText('')
    setNotes('')
    setLastValidation(null)
    setSentenceId(numeric)
  }

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }}>
            <TextField
              label={t('pages.annotator.sentenceId')}
              value={sentenceIdInput}
              onChange={(event) => setSentenceIdInput(event.target.value)}
              size="small"
              sx={{ maxWidth: 240 }}
            />
            <Button variant="contained" onClick={loadSentence} disabled={sentenceQuery.isFetching}>
              {t('pages.annotator.loadSentence')}
            </Button>
            {currentSentence && (
              <Chip
                label={`${t('pages.annotator.currentStatus')}: ${t(`pages.dashboard.statusLabels.${currentSentence.status}`)}`}
                color="primary"
                variant="outlined"
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {sentenceQuery.isLoading && <Spinner label={t('status.loading')} />}

      {sentenceQuery.isError && (
        <Alert severity="error">{t('pages.annotator.fetchError', { error: parseError(sentenceQuery.error) })}</Alert>
      )}

      {currentSentence && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="h6" fontWeight={700}>
                  {t('pages.annotator.sentenceText')}
                </Typography>
                <Typography color="text.secondary">{currentSentence.text}</Typography>
                <Stack direction="row" spacing={1}>
                  {currentSentence.source && <Chip size="small" label={`${t('pages.dashboard.source')}: ${currentSentence.source}`} />}
                  {currentSentence.difficultyTag && (
                    <Chip size="small" label={`${t('pages.dashboard.difficulty')}: ${currentSentence.difficultyTag}`} />
                  )}
                </Stack>
              </Stack>

              <Divider />

              <PenmanEditor
                label={t('pages.annotator.penmanEditor')}
                value={penmanText}
                onChange={setPenmanText}
                placeholder="(a / give-01 :ARG0 (p / person))"
              />

              <TextField
                label={t('pages.annotator.notes')}
                multiline
                minRows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t('pages.annotator.notesPlaceholder') ?? ''}
              />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Button
                  variant="outlined"
                  onClick={() => validationMutation.mutate()}
                  disabled={!penmanText || validationMutation.isPending || !sentenceId}
                >
                  {t('pages.annotator.validate')}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => submitMutation.mutate()}
                  disabled={!penmanText || submitMutation.isPending || !sentenceId}
                >
                  {t('pages.annotator.submit')}
                </Button>
              </Stack>

              <ValidationSummary
                report={lastValidation}
                isLoading={validationMutation.isPending}
                title={validationTitle}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      {!sentenceId && (
        <Box>
          <Alert severity="info">{t('pages.annotator.pickSentence')}</Alert>
        </Box>
      )}
    </Stack>
  )
}
