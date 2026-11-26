const {Resend} = require('resend'); 

const sendEmail = async ({to, subject, text}) => {
    const apiKey = process.env.RESEND_SENDING_API_KEY; 

    if (!apiKey) {
        throw new Error('RESEND_SENDING_API_KEY is not configured'); 
    }

    if (!process.env.EMAIL_FROM) {
        throw new Error('EMAIL_FROM is not configured'); 
    }

    const resend = new Resend(apiKey); 

    const {data, error} = await resend.emails.send({
        from: process.env.EMAIL_FROM, 
        to, 
        subject, 
        text
    }); 

    if (error) {
        throw new Error(error.message); 
    }

    return data;
}; 

module.exports = {sendEmail};