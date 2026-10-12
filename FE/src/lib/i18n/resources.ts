import viPublicSite from './locales/vi/publicSite.json'
import enPublicSite from './locales/en/publicSite.json'
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
import viMarketplace from './locales/vi/marketplace.json'
import viReviewCase from './locales/vi/reviewCase.json'
import enReviewCase from './locales/en/reviewCase.json'
import enMarketplace from './locales/en/marketplace.json'
import viClient from './locales/vi/client.json'
import enClient from './locales/en/client.json'

// Add feature namespaces as each rollout group migrates its screens.
export const resources = {
  vi: {
    home: viHome,
    publicSite: viPublicSite,
    common: viCommon,
    navigation: viNavigation,
    auth: viAuth,
    expertRegistration: viRegistration,
    expert: viExpert,
    drafting: viDrafting,
    admin: viAdmin,
    reviewer: viReviewer,
    aiAssistant: viAiAssistant,
    marketplace: viMarketplace,
    reviewCase: viReviewCase,
    client: viClient,
  },
  en: {
    home: enHome,
    publicSite: enPublicSite,
    common: enCommon,
    navigation: enNavigation,
    auth: enAuth,
    expertRegistration: enRegistration,
    expert: enExpert,
    drafting: enDrafting,
    admin: enAdmin,
    reviewer: enReviewer,
    aiAssistant: enAiAssistant,
    marketplace: enMarketplace,
    reviewCase: enReviewCase,
    client: enClient,
  },
}
