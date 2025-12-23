# Türkçe AMR Platformu (Başlangıç Uygulaması)

Bu depo, [docs/amr_platform_plan.md](docs/amr_platform_plan.md) belgesindeki gereksinimleri temel alan çok-kullanıcılı AMR anotasyon platformunun ilk sunucu tarafı iskeletini içerir. Backend, FastAPI ve SQLModel üzerine kurulmuş olup rol/iş-akışı kurallarını genişletilebilir bir state machine ile modeller.

## Mimari Özeti
- **API çatısı:** FastAPI
- **Veri modeli:** SQLModel (SQLite varsayılan; `DATABASE_URL` ile değiştirilebilir)
- **Başlıca varlıklar:** Kullanıcı, Proje, Cümle, Atama, Anotasyon, Review, Adjudication
- **Durum makinesi:** `WorkflowGuard` sınıfı ile `Sentence` durum geçişleri ve rol bazlı izinler.

## Çalıştırma
```bash
cd backend
uvicorn app.main:app --reload
```

Varsayılan olarak SQLite (`amr.db`) dosyası oluşturulur. Ortam değişkenleri `.env` dosyasıyla yönetilebilir (örn. `DATABASE_URL`, `DATABASE_ECHO`).

### Kimlik doğrulama
- **Kayıt:** `POST /auth/register` (username, password zorunlu; rol `pending` olarak başlar)
- **Giriş:** `POST /auth/token` — `Authorization: Bearer <token>` header’ı ile sonraki isteklere eklenir.
- **Konfig:** `SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` ortam değişkenleri `.env` üzerinden ayarlanabilir.
- Geçiş sürecinde eski header tabanlı kimlik doğrulama (`X-User-Id`, `X-User-Role`) geriye dönük uyumluluk için korunmuştur.

## Örnek İstek Akışı
1. **Proje oluştur** (admin): `POST /projects`
2. **Cümle ekle** (admin): `POST /sentences/project/{project_id}`
3. **Atama yap** (admin): `POST /sentences/{sentence_id}/assign`
4. **Anotasyon gönder** (annotator): `POST /sentences/{sentence_id}/submit`
5. **Review kararı ver** (reviewer): `POST /sentences/{sentence_id}/review`
6. **Curation/Adjudication yap** (curator/admin): `POST /sentences/{sentence_id}/adjudicate`
7. **Gold kabulü** (curator/admin): `POST /sentences/{sentence_id}/accept`
8. **Adjudication yeniden aç** (curator/admin): `POST /sentences/{sentence_id}/reopen`

Kimlik doğrulama artık JWT tabanlıdır; `Authorization: Bearer` header’ı taşınmalıdır. Geriye dönük olarak `X-User-Id` ve `X-User-Role` header’ları da desteklenir. Roller `admin`, `annotator`, `reviewer` vb. enumerasyonlarla doğrulanır ve veritabanındaki kullanıcı kaydıyla tutarlı olmalıdır.

## Lokal Geliştirme

### Gereksinimler
- Python 3.11+, Node 18+
- Varsayılan SQLite; Postgres için `DATABASE_URL` tanımlanabilir
- `pip`, `npm`/`pnpm`

### Backend (FastAPI)
1. Sanal ortam: `python -m venv .venv && source .venv/bin/activate`
2. Bağımlılıklar: `pip install -r backend/requirements.txt` (veya `pip install fastapi sqlmodel uvicorn[standard] jose passlib[bcrypt] pydantic-settings`)
3. Ortam değişkenleri: `.env` içinde `SECRET_KEY`, isteğe bağlı `DATABASE_URL`, `DATABASE_ECHO`
4. Çalıştırma: `cd backend && uvicorn app.main:app --reload --port 8000`
5. Sağlık kontrolü: `curl http://localhost:8000/health`

### Frontend (React/Vite)
1. `cd frontend && npm install`
2. `.env.local` içine `VITE_API_BASE_URL=http://localhost:8000` ekleyin
3. Çalıştırma: `npm run dev -- --host --port 5173`
4. Önizleme: `npm run build && npm run preview -- --host --port 4173`

### Manuel doğrulama akışı
1. `/auth/register` → admin ile `/auth/approve/{id}` → `/auth/token` → `/auth/me`
2. `/projects` POST → `/projects/{id}/summary`
3. Cümle akışı: `/sentences/project/{id}` POST → `/sentences/{sid}/assign` → `/sentences/{sid}/submit` → `/sentences/{sid}/review` → `/sentences/{sid}/adjudicate` → `/sentences/{sid}/accept`
4. Export: `/exports/project/{id}` (manifest+JSON) veya job: `/exports/project/{id}/jobs` → `/exports/jobs/{jobId}`
5. Frontend: Login → Dashboard proje seçimi → Annotator sayfasında cümle yükleme/validate/submit → Export panelinden indirme

## CI/CD Pipeline Taslağı

1. **Hazırlık:** PR ve main push tetikleyicileri; matris `python-version: [3.11]`, `node-version: [18]`; pip/npm cache kullanın.
2. **Backend aşaması:** `pip install -r backend/requirements.txt`; lint (örn. `ruff` veya `flake8`), opsiyonel `mypy`; test: `pytest backend`; güvenlik: `bandit -r backend/app` (isteğe bağlı).
3. **Frontend aşaması:** `npm ci`; `npm run lint`; `npm run test -- --runInBand`; `npm run build`.
4. **Entegrasyon duman testi (opsiyonel):** `uvicorn app.main:app --port 8000` arka planda; `npm run build && npm run preview -- --host --port 4173`; `curl http://localhost:8000/health` ve `curl http://localhost:4173` ile 200 beklenir; küçük API akışını (proje/cümle/assign) doğrula.
5. **Artefaktlar:** Test raporları (JUnit/HTML), frontend `dist` artefaktı; backend için wheel/zip opsiyonel.
6. **Dağıtım (isteğe bağlı):** Çok aşamalı Dockerfile; stage 1 frontend build, stage 2 Python image ile backend + `dist`; env: `SECRET_KEY`, `DATABASE_URL`, CORS ayarları; healthcheck `/health`.

## Durum değerlendirme ve audit
- **Proje özeti:** `GET /projects/{project_id}/summary` (admin/curator) — cümle durum dağılımı, atama ve değerlendirme sayıları.
- **Audit kayıtları:** `GET /audit?project_id=...&limit=50&offset=0` (admin tüm kayıtlar, curator proje filtresi ile) — aksiyon bazlı audit log erişimi ve filtreleme. Sayfalama için `limit` (max 200) ve `offset` parametreleri kullanılabilir.
- **Audit kayıtları:** `GET /audit?project_id=...` (admin tüm kayıtlar, curator proje filtresi ile) — aksiyon bazlı audit log erişimi ve filtreleme.

## Frontend yol haritası (ilk adımlar)
1. **Kimlik doğrulama kabuğu:** Login/registration formları, token saklama (HTTP-only cookie veya memory), `Authorization: Bearer` header ekleyen API istemcisi, oturum yenileme/çıkış akışı. Geriye dönük header desteği için dev panel seçeneği.
2. **Rol tabanlı yönlendirme:** Admin, annotator, reviewer vb. için route guard ve layout seviyesinde yetki kontrolleri; `/auth/me` ile kullanıcı bilgisini senkronize et.
3. **Proje ve görev listesi:** Proje seçimi, cümle listeleri (status filtreli), atama/rolleri gösteren tablo; pagination ve boş durum ekranları.
4. **Annotator workspace (MVP):** Cümle metni + PENMAN editor placeholder, yer tutucu validasyon çıktıları; sunucudan dönen validity_report için uyarı alanı.
5. **Reviewer/curator ekranları (taslak):** Çoklu anotasyon listesi/diff placeholder’ları, karar butonları; backend `review` ve `adjudicate` endpoint’lerine bağlanacak mock akış.
6. **UI temel bileşenleri:** Bildirim/toast sistemi, doğrulama uyarıları, yükleme durumları, form doğrulama helper’ları; i18n yapılandırması.
7. **API istemci katmanı:** Typing’li endpoint wrapper’ları (OpenAPI spec’ten üretilmiş veya el ile), hata haritalama (401→login yönlendirme, 403→uyarı, 422→form hataları).
8. **Test ve kalite:** UI bileşenleri için component testleri (örn. Vitest/React Testing Library) ve smoke e2e senaryoları; lint/format kuralları (ESLint/Prettier).

## Sonraki Adımlar
- JWT tabanlı gerçek kimlik doğrulama ve kullanıcı yönetimi.
- Review/curation ekranlarını destekleyecek ayrıntılı audit log ve versiyonlama (temel audit altyapısı eklendi, veri modelinde mevcut).
- Validasyon servisi entegrasyonu (PENMAN parse/lint) ve kuyruk yapısı.
- Export paketleme ve PII temizleme seçenekleri.
