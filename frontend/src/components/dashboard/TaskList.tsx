import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TablePagination,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/Spinner'
import type { Role } from '@/types/auth'
import type { SentenceItem, SentenceStatus } from '@/types/sentence'
import { inferAssignmentRole } from '@/types/sentence'

export type TaskAction = 'assign' | 'submit' | 'review' | 'curate'

interface TaskListProps {
  tasks: SentenceItem[]
  isLoading?: boolean
  userRole?: Role | null
  onAction: (action: TaskAction, task: SentenceItem) => void
}

const statusOptions: Array<{ value: SentenceStatus | 'all'; labelKey: string }> = [
  { value: 'all', labelKey: 'pages.dashboard.filters.allStatuses' },
  { value: 'NEW', labelKey: 'pages.dashboard.statusLabels.NEW' },
  { value: 'ASSIGNED', labelKey: 'pages.dashboard.statusLabels.ASSIGNED' },
  { value: 'SUBMITTED', labelKey: 'pages.dashboard.statusLabels.SUBMITTED' },
  { value: 'IN_REVIEW', labelKey: 'pages.dashboard.statusLabels.IN_REVIEW' },
  { value: 'ADJUDICATED', labelKey: 'pages.dashboard.statusLabels.ADJUDICATED' },
  { value: 'ACCEPTED', labelKey: 'pages.dashboard.statusLabels.ACCEPTED' },
]

const assignmentOptions = [
  { value: 'all', labelKey: 'pages.dashboard.filters.allAssignments' },
  { value: 'annotator', labelKey: 'pages.dashboard.assignmentLabels.annotator' },
  { value: 'reviewer', labelKey: 'pages.dashboard.assignmentLabels.reviewer' },
  { value: 'curator', labelKey: 'pages.dashboard.assignmentLabels.curator' },
  { value: 'admin', labelKey: 'pages.dashboard.assignmentLabels.admin' },
]

const actionPermissions: Record<TaskAction, Role[]> = {
  assign: ['admin', 'curator'],
  submit: ['annotator'],
  review: ['reviewer', 'admin'],
  curate: ['curator', 'admin'],
}

const statusGuards: Partial<Record<TaskAction, SentenceStatus[]>> = {
  assign: ['NEW', 'ASSIGNED'],
  submit: ['ASSIGNED'],
  review: ['SUBMITTED', 'IN_REVIEW'],
  curate: ['IN_REVIEW', 'ADJUDICATED'],
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, isLoading = false, userRole, onAction }) => {
  const { t } = useTranslation()
  const [statusFilter, setStatusFilter] = useState<SentenceStatus | 'all'>('all')
  const [assignmentFilter, setAssignmentFilter] = useState<Role | 'all'>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const statusMatches = statusFilter === 'all' || task.status === statusFilter
      const role = task.assignmentRole ?? inferAssignmentRole(task.status)
      const assignmentMatches = assignmentFilter === 'all' || role === assignmentFilter
      return statusMatches && assignmentMatches
    })
  }, [assignmentFilter, statusFilter, tasks])

  const maxPageIndex = Math.max(0, Math.ceil(filteredTasks.length / rowsPerPage) - 1)
  const safePage = Math.min(page, maxPageIndex)
  const pagedTasks = filteredTasks.slice(
    safePage * rowsPerPage,
    safePage * rowsPerPage + rowsPerPage,
  )

  const canRunAction = (action: TaskAction, task: SentenceItem) => {
    if (!userRole) return false
    const allowedRoles = actionPermissions[action]
    const statusAllowed = statusGuards[action] ? statusGuards[action]!.includes(task.status) : true
    return allowedRoles.includes(userRole) && statusAllowed
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Typography variant="h6" fontWeight={700} flexGrow={1}>
              {t('pages.dashboard.taskListTitle')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width={{ xs: '100%', sm: 'auto' }}>
              <FormControl size="small" fullWidth>
                <InputLabel id="status-filter-label">{t('pages.dashboard.filters.status')}</InputLabel>
                <Select
                  labelId="status-filter-label"
                  label={t('pages.dashboard.filters.status')}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as SentenceStatus | 'all')}
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel id="assignment-filter-label">{t('pages.dashboard.filters.assignment')}</InputLabel>
                <Select
                  labelId="assignment-filter-label"
                  label={t('pages.dashboard.filters.assignment')}
                  value={assignmentFilter}
                  onChange={(event) => setAssignmentFilter(event.target.value as Role | 'all')}
                >
                  {assignmentOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          <Divider />

          {isLoading ? (
            <Spinner label={t('status.loading')} />
          ) : (
            <>
              {!tasks.length && (
                <Typography variant="body2" color="text.secondary">
                  {t('pages.dashboard.noTasks')}
                </Typography>
              )}

              {!!tasks.length && !filteredTasks.length && (
                <Stack spacing={1.5} alignItems="flex-start">
                  <Typography variant="body2" color="text.secondary">
                    {t('pages.dashboard.noTasksForFilters')}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setStatusFilter('all')
                      setAssignmentFilter('all')
                    }}
                  >
                    {t('pages.dashboard.resetFilters')}
                  </Button>
                </Stack>
              )}

              <Stack spacing={2}>
                {pagedTasks.map((task) => {
                  const assignmentRole = task.assignmentRole ?? inferAssignmentRole(task.status)
                  return (
                    <Card key={task.id} variant="outlined">
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle1" fontWeight={700}>
                              {task.text}
                            </Typography>
                            <Chip
                              size="small"
                              color="primary"
                              label={t(`pages.dashboard.statusLabels.${task.status}`)}
                            />
                          </Stack>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              {task.source && (
                                <Chip size="small" variant="outlined" label={`${t('pages.dashboard.source')}: ${task.source}`} />
                              )}
                              {task.difficultyTag && (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={`${t('pages.dashboard.difficulty')}: ${task.difficultyTag}`}
                                />
                              )}
                              <Chip
                                size="small"
                                label={`${t('pages.dashboard.assignmentLabels.assignmentRole')}: ${t(`pages.dashboard.assignmentLabels.${assignmentRole}`)}`}
                              />
                            </Stack>
                          </Stack>

                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Button
                              variant="contained"
                              color="secondary"
                              size="small"
                              onClick={() => onAction('assign', task)}
                              disabled={!canRunAction('assign', task)}
                            >
                              {t('pages.dashboard.actions.assign')}
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => onAction('submit', task)}
                              disabled={!canRunAction('submit', task)}
                            >
                              {t('pages.dashboard.actions.submit')}
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => onAction('review', task)}
                              disabled={!canRunAction('review', task)}
                            >
                              {t('pages.dashboard.actions.review')}
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => onAction('curate', task)}
                              disabled={!canRunAction('curate', task)}
                            >
                              {t('pages.dashboard.actions.curate')}
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  )
                })}
              </Stack>

              {filteredTasks.length > 0 && (
                <Box display="flex" justifyContent="flex-end" mt={2}>
                  <TablePagination
                    component="div"
                    count={filteredTasks.length}
                    page={safePage}
                    onPageChange={(_, value) => setPage(value)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                      setRowsPerPage(parseInt(event.target.value, 10))
                      setPage(0)
                    }}
                    rowsPerPageOptions={[5, 10, 20]}
                  />
                </Box>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
