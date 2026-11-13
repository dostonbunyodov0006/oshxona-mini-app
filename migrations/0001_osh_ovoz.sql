-- Ошхона овозлари: ҳар одамнинг ҳар кунги ҳар овқати — АЛОҲИДА қатор.
--
-- Калит (sana, uid, m) — бир одам бир кунда бир овқатга БИТТА ёзув қолдиради.
-- Шу сабаб икки одам бир вақтда босса ҳам бир-бирининг овозини ўчирмайди
-- (аввал ҳаммаси KV'да битта рўйхат эди — пойга бўлиб овозлар йўқоларди).
--
--   sana  «2026-09-22»
--   uid   Telegram id
--   m     «t» = тушлик, «k» = кечки
--   t     «y» = ейман,  «n» = емайман
--   vaqt  ISO вақт (UTC)
--   auto  1 = 09:45 да босмагани учун автоматик «емайман» ёзилган

CREATE TABLE IF NOT EXISTS osh_ovoz (
  sana TEXT NOT NULL,
  uid  INTEGER NOT NULL,
  m    TEXT NOT NULL CHECK (m IN ('t', 'k')),
  t    TEXT NOT NULL CHECK (t IN ('y', 'n')),
  vaqt TEXT NOT NULL,
  auto INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (sana, uid, m)
);

-- Кунлик ҳисоб ва «ким ейди» сўровлари сана бўйича
CREATE INDEX IF NOT EXISTS osh_ovoz_sana ON osh_ovoz (sana);
