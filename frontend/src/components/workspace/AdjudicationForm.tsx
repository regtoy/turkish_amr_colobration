import { Button, Chip, Divider, Stack, TextField, Typography } from '@mui/material'
import type { ReactNode } from 'react'

import type { AnnotationItem } from '@/types/annotation'
import type { ValidationReport } from '@/types/validation'

import { PenmanDiff } from './PenmanDiff'
import { PenmanEditor } from './PenmanEditor'
import { ValidationSummary } from './ValidationSummary'

interface AdjudicationFormProps {
  finalPenman: string
  decisionNote: string
  selectedSourceIds: number[]
  annotations: AnnotationItem[]
  validationReport?: ValidationReport | null
  isValidating?: boolean
  isSubmitting?: boolean
  actionsDisabled?: boolean
  onPenmanChange: (value: string) => void
  onDecisionNoteChange: (value: string) => void
  onToggleSource: (annotationId: number) => void
  onValidate: () => void
  onSubmit: () => void
  extraActions?: ReactNode
}

export const AdjudicationForm = ({
  finalPenman,
  decisionNote,
  selectedSourceIds,
  annotations,
  validationReport,
  isValidating = false,
  isSubmitting = false,
  actionsDisabled = false,
  onPenmanChange,
  onDecisionNoteChange,
  onToggleSource,
  onValidate,
  onSubmit,
  extraActions,
}: AdjudicationFormProps) => {
  const primarySource = annotations.find((annotation) => annotation.id === selectedSourceIds[0])
  const secondarySource = annotations.find((annotation) => annotation.id === selectedSourceIds[1])

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Typography variant="h6" fontWeight={700} flexGrow={1}>
          Adjudication Formu
        </Typography>
        <Chip label={`Kaynak: ${selectedSourceIds.length}`} variant="outlined" />
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap">
        {annotations.map((annotation) => {
          const selected = selectedSourceIds.includes(annotation.id)
          return (
            <Chip
              key={annotation.id}
              label={`#${annotation.id} • Kullanıcı ${annotation.authorId}`}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => onToggleSource(annotation.id)}
              sx={{ mr: 1, mb: 1 }}
            />
          )
        })}
      </Stack>

      <PenmanEditor
        label="Final PENMAN"
        value={finalPenman}
        onChange={onPenmanChange}
        placeholder="(a / agree-01 :ARG0 (p / person))"
      />

      <TextField
        label="Karar notu"
        value={decisionNote}
        onChange={(event) => onDecisionNoteChange(event.target.value)}
        multiline
        minRows={2}
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Button variant="outlined" onClick={onValidate} disabled={!finalPenman || isValidating || actionsDisabled}>
          Validasyonu çalıştır
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={!finalPenman || isSubmitting || actionsDisabled}>
          Adjudication kaydet
        </Button>
        {extraActions}
      </Stack>

      <ValidationSummary
        report={validationReport}
        isLoading={isValidating}
        title="Validasyon Özeti"
        emptyMessage="Henüz validasyon çalıştırılmadı."
      />

      <Divider />

      <PenmanDiff
        left={finalPenman}
        right={primarySource?.penmanText}
        title="Final vs. Seçili Anotasyon"
        leftLabel="Final"
        rightLabel={primarySource ? `#${primarySource.id}` : undefined}
        emptyText="Karşılaştırmak için en az bir kaynak anotasyon seçin."
        maxHeight={240}
      />

      {secondarySource && (
        <PenmanDiff
          left={primarySource?.penmanText}
          right={secondarySource.penmanText}
          title="Seçili kaynaklar arası diff"
          leftLabel={primarySource ? `#${primarySource.id}` : 'Kaynak 1'}
          rightLabel={`#${secondarySource.id}`}
          maxHeight={200}
        />
      )}
    </Stack>
  )
}
