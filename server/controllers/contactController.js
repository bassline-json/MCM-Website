import { sendEmail } from '../utils/emailService.js';

export const submitContactForm = async (req, res) => {
    try {
        const { nom, email, sujet, message } = req.body;

        if (!nom || !email || !sujet || !message) {
            return res.status(400).json({ error: 'Tous les champs sont requis.' });
        }

        // Création du contenu de l'email
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #E60012; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">Nouveau message de contact - MCM</h2>
                </div>
                <div style="padding: 20px; color: #333;">
                    <p style="font-size: 16px;">Vous avez reçu un nouveau message depuis le formulaire de contact du site web.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; width: 100px;"><strong>Nom :</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${nom}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email :</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                <a href="mailto:${email}" style="color: #E60012;">${email}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Sujet :</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${sujet}</td>
                        </tr>
                    </table>
                    
                    <h3 style="margin-top: 30px; color: #E60012;">Message :</h3>
                    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #E60012; border-radius: 4px; white-space: pre-wrap;">${message}</div>
                </div>
                <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                    Ce message a été envoyé depuis le formulaire de la section "Contact" de la page d'accueil MCM.
                </div>
            </div>
        `;

        // L'adresse de destination est celle configurée en SMTP_USER ou une adresse spécifique
        const adminEmail = process.env.SMTP_USER || 'contact@mcm-benin.org';

        await sendEmail({
            to: adminEmail,
            subject: `Nouveau message depuis le site (Sujet: ${sujet})`,
            html: emailHtml,
            text: `Nouveau message de ${nom} (${email})\n\nSujet: ${sujet}\n\nMessage:\n${message}`
        });

        res.status(200).json({ success: true, message: 'Message envoyé avec succès.' });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message de contact:', error);
        res.status(500).json({ error: 'Une erreur est survenue lors de l\'envoi du message.' });
    }
};
