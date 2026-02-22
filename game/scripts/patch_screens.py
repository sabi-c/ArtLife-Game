import sys

with open('src/terminal/screens.js', 'r') as f:
    lines = f.readlines()

new_lines = []
for idx, line in enumerate(lines):
    if 'SCREEN: Haggle Battle — Pokémon-Style Full Screen' in line:
        break
    new_lines.append(line)

new_code = """
// ════════════════════════════════════════════
// SCREEN: Haggle Battle — Pokémon-Style Full Screen
// ════════════════════════════════════════════

export function haggleScreen(ui, info) {
    // ── Phase 30: Phaser 3 Integration Bridge ──
    // Instead of rendering a DOM terminal screen, we launch the full visual HaggleScene.
    // The terminal itself stays paused/hidden behind the Phaser canvas.
    
    // Launch the Phaser scene, passing the TerminalUI instance and state info
    if (window.phaserGame) {
        window.phaserGame.scene.start('HaggleScene', { ui, haggleInfo: info });
    } else {
        console.error('Phaser engine not initialized!');
    }

    // Return an empty, non-interactive screen for the TerminalUI to hold state
    // while Phaser takes over the visual rendering on top.
    return {
        lines: [],
        options: []
    };
}
"""
new_lines.append(new_code)

with open('src/terminal/screens.js', 'w') as f:
    f.writelines(new_lines)
