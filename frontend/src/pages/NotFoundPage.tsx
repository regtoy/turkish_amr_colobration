import { Box, Button, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export const NotFoundPage = () => (
  <Box display="flex" alignItems="center" justifyContent="center" minHeight="70vh" px={2}>
    <Stack spacing={2} textAlign="center">
      <Typography variant="h3" fontWeight={800}>
        404
      </Typography>
      <Typography color="text.secondary">Aradığınız sayfa bulunamadı.</Typography>
      <Button component={Link} to="/" color="primary">
        Ana sayfaya dön
      </Button>
    </Stack>
  </Box>
)
