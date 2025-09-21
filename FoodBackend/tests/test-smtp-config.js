import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

async function testSMTPConfig() {
    console.log('🔧 Testing SMTP Configuration...\n');
    
    // Check environment variables
    console.log('Environment Variables:');
    console.log('SMTP_MAIL:', process.env.SMTP_MAIL ? '✅ Set' : '❌ Not set');
    console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '✅ Set' : '❌ Not set');
    console.log('SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com');
    console.log('SMTP_PORT:', process.env.SMTP_PORT || '465');
    
    if (!process.env.SMTP_MAIL || !process.env.SMTP_PASSWORD) {
        console.log('\n❌ SMTP credentials are missing!');
        console.log('Please set SMTP_MAIL and SMTP_PASSWORD in your .env file');
        console.log('\n📝 Steps to fix:');
        console.log('1. Enable 2-Factor Authentication on your Gmail account');
        console.log('2. Generate an App Password from Google Account settings');
        console.log('3. Update your .env file with the credentials');
        return;
    }
    
    // Test transporter creation
    try {
        const transporter = nodemailer.createTransporter({
            service: "gmail",
            secure: true,
            port: process.env.SMTP_PORT || 465,
            auth: {
                user: process.env.SMTP_MAIL,
                pass: process.env.SMTP_PASSWORD
            }
        });
        
        console.log('\n✅ Transporter created successfully');
        
        // Test connection
        console.log('\n🔍 Testing connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully!');
        
        console.log('\n🎉 Your email configuration is working correctly!');
        console.log('You can now restart your application.');
        
    } catch (error) {
        console.log('\n❌ SMTP configuration failed:');
        console.log('Error:', error.message);
        
        if (error.code === 'EAUTH') {
            console.log('\n🔧 This is likely an authentication issue.');
            console.log('Please check:');
            console.log('1. Your Gmail email address is correct');
            console.log('2. You\'re using an App Password (not your regular password)');
            console.log('3. 2-Factor Authentication is enabled on your Gmail account');
        }
    }
}

testSMTPConfig();
