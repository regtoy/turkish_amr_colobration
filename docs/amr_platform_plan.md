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
- **Project:** Dil (tr), AMR sürümü/kuralları, tag setleri, kalite eşikleri, öneri/ML ayarları.
- **Sentence Item:** Metin, kaynak/domain, zorluk etiketi, durum (NEW/ASSIGNED/SUBMITTED/IN_REVIEW/ADJUDICATED/ACCEPTED).
- **Assignment:** sentence_id, user_id, rol; “kaç anotör gidecek” parametresi; blind çalışma seçeneği.
- **Annotation:** penman_text, normalize edilmiş graph, validity raporu, versiyonlama.
- **Review:** karar (approve/reject/needs-fix), puanlama, yorum.
- **Adjudication/Gold:** final_penman, hangi anotasyonlardan türetildi, karar notu.
- **Audit Log:** tüm değişiklikler, eski-yeni değerler.

## 4) Anotasyon arayüzü
- Sol: cümle + bağlam; Orta: PENMAN editörü (paren eşleştirme, lint, highlight); Sağ: grafik görünüm (node/edge sürükle-bırak).
- Alt: Validasyon sonuçları, uyarılar, öneriler, yorumlar.
- Hızlandırıcılar: autocomplete (PropBank/role önerileri), şablon parçaları, kısayollar.
- “Ön kontrol” butonu: kaydetmeden parse/normalize/lint.

## 5) PENMAN/AMR doğrulama
- **Zorunlu:** parse edilebilirlik, tek kök, dengeli parantez, geçerli triple, rol seti uyumu, değişken tutarlılığı, reentrancy, canonical format (indent/policy).
- **Opsiyonel sinyaller:** lint puanı, rol eksikliği, kopuk alt ağaç, aşırı literal node, Türkçe’ye özgü kip/olumsuzluk checklist.
- Sunucu tarafı doğrulama; bloklayıcı/uyarı/info sınıflarıyla istemciye raporlanır.

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

## 9) Teknik mimari
- **Frontend:** Web UI (PENMAN editor, grafik renderer), review/curation ekranları, yorum/bildirim.
- **Backend API:** Auth (JWT/OAuth2), RBAC, assignment engine, validation service (Penman tabanlı), review/adjudication iş akışı, export servisi.
- **Veritabanı:** Postgres (JSONB ile meta/validasyon raporu), versiyonlama için soft history.
- **Queue/worker (opsiyonel):** ağır validasyon, ML öneri, export paketleme.
- **Object storage (opsiyonel):** import/export dosyaları, log arşivleri.
- Güvenlik: rate limit, input sanitization, audit zorunlu; export’ta PII filtre seçenekleri.

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
