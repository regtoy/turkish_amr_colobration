import { Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

const sampleQueue = [
  { id: 'T-1201', title: 'Belge kümesi 12', statusKey: 'pages.annotator.queue.waiting' },
  { id: 'T-1202', title: 'Diyalog 45', statusKey: 'pages.annotator.queue.inProgress' },
]

export const AnnotatorPage = () => {
  const { t } = useTranslation()

  return (
    <Stack spacing={2}>
      {sampleQueue.map((task) => (
        <Card key={task.id}>
          <CardContent
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div>
              <Typography variant="subtitle1" fontWeight={700}>
                {task.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {task.id}
              </Typography>
            </div>
            <Chip label={t(task.statusKey)} color="primary" variant="outlined" />
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {t('pages.annotator.subtitle')}
          </Typography>
          <Typography color="text.secondary">{t('pages.annotator.description')}</Typography>
        </CardContent>
      </Card>
    </Stack>
  )
}
