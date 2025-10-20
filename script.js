// API key for OpenWeatherMap
const API_KEY = '4a6c4fd18d618249f78b1496dc017b2b';

// DOM elements
const form = document.getElementById('subscription-form');
const emailInput = document.getElementById('email');
const locationInput = document.getElementById('location');
const useLocationBtn = document.getElementById('use-location-btn');
const searchLocationBtn = document.getElementById('search-location-btn');
const checkWeatherBtn = document.getElementById('check-weather-btn'); // Add this line
const emailError = document.getElementById('email-error');
const locationError = document.getElementById('location-error');
const messageContainer = document.getElementById('message-container');
const locationSuggestions = document.getElementById('location-suggestions');

// Store subscription data
let subscriptionData = null;
let autoCheckInterval = null; // For automatic weather checking
let lastAlertTime = null; // To prevent duplicate alerts

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset errors
    emailError.textContent = '';
    locationError.textContent = '';
    
    // Validate form
    const isValid = validateForm();
    
    if (isValid) {
        // Store subscription data for potential email notification
        const locationValue = locationInput.value.trim();
        subscriptionData = {
            email: emailInput.value.trim(),
            location: locationValue
        };
        
        // Show message about precise location tracking
        if (locationValue.includes(',')) {
            const coords = locationValue.split(',');
            const lat = coords[0].trim();
            const lon = coords[1].trim();
            showMessage(`Subscribing to weather alerts for exact coordinates: ${parseFloat(lat).toFixed(7)}, ${parseFloat(lon).toFixed(7)}`, 'notification');
        } else {
            showMessage(`Subscribing to weather alerts for location: ${locationValue} (Will use exact city coordinates)`, 'notification');
        }
        
        // Start automatic weather checking
        startAutoWeatherChecking();
        
        // In a real app, you would send this data to your backend
        // For this MVP, we'll just fetch weather data directly
        await checkWeather();
    }
});

// Start automatic weather checking every 3 hours
function startAutoWeatherChecking() {
    // Clear any existing interval
    if (autoCheckInterval) {
        clearInterval(autoCheckInterval);
    }
    
    // Set up automatic checking every 3 hours (10800000 milliseconds)
    autoCheckInterval = setInterval(async () => {
        if (subscriptionData) {
            console.log('🔄 Automatically checking weather conditions...');
            await checkWeatherAutomatically();
        }
    }, 10800000); // 3 hours in milliseconds
    
    showMessage('✅ Automatic weather checking enabled! Will check every 3 hours.', 'success');
}

// Stop automatic weather checking
function stopAutoWeatherChecking() {
    if (autoCheckInterval) {
        clearInterval(autoCheckInterval);
        autoCheckInterval = null;
        showMessage('⏹ Automatic weather checking disabled.', 'notification');
    }
}

// Enhanced automatic weather checking function
async function checkWeatherAutomatically() {
    if (!subscriptionData) return;
    
    try {
        let data;
        let isExactLocation = false;
        let exactCoordinates = null;
        const locationValue = subscriptionData.location;
        
        // Check if location is coordinates (lat, lon) or city name
        if (locationValue.includes(',')) {
            // Coordinates format: "lat,lon" (without space)
            const coords = locationValue.split(',');
            const lat = coords[0].trim();
            const lon = coords[1].trim();
            
            // Validate coordinates
            if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                throw new Error('Invalid coordinates in subscription data.');
            }
            
            data = await fetchWeatherByCoordinates(lat, lon);
            isExactLocation = true;
            exactCoordinates = { lat: parseFloat(lat), lon: parseFloat(lon) };
        } else {
            // City name or ZIP code
            data = await fetchWeatherByCity(locationValue);
            // Try to get coordinates for the city for more precise tracking
            if (data.city && data.city.coord) {
                exactCoordinates = { 
                    lat: data.city.coord.lat, 
                    lon: data.city.coord.lon 
                };
                isExactLocation = true;
            }
        }
        
        // Check if rain is expected in the next few hours
        const rainInfo = checkForRainWithDetails(data);
        
        // Check if we should send an alert (only if rain is expected and we haven't sent an alert recently)
        if (rainInfo.rainExpected) {
            const now = new Date();
            
            // Only send alert if we haven't sent one in the last 2 hours
            if (!lastAlertTime || (now - lastAlertTime) > 7200000) { // 2 hours in milliseconds
                lastAlertTime = now;
                
                let locationDisplay = data.city.name;
                if (isExactLocation && exactCoordinates) {
                    locationDisplay = `${data.city.name} (Exact: ${exactCoordinates.lat.toFixed(7)}, ${exactCoordinates.lon.toFixed(7)})`;
                }
                
                // Send enhanced alert
                await sendEnhancedWeatherAlert(locationDisplay, rainInfo, data);
            }
        }
    } catch (error) {
        console.error('Automatic weather check error:', error);
        // Don't show error to user in automatic checks to avoid annoyance
    }
}

// Enhanced weather alert function with actual email sending
async function sendEnhancedWeatherAlert(location, rainInfo, weatherData) {
    // Show notification to user
    let alertMessage = `📧 Weather Alert for ${subscriptionData.email}!
    
🌧 Rain expected in ${location}`;
    
    if (rainInfo.nextRainTime !== null) {
        if (rainInfo.nextRainTime === 0) {
            alertMessage += `\n⚠️ Rain expected within the next hour!`;
        } else {
            alertMessage += `\n⚠️ Rain expected in approximately ${rainInfo.nextRainTime} hour(s).`;
        }
    }
    
    // Add intensity information
    let intensityMessage = '';
    switch(rainInfo.rainIntensity) {
        case 'heavy':
            intensityMessage = 'HEAVY rainfall expected - take immediate action to protect your clothes!';
            break;
        case 'moderate':
            intensityMessage = 'MODERATE rainfall expected - bring clothes inside soon.';
            break;
        case 'light':
            intensityMessage = 'LIGHT rainfall expected - monitor conditions.';
            break;
    }
    
    alertMessage += `
🌡️ Current temperature: ${Math.round(weatherData.list[0].main.temp)}°C
💨 Wind speed: ${rainInfo.windSpeed} m/s
📈 Chance of rain: ${rainInfo.chanceOfRain}%
📊 Precipitation: ${rainInfo.precipitation}mm expected
🚨 Intensity: ${intensityMessage}
🕒 Alert time: ${new Date().toLocaleString()}

Action required: Bring your clothes inside immediately to protect them from the rain!`;
    
    showMessage(alertMessage, 'error');
    
    // Send actual email using EmailJS
    try {
        const templateParams = {
            to_email: subscriptionData.email,
            location: location,
            temperature: Math.round(weatherData.list[0].main.temp),
            wind_speed: rainInfo.windSpeed,
            chance_of_rain: rainInfo.chanceOfRain,
            precipitation: rainInfo.precipitation,
            rain_intensity: intensityMessage,
            next_rain_time: rainInfo.nextRainTime || 'Unknown',
            alert_time: new Date().toLocaleString()
        };
        
        // Send email using EmailJS with your provided service ID and template ID
        const response = await emailjs.send('service_ztazydt', 'template_it9yecl', templateParams);
        
        console.log('Email sent successfully:', response);
        showMessage(`📧 Email alert sent to ${subscriptionData.email}! Check your inbox for details.`, 'success');
    } catch (error) {
        console.error('Error sending email:', error);
        showMessage(`❌ Error sending email notification. Please check console for details.`, 'error');
    }
}

// Form validation
function validateForm() {
    let isValid = true;
    
    // Validate email
    const emailValue = emailInput.value.trim();
    if (!emailValue) {
        emailError.textContent = 'Email is required';
        isValid = false;
    } else if (!isValidEmail(emailValue)) {
        emailError.textContent = 'Please enter a valid email address';
        isValid = false;
    }
    
    // Validate location
    const locationValue = locationInput.value.trim();
    if (!locationValue) {
        locationError.textContent = 'City or ZIP code is required';
        isValid = false;
    } else if (locationValue.length < 2) {
        locationError.textContent = 'Please enter a valid location (minimum 2 characters)';
        isValid = false;
    }
    
    return isValid;
}

// Email validation helper
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Use location button handler
useLocationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        useLocationBtn.disabled = true;
        useLocationBtn.textContent = 'Getting precise location...';
        
        // Enhanced geolocation options for maximum accuracy
        const geoOptions = {
            enableHighAccuracy: true, // Use GPS if available
            timeout: 20000,           // 20 second timeout for better accuracy
            maximumAge: 0             // Don't use cached position
        };
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                
                // Use maximum precision for coordinates (7 decimal places for better accuracy)
                locationInput.value = `${latitude.toFixed(7)},${longitude.toFixed(7)}`;
                useLocationBtn.disabled = false;
                useLocationBtn.textContent = 'Use My Location';
                
                // Show success message with accuracy information
                let accuracyMessage = 'Precise location retrieved successfully!';
                if (accuracy) {
                    accuracyMessage += ` (Accuracy: ${Math.round(accuracy)} meters)`;
                    // If accuracy is poor, warn the user
                    if (accuracy > 1000) {
                        accuracyMessage += ' Note: Location accuracy is low. For better results, try again outdoors with clear sky view.';
                    } else if (accuracy > 100) {
                        accuracyMessage += ' Note: Location accuracy is moderate. Results may vary slightly.';
                    } else {
                        accuracyMessage += ' Location accuracy is excellent!';
                    }
                }
                
                showMessage(`${accuracyMessage} Checking exact weather conditions...`, 'success');
                
                // Automatically check weather for the retrieved location
                await checkWeather();
            },
            (error) => {
                console.error('Geolocation error:', error);
                useLocationBtn.disabled = false;
                useLocationBtn.textContent = 'Use My Location';
                
                let errorMessage = 'Unable to retrieve your precise location.';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += ' Location access was denied. Please enable location permissions in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += ' Location information is unavailable. Try entering your exact coordinates manually.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += ' Location request timed out. Please try again or enter coordinates manually.';
                        break;
                    default:
                        errorMessage += ' An unknown error occurred. Please try entering your exact coordinates manually.';
                        break;
                }
                
                showMessage(errorMessage, 'error');
            },
            geoOptions
        );
    } else {
        showMessage('Geolocation is not supported by your browser. Please enter your exact coordinates manually (latitude,longitude).', 'error');
    }
});

// Search location button handler
searchLocationBtn.addEventListener('click', () => {
    const query = locationInput.value.trim();
    if (query.length >= 2) {
        searchLocations(query);
    }
});

// Check weather button handler
checkWeatherBtn.addEventListener('click', async () => {
    const locationValue = locationInput.value.trim();
    
    if (!locationValue) {
        locationError.textContent = 'Please enter a location first';
        return;
    }
    
    // Reset errors
    locationError.textContent = '';
    
    try {
        // Show loading message
        showMessage('Checking precise weather conditions...', 'notification');
        
        let data;
        let isExactLocation = false;
        let exactCoordinates = null;
        
        // Check if location is coordinates (lat, lon) or city name
        if (locationValue.includes(',')) {
            // Coordinates format: "lat,lon" (without space)
            const coords = locationValue.split(',');
            const lat = coords[0].trim();
            const lon = coords[1].trim();
            
            // Validate coordinates
            if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                throw new Error('Invalid coordinates. Please enter valid latitude (-90 to 90) and longitude (-180 to 180) values.');
            }
            
            data = await fetchWeatherByCoordinates(lat, lon);
            isExactLocation = true;
            exactCoordinates = { lat: parseFloat(lat), lon: parseFloat(lon) };
            
            // Show message with precise location info
            showMessage(`Checking weather for exact coordinates: ${parseFloat(lat).toFixed(7)}, ${parseFloat(lon).toFixed(7)}`, 'notification');
        } else {
            // City name or ZIP code
            data = await fetchWeatherByCity(locationValue);
            // Try to get coordinates for the city for more precise tracking
            if (data.city && data.city.coord) {
                exactCoordinates = { 
                    lat: data.city.coord.lat, 
                    lon: data.city.coord.lon 
                };
                isExactLocation = true;
            }
        }
        
        const temp = Math.round(data.list[0].main.temp);
        const description = data.list[0].weather[0].description;
        const humidity = data.list[0].main.humidity;
        const windSpeed = data.list[0].wind ? Math.round(data.list[0].wind.speed) : 0;
        const pressure = data.list[0].main.pressure;
        
        // Check for rain in the next few hours
        const rainInfo = checkForRainWithDetails(data);
        
        let locationDisplay = data.city.name;
        if (isExactLocation && exactCoordinates) {
            locationDisplay = `${data.city.name} (Exact: ${exactCoordinates.lat.toFixed(7)}, ${exactCoordinates.lon.toFixed(7)})`;
        }
        
        let weatherMessage = `Current weather in ${locationDisplay}: 
Temperature: ${temp}°C
Condition: ${description}
Humidity: ${humidity}%
Wind speed: ${windSpeed} m/s
Pressure: ${pressure} hPa`;
        
        if (rainInfo.rainExpected) {
            weatherMessage += `\n\n🌧 Rain Alert: ${rainInfo.chanceOfRain}% chance of rain in the next 15 hours.`;
            
            if (rainInfo.nextRainTime !== null) {
                if (rainInfo.nextRainTime === 0) {
                    weatherMessage += ` Rain expected within the next hour!`;
                } else {
                    weatherMessage += ` Rain expected in approximately ${rainInfo.nextRainTime} hour(s).`;
                }
            }
            
            // Add intensity information
            switch(rainInfo.rainIntensity) {
                case 'heavy':
                    weatherMessage += `\nIntensity: Heavy rainfall expected`;
                    break;
                case 'moderate':
                    weatherMessage += `\nIntensity: Moderate rainfall expected`;
                    break;
                case 'light':
                    weatherMessage += `\nIntensity: Light rainfall expected`;
                    break;
            }
            
            weatherMessage += `\nPrecipitation: ${rainInfo.precipitation}mm expected`;
        } else {
            weatherMessage += `\n\n✅ No rain expected in the next 15 hours.`;
        }
        
        showMessage(weatherMessage, 'notification');
    } catch (error) {
        console.error('Weather check error:', error);
        showMessage(`❌ Error checking weather: ${error.message}`, 'error');
    }
});

// Location input handler for real-time search
let searchTimeout;
locationInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = locationInput.value.trim();
    
    if (query.length >= 2) {
        searchTimeout = setTimeout(() => {
            searchLocations(query);
        }, 300); // Debounce search by 300ms
    } else {
        locationSuggestions.style.display = 'none';
    }
});

// Search locations function (simulated for MVP)
async function searchLocations(query) {
    try {
        // In a real implementation, this would call a location search API
        // For this MVP, we'll simulate search results
        const suggestions = [
            `${query}`,
            `${query} City`,
            `${query} Town`,
            `${query} Village`,
            `New ${query}`,
            `Old ${query}`
        ];
        
        showLocationSuggestions(suggestions);
    } catch (error) {
        console.error('Location search error:', error);
        locationSuggestions.style.display = 'none';
    }
}

// Show location suggestions
function showLocationSuggestions(suggestions) {
    if (suggestions.length === 0) {
        locationSuggestions.style.display = 'none';
        return;
    }
    
    locationSuggestions.innerHTML = '';
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = suggestion;
        item.addEventListener('click', () => {
            locationInput.value = suggestion;
            locationSuggestions.style.display = 'none';
            // Show current weather for the selected location
            showCurrentWeather(suggestion);
        });
        locationSuggestions.appendChild(item);
    });
    
    locationSuggestions.style.display = 'block';
}

// Show current weather for a location
async function showCurrentWeather(location) {
    try {
        const data = await fetchWeatherByCity(location);
        const temp = Math.round(data.list[0].main.temp);
        const description = data.list[0].weather[0].description;
        
        // Show current weather information
        showMessage(`Current weather in ${data.city.name}: ${temp}°C, ${description}`, 'notification');
    } catch (error) {
        console.error('Error fetching current weather:', error);
        // Don't show error for this - it's just supplementary information
    }
}

// Check weather and show alert if rain is expected
async function checkWeather() {
    const locationValue = locationInput.value.trim();
    
    try {
        let data;
        let isExactLocation = false;
        let exactCoordinates = null;
        
        // Check if location is coordinates (lat, lon) or city name
        if (locationValue.includes(',')) {
            // Coordinates format: "lat,lon" (without space)
            const coords = locationValue.split(',');
            const lat = coords[0].trim();
            const lon = coords[1].trim();
            
            // Validate coordinates
            if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                throw new Error('Invalid coordinates. Please enter valid latitude (-90 to 90) and longitude (-180 to 180) values.');
            }
            
            data = await fetchWeatherByCoordinates(lat, lon);
            isExactLocation = true;
            exactCoordinates = { lat: parseFloat(lat), lon: parseFloat(lon) };
            
            // Show message with precise location info
            showMessage(`Checking weather for exact coordinates: ${parseFloat(lat).toFixed(7)}, ${parseFloat(lon).toFixed(7)}`, 'notification');
        } else {
            // City name or ZIP code
            data = await fetchWeatherByCity(locationValue);
            // Try to get coordinates for the city for more precise tracking
            if (data.city && data.city.coord) {
                exactCoordinates = { 
                    lat: data.city.coord.lat, 
                    lon: data.city.coord.lon 
                };
                isExactLocation = true;
            }
        }
        
        // Check if rain is expected in the next few hours
        const rainInfo = checkForRainWithDetails(data);
        
        if (rainInfo.rainExpected) {
            let locationDisplay = data.city.name;
            if (isExactLocation && exactCoordinates) {
                locationDisplay = `${data.city.name} (Exact: ${exactCoordinates.lat.toFixed(7)}, ${exactCoordinates.lon.toFixed(7)})`;
            }
            
            let rainMessage = `🌧 Rain Alert! It looks like rain is expected soon in ${locationDisplay}.`;
            
            if (rainInfo.nextRainTime !== null) {
                if (rainInfo.nextRainTime === 0) {
                    rainMessage += `\nRain is expected within the next hour!`;
                } else {
                    rainMessage += `\nRain is expected in approximately ${rainInfo.nextRainTime} hour(s).`;
                }
            }
            
            // Add intensity information
            let intensityMessage = '';
            switch(rainInfo.rainIntensity) {
                case 'heavy':
                    intensityMessage = 'Heavy rainfall expected - take immediate action!';
                    break;
                case 'moderate':
                    intensityMessage = 'Moderate rainfall expected - bring clothes inside soon.';
                    break;
                case 'light':
                    intensityMessage = 'Light rainfall expected - monitor conditions.';
                    break;
            }
            
            rainMessage += `
Current temperature: ${Math.round(data.list[0].main.temp)}°C
Wind speed: ${rainInfo.windSpeed} m/s
Chance of rain: ${rainInfo.chanceOfRain}%
Precipitation: ${rainInfo.precipitation}mm expected
Intensity: ${intensityMessage}
Bring your clothes inside immediately!`;
            
            showMessage(rainMessage, 'error');
            // Send actual email notification
            await sendEnhancedWeatherAlert(locationDisplay, rainInfo, data);
        } else {
            let locationDisplay = data.city.name;
            if (isExactLocation && exactCoordinates) {
                locationDisplay = `${data.city.name} (Exact: ${exactCoordinates.lat.toFixed(7)}, ${exactCoordinates.lon.toFixed(7)})`;
            }
            
            showMessage(`✅ Successfully subscribed! No rain expected in the next 15 hours in ${locationDisplay}.
Current temperature: ${Math.round(data.list[0].main.temp)}°C
Wind speed: ${rainInfo.windSpeed} m/s
We'll notify you if conditions change.`, 'success');
        }
    } catch (error) {
        console.error('Weather check error:', error);
        showMessage(`❌ Error checking weather: ${error.message}`, 'error');
    }
}

// Check if rain is expected in the forecast with detailed information
function checkForRainWithDetails(weatherData) {
    // Check more forecast periods for better accuracy (next 5 periods = 15 hours)
    // The OpenWeatherMap API provides forecasts in 3-hour intervals
    const forecasts = weatherData.list.slice(0, 5);
    
    let rainExpected = false;
    let chanceOfRain = 0;
    let precipitation = 0;
    let temperature = Math.round(weatherData.list[0].main.temp);
    let nextRainTime = null;
    let rainIntensity = 'light'; // light, moderate, heavy
    let windSpeed = weatherData.list[0].wind ? Math.round(weatherData.list[0].wind.speed) : 0;
    
    for (let i = 0; i < forecasts.length; i++) {
        const forecast = forecasts[i];
        const forecastTime = new Date(forecast.dt * 1000);
        const hoursFromNow = Math.round((forecastTime - new Date()) / (1000 * 60 * 60));
        
        // Check if rain data exists for this period
        if (forecast.rain && forecast.rain['3h'] > 0) {
            rainExpected = true;
            const rainAmount = forecast.rain['3h'] || 0;
            precipitation += rainAmount;
            
            // Determine rain intensity
            if (rainAmount > 5) {
                rainIntensity = 'heavy';
            } else if (rainAmount > 2) {
                rainIntensity = 'moderate';
            }
            
            // Record when rain is expected
            if (!nextRainTime && hoursFromNow >= 0) {
                nextRainTime = hoursFromNow;
            }
        }
        
        // Check weather condition codes for rain
        // Weather codes 200-299 (thunderstorm), 300-399 (drizzle), 500-599 (rain)
        const weatherCode = forecast.weather[0].id;
        if ((weatherCode >= 200 && weatherCode < 600)) {
            rainExpected = true;
            // Estimate chance of rain based on weather condition
            let currentChance = 0;
            if (weatherCode >= 500 && weatherCode < 600) { // Rain codes
                currentChance = forecast.pop * 100 || 0;
            } else if (weatherCode >= 300 && weatherCode < 400) { // Drizzle codes
                currentChance = (forecast.pop * 100 || 0) * 0.7;
            } else if (weatherCode >= 200 && weatherCode < 300) { // Thunderstorm codes
                currentChance = (forecast.pop * 100 || 0) * 1.2;
            }
            
            chanceOfRain = Math.max(chanceOfRain, currentChance);
            
            // Record when rain is expected
            if (!nextRainTime && hoursFromNow >= 0) {
                nextRainTime = hoursFromNow;
            }
        }
        
        // Take the highest chance of rain from all forecasts
        if (forecast.pop) {
            chanceOfRain = Math.max(chanceOfRain, forecast.pop * 100);
        }
    }
    
    return {
        rainExpected,
        chanceOfRain: Math.round(chanceOfRain),
        precipitation: precipitation.toFixed(1),
        temperature,
        nextRainTime,
        rainIntensity,
        windSpeed
    };
}

// Fetch weather data by city name
async function fetchWeatherByCity(city) {
    // Handle city,country format (e.g., "London,UK")
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    return await fetchWeatherData(url);
}

// Fetch weather data by coordinates
async function fetchWeatherByCoordinates(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    return await fetchWeatherData(url);
}

// Generic weather data fetcher
async function fetchWeatherData(url) {
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = 'Location not found. Please check the city name and try again.';
            
            // Provide more specific error messages based on API response
            if (response.status === 404) {
                errorMessage = 'Location not found. Please check the spelling and try again.';
            } else if (response.status === 401) {
                errorMessage = 'Invalid API key. Please contact the administrator.';
            } else if (response.status === 429) {
                errorMessage = 'Too many requests. Please try again later.';
            } else if (errorData.message) {
                errorMessage = errorData.message;
            }
            
            throw new Error(errorMessage);
        }
        
        return await response.json();
    } catch (error) {
        // Handle network errors or JSON parsing errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Network error: Unable to connect to weather service. Please check your internet connection.');
        }
        throw error;
    }
}

// Display message to user
function showMessage(message, type) {
    messageContainer.textContent = message;
    messageContainer.className = type === 'success' ? 'success' : type === 'notification' ? 'notification-message' : 'error-message';
    messageContainer.style.display = 'block';
    
    // Scroll to message
    messageContainer.scrollIntoView({ behavior: 'smooth' });
}