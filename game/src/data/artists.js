/**
 * Initial artist pool for ArtLife MVP
 * Based on real contemporary art market archetypes
 */
export const ARTISTS = [
    {
        id: 'artist_01',
        name: 'Marcus Chen',
        medium: 'Painting',
        tier: 'emerging',
        heat: 28,
        heatVolatility: 3,
        basePriceMin: 8000,
        basePriceMax: 25000,
        flavor: 'Shanghai-born, Brooklyn-based. Abstract landscapes that critics call "the new sublime."',
    },
    {
        id: 'artist_02',
        name: 'Adaeze Okafor',
        medium: 'Mixed Media',
        tier: 'hot',
        heat: 72,
        heatVolatility: 5,
        basePriceMin: 300000,
        basePriceMax: 800000,
        flavor: 'Lagos to London. Her textile-and-paint works explore post-colonial identity. Sold out at Frieze.',
    },
    {
        id: 'artist_03',
        name: 'Elena Voss',
        medium: 'Photography',
        tier: 'mid-career',
        heat: 48,
        heatVolatility: 2,
        basePriceMin: 40000,
        basePriceMax: 120000,
        flavor: 'Berlin\'s quiet chronicler. Large-format prints of abandoned European interiors. Steady institutional interest.',
    },
    {
        id: 'artist_04',
        name: 'Jean-Pierre Duval',
        medium: 'Sculpture',
        tier: 'blue-chip',
        heat: 88,
        heatVolatility: 1,
        basePriceMin: 2000000,
        basePriceMax: 8000000,
        flavor: 'The grand old man of French sculpture. Every museum wants one. Prices only go one direction.',
    },
    {
        id: 'artist_05',
        name: 'Yuki Tanaka',
        medium: 'Digital / New Media',
        tier: 'emerging',
        heat: 15,
        heatVolatility: 6,
        basePriceMin: 2000,
        basePriceMax: 12000,
        flavor: 'Tokyo-based, makes immersive digital installations. The art world hasn\'t decided if she\'s a genius or a gimmick.',
    },
    {
        id: 'artist_06',
        name: 'Roberto Salazar',
        medium: 'Painting',
        tier: 'hot',
        heat: 65,
        heatVolatility: 4,
        basePriceMin: 200000,
        basePriceMax: 600000,
        flavor: 'Mexico City\'s brightest star. Vivid figurative canvases. Three auction records this year.',
    },
    {
        id: 'artist_07',
        name: 'Freya Lindqvist',
        medium: 'Installation',
        tier: 'mid-career',
        heat: 52,
        heatVolatility: 2,
        basePriceMin: 80000,
        basePriceMax: 250000,
        flavor: 'Stockholm-based. Massive light installations that transform gallery spaces. Biennale veteran.',
    },
    {
        id: 'artist_08',
        name: 'Kwame Asante',
        medium: 'Painting',
        tier: 'emerging',
        heat: 32,
        heatVolatility: 4,
        basePriceMin: 15000,
        basePriceMax: 45000,
        flavor: 'Accra-born, New York-based. Raw, expressive portraits. Two solo shows and counting.',
    },
];

/**
 * Generate initial artworks for the market
 */
export function generateInitialWorks() {
    const works = [];
    let workId = 1;

    ARTISTS.forEach((artist) => {
        const numWorks = artist.tier === 'blue-chip' ? 2 :
            artist.tier === 'hot' ? 3 :
                artist.tier === 'mid-career' ? 3 : 4;

        for (let i = 0; i < numWorks; i++) {
            const price = Math.round(
                artist.basePriceMin + Math.random() * (artist.basePriceMax - artist.basePriceMin)
            );

            works.push({
                id: `work_${String(workId).padStart(3, '0')}`,
                title: generateTitle(artist.medium, i),
                artistId: artist.id,
                artist: artist.name,
                medium: artist.medium,
                basePrice: price,
                price: price,
                yearCreated: 2020 + Math.floor(Math.random() * 5),
                onMarket: true,
            });
            workId++;
        }
    });

    return works;
}

function generateTitle(medium, index) {
    const titles = {
        'Painting': ['Untitled (Figure)', 'Composition No.', 'Study in Light', 'After the Storm',
            'Interior With', 'Blue Period', 'Self Portrait', 'Landscape With'],
        'Mixed Media': ['Assemblage', 'Convergence', 'Fragments Of', 'Woven Memory',
            'Between Worlds', 'Reclamation', 'Echo Chamber'],
        'Photography': ['Untitled Print', 'Still Life No.', 'Aftermath', 'The Empty Room',
            'Series of Rooms', 'Twilight', 'Traces'],
        'Sculpture': ['Standing Form', 'Bronze No.', 'Equilibrium', 'Weight of History',
            'Monument', 'Torso', 'Column'],
        'Digital / New Media': ['RENDER_', 'Simulation', 'Noise Garden', 'DataStream',
            'pixel_drift', 'void.loop', 'echo.exe'],
        'Installation': ['Chamber of Light', 'Immersion', 'Threshold', 'Passage',
            'The Space Between', 'Wavelength', 'Aurora'],
    };

    const pool = titles[medium] || titles['Painting'];
    return `${pool[index % pool.length]} #${Math.floor(Math.random() * 99) + 1}`;
}
