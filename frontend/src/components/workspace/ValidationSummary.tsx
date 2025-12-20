import { Alert, Chip, Divider, Stack, Typography } from '@mui/material'

import type { ValidationReport } from '@/types/validation'

interface ValidationSummaryProps {
  report?: ValidationReport | null
  isLoading?: boolean
  title: string
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({ report, isLoading = false, title }) => {
  if (isLoading) {
    return (
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        <Alert severity="info">Validasyon çalıştırılıyor…</Alert>
      </Stack>
    )
  }

  if (!report) {
    return (
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        <Alert severity="warning">Henüz sunucu validasyonu yok.</Alert>
      </Stack>
    )
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        <Chip
          size="small"
          label={report.isValid ? 'Geçerli' : 'Hatalı'}
          color={report.isValid ? 'success' : 'error'}
          variant="outlined"
        />
      </Stack>
      {report.canonicalPenman && (
        <Alert severity="info">Normalize: {report.canonicalPenman}</Alert>
      )}
      <Divider />
      {report.errors.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            Hatalar
          </Typography>
          {report.errors.map((issue) => (
            <Alert key={issue.code} severity="error">
              {issue.code}: {issue.message}
            </Alert>
          ))}
        </Stack>
      )}
      {report.warnings.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            Uyarılar
          </Typography>
          {report.warnings.map((issue) => (
            <Alert key={issue.code} severity="warning">
              {issue.code}: {issue.message}
            </Alert>
          ))}
        </Stack>
      )}
      {report.errors.length === 0 && report.warnings.length === 0 && (
        <Alert severity="success">Sorun bulunamadı.</Alert>
      )}
    </Stack>
  )
}
