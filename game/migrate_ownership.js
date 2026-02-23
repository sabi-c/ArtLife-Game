import fs from 'fs';
import { CONTACTS } from './src/data/contacts.js';

// Build owner map from contacts
const ownerMap = {};
for (const contact of CONTACTS) {
    if (contact.collection) {
        const owned = contact.collection.owned || [];
        const forSale = contact.collection.forSale || [];
        for (const id of [...owned, ...forSale]) {
            ownerMap[id] = contact.id;
        }
    }
}

// Read artworks.js
const artworksPath = './src/data/artworks.js';
const content = fs.readFileSync(artworksPath, 'utf8');

const lines = content.split('\n');
const newLines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    newLines.push(line);

    // Check if line is an `id:` declaration inside the object
    const match = line.match(/^(\s*)id:\s*['"]([^'"]+)['"]/);
    if (match) {
        const indent = match[1];
        const artworkId = match[2];
        const owner = ownerMap[artworkId] || 'market';

        // Check if next line is already ownerId
        if (i + 1 < lines.length && lines[i + 1].includes('ownerId:')) {
            // Do nothing, we will let it be replaced or we skip.
            // Actually, currently there are no ownerIds.
        }

        newLines.push(`${indent}ownerId: '${owner}',`);
    }
}

fs.writeFileSync(artworksPath, newLines.join('\n'), 'utf8');
console.log('Successfully updated artworks.js with ownerIds');
