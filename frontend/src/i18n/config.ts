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
      },
      layout: {
        dashboard: 'Dashboard',
        annotator: 'Annotator',
        reviewer: 'Reviewer',
        admin: 'Admin',
      },
      pages: {
        dashboard: {
          title: 'Workspace overview',
          subtitle: 'Track project health and annotation velocity.',
        },
        annotator: {
          title: 'Annotator workspace',
          subtitle: 'Claim tasks and submit annotations.',
        },
        reviewer: {
          title: 'Reviewer workspace',
          subtitle: 'Review submissions and ensure quality.',
        },
        admin: {
          title: 'Admin console',
          subtitle: 'Configure projects, roles, and permissions.',
        },
        login: {
          title: 'Welcome back',
          subtitle: 'Authenticate to access the collaboration suite.',
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
      },
      layout: {
        dashboard: 'Kontrol paneli',
        annotator: 'Annotatör',
        reviewer: 'İnceleyici',
        admin: 'Yönetici',
      },
      pages: {
        dashboard: {
          title: 'Çalışma alanı görünümü',
          subtitle: 'Proje sağlığını ve anotasyon hızını takip edin.',
        },
        annotator: {
          title: 'Annotatör çalışma alanı',
          subtitle: 'Görev alın ve anotasyon gönderin.',
        },
        reviewer: {
          title: 'İnceleyici çalışma alanı',
          subtitle: 'Gönderimleri inceleyin ve kaliteyi koruyun.',
        },
        admin: {
          title: 'Yönetici konsolu',
          subtitle: 'Projeleri, rolleri ve izinleri yapılandırın.',
        },
        login: {
          title: 'Tekrar hoş geldiniz',
          subtitle: 'Ortamı kullanmak için oturum açın.',
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
