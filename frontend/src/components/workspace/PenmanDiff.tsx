import { Box, Chip, Stack, Typography } from '@mui/material'
import { diffLines } from 'diff'

import { highlightPenman } from '@/utils/penman'

interface PenmanDiffProps {
  left?: string
  right?: string
  title?: string
  leftLabel?: string
  rightLabel?: string
  maxHeight?: number
  emptyText?: string
}

export const PenmanDiff: React.FC<PenmanDiffProps> = ({
  left,
  right,
  title = 'PENMAN Diff',
  leftLabel,
  rightLabel,
  maxHeight = 320,
  emptyText = 'Karşılaştırma için anotasyon seçin.',
}) => {
  const hasContent = (left && left.trim().length > 0) || (right && right.trim().length > 0)
  if (!hasContent) {
    return <Typography color="text.secondary">{emptyText}</Typography>
  }

  const diff = diffLines(left ?? '', right ?? '')

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        <Chip size="small" label="Satır bazlı" variant="outlined" />
        {leftLabel && <Chip size="small" label={`Sol: ${leftLabel}`} color="primary" variant="outlined" />}
        {rightLabel && <Chip size="small" label={`Sağ: ${rightLabel}`} color="secondary" variant="outlined" />}
      </Stack>
      <Box
        component="pre"
        sx={{
          backgroundColor: 'grey.100',
          borderRadius: 1,
          p: 1.5,
          overflowX: 'auto',
          fontFamily: 'monospace',
          fontSize: 14,
          border: '1px solid',
          borderColor: 'divider',
          maxHeight,
        }}
      >
        {diff.map((part, index) => (
          <Box
            key={`${part.value}-${index}`}
            component="span"
            sx={{
              backgroundColor: part.added ? 'success.light' : part.removed ? 'error.light' : 'transparent',
              display: 'inline',
            }}
            dangerouslySetInnerHTML={{ __html: highlightPenman(part.value) }}
          />
        ))}
      </Box>
    </Stack>
  )
}
