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

## Örnek İstek Akışı
1. **Proje oluştur** (admin): `POST /projects`
2. **Cümle ekle** (admin): `POST /sentences/project/{project_id}`
3. **Atama yap** (admin): `POST /sentences/{sentence_id}/assign`
4. **Anotasyon gönder** (annotator): `POST /sentences/{sentence_id}/submit`
5. **Review kararı ver** (reviewer): `POST /sentences/{sentence_id}/review`

Kimlik doğrulama yerinde “hafif” tutulmuştur: her isteğe `X-User-Id` ve `X-User-Role` header’ları eklenmelidir. Roller `admin`, `annotator`, `reviewer` vb. enumerasyonlarla doğrulanır.

## Sonraki Adımlar
- JWT tabanlı gerçek kimlik doğrulama ve kullanıcı yönetimi.
- Review/curation ekranlarını destekleyecek ayrıntılı audit log ve versiyonlama.
- Validasyon servisi entegrasyonu (PENMAN parse/lint) ve kuyruk yapısı.
- Export paketleme ve PII temizleme seçenekleri.
