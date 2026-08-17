# 共有メール管理システム 技術設計（自作する場合）

> [00_decision.md](00_decision.md) で「自作する」と判断した場合の設計。読み手は開発者本人。
>
> 対象規模: 利用者 〜5人 / 管理アドレス 〜3個 / 受信 〜100通/日

---

## 1. 機能要件（メールワイズ機能の実装マッピング）

| メールワイズの機能 | 自作での実装 | 優先度 |
|---|---|---|
| 複数アドレスの一元受信 | `mailboxes` テーブル ＋ プロバイダアダプタ | MVP |
| メール1通ごとの担当者割当 | `threads.assignee_id` | MVP |
| 処理ステータス | `threads.status`（未対応／対応中／処理済／保留） | MVP |
| 社内コメント（顧客に見えないメモ） | `comments` テーブル | MVP |
| 返信テンプレート | `templates` テーブル | MVP |
| 二重対応の防止 | 楽観ロック ＋ 下書きの排他（→ §6） | MVP |
| 誤送信の防止 | 送信予約 ＋ 宛先確認（→ §7） | MVP |
| 全文検索 | PostgreSQL ＋ 日本語対応の索引（→ §5.2） | MVP |
| 顧客情報・対応履歴 | `contacts` ＋ メールアドレス軸のスレッド紐付け | 実運用 |
| 集計・レポート | SQL集計（対応件数・初回返信までの時間） | 実運用 |
| 権限管理 | ロール ＋ メールボックス単位のアクセス制御 | 実運用 |

---

## 2. 全体構成

この規模で over-engineering しないことを最優先に選ぶ。

```
                    ┌──────────────────────────────┐
  ブラウザ ────────▶│  Next.js (App Router)        │
  （5人）           │   ・画面（受信箱/スレッド/設定） │
                    │   ・API Route（返信・割当など） │
                    │   ・AI呼び出し（サーバー側のみ）  │
                    └───────┬──────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
      ┌──────────────┐ ┌─────────┐ ┌──────────────┐
      │ PostgreSQL   │ │  R2 等   │ │ 同期ワーカー   │
      │ （本文・状態） │ │（添付）  │ │ (常駐 / 1分毎) │
      └──────────────┘ └─────────┘ └───────┬──────┘
                                           │
                                  ┌────────┴────────┐
                                  ▼                 ▼
                          ┌──────────────┐  ┌──────────────┐
                          │ GmailAdapter │  │ ImapAdapter  │
                          │ (Gmail API)  │  │ (imapflow)   │
                          └──────────────┘  └──────────────┘
```

### 技術スタック

| 層 | 選定 | 理由 |
|---|---|---|
| フレームワーク | Next.js (App Router) + TypeScript | 画面とサーバー処理を1プロジェクトで完結。既存資産（React/TS）と地続き |
| DB | PostgreSQL | スレッド・状態管理はリレーショナルが素直。日本語全文検索の拡張も使える |
| 認証 | Auth.js（Google OAuth、組織ドメイン限定） | 5人規模で自前の認証を書く理由がない |
| 添付ファイル | S3互換（Cloudflare R2 等） | DBに入れない。署名付きURLで配信 |
| メール取得 | 常駐ワーカー（1分間隔ポーリング） | §3 参照 |
| AI | Anthropic SDK（**サーバー側から**呼ぶ） | 既存SPAはブラウザ直叩きだが、共有システムでは不可 |

### ホスティング: VPS 1台を推奨

**サーバーレス（Vercel等）は今回避ける。** 理由は3つ。

1. IMAP は接続の維持と UID 状態の管理が必要で、実行が細切れになる環境と相性が悪い
2. Gmail のリアルタイム受信には Cloud Pub/Sub 経由の push 通知を組む必要があるが、**〜100通/日なら1分ポーリングで十分**であり、Pub/Sub を組むのは過剰
3. 日本語全文検索の拡張（PGroonga 等）を入れるなら、DBを自分で握れたほうが早い

VPS 1台（月1,000〜2,000円）に Next.js・ワーカー・PostgreSQL を同居させるのが、この規模では最も単純で速い。

> マネージドDBを使いたい場合、**Supabase は PGroonga をサポートしている**ため日本語全文検索の選択肢になる。Neon は日本語向け拡張の対応が不明なので、採用前に確認すること。

---

## 3. プロバイダ差異を吸収するアダプタ層

既存リポジトリの `src/storage/adapter.ts`（`StorageAdapter` インターフェースで実装を差し替え可能にする設計思想）を踏襲する。**ここが本システムの設計の要**で、Gmail と IMAP の差異はすべてこの層で吸収し、上位のUI・業務ロジックはプロバイダを知らない。

```ts
/** 差分取得の再開位置。プロバイダごとに形が違うので判別可能な union にする */
export type SyncCursor =
  | { kind: 'gmail'; historyId: string }
  | { kind: 'imap'; uidValidity: number; lastUid: number }

export interface FetchResult {
  messages: RawMessage[]
  cursor: SyncCursor
  /** true の間は呼び出し側が続けて fetch する（ページング） */
  hasMore: boolean
}

export interface SendInput {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  text: string
  html?: string
  attachments?: { filename: string; content: Buffer; mimeType: string }[]
  /** 返信時: 親メールの Message-ID。In-Reply-To / References の組み立てに使う */
  inReplyTo?: string
  references?: string[]
}

export interface MailAdapter {
  /** 差分取得。cursor が null なら初回同期（直近N日分） */
  fetch(cursor: SyncCursor | null, limit: number): Promise<FetchResult>

  /** 本文・添付の取得。一覧表示では取得しない（遅い・重い） */
  fetchBody(providerMessageId: string): Promise<ParsedMessage>

  /** 送信。プロバイダ側のIDと、生成された Message-ID を返す */
  send(input: SendInput): Promise<{ providerMessageId: string; messageId: string }>

  /** 既読状態をプロバイダ側にも反映（任意機能） */
  markSeen(providerMessageId: string): Promise<void>
}
```

### GmailAdapter

- 差分取得は `users.history.list` に `startHistoryId` を渡す。全件走査しない
- **スコープは restricted 扱い。外部公開アプリなら CASA という年次のセキュリティ審査が必要になるが、Google Workspace の組織内限定（Internal）アプリとして構成すれば審査は免除される。** 自社の Workspace 内で使う前提なら、ここは設計上クリアできる
- 送信は `users.messages.send`。差出人はエイリアス（Send As）を使う
- 注意: `historyId` は保持期間があり、長期間同期が止まると差分取得が失効する。失効を検知したら全件再同期にフォールバックする実装が要る

### ImapAdapter

- `imapflow`（IMAP）＋ `mailparser`（MIMEパース）を使う
- **UIDVALIDITY と 最終UID を必ず永続化する。**取りこぼし・重複を防ぐ核心（→ §4）
- 送信は各社SMTP（`nodemailer`）
- 認証: **Gmail は2025年3月に基本パスワード認証を廃止済み**。IMAP経由で繋ぐならアプリパスワード（2段階認証が前提）か OAuth(XOAUTH2)。独自ドメインのIMAPは通常パスワードで可

### 送信の鉄則

**必ず本来のメールサーバー（Gmail API / 各社SMTP）経由で送る。独自のSMTPサーバーを立てない。**
自前で送ると SPF / DKIM / DMARC の署名が壊れ、送信メールが迷惑メール判定される。共有メール管理システムで最も致命的な事故なので、設計段階で選択肢から外しておく。

---

## 4. IMAP差分取得の設計（取りこぼし・重複の防止）

IMAP の UID は「UIDVALIDITY が同じ間だけ」有効な連番。ここを誤ると、メールが取り込まれない or 二重登録される。

```
1. SELECT でフォルダを開き、サーバーの UIDVALIDITY を取得
2. 保存済み cursor.uidValidity と比較
     ├─ 一致 → cursor.lastUid の次から取得:  UID FETCH (lastUid+1):*
     └─ 不一致 → UID体系がリセットされている。全件を再同期する
3. 取得した各メールを Message-ID で照合し、既存なら登録しない（冪等）
4. 取り込みが「DBへのコミットまで完了してから」 lastUid を更新する
```

**押さえるべき点**

- `lastUid` の更新はDBコミット後。先に更新すると、途中で落ちたときメールが永久に取り込まれない
- Message-ID にユニーク制約を張り、二重取り込みをDB側でも防ぐ（アプリのバグに対する最後の砦）
- 一部のメールサーバーは Message-ID を付けない。無い場合は `(mailbox_id, uid)` で代替キーを生成する
- 初回同期は全件取らず「直近30日」等で区切る。運用開始時に数万通を取りに行って詰まるのを避ける

---

## 5. データモデル

### 5.1 テーブル

| テーブル | 主なカラム | 役割 |
|---|---|---|
| `users` | id, email, name, role | 利用者（〜5人） |
| `mailboxes` | id, name, address, provider(`gmail`/`imap`), credentials_ref, cursor(jsonb), active | 管理対象アドレス（〜3件） |
| `mailbox_members` | mailbox_id, user_id | メールボックス単位のアクセス制御 |
| `threads` | id, mailbox_id, subject, root_message_id, contact_id, **status**, **assignee_id**, **version**, last_message_at | 対応の単位。画面の主役 |
| `messages` | id, thread_id, mailbox_id, direction(`in`/`out`), provider_message_id, **message_id**, in_reply_to, references(text[]), from, to, cc, subject, body_text, body_html, sent_at | メール1通 |
| `attachments` | id, message_id, filename, mime_type, size, storage_key | 実体はR2等。DBには置かない |
| `comments` | id, thread_id, user_id, body, created_at | 社内メモ。**顧客には絶対に送らない** |
| `drafts` | id, thread_id, user_id, body, updated_at, **locked_until** | 下書き。排他制御に使う |
| `templates` | id, name, subject, body, mailbox_id(nullable) | 返信テンプレート |
| `contacts` | id, email, name, company, note | 顧客情報 |
| `audit_logs` | id, user_id, action, target_type, target_id, created_at | 送信・割当・削除の記録 |

`status` は `未対応 / 対応中 / 処理済 / 保留` の4値。`version` は楽観ロック用の整数。

### 5.2 スレッド化のキー設計

**主キーは RFC のヘッダ、Gmail の `threadId` は補助**という順序にする。プロバイダ非依存を保つため。

1. `messages.message_id`（Message-ID ヘッダ）に `(mailbox_id, message_id)` のユニーク制約
2. 親の特定は `In-Reply-To` → 見つからなければ `References` を末尾から遡る
3. Gmail の場合は `provider_thread_id` も保存し、1・2で決まらなかったときの裏付けに使う
4. 上記すべてで決まらない場合のみ、件名の `Re:` `Fwd:` を除去した文字列＋相手アドレスで推測マッチ。**これはフォールバック限定**（別件が同じ件名で誤結合するため）

### 5.3 日本語の全文検索

**PostgreSQL 標準の全文検索（`to_tsvector`）は日本語を分かち書きできない。** そのままでは「山田」で検索しても引っかからない。対処は次のいずれか。

| 方式 | 評価 |
|---|---|
| **PGroonga** | 日本語全文検索の本命。速い。Supabase もサポート。VPS自前DBなら素直に入る |
| pg_bigm | bigram索引。PGroongaより低速だが導入は軽い |
| `pg_trgm` | どこでも使えるが日本語の精度は低い。妥協案 |
| 外部検索エンジン（Meilisearch等） | 別プロセスが増える。〜100通/日には過剰 |

**推奨: PGroonga。** 拡張が入れられない環境を選んでしまうと後で詰むので、DBのホスティング選定時にこの点を先に確認すること。

---

## 6. 二重対応の防止

共有メールを使う最大の理由がこれ。「表示するだけ」では足りず、**書き込み時に競合を検出する**必要がある。

### 三段構え

1. **可視化** — スレッド一覧に担当者とステータスを常時表示。「対応中（山田）」が見えるだけで大半の重複は防げる
2. **下書きの排他** — 返信画面を開いたユーザーが `drafts.locked_until` を数分先に設定して延長し続ける。他ユーザーには「山田さんが返信を作成中です」と表示し、編集を読み取り専用にする。ロックは時限式にして、ブラウザを閉じたまま放置されても自動で解放されるようにする
3. **楽観ロック** — ステータス変更・担当者変更・送信のAPIは `threads.version` を受け取り、`UPDATE ... WHERE id = ? AND version = ?` で更新する。0件更新なら競合とみなし、「他の人が更新しました。再読み込みしてください」を返す

3が最後の砦。1・2はUIの工夫なので、これだけでは同時押しを防げない。

---

## 7. 誤送信の防止

| 施策 | 内容 |
|---|---|
| 送信予約 | 送信ボタン後、実際の送信まで30〜60秒待つ。その間は取り消せる。**最も効果が高い** |
| 宛先の明示確認 | 送信前ダイアログに宛先を全件表示。件数が多い場合は特に強調 |
| 社外ドメインの警告 | 自社ドメイン以外が宛先に含まれる場合に色を変えて警告 |
| 全員返信の明示 | 「全員に返信」時は宛先が増えることを明示。既定は「送信者のみ」にする |
| 社内コメントの分離 | `comments` は送信経路と完全に分離する。同じ入力欄を共用しない（メモを顧客に送る事故を構造的に不可能にする） |

---

## 8. 日本語メール特有の落とし穴

国内メールを扱う場合、ここが自作の最大のリスク。**PoC段階で実データを流して必ず確認すること。**

### 8.1 ISO-2022-JP の文字化け

ISO-2022-JP（いわゆるJISコード）は**エスケープシーケンスで文字集合を切り替える状態を持つ方式**で、Node の定番デコーダ `iconv-lite` が対応していない。国内の古いメーラーや業務システムからのメールで実際に踏む。

- `mailparser` は `iso-2022-jp` / `JIS*` / `EUCJP` を `encoding-japanese` に振り分けて処理する作りになっている
- 一方で **IMAPクライアント側（ヘッダのMIMEデコード）で `Encoding not recognized: 'ISO-2022-JP'` が出る**報告があり、本文は通ってもヘッダで落ちるパターンがある
- 対処: `mailparser` に `node-iconv` を渡す、または件名のMIMEエンコード語を `encoding-japanese` で自前デコードする
- Shift_JIS / CP932 / EUC-JP は `iconv-lite` で扱える

**検証観点**: ISO-2022-JP の本文 / ISO-2022-JP の件名 / Shift_JIS の添付ファイル名 の3つを、実メールで確認する。

### 8.2 添付ファイル名の文字化け

日本語ファイル名は RFC 2231（`filename*=`）と RFC 2047（`=?ISO-2022-JP?B?...?=`）の2方式が混在し、後者は本来ファイル名には使えない非標準だが国内メーラーが実際に送ってくる。両方を受ける実装にする。

### 8.3 送信時のエンコーディング

**送信は UTF-8 で問題ない。** 昔は携帯キャリア向けに ISO-2022-JP で送る配慮が必要だったが、現在は不要。`nodemailer` の既定（UTF-8）のままでよい。

### 8.4 その他

- **HTMLメールのサニタイズ** — 受信HTMLをそのまま描画すると XSS になる。DOMPurify 等で必ず無害化し、外部画像の自動読み込みも既定でブロックする（開封トラッキング対策）
- **携帯キャリアメール** — ヘッダが非標準、Message-ID が無い、本文が空といったケースがある。パース失敗時に例外で同期全体を止めず、当該メールだけ「パース失敗」として保存して先に進む設計にする

---

## 9. セキュリティ・運用

- メール本文は個人情報。DB・バックアップともにアクセス制御を明確にする
- メールアカウントの認証情報（アプリパスワード / OAuthトークン）は暗号化して保存し、リポジトリには絶対に入れない
- 退職者が出たときに、アカウント無効化とアクセス権剥奪ができる導線を用意する
- 送信・担当者変更・削除は `audit_logs` に残す
- 同期ワーカーが停止したことに気づけるよう、最終同期時刻を画面に出す（**サイレント停止が最も怖い**）

---

## 10. 失敗しやすいポイント

1. **同期の信頼性を軽く見る** — 取りこぼし・重複・サイレント停止は、業務メールでは即座に信頼を失う。UIより先にここを固める
2. **文字化けを後回しにする** — 全部作ってから日本語メールを流して破綻するのが最悪。PoCの段階で実データを通す
3. **サーバーレスを選んでしまう** — IMAP常駐と相性が悪く、回避策の実装コストが本体を上回る
