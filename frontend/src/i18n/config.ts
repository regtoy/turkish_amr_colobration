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
        register: 'Register',
        retry: 'Retry',
      },
      layout: {
        dashboard: 'Dashboard',
        annotator: 'Annotator',
        reviewer: 'Reviewer',
        admin: 'Admin',
      },
      fields: {
        username: 'Username',
        email: 'Email address',
        password: 'Password',
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
          helper: 'Use your approved credentials to continue.',
          success: 'Logged in successfully',
          error: 'Login failed. Please check your credentials.',
          registerCta: "Don't have an account?",
          registerLink: 'Create one',
        },
        register: {
          title: 'Create your account',
          subtitle: 'Request access to the collaboration workspace.',
          helper: 'Your account will remain pending until an administrator approves it.',
          success: 'Registration completed. Logging you in…',
          error: 'Registration failed. Please review the form details.',
          loginError: 'Registration succeeded but auto-login failed. Please try signing in.',
          loginCta: 'Already have an account?',
        },
        pending: {
          title: 'Awaiting approval',
          subtitle: 'Your account is pending admin approval.',
          banner: 'An administrator needs to approve your account. You will gain access once approved.',
          details: 'Access to projects is locked until your account is approved.',
          retry: 'Check again',
          unlocked: 'Your account is now active. Welcome!',
          stillPending: 'Your account is still pending approval.',
          signedInAs: 'Signed in as {{username}}',
        },
      },
      status: {
        loading: 'Loading',
        unauthorized: 'You need an account to access this page.',
      },
      validation: {
        required: 'This field is required',
        email: 'Enter a valid email address',
        passwordLength: 'Password must be at least 6 characters',
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
        register: 'Kayıt ol',
        retry: 'Tekrar dene',
      },
      layout: {
        dashboard: 'Kontrol paneli',
        annotator: 'Annotatör',
        reviewer: 'İnceleyici',
        admin: 'Yönetici',
      },
      fields: {
        username: 'Kullanıcı adı',
        email: 'E-posta adresi',
        password: 'Şifre',
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
          helper: 'Devam etmek için onaylanmış hesap bilgilerinizi kullanın.',
          success: 'Başarıyla giriş yapıldı',
          error: 'Giriş başarısız. Bilgileri kontrol edin.',
          registerCta: 'Hesabınız yok mu?',
          registerLink: 'Hemen oluşturun',
        },
        register: {
          title: 'Hesap oluştur',
          subtitle: 'İşbirliği alanına erişim isteyin.',
          helper: 'Hesabınız bir yönetici onaylayana kadar beklemede kalacaktır.',
          success: 'Kayıt tamamlandı. Giriş yapılıyor…',
          error: 'Kayıt başarısız. Lütfen bilgileri kontrol edin.',
          loginError: 'Kayıt başarılı fakat otomatik giriş yapılamadı. Lütfen yeniden giriş yapın.',
          loginCta: 'Zaten hesabınız var mı?',
        },
        pending: {
          title: 'Onay bekleniyor',
          subtitle: 'Hesabınız yönetici onayı için bekliyor.',
          banner: 'Bir yönetici hesabınızı onaylamalı. Onaylandığında erişim kazanacaksınız.',
          details: 'Hesabınız onaylanana kadar projelere erişim kilitli.',
          retry: 'Tekrar kontrol et',
          unlocked: 'Hesabınız artık aktif. Hoş geldiniz!',
          stillPending: 'Hesabınız hâlâ onay bekliyor.',
          signedInAs: '{{username}} olarak oturum açtınız',
        },
      },
      status: {
        loading: 'Yükleniyor',
        unauthorized: 'Bu sayfaya erişmek için oturum açın.',
      },
      validation: {
        required: 'Bu alan zorunludur',
        email: 'Geçerli bir e-posta adresi girin',
        passwordLength: 'Şifre en az 6 karakter olmalıdır',
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
