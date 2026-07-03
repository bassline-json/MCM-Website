import { sendEmail } from './emailService.js'

// ========================================
// HELPERS : icônes inline pour les emails
// (les clients mail ne supportent pas FontAwesome via CDN)
// ========================================
const icon = {
    lock:    `<span style="display:inline-block;background:#E60012;color:#fff;border-radius:50%;width:44px;height:44px;line-height:44px;text-align:center;font-size:22px;font-style:normal;">&#128274;</span>`,
    welcome: `<span style="display:inline-block;background:#E60012;color:#fff;border-radius:50%;width:44px;height:44px;line-height:44px;text-align:center;font-size:22px;font-style:normal;">&#10003;</span>`,
    cake:    `<span style="display:inline-block;background:#E60012;color:#fff;border-radius:50%;width:44px;height:44px;line-height:44px;text-align:center;font-size:22px;font-style:normal;">&#9733;</span>`,
    info:    `<span style="display:inline-block;background:#6B7280;color:#fff;border-radius:50%;width:44px;height:44px;line-height:44px;text-align:center;font-size:22px;font-style:normal;">&#8505;</span>`,
    key:     `<span style="display:inline-block;background:#E60012;color:#fff;border-radius:50%;width:32px;height:32px;line-height:32px;text-align:center;font-size:16px;font-style:normal;">&#128273;</span>`,
    check:   `<span style="display:inline-block;background:#16A34A;color:#fff;border-radius:50%;width:28px;height:28px;line-height:28px;text-align:center;font-size:14px;font-style:normal;">&#10003;</span>`,
    warning: `<span style="display:inline-block;background:#F59E0B;color:#fff;border-radius:50%;width:28px;height:28px;line-height:28px;text-align:center;font-size:14px;font-style:normal;">!</span>`,
    users:   `<span style="display:inline-block;background:#E60012;color:#fff;border-radius:50%;width:32px;height:32px;line-height:32px;text-align:center;font-size:16px;font-style:normal;">&#128101;</span>`,
    chart:   `<span style="display:inline-block;background:#E60012;color:#fff;border-radius:50%;width:32px;height:32px;line-height:32px;text-align:center;font-size:16px;font-style:normal;">&#9998;</span>`,
    gear:    `<span style="display:inline-block;background:#E60012;color:#fff;border-radius:50%;width:32px;height:32px;line-height:32px;text-align:center;font-size:16px;font-style:normal;">&#9881;</span>`,
};

const emailWrapper = (headerColor, headerIcon, headerTitle, bodyContent) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${headerTitle}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;color:#1F2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);">
        
        <!-- HEADER -->
        <tr>
          <td style="background:${headerColor};padding:44px 40px;text-align:center;">
            <div style="margin-bottom:18px;">${headerIcon}</div>
            <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.3;">${headerTitle}</h1>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:40px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#F8FAFC;padding:24px 40px;text-align:center;border-top:1px solid #E5E7EB;">
            <p style="margin:0 0 6px;font-size:13px;color:#6B7280;">&copy; 2026 Ministère Catholique Miséricorde &mdash; Tous droits réservés.</p>
            <p style="margin:0;font-size:12px;color:#9CA3AF;">Cet email est automatique, merci de ne pas y répondre directement.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ========================================
// TEMPLATE : Réinitialisation du mot de passe
// ========================================
export const forgotPasswordEmailTemplate = async (email, fullName, url) => {
    const body = `
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#E60012;">Bonjour ${fullName},</h2>
      <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 20px;">
        Nous avons reçu une demande de réinitialisation de votre mot de passe pour votre compte <strong style="color:#E60012;">MCM</strong>.
      </p>
      <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 30px;">
        Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. <strong>Ce lien est valable pendant 10 minutes.</strong>
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:10px 0 30px;">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#E60012,#B8000E);color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:50px;font-weight:700;font-size:16px;letter-spacing:0.3px;box-shadow:0 6px 20px rgba(230,0,18,0.35);">
          Réinitialiser mon mot de passe
        </a>
      </td></tr></table>

      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#FFF8F8;border-left:4px solid #E60012;border-radius:0 10px 10px 0;padding:18px 20px;">
        <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">
          ${icon.warning} <strong style="color:#E60012;"> Attention :</strong> Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe ne sera pas modifié.
        </p>
      </td></tr></table>

      <p style="margin:30px 0 0;color:#374151;font-size:15px;line-height:1.6;">
        Cordialement,<br>
        <strong style="color:#E60012;">L'équipe MCM</strong>
      </p>`;

    await sendEmail({
        to: email,
        subject: 'Réinitialisation de votre mot de passe — MCM',
        text: `Bonjour ${fullName}, cliquez sur ce lien pour réinitialiser votre mot de passe (valable 10 min) : ${url}`,
        html: emailWrapper('linear-gradient(135deg,#E60012,#B8000E)', icon.lock, 'Réinitialisation du mot de passe', body)
    });
};

// ========================================
// TEMPLATE : Anniversaire
// ========================================
export const birthdayFunction = async (email, fullName) => {
    const body = `
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#E60012;text-align:center;">
        Cher(e) ${fullName},
      </h2>
      <p style="font-size:16px;line-height:1.8;color:#374151;text-align:center;margin:0 0 28px;">
        Toute l'équipe <strong style="color:#E60012;">MCM</strong> se joint pour vous souhaiter un <strong>fabuleux anniversaire</strong> !
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,rgba(230,0,18,0.05),rgba(184,0,14,0.05));border-radius:14px;padding:28px;text-align:center;margin-bottom:28px;">
        <p style="font-size:18px;line-height:1.9;color:#1F2937;margin:0;">
          Que cette journée soit remplie de<br>
          <strong style="color:#E60012;">joie</strong>, de <strong style="color:#E60012;">succès</strong> et de <strong style="color:#E60012;">moments inoubliables</strong>.
        </p>
      </td></tr></table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr>
          <td style="background:#FFF0F0;border-radius:12px;padding:18px;text-align:center;width:30%;">
            <div style="font-size:28px;margin-bottom:6px;color:#E60012;">&#9829;</div>
            <div style="font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Bonheur</div>
          </td>
          <td style="width:4%;"></td>
          <td style="background:#FFF8E1;border-radius:12px;padding:18px;text-align:center;width:30%;">
            <div style="font-size:28px;margin-bottom:6px;color:#F59E0B;">&#9733;</div>
            <div style="font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Réussite</div>
          </td>
          <td style="width:4%;"></td>
          <td style="background:#E0F7FA;border-radius:12px;padding:18px;text-align:center;width:30%;">
            <div style="font-size:28px;margin-bottom:6px;color:#0891B2;">&#9679;</div>
            <div style="font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Santé</div>
          </td>
        </tr>
      </table>

      <p style="font-size:15px;line-height:1.7;color:#6B7280;text-align:center;margin:24px 0;">
        Vous êtes un membre précieux de la famille MCM.<br>
        Merci pour votre implication et votre engagement quotidien.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:10px 0 0;">
        <p style="margin:0;color:#E60012;font-weight:700;font-size:16px;">L'équipe MCM</p>
        <p style="margin:6px 0 0;font-size:14px;color:#6B7280;font-style:italic;">"Merci de faire partie de notre aventure !"</p>
      </td></tr></table>`;

    await sendEmail({
        to: email,
        subject: `Joyeux Anniversaire, ${fullName} ! — L'équipe MCM`,
        text: `Joyeux anniversaire ${fullName} ! Toute l'équipe MCM vous souhaite une journée remplie de joie et de succès !`,
        html: emailWrapper('linear-gradient(135deg,#E60012,#B8000E)', icon.cake, `Joyeux Anniversaire, ${fullName.split(' ')[0]} !`, body)
    });
};

// ========================================
// TEMPLATE : Création de compte
// ========================================
export const accountCreatedEmailTemplate = async (email, fullName, role, commissionNom = null, serviceNom = null) => {
    const roleNames = {
        'admin': 'Chargé de Service',
        'adminCom': 'Administrateur de Commission',
        'superadmin': 'Super Administrateur'
    };
    const roleLabel = roleNames[role] || role;

    const postDetails = (commissionNom || serviceNom) ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="background:#F8FAFC;border-radius:12px;padding:22px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#1F2937;text-transform:uppercase;letter-spacing:0.5px;">Votre affectation</p>
        ${commissionNom ? `<p style="margin:0 0 8px;font-size:15px;color:#374151;">${icon.check} <strong>Commission :</strong> ${commissionNom}</p>` : ''}
        ${serviceNom ? `<p style="margin:0;font-size:15px;color:#374151;">${icon.check} <strong>Service :</strong> ${serviceNom}</p>` : ''}
      </td></tr></table>` : '';

    const body = `
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#E60012;">Bienvenue, ${fullName} !</h2>
      <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px;">
        Votre compte <strong style="color:#E60012;">${roleLabel}</strong> a été créé avec succès sur la plateforme MCM. Nous sommes ravis de vous accueillir parmi nous.
      </p>
      ${postDetails}

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="background:#F8FAFC;border-left:4px solid #E60012;border-radius:0 12px 12px 0;padding:20px;">
        <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#1F2937;">
          ${icon.check} Connexion à votre espace
        </p>
        <p style="margin:0 0 8px;font-size:15px;color:#374151;"><strong>Email :</strong> ${email}</p>
        <p style="margin:0;font-size:14px;color:#6B7280;font-style:italic;">Utilisez le mot de passe que vous avez choisi lors de votre inscription.</p>
      </td></tr></table>

      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#F0FFF4;border-radius:12px;padding:20px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#1F2937;">Prochaines étapes :</p>
        <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">${icon.check} Connectez-vous à votre espace de travail</p>
        <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">${icon.check} Complétez et vérifiez votre profil</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${icon.check} Explorez vos fonctionnalités</p>
      </td></tr></table>

      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 0 10px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/templates/login.html" style="display:inline-block;background:linear-gradient(135deg,#E60012,#B8000E);color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:50px;font-weight:700;font-size:16px;box-shadow:0 6px 20px rgba(230,0,18,0.35);">
          Accéder à mon espace
        </a>
      </td></tr></table>

      <p style="margin:10px 0 0;color:#374151;font-size:15px;">
        Excellente journée,<br>
        <strong style="color:#E60012;">L'équipe MCM</strong>
      </p>`;

    await sendEmail({
        to: email,
        subject: `Bienvenue sur MCM — Votre compte ${roleLabel} est activé`,
        text: `Bonjour ${fullName}, votre compte ${roleLabel} a été créé sur la plateforme MCM. Email : ${email}.`,
        html: emailWrapper('linear-gradient(135deg,#E60012,#B8000E)', icon.welcome, `Bienvenue sur MCM, ${fullName.split(' ')[0]} !`, body)
    });
};

// ========================================
// TEMPLATE : Suppression de compte
// ========================================
export const accountDeletedEmailTemplate = async (email, fullName, role) => {
    const roleNames = {
        'admin': 'Chargé de Service',
        'adminCom': 'Administrateur de Commission',
        'superadmin': 'Super Administrateur'
    };

    const body = `
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#374151;">Bonjour ${fullName},</h2>
      <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 20px;">
        Nous vous informons que votre compte <strong>${roleNames[role] || role}</strong> a été supprimé de la plateforme MCM.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#FFF8F8;border-left:4px solid #E60012;border-radius:0 10px 10px 0;padding:18px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">
          ${icon.warning} <strong style="color:#E60012;"> Important :</strong> Vous n'avez plus accès à la plateforme MCM avec cet identifiant (${email}).
        </p>
      </td></tr></table>

      <p style="font-size:15px;line-height:1.7;color:#374151;margin:20px 0;">
        Si vous pensez qu'il s'agit d'une erreur ou si vous avez des questions, veuillez contacter un administrateur.
      </p>

      <p style="margin:20px 0 0;color:#374151;font-size:15px;">
        Cordialement,<br>
        <strong style="color:#E60012;">L'équipe MCM</strong>
      </p>`;

    await sendEmail({
        to: email,
        subject: 'Suppression de votre compte MCM',
        text: `Bonjour ${fullName}, votre compte ${roleNames[role] || role} a été supprimé de la plateforme MCM.`,
        html: emailWrapper('linear-gradient(135deg,#6B7280,#374151)', icon.info, 'Suppression de compte', body)
    });
};

// ========================================
// TEMPLATE : Bienvenue 1er login
// ========================================
export const welcomeFirstLoginEmailTemplate = async (email, fullName, role) => {
    const roleNames = {
        'admin': 'Chargé de Service',
        'adminCom': 'Administrateur de Commission',
        'superadmin': 'Super Administrateur'
    };

    const body = `
      <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 20px;">
        Nous sommes ravis de vous accueillir en tant que <strong style="color:#E60012;">${roleNames[role] || role}</strong> sur la plateforme MCM.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background:linear-gradient(135deg,rgba(230,0,18,0.05),rgba(184,0,14,0.05));border-radius:14px;padding:24px;">
        <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#E60012;text-align:center;">Vos fonctionnalités principales</p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;display:flex;align-items:flex-start;gap:10px;">
          ${icon.users} &nbsp;<span><strong>Gestion des membres</strong><br><span style="color:#6B7280;font-size:14px;">Ajoutez, modifiez et gérez vos membres</span></span>
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;">
          ${icon.chart} &nbsp;<strong>Statistiques détaillées</strong><br><span style="color:#6B7280;font-size:14px;margin-left:36px;display:block;">Analysez les données de votre service</span>
        </p>
        <p style="margin:0;font-size:15px;color:#374151;">
          ${icon.gear} &nbsp;<strong>Configuration avancée</strong><br><span style="color:#6B7280;font-size:14px;margin-left:36px;display:block;">Personnalisez votre espace de travail</span>
        </p>
      </td></tr></table>

      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#F0FFF4;border-left:4px solid #16A34A;border-radius:0 12px 12px 0;padding:18px 20px;">
        <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#1F2937;">
          ${icon.check} Conseil de démarrage :
        </p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
          Commencez par explorer votre tableau de bord et familiarisez-vous avec les différentes sections disponibles.
        </p>
      </td></tr></table>

      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 0 10px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/templates/login.html" style="display:inline-block;background:linear-gradient(135deg,#E60012,#B8000E);color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:50px;font-weight:700;font-size:16px;box-shadow:0 6px 20px rgba(230,0,18,0.35);">
          Accéder à mon espace
        </a>
      </td></tr></table>

      <p style="margin:10px 0 0;color:#374151;font-size:15px;text-align:center;">
        Excellente journée,<br>
        <strong style="color:#E60012;">L'équipe MCM</strong>
      </p>`;

    await sendEmail({
        to: email,
        subject: `Bienvenue dans votre espace MCM, ${fullName.split(' ')[0]} !`,
        text: `Bonjour ${fullName}, bienvenue dans votre espace ${roleNames[role] || role} MCM !`,
        html: emailWrapper('linear-gradient(135deg,#E60012,#B8000E)', icon.welcome, `Votre aventure MCM commence !`, body)
    });
};