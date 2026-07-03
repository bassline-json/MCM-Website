const API_BASE_URL = 'http://localhost:3000/api';
let currentStep = 1;
let recoveryEmail = '';
let currentMethod = 'email';
let resendTimer = null;
let resendCountdown = 0;

// Carousel
const carouselTrack = document.getElementById('carouselTrack');
const carouselDots = document.getElementById('carouselDots');
const carouselText = document.getElementById('carouselText');
const slides = document.querySelectorAll('.carousel-slide');
let currentSlide = 0;

const carouselData = [
    {
        icon: '<i class="fas fa-shield-halved" style="font-size:2.2rem;color:#fff;"></i>',
        title: 'Récupération sécurisée',
        description: 'Votre sécurité est notre priorité. Suivez les étapes pour récupérer l\'accès à votre compte en toute sécurité.'
    },
    {
        icon: '<i class="fas fa-lock" style="font-size:2.2rem;color:#fff;"></i>',
        title: 'Protection de vos données',
        description: 'Nous utilisons des méthodes de vérification sécurisées pour protéger votre compte et vos informations personnelles.'
    },
    {
        icon: '<i class="fas fa-bolt" style="font-size:2.2rem;color:#fff;"></i>',
        title: 'Accès rapide et simple',
        description: 'Un processus de récupération simple et rapide pour vous permettre de retrouver l\'accès à votre espace MCM.'
    }
];

// Create carousel dots
slides.forEach((_, index) => {
    const dot = document.createElement('div');
    dot.classList.add('carousel-dot');
    if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToCarouselSlide(index));
        carouselDots.appendChild(dot);
});

const dots = document.querySelectorAll('.carousel-dot');

function updateCarousel() {
    carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
    updateCarouselText();
}

function updateCarouselText() {
    const data = carouselData[currentSlide];
    carouselText.style.opacity = '0';
    setTimeout(() => {
        carouselText.innerHTML = `
            <div class="carousel-icon">${data.icon}</div>
            <h2 class="carousel-title">${data.title}</h2>
            <p class="carousel-description">${data.description}</p>
            <div class="carousel-dots" id="carouselDots"></div>
        `;
        const newDotsContainer = carouselText.querySelector('#carouselDots');
        dots.forEach(dot => newDotsContainer.appendChild(dot));
        carouselText.style.opacity = '1';
    }, 300);
}

function goToCarouselSlide(index) {
    currentSlide = index;
    updateCarousel();
}

function nextCarouselSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    updateCarousel();
}

setInterval(nextCarouselSlide, 5000);

// Step Navigation
function goToStep(step) {
    currentStep = step;
    
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.remove('active');
    });
            
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        stepEl.classList.remove('active', 'completed');
        if (index + 1 < step) {
            stepEl.classList.add('completed');
        } else if (index + 1 === step) {
            stepEl.classList.add('active');
        }
    });

    const sections = {
        1: 'emailStep',
        2: 'sentStep',
        3: 'changePasswordStep'
    };

    document.getElementById(sections[step]).classList.add('active');
    clearMessages();
        }

// Méthode unique : email uniquement
function selectMethod(method) {
    currentMethod = 'email';
}

// Envoi du mot de passe temporaire par email uniquement
async function sendTemporaryPassword() {
    const email = document.getElementById('recoveryEmail').value.trim();

    if (!email) {
        showError('Veuillez saisir votre adresse email');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Veuillez entrer une adresse email valide');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`http://localhost:3000/api/auth/forgot/password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'email',
                target: email,
                email: email
            })
        });

        const data = await response.json();

        if (response.ok) {
            recoveryEmail = email;

            // Masquer l'affichage du mot de passe temporaire car on utilise un lien de réinitialisation direct par email
            document.getElementById('tempPasswordDisplay').style.display = 'none';

            goToStep(2);
            showSuccess(data.message || 'Lien de réinitialisation envoyé avec succès !');
            startResendTimer();
        } else {
            showError(data.error || 'Erreur lors de l\'envoi du lien de réinitialisation');
        }
    } catch (err) {
        showError('Erreur de connexion au serveur. Veuillez réessayer.');
        console.error('Erreur:', err);
    } finally {
        showLoading(false);
    }
}

async function submitNewPassword() {
    const password = document.getElementById('password').value.trim();
    const submitNewPassButton = document.getElementById('submitNewPassButton');
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    if (password != confirmPassword || password.length < 8 || confirmPassword.length < 8 ) {
        showError('Mot de passe non conforme ou caractères inférieures à 8');
    } else {
        showLoading(true);
        submitNewPassButton.disabled = true
        try {
            const baseURL = window.location.href
            console.log(baseURL)
            const response = await fetch(`${baseURL}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: password,
                    confirmPassword: confirmPassword,
                })
            });

            const data = await response.json();
            console.log(data)

            if (data.code == 'success') {
                showSuccess(data.message || 'Mot de passe modifié avec succès !');
                setTimeout(() => {
                    window.open(`${window.location.origin}/login`, "_self");
                }, 2000);
            } else {
                showError(data.error || 'Erreur lors de la modification du mot de passe');
            }
        } catch (err) {
            console.error('Erreur:', err);
            showError('Une erreur est survenue. Veuillez rééssayer dans quelques minutes !');
        } finally {
            showLoading(false);
            submitNewPassButton.disabled = false
        }
    }
}

        // Go to Login
        function goToLogin() {
            window.location.href = 'login.html';
        }

        // Change Password
        async function changePassword() {
            const tempPassword = document.getElementById('tempPasswordInput').value.trim();
            const newPassword = document.getElementById('newPassword').value.trim();
            const confirmPassword = document.getElementById('confirmNewPassword').value.trim();

            if (!tempPassword || !newPassword || !confirmPassword) {
                showError('Veuillez remplir tous les champs');
                return;
            }

            if (newPassword !== confirmPassword) {
                showError('Les nouveaux mots de passe ne correspondent pas');
                return;
            }

            if (newPassword.length < 8) {
                showError('Le nouveau mot de passe doit contenir au moins 8 caractères');
                return;
            }

            if (tempPassword === newPassword) {
                showError('Le nouveau mot de passe doit être différent du mot de passe temporaire');
                return;
            }

            showLoading(true);

            try {
                const response = await fetch(`${API_BASE_URL}/auth/change-temporary-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        temporaryPassword: tempPassword,
                        newPassword: newPassword,
                        email: recoveryEmail
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    showSuccess('Mot de passe changé avec succès ! Redirection vers la connexion...');
                    
                    setTimeout(() => {
                        window.location.href = 'login.html?message=password_changed_success';
                    }, 2000);
                } else {
                    showError(data.error || 'Erreur lors du changement de mot de passe');
                }
            } catch (err) {
                showError('Erreur de connexion au serveur. Veuillez réessayer.');
                console.error('Erreur:', err);
            } finally {
                showLoading(false);
            }
        }

        // Check Password Strength
        function checkPasswordStrength() {
            const password = document.getElementById('newPassword').value;
            const strengthContainer = document.getElementById('passwordStrength');
            const strengthText = document.getElementById('strengthText');
            const bars = document.querySelectorAll('.strength-bar');

            if (password.length === 0) {
                strengthContainer.classList.remove('show');
                return;
            }

            strengthContainer.classList.add('show');

            let score = 0;
            let feedback = [];

            if (password.length >= 8) score++;
            else feedback.push('8 caractères minimum');

            if (/[a-z]/.test(password)) score++;
            else feedback.push('1 minuscule');

            if (/[A-Z]/.test(password)) score++;
            else feedback.push('1 majuscule');

            if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++;
            else feedback.push('1 chiffre et 1 caractère spécial');

            bars.forEach(bar => bar.classList.remove('filled', 'medium', 'weak'));

            if (score === 4) {
                bars.forEach(bar => bar.classList.add('filled'));
                strengthText.textContent = 'Mot de passe très fort !';
                strengthText.style.color = '#16A34A';
            } else if (score === 3) {
                bars.forEach((bar, index) => {
                    if (index < 3) bar.classList.add('filled');
                });
                strengthText.textContent = 'Mot de passe fort';
                strengthText.style.color = '#16A34A';
            } else if (score === 2) {
                bars.forEach((bar, index) => {
                    if (index < 2) bar.classList.add('medium');
                });
                strengthText.textContent = 'Mot de passe moyen - Il manque: ' + feedback.join(', ');
                strengthText.style.color = '#F59E0B';
            } else {
                bars[0].classList.add('weak');
                strengthText.textContent = 'Mot de passe faible - Il manque: ' + feedback.join(', ');
                strengthText.style.color = '#E60012';
            }
        }

        // Resend Timer
        function startResendTimer() {
            resendCountdown = 60;
            const resendBtn = document.getElementById('resendBtn');
            const timerElement = document.getElementById('resendTimer');
            
            resendBtn.disabled = true;
            
            resendTimer = setInterval(() => {
                timerElement.textContent = `Renvoyer dans ${resendCountdown}s`;
                resendCountdown--;
                
                if (resendCountdown < 0) {
                    clearInterval(resendTimer);
                    resendBtn.disabled = false;
                    timerElement.textContent = '';
                }
            }, 1000);
        }

        // Toggle Password
        function togglePassword(fieldId) {
            const field = document.getElementById(fieldId);
            const button = field.nextElementSibling;

            if (field.type === 'password') {
                field.type = 'text';
                button.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                field.type = 'password';
                button.innerHTML = '<i class="fas fa-eye"></i>';
            }
        }

        // Messages
        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            document.getElementById('successMessage').style.display = 'none';
            document.getElementById('infoMessage').style.display = 'none';
            setTimeout(() => errorDiv.style.display = 'none', 8000);
        }

        function showSuccess(message) {
            const successDiv = document.getElementById('successMessage');
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            document.getElementById('errorMessage').style.display = 'none';
            document.getElementById('infoMessage').style.display = 'none';
            setTimeout(() => successDiv.style.display = 'none', 5000);
        }

        function showInfo(message) {
            const infoDiv = document.getElementById('infoMessage');
            infoDiv.textContent = message;
            infoDiv.style.display = 'block';
            document.getElementById('errorMessage').style.display = 'none';
            document.getElementById('successMessage').style.display = 'none';
            setTimeout(() => infoDiv.style.display = 'none', 5000);
        }

        function clearMessages() {
            document.querySelectorAll('.message').forEach(msg => msg.style.display = 'none');
            document.querySelectorAll('.form-control.error').forEach(field => {
                field.classList.remove('error');
            });
        }

        function showLoading(show) {
            const loadingDiv = document.getElementById('loadingSpinner');
            const buttons = document.querySelectorAll('.recovery-btn');
            if (show) {
                loadingDiv.style.display = 'block';
                buttons.forEach(btn => btn.disabled = true);
            } else {
                loadingDiv.style.display = 'none';
                buttons.forEach(btn => btn.disabled = false);
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const email = urlParams.get('email');
            if (email) {
                document.getElementById('recoveryEmail').value = email;
                recoveryEmail = email;
            }

            const step = urlParams.get('step');
            if (step === 'change') {
                goToStep(3);
            }
        });