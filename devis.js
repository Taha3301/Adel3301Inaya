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
        // Get coordinates for departure location
        const departResponse = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(depart)}&limit=1`);
        const departData = await departResponse.json();
        
        // Get coordinates for arrival location
        const arriveeResponse = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(arrivee)}&limit=1`);
        const arriveeData = await arriveeResponse.json();

        if (!departData.features || !departData.features.length || !arriveeData.features || !arriveeData.features.length) {
          showModalError('Adresses non trouvées. Veuillez vérifier les adresses saisies.');
          return;
        }

        // Extract coordinates
        const departCoords = departData.features[0].geometry.coordinates;
        const arriveeCoords = arriveeData.features[0].geometry.coordinates;

        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in kilometers
        const lat1 = departCoords[1] * Math.PI / 180;
        const lat2 = arriveeCoords[1] * Math.PI / 180;
        const deltaLat = (arriveeCoords[1] - departCoords[1]) * Math.PI / 180;
        const deltaLon = (arriveeCoords[0] - departCoords[0]) * Math.PI / 180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                 Math.cos(lat1) * Math.cos(lat2) *
                 Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        // Calculate straight-line distance and apply road factor
        const straightLineDistance = R * c;
        const distanceKm = straightLineDistance * 1.3; // Apply 1.3x factor for road distance

        // Estimate duration (assuming average speed of 50 km/h)
        const durationMinutes = Math.round((distanceKm / 50) * 60);
        
        // Calculate price based on vehicle type and distance
        let pricePerKm;
        switch(vehicleType) {
          case 'premium':
            pricePerKm = 2.5;
            break;
          case 'van':
            pricePerKm = 3.0;
            break;
          case 'eco':
          default:
            pricePerKm = 2.0;
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

        console.log(`Distance: ${distanceKm.toFixed(1)} km`);
        // Log duration in h m s format
        const totalSeconds = durationMinutes * 60;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.round(totalSeconds % 60);
        if (hours > 0) {
          console.log(`Durée: ${hours}h ${minutes}m ${seconds}s`);
        } else {
          console.log(`Durée: ${minutes}m ${seconds}s`);
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
