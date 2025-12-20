import { Box, Typography } from '@mui/material'

const App = () => (
  <Box p={4}>
    <Typography variant="h5" fontWeight={700}>
      Turkish AMR Collaboration UI
    </Typography>
    <Typography color="text.secondary" mt={1}>
      Bu bileşen yalnızca geliştirme için ayrılmıştır. Uygulama yönlendirmesi Router üzerinden
      yönetilir.
    </Typography>
  </Box>
)

export default App
