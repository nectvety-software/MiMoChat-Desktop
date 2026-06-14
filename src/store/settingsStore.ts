import { create } from "zustand";

export type Language =
  | "vi"
  | "en"
  | "ja"
  | "ko"
  | "zh"
  | "fr"
  | "de"
  | "es"
  | "pt"
  | "ru"
  | "ar"
  | "hi"
  | "th"
  | "id"
  | "ms"
  | "tr"
  | "pl"
  | "nl"
  | "it"
  | "sv"
  | "da"
  | "no"
  | "fi"
  | "cs"
  | "sk"
  | "hu"
  | "ro"
  | "bg"
  | "hr"
  | "sl"
  | "uk"
  | "el"
  | "he"
  | "fa"
  | "ur"
  | "bn"
  | "ta"
  | "te"
  | "ml"
  | "kn"
  | "gu"
  | "pa"
  | "sw"
  | "am"
  | "yo"
  | "ig"
  | "ha"
  | "zu"
  | "af"
  | "sq"
  | "hy"
  | "az"
  | "ka"
  | "kk"
  | "uz"
  | "mn"
  | "ne"
  | "si"
  | "my"
  | "km"
  | "lo"
  | "et"
  | "lv"
  | "lt"
  | "mt"
  | "cy"
  | "ga"
  | "is"
  | "mk"
  | "bs";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "error" | "success" | "warning";
  message: string;
  detail?: string;
}

interface SettingsState {
  language: Language;
  translateTarget: Language;
  logs: LogEntry[];
  setLanguage: (lang: Language) => void;
  setTranslateTarget: (lang: Language) => void;
  addLog: (type: LogEntry["type"], message: string, detail?: string) => void;
  clearLogs: () => void;
}

export const LANGUAGES: Record<Language, { label: string; flag: string; systemPrompt: string }> = {
  vi: {
    label: "Tiếng Việt",
    flag: "🇻🇳",
    systemPrompt:
      "Bạn phải trả lời HOÀN TOÀN bằng Tiếng Việt. Không được dùng bất kỳ ngôn ngữ nào khác.",
  },
  en: {
    label: "English",
    flag: "🇺🇸",
    systemPrompt: "You must respond ENTIRELY in English. Do not use any other language.",
  },
  ja: {
    label: "日本語",
    flag: "🇯🇵",
    systemPrompt: "あなたは完全に日本語で回答してください。他の言語は使用しないでください。",
  },
  ko: {
    label: "한국어",
    flag: "🇰🇷",
    systemPrompt: "당신은 완전히 한국어로 답변해야 합니다. 다른 언어를 사용하지 마세요.",
  },
  zh: { label: "中文", flag: "🇨🇳", systemPrompt: "你必须完全用中文回答。不要使用任何其他语言。" },
  fr: {
    label: "Français",
    flag: "🇫🇷",
    systemPrompt: "Vous devez répondre ENTIÈREMENT en français. N'utilisez aucune autre langue.",
  },
  de: {
    label: "Deutsch",
    flag: "🇩🇪",
    systemPrompt:
      "Sie müssen AUSSCHLIESSLICH auf Deutsch antworten. Verwenden Sie keine andere Sprache.",
  },
  es: {
    label: "Español",
    flag: "🇪🇸",
    systemPrompt: "Debes responder ENTERAMENTE en español. No uses ningún otro idioma.",
  },
  pt: {
    label: "Português",
    flag: "🇧🇷",
    systemPrompt: "Você deve responder INTEIRAMENTE em português. Não use nenhum outro idioma.",
  },
  ru: {
    label: "Русский",
    flag: "🇷🇺",
    systemPrompt: "Вы должны отвечать ИСКЛЮЧИТЕЛЬНО на русском языке. Не используйте другие языки.",
  },
  ar: {
    label: "العربية",
    flag: "🇸🇦",
    systemPrompt: "يجب عليك الرد بالكامل باللغة العربية. لا تستخدم أي لغة أخرى.",
  },
  hi: {
    label: "हिन्दी",
    flag: "🇮🇳",
    systemPrompt: "आपको पूरी तरह से हिंदी में उत्तर देना चाहिए। किसी अन्य भाषा का उपयोग न करें।",
  },
  th: { label: "ไทย", flag: "🇹🇭", systemPrompt: "คุณต้องตอบเป็นภาษาไทยทั้งหมด ห้ามใช้ภาษาอื่น" },
  id: {
    label: "Bahasa Indonesia",
    flag: "🇮🇩",
    systemPrompt:
      "Anda harus menjawab SELURUHNYA dalam Bahasa Indonesia. Jangan gunakan bahasa lain.",
  },
  ms: {
    label: "Bahasa Melayu",
    flag: "🇲🇾",
    systemPrompt: "Anda mesti menjawab SEPENUHNYA dalam Bahasa Melayu. Jangan gunakan bahasa lain.",
  },
  tr: {
    label: "Türkçe",
    flag: "🇹🇷",
    systemPrompt: "Tamamen Türkçe yanıt vermelisiniz. Başka dil kullanmayın.",
  },
  pl: {
    label: "Polski",
    flag: "🇵🇱",
    systemPrompt: "Musisz odpowiadać WYŁĄCZNIE po polsku. Nie używaj żadnego innego języka.",
  },
  nl: {
    label: "Nederlands",
    flag: "🇳🇱",
    systemPrompt: "U moet VOLLEDIG in het Nederlands antwoorden. Geen andere taal gebruiken.",
  },
  it: {
    label: "Italiano",
    flag: "🇮🇹",
    systemPrompt: "Devi rispondere INTERAMENTE in italiano. Non usare altre lingue.",
  },
  sv: {
    label: "Svenska",
    flag: "🇸🇪",
    systemPrompt: "Du måste svara HELT på svenska. Använd inte något annat språk.",
  },
  da: {
    label: "Dansk",
    flag: "🇩🇰",
    systemPrompt: "Du skal svare UDELUKKENDE på dansk. Brug ikke andre sprog.",
  },
  no: {
    label: "Norsk",
    flag: "🇳🇴",
    systemPrompt: "Du må svare UTENDELS på norsk. Bruk ikke andre språk.",
  },
  fi: {
    label: "Suomi",
    flag: "🇫🇮",
    systemPrompt: "Sinun täytyy vastata KOKONAAN suomeksi. Älä käytä muita kieliä.",
  },
  cs: {
    label: "Čeština",
    flag: "🇨🇿",
    systemPrompt: "Musíte odpovídat VÝHRADNĚ česky. Nepoužívejte žádný jiný jazyk.",
  },
  sk: {
    label: "Slovenčina",
    flag: "🇸🇰",
    systemPrompt: "Musíte odpovedať VÝLUČNE po slovensky. Nepoužívajte žiadny iný jazyk.",
  },
  hu: {
    label: "Magyar",
    flag: "🇭🇺",
    systemPrompt: "KIZÁRÓLAG magyarul kell válaszolnia. Ne használjon más nyelvet.",
  },
  ro: {
    label: "Română",
    flag: "🇷🇴",
    systemPrompt: "Trebuie să răspunzi EXCLUSIV în limba română. Nu folosi altă limbă.",
  },
  bg: {
    label: "Български",
    flag: "🇧🇬",
    systemPrompt: "Трябва да отговаряТЕ ИЗКЛЮЧИТЕЛНО на български. Не използвайте друг език.",
  },
  hr: {
    label: "Hrvatski",
    flag: "🇭🇷",
    systemPrompt: "Morate odgovarati ISKLJUČIVO na hrvatskom. Ne koristite drugi jezik.",
  },
  sl: {
    label: "Slovenščina",
    flag: "🇸🇮",
    systemPrompt: "Morate odgovarjati IZKLJUČNO v slovenščini. Ne uporabljajte drugih jezikov.",
  },
  uk: {
    label: "Українська",
    flag: "🇺🇦",
    systemPrompt: "Ви повинні відповідати ВИКЛЮЧНО українською мовою. Не використовуйте інші мови.",
  },
  el: {
    label: "Ελληνικά",
    flag: "🇬🇷",
    systemPrompt:
      "Πρέπει να απαντήσετε ΑΠΟΚΛΕΙΣΤΙΚΑ στα ελληνικά. Μην χρησιμοποιήσετε άλλη γλώσσα.",
  },
  he: { label: "עברית", flag: "🇮🇱", systemPrompt: "עליך להשיב אך ורק בעברית. אל תשתמש בשפה אחרת." },
  fa: {
    label: "فارسی",
    flag: "🇮🇷",
    systemPrompt: "شما باید کاملاً به فارسی پاسخ دهید. از هیچ زبان دیگری استفاده نکنید.",
  },
  ur: {
    label: "اردو",
    flag: "🇵🇰",
    systemPrompt: "آپ کو مکمل طور پر اردو میں جواب دینا ہوگا۔ کوئی دوسری زبان استعمال نہ کریں۔",
  },
  bn: {
    label: "বাংলা",
    flag: "🇧🇩",
    systemPrompt: "আপনাকে সম্পূর্ণ বাংলায় উত্তর দিতে হবে। অন্য কোনো ভাষা ব্যবহার করবেন না।",
  },
  ta: {
    label: "தமிழ்",
    flag: "🇱🇰",
    systemPrompt:
      "நீங்கள் முற்றிலும் தமிழில் பதிலளிக்க வேண்டும். வேறு மொழியைப் பயன்படுத்த வேண்டாம்.",
  },
  te: {
    label: "తెలుగు",
    flag: "🇮🇳",
    systemPrompt: "మీరు పూర్తిగా తెలుగులో సమాధానం ఇవ్వాలి. ఇతర భాషలను ఉపయోగించవద్దు.",
  },
  ml: {
    label: "മലയാളം",
    flag: "🇮🇳",
    systemPrompt: "നിങ്ങൾ പൂർണ്ണമായും മലയാളത്തിൽ മറുപടി നൽകണം. മറ്റ് ഭാഷകൾ ഉപയോഗിക്കരുത്.",
  },
  kn: {
    label: "ಕನ್ನಡ",
    flag: "🇮🇳",
    systemPrompt: "ನೀವು ಸಂಪೂರ್ಣವಾಗಿ ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಬೇಕು. ಬೇರೆ ಯಾವುದೇ ಭಾಷೆಯನ್ನು ಬಳಸಬೇಡಿ.",
  },
  gu: {
    label: "ગુજરાતી",
    flag: "🇮🇳",
    systemPrompt: "તમારે સંપૂર્ણ ગુજરાતીમાં જવાબ આપવો જોઈએ. અન્ય કોઈ ભાષાનો ઉપયોગ કરશો નહીં.",
  },
  pa: {
    label: "ਪੰਜਾਬੀ",
    flag: "🇮🇳",
    systemPrompt:
      "ਤੁਹਾਨੂੰ ਪੂਰੀ ਤਰ੍ਹਾਂ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦੇਣਾ ਹੋਵੇਗਾ। ਕੋਈ ਹੋਰ ਭਾਸ਼ਾ ਦੀ ਵਰਤੋਂ ਨਾ ਕਰੋ।",
  },
  sw: {
    label: "Kiswahili",
    flag: "🇹🇿",
    systemPrompt: "Lazima ujibu KABISA kwa Kiswahili. Usitumie lugha nyingine yoyote.",
  },
  am: { label: "አማርኛ", flag: "🇪🇹", systemPrompt: "በሙሉ በአማርኛ መልስ መስጠብ ይገባል። ሌላ ቋንቋ አይጠቀሙም።" },
  yo: {
    label: "Yorùbá",
    flag: "🇳🇬",
    systemPrompt: "Ọ gbọ́dọ̀ dáhùn nípasẹ̀ Yorùbá nìkan. Má lo èdè mìíràn.",
  },
  ig: {
    label: "Igbo",
    flag: "🇳🇬",
    systemPrompt: "Ị ga-ezokwa niile n'asụsụ Igbo. E jiri asụsụ ọzọ mee ihe.",
  },
  ha: {
    label: "Hausa",
    flag: "🇳🇬",
    systemPrompt: "Dole ne ku amsa gaba ɗaya da Hausa. Kar ku yi amfani da wata harshe.",
  },
  zu: {
    label: "isiZulu",
    flag: "🇿🇦",
    systemPrompt: "Kufanele uphendule ngokuphelele ngesiZulu. Ungasebenzisi olunye ulimi.",
  },
  af: {
    label: "Afrikaans",
    flag: "🇿🇦",
    systemPrompt: "Jy moet VOLLEDIG in Afrikaans antwoord. Geen ander taal gebruik nie.",
  },
  sq: {
    label: "Shqip",
    flag: "🇦🇱",
    systemPrompt: "Duhet të përgjigjeni PLOTËSISHT në shqip. Mos përdorni gjuhë tjetër.",
  },
  hy: {
    label: "Հայերեն",
    flag: "🇦🇲",
    systemPrompt: "Դուք պետք է պատասխանեք ԱՄԲՈՂՋՈՒԹՅԱՄԲ հայերեն: Մի օգտագործեք այլ լեզու:",
  },
  az: {
    label: "Azərbaycanca",
    flag: "🇦🇿",
    systemPrompt: "Siz TAMAMİLƏ Azərbaycan dilində cavab verməlisiniz. Başqa dil istifadə etməyin.",
  },
  ka: {
    label: "ქართული",
    flag: "🇬🇪",
    systemPrompt: "თქვენ უნდა უპასუხოთ სრულიად ქართულად. სხვა ენას ნუ გამოიყენებთ.",
  },
  kk: {
    label: "Қазақша",
    flag: "🇰🇿",
    systemPrompt: "Сіз ТОЛЫҚ қазақ тілінде жауап беруіңіз керек. Басқа тілді қолданбаңыз.",
  },
  uz: {
    label: "O'zbekcha",
    flag: "🇺🇿",
    systemPrompt: "Siz TO'LIQ o'zbek tilida javob berishingiz kerak. Boshqa tilni ishlatmang.",
  },
  mn: {
    label: "Монгол",
    flag: "🇲🇳",
    systemPrompt: "Та БҮТЭЛДЭЭ монгол хэлээр хариулна уу. Бусад хэл ашиглахгүй.",
  },
  ne: {
    label: "नेपाली",
    flag: "🇳🇵",
    systemPrompt: "तपाईंले पूर्ण रूपमा नेपालीमा जवाफ दिनुपर्छ। अरू भाषा प्रयोग नगर्नुहोस्।",
  },
  si: {
    label: "සිංහල",
    flag: "🇱🇰",
    systemPrompt: "ඔබ සම්පූර්ණයෙන්ම සිංහලෙන් පිළිතුරු දිය යුතුය. වෙනත් භාෂාවක් භාවිත නොකරන්න.",
  },
  my: {
    label: "မြန်မာ",
    flag: "🇲🇲",
    systemPrompt: "သင်သည် မြန်မာဘာသာဖြင့်သာ ဖြေဆိုရပါမည်။ အခြားဘာသာစကားကို မသုံးပါနဲ့။",
  },
  km: {
    label: "ខ្មែរ",
    flag: "🇰🇭",
    systemPrompt: "អ្នកត្រូវឆ្លើយតបទាំងស្រុងជាភាសាខ្មែរ។ កុំប្រើភាសាផ្សេងទៀត។",
  },
  lo: {
    label: "ລາວ",
    flag: "🇱🇦",
    systemPrompt: "ທ່ານຕ້ອງຕອບສະໝັກໃນພາສາລາວທັງໝົດ. ຢ່າໃຊ້ພາສາອື່ນ.",
  },
  et: {
    label: "Eesti",
    flag: "🇪🇪",
    systemPrompt: "Te peate vastama TÄIELIKULT eesti keeles. Ärge kasutage muud keelt.",
  },
  lv: {
    label: "Latviešu",
    flag: "🇱🇻",
    systemPrompt: "Jums jāatbild PILNĪBĀ latviešu valodā. Neizmantojiet citas valodas.",
  },
  lt: {
    label: "Lietuvių",
    flag: "🇱🇹",
    systemPrompt: "Turite atsakyti IŠSKIRTINAI lietuvių kalba. Nenaudokite kitų kalbų.",
  },
  mt: { label: "Malti", flag: "🇲🇹", systemPrompt: "Trid iweġib b'MALTI biss. Tużax lingwa oħra." },
  cy: {
    label: "Cymraeg",
    flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    systemPrompt: "Rhaid i chi ateb yn LLWYR Cymraeg. Peidiwch â defnyddio iaith arall.",
  },
  ga: {
    label: "Gaeilge",
    flag: "🇮🇪",
    systemPrompt: "Ní mór duit a freagairt go HIOMLÁN i nGaeilge. Ná húsáid teanga eile.",
  },
  is: {
    label: "Íslenska",
    flag: "🇮🇸",
    systemPrompt: "Þú verður að svara ALVEG á íslensku. Ekki nota annað tungumál.",
  },
  mk: {
    label: "Македонски",
    flag: "🇲🇰",
    systemPrompt: "Морате да одговорите ИСКЛУЧИВО на македонски. Не користете друг јазик.",
  },
  bs: {
    label: "Bosanski",
    flag: "🇧🇦",
    systemPrompt: "Morate odgovoriti ISKLJUČIVO na bosanskom. Ne koristite drugi jezik.",
  },
};

export const useSettingsStore = create<SettingsState>((set) => ({
  language: "vi",
  translateTarget: "en",
  logs: [],
  setLanguage: (language) => set({ language }),
  setTranslateTarget: (translateTarget) => set({ translateTarget }),
  addLog: (type, message, detail) =>
    set((state) => ({
      logs: [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          type,
          message,
          detail,
        },
        ...state.logs,
      ].slice(0, 200),
    })),
  clearLogs: () => set({ logs: [] }),
}));
