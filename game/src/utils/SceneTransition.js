/**
 * SceneTransition.js — Cinematic scene-change effects.
 * Inspired by monster-tamer's createSceneTransition() and iris-wipe pattern.
 *
 * Uses WebGL geometry mask for the iris wipe when available,
 * falls back to camera fade on Canvas renderer.
 */
export class SceneTransition {
    /**
     * Iris-wipe close: a circle shrinks to black, then the target scene starts.
     *
     * @param {Phaser.Scene} scene       - The currently active scene.
     * @param {string}       targetKey   - Scene key to transition to.
     * @param {object}       [targetData={}] - Data object passed to the new scene.
     * @param {number}       [duration=600]  - Total wipe duration in ms.
     */
    static irisWipeToScene(scene, targetKey, targetData = {}, duration = 600) {
        const { width, height } = scene.scale;
        const maxR = Math.ceil(Math.sqrt(width * width + height * height) / 2) + 10;

        try {
            // Create a full-screen black overlay
            const overlay = scene.add
                .rectangle(0, 0, width, height, 0x000000, 1)
                .setOrigin(0, 0)
                .setDepth(10000)
                .setScrollFactor(0);

            // Graphics object that draws the circular "hole"
            const maskGfx = scene.make.graphics({ add: false });

            const updateMask = (r) => {
                maskGfx.clear();
                maskGfx.fillStyle(0xffffff, 1);
                maskGfx.fillCircle(width / 2, height / 2, Math.ceil(r));
            };

            updateMask(maxR);

            // invertAlpha = true means: overlay is visible WHERE the circle is NOT
            const mask = maskGfx.createGeometryMask();
            mask.invertAlpha = true;
            overlay.setMask(mask);

            scene.tweens.addCounter({
                from: maxR,
                to: 2,
                duration,
                ease: 'Sine.easeIn',
                onUpdate: (tween) => updateMask(tween.getValue()),
                onComplete: () => {
                    maskGfx.destroy();
                    overlay.destroy();
                    scene.scene.start(targetKey, targetData);
                },
            });
        } catch (e) {
            // Canvas renderer or geometry mask not supported — fall back to camera fade
            SceneTransition.fadeToScene(scene, targetKey, targetData, duration);
        }
    }

    /**
     * Simple camera fade-out → start next scene.
     * Useful as a lightweight alternative when iris wipe is not needed.
     *
     * @param {Phaser.Scene} scene
     * @param {string}       targetKey
     * @param {object}       [targetData={}]
     * @param {number}       [duration=400]
     */
    static fadeToScene(scene, targetKey, targetData = {}, duration = 400) {
        scene.cameras.main.fadeOut(duration, 0, 0, 0);
        scene.cameras.main.once('camerafadeoutcomplete', () => {
            scene.scene.start(targetKey, targetData);
        });
    }
}
