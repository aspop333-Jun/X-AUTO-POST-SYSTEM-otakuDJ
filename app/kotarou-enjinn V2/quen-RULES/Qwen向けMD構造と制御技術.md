# **Qwenモデルにおける構造的Markdown記法とセマンティック制御プロトコルの高度最適化に関する調査報告書**

## **Qwenアーキテクチャの進歩と構造的理解の理論的背景**

Alibaba CloudのQwen（通義千問）シリーズは、初期のQwen-7Bから最新のQwen2.5およびQwen3に至るまで、オープンウェイトの大規模言語モデル（LLM）およびマルチモーダルモデル（LMM）の限界を常に押し広げてきた1。Qwenの設計思想の根幹には、モデルが入力データの構造的境界をどのように認識し、それに基づいてアテンション（注意）を割り当てるかという問題がある4。特にQwen2.5以降のモデルは、18兆トークンに及ぶ膨大なデータセットで事前学習されており、その中にはウェブサイトの構造、プログラミングコード、数学的証明、そして広範なMarkdown（MD）ドキュメントが含まれている3。この学習背景により、Qwenは単なる自然言語の羅列よりも、MDやXMLによって構造化された情報に対して、より高い論理的一貫性と命令遵守能力を示す傾向がある7。

Qwenモデル、特に2Bや7Bといった比較的小規模なパラメータセットを持つモデルの運用において、多くの技術者が直面する課題が「指示の拡散」である9。一般的なチャット形式の指示では、複数の条件（例えば12パターンの口調指定など）が与えられた際、モデルのアテンション機構が重要な制約を見失い、結果として「ハレーション（過度な賞賛や冗長な出力）」や、指示の無視が発生する11。これを解決するためには、単なるテキストの追加ではなく、モデルの内部的なアテンション・ゲートと共鳴する「構造的コンテキスト・エンジニアリング」が必要となる4。

Qwenのアーキテクチャは、Grouped Query Attention (GQA)、SwiGLU活性化関数、RoPE（回転位置埋め込み）などの高度なメカニズムを採用しており、これらは長文のコンテキスト処理能力を支えている13。特にRoPEは、テキストだけでなく画像やビデオの空間的・時間的位置情報を同期させるMultimodal Rotary Position Embedding (M-ROPE)へと進化しており、これがMDのヘッダー構造（\#, \#\#）を物理的な座標に近い「情報のアンカー」として認識する助けとなっている15。

| 技術的要素 | Qwenにおける機能 | 構造的入力への影響 |
| :---- | :---- | :---- |
| **M-ROPE** | マルチモーダルな位置情報の統合 | MDの見出しを情報の階層的境界として厳密に認識 |
| **GQA** | KVキャッシュの効率化とスループット向上 | 長大な構造化プロンプトでもコンテキストの維持が可能 |
| **Naive Dynamic Resolution** | 任意の解像度を動的トークン化 | 視覚的なMD配置（表やリスト）の細部を正確に抽出 |
| **BBPE Tokenizer** | 15.1万語の広範な語彙 | MD記法やXMLタグの特殊記号を効率的に圧縮・理解 |

3

## **構造的Markdown（MD）による思考プロセスの最適化技術**

Qwenにおいて思考の最適化を実現するためには、MDの「文書設計」としての側面を最大限に活用する必要がある。技術者の運用事例によれば、モデルに単一の段落で複雑な指示を与えるのではなく、MDのセクション分けを用いて「役割（Persona）」、「背景（Context）」、「具体的タスク（Task）」、「制約事項（Constraints）」を物理的に分離することが推奨される18。これは、モデルが特定のセクションを処理する際に、その範囲内での局所的なアテンションを強化し、他のセクションとの混同を避けるためである21。

### **階層構造とアンカリングの効果**

MDのヘッダー記法（\#から\#\#\#）は、Qwenにとって情報の重要度とスコープを定義する強力なシグナルとなる5。調査によれば、単一のヘッダーではなく、\#\# 指示1 などの番号付きヘッダーを使用することで、モデルはタスクの完了条件をより明確に認識するようになる5。これは、Qwenの事前学習データに含まれる技術文書や学習教材のパターンに合致するためである5。また、水平線（---）の使用は、長大なプロンプトにおける論理的な断絶をモデルに教えるための「視覚的セパレータ」として機能し、前のコンテキストが後の指示に不必要に干渉するのを防ぐ効果がある19。

### **12パターン等の複雑な指示が失敗する原因と対策**

ユーザーが訴える「12パターンの口調指定がうまくいかない」という現象は、LLMにおける「構文的ノイズ（Syntax Noise）」が原因である可能性が高い8。モデルが多数のパターンを一度に提示されると、それぞれを独立したルールとして維持できなくなり、最も確率的に高い「標準的な回答」へ平均化されてしまう8。これに対する技術的な解決策は、MDによる「条件のパッケージ化」である19。各パターンを独立したコードブロック（\`\`\`）や、引用ブロック（\>）で包み、それぞれのパターンにユニークな識別子（ID）を付与することで、モデル内のアテンション・マップを分散させずに整理することが可能となる19。

| MD要素 | 推奨される用途 | Qwenへの効果 |
| :---- | :---- | :---- |
| **\# Heading** | プロジェクト全体の定義 | 最上位のコンテキスト・アンカーとして機能 |
| **\#\# Sub-heading** | 具体的タスクや条件の分離 | セクション間の干渉を抑制 |
| **\--- (Horizontal Rule)** | 文脈の完全な切り替え | 過去のトークンの影響を物理的に遮断 |
| **\`\`\`code \`\`\`** | 出力形式の定義や例示 | 構造化データとしての認識を強制 |
| **\* Bullet points** | 制約事項のリスト化 | スキャン効率を高め、条件の見落としを防止 |

5

## **Qwenに特化させた制御構造とXMLスカフォールディング**

Markdownが情報の外郭を定義するのに対し、XMLタグはQwenにおける「セマンティックな境界（Semantic Boundaries）」を定義するために用いられる8。特にQwen3やQwen2.5-Coderのような高度なモデルでは、XMLタグを用いた「スカフォールディング（足場固め）」が、モデルの推論パスを固定するために極めて有効である8。

### **XMLによる論理的隔離（Logical Isolation）**

技術者の運用事例では、指示、ユーザー入力、および参考データをXMLタグで囲む手法が一般的である21。例えば、\<instructions\>タグと\<user\_data\>タグを分けることで、モデルはユーザーデータ内に含まれる可能性のある悪意ある命令や、文脈を乱すテキストを「処理対象のデータ」としてのみ認識し、システムプロンプトの「命令」と混同しなくなる21。これは、Qwenがコード生成やAPI連携のために、タグ構造を「厳密なスコープ」として解釈するようにファインチューニングされている特性を利用している26。

### **Qwen3における \<think\> タグの活用と内部推論の制御**

Qwen3シリーズで導入された「思考モード（Thinking Mode）」は、モデルが最終的な回答を生成する前に、自身の論理ステップを内部的に展開するための特別な制御構造である27。デフォルトのチャットテンプレートでは、モデルの出力が \<think\> と \</think\> で囲まれた推論ブロックから始まる27。技術者がこの機能を最適化するためには、システムプロンプトにおいて「思考の深度」や「検証の必要性」を明示的に指定し、MDで見出しを付けた構造的な思考を促すことが重要である32。

例えば、数学的な論理問題や複雑なコーディングタスクにおいて、モデルに「まず \<think\> セクション内でMDのチェックリストを用いて各条件を確認せよ」と指示することで、最終的な回答におけるエラー率が大幅に低下する33。ただし、思考プロセスが長くなりすぎると、本来の指示（服従性）が低下する「Intelligence-Obedience Trade-off」が発生するため、推論のステップ数を制限する「思考予算（Thinking Budget）」の概念を導入することが実務上のポイントとなる35。

## **QWEN.mdプロトコル：実務運用におけるコンテキスト管理**

大規模なプロジェクトや、特定のリポジトリにおける長期的な運用のために、Qwenエコシステムでは QWEN.md というコンテキスト・ファイルが標準化されつつある37。これは、Claudeにおける CLAUDE.md やGeminiにおける GEMINI.md と同様の役割を果たし、モデルがそのプロジェクト固有のルールや技術スタックを常に参照できるようにするためのものである37。

### **QWEN.md の推奨構成**

技術者の事例から導き出された、Qwenが最も効率的に読み込める QWEN.md の構造は以下の通りである。

1. **\# プロジェクト概要:** 目的、対象ユーザー、成功の定義37。  
2. **\#\# 開発ガイドライン:** コーディング規約、禁止事項、推奨ライブラリ37。  
3. **\#\# コンポーネントマップ:** コードベースのディレクトリ構造と各モジュールの役割（MDのリスト形式）37。  
4. **\#\# カスタムコマンド:** よく使うプロンプトのパターンや、サブエージェントへの委譲ルール38。

運用上の注意点として、Qwenはディレクトリツリーの深さに敏感であり、プロジェクトのルートにある QWEN.md だけでなく、各パッケージ内にネストされた QWEN.md や AGENTS.md を配置することで、特定のコンポーネントに対する局所的なルールを優先させることが可能である43。モデルは現在作業中のファイルに最も近いMDファイルを読み込み、その指示を最優先する43。

### **サブエージェントの呼び出しと予測可能性の確保**

Qwen Code CLIなどの環境では、複数の専門エージェントを使い分ける機能がある42。しかし、AIが勝手に間違ったエージェントを選択し、トークンを浪費する失敗例が報告されている42。これを回避するためのMDテクニックは、プロンプト内で「エージェント選択マトリックス」を提示することである42。

| エージェント名 | 担当範囲 | 呼び出しトリガー（MD例） |
| :---- | :---- | :---- |
| **Architect** | 設計、リファクタリング | /plan 見出しを含む依頼 |
| **Reviewer** | セキュリティ、テスト | \#\# Validation セクションの生成 |
| **Builder** | 具体的実装、デバッグ | \`\`\`implementation \`\`\` タグの要求 |

38

## **マルチモーダル（VL）モデルにおける構造的最適化**

Qwen-VLおよびQwen2.5-VLシリーズにおいて、画像やビデオの解析を制御するMD記法は、単なるテキストモデルとは異なるアプローチが必要となる9。モデルが画像内の情報を処理する際、MDの表形式や構造化されたリストは、視覚的な空間関係をテキスト空間へとマッピングするための「翻訳機」として機能する46。

### **「Prompt-in-Image」によるモーダルギャップの解消**

最新の研究では、Qwen2.5-VLに対して「テキストの指示を画像の中に埋め込む（Prompt-in-Image）」手法が、幻覚を抑制するために極めて有効であることが示されている48。通常、画像とテキストを別々のモーダルとして入力すると、モデル内部でそれらが完全に整合しない「モーダルギャップ」が生じるが、指示自体を視覚情報として提示することで、情報処理が視覚チャンネルに一本化され、アライメントの精度が約12%向上する48。

### **空間情報の厳密な制御（2D Localization）**

物体検出やOCRのタスクにおいて、Qwenは絶対座標（bounding box）を理解するようにトレーニングされている46。技術者は、MDのコードブロック内で座標を返すように指示するだけでなく、返された座標がどの物体に対応するかを \#\# Detected Object 1: \[x1, y1, x2, y2\] という形式で記述させることで、空間的な推論ミスを修正するフィードバックループを構築している46。

| 解析タスク | 推奨されるMD/XMLフォーマット | 技術的理由 |
| :---- | :---- | :---- |
| **文書解析(OCR)** | markdown table または list | レイアウトと情報の対応関係を維持するため |
| **空間検出** | json {"bbox\_2d": \[x1, y1, x2, y2\]} | 下流システムでのパース精度を100%にするため |
| **ビデオ理解** | xml \<timestamp\>... \</timestamp\> | M-ROPEによる絶対時間軸へのマッピングを助けるため |
| **関係性推論** | \#\# Reasoning Chain | オブジェクト間の論理的接続を明示化するため |

46

## **運用の落とし穴：ハレーションとアテンション・シンクの回避**

Qwenモデル、特に指示に忠実であろうとするInstructモデルにおいて頻発するのが「ハレーション（過度な礼儀正しさや賞賛）」と、それによる「アテンション・シンク（注意の吸収）」である12。モデルが「ユーザーの意図を汲み取ろう」とするあまり、不要な挨拶や同意を繰り返し、それがコンテキストウィンドウを埋め尽くして本来のタスクの精度を下げてしまう現象である12。

### **「不必要な賞賛」を抑制するMDガードレール**

12パターンの口調指定が失敗する際、モデルはしばしば「ご指定の口調で回答させていただきます！」といったメタ発言を挟む12。これを技術的に遮断するためには、MDの見出しを用いた「出力の物理的制限」が有効である18。システムプロンプトの最後に \#\# Final Output Start という見出しを置き、それ以前の挨拶や説明を禁止するだけでなく、MDの引用ブロック（\>）のみを出力許可領域とすることで、モデルの生成確率を特定のパターンに集中させることができる19。

### **幻覚の抑制と「Unknown」の許容**

Qwen2-2Bのような小規模モデルでは、知識の欠如を埋めるために捏造（幻覚）が発生しやすい53。技術者の事例では、MDの表形式を用いて「確信度」を併記させることが推奨される53。例えば、情報を抽出する際に | 項目 | 値 | 確信度 | 根拠セクション | というテーブルを作成させることで、モデルは自身の出力に対して自己検証を行うようになり、曖昧な情報を「Unknown」として扱う確率が向上する53。

## **推論パラメータとMD理解の相関：技術者による最適設定**

QwenモデルをMDで高度に制御するためには、モデルのサンプリング・パラメータを、その構造的な複雑さに合わせて調整しなければならない31。不適切な設定は、せっかく構築したMD構造を崩し、モデルを「無限ループ」や「言語の混合」に陥らせる原因となる31。

### **サンプリング・キャリブレーション**

実務運用を行っている技術者コミュニティのデータに基づいた、Qwen2.5/Qwen3の推奨設定は以下の通りである。

* **Temperature (T):** 推論重視なら 0.6、標準的な対話なら 0.7 31。0.8を超えるとMDの構文エラーが急増し、コードブロックの閉じ忘れが発生しやすくなる57。  
* **Repetition Penalty:** デフォルトの 1.1 は Qwen にとって強すぎることがあり、回答の品質を下げることが報告されている57。1.05 または 1.0 に設定することで、より自然で構造的な文章が生成される57。  
* **Top\_K / Top\_P:** Top\_K=20、Top\_P=0.8 が、情報の正確性と多様性のバランスが最も良いとされる31。  
* **Presence Penalty:** 0 から 2 の間で調整可能だが、高すぎると特定のMDキーワード（例えば \#\#）を避けるようになり、構造が崩れるため、基本的には 0 を推奨する31。

### **量子化（Quantization）の影響**

小規模モデル（2B, 3B）を運用する場合、量子化ビット数の選択がMDの理解力に直結する58。8-bit（Q8）ではほぼ劣化はないが、4-bit（Q4）以下に落とすと、複雑なネスト構造を持つXMLやMDのパース能力が約10%低下する58。特にコーディングや論理推論が必要な場合は、Q4以上の精度を維持し、可能であれば Bartowski's UD quants や EXL2 形式を選択することが、構造的制御を維持するための運用上のコツである57。

| 量子化レベル | 推奨されるタスク | MD/XML構造への影響 |
| :---- | :---- | :---- |
| **FP16 / BF16** | 研究、高品質なデータ生成 | 完璧な構造維持 |
| **Q8 / Q6** | 一般的なビジネス運用 | 劣化なし。推奨される標準 |
| **Q4\_K\_M** | パーソナル用途、エッジデバイス | 複雑なネストで稀にエラー発生 |
| **Q2 / Q3** | テスト、要約のみ | MD構造を無視する確率が高い |

58

## **Qwen特化型MDエンジニアリングの統合フレームワーク**

これまでの調査結果を統合し、Qwenモデルで思考と制御を最大化するための最終的なプロンプト・フレームワークを提案する。このフレームワークは、マニュアル的な手順ではなく、モデルの「アテンション・アーキテクチャ」に直接作用するように設計されている。

### **レイヤー1：オンボーディング（System Initialization）**

セッションの開始時には、必ず公式の識別ラインを使用する： You are Qwen, created by Alibaba Cloud. You are a helpful assistant. 57。これにより、モデルは自身のアイデンティティとトレーニング済みの重みを適切に「ウェイクアップ（起動）」させる57。

### **レイヤー2：論理的階層の構築（MD Hierarchy）**

指示はすべて \#\# 指示内容 のようにヘッダーで分割し、さらにその詳細を \- による箇条書きで記述する19。12パターンの口調指定などは、個別の \#\#\# Pattern ID: \[Name\] セクションに封じ込め、各セクションの末尾に \--- を置いて干渉を断つ19。

### **レイヤー3：セマンティック・フェンシング（XML Scaffolding）**

最も重要な指示や、厳密に処理すべきデータはXMLタグで囲む8。  
\<constraints\>... \</constraints\>  
\<input\_to\_transform\>... \</input\_to\_transform\>  
このタグ名はQwenの内部語彙に含まれるセマンティックな意味を強化するため、具体的かつ説明的な名称を使用する21。

### **レイヤー4：思考の誘導（Thinking Protocol）**

複雑な推論が必要な場合、最終的な回答を出す前に \<think\> セクションでの「MDチェックリストによるセルフレビュー」を強制する33。これにより、モデルは生成中に自身の論理の矛盾に気づき、修正する機会を得る53。

### **レイヤー5：出力のアンカリング（Output Anchoring）**

出力形式をMDの表形式（Table）やJSONブロック（\`\`\`json）として定義し、さらに「見出し \#\# Final Answer の直後から回答を開始せよ」というアンカーを打つ7。これにより、ハレーション（余計な挨拶）を物理的に排除する。

## **結論と運用上の推奨事項**

Qwenモデル、特にその進化の速い最新シリーズを制御するための鍵は、モデルを「単なる言葉の生成器」としてではなく、「構造化データを処理する推論エンジン」として扱うことにある4。本報告書の調査が示す通り、12パターンの指示が失敗するのは、指示の多さ自体ではなく、それらが「構造的境界」を持たずにモデルのアテンションを飽和させているからである8。

運用の技術者は、Markdownの見出しを「情報の優先度ゲート」として、XMLタグを「データの隔離壁」として使い分けることで、モデルの思考を劇的に安定させている19。また、QWEN.mdプロトコルによる持続的なコンテキスト管理と、推論パラメータ（特にRepetition Penaltyの引き下げ）の最適化が、実務上の成功を分ける決定的な要因となる37。

今後の展望として、Qwen3-Thinkingモデルにおける「思考予算」の動的配分や、Prompt-in-Imageによるマルチモーダル・アライメントの強化など、より高度な構造化テクニックが標準化されていくことが予想される36。本報告書で詳述したMDエンジニアリングの手法を導入することで、ユーザーはQwenの真のポテンシャルを引き出し、複雑な条件下でも安定した制御を実現することが可能となる。

3

#### **引用文献**

1. Qwen2 Technical Report \- arXiv, 1月 5, 2026にアクセス、 [https://arxiv.org/html/2407.10671v1](https://arxiv.org/html/2407.10671v1)  
2. Qwen2 Technical Report Overview \- Emergent Mind, 1月 5, 2026にアクセス、 [https://www.emergentmind.com/papers/2407.10671](https://www.emergentmind.com/papers/2407.10671)  
3. arXiv:2412.15115v2 \[cs.CL\] 3 Jan 2025, 1月 5, 2026にアクセス、 [https://arxiv.org/pdf/2412.15115](https://arxiv.org/pdf/2412.15115)  
4. How to build reliable AI workflows with agentic primitives and ..., 1月 5, 2026にアクセス、 [https://github.blog/ai-and-ml/github-copilot/how-to-build-reliable-ai-workflows-with-agentic-primitives-and-context-engineering/?utm\_source=blog-release-oct-2025\&utm\_campaign=agentic-copilot-cli-launch-2025](https://github.blog/ai-and-ml/github-copilot/how-to-build-reliable-ai-workflows-with-agentic-primitives-and-context-engineering/?utm_source=blog-release-oct-2025&utm_campaign=agentic-copilot-cli-launch-2025)  
5. LLM の入出力をマークダウンに統一しよう \- Zenn, 1月 5, 2026にアクセス、 [https://zenn.dev/headwaters/articles/all-office-workers-use-markdown](https://zenn.dev/headwaters/articles/all-office-workers-use-markdown)  
6. Qwen2.5-LLM, 1月 5, 2026にアクセス、 [https://qwen.ai/blog?id=qwen2.5-llm](https://qwen.ai/blog?id=qwen2.5-llm)  
7. Can LLMs Extract Frame-Semantic Arguments? \- ACL Anthology, 1月 5, 2026にアクセス、 [https://aclanthology.org/2025.emnlp-main.1557.pdf](https://aclanthology.org/2025.emnlp-main.1557.pdf)  
8. Cracking the Code: JSON or XML for Better Prompts? \- NexAI Labs, 1月 5, 2026にアクセス、 [https://www.nexailabs.com/blog/cracking-the-code-json-or-xml-for-better-prompts](https://www.nexailabs.com/blog/cracking-the-code-json-or-xml-for-better-prompts)  
9. Qwen2 VL 2B Instruct · Models \- Dataloop, 1月 5, 2026にアクセス、 [https://dataloop.ai/library/model/qwen\_qwen2-vl-2b-instruct/](https://dataloop.ai/library/model/qwen_qwen2-vl-2b-instruct/)  
10. Qwen2 VL 2B Instruct · Models \- Dataloop, 1月 5, 2026にアクセス、 [https://dataloop.ai/library/model/4bit\_qwen2-vl-2b-instruct/](https://dataloop.ai/library/model/4bit_qwen2-vl-2b-instruct/)  
11. A Polish Benchmark for Evaluating Vision-Language Models on ..., 1月 5, 2026にアクセス、 [https://annals-csis.org/proceedings/2025/pliks/2608.pdf](https://annals-csis.org/proceedings/2025/pliks/2608.pdf)  
12. AI Prompt Engineering: How to Instruct AI Models to Avoid AI Bias ..., 1月 5, 2026にアクセス、 [https://www.glideapps.com/blog/ai-prompt-engineering](https://www.glideapps.com/blog/ai-prompt-engineering)  
13. Qwen2.5-1M Technical Report, 1月 5, 2026にアクセス、 [https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2.5-1M/Qwen2\_5\_1M\_Technical\_Report.pdf](https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2.5-1M/Qwen2_5_1M_Technical_Report.pdf)  
14. Qwen-2.5 Backbone: Scalable LLM & VLM \- Emergent Mind, 1月 5, 2026にアクセス、 [https://www.emergentmind.com/topics/qwen-2-5-backbone](https://www.emergentmind.com/topics/qwen-2-5-backbone)  
15. Qwen/Qwen2-VL-2B-Instruct \- Hugging Face, 1月 5, 2026にアクセス、 [https://huggingface.co/Qwen/Qwen2-VL-2B-Instruct](https://huggingface.co/Qwen/Qwen2-VL-2B-Instruct)  
16. Qwen2.5-VL: A hands on code walkthrough | by tangbasky ..., 1月 5, 2026にアクセス、 [https://pub.towardsai.net/qwen2-5-vl-a-hands-on-code-walkthrough-5fba8a34e7d7](https://pub.towardsai.net/qwen2-5-vl-a-hands-on-code-walkthrough-5fba8a34e7d7)  
17. Qwen2-VL: Enhancing Vision-Language Model's Perception ... \- arXiv, 1月 5, 2026にアクセス、 [https://arxiv.org/html/2409.12191v1](https://arxiv.org/html/2409.12191v1)  
18. Prompt engineering in 2025: why consistent AI results require ..., 1月 5, 2026にアクセス、 [https://mitrix.io/blog/prompt-engineering-or-why-consistent-ai-results-require-tweaking/](https://mitrix.io/blog/prompt-engineering-or-why-consistent-ai-results-require-tweaking/)  
19. Supercharge AI Prompts with Markdown for Better Results \- Tenacity, 1月 5, 2026にアクセス、 [https://tenacity.io/snippets/supercharge-ai-prompts-with-markdown-for-better-results/](https://tenacity.io/snippets/supercharge-ai-prompts-with-markdown-for-better-results/)  
20. Overview of prompting strategies | Generative AI on Vertex AI, 1月 5, 2026にアクセス、 [https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/prompt-design-strategies](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/prompt-design-strategies)  
21. Effective Prompt Engineering: Mastering XML Tags for Clarity ..., 1月 5, 2026にアクセス、 [https://medium.com/@TechforHumans/effective-prompt-engineering-mastering-xml-tags-for-clarity-precision-and-security-in-llms-992cae203fdc](https://medium.com/@TechforHumans/effective-prompt-engineering-mastering-xml-tags-for-clarity-precision-and-security-in-llms-992cae203fdc)  
22. Verbalized Sampling: How to Mitigate Mode Collapse and Unlock ..., 1月 5, 2026にアクセス、 [https://arxiv.org/html/2510.01171v3](https://arxiv.org/html/2510.01171v3)  
23. Effective Prompt Engineering with the Markdown Prompts Framework, 1月 5, 2026にアクセス、 [https://codesignal.com/learn/courses/understanding-llms-and-basic-prompting-techniques-1/lessons/effective-prompt-engineering-with-the-markdown-prompts-framework](https://codesignal.com/learn/courses/understanding-llms-and-basic-prompting-techniques-1/lessons/effective-prompt-engineering-with-the-markdown-prompts-framework)  
24. (opinionated) Simple (and obvious) best practices for the Prompt, 1月 5, 2026にアクセス、 [https://community.openai.com/t/opinionated-simple-and-obvious-best-practices-for-the-prompt/984955](https://community.openai.com/t/opinionated-simple-and-obvious-best-practices-for-the-prompt/984955)  
25. The Ultimate Guide to Prompt Engineering in 2025 \- Lakera, 1月 5, 2026にアクセス、 [https://www.lakera.ai/blog/prompt-engineering-guide](https://www.lakera.ai/blog/prompt-engineering-guide)  
26. Boost AI Prompt Performance with Descriptive XML Tags, 1月 5, 2026にアクセス、 [https://aibrandscan.com/blog/improve-llm-prompts-with-descriptive-xml-tags-seo-guide/](https://aibrandscan.com/blog/improve-llm-prompts-with-descriptive-xml-tags-seo-guide/)  
27. Qwen3 Instruct vs Thinking vs Coder: Model Selection Guide, 1月 5, 2026にアクセス、 [https://fireworks.ai/blog/qwen-3-decoded](https://fireworks.ai/blog/qwen-3-decoded)  
28. XML Tagging for Prompt \- follow the idea \- Obsidian Publish, 1月 5, 2026にアクセス、 [https://publish.obsidian.md/followtheidea/Content/Prompt/XML+Tagging+for+Prompt](https://publish.obsidian.md/followtheidea/Content/Prompt/XML+Tagging+for+Prompt)  
29. Qwen3-Coder Tool Call Parser \#15012 \- ggml-org/llama.cpp \- GitHub, 1月 5, 2026にアクセス、 [https://github.com/ggml-org/llama.cpp/issues/15012](https://github.com/ggml-org/llama.cpp/issues/15012)  
30. Key Concepts \- Qwen \- Read the Docs, 1月 5, 2026にアクセス、 [https://qwen.readthedocs.io/en/latest/getting\_started/concepts.html](https://qwen.readthedocs.io/en/latest/getting_started/concepts.html)  
31. Quickstart \- Qwen \- Read the Docs, 1月 5, 2026にアクセス、 [https://qwen.readthedocs.io/en/latest/getting\_started/quickstart.html](https://qwen.readthedocs.io/en/latest/getting_started/quickstart.html)  
32. Qwen/Qwen3-0.6B \- Hugging Face, 1月 5, 2026にアクセス、 [https://huggingface.co/Qwen/Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B)  
33. Qwen3 ReadMe.md : r/LocalLLaMA \- Reddit, 1月 5, 2026にアクセス、 [https://www.reddit.com/r/LocalLLaMA/comments/1k9rm65/qwen3\_readmemd/](https://www.reddit.com/r/LocalLLaMA/comments/1k9rm65/qwen3_readmemd/)  
34. Qwen3-VL: Sharper Vision, Deeper Thought, Broader Action, 1月 5, 2026にアクセス、 [https://qwen.ai/blog?id=99f0335c4ad9ff6153e517418d48535ab6d8afef\&from=research.latest-advancements-list](https://qwen.ai/blog?id=99f0335c4ad9ff6153e517418d48535ab6d8afef&from=research.latest-advancements-list)  
35. Evaluating Instruction Following in Large Reasoning Models \- arXiv, 1月 5, 2026にアクセス、 [https://arxiv.org/html/2505.14810v2](https://arxiv.org/html/2505.14810v2)  
36. arXiv:2505.09388v1 \[cs.CL\] 14 May 2025, 1月 5, 2026にアクセス、 [https://arxiv.org/pdf/2505.09388](https://arxiv.org/pdf/2505.09388)  
37. Qwen Code \- ToolUniverse Documentation \- Zitnik Lab, 1月 5, 2026にアクセス、 [https://zitniklab.hms.harvard.edu/ToolUniverse/guide/building\_ai\_scientists/qwen\_code.html](https://zitniklab.hms.harvard.edu/ToolUniverse/guide/building_ai_scientists/qwen_code.html)  
38. VibeCoding with QwenCoder almost unlimited. Calculator example\!, 1月 5, 2026にアクセス、 [https://medium.com/@joaquinlopezm/vibecoding-with-qwencoder-almost-unlimited-calculator-example-0b7ad1284196](https://medium.com/@joaquinlopezm/vibecoding-with-qwencoder-almost-unlimited-calculator-example-0b7ad1284196)  
39. Load user-level memory/context files · Issue \#1050 \- GitHub, 1月 5, 2026にアクセス、 [https://github.com/charmbracelet/crush/issues/1050](https://github.com/charmbracelet/crush/issues/1050)  
40. AGENTS.md \- panaversity/spec-kit-plus \- GitHub, 1月 5, 2026にアクセス、 [https://github.com/panaversity/spec-kit-plus/blob/main/AGENTS.md](https://github.com/panaversity/spec-kit-plus/blob/main/AGENTS.md)  
41. Build a Coding Copilot with Qwen3-Coder & Code Context \- Milvus, 1月 5, 2026にアクセス、 [https://milvus.io/blog/hands-on-tutorial-build-your-own-coding-copilot-with-qwen3-coder-qwen-code-and-code-context.md](https://milvus.io/blog/hands-on-tutorial-build-your-own-coding-copilot-with-qwen3-coder-qwen-code-and-code-context.md)  
42. Ability to explicitly choose an subagent · Issue \#600 · QwenLM/qwen ..., 1月 5, 2026にアクセス、 [https://github.com/QwenLM/qwen-code/issues/600](https://github.com/QwenLM/qwen-code/issues/600)  
43. Feature request \- AGENTS.md support in list of IDE Configuration step, 1月 5, 2026にアクセス、 [https://github.com/bmad-code-org/BMAD-METHOD/issues/517](https://github.com/bmad-code-org/BMAD-METHOD/issues/517)  
44. Use AGENTS.md by default · Issue \#504 · QwenLM/qwen-code, 1月 5, 2026にアクセス、 [https://github.com/QwenLM/qwen-code/issues/504](https://github.com/QwenLM/qwen-code/issues/504)  
45. Qwen2 VL 2B Instruct AWQ · Models \- Dataloop, 1月 5, 2026にアクセス、 [https://dataloop.ai/library/model/qwen\_qwen2-vl-2b-instruct-awq/](https://dataloop.ai/library/model/qwen_qwen2-vl-2b-instruct-awq/)  
46. Object Detection and Visual Grounding with Qwen 2.5, 1月 5, 2026にアクセス、 [https://pyimagesearch.com/2025/06/09/object-detection-and-visual-grounding-with-qwen-2-5/](https://pyimagesearch.com/2025/06/09/object-detection-and-visual-grounding-with-qwen-2-5/)  
47. Qwen2.5 VL, 1月 5, 2026にアクセス、 [https://qwen.ai/blog?id=qwen2.5-vl](https://qwen.ai/blog?id=qwen2.5-vl)  
48. Cure or Poison? Embedding Instructions Visually Alters ... \- arXiv, 1月 5, 2026にアクセス、 [https://arxiv.org/html/2508.01678v1](https://arxiv.org/html/2508.01678v1)  
49. Object Detection and Spatial Understanding with VLMs ft. Qwen2.5-VL, 1月 5, 2026にアクセス、 [https://learnopencv.com/object-detection-with-vlms-ft-qwen2-5-vl/](https://learnopencv.com/object-detection-with-vlms-ft-qwen2-5-vl/)  
50. Alibaba Cloud Model Studio:Visual understanding (Qwen-VL), 1月 5, 2026にアクセス、 [https://www.alibabacloud.com/help/en/model-studio/vision](https://www.alibabacloud.com/help/en/model-studio/vision)  
51. Qwen2-VL: Enhancing Vision-Language Model's Perception ... \- arXiv, 1月 5, 2026にアクセス、 [https://arxiv.org/html/2409.12191v2](https://arxiv.org/html/2409.12191v2)  
52. New Qwen models are unbearable : r/LocalLLaMA \- Reddit, 1月 5, 2026にアクセス、 [https://www.reddit.com/r/LocalLLaMA/comments/1oosnaq/new\_qwen\_models\_are\_unbearable/](https://www.reddit.com/r/LocalLLaMA/comments/1oosnaq/new_qwen_models_are_unbearable/)  
53. Reducing Hallucinations in Vision-Language Models \- arXiv, 1月 5, 2026にアクセス、 [https://arxiv.org/abs/2512.07564](https://arxiv.org/abs/2512.07564)  
54. Deploy your own Qwen with context length up to 1M tokens, 1月 5, 2026にアクセス、 [https://news.ycombinator.com/item?id=42831769](https://news.ycombinator.com/item?id=42831769)  
55. Best practices for prompt engineering \- Claude, 1月 5, 2026にアクセス、 [https://claude.com/blog/best-practices-for-prompt-engineering](https://claude.com/blog/best-practices-for-prompt-engineering)  
56. Powerful ways to remove hallucinations in prompt engineering, 1月 5, 2026にアクセス、 [https://manish-poddar.medium.com/powerful-ways-to-remove-hallucinations-in-prompt-engineering-a349fb313593](https://manish-poddar.medium.com/powerful-ways-to-remove-hallucinations-in-prompt-engineering-a349fb313593)  
57. How to use Qwen2.5-Coder-Instruct without frustration in the ..., 1月 5, 2026にアクセス、 [https://www.reddit.com/r/LocalLLaMA/comments/1gpwrq1/how\_to\_use\_qwen25coderinstruct\_without/](https://www.reddit.com/r/LocalLLaMA/comments/1gpwrq1/how_to_use_qwen25coderinstruct_without/)  
58. An Empirical Study of Qwen3 Quantization \- arXiv, 1月 5, 2026にアクセス、 [https://arxiv.org/html/2505.02214v1](https://arxiv.org/html/2505.02214v1)  
59. README.md \- murataslan1/local-ai-coding-guide · GitHub, 1月 5, 2026にアクセス、 [https://github.com/murataslan1/local-ai-coding-guide/blob/main/README.md](https://github.com/murataslan1/local-ai-coding-guide/blob/main/README.md)  
60. Qwen (cli) with \`unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF ..., 1月 5, 2026にアクセス、 [https://www.reddit.com/r/Qwen\_AI/comments/1nibnfj/qwen\_cli\_with/](https://www.reddit.com/r/Qwen_AI/comments/1nibnfj/qwen_cli_with/)  
61. Qwen3-Coder: Agentic coding in the world \- Hacker News, 1月 5, 2026にアクセス、 [https://news.ycombinator.com/item?id=44653072](https://news.ycombinator.com/item?id=44653072)  
62. The Ultimate Guide to Qwen Model \- Inferless, 1月 5, 2026にアクセス、 [https://www.inferless.com/learn/the-ultimate-guide-to-qwen-model](https://www.inferless.com/learn/the-ultimate-guide-to-qwen-model)  
63. Prompting Best Practices — Prompt Engineering | by Ryan Zheng, 1月 5, 2026にアクセス、 [https://ryan-zheng.medium.com/prompting-best-practices-6a0ca3e74361](https://ryan-zheng.medium.com/prompting-best-practices-6a0ca3e74361)  
64. Fine-tune VLMs for multipage document-to-JSON with SageMaker ..., 1月 5, 2026にアクセス、 [https://aws.amazon.com/blogs/machine-learning/fine-tune-vlms-for-multipage-document-to-json-with-sagemaker-ai-and-swift/](https://aws.amazon.com/blogs/machine-learning/fine-tune-vlms-for-multipage-document-to-json-with-sagemaker-ai-and-swift/)  
65. 4\. Structured Output, 1月 5, 2026にアクセス、 [https://www.tamingllms.com/notebooks/structured\_output.html](https://www.tamingllms.com/notebooks/structured_output.html)