import {
  Alert,
  Box,
  Chip,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'

import type { ExportHistoryEntry } from '@/types/export'

interface ExportHistoryTableProps {
  items: ExportHistoryEntry[]
  error?: string | null
}

const renderStatus = (status: ExportHistoryEntry['status']) => {
  const color = status === 'failed' ? 'error' : status === 'completed' ? 'success' : 'warning'
  return <Chip size="small" label={status} color={color} />
}

export const ExportHistoryTable: React.FC<ExportHistoryTableProps> = ({ items, error }) => {
  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (!items.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">Henüz indirilen bir export yok.</Typography>
      </Paper>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Tip</TableCell>
            <TableCell>Seviye</TableCell>
            <TableCell>PII</TableCell>
            <TableCell>Failed</TableCell>
            <TableCell>Rejected</TableCell>
            <TableCell>Başlangıç</TableCell>
            <TableCell>Tamamlandı</TableCell>
            <TableCell>Durum</TableCell>
            <TableCell>İndir</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell>{item.id}</TableCell>
              <TableCell>{item.type === 'job' ? 'Job' : 'İndirme'}</TableCell>
              <TableCell>{item.level}</TableCell>
              <TableCell>{item.piiStrategy}</TableCell>
              <TableCell>{item.includeFailed ? '✓' : '—'}</TableCell>
              <TableCell>{item.includeRejected ? '✓' : '—'}</TableCell>
              <TableCell>{new Date(item.startedAt).toLocaleString()}</TableCell>
              <TableCell>{item.completedAt ? new Date(item.completedAt).toLocaleString() : '—'}</TableCell>
              <TableCell>{renderStatus(item.status)}</TableCell>
              <TableCell>
                <Stack spacing={0.5}>
                  {item.localUrl && (
                    <Link href={item.localUrl} download underline="hover">
                      İndir
                    </Link>
                  )}
                  {item.resultPath && !item.localUrl && <Box color="text.secondary">{item.resultPath}</Box>}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
