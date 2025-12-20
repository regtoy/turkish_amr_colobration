import { Box, Chip, Stack, TextField, Typography } from '@mui/material'

import { analyzeParens, highlightPenman } from '@/utils/penman'

interface PenmanEditorProps {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

export const PenmanEditor: React.FC<PenmanEditorProps> = ({ label, value, onChange, placeholder }) => {
  const parenStatus = analyzeParens(value)

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>
          {label}
        </Typography>
        <Chip
          size="small"
          label={
            parenStatus.balanced
              ? `Paren match: ${parenStatus.openings}/${parenStatus.closings}`
              : `Parens off: ${parenStatus.openings}/${parenStatus.closings}`
          }
          color={parenStatus.balanced ? 'success' : 'warning'}
          variant="outlined"
        />
      </Stack>

      <TextField
        label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        multiline
        minRows={6}
        fullWidth
        InputProps={{
          sx: {
            fontFamily: 'monospace',
            backgroundColor: 'background.paper',
          },
        }}
      />

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
        }}
        dangerouslySetInnerHTML={{ __html: highlightPenman(value || ' ') }}
      />
    </Stack>
  )
}
