import Handlebars from "handlebars";
import { EmailTemplate, EmailTemplateNames } from "api/models/email-template";
import { mailer } from "api/utils/mail";

export class EmailService {
    private static async sendEmail(address: string, subject: string, html: string) {
        console.log(process.env.EMAIL_USERNAME);
        console.log(process.env.EMAIL_PASSWORD);
        console.log(process.env.EMAIL_HOST);
        console.log(process.env.EMAIL_PORT);
        await mailer.sendMail({
            from: '"ForUS" <no-reply@forus.trietng.ovh>',
            to: address,
            subject: subject,
            html: html
        });
    }

    static async sendVerificationEmail(address: string, token: string) {
        const template = await EmailTemplate.findOne({ name: EmailTemplateNames.VerifyEmail, visibility: false });
        const compiledTemplate = Handlebars.compile(template.body);
        const verify_email_link = `${process.env.FRONTEND_URL}/email_verified?token=${token}`;
        const html = compiledTemplate({ verify_email_link });
        await EmailService.sendEmail(address, `ForUS - ${template.name}`, html);
    }

    static async sendPasswordResetEmail(address: string, token: string) {
        const template = await EmailTemplate.findOne({ name: EmailTemplateNames.ResetPassword, visibility: false });
        const compiledTemplate = Handlebars.compile(template.body);
        const reset_password_link = `${process.env.FRONTEND_URL}/reset_password?token=${token}`;
        const html = compiledTemplate({ reset_password_link });
        await EmailService.sendEmail(address, `ForUS - ${template.name}`, html);
    }
}