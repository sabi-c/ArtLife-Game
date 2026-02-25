/**
 * src/terminal/screens/dashboard-cutscenes.js
 * Dev/test cutscene launcher extracted from dashboard.js.
 *
 * Contains: testVenueCutscenesScreen
 *
 * Provides a menu of pre-defined dialogue sequences for each global venue,
 * useful for testing MacDialogueScene visual rendering.
 */

import { H, DIV, DIM } from './shared.js';

// ════════════════════════════════════════════
// SCREEN: Test Venue Cutscenes (Dev Feature)
// ════════════════════════════════════════════
export function testVenueCutscenesScreen(ui) {
    return () => {
        const lines = [
            H('TEST VENUE CUTSCENES'),
            DIM('Preview dialogue scenes for the various global venues.'),
            DIV(),
        ];

        const options = [];

        const cutscenes = [
            {
                label: 'Gallery Opening (Chelsea)',
                params: {
                    bgKey: 'bg_gallery_main_1bit_1771587911969.png',
                    leftSpriteKey: 'player_back.png',
                    rightSpriteKey: 'portrait_it_girl_dealer_1bit_1771587978725.png',
                    dialogueSequence: [
                        { name: 'You', speakerSide: 'left', text: 'Good crowd tonight. The lighting feels almost forensic, though.' },
                        { name: 'Gallerist', speakerSide: 'right', text: 'We lit it for the cameras, not the eyes. Has anyone offered you prosecco?' },
                        { name: 'You', speakerSide: 'left', text: 'I am not here for prosecco. Check your ledger. I want the piece in the back.' }
                    ]
                }
            },
            {
                label: 'Cocktail Party (Upper East Side)',
                params: {
                    // fallback to a drama background or something appropriate
                    bgKey: 'bg_social.png',
                    leftSpriteKey: 'player_back.png',
                    rightSpriteKey: 'portrait_legacy_gallerist_1bit_1771587958185.png',
                    dialogueSequence: [
                        { name: 'Collector', speakerSide: 'right', text: 'These floor-to-ceiling windows... one feels so exposed, don\'t you agree?' },
                        { name: 'You', speakerSide: 'left', text: 'Only if you have something to hide. That Rothko, for instance.' },
                        { name: 'Collector', speakerSide: 'right', text: 'Ah. You noticed. Let us speak quietly, away from the waiters.' }
                    ]
                }
            },
            {
                label: 'Auction House (Rockefeller Plaza)',
                params: {
                    bgKey: 'bg_auction.png',
                    leftSpriteKey: 'player_back.png',
                    rightSpriteKey: 'portrait_auctioneer.png',
                    dialogueSequence: [
                        { name: 'Auctioneer', speakerSide: 'right', text: 'Lot 47. We open the bidding at two million. Do I see two million?' },
                        { name: 'You', speakerSide: 'left', text: '(You raise your paddle precisely an inch.)' },
                        { name: 'Auctioneer', speakerSide: 'right', text: 'Two million on the aisle. Two million. Looking for two point two.' }
                    ]
                }
            },
            {
                label: 'Artist Studio (Bushwick)',
                params: {
                    bgKey: 'bg_personal.png',
                    leftSpriteKey: 'player_back.png',
                    rightSpriteKey: 'portrait_scene_queen.png', // Or an artist portrait
                    dialogueSequence: [
                        { name: 'Artist', speakerSide: 'right', text: 'Watch your step. The cobalt blue is still wet on the floor.' },
                        { name: 'You', speakerSide: 'left', text: 'I didn\'t come to inspect the floorboards. Show me the new series.' },
                        { name: 'Artist', speakerSide: 'right', text: 'You\'re the only one who gets to see it before the gallery. Don\'t ruin it.' }
                    ]
                }
            },
            {
                label: 'Art Basel (Switzerland)',
                params: {
                    bgKey: 'bg_fair.png',
                    leftSpriteKey: 'player_back.png',
                    rightSpriteKey: 'portrait_underground_connector_1bit_1771587994565.png',
                    dialogueSequence: [
                        { name: 'Advisor', speakerSide: 'right', text: 'The entire VIP lounge is whispering about the provenance on that Richter.' },
                        { name: 'You', speakerSide: 'left', text: 'Let them whisper. It distracts them from the real acquisitions.' },
                        { name: 'Advisor', speakerSide: 'right', text: 'Precisely. Now, follow me to booth 114. The VIP preview ends in ten minutes.' }
                    ]
                }
            },
            {
                label: 'Geneva Freeport',
                params: {
                    bgKey: 'bg_gallery_backroom_1bit_1771587929810.png',
                    leftSpriteKey: 'player_back.png',
                    rightSpriteKey: 'portrait_old_money_gallerist.png',
                    dialogueSequence: [
                        { name: 'Handler', speakerSide: 'right', text: 'Vault 1147. Please verify your biometric scan to proceed.' },
                        { name: 'You', speakerSide: 'left', text: '(Presses thumb to the glass reader)' },
                        { name: 'Handler', speakerSide: 'right', text: 'Identity confirmed. The climate control is at 65 degrees. You have twenty minutes.' }
                    ]
                }
            }
        ];

        cutscenes.forEach(scene => {
            options.push({
                label: `► ${scene.label}`,
                action: () => {
                    if (window.game && window.game.startTestScene) {
                        window.game.startTestScene('MacDialogueScene', scene.params);
                    } else {
                        ui.showNotification('Visual engine not loaded.', '⚠️');
                    }
                }
            });
        });

        options.push({ label: '← Back', action: () => ui.popScreen() });

        return { lines, options };
    };
}
