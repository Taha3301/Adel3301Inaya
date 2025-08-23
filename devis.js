console.log('Hello from devis.js!');
console.log("devis.js loaded");

function setupAddressAutocomplete(inputId, suggestionsContainerId) {
  const input = document.getElementById(inputId);
  const suggestionsContainer = document.getElementById(suggestionsContainerId);

  if (!input) {
    console.log(`[DEBUG] Input element with id '${inputId}' not found.`);
    return;
  }
  if (!suggestionsContainer) {
    console.log(`[DEBUG] Suggestions container with id '${suggestionsContainerId}' not found.`);
    return;
  }

  input.addEventListener('input', async function () {
    console.log(`[DEBUG] 'input' event fired for #${inputId}`);
    const query = input.value.trim();
    console.log(`[DEBUG] Query value: '${query}'`);
    
    if (query.length < 3) {
      console.log('[DEBUG] Query too short, hiding suggestions.');
      suggestionsContainer.innerHTML = '';
      suggestionsContainer.style.display = 'none';
      return;
    }

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
    console.log(`[DEBUG] Fetching from: ${url}`);

    try {
      const response = await fetch(url);
      console.log('[DEBUG] Raw response:', response);
      const data = await response.json();
      console.log('[DEBUG] Parsed data:', data);

      suggestionsContainer.innerHTML = '';
      if (data.features && data.features.length > 0) {
        console.log(`[DEBUG] Rendering ${data.features.length} suggestions.`);
        data.features.forEach(feature => {
          const div = document.createElement('div');
          div.className = 'suggestion-item';
          div.textContent = feature.properties.name;
          if (feature.properties.state) {
            div.textContent += `, ${feature.properties.state}`;
          }
          if (feature.properties.country) {
            div.textContent += `, ${feature.properties.country}`;
          }
          div.addEventListener('mousedown', function () {
            console.log(`[DEBUG] Suggestion clicked: ${div.textContent}`);
            input.value = div.textContent;
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
          });
          suggestionsContainer.appendChild(div);
        });
        suggestionsContainer.style.display = 'block';
        console.log('[DEBUG] Suggestions dropdown shown.');
      } else {
        console.log('[DEBUG] No suggestions found, hiding dropdown.');
        suggestionsContainer.style.display = 'none';
      }
    } catch (e) {
      console.error('[DEBUG] Fetch failed:', e);
      suggestionsContainer.innerHTML = '';
      suggestionsContainer.style.display = 'none';
    }
  });

  input.addEventListener('focus', function () {
    console.log(`[DEBUG] 'focus' event fired for #${inputId}`);
    if (input.value.length >= 3) {
      input.dispatchEvent(new Event('input'));
    }
  });

  document.addEventListener('click', function (e) {
    if (!suggestionsContainer.contains(e.target) && e.target !== input) {
      console.log('[DEBUG] Click outside, hiding suggestions.');
      suggestionsContainer.innerHTML = '';
      suggestionsContainer.style.display = 'none';
    }
  });
}

// Function to get driving route using OpenRouteService
async function getDrivingRoute(startCoords, endCoords) {
  // OpenRouteService API endpoint for driving directions
  const apiUrl = 'https://api.openrouteservice.org/v2/directions/driving-car';
  
  // Note: You'll need to get a free API key from https://openrouteservice.org/
  // For now, I'll use a placeholder. Replace with your actual API key
  const apiKey = 'YOUR_OPENROUTESERVICE_API_KEY'; // Replace this with your actual API key
  
  const requestBody = {
    coordinates: [
      [startCoords[0], startCoords[1]], // [longitude, latitude]
      [endCoords[0], endCoords[1]]      // [longitude, latitude]
    ],
    instructions: false,
    geometry: false,
    elevation: false
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[DEBUG] OpenRouteService response:', data);

    if (data.features && data.features.length > 0) {
      const route = data.features[0];
      const properties = route.properties;
      
      // Distance in meters, convert to km
      const distanceKm = properties.segments[0].distance / 1000;
      
      // Duration in seconds, convert to minutes
      const durationMinutes = Math.round(properties.segments[0].duration / 60);
      
      return {
        distance: distanceKm,
        duration: durationMinutes
      };
    } else {
      throw new Error('No route found');
    }
  } catch (error) {
    console.error('[DEBUG] OpenRouteService API error:', error);
    throw error;
  }
}

// Alternative function using OSRM (free, no API key required)
async function getDrivingRouteOSRM(startCoords, endCoords) {
  // OSRM API endpoint for driving directions
  const apiUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?overview=false&steps=false&annotations=false`;
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[DEBUG] OSRM response:', data);

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      // Distance in meters, convert to km
      const distanceKm = route.distance / 1000;
      
      // Duration in seconds, convert to minutes
      const durationMinutes = Math.round(route.duration / 60);
      
      return {
        distance: distanceKm,
        duration: durationMinutes
      };
    } else {
      throw new Error('No route found');
    }
  } catch (error) {
    console.error('[DEBUG] OSRM API error:', error);
    throw error;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  console.log("DOM loaded");
  setupAddressAutocomplete('depart', 'depart-suggestions-container');
  setupAddressAutocomplete('arrivee', 'arrivee-suggestions-container');

  // Track selected options
  let hasBabySeat = false;
  let hasBooster = false;
  let selectedVehicleType = 'eco'; // default, update on vehicle selection

  // Option button toggle logic
  if (typeof window !== 'undefined') {
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const option = btn.getAttribute('data-option');
        if (option === 'baby') {
          hasBabySeat = !hasBabySeat;
          btn.classList.toggle('active', hasBabySeat);
        } else if (option === 'booster') {
          hasBooster = !hasBooster;
          btn.classList.toggle('active', hasBooster);
        } else if (option === 'none') {
          // Deselect both
          hasBabySeat = false;
          hasBooster = false;
          document.querySelectorAll('.option-btn[data-option="baby"], .option-btn[data-option="booster"]').forEach(b => b.classList.remove('active'));
        }
      });
    });

    // Vehicle selection logic
    document.querySelectorAll('.vehicle-btn').forEach((btn, idx) => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.vehicle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update vehicle type
        const vehicleTypeInput = document.getElementById('vehicle-type');
        if (vehicleTypeInput) {
          if (idx === 0) {
            selectedVehicleType = 'premium';
            vehicleTypeInput.value = 'premium';
          } else if (idx === 1) {
            selectedVehicleType = 'eco';
            vehicleTypeInput.value = 'eco';
          } else if (idx === 2) {
            selectedVehicleType = 'van';
            vehicleTypeInput.value = 'van';
          }
        }
      });
    });

    // Calculate distance and price
    function showModalError(message) {
      const resultsContainer = document.querySelector('.results-container');
      const modalContent = document.querySelector('.modal-content');
      if (resultsContainer && modalContent) {
        // Set error content
        modalContent.innerHTML = `
          <span class="close-modal">&times;</span>
          <h3>Erreur</h3>
          <div class="modal-success-message" style="color: red;">
            <i class="fas fa-exclamation-triangle"></i> ${message}
          </div>
        `;
        // Show modal
        resultsContainer.classList.remove('active');
        modalContent.style.transform = 'rotateX(15deg) translateY(50px)';
        modalContent.style.opacity = '0';
        void resultsContainer.offsetWidth;
        resultsContainer.classList.add('active');
        setTimeout(() => {
          modalContent.style.transform = 'rotateX(0) translateY(0)';
          modalContent.style.opacity = '1';
        }, 50);
        // Add close event
        modalContent.querySelector('.close-modal').onclick = function() {
          resultsContainer.classList.remove('active');
        };
      }
    }

    async function calculateDistanceAndPrice(vehicleType, hasBabySeat, hasBooster) {
      const departInput = document.getElementById('depart');
      const arriveeInput = document.getElementById('arrivee');
      
      if (!departInput || !arriveeInput) {
        console.error('Input elements not found');
        showModalError('Input elements not found');
        return;
      }

      const depart = departInput.value;
      const arrivee = arriveeInput.value;

      if (!depart || !arrivee) {
        showModalError('Veuillez entrer les adresses de départ et d\'arrivée');
        return;
      }

      try {
        // Get coordinates for departure location using Photon
        const departResponse = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(depart)}&limit=1`);
        const departData = await departResponse.json();
        
        // Get coordinates for arrival location using Photon
        const arriveeResponse = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(arrivee)}&limit=1`);
        const arriveeData = await arriveeResponse.json();

        if (!departData.features || !departData.features.length || !arriveeData.features || !arriveeData.features.length) {
          showModalError('Adresses non trouvées. Veuillez vérifier les adresses saisies.');
          return;
        }

        // Extract coordinates [longitude, latitude]
        const departCoords = departData.features[0].geometry.coordinates;
        const arriveeCoords = arriveeData.features[0].geometry.coordinates;

        console.log(`[DEBUG] Departure coordinates: [${departCoords[0]}, ${departCoords[1]}]`);
        console.log(`[DEBUG] Arrival coordinates: [${arriveeCoords[0]}, ${arriveeCoords[1]}]`);

        // Get driving route using OSRM (free, no API key required)
        let routeData;
        try {
          routeData = await getDrivingRouteOSRM(departCoords, arriveeCoords);
          console.log(`[DEBUG] Route data from OSRM:`, routeData);
        } catch (osrmError) {
          console.error('[DEBUG] OSRM failed, trying OpenRouteService:', osrmError);
          // Fallback to OpenRouteService if OSRM fails
          try {
            routeData = await getDrivingRoute(departCoords, arriveeCoords);
            console.log(`[DEBUG] Route data from OpenRouteService:`, routeData);
          } catch (orsError) {
            console.error('[DEBUG] Both routing APIs failed:', orsError);
            showModalError('Impossible de calculer l\'itinéraire. Veuillez réessayer.');
            return;
          }
        }

        const distanceKm = routeData.distance;
        const durationMinutes = routeData.duration;
        
        // Calculate price based on vehicle type and distance
        let pricePerKm;
        switch(vehicleType) {
          case 'premium':
            pricePerKm = 2.0;
            break;
          case 'van':
            pricePerKm = 3.0;
            break;
          case 'eco':
          default:
            pricePerKm = 2.5;
        }
        
        let price = distanceKm * pricePerKm;
        if (hasBabySeat) price += 10;
        if (hasBooster) price += 5;
        price = Math.round(price * 100) / 100;

        // Update modal values
        const distanceInput = document.getElementById('distance');
        const durationInput = document.getElementById('duration');
        const priceInput = document.getElementById('estimatedPrice');
        
        if (distanceInput) distanceInput.value = `${distanceKm.toFixed(1)} km`;
        if (durationInput) {
          const totalSeconds = durationMinutes * 60;
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = Math.round(totalSeconds % 60);
          if (hours > 0) {
            durationInput.value = `${hours}h ${minutes}m ${seconds}s`;
          } else {
            durationInput.value = `${minutes}m ${seconds}s`;
          }
        }
        if (priceInput) priceInput.value = `${price.toFixed(2)} €`;

        // Show the modal with proper animation
        const resultsContainer = document.querySelector('.results-container');
        const modalContent = document.querySelector('.modal-content');
        
        if (resultsContainer && modalContent) {
          // First reset the modal state
          resultsContainer.classList.remove('active');
          modalContent.style.transform = 'rotateX(15deg) translateY(50px)';
          modalContent.style.opacity = '0';
          
          // Force a reflow
          void resultsContainer.offsetWidth;
          
          // Then show the modal with animation
          resultsContainer.classList.add('active');
          
          // Use setTimeout to ensure the transition works
          setTimeout(() => {
            modalContent.style.transform = 'rotateX(0) translateY(0)';
            modalContent.style.opacity = '1';
          }, 50);
        }

        console.log(`Distance de conduite: ${distanceKm.toFixed(1)} km`);
        // Log duration in h m s format
        const totalSeconds = durationMinutes * 60;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.round(totalSeconds % 60);
        if (hours > 0) {
          console.log(`Durée de conduite: ${hours}h ${minutes}m ${seconds}s`);
        } else {
          console.log(`Durée de conduite: ${minutes}m ${seconds}s`);
        }
        console.log(`Prix estimé: ${price.toFixed(2)} €`);
        
      } catch (error) {
        console.error('Error calculating route:', error);
        showModalError('Une erreur est survenue lors du calcul de l\'itinéraire. Veuillez réessayer.');
      }
    }

    // Calculate button handler
    const calcBtn = document.querySelector('.calculate-btn');
    if (calcBtn) {
      calcBtn.addEventListener('click', function(e) {
        e.preventDefault();
        calculateDistanceAndPrice(selectedVehicleType, hasBabySeat, hasBooster);
      });
    }
  }
});
