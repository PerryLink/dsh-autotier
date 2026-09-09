# dsh-autotier

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
| `@deepseek-ai/dsh` `0.1.2-rc.1` | संगत (CI इसी की जाँच करता है और compat वर्कफ़्लो इसे इंस्टॉल करता है) |
| `0.1.3-alpha.1` और उसके बाद की `0.1.x` लाइनें | संगत; स्थानीय `typecheck` checkout के type faces देखता है |
| `@deepseek-ai/cordis` `^4.0.2`, `@deepseek-ai/schemastery` `^3.18.2` | peer आधार |

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
  `tier_route` टूल। सत्र में स्पष्ट रूप से चुना गया मॉडल हमेशा जीतता है
  (`delegated` मोड)।
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
- **सत्र लॉग** — रूटिंग निर्णय और गार्ड अस्वीकृति उन harness लाइनों पर सामान्य
  सत्र इवेंट के रूप में जुड़ते हैं जो अभी प्लगइन इवेंट स्वीकार करती हैं;
  `0.1.2-alpha.1` से शब्दावली fail-closed है, इसलिए निशान प्लगइन logger और
  `autotier/tier-changed` इवेंट तक सीमित हो जाता है।
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

## विकास

```bash
pnpm install
pnpm run typecheck      # स्थानीय harness checkout के type faces के विरुद्ध
pnpm run typecheck:ci   # प्रकाशित 0.1.2-rc.1 faces के विरुद्ध (CI यही चलाता है)
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
