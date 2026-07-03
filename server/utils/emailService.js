import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: '.env' });

export const sendEmail = async ({ to, subject, text, html }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: Number(process.env.SMTP_PORT) === 465 ? true : false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            },
            connectionTimeout: 20000
        });

        const info = await transporter.sendMail({
            from: `"MCM" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html,
        });

        console.log("email succeeded:::", info.messageId);
        return info;
    } catch (error) {
        console.error("email failed:::", error);
    }
};