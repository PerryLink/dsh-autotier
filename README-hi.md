# dsh-autotier

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-autotier
```


[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-autotier)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-autotier.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19.0%20%7C%7C%20%3E%3D24.0.0-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-autotier/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-autotier/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-autotier?label=version)](https://github.com/PerryLink/dsh-autotier/releases)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-autotier?metric=downloads&lang=hi)](https://dshfind.com/hi/plugins/PerryLink/dsh-autotier?ref=badge)

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


**📖 इकोसिस्टम नॉलेज बेस** — मापे गए आँकड़े, मार्केटिंग नहीं: [डेवलपमेंट गाइड · चयन डेटा · रखरखाव मानदंड](https://perrylink.github.io/dsh-plugin-guide/)।

<!-- star-cta -->
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

पंक्ति, उसका कमांड, उसके टूल और सभी listeners प्लगइन के साथ हट जाते हैं।
Plugins पेज से सहेजी गई कॉन्फ़िगरेशन सक्रिय profile patch में रहती है और उस
profile की है, इस प्लगइन की नहीं; पंक्ति हटाने पर वह वहीं अछूती रहती है।

## ⭐ 如果它帮到了你

यह प्लगइन [DSH प्लगइन परिवार](https://github.com/PerryLink) का हिस्सा है (95 प्लगइन, सभी Apache-2.0)। अगर यह उपयोगी लगे, तो **एक स्टार दें** — इससे कोई सुविधा अनलॉक नहीं होती, पर अगला व्यक्ति इसे खोज में आसानी से पा लेता है।

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-autotier?

npm चैनल

git चैनल

![dsh-autotier कार्यप्रवाह आरेख: कॉल → प्लगइन → परिणाम।](docs/assets/dsh-autotier-flow.svg)

*कार्यप्रवाह: कॉल → प्लगइन → परिणाम। नीचे के उदाहरण वास्तविक कमांड सतह का उपयोग करते हैं।*


*वही रन, एनिमेटेड।*

## संगतता

| Harness | स्थिति |
|---|---|
| `@deepseek-ai/dsh` `0.1.2-rc.1` | अब समर्थित नहीं; वह लाइन उस `SettingsForms` अनुबंध से पुरानी है जिस पर यह प्लगइन अब लक्ष्य करता है |
| `@deepseek-ai/dsh` `0.1.5-rc.2` | अब समर्थित नहीं; उसका `settings.register` / `settings/updated` अनुबंध upstream में हटा दिया गया |
| `@deepseek-ai/dsh` `0.1.6-alpha.2` | अब समर्थित नहीं; वही हटाव, `SettingsForms` वाली पहली लाइन |
| `@deepseek-ai/dsh` `0.1.7-rc.2` | **आवश्यक**; मेल खाते checkout (`typecheck`) और प्रकाशित पैकेजों (`typecheck:ci`, 214 टेस्ट) दोनों पर सत्यापित |
| `@deepseek-ai/cordis` `^4.0.3`, `@deepseek-ai/cosmokit` `^1.8.4`, `@deepseek-ai/schemastery` `^3.18.3` | peer आधार |

peer ranges चारों प्रकाशित लाइनें स्पष्ट रूप से लिखती हैं (`>=0.1.6-0 <0.2.0 || >=0.2.0-0 <0.3.0 || >=0.2.1-0 <0.3.0`), क्योंकि जिस range का एकमात्र prerelease comparator
पुराने tuple पर हो वह बाद के alpha को स्वीकार नहीं करता। हर प्रकाशन-लहर पर
रिफ़्रेश होता है। घोषित range जानबूझकर सत्यापित range से व्यापक है: यह दर्ज करती
है कि manifest क्या स्वीकार करता है, यह नहीं कि क्या परखा गया।

**यह रिलीज़ एक breaking adaptation है।** `0.1.6` पीढ़ी के होस्ट ने वह settings
*provider* सीवन हटा दिया जिस पर यह प्लगइन बना था: `@deepseek-ai/dsh-settings-file`
पैकेज अब मौजूद नहीं है, `ctx.settings` अब `SettingsForms` है (schema→form
प्रोजेक्टर, जिसमें `register` नहीं है), और `settings/updated` भी नहीं है। कोई
साझा सतह ऐसी नहीं है जो एक प्लगइन को दूसरे प्लगइन का settings दस्तावेज़ देखने
दे, इसलिए इस प्लगइन का कोई संस्करण दोनों अनुबंध एक साथ सहन नहीं कर सकता।
कॉन्फ़िगरेशन अब होस्ट के volatile-config तंत्र से बहती है; **प्रति-सत्र रूटिंग
मोड** — वही सेटिंग जो रनटाइम पर व्यवहार बदलती है — अपरिवर्तित है।

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

```sh
dsh plugin --profile web add github:PerryLink/dsh-autotier
```

```bash
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

फिर harness शुरू करें (या पुनः आरंभ करें)। पंक्ति आपके
`cordis.patch.yml` में जुड़ जाती है; अगले turn से रूटिंग शुरू हो जाती है।

### उदाहरण

ये वास्तविक प्रवेश बिंदु हैं; इंस्टॉल के बाद एक चलाएँ।

#### विस्तृत उदाहरण

**कमांड**

~~~sh
tier_route
~~~

**इनपुट**

~~~json
{ "text": "Plan the migration of the storage layer end to end" }
~~~

**आउटपुट**

~~~text
{
  "tier": "strong",
  "scenario": "planning",
  "confidence": 0.97,
  "fingerprint": "planning|0|0",
  "reason": "explicit planning intent"
}
~~~

*स्रोत `README.md:248 (Tools & surfaces); tests/tools.spec.ts:96-109; src/tools.ts:80`*

#### विफलता शाखा

**इनपुट**

~~~text
resolveConfig({ tiers: { cheap: { provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high', followSession: false } } })
~~~

**आउटपुट**

~~~text
Error: dsh-autotier: config.tiers strong and cheap resolve to the same landing (deepseek-official/deepseek-v4-pro@high); tiering would be a no-op
~~~

*स्रोत `plugins/dsh-autotier/src/config.ts:377-386; plugins/dsh-autotier/tests/config.spec.ts:87-92; plugins/dsh-autotier/README.md:208-209`*

#### संक्षिप्त उदाहरण

- `tier_status`
- `tier_route`

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
| `tiers.cheap.model` | `deepseek-flash` | cheap मॉडल की कैटलॉग id। |
| `tiers.cheap.effort` | `low` | एडाप्टर शब्दावली `off` \| `low` \| `high` \| `max`। |
| `tiers.cheap.followSession` | `true` | `true` = सत्र का effort विरासत में लें, जिससे स्पष्ट चयन जीते। |
| `tiers.cheap.fallback` | `[]` | स्तर अनुपलब्ध होने पर क्रमबद्ध provider/model लैंडिंग। |
| `tiers.vision.provider` | `deepseek-official` | चित्र वाले turn का provider। |
| `tiers.vision.model` | `deepseek-flash` | कैटलॉग का एकमात्र image-सक्षम मॉडल। |
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

सभी कुंजियाँ Plugins पेज पर इस प्लगइन के कार्ड से लाइव भी बदली जा सकती हैं:
होस्ट नया मान schema के विरुद्ध जाँचता है और उसे `loader/volatile-update` से
कमिट करता है, फिर यह प्लगइन पूरी कॉन्फ़िगरेशन को उसी क्रॉस-फ़ील्ड जज से दोबारा
आँकता है जो माउंट के समय चलता है। क्रॉस-फ़ील्ड शर्त तोड़ने वाला मान (दो tiers
एक ही रूट पर, झूला रोक न पाने वाला hysteresis युग्म, बिना pattern और बिना tool
वाला नियम) अंतिम वैध नीति को चालू रहने देता है, बजाय किसी अनरूटेबल चीज़ को
लागू करने के।

`routingMode` अकेली ऐसी कुंजी है जो लाइव **नहीं** है: वह composition का
डिफ़ॉल्ट है, और रनटाइम स्विच वह प्रति-सत्र override है जो `/tier`, composer
pill और कार्ड का सेलेक्टर लिखते हैं। उसे भी लाइव बनाने से एक ही व्यवहार के दो
मालिक हो जाते।

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
pnpm run typecheck:ci   # प्रकाशित 0.1.7-rc.2 faces के विरुद्ध (CI यही चलाता है)
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

**लागू DSH संस्करण:** `dsh-v0.2.1-rc.2` (यह बिल्ड जिस होस्ट रिलीज़ को लक्षित करता है) पर सत्यापित; आवश्यक `>=0.1.7-alpha.1 <0.2.0`।

## अन्य DSH प्लगइनों के साथ अंतर-संचालनीयता

**DSH `0.2.0-rc.2`** (वह रनटाइम जिसके लिए यह README प्रकाशित है) और 2026-10-05 को सर्वे किए गए उच्च-स्टार प्लगइन सेट के विरुद्ध सत्यापित।

यह प्लगइन अन्य प्लगइनों में **हस्तक्षेप नहीं करता**, उन उच्च-स्टार प्लगइनों सहित जो व्यापक रूप से इंस्टॉल हैं:

- **कोई टूल-नाम टकराव नहीं।** सभी टूल नेमस्पेस युक्त हैं; कोई भी ऐसा नंगा नाम नहीं लेता जो पहले से किसी अंतर्निहित टूल या अन्य प्लगइन का हो।
- **कोई सर्विस-की टकराव नहीं।** यह केवल `autotier` प्रदान करता है; यह key न अंतर्निहित सीम है और न किसी सर्वे किए गए उच्च-स्टार प्लगइन द्वारा प्रदान की जाती है।
- **कोई स्लॉट टकराव नहीं।** यह कोई क्लाइंट slot key पंजीकृत नहीं करता, इसलिए `shadows-shipped-ui` सीट के लिए प्रतिस्पर्धा नहीं करता।
- **कोई HTTP रूट टकराव नहीं।** यह कोई `webServer` प्रीफ़िक्स पंजीकृत नहीं करता।
- **कोई patch-लेयर टकराव नहीं।** बंडल patch केवल अपनी पंक्ति `insert` करता है; कभी किसी अंतर्निहित पंक्ति का `config` ओवरराइड नहीं करता।
- **कोई वैश्विक परिवर्तन नहीं।** यह प्रोटोटाइप नहीं बदलता, `process.env` नहीं लिखता, और वैश्विक fetch dispatcher प्रतिस्थापित नहीं करता।

**साझा ईवेंट लिसनर रचना से ही अहस्तक्षेपी हैं।** यह क्रम-संवेदनशील ईवेंट `agent/created`, `agent/request`, `agent/request-error`, `tools/pre-execute` को `ctx.on()` से देखता है — Cordis का **ब्रॉडकास्ट** पंजीकरण, जहाँ हर लिसनर चलता है और कोई किसी दूसरे को वंचित नहीं कर सकता। **यहाँ प्रत्येक लिसनर `next()` से डेलिगेट करता है**, इसलिए श्रृंखला कभी शॉर्ट-सर्किट नहीं होती:
  - `agent/request` — also used by `dsh-agent-teams` (1923★), which short-circuits by throwing without calling `next()`.
  - `tools/pre-execute` — also used by `cc-safety-net` (1576★).

स्थैतिक प्रमाण: इस रिपॉज़िटरी पर `dsh-plugin-doctor` के K10–K13 सभी `pass` हैं।

## PerryLink DSH Plugin Family

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) के DeepSeek Harness प्लगइन परिवार का हिस्सा है। पूरी सूची नीचे संक्षिप्त रखी गई है ताकि हर README की पहली स्क्रीन छोटी रहे; हर पंक्ति और उसकी स्थिति देखने के लिए इसे खोलें।

<details>
<summary>सभी प्लगइन खोलें</summary>

| प्लगइन | स्थिति |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** |  |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |

</details>
