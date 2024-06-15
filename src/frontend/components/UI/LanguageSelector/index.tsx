import React from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from '..'
import { useShallowGlobalState } from 'frontend/state/GlobalStateV2'

export enum FlagPosition {
  NONE = 'none',
  PREPEND = 'prepend',
  APPEND = 'append'
}

interface Props {
  flagPossition?: FlagPosition
  showWeblateLink?: boolean
}

const languageLabels: { [key: string]: string } = {
  ar: 'العربية',
  az: 'آذربایجان دیلی',
  be: 'беларуская мова',
  bg: 'български',
  bs: 'bosanski',
  ca: 'Català',
  cs: 'Čeština',
  de: 'Deutsch',
  el: 'Greek',
  en: 'English',
  es: 'Español',
  et: 'Eesti keel',
  eu: 'Euskara',
  fa: 'فارسی',
  fi: 'Suomen kieli',
  fr: 'Français',
  gl: 'Galego',
  he: 'עברית',
  hu: 'Magyar',
  hr: 'Hrvatski',
  ja: '日本語',
  ko: '한국어',
  id: 'Bahasa Indonesia',
  it: 'Italiano',
  ml: 'മലയാളം',
  nb_NO: 'bokmål',
  nl: 'Nederlands',
  pl: 'Polski',
  pt: 'Português',
  pt_BR: 'Português (Brasil)',
  ro: 'limba română',
  ru: 'Русский',
  sk: 'slovenčina',
  sr: 'српски језик',
  sv: 'Svenska',
  ta: 'தமிழ்',
  tr: 'Türkçe',
  uk: 'украї́нська мо́ва',
  vi: 'tiếng Việt',
  zh_Hans: '简体中文',
  zh_Hant: '正體字'
}

const languageFlags: { [key: string]: string } = {
  ar: '🇸🇦',
  az: '🇦🇿',
  be: '🇧🇾',
  bg: '🇧🇬',
  bs: '🇧🇦',
  ca: '🇪🇸',
  cs: '🇨🇿',
  de: '🇩🇪',
  el: '🇬🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  et: '🇪🇪',
  eu: '🇪🇸',
  fa: '🇮🇷',
  fi: '🇫🇮',
  fr: '🇫🇷',
  gl: '🇪🇸',
  he: '🇮🇱',
  hu: '🇭🇺',
  hr: '🇭🇷',
  ja: '🇯🇵',
  ko: '🇰🇷',
  id: '🇮🇩',
  it: '🇮🇹',
  ml: '🇮🇳',
  nb_NO: '🇳🇴',
  nl: '🇳🇱',
  pl: '🇵🇱',
  pt: '🇵🇹',
  pt_BR: '🇧🇷',
  ro: '🇷🇴',
  ru: '🇷🇺',
  sr: '🇷🇸',
  sk: '🇸🇰',
  sv: '🇸🇪',
  ta: '🇮🇳',
  tr: '🇹🇷',
  uk: '🇺🇦',
  vi: '🇻🇳',
  zh_Hans: '🇨🇳',
  zh_Hant: '🇹🇼'
}

export default function LanguageSelector({
  flagPossition = FlagPosition.NONE,
  showWeblateLink = false
}: Props) {
  const { t, i18n } = useTranslation()
  const { language, setLanguage } = useShallowGlobalState(
    'language',
    'setLanguage'
  )
  const currentLanguage = language || i18n.language || 'en'

  function handleWeblate() {
    return window.api.openWeblate()
  }

  const renderOption = (lang: string) => {
    const flag = languageFlags[lang]
    let label = languageLabels[lang]
    if (flagPossition === FlagPosition.PREPEND) label = `${flag} ${label}`
    if (flagPossition === FlagPosition.APPEND) label = `${label} ${flag}`

    return (
      <option key={lang} value={lang}>
        {label}
      </option>
    )
  }

  let afterSelect = null
  if (showWeblateLink) {
    afterSelect = (
      <a
        data-testid="buttonWeblate"
        onClick={handleWeblate}
        className="smallLink"
      >
        {t('other.weblate', 'Help Improve this translation.')}
      </a>
    )
  }

  return (
    <>
      <SelectField
        htmlId="languageSelector"
        onChange={(event) => setLanguage(event.target.value)}
        value={currentLanguage}
        label={t('setting.language', 'Choose App Language')}
        extraClass="languageSelector"
        afterSelect={afterSelect}
      >
        {Object.keys(languageLabels).map((lang) => renderOption(lang))}
      </SelectField>
    </>
  )
}
