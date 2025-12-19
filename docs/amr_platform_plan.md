# Türkçe AMR Web Platformu – Özellik ve Mimari Planı

Bu metin, Türkçe AMR (PENMAN) anotasyonu için web tabanlı, çok kullanıcılı, doğrulama ve adjudication (curation) destekli profesyonel bir platformun geliştirilebilmesi için teknik ve ürün gereksinimlerini tanımlar. Zaman çizelgesi içermez; geliştirme rehberi olarak kullanılmak üzere hazırlanmıştır.

## 1) Amaç ve kapsam
- Cümleleri AMR (PENMAN) formatında etiketleme, doğrulama ve dışa aktarma.
- Çoklu anotatör, review, adjudication/curation akışı; kalite güvence odaklı.
- Yönetici onaylı erişim, rol/yetki modeli; audit ve metrik takibi.
- Penman tabanlı zorunlu sunucu doğrulaması ve temiz, yeniden parse edilebilir çıktı.

## 2) Roller ve erişim modeli
- Guest (opsiyonel demo), Pending (kayıt sonrası onay bekleyen), Annotator, Reviewer, Adjudicator/Curator, Admin.
- Kayıt herkese açık, erişim Admin onayı ve proje bazlı rol atamasıyla açılır.
- Audit log: kim-ne-zaman yaptı; proje bazlı RBAC.

## 3) Veri modeli (çekirdek varlıklar)
- **Project:** Dil (tr), AMR sürümü/kuralları, tag setleri, kalite eşikleri, öneri/ML ayarları; doğrulama/rol seti versiyon bilgisi.
- **Sentence Item:** Metin, kaynak/domain, zorluk etiketi, durum (NEW/ASSIGNED/SUBMITTED/IN_REVIEW/ADJUDICATED/ACCEPTED).
- **Assignment:** sentence_id, user_id, rol; “kaç anotatöre gidecek” parametresi; blind çalışma seçeneği.
- **Annotation:** penman_text, normalize edilmiş graph, validity raporu, versiyonlama (state ve validasyon raporuyla bağlı).
- **Review:** karar (approve/reject/needs-fix), puanlama, yorum.
- **Adjudication/Gold:** final_penman, hangi anotasyonlardan türetildi, karar notu.
- **Hatalı/Red Edilmiş Gönderim Arşivi:** DPO veya benzeri kalite eğitimi/araçları için saklanan başarısız validasyon veya reject edilmiş anotasyonlar; meta ile birlikte export edilebilir.
### 3.1 Durum makinesi (Sentence/Annotation)
- **Sentence durumları:** NEW → ASSIGNED → SUBMITTED → IN_REVIEW → ADJUDICATED → ACCEPTED.
- **Geçiş yetkileri:**
  - NEW→ASSIGNED: Admin/Assignment engine.
  - ASSIGNED→SUBMITTED: Annotator kendi ataması için.
  - SUBMITTED→IN_REVIEW: Reviewer ata/yükle (Admin veya reviewer görevi başlatır).
  - IN_REVIEW kararları:
    - approve → ADJUDICATED (tek anotasyonlu projede) veya curation’a gider.
    - needs-fix → geri SUBMITTED (aynı anotatöre veya yeniden ata).
    - reject → ASSIGNED veya SUBMITTED (yeniden atama politikası).
  - Çoklu anotatör varsa: Curation sürecine girer, curator final ürettiğinde ADJUDICATED.
  - ADJUDICATED→ACCEPTED: Admin/Curator onayı (gold yayını).
- **Geri dönüş sınırları:** ACCEPTED kapalı; ADJUDICATED geri açmak için sadece Admin/Curator; IN_REVIEW’den SUBMITTED’a reviewer “needs-fix” ile dönebilir; SUBMITTED’dan ASSIGNED’a yalnızca Admin/Assignment engine yeniden atama ile döner.


## 4) Anotasyon arayüzü
- Sol: cümle + bağlam; Orta: PENMAN editörü (paren eşleştirme, lint, highlight); Sağ: grafik görünüm (node/edge sürükle-bırak).
- Alt: Validasyon sonuçları, uyarılar, öneriler, yorumlar.
- Hızlandırıcılar: autocomplete (PropBank/role önerileri), şablon parçaları, kısayollar.
- “Ön kontrol” butonu: kaydetmeden parse/normalize/lint.

## 5) PENMAN/AMR doğrulama
- **Rol seti kaynağı/versiyonu:** PropBank sürümü + proje spesifik TR rol rehberi (versiyonlanır, Project kaydında tutulur); validasyon bu versiyona göre yapılır.
- **Zorunlu:** parse edilebilirlik, tek kök, dengeli parantez, geçerli triple, rol seti uyumu, değişken tutarlılığı, reentrancy, canonical format (indent/policy).
- **Opsiyonel sinyaller:** lint puanı, rol eksikliği, kopuk alt ağaç, aşırı literal node, Türkçeye özgü kip/olumsuzluk checklist (rehber/versiyon bilgisiyle).
- Sunucu tarafı doğrulama; bloklayıcı/uyarı/info sınıflarıyla istemciye raporlanır; doğrulama kuralları versiyonlanır. Başarısız doğrulamalar ve reddedilen gönderimler, yeniden eğitim (örn. DPO) veya kalite analizi için, anonimleştirilebilir meta ile birlikte arşivlenebilir.

## 6) Collaboration ve iş akışı
- Atama stratejileri: round-robin, skill-based, blind; yeniden atama (düşük güven/hata) opsiyonu.
- Cümle başına N anotatör + 1+ reviewer + curator.
- İletişim: cümle bazlı yorum/mention, “bu cümleyi kontrol et” talebi, bildirimler.

## 7) Review ve adjudication/curation
- Review ekranı: anotatör çıktıları listesi, validasyon raporu, PENMAN diff/node-edge diff, puanlama rubriği, geri gönderme.
- Curation ekranı: çoklu anotasyonu yan yana göster; node/edge seçerek birleşik final üret; final normalize+doğrula; karar (ACCEPTED/NEEDS_MORE_WORK).

## 8) Yönetici paneli
- Kullanıcı kuyruğu: pending onayı/ret, proje bazlı rol atama.
- Toplu cümle import: CSV/JSON/TXT, dupe kontrolü (hash/benzerlik), batch etiketleri.
- Dashboard: ilerleme durumları, anotatör/reviewer performansı, iş yükü.
- Export: # ::id, # ::snt + final PENMAN (pretty, canonical); seçenekler: yalnızca gold, gold+silver, tüm versiyonlar; validasyon özeti + provenance dahil.
- Hatalı/Rejected export: Başarısız validasyonlar ve reviewer/curator tarafından reject edilmiş anotasyonlar; model eğitimi/DPO için negatif örnek seti olarak, PII filtreli/anonymize seçeneğiyle paketlenir.

## 9) Teknik mimari
- **Frontend:** Web UI (PENMAN editor, grafik renderer), review/curation ekranları, yorum/bildirim.
- **Backend API:** Auth (JWT/OAuth2), RBAC, assignment engine, validation service (Penman tabanlı), review/adjudication iş akışı, export servisi.
- **Veritabanı:** Postgres (JSONB ile meta/validasyon raporu), versiyonlama için soft history.
- **Queue/worker (opsiyonel):** ağır validasyon, ML öneri, export paketleme.
- **Object storage (opsiyonel):** import/export dosyaları, log arşivleri.
- Güvenlik: rate limit, input sanitization, audit zorunlu; export’ta PII filtre seçenekleri.

### 9.1 RBAC ve audit görünürlük ilkeleri
- **RBAC kapsamı:** Proje bazlı roller; Annotator/Reviewer sadece kendi projelerinde atandığı cümle/anotasyonları görebilir; Curator proje bazlı tüm anotasyonları curation ekranında görebilir; Admin tüm projeleri ve audit kayıtlarını görür.
- **Audit görünürlüğü:** Annotator/Reviewer kendi eylem kayıtlarını ve kendilerine gelen review/yorumları görür; Curator curation’a konu anotasyonların audit özetini görür; Admin tüm audit’i görür ve dışa aktarabilir.
- **PII alanları:** Kullanıcı adı/e-posta, IP, oturum bilgisi; metin kaynağı meta verileri (kaynak sistem id vs.) PII sayılabilir. Audit/Log’da PII maskeleme veya role bağlı kısmi gösterim uygulanır; export’ta PII çıkarma/anonimleştirme seçenekleri sağlanır.

## 10) Opsiyonel “akıllı yardım” modülü
- ML destekli AMR taslak önerisi + kullanıcı onayı (INCEpTION benzeri yaklaşım).
- Active learning: zor örnekleri kıdemliye yönlendirme.
- Şablon/fragment kütüphanesi; autocomplete/rol tamamlama.

## 11) Kabul kriterleri (minimum “hazır” seviyesi)
- Pending→onay akışı ve proje bazlı izinler çalışıyor.
- Bir cümle N anotatöre dağıtılabiliyor; blind çalışma destekli.
- Sunucu doğrulaması olmadan kayıt/gold mümkün değil; parse edilemeyen veri reddediliyor.
- Review ekranı: karar + puan + yorum + geri gönderme.
- Curation: çoklu yanıt yan yana, seç-birleştir, final normalize+doğrula.
- Export: canonical, temiz, yeniden parse edilebilir AMR çıktısı; provenance ve validasyon özeti mevcut.
- Audit log ve temel metrik dashboard’ları erişilebilir.
