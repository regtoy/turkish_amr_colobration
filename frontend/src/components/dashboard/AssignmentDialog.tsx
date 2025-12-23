import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AssignmentPayload } from '@/api/sentences'
import type { Role } from '@/types/auth'
import { inferAssignmentRole, type SentenceItem } from '@/types/sentence'

interface AssignmentDialogProps {
  open: boolean
  task: SentenceItem | null
  onClose: () => void
  onSubmit: (payload: AssignmentPayload) => void
  isSubmitting?: boolean
}

const assignableRoles: Role[] = ['annotator', 'reviewer', 'curator']

const parseSkills = (input: string): string[] =>
  input
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean)

export const AssignmentDialog: React.FC<AssignmentDialogProps> = ({
  open,
  task,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const { t } = useTranslation()
  const defaultRole = task?.assignmentRole ?? (task ? inferAssignmentRole(task.status) : 'annotator')
  const [role, setRole] = useState<Role>(defaultRole)
  const [strategy, setStrategy] = useState<AssignmentPayload['strategy']>('round_robin')
  const [count, setCount] = useState<number>(1)
  const [requiredSkillInput, setRequiredSkillInput] = useState<string>('')
  const [allowMultipleAssignments, setAllowMultipleAssignments] = useState<boolean>(false)
  const [reassignAfterReject, setReassignAfterReject] = useState<boolean>(false)
  const [isBlind, setIsBlind] = useState<boolean>(false)

  const requiredSkills = useMemo(() => parseSkills(requiredSkillInput), [requiredSkillInput])

  const removeSkill = (skill: string) => {
    const remaining = requiredSkills.filter((item) => item.toLowerCase() !== skill.toLowerCase())
    setRequiredSkillInput(remaining.join(', '))
  }

  const handleSubmit = () => {
    if (!task) return
    onSubmit({
      role,
      strategy,
      count,
      requiredSkills,
      allowMultipleAssignments,
      reassignAfterReject,
      isBlind,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {task
          ? t('pages.dashboard.assignmentDialog.title', { sentenceId: task.id })
          : t('pages.dashboard.assignmentDialog.fallbackTitle')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <FormControl fullWidth size="small">
            <InputLabel id="assignment-role-label">
              {t('pages.dashboard.assignmentDialog.roleLabel')}
            </InputLabel>
            <Select
              labelId="assignment-role-label"
              label={t('pages.dashboard.assignmentDialog.roleLabel')}
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              {assignableRoles.map((assignableRole) => (
                <MenuItem key={assignableRole} value={assignableRole}>
                  {t(`pages.dashboard.assignmentLabels.${assignableRole}`)}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{t('pages.dashboard.assignmentDialog.roleHelper')}</FormHelperText>
          </FormControl>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={t('pages.dashboard.assignmentDialog.countLabel')}
              value={count}
              onChange={(event) => setCount(Math.max(1, Number(event.target.value)))}
              helperText={t('pages.dashboard.assignmentDialog.countHelper')}
              inputProps={{ min: 1 }}
            />
            <FormControl fullWidth size="small">
              <InputLabel id="assignment-strategy-label">
                {t('pages.dashboard.assignmentDialog.strategyLabel')}
              </InputLabel>
              <Select
                labelId="assignment-strategy-label"
                label={t('pages.dashboard.assignmentDialog.strategyLabel')}
                value={strategy}
                onChange={(event) =>
                  setStrategy(event.target.value as AssignmentPayload['strategy'])
                }
              >
                <MenuItem value="round_robin">
                  {t('pages.dashboard.assignmentDialog.strategies.roundRobin')}
                </MenuItem>
                <MenuItem value="skill_based">
                  {t('pages.dashboard.assignmentDialog.strategies.skillBased')}
                </MenuItem>
              </Select>
              <FormHelperText>{t('pages.dashboard.assignmentDialog.strategyHelper')}</FormHelperText>
            </FormControl>
          </Stack>

          {strategy === 'skill_based' && (
            <Stack spacing={1}>
              <TextField
                size="small"
                fullWidth
                label={t('pages.dashboard.assignmentDialog.requiredSkillsLabel')}
                placeholder={t('pages.dashboard.assignmentDialog.requiredSkillsPlaceholder')}
                value={requiredSkillInput}
                onChange={(event) => setRequiredSkillInput(event.target.value)}
                helperText={t('pages.dashboard.assignmentDialog.requiredSkillsHelper')}
              />
              {!!requiredSkills.length && (
                <Box display="flex" gap={1} flexWrap="wrap">
                  {requiredSkills.map((skill) => (
                    <Chip key={skill} label={skill} onDelete={() => removeSkill(skill)} size="small" />
                  ))}
                </Box>
              )}
            </Stack>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={allowMultipleAssignments}
                onChange={(event) => setAllowMultipleAssignments(event.target.checked)}
              />
            }
            label={t('pages.dashboard.assignmentDialog.allowMultiple')}
          />
          <FormHelperText>{t('pages.dashboard.assignmentDialog.allowMultipleHelper')}</FormHelperText>

          <FormControlLabel
            control={
              <Switch
                checked={reassignAfterReject}
                onChange={(event) => setReassignAfterReject(event.target.checked)}
              />
            }
            label={t('pages.dashboard.assignmentDialog.reassignAfterReject')}
          />
          <FormHelperText>{t('pages.dashboard.assignmentDialog.reassignHelper')}</FormHelperText>

          <FormControlLabel
            control={
              <Switch checked={isBlind} onChange={(event) => setIsBlind(event.target.checked)} />
            }
            label={t('pages.dashboard.assignmentDialog.blindAssignment')}
          />
          <FormHelperText>{t('pages.dashboard.assignmentDialog.blindHelper')}</FormHelperText>

          <Typography variant="body2" color="text.secondary">
            {t('pages.dashboard.assignmentDialog.helperCopy')}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('actions.cancel')}</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting || !task}>
          {t('pages.dashboard.assignmentDialog.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
