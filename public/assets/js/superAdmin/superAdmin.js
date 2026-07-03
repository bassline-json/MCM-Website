// ========================================
// CONFIGURATION & VARIABLES GLOBALES
// ========================================

const API_BASE = '/api';
let token = null;
let currentUser = null;
let currentEditingMember = null;
let currentSection = 'dashboard';
let selectedMembers = [];
let selectedAdmins = [];
let allMembers = [];
let allAdmins = [];
let filteredMembers = [];
let filteredAdmins = [];
let currentPage = 1;
let currentAdminPage = 1;
const membersPerPage = 10;
const adminsPerPage = 10;
let customSelects = [];
let recentActivities = [];

// NOUVEAU: Commission courante pour navigation
let currentCommissionId = null;
let currentCommissionName = null;

// Mapping des services uniques
let uniqueServicesMap = new Map();
let serviceToCommissionMap = {};

// Messages d'accueil
const welcomeMessages = [
    { title: "Bienvenue SuperAdmin !", subtitle: "Vous avez le contrôle total de la plateforme MCM" },
    { title: "Excellente journée à vous !", subtitle: "Gérez l'ensemble de l'écosystème MCM avec efficacité" },
    { title: "Ravi de vous revoir !", subtitle: "Pilotez votre organisation vers l'excellence" },
    { title: "Bonjour SuperAdmin !", subtitle: "Votre leadership fait toute la différence" },
    { title: "Toujours au sommet !", subtitle: "Votre vision guide le succès de MCM" },
    { title: "Gestion exemplaire !", subtitle: "Vos décisions façonnent l'avenir de la plateforme" },
    { title: "Bienvenue à bord !", subtitle: "Votre tableau de bord est prêt à l'action" },
    { title: "Bon retour, stratège !", subtitle: "Chaque clic rapproche MCM de la perfection" },
    { title: "SuperAdmin connecté !", subtitle: "Toutes les fonctionnalités sont à votre disposition" },
    { title: "De retour aux commandes !", subtitle: "La plateforme MCM vous attendait" }
];

// ========================================
// 🎨 CLASSE SELECT PERSONNALISÉ
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
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'custom-select-wrapper';
        
        this.button = document.createElement('div');
        this.button.className = 'custom-select';
        this.button.innerHTML = `
            <span class="custom-select-text ${this.options[0]?.value === '' ? 'placeholder' : ''}">${this.options[0]?.text || 'Sélectionner...'}</span>
            <span class="custom-select-arrow">▼</span>
        `;
        
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'custom-select-dropdown';
        
        this.selectElement.parentNode.insertBefore(this.wrapper, this.selectElement.nextSibling);
        this.wrapper.appendChild(this.button);
        this.wrapper.appendChild(this.dropdown);
        
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
        } else {
            textSpan.textContent = selectedOption.text;
            textSpan.classList.remove('placeholder');
        }
        
        this.dropdown.querySelectorAll('.custom-select-option').forEach((opt, i) => {
            opt.classList.toggle('selected', i === index);
        });
        
        this.close();
        
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
        document.querySelectorAll('.custom-select.active').forEach(select => {
            if (select !== this.button) {
                select.classList.remove('active');
                select.nextElementSibling.classList.remove('show');
            }
        });
        
        this.button.classList.add('active');
        this.dropdown.classList.add('show');
    }

    close() {
        this.button.classList.remove('active');
        this.dropdown.classList.remove('show');
    }

    addEventListeners() {
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        document.addEventListener('click', (e) => {
            if (this.wrapper && !this.wrapper.contains(e.target)) {
                this.close();
            }
        });
    }

    refresh() {
        this.selectedIndex = this.selectElement.selectedIndex;
        this.updateOptions();
        
        const selectedOption = this.options[this.selectElement.selectedIndex];
        const textSpan = this.button.querySelector('.custom-select-text');
        
        if (selectedOption && selectedOption.value !== '') {
            textSpan.textContent = selectedOption.text;
            textSpan.classList.remove('placeholder');
        } else {
            textSpan.textContent = selectedOption?.text || 'Sélectionner...';
            textSpan.classList.add('placeholder');
        }
    }
}

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  toast.innerHTML = `
    <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
    <div class="toast-message">${message}</div>
  `;
  
  const container = document.getElementById('toastContainer');
  if (container) {
    container.appendChild(toast);
    setTimeout(() => { 
      toast.style.animation = 'slideOutRight 0.3s ease'; 
      setTimeout(() => toast.remove(), 300); 
    }, 4000);
  }
}

function showSuccessAnimation() {
  const overlay = document.getElementById('successOverlay');
  if (overlay) {
    overlay.classList.add('show');
    if (typeof confetti !== 'undefined') {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
    setTimeout(() => overlay.classList.remove('show'), 1500);
  }
}

function setButtonLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    const icon = button.querySelector('i');
    if (icon) icon.className = 'fas fa-spinner fa-spin';
  } else {
    button.disabled = false;
    const icon = button.querySelector('i');
    if (icon) {
      if (button.id === 'addMemberBtn') icon.className = 'fas fa-plus';
      else if (button.id === 'createUserBtn') icon.className = 'fas fa-user-plus';
      else if (button.id === 'updateProfileBtn') icon.className = 'fas fa-save';
    }
  }
}

function getRoleDisplayName(role) {
  const roles = { 'admin': 'Admin de Service', 'adminCom': 'Admin de Commission', 'superadmin': 'SuperAdmin' };
  return roles[role] || role;
}

function getCommissionForService(serviceName) {
  return serviceToCommissionMap[serviceName] || 'Aucune commission';
}

function addActivity(text, icon = 'fa-info-circle') {
  const activity = {
    text,
    icon,
    time: new Date().toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  };
  
  recentActivities.unshift(activity);
  if (recentActivities.length > 5) recentActivities.pop();
  
  updateActivitiesDisplay();
}

function updateActivitiesDisplay() {
  const container = document.getElementById('recentActivities');
  if (!container) return;
  
  if (recentActivities.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 2rem;">Aucune activité récente</p>';
    return;
  }
  
  // VERSION CAROUSEL RESPONSIVE
  container.innerHTML = `
    <div class="activities-carousel">
      <button class="carousel-btn prev" onclick="scrollActivities('prev')" style="display: ${recentActivities.length > 1 ? 'flex' : 'none'};">
        <i class="fas fa-chevron-left"></i>
      </button>
      <div class="carousel-container" id="activitiesCarousel">
        ${recentActivities.map(activity => `
          <div class="activity-item carousel-item">
            <div class="activity-icon">
              <i class="fas ${activity.icon}"></i>
            </div>
            <div class="activity-content">
              <div class="activity-text">${activity.text}</div>
              <div class="activity-time">${activity.time}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="carousel-btn next" onclick="scrollActivities('next')" style="display: ${recentActivities.length > 1 ? 'flex' : 'none'};">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;
}

// NOUVEAU: Fonction pour scroller le carousel
window.scrollActivities = function(direction) {
  const carousel = document.getElementById('activitiesCarousel');
  if (!carousel) return;
  
  const scrollAmount = carousel.offsetWidth * 0.8;
  if (direction === 'next') {
    carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  } else {
    carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  }
};

// ========================================
// ⚠️ MODAL DE CONFIRMATION PERSONNALISÉE
// ========================================

function showCustomPrompt(title, message, defaultValue = '', onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content custom-prompt-modal">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="close-btn" id="promptCloseBtn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 1.5rem; color: var(--dark-gray);">${message}</p>
        <input type="text" class="form-control" id="promptInput" value="${defaultValue}" placeholder="Entrez votre texte ici..." />
        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
          <button class="btn-primary" id="promptConfirmBtn" style="flex: 1;">
            <i class="fas fa-check"></i> Confirmer
          </button>
          <button class="btn-cancel" id="promptCancelBtn" style="flex: 1; background: var(--light-gray); color: var(--dark-gray); border: none; padding: 1rem; border-radius: 12px; font-weight: 600; cursor: pointer;">
            <i class="fas fa-times"></i> Annuler
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = modal.querySelector('#promptInput');
  input.focus();
  input.select();

  modal.querySelector('#promptConfirmBtn').onclick = () => {
    const value = input.value.trim();
    if (value) {
      modal.remove();
      if (onConfirm) onConfirm(value);
    } else {
      showToast('Veuillez entrer une valeur', 'warning');
      input.focus();
    }
  };

  modal.querySelector('#promptCancelBtn').onclick = () => {
    modal.remove();
  };

  modal.querySelector('#promptCloseBtn').onclick = () => {
    modal.remove();
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      modal.querySelector('#promptConfirmBtn').click();
    }
  });
}

function showConfirmModal(type, title, message, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content confirm-modal-content">
      <div class="confirm-modal-body">
        <div class="confirm-modal-icon ${type}">
          ${type === 'warning' ? '<i class="fas fa-exclamation-triangle"></i>' : type === 'danger' ? '<i class="fas fa-trash-alt"></i>' : '<i class="fas fa-info-circle"></i>'}
        </div>
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="confirm-modal-buttons">
          <button class="btn-confirm ${type === 'danger' ? 'danger' : ''}" id="confirmBtn">
            <i class="fas fa-check"></i> Confirmer
          </button>
          <button class="btn-cancel" id="cancelBtn">
            <i class="fas fa-times"></i> Annuler
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#confirmBtn').onclick = () => {
    modal.remove();
    if (onConfirm) onConfirm();
  };

  modal.querySelector('#cancelBtn').onclick = () => {
    modal.remove();
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// ========================================
// INITIALISATION DE L'APPLICATION
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  token = window.localStorage.getItem('mcm_token');
  if (!token) { 
    window.location.href = './login.html'; 
    return; 
  }
  await initializeApp();
});

async function initializeApp() {
  try {
    await loadCurrentUser();
    await loadServices();
    await loadCommissions();
    await loadDashboardData();
    await checkBirthdays();
    initializeEventListeners();
    initializeCustomSelects();
    setRandomWelcomeMessage();
    updateActivitiesDisplay();
    
    // Initialisation WebSocket
    if (typeof io !== 'undefined') {
      const socket = io();
      socket.on('member:created', () => { loadDashboardData(); loadCommissions(); loadServices(); });
      socket.on('member:updated', () => { loadDashboardData(); loadCommissions(); loadServices(); });
      socket.on('member:deleted', () => { loadDashboardData(); loadCommissions(); loadServices(); });
      socket.on('commission:created', () => { loadCommissions(); loadDashboardData(); });
      socket.on('commission:updated', () => { loadCommissions(); loadDashboardData(); });
      socket.on('commission:deleted', () => { loadCommissions(); loadDashboardData(); });
      socket.on('service:created', () => { loadServices(); loadDashboardData(); });
      socket.on('service:updated', () => { loadServices(); loadDashboardData(); });
      socket.on('service:deleted', () => { loadServices(); loadDashboardData(); });
    }
  } catch (error) {
    console.error('Erreur initialisation:', error);
    showToast('Erreur lors de l\'initialisation', 'error');
  }
}

function initializeCustomSelects() {
  customSelects.forEach(cs => {
    if (cs.wrapper && cs.wrapper.parentNode) {
      cs.wrapper.remove();
    }
  });
  customSelects = [];
  
  document.querySelectorAll('.form-select').forEach(select => {
    const customSelect = new CustomSelect(select);
    customSelects.push(customSelect);
  });
}

function initializeEventListeners() {
  const hamburger = document.getElementById('hamburger');
  if (hamburger) hamburger.addEventListener('click', toggleSidebar);
  
  const userRole = document.getElementById('userRole');
  if (userRole) userRole.addEventListener('change', handleRoleChange);
  
  const userCommission = document.getElementById('userCommission');
  if (userCommission) userCommission.addEventListener('change', handleCommissionChange);
  
  const addMemberForm = document.getElementById('addMemberForm');
  if (addMemberForm) addMemberForm.addEventListener('submit', handleAddMember);
  
  const manageUserForm = document.getElementById('manageUserForm');
  if (manageUserForm) manageUserForm.addEventListener('submit', handleCreateUser);
  
  const userProfileForm = document.getElementById('userProfileForm');
  if (userProfileForm) userProfileForm.addEventListener('submit', handleUpdateProfile);

  window.addEventListener('click', (e) => { 
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('show');
    }
  });
  
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger');
    if (window.innerWidth <= 1024 && sidebar && hamburger && 
        !sidebar.contains(e.target) && !hamburger.contains(e.target) && 
        sidebar.classList.contains('open')) {
      toggleSidebar();
    }
  });
  
  window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger');
    if (window.innerWidth > 1024) {
      if (sidebar) sidebar.classList.remove('open');
      if (hamburger) hamburger.classList.remove('active');
    }
  });
}

// ========================================
// GESTION DE L'UTILISATEUR COURANT
// ========================================

async function loadCurrentUser() {
  try {
    const token = window.localStorage.getItem('mcm_token');
    if (!token) {
      window.location.href = './login.html';
      return;
    }

    // Toujours récupérer les données fraîches depuis la base de données
    const response = await fetch(`${API_BASE}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });

    if (response.status === 401) {
      window.localStorage.removeItem('mcm_token');
      window.localStorage.removeItem('mcm_user');
      window.location.href = './login.html';
      return;
    }

    if (response.ok) {
      const userData = await response.json();
      currentUser = {
        id: userData.id,
        nom: userData.nom || '',
        prenom: userData.prenom || '',
        email: userData.email,
        telephone: userData.telephone,
        role: userData.role,
        commission_id: userData.commission_id,
        service_id: userData.service_id,
        commission_nom: userData.commission_nom,
        service_nom: userData.service_nom
      };
      window.localStorage.setItem('mcm_user', JSON.stringify(currentUser));
      updateUserDisplay();
      return;
    }

    throw new Error('API indisponible');

  } catch (error) {
    console.error('Erreur chargement utilisateur (fallback JWT):', error);
    // Fallback: décoder le JWT
    try {
      const token = window.localStorage.getItem('mcm_token');
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      currentUser = {
        id: tokenPayload.id,
        nom: tokenPayload.nom || '',
        prenom: tokenPayload.prenom || '',
        email: tokenPayload.email,
        role: tokenPayload.role,
        commission_id: tokenPayload.commission_id,
        service_id: tokenPayload.service_id
      };
    } catch (e) {
      const userDataString = window.localStorage.getItem('mcm_user');
      if (userDataString && userDataString !== 'null') {
        currentUser = JSON.parse(userDataString);
      } else {
        currentUser = { nom: '', prenom: '', email: 'admin@mcm.com', role: 'superadmin' };
      }
    }
    updateUserDisplay();
  }
}

function updateUserDisplay() {
  const displayName = `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() || 'Admin';
  const userNameEl = document.getElementById('userName');
  if (userNameEl) userNameEl.textContent = displayName;
  
  const initials = (currentUser.prenom?.[0] || '') + (currentUser.nom?.[0] || '') || 'SA';
  const userInitialsEl = document.getElementById('userInitials');
  if (userInitialsEl) userInitialsEl.textContent = initials.toUpperCase();
  
  const profileNom = document.getElementById('profileNom');
  if (profileNom) profileNom.value = currentUser.nom || '';
  
  const profilePrenom = document.getElementById('profilePrenom');
  if (profilePrenom) profilePrenom.value = currentUser.prenom || '';
  
  const profileEmail = document.getElementById('profileEmail');
  if (profileEmail) profileEmail.value = currentUser.email || '';
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const btn = document.getElementById('updateProfileBtn');
  setButtonLoading(btn, true);
  
  const profileData = {
    nom: document.getElementById('profileNom').value.trim(),
    prenom: document.getElementById('profilePrenom').value.trim(),
    email: document.getElementById('profileEmail').value.trim(),
    telephone: document.getElementById('profileTelephone')?.value?.trim() || currentUser.telephone || ''
  };
  
  const password = document.getElementById('profilePassword').value;
  if (password) profileData.mot_de_passe = password;
  
  try {
    const response = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Utiliser les données confirmées par le serveur
      const updatedUser = result.user || {};
      currentUser = { 
        ...currentUser, 
        nom: updatedUser.nom || profileData.nom,
        prenom: updatedUser.prenom || profileData.prenom,
        email: updatedUser.email || profileData.email,
        telephone: updatedUser.telephone || profileData.telephone
      };
      
      window.localStorage.setItem('mcm_user', JSON.stringify(currentUser));
      if (result.token) {
        window.localStorage.setItem('mcm_token', result.token);
      }
      updateUserDisplay();
      showSuccessAnimation();
      showToast('Profil mis à jour avec succès!', 'success');
      addActivity('Profil mis à jour', 'fa-user-cog');
      closeUserProfileModal();
      document.getElementById('profilePassword').value = '';
      
    } else {
      const error = await response.json();
      showToast('Erreur: ' + (error.error || 'Impossible de mettre à jour le profil'), 'error');
    }
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    showToast('Erreur de connexion lors de la mise à jour du profil', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

function openUserProfile() {
  if (currentUser) {
    document.getElementById('profileNom').value = currentUser.nom || '';
    document.getElementById('profilePrenom').value = currentUser.prenom || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profilePassword').value = '';
    
    const modal = document.getElementById('userProfileModal');
    if (modal) modal.classList.add('show');
  }
}

function confirmLogout() {
  logout();
}

async function logout() {
  window.localStorage.removeItem('mcm_token');
  window.localStorage.removeItem('mcm_user');
  showToast('Déconnexion réussie', 'info');
  setTimeout(() => { window.location.href = './login.html'; }, 1000);
}

// ========================================
// GESTION DE LA NAVIGATION ET DES SECTIONS
// ========================================

function showSection(sectionName) {
  document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
  
  const sectionMap = {
    'dashboard': 'dashboardSection',
    'members': 'membersSection',
    'addMember': 'addMemberSection',
    'addAdmin': 'addAdminSection',
    'stats': 'statsSection',
    'services': 'servicesSection',
    'commissions': 'commissionsSection',
    'administrators': 'administratorsSection',
    'commissionDetails': 'commissionDetailsSection',
    'serviceMembers': 'serviceMembersSection'
  };
  
  const sectionId = sectionMap[sectionName];
  const sectionElement = document.getElementById(sectionId);
  
  if (sectionElement) {
    sectionElement.classList.add('active');
    currentSection = sectionName;
    
    // MODIFICATION: Garder l'état actif pour commissions
    if (sectionName === 'commissionDetails' || sectionName === 'commissions') {
      const commissionsLink = document.querySelector('.sidebar-link[onclick*="commissions"]');
      if (commissionsLink) commissionsLink.classList.add('active');
    } else {
      const links = document.querySelectorAll('.sidebar-link');
      links.forEach(link => {
        const onclickAttr = link.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes(`showSection('${sectionName}')`)) {
          link.classList.add('active');
        }
      });
    }
    
    if (sectionName === 'members') loadAllMembersList();
    if (sectionName === 'administrators') loadAdministrators();
    if (sectionName === 'dashboard') setRandomWelcomeMessage();
    if (window.innerWidth <= 1024) toggleSidebar();
  }
}

function showAdministrators() {
  showSection('administrators');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger');
  
  if (sidebar && hamburger) {
    sidebar.classList.toggle('open');
    hamburger.classList.toggle('active');
  }
}

function setRandomWelcomeMessage() {
  const message = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  const pageTitle = document.querySelector('#dashboardSection .page-title');
  const pageSubtitle = document.querySelector('#dashboardSection .page-subtitle');
  if (pageTitle && currentSection === 'dashboard') {
    pageTitle.textContent = message.title;
    if (pageSubtitle) pageSubtitle.textContent = message.subtitle;
  }
}

// ========================================
// VÉRIFICATION DES ANNIVERSAIRES + EMAIL
// ========================================

async function checkBirthdays() {
  try {
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0].substring(5);
    
    const membersRes = await fetch(`${API_BASE}/membres`, { headers: getAuthHeaders() });
    const members = await membersRes.json();
    const birthdayPeople = [];
    
    members.forEach(member => {
      if (member.date_naissance) {
        const birthDate = new Date(member.date_naissance);
        const birthMonthDay = (birthDate.getMonth() + 1).toString().padStart(2, '0') + 
                            '-' + birthDate.getDate().toString().padStart(2, '0');
        
        if (birthMonthDay === todayFormatted) {
          const age = today.getFullYear() - birthDate.getFullYear();
          birthdayPeople.push({ ...member, age });
        }
      }
    });
    
    if (birthdayPeople.length > 0) {
      const birthdaysCard = document.getElementById('birthdaysCard');
      const birthdaysContainer = document.getElementById('todayBirthdays');
      
      if (birthdaysCard && birthdaysContainer) {
        birthdaysCard.style.display = 'block';
        birthdaysContainer.innerHTML = birthdayPeople.map(person => `
          <div class="birthday-item">
            <div class="birthday-icon">🎉</div>
            <div class="birthday-content">
              <h4>${person.prenom} ${person.nom}</h4>
              <div class="birthday-age">${person.age} ans aujourd'hui !</div>
            </div>
          </div>
        `).join('');
        
        const names = birthdayPeople.map(p => `${p.prenom} ${p.nom}`).join(', ');
        showToast(`🎂 ${birthdayPeople.length} anniversaire(s) aujourd'hui : ${names}`, 'info');
        showBirthdayAnimation();
      }
    } else {
      const birthdaysCard = document.getElementById('birthdaysCard');
      if (birthdaysCard) birthdaysCard.style.display = 'none';
    }
  } catch (error) {
    console.error('Erreur vérification anniversaires:', error);
  }
}

// NOUVEAU: Animation confetti + ballons pour anniversaire
function showBirthdayAnimation() {
  if (typeof confetti !== 'undefined') {
    // Confetti initial
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#E60012', '#FFD700', '#FF1A2E', '#FFA500']
    });
    
    // Ballons qui montent
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const balloonInterval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      
      if (timeLeft <= 0) {
        return clearInterval(balloonInterval);
      }
      
      confetti({
        particleCount: 3,
        angle: 90,
        spread: 45,
        origin: { x: Math.random(), y: 1 },
        colors: ['#E60012', '#FFD700', '#FF69B4'],
        shapes: ['circle'],
        gravity: -0.5,
        scalar: 2,
        drift: 1
      });
    }, 100);
  }
}

// ========================================
// CHARGEMENT DES DONNÉES PRINCIPALES (TEMPS RÉEL)
// ========================================

async function loadDashboardData() {
  try {
    const [membersRes, usersRes, servicesRes] = await Promise.all([
      fetch(`${API_BASE}/membres`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/users`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/services`, { headers: getAuthHeaders() })
    ]);

    const members = await membersRes.json();
    const users = await usersRes.json();
    const services = await servicesRes.json();

    // Compter les services uniques
    const uniqueServiceNames = new Set(services.map(s => s.nom));

    // MODIFICATION: Mise à jour en temps réel
    const totalMembersEl = document.getElementById('totalMembers');
    const totalAdminsEl = document.getElementById('totalAdmins');
    const totalSuperadminsEl = document.getElementById('totalSuperadmins');
    const totalServicesEl = document.getElementById('totalServices');
    
    if (totalMembersEl) totalMembersEl.textContent = members.length;
    if (totalAdminsEl) totalAdminsEl.textContent = users.filter(u => u.role === 'admin' || u.role === 'adminCom').length;
    if (totalSuperadminsEl) totalSuperadminsEl.textContent = users.filter(u => u.role === 'superadmin').length;
    if (totalServicesEl) totalServicesEl.textContent = uniqueServiceNames.size;
  } catch (error) {
    console.error('Erreur chargement stats:', error);
  }
}

async function loadServices() {
  try {
    const [servicesRes, commissionsRes] = await Promise.all([
      fetch(`${API_BASE}/services`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/commissions`, { headers: getAuthHeaders() })
    ]);
    
    const services = await servicesRes.json();
    const commissions = await commissionsRes.json();
    
    uniqueServicesMap.clear();
    serviceToCommissionMap = {};
    
    // Grouper services par nom (éviter doublons)
    services.forEach(service => {
      if (!uniqueServicesMap.has(service.nom)) {
        uniqueServicesMap.set(service.nom, service);
      }
      const commission = commissions.find(c => c.id === service.commission_id);
      if (commission) {
        serviceToCommissionMap[service.nom] = commission.nom;
      }
    });

    const servicesGrid = document.getElementById('servicesGrid');
    const selects = ['memberService', 'userService', 'editMemberService', 'statsServiceSelect'];
    
    if (servicesGrid) servicesGrid.innerHTML = '';
    
    selects.forEach(id => {
      const selectEl = document.getElementById(id);
      if (selectEl) selectEl.innerHTML = '<option value="">Sélectionner un service</option>';
    });

    uniqueServicesMap.forEach((service, serviceName) => {
      const commissionName = serviceToCommissionMap[service.nom] || 'Aucune commission';
      
      if (servicesGrid) {
        const card = document.createElement('div');
        card.className = 'custom-card';
        card.onclick = () => showServiceMembers(service.id, service.nom);
        card.innerHTML = `
          <div class="custom-card-title">${service.nom}</div>
          <div class="custom-card-subtitle">${commissionName}</div>
          <div class="custom-card-footer">
            <i class="fas fa-users"></i>
            <span id="members-count-${service.id}">0</span> membres
          </div>
        `;
        servicesGrid.appendChild(card);
      }

      selects.forEach(id => {
        const selectEl = document.getElementById(id);
        if (selectEl) {
          const existingOption = Array.from(selectEl.options).find(opt => opt.value == service.id);
          if (!existingOption) {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.nom} (${commissionName})`;
            selectEl.appendChild(option);
          }
        }
      });

      loadServiceMemberCount(service.id);
    });
    
    setTimeout(() => {
      customSelects.forEach(cs => cs.refresh());
    }, 100);
  } catch (error) {
    console.error('Erreur chargement services:', error);
    showToast('Erreur lors du chargement des services', 'error');
  }
}

async function loadServiceMemberCount(serviceId) {
  try {
    const response = await fetch(`${API_BASE}/membres/service/${serviceId}`, { headers: getAuthHeaders() });
    const members = await response.json();
    const countEl = document.getElementById(`members-count-${serviceId}`);
    if (countEl) countEl.textContent = members.length;
  } catch (error) {
    console.error(`Erreur comptage membres service ${serviceId}:`, error);
  }
}

async function loadCommissions() {
  try {
    const response = await fetch(`${API_BASE}/commissions`, { headers: getAuthHeaders() });
    const commissions = await response.json();

    const commissionsGrid = document.getElementById('commissionsGrid');
    const commissionSelects = ['userCommission'];
    
    if (commissionsGrid) commissionsGrid.innerHTML = '';
    
    commissionSelects.forEach(id => {
      const selectEl = document.getElementById(id);
      if (selectEl) selectEl.innerHTML = '<option value="">Sélectionner une commission</option>';
    });

    commissions.forEach(commission => {
      if (commissionsGrid) {
        const card = document.createElement('div');
        card.className = 'custom-card';
        card.onclick = () => showCommissionDetails(commission.id, commission.nom);
        card.innerHTML = `
          <div class="custom-card-title">${commission.nom}</div>
          <div class="custom-card-footer"><i class="fas fa-sitemap"></i> Voir les détails</div>
        `;
        commissionsGrid.appendChild(card);
      }

      commissionSelects.forEach(id => {
        const selectEl = document.getElementById(id);
        if (selectEl) {
          const option = document.createElement('option');
          option.value = commission.id;
          option.textContent = commission.nom;
          selectEl.appendChild(option);
        }
      });
    });
    
    setTimeout(() => {
      customSelects.forEach(cs => cs.refresh());
    }, 100);
  } catch (error) {
    console.error('Erreur chargement commissions:', error);
  }
}

// ========================================
// GESTION DES MEMBRES
// ========================================

async function handleAddMember(e) {
  e.preventDefault();
  
  showConfirmModal(
    'warning',
    'Ajouter ce membre',
    'Voulez-vous vraiment ajouter ce membre ?',
    async () => {
      const btn = document.getElementById('addMemberBtn');
      setButtonLoading(btn, true);

      const memberData = {
        service_id: parseInt(document.getElementById('memberService').value),
        nom: document.getElementById('memberNom').value,
        prenom: document.getElementById('memberPrenom').value,
        sexe: document.getElementById('memberSexe').value,
        date_naissance: document.getElementById('memberDateNaissance').value,
        email: document.getElementById('memberEmail').value,
        telephone: document.getElementById('memberTelephone').value
      };

      try {
        const response = await fetch(`${API_BASE}/membres`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(memberData)
        });

        if (response.ok) {
          showSuccessAnimation();
          showToast('Membre ajouté avec succès!', 'success');
          addActivity(`Membre ajouté : ${memberData.prenom} ${memberData.nom}`, 'fa-user-plus');
          document.getElementById('addMemberForm').reset();
          
          await Promise.all([
            loadDashboardData(),
            loadServices(),
            loadAllMembersList()
          ]);
          
          setTimeout(() => {
            customSelects.forEach(cs => cs.refresh());
          }, 100);
        } else {
          const error = await response.json();
          showToast('Erreur: ' + error.error, 'error');
        }
      } catch (error) {
        showToast('Erreur lors de l\'ajout du membre', 'error');
      } finally {
        setButtonLoading(btn, false);
      }
    }
  );
}

async function loadAllMembersList() {
  try {
    const container = document.getElementById('membersListContainer');
    if (container) container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 2rem;">Chargement...</p>';

    const response = await fetch(`${API_BASE}/membres`, { headers: getAuthHeaders() });

    if (response.ok) {
      allMembers = await response.json();
      filteredMembers = [...allMembers];
      currentPage = 1;
      selectedMembers = [];
      displayMembersList();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showToast('Erreur lors du chargement des membres', 'error');
  }
}

function displayMembersList() {
  const container = document.getElementById('membersListContainer');
  if (!container) return;
  
  if (filteredMembers.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 2rem;">Aucun membre trouvé</p>';
    const paginationDiv = document.getElementById('pagination');
    if (paginationDiv) paginationDiv.innerHTML = '';
    return;
  }

  const startIndex = (currentPage - 1) * membersPerPage;
  const endIndex = startIndex + membersPerPage;
  const paginated = filteredMembers.slice(startIndex, endIndex);
  const allSelected = filteredMembers.every(m => selectedMembers.includes(m.id));

  let html = `
    <div style="margin-bottom: 1.5rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
      <button onclick="toggleSelectAllMembers()" class="btn-select-all">
        <i class="fas ${allSelected ? 'fa-check-square' : 'fa-square'}"></i>
        <span>${allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</span>
      </button>
      ${selectedMembers.length > 0 ? `
        <span style="color: var(--primary-red); font-weight: 600;">
          <i class="fas fa-check-circle"></i> ${selectedMembers.length} sélectionné(s)
        </span>
        <button onclick="confirmDeleteSelectedMembers()" class="btn-primary" style="background: var(--error); width: auto; padding: 0.75rem 1.5rem;">
          <i class="fas fa-trash"></i> Supprimer
        </button>
      ` : ''}
    </div>
    <div class="member-list">
  `;

  paginated.forEach(member => {
    const isSelected = selectedMembers.includes(member.id);
    html += `
      <div class="member-item" style="position: relative;">
        <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleMemberSelection(${member.id})" style="position: absolute; left: 1rem; top: 1.5rem;">
        <div class="member-info" style="margin-left: 2rem;">
          <h4>${member.nom} ${member.prenom}</h4>
          <div class="member-details">
            <div class="member-detail"><i class="fas fa-envelope"></i><span>${member.email || 'Pas d\'email'}</span></div>
            <div class="member-detail"><i class="fas fa-phone"></i><span>${member.telephone || 'Pas de téléphone'}</span></div>
            <div class="member-detail"><i class="fas fa-venus-mars"></i><span>${member.sexe || 'Non spécifié'}</span></div>
          </div>
        </div>
        <div class="member-actions">
          <button class="action-btn edit" onclick="editMember(${member.id})" title="Modifier"><i class="fas fa-edit"></i></button>
          <button class="action-btn delete" onclick="confirmDeleteMember(${member.id})" title="Supprimer"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;

  const searchInput = document.getElementById('memberSearch');
  if (searchInput) {
    searchInput.removeEventListener('keyup', searchMembers);
    searchInput.addEventListener('keyup', searchMembers);
  }

  renderPagination();
}

function toggleSelectAllMembers() {
  const allSelected = filteredMembers.every(m => selectedMembers.includes(m.id));
  if (allSelected) {
    selectedMembers = [];
  } else {
    selectedMembers = filteredMembers.map(m => m.id);
  }
  displayMembersList();
}

function toggleMemberSelection(memberId) {
  const index = selectedMembers.indexOf(memberId);
  if (index > -1) {
    selectedMembers.splice(index, 1);
  } else {
    selectedMembers.push(memberId);
  }
  displayMembersList();
}

function searchMembers() {
  const searchTerm = document.getElementById('memberSearch').value.toLowerCase();
  filteredMembers = allMembers.filter(member => {
    const fullName = `${member.nom} ${member.prenom}`.toLowerCase();
    const email = (member.email || '').toLowerCase();
    return fullName.includes(searchTerm) || email.includes(searchTerm);
  });
  currentPage = 1;
  selectedMembers = [];
  displayMembersList();
}

function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container) return;
  
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="page-btn"><i class="fas fa-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button onclick="changePage(${i})" class="page-btn ${i === currentPage ? 'active' : ''}">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += '<span style="padding: 0.5rem;">...</span>';
    }
  }
  html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="page-btn"><i class="fas fa-chevron-right"></i></button>`;
  container.innerHTML = html;
}

function changePage(page) {
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  displayMembersList();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function confirmDeleteMember(memberId) {
  const member = allMembers.find(m => m.id === memberId);
  if (!member) return;
  
  showConfirmModal(
    'danger',
    'Supprimer ce membre',
    `Êtes-vous sûr de vouloir supprimer <strong>${member.prenom} ${member.nom}</strong> ? Cette action est irréversible.`,
    () => deleteMember(memberId)
  );
}

async function deleteMember(memberId) {
  try {
    const response = await fetch(`${API_BASE}/membres/${memberId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (response.ok) {
      showSuccessAnimation();
      showToast('Membre supprimé avec succès!', 'warning');
      const member = allMembers.find(m => m.id === memberId);
      if (member) {
        addActivity(`Membre supprimé : ${member.prenom} ${member.nom}`, 'fa-user-minus');
      }
      
      await Promise.all([
        loadDashboardData(),
        loadServices(),
        loadAllMembersList()
      ]);
    } else {
      const error = await response.json();
      showToast('Erreur: ' + error.error, 'error');
    }
  } catch (error) {
    showToast('Erreur lors de la suppression du membre', 'error');
  }
}

function confirmDeleteSelectedMembers() {
  if (selectedMembers.length === 0) {
    showToast('Aucun membre sélectionné', 'info');
    return;
  }

  showConfirmModal(
    'danger',
    'Supprimer les membres sélectionnés',
    `Êtes-vous sûr de vouloir supprimer <strong>${selectedMembers.length} membre(s)</strong> ? Cette action est irréversible.`,
    () => deleteSelectedMembers()
  );
}

async function deleteSelectedMembers() {
  try {
    for (const memberId of selectedMembers) {
      await fetch(`${API_BASE}/membres/${memberId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    }

    showSuccessAnimation();
    showToast(`${selectedMembers.length} membre(s) supprimé(s) avec succès!`, 'success');
    addActivity(`${selectedMembers.length} membres supprimés`, 'fa-users-slash');
    selectedMembers = [];
    
    await Promise.all([
      loadDashboardData(),
      loadServices(),
      loadAllMembersList()
    ]);
  } catch (error) {
    showToast('Erreur lors de la suppression', 'error');
  }
}

// ========================================
// ÉDITION DE MEMBRE
// ========================================

async function editMember(memberId) {
  try {
    const member = allMembers.find(m => m.id === memberId);
    if (!member) {
      const response = await fetch(`${API_BASE}/membres/${memberId}`, { headers: getAuthHeaders() });
      const memberData = await response.json();
      currentEditingMember = memberId;
      populateEditMemberForm(memberData);
    } else {
      currentEditingMember = memberId;
      populateEditMemberForm(member);
    }
    
    const modal = document.getElementById('editMemberModal');
    if (modal) modal.classList.add('show');
    
    setTimeout(() => {
      customSelects.forEach(cs => cs.refresh());
    }, 100);
  } catch (error) {
    showToast('Erreur lors du chargement des données', 'error');
  }
}

function populateEditMemberForm(member) {
  document.getElementById('editMemberService').value = member.service_id || '';
  document.getElementById('editMemberNom').value = member.nom || '';
  document.getElementById('editMemberPrenom').value = member.prenom || '';
  document.getElementById('editMemberSexe').value = member.sexe || '';
  document.getElementById('editMemberDateNaissance').value = member.date_naissance ? member.date_naissance.split('T')[0] : '';
  document.getElementById('editMemberEmail').value = member.email || '';
  document.getElementById('editMemberTelephone').value = member.telephone || '';
}

async function handleEditMember(e) {
  e.preventDefault();
  if (!currentEditingMember) return;

  const memberData = {
    service_id: parseInt(document.getElementById('editMemberService').value),
    nom: document.getElementById('editMemberNom').value,
    prenom: document.getElementById('editMemberPrenom').value,
    sexe: document.getElementById('editMemberSexe').value,
    date_naissance: document.getElementById('editMemberDateNaissance').value,
    email: document.getElementById('editMemberEmail').value,
    telephone: document.getElementById('editMemberTelephone').value
  };

  try {
    const response = await fetch(`${API_BASE}/membres/${currentEditingMember}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(memberData)
    });

    if (response.ok) {
      showSuccessAnimation();
      showToast('Membre modifié avec succès!', 'success');
      addActivity(`Membre modifié : ${memberData.prenom} ${memberData.nom}`, 'fa-user-edit');
      closeEditMemberModal();
      
      await Promise.all([
        loadDashboardData(),
        loadServices(),
        loadAllMembersList()
      ]);
    } else {
      const error = await response.json();
      showToast('Erreur: ' + error.error, 'error');
    }
  } catch (error) {
    showToast('Erreur lors de la modification du membre', 'error');
  }
}

// ========================================
// GESTION DES ADMINISTRATEURS (avec envoi email)
// ========================================

function handleRoleChange() {
  const role = document.getElementById('userRole').value;
  const commissionGroup = document.getElementById('commissionGroup');
  const serviceGroup = document.getElementById('serviceGroup');

  if (role === 'adminCom') {
    if (commissionGroup) commissionGroup.style.display = 'block';
    if (serviceGroup) serviceGroup.style.display = 'none';
    document.getElementById('userService').value = '';
  } else if (role === 'admin') {
    if (commissionGroup) commissionGroup.style.display = 'block';
    if (serviceGroup) serviceGroup.style.display = 'block';
  } else {
    if (commissionGroup) commissionGroup.style.display = 'none';
    if (serviceGroup) serviceGroup.style.display = 'none';
    document.getElementById('userCommission').value = '';
    document.getElementById('userService').value = '';
  }
  
  setTimeout(() => {
    customSelects.forEach(cs => cs.refresh());
  }, 100);
}


async function handleCommissionChange() {
  const commissionId = document.getElementById('userCommission').value;
  const serviceSelect = document.getElementById('userService');
  
  if (!commissionId) {
    serviceSelect.innerHTML = '<option value="">Sélectionner un service</option>';
    setTimeout(() => {
      const serviceSelectObj = customSelects.find(cs => cs.selectElement === serviceSelect);
      if (serviceSelectObj) serviceSelectObj.refresh();
    }, 100);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/services`, { headers: getAuthHeaders() });
    const services = await response.json();
    
    const uniqueServices = new Map();
    services.filter(s => s.commission_id === parseInt(commissionId)).forEach(service => {
      if (!uniqueServices.has(service.nom)) {
        uniqueServices.set(service.nom, service);
      }
    });
    
    serviceSelect.innerHTML = '<option value="">Sélectionner un service</option>';
    uniqueServices.forEach((service) => {
      const option = document.createElement('option');
      option.value = service.id;
      option.textContent = service.nom;
      serviceSelect.appendChild(option);
    });
    
    setTimeout(() => {
      const serviceSelectObj = customSelects.find(cs => cs.selectElement === serviceSelect);
      if (serviceSelectObj) serviceSelectObj.refresh();
    }, 100);
  } catch (error) {
    console.error('Erreur filtre services:', error);
  }
}

async function handleCreateUser(e) {
  e.preventDefault();
  const btn = document.getElementById('createUserBtn');
  setButtonLoading(btn, true);

  const email = document.getElementById('userEmail').value?.trim();
  const nom = document.getElementById('userNom').value?.trim();
  const prenom = document.getElementById('userPrenom').value?.trim();
  const telephone = document.getElementById('userTelephone')?.value?.trim() || null;
  const mot_de_passe = document.getElementById('userPassword').value?.trim();
  const role = document.getElementById('userRole').value?.trim();
  const commission_id = document.getElementById('userCommission').value?.trim();
  const service_id = document.getElementById('userService').value?.trim();

  if (!email || !nom || !prenom || !mot_de_passe || !role) {
    showToast('Tous les champs marqués * sont obligatoires', 'error');
    setButtonLoading(btn, false);
    return;
  }

  if (role === 'adminCom' && !commission_id) {
    showToast('Veuillez sélectionner une commission', 'error');
    setButtonLoading(btn, false);
    return;
  }

  if (role === 'admin' && (!commission_id || !service_id)) {
    showToast('Veuillez sélectionner une commission et un service', 'error');
    setButtonLoading(btn, false);
    return;
  }

  const userData = { email, nom, prenom, mot_de_passe, role };
  if (telephone) userData.telephone = telephone;
  if (commission_id) userData.commission_id = parseInt(commission_id);
  if (service_id) userData.service_id = parseInt(service_id);

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });

    if (response.ok) {
      const newUser = await response.json();
      
      // NOUVEAU: Envoyer email de création de compte
      try {
        await fetch(`${API_BASE}/email/account-created`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            email: email,
            fullName: `${prenom} ${nom}`,
            role: role,
            tempPassword: mot_de_passe
          })
        });
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError);
      }
      
      showSuccessAnimation();
      showToast('Utilisateur créé avec succès! Un email a été envoyé.', 'success');
      addActivity(`Admin créé : ${prenom} ${nom} (${getRoleDisplayName(role)})`, 'fa-user-shield');
      document.getElementById('manageUserForm').reset();
      handleRoleChange();
      
      await Promise.all([
        loadDashboardData(),
        loadAdministrators()
      ]);
      
      setTimeout(() => {
        customSelects.forEach(cs => cs.refresh());
      }, 100);
    } else {
      const error = await response.json();
      showToast('Erreur: ' + (error.error || 'Erreur inconnue'), 'error');
    }
  } catch (error) {
    showToast('Erreur lors de la création de l\'utilisateur', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

// ========================================
// GESTION DES ADMINISTRATEURS (Suite)
// ========================================

async function loadAdministrators() {
  try {
    const container = document.getElementById('administratorsListContainer');
    if (container) container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 2rem;">Chargement...</p>';

    const response = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() });
    const users = await response.json();
    allAdmins = users.filter(u => u.role === 'admin' || u.role === 'adminCom' || u.role === 'superadmin');
    filteredAdmins = [...allAdmins];
    currentAdminPage = 1;
    selectedAdmins = [];
    displayAdministratorsList();
  } catch (error) {
    showToast('Erreur lors du chargement des administrateurs', 'error');
  }
}

function displayAdministratorsList() {
  const container = document.getElementById('administratorsListContainer');
  if (!container) return;
  
  if (filteredAdmins.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 2rem;">Aucun administrateur trouvé</p>';
    const adminPaginationDiv = document.getElementById('adminPagination');
    if (adminPaginationDiv) adminPaginationDiv.innerHTML = '';
    return;
  }

  const startIndex = (currentAdminPage - 1) * adminsPerPage;
  const endIndex = startIndex + adminsPerPage;
  const paginated = filteredAdmins.slice(startIndex, endIndex);
  const selectableAdmins = filteredAdmins.filter(a => !currentUser || a.email !== currentUser.email);
  const allSelected = selectableAdmins.every(a => selectedAdmins.includes(a.id));

  let html = `
    <div style="margin-bottom: 1.5rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
      <button onclick="toggleSelectAllAdmins()" class="btn-select-all">
        <i class="fas ${allSelected ? 'fa-check-square' : 'fa-square'}"></i>
        <span>${allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</span>
      </button>
      ${selectedAdmins.length > 0 ? `
        <span style="color: var(--primary-red); font-weight: 600;">
          <i class="fas fa-check-circle"></i> ${selectedAdmins.length} sélectionné(s)
        </span>
        <button onclick="confirmDeleteSelectedAdmins()" class="btn-primary" style="background: var(--error); width: auto; padding: 0.75rem 1.5rem;">
          <i class="fas fa-trash"></i> Supprimer
        </button>
      ` : ''}
    </div>
    <div class="member-list">
  `;

  paginated.forEach(admin => {
    const isCurrentUser = currentUser && admin.email === currentUser.email;
    const isSelected = selectedAdmins.includes(admin.id);
    
    html += `
      <div class="member-item admin" style="position: relative;">
        ${!isCurrentUser ? `<input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleAdminSelection(${admin.id})" style="position: absolute; left: 1rem; top: 1.5rem;">` : ''}
        <div class="member-info" style="${!isCurrentUser ? 'margin-left: 2rem;' : ''}">
          <h4>
            <i class="fas fa-shield-alt" style="color: var(--primary-red);"></i> 
            ${admin.nom} ${admin.prenom}
            ${isCurrentUser ? '<span style="font-size: 0.75rem; color: var(--success); margin-left: 0.5rem;">(Vous)</span>' : ''}
          </h4>
          <div class="member-details">
            <div class="member-detail"><i class="fas fa-envelope"></i><span>${admin.email}</span></div>
            <div class="member-detail"><i class="fas fa-user-tag"></i><span>${getRoleDisplayName(admin.role)}</span></div>
          </div>
        </div>
        ${!isCurrentUser ? `
          <div class="member-actions">
            <button class="action-btn delete" onclick="confirmDeleteAdmin(${admin.id})" title="Supprimer"><i class="fas fa-trash"></i></button>
          </div>
        ` : ''}
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;

  const searchInput = document.getElementById('adminSearch');
  if (searchInput) {
    searchInput.removeEventListener('keyup', searchAdmins);
    searchInput.addEventListener('keyup', searchAdmins);
  }

  renderAdminPagination();
}

function toggleSelectAllAdmins() {
  const selectableAdmins = filteredAdmins.filter(a => !currentUser || a.email !== currentUser.email);
  const allSelected = selectableAdmins.every(a => selectedAdmins.includes(a.id));
  
  if (allSelected) {
    selectedAdmins = [];
  } else {
    selectedAdmins = selectableAdmins.map(a => a.id);
  }
  displayAdministratorsList();
}

function toggleAdminSelection(adminId) {
  const index = selectedAdmins.indexOf(adminId);
  if (index > -1) {
    selectedAdmins.splice(index, 1);
  } else {
    selectedAdmins.push(adminId);
  }
  displayAdministratorsList();
}

function searchAdmins() {
  const searchTerm = document.getElementById('adminSearch').value.toLowerCase();
  filteredAdmins = allAdmins.filter(admin => {
    const fullName = `${admin.nom} ${admin.prenom}`.toLowerCase();
    const email = (admin.email || '').toLowerCase();
    const role = getRoleDisplayName(admin.role).toLowerCase();
    return fullName.includes(searchTerm) || email.includes(searchTerm) || role.includes(searchTerm);
  });
  currentAdminPage = 1;
  selectedAdmins = [];
  displayAdministratorsList();
}

function renderAdminPagination() {
  const container = document.getElementById('adminPagination');
  if (!container) return;
  
  const totalPages = Math.ceil(filteredAdmins.length / adminsPerPage);
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `<button onclick="changeAdminPage(${currentAdminPage - 1})" ${currentAdminPage === 1 ? 'disabled' : ''} class="page-btn"><i class="fas fa-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentAdminPage - 1 && i <= currentAdminPage + 1)) {
      html += `<button onclick="changeAdminPage(${i})" class="page-btn ${i === currentAdminPage ? 'active' : ''}">${i}</button>`;
    } else if (i === currentAdminPage - 2 || i === currentAdminPage + 2) {
      html += '<span style="padding: 0.5rem;">...</span>';
    }
  }
  html += `<button onclick="changeAdminPage(${currentAdminPage + 1})" ${currentAdminPage === totalPages ? 'disabled' : ''} class="page-btn"><i class="fas fa-chevron-right"></i></button>`;
  container.innerHTML = html;
}

function changeAdminPage(page) {
  const totalPages = Math.ceil(filteredAdmins.length / adminsPerPage);
  if (page < 1 || page > totalPages) return;
  currentAdminPage = page;
  displayAdministratorsList();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function confirmDeleteAdmin(adminId) {
  const admin = allAdmins.find(a => a.id === adminId);
  if (!admin) return;

  if (currentUser && admin.email === currentUser.email) {
    showToast('Vous ne pouvez pas supprimer votre propre compte!', 'error');
    return;
  }

  showConfirmModal(
    'danger',
    'Supprimer cet administrateur',
    `Êtes-vous sûr de vouloir supprimer <strong>${admin.prenom} ${admin.nom}</strong> (${getRoleDisplayName(admin.role)}) ? Cette action est irréversible.`,
    () => deleteAdmin(adminId)
  );
}

async function deleteAdmin(adminId) {
  try {
    const admin = allAdmins.find(a => a.id === adminId);
    
    const response = await fetch(`${API_BASE}/users/${adminId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (response.ok) {
      // NOUVEAU: Envoyer email de suppression
      if (admin && admin.email) {
        try {
          await fetch(`${API_BASE}/email/account-deleted`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              email: admin.email,
              fullName: `${admin.prenom} ${admin.nom}`,
              role: admin.role
            })
          });
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
        }
      }
      
      showSuccessAnimation();
      showToast('Administrateur supprimé avec succès! Un email a été envoyé.', 'warning');
      if (admin) {
        addActivity(`Admin supprimé : ${admin.prenom} ${admin.nom}`, 'fa-user-times');
      }
      
      await Promise.all([
        loadDashboardData(),
        loadAdministrators()
      ]);
    } else {
      const error = await response.json();
      showToast('Erreur: ' + (error.error || 'Erreur de suppression'), 'error');
    }
  } catch (error) {
    showToast('Erreur lors de la suppression', 'error');
  }
}

function confirmDeleteSelectedAdmins() {
  if (selectedAdmins.length === 0) {
    showToast('Aucun administrateur sélectionné', 'info');
    return;
  }

  const currentUserAdmin = allAdmins.find(a => currentUser && a.email === currentUser.email);
  if (currentUserAdmin && selectedAdmins.includes(currentUserAdmin.id)) {
    showToast('Vous ne pouvez pas supprimer votre propre compte!', 'error');
    return;
  }

  showConfirmModal(
    'danger',
    'Supprimer les administrateurs sélectionnés',
    `Êtes-vous sûr de vouloir supprimer <strong>${selectedAdmins.length} administrateur(s)</strong> ? Cette action est irréversible.`,
    () => deleteSelectedAdmins()
  );
}

async function deleteSelectedAdmins() {
  try {
    for (const adminId of selectedAdmins) {
      await fetch(`${API_BASE}/users/${adminId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    }

    showSuccessAnimation();
    showToast(`${selectedAdmins.length} administrateur(s) supprimé(s) avec succès!`, 'success');
    addActivity(`${selectedAdmins.length} admins supprimés`, 'fa-users-slash');
    selectedAdmins = [];
    
    await Promise.all([
      loadDashboardData(),
      loadAdministrators()
    ]);
  } catch (error) {
    showToast('Erreur lors de la suppression', 'error');
  }
}

// ========================================
// GESTION DES SERVICES ET COMMISSIONS
// ========================================

async function createService(commissionId, commissionName) {
  showCustomPrompt(
    'Créer un nouveau service',
    `Pour la commission "${commissionName}", entrez le nom du service :`,
    '',
    async (serviceName) => {
      try {
        const response = await fetch(`${API_BASE}/services`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            nom: serviceName,
            commission_id: commissionId,
            description: ''
          })
        });

        if (response.ok) {
          showSuccessAnimation();
          showToast('Service créé avec succès!', 'success');
          addActivity(`Service créé : ${serviceName}`, 'fa-cogs');
          
          await Promise.all([
            loadServices(),
            loadCommissions(),
            loadDashboardData()
          ]);
          
          // Recharger les détails de la commission
          await showCommissionDetails(commissionId, commissionName);
        } else {
          const error = await response.json();
          showToast('Erreur: ' + error.error, 'error');
        }
      } catch (error) {
        showToast('Erreur lors de la création du service', 'error');
      }
    }
  );
}

function confirmDeleteService(serviceId, serviceName) {
  showConfirmModal(
    'danger',
    'Supprimer ce service',
    `Êtes-vous sûr de vouloir supprimer le service "<strong>${serviceName}</strong>" ?<br><br><strong style="color: var(--error);">⚠️ ATTENTION :</strong> Tous les membres de ce service seront également supprimés. Cette action est irréversible.`,
    async () => {
      try {
        const membersRes = await fetch(`${API_BASE}/membres/service/${serviceId}`, { headers: getAuthHeaders() });
        const members = await membersRes.json();
        
        if (members.length > 0) {
          showConfirmModal(
            'danger',
            'Confirmation finale',
            `Ce service contient <strong>${members.length} membre(s)</strong> qui seront TOUS supprimés.<br><br>Voulez-vous vraiment continuer ?`,
            () => deleteService(serviceId, serviceName)
          );
        } else {
          deleteService(serviceId, serviceName);
        }
      } catch (error) {
        deleteService(serviceId, serviceName);
      }
    }
  );
}

async function deleteService(serviceId, serviceName) {
  try {
    const response = await fetch(`${API_BASE}/services/${serviceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (response.ok) {
      showSuccessAnimation();
      showToast('Service supprimé avec succès!', 'warning');
      addActivity(`Service supprimé : ${serviceName}`, 'fa-minus-circle');
      
      await Promise.all([
        loadServices(),
        loadCommissions(),
        loadDashboardData()
      ]);
      
      // Recharger la page des commissions si on y est
      if (currentSection === 'commissionDetails' && currentCommissionId) {
        await showCommissionDetails(currentCommissionId, currentCommissionName);
      }
    } else {
      const error = await response.json();
      showToast('Erreur: ' + (error.error || 'Impossible de supprimer ce service'), 'error');
    }
  } catch (error) {
    showToast('Erreur lors de la suppression du service', 'error');
  }
}

// ========================================
// STATISTIQUES
// ========================================

async function loadStatistics() {
  setTimeout(() => {
    customSelects.forEach(cs => cs.refresh());
  }, 100);
}

async function displayServiceStatistics() {
  const serviceId = document.getElementById('statsServiceSelect').value;
  
  if (!serviceId) {
    showToast('Veuillez sélectionner un service', 'info');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/membres/service/${serviceId}`, { headers: getAuthHeaders() });
    if (response.ok) {
      const members = await response.json();
      displayStatsPage(members);
    }
  } catch (error) {
    showToast('Erreur lors du chargement des statistiques', 'error');
  }
}

function displayStatsPage(members) {
  const container = document.getElementById('statsContainer');
  if (!container) return;
  
  const total = members.length;
  const males = members.filter(m => m.sexe === 'Homme').length;
  const females = members.filter(m => m.sexe === 'Femme').length;
  const avgAge = total > 0 ? Math.round(members.reduce((sum, m) => {
    if (!m.date_naissance) return sum;
    const age = new Date().getFullYear() - new Date(m.date_naissance).getFullYear();
    return sum + age;
  }, 0) / total) : 0;

  const emailCount = members.filter(m => m.email && m.email.trim()).length;
  const phoneCount = members.filter(m => m.telephone && m.telephone.trim()).length;

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <div><div class="stat-number">${total}</div><div class="stat-label">Total Membres</div></div>
          <div class="stat-icon"><i class="fas fa-users"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div><div class="stat-number">${males}</div><div class="stat-label">Hommes</div></div>
          <div class="stat-icon"><i class="fas fa-male"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div><div class="stat-number">${females}</div><div class="stat-label">Femmes</div></div>
          <div class="stat-icon"><i class="fas fa-female"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div><div class="stat-number">${avgAge}</div><div class="stat-label">Âge Moyen</div></div>
          <div class="stat-icon"><i class="fas fa-birthday-cake"></i></div>
        </div>
      </div>
    </div>
    <div class="section-card">
      <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--black);"><i class="fas fa-chart-pie" style="color: var(--primary-red);"></i> Détails</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
        <div style="padding: 1.5rem; background: var(--off-white); border-radius: 12px; border-left: 4px solid var(--primary-red);">
          <strong style="color: var(--primary-red); display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"><i class="fas fa-envelope"></i> Emails</strong>
          <span style="font-size: 1.5rem; font-weight: 700;">${emailCount}/${total}</span>
        </div>
        <div style="padding: 1.5rem; background: var(--off-white); border-radius: 12px; border-left: 4px solid var(--info);">
          <strong style="color: var(--info); display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"><i class="fas fa-phone"></i> Téléphones</strong>
          <span style="font-size: 1.5rem; font-weight: 700;">${phoneCount}/${total}</span>
        </div>
        <div style="padding: 1.5rem; background: var(--off-white); border-radius: 12px; border-left: 4px solid var(--success);">
          <strong style="color: var(--success); display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"><i class="fas fa-chart-bar"></i> Hommes/Femmes</strong>
          <span style="font-size: 1.5rem; font-weight: 700;">${total > 0 ? Math.round((males / total) * 100) : 0}% / ${total > 0 ? Math.round((females / total) * 100) : 0}%</span>
        </div>
      </div>
    </div>
    <div class="section-card" style="margin-top: 2rem;">
      <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--black);"><i class="fas fa-list" style="color: var(--primary-red);"></i> Liste</h3>
      <div style="overflow-x: auto;">
        <table class="members-table">
          <thead>
            <tr>
              <th>Nom & Prénom</th><th>Sexe</th><th>Email</th><th>Téléphone</th>
            </tr>
          </thead>
          <tbody>
            ${members.map(m => `
              <tr>
                <td><strong>${m.nom} ${m.prenom}</strong></td>
                <td><span style="background: ${m.sexe === 'Homme' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(236, 72, 153, 0.1)'}; color: ${m.sexe === 'Homme' ? 'var(--info)' : '#EC4899'}; padding: 0.25rem 0.75rem; border-radius: 50px; font-size: 0.75rem; font-weight: 600;">${m.sexe}</span></td>
                <td>${m.email || '-'}</td>
                <td>${m.telephone || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ========================================
// GESTION DES COMMISSIONS DÉTAILLÉES
// ========================================

async function showCommissionDetails(commissionId, commissionName) {
  try {
    // Sauvegarder pour la navigation
    currentCommissionId = commissionId;
    currentCommissionName = commissionName;
    
    const [servicesRes, membersRes] = await Promise.all([
      fetch(`${API_BASE}/services`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/membres`, { headers: getAuthHeaders() })
    ]);
    
    const services = await servicesRes.json();
    const allMembers = await membersRes.json();
    
    // Services uniques pour cette commission
    const commissionServicesMap = new Map();
    services.filter(s => s.commission_id === commissionId).forEach(service => {
      if (!commissionServicesMap.has(service.nom)) {
        commissionServicesMap.set(service.nom, service);
      }
    });
    
    const commissionServices = Array.from(commissionServicesMap.values());
    
    const container = document.getElementById('commissionDetailsContent');
    if (container) {
      container.innerHTML = `
        <div style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 2rem; font-weight: 800; color: var(--black); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 1rem;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, var(--primary-red), var(--dark-red)); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: var(--white); font-size: 1.75rem;">
              <i class="fas fa-sitemap"></i>
            </div>
            <div>
              <div>${commissionName}</div>
              <p style="font-size: 1rem; font-weight: 400; color: var(--gray); margin-top: 0.5rem;">Gestion des services et ressources</p>
            </div>
          </h2>
        </div>
        
        <div style="background: linear-gradient(135deg, rgba(230, 0, 18, 0.05), rgba(184, 0, 14, 0.05)); border: 2px solid rgba(230, 0, 18, 0.2); border-radius: 16px; padding: 2rem; margin-bottom: 2.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem;">
          <div>
            <div style="font-size: 2.5rem; font-weight: 800; color: var(--primary-red); margin-bottom: 0.5rem;">${commissionServices.length}</div>
            <div style="color: var(--dark-gray); font-weight: 600;">Service(s) dans cette commission</div>
          </div>
          <button onclick="createService(${commissionId}, '${commissionName}')" class="btn-primary" style="width: auto; padding: 1rem 2rem; box-shadow: 0 6px 20px rgba(230, 0, 18, 0.3);">
            <i class="fas fa-plus-circle"></i> <span>Nouveau Service</span>
          </button>
        </div>
        
        <div class="services-grid">
          ${commissionServices.length > 0 ? commissionServices.map(service => {
            const serviceMembers = allMembers.filter(m => m.service_id === service.id);
            return `
              <div class="service-card">
                <div class="service-header">
                  <div class="service-icon">${service.nom.charAt(0).toUpperCase()}</div>
                  <div style="flex: 1;">
                    <div class="service-title">${service.nom}</div>
                    <div class="service-count">
                      <i class="fas fa-users"></i> ${serviceMembers.length} membre(s)
                    </div>
                  </div>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                  <button onclick="showServiceMembers(${service.id}, '${service.nom}')" class="action-btn" style="flex: 1; background: var(--info); padding: 0.75rem; border-radius: 8px; color: var(--white); font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; transition: var(--transition);">
                    <i class="fas fa-eye"></i> <span>Voir</span>
                  </button>
                  <button onclick="confirmDeleteService(${service.id}, '${service.nom}')" class="action-btn" style="background: var(--error); padding: 0.75rem; border-radius: 8px; color: var(--white); font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; transition: var(--transition);">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('') : `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: var(--off-white); border-radius: 16px; border: 2px dashed var(--light-gray);">
              <i class="fas fa-inbox" style="font-size: 4rem; color: var(--gray); opacity: 0.3; margin-bottom: 1.5rem; display: block;"></i>
              <h3 style="color: var(--dark-gray); font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Aucun service dans cette commission</h3>
              <p style="color: var(--gray); margin-bottom: 2rem;">Commencez par créer votre premier service</p>
              <button onclick="createService(${commissionId}, '${commissionName}')" class="btn-primary" style="width: auto; margin: 0 auto;">
                <i class="fas fa-plus-circle"></i> <span>Créer le premier service</span>
              </button>
            </div>
          `}
        </div>
      `;
    }
    
    showSection('commissionDetails');
  } catch (error) {
    console.error('Erreur chargement détails commission:', error);
    showToast('Erreur lors du chargement des détails', 'error');
  }
}

async function showServiceMembers(serviceId, serviceName) {
  try {
    const response = await fetch(`${API_BASE}/membres/service/${serviceId}`, { headers: getAuthHeaders() });
    const members = await response.json();
    
    const container = document.getElementById('serviceMembersContent');
    if (container) {
      container.innerHTML = `
        <div style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--black); margin-bottom: 0.5rem;">
            <i class="fas fa-users" style="color: var(--primary-red);"></i> ${serviceName}
          </h2>
          <p style="color: var(--gray);">${members.length} membre(s) dans ce service</p>
        </div>
        
        ${members.length > 0 ? `
          <div class="member-list">
            ${members.map(member => `
              <div class="member-item">
                <div class="member-info">
                  <h4>${member.nom} ${member.prenom}</h4>
                  <div class="member-details">
                    <div class="member-detail"><i class="fas fa-envelope"></i><span>${member.email ||'Pas d\'email'}</span></div>
                    <div class="member-detail"><i class="fas fa-phone"></i><span>${member.telephone || 'Pas de téléphone'}</span></div>
                    <div class="member-detail"><i class="fas fa-venus-mars"></i><span>${member.sexe || 'Non spécifié'}</span></div>
                  </div>
                </div>
                <div class="member-actions">
                  <button class="action-btn edit" onclick="editMember(${member.id})" title="Modifier"><i class="fas fa-edit"></i></button>
                  <button class="action-btn delete" onclick="confirmDeleteMember(${member.id})" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 3rem; color: var(--gray);">
            <i class="fas fa-users-slash" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <p>Aucun membre dans ce service</p>
          </div>
        `}
      `;
    }
    
    const tempSection = document.getElementById('serviceMembersSection');
    if (tempSection) {
      tempSection.classList.add('active');
      document.querySelectorAll('.content-section').forEach(section => {
        if (section.id !== 'serviceMembersSection') section.classList.remove('active');
      });
      
      // CORRECTION: Garder l'état actif sur commissions
      document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
      const commissionsLink = document.querySelector('.sidebar-link[onclick*="commissions"]');
      if (commissionsLink) commissionsLink.classList.add('active');
    }
  } catch (error) {
    console.error('Erreur chargement membres service:', error);
    showToast('Erreur lors du chargement des membres', 'error');
  }
}

// ========================================
// GESTION DES MODALES
// ========================================

function closeEditMemberModal() {
  const modal = document.getElementById('editMemberModal');
  if (modal) modal.classList.remove('show');
  currentEditingMember = null;
}

function closeUserProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (modal) modal.classList.remove('show');
}

function openAddMemberModal() {
  const modal = document.getElementById('addMemberModal');
  if (modal) modal.classList.add('show');
  
  setTimeout(() => {
    customSelects.forEach(cs => cs.refresh());
  }, 100);
}

function closeAddMemberModal() {
  const modal = document.getElementById('addMemberModal');
  if (modal) modal.classList.remove('show');
}

function openAddAdminModal() {
  const modal = document.getElementById('addAdminModal');
  if (modal) modal.classList.add('show');
  
  document.getElementById('manageUserForm').reset();
  handleRoleChange();
  
  setTimeout(() => {
    customSelects.forEach(cs => cs.refresh());
  }, 100);
}

function closeAddAdminModal() {
  const modal = document.getElementById('addAdminModal');
  if (modal) modal.classList.remove('show');
}

// ========================================
// FONCTIONS DE NAVIGATION SUPPLÉMENTAIRES
// ========================================

function goBackToCommissions() {
  // Réinitialiser les variables de navigation
  currentCommissionId = null;
  currentCommissionName = null;
  showSection('commissions');
}

function goBackToServices() {
  // CORRECTION: Retourner aux détails de la commission au lieu de services
  if (currentCommissionId && currentCommissionName) {
    showCommissionDetails(currentCommissionId, currentCommissionName);
  } else {
    showSection('commissions');
  }
}

// ========================================
// FONCTIONS GLOBALES POUR L'UTILISATION HTML
// ========================================

window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.openUserProfile = openUserProfile;
window.confirmLogout = confirmLogout;
window.openAddMemberModal = openAddMemberModal;
window.closeAddMemberModal = closeAddMemberModal;
window.openAddAdminModal = openAddAdminModal;
window.closeAddAdminModal = closeAddAdminModal;
window.closeUserProfileModal = closeUserProfileModal;
window.closeEditMemberModal = closeEditMemberModal;
window.handleRoleChange = handleRoleChange;
window.handleCommissionChange = handleCommissionChange;
window.displayServiceStatistics = displayServiceStatistics;
window.editMember = editMember;
window.confirmDeleteMember = confirmDeleteMember;
window.toggleMemberSelection = toggleMemberSelection;
window.toggleSelectAllMembers = toggleSelectAllMembers;
window.confirmDeleteSelectedMembers = confirmDeleteSelectedMembers;
window.changePage = changePage;
window.searchMembers = searchMembers;
window.toggleAdminSelection = toggleAdminSelection;
window.toggleSelectAllAdmins = toggleSelectAllAdmins;
window.confirmDeleteAdmin = confirmDeleteAdmin;
window.confirmDeleteSelectedAdmins = confirmDeleteSelectedAdmins;
window.changeAdminPage = changeAdminPage;
window.searchAdmins = searchAdmins;
window.createService = createService;
window.confirmDeleteService = confirmDeleteService;
window.showCommissionDetails = showCommissionDetails;
window.showServiceMembers = showServiceMembers;
window.goBackToCommissions = goBackToCommissions;
window.goBackToServices = goBackToServices;
window.showAdministrators = showAdministrators;
window.loadStatistics = loadStatistics;

// ========================================
// INITIALISATION DES ÉVÉNEMENTS SUPPLÉMENTAIRES
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  const editMemberForm = document.getElementById('editMemberForm');
  if (editMemberForm) {
    editMemberForm.addEventListener('submit', handleEditMember);
  }
  
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const modal = this.closest('.modal');
      if (modal) modal.classList.remove('show');
    });
  });
  
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.show').forEach(modal => {
        modal.classList.remove('show');
      });
    }
  });
});