/**
 * ==========================================
 * ⌨️ Typewriter Placeholder Animation Utility
 * ==========================================
 */
document.addEventListener("DOMContentLoaded", () => {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="password"], textarea');
    
    inputs.forEach(input => {
        // Skip hidden inputs or dashboard inputs that don't need it
        if (input.classList.contains('no-typewriter') || input.offsetParent === null) {
            return;
        }

        let phrases = [];
        const customData = input.getAttribute('data-placeholders');
        if (customData) {
            phrases = customData.split('|');
        } else {
            const currentPlaceholder = input.getAttribute('placeholder');
            if (currentPlaceholder && currentPlaceholder.trim() !== "" && currentPlaceholder !== " ") {
                phrases = [currentPlaceholder];
            } else {
                // Default based on type
                if (input.type === 'email') {
                    phrases = ["exemple@mcm-benin.org", "Entrez votre adresse email...", "johndoe@gmail.com"];
                } else if (input.type === 'password') {
                    phrases = ["Entrez votre mot de passe...", "Minimum 8 caractères...", "••••••••"];
                } else if (input.type === 'tel') {
                    phrases = ["+229 90 00 00 00", "Ex: +229 XX XX XX XX", "Numéro de téléphone..."];
                } else if (input.id && input.id.toLowerCase().includes('nom')) {
                    phrases = ["Entrez votre nom...", "Ex: KOUDJOU", "Votre nom de famille..."];
                } else if (input.id && input.id.toLowerCase().includes('prenom')) {
                    phrases = ["Entrez votre prénom...", "Ex: Jean-Marie", "Votre prénom..."];
                } else if (input.tagName.toLowerCase() === 'textarea') {
                    phrases = ["Écrivez votre message ici...", "Comment pouvons-nous vous aider ?...", "Votre question ou suggestion..."];
                } else {
                    phrases = ["Saisissez une valeur...", "Rechercher...", "Entrez du texte..."];
                }
            }
        }
        
        let phraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typingTimeout = null;
        let isFocused = false;
        
        const originalPlaceholder = input.getAttribute('placeholder') || " ";
        
        input.addEventListener('focus', () => {
            isFocused = true;
            if (typingTimeout) clearTimeout(typingTimeout);
            input.setAttribute('placeholder', originalPlaceholder);
        });
        
        input.addEventListener('blur', () => {
            isFocused = false;
            charIndex = 0;
            isDeleting = false;
            if (input.value === '') {
                typeEffect();
            } else {
                input.setAttribute('placeholder', " ");
            }
        });
        
        function typeEffect() {
            if (isFocused || input.value !== '') {
                return;
            }
            
            const currentPhrase = phrases[phraseIndex];
            if (!currentPhrase) return;
            
            if (isDeleting) {
                input.setAttribute('placeholder', currentPhrase.substring(0, charIndex));
                charIndex--;
            } else {
                input.setAttribute('placeholder', currentPhrase.substring(0, charIndex));
                charIndex++;
            }
            
            let typingSpeed = isDeleting ? 40 : 80;
            
            if (!isDeleting && charIndex === currentPhrase.length + 1) {
                typingSpeed = 1800; // Pause at end of text
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                typingSpeed = 400; // Pause before typing next phrase
            }
            
            typingTimeout = setTimeout(typeEffect, typingSpeed);
        }
        
        // Start animation if empty and not focused
        if (input.value === '' && document.activeElement !== input) {
            typeEffect();
        }
    });
});
