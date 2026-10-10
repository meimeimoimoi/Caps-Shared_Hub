import viHome from './locales/vi/home.json'
import enHome from './locales/en/home.json'
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
import viReviewer from './locales/vi/reviewer.json'
import enReviewer from './locales/en/reviewer.json'
import viAiAssistant from './locales/vi/aiAssistant.json'
import enAiAssistant from './locales/en/aiAssistant.json'

// Add feature namespaces as each rollout group migrates its screens.
export const resources = {
  vi: {
    home: viHome,
    common: viCommon,
    navigation: viNavigation,
    auth: viAuth,
    expertRegistration: viRegistration,
    dashboard: viDashboard,
    expert: viExpert,
    drafting: viDrafting,
    admin: viAdmin,
    reviewer: viReviewer,
    aiAssistant: viAiAssistant,
  },
  en: {
    home: enHome,
    common: enCommon,
    navigation: enNavigation,
    auth: enAuth,
    expertRegistration: enRegistration,
    dashboard: enDashboard,
    expert: enExpert,
    drafting: enDrafting,
    admin: enAdmin,
    reviewer: enReviewer,
    aiAssistant: enAiAssistant,
  },
}
