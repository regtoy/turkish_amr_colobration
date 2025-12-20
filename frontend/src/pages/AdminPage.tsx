import {
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

const adminItems = [
  {
    id: 'roles',
    labelKey: 'pages.admin.items.roles.label',
    descriptionKey: 'pages.admin.items.roles.description',
  },
  {
    id: 'projects',
    labelKey: 'pages.admin.items.projects.label',
    descriptionKey: 'pages.admin.items.projects.description',
  },
  {
    id: 'audit',
    labelKey: 'pages.admin.items.audit.label',
    descriptionKey: 'pages.admin.items.audit.description',
  },
]

export const AdminPage = () => {
  const { t } = useTranslation()

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {t('pages.admin.subtitle')}
          </Typography>
          <Typography color="text.secondary">{t('pages.admin.description')}</Typography>
        </CardContent>
      </Card>

      <Card>
        <List>
          {adminItems.map((item, index) => (
            <div key={item.id}>
              <ListItem>
                <ListItemText primary={t(item.labelKey)} secondary={t(item.descriptionKey)} />
              </ListItem>
              {index < adminItems.length - 1 && <Divider component="li" />}
            </div>
          ))}
        </List>
      </Card>
    </Stack>
  )
}
