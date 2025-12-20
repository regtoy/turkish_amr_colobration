import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      brand: 'Turkish AMR Collaboration',
      actions: {
        login: 'Login',
        logout: 'Logout',
        continue: 'Continue',
        returnHome: 'Return home',
      },
      layout: {
        dashboard: 'Dashboard',
        annotator: 'Annotator',
        reviewer: 'Reviewer',
        admin: 'Admin',
      },
      forms: {
        email: 'Email',
        password: 'Password',
      },
      pages: {
        dashboard: {
          title: 'Workspace overview',
          subtitle: 'Track project health and annotation velocity.',
          description:
            'This area provides scaffolding for dashboard widgets, charts, and data grids.',
          metrics: {
            tasks: 'Active tasks',
            quality: 'Average quality',
            velocity: 'Daily velocity',
            unit: 'sentences',
          },
        },
        annotator: {
          title: 'Annotator workspace',
          subtitle: 'Claim tasks and submit annotations.',
          description:
            'Configure task assignment, form-based annotation, and submission flows here.',
          queue: {
            waiting: 'Waiting',
            inProgress: 'In progress',
          },
        },
        reviewer: {
          title: 'Reviewer workspace',
          subtitle: 'Review submissions and ensure quality.',
          description:
            'Skeleton area for review checkpoints, approve/reject flows, and quality metrics.',
          progressLabel: '{{progress}}% complete',
        },
        admin: {
          title: 'Admin console',
          subtitle: 'Configure projects, roles, and permissions.',
          description: 'Admin tools provide control over system-wide settings.',
          items: {
            roles: {
              label: 'Role management',
              description: 'Configure role-based permissions and groups.',
            },
            projects: {
              label: 'Project settings',
              description: 'Define new datasets, tasks, and workflows.',
            },
            audit: {
              label: 'Audit logs',
              description: 'Review access and activity logs.',
            },
          },
        },
        login: {
          title: 'Welcome back',
          subtitle: 'Authenticate to access the collaboration suite.',
          toast: {
            success: 'Logged in successfully',
            error: 'Login failed. Please check your credentials.',
          },
        },
        notFound: {
          title: '404',
          description: 'The page you are looking for could not be found.',
        },
      },
      status: {
        loading: 'Loading',
        unauthorized: 'You need an account to access this page.',
      },
    },
  },
  tr: {
    translation: {
      brand: 'Türkçe AMR İşbirliği',
      actions: {
        login: 'Giriş yap',
        logout: 'Çıkış yap',
        continue: 'Devam et',
        returnHome: 'Ana sayfaya dön',
      },
      layout: {
        dashboard: 'Kontrol paneli',
        annotator: 'Annotatör',
        reviewer: 'İnceleyici',
        admin: 'Yönetici',
      },
      forms: {
        email: 'E-posta',
        password: 'Şifre',
      },
      pages: {
        dashboard: {
          title: 'Çalışma alanı görünümü',
          subtitle: 'Proje sağlığını ve anotasyon hızını takip edin.',
          description:
            'Bu alan, kontrol paneli bileşenleri, grafikler ve veri tabloları için iskelet sağlar.',
          metrics: {
            tasks: 'Aktif görevler',
            quality: 'Ortalama kalite',
            velocity: 'Günlük hız',
            unit: 'cümle',
          },
        },
        annotator: {
          title: 'Annotatör çalışma alanı',
          subtitle: 'Görev alın ve anotasyon gönderin.',
          description:
            'Görev dağıtımı, form tabanlı anotasyon ve gönderim akışlarını burada yapılandırabilirsiniz.',
          queue: {
            waiting: 'Beklemede',
            inProgress: 'Devam ediyor',
          },
        },
        reviewer: {
          title: 'İnceleyici çalışma alanı',
          subtitle: 'Gönderimleri inceleyin ve kaliteyi koruyun.',
          description:
            'İnceleme denetimleri, kabul/red iş akışları ve kalite ölçümlerinin yer alacağı iskelet.',
          progressLabel: '%{{progress}} tamamlandı',
        },
        admin: {
          title: 'Yönetici konsolu',
          subtitle: 'Projeleri, rolleri ve izinleri yapılandırın.',
          description: 'Yönetici araçları, sistem genelindeki ayarların kontrolünü sağlar.',
          items: {
            roles: {
              label: 'Rol yönetimi',
              description: 'Rol tabanlı izinleri ve grupları yapılandırın.',
            },
            projects: {
              label: 'Proje ayarları',
              description: 'Yeni veri kümeleri, görevler ve iş akışları tanımlayın.',
            },
            audit: {
              label: 'Denetim günlükleri',
              description: 'Erişim ve aktivite loglarını gözden geçirin.',
            },
          },
        },
        login: {
          title: 'Tekrar hoş geldiniz',
          subtitle: 'Ortamı kullanmak için oturum açın.',
          toast: {
            success: 'Başarıyla giriş yapıldı',
            error: 'Giriş başarısız. Bilgileri kontrol edin.',
          },
        },
        notFound: {
          title: '404',
          description: 'Aradığınız sayfa bulunamadı.',
        },
      },
      status: {
        loading: 'Yükleniyor',
        unauthorized: 'Bu sayfaya erişmek için oturum açın.',
      },
    },
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'tr',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
