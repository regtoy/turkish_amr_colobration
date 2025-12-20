import { Box, CircularProgress, Stack, Typography } from '@mui/material'

interface SpinnerProps {
  label?: string
  fullScreen?: boolean
}

export const Spinner: React.FC<SpinnerProps> = ({ label = 'Loading', fullScreen = false }) => {
  if (fullScreen) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="60vh"
        role="status"
        aria-label={label}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress color="primary" thickness={5} size={64} />
          <Typography variant="subtitle1" color="text.secondary">
            {label}
          </Typography>
        </Stack>
      </Box>
    )
  }

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <CircularProgress size={24} thickness={5} />
      {label && (
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      )}
    </Stack>
  )
}
