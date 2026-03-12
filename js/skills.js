// =========================================
// FIRE NINJA — skills.js  (Active Skills)
// =========================================

window.triggerSkill = function(type, isFree = false) {
    if (isPaused || isGameOver) return;
    
    if (!isFree) {
        if (score < costs[type]) return;
        score -= costs[type];
        updateProgressionUI();
        updateShopUI();
    }

    switch (type) {
        case 'nova': {
            // Obliterate all non-bomb targets
            const targets = document.querySelectorAll('.fireball-target:not(.target-bomb)');
            if (targets.length === 0) {
                if (!isFree) { 
                    score += costs[type]; 
                    updateProgressionUI();
                    updateShopUI(); 
                } 
                return; 
            } 

            playArea.classList.add('maka-bosada-mode');
            setTimeout(() => playArea.classList.remove('maka-bosada-mode'), 500);
            playSound(1.0, 1.0, 'boom.mp3');

            let totalPts = 0;
            let midX = 0, midY = 0;
            targets.forEach(fb => {
                const rect  = fb.getBoundingClientRect();
                const cx    = rect.left + rect.width / 2;
                const cy    = rect.top  + rect.height / 2;
                midX += cx; midY += cy;
                const pts   = Math.floor(baseScore * Math.max(1, combo));
                score  += pts;
                number += pts;
                totalPts += pts;
                fb.remove();
            });
            // FIX: Batch all addXP/rank/effects calls ONCE outside loop
            addXP(totalPts);
            const avgX = midX / targets.length;
            const avgY = midY / targets.length;
            createFloatingText(avgX, avgY - 30, totalPts);
            createFireParticles(avgX, avgY, 10);
            createFireConfetti(avgX, avgY);
            handleCombo();
            updateRank();

            updateProgressionUI();
            saveGame();
            break;
        }

        case 'freeze': {
            if (isTimeFrozen) return; // FIX: Don't allow stacking freeze
            isTimeFrozen = true;
            playArea.style.filter = 'hue-rotate(180deg)';
            playSound(1.0, 1.0, 'click3.mp3');
            createFloatingText(window.innerWidth / 2 - 60, window.innerHeight / 2, '❄ FREEZE ❄', '#88ccff');
            setTimeout(() => {
                isTimeFrozen = false;
                playArea.style.filter = 'none';
                playSound(1.0, 0.6, 'click3.mp3');
            }, 5000);
            break;
        }

        case 'meteor': {
            playSound(1.0, 1.0, 'boom.mp3');
            playArea.classList.add('fire-flash');
            setTimeout(() => playArea.classList.remove('fire-flash'), 200);
            createFloatingText(window.innerWidth / 2 - 60, window.innerHeight / 2, '☄ METEOR!', '#ffcc00');
            for (let i = 0; i < 10; i++) {
                // stagger spawns; noBombs=true prevents bomb spawns during shower
                setTimeout(() => spawnFireball(true), i * 120);
            }
            break;
        }

        case 'spirit': {
            autoSlashActive = true;
            playSound(1.0, 1.0, 'click2.mp3');
            createFloatingText(window.innerWidth / 2 - 80, window.innerHeight / 2, '⚔ SPIRIT BLADE ⚔', '#00ffcc');
            setTimeout(() => {
                autoSlashActive = false;
                createFloatingText(window.innerWidth / 2 - 60, window.innerHeight / 2 + 50, 'Blade faded', '#888');
            }, 5000);
            break;
        }
    }
};
