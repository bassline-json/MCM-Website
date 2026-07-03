// ===== SPLASH SCREEN =====
const splashContainer = document.getElementById('splashContainer');
const mainContent = document.getElementById('mainContent');
const enterButton = document.getElementById('enterButton');
const backgroundVideo = document.getElementById('backgroundVideo');

function enterSite() {
    splashContainer.classList.add('hide');
    setTimeout(() => {
        splashContainer.style.display = 'none';
        document.body.style.overflow = 'auto';
        mainContent.classList.add('show');
        sessionStorage.setItem('splash_seen', '1');
        if (typeof animateHeroText === 'function') {
            animateHeroText();
        }
    }, 800);
    if (backgroundVideo) backgroundVideo.pause();
}

// Determine if we should show the splash:
// - On full reload (type === "reload") → always show
// - On first visit (no sessionStorage flag) → show
// - On navigate from login/signup → skip
const navEntry = performance.getEntriesByType("navigation")[0];
const navType = navEntry ? navEntry.type : 'navigate';

if (navType === 'reload') {
    sessionStorage.removeItem('splash_seen');
}

const splashSeen = sessionStorage.getItem('splash_seen');
const shouldShowSplash = !splashSeen;

if (splashContainer) {
    if (shouldShowSplash) {
        // Show splash
        document.body.style.overflow = 'hidden';
        splashContainer.style.display = 'flex';
        if (enterButton) {
            enterButton.addEventListener('click', enterSite);
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') enterSite();
        });
    } else {
        // Skip splash — show site immediately
        splashContainer.style.display = 'none';
        document.body.style.overflow = 'auto';
        if (mainContent) mainContent.classList.add('show');
        setTimeout(() => {
            if (typeof animateHeroText === 'function') animateHeroText();
        }, 100);
    }
}

// ===== NAVIGATION & TRANSITIONS (Style Artpill.studio) =====
const topBar = document.querySelector('.hero-top-bar');
const bottomHamburger = document.getElementById('bottomHamburger');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
const mobileMenuClose = document.getElementById('mobileMenuClose');
const transitionCurtain = document.getElementById('transitionCurtain');

const bottomNav = document.getElementById('bottomNavContainer');

// Active section tracker for Top Bar theme and morphing Bottom Nav
const sections = document.querySelectorAll('section[data-theme]');

function checkNavbarState() {
    const scrollPos = window.pageYOffset || window.scrollY;
    if (scrollPos > 50) {
        topBar?.classList.add('scrolled');
        bottomNav?.classList.add('scrolled-nav');
    }
}
checkNavbarState(); // Run once immediately on load

window.addEventListener('scroll', () => {
    const scrollPos = window.pageYOffset || window.scrollY;

    // 1. Adaptive Header Colors and Active Section Tracking
    let activeTheme = 'light'; // fallback
    let activeSectionId = 'accueil';
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        // Check if scroll is within section bounds (offset by 120px for smoother link transition)
        if (scrollPos >= top - 120 && scrollPos < top + height - 120) {
            const theme = section.getAttribute('data-theme');
            if (theme) {
                activeTheme = theme;
            }
            activeSectionId = section.id;
        }
    });

    if (topBar) {
        topBar.classList.remove('on-light', 'on-dark');
        topBar.classList.add(`on-${activeTheme}`);
    }

    // Highlight active link in Bottom Navbar
    const navLinks = document.querySelectorAll('.bottom-nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === '#' + activeSectionId || (activeSectionId === 'accueil' && href === '#accueil')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 2. Scroll and Morph Navbar state
    if (scrollPos > 50) {
        topBar?.classList.add('scrolled');
        bottomNav?.classList.add('scrolled-nav');
    } else {
        topBar?.classList.remove('scrolled');
        // Do not remove 'scrolled-nav' class so it remains transformed permanently
    }
});

// Mobile menu overlay toggles
if (bottomHamburger && mobileMenuOverlay) {
    bottomHamburger.addEventListener('click', () => {
        mobileMenuOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    });
}

if (mobileMenuClose && mobileMenuOverlay) {
    mobileMenuClose.addEventListener('click', () => {
        mobileMenuOverlay.classList.remove('open');
        document.body.style.overflow = '';
    });
}

// Centered brand line-by-line slide reveal animation
function animateHeroText() {
    const lines = document.querySelectorAll('.brand-line');
    lines.forEach((line, index) => {
        setTimeout(() => {
            line.classList.add('active');
        }, index * 250);
    });
}

// Trigger hero text animation after splash screen finishes or on immediate load if bypassed
if (splashContainer && splashContainer.style.display === 'none') {
    animateHeroText();
}

// Chic curtain transition logic
function performPageTransition(targetUrl, isAnchor, targetElement) {
    if (!transitionCurtain) {
        if (isAnchor && targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.location.href = targetUrl;
        }
        return;
    }

    // Phase 1: Curtain cover
    transitionCurtain.className = 'page-transition-curtain cover';
    
    setTimeout(() => {
        // Phase 2: Instant scroll / Navigation under the cover
        if (isAnchor && targetElement) {
            targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
            
            // Highlight active link
            document.querySelectorAll('.bottom-nav-link').forEach(link => {
                const href = link.getAttribute('href');
                if (href === '#' + targetElement.id || (targetElement.id === 'accueil' && href === '#accueil')) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        } else {
            window.location.href = targetUrl;
            return;
        }

        // Phase 3: Curtain uncover
        transitionCurtain.className = 'page-transition-curtain uncover';
        
        // Phase 4: Reset curtain state
        setTimeout(() => {
            transitionCurtain.className = 'page-transition-curtain';
        }, 750);
    }, 750);
}

// ===== SCROLL POSITION MEMORY =====
// When navigating back from legal/commission pages, scroll to last visited section
(function restoreScrollPosition() {
    const savedHash = sessionStorage.getItem('last_section_hash');
    if (savedHash && !window.location.hash) {
        // Wait for layout to be ready, then scroll
        requestAnimationFrame(() => {
            const target = document.querySelector(savedHash);
            if (target) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'auto', block: 'start' });
                }, 80);
            }
            sessionStorage.removeItem('last_section_hash');
        });
    }
})();

// Intercept link clicks for bottom nav, mobile overlay menu, and logo
document.querySelectorAll('.bottom-nav-link, .mobile-menu-link, .hero-logo').forEach(link => {
    link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (!href) return;

        // Close mobile overlay menu first if it is open
        if (mobileMenuOverlay?.classList.contains('open')) {
            mobileMenuOverlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        if (href.startsWith('#')) {
            const targetElement = document.querySelector(href);
            if (targetElement) {
                e.preventDefault();
                performPageTransition(href, true, targetElement);
            }
        } else {
            // Save current active section before navigating away
            const activeLink = document.querySelector('.bottom-nav-link.active');
            if (activeLink) {
                const activeHref = activeLink.getAttribute('href');
                if (activeHref && activeHref.startsWith('#')) {
                    sessionStorage.setItem('last_section_hash', activeHref);
                }
            }
            e.preventDefault();
            performPageTransition(href, false, null);
        }
    });
});



// Save scroll position when clicking footer legal links
document.querySelectorAll('a[data-save-scroll]').forEach(link => {
    link.addEventListener('click', function() {
        const activeNavLink = document.querySelector('.bottom-nav-link.active');
        if (activeNavLink) {
            const activeHref = activeNavLink.getAttribute('href');
            if (activeHref && activeHref.startsWith('#')) {
                sessionStorage.setItem('last_section_hash', activeHref);
            }
        } else {
            // Fallback: save current scroll position mapped to closest section
            const scrollPos = window.pageYOffset;
            let closest = '#accueil';
            sections.forEach(section => {
                if (scrollPos >= section.offsetTop - 200) {
                    closest = '#' + section.id;
                }
            });
            sessionStorage.setItem('last_section_hash', closest);
        }
    });
});

// ===== CAROUSEL =====
const track = document.getElementById('carouselTrack');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const dotsContainer = document.getElementById('carouselDots');
const slides = document.querySelectorAll('.carousel-slide');
let currentSlide = 0;

// Create dots
slides.forEach((_, index) => {
    const dot = document.createElement('div');
    dot.classList.add('carousel-dot');
    if (index === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(index));
    dotsContainer.appendChild(dot);
});

const dots = document.querySelectorAll('.carousel-dot');

function updateCarousel() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

function goToSlide(index) {
    currentSlide = index;
    updateCarousel();
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    updateCarousel();
}

function prevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    updateCarousel();
}

nextBtn.addEventListener('click', nextSlide);
prevBtn.addEventListener('click', prevSlide);

// Auto-play carousel
setInterval(nextSlide, 5000);

// ===== ABOUT MODAL =====
const aboutCards = document.querySelectorAll('.about-carousel-card');
const aboutModalOverlay = document.getElementById('aboutModalOverlay');
const aboutModalClose = document.getElementById('aboutModalClose');
const aboutModalTitle = document.getElementById('aboutModalTitle');
const aboutModalText = document.getElementById('aboutModalText');
const aboutModalIcon = document.getElementById('aboutModalIcon');

const aboutContent = {
    'mission': {
        icon: '<i class="fa-solid fa-cross"></i>',
        title: 'Mission',
        text: "Répandre l'amour du Christ à travers nos actions, nos paroles et notre témoignage au quotidien. Nous nous engageons à porter la lumière de l'évangile dans chaque sphère de la société."
    },
    'communaute': {
        icon: '<i class="fa-solid fa-users"></i>',
        title: 'Communauté',
        text: "Une famille unie dans la foi, composée de 8 commissions dédiées au service de Dieu et du prochain. Nous cultivons un environnement d'entraide, de partage et de croissance spirituelle mutuelle."
    },
    'valeurs': {
        icon: '<i class="fa-solid fa-hands-helping"></i>',
        title: 'Valeurs',
        text: "L'amour, la solidarité, le service, la compassion et l'excellence dans tout ce que nous entreprenons. Ces principes guident nos décisions et façonnent nos interactions quotidiennes."
    },
    'vision': {
        icon: '<i class="fa-solid fa-lightbulb"></i>',
        title: 'Vision',
        text: "Être une lumière qui brille dans notre société, transformant les vies par l'amour du Christ. Nous aspirons à bâtir une communauté forte, résiliente et profondément ancrée dans la foi chrétienne."
    },
    'impact': {
        icon: '<i class="fa-solid fa-globe-africa"></i>',
        title: 'Impact',
        text: "Toucher les cœurs, transformer les vies et construire un monde meilleur une âme à la fois. Nos actions sur le terrain témoignent de notre volonté d'apporter un changement positif et durable."
    },
    'engagement': {
        icon: '<i class="fa-solid fa-star"></i>',
        title: 'Engagement',
        text: "Servir avec excellence, grandir dans la foi et être des témoins authentiques de l'amour divin. Nous nous dévouons pleinement à notre mission spirituelle et sociale."
    }
};

if (aboutCards.length > 0 && aboutModalOverlay) {
    aboutCards.forEach(card => {
        card.addEventListener('click', () => {
            const modalKey = card.getAttribute('data-modal');
            const content = aboutContent[modalKey];
            
            if (content) {
                aboutModalIcon.innerHTML = content.icon;
                aboutModalTitle.textContent = content.title;
                aboutModalText.textContent = content.text;
                
                aboutModalOverlay.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent scrolling under modal
            }
        });
    });

    const closeModal = () => {
        aboutModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    aboutModalClose.addEventListener('click', closeModal);
    aboutModalOverlay.addEventListener('click', (e) => {
        if (e.target === aboutModalOverlay) {
            closeModal();
        }
    });
}

// ===== SCROLL ANIMATIONS =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
        }
    });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
});

// ===== RESPONSIVE STYLES =====
const style = document.createElement('style');
style.textContent = `
    .mobile-only { display: none; }
    .desktop-only { display: block; }
    
    @media (max-width: 768px) {
        .mobile-only { display: block; }
        .desktop-only { display: none; }
    }
`;
document.head.appendChild(style);

// ===== CONTACT FORM =====
const contactSelect = document.getElementById('cf-sujet');
const contactForm   = document.getElementById('contactForm');
const contactFeedback = document.getElementById('contactFormFeedback');
const contactSubmitBtn = document.getElementById('contactSubmitBtn');

// Floating label for <select> : ajoute has-value quand une option est choisie
if (contactSelect) {
    contactSelect.addEventListener('change', () => {
        if (contactSelect.value) {
            contactSelect.classList.add('has-value');
        } else {
            contactSelect.classList.remove('has-value');
        }
    });
}

// Envoi du formulaire (simulation front-end — à brancher sur l'API plus tard)
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nom     = document.getElementById('cf-nom')?.value.trim();
        const email   = document.getElementById('cf-email')?.value.trim();
        const sujet   = document.getElementById('cf-sujet')?.value;
        const message = document.getElementById('cf-message')?.value.trim();

        // Validation basique
        if (!nom || !email || !sujet || !message) {
            showContactFeedback('Veuillez remplir tous les champs obligatoires.', 'error');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showContactFeedback('Adresse email invalide.', 'error');
            return;
        }

        // État chargement
        contactSubmitBtn.disabled = true;
        contactSubmitBtn.querySelector('.submit-text').textContent = 'Envoi en cours…';
        contactSubmitBtn.querySelector('.submit-icon i').className = 'fas fa-circle-notch fa-spin';

        // Simulation d'envoi (remplacer par fetch('/api/contact', {...}) si disponible)
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nom, email, sujet, message })
            });

            const data = await response.json();

            if (response.ok) {
                // Succès
                showContactFeedback('✓ Message envoyé ! Nous vous répondrons sous 48 h.', 'success');
                contactForm.reset();
                if (contactSelect) contactSelect.classList.remove('has-value');
            } else {
                showContactFeedback(data.error || "Erreur lors de l'envoi du message.", 'error');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showContactFeedback('Erreur de connexion au serveur.', 'error');
        }

        contactSubmitBtn.querySelector('.submit-text').textContent = 'Envoyer le message';
        contactSubmitBtn.querySelector('.submit-icon i').className = 'fas fa-paper-plane';
        contactSubmitBtn.disabled = false;
    });
}

function showContactFeedback(message, type) {
    if (!contactFeedback) return;
    contactFeedback.textContent = message;
    contactFeedback.className = `contact-form-feedback ${type}`;
    // Efface le message après 5 secondes
    setTimeout(() => {
        contactFeedback.textContent = '';
        contactFeedback.className = 'contact-form-feedback';
        if (contactSubmitBtn) contactSubmitBtn.disabled = false;
    }, 5000);
}
