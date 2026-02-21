/**
 * Event pool barrel export.
 * Split from monolithic events.js during Code Audit Phase 2.7 (Task #8).
 */
import { SOCIAL_EVENTS } from './social.js';
import { MARKET_EVENTS } from './market.js';
import { DRAMA_EVENTS } from './drama.js';
import { PERSONAL_EVENTS } from './personal.js';
import { TRAVEL_EVENTS } from './travel.js';
import { OPPORTUNITY_EVENTS } from './opportunity.js';
import { SCANDAL_EVENTS } from './scandal.js';
import { CHAIN_EVENTS } from './chain.js';

export {
    SOCIAL_EVENTS,
    MARKET_EVENTS,
    DRAMA_EVENTS,
    PERSONAL_EVENTS,
    TRAVEL_EVENTS,
    OPPORTUNITY_EVENTS,
    SCANDAL_EVENTS,
    CHAIN_EVENTS,
};

export const EVENTS = [
    ...SOCIAL_EVENTS,
    ...MARKET_EVENTS,
    ...DRAMA_EVENTS,
    ...PERSONAL_EVENTS,
    ...TRAVEL_EVENTS,
    ...OPPORTUNITY_EVENTS,
    ...SCANDAL_EVENTS,
    ...CHAIN_EVENTS,
];
