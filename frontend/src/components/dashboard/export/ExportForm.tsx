import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import type { ExportLevel, PiiStrategy } from '@/types/export'
import type { ExportFormat } from '@/types/export'

export interface ExportFormValues {
  level: ExportLevel
  includeFailed: boolean
  includeRejected: boolean
  piiStrategy: PiiStrategy
  format: ExportFormat
}

interface ExportFormProps {
  onDownload: (values: ExportFormValues) => Promise<void> | void
  onCreateJob: (values: ExportFormValues) => Promise<void> | void
  isSubmitting?: boolean
  error?: string | null
}

const exportLevels: { value: ExportLevel; label: string }[] = [
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'all', label: 'Gold + Silver + Taslak' },
  { value: 'failed', label: 'Failed (validasyon)' },
  { value: 'rejected', label: 'Rejected (review/curation)' },
]

export const ExportForm: React.FC<ExportFormProps> = ({ onDownload, onCreateJob, isSubmitting, error }) => {
  const [values, setValues] = useState<ExportFormValues>({
    level: 'gold',
    includeFailed: false,
    includeRejected: false,
    piiStrategy: 'anonymize',
    format: 'json',
  })

  const handleChange = (field: keyof ExportFormValues, value: ExportFormValues[keyof ExportFormValues]) => {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Export al
            </Typography>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Proje verisi dışa aktarımı
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gold/Silver seviyelerini ve PII maskeleme ayarını seçin. Hatalı veya reddedilmiş gönderimleri dahil
              edebilirsiniz.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              select
              label="Seviye"
              value={values.level}
              onChange={(event) => handleChange('level', event.target.value as ExportLevel)}
              fullWidth
              size="small"
            >
              {exportLevels.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Format"
              value={values.format}
              onChange={(event) => handleChange('format', event.target.value as ExportFormat)}
              fullWidth
              size="small"
            >
              <MenuItem value="json">Tek JSON</MenuItem>
              <MenuItem value="manifest+json">Manifest + JSON (zip)</MenuItem>
            </TextField>

            <TextField
              select
              label="PII stratejisi"
              value={values.piiStrategy}
              onChange={(event) => handleChange('piiStrategy', event.target.value as PiiStrategy)}
              fullWidth
              size="small"
            >
              <MenuItem value="include">İsim/PII dahil</MenuItem>
              <MenuItem value="anonymize">Anonimleştir</MenuItem>
              <MenuItem value="strip">PII kaldır</MenuItem>
            </TextField>
          </Stack>

          <FormControl component="fieldset" variant="standard">
            <FormLabel component="legend" sx={{ fontWeight: 700 }}>
              Hata/Red dahil et
            </FormLabel>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.includeFailed}
                    onChange={(event) => handleChange('includeFailed', event.target.checked)}
                  />
                }
                label="Failed submission"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.includeRejected}
                    onChange={(event) => handleChange('includeRejected', event.target.checked)}
                  />
                }
                label="Rejected"
              />
            </FormGroup>
          </FormControl>

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <Button variant="contained" onClick={() => onDownload(values)} disabled={isSubmitting}>
              Direkt indir (senkron)
            </Button>
            <Button variant="outlined" onClick={() => onCreateJob(values)} disabled={isSubmitting}>
              Arka plan job oluştur
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
