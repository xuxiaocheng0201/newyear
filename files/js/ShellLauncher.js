function seqRandomShell() {
    const size = getRandomShellSize();
    const shell = new Shell(randomShell(size.size));
    shell.launch(size.x, size.height);

    let extraDelay = shell.starLife;
    if (shell.fallingLeaves) {
        extraDelay = 4600;
    }

    return 900 + Math.random() * 600 + extraDelay;
}

function seqTwoRandom() {
    const size1 = getRandomShellSize();
    const size2 = getRandomShellSize();
    const shell1 = new Shell(randomShell(size1.size));
    const shell2 = new Shell(randomShell(size2.size));
    const leftOffset = Math.random() * 0.2 - 0.1;
    const rightOffset = Math.random() * 0.2 - 0.1;
    shell1.launch(0.3 + leftOffset, size1.height);
    setTimeout(() => {
        shell2.launch(0.7 + rightOffset, size2.height);
    }, 100);

    let extraDelay = Math.max(shell1.starLife, shell2.starLife);
    if (shell1.fallingLeaves || shell2.fallingLeaves) {
        extraDelay = 4600;
    }

    return 900 + Math.random() * 600 + extraDelay;
}

function seqTriple() {
    const shellType = randomFastShell();
    const baseSize = getDefaultShellSize();
    const smallSize = Math.max(0, baseSize - 1.25);

    const offset = Math.random() * 0.08 - 0.04;
    const shell1 = new Shell(shellType(baseSize));
    shell1.launch(0.5 + offset, 0.7);

    const leftDelay = 1000 + Math.random() * 400;
    const rightDelay = 1000 + Math.random() * 400;

    setTimeout(() => {
        const offset = Math.random() * 0.08 - 0.04;
        const shell2 = new Shell(shellType(smallSize));
        shell2.launch(0.2 + offset, 0.1);
    }, leftDelay);

    setTimeout(() => {
        const offset = Math.random() * 0.08 - 0.04;
        const shell3 = new Shell(shellType(smallSize));
        shell3.launch(0.8 + offset, 0.1);
    }, rightDelay);

    return 4000;
}

function seqPyramid() {
    const barrageCountHalf = IS_DESKTOP ? 7 : 4;
    const largeSize = getDefaultShellSize();
    const smallSize = Math.max(0, largeSize - 3);
    const randomMainShell = Math.random() < 0.78 ? crysanthemumShell : ringShell;
    const randomSpecialShell = randomShell;

    function launchShell(x, useSpecial) {
        let shellType = useSpecial ? randomSpecialShell : randomMainShell;
        const shell = new Shell(shellType(useSpecial ? largeSize : smallSize));
        const height = x <= 0.5 ? x / 0.5 : (1 - x) / 0.5;
        shell.launch(x, useSpecial ? 0.75 : height * 0.42);
    }

    let count = 0;
    let delay = 0;
    while (count <= barrageCountHalf) {
        if (count === barrageCountHalf) {
            setTimeout(() => {
                launchShell(0.5, true);
            }, delay);
        } else {
            const offset = count / barrageCountHalf * 0.5;
            const delayOffset = Math.random() * 30 + 30;
            setTimeout(() => {
                launchShell(offset, false);
            }, delay);
            setTimeout(() => {
                launchShell(1 - offset, false);
            }, delay + delayOffset);
        }

        count++;
        delay += 200;
    }

    return 3400 + barrageCountHalf * 250;
}

function seqSmallBarrage() {
    seqSmallBarrage.lastCalled = Date.now();
    const barrageCount = IS_DESKTOP ? 11 : 5;
    const specialIndex = IS_DESKTOP ? 3 : 1;
    const shellSize = Math.max(0, getDefaultShellSize() - 2);
    const randomMainShell = Math.random() < 0.78 ? crysanthemumShell : ringShell;
    const randomSpecialShell = randomFastShell();

    // (cos(x*5π+0.5π)+1)/2 is a custom wave bounded by 0 and 1 used to set varying launch heights
    function launchShell(x, useSpecial) {
        let shellType = useSpecial ? randomSpecialShell : randomMainShell;
        const shell = new Shell(shellType(shellSize));
        const height = (Math.cos(x * 5 * Math.PI + PI_HALF) + 1) / 2;
        shell.launch(x, height * 0.75);
    }

    let count = 0;
    let delay = 0;
    while (count < barrageCount) {
        if (count === 0) {
            launchShell(0.5, false)
            count += 1;
        } else {
            const offset = (count + 1) / barrageCount / 2;
            const delayOffset = Math.random() * 30 + 30;
            const useSpecial = count === specialIndex;
            setTimeout(() => {
                launchShell(0.5 + offset, useSpecial);
            }, delay);
            setTimeout(() => {
                launchShell(0.5 - offset, useSpecial);
            }, delay + delayOffset);
            count += 2;
        }
        delay += 200;
    }

    return 3400 + barrageCount * 120;
}

seqSmallBarrage.cooldown = 15000;
seqSmallBarrage.lastCalled = Date.now();


let isFirstSeq = true;

function startSequence() {
    if (isFirstSeq) {
        isFirstSeq = false;
        if (IS_HEADER) {
            return seqTwoRandom();
        } else {
            const shell = new Shell(crysanthemumShell(getDefaultShellSize()));
            shell.launch(0.5, 0.5);
            return 2400;
        }
    }

    const rand = Math.random();

    if (rand < 0.08 && Date.now() - seqSmallBarrage.lastCalled > seqSmallBarrage.cooldown) {
        return seqSmallBarrage();
    }

    if (rand < 0.1) {
        return seqPyramid();
    }

    if (rand < 0.6 && !IS_HEADER) {
        return seqRandomShell();
    } else if (rand < 0.8) {
        return seqTwoRandom();
    } else if (rand < 1) {
        return seqTriple();
    }
}


// Helper used to semi-randomly spread particles over an arc
// Values are flexible - `start` and `arcLength` can be negative, and `randomness` is simply a multiplier for random addition.
function createParticleArc(start, arcLength, count, randomness, particleFactory) {
    const angleDelta = arcLength / count;
    // Sometimes there is an extra particle at the end, too close to the start. Subtracting half the angleDelta ensures that is skipped.
    // Would be nice to fix this a better way.
    const end = start + arcLength - (angleDelta * 0.5);

    if (end > start) {
        // Optimization: `angle=angle+angleDelta` vs. angle+=angleDelta
        // V8 deoptimises with let compound assignment
        for (let angle = start; angle < end; angle = angle + angleDelta) {
            particleFactory(angle + Math.random() * angleDelta * randomness);
        }
    } else {
        for (let angle = start; angle > end; angle = angle + angleDelta) {
            particleFactory(angle + Math.random() * angleDelta * randomness);
        }
    }
}

/**
 * Helper used to create a spherical burst of particles.
 *
 * @param  {Number} count               The desired number of stars/particles. This value is a suggestion, and the
 *                                      created burst may have more particles. The current algorithm can't perfectly
 *                                      distribute a specific number of points evenly on a sphere's surface.
 * @param  {Function} particleFactory   Called once per star/particle generated. Passed two arguments:
 *                                        `angle`: The direction of the star/particle.
 *                                        `speed`: A multipler for the particle speed, from 0.0 to 1.0.
 * @param  {Number} startAngle=0        For segmented bursts, you can generate only a partial arc of particles. This
 *                                      allows setting the starting arc angle (radians).
 * @param  {Number} arcLength=TAU       The length of the arc (radians). Defaults to a full circle.
 *
 * @return {void}              Returns nothing; it's up to `particleFactory` to use the given data.
 */
function createBurst(count, particleFactory, startAngle = 0, arcLength = PI_2) {
    // Assuming sphere with surface area of `count`, calculate various
    // properties of said sphere (unit is stars).
    // Radius
    const R = 0.5 * Math.sqrt(count / Math.PI);
    // Circumference
    const C = 2 * R * Math.PI;
    // Half Circumference
    const C_HALF = C / 2;

    // Make a series of rings, sizing them as if they were spaced evenly
    // along the curved surface of a sphere.
    for (let i = 0; i <= C_HALF; i++) {
        const ringAngle = i / C_HALF * PI_HALF;
        const ringSize = Math.cos(ringAngle);
        const partsPerFullRing = C * ringSize;
        const partsPerArc = partsPerFullRing * (arcLength / PI_2);

        const angleInc = PI_2 / partsPerFullRing;
        const angleOffset = Math.random() * angleInc + startAngle;
        // Each particle needs a bit of randomness to improve appearance.
        const maxRandomAngleOffset = angleInc * 0.33;

        for (let i = 0; i < partsPerArc; i++) {
            const randomAngleOffset = Math.random() * maxRandomAngleOffset;
            let angle = angleInc * i + angleOffset + randomAngleOffset;
            particleFactory(angle, ringSize);
        }
    }
}


// Various star effects.
// These are designed to be attached to a star's `onDeath` event.

// Crossette breaks star into four same-color pieces which branch in a cross-like shape.
function crossetteEffect(star) {
    const startAngle = Math.random() * PI_HALF;
    createParticleArc(startAngle, PI_2, 4, 0.5, (angle) => {
        Star.add(
            star.x,
            star.y,
            star.color,
            angle,
            Math.random() * 0.6 + 0.75,
            600
        );
    });
}

// Flower is like a mini shell
function floralEffect(star) {
    const count = 12 + 6 * quality;
    createBurst(count, (angle, speedMult) => {
        Star.add(
            star.x,
            star.y,
            star.color,
            angle,
            speedMult * 2.4,
            1000 + Math.random() * 300,
            star.speedX,
            star.speedY
        );
    });
    // Queue burst flash render
    BurstFlash.add(star.x, star.y, 46);
    soundManager.playSound('burstSmall');
}

// Floral burst with willow stars
function fallingLeavesEffect(star) {
    createBurst(7, (angle, speedMult) => {
        const newStar = Star.add(
            star.x,
            star.y,
            INVISIBLE,
            angle,
            speedMult * 2.4,
            2400 + Math.random() * 600,
            star.speedX,
            star.speedY
        );

        newStar.sparkColor = COLOR.Gold;
        newStar.sparkFreq = 144 / quality;
        newStar.sparkSpeed = 0.28;
        newStar.sparkLife = 750;
        newStar.sparkLifeVariation = 3.2;
    });
    // Queue burst flash render
    BurstFlash.add(star.x, star.y, 46);
    soundManager.playSound('burstSmall');
}

// Crackle pops into a small cloud of golden sparks.
function crackleEffect(star) {
    const count = isHighQuality ? 32 : 16;
    createParticleArc(0, PI_2, count, 1.8, (angle) => {
        Spark.add(
            star.x,
            star.y,
            COLOR.Gold,
            angle,
            // apply near cubic falloff to speed (places more particles towards outside)
            Math.pow(Math.random(), 0.45) * 2.4,
            300 + Math.random() * 200
        );
    });
}


/**
 * Shell can be constructed with options:
 *
 * spreadSize:      Size of the burst.
 * starCount: Number of stars to create. This is optional, and will be set to a reasonable quantity for size if omitted.
 * starLife:
 * starLifeVariation:
 * color:
 * glitterColor:
 * glitter: One of: 'light', 'medium', 'heavy', 'streamer', 'willow'
 * pistil:
 * pistilColor:
 * streamers:
 * crossette:
 * floral:
 * crackle:
 */
class Shell {
    constructor(options) {
        Object.assign(this, options);
        this.starLifeVariation = options.starLifeVariation || 0.125;
        this.color = options.color || randomColor();
        this.glitterColor = options.glitterColor || this.color;

        // Set default starCount if needed, will be based on shell size and scale exponentially, like a sphere's surface area.
        if (!this.starCount) {
            const density = options.starDensity || 1;
            const scaledSize = this.spreadSize / 54;
            this.starCount = Math.max(6, scaledSize * scaledSize * density);
        }
    }

    launch(position, launchHeight) {
        const width = stageW;
        const height = stageH;
        // Distance from sides of screen to keep shells.
        const hpad = 60;
        // Distance from top of screen to keep shell bursts.
        const vpad = 50;
        // Minimum burst height, as a percentage of stage height
        const minHeightPercent = 0.45;
        // Minimum burst height in px
        const minHeight = height - height * minHeightPercent;

        const launchX = position * (width - hpad * 2) + hpad;
        const launchY = height;
        const burstY = minHeight - (launchHeight * (minHeight - vpad));

        const launchDistance = launchY - burstY;
        // Using a custom power curve to approximate Vi needed to reach launchDistance under gravity and air drag.
        // Magic numbers came from testing.
        const launchVelocity = Math.pow(launchDistance * 0.04, 0.64);

        const comet = this.comet = Star.add(
            launchX,
            launchY,
            typeof this.color === 'string' && this.color !== 'random' ? this.color : COLOR.White,
            Math.PI,
            launchVelocity * (this.horsetail ? 1.2 : 1),
            // Hang time is derived linearly from Vi; exact number came from testing
            launchVelocity * (this.horsetail ? 100 : 400)
        );

        // making comet "heavy" limits air drag
        comet.heavy = true;
        // comet spark trail
        comet.spinRadius = MyMath.random(0.32, 0.85);
        comet.sparkFreq = 32 / quality;
        if (isHighQuality) comet.sparkFreq = 8;
        comet.sparkLife = 320;
        comet.sparkLifeVariation = 3;
        if (this.glitter === 'willow' || this.fallingLeaves) {
            comet.sparkFreq = 20 / quality;
            comet.sparkSpeed = 0.5;
            comet.sparkLife = 500;
        }
        if (this.color === INVISIBLE) {
            comet.sparkColor = COLOR.Gold;
        }

        // Randomly make comet "burn out" a bit early.
        // This is disabled for horsetail shells, due to their very short airtime.
        if (Math.random() > 0.4 && !this.horsetail) {
            comet.secondColor = INVISIBLE;
            comet.transitionTime = Math.pow(Math.random(), 1.5) * 700 + 500;
        }

        comet.onDeath = comet => this.burst(comet.x, comet.y);

        soundManager.playSound('lift');
    }

    burst(x, y) {
        // Set burst speed so overall burst grows to set size. This specific formula was derived from testing, and is affected by simulated air drag.
        const speed = this.spreadSize / 96;

        let color, onDeath, sparkFreq, sparkSpeed, sparkLife;
        let sparkLifeVariation = 0.25;
        // Some death effects, like crackle, play a sound, but should only be played once.
        let playedDeathSound = false;

        if (this.crossette) onDeath = (star) => {
            if (!playedDeathSound) {
                soundManager.playSound('crackleSmall');
                playedDeathSound = true;
            }
            crossetteEffect(star);
        }
        if (this.crackle) onDeath = (star) => {
            if (!playedDeathSound) {
                soundManager.playSound('crackle');
                playedDeathSound = true;
            }
            crackleEffect(star);
        }
        if (this.floral) onDeath = floralEffect;
        if (this.fallingLeaves) onDeath = fallingLeavesEffect;

        if (this.glitter === 'light') {
            sparkFreq = 400;
            sparkSpeed = 0.3;
            sparkLife = 300;
            sparkLifeVariation = 2;
        } else if (this.glitter === 'medium') {
            sparkFreq = 200;
            sparkSpeed = 0.44;
            sparkLife = 700;
            sparkLifeVariation = 2;
        } else if (this.glitter === 'heavy') {
            sparkFreq = 80;
            sparkSpeed = 0.8;
            sparkLife = 1400;
            sparkLifeVariation = 2;
        } else if (this.glitter === 'thick') {
            sparkFreq = 16;
            sparkSpeed = isHighQuality ? 1.65 : 1.5;
            sparkLife = 1400;
            sparkLifeVariation = 3;
        } else if (this.glitter === 'streamer') {
            sparkFreq = 32;
            sparkSpeed = 1.05;
            sparkLife = 620;
            sparkLifeVariation = 2;
        } else if (this.glitter === 'willow') {
            sparkFreq = 120;
            sparkSpeed = 0.34;
            sparkLife = 1400;
            sparkLifeVariation = 3.8;
        }

        // Apply quality to spark count
        sparkFreq = sparkFreq / quality;

        // Star factory for primary burst, pistils, and streamers.
        const starFactory = (angle, speedMult) => {
            // For non-horsetail shells, compute an initial vertical speed to add to star burst.
            // The magic number comes from testing what looks best. The ideal is that all shell
            // bursts appear visually centered for the majority of the star life (excl. willows etc.)
            const standardInitialSpeed = this.spreadSize / 1800;

            const star = Star.add(
                x,
                y,
                color || randomColor(),
                angle,
                speedMult * speed,
                // add minor variation to star life
                this.starLife + Math.random() * this.starLife * this.starLifeVariation,
                this.horsetail ? this.comet && this.comet.speedX : 0,
                this.horsetail ? this.comet && this.comet.speedY : -standardInitialSpeed
            );

            if (this.secondColor) {
                star.transitionTime = this.starLife * (Math.random() * 0.05 + 0.32);
                star.secondColor = this.secondColor;
            }

            if (this.strobe) {
                star.transitionTime = this.starLife * (Math.random() * 0.08 + 0.46);
                star.strobe = true;
                // How many milliseconds between switch of strobe state "tick". Note that the strobe pattern
                // is on:off:off, so this is the "on" duration, while the "off" duration is twice as long.
                star.strobeFreq = Math.random() * 20 + 40;
                if (this.strobeColor) {
                    star.secondColor = this.strobeColor;
                }
            }

            star.onDeath = onDeath;

            if (this.glitter) {
                star.sparkFreq = sparkFreq;
                star.sparkSpeed = sparkSpeed;
                star.sparkLife = sparkLife;
                star.sparkLifeVariation = sparkLifeVariation;
                star.sparkColor = this.glitterColor;
                star.sparkTimer = Math.random() * star.sparkFreq;
            }
        };


        if (typeof this.color === 'string') {
            if (this.color === 'random') {
                color = null; // falsey value creates random color in starFactory
            } else {
                color = this.color;
            }

            // Rings have positional randomness, but are rotated randomly
            if (this.ring) {
                const ringStartAngle = Math.random() * Math.PI;
                const ringSquash = Math.pow(Math.random(), 2) * 0.85 + 0.15;

                createParticleArc(0, PI_2, this.starCount, 0, angle => {
                    // Create a ring, squashed horizontally
                    const initSpeedX = Math.sin(angle) * speed * ringSquash;
                    const initSpeedY = Math.cos(angle) * speed;
                    // Rotate ring
                    const newSpeed = MyMath.pointDist(0, 0, initSpeedX, initSpeedY);
                    const newAngle = MyMath.pointAngle(0, 0, initSpeedX, initSpeedY) + ringStartAngle;
                    const star = Star.add(
                        x,
                        y,
                        color,
                        newAngle,
                        // apply near cubic falloff to speed (places more particles towards outside)
                        newSpeed, //speed,
                        // add minor variation to star life
                        this.starLife + Math.random() * this.starLife * this.starLifeVariation
                    );

                    if (this.glitter) {
                        star.sparkFreq = sparkFreq;
                        star.sparkSpeed = sparkSpeed;
                        star.sparkLife = sparkLife;
                        star.sparkLifeVariation = sparkLifeVariation;
                        star.sparkColor = this.glitterColor;
                        star.sparkTimer = Math.random() * star.sparkFreq;
                    }
                });
            }
            // Normal burst
            else {
                createBurst(this.starCount, starFactory);
            }
        } else if (Array.isArray(this.color)) {
            if (Math.random() < 0.5) {
                const start = Math.random() * Math.PI;
                const start2 = start + Math.PI;
                const arc = Math.PI;
                color = this.color[0];
                // Not creating a full arc automatically reduces star count.
                createBurst(this.starCount, starFactory, start, arc);
                color = this.color[1];
                createBurst(this.starCount, starFactory, start2, arc);
            } else {
                color = this.color[0];
                createBurst(this.starCount / 2, starFactory);
                color = this.color[1];
                createBurst(this.starCount / 2, starFactory);
            }
        } else {
            throw new Error('Invalid shell color. Expected string or array of strings, but got: ' + this.color);
        }

        if (this.pistil) {
            const innerShell = new Shell({
                spreadSize: this.spreadSize * 0.5,
                starLife: this.starLife * 0.6,
                starLifeVariation: this.starLifeVariation,
                starDensity: 1.4,
                color: this.pistilColor,
                glitter: 'light',
                glitterColor: this.pistilColor === COLOR.Gold ? COLOR.Gold : COLOR.White
            });
            innerShell.burst(x, y);
        }

        if (this.streamers) {
            const innerShell = new Shell({
                spreadSize: this.spreadSize * 0.9,
                starLife: this.starLife * 0.8,
                starLifeVariation: this.starLifeVariation,
                starCount: Math.floor(Math.max(6, this.spreadSize / 45)),
                color: COLOR.White,
                glitter: 'streamer'
            });
            innerShell.burst(x, y);
        }

        // Queue burst flash render
        BurstFlash.add(x, y, this.spreadSize / 4);

        // Play sound, but only for "original" shell, the one that was launched.
        // We don't want multiple sounds from pistil or streamer "sub-shells".
        // This can be detected by the presence of a comet.
        if (this.comet) {
            // Scale explosion sound based on current shell size and selected (max) shell size.
            // Shooting selected shell size will always sound the same no matter the selected size,
            // but when smaller shells are auto-fired, they will sound smaller. It doesn't sound great
            // when a value too small is given though, so instead of basing it on proportions, we just
            // look at the difference in size and map it to a range known to sound good.
            const maxDiff = 2;
            const sizeDifferenceFromMaxSize = Math.min(maxDiff, getDefaultShellSize() - this.shellSize);
            const soundScale = (1 - sizeDifferenceFromMaxSize / maxDiff) * 0.3 + 0.7;
            soundManager.playSound('burst', soundScale);
        }
    }
}



// Helper to generate objects for storing active particles.
// Particles are stored in arrays keyed by color (code, not name) for improved rendering performance.
function createParticleCollection() {
    const collection = {};
    COLOR_CODES_W_INVIS.forEach(color => {
        collection[color] = [];
    });
    return collection;
}

// Star properties (WIP)
// -----------------------
// transitionTime - how close to end of life that star transition happens

const Star = {
    // Visual properties
    drawWidth: 3,
    airDrag: 0.98,
    airDragHeavy: 0.992,

    // Star particles will be keyed by color
    active: createParticleCollection(),
    _pool: [],

    _new() {
        return {};
    },

    add(x, y, color, angle, speed, life, speedOffX, speedOffY) {
        const instance = this._pool.pop() || this._new();

        instance.visible = true;
        instance.heavy = false;
        instance.x = x;
        instance.y = y;
        instance.prevX = x;
        instance.prevY = y;
        instance.color = color;
        instance.speedX = Math.sin(angle) * speed + (speedOffX || 0);
        instance.speedY = Math.cos(angle) * speed + (speedOffY || 0);
        instance.life = life;
        instance.fullLife = life;
        instance.spinAngle = Math.random() * PI_2;
        instance.spinSpeed = 0.8;
        instance.spinRadius = 0;
        instance.sparkFreq = 0; // ms between spark emissions
        instance.sparkSpeed = 1;
        instance.sparkTimer = 0;
        instance.sparkColor = color;
        instance.sparkLife = 750;
        instance.sparkLifeVariation = 0.25;
        instance.strobe = false;

        this.active[color].push(instance);
        return instance;
    },

    // Public method for cleaning up and returning an instance back to the pool.
    returnInstance(instance) {
        // Call onDeath handler if available (and pass it current star instance)
        instance.onDeath && instance.onDeath(instance);
        // Clean up
        instance.onDeath = null;
        instance.secondColor = null;
        instance.transitionTime = 0;
        instance.colorChanged = false;
        // Add back to the pool.
        this._pool.push(instance);
    }
};

const Spark = {
    // Visual properties
    drawWidth: 0, // set in `configDidUpdate()`
    airDrag: 0.9,

    // Star particles will be keyed by color
    active: createParticleCollection(),
    _pool: [],

    _new() {
        return {};
    },

    add(x, y, color, angle, speed, life) {
        const instance = this._pool.pop() || this._new();

        instance.x = x;
        instance.y = y;
        instance.prevX = x;
        instance.prevY = y;
        instance.color = color;
        instance.speedX = Math.sin(angle) * speed;
        instance.speedY = Math.cos(angle) * speed;
        instance.life = life;

        this.active[color].push(instance);
        return instance;
    },

    // Public method for cleaning up and returning an instance back to the pool.
    returnInstance(instance) {
        // Add back to the pool.
        this._pool.push(instance);
    }
};
