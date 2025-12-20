import { Box, Chip, Stack, Typography } from '@mui/material'
import { diffLines } from 'diff'

import { highlightPenman } from '@/utils/penman'

interface PenmanDiffProps {
  left?: string
  right?: string
}

export const PenmanDiff: React.FC<PenmanDiffProps> = ({ left, right }) => {
  const hasContent = (left && left.trim().length > 0) || (right && right.trim().length > 0)
  if (!hasContent) {
    return <Typography color="text.secondary">Karşılaştırma için anotasyon seçin.</Typography>
  }

  const diff = diffLines(left ?? '', right ?? '')

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>
          PENMAN Diff
        </Typography>
        <Chip size="small" label="Satır bazlı" variant="outlined" />
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
          maxHeight: 320,
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
