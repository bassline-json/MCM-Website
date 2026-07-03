const API_BASE_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:3000/api"
        : "https://mcm-backend-ykoa.onrender.com/api";
let commissions = [];
let services = [];

// ========================================
// 🎨 SYSTÈME DE SELECT PERSONNALISÉ
// ========================================
class CustomSelect {
    constructor(selectElement) {
        this.selectElement = selectElement;
        this.options = Array.from(selectElement.options);
        this.selectedIndex = selectElement.selectedIndex;
        
        this.createCustomSelect();
        this.addEventListeners();
    }

    createCustomSelect() {
        // Créer le wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'custom-select-wrapper';
        
        // Créer le bouton principal
        this.button = document.createElement('div');
        this.button.className = 'custom-select';
        this.button.innerHTML = `
            <span class="custom-select-text placeholder">${this.options[0]?.text || 'Sélectionner...'}</span>
            <span class="custom-select-arrow">▼</span>
        `;
        
        // Créer le dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'custom-select-dropdown';
        
        // Insérer le custom select après le select natif
        this.selectElement.parentNode.insertBefore(this.wrapper, this.selectElement.nextSibling);
        this.wrapper.appendChild(this.button);
        this.wrapper.appendChild(this.dropdown);
        
        // Remplir les options
        this.updateOptions();
    }

    updateOptions() {
        this.dropdown.innerHTML = '';
        this.options = Array.from(this.selectElement.options);
        
        this.options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-select-option';
            optionDiv.textContent = option.text;
            optionDiv.dataset.value = option.value;
            optionDiv.dataset.index = index;
            
            if (index === this.selectedIndex) {
                optionDiv.classList.add('selected');
            }
            
            optionDiv.addEventListener('click', () => this.selectOption(index));
            this.dropdown.appendChild(optionDiv);
        });
    }

    selectOption(index) {
        this.selectedIndex = index;
        this.selectElement.selectedIndex = index;
        
        const selectedOption = this.options[index];
        const textSpan = this.button.querySelector('.custom-select-text');
        
        if (selectedOption.value === '') {
            textSpan.textContent = selectedOption.text;
            textSpan.classList.add('placeholder');
            this.selectElement.classList.remove('has-value');
            this.wrapper.classList.remove('has-value');
        } else {
            textSpan.textContent = selectedOption.text;
            textSpan.classList.remove('placeholder');
            this.selectElement.classList.add('has-value');
            this.wrapper.classList.add('has-value');
        }
        
        // Mettre à jour les classes selected
        this.dropdown.querySelectorAll('.custom-select-option').forEach((opt, i) => {
            opt.classList.toggle('selected', i === index);
        });
        
        this.close();
        
        // Déclencher l'événement change
        const event = new Event('change', { bubbles: true });
        this.selectElement.dispatchEvent(event);
    }

    toggle() {
        if (this.dropdown.classList.contains('show')) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        // Fermer tous les autres selects
        document.querySelectorAll('.custom-select.active').forEach(select => {
            if (select !== this.button) {
                select.classList.remove('active');
                select.nextElementSibling.classList.remove('show');
                select.nextElementSibling.classList.remove('open-up');
            }
        });
        
        this.button.classList.add('active');
        
        // Calculer l'espace restant sous le bouton pour décider si on ouvre vers le haut
        const rect = this.button.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 220; // hauteur max estimée
        
        if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
            this.dropdown.classList.add('open-up');
        } else {
            this.dropdown.classList.remove('open-up');
        }
        
        this.dropdown.classList.add('show');
    }

    close() {
        this.button.classList.remove('active');
        this.dropdown.classList.remove('show');
        this.dropdown.classList.remove('open-up');
    }

    addEventListeners() {
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // Fermer au clic à l'extérieur
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.close();
            }
        });
    }

    refresh() {
        this.selectedIndex = this.selectElement.selectedIndex;
        this.updateOptions();
        
        // Mettre à jour le texte du bouton
        const selectedOption = this.options[this.selectElement.selectedIndex];
        const textSpan = this.button.querySelector('.custom-select-text');
        
        if (selectedOption && selectedOption.value !== '') {
            textSpan.textContent = selectedOption.text;
            textSpan.classList.remove('placeholder');
            this.selectElement.classList.add('has-value');
            this.wrapper.classList.add('has-value');
        } else {
            textSpan.textContent = selectedOption?.text || 'Sélectionner...';
            textSpan.classList.add('placeholder');
            this.selectElement.classList.remove('has-value');
            this.wrapper.classList.remove('has-value');
        }
    }

    destroy() {
        this.wrapper.remove();
    }
}

// Instances des custom selects
let roleSelect, commissionSelect, serviceSelect;

// Initialiser les custom selects
function initializeCustomSelects() {
    const roleNative = document.getElementById('registerRole');
    const commissionNative = document.getElementById('registerCommission');
    const serviceNative = document.getElementById('registerService');
    
    if (roleNative && !roleSelect) {
        roleSelect = new CustomSelect(roleNative);
    }
    if (commissionNative && !commissionSelect) {
        commissionSelect = new CustomSelect(commissionNative);
    }
    if (serviceNative && !serviceSelect) {
        serviceSelect = new CustomSelect(serviceNative);
    }
}

// ========================================
// GESTION DES SECTIONS
// ========================================
document.getElementById('loginToggle').addEventListener('click', () => showSection('login'));
document.getElementById('registerToggle').addEventListener('click', () => showSection('register'));

function showSection(section) {
    clearMessages();
    hideForgotPasswordLink();
    hideNoServicesMessage();

    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.form-section').forEach(sec => sec.classList.remove('active'));

    if (section === 'login') {
        document.getElementById('loginToggle').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.getElementById('registerToggle').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
        loadCommissionsForRegistration();
        
        // Initialiser les custom selects après un petit délai
        setTimeout(() => {
            initializeCustomSelects();
        }, 100);
    }
}

// ========================================
// TOGGLE PASSWORD VISIBILITY
// ========================================
document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const input = document.getElementById(target);
        const eyeIcon = btn.querySelector('.eye-icon');
        const eyeOffIcon = btn.querySelector('.eye-off-icon');
        
        if (input.type === 'password') {
            input.type = 'text';
            eyeIcon.style.display = 'none';
            eyeOffIcon.style.display = 'inline-block';
        } else {
            input.type = 'password';
            eyeIcon.style.display = 'inline-block';
            eyeOffIcon.style.display = 'none';
        }
    });
});

// ========================================
// MESSAGES
// ========================================
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
    document.querySelectorAll('.form-control.error, .form-input.error, .form-select.error').forEach(field => {
        field.classList.remove('error');
    });
}

// ========================================
// 🔄 LOADING OVERLAY COMPLET
// ========================================
function showLoading(show) {
    const loadingDiv = document.getElementById('loadingSpinner');
    const buttons = document.querySelectorAll('.auth-btn');
    
    if (show) {
        loadingDiv.classList.add('show');
        buttons.forEach(btn => btn.disabled = true);
        document.body.style.overflow = 'hidden';
    } else {
        loadingDiv.classList.remove('show');
        buttons.forEach(btn => btn.disabled = false);
        document.body.style.overflow = '';
    }
}

function showForgotPasswordLink() {
    document.getElementById('forgotPasswordLink').classList.add('show');
}

function hideForgotPasswordLink() {
    document.getElementById('forgotPasswordLink').classList.remove('show');
}

// ========================================
// ⚠️ MESSAGE PAS DE SERVICES
// ========================================
function showNoServicesMessage() {
    let messageDiv = document.getElementById('noServicesMessage');
    
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'noServicesMessage';
        messageDiv.className = 'no-services-message';
        messageDiv.innerHTML = `
            <div class="icon">⚠️</div>
            <div class="content">
                <h4>Aucun service disponible</h4>
                <p>Cette commission n'a pas encore de services. La création de compte pour cette commission n'est pas possible actuellement. Veuillez contacter l'administrateur.</p>
            </div>
        `;
        
        const commissionGroup = document.getElementById('commissionGroup');
        commissionGroup.parentNode.insertBefore(messageDiv, commissionGroup.nextSibling);
    }
    
    messageDiv.classList.add('show');
    
    const submitBtn = document.querySelector('#registerForm .auth-btn');
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    submitBtn.style.cursor = 'not-allowed';
}

function hideNoServicesMessage() {
    const messageDiv = document.getElementById('noServicesMessage');
    if (messageDiv) {
        messageDiv.classList.remove('show');
    }
    
    const submitBtn = document.querySelector('#registerForm .auth-btn');
    submitBtn.disabled = false;
    submitBtn.style.opacity = '';
    submitBtn.style.cursor = '';
}

// ========================================
// 💉 INJECTION DU CSS POUR LE MODAL
// ========================================
function injectModalStyles() {
    if (document.getElementById('accountDeletedModalStyles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'accountDeletedModalStyles';
    style.textContent = `
        /* Modal Container */
        .error-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            justify-content: center;
            align-items: center;
            padding: 15px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .error-modal.show {
            opacity: 1;
        }

        /* Overlay sombre */
        .error-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(3px);
        }

        /* Contenu du modal */
        .error-modal-content {
            position: relative;
            background: #FFFFFF;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            animation: slideUp 0.4s ease;
            z-index: 10000;
        }

        /* Header du modal */
        .error-modal-header {
            background: linear-gradient(135deg, #E60012 0%, #B8000E 100%);
            color: #FFFFFF;
            padding: 25px 30px;
            border-radius: 16px 16px 0 0;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
        }

        .error-icon {
            font-size: 3.5rem;
            animation: pulse 2s infinite;
        }

        .error-modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            line-height: 1.3;
        }

        /* Body du modal */
        .error-modal-body {
            padding: 30px;
        }

        .main-message {
            font-size: 1.1rem;
            color: #1F2937;
            margin-bottom: 15px;
            font-weight: 600;
            line-height: 1.6;
        }

        .secondary-message {
            font-size: 1rem;
            color: #6B7280;
            margin-bottom: 25px;
            line-height: 1.6;
        }

        /* Contact Info */
        .contact-info {
            background: #F8F9FA;
            border: 2px solid #E5E7EB;
            border-radius: 12px;
            padding: 20px;
            margin-top: 20px;
        }

        .info-item {
            margin-bottom: 15px;
        }

        .info-item strong {
            display: block;
            color: #1F2937;
            font-size: 0.95rem;
            margin-bottom: 8px;
        }

        .email-value {
            display: block;
            color: #E60012;
            font-weight: 600;
            font-size: 1rem;
            word-break: break-all;
            padding: 8px 12px;
            background: #FFFFFF;
            border-radius: 6px;
            border: 1px solid #E5E7EB;
        }

        .contact-details {
            margin-top: 15px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .contact-line {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
            background: #FFFFFF;
            border-radius: 8px;
            border: 1px solid #E5E7EB;
        }

        .contact-line .icon {
            font-size: 1.3rem;
            flex-shrink: 0;
        }

        .contact-line .value {
            color: #374151;
            font-size: 1rem;
            font-weight: 500;
        }

        /* Footer du modal */
        .error-modal-footer {
            padding: 20px 30px;
            border-top: 1px solid #E5E7EB;
            display: flex;
            justify-content: center;
        }

        .btn-close-modal {
            background: #E60012;
            color: #FFFFFF;
            border: none;
            padding: 14px 35px;
            border-radius: 50px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 15px rgba(230, 0, 18, 0.3);
        }

        .btn-close-modal:hover {
            background: #B8000E;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(230, 0, 18, 0.4);
        }

        .btn-close-modal:active {
            transform: translateY(0);
        }

        .btn-icon {
            font-size: 1.1rem;
        }

        /* Animations */
        @keyframes slideUp {
            from {
                transform: translateY(50px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.1);
            }
        }

        /* Amélioration du scrollbar */
        .error-modal-content::-webkit-scrollbar {
            width: 6px;
        }

        .error-modal-content::-webkit-scrollbar-track {
            background: #F8F9FA;
        }

        .error-modal-content::-webkit-scrollbar-thumb {
            background: #E60012;
            border-radius: 3px;
        }

        .error-modal-content::-webkit-scrollbar-thumb:hover {
            background: #B8000E;
        }

        /* ============================================
           RESPONSIVE DESIGN
           ============================================ */

        /* Tablettes (768px et moins) */
        @media screen and (max-width: 768px) {
            .error-modal {
                padding: 10px;
            }

            .error-modal-content {
                max-height: 95vh;
                border-radius: 12px;
            }

            .error-modal-header {
                padding: 20px 20px;
                border-radius: 12px 12px 0 0;
            }

            .error-icon {
                font-size: 3rem;
            }

            .error-modal-header h2 {
                font-size: 1.3rem;
            }

            .error-modal-body {
                padding: 20px;
            }

            .main-message {
                font-size: 1rem;
            }

            .secondary-message {
                font-size: 0.95rem;
            }

            .contact-info {
                padding: 15px;
            }

            .contact-line {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
                text-align: left;
            }

            .contact-line .icon {
                font-size: 1.2rem;
            }

            .contact-line .value {
                font-size: 0.95rem;
                word-break: break-word;
            }

            .error-modal-footer {
                padding: 15px 20px;
            }

            .btn-close-modal {
                width: 100%;
                justify-content: center;
                padding: 13px 25px;
            }
        }

        /* Smartphones (480px et moins) */
        @media screen and (max-width: 480px) {
            .error-modal {
                padding: 5px;
                align-items: flex-start;
                padding-top: 20px;
            }

            .error-modal-content {
                max-height: 92vh;
                border-radius: 10px;
            }

            .error-modal-header {
                padding: 18px 15px;
                gap: 10px;
            }

            .error-icon {
                font-size: 2.5rem;
            }

            .error-modal-header h2 {
                font-size: 1.15rem;
                line-height: 1.4;
            }

            .error-modal-body {
                padding: 15px;
            }

            .main-message {
                font-size: 0.95rem;
                margin-bottom: 12px;
            }

            .secondary-message {
                font-size: 0.9rem;
                margin-bottom: 20px;
            }

            .contact-info {
                padding: 12px;
                border-radius: 10px;
            }

            .info-item {
                margin-bottom: 12px;
            }

            .info-item strong {
                font-size: 0.9rem;
                margin-bottom: 6px;
            }

            .email-value {
                font-size: 0.9rem;
                padding: 6px 10px;
            }

            .contact-details {
                gap: 10px;
            }

            .contact-line {
                padding: 8px;
            }

            .contact-line .icon {
                font-size: 1.1rem;
            }

            .contact-line .value {
                font-size: 0.9rem;
            }

            .error-modal-footer {
                padding: 12px 15px;
            }

            .btn-close-modal {
                padding: 12px 20px;
                font-size: 0.95rem;
            }

            .btn-icon {
                font-size: 1rem;
            }
        }

        /* Très petits écrans (360px et moins) */
        @media screen and (max-width: 360px) {
            .error-modal-header h2 {
                font-size: 1.05rem;
            }

            .error-icon {
                font-size: 2.2rem;
            }

            .main-message {
                font-size: 0.9rem;
            }

            .secondary-message {
                font-size: 0.85rem;
            }

            .contact-line .value {
                font-size: 0.85rem;
            }

            .btn-close-modal {
                font-size: 0.9rem;
                padding: 11px 18px;
            }
        }

        /* Support du mode paysage sur mobile */
        @media screen and (max-height: 500px) and (orientation: landscape) {
            .error-modal {
                align-items: flex-start;
                padding-top: 10px;
            }

            .error-modal-content {
                max-height: 95vh;
            }

            .error-modal-header {
                padding: 15px 20px;
            }

            .error-icon {
                font-size: 2rem;
            }

            .error-modal-body {
                padding: 15px 20px;
            }

            .contact-info {
                padding: 12px;
            }
        }
    `;

    document.head.appendChild(style);
}

// ========================================
// 🎯 MODAL DE COMPTE SUPPRIMÉ (VERSION AMÉLIORÉE)
// ========================================
function createAccountDeletedModal() {
    // Injecter les styles d'abord
    injectModalStyles();

    let modal = document.getElementById('accountDeletedModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'accountDeletedModal';
        modal.className = 'error-modal';
        modal.innerHTML = `
            <div class="error-modal-overlay"></div>
            <div class="error-modal-content">
                <div class="error-modal-header">
                    <i class="error-icon">⚠️</i>
                    <h2>Compte Supprimé ou Inexistant</h2>
                </div>
                <div class="error-modal-body">
                    <p class="main-message">Votre compte n'existe plus dans le système ou a été supprimé par un administrateur.</p>
                    <p class="secondary-message">Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le SuperAdmin pour plus d'informations.</p>
                    <div class="contact-info">
                        <div class="info-item">
                            <strong>Email du compte:</strong>
                            <span id="deletedAccountEmail" class="email-value"></span>
                        </div>
                    </div>
                </div>
                <div class="error-modal-footer">
                    <button onclick="closeAccountDeletedModal()" class="btn-close-modal">
                        <span class="btn-icon">✖</span>
                        <span class="btn-text">Fermer</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Ajouter les event listeners
        setupModalEventListeners(modal);
    }

    return modal;
}

// ========================================
// EVENT LISTENERS POUR LE MODAL
// ========================================
function setupModalEventListeners(modal) {
    // Fermer le modal en cliquant sur l'overlay
    const overlay = modal.querySelector('.error-modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeAccountDeletedModal);
    }

    // Fermer avec la touche Échap
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modalElement = document.getElementById('accountDeletedModal');
            if (modalElement && modalElement.classList.contains('show')) {
                closeAccountDeletedModal();
            }
        }
    });
}

// ========================================
// AFFICHER LE MODAL
// ========================================
function showAccountDeletedModal(email = '') {
    // Créer le modal s'il n'existe pas
    const modal = createAccountDeletedModal();
    const emailSpan = document.getElementById('deletedAccountEmail');
    
    if (modal) {
        if (email) {
            emailSpan.textContent = email;
        } else {
            emailSpan.textContent = 'Non spécifié';
        }
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Petit délai pour l'animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
}

// ========================================
// FERMER LE MODAL
// ========================================
function closeAccountDeletedModal() {
    const modal = document.getElementById('accountDeletedModal');
    
    if (modal) {
        modal.classList.remove('show');
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

// ========================================
// GESTION DES RÔLES ET COMMISSIONS
// ========================================
document.getElementById('registerRole').addEventListener('change', function() {
    const role = this.value;
    const commissionGroup = document.getElementById('commissionGroup');
    const serviceGroup = document.getElementById('serviceGroup');

    hideNoServicesMessage();

    if (role === 'adminCom') {
        commissionGroup.style.display = 'block';
        serviceGroup.style.display = 'none';
        document.getElementById('registerCommission').value = '';
        document.getElementById('registerService').innerHTML = '<option value="">Sélectionnez un service</option>';
        
        if (commissionSelect) commissionSelect.refresh();
        if (serviceSelect) serviceSelect.refresh();
    } else if (role === 'admin') {
        commissionGroup.style.display = 'block';
        serviceGroup.style.display = 'block';
        document.getElementById('registerCommission').value = '';
        document.getElementById('registerService').innerHTML = '<option value="">Sélectionnez un service</option>';
        
        if (commissionSelect) commissionSelect.refresh();
        if (serviceSelect) serviceSelect.refresh();
    } else {
        commissionGroup.style.display = 'none';
        serviceGroup.style.display = 'none';
    }
});

document.getElementById('registerCommission').addEventListener('change', loadServices);

// ========================================
// CHARGEMENT DES DONNÉES
// ========================================
function loadCommissionsForRegistration() {
    const select = document.getElementById('registerCommission');
    select.innerHTML = '<option value="">Sélectionnez une commission</option>';

    const fixedCommissions = [
        { id: 1, nom: 'Évangélisation' },
        { id: 2, nom: 'Multimédia et Audiovisuel' },
        { id: 3, nom: 'Presse et Documentation' },
        { id: 4, nom: 'Chœur' },
        { id: 5, nom: 'Accueil' },
        { id: 6, nom: 'Comptabilité' },
        { id: 7, nom: 'Organisation et Logistique' },
        { id: 8, nom: 'Liturgie MCM Bénin Service Délégué' }
    ];

    fixedCommissions.forEach(commission => {
        const option = document.createElement('option');
        option.value = commission.id;
        option.textContent = commission.nom;
        select.appendChild(option);
    });

    commissions = fixedCommissions;
    
    if (commissionSelect) {
        commissionSelect.refresh();
    }
}

async function loadServices() {
    const commissionId = parseInt(document.getElementById('registerCommission').value);
    const serviceSelectEl = document.getElementById('registerService');
    serviceSelectEl.innerHTML = '<option value="">Sélectionnez un service</option>';

    hideNoServicesMessage();

    if (!commissionId) {
        if (serviceSelect) serviceSelect.refresh();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/services`, {
            headers: { 'Accept': 'application/json' }
        });
        const allServices = await response.json();
        const filtered = allServices.filter(s => s.commission_id === commissionId);

        if (filtered.length === 0) {
            showNoServicesMessage();
            if (serviceSelect) serviceSelect.refresh();
            return;
        }

        filtered.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = service.nom;
            serviceSelectEl.appendChild(option);
        });

        if (serviceSelect) serviceSelect.refresh();
    } catch (err) {
        console.error('Erreur chargement services:', err);
        showError('Impossible de charger les services. Réessayez.');
    }
}


// ========================================
// HANDLE LOGIN
// ========================================
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearMessages();
    hideForgotPasswordLink();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showError('Veuillez remplir tous les champs');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Veuillez entrer une adresse email valide');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, mot_de_passe: password })
        });

        const data = await response.json();

        if (response.status === 404) {
            showLoading(false);
            showAccountDeletedModal(email);
            return;
        }

        if (response.status === 401) {
            showLoading(false);
            showError(data.error || 'Email ou mot de passe incorrect');
            document.getElementById('loginEmail').classList.add('error');
            document.getElementById('loginPassword').classList.add('error');
            setTimeout(() => showForgotPasswordLink(), 400);
            return;
        }

        if (response.status === 403) {
            showLoading(false);
            showError('Votre compte a été désactivé. Contactez l\'administrateur.');
            return;
        }

        if (response.ok && data.success) {
            if (data.token) {
                localStorage.setItem('mcm_token', data.token);
            }
            if (data.user) {
                localStorage.setItem('mcm_user', JSON.stringify(data.user));
            }

            const remember = document.getElementById('rememberMe').checked;
            if (remember) {
                localStorage.setItem('rememberedEmail', email);
                localStorage.setItem('rememberedPassword', password);
            } else {
                localStorage.removeItem('rememberedEmail');
                localStorage.removeItem('rememberedPassword');
            }

            showSuccess('Connexion réussie ! Redirection...');

            setTimeout(() => {
                const role = data.user?.role;
                // Mark splash as seen so navigating to accueil won't trigger it
                sessionStorage.setItem('splash_seen', '1');
                switch (role) {
                    case 'superadmin':
                        window.location.href = 'superadmin.html';
                        break;
                    case 'adminCom':
                        window.location.href = 'adminCom.html';
                        break;
                    case 'admin':
                        window.location.href = 'admin.html';
                        break;
                    default:
                        window.location.href = 'dashboard.html';
                }
            }, 900);

        } else {
            showError(data.error || data.message || 'Erreur de connexion');
        }
    } catch (err) {
        console.error('Erreur connexion:', err);
        showError(`Erreur de connexion au serveur: ${err.message}`);
    } finally {
        showLoading(false);
    }
});

// ========================================
// HANDLE REGISTER
// ========================================
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearMessages();
    hideNoServicesMessage();

    const nom = document.getElementById('registerNom').value.trim();
    const prenom = document.getElementById('registerPrenom').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const telephone = document.getElementById('registerTelephone').value.trim();
    const mot_de_passe = document.getElementById('registerPassword').value;
    const mot_de_passe_confirm = document.getElementById('registerConfirmPassword').value;
    const role = document.getElementById('registerRole').value;
    const commission_id = document.getElementById('registerCommission').value || null;
    const service_id = document.getElementById('registerService').value || null;

    if (!nom || !prenom || !email || !telephone || !mot_de_passe || !mot_de_passe_confirm || !role) {
        showError('Veuillez remplir tous les champs obligatoires');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Veuillez entrer une adresse email valide');
        return;
    }

    if (mot_de_passe.length < 8) {
        showError('Le mot de passe doit contenir au moins 8 caractères');
        return;
    }

    if (mot_de_passe !== mot_de_passe_confirm) {
        showError('Les mots de passe ne correspondent pas');
        return;
    }

    if (role === 'adminCom' && !commission_id) {
        showError('Veuillez sélectionner une commission');
        return;
    }

    if (role === 'admin' && (!commission_id || !service_id)) {
        showError('Veuillez sélectionner une commission et un service');
        return;
    }

    const formData = {
        nom, prenom, email, telephone, mot_de_passe, role,
        commission_id: commission_id || null,
        service_id: service_id || null
    };

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok && (data.success || data.message)) {
            showSuccess('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
            document.getElementById('registerForm').reset();
            document.getElementById('commissionGroup').style.display = 'none';
            document.getElementById('serviceGroup').style.display = 'none';
            
            if (roleSelect) roleSelect.refresh();
            if (commissionSelect) commissionSelect.refresh();
            if (serviceSelect) serviceSelect.refresh();

            setTimeout(() => {
                showSection('login');
                document.getElementById('loginEmail').value = email;
            }, 1500);
        } else {
            showError(data.error || data.message || 'Erreur lors de la création du compte');
        }
    } catch (err) {
        console.error('Erreur inscription:', err);
        showError(`Erreur de connexion au serveur: ${err.message}`);
    } finally {
        showLoading(false);
    }
});

// ========================================
// UTILITAIRES
// ========================================
function loadRememberedCredentials() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberedPassword = localStorage.getItem('rememberedPassword');

    if (rememberedEmail) {
        document.getElementById('loginEmail').value = rememberedEmail;
    }
    if (rememberedPassword) {
        document.getElementById('loginPassword').value = rememberedPassword;
        document.getElementById('rememberMe').checked = true;
    }
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    
    if (message === 'password_reset_success') {
        showSuccess('Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.');
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (message === 'password_changed_success') {
        showSuccess('Votre mot de passe a été changé avec succès ! Vous pouvez maintenant vous connecter.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const section = urlParams.get('section');
    if (section === 'register') showSection('register');
}

// ========================================
// INITIALISATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadRememberedCredentials();
    checkUrlParams();
    injectModalStyles();
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm && registerForm.classList.contains('active')) {
        initializeCustomSelects();
    }
});