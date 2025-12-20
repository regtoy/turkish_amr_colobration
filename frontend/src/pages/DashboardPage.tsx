import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

const metricItems = [
  { key: 'tasks', label: 'Aktif görevler', value: '24' },
  { key: 'quality', label: 'Ortalama kalite', value: '92%' },
  { key: 'velocity', label: 'Günlük hız', value: '180 cümle' },
]

export const DashboardPage = () => {
  const { t } = useTranslation()

  return (
    <Stack spacing={3}>
      <Box
        display="grid"
        gap={2}
        gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
      >
        {metricItems.map((metric) => (
          <Card key={metric.key}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {metric.label}
              </Typography>
              <Typography variant="h4" fontWeight={700} mt={1}>
                {metric.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {t('pages.dashboard.subtitle')}
          </Typography>
          <Typography color="text.secondary">
            Bu alan, kontrol paneli bileşenleri, grafikler ve veri tabloları için iskelet sağlar.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  )
}
