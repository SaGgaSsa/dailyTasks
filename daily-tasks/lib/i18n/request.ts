import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const headersStore = await headers()
  
  let locale = cookieStore.get('locale')?.value || 'es'
  
  const acceptLanguage = headersStore.get('accept-language')
  if (!cookieStore.get('locale') && acceptLanguage) {
    const preferredLanguages = acceptLanguage.split(',')
    const enMatch = preferredLanguages.find((lang) => lang.startsWith('en'))
    if (enMatch) {
      locale = 'en'
    }
  }

  if (!['en', 'es'].includes(locale)) {
    locale = 'es'
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.ts`)).default,
  }
})
