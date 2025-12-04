/**
 * Black Hole Mode - Ultra Realistic Implementation
 * Allows elements to be sucked into a black hole, then float freely with zero gravity
 */

class BlackHoleMode {
    constructor() {
        this.isActive = false;
        this.affectedElements = [];
        this.elementStates = new Map(); // Store original positions
        this.blackHoleCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.floatingElements = [];
        this.animationFrameId = null;
        this.draggedElement = null;
        this.dragOffset = { x: 0, y: 0 };
        this.snowFlakes = null;
        this.originalSnowStepFn = null;
        
        this.init();
    }

    init() {
        const powerBtn = document.querySelector('.power-by-exotic');
        if (!powerBtn) return;

        powerBtn.addEventListener('click', () => this.toggleBlackHole());
        window.addEventListener('resize', () => {
            this.blackHoleCenter = {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            };
        });
    }

    toggleBlackHole() {
        if (!this.isActive) {
            this.activateBlackHole();
        } else {
            this.deactivateBlackHole();
        }
    }

    activateBlackHole() {
        this.isActive = true;
        const container = document.querySelector('.black-hole-container');
        container.classList.add('active');

        // Collect all draggable elements and save their original state
        this.affectedElements = this.getAffectedElements();
        
        // Save original positions and styles
        this.affectedElements.forEach(elem => {
            if (!this.elementStates.has(elem)) {
                const rect = elem.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(elem);
                this.elementStates.set(elem, {
                    position: elem.style.position || computedStyle.position,
                    left: elem.style.left,
                    top: elem.style.top,
                    transform: elem.style.transform,
                    zIndex: elem.style.zIndex || computedStyle.zIndex,
                    cursor: elem.style.cursor
                });
            }
        });
        
        // Intercept snow canvas if available
        const canvas = document.getElementById('snow-canvas');
        if (canvas) {
            canvas.classList.add('black-hole-active');
        }
        
        // Start sucking elements in
        this.startSuckingAnimation();
        
        // Show power button as always clickable
        const powerBtn = document.querySelector('.power-by-exotic');
        powerBtn.style.zIndex = '210';
        powerBtn.style.position = 'fixed';
    }

    deactivateBlackHole() {
        this.isActive = false;
        const container = document.querySelector('.black-hole-container');
        container.classList.remove('active');

        // Stop animation
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Reset black hole size
        const blackHole = document.querySelector('.black-hole');
        if (blackHole) {
            blackHole.style.width = '200px';
            blackHole.style.height = '200px';
            blackHole.style.marginLeft = '-100px';
            blackHole.style.marginTop = '-100px';
        }

        // Restore all elements to their original state
        this.elementStates.forEach((state, elem) => {
            if (elem && elem.parentElement) {
                elem.classList.remove('floating-item', 'black-hole-active');
                
                // Remove all inline styles to restore original state
                elem.style.position = '';
                elem.style.left = '';
                elem.style.top = '';
                elem.style.transform = '';
                elem.style.zIndex = '';
                elem.style.cursor = '';
                elem.style.opacity = '';
                elem.style.pointerEvents = '';
                
                // Force reflow to apply changes
                void elem.offsetHeight;
            }
        });

        // Restore canvas visibility
        const canvas = document.getElementById('snow-canvas');
        if (canvas) {
            canvas.classList.remove('black-hole-active');
            canvas.style.display = '';
        }

        this.floatingElements = [];
        this.affectedElements = [];
        this.elementStates.clear();

        // Reset topbar
        const topbar = document.querySelector('.topbar');
        if (topbar) {
            topbar.classList.remove('black-hole-active');
        }
    }

    getAffectedElements() {
        const elements = [];
        
        // Get all interactive elements
        const selectors = [
            '.btn', '.get-btn', '.btn-text', 
            '.card', '.card-title', '.tag',
            '.badge', '.title', '.subtitle', '.description',
            '.dash-title', '.buttons',
            'h1', 'p', '.nav-item',
            'a:not(.power-by-exotic)'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (el && !el.classList.contains('power-by-exotic') && el.offsetParent !== null) {
                    elements.push(el);
                }
            });
        });

        // Remove duplicates
        return [...new Set(elements)];
    }

    startSuckingAnimation() {
        const startTime = Date.now();
        const suckDuration = 3500; // 3.5 seconds
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / suckDuration);
            
            // Grow the black hole
            const holeRadius = 100 + (progress * 300); // From 100px to 400px
            const blackHole = document.querySelector('.black-hole');
            if (blackHole) {
                blackHole.style.width = (holeRadius * 2) + 'px';
                blackHole.style.height = (holeRadius * 2) + 'px';
                blackHole.style.marginLeft = (-holeRadius) + 'px';
                blackHole.style.marginTop = (-holeRadius) + 'px';
            }
            
            this.affectedElements.forEach((elem, index) => {
                if (!elem.offsetParent || !this.elementStates.has(elem)) return;

                const rect = elem.getBoundingClientRect();
                const elemCenter = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };

                const dx = this.blackHoleCenter.x - elemCenter.x;
                const dy = this.blackHoleCenter.y - elemCenter.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Accelerated sucking phase
                if (progress < 0.8) {
                    // Strong acceleration towards center
                    const angle = Math.atan2(dy, dx);
                    const baseSpeed = 8 + (progress * 15); // Accelerate over time
                    const proximityFactor = Math.max(0, 1 - (distance / 600));
                    const speed = baseSpeed * (1 + proximityFactor * 5); // Speed up as elements approach
                    
                    const velocityX = Math.cos(angle) * speed;
                    const velocityY = Math.sin(angle) * speed;

                    const newX = elemCenter.x + velocityX;
                    const newY = elemCenter.y + velocityY;

                    elem.style.position = 'fixed';
                    elem.style.left = (newX - rect.width / 2) + 'px';
                    elem.style.top = (newY - rect.height / 2) + 'px';
                    elem.style.zIndex = '205';
                    elem.classList.add('black-hole-active');

                    // Rotation effect - faster as time progresses
                    const rotation = (index * 20 + Date.now() / 12) % 360;
                    
                    // Scale down as distance decreases
                    const scale = Math.max(0.01, 1 - (Math.min(distance, 500) / 400));
                    
                    // Fade out gradually - based on distance and time
                    const fadeDistance = Math.max(0, 1 - (distance / 400));
                    const fadeTime = Math.max(0, 1 - (progress * 1.5));
                    const opacity = Math.max(0, fadeDistance * fadeTime);
                    
                    elem.style.opacity = opacity;
                    elem.style.transform = `rotate(${rotation}deg) scale(${scale})`;
                } else {
                    // Final phase - everything disappears
                    elem.style.opacity = '0';
                    elem.style.pointerEvents = 'none';
                }
            });

            if (progress < 1) {
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                // Animation complete
                this.finalizeBlackHoleAnimation();
            }
        };

        animate();
    }

    finalizeBlackHoleAnimation() {
        // Hide all affected elements completely
        this.affectedElements.forEach(elem => {
            if (elem.offsetParent) {
                elem.style.opacity = '0';
                elem.style.pointerEvents = 'none';
            }
        });
    }

    transitionToFloating() {
        // Add dragging functionality
        this.floatingElements.forEach(elem => {
            elem.element.classList.add('floating-item');
            elem.element.style.cursor = 'grab';

            elem.element.addEventListener('mousedown', (e) => this.startDrag(e, elem));
        });

        // Disable topbar during float mode
        const topbar = document.querySelector('.topbar');
        if (topbar) {
            topbar.classList.add('black-hole-active');
        }

        // Start floating animation
        this.animateFloatingElements();
    }

    animateFloatingElements() {
        this.floatingElements.forEach(floatData => {
            const elem = floatData.element;
            const rect = elem.getBoundingClientRect();

            // Apply air resistance
            floatData.vx *= 0.98;
            floatData.vy *= 0.98;

            // Random floating motion (zero gravity effect)
            floatData.vx += (Math.random() - 0.5) * 0.5;
            floatData.vy += (Math.random() - 0.5) * 0.5;

            // Limit velocity
            const maxVelocity = 4;
            const speed = Math.sqrt(floatData.vx ** 2 + floatData.vy ** 2);
            if (speed > maxVelocity) {
                floatData.vx = (floatData.vx / speed) * maxVelocity;
                floatData.vy = (floatData.vy / speed) * maxVelocity;
            }

            // Update position
            floatData.x += floatData.vx;
            floatData.y += floatData.vy;

            // Bounce off edges
            if (floatData.x - rect.width / 2 < 0) {
                floatData.x = rect.width / 2;
                floatData.vx = Math.abs(floatData.vx);
            }
            if (floatData.x + rect.width / 2 > window.innerWidth) {
                floatData.x = window.innerWidth - rect.width / 2;
                floatData.vx = -Math.abs(floatData.vx);
            }
            if (floatData.y - rect.height / 2 < 0) {
                floatData.y = rect.height / 2;
                floatData.vy = Math.abs(floatData.vy);
            }
            if (floatData.y + rect.height / 2 > window.innerHeight) {
                floatData.y = window.innerHeight - rect.height / 2;
                floatData.vy = -Math.abs(floatData.vy);
            }

            // Apply position
            elem.style.left = (floatData.x - rect.width / 2) + 'px';
            elem.style.top = (floatData.y - rect.height / 2) + 'px';
            elem.style.transform = 'rotate(0deg) scale(1)';
            elem.style.zIndex = '206';
        });

        if (this.isActive) {
            requestAnimationFrame(() => this.animateFloatingElements());
        }
    }

    startDrag(e, floatData) {
        if (!this.isActive) return;

        this.draggedElement = floatData;
        const rect = floatData.element.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;

        floatData.element.style.cursor = 'grabbing';

        const handleMouseMove = (moveEvent) => {
            floatData.x = moveEvent.clientX - this.dragOffset.x + floatData.element.offsetWidth / 2;
            floatData.y = moveEvent.clientY - this.dragOffset.y + floatData.element.offsetHeight / 2;

            floatData.element.style.left = (floatData.x - floatData.element.offsetWidth / 2) + 'px';
            floatData.element.style.top = (floatData.y - floatData.element.offsetHeight / 2) + 'px';
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            if (floatData.element) {
                floatData.element.style.cursor = 'grab';
            }
            this.draggedElement = null;

            // Continue floating
            if (this.isActive) {
                this.animateFloatingElements();
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BlackHoleMode();
});

// Also initialize if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new BlackHoleMode();
    });
} else {
    new BlackHoleMode();
}
