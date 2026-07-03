const API_BASE = '/api';
const MEMBERS_PER_PAGE = 10;

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
            if (!this.wrapper.contains(e.target)) {
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
// 🎯 APPLICATION PRINCIPALE
// ========================================
const app = {
    token: window.localStorage.getItem('mcm_token'),
    user: null,
    members: [],
    filtered: [],
    selected: [],
    page: 1,
    customSelects: [],
    birthdayNotificationShown: false,

    async init() {
        if (!this.token) {
            window.location.href = './login.html';
            return;
        }

        await this.loadUser();
        await this.loadMembers();
        this.setupEvents();
        this.showWelcome();
        this.initializeCustomSelects();
        this.checkBirthdays();
        
        // Initialisation WebSocket
        if (typeof io !== 'undefined') {
            const socket = io();
            socket.on('member:created', () => { this.loadMembers(); });
            socket.on('member:updated', () => { this.loadMembers(); });
            socket.on('member:deleted', () => { this.loadMembers(); });
            // Although Admin only manages members, they might see services or commissions depending on UI
            // It's safe to refresh members if a service/commission changes that affects them
            socket.on('commission:updated', () => { this.loadMembers(); });
            socket.on('service:updated', () => { this.loadMembers(); });
        }
    },

    initializeCustomSelects() {
        document.querySelectorAll('.form-select').forEach(select => {
            const customSelect = new CustomSelect(select);
            this.customSelects.push(customSelect);
        });
    },

    async loadUser() {
        try {
            // Toujours récupérer les données fraîches depuis la base de données
            const response = await fetch(`${API_BASE}/users/me`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.status === 401) {
                window.localStorage.removeItem('mcm_token');
                window.localStorage.removeItem('mcm_user');
                window.location.href = './login.html';
                return;
            }

            if (response.ok) {
                const userData = await response.json();
                this.user = {
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
                window.localStorage.setItem('mcm_user', JSON.stringify(this.user));
            } else {
                // Fallback localStorage
                const data = window.localStorage.getItem('mcm_user');
                this.user = data ? JSON.parse(data) : { nom: '', prenom: '', email: 'admin@mcm.com', service_id: 1 };
            }

            const initials = (this.user.prenom?.charAt(0) || '') + (this.user.nom?.charAt(0) || '');
            document.getElementById('userAvatar').textContent = initials.toUpperCase() || 'AU';
            document.getElementById('userName').textContent = `${this.user.prenom} ${this.user.nom}`.trim();
            
            document.getElementById('profNom').value = this.user.nom || '';
            document.getElementById('profPrenom').value = this.user.prenom || '';
            document.getElementById('profEmail').value = this.user.email || '';
        } catch (e) {
            console.error('Erreur profil:', e);
            // Fallback localStorage en cas d'erreur réseau
            const data = window.localStorage.getItem('mcm_user');
            this.user = data ? JSON.parse(data) : { nom: '', prenom: '', email: 'admin@mcm.com', service_id: 1 };
            const initials = (this.user.prenom?.charAt(0) || '') + (this.user.nom?.charAt(0) || '');
            document.getElementById('userAvatar').textContent = initials.toUpperCase() || 'AU';
            document.getElementById('userName').textContent = `${this.user.prenom} ${this.user.nom}`.trim();
        }
    },

    async loadMembers() {
        try {
            const res = await fetch(`${API_BASE}/membres`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (res.status === 401) {
                window.localStorage.removeItem('mcm_token');
                window.location.href = './login.html';
                return;
            }

            this.members = await res.json() || [];
            this.filtered = [...this.members];
            this.updateStats();
            this.renderMembers();
        } catch (e) {
            this.toast('Erreur chargement', 'error');
        }
    },

    updateStats() {
        const total = this.members.length;
        const males = this.members.filter(m => m.sexe === 'Homme').length;
        const females = total - males;
        
        const now = new Date();
        const thisMonth = this.members.filter(m => {
            const d = new Date(m.created_at || m.date_naissance);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;

        document.getElementById('totalMembers').textContent = total;
        document.getElementById('maleCount').textContent = males;
        document.getElementById('femaleCount').textContent = females;
        document.getElementById('thisMonth').textContent = thisMonth;

        document.getElementById('reportTotal').textContent = total;
        document.getElementById('reportMale').textContent = total > 0 ? Math.round((males / total) * 100) + '%' : '0%';
        document.getElementById('reportFemale').textContent = total > 0 ? Math.round((females / total) * 100) + '%' : '0%';

        const avgAge = total > 0 ? Math.round(this.members.reduce((sum, m) => {
            if (!m.date_naissance) return sum;
            const age = new Date().getFullYear() - new Date(m.date_naissance).getFullYear();
            return sum + age;
        }, 0) / total) : 0;
        document.getElementById('reportAge').textContent = avgAge;

        const emails = this.members.filter(m => m.email).length;
        const phones = this.members.filter(m => m.telephone).length;
        const completion = total > 0 ? Math.round(((emails + phones) / (total * 2)) * 100) : 0;

        document.getElementById('emailCount').textContent = emails;
        document.getElementById('phoneCount').textContent = phones;
        document.getElementById('completionRate').textContent = completion + '%';
    },

    // ========================================
    // 🎂 NOTIFICATION ANNIVERSAIRES
    // ========================================
    checkBirthdays() {
        const now = new Date();
        
        // Anniversaires aujourd'hui
        const todayBirthdays = this.members.filter(m => {
            if (!m.date_naissance) return false;
            const d = new Date(m.date_naissance);
            return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
        });

        // Afficher notification pour les anniversaires d'aujourd'hui
        if (todayBirthdays.length > 0 && !this.birthdayNotificationShown) {
            this.birthdayNotificationShown = true;
            
            todayBirthdays.forEach(m => {
                const age = now.getFullYear() - new Date(m.date_naissance).getFullYear();
                this.showBirthdayNotification(m, age);
            });
        }

        // Afficher les anniversaires à venir (30 jours)
        const bdays = this.members.filter(m => {
            if (!m.date_naissance) return false;
            const d = new Date(m.date_naissance);
            let next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
            if (next < now) next.setFullYear(now.getFullYear() + 1);
            const days = Math.floor((next - now) / (1000 * 60 * 60 * 24));
            return days >= 0 && days <= 30;
        }).sort((a, b) => {
            const da = new Date(a.date_naissance);
            const db = new Date(b.date_naissance);
            return da.getMonth() - db.getMonth() || da.getDate() - db.getDate();
        });

        const div = document.getElementById('birthdaysDiv');
        if (bdays.length === 0) {
            div.innerHTML = '<p style="color: var(--gray); grid-column: 1/-1; text-align: center;">Aucun anniversaire ce mois</p>';
        } else {
            div.innerHTML = bdays.map(m => {
                const d = new Date(m.date_naissance);
                const age = now.getFullYear() - d.getFullYear();
                const dateStr = d.toLocaleDateString('fr-FR', {month: 'long', day: 'numeric'});
                const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
                
                return `<div class="birthday-card" style="${isToday ? 'background: rgba(245, 158, 11, 0.2); border-left-color: var(--warning); border-left-width: 6px;' : ''}">
                    <strong><i class="fas fa-birthday-cake" style="color:var(--warning);margin-right:6px;"></i>${m.prenom} ${m.nom} ${isToday ? '(AUJOURD\'HUI!)' : ''}</strong>
                    <div class="birthday-date">${dateStr} - ${age} ans</div>
                </div>`;
            }).join('');
        }
    },

    showBirthdayNotification(member, age) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content confirm-modal-content">
                <div class="confirm-modal-body">
                    <div class="confirm-modal-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning); font-size: 3rem; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-birthday-cake"></i>
                    </div>
                    <h3>Joyeux Anniversaire!</h3>
                    <p style="font-size: 1.125rem; margin-bottom: 1rem;">
                        <strong>${member.prenom} ${member.nom}</strong> fête ses <strong>${age} ans</strong> aujourd'hui!
                    </p>
                    <p>N'oubliez pas de lui souhaiter un bon anniversaire ! <i class="fas fa-birthday-cake" style="color:var(--warning);"></i></p>
                    <div class="confirm-modal-buttons" style="margin-top: 2rem;">
                        <button class="btn-confirm" onclick="this.closest('.modal').remove(); app.confetti();">
                            <i class="fas fa-check"></i> Super!
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Confetti automatique
        setTimeout(() => this.confetti(), 500);
    },

    renderMembers() {
        const start = (this.page - 1) * MEMBERS_PER_PAGE;
        const page = this.filtered.slice(start, start + MEMBERS_PER_PAGE);

        let bulk = '';
        if (this.selected.length) {
            bulk = `<div class="bulk-actions">
                <span class="bulk-actions-text">
                    <i class="fas fa-check-circle"></i> ${this.selected.length} sélectionné(s)
                </span>
                <button type="button" class="btn-primary btn-danger" style="width: 200px;" onclick="app.confirmDeleteSelected()">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>`;
        }
        document.getElementById('bulkActionsDiv').innerHTML = bulk;

        let html = `<table class="members-table">
            <thead>
                <tr>
                    <th style="width: 30px;">
                        <input type="checkbox" id="checkAll" onchange="app.toggleAll()">
                    </th>
                    <th>Nom</th>
                    <th>Sexe</th>
                    <th>Naissance</th>
                    <th>Contact</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>`;
        
        page.forEach(m => {
            const sel = this.selected.includes(m.id);
            html += `<tr>
                <td><input type="checkbox" ${sel ? 'checked' : ''} onchange="app.toggleMember(${m.id})"></td>
                <td><strong>${m.nom} ${m.prenom}</strong></td>
                <td>
                    <span class="member-badge ${m.sexe.toLowerCase()}">
                        <i class="fas fa-${m.sexe === 'Homme' ? 'male' : 'female'}"></i>
                        ${m.sexe}
                    </span>
                </td>
                <td>${this.formatDate(m.date_naissance)}</td>
                <td>
                    <div style="font-size:0.875rem;">
                        <div><i class="fas fa-envelope" style="color: var(--primary-red); width: 16px;"></i> ${m.email || '-'}</div>
                        <div><i class="fas fa-phone" style="color: var(--primary-red); width: 16px;"></i> ${m.telephone || '-'}</div>
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="app.editMember(${m.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="app.confirmDeleteMember(${m.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        document.getElementById('membersDiv').innerHTML = html;

        this.renderPagination();
        this.updateCheckAll();
    },

    renderPagination() {
        const total = Math.ceil(this.filtered.length / MEMBERS_PER_PAGE);
        let html = `<button onclick="app.setPage(${this.page - 1})" ${this.page === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>`;
        
        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || (i >= this.page - 1 && i <= this.page + 1)) {
                html += `<button onclick="app.setPage(${i})" ${i === this.page ? 'class="active"' : ''}>
                    ${i}
                </button>`;
            } else if (i === this.page - 2 || i === this.page + 2) {
                html += '<span style="padding: 0.5rem;">...</span>';
            }
        }
        
        html += `<button onclick="app.setPage(${this.page + 1})" ${this.page === total ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>`;
        
        document.getElementById('paginationDiv').innerHTML = html;
    },

    updateCheckAll() {
        const start = (this.page - 1) * MEMBERS_PER_PAGE;
        const page = this.filtered.slice(start, start + MEMBERS_PER_PAGE);
        const checkAll = document.getElementById('checkAll');
        if (checkAll) checkAll.checked = page.length > 0 && page.every(m => this.selected.includes(m.id));
    },

    toggleAll() {
        const start = (this.page - 1) * MEMBERS_PER_PAGE;
        const page = this.filtered.slice(start, start + MEMBERS_PER_PAGE);
        const checked = document.getElementById('checkAll').checked;
        page.forEach(m => {
            const idx = this.selected.indexOf(m.id);
            if (checked && idx === -1) this.selected.push(m.id);
            if (!checked && idx !== -1) this.selected.splice(idx, 1);
        });
        this.renderMembers();
    },

    toggleMember(id) {
        const idx = this.selected.indexOf(id);
        if (idx === -1) this.selected.push(id);
        else this.selected.splice(idx, 1);
        this.renderMembers();
    },

    filterMembers() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        this.filtered = this.members.filter(m => 
            `${m.nom} ${m.prenom}`.toLowerCase().includes(search) || 
            (m.email || '').toLowerCase().includes(search)
        );
        this.page = 1;
        this.selected = [];
        this.renderMembers();
    },

    formatDate(d) {
        return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    },

    setPage(p) {
        const max = Math.ceil(this.filtered.length / MEMBERS_PER_PAGE);
        if (p < 1 || p > max) return;
        this.page = p;
        this.renderMembers();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    showSection(name) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        document.getElementById(name + 'Section').classList.add('active');
        if (event && event.currentTarget) event.currentTarget.classList.add('active');
        if (window.innerWidth <= 1024) this.toggleSidebar();
    },

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburger');
        sidebar.classList.toggle('open');
        hamburger.classList.toggle('active');
    },

    showWelcome() {
        const msgs = [
        
            { title: "Excellente journée ! 🌟", sub: "Prêt à gérer votre service ?" },
            { title: "Bienvenue ! 👋", sub: "Continuez votre excellent travail" },
            { title: "Ravi de vous revoir ! 😊", sub: "Gérez vos membres efficacement" },
            { title: "Bonjour Admin ! ✨", sub: "Votre service compte sur vous" },
            { title: "Bon retour ! ⚙️", sub: "Tout est prêt pour une journée productive" },
            { title: "Motivé(e) comme toujours ! 💪", sub: "Les membres de votre service vous attendent" },
            { title: "En avant ! 🚀", sub: "Vos actions font grandir l’équipe" },
            { title: "De retour au contrôle ! 🎯", sub: "Administrez vos ressources avec succès" },
            { title: "Bonjour à vous ! 🌞", sub: "Faites rayonner votre service aujourd’hui" },
            { title: "Bonne énergie ! ⚡", sub: "Dirigez votre service avec efficacité" },
            { title: "Heureux de vous revoir ! 👏", sub: "Vos compétences font la différence" },
            { title: "Un nouveau jour, de nouveaux défis ! 🎉", sub: "Montrez votre savoir-faire" },
            { title: "Bienvenue dans votre espace ! 🏢", sub: "Tout est prêt pour vos prochaines décisions" },
            { title: "Gestion exemplaire ! 🧩", sub: "Vos actions font avancer MCM" },
            { title: "L’équipe compte sur vous ! 🤝", sub: "Montrez votre leadership" },
            { title: "Belle journée de travail ! ☀️", sub: "Continuez à faire briller votre service" },
            { title: "Bonjour, responsable engagé ! 🕴️", sub: "Vos décisions comptent chaque jour" },
            { title: "Toujours présent au poste ! 🧭", sub: "Coordonnez votre équipe avec succès" },
            { title: "Bon début de session ! 🖥️", sub: "Le service est entre de bonnes mains" },
            { title: "Objectif réussite ! 🏆", sub: "Administrez avec passion et précision" }

        ];
        const m = msgs[Math.floor(Math.random() * msgs.length)];
        document.getElementById('welcomeMessage').textContent = m.title;
        document.getElementById('welcomeSubtext').textContent = m.sub;
    },

    // ========================================
    // 📝 AJOUTER MEMBRE
    // ========================================
    async addMember(e) {
    e.preventDefault();

    const data = {
        nom: document.getElementById('addNom').value,
        prenom: document.getElementById('addPrenom').value,
        sexe: document.getElementById('addSexe').value,
        date_naissance: document.getElementById('addDateNaissance').value,
        email: document.getElementById('addEmail').value,
        telephone: document.getElementById('addTelephone').value,
        service_id: this.user.service_id || 1
    };

    try {
        const res = await fetch(`${API_BASE}/membres`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            document.getElementById('addMemberForm').reset();

            // Rafraîchir les custom selects
            this.customSelects.forEach(cs => cs.refresh());

            this.toast('Membre ajouté avec succès!', 'success');
            this.confetti();
            await this.loadMembers();
        } else {
            const err = await res.json();
            this.toast('Erreur: ' + (err.error || 'Erreur inconnue'), 'error');
        }
    } catch (e) {
        this.toast('Erreur de connexion', 'error');
    }
}
,

    // ========================================
    // ✏️ MODIFIER MEMBRE
    // ========================================
    async updateMember(e) {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const data = {
            nom: document.getElementById('editNom').value,
            prenom: document.getElementById('editPrenom').value,
            sexe: document.getElementById('editSexe').value,
            date_naissance: document.getElementById('editDateNaissance').value,
            email: document.getElementById('editEmail').value,
            telephone: document.getElementById('editTelephone').value,
            service_id: this.user.service_id || 1
        };

        try {
            const res = await fetch(`${API_BASE}/membres/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                this.toast('Membre modifié avec succès!', 'success');
                this.confetti();
                this.closeModal('editModal');
                await this.loadMembers();
            } else {
                this.toast('Erreur modification', 'error');
            }
        } catch (e) {
            this.toast('Erreur de connexion', 'error');
        }
    },

    async updateProfile(e) {
        e.preventDefault();
        const data = {
            nom: document.getElementById('profNom').value.trim(),
            prenom: document.getElementById('profPrenom').value.trim(),
            email: document.getElementById('profEmail').value.trim()
        };
        const pwd = document.getElementById('profPassword').value;
        if (pwd) data.mot_de_passe = pwd;

        try {
            const res = await fetch(`${API_BASE}/users/profile`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const result = await res.json();
                // Utiliser les données confirmées par le serveur
                const updatedUser = result.user || {};
                this.user = { 
                    ...this.user, 
                    nom: updatedUser.nom || data.nom,
                    prenom: updatedUser.prenom || data.prenom,
                    email: updatedUser.email || data.email
                };
                window.localStorage.setItem('mcm_user', JSON.stringify(this.user));
                if (result.token) {
                    window.localStorage.setItem('mcm_token', result.token);
                    this.token = result.token;
                }
                await this.loadUser();
                this.toast('Profil mis à jour avec succès!', 'success');
                this.confetti();
                this.closeModal('profileModal');
            } else {
                const err = await res.json();
                this.toast('Erreur: ' + (err.error || 'Erreur inconnue'), 'error');
            }
        } catch (e) {
            console.error('Erreur updateProfile:', e);
            this.toast('Erreur de mise à jour', 'error');
        }
    },

    // ========================================
    // ⚠️ MODALES DE CONFIRMATION
    // ========================================
    showConfirmModal(type, title, message, onConfirm) {
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
            if (e.target === modal) {
                modal.remove();
            }
        });
    },

    confirmDeleteMember(id) {
        const member = this.members.find(m => m.id === id);
        this.showConfirmModal(
            'danger',
            'Supprimer ce membre',
            `Êtes-vous sûr de vouloir supprimer <strong>${member.prenom} ${member.nom}</strong> ? Cette action est irréversible.`,
            () => this.deleteMember(id)
        );
    },

    async deleteMember(id) {
        try {
            const res = await fetch(`${API_BASE}/membres/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (res.ok) {
                this.toast('Membre supprimé avec succès!', 'success');
                this.confetti();
                await this.loadMembers();
            }
        } catch (e) {
            this.toast('Erreur de suppression', 'error');
        }
    },

    confirmDeleteSelected() {
        this.showConfirmModal(
            'danger',
            'Supprimer les membres sélectionnés',
            `Êtes-vous sûr de vouloir supprimer <strong>${this.selected.length} membre(s)</strong> ? Cette action est irréversible.`,
            () => this.deleteSelected()
        );
    },

    async deleteSelected() {
        try {
            for (const id of this.selected) {
                await fetch(`${API_BASE}/membres/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
            }
            this.toast(`${this.selected.length} membre(s) supprimé(s)!`, 'success');
            this.confetti();
            this.selected = [];
            await this.loadMembers();
        } catch (e) {
            this.toast('Erreur de suppression', 'error');
        }
    },

    editMember(id) {
        const m = this.members.find(x => x.id === id);
        if (!m) return;
        document.getElementById('editId').value = m.id;
        document.getElementById('editNom').value = m.nom;
        document.getElementById('editPrenom').value = m.prenom;
        document.getElementById('editSexe').value = m.sexe;
        document.getElementById('editDateNaissance').value = m.date_naissance.split('T')[0];
        document.getElementById('editEmail').value = m.email || '';
        document.getElementById('editTelephone').value = m.telephone || '';
        this.openModal('editModal');
        
        // Rafraîchir le custom select du sexe dans la modal
        setTimeout(() => {
            this.customSelects.forEach(cs => cs.refresh());
        }, 100);
    },

    openProfileModal() {
        this.openModal('profileModal');
    },

    openModal(name) {
        document.getElementById(name).classList.add('show');
    },

    closeModal(name) {
        document.getElementById(name).classList.remove('show');
    },

    // ========================================
    // 🚪 DÉCONNEXION
    // ========================================
    logout() {
        window.localStorage.removeItem('mcm_token');
        window.localStorage.removeItem('mcm_user');
        this.toast('Déconnexion réussie', 'info');
        setTimeout(() => window.location.href = './login.html', 1000);
    },

    toast(msg, type) {
        const div = document.createElement('div');
        div.className = `toast ${type}`;
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        div.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${icons[type]}"></i>
            </div>
            <div class="toast-message">${msg}</div>
        `;
        document.getElementById('toastContainer').appendChild(div);
        setTimeout(() => div.remove(), 4000);
    },

    confetti() {
        if (typeof confetti !== 'undefined') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
    },

    setupEvents() {
        document.getElementById('hamburger').addEventListener('click', () => this.toggleSidebar());
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 1024) {
                document.getElementById('sidebar').classList.remove('open');
                document.getElementById('hamburger').classList.remove('active');
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());