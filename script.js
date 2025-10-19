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
        subscriptionData = {
            email: emailInput.value.trim(),
            location: locationInput.value.trim()
        };
        
        // In a real app, you would send this data to your backend
        // For this MVP, we'll just fetch weather data directly
        await checkWeather();
    }
});

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
        useLocationBtn.textContent = 'Getting location...';
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                locationInput.value = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
                useLocationBtn.disabled = false;
                useLocationBtn.textContent = 'Use My Location';
                
                // Show success message
                showMessage('Location retrieved successfully! Checking weather...', 'success');
                
                // Automatically check weather for the retrieved location
                await checkWeather();
            },
            (error) => {
                console.error('Geolocation error:', error);
                useLocationBtn.disabled = false;
                useLocationBtn.textContent = 'Use My Location';
                
                let errorMessage = 'Unable to retrieve your location.';
                if (error.message.includes('denied')) {
                    errorMessage += ' Please enable location permissions.';
                }
                
                showMessage(errorMessage, 'error');
            }
        );
    } else {
        showMessage('Geolocation is not supported by your browser.', 'error');
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
        showMessage('Checking weather...', 'notification');
        
        let data;
        
        // Check if location is coordinates (lat, lon) or city name
        if (locationValue.includes(',')) {
            // Coordinates format: "lat,lon" (without space)
            const coords = locationValue.split(',');
            const lat = coords[0].trim();
            const lon = coords[1].trim();
            data = await fetchWeatherByCoordinates(lat, lon);
        } else {
            // City name or ZIP code
            data = await fetchWeatherByCity(locationValue);
        }
        
        const temp = Math.round(data.list[0].main.temp);
        const description = data.list[0].weather[0].description;
        const humidity = data.list[0].main.humidity;
        
        showMessage(`Current weather in ${data.city.name}: 
Temperature: ${temp}°C
Condition: ${description}
Humidity: ${humidity}%`, 'notification');
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
        
        // Check if location is coordinates (lat, lon) or city name
        if (locationValue.includes(',')) {
            // Coordinates format: "lat,lon" (without space)
            const coords = locationValue.split(',');
            const lat = coords[0].trim();
            const lon = coords[1].trim();
            data = await fetchWeatherByCoordinates(lat, lon);
        } else {
            // City name or ZIP code
            data = await fetchWeatherByCity(locationValue);
        }
        
        // Check if rain is expected in the next few hours
        const rainInfo = checkForRainWithDetails(data);
        
        if (rainInfo.rainExpected) {
            showMessage(`🌧 Rain Alert! It looks like rain is expected soon in ${data.city.name}.
Current temperature: ${Math.round(data.list[0].main.temp)}°C
Chance of rain: ${rainInfo.chanceOfRain}%
Precipitation: ${rainInfo.precipitation}mm expected
Bring your clothes inside!`, 'error');
            // Simulate email notification
            simulateEmailNotification(data.city.name, rainInfo);
        } else {
            showMessage(`✅ Successfully subscribed! No rain expected in the next few hours in ${data.city.name}.
Current temperature: ${Math.round(data.list[0].main.temp)}°C
We'll notify you if conditions change.`, 'success');
        }
    } catch (error) {
        console.error('Weather check error:', error);
        showMessage(`❌ Error checking weather: ${error.message}`, 'error');
    }
}

// Simulate email notification
function simulateEmailNotification(location, rainInfo) {
    // In a real application, this would send an actual email
    // For this MVP, we'll just show a notification message
    setTimeout(() => {
        if (subscriptionData) {
            if (rainInfo && rainInfo.rainExpected) {
                showMessage(`📧 Simulated Email Notification: 
Rain alert sent to ${subscriptionData.email} for ${location}.
Temperature: ${rainInfo.temperature}°C
Chance of rain: ${rainInfo.chanceOfRain}%
Precipitation: ${rainInfo.precipitation}mm expected
In a full implementation, this would be an actual email with detailed weather information.`, 'notification');
            } else {
                showMessage(`📧 Simulated Email Notification: 
Weather update sent to ${subscriptionData.email} for ${location}.
Current temperature: ${rainInfo ? rainInfo.temperature : 'N/A'}°C
No rain expected in the next few hours.
In a full implementation, this would be an actual email with detailed weather information.`, 'notification');
            }
        }
    }, 2000);
}

// Check if rain is expected in the forecast with detailed information
function checkForRainWithDetails(weatherData) {
    // Check the next 3 forecast periods (every 3 hours)
    const forecasts = weatherData.list.slice(0, 3);
    
    let rainExpected = false;
    let chanceOfRain = 0;
    let precipitation = 0;
    let temperature = Math.round(weatherData.list[0].main.temp);
    
    for (const forecast of forecasts) {
        // Check if rain data exists for this period
        if (forecast.rain && forecast.rain['3h'] > 0) {
            rainExpected = true;
            precipitation += forecast.rain['3h'] || 0;
        }
        
        // Check weather condition codes for rain
        // Weather codes 200-299 (thunderstorm), 300-399 (drizzle), 500-599 (rain)
        const weatherCode = forecast.weather[0].id;
        if ((weatherCode >= 200 && weatherCode < 600)) {
            rainExpected = true;
            // Estimate chance of rain based on weather condition
            if (weatherCode >= 500 && weatherCode < 600) { // Rain codes
                chanceOfRain = Math.max(chanceOfRain, forecast.pop * 100 || 0);
            } else if (weatherCode >= 300 && weatherCode < 400) { // Drizzle codes
                chanceOfRain = Math.max(chanceOfRain, (forecast.pop * 100 || 0) * 0.7);
            } else if (weatherCode >= 200 && weatherCode < 300) { // Thunderstorm codes
                chanceOfRain = Math.max(chanceOfRain, (forecast.pop * 100 || 0) * 1.2);
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
        temperature
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
