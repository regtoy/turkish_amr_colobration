import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import type { Project } from '@/types/project'

interface ProjectGridProps {
  projects: Project[]
  selectedProjectId: number | null
  onSelect: (projectId: number) => void
  isLoading?: boolean
}

export const ProjectGrid: React.FC<ProjectGridProps> = ({
  projects,
  selectedProjectId,
  onSelect,
  isLoading = false,
}) => {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <Box
        display="grid"
        gap={2}
        gridTemplateColumns={{ xs: 'repeat(auto-fill, minmax(240px, 1fr))' }}
        data-testid="project-grid-skeleton"
      >
        {Array.from({ length: 3 }).map((_, idx) => (
          <Card key={idx} variant="outlined">
            <CardContent>
              <Skeleton width="60%" />
              <Skeleton width="40%" />
              <Skeleton variant="rectangular" height={36} sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        ))}
      </Box>
    )
  }

  if (!projects.length) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700}>
            {t('pages.dashboard.noProjectsTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {t('pages.dashboard.noProjectsDescription')}
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box
      display="grid"
      gap={2}
      gridTemplateColumns={{ xs: 'repeat(auto-fill, minmax(260px, 1fr))' }}
      data-testid="project-grid"
    >
      {projects.map((project) => {
        const isSelected = selectedProjectId === project.id
        return (
          <Card
            key={project.id}
            variant="outlined"
            sx={{
              borderColor: isSelected ? 'primary.main' : 'divider',
              boxShadow: isSelected ? 4 : 0,
              transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            }}
          >
            <CardActionArea onClick={() => onSelect(project.id)}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {project.name}
                  </Typography>
                  {project.description && (
                    <Typography variant="body2" color="text.secondary">
                      {project.description}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip size="small" label={`${project.language.toUpperCase()} • AMR ${project.amrVersion}`} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${t('pages.dashboard.roleSetLabel')} ${project.roleSetVersion}`}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${t('pages.dashboard.validationLabel')} ${project.validationRuleVersion}`}
                    />
                  </Stack>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        )
      })}
    </Box>
  )
}
