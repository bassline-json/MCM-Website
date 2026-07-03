const API_BASE = '/api';
let currentUser = null;
let authToken = window.localStorage.getItem('mcm_token');
let services = [];
let allMembers = [];
let filteredMembers = [];
let selectedMembers = [];
let currentPage = 1;
const membersPerPage = 10;

// Custom Selects Storage
const customSelects = {};

const welcomeMessages = [
    { title: "Bienvenue dans votre espace Commission !", subtitle: "Pilotez vos services avec efficacité et vision stratégique" },
    { title: "Excellente journée à vous !", subtitle: "Votre leadership fait la différence dans cette commission" },
    { title: "Ravi de vous revoir !", subtitle: "Continuez votre excellent travail de coordination" },
    { title: "Bonjour Admin de Commission !", subtitle: "Ensemble, construisons une commission forte et unie" },
    { title: "Prêt à accomplir de grandes choses !", subtitle: "Votre commission compte sur votre dévouement" },
    { title: "Une nouvelle journée pleine d'opportunités !", subtitle: "Supervisez et développez votre commission avec passion" },
    { title: "En avant vers le succès !", subtitle: "Vos actions contribuent à l’harmonie et la performance de votre commission" },
    { title: "Heureux de vous retrouver !", subtitle: "Faites briller votre commission par votre sens de l’organisation" },
    { title: "Le succès commence ici !", subtitle: "Dirigez votre commission avec engagement et clarté" },
    { title: "Leadership affirmé !", subtitle: "Votre expertise renforce chaque membre de votre équipe" },
    { title: "Bon retour parmi nous !", subtitle: "Prenez les bonnes décisions pour faire avancer vos projets" },
    { title: "Cap sur la réussite !", subtitle: "Votre commission avance grâce à votre vision" },
    { title: "Toujours à la hauteur !", subtitle: "Votre rigueur et votre passion font la différence" },
    { title: "Gestion efficace, commission dynamique !", subtitle: "Continuez à inspirer vos collaborateurs" },
    { title: "Bienvenue, coordinateur de talent !", subtitle: "Votre leadership harmonise les efforts de tous" },
    { title: "Une belle journée de collaboration !", subtitle: "Travaillez main dans la main avec votre équipe" },
    { title: "Bon début de session !", subtitle: "Vos outils de gestion sont prêts pour une nouvelle journée" },
    { title: "L’excellence au quotidien !", subtitle: "Votre engagement inspire et motive toute la commission" },
    { title: "Ambition et vision !", subtitle: "Faites progresser votre commission avec stratégie" },
    { title: "Ensemble vers l’impact !", subtitle: "Votre rôle est essentiel à la réussite collective" }
];

const getAuthHeaders = () => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
});

// ========================================
// INITIALISATION
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    if (!authToken || authToken === 'null' || authToken === 'undefined') {
        window.location.href = './login.html';
        return;
    }
    initializeApp();
});

async function initializeApp() {
    try {
        await loadUserProfile();
        displayRandomWelcome();
        await loadServices();
        await checkBirthdays();
        initializeEventListeners();
        initializeCustomSelects();
        
        // Rafraîchir les services toutes les 30 secondes
        setInterval(refreshServices, 30000);
        
        // Initialisation WebSocket
        if (typeof io !== 'undefined') {
            const socket = io();
            socket.on('member:created', () => { refreshServices(); });
            socket.on('member:updated', () => { refreshServices(); });
            socket.on('member:deleted', () => { refreshServices(); });
            socket.on('service:created', () => { refreshServices(); });
            socket.on('service:updated', () => { refreshServices(); });
            socket.on('service:deleted', () => { refreshServices(); });
        }
    } catch (error) {
        console.error('Erreur initialisation:', error);
        showToast('Erreur lors de l\'initialisation', 'error');
    }
}

function displayRandomWelcome() {
    const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    document.getElementById('welcomeMessage').textContent = randomMessage.title;
    document.getElementById('welcomeSubtext').textContent = randomMessage.subtitle;
}

// ========================================
// CUSTOM SELECT INITIALIZATION
// ========================================
function initializeCustomSelects() {
    document.querySelectorAll('.custom-select').forEach(select => {
        const selectId = select.dataset.select;
        customSelects[selectId] = '';

        const dropdown = select.nextElementSibling.nextElementSibling;
        if (!dropdown) return;
        
        const options = dropdown.querySelectorAll('.custom-select-option');

        // Toggle dropdown
        select.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Close all other dropdowns
            document.querySelectorAll('.custom-select-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('show');
            });
            document.querySelectorAll('.custom-select').forEach(s => {
                if (s !== select) s.classList.remove('active');
            });

            dropdown.classList.toggle('show');
            select.classList.toggle('active');
        });

        // Select option
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.dataset.value;
                const text = option.querySelector('span').textContent;

                customSelects[selectId] = value;
                select.querySelector('.selected-text').textContent = text;

                // Update selected state
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                dropdown.classList.remove('show');
                select.classList.remove('active');
            });
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.custom-select').forEach(s => s.classList.remove('active'));
    });
}

function updateCustomSelectOptions(selectId, options) {
    const select = document.querySelector(`[data-select="${selectId}"]`);
    if (!select) return;

    const dropdown = select.nextElementSibling.nextElementSibling;
    if (!dropdown) return;

    dropdown.innerHTML = '<div class="custom-select-option" data-value=""><i class="fas fa-check"></i><span>Choisir un service</span></div>';

    options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'custom-select-option';
        optionDiv.dataset.value = option.value;
        optionDiv.innerHTML = `<i class="fas fa-check"></i><span>${option.text}</span>`;
        
        optionDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            customSelects[selectId] = option.value;
            select.querySelector('.selected-text').textContent = option.text;

            dropdown.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
            optionDiv.classList.add('selected');

            dropdown.classList.remove('show');
            select.classList.remove('active');
        });

        dropdown.appendChild(optionDiv);
    });
}

function getCustomSelectValue(selectId) {
    return customSelects[selectId] || '';
}

function setCustomSelectValue(selectId, value, text) {
    const select = document.querySelector(`[data-select="${selectId}"]`);
    if (!select) return;

    customSelects[selectId] = value;
    select.querySelector('.selected-text').textContent = text;

    const dropdown = select.nextElementSibling.nextElementSibling;
    if (dropdown) {
        dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
            if (opt.dataset.value == value) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    }
}

// ========================================
// EVENT LISTENERS
// ========================================
function initializeEventListeners() {
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', toggleSidebar);
    }

    document.getElementById('addMemberForm').addEventListener('submit', handleAddMember);
    document.getElementById('profileForm').addEventListener('submit', handleUpdateProfile);
    document.getElementById('editMemberForm').addEventListener('submit', handleEditMember);

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburger');
        if (window.innerWidth <= 1024 && 
            sidebar && hamburger &&
            !sidebar.contains(e.target) && 
            !hamburger.contains(e.target) &&
            sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    });
}

// ========================================
// NAVIGATION
// ========================================
function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const sectionMap = {
        'dashboard': 'dashboardSection',
        'services': 'servicesSection',
        'members': 'membersSection',
        'addMember': 'addMemberSection',
        'reports': 'reportsSection'
    };
    
    const sectionId = sectionMap[sectionName];
    const sectionElement = document.getElementById(sectionId);
    
    if (sectionElement) {
        sectionElement.classList.add('active');
        
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }
        
        if (window.innerWidth <= 1024) {
            toggleSidebar();
        }

        if (sectionName === 'members') {
            currentPage = 1;
            displayMembers();
        }

        if (sectionName === 'reports') {
            loadStatsServiceSelect();
        }
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger');
    
    if (sidebar && hamburger) {
        sidebar.classList.toggle('open');
        hamburger.classList.toggle('active');
        
        const mobileItems = document.querySelectorAll('.mobile-only');
        mobileItems.forEach(item => {
            if (window.innerWidth <= 1024) {
                item.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
            }
        });
    }
}

// ========================================
// USER PROFILE
// ========================================
async function loadUserProfile() {
    try {
        // Toujours récupérer les données fraîches depuis la base de données
        const response = await fetch(`${API_BASE}/users/me`, {
            headers: getAuthHeaders()
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
        } else {
            // Fallback localStorage
            const userDataString = window.localStorage.getItem('mcm_user');
            if (userDataString && userDataString !== 'null' && userDataString !== 'undefined') {
                currentUser = JSON.parse(userDataString);
            } else {
                currentUser = { nom: '', prenom: '', email: 'admincom@mcm.com', commission_id: 1 };
            }
        }
        
        const fullName = `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim();
        document.getElementById('userName').textContent = fullName || 'Admin Commission';
        
        const initials = `${(currentUser.prenom || '').charAt(0)}${(currentUser.nom || '').charAt(0)}`;
        document.getElementById('userInitials').textContent = initials.toUpperCase() || 'AC';
        
        document.getElementById('profileNom').value = currentUser.nom || '';
        document.getElementById('profilePrenom').value = currentUser.prenom || '';
        document.getElementById('profileEmail').value = currentUser.email || '';
        
        if (currentUser.commission_id) {
            await loadCommissionName(currentUser.commission_id);
        }
        
    } catch (error) {
        console.error('Erreur chargement profil (fallback localStorage):', error);
        // Fallback localStorage
        const userDataString = window.localStorage.getItem('mcm_user');
        if (userDataString && userDataString !== 'null') {
            currentUser = JSON.parse(userDataString);
        } else {
            currentUser = { nom: '', prenom: '', email: 'admincom@mcm.com', commission_id: 1 };
        }
        const fullName = `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim();
        document.getElementById('userName').textContent = fullName || 'Admin Commission';
        const initials = `${(currentUser.prenom || '').charAt(0)}${(currentUser.nom || '').charAt(0)}`;
        document.getElementById('userInitials').textContent = initials.toUpperCase() || 'AC';
    }
}

async function loadCommissionName(commissionId) {
    try {
        const response = await fetch(`${API_BASE}/commissions`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const commissions = await response.json();
            const commission = commissions.find(c => c.id === commissionId);
            if (commission) {
                document.getElementById('commissionName').textContent = commission.nom;
            }
        }
    } catch (error) {
        console.error('Erreur chargement nom commission:', error);
    }
}

function openProfileModal() {
    document.getElementById('profileModal').classList.add('show');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('show');
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    
    const profileData = {
        nom: document.getElementById('profileNom').value.trim(),
        prenom: document.getElementById('profilePrenom').value.trim(),
        email: document.getElementById('profileEmail').value.trim()
    };

    const password = document.getElementById('profilePassword').value;
    if (password) {
        profileData.mot_de_passe = password;
    }

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
                email: updatedUser.email || profileData.email
            };
            window.localStorage.setItem('mcm_user', JSON.stringify(currentUser));
            if (result.token) {
                window.localStorage.setItem('mcm_token', result.token);
            }
            
            showSuccessAnimation();
            showToast('Profil mis à jour avec succès!', 'success');
            await loadUserProfile();
            closeProfileModal();
            if (password) document.getElementById('profilePassword').value = '';
        } else {
            const err = await response.json();
            showToast('Erreur: ' + (err.error || 'Impossible de mettre à jour le profil'), 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion lors de la mise à jour', 'error');
    }
}

// ========================================
// BIRTHDAY CHECK SYSTEM
// ========================================
async function checkBirthdays() {
    try {
        const response = await fetch(`${API_BASE}/membres`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) return;

        const allMembersData = await response.json();
        const today = new Date();
        const birthdayPeople = [];

        allMembersData.forEach(member => {
            if (member.date_naissance && member.email) {
                const birthDate = new Date(member.date_naissance);
                if (birthDate.getMonth() === today.getMonth() && 
                    birthDate.getDate() === today.getDate()) {
                    const age = today.getFullYear() - birthDate.getFullYear();
                    birthdayPeople.push({ ...member, age });
                }
            }
        });

        if (birthdayPeople.length > 0) {
            birthdayPeople.forEach(async person => {
                showToast(
                    `🎉 C'est l'anniversaire de ${person.prenom} ${person.nom}! Il/Elle a ${person.age} ans!`,
                    'info'
                );
                await sendBirthdayEmail(person);
            });
        }
    } catch (error) {
        console.error('Erreur vérification anniversaires:', error);
    }
}

// ========================================
// SERVICES MANAGEMENT
// ========================================
async function loadServices() {
    try {
        if (!currentUser || !currentUser.commission_id) {
            showToast('Erreur: Commission ID non trouvée', 'error');
            return;
        }

        const response = await fetch(`${API_BASE}/services`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401) {
            window.localStorage.removeItem('mcm_token');
            window.localStorage.removeItem('mcm_user');
            window.location.href = './login.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const allServices = await response.json();
        services = allServices.filter(s => s.commission_id === currentUser.commission_id);
        
        displayServices();
        populateServiceSelects();
        await loadAllMembers();
        updateStats();
        
    } catch (error) {
        console.error('Erreur chargement services:', error);
        showToast('Erreur: ' + error.message, 'error');
    }
}

async function refreshServices() {
    try {
        const response = await fetch(`${API_BASE}/services`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const allServices = await response.json();
            const newServices = allServices.filter(s => s.commission_id === currentUser.commission_id);
            
            if (JSON.stringify(newServices) !== JSON.stringify(services)) {
                services = newServices;
                displayServices();
                populateServiceSelects();
                updateStats();
                console.log('✅ Services synchronisés');
            }
        }
    } catch (error) {
        console.error('Erreur rafraîchissement services:', error);
    }
}

function displayServices() {
    const container = document.getElementById('servicesGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (services.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--gray);">
                <i class="fas fa-cogs" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>Aucun service trouvé dans votre commission.</p>
            </div>
        `;
        return;
    }
    
    services.forEach(service => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        
        const initials = service.nom.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();
        
        serviceCard.innerHTML = `
            <div class="service-header">
                <div class="service-icon">${initials}</div>
                <div style="flex: 1;">
                    <div class="service-title">${service.nom}</div>
                </div>
            </div>
            <div class="service-count" id="count-${service.id}">
                <i class="fas fa-users"></i>
                <span>Chargement...</span>
            </div>
        `;
        
        container.appendChild(serviceCard);
        loadServiceMemberCount(service.id);
    });
}

async function loadServiceMemberCount(serviceId) {
    try {
        const response = await fetch(`${API_BASE}/membres/service/${serviceId}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const members = await response.json();
            const countElement = document.getElementById(`count-${serviceId}`);
            if (countElement) {
                countElement.innerHTML = `
                    <i class="fas fa-users"></i>
                    <span>${members.length} membre(s)</span>
                `;
            }
        }
    } catch (error) {
        console.error('Erreur comptage membres:', error);
    }
}

function populateServiceSelects() {
    const selectIds = ['serviceSelect', 'editMemberService', 'statsServiceSelect'];
    
    selectIds.forEach(selectId => {
        const options = services.map(service => ({
            value: service.id,
            text: service.nom
        }));
        
        updateCustomSelectOptions(selectId, options);
    });
}

function loadStatsServiceSelect() {
    populateServiceSelects();
}

// ========================================
// MEMBERS MANAGEMENT
// ========================================
async function loadAllMembers() {
    try {
        allMembers = [];
        
        for (const service of services) {
            try {
                const response = await fetch(`${API_BASE}/membres/service/${service.id}`, {
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    const serviceMembers = await response.json();
                    serviceMembers.forEach(member => {
                        member.service_nom = service.nom;
                        member.service_id = service.id;
                    });
                    allMembers = allMembers.concat(serviceMembers);
                }
            } catch (error) {
                console.error(`Erreur membres service:`, error);
            }
        }

        filteredMembers = [...allMembers];
        selectedMembers = [];
        displayMembers();
        updateStats();
        
    } catch (error) {
        console.error('Erreur chargement membres:', error);
    }
}

function displayMembers() {
    const container = document.getElementById('membersTableContainer');
    if (!container) return;
    
    if (filteredMembers.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; color: var(--gray); padding: 3rem;">
                <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3; display: block;"></i>
                Aucun membre trouvé.
            </p>
        `;
        document.getElementById('pagination').innerHTML = '';
        document.getElementById('bulkActionsContainer').innerHTML = '';
        return;
    }

    const bulkContainer = document.getElementById('bulkActionsContainer');
    if (selectedMembers.length > 0) {
        bulkContainer.innerHTML = `
            <div class="bulk-actions">
                <span class="bulk-actions-text">
                    <i class="fas fa-check-circle"></i> ${selectedMembers.length} membre(s) sélectionné(s)
                </span>
                <button type="button" class="btn-primary btn-danger" style="width: 200px;" onclick="deleteSelectedMembers()">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>
        `;
    } else {
        bulkContainer.innerHTML = '';
    }
    
    const startIndex = (currentPage - 1) * membersPerPage;
    const endIndex = startIndex + membersPerPage;
    const paginated = filteredMembers.slice(startIndex, endIndex);
    
    let html = `
        <table class="members-table">
            <thead>
                <tr>
                    <th style="width: 30px;"><input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll()"></th>
                    <th>Membre</th>
                    <th>Service</th>
                    <th>Sexe</th>
                    <th>Contact</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    paginated.forEach(member => {
        const isSelected = selectedMembers.includes(member.id);
        html += `
            <tr>
                <td><input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleMemberSelection(${member.id})"></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-red), var(--dark-red)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.875rem;">${member.nom.charAt(0)}${member.prenom.charAt(0)}</div>
                        <div>
                            <div style="font-weight: 600; color: var(--black);">${member.nom} ${member.prenom}</div>
                            <div style="font-size: 0.875rem; color: var(--gray);">${member.email || 'Pas d\'email'}</div>
                        </div>
                    </div>
                </td>
                <td>${member.service_nom || 'Non défini'}</td>
                <td>
                    <span class="member-badge ${member.sexe.toLowerCase()}">
                        <i class="fas fa-${member.sexe === 'Homme' ? 'male' : 'female'}"></i>
                        ${member.sexe}
                    </span>
                </td>
                <td>
                    <div style="font-size: 0.875rem; color: var(--gray);">
                        <i class="fas fa-phone" style="color: var(--primary-red);"></i>
                        ${member.telephone || 'Non renseigné'}
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="editMember(${member.id})" style="width: 36px; height: 36px; border-radius: 8px; border: none; cursor: pointer; background: rgba(59, 130, 246, 0.1); color: var(--info); transition: var(--transition);" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteMember(${member.id})" style="width: 36px; height: 36px; border-radius: 8px; border: none; cursor: pointer; background: rgba(220, 38, 38, 0.1); color: var(--error); transition: var(--transition);" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
    updateSelectAllCheckbox();
    renderPagination();
}

function toggleSelectAll() {
    const checkbox = document.getElementById('selectAllCheckbox');
    const startIndex = (currentPage - 1) * membersPerPage;
    const endIndex = startIndex + membersPerPage;
    const paginated = filteredMembers.slice(startIndex, endIndex);

    if (checkbox.checked) {
        paginated.forEach(member => {
            if (!selectedMembers.includes(member.id)) {
                selectedMembers.push(member.id);
            }
        });
    } else {
        paginated.forEach(member => {
            const index = selectedMembers.indexOf(member.id);
            if (index > -1) {
                selectedMembers.splice(index, 1);
            }
        });
    }
    displayMembers();
}

function toggleMemberSelection(memberId) {
    const index = selectedMembers.indexOf(memberId);
    if (index > -1) {
        selectedMembers.splice(index, 1);
    } else {
        selectedMembers.push(memberId);
    }
    displayMembers();
}

function updateSelectAllCheckbox() {
    const checkbox = document.getElementById('selectAllCheckbox');
    if (!checkbox) return;

    const startIndex = (currentPage - 1) * membersPerPage;
    const endIndex = startIndex + membersPerPage;
    const paginated = filteredMembers.slice(startIndex, endIndex);
    
    const allSelected = paginated.length > 0 && paginated.every(m => selectedMembers.includes(m.id));
    checkbox.checked = allSelected;
}

// Variable pour stocker l'action de suppression en attente
let pendingDeleteAction = null;

async function deleteSelectedMembers() {
    if (selectedMembers.length === 0) {
        showToast('Aucun membre sélectionné', 'info');
        return;
    }

    // Ouvrir le modal de confirmation
    document.getElementById('deleteModalTitle').textContent = 
        `Supprimer ${selectedMembers.length} membre(s) ?`;
    document.getElementById('deleteModalMessage').textContent = 
        `Vous êtes sur le point de supprimer ${selectedMembers.length} membre(s). Cette action est irréversible.`;
    
    pendingDeleteAction = async () => {
        try {
            for (const memberId of selectedMembers) {
                await fetch(`${API_BASE}/membres/${memberId}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
            }

            showSuccessAnimation();
            showToast(`${selectedMembers.length} membre(s) supprimé(s) avec succès!`, 'success');
            selectedMembers = [];
            await loadServices();
        } catch (error) {
            showToast('Erreur lors de la suppression', 'error');
        }
    };
    
    document.getElementById('deleteConfirmModal').classList.add('show');
}

async function deleteMember(id) {
    const member = allMembers.find(m => m.id === id);
    const memberName = member ? `${member.prenom} ${member.nom}` : 'ce membre';
    
    // Ouvrir le modal de confirmation
    document.getElementById('deleteModalTitle').textContent = 'Supprimer ce membre ?';
    document.getElementById('deleteModalMessage').textContent = 
        `Vous êtes sur le point de supprimer ${memberName}. Cette action est irréversible.`;
    
    pendingDeleteAction = async () => {
        try {
            const response = await fetch(`${API_BASE}/membres/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                showSuccessAnimation();
                showToast('Membre supprimé avec succès!', 'success');
                await loadServices();
            } else {
                const result = await response.json();
                throw new Error(result.error || 'Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showToast('Erreur: ' + error.message, 'error');
        }
    };
    
    document.getElementById('deleteConfirmModal').classList.add('show');
}

function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').classList.remove('show');
    pendingDeleteAction = null;
}

async function confirmDelete() {
    closeDeleteModal();
    if (pendingDeleteAction) {
        await pendingDeleteAction();
        pendingDeleteAction = null;
    }
}

function logout() {
    confirmLogout();
}

function closeLogoutModal() {
    document.getElementById('logoutModal').classList.remove('show');
}

function confirmLogout() {
    // Fermer le modal
    closeLogoutModal();
    
    // Supprimer les données de session
    window.localStorage.removeItem('mcm_token');
    window.localStorage.removeItem('mcm_user');
    
    // Afficher le toast de déconnexion
    showToast('Déconnexion réussie. À bientôt ! 👋', 'info');
    
    // Rediriger après un court délai
    setTimeout(() => {
        window.location.href = './login.html';
    }, 1000);
}

// ========================================
// RESPONSIVE
// ========================================
window.addEventListener('resize', function() {
    const mobileItems = document.querySelectorAll('.mobile-only');
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger');
    
    if (window.innerWidth > 1024) {
        if (sidebar) sidebar.classList.remove('open');
        if (hamburger) hamburger.classList.remove('active');
        mobileItems.forEach(el => el.style.display = 'none');
    }
});

function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = `
        <button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `
                <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        }
    }
    
    html += `
        <button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    container.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayMembers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterMembers() {
    const searchTerm = document.getElementById('searchMembers').value.toLowerCase();
    
    filteredMembers = allMembers.filter(member => {
        const fullName = `${member.nom} ${member.prenom}`.toLowerCase();
        const email = (member.email || '').toLowerCase();
        const service = (member.service_nom || '').toLowerCase();
        
        return fullName.includes(searchTerm) || 
            email.includes(searchTerm) || 
            service.includes(searchTerm);
    });
    
    currentPage = 1;
    selectedMembers = [];
    displayMembers();
}

function updateStats() {
    const totalServicesEl = document.getElementById('totalServices');
    const totalMembersEl = document.getElementById('totalMembers');
    const avgEl = document.getElementById('avgMembersPerService');
    const maleEl = document.getElementById('maleMembers');
    
    if (totalServicesEl) totalServicesEl.textContent = services.length;
    if (totalMembersEl) totalMembersEl.textContent = allMembers.length;
    
    const avg = services.length > 0 ? Math.round(allMembers.length / services.length) : 0;
    if (avgEl) avgEl.textContent = avg;
    
    const males = allMembers.filter(m => m.sexe === 'Homme').length;
    if (maleEl) maleEl.textContent = males;
}

// ========================================
// ADD MEMBER
// ========================================
async function handleAddMember(e) {
    e.preventDefault();
    
    const btn = document.getElementById('addMemberBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Ajout en cours...</span>';
    btn.disabled = true;
    
    const memberData = {
        service_id: parseInt(getCustomSelectValue('serviceSelect')),
        nom: document.getElementById('memberNom').value,
        prenom: document.getElementById('memberPrenom').value,
        sexe: getCustomSelectValue('memberSexe'),
        date_naissance: document.getElementById('memberDateNaissance').value,
        email: document.getElementById('memberEmail').value,
        telephone: document.getElementById('memberTelephone').value
    };

    if (!memberData.service_id || !memberData.sexe) {
        showToast('Veuillez remplir tous les champs obligatoires', 'warning');
        btn.innerHTML = '<i class="fas fa-plus"></i> <span>Ajouter le Membre</span>';
        btn.disabled = false;
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/membres`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(memberData)
        });

        if (response.ok) {
            document.getElementById('addMemberForm').reset();
            setCustomSelectValue('serviceSelect', '', 'Choisir un service');
            setCustomSelectValue('memberSexe', '', 'Sélectionner le sexe');
            
            showSuccessAnimation();
            showToast('Membre ajouté avec succès!', 'success');
            await loadServices();
        } else {
            const result = await response.json();
            throw new Error(result.error || 'Erreur lors de l\'ajout');
        }
    } catch (error) {
        console.error('Erreur ajout:', error);
        showToast('Erreur: ' + error.message, 'error');
    } finally {
        btn.innerHTML = '<i class="fas fa-plus"></i> <span>Ajouter le Membre</span>';
        btn.disabled = false;
    }
}

// ========================================
// EDIT MEMBER
// ========================================
async function editMember(id) {
    try {
        const member = allMembers.find(m => m.id === id);
        
        if (!member) {
            showToast('Membre non trouvé', 'error');
            return;
        }
        
        document.getElementById('editMemberId').value = member.id;
        
        setCustomSelectValue('editMemberService', member.service_id, member.service_nom);
        setCustomSelectValue('editMemberSexe', member.sexe, member.sexe);
        
        document.getElementById('editMemberNom').value = member.nom;
        document.getElementById('editMemberPrenom').value = member.prenom;
        
        let dateValue = member.date_naissance;
        if (dateValue && dateValue.includes('T')) {
            dateValue = dateValue.split('T')[0];
        }
        document.getElementById('editMemberDateNaissance').value = dateValue || '';
        document.getElementById('editMemberEmail').value = member.email || '';
        document.getElementById('editMemberTelephone').value = member.telephone || '';
        
        document.getElementById('editMemberModal').classList.add('show');
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de chargement', 'error');
    }
}

function closeEditMemberModal() {
    document.getElementById('editMemberModal').classList.remove('show');
}

async function handleEditMember(e) {
    e.preventDefault();
    
    const id = document.getElementById('editMemberId').value;
    const memberData = {
        service_id: parseInt(getCustomSelectValue('editMemberService')),
        nom: document.getElementById('editMemberNom').value,
        prenom: document.getElementById('editMemberPrenom').value,
        sexe: getCustomSelectValue('editMemberSexe'),
        date_naissance: document.getElementById('editMemberDateNaissance').value,
        email: document.getElementById('editMemberEmail').value,
        telephone: document.getElementById('editMemberTelephone').value
    };

    if (!memberData.service_id || !memberData.sexe) {
        showToast('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/membres/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(memberData)
        });

        if (response.ok) {
            showSuccessAnimation();
            showToast('Membre modifié avec succès!', 'success');
            closeEditMemberModal();
            await loadServices();
        } else {
            const result = await response.json();
            throw new Error(result.error || 'Erreur lors de la modification');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur: ' + error.message, 'error');
    }
}

async function deleteMember(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return;

    try {
        const response = await fetch(`${API_BASE}/membres/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showSuccessAnimation();
            showToast('Membre supprimé avec succès!', 'warning');
            await loadServices();
        } else {
            const result = await response.json();
            throw new Error(result.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur: ' + error.message, 'error');
    }
}

// ========================================
// STATISTICS
// ========================================
async function displayServiceStatistics() {
    const serviceId = getCustomSelectValue('statsServiceSelect');
    
    if (!serviceId) {
        showToast('Veuillez sélectionner un service', 'info');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/membres/service/${serviceId}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Erreur lors du chargement');
        }

        const members = await response.json();
        const selectedService = services.find(s => s.id === parseInt(serviceId));
        
        renderStatsDisplay(members, selectedService.nom);
    } catch (error) {
        showToast('Erreur: ' + error.message, 'error');
    }
}

function renderStatsDisplay(members, serviceName) {
    const container = document.getElementById('statsDisplay');
    const total = members.length;
    const males = members.filter(m => m.sexe === 'Homme').length;
    const females = members.filter(m => m.sexe === 'Femme').length;
    
    let avgAge = 0;
    if (total > 0) {
        avgAge = Math.round(members.reduce((sum, m) => {
            if (!m.date_naissance) return sum;
            const birthDate = new Date(m.date_naissance);
            const age = new Date().getFullYear() - birthDate.getFullYear();
            return sum + age;
        }, 0) / total);
    }

    const emailCount = members.filter(m => m.email && m.email.trim()).length;
    const phoneCount = members.filter(m => m.telephone && m.telephone.trim()).length;
    const completionRate = total > 0 ? Math.round(((emailCount + phoneCount) / (total * 2)) * 100) : 0;

    let html = `
        <div class="stats-header">
            <h2>📊 ${serviceName}</h2>
            <p style="color: var(--gray);">Statistiques détaillées du service</p>
        </div>

        <div class="stats-cards-grid">
            <div class="stats-card-large">
                <div class="stats-card-content">
                    <div class="stats-big-number">${total}</div>
                    <div class="stats-big-label">Membres au total</div>
                </div>
            </div>
            <div class="stats-card-large" style="background: linear-gradient(135deg, #3B82F6, #1D4ED8);">
                <div class="stats-card-content">
                    <div class="stats-big-number">${avgAge}</div>
                    <div class="stats-big-label">Âge moyen</div>
                </div>
            </div>
            <div class="stats-card-large" style="background: linear-gradient(135deg, #16A34A, #15803D);">
                <div class="stats-card-content">
                    <div class="stats-big-number">${completionRate}%</div>
                    <div class="stats-big-label">Taux de complétion</div>
                </div>
            </div>
        </div>

        <div class="stats-info-grid">
            <div class="stats-info-card">
                <div class="stats-info-title">
                    <i class="fas fa-male"></i> Hommes
                </div>
                <div class="stats-info-value">${males}</div>
                <div style="color: var(--gray); font-size: 0.875rem; margin-top: 0.5rem;">
                    ${total > 0 ? Math.round((males / total) * 100) : 0}% de la population
                </div>
            </div>
            <div class="stats-info-card" style="border-left-color: #EC4899;">
                <div class="stats-info-title" style="color: #EC4899;">
                    <i class="fas fa-female"></i> Femmes
                </div>
                <div class="stats-info-value">${females}</div>
                <div style="color: var(--gray); font-size: 0.875rem; margin-top: 0.5rem;">
                    ${total > 0 ? Math.round((females / total) * 100) : 0}% de la population
                </div>
            </div>
            <div class="stats-info-card" style="border-left-color: var(--info);">
                <div class="stats-info-title" style="color: var(--info);">
                    <i class="fas fa-envelope"></i> Emails renseignés
                </div>
                <div class="stats-info-value">${emailCount}</div>
                <div style="color: var(--gray); font-size: 0.875rem; margin-top: 0.5rem;">
                    ${total > 0 ? Math.round((emailCount / total) * 100) : 0}% de couverture
                </div>
            </div>
            <div class="stats-info-card" style="border-left-color: var(--warning);">
                <div class="stats-info-title" style="color: var(--warning);">
                    <i class="fas fa-phone"></i> Téléphones renseignés
                </div>
                <div class="stats-info-value">${phoneCount}</div>
                <div style="color: var(--gray); font-size: 0.875rem; margin-top: 0.5rem;">
                    ${total > 0 ? Math.round((phoneCount / total) * 100) : 0}% de couverture
                </div>
            </div>
        </div>
    `;

    if (members.length > 0) {
        html += `
            <div class="stats-table-wrapper">
                <h3 style="margin-bottom: 1.5rem; color: var(--black); font-weight: 700;">
                    <i class="fas fa-list" style="color: var(--primary-red); margin-right: 0.5rem;"></i>
                    Liste des Membres
                </h3>
                <table class="members-table">
                    <thead>
                        <tr>
                            <th>Nom & Prénom</th>
                            <th>Sexe</th>
                            <th>Email</th>
                            <th>Téléphone</th>
                            <th>Date de Naissance</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        members.forEach(member => {
            let dateNaissance = '';
            if (member.date_naissance) {
                const date = new Date(member.date_naissance);
                dateNaissance = date.toLocaleDateString('fr-FR');
            }
            
            html += `
                <tr>
                    <td><strong>${member.nom} ${member.prenom}</strong></td>
                    <td>
                        <span class="member-badge ${member.sexe.toLowerCase()}">
                            <i class="fas fa-${member.sexe === 'Homme' ? 'male' : 'female'}"></i>
                            ${member.sexe}
                        </span>
                    </td>
                    <td>${member.email || '-'}</td>
                    <td>${member.telephone || '-'}</td>
                    <td>${dateNaissance || '-'}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    container.innerHTML = html;
    container.classList.add('show');
    
    setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// ========================================
// UTILITIES
// ========================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type]}"></i>
        </div>
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
    if (typeof confetti !== 'undefined') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

function logout() {
    confirmLogout();
}

function closeLogoutModal() {
    document.getElementById('logoutModal').classList.remove('show');
}

function confirmLogout() {
    // Fermer le modal
    closeLogoutModal();
    
    // Supprimer les données de session
    window.localStorage.removeItem('mcm_token');
    window.localStorage.removeItem('mcm_user');
    
    // Afficher le toast de déconnexion
    showToast('Déconnexion réussie. À bientôt ! 👋', 'info');
    
    // Rediriger après un court délai
    setTimeout(() => {
        window.location.href = './login.html';
    }, 1000);
}

// ========================================
// RESPONSIVE
// ========================================
window.addEventListener('resize', function() {
    const mobileItems = document.querySelectorAll('.mobile-only');
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger');
    
    if (window.innerWidth > 1024) {
        if (sidebar) sidebar.classList.remove('open');
        if (hamburger) hamburger.classList.remove('active');
        mobileItems.forEach(el => el.style.display = 'none');
    }
});