/**
 * DealResolver — handles active deal (sale) resolution during week advance.
 * Extracted from GameState.js during Code Audit Phase 2.7.
 */

import { GameState } from './GameState.js';
import { MarketManager } from './MarketManager.js';
import { PhoneManager } from './PhoneManager.js';
import { generateId } from '../utils/id.js';

export class DealResolver {
    /**
     * Resolve all deals whose resolutionWeek has arrived.
     * Mutates state.activeDeals (filters out resolved), adds cash, records transactions.
     */
    static resolveDeals(state) {
        const resolvedDeals = [];
        state.activeDeals = state.activeDeals.filter(deal => {
            if (state.week >= deal.resolutionWeek) {
                resolvedDeals.push(deal);
                return false;
            }
            return true;
        });

        resolvedDeals.forEach(deal => {
            if (deal.type === 'sale') {
                const finalValue = MarketManager.getWorkValue(deal.work);
                let modifier = 1.0;

                if (deal.strategy === 'auction') {
                    modifier = 0.8 + (Math.random() * 0.7);
                } else if (deal.strategy === 'contact') {
                    const accessBonus = (state.access - 50) * 0.002;
                    modifier = 0.9 + accessBonus + (Math.random() * 0.1);
                } else {
                    modifier = 0.95 + (Math.random() * 0.1);
                }

                const finalPrice = Math.floor(finalValue * modifier);
                state.cash += finalPrice;
                state.totalWorksSold++;

                // Track flip speed for heat
                const holdTime = state.week - deal.work.purchaseWeek;
                if (holdTime < 4) state.marketHeat += 8;
                else if (holdTime < 8) state.marketHeat += 3;

                // Record transaction
                (state.transactions = state.transactions || []).unshift({
                    id: generateId('sell'),
                    action: 'SELL',
                    title: deal.work.title,
                    artist: deal.work.artist,
                    price: finalPrice,
                    week: state.week,
                    strategy: deal.strategy,
                });
                if (state.transactions.length > 50) state.transactions.pop();

                GameState.addNews(`SALE COMPLETE: "${deal.work.title}" sold via ${deal.strategy} for $${finalPrice.toLocaleString()}`);
            }
        });
    }

    /**
     * Resolve pending offers (NPC-initiated buy offers that expire over time).
     */
    static resolvePendingOffers(state) {
        if (!state.pendingOffers || state.pendingOffers.length === 0) return;

        state.pendingOffers = state.pendingOffers.filter(offer => {
            if (state.week >= offer.resolveWeek) {
                if (offer.accepted && offer.work) {
                    const w = offer.work;
                    if (state.cash >= w.price) {
                        GameState.buyWork(w);
                        GameState.addNews(`OFFER ACCEPTED: "${w.title}" purchased for $${w.price.toLocaleString()}!`);
                        PhoneManager.sendMessage({
                            from: 'Gallery',
                            subject: `Offer Accepted — ${w.title}`,
                            body: `Good news! Your ${offer.offerPrice ? 'offer of $' + offer.offerPrice.toLocaleString() : 'offer'} on "${w.title}" has been accepted. The work has been added to your collection.`,
                        });
                    } else {
                        GameState.addNews(`Offer on "${w.title}" accepted but you can't afford it anymore!`);
                        PhoneManager.sendMessage({
                            from: 'Gallery',
                            subject: `Offer Accepted — ${w.title}`,
                            body: `Your offer was accepted, but unfortunately your available funds are insufficient. The offer has lapsed.`,
                        });
                    }
                } else {
                    GameState.addNews(`Offer on "${offer.work?.title || 'unknown'}" was rejected.`);
                    PhoneManager.sendMessage({
                        from: 'Gallery',
                        subject: `Offer Update — ${offer.work?.title || 'Artwork'}`,
                        body: `We appreciate your interest, but after careful consideration, we've decided to decline your offer at this time.`,
                    });
                    state.marketHeat = Math.min(100, (state.marketHeat || 0) + 2);
                }
                return false;
            }
            return true;
        });
    }
}
