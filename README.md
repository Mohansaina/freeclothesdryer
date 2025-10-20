# Smart Clothes Drying Alert

A web application that alerts you when rain is expected in your area, helping you protect your clothes from getting wet.

## Features

- Location-based weather checking
- Automatic weather alerts every 3 hours
- Email notifications sent to the customer's entered email address
- Precise location tracking using GPS coordinates
- Responsive design that works on all devices

## ✅ Email Notifications Setup Complete

All required EmailJS credentials have been configured:
- Service ID: `service_ztazydt`
- Template ID: `template_it9yecl`
- Public Key: `_GGIh5ZD8runMLMk0`
- Email: `ruttalamohan23@gmail.com`

## How Email Notifications Work

When a customer subscribes to the service:
1. They enter their email address and location in the form
2. The system stores this information
3. When rain is detected in their area, an email alert is sent to THEIR email address
4. The email includes detailed weather information and timing

The system sends emails to the address the customer enters, not to a fixed address.

## Testing the Application

1. Open `index.html` in a web browser
2. Enter your email address (ruttalamohan23@gmail.com) and location
3. Click "Subscribe"
4. The application will check the weather and display alerts
5. If rain is expected, you'll receive an email notification at the address you entered

## How It Works

1. **Location Tracking:**
   - Uses browser geolocation for precise location detection
   - Supports manual entry of city names or ZIP codes
   - Displays location accuracy information

2. **Weather Checking:**
   - Uses the OpenWeatherMap API for weather forecasts
   - Checks weather conditions every 3 hours automatically
   - Analyzes precipitation, temperature, and wind data

3. **Alert System:**
   - Sends alerts when rain is expected in the next 15 hours
   - Prevents duplicate alerts (2-hour cooldown period)
   - Provides detailed information about rain intensity and timing

4. **Email Notifications:**
   - Sends email alerts to the customer's entered email address when rain is detected
   - Includes detailed weather information in each email
   - Automatically checks weather every 3 hours

## Troubleshooting

- **Location not found:** Check the spelling of your city or ZIP code
- **Weather data not loading:** Ensure you have an internet connection
- **Email notifications not working:** 
  - Check your spam/junk folder
  - Verify your EmailJS account and service setup
  - Check the browser console for error messages
  - Ensure your EmailJS template uses `{{to_email}}` as the recipient
- **Geolocation not working:** Ensure your browser has location permissions enabled

## Customization

You can customize the application by modifying:

- **Weather checking frequency:** Change the interval in `startAutoWeatherChecking()`
- **Alert cooldown period:** Modify the time check in `checkWeatherAutomatically()`
- **Email template:** Update the template in your EmailJS dashboard
- **Styling:** Modify `styles.css` to change the appearance

## License

This project is open source and available under the MIT License.