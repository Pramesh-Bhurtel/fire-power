// =========================================
// FIRE NINJA — game.js  (State & Lifecycle)
// =========================================

// Game variables
let number = 0;
let score  = 0;
let combo  = 0;  // Starts at 0 so first hit shows x1
let comboTimer;
let _ultimateOnCooldown = false; // FIX: prevent Fire Ultimate loop past combo 15

let isPaused    = true;   // Start paused for intro
let isGameOver  = false;
let isTimeFrozen = false;
let autoSlashActive = false;

// ---- Player stats ----
let baseScore       = 1;
let autoSparkValue  = 0;
let bellowsMultiplier = 1;
let shieldActive    = false;
let currentRankIndex = 0;
let highScore       = 0;

// ---- Progression System ----
let playerLevel     = 1;
let playerXP        = 0;

function getXPNeeded(level) {
    return 100 * Math.pow(1.5, level - 1);
}

// ---- Upgrade / Skill costs ----
const INITIAL_COSTS = {
    baseFire   : 25,
    autoSpark  : 100,
    bellows    : 800,
    shield     : 2500,
    nova       : 500,
    freeze     : 1000,
    meteor     : 1500,
    spirit     : 4000
};

let costs = { ...INITIAL_COSTS };

// ---- Settings / Save Data ----
const SAVE_KEY = 'fireNinjaData';

function saveGame() {
    const data = {
        score,
        highScore,
        playerLevel,
        playerXP,
        costs,
        baseScore,
        autoSparkValue,
        currentRankIndex,
        bellowsMultiplier
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadGame() {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            score             = data.score || 0;
            highScore         = data.highScore || 0;
            playerLevel       = data.playerLevel || 1;
            playerXP          = data.playerXP || 0;
            currentRankIndex  = data.currentRankIndex || 0;
            bellowsMultiplier = data.bellowsMultiplier || 1;
            
            // Only load costs/upgrades if they exist to prevent breaking on old saves
            if (data.costs) costs = data.costs;
            if (data.baseScore) baseScore = data.baseScore;
            if (data.autoSparkValue) autoSparkValue = data.autoSparkValue;
        } catch (e) {
            console.error('Failed to load save data:', e);
        }
    }
}

function resetProgress() {
    if (confirm("Are you sure you want to reset all your progress? This cannot be undone!")) {
        localStorage.removeItem(SAVE_KEY);
        window.location.reload();
    }
}

// ---- Ranks ----
const ranks = [
    { name: 'Spark',          req: 0     },
    { name: 'Ember',          req: 500   },
    { name: 'Blaze',          req: 2000  },
    { name: 'Inferno',        req: 10000 },
    { name: 'Maka Bosada Aag',req: 50000 }
];

// ---- DOM refs ----
const numberDisplay  = document.getElementById('number');
const scoreDisplay   = document.getElementById('score');
const rankDisplay    = document.getElementById('rank-name');
const comboContainer = document.getElementById('combo-container');
const comboDisplay   = document.getElementById('combo');
const timerBar       = comboContainer.querySelector('.combo-timer-bar'); // Cache for perf
const playArea       = document.getElementById('play-area');
const missOverlay    = document.getElementById('miss-overlay');
const stateOverlay   = document.getElementById('game-state-overlay');
const stateTitle     = document.getElementById('state-title');
const stateDesc      = document.getElementById('state-desc');
const menusContainer = document.getElementById('menus-container');
const pauseToggleBtn = document.getElementById('pause-toggle');
const shieldStatus   = document.getElementById('shield-status');
const levelDisplay   = document.getElementById('player-level-display'); // Cache for perf
const xpBarFill      = document.getElementById('xp-bar-fill');          // Cache for perf

// =========================================
//  COMBO
// =========================================
function handleCombo() {
    combo++;
    comboDisplay.textContent = `x${combo}`;
    comboContainer.classList.remove('hidden');

    comboDisplay.style.transform = 'scale(1.5)';
    setTimeout(() => { comboDisplay.style.transform = 'scale(1)'; }, 100);

    clearTimeout(comboTimer);

    timerBar.style.transition = 'none';
    timerBar.style.transform  = 'scaleX(1)';
    void timerBar.offsetWidth;
    timerBar.style.transition = `transform ${2 * bellowsMultiplier}s linear`;
    timerBar.style.transform  = 'scaleX(0)';

    comboTimer = setTimeout(() => {
        combo = 0;
        comboContainer.classList.add('hidden');
    }, 2000 * bellowsMultiplier);

    // Combo 15 trigger: Fire Ultimate (with cooldown so it doesn't loop)
    if (combo === 15 && !_ultimateOnCooldown) {
        _ultimateOnCooldown = true;
        setTimeout(() => { _ultimateOnCooldown = false; }, 3000);
        triggerSkill('nova', true);
        createFloatingText(window.innerWidth / 2 - 80, window.innerHeight / 2 - 100, '🔥 FIRE ULTIMATE! 🔥', '#ff4500');
        playSound(1.0, 1.0, 'boom.mp3');
    }
}

function breakCombo() {
    clearTimeout(comboTimer);
    combo = 0;
    comboContainer.classList.add('hidden');

    missOverlay.classList.remove('miss-flash');
    void missOverlay.offsetWidth;
    missOverlay.classList.add('miss-flash');
}

// =========================================
//  RANK
// =========================================
function updateRank() {
    if (currentRankIndex < ranks.length - 1) {
        if (score >= ranks[currentRankIndex + 1].req) {
            currentRankIndex++;
            rankDisplay.textContent = ranks[currentRankIndex].name;

            if (ranks[currentRankIndex].name === 'Maka Bosada Aag') {
                document.body.classList.add('maka-bosada-mode');
                playSound(1.0, 1.0, 'boom.mp3');
            }
        }
    }
}

// =========================================
//  PROGRESSION & XP LOGIC
// =========================================
function addXP(amount) {
    playerXP += amount;
    let leveledUp = false;

    while (playerXP >= getXPNeeded(playerLevel)) {
        playerXP -= getXPNeeded(playerLevel);
        playerLevel++;
        leveledUp = true;
    }

    if (leveledUp) {
        playSound(1.0, 1.0, 'click2.mp3');
        createFloatingText(window.innerWidth / 2 - 50, window.innerHeight / 2 - 50, 'LEVEL UP!', '#00ffcc');
        playArea.classList.add('level-up-flash');
        setTimeout(() => playArea.classList.remove('level-up-flash'), 500);
        saveGame();
        if (menusContainer.classList.contains('open')) updateShopUI(); // Unlock new skills
    }

    updateXpUI(); // FIX: Only update XP bar, not full score display
}

// Update only the XP bar and level (called from addXP)
function updateXpUI() {
    if (levelDisplay) levelDisplay.textContent = playerLevel;
    if (xpBarFill) {
        const xpNeeded  = getXPNeeded(playerLevel);
        const xpPercent = Math.max(0, Math.min(100, (playerXP / xpNeeded) * 100));
        xpBarFill.style.width = `${xpPercent}%`;
    }
}

function updateProgressionUI() {
    // Update Power (Currency)
    scoreDisplay.innerHTML = `🔥 Power: ${score}`;
    
    // Update Total (Session Score) & Best (High Score)
    const currentBest = Math.max(number, highScore);
    numberDisplay.innerHTML = `${number} <span class="high-score-text">(Best: ${currentBest})</span>`;
    
    // Update Rank
    rankDisplay.textContent = ranks[currentRankIndex].name;
    
    // Update XP Bar
    updateXpUI();
}

// =========================================
//  SHOP UI
// =========================================
function updateShopUI() {
    document.getElementById('cost-base-fire').textContent  = costs.baseFire;
    document.getElementById('cost-auto-spark').textContent = costs.autoSpark;
    document.getElementById('cost-bellows').textContent    = costs.bellows;
    document.getElementById('cost-nova').textContent    = costs.nova;
    document.getElementById('cost-freeze').textContent  = costs.freeze;
    document.getElementById('cost-meteor').textContent  = costs.meteor;
    document.getElementById('cost-spirit').textContent  = costs.spirit;
    document.getElementById('cost-shield').textContent  = costs.shield;

    document.querySelector('#upg-base-fire .buy-btn').disabled  = score < costs.baseFire;
    document.querySelector('#upg-auto-spark .buy-btn').disabled = score < costs.autoSpark;
    document.querySelector('#upg-bellows .buy-btn').disabled    = score < costs.bellows;
    document.querySelector('#skill-nova .buy-btn').disabled     = score < costs.nova;
    document.querySelector('#skill-freeze .buy-btn').disabled   = score < costs.freeze;
    document.querySelector('#skill-meteor .buy-btn').disabled   = score < costs.meteor;
    document.querySelector('#skill-spirit .buy-btn').disabled   = score < costs.spirit;

    const shieldBtn = document.querySelector('#upg-shield .buy-btn');
    if (shieldActive) {
        shieldBtn.style.display = 'none';
        shieldStatus.classList.remove('hidden');
    } else {
        shieldBtn.style.display = 'block';
        shieldBtn.disabled = score < costs.shield;
        shieldStatus.classList.add('hidden');
    }

    // Handle Level Restrictions for Skills
    document.querySelectorAll('.skills-panel .upgrade-item').forEach(item => {
        const reqLevel = item.getAttribute('data-req-level');
        if (reqLevel) {
            item.classList.toggle('locked', playerLevel < parseInt(reqLevel));
        }
    });
}

// =========================================
//  INTRO GUIDE
// =========================================
window.closeIntro = function() {
    document.getElementById('intro-guide').classList.add('hidden');
    loadGame();            // Load save FIRST so UI has correct values
    updateProgressionUI(); // Initialize UI from loaded data
    isPaused = false;      // Then unpause
    startSpawnerOnce();    // Safe single start
};

// =========================================
//  PAUSE / RESUME  (Unified Spacebar)
// =========================================
window.togglePause = function() {
    if (isGameOver) return;
    if (!document.getElementById('intro-guide').classList.contains('hidden')) return;

    isPaused = !isPaused;
    menusContainer.classList.toggle('open', isPaused);

    if (isPaused) {
        stateOverlay.classList.remove('hidden');
        stateTitle.textContent  = 'PAUSED';
        stateTitle.style.color  = '#ffcc00';
        stateDesc.textContent   = 'Press Space to resume.';
        pauseToggleBtn.textContent = '▶ Resume [Space]';
        pauseToggleBtn.classList.add('active');
    } else {
        stateOverlay.classList.add('hidden');
        pauseToggleBtn.textContent = '⏸ Pause & Shop [Space]';
        pauseToggleBtn.classList.remove('active');
        startSpawnerOnce(); // re-start after unpause
    }
};

// =========================================
//  GAME OVER
// =========================================
function gameOver() {
    playSound(1.0, 1.0, 'boom.mp3');
    isGameOver = true;

    stateOverlay.classList.remove('hidden');
    stateTitle.textContent  = 'GAME OVER';
    stateTitle.style.color  = '#ff0000';
    stateDesc.textContent   = 'You hit a Bomb! Click anywhere to restart.';

    playArea.classList.add('maka-bosada-mode');
    setTimeout(() => playArea.classList.remove('maka-bosada-mode'), 1000);

    stateOverlay.onclick = restartGame;
}

function restartGame() {
    if (number > highScore) highScore = number;

    // Hard Reset EVERYTHING on Game Over (except High Score)
    score             = 0;
    number            = 0;
    combo             = 0;
    playerLevel       = 1;
    playerXP          = 0;
    currentRankIndex  = 0;
    baseScore         = 1;
    autoSparkValue    = 0;
    bellowsMultiplier = 1;
    
    costs = { ...INITIAL_COSTS };

    shieldActive      = false;
    isGameOver        = false;
    isPaused          = false;
    isTimeFrozen      = false;
    autoSlashActive   = false;
    _ultimateOnCooldown = false;

    // Persist the wipe
    saveGame();

    // Clean up ultimate mode CSS
    document.body.classList.remove('maka-bosada-mode');

    stateOverlay.classList.add('hidden');
    stateOverlay.onclick = null;

    updateProgressionUI();
    rankDisplay.textContent    = ranks[0].name;
    comboContainer.classList.add('hidden');

    pauseToggleBtn.textContent = '⏸ Pause & Shop [Space]';
    pauseToggleBtn.classList.remove('active');
    menusContainer.classList.remove('open');

    document.querySelectorAll('.fireball-target').forEach(t => t.remove());

    // FIX: Use exposed resetSpawner() instead of touching the private variable
    resetSpawner();

    updateShopUI();
    startSpawnerOnce();
}

// =========================================
//  BUY / UPGRADE
// =========================================
window.buyUpgrade = function(type) {
    if (score < costs[type]) return;
    score -= costs[type];

    switch (type) {
        case 'baseFire':
            baseScore++;
            costs.baseFire = Math.floor(costs.baseFire * 1.5);
            break;
        case 'autoSpark':
            autoSparkValue++;
            costs.autoSpark = Math.floor(costs.autoSpark * 1.5);
            break;
        case 'bellows':
            bellowsMultiplier = Math.min(bellowsMultiplier + 0.5, 4.0); // Max 4x window
            costs.bellows = Math.floor(costs.bellows * 2.0);
            createFloatingText(window.innerWidth / 2 - 80, window.innerHeight / 2, '⏱ COMBO WINDOW EXTENDED!', '#ffcc00');
            break;
        case 'shield':
            shieldActive = true;
            costs.shield = Math.floor(costs.shield * 1.5);
            break;
    }

    updateProgressionUI();
    updateShopUI();
    saveGame();
};

// Auto-Spark
setInterval(() => {
    if (isPaused || isGameOver || autoSparkValue === 0) return;
    score  += autoSparkValue;
    number += autoSparkValue;
    // XP and Rank
    addXP(autoSparkValue);
    updateRank();
    
    // Unify UI update
    updateProgressionUI();
    
    // FIX: Only update shop UI if menu is open (saves DOM reflow)
    if (menusContainer.classList.contains('open')) updateShopUI();
}, 1000);

// =========================================
//  KEYBOARD SHORTCUTS
// =========================================
document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        window.togglePause();
    } else if (!isPaused && !isGameOver) {
        const keyMap = { 'a': 'nova', 's': 'freeze', 'd': 'meteor', 'w': 'spirit' };
        const skillType = keyMap[e.key.toLowerCase()];
        if (!skillType) return;

        // FIX: Show feedback if skill is level-locked
        const reqLevelMap = { nova: 1, freeze: 5, meteor: 10, spirit: 15 };
        const reqLvl = reqLevelMap[skillType];
        if (playerLevel < reqLvl) {
            createFloatingText(window.innerWidth / 2 - 80, window.innerHeight / 2, `🔒 Reach Level ${reqLvl}!`, '#ff4500');
            return;
        }

        window.triggerSkill(skillType);
    }
});
