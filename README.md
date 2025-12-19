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

Kimlik doğrulama yerinde “hafif” tutulmuştur: her isteğe `X-User-Id` ve `X-User-Role` header’ları eklenmelidir. Roller `admin`, `annotator`, `reviewer` vb. enumerasyonlarla doğrulanır.

## Durum değerlendirme ve audit
- **Proje özeti:** `GET /projects/{project_id}/summary` (admin/curator) — cümle durum dağılımı, atama ve değerlendirme sayıları.
- **Audit kayıtları:** `GET /audit?project_id=...&limit=50&offset=0` (admin tüm kayıtlar, curator proje filtresi ile) — aksiyon bazlı audit log erişimi ve filtreleme. Sayfalama için `limit` (max 200) ve `offset` parametreleri kullanılabilir.
- **Audit kayıtları:** `GET /audit?project_id=...` (admin tüm kayıtlar, curator proje filtresi ile) — aksiyon bazlı audit log erişimi ve filtreleme.

## Sonraki Adımlar
- JWT tabanlı gerçek kimlik doğrulama ve kullanıcı yönetimi.
- Review/curation ekranlarını destekleyecek ayrıntılı audit log ve versiyonlama (temel audit altyapısı eklendi, veri modelinde mevcut).
- Validasyon servisi entegrasyonu (PENMAN parse/lint) ve kuyruk yapısı.
- Export paketleme ve PII temizleme seçenekleri.
