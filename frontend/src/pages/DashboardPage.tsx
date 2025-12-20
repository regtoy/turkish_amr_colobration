import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

const metricItems = [
  { key: 'tasks', labelKey: 'pages.dashboard.metrics.tasks', value: '24' },
  { key: 'quality', labelKey: 'pages.dashboard.metrics.quality', value: '92%' },
  { key: 'velocity', labelKey: 'pages.dashboard.metrics.velocity', value: '180' },
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
                {t(metric.labelKey)}
              </Typography>
              <Typography variant="h4" fontWeight={700} mt={1}>
                {metric.value}
                {metric.key === 'velocity' ? ` ${t('pages.dashboard.metrics.unit')}` : null}
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
          <Typography color="text.secondary">{t('pages.dashboard.description')}</Typography>
        </CardContent>
      </Card>
    </Stack>
  )
}
