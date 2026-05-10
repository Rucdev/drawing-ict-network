# ネットワーク構成図ツール 設計メモ

## 1. 概要

### 1.1 目的

ネットワーク構成図を Web GUI で作成・編集できるツールを構築する。GUI 上での操作で線を引いたり IP を入力したりできるが、その情報は YAML として永続化し、Git で履歴管理できる。

### 1.2 重要な原則

**コンフィグ構成管理ではなく、構成図ツールである。**

- 既存のコンフィグ管理ツール (Ansible, NAPALM, NetBox 等) と競合しない
- スコープは「**結線・関係性の可視化**」に振り切る
- ルーティングプロトコルの詳細設定 (route-map, prefix-list 等) は扱わない

### 1.3 スコープ外

- リアルタイムの状態監視・観測情報 (BGP セッションの Established/Idle 状態など)
- コンフィグファイルからの自動生成・取り込み
- コンフィグファイルの自動出力

すべて「**設計情報 (intent)**」を扱う。

---

## 2. 主要要件

| 要件 | 内容 |
|---|---|
| GUI 編集 | ノード配置・線引き・IP/属性入力をブラウザ上で |
| YAML 永続化 | 編集結果は YAML として保存 |
| Git 連携 | 履歴管理・差分レビューを Git で行う |
| 多層ビュー | L1/L2/L3 を切り替えて同じトポロジを別の視点で見る |
| 任意ビュー | 管理面/ユーザー面など、任意の集約軸でビューを定義可能 |
| 規模 | 数百ノード規模(エンタープライズ) |
| 機器名一意性 | 組織規約により機器名は全社一意の前提 |

---

## 3. データモデル方針

### 3.1 三層構造

レイヤーごとに別グラフを作るのではなく、**同じ物理トポロジに対する見え方** として扱う。

| 層 | 役割 |
|---|---|
| Core | 物理レイヤー(機器・ポート・ケーブルの事実) |
| Overlay | 論理レイヤー(L2/L3、BGP、OSPF、VXLAN VNI などの設計) |
| View | 表示定義(フィルタ・スタイル・レイアウト) |

### 3.2 ID 戦略

- **ID = 機器名(hostname)**
  - UUID は使わない
  - 組織規約で機器名は一意なので、これで十分
- **ポート参照は `<device>:<port-name>` の文字列**
- **リネームには厳格な制限・承認フロー・バリデーションを設ける**(後述)

### 3.3 集約・分類

- 機器の所属(サイト、ラック、ファブリック、用途)はすべて `attributes` の任意キー・値として扱う
- ハード階層(`site`、`rack` を特別扱い)を持たない
- ビュー側で属性フィルタ + 明示的列挙の両方で任意の集約を作れる

### 3.4 設計の単純さ

ドメインロジックは薄く、本質は **CRUD + バリデーション + 表示** で完結する。DDD 的な複雑な構造は不要。各エンティティは独立した CRUD 単位として扱う。

---

## 4. ファイル構成

```
<repo-root>/
  devices/
    tk1-spine-01/
      device.yaml      # メタ情報 (role, vendor, model, attributes)
      ports.yaml       # 物理ポート定義 (Core)
      l3.yaml          # 機器に閉じた L3 設定 (Loopback, SVI の IP など)
      l2.yaml          # (必要なら) 機器に閉じた L2 設定
      layout.yaml      # ビュー別の座標
    tk1-leaf-01/
      ...

  links/                      # 機器をまたぐ「関係性」を扱う
    cables/                   # L1 物理ケーブル
      prod-fabric/
        spine-leaf.yaml
    logical/                  # L2/L3 論理リンク
      lags.yaml
      l3-p2p.yaml
    bgp/                      # BGP セッション
      underlay-ipv4.yaml
      overlay-evpn.yaml
    ospf/
      area-0.yaml
    vxlan/                    # VXLAN VNI
      l2vni-10100.yaml
      l3vni-50100.yaml

  views/                      # ビュー定義
    physical.yaml
    l3-underlay.yaml
    evpn-overlay.yaml
    admin-plane.yaml
    user-plane.yaml

  schema/                     # JSON Schema
    device.schema.json
    cable.schema.json
    bgp-session.schema.json
    ...
```

### 4.1 設計原則

- **機器ファースト**: 機器に閉じた情報は機器ディレクトリ内
- **機器をまたぐ情報は別ツリー**: ケーブル、論理リンク、プロトコルセッション
- **ディレクトリ名 = 機器名**: 1機器1ディレクトリで Git diff の局所性を最大化
- **レイヤー別ファイル分割**: 機器ディレクトリ内も `l3.yaml`, `l2.yaml` のように責務別

---

## 5. エンティティ定義

### 5.1 機器側 (Device 配下)

#### Device

```yaml
# devices/tk1-spine-01/device.yaml
name: tk1-spine-01
role: spine
vendor: arista
model: 7280R3
attributes:
  site: tokyo-dc1
  rack: A-01
  fabric: prod-fabric-01
  tier: spine
  environment: production
  owner: infra-team
  tags: [core, 24x7-support]
```

#### Port (物理ポートのみ)

```yaml
# devices/tk1-spine-01/ports.yaml
ports:
  - name: Ethernet1
    type: 100G
  - name: Ethernet2
    type: 100G
  - name: Management1
    type: 1G
```

#### L3Config

論理 I/F (Loopback, SVI) の存在と IP 設定をまとめる。
「Loopback は L3 のために存在する」ので、Core 側ではなく L3 側で定義する。

```yaml
# devices/tk1-spine-01/l3.yaml
loopbacks:
  - name: Loopback0
    address: 10.255.0.1/32
    vrf: default
svi:
  - name: Vlan100
    address: 192.168.100.1/24
    vrf: default
```

#### Layout

ビュー別の座標。1機器のレイアウト変更は1ファイル変更で済む。

```yaml
# devices/tk1-spine-01/layout.yaml
positions:
  default:        {x: 100, y: 50}
  l3-underlay:    {x: 300, y: 100}
  evpn-overlay:   {x: 300, y: 100}
```

### 5.2 リンク側 (links/ 配下)

#### Cable (L1)

```yaml
# links/cables/prod-fabric/spine-leaf.yaml
cables:
  - id: cable-tk1-spine-01_E1__tk1-leaf-01_E49
    endpoints:
      - tk1-spine-01:Ethernet1
      - tk1-leaf-01:Ethernet49
    media: SMF
    length_m: 5
```

#### L3Link

```yaml
# links/logical/l3-p2p.yaml
l3_links:
  - id: l3-tk1-spine-01_E1__tk1-leaf-01_E49
    endpoints:
      - device: tk1-spine-01
        interface: Ethernet1
        address: 10.0.0.1/31
      - device: tk1-leaf-01
        interface: Ethernet49
        address: 10.0.0.2/31
    vrf: default
    underlying_cable: cable-tk1-spine-01_E1__tk1-leaf-01_E49
```

#### BGPSession

両端の情報を1箇所に書くため、片側書き忘れバグが原理的に発生しない。

```yaml
# links/bgp/underlay-ipv4.yaml
bgp_sessions:
  - id: bgp-underlay-tk1-spine-01__tk1-leaf-01
    session_type: ebgp
    endpoints:
      - device: tk1-spine-01
        local_as: 65001
        local_address: 10.0.0.1
      - device: tk1-leaf-01
        local_as: 65101
        local_address: 10.0.0.2
    address_families: [ipv4-unicast]
    underlying_link: l3-tk1-spine-01_E1__tk1-leaf-01_E49
```

```yaml
# links/bgp/overlay-evpn.yaml
bgp_sessions:
  - id: bgp-evpn-tk1-spine-01__tk1-leaf-01
    session_type: ibgp
    endpoints:
      - device: tk1-spine-01
        local_as: 65000
        local_address: 10.255.0.1   # Loopback
      - device: tk1-leaf-01
        local_as: 65000
        local_address: 10.255.0.11
    address_families: [l2vpn-evpn]
```

#### OSPFAdjacency

OSPF も「area 参加」より「隣接ペア」で表現することで BGP と一貫させる。
リンク重視の方針に揃う。

```yaml
# links/ospf/area-0.yaml
ospf_adjacencies:
  - id: ospf-tk1-spine-01__tk1-leaf-01
    area: 0.0.0.0
    network_type: point-to-point
    endpoints:
      - device: tk1-spine-01
        interface: Ethernet1
      - device: tk1-leaf-01
        interface: Ethernet49
    underlying_link: l3-tk1-spine-01_E1__tk1-leaf-01_E49
```

#### VxlanVNI

VXLAN は N対N の論理メッシュなので、ペアではなく VTEP リストで表現する。

```yaml
# links/vxlan/l2vni-10100.yaml
vxlan_vni:
  - id: vni-10100
    vni: 10100
    type: l2vni
    name: prod-tenant-a-segment
    vtep_endpoints:
      - device: tk1-leaf-01
        vtep_ip: 10.255.0.11
      - device: tk1-leaf-02
        vtep_ip: 10.255.0.12
      - device: osa1-leaf-01
        vtep_ip: 10.255.1.11
    underlying_protocol: bgp-evpn
```

### 5.3 ビュー側 (views/ 配下)

```yaml
# views/evpn-overlay.yaml
name: EVPN Overlay
description: EVPN BGP セッションと VNI 分布
selection:
  mode: filter            # filter | explicit | hybrid
  match:
    role: [spine, leaf, border-leaf]
    fabric: prod-fabric-01
layers_to_show:
  - type: bgp_sessions
    filter:
      address_families_includes: l2vpn-evpn
  - type: vxlan_vni
node_style:
  color_by: role
  label: name
edge_style:
  color_by: layer
  label_by_layer:
    bgp_sessions: address_families
    vxlan_vni: vni
```

```yaml
# views/physical.yaml
name: Physical
layers_to_show:
  - type: cables
edge_style:
  label: media
```

```yaml
# views/troubleshooting-2026-05.yaml
name: 障害調査用マップ (2026-05)
selection:
  mode: explicit
  nodes:
    - tk1-spine-01
    - tk1-leaf-03
    - osa1-spine-01
  include_links: between_selected
```

### 5.4 リンクの連鎖参照

各論理リンクは `underlying_link` (または `underlying_cable`, `underlying_protocol`) で
配下のレイヤーを参照する。これにより:

- VXLAN VNI → BGP EVPN セッション → iBGP underlay → L3 P2P → 物理ケーブル

のように連鎖的に下位レイヤーまで辿れる。
ビュー切り替え時に「論理を辿って物理を表示」のような操作が可能になる。

---

## 6. リネーム制限とバリデーション

機器名 = ID なので、リネームは全参照の書き換えになる。
複数レイヤーで防御する。

### 6.1 GUI レベル

- デフォルトでは機器名は編集不可
- リネームは別 UI に分離、確認ダイアログを表示
- リネーム実行時は影響範囲(参照箇所一覧)を表示してから確定

### 6.2 バリデーションレベル

- リネーム後にどこかで旧名を参照している箇所がないか検証
- 参照整合性チェックの一部として実装

### 6.3 Git レベル

- 機器ディレクトリのリネーム (`git mv`) が発生した PR は CODEOWNERS で承認者を要求
- branch protection でマージ条件を設定

### 6.4 命名規則

- JSON Schema の `pattern` で組織標準の正規表現を強制
- 例: `^[a-z]{2,4}\d-(spine|leaf|core|edge)-\d{2}$`
- 新規作成・リネーム両方で検証

---

## 7. バリデーション(三層)

### 7.1 構文レベル

- JSON Schema (YAML Schema) による型・必須・パターン検証
- GUI 保存前 と CI 両方で実行

### 7.2 参照整合性

- ポート参照 `<device>:<port>` の解決
- リンクの両端機器・I/F が存在するか
- `underlying_link` 等の参照が解決可能か
- 孤立ポートの検出

### 7.3 意味整合性

- IP 重複チェック(同一 VRF 内)
- VLAN ID 重複
- 両端 I/F のスピード一致
- BGP セッションの local_address が対応する device の loopback/interface に存在するか
- ebgp/ibgp 判定が両端 AS と整合するか

---

## 8. ライフサイクルフック (Create/Update 時の挙動)

DDD の重い構造は不要。シンプルな ActiveRecord ライクな
**「自分のフィールドの自動推定 / 参照解決」** をフックで行う。

### 8.1 フックの方針

- **自分のフィールドの自動推定はする**
  - 例: BGP session で両端 AS が同じなら自動で `session_type: ibgp`
  - 例: L3Link 作成時、両端の I/F から `underlying_cable` を自動推定
- **他プロトコルの自動生成はしない**
  - ケーブルを引いても BGP は自動生成しない
  - 意図に反する自動化を避ける

### 8.2 一括生成 (バルク操作)

「6本の EBGP セッションを一気に作りたい」のようなニーズは、
データモデルの責務ではなく **GUI のバルク操作機能**として提供する。

データモデル上には常に「展開後の最終結果のみ」が並ぶ。
テンプレート参照や継承の概念は YAML に持ち込まない。

---

## 9. 技術スタック

### 9.1 全体構成

| レイヤー | 採用 | 補足 |
|---|---|---|
| Frontend | Next.js (App Router) | 業務スタックと一致 |
| Backend | Next.js Server Actions / Route Handlers | 言語・プロセスを分散させない |
| デプロイ形態 | セルフホスト (Docker Compose) | 社内サーバー or homelab |
| グラフ描画 | React Flow | カスタムノードの自由度重視 |
| 状態管理 | Zustand + SWR | UI 状態 / サーバー状態の分離 |
| UI コンポーネント | shadcn/ui + Tailwind CSS | 機能性重視・装飾控えめ |
| YAML パーサ | yaml (eemeli/yaml) | コメント保持に対応 |
| Git 連携 | simple-git | git CLI ラッパー |
| バリデーション | ajv (JSON Schema) | スキーマを Source of Truth に |
| 型生成 | json-schema-to-typescript | JSON Schema → TS 型を自動生成 |
| 永続化 | YAML ファイル直接 (DB なし) | 数百ノード規模なら十分 |
| 認証 | MVP は無し、後で Auth.js | 社内 LAN 想定 |

### 9.2 採用方針の補足

- **DB なし**: 数百ノード規模なら全 YAML を in-memory で十分高速。SQLite 等を入れると「YAML と DB の同期問題」という新たな複雑性が発生し、Yushi が嫌う「2つの真実が並ぶ状態」になる
- **JSON Schema を Source of Truth に**: zod ではなく ajv を採用。スキーマを言語非依存の独立成果物にすることで、後で他言語(Python 等)からも検証可能
- **Server Actions vs Route Handlers**: 業務での使い分けに準拠
  - Server Actions: form submission など mutate 中心の操作
  - Route Handlers: SWR から叩く GET、外部 API
- **セルフホスト前提**: Vercel 等のサーバーレスは長時間プロセス保持・ファイルシステム保持の制約があり不向き

### 9.3 ディレクトリ構成 (アプリケーション側、案)

```
<app-root>/
  app/                       # Next.js App Router
    (api)/api/...            # Route Handlers
    devices/                 # 機器一覧・詳細ページ
    views/[name]/            # ビュー表示ページ
  lib/
    yaml/                    # YAML 読み書き
    git/                     # Git 操作 (simple-git ラッパー)
    schema/                  # JSON Schema 読み込み・検証
    locking/                 # 楽観的ロック実装
  components/
    flow/                    # React Flow 関連
    forms/                   # 編集フォーム
    ui/                      # shadcn/ui
  schema/                    # JSON Schema 定義 (Source of Truth)
  types/                     # JSON Schema から自動生成された TS 型
```

注: ここはまだ案。実装フェーズで詰める。

---

## 10. 同時編集対策(楽観的ロック)

### 10.1 方針

複数ユーザーが同時編集して衝突するケースに対応する。
SQLite やロックファイルではなく、**ファイルハッシュを用いた楽観的ロック**で実装する。

これは HTTP の `If-Match` / `ETag` パターンと同型で、Web API の同時編集対策として確立した手法。

### 10.2 読み込み時

サーバーは YAML を読みつつ、その時点のファイルハッシュ (SHA-256) を返す。

```typescript
// GET /api/devices/tk1-spine-01
{
  data: { name: "tk1-spine-01", ... },
  version: "sha256:abc123..."
}
```

### 10.3 書き込み時

GUI は読み込み時のハッシュを `expected_version` として送る。
サーバーは書き込み前にファイルハッシュを再計算し、一致を確認。

- 一致 → 書き込み実行、新しいハッシュを返す
- 不一致 → 409 Conflict、GUI は「他のユーザーが先に編集しました。再読み込みしますか?」を表示

```typescript
// PUT /api/devices/tk1-spine-01
{
  data: { ...modified },
  expected_version: "sha256:abc123..."
}
```

### 10.4 複数ファイル更新の擬似アトミシティ

「BGP セッション作成時に両端の機器メタデータも更新」のような複数ファイル更新は、
テンポラリ書き出し + 一括リネームで擬似的なアトミシティを確保する。

```typescript
async function atomicWrite(operations: WriteOp[]) {
  const tempPaths: Map<string, string> = new Map();

  try {
    // Phase 1: 全ファイルをテンポラリに書く
    for (const op of operations) {
      const tempPath = `${op.targetPath}.tmp.${randomId()}`;
      await fs.writeFile(tempPath, op.content);
      tempPaths.set(op.targetPath, tempPath);
    }

    // Phase 2: バージョンチェック (全ファイルのハッシュを再確認)
    for (const op of operations) {
      const currentHash = await hashFile(op.targetPath);
      if (currentHash !== op.expectedHash) {
        throw new ConflictError(op.targetPath);
      }
    }

    // Phase 3: 全部一気にリネーム (POSIX で原子的)
    for (const [target, temp] of tempPaths) {
      await fs.rename(temp, target);
    }
  } catch (error) {
    // ロールバック: テンポラリを削除
    for (const temp of tempPaths.values()) {
      await fs.unlink(temp).catch(() => {});
    }
    throw error;
  }
}
```

`fs.rename` は同一ファイルシステム内なら POSIX で原子的。
複数ファイル全体での完全アトミシティはファイルシステム単独では達成できないが、
Phase 3 が一瞬で終わるため、現実的にはほぼアトミックに見える。

### 10.5 解決しない問題

以下は楽観的ロック単独では解決しないので、別の仕組みで対応する。

| 問題 | 対応 |
|---|---|
| Git レベルの衝突 (他ブランチで編集された) | Git の運用で解決。GUI で pull → conflict があれば人間に提示 |
| 外部エディタで YAML を直接編集 | ファイル監視 (chokidar) で再読み込み、または手動リフレッシュ |
| Git pull で全ファイル更新 | サーバー再起動 or ファイル監視で全件再読み込み |

---

## 11. 未決事項・今後の検討項目

| 項目 | 内容 |
|---|---|
| バリデーションの具体化 | 意味整合性ルールの完全な列挙 |
| ビュー定義の表現力 | フィルタが「シンプルな属性マッチのみ」で本当に十分か (実運用で検証) |
| GUI シナリオ検証 | 機器追加、リンク追加、ビュー作成などの実操作でデータモデルが破綻しないか |
| バルク操作 UI | どの程度のバルク操作機能を GUI で提供するか |
| 既存資産との接続 | NetBox / Ansible inventory からの import の必要性 |
| ファイル監視 | 外部編集や Git pull への対応として chokidar 等の必要性 |

---

## 12. MVP スコープ

### 12.1 方針

最小で **エンドツーエンドが動く** ものを優先。サイクルの幅(エンティティ種別の数)は最小、深さ(1サイクルが完結すること)を優先する。
物理構成図(Device, Port, Cable)が成立する最小セットに絞り、L3 以降は Phase 2 以降で段階追加。

### 12.2 起動とモード

- ワークスペースのパスを環境変数 `WORKSPACE_PATH` で指定
- デフォルトはスタンドアロンモード(YAML 書き込みのみ)
- ワークスペースに `.git` があれば自動的に Git モード(YAML 書き込み + commit)
- 保存ボタンの存在・操作フローは両モード共通(Git モードのみコミットメッセージ入力ダイアログを追加表示)
- モード切替は再起動で反映、MVP では動的検出しない

抽象化として `PersistenceBackend` インターフェースを設け、`FileOnlyBackend` と `GitBackend` を切り替える。

### 12.3 含むもの(In Scope)

**データエンティティ:**
- Device(name, role, vendor, model, attributes は最小限)
- Port(name, type)
- Cable(両端ポート、media、length_m)
- Layout(`default` ビューの座標)
- View(`physical` 1つ、ハードコード可)

**操作:**
- 機器追加: フォーム入力ダイアログ
- 機器編集・削除: ノードクリックで詳細パネル
- ポート追加・編集・削除: 機器詳細パネル内
- ケーブル接続: ポートをドラッグして相手ポートにドロップ
- ポート表示: デフォルトは使用中のみ、結線時に未使用も一時表示
- ノード配置: ドラッグで自由配置、`default` ビュー座標として保存
- 保存: ボタン押下で全変更を一括書き込み

**システム機能:**
- JSON Schema による構文検証(保存時)
- 参照整合性チェック(ポート参照解決)
- ファイルハッシュによる楽観的ロック
- 複数ファイル更新の擬似アトミシティ

### 12.4 含まないもの(Out of Scope, Phase 2 以降)

| 項目 | 後送り理由 |
|---|---|
| L3Config(Loopback, SVI) | 物理だけで MVP 成立 |
| L3Link, BGPSession, OSPFAdjacency, VxlanVNI | 物理 MVP の後で段階追加 |
| 複数ビュー | 1ビューで設計妥当性確認可 |
| ビュー定義の編集 UI | YAML 直書きで十分 |
| フィルタ・検索 | 数十台までは不要 |
| リネーム | 「作成時のみ命名」と割り切る |
| バルク操作 | 個別操作で十分 |
| 認証 | localhost 動作前提 |
| 命名規則の正規表現強制 | 後から JSON Schema に足せる |
| 外部エディタ編集の自動反映 | ファイル監視は後付け |
| Git push の UI | CLI で十分 |

### 12.5 ポート表示の方針

ノード上の Port は React Flow の Handle で表現する。
ポート数が多い機器(48ポートスイッチなど)に対応するため:

- デフォルトでは「使用中ポート」のみ Handle として表示
- 結線開始時(ホバーまたは結線モード起動時)に、未使用ポートも一時的に展開
- ドラッグ中は両ノードの全ポートが見える状態にする

### 12.6 フェーズ分割

| フェーズ | 内容 |
|---|---|
| **Phase 1 (MVP)** | 物理構成図(Device, Port, Cable, Layout, View=physical) |
| Phase 2 | L3 追加(L3Config, L3Link)、BGP 追加(BGPSession) |
| Phase 3 | VXLAN VNI、OSPF |
| Phase 4 | 多ビュー、フィルタ、バルク操作 |
| Phase 5 | 認証、import、push UI、ファイル監視 |

### 12.7 Definition of Done

以下2シナリオが通ったとき、MVP 完成。

**シナリオA: スタンドアロンモード**

1. 空のディレクトリ `/tmp/ws` を `WORKSPACE_PATH` に指定して起動
2. 機器2台を追加(`tk1-spine-01`, `tk1-leaf-01`)、各々ポート4個ずつ
3. ノードをドラッグして好きな位置に配置
4. spine の Ethernet1 ↔ leaf の Ethernet1 でケーブル1本
5. ケーブル属性(SMF, 5m)を入力
6. 「保存」ボタンを押す
7. ブラウザを閉じて再起動
8. 配置・結線・属性すべてが復元されている

**シナリオB: Git 連携モード**

1. `/tmp/ws` で `git init` してから上記同様の操作
2. 「保存」ボタン → コミットメッセージダイアログ → YAML 書き込み + commit
3. 再起動後、状態が復元されている
4. `git log` でコミットが見える、`git diff` で各 YAML が読める

---

## 13. 議論の経緯メモ

設計過程で出てきた重要な判断ポイント:

1. **L1/L2/L3 の関係**: 別グラフではなく「同じトポロジへの見え方」で扱う
2. **ファイル分割**: 機器ごとにディレクトリ、ケーブル等は別ツリー
3. **集約軸**: サイト/ラックを特別扱いせず、属性ベースで自由に集約
4. **ID**: UUID を一旦採用したが、機器名一意の規約があるため hostname に戻した
5. **観測情報**: スコープ外に明確化(構成図ツールであり監視ツールではない)
6. **ルーティングネイバー**: コンフィグから読むのではなく「設計情報」として扱う
7. **リンク表現**: 機器ファーストの neighbor 配列ではなく、ペア単位の論理リンクとして扱う
8. **テンプレート機能**: 独立した機能ではなく、各エンティティの create フックで吸収
9. **アーキテクチャ**: DDD ではなくシンプルな CRUD で十分
10. **Backend**: Next.js 単独 (Server Actions / Route Handlers)、別言語サーバーは置かない
11. **グラフ描画**: Cytoscape.js ではなく React Flow (カスタムノードの自由度)
12. **永続化**: SQLite を一度検討したが、選んだ動機 (同時編集・トランザクション) は SQLite では本質的に解決しない (YAML が真である限り、ファイル I/O は DB トランザクションに参加できない)。代わりにファイルハッシュベースの楽観的ロックで対応
13. **同時編集**: HTTP の If-Match / ETag パターンを踏襲、複数ファイル更新はテンポラリ + 一括リネームで擬似アトミック
14. **MVP 範囲**: 物理構成図(Device, Port, Cable)に絞る。L3 以降は Phase 2 へ。「サイクルの幅は最小、深さ(エンドツーエンドが回ること)を優先」という方針
15. **ポート UI**: 48ポート機器でも破綻しないよう「デフォルトは使用中のみ表示、結線時に未使用も展開」を採用
16. **保存タイミング**: 自動保存ではなく手動保存ボタン。「明示的な操作で状態が変わる」という UX 思想
17. **Git のオプション化**: Git は必須ではない。スタンドアロンモード(YAML 書き込みのみ)と Git モードを `.git` 検出で自動切替。両モードで保存ボタンの UX は共通(Git なしを「下位機能」ではなく「同等のモード」として扱う)
