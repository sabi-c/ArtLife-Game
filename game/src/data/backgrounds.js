/**
 * Detailed background traits for Deep Character Creation
 */
export const BACKGROUND_TRAITS = {
    alma_mater: {
        label: "Alma Mater",
        description: "Where did you receive your education? Influences initial network.",
        options: [
            {
                id: "ivy_league",
                label: "Ivy League",
                trait: "ivy_league",
                effects: { access: 10, reputation: 5, taste: -5 },
                description: "Strong connections, but maybe a bit conservative in taste."
            },
            {
                id: "art_school",
                label: "Prestigious Art School",
                trait: "art_school",
                effects: { taste: 15, intel: 5, access: -5 },
                description: "Impeccable eye for emerging talent, but less access to old money."
            },
            {
                id: "street_smart",
                label: "School of Hard Knocks",
                trait: "street_smart",
                effects: { cash: 10000, intel: 15, reputation: -10 },
                description: "Gritty, practical market sense. Zero pretension."
            }
        ]
    },
    language: {
        label: "Second Language",
        description: "Which regional market do you have a natural edge in?",
        options: [
            {
                id: "french",
                label: "French",
                trait: "speaks_french",
                effects: { reputation: 5 },
                description: "Aids in the Parisian market and with classic European dealers."
            },
            {
                id: "mandarin",
                label: "Mandarin",
                trait: "speaks_mandarin",
                effects: { access: 5, intel: 5 },
                description: "Crucial for navigating the booming Asian contemporary market."
            },
            {
                id: "none",
                label: "English Only",
                trait: "monolingual",
                effects: { cash: 5000 },
                description: "You relied on local translators. Kept costs down initially."
            }
        ]
    }
};
