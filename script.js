$(document).ready(function() {
    const $teatteriValinta = $('#teatteriValinta');
    const $elokuvaContainer = $('#movies');
    
    // Haetaan teatterit
    fetchTheaters();
    
    // Lisätään kuuntelija, teatterin valinta
    $teatteriValinta.on('change', function() {
        const teatteriId = $(this).val();
        if (!teatteriId) {
            $elokuvaContainer.fadeOut(300, function() {
                $(this).empty();
            });
            return;
        }
        fetchMovies(teatteriId);
    });
    
    // Teattereiden haku - jQuery AJAX
    function fetchTheaters() {
        $.ajax({
            url: 'https://www.finnkino.fi/xml/TheatreAreas/',
            method: 'GET',
            dataType: 'text',
            success: function(xmlText) {
                try {
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(xmlText, "text/xml");
                    naytaTeatterit(xml.getElementsByTagName("TheatreArea"));
                } catch (error) {
                    console.error('Virhe XML-parsinnassa:', error);
                    $teatteriValinta.html("<option value=''>Virhe teattereiden haussa</option>");
                }
            },
            error: function(xhr, status, error) {
                console.error('Virhe teatteritietojen haussa:', error);
                $teatteriValinta.html("<option value=''>Virhe teattereiden haussa</option>");
            }
        });
    }
    
    // Teattereiden näyttäminen
    function naytaTeatterit(teatteriTiedot) {
        $teatteriValinta.html("<option value=''>Valitse teatteri</option>");
        
        // Arvojen läpikäyminen
        $.each(teatteriTiedot, function(index, theater) {
            const name = $(theater).find("Name").text();
            const ohitetutTeatterit = ["Valitse alue/teatteri", "Pääkaupunkiseutu", "Espoo", "Helsinki", "Tampere", "Turku ja Raisio"];

            if (!ohitetutTeatterit.includes(name)) {
                const id = $(theater).find("ID").text();
                const $option = $('<option></option>').val(id).text(name);
                $teatteriValinta.append($option);
            }
        });
        
        // Tiputusvalikko
        $teatteriValinta.hide().fadeIn(500);
    }
    
    // Elokuvien haku
    function fetchMovies(teatteriId) {
        // Fadeout
        $elokuvaContainer.fadeOut(200, function() {
            $(this).html('<div class="loading"><p>Ladataan elokuvia...</p></div>').fadeIn(200);
        });
        
        $.ajax({
            url: `https://www.finnkino.fi/xml/Schedule/?area=${teatteriId}`,
            method: 'GET',
            dataType: 'text',
            success: function(xmlText) {
                try {
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(xmlText, "text/xml");
                    const movies = xml.getElementsByTagName("Show");
                    naytaElokuvat(movies);
                } catch (error) {
                    console.error('Virhe XML-parsinnassa:', error);
                    $elokuvaContainer.fadeOut(200, function() {
                        $(this).html('<div class="error-message">Virhe elokuvien haussa</div>').fadeIn(200);
                    });
                }
            },
            error: function(xhr, status, error) {
                console.error('Virhe haettaessa elokuvia:', error);
                $elokuvaContainer.fadeOut(200, function() {
                    $(this).html('<div class="error-message">Virhe elokuvien haussa</div>').fadeIn(200);
                });
            }
        });
    }
    
    // Elokuvien näyttäminen, Fadeout
    function naytaElokuvat(elokuvaTiedot) {
        if (elokuvaTiedot.length === 0) {
            $elokuvaContainer.fadeOut(200, function() {
                $(this).html('<div class="empty-message">Ei näytöksiä saatavilla valitulle teatterille</div>').fadeIn(200);
            });
            return;
        }
        
        $elokuvaContainer.fadeOut(300, function() {
            const $container = $(this);
            $container.empty();
            
            // Poistetaan useat esiintymät elokuvista
            const karsitutElokuvat = new Map();
            
            $.each(elokuvaTiedot, function(index, movie) {
                const title = $(movie).find("Title").text();
                const eventId = $(movie).find("EventID").text();
                
                // Tallennetaan vain seuraava näytös
                if (!karsitutElokuvat.has(eventId)) {
                    karsitutElokuvat.set(eventId, movie);
                }
            });
            
            // Näytetään elokuva kerran ja vain seuraava näytös
            let delay = 0;
            karsitutElokuvat.forEach(function(movie) {
                const title = $(movie).find("Title").text();
                let imageUrl = $(movie).find("EventLargeImagePortrait").text() || "";
                const showtime = $(movie).find("dttmShowStart").text();
                const rating = $(movie).find("Rating").text() || "Ei ikärajaa";
                const lengthInMinutes = $(movie).find("LengthInMinutes").text() || "";
                
                if (imageUrl && imageUrl.startsWith('http://')) {
                    imageUrl = imageUrl.replace('http://', 'https://');
                }

                const $movieCard = $('<div class="movie-card"></div>').css('display', 'none');
                
                $movieCard.html(`
                    <img src="${imageUrl}" alt="${title}" onerror="this.src='placeholder.png'">
                    <h3>${title}</h3>
                    <p><strong>Ikäraja:</strong> ${rating}</p>
                    ${lengthInMinutes ? `<p><strong>Kesto:</strong> ${lengthInMinutes} min</p>` : ''}
                    <p><strong>Seuraava näytös:</strong><br>${formatDateTime(showtime)}</p>
                    <button class="btn btn-primary btn-sm mt-2" onclick="showMovieModal('${title}', '${imageUrl}', '${rating}', '${lengthInMinutes}', '${formatDateTime(showtime)}')">Lisätiedot</button>
                `);
                
                // Hover-efektit jQueryllä
                $movieCard.hover(
                    function() {
                        $(this).addClass('movie-card-hover');
                    },
                    function() {
                        $(this).removeClass('movie-card-hover');
                    }
                );
                
                $container.append($movieCard);
                
                // Fade in yksi kortti kerrallaan
                setTimeout(function() {
                    $movieCard.fadeIn(400).addClass('movie-card-enter');
                }, delay);
                
                delay += 100; // Korttien viive
            });
            
            // Fade in koko container
            $container.fadeIn(400);
        });
    }
    
    // Päivämäärän muotoilu
    function formatDateTime(dateTimeStr) {
        try {
            const date = new Date(dateTimeStr);
            return date.toLocaleString('fi-FI', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            console.error('Virhe päivämäärän muotoilussa:', e);
            return dateTimeStr;
        }
    }
});

// Bootstrap elokuvan tiedoille
window.showMovieModal = function(title, imageUrl, rating, length, showtime) {
    if (imageUrl && imageUrl.startsWith('http://')) {
    imageUrl = imageUrl.replace('http://', 'https://');
    }

    const modalHtml = `
        <div class="modal fade" id="movieModal" tabindex="-1" aria-labelledby="movieModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="movieModalLabel">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sulje"></button>
                    </div>
                    <div class="modal-body">
                        ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="img-fluid mb-3" onerror="this.style.display='none'">` : ''}
                                    <p><strong>Ikäraja:</strong> ${rating}</p>
                                    ${length ? `<p><strong>Kesto:</strong> ${length} min</p>` : ''}
                                    <p><strong>Seuraava näytös:</strong> ${showtime}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sulje</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Poista vanha modal
    $('#movieModal').remove();
    
    // Lisää uusi modal
    $('body').append(modalHtml);
    
    // Näytä modal
    const modal = new bootstrap.Modal(document.getElementById('movieModal'));
    modal.show();
    
    // Poista modal kun se suljetaan
    $('#movieModal').on('hidden.bs.modal', function() {
        $(this).remove();
    });
}