// =========================================
// FIRE NINJA — physics.js  (Arcade Engine)
// =========================================

// ---- Spawner loop (single chain guard) ----
let _spawnerRunning = false;
let _spawnerGen     = 0;
let spawnRate       = 1500;

function startSpawnerOnce() {
    if (_spawnerRunning) return;
    _spawnerRunning = true;
    _spawnerGen++;
    spawnerLoop(_spawnerGen);
}

function spawnerLoop(gen) {
    if (isGameOver || gen !== _spawnerGen) { 
        if (gen !== _spawnerGen) console.log('Old spawner loop killed.');
        return; 
    }
    
    if (!isPaused) {
        spawnFireball();
        const base = Math.max(400, 1500 - score / 100);
        spawnRate  = (base + Math.random() * 500) * 0.95; // 5% faster
    }
    
    if (!isGameOver) setTimeout(() => spawnerLoop(gen), spawnRate); 
}
// Exposed reset function so game.js doesn't touch the private variable directly
function resetSpawner() {
    _spawnerRunning = false;
    _spawnerGen++; // Killing current generation
}
// ---- Fireball spawner ----
/**
 * @param {boolean} noBombs - true during meteor shower to keep it fun
 */
function spawnFireball(noBombs = false) {
    const fireball = document.createElement('div');
    fireball.className = 'fireball-target';

    // Determine type
    const rand = Math.random();
    let type = 'normal';
    let powerUpType = null;

    if (!noBombs && rand < 0.1) {
        type = 'bomb';
        fireball.classList.add('target-bomb');
    } else if (rand < 0.25) { // slightly reduced star chance to make room for powerups
        type = 'star';
        fireball.classList.add('target-star');
    } else if (rand > 0.92 && !noBombs) { // FIX: 8% chance for powerup (was 5%)
        type = 'powerup';
        fireball.classList.add('target-powerup');
        
        // Pick specific powerup
        const pRand = Math.random();
        if (pRand < 0.25) { powerUpType = 'fireBoost'; fireball.classList.add('pu-fire'); }
        else if (pRand < 0.5) { powerUpType = 'slowMo'; fireball.classList.add('pu-slow'); }
        else if (pRand < 0.75) { powerUpType = 'shield'; fireball.classList.add('pu-shield'); }
        else { powerUpType = 'burst'; fireball.classList.add('pu-burst'); }
    }

    // Start position
    const startX = Math.random() * (window.innerWidth - 120) + 10;
    let x = startX, y = window.innerHeight;

    // Physics per type
    let vx = (Math.random() - 0.5) * 8;
    let vy = -(Math.random() * 8 + 12);
    let g  = 0.2;
    if (type === 'star')  { vy = -(Math.random() * 5 + 18); g = 0.30; }
    if (type === 'bomb')  { vy = -(Math.random() * 4 + 7);  g = 0.08; }
    if (type === 'powerup') { vy = -(Math.random() * 3 + 10); g = 0.1; } // floaty

    fireball.style.left = `${x}px`;
    fireball.style.top  = `${y}px`;
    playArea.appendChild(fireball);

    let isHit = false;

    // ---- Hit handler ----
    const hitAction = () => {
        if (isHit || isPaused || isGameOver) return;
        isHit = true;

        if (type === 'bomb') {
            if (shieldActive) {
                // FIX: correct selector — shield is in #upg-shield, not #skill-shield
                shieldActive = false;
                const shieldBtn = document.querySelector('#upg-shield .buy-btn');
                if (shieldBtn) shieldBtn.style.display = 'block';
                shieldStatus.classList.add('hidden');
                updateShopUI();
                playSound(1.0, 0.8, 'boomx.mp3'); // Exact timing
                createFloatingText(x, y - 40, 'SHIELD BROKEN', '#00ffcc');
            } else {
                gameOver();
            }
            fireball.remove();
            return;
        }

        // Handle Power-Up Hit
        if (type === 'powerup') {
            playSound(1.5, 1.0, 'click3.mp3');

            if (powerUpType === 'fireBoost') {
                const oldBase = baseScore;
                baseScore = oldBase * 5;
                createFloatingText(x, y - 40, '🔥 5x POWER BOOST 🔥', '#ff4500');
                playArea.classList.add('fire-flash');
                setTimeout(() => { playArea.classList.remove('fire-flash'); }, 500);
                setTimeout(() => { baseScore = oldBase; }, 10000);
            } else if (powerUpType === 'slowMo') {
                createFloatingText(x, y - 40, '⏳ SLOW MOTION', '#88ccff');
                triggerSkill('freeze', true);
            } else if (powerUpType === 'shield') {
                createFloatingText(x, y - 40, '🛡️ FREE SHIELD', '#00ffcc');
                shieldActive = true;
                updateShopUI();
            } else if (powerUpType === 'burst') {
                createFloatingText(x, y - 40, '💥 SCORE BURST', '#ffcc00');
                const burst = 500 * playerLevel;
                score  += burst;
                number += burst;
                addXP(burst);
                saveGame(); // FIX: Save so burst score isn't lost
            }

            // FIX: Only show visual particles, NOT the generic +0 floating text
            createFireParticles(x, y, 5);
            createFireConfetti(x, y);
            handleCombo(); // Still advance combo
            updateRank();
            if (menusContainer.classList.contains('open')) updateShopUI(); // FIX: guard
            fireball.remove();
            return;
        }

        // FIX: Use Math.max(1, combo) so the very first hit (combo=0 before increment) still scores
        const multiplier   = type === 'star' ? 5 : 1;
        const pointsGained = Math.floor(baseScore * Math.max(1, combo) * multiplier);
        score  += pointsGained;
        number += pointsGained;
        addXP(pointsGained);
        updateProgressionUI();

        // Audio — pitch scales with combo; stars get extra high squeak
        if (type === 'star') {
            playSound(1.0, 1.0, 'click2.mp3'); // Exact timing
        } else {
            const pitch = 1 + Math.min(combo, 20) * 0.05;
            playSound(pitch, 1.0, 'click.mp3'); // default
        }

        // Visual effects
        triggerHitEffects(x, y, pointsGained);
        fireball.remove();
    };

    fireball.addEventListener('mousedown', hitAction);
    fireball.addEventListener('mouseenter', (e) => { if (e.buttons === 1) hitAction(); });

    // ---- Physics loop ----
    function tick() {
        if (isHit || isGameOver) return;

        if (!isPaused && !isTimeFrozen) {
            vy += g;
            x  += vx;
            y  += vy;
            fireball.style.left = `${x}px`;
            fireball.style.top  = `${y}px`;

            // Spirit Blade auto-slash (on the way down, mid-air)
            // FIX: Exclude powerups so spirit blade doesn't auto-collect them
            if (autoSlashActive && type !== 'bomb' && type !== 'powerup' && vy > 0) {
                hitAction();
                return;
            }

            // Off-screen miss
            if (y > window.innerHeight + 120) {
                fireball.remove();
                if (type !== 'bomb') breakCombo();
                return;
            }
        }

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}
