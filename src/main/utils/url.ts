import { clipboard, dialog, shell } from 'electron'
import config, { ConfigKey } from '../config'

export function cleanURLFromGoogle(url: string): string {
  if (!url.includes('google.com/url')) {
    return url
  }

  return new URL(url).searchParams.get('q') ?? url
}

export async function openExternalUrl(url: string): Promise<void> {
  const cleanURL = cleanURLFromGoogle(url)

  if (config.get(ConfigKey.ConfirmExternalLinks)) {
    const { origin } = new URL(cleanURL)
    const trustedHosts = config.get(ConfigKey.TrustedHosts)

    if (!trustedHosts.includes(origin)) {
      const { response, checkboxChecked } = await dialog.showMessageBox({
        type: 'info',
        buttons: ['Open Link', 'Copy Link', 'Cancel'],
        message: `Do you want to open this external link in your default browser?`,
        checkboxLabel: `Trust all links on ${origin}`,
        detail: cleanURL
      })

      if (response === 1) {
        clipboard.writeText(cleanURL)
        return
      }

      if (response !== 0) return

      if (checkboxChecked) {
        config.set(ConfigKey.TrustedHosts, [...trustedHosts, origin])
      }
    }
  }

  shell.openExternal(cleanURL)
}
