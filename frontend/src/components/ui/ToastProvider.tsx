import { type OptionsObject, SnackbarProvider, useSnackbar } from 'notistack'
import { createContext, useContext, useMemo } from 'react'

interface ToastContextValue {
  showToast: (message: string, options?: OptionsObject) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const ToastBridge: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar()
  const value = useMemo(
    () => ({
      showToast: (message: string, options?: OptionsObject) => enqueueSnackbar(message, options),
    }),
    [enqueueSnackbar],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
  <SnackbarProvider
    maxSnack={3}
    autoHideDuration={3500}
    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
  >
    <ToastBridge>{children}</ToastBridge>
  </SnackbarProvider>
)

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
