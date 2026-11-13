# Manual voice-over — Gemini TTS in the browser

1. Open https://aistudio.google.com/generate-speech → single speaker, model `gemini-3.8-flash-tts` (or the newest Flash TTS), voice **Mako** for every line.
2. Paste the **Style instructions** once, then each line's text, one at a time.
3. Download each take as `vo/<id>.wav` (exact id), then run:
   `python3 tts.py <lines.json> vo --clean-only`  (removes the end glitch, writes durations.json)

## Style instructions (paste once)

```
You are one friendly Egyptian narrator. Speak natural Egyptian colloquial Arabic (العامية المصرية); say English technical terms the way Egyptian engineers do. Perform any [bracketed] emotion tag, never read it aloud. Read only the line, then stop.
```

## Lines

### `n1` — tone: intimate storytelling, soft and a little tired, like telling a friend a real night, natural brisk conversational pace, no long pauses
```
الساعة اتناشر بالليل… والموبايل مبطّلش رن.
```

### `n2` — tone: relatable, overwhelmed, speeding up a bit as the list grows, natural brisk conversational pace, no long pauses
```
[sighs] رسالة على ماسنجر، وتانية على واتساب، وتعليق «بكام؟» تحت البوست… وانت لوحدك بتحاول تلحق.
```

### `n3` — tone: serious and quiet, the weight of a real loss, natural brisk conversational pace, no long pauses
```
وكل رسالة بتتأخر عليها… عميل بيروح لغيرك.
```

### `n4` — tone: turning point, energy rising, a spark of hope, natural brisk conversational pace, no long pauses
```
[excited] طب تخيّل إن كل ده… يبقى في شاشة واحدة.
```

### `n5` — tone: confident and energetic, proud reveal, natural brisk conversational pace, no long pauses
```
ده حلم. ماسنجر وإنستجرام وواتساب في inbox واحد. الرسالة توصل، تشوفها، وترد… في ثانيتها.
```

### `n6` — tone: playful and punchy, a cheeky smile on the last part, natural brisk conversational pace, no long pauses
```
حد كتب «بكام؟» تحت البوست؟ ترد علني يشوفه الكل، أو تبعتله في الخاص بضغطة. والسبام؟ تخفيه وخلاص.
```

### `n7` — tone: smooth and persuasive, easy flow, natural brisk conversational pace, no long pauses
```
وكل منتج ليه صفحة بيع جاهزة للإعلان. العميل يدوس، يشوف العرض، ويطلب في خطوة واحدة… والدفع عند الاستلام.
```

### `n8` — tone: brisk and satisfying, momentum, natural brisk conversational pace, no long pauses
```
الأوردر وصل؟ توافق بضغطة، والشحنة تتحجز لوحدها، والعميل يتابع طلبه على واتساب لحد باب البيت.
```

### `n9` — tone: calm pride, warm and grounded, natural brisk conversational pace, no long pauses
```
ولما اليوم يخلص… أرقامك قدامك. بعت كام، كسبت كام، وإيه اللي بيبيع أكتر.
```

### `n10` — tone: warm, relieved, smiling, callback to the opening night, natural brisk conversational pace, no long pauses
```
[chuckles] والساعة اتناشر بالليل؟ بقت وقتك انت.
```

### `n11` — tone: uplifting finale, strong and clear, a confident invitation, natural brisk conversational pace, no long pauses
```
حلم… متجرك، طلباتك، وكل عملاءك في مكان واحد. ابدأ النهارده.
```
