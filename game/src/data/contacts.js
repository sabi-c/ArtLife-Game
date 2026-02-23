/**
 * NPC contacts for ArtLife — Comprehensive Simulation Model
 *
 * Each NPC has full simulation stats covering:
 * - Identity: role, personality, backstory, motivations
 * - Wealth: liquid cash, annual budget, spending ceiling, income source
 * - Collection: owned works, works for sale, past sales history
 * - Taste: preferred mediums/genres/tiers, risk appetite, curatorial philosophy
 * - Haggle Profile: dealer type, price flexibility, patience, bluff chance
 * - Network: allies, rivals, faction, influence score
 * - Behavior: risk tolerance, buying/selling frequency, temperament
 *
 * ★ = Fully built-out preset (5 NPCs)
 * ○ = Reasonable defaults (11 NPCs)
 */

export const CONTACTS = [

    // ═══════════════════════════════════════════════════════════════
    // ★ DEALERS
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'sasha_klein',
        name: 'Sasha Klein',
        role: 'dealer',
        title: 'Private Art Dealer',
        emoji: '💎',
        spriteKey: 'walk_legacy_gallerist_walk',
        personality: 'Sharp, discreet, old-money connections. Knows everyone worth knowing.',
        backstory: 'Third-generation dealer. Her grandmother sold Warhols to European royalty. Sasha inherited the rolodex and the instinct. She runs a private dealership from a townhouse on East 76th — no sign, no website, invitation only. Clients include three museum boards and two sovereign wealth funds.',
        motivations: ['Protect her client list at all costs', 'Place works in historically significant collections', 'Maintain her family legacy'],
        initialFavor: 10,
        greetings: [
            'Darling, I have something for you.',
            'Don\'t tell anyone I called you first.',
            'I thought of you immediately.',
        ],

        // ★ WEALTH
        wealth: {
            liquidCash: 2000000,
            annualBudget: 800000,
            spendingCeiling: 500000,
            incomeSource: 'private_sales_commission',
            financialStress: 5,
        },

        // ★ COLLECTION
        collection: {
            owned: ['basquiat_untitled_1982', 'fontana_concetto_spaziale', 'koons_balloon_dog_edition',
                'sherman_untitled_film_4', 'liu_wei_architecture_03'],
            forSale: ['fontana_concetto_spaziale', 'sherman_untitled_film_4'],
            pastSales: [
                { workId: 'richter_abstract_42', soldPrice: 420000, soldWeek: 8, buyer: 'philippe_noir' },
                { workId: 'prince_nurse_edition', soldPrice: 180000, soldWeek: 22, buyer: 'victoria_sterling' },
            ],
            totalValue: 1850000,
            maxCapacity: 30,
        },

        // ★ TASTE
        taste: {
            preferredMediums: ['photography', 'sculpture', 'painting'],
            preferredGenres: ['conceptual photography', 'pop-art', 'contemporary painting'],
            preferredTiers: ['classic', 'mid_career'],
            favoriteArtists: ['artist_03', 'artist_04'],
            avoidedGenres: ['street_art', 'digital', 'nft'],
            riskAppetite: 'conservative',
            philosophy: 'Only handles works with impeccable provenance. Believes art should move between collections of stature. Never touches anything without a paper trail.',
        },

        // ★ HAGGLE PROFILE
        haggleProfile: {
            dealerType: 'shark',
            priceFlexibility: 0.08,
            patience: 5,
            bluffChance: 0.35,
            emotionalTriggers: ['provenance_drop', 'market_data'],
            walkawayThreshold: 0.85,
        },

        // ★ NETWORK
        network: {
            allies: ['philippe_noir', 'diana_chen', 'james_whitfield'],
            rivals: ['nico_strand', 'charles_vandermeer'],
            faction: 'gallery_world',
            influenceScore: 82,
            gossipRange: 4,
        },

        // ★ BEHAVIOR
        behavior: {
            riskTolerance: 20,
            loyaltyThreshold: 40,
            buyingFrequency: 0.15,
            sellPressure: 0.05,
            priceAnchor: 'above_market',
            temperament: 'calculated',
        },
    },

    {
        id: 'marcus_price',
        name: 'Marcus Price',
        role: 'dealer',
        title: 'Contemporary Art Advisor',
        emoji: '📊',
        spriteKey: 'walk_auction_house_type_walk',
        personality: 'Data-driven, analytical, sometimes cold. Treats art like equities.',
        backstory: 'Ex-Goldman Sachs quant who pivoted to art advisory after burning out on derivatives. Built a Bloomberg-terminal-style platform for art pricing that nobody uses except him. Surprisingly good eye despite insisting it\'s "all about the numbers."',
        motivations: ['Prove art is a rational market', 'Build the largest art data set', 'Never let emotion dictate price'],
        initialFavor: 0,
        greetings: [
            'The numbers are interesting right now.',
            'I ran the analysis. You should see this.',
            'Market signal. Call me.',
        ],

        wealth: {
            liquidCash: 1200000,
            annualBudget: 500000,
            spendingCeiling: 200000,
            incomeSource: 'advisory_fees',
            financialStress: 10,
        },
        collection: {
            owned: ['liu_wei_architecture_03'],
            forSale: [],
            pastSales: [],
            totalValue: 62000,
            maxCapacity: 15,
        },
        taste: {
            preferredMediums: ['painting', 'photography'],
            preferredGenres: ['abstract painting', 'contemporary painting'],
            preferredTiers: ['mid_career', 'emerging'],
            favoriteArtists: ['artist_01', 'artist_06'],
            avoidedGenres: ['installation', 'ceramics'],
            riskAppetite: 'moderate',
            philosophy: 'Art should be priced by fundamentals — auction records, exhibition history, institutional backing. Emotion is noise.',
        },
        haggleProfile: {
            dealerType: 'calculator',
            priceFlexibility: 0.12,
            patience: 6,
            bluffChance: 0.15,
            emotionalTriggers: ['market_data', 'comp_analysis'],
            walkawayThreshold: 0.80,
        },
        network: {
            allies: ['nina_ward', 'diana_chen'],
            rivals: ['nico_strand'],
            faction: 'auction_circuit',
            influenceScore: 55,
            gossipRange: 2,
        },
        behavior: {
            riskTolerance: 45,
            loyaltyThreshold: 25,
            buyingFrequency: 0.2,
            sellPressure: 0.1,
            priceAnchor: 'market',
            temperament: 'cold',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // ★ GALLERISTS
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'elena_ross',
        name: 'Elena Ross',
        role: 'gallerist',
        title: 'Director, Ross Gallery (Chelsea)',
        emoji: '🎨',
        spriteKey: 'walk_elena_ross_walk',
        personality: 'Passionate about emerging artists. Fiercely loyal to her roster.',
        backstory: 'Elena grew up watching her father frame canvases in a basement workshop on 10th Avenue. She opened her gallery at 28 with a $40K loan and a solo show by an artist nobody had heard of — Kwame Asante. That show sold out. She\'s been the gatekeeper of Chelsea\'s emerging scene ever since. Still drives a dented Subaru.',
        motivations: ['Champion artists who deserve visibility', 'Never sell to someone who\'ll flip', 'Build a gallery that outlasts her'],
        initialFavor: 5,
        greetings: [
            'Opening this Saturday. You should come.',
            'I have a new artist you need to see.',
            'The show is incredible. Please come.',
        ],
        eventId: 'elena_gallery_chat',

        // ★ WEALTH
        wealth: {
            liquidCash: 500000,
            annualBudget: 200000,
            spendingCeiling: 100000,
            incomeSource: 'gallery_sales',
            financialStress: 25,
        },

        // ★ COLLECTION
        collection: {
            owned: ['kwame_asante_threshold', 'yuki_tanaka_kyoto_study', 'priya_sundaram_ghost_print',
                'tomas_herrera_red_squares', 'oliver_nazari_landscape', 'elena_voss_berlin_series',
                'ngozi_okafor_installation', 'ada_martinez_gradient_field'],
            forSale: ['priya_sundaram_ghost_print', 'oliver_nazari_landscape'],
            pastSales: [
                { workId: 'early_asante_portrait', soldPrice: 12000, soldWeek: 3, buyer: 'philippe_noir' },
                { workId: 'tanaka_digital_garden', soldPrice: 8500, soldWeek: 15, buyer: 'dr_eloise_park' },
            ],
            totalValue: 280000,
            maxCapacity: 20,
        },

        // ★ TASTE
        taste: {
            preferredMediums: ['painting', 'mixed_media', 'installation', 'sculpture'],
            preferredGenres: ['contemporary painting', 'abstract painting', 'conceptual', 'post-colonial'],
            preferredTiers: ['emerging', 'speculative', 'mid_career'],
            favoriteArtists: ['artist_08', 'artist_05', 'artist_01'],
            avoidedGenres: ['nft', 'crypto_art'],
            riskAppetite: 'moderate',
            philosophy: 'Art is alive. She only sells work she believes in and only to collectors who will live with it. Flippers are blacklisted for life.',
        },

        // ★ HAGGLE PROFILE
        haggleProfile: {
            dealerType: 'patron',
            priceFlexibility: 0.20,
            patience: 8,
            bluffChance: 0.05,
            emotionalTriggers: ['flattery', 'artist_connection', 'provenance_drop'],
            walkawayThreshold: 0.65,
        },

        // ★ NETWORK
        network: {
            allies: ['yuki_tanaka', 'kwame_asante', 'dr_eloise_park', 'nina_ward'],
            rivals: ['charles_vandermeer', 'victoria_sterling'],
            faction: 'gallery_world',
            influenceScore: 65,
            gossipRange: 3,
        },

        // ★ BEHAVIOR
        behavior: {
            riskTolerance: 60,
            loyaltyThreshold: 20,
            buyingFrequency: 0.30,
            sellPressure: 0.08,
            priceAnchor: 'market',
            temperament: 'warm',
        },
    },

    {
        id: 'james_whitfield',
        name: 'James Whitfield',
        role: 'gallerist',
        title: 'Founder, Whitfield & Partners (Mayfair)',
        emoji: '🏛️',
        spriteKey: 'walk_old_money_gallerist_walk',
        personality: 'Old school, formal, gatekeeps aggressively. Access is earned.',
        backstory: 'Fourth-generation London gallerist. His great-grandfather sold Constables. James runs the tightest ship in Mayfair — you don\'t get a viewing without a letter of introduction. He\'s been offered partnerships by every mega-gallery; he\'s refused them all.',
        motivations: ['Maintain exclusivity', 'Preserve the old way of doing business', 'Control who enters the market'],
        initialFavor: -5,
        greetings: [
            'We have a viewing next week. By invitation only.',
            'I have a piece that might interest a serious collector.',
            'Are you free Tuesday? I\'d like to introduce you to someone.',
        ],

        wealth: {
            liquidCash: 3000000,
            annualBudget: 1000000,
            spendingCeiling: 400000,
            incomeSource: 'gallery_sales',
            financialStress: 0,
        },
        collection: {
            owned: ['haring_radiant_baby', 'prince_nurse_painting'],
            forSale: [],
            pastSales: [],
            totalValue: 580000,
            maxCapacity: 25,
        },
        taste: {
            preferredMediums: ['painting', 'sculpture', 'photography'],
            preferredGenres: ['figurative', 'abstract painting', 'neo-expressionism'],
            preferredTiers: ['classic', 'mid_career'],
            favoriteArtists: ['artist_04', 'artist_03'],
            avoidedGenres: ['digital', 'street_art', 'nft'],
            riskAppetite: 'conservative',
            philosophy: 'Quality endures. He only shows artists who will matter in fifty years. Everything else is noise.',
        },
        haggleProfile: {
            dealerType: 'patron',
            priceFlexibility: 0.05,
            patience: 10,
            bluffChance: 0.02,
            emotionalTriggers: ['provenance_drop', 'institutional_interest'],
            walkawayThreshold: 0.90,
        },
        network: {
            allies: ['sasha_klein', 'philippe_noir', 'dr_eloise_park'],
            rivals: ['nico_strand', 'charles_vandermeer'],
            faction: 'gallery_world',
            influenceScore: 88,
            gossipRange: 2,
        },
        behavior: {
            riskTolerance: 10,
            loyaltyThreshold: 50,
            buyingFrequency: 0.08,
            sellPressure: 0.02,
            priceAnchor: 'above_market',
            temperament: 'cold',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // AUCTION HOUSE
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'diana_chen',
        name: 'Diana Chen',
        role: 'auction',
        title: 'Specialist, Christie\'s Post-War & Contemporary',
        emoji: '🔨',
        spriteKey: 'walk_auction_house_type_walk',
        personality: 'Professional, connected, always knows what\'s coming to market.',
        backstory: 'Stanford art history, then straight to Christie\'s training program. Youngest specialist to run a major evening sale. She lives in auction data the way quants live in Bloomberg terminals.',
        motivations: ['Land the consignment of the year', 'Set new auction records', 'Build her own legacy beyond the house'],
        initialFavor: 0,
        greetings: [
            'The November sale catalogue is out. Some surprises.',
            'There\'s a lot I think you should look at.',
            'Off the record — this estimate is conservative.',
        ],

        wealth: {
            liquidCash: 400000,
            annualBudget: 150000,
            spendingCeiling: 80000,
            incomeSource: 'salary_commission',
            financialStress: 15,
        },
        collection: {
            owned: [],
            forSale: [],
            pastSales: [],
            totalValue: 0,
            maxCapacity: 10,
        },
        taste: {
            preferredMediums: ['painting', 'sculpture', 'photography'],
            preferredGenres: ['post-war', 'contemporary painting', 'neo-expressionism'],
            preferredTiers: ['classic', 'mid_career', 'hot'],
            favoriteArtists: ['artist_02', 'artist_06'],
            avoidedGenres: ['ceramics'],
            riskAppetite: 'moderate',
            philosophy: 'The hammer price is the only truth. Everything else is opinion.',
        },
        haggleProfile: {
            dealerType: 'calculator',
            priceFlexibility: 0.10,
            patience: 7,
            bluffChance: 0.20,
            emotionalTriggers: ['market_data', 'comp_analysis', 'fakeout_call'],
            walkawayThreshold: 0.75,
        },
        network: {
            allies: ['marcus_price', 'robert_hall', 'sasha_klein'],
            rivals: [],
            faction: 'auction_circuit',
            influenceScore: 72,
            gossipRange: 5,
        },
        behavior: {
            riskTolerance: 35,
            loyaltyThreshold: 20,
            buyingFrequency: 0.12,
            sellPressure: 0.05,
            priceAnchor: 'market',
            temperament: 'calculated',
        },
    },

    {
        id: 'robert_hall',
        name: 'Robert Hall',
        role: 'auction',
        title: 'Head of Private Sales, Sotheby\'s',
        emoji: '🏷️',
        spriteKey: 'walk_academic_curator_walk',
        personality: 'Smooth, persuasive, always selling. But his intel is usually good.',
        backstory: 'Robert never planned to end up in art — he started in wine auctions. Pivoted to contemporary when he realized the margins were better. His Rolodex is second only to Sasha Klein\'s.',
        motivations: ['Close the deal, always', 'Build private sale volume', 'Become the go-to for off-market transactions'],
        initialFavor: 0,
        greetings: [
            'I have something that never made it to auction.',
            'Before I call anyone else — interested?',
            'The market is shifting. We should talk.',
        ],

        wealth: {
            liquidCash: 600000,
            annualBudget: 200000,
            spendingCeiling: 100000,
            incomeSource: 'salary_commission',
            financialStress: 10,
        },
        collection: {
            owned: [],
            forSale: [],
            pastSales: [],
            totalValue: 0,
            maxCapacity: 10,
        },
        taste: {
            preferredMediums: ['painting', 'sculpture'],
            preferredGenres: ['contemporary painting', 'abstract painting'],
            preferredTiers: ['classic', 'mid_career'],
            favoriteArtists: ['artist_04'],
            avoidedGenres: ['digital'],
            riskAppetite: 'moderate',
            philosophy: 'Every work has a buyer. The art is finding the match.',
        },
        haggleProfile: {
            dealerType: 'patron',
            priceFlexibility: 0.15,
            patience: 6,
            bluffChance: 0.25,
            emotionalTriggers: ['flattery', 'fakeout_call'],
            walkawayThreshold: 0.72,
        },
        network: {
            allies: ['diana_chen', 'philippe_noir'],
            rivals: ['marcus_price'],
            faction: 'auction_circuit',
            influenceScore: 60,
            gossipRange: 4,
        },
        behavior: {
            riskTolerance: 40,
            loyaltyThreshold: 15,
            buyingFrequency: 0.10,
            sellPressure: 0.15,
            priceAnchor: 'market',
            temperament: 'warm',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // ARTISTS
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'yuki_tanaka',
        name: 'Yuki Tanaka',
        role: 'artist',
        title: 'Emerging Artist (Digital/Installation)',
        emoji: '✨',
        spriteKey: 'walk_young_artist_walk',
        personality: 'Young, ambitious, grateful for collectors who believe early.',
        backstory: 'Tokyo art school dropout who taught herself TouchDesigner in a capsule hotel. Her first solo show was a glitch — literally, the gallery\'s WiFi crashed and the installation ran different. Everyone called it genius. She didn\'t correct them.',
        motivations: ['Get a major institutional show', 'Prove digital art belongs in museums', 'Stay authentic while the market grows'],
        initialFavor: 15,
        greetings: [
            'Hey, I wanted to show you what I\'m working on.',
            'Would you visit the studio? I value your opinion.',
            'I got into a residency! Thought you\'d want to know.',
        ],

        wealth: {
            liquidCash: 25000,
            annualBudget: 15000,
            spendingCeiling: 5000,
            incomeSource: 'art_sales',
            financialStress: 55,
        },
        collection: {
            owned: ['yuki_tanaka_kyoto_study'],
            forSale: ['yuki_tanaka_kyoto_study'],
            pastSales: [],
            totalValue: 18000,
            maxCapacity: 5,
        },
        taste: {
            preferredMediums: ['digital', 'installation', 'video'],
            preferredGenres: ['new_media', 'immersive', 'generative'],
            preferredTiers: ['speculative', 'emerging'],
            favoriteArtists: ['artist_05'],
            avoidedGenres: ['figurative', 'traditional'],
            riskAppetite: 'aggressive',
            philosophy: 'Art should break the frame. If it fits in a living room, it\'s not ambitious enough.',
        },
        haggleProfile: {
            dealerType: 'nervous',
            priceFlexibility: 0.30,
            patience: 4,
            bluffChance: 0.02,
            emotionalTriggers: ['flattery', 'artist_connection'],
            walkawayThreshold: 0.50,
        },
        network: {
            allies: ['elena_ross', 'kwame_asante'],
            rivals: [],
            faction: 'gallery_world',
            influenceScore: 25,
            gossipRange: 2,
        },
        behavior: {
            riskTolerance: 75,
            loyaltyThreshold: 5,
            buyingFrequency: 0.05,
            sellPressure: 0.20,
            priceAnchor: 'below_market',
            temperament: 'warm',
        },
    },

    {
        id: 'kwame_asante',
        name: 'Kwame Asante',
        role: 'artist',
        title: 'Mid-Career Artist (Painting)',
        emoji: '🖼️',
        spriteKey: 'walk_art_flipper_walk',
        personality: 'Thoughtful, private, cautious about who collects his work.',
        backstory: 'Accra-born, raised between Ghana and Brooklyn. His paintings were shown at Elena\'s gallery before he had a bank account in the US. Now represented in three continents, but still paints in the same basement studio. Refuses to sell to anyone who won\'t promise to keep the work.',
        motivations: ['Control where his work ends up', 'Tell stories that matter', 'Resist market pressure to produce faster'],
        initialFavor: 0,
        greetings: [
            'I\'m selective about who I work with.',
            'I heard you bought one of mine. Let\'s talk.',
            'I have a new body of work. Small audience only.',
        ],

        wealth: {
            liquidCash: 120000,
            annualBudget: 50000,
            spendingCeiling: 15000,
            incomeSource: 'art_sales',
            financialStress: 20,
        },
        collection: {
            owned: ['kwame_asante_threshold'],
            forSale: [],
            pastSales: [
                { workId: 'asante_migration_series', soldPrice: 38000, soldWeek: 6, buyer: 'elena_ross' },
            ],
            totalValue: 45000,
            maxCapacity: 8,
        },
        taste: {
            preferredMediums: ['painting', 'mixed_media'],
            preferredGenres: ['contemporary painting', 'portraiture', 'post-colonial'],
            preferredTiers: ['emerging', 'mid_career'],
            favoriteArtists: ['artist_08', 'artist_02'],
            avoidedGenres: ['nft', 'crypto_art', 'pop-art'],
            riskAppetite: 'conservative',
            philosophy: 'A painting should cost you something emotionally before it costs you financially.',
        },
        haggleProfile: {
            dealerType: 'collector',
            priceFlexibility: 0.10,
            patience: 9,
            bluffChance: 0.0,
            emotionalTriggers: ['artist_connection', 'provenance_drop'],
            walkawayThreshold: 0.80,
        },
        network: {
            allies: ['elena_ross', 'yuki_tanaka', 'dr_eloise_park'],
            rivals: ['charles_vandermeer'],
            faction: 'gallery_world',
            influenceScore: 42,
            gossipRange: 2,
        },
        behavior: {
            riskTolerance: 25,
            loyaltyThreshold: 35,
            buyingFrequency: 0.05,
            sellPressure: 0.05,
            priceAnchor: 'above_market',
            temperament: 'cold',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // COLLECTORS (RIVALS)
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'victoria_sterling',
        name: 'Victoria Sterling',
        role: 'collector',
        title: 'Tech Heiress & Collector',
        emoji: '👑',
        spriteKey: 'walk_tech_collector_f_walk',
        personality: 'Competitive, flashy, buys to be seen. Instagram-curated taste.',
        backstory: 'Made her first million at 22 from a social media app she sold to Meta. Now spends it on art she can photograph. Her collection is more brand than curation — but her buying power is real and her reach is global.',
        motivations: ['Be seen at every major art event', 'Out-bid everyone in the room', 'Build an Instagram-worthy collection'],
        initialFavor: -10,
        greetings: [
            'I saw your latest acquisition. Interesting choice.',
            'We keep ending up at the same openings.',
            'I heard you passed on the Voss. Smart? Or scared?',
        ],

        wealth: {
            liquidCash: 8000000,
            annualBudget: 3000000,
            spendingCeiling: 1000000,
            incomeSource: 'tech_dividends',
            financialStress: 0,
        },
        collection: {
            owned: ['koons_balloon_dog_edition'],
            forSale: [],
            pastSales: [],
            totalValue: 480000,
            maxCapacity: 50,
        },
        taste: {
            preferredMediums: ['painting', 'sculpture', 'photography', 'digital'],
            preferredGenres: ['pop-art', 'contemporary painting', 'neo-expressionism'],
            preferredTiers: ['classic', 'hot'],
            favoriteArtists: ['artist_02', 'artist_06'],
            avoidedGenres: ['ceramics', 'watercolour'],
            riskAppetite: 'aggressive',
            philosophy: 'If it looks good on Instagram and the price is going up, buy it.',
        },
        haggleProfile: {
            dealerType: 'collector',
            priceFlexibility: 0.25,
            patience: 3,
            bluffChance: 0.10,
            emotionalTriggers: ['flattery', 'social_proof'],
            walkawayThreshold: 0.60,
        },
        network: {
            allies: ['lorenzo_gallo', 'margaux_fontaine'],
            rivals: ['philippe_noir', 'sasha_klein'],
            faction: 'auction_circuit',
            influenceScore: 70,
            gossipRange: 6,
        },
        behavior: {
            riskTolerance: 80,
            loyaltyThreshold: 10,
            buyingFrequency: 0.40,
            sellPressure: 0.15,
            priceAnchor: 'above_market',
            temperament: 'volatile',
        },
    },

    {
        id: 'philippe_noir',
        name: 'Philippe Noir',
        role: 'collector',
        title: 'Old-Guard European Collector',
        emoji: '🎩',
        spriteKey: 'walk_power_collector_f_walk',
        personality: 'Quiet power, massive collection, rarely seen. Judge of taste.',
        backstory: 'Basel dynasty. His family has collected art since the 1920s. Philippe expanded into contemporary in the 1990s, acquiring key works by Richter, Kiefer, and Baselitz before the market caught up. His private foundation in Basel houses 400+ works. He speaks softly and never overpays.',
        motivations: ['Build the definitive contemporary collection', 'Identify the next generation', 'Never be seen at Art Basel Miami'],
        initialFavor: 0,
        greetings: [
            'I noticed your collection. You have an eye.',
            'Would you join me for dinner? I\'d like to discuss something.',
            'I\'m deaccessioning a few pieces. Discreetly.',
        ],

        wealth: {
            liquidCash: 15000000,
            annualBudget: 5000000,
            spendingCeiling: 2000000,
            incomeSource: 'family_wealth',
            financialStress: 0,
        },
        collection: {
            owned: ['richter_abstract_901', 'basquiat_untitled_1982'],
            forSale: [],
            pastSales: [],
            totalValue: 12000000,
            maxCapacity: 100,
        },
        taste: {
            preferredMediums: ['painting', 'sculpture', 'photography'],
            preferredGenres: ['abstract painting', 'neo-expressionism', 'contemporary painting'],
            preferredTiers: ['classic', 'blue-chip'],
            favoriteArtists: ['artist_04', 'artist_03', 'artist_08'],
            avoidedGenres: ['digital', 'nft', 'street_art'],
            riskAppetite: 'conservative',
            philosophy: 'Time is the only critic that matters. If a work doesn\'t survive 50 years, it was never art.',
        },
        haggleProfile: {
            dealerType: 'patron',
            priceFlexibility: 0.05,
            patience: 12,
            bluffChance: 0.0,
            emotionalTriggers: ['provenance_drop', 'institutional_interest'],
            walkawayThreshold: 0.92,
        },
        network: {
            allies: ['james_whitfield', 'sasha_klein', 'dr_eloise_park'],
            rivals: ['charles_vandermeer'],
            faction: 'gallery_world',
            influenceScore: 95,
            gossipRange: 2,
        },
        behavior: {
            riskTolerance: 8,
            loyaltyThreshold: 60,
            buyingFrequency: 0.06,
            sellPressure: 0.01,
            priceAnchor: 'market',
            temperament: 'cold',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // ADVISORS
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'nina_ward',
        name: 'Nina Ward',
        role: 'advisor',
        title: 'Art Market Analyst',
        emoji: '📈',
        spriteKey: 'walk_art_critic_walk',
        personality: 'Sharp, data-obsessed, sees patterns before anyone else.',
        backstory: 'PhD in economics from LSE, dissertation on art market efficiency. Runs a boutique analytics firm that tracks heat scores, auction patterns, and collector behavior. Her weekly newsletter is read by 200 of the most powerful people in art.',
        motivations: ['Predict the next market move', 'Build the definitive art market data set', 'Never be surprised'],
        initialFavor: 5,
        greetings: [
            'I\'m seeing something in the data. Call me.',
            'The heat scores are moving. You should be paying attention.',
            'Quick heads up — the institutional buyers are repositioning.',
        ],

        wealth: {
            liquidCash: 300000,
            annualBudget: 100000,
            spendingCeiling: 40000,
            incomeSource: 'consulting_fees',
            financialStress: 20,
        },
        collection: {
            owned: [],
            forSale: [],
            pastSales: [],
            totalValue: 0,
            maxCapacity: 8,
        },
        taste: {
            preferredMediums: ['painting', 'photography', 'mixed_media'],
            preferredGenres: ['contemporary painting', 'conceptual'],
            preferredTiers: ['mid_career', 'emerging'],
            favoriteArtists: ['artist_01'],
            avoidedGenres: [],
            riskAppetite: 'moderate',
            philosophy: 'The data tells you what the market thinks. Your job is to think before the market.',
        },
        haggleProfile: {
            dealerType: 'advisor',
            priceFlexibility: 0.18,
            patience: 7,
            bluffChance: 0.10,
            emotionalTriggers: ['market_data', 'comp_analysis'],
            walkawayThreshold: 0.70,
        },
        network: {
            allies: ['marcus_price', 'elena_ross', 'diana_chen'],
            rivals: [],
            faction: 'auction_circuit',
            influenceScore: 58,
            gossipRange: 5,
        },
        behavior: {
            riskTolerance: 50,
            loyaltyThreshold: 15,
            buyingFrequency: 0.08,
            sellPressure: 0.05,
            priceAnchor: 'market',
            temperament: 'calculated',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // MEGA-DEALERS
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'lorenzo_gallo',
        name: 'Lorenzo Gallo',
        role: 'mega_dealer',
        title: 'Founder, Gallo Gallery (20 locations worldwide)',
        emoji: '🦅',
        spriteKey: 'walk_young_power_dealer_walk',
        personality: 'The most powerful dealer alive. Controls supply for 50+ artists. Access is a privilege, not a right.',
        backstory: 'Started with a single gallery in SoHo in the 1980s. Now operates 20 spaces globally. He controls the primary market for the world\'s most sought-after living artists. Getting on his list requires Rep 80+. Flip one of his artists and you\'re blacklisted for life.',
        motivations: ['Maintain total control of supply', 'Expand the Gallo empire', 'Create the market, don\'t follow it'],
        initialFavor: -20,
        archetypeAbility: 'Controls supply. Getting access requires Rep 80+. Best primary prices but demands absolute loyalty — flip a work and you\'re blacklisted forever.',
        greetings: [
            'I don\'t usually take meetings. But you\'ve been noticed.',
            'I have something. But I need to know you\'re serious.',
            'My artists don\'t sell to just anyone.',
        ],

        wealth: {
            liquidCash: 50000000,
            annualBudget: 20000000,
            spendingCeiling: 5000000,
            incomeSource: 'gallery_empire',
            financialStress: 0,
        },
        collection: {
            owned: ['ada_martinez_gradient_field'],
            forSale: ['ada_martinez_gradient_field'],
            pastSales: [],
            totalValue: 22000,
            maxCapacity: 200,
        },
        taste: {
            preferredMediums: ['painting', 'sculpture', 'installation'],
            preferredGenres: ['contemporary painting', 'abstract painting', 'neo-expressionism'],
            preferredTiers: ['mid_career', 'hot'],
            favoriteArtists: ['artist_02', 'artist_06', 'artist_07'],
            avoidedGenres: ['ceramics'],
            riskAppetite: 'moderate',
            philosophy: 'I don\'t sell art. I create artists. The gallery is the brand.',
        },
        haggleProfile: {
            dealerType: 'shark',
            priceFlexibility: 0.03,
            patience: 3,
            bluffChance: 0.40,
            emotionalTriggers: ['social_proof', 'institutional_interest'],
            walkawayThreshold: 0.95,
        },
        network: {
            allies: ['victoria_sterling', 'dr_eloise_park'],
            rivals: ['elena_ross', 'nico_strand'],
            faction: 'gallery_world',
            influenceScore: 98,
            gossipRange: 3,
        },
        behavior: {
            riskTolerance: 30,
            loyaltyThreshold: 80,
            buyingFrequency: 0.05,
            sellPressure: 0.02,
            priceAnchor: 'above_market',
            temperament: 'cold',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // ★ SPECULATORS
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'charles_vandermeer',
        name: 'Charles Vandermeer',
        role: 'speculator',
        title: 'Collector & Market Mover',
        emoji: '🎭',
        spriteKey: 'walk_underground_connector_walk',
        personality: 'Buys cheap from unknowns, orchestrates massive publicity, then sells at peak. Market kingmaker or destroyer.',
        backstory: 'Amsterdam-born hedge fund alum who treats the art market like a short squeeze. His playbook: identify an underpriced artist, buy 15-20 works quietly, orchestrate magazine covers and museum shows, then dump the entire position through three auction houses simultaneously. He\'s made fortunes and destroyed careers.',
        motivations: ['10x every position', 'Prove art is just another tradeable asset', 'Be feared, not respected'],
        initialFavor: 0,
        archetypeAbility: 'Moves markets. If he buys your artist, heat +20. If he dumps, heat -30. His portfolio decisions send shockwaves.',
        greetings: [
            'I\'m building something. Want in?',
            'I just acquired 15 works by an artist nobody knows. Yet.',
            'Have you noticed what\'s happening with [ARTIST]? I have.',
        ],
        eventId: 'julian_flip_deal',

        // ★ WEALTH
        wealth: {
            liquidCash: 5000000,
            annualBudget: 2000000,
            spendingCeiling: 1000000,
            incomeSource: 'trading_profits',
            financialStress: 10,
        },

        // ★ COLLECTION
        collection: {
            owned: ['tomas_herrera_red_squares', 'jesse_kim_vessel_01',
                'marco_vitale_first_light', 'javier_molina_diebenkorn_echo',
                'chen_bai_scroll_strip'],
            forSale: ['tomas_herrera_red_squares', 'marco_vitale_first_light',
                'javier_molina_diebenkorn_echo', 'chen_bai_scroll_strip'],
            pastSales: [
                { workId: 'unknown_artist_batch_01', soldPrice: 850000, soldWeek: 18, buyer: 'victoria_sterling' },
                { workId: 'unknown_artist_batch_02', soldPrice: 1200000, soldWeek: 18, buyer: 'philippe_noir' },
            ],
            totalValue: 420000,
            maxCapacity: 40,
        },

        // ★ TASTE
        taste: {
            preferredMediums: ['painting', 'mixed_media', 'digital', 'sculpture'],
            preferredGenres: ['any_undervalued'],
            preferredTiers: ['speculative', 'emerging'],
            favoriteArtists: [],
            avoidedGenres: [],
            riskAppetite: 'aggressive',
            philosophy: 'Art is a commodity. The only question is: can I move the price? If yes, buy. If no, pass.',
        },

        // ★ HAGGLE PROFILE
        haggleProfile: {
            dealerType: 'speculator',
            priceFlexibility: 0.12,
            patience: 4,
            bluffChance: 0.50,
            emotionalTriggers: ['market_data', 'fakeout_call', 'walk_away'],
            walkawayThreshold: 0.60,
        },

        // ★ NETWORK
        network: {
            allies: ['nico_strand', 'margaux_fontaine'],
            rivals: ['elena_ross', 'dr_eloise_park', 'philippe_noir'],
            faction: 'underground',
            influenceScore: 85,
            gossipRange: 5,
        },

        // ★ BEHAVIOR
        behavior: {
            riskTolerance: 95,
            loyaltyThreshold: 5,
            buyingFrequency: 0.60,
            sellPressure: 0.40,
            priceAnchor: 'below_market',
            temperament: 'volatile',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // ★ YOUNG HUSTLERS
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'nico_strand',
        name: 'Nico Strand',
        role: 'young_hustler',
        title: 'Independent Dealer (Unlicensed)',
        emoji: '⚡',
        spriteKey: 'walk_it_girl_dealer_walk',
        personality: 'Charismatic, fast-talking, exciting deals. But the provenance is often thin and the paperwork thinner.',
        backstory: 'Dropped out of SVA to sell art out of a storage unit in Red Hook. His Instagram has 200K followers and his DMs are always open. He finds works in estate sales, garage sales, and "situations" that don\'t ask questions. Half genius, half con artist. Nobody\'s sure which half.',
        motivations: ['Flip everything before the hype fades', 'Build a reputation without the establishment', 'Never get caught holding the bag'],
        initialFavor: 10,
        archetypeAbility: 'Offers exciting but potentially fraudulent deals. Risk/reward wildcard — his deals are 50% genius, 50% prison.',
        greetings: [
            'Bro. I have something insane. Can you talk?',
            'Don\'t ask where I got this. Just look at it.',
            'I\'m putting together a group buy. Limited spots. You in?',
        ],

        // ★ WEALTH
        wealth: {
            liquidCash: 80000,
            annualBudget: 40000,
            spendingCeiling: 25000,
            incomeSource: 'flipping',
            financialStress: 45,
        },

        // ★ COLLECTION
        collection: {
            owned: ['jesse_kim_vessel_01', 'priya_sundaram_ghost_print'],
            forSale: ['jesse_kim_vessel_01', 'priya_sundaram_ghost_print'],
            pastSales: [
                { workId: 'estate_find_rothko_sketch', soldPrice: 35000, soldWeek: 5, buyer: 'marcus_price' },
            ],
            totalValue: 6000,
            maxCapacity: 10,
        },

        // ★ TASTE
        taste: {
            preferredMediums: ['painting', 'sculpture', 'street_art', 'digital'],
            preferredGenres: ['street_art', 'contemporary painting', 'pop-art', 'nft'],
            preferredTiers: ['speculative'],
            favoriteArtists: [],
            avoidedGenres: [],
            riskAppetite: 'aggressive',
            philosophy: 'If nobody\'s heard of the artist, good — that means I\'m early. If everybody\'s heard of them, good — that means I can sell.',
        },

        // ★ HAGGLE PROFILE
        haggleProfile: {
            dealerType: 'hustler',
            priceFlexibility: 0.30,
            patience: 3,
            bluffChance: 0.70,
            emotionalTriggers: ['fakeout_call', 'walk_away', 'social_proof'],
            walkawayThreshold: 0.40,
        },

        // ★ NETWORK
        network: {
            allies: ['charles_vandermeer'],
            rivals: ['james_whitfield', 'sasha_klein'],
            faction: 'underground',
            influenceScore: 30,
            gossipRange: 6,
        },

        // ★ BEHAVIOR
        behavior: {
            riskTolerance: 90,
            loyaltyThreshold: 0,
            buyingFrequency: 0.50,
            sellPressure: 0.55,
            priceAnchor: 'below_market',
            temperament: 'volatile',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // ART ADVISORS
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'margaux_fontaine',
        name: 'Margaux Fontaine',
        role: 'advisor',
        title: 'Private Art Advisor',
        emoji: '💄',
        spriteKey: 'walk_margaux_villiers_walk',
        personality: 'Charming, well-connected, seemingly trustworthy. Manages purchasing for wealthy clients. But her advisory fees don\'t tell the whole story.',
        backstory: 'Grew up in Paris attending openings with her mother, a Sotheby\'s cataloguer. Margaux built her advisory practice by connecting new-money tech clients with old-world dealers. Her 10% fee is above board — the undisclosed kickbacks from galleries are not.',
        motivations: ['Maintain the appearance of trust', 'Maximize advisory income', 'Stay one step ahead of her clients'],
        initialFavor: 15,
        archetypeAbility: 'Manages buying for you — saves time and offers access. But she might be adding hidden markups. Trust mechanic: high favor = transparent, low favor = skimming.',
        greetings: [
            'I found something perfect for your collection.',
            'Let me handle this one. I know the gallery director personally.',
            'I\'ve been looking at your portfolio. We should rebalance.',
        ],

        wealth: {
            liquidCash: 700000,
            annualBudget: 300000,
            spendingCeiling: 150000,
            incomeSource: 'advisory_fees_kickbacks',
            financialStress: 15,
        },
        collection: {
            owned: [],
            forSale: [],
            pastSales: [],
            totalValue: 0,
            maxCapacity: 12,
        },
        taste: {
            preferredMediums: ['painting', 'photography', 'sculpture'],
            preferredGenres: ['contemporary painting', 'abstract painting'],
            preferredTiers: ['mid_career', 'hot'],
            favoriteArtists: ['artist_06', 'artist_02'],
            avoidedGenres: ['ceramics', 'street_art'],
            riskAppetite: 'moderate',
            philosophy: 'Buy what looks good in the dining room of a billionaire. Function follows form.',
        },
        haggleProfile: {
            dealerType: 'advisor',
            priceFlexibility: 0.15,
            patience: 6,
            bluffChance: 0.30,
            emotionalTriggers: ['flattery', 'social_proof'],
            walkawayThreshold: 0.65,
        },
        network: {
            allies: ['charles_vandermeer', 'victoria_sterling', 'lorenzo_gallo'],
            rivals: ['nina_ward'],
            faction: 'auction_circuit',
            influenceScore: 55,
            gossipRange: 4,
        },
        behavior: {
            riskTolerance: 55,
            loyaltyThreshold: 10,
            buyingFrequency: 0.25,
            sellPressure: 0.10,
            priceAnchor: 'above_market',
            temperament: 'warm',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // ★ INSTITUTIONAL
    // ═══════════════════════════════════════════════════════════════

    {
        id: 'dr_eloise_park',
        name: 'Dr. Eloise Park',
        role: 'institutional',
        title: 'Director, Park Foundation for Contemporary Art',
        emoji: '🏛️',
        spriteKey: 'walk_avant_garde_curator_walk',
        personality: 'Museum builder. Believes art should be public. Offers enormous legitimacy boosts but wants your best works donated or loaned long-term.',
        backstory: 'Doctorate from the Courtauld, then curator at Tate Modern for 12 years before launching her own foundation in 2018. The Park Foundation has acquired 400+ works and mounted 30 exhibitions. Eloise doesn\'t care about price — she cares about legacy. Getting a work into her collection is like getting it into the MoMA.',
        motivations: ['Build the most important private museum of the 21st century', 'Make contemporary art accessible', 'Preserve artists\' legacies'],
        initialFavor: 0,
        archetypeAbility: 'Offers legitimacy — her endorsement adds +15 reputation and museum-quality provenance to any work. But she wants donations, not sales.',
        greetings: [
            'We\'re planning a major exhibition. Your collection has a piece we need.',
            'I\'d like to discuss a long-term loan arrangement.',
            'The Foundation is acquiring. Are you open to a conversation?',
        ],

        // ★ WEALTH
        wealth: {
            liquidCash: 10000000,
            annualBudget: 3000000,
            spendingCeiling: 2000000,
            incomeSource: 'endowment',
            financialStress: 0,
        },

        // ★ COLLECTION
        collection: {
            owned: ['basquiat_untitled_1982', 'haring_radiant_baby', 'richter_abstract_901',
                'kwame_asante_threshold', 'elena_voss_berlin_series',
                'liu_wei_architecture_03', 'ngozi_okafor_installation'],
            forSale: [],
            pastSales: [],
            totalValue: 4500000,
            maxCapacity: 500,
        },

        // ★ TASTE
        taste: {
            preferredMediums: ['painting', 'sculpture', 'installation', 'photography', 'mixed_media', 'video'],
            preferredGenres: ['contemporary painting', 'abstract painting', 'post-colonial',
                'conceptual', 'neo-expressionism', 'new_media'],
            preferredTiers: ['mid_career', 'blue-chip', 'classic'],
            favoriteArtists: ['artist_02', 'artist_04', 'artist_07', 'artist_08'],
            avoidedGenres: ['nft', 'crypto_art'],
            riskAppetite: 'conservative',
            philosophy: 'Art belongs to everyone. The Foundation acquires work that will define our time. Provenance, scholarship, and public access are non-negotiable.',
        },

        // ★ HAGGLE PROFILE
        haggleProfile: {
            dealerType: 'curator',
            priceFlexibility: 0.05,
            patience: 10,
            bluffChance: 0.0,
            emotionalTriggers: ['provenance_drop', 'institutional_interest', 'artist_connection'],
            walkawayThreshold: 0.90,
        },

        // ★ NETWORK
        network: {
            allies: ['james_whitfield', 'elena_ross', 'philippe_noir', 'kwame_asante'],
            rivals: ['charles_vandermeer', 'nico_strand'],
            faction: 'institutional',
            influenceScore: 92,
            gossipRange: 3,
        },

        // ★ BEHAVIOR
        behavior: {
            riskTolerance: 15,
            loyaltyThreshold: 40,
            buyingFrequency: 0.10,
            sellPressure: 0.0,
            priceAnchor: 'market',
            temperament: 'cold',
        },
    },
];

/**
 * Generate initial NPC state from contacts data.
 * Passes through all fields needed by the CMS NPCEditor tabs and simulation engine.
 */
export function initializeContacts() {
    return CONTACTS.map((contact) => ({
        id: contact.id,
        name: contact.name,
        role: contact.role,
        title: contact.title || '',
        emoji: contact.emoji || '👤',
        spriteKey: contact.spriteKey || 'dealer_patron',
        personality: contact.personality || '',
        backstory: contact.backstory || '',
        motivations: contact.motivations || [],
        archetypeAbility: contact.archetypeAbility || '',
        greetings: contact.greetings || [],
        traits: contact.traits || [],
        eventId: contact.eventId || null,
        dealerType: contact.haggleProfile?.dealerType || contact.dealerType || null,
        schedule: contact.schedule || [],

        // Simulation stat blocks
        wealth: contact.wealth || {
            liquidCash: 100000, annualBudget: 50000, spendingCeiling: 30000,
            incomeSource: 'unknown', financialStress: 20,
        },
        collection: contact.collection || {
            owned: [], forSale: [], pastSales: [],
            totalValue: 0, maxCapacity: 10,
        },
        taste: contact.taste || {
            preferredMediums: [], preferredGenres: [], preferredTiers: [],
            favoriteArtists: [], avoidedGenres: [],
            riskAppetite: 'moderate', philosophy: '',
        },
        haggleProfile: contact.haggleProfile || {
            dealerType: 'patron', priceFlexibility: 0.15, patience: 6,
            bluffChance: 0.10, emotionalTriggers: [], walkawayThreshold: 0.70,
        },
        network: contact.network || {
            allies: [], rivals: [], faction: 'unknown',
            influenceScore: 30, gossipRange: 2,
        },
        behavior: contact.behavior || {
            riskTolerance: 50, loyaltyThreshold: 25, buyingFrequency: 0.15,
            sellPressure: 0.10, priceAnchor: 'market', temperament: 'warm',
        },

        // Runtime state
        favor: contact.initialFavor || 0,
        met: false,
        lastContact: 0,
        interactions: 0,
    }));
}
