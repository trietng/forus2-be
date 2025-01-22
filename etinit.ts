import { connect } from "mongoose";
import { configDotenv } from 'dotenv';
import fs from 'fs/promises';
import { EmailTemplate, EmailTemplateNames } from "api/models/email-template";

configDotenv();

// MongoDB
connect(process.env.MONGODB_URI);

async function main() {
    // Load email templates
    const resetPasswordTemplate = await fs.readFile('templates/reset_password.hbs', 'utf8');
    const verifyEmailTemplate = await fs.readFile('templates/verify_email.hbs', 'utf8');
    // Save email templates to database
    // TODO: optimize html by minifying it
    await EmailTemplate.create({ name: EmailTemplateNames.ResetPassword, body: resetPasswordTemplate, visibility: false });
    await EmailTemplate.create({ name: EmailTemplateNames.VerifyEmail, body: verifyEmailTemplate, visibility: false });
}

main().then(() => {
    console.log('Email templates loaded successfully');
    process.exit(0);
}).catch((err) => {
    console.error('Failed to load email templates', err);
    process.exit(1);
});