import { Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

const reviewQueue = [
  { id: 'R-02', title: 'Hafta 12 paket', progress: 72 },
  { id: 'R-03', title: 'Diyalog QA', progress: 35 },
]

export const ReviewerPage = () => {
  const { t } = useTranslation()

  return (
    <Stack spacing={2}>
      {reviewQueue.map((item) => (
        <Card key={item.id}>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" fontWeight={700}>
                {item.title}
              </Typography>
              <LinearProgress value={item.progress} variant="determinate" />
              <Typography variant="body2" color="text.secondary">
                %{item.progress} tamamlandı
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {t('pages.reviewer.subtitle')}
          </Typography>
          <Typography color="text.secondary">
            İnceleme denetimleri, kabul/red iş akışları ve kalite ölçümlerinin yer alacağı iskelet.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  )
}
