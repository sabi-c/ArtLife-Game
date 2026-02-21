const fs = require('fs');
const path = require('path');
const { Compiler } = require('../node_modules/inkjs/compiler/Compiler.js');

const scenesDir = path.join(__dirname, '../src/data/scenes');

console.log('Compiling .ink files in:', scenesDir);

fs.readdirSync(scenesDir).forEach(file => {
    if (file.endsWith('.ink')) {
        const inkSource = fs.readFileSync(path.join(scenesDir, file), 'utf-8');
        try {
            const compiler = new Compiler(inkSource);
            const compiledStory = compiler.Compile();
            const jsonOutput = compiledStory.ToJson();

            const outPath = path.join(scenesDir, file.replace('.ink', '.json'));
            fs.writeFileSync(outPath, jsonOutput);
            console.log(`✅ Compiled: ${file} -> ${path.basename(outPath)}`);
        } catch (e) {
            console.error(`❌ Failed to compile ${file}:`, e.message);
        }
    }
});
