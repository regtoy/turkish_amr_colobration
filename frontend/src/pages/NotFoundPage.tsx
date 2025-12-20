import { Box, Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export const NotFoundPage = () => {
  const { t } = useTranslation()

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="70vh" px={2}>
      <Stack spacing={2} textAlign="center">
        <Typography variant="h3" fontWeight={800}>
          {t('pages.notFound.title')}
        </Typography>
        <Typography color="text.secondary">{t('pages.notFound.description')}</Typography>
        <Button component={Link} to="/" color="primary">
          {t('actions.returnHome')}
        </Button>
      </Stack>
    </Box>
  )
}
