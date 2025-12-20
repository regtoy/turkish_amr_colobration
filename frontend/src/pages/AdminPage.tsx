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
    label: 'Rol yönetimi',
    description: 'Rol tabanlı izinleri ve grupları yapılandırın.',
  },
  {
    id: 'projects',
    label: 'Proje ayarları',
    description: 'Yeni veri kümeleri, görevler ve iş akışları tanımlayın.',
  },
  {
    id: 'audit',
    label: 'Denetim günlükleri',
    description: 'Erişim ve aktivite loglarını gözden geçirin.',
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
          <Typography color="text.secondary">
            Yönetici araçları, sistem genelindeki ayarların kontrolünü sağlar.
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <List>
          {adminItems.map((item, index) => (
            <div key={item.id}>
              <ListItem>
                <ListItemText primary={item.label} secondary={item.description} />
              </ListItem>
              {index < adminItems.length - 1 && <Divider component="li" />}
            </div>
          ))}
        </List>
      </Card>
    </Stack>
  )
}
