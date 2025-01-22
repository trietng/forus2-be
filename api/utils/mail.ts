import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
        user: "trietnguyen0781@gmail.com",
        pass: "xsmtpsib-056f3abbebf35242884ca4fa72d121335d15db2eb8b591d92fb05a6c4f12aaa4-wRBfh5jTVWUyH1v0"
    }
});