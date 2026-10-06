import viCommon from './locales/vi/common.json'
import enCommon from './locales/en/common.json'
import viNavigation from './locales/vi/navigation.json'
import enNavigation from './locales/en/navigation.json'
import viAuth from './locales/vi/auth.json'
import enAuth from './locales/en/auth.json'
import viRegistration from './locales/vi/expertRegistration.json'
import enRegistration from './locales/en/expertRegistration.json'
import viDashboard from './locales/vi/dashboard.json'
import enDashboard from './locales/en/dashboard.json'
import viExpert from './locales/vi/expert.json'
import enExpert from './locales/en/expert.json'
import viDrafting from './locales/vi/drafting.json'
import enDrafting from './locales/en/drafting.json'
import viAdmin from './locales/vi/admin.json'
import enAdmin from './locales/en/admin.json'

// Add feature namespaces as each rollout group migrates its screens.
export const resources = {
  vi: {
    common: viCommon,
    navigation: viNavigation,
    auth: viAuth,
    expertRegistration: viRegistration,
    dashboard: viDashboard,
    expert: viExpert,
    drafting: viDrafting,
    admin: viAdmin,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    auth: enAuth,
    expertRegistration: enRegistration,
    dashboard: enDashboard,
    expert: enExpert,
    drafting: enDrafting,
    admin: enAdmin,
  },
}
