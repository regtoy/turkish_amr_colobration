import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
} from '@mui/material'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  primaryAction?: {
    label: string
    onClick: () => void
    color?: 'primary' | 'secondary' | 'error'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  onClose: () => void
  children?: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  description,
  primaryAction,
  secondaryAction,
  onClose,
  children,
}) => {
  const theme = useTheme()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box borderBottom={`1px solid ${theme.palette.divider}`}>
        <DialogTitle>{title}</DialogTitle>
      </Box>
      <DialogContent sx={{ pt: 3 }}>
        {description && <DialogContentText mb={2}>{description}</DialogContentText>}
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick} variant="outlined">
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button onClick={primaryAction.onClick} color={primaryAction.color ?? 'primary'}>
            {primaryAction.label}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
