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
    const loginLink = document.getElementById('login-nav-btn');
    if (guest && loginLink) {
        loginLink.outerHTML = `
            <div style="display:flex; align-items:center; gap: 1rem;">
                <span style="color:#fff; font-size:0.9rem;">Xin chào, <b>${guest.FirstName}</b></span>
                <button onclick="localStorage.removeItem('guest'); window.location.reload();" class="btn btn-outline" style="padding: 0.5rem 1rem;">Đăng xuất</button>
            </div>
        `;
    }

    loadDefaultRooms();
});

async function loadDefaultRooms() {
    const container = document.getElementById('rooms-container');
    const title = document.getElementById('room-section-title');
    const desc = document.getElementById('room-section-desc');

    title.textContent = 'Danh sách Hạng Phòng';
    desc.textContent = 'Khám phá không gian nghỉ dưỡng đỉnh cao tại khách sạn của chúng tôi.';

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
                    <div class="room-price-tag">$${rec.RoomPrice} / đêm</div>
                </div>
                <div class="room-info">
                    <h3 style="cursor:pointer;" onclick="openRoomModal('${rec.RoomType}', '${rec.RoomDesc}', '${rec.RoomImg}', ${rec.Occupancy})">${rec.RoomType}</h3>
                    <p style="color:var(--primary); font-weight:600; font-size:0.9rem; margin-bottom: 0.5rem;">
                        Sức chứa tối đa: ${rec.Occupancy} khách
                    </p>
                    <p>${rec.RoomDesc}</p>
                    <div class="room-meta">
                        <button class="btn btn-outline" style="width: 100%" onclick="openRoomModal('${rec.RoomType}', '${rec.RoomDesc}', '${rec.RoomImg}', ${rec.Occupancy})">
                            Xem Chi Tiết
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:red">Lỗi tải dữ liệu phòng mặc định.</p>';
    }
}

// Modal Logic
function openRoomModal(title, desc, img, occupancy) {
    document.getElementById('room-detail-modal').style.display = 'flex';
    document.getElementById('modal-room-title').textContent = title;
    document.getElementById('modal-room-desc').textContent = desc;
    document.getElementById('modal-main-img').src = `/images/${img}`;

    // Customize area randomly to look good
    let sqmAmt = occupancy > 4 ? "65 m²" : (occupancy > 2 ? "35 m²" : "27 m²");
    document.getElementById('modal-room-area').textContent = `📐 ${sqmAmt}`;
}

function closeRoomModal() {
    document.getElementById('room-detail-modal').style.display = 'none';
}

function changeImage(element, type = 'thumb') {
    // Remove active from peers
    const row = document.querySelector('.thumbnail-row');
    row.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
    element.classList.add('active');

    // MOCK: Generate a placeholder dynamically instead of changing the real image if we don't have real images
    const text = element.textContent;

    // We modify the main image style to show the overlay text or just ignore changing source since it's mock
    // For effect, we can slightly change opacity or rely on CSS
}
