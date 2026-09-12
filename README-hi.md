# dsh-autotier

[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-autotier)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-autotier.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![Node](https://img.shields.io/badge/node-%5E22.19.0%20%7C%7C%20%3E%3D24.0.0-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-autotier/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-autotier/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-autotier?label=version)](https://github.com/PerryLink/dsh-autotier/releases)

[English](README.md) | [简体中文](README-zh.md) | [Español](README-es.md) | [Português](README-pt.md) | **हिन्दी**

DeepSeek Harness के लिए स्वचालित मॉडल-स्तर रूटिंग: एक उपयोगकर्ता निर्देश अंदर
आता है, एक स्तर-निर्णय बाहर आता है — मॉडल हाथ से बदलने की ज़रूरत नहीं।

जटिल आशय (आर्किटेक्चर, योजना, डिबगिंग, बहु-चरण इंजीनियरिंग) को पहले
**strong** स्तर पर योजना बनाई जाती है, फिर **cheap** स्तर पर लागू किया जाता है।
सरल आशय (प्रश्न, पुनर्प्राप्ति, बैच कार्य, दैनिक काम) सीधे **cheap** स्तर पर
डिज़ाइन और कार्यान्वित होता है। cheap स्तर के निष्पादन के दौरान उच्च-जोखिम
टूल कॉल को एक नियतात्मक गार्ड अस्वीकार करता है, और बार-बार विफलता पर TTL
के साथ strong स्तर पर वृद्धि होती है।

- **आधिकारिक रिपॉज़िटरी**: <https://github.com/PerryLink/dsh-autotier>
- **npm**: `dsh-autotier` (सादा नाम, बिना scope)

## संगतता

| Harness | स्थिति |
|---|---|
| `@deepseek-ai/dsh` `0.1.2-rc.1` | संगत; compat वर्कफ़्लो इस लाइन को end-to-end इंस्टॉल करता है |
| `@deepseek-ai/dsh` `0.1.5-rc.2` | संगत; end-to-end सत्यापित (वास्तविक profile, `--dump-config` पंक्ति, keyless smoke) और compat मैट्रिक्स में |
| `@deepseek-ai/cordis` `^4.0.2`, `@deepseek-ai/schemastery` `^3.18.2` | peer आधार |

peer ranges दोनों प्रकाशित लाइनें स्पष्ट रूप से लिखती हैं (`>=0.1.2-rc.1 <0.2.0
|| >=0.1.5-alpha.1 <0.2.0`), क्योंकि जिस range का एकमात्र prerelease comparator
पुराने tuple पर हो वह बाद के alpha को स्वीकार नहीं करता। हर प्रकाशन-लहर पर
रिफ़्रेश होता है।

यह प्लगइन केवल host plane पर रहता है और अपना preset नहीं माँगता: host पंक्ति
हर सत्र पर लागू होती है। *आपके* preset में एक प्रॉम्प्ट खंड वैकल्पिक है और
केवल मॉडल को निर्णय दिखाता है ([इंस्टॉल और अनइंस्टॉल](#इंस्टॉल-और-अनइंस्टॉल) देखें)।

## आपको क्या मिलता है

- **आशय द्वार** — हर turn को नियतात्मक संकेतों (संदेश पाठ, टूल नाम, चित्र की
  उपस्थिति, संवाद की लंबाई) से वर्गीकृत किया जाता है। नियम-परत आत्मविश्वास होने
  पर बिना token खर्च किए निर्णय लेती है; केवल कम-आत्मविश्वास वाला turn सस्ते
  जज मॉडल को बुलाता है, और कभी cooldown के भीतर नहीं।
- **आधिकारिक seam पर लैंडिंग** — निर्णय `agent/request` waterfall पर बदली हुई
  provider/model/effort तिकड़ी लौटाकर लागू होता है। सत्र द्वारा पहले से चुने गए
  सैंपलिंग scalars (`temperature`, `maxTokens`, `stop`) सुरक्षित रहते हैं।
- **प्लान-मोड हैंडऑफ़** — जटिल निर्देश strong स्तर पर प्लान मोड में जाता है;
  प्लान मोड छोड़ने पर कार्यान्वयन के लिए cheap स्तर पर लौट आता है।
- **उच्च-जोखिम गार्ड** — cheap निष्पादन के दौरान विनाशकारी कमांड (`rm -rf`,
  `sudo`, `mkfs`, `git push --force`, क्रेडेंशियल फ़ाइल लेखन, …) को सुधारात्मक
  संदेश के साथ अस्वीकार किया जाता है जो स्तर बढ़ाने को कहता है।
- **विफलता पर वृद्धि** — बार-बार विफलता (वैकल्पिक रूप से समान हस्ताक्षर पर)
  TTL के लिए स्तर बढ़ाती है; मॉडल/मार्ग विफलता पर कॉन्फ़िगर की गई fallback
  श्रृंखला चली जाती है।
- **मैनुअल एस्केप हैच** — `/tier auto|strong|cheap|off` और `tier_status` /
  `tier_route` टूल। जिस सत्र को अपना मॉडल रखना है, उसके लिए
  `routingMode: delegated` (या `/tier off`) रूटिंग बंद कर देता है।
- **`ctx.autotier` सेवा** — एक छोटा पठन-तल (`status`) तथा `autotier/route`
  वीटो waterfall और `autotier/tier-changed` इवेंट, जिससे अन्य प्लगइन निर्णय
  देख या रद्द कर सकें।

## त्वरित शुरुआत

```bash
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

फिर harness शुरू करें (या पुनः आरंभ करें)। पंक्ति आपके
`cordis.patch.yml` में जुड़ जाती है; अगले turn से रूटिंग शुरू हो जाती है।

## इंस्टॉल और अनइंस्टॉल

**npm चैनल**

```bash
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

**git चैनल**

```bash
git clone https://github.com/PerryLink/dsh-autotier.git
cd dsh-autotier && pnpm install && pnpm run build
dsh plugin --profile web add .
```

**वैकल्पिक preset प्रॉम्प्ट खंड।** इसके बिना भी राउटर काम करता है। मॉडल को यह
बताने के लिए कि वह किस स्तर पर चल रहा है, *अपने* preset में एक पंक्ति जोड़ें
(सटीक ब्लॉक `docs/preset-row.md` में है):

```yaml
- insert:
    - id: autotier-prompt
      name: '@deepseek-ai/dsh-system-prompt'
      # sections: [...]  — देखें docs/preset-row.md
```

**अनइंस्टॉल**

```bash
dsh plugin --profile web remove dsh-autotier
```

पंक्ति, उसका settings namespace, उसका कमांड, उसके टूल और सभी listeners
प्लगइन के साथ हट जाते हैं; settings दस्तावेज़ के बाहर कुछ नहीं लिखा जाता।

## कॉन्फ़िगरेशन

हर कुंजी लोड के समय जाँची जाती है; अमान्य मान चुपचाप रूटिंग बंद करने के बजाय
ज़ोर से विफल होता है। इस रिपॉज़िटरी का `cordis.patch.yml` वही कुंजियाँ इनलाइन
दस्तावेज़ित करता है।

| कुंजी | डिफ़ॉल्ट | अर्थ |
|---|---|---|
| `tiers.strong.provider` | `deepseek-official` | योजना/समीक्षा स्तर का provider। |
| `tiers.strong.model` | `deepseek-v4-pro` | strong मॉडल की कैटलॉग id। |
| `tiers.strong.effort` | `high` | एडाप्टर शब्दावली `off` \| `low` \| `high` \| `max`। |
| `tiers.strong.followSession` | `false` | `false` = इस स्तर का effort सत्र के effort को ओवरराइड करता है। |
| `tiers.strong.fallback` | `[]` | स्तर अनुपलब्ध होने पर क्रमबद्ध provider/model लैंडिंग। |
| `tiers.cheap.provider` | `deepseek-official` | कार्यान्वयन स्तर का provider। |
| `tiers.cheap.model` | `deepseek-v4-flash` | cheap मॉडल की कैटलॉग id। |
| `tiers.cheap.effort` | `low` | एडाप्टर शब्दावली `off` \| `low` \| `high` \| `max`। |
| `tiers.cheap.followSession` | `true` | `true` = सत्र का effort विरासत में लें, जिससे स्पष्ट चयन जीते। |
| `tiers.cheap.fallback` | `[]` | स्तर अनुपलब्ध होने पर क्रमबद्ध provider/model लैंडिंग। |
| `tiers.vision.provider` | `deepseek-official` | चित्र वाले turn का provider। |
| `tiers.vision.model` | `deepseek-v4-flash-vision-exp` | कैटलॉग का एकमात्र image-सक्षम मॉडल। |
| `intent.ruleThreshold` | `0.7` | जिस आत्मविश्वास से नियम-परत अकेले निर्णय लेती है। |
| `intent.attemptBand.enabled` | `false` | मध्य पट्टी को cheap पर शुरू कर संकेत मिलने पर बढ़ाना। |
| `intent.attemptBand.tauLow` | `0.45` | attempt-first पट्टी की निचली सीमा। |
| `intent.hysteresis.toStrong` | `0.8` | वह स्कोर जो cheap turn को strong कर देता है। |
| `intent.hysteresis.toCheap` | `0.6` | जिस स्कोर से नीचे strong turn cheap पर लौटता है। |
| `intent.rules` | `[]` | घोषणात्मक नियम तालिका (`when.patterns` / `when.tools` / `when.cwd`, `tier`, `priority`)। |
| `intent.judge.enabled` | `true` | कम-आत्मविश्वास वाले जज की अनुमति। |
| `intent.judge.model` | `''` | जज मॉडल id; खाली = कैटलॉग का पहला `flash` वाला मॉडल। |
| `intent.judge.temperature` | `0` | जज सैंपलिंग तापमान। |
| `intent.judge.maxTokens` | `16` | जज आउटपुट सीमा (एक शब्द में उत्तर)। |
| `intent.judge.cooldownMs` | `30000` | दो जज कॉल के बीच न्यूनतम अंतर। |
| `intent.judge.timeoutMs` | `2000` | जज कॉल का समय-समाप्ति। |
| `intent.judge.unavailableSkip` | `2` | कितनी लगातार विफलताओं के बाद turn जज छोड़ दे। |
| `intent.scenarios` | सभी `true` | प्रति-परिदृश्य स्विच: `coding`, `review`, `planning`, `retrieval`, `batch`, `daily`, `longText`, `multimodal`। |
| `intent.costMode` | `balanced` | अस्पष्टता में निर्णय: `cost-first` \| `quality-first` \| `balanced`। |
| `guard.enabled` | `true` | नियतात्मक उच्च-जोखिम गार्ड सक्रिय करें। |
| `guard.tiers` | `[cheap]` | गार्ड किन स्तरों की रक्षा करता है। |
| `guard.whitelist` | `[]` | कमांड, टूल या पथ-उपसर्ग जो गार्ड को कभी नहीं छूते। |
| `guard.protectedPaths` | `['.dsh','AGENTS.md','package.json','.github/workflows']` | स्व-संशोधन सतहें जो strong समीक्षा ज़रूरी करती हैं। |
| `guard.interopDefend` | `auto` | `dsh-defend` से संबंध: `auto` सहअस्तित्व का ऑडिट, `none` शांत। |
| `escalation.threshold` | `2` | विंडो में इतनी विफलताओं पर स्तर बढ़ता है। |
| `escalation.windowMs` | `60000` | विफलता गिनती की विंडो। |
| `escalation.ttlMs` | `180000` | वृद्धि कितनी देर प्रभावी रहती है। |
| `escalation.fallbackTtlMs` | `300000` | fallback लैंडिंग लेने के बाद का TTL। |
| `escalation.signature` | `true` | हर विफलता के बजाय समान हस्ताक्षर की पुनरावृत्ति गिनें। |
| `routingMode` | `auto` | `auto` \| `strong` \| `cheap` \| `delegated` \| `off`। |

सभी कुंजियाँ `autotier` settings namespace (`$DSH_HOME/settings.yaml`) से
लाइव भी बदली जा सकती हैं; क्रॉस-फ़ील्ड शर्त तोड़ने वाला लेखन सहेजने के समय
अस्वीकार हो जाता है और अंतिम वैध नीति लागू रहती है।

## टूल और सतहें

| सतह | प्रकार | उद्देश्य |
|---|---|---|
| `/tier` | कमांड | `auto` \| `strong` \| `cheap` \| `off` \| `status`; सत्र-स्तरीय ओवरराइड। |
| `tier_status` | टूल | वर्तमान स्तर, मोड, वृद्धि TTL और गार्ड स्थिति। |
| `tier_route` | टूल | बिना अनुरोध भेजे किसी आशय का ड्राई-रन रूटिंग। |
| `ctx.autotier` | सेवा | अन्य प्लगइन के लिए `status()` पठन-तल। |
| `autotier/route` | serial इवेंट | तीसरे पक्ष प्रस्तावित स्तर को वीटो कर सकते हैं। |
| `autotier/tier-changed` | emit इवेंट | प्रभावी स्तर बदलने पर अवलोकनीयता। |

## अनुमतियाँ और डेटा

- **फ़ाइलें** — प्लगइन साझा settings सेवा (`autotier` namespace) के अलावा कुछ
  नहीं पढ़ता या लिखता।
- **नेटवर्क** — एकमात्र आउटबाउंड ट्रैफ़िक जज कॉल है, जो सामान्य `ctx.llm` मार्ग
  और कॉन्फ़िगर किए गए provider से जाता है।
- **सत्र लॉग** — प्लगइन कोई अपना सत्र इवेंट नहीं जोड़ता। रूटिंग का निशान प्लगइन
  logger और लाइव `autotier/tier-changed` बस इवेंट है; एकमात्र जोड़ तब होता है जब
  plan-mode सेवा अनुपलब्ध हो और `plan/mode` फ़ॉलबैक लिखा जाए। `0.1.2-alpha.1` से
  अपने इवेंट प्रकार fail-closed हैं, इसलिए प्लगइन का कोई स्थायी रिकॉर्ड नहीं लिखा
  जाता।
- **रहस्य** — यह प्लगइन कोई क्रेडेंशियल नहीं पढ़ता, दर्ज नहीं करता, संग्रह नहीं करता।

## सुरक्षा सीमाएँ

- गार्ड **गहन रक्षा** है, sandbox नहीं। यह cheap स्तर पर अपने ज्ञात पैटर्न
  अस्वीकार करता है और `dsh-defend`, अनुमोदन सेवा या sandbox नीति को कभी कमज़ोर
  नहीं करता। उन्हें सक्रिय रखें।
- गार्ड केवल `guard.tiers` में दिए स्तरों की रक्षा करता है (डिफ़ॉल्ट cheap)।
  strong turn डिज़ाइन से अवरुद्ध नहीं होता: strong मॉडल स्वयं समीक्षक है।
- यदि गार्ड स्वयं त्रुटि दे, तो कॉल को अनुमति देने के बजाय strong पर बढ़ा दिया
  जाता है — टूटा हुआ गार्ड खुला दरवाज़ा नहीं बनना चाहिए।
- `/tier off` रूटिंग पूरी तरह बंद कर देता है; harness ठीक वैसा ही व्यवहार करता
  है जैसा प्लगइन लगाने से पहले था।

## ज्ञात सीमाएँ

- नियम-परत नियतात्मक है और इसलिए सीमित: किसी जटिल अनुरोध का नया वाक्य cheap पर
  शुरू हो सकता है और विफलता या गार्ड अस्वीकृति के बाद ही बढ़ेगा। कम-आत्मविश्वास
  वाला मध्य भाग जज कॉल से ढका जाता है।
- वृद्धि प्रति-agent और स्मृति में है; harness पुनः आरंभ होने पर `auto` से शुरू
  होती है।
- स्तर बदलने पर उस अनुरोध का provider prompt cache रीसेट होता है, इसलिए बहुत
  सक्रिय सत्रों में बदलाव वाले turn पर थोड़ी cache-miss लागत दिख सकती है;
  hysteresis सीमाएँ इसी को दुर्लभ रखने के लिए हैं।
- प्लगइन संवाद अनुरोध रूट करता है। संपीड़न और शीर्षक निर्माण host के अलग seams
  हैं; समान लागत प्रोफ़ाइल चाहिए तो उनकी मॉडल सेटिंग्स को cheap स्तर के साथ
  संरेखित करें (`docs/supporting-lanes.md`)।
- cheap स्तर पर `followSession: true` का अर्थ है कि सत्र का स्पष्ट मॉडल चयन
  जीतता है; उस स्थिति में cheap स्तर अपना मॉडल नहीं थोप सकता।
- **Settings कार्ड और composer पिल 0.2.0 में आ गए हैं।** कार्ड (रूटिंग मोड, लाइव
  स्तर लैंडिंग, मॉडल कैटलॉग) Plugins सेटिंग्स अनुभाग में है और पिल composer से सत्र
  मोड बदलता है।
- **GUI में चुना गया मॉडल स्वचालित रूप से नहीं पहचाना जाता।** रूटिंग रोकने के लिए
  `routingMode: delegated` या `/tier off` इस्तेमाल करें।
- **फिंगरप्रिंट posteriors केवल स्मृति में रहते हैं** और पुनः आरंभ पर रीसेट होते हैं।
- **attempt-first मध्य पट्टी डिफ़ॉल्ट रूप से बंद है**, कैलिब्रेशन कॉर्पस (v0.2) के
  बाद सक्रिय होगी।

## विकास

```bash
pnpm install
pnpm run typecheck      # स्थानीय harness checkout के type faces के विरुद्ध
pnpm run typecheck:ci   # प्रकाशित 0.1.5-rc.2 faces के विरुद्ध (CI यही चलाता है)
pnpm test
pnpm run build
pnpm run verify:self-contained
pnpm run verify:artifacts
pnpm pack
```

`pnpm run build` `lib/types` (tsc declarations) और `lib/index.js` (tsdown
बंडल) उत्पन्न करता है। परीक्षण सीधे प्रकाशित host पैकेजों का उपयोग करते हैं —
वास्तविक `Context`, वास्तविक session/tools/commands/settings सेवाएँ — साथ ही
एक अस्थायी `cordis.yml` पर एक वास्तविक Loader संयोजन।

## विषय

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `router`,
`model-tier`, `cost`, `auto`.

## योगदानकर्ता

PerryLink. Issues और pull requests:
<https://github.com/PerryLink/dsh-autotier/issues>।

## लाइसेंस

Apache-2.0. देखें [LICENSE](./LICENSE) और
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)।

## PerryLink DSH प्लगइन परिवार

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) द्वारा अनुरक्षित [40 DeepSeek Harness प्लगइनों](https://github.com/PerryLink) में से एक है। अगर यह आपकी मदद करता है, तो बाकी भी करेंगे:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Unified session + workspace + config checkpoints with one-shot `/rewind` | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code, Codex, OpenCode and Hermes sessions, memories and skills into DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Deterministic dataset profiling, cleaning and citation verification | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics: load, spill, compaction and cache hit rate | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Chinese mutual-fund research with sealed, traceable source snapshots | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issue/CI integration with every write approval-gated | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry and company research pack: chain map, policy timeline, company cards | |
| **[dsh-kit](https://github.com/PerryLink/dsh-kit)** | One-command starter pack that installs the core family | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base with hybrid search and citation-aware injection | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local Ollama model discovery and task-based routing with cloud fallback | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions, symbols and rename | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking at the model boundary with a host-side restore table | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | MCP management console: `/mcp` command, Settings tab and trial calls | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory protocol (`ctx.memory` + SQLite) | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse telemetry export from the session event stream | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Runtime-switchable model output styles | |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Declarative allow/deny/ask rules plus a process-level network policy | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-dev knowledge base, agent skill and the `dsh-plugin-dev` CLI toolchain | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-portal](https://github.com/PerryLink/dsh-plugin-portal)** | Zero-dependency static portal rendering the whole plugin family as one page | |
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat, Telegram, Feishu + a session console | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research reports: evidence ledger, manifest seal, per-claim verdicts | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional plugin quality scoring with an evidence-backed leaderboard | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions and workspaces in the Web sidebar with per-pin colors | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Git-backed cross-device session synchronization with keep-both merges | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack plus the `plugin_vet` supply-chain gate | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop: speech-to-text input and text-to-speech replies | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives with a pass/fail matrix | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel plus eleven agent tools | |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair | |
| **[dsh-wechat](https://github.com/pan17/dsh-wechat)** | WeChat ↔ DSH bridge (Tencent iLink bot) developed with [pan17](https://github.com/pan17/dsh-wechat), who hosts the repo | |
| **[dsh-personal-directive](https://github.com/PerryLink/dsh-personal-directive)** | Personal directive injector with a top-bar toggle (fork of liucai2026/dsh-personal-directive) | |
