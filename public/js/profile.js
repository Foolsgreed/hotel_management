document.addEventListener('DOMContentLoaded', () => {
    const guest = JSON.parse(localStorage.getItem('guest'));
    if (!guest) {
        alert('Please login to view profile.');
        window.location.href = '/login.html';
        return;
    }

    renderProfileInfo(guest);
    loadBookings(guest.GuestID);
    loadInvoices(guest.GuestID);
});

function switchTab(tabId) {
    // Update active nav
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

function renderProfileInfo(guest) {
    const container = document.getElementById('profile-info-container');
    container.innerHTML = `
        <div style="font-size: 1.1rem; line-height: 2;">
            <p><strong style="color:var(--primary); width: 120px; display:inline-block;">Full Name:</strong> ${guest.FirstName} ${guest.LastName}</p>
            <p><strong style="color:var(--primary); width: 120px; display:inline-block;">Email:</strong> ${guest.Email}</p>
            <p><strong style="color:var(--primary); width: 120px; display:inline-block;">Phone:</strong> ${guest.PhoneNo || 'N/A'}</p>
            <p><strong style="color:var(--primary); width: 120px; display:inline-block;">DOB:</strong> ${guest.DOB ? new Date(guest.DOB).toLocaleDateString() : 'N/A'}</p>
            <p><strong style="color:var(--primary); width: 120px; display:inline-block;">Gender:</strong> ${guest.Gender || 'N/A'}</p>
            <p><strong style="color:var(--primary); width: 120px; display:inline-block;">Passport/ID:</strong> ${guest.PassportNo || 'N/A'}</p>
        </div>
    `;
}

async function loadBookings(guestId) {
    const container = document.getElementById('bookings-container');
    try {
        const response = await fetch(`/api/bookings/guest/${guestId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const bookings = await response.json();
        
        container.innerHTML = '';
        if (bookings.length === 0) {
            container.innerHTML = '<p style="color:#aaa;">You have no bookings yet.</p>';
            return;
        }

        const groups = {};
        bookings.forEach(b => {
            const key = b.InvoiceNo; // Now grouping by InvoiceNo
            if (!groups[key]) groups[key] = [];
            groups[key].push(b);
        });

        const sortedKeys = Object.keys(groups).sort((a, b) => b - a);

        sortedKeys.forEach(key => {
            const group = groups[key];
            const b = group[0];
            const arrDate = new Date(b.ArrivalDate).toLocaleDateString('en-US');
            const depDate = new Date(b.DepartureDate).toLocaleDateString('en-US');
            const bookDate = new Date(b.BookingDate).toLocaleDateString('en-US');
            
            const invoiceNo = b.InvoiceNo;
            const roomsList = group.map(g => `${g.RoomNo} (${g.RoomType})`).join('<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');

            // Fix the null status bug by falling back to Pending
            const displayStatus = b.BookingStatus || 'Pending';
            const statusClass = `status-${displayStatus}`;

            const card = document.createElement('div');
            card.className = 'data-card';
            
            let actionBtns = '';
            // Only allow cancel if all are Confirmed or Pending (or null meaning Pending)
            const canCancel = group.some(g => (g.BookingStatus || 'Pending') !== 'Cancelled' && g.BookingStatus !== 'CheckedIn' && g.BookingStatus !== 'CheckedOut');
            if (canCancel) {
                const idsParam = group.map(g => g.BookingID).join(',');
                actionBtns += `<button class="btn btn-outline" style="border-color: #f44336; color: #f44336; padding: 0.4rem 1rem;" onclick="cancelGroupedBookings('${idsParam}')">Cancel Order</button>`;
            }

            card.innerHTML = `
                <div>
                    <h4>Order ID: #${invoiceNo}</h4>
                    <p>Rooms: <br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${roomsList}</p>
                    <p>Stay period: ${arrDate} ➔ ${depDate}</p>
                    <p>Booking Date: ${bookDate}</p>
                </div>
                <div style="text-align: right;">
                    <div class="status-badge ${statusClass}" style="margin-bottom: 1rem; display: inline-block;">${displayStatus}</div><br>
                    ${actionBtns}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = '<p style="color:red;">Error loading bookings.</p>';
    }
}

async function cancelGroupedBookings(bookingIdsStr) {
    const reason = prompt('Are you sure you want to cancel this entire booking order?\nPlease enter a reason for cancellation:');
    if (!reason) return; // User cancelled the prompt or entered empty string
    
    const guest = JSON.parse(localStorage.getItem('guest'));
    const ids = bookingIdsStr.split(',').map(id => parseInt(id));
    let hasError = false;
    for (let id of ids) {
        try {
            const response = await fetch(`/api/bookings/${id}/cancel`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guestId: guest.GuestID, cancelReason: reason })
            });
            if (!response.ok) hasError = true;
        } catch (e) {
            hasError = true;
        }
    }
    if (hasError) {
        alert('Some bookings could not be cancelled. Please contact support.');
    } else {
        alert('Booking order cancelled successfully!');
    }
    loadBookings(guest.GuestID);
    loadInvoices(guest.GuestID);
}


async function loadInvoices(guestId) {
    const container = document.getElementById('invoices-container');
    container.innerHTML = '<p>Loading...</p>';
    try {
        const billsRes = await fetch(`/api/bills/guest/${guestId}`);

        if (!billsRes.ok) throw new Error('Network error');

        const bills = await billsRes.json();
        
        container.innerHTML = '';
        
        if (bills.length === 0) {
            container.innerHTML = '<p style="color:#aaa;">You have no invoices yet.</p>';
            return;
        }

        bills.forEach(b => {
            const payDate = b.PaymentDate ? new Date(b.PaymentDate).toLocaleDateString('en-US') : 'N/A';
            const card = document.createElement('div');
            card.className = 'data-card';
            
            let actionBtn = '';
            if (b.PaymentStatus === 'Paid') {
                if (b.Rating) {
                    actionBtn = `<div style="color: gold; font-size: 1.2rem;">${'★'.repeat(b.Rating)}${'☆'.repeat(5-b.Rating)}</div>
                                 <small style="color: #888;">Reviewed</small>`;
                } else {
                    actionBtn = `<button class="btn btn-primary" style="padding: 0.4rem 1rem;" onclick="openReviewModal(${b.InvoiceNo})">Review</button>`;
                }
            }

            const statusColor = b.PaymentStatus === 'Paid' ? '#4CAF50' : '#f39c12';

            card.innerHTML = `
                <div>
                    <h4>Invoice ID: #${b.InvoiceNo}</h4>
                    <p>Rooms: ${b.RoomNo || 'N/A'}</p>
                    <p>Total Amount: $${b.TotalAmount || 0}</p>
                    <p>Status: <strong style="color: ${statusColor};">${b.PaymentStatus}</strong></p>
                    <p>Payment Mode: ${b.PaymentMode || 'N/A'}</p>
                    <p>Payment Date: ${payDate}</p>
                </div>
                <div style="text-align: right;">
                    ${actionBtn}
                </div>
            `;
            container.appendChild(card);
        });

    } catch (e) {
        container.innerHTML = '<p style="color:red;">Error loading invoices.</p>';
    }
}

function openReviewModal(invoiceNo) {
    document.getElementById('review-invoice-id').value = invoiceNo;
    document.getElementById('review-rating').value = "5";
    document.getElementById('review-comment').value = "";
    document.getElementById('review-modal').style.display = 'flex';
}

function closeReviewModal() {
    document.getElementById('review-modal').style.display = 'none';
}

async function submitReview() {
    const guest = JSON.parse(localStorage.getItem('guest'));
    const invoiceNo = document.getElementById('review-invoice-id').value;
    const rating = document.getElementById('review-rating').value;
    const comment = document.getElementById('review-comment').value;

    if (!comment) {
        alert('Please enter a comment.');
        return;
    }

    try {
        const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guestId: guest.GuestID,
                invoiceNo: invoiceNo,
                rating: parseInt(rating),
                comment: comment
            })
        });
        
        const result = await response.json();
        if (response.ok) {
            alert('Thank you for your review!');
            closeReviewModal();
            loadInvoices(guest.GuestID); // reload to show stars instead of button
        } else {
            alert(result.error || 'An error occurred.');
        }
    } catch (e) {
        console.error(e);
        alert('Server connection error.');
    }
}

function openEditProfileModal() {
    const guest = JSON.parse(localStorage.getItem('guest'));
    if(!guest) return;
    document.getElementById('edit-firstname').value = guest.FirstName || '';
    document.getElementById('edit-lastname').value = guest.LastName || '';
    document.getElementById('edit-phone').value = guest.PhoneNo || '';
    if(guest.DOB) {
        document.getElementById('edit-dob').value = guest.DOB.split('T')[0];
    }
    document.getElementById('edit-gender').value = guest.Gender || '';
    document.getElementById('edit-passport').value = guest.PassportNo || '';
    document.getElementById('edit-profile-modal').style.display = 'flex';
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').style.display = 'none';
}

document.getElementById('edit-profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('edit-profile-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const guest = JSON.parse(localStorage.getItem('guest'));
    const data = {
        guestId: guest.GuestID,
        FirstName: document.getElementById('edit-firstname').value,
        LastName: document.getElementById('edit-lastname').value,
        PhoneNo: document.getElementById('edit-phone').value,
        DOB: document.getElementById('edit-dob').value,
        Gender: document.getElementById('edit-gender').value,
        PassportNo: document.getElementById('edit-passport').value
    };

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            alert('Profile updated successfully!');
            localStorage.setItem('guest', JSON.stringify(result.user));
            renderProfileInfo(result.user);
            closeEditProfileModal();
        } else {
            alert(result.message || 'Error updating profile.');
        }
    } catch(err) {
        alert('Server connection error.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
});

function openChangePasswordModal() {
    document.getElementById('change-password-form').reset();
    document.getElementById('change-password-modal').style.display = 'flex';
}

document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('change-password-btn');
    const currentPassword = document.getElementById('cp-current').value;
    const newPassword = document.getElementById('cp-new').value;
    const confirmPassword = document.getElementById('cp-confirm').value;

    if (newPassword !== confirmPassword) {
        alert("New passwords do not match!");
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Changing...';

    const guest = JSON.parse(localStorage.getItem('guest'));
    const data = {
        guestId: guest.GuestID,
        currentPassword,
        newPassword
    };

    try {
        const response = await fetch('/api/auth/profile/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            alert('Password changed successfully!');
            document.getElementById('change-password-modal').style.display = 'none';
        } else {
            alert(result.message || 'Error changing password.');
        }
    } catch(err) {
        alert('Server connection error.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Change Password';
    }
});
