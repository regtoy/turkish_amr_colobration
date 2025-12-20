import { Card, CardContent, Chip, Stack, Typography } from '@mui/material'

import type { AnnotationItem } from '@/types/annotation'
import { highlightPenman } from '@/utils/penman'

interface AnnotationCardProps {
  annotation: AnnotationItem
  selected?: boolean
  onSelect?: (annotation: AnnotationItem) => void
  actionLabel?: string
}

export const AnnotationCard: React.FC<AnnotationCardProps> = ({ annotation, selected = false, onSelect, actionLabel }) => {
  return (
    <Card
      variant={selected ? 'elevation' : 'outlined'}
      sx={{ borderColor: selected ? 'primary.main' : 'divider', cursor: onSelect ? 'pointer' : 'default' }}
      onClick={() => onSelect?.(annotation)}
    >
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" fontWeight={700}>
              #{annotation.id}
            </Typography>
            {actionLabel && <Chip size="small" label={actionLabel} color="primary" />}
            {annotation.validityReport && (
              <Chip
                size="small"
                label={annotation.validityReport.isValid ? 'Geçerli' : 'Hatalı'}
                color={annotation.validityReport.isValid ? 'success' : 'error'}
              />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Kullanıcı: {annotation.authorId} — Atama: {annotation.assignmentId ?? '-'}
          </Typography>
          <div
            style={{
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 14,
              border: '1px solid #e0e0e0',
            }}
            dangerouslySetInnerHTML={{ __html: highlightPenman(annotation.penmanText) }}
          />
        </Stack>
      </CardContent>
    </Card>
  )
}
