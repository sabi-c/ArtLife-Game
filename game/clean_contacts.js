import fs from 'fs';

const filePath = './src/data/contacts.js';
let content = fs.readFileSync(filePath, 'utf8');

// Use regex to replace owned: [...] and forSale: [...] with empty arrays
content = content.replace(/owned:\s*\[[\s\S]*?\],/g, 'owned: [],');
content = content.replace(/forSale:\s*\[[\s\S]*?\],/g, 'forSale: [],');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Cleaned contacts.js arrays.');
