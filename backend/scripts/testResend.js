require('dotenv').config({
    path: require('path').join(__dirname, '../.env')
}); 

const { Resend } = require('resend'); 

async function testEmail() {
    try {
        const apiKey = process.env.RESEND_SENDING_API_KEY; 

        if (!apiKey) {
            throw new Error('RESEND_SENDING_API_KEY is missing'); 
        }

        const resend = new Resend(apiKey); 

        const {data, error} = await resend.emails.send({
            from: process.env.EMAIL_FROM,
            to: 'alexiscameronfl4@gmail.com', // put your email here
            subject: 'Internship Tracker - Email Test', 
            text: 'This is a test email from Internship Tracker!'
        }); 

        if (error) {
            throw new Error(error.message); 
        }

        console.log('Email accepted by Resend:', data); 
    } catch (error) {
        console.error('Failed to send email:', error.message); 
        process.exitCode = 1; 
    }
}

testEmail(); 