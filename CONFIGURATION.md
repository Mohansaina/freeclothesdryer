# EmailJS Configuration Guide

## Your Current Configuration

You've provided all required EmailJS credentials:
- Service ID: `service_ztazydt`
- Template ID: `template_it9yecl`
- Public Key: `_GGIh5ZD8runMLMk0`
- Email: `ruttalamohan23@gmail.com`

## All Configuration Complete

✅ All EmailJS credentials have been configured!
✅ The application is now ready to send email notifications.

## Testing Email Notifications

To test if email notifications are working:

1. Open the application in your browser
2. Subscribe with your email (ruttalamohan23@gmail.com)
3. If rain is expected in your area, you should receive an email notification
4. Check your spam/junk folder if you don't see the email in your inbox

## How the Email System Works

The application will:
- Send email alerts to the email address the customer enters in the form
- Automatically check weather conditions every 3 hours
- Prevent duplicate alerts with a 2-hour cooldown period
- Include detailed weather information in each email

## Troubleshooting Email Issues

If you're not receiving emails:

1. Check your spam/junk folder
2. Verify that your EmailJS account is properly set up
3. Ensure your email service (Gmail) is connected in EmailJS
4. Check the browser console for any error messages
5. Make sure you're using the correct EmailJS credentials

## Email Template Configuration

To ensure emails are sent to the correct recipient, your EmailJS template should be configured with:
- "To email" field set to `{{to_email}}` (this is the placeholder for the customer's email)

## Need Help?

If you're still having issues with email notifications:
1. Check the browser's developer console for error messages
2. Verify your EmailJS account and service setup
3. Contact EmailJS support if needed