document.addEventListener('DOMContentLoaded', () => {
    // Change header background on scroll
    const header = document.querySelector('.glass-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(15, 17, 21, 0.95)';
            header.style.boxShadow = '0 5px 20px rgba(0,0,0,0.5)';
        } else {
            header.style.background = 'rgba(15, 17, 21, 0.8)';
            header.style.boxShadow = 'none';
        }
    });

    // Handle auth state
    const guest = JSON.parse(localStorage.getItem('guest'));
    const loginLink = document.getElementById('nav-login-btn') || document.querySelector('a[href="/login.html"]');
    if (guest && loginLink) {
        loginLink.outerHTML = `
            <div style="display:flex; align-items:center; gap: 1rem;">
                <a href="/profile.html" style="color:#fff; font-size:0.9rem; text-decoration: none;">Hello, <b>${guest.FirstName}</b></a>
                <button onclick="localStorage.removeItem('guest'); window.location.href='/index.html';" class="btn btn-outline" style="padding: 0.5rem 1rem;">Logout</button>
            </div>
        `;
    }

    if (document.getElementById('search-arrival')) {
        initSearchBar();
    }
    if (document.getElementById('rooms-container')) {
        loadDefaultRooms();
    }
    if (document.getElementById('reviews-container')) {
        loadLatestReviews();
    }
});

async function loadDefaultRooms() {
    const container = document.getElementById('rooms-container');
    const title = document.getElementById('room-section-title');
    const desc = document.getElementById('room-section-desc');

    title.textContent = 'Room Categories';
    desc.textContent = 'Discover the ultimate relaxation space at our hotel.';

    try {
        const response = await fetch('/api/rooms');
        if (!response.ok) throw new Error('Network error');
        const rooms = await response.json();

        // Group by room type since DB returns all 20 specific rooms
        const uniqueTypes = {};
        rooms.forEach(r => {
            if (!uniqueTypes[r.RoomType]) {
                uniqueTypes[r.RoomType] = r;
            }
        });

        container.innerHTML = '';
        Object.values(uniqueTypes).forEach(rec => {
            const card = document.createElement('div');
            card.className = 'room-card';
            card.innerHTML = `
                <div class="room-img-wrapper" style="cursor:pointer;" onclick="openRoomModal('${rec.RoomType}', '${rec.RoomDesc}', '${rec.RoomImg}', ${rec.Occupancy})">
                    <img src="/images/${rec.RoomImg}" alt="${rec.RoomType}" onerror="this.src='/images/standard.jpg'">
                    <div class="room-price-tag">$${rec.RoomPrice} / night</div>
                </div>
                <div class="room-info">
                    <h3 style="cursor:pointer;" onclick="openRoomModal('${rec.RoomType}', '${rec.RoomDesc}', '${rec.RoomImg}', ${rec.Occupancy})">${rec.RoomType}</h3>
                    <p style="color:var(--primary); font-weight:600; font-size:0.9rem; margin-bottom: 0.5rem;">
                        Max capacity: ${rec.Occupancy} guests
                    </p>
                    <p>${rec.RoomDesc}</p>
                    <div class="room-meta">
                        <button class="btn btn-outline" style="width: 100%" onclick="document.getElementById('search-arrival').focus(); window.scrollTo({top: 0, behavior: 'smooth'});">
                            Enter dates to book
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:red">Error loading default room data.</p>';
    }
}

function initSearchBar() {
    const arrivalInput = document.getElementById('search-arrival');
    const departureInput = document.getElementById('search-departure');
    const searchForm = document.getElementById('search-form');

    // Default dates: Today to Tomorrow
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    arrivalInput.value = todayStr;
    departureInput.value = tomorrowStr;

    // Initialize Flatpickr
    flatpickr("#date-range-picker", {
        mode: "range",
        minDate: "today",
        maxDate: nextYear,
        showMonths: 2,
        dateFormat: "Y-m-d",
        defaultDate: [todayStr, tomorrowStr],
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                // Formatting back to YYYY-MM-DD for consistency and API expectations
                // By default flatpickr uses local timezone so formatting this way avoids off-by-one errors
                const arr = new Date(selectedDates[0].getTime() - (selectedDates[0].getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                const dep = new Date(selectedDates[1].getTime() - (selectedDates[1].getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                
                arrivalInput.value = arr;
                departureInput.value = dep;
            }
        }
    });

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const arrivalDate = arrivalInput.value;
        const departureDate = departureInput.value;

        if (!arrivalDate || !departureDate || arrivalDate === departureDate) {
            alert('Please select a valid date range (check-in and check-out)!');
            return;
        }

        if (departureDate <= arrivalDate) {
            alert('Departure date must be after arrival date!');
            return;
        }

        const guests = window.guestCounts.adults + window.guestCounts.children;
        await searchRooms(arrivalDate, departureDate, guests);
    });
}

// Popover Logic
window.guestCounts = { adults: 2, children: 0 };

function toggleGuestPopover() {
    const popover = document.getElementById('guests-popover');
    popover.style.display = popover.style.display === 'none' ? 'block' : 'none';
}

function updateCount(type, change) {
    let newVal = window.guestCounts[type] + change;

    // Limits
    if (type === 'adults' && (newVal < 1 || newVal > 32)) return;
    if (type === 'children' && (newVal < 0 || newVal > 16)) return;

    window.guestCounts[type] = newVal;
    document.getElementById(`count-${type}`).textContent = newVal;

    // Update Display Text
    const totalKhach = window.guestCounts.adults + window.guestCounts.children;
    document.getElementById('guests-display').textContent = `${totalKhach} Guests`;
}

async function searchRooms(arrivalDate, departureDate, guests) {
    const container = document.getElementById('rooms-container');
    const title = document.getElementById('room-section-title');
    const desc = document.getElementById('room-section-desc');

    container.innerHTML = '<div class="loading-spinner">Simulating room recommendation system...</div>';
    title.textContent = 'Searching...';
    desc.textContent = '';

    // Smooth scroll to results
    document.getElementById('rooms').scrollIntoView({ behavior: 'smooth' });

    try {
        const response = await fetch('/api/rooms/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ arrivalDate, departureDate, guests })
        });

        if (!response.ok) throw new Error('Network error');
        const recommendations = await response.json();

        container.innerHTML = '';
        title.textContent = 'Recommended Rooms';
        desc.textContent = `Optimal options for ${guests} guests (${arrivalDate} → ${departureDate})`;

        if (recommendations.length === 0) {
            container.innerHTML = '<p style="text-align:center;width:100%;color:#a0a0a0;font-size:1.2rem;">Sorry! No rooms available for the selected dates and guests.</p>';
            return;
        }

        recommendations.forEach(rec => {
            const card = document.createElement('div');
            card.className = 'room-card';

            card.innerHTML = `
                <div class="room-img-wrapper" style="cursor:pointer;" onclick="openRoomModal('${rec.comboName}', '${rec.RoomDesc}', '${rec.RoomImg}', ${rec.Occupancy})">
                    <img src="/images/${rec.RoomImg}" alt="${rec.comboName}" onerror="this.src='/images/deluxe.jpg'">
                    <div class="room-price-tag">$${rec.totalPrice} / night</div>
                </div>
                <div class="room-info">
                    <h3 style="cursor:pointer;" onclick="openRoomModal('${rec.comboName}', '${rec.RoomDesc}', '${rec.RoomImg}', ${rec.Occupancy})">${rec.comboName}</h3>
                    <p style="color:var(--primary); font-weight:600; font-size:0.9rem; margin-bottom: 0.5rem;">
                        Max: ${rec.Occupancy} guests
                    </p>
                    <p>${rec.RoomDesc}</p>
                    <div class="room-meta">
                        <span class="meta-item">
                            <span style="color:#4CAF50">✓ Rooms available</span>
                        </span>
                        <button class="btn btn-primary" style="padding: 0.5rem 1.25rem; font-size: 0.9rem;" 
                            onclick="bookRoom('${rec.comboString}', '${arrivalDate}', '${departureDate}')">
                            Book This Option
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching search results:', error);
        container.innerHTML = '<p style="text-align:center;width:100%;color:red">Error loading data. Please try again.</p>';
    }
}

function bookRoom(comboString, arrival, departure) {
    const guest = JSON.parse(localStorage.getItem('guest'));
    if (!guest) {
        alert('Please login to proceed with booking!');
        window.location.href = '/login.html';
    } else {
        const adults = window.guestCounts?.adults || 1;
        const children = window.guestCounts?.children || 0;
        window.location.href = `/book.html?combo=${encodeURIComponent(comboString)}&arrival=${arrival}&departure=${departure}&adults=${adults}&children=${children}`;
    }
}

// Modal Logic
function getFolderByTitle(title) {
    if (title.includes('Suite')) return 'Suite';
    if (title.includes('Deluxe')) return 'Deluxe';
    if (title.includes('Standard Double')) return 'Standard_Double';
    if (title.includes('Standard Twin')) return 'Standard_Twin';
    return 'Standard_Twin';
}

function openRoomModal(title, desc, img, occupancy) {
    document.getElementById('room-detail-modal').style.display = 'flex';
    document.getElementById('modal-room-title').textContent = title;
    document.getElementById('modal-room-desc').textContent = desc;

    // Set folder and default image
    window.currentGalleryFolder = getFolderByTitle(title);
    document.getElementById('modal-main-img').src = `/images/${window.currentGalleryFolder}/1.jpg`;

    // Reset active thumbnail and set img src
    const row = document.querySelector('.thumbnail-row');
    row.querySelectorAll('.thumb').forEach((t, i) => {
        if (i === 0) t.classList.add('active');
        else t.classList.remove('active');
        
        const imgEl = document.getElementById(`thumb-img-${i + 1}`);
        if (imgEl) imgEl.src = `/images/${window.currentGalleryFolder}/${i + 1}.jpg`;
    });

    // Customize area randomly to look good
    let sqmAmt = occupancy > 4 ? "65 m²" : (occupancy > 2 ? "35 m²" : "27 m²");
    document.getElementById('modal-room-area').textContent = `📐 ${sqmAmt}`;
}

function closeRoomModal() {
    document.getElementById('room-detail-modal').style.display = 'none';
}

function changeImage(element, index) {
    // Remove active from peers
    const row = document.querySelector('.thumbnail-row');
    row.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
    element.classList.add('active');

    // Update main image source
    if (window.currentGalleryFolder) {
        document.getElementById('modal-main-img').src = `/images/${window.currentGalleryFolder}/${index}.jpg`;
    }
}

async function loadLatestReviews() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    try {
        // Fetch more reviews to have a good marquee length
        const res = await fetch('/api/reviews/latest?limit=10');
        if (!res.ok) throw new Error('Failed to fetch reviews');
        const reviews = await res.json();
        
        try {
            const avgRes = await fetch('/api/reviews/average');
            if (avgRes.ok) {
                const avgData = await avgRes.json();
                const avgDisplay = document.getElementById('average-rating-display');
                if (avgDisplay && avgData.AvgRating) {
                    avgDisplay.textContent = `(${avgData.AvgRating} ★)`;
                }
            }
        } catch (err) {
            console.error('Error getting average rating', err);
        }

        container.innerHTML = '';
        if (reviews.length === 0) {
            container.innerHTML = '<p style="color:#888; text-align:center; width:100%;">No reviews yet.</p>';
            return;
        }

        // Build HTML string for cards
        let htmlStr = '';
        reviews.forEach(review => {
            const stars = '★'.repeat(review.Rating) + '☆'.repeat(5 - review.Rating);
            const date = new Date(review.ReviewDate).toLocaleDateString('en-US');
            
            htmlStr += `
                <div class="review-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h4 style="color: #fff; margin: 0;">${review.FirstName} ${review.LastName}</h4>
                        <span style="color: #ffd700; font-size: 1.2rem;">${stars}</span>
                    </div>
                    <p style="color: #ccc; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1rem;">"${review.Comment}"</p>
                    <div style="color: #888; font-size: 0.8rem; text-align: right;">Posted on: ${date}</div>
                </div>
            `;
        });

        // Duplicate the reviews to create a seamless infinite scrolling effect
        container.innerHTML = htmlStr + htmlStr;

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:red; text-align:center; width:100%;">Error loading reviews.</p>';
    }
}
