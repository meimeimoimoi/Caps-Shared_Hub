import { Trans } from 'react-i18next'
import type { ParseKeys } from 'i18next'

/** Only the approved emphasis components can be rendered from home translations. */
export function HomeText({ i18nKey }: { i18nKey: ParseKeys<'home'> }) {
  return (
    <Trans
      ns="home"
      i18nKey={i18nKey}
      components={{
        em: <em />,
        b: <b />,
        br: <br />,
        quiet: <em className="quiet" />,
        flag: <span className="flag" />,
      }}
    />
  )
}
