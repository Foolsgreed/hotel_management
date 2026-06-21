
const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    if(typeof resource === 'string' && resource.startsWith('/api/')) {
        if(!config) config = {};
        if(!config.headers) config.headers = {};
        const token = localStorage.getItem('token');
        if(token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await originalFetch(resource, config);
        if(response.status === 401) {
            alert('Session expired. Please login again.');
            localStorage.removeItem('employee');
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        }
        return response;
    }
    return originalFetch.apply(this, arguments);
};

let emp;

        document.addEventListener('DOMContentLoaded', () => {
            emp = JSON.parse(localStorage.getItem('employee'));
            if (!emp) {
                window.location.href = '/login.html';
                return;
            }

            // Profile corner
            document.getElementById('profile-initial').textContent = emp.FirstName.charAt(0).toUpperCase();
            document.getElementById('profile-name').textContent = emp.FirstName;
            document.getElementById('profile-role').textContent = emp.RoleTitle;

            // Permission-gate nav items
            const isAdmin = emp.RoleTitle === 'Admin';
            const isManager = emp.RoleTitle === 'Manager';
            const isRecep = emp.RoleTitle === 'Receptionist';
            const isHousekeeper = emp.RoleTitle === 'Housekeeper';
            
            const canManageEmployees = isAdmin || isManager;
            const canViewBookings = isRecep;
            const canViewRooms = isManager || isRecep || isHousekeeper;
            const canViewBills = isManager || isRecep;
            const canViewRevenue = isAdmin || isManager;

            if (!canViewBookings) document.getElementById('nav-bookings').style.display = 'none';
            if (!canViewRooms) document.getElementById('nav-rooms').style.display = 'none';
            if (!canViewBills) document.getElementById('nav-bills').style.display = 'none';
            if (!canViewRevenue) document.getElementById('nav-revenue').style.display = 'none';
            if (!canManageEmployees) document.getElementById('nav-employees').style.display = 'none';
            
            const hasPricingPerm = emp.Permissions && emp.Permissions.includes('manage_pricing');
            if (hasPricingPerm) {
                document.getElementById('manage-pricing-btn-container').style.display = 'block';
            } else {
                document.getElementById('manage-pricing-btn-container').style.display = 'none';
            }

            // Activate first visible tab
            const firstVisible = document.querySelector('.nav-item:not([style*="display: none"])');
            if (firstVisible) switchTab(firstVisible.dataset.tab);

            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', () => switchTab(item.dataset.tab));
            });

            document.addEventListener('click', () => {
                document.getElementById('profile-dropdown').style.display = 'none';
            });
        });

        function switchTab(tab) {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`nav-${tab}`).classList.add('active');
            document.getElementById(`tab-${tab}`).classList.add('active');
            
            let title = tab.charAt(0).toUpperCase() + tab.slice(1);
            if (tab === 'revenue') title = 'Revenue & Statistics';
            document.getElementById('tab-title').textContent = title;

            if (tab === 'bookings') fetchBookings();
            if (tab === 'rooms') fetchRooms();
            if (tab === 'bills') fetchBills();
            if (tab === 'employees') { fetchRoles(); fetchEmployees(); }
            if (tab === 'revenue') loadRevenueDashboard();
        }

        function toggleProfileMenu(e) {
            e.stopPropagation();
            const d = document.getElementById('profile-dropdown');
            d.style.display = d.style.display === 'none' ? 'block' : 'none';
        }

        function logout() {
            localStorage.removeItem('employee');
            window.location.href = '/login.html';
        }

        // ---------- BOOKINGS ----------
        // ---------- REVENUE & STATISTICS ----------
        let revTrendChartInst = null;
        let bookingStatusChartInst = null;

        async function loadRevenueDashboard() {
            try {
                const [bookingsRes, billsRes] = await Promise.all([
                    fetch(`/api/bookings`),
                    fetch(`/api/bills`)
                ]);
                
                if (!bookingsRes.ok || !billsRes.ok) return;
                
                const bookings = await bookingsRes.json();
                const bills = await billsRes.json();
                
                // 1. Calculate KPIs
                const paidBills = bills.filter(b => b.PaymentStatus === 'Paid');
                const totalRevenueBills = paidBills.reduce((sum, b) => sum + (Number(b.TotalAmount) || 0), 0);
                
                const completedBookings = bookings.filter(b => b.BookingStatus === 'CheckedOut');
                const totalRevenueBookings = bills.reduce((sum, b) => sum + (Number(b.TotalAmount) || 0), 0);
                
                const cancelledBookings = bookings.filter(b => b.BookingStatus === 'Cancelled');
                const cancelRate = bookings.length > 0 ? ((cancelledBookings.length / bookings.length) * 100).toFixed(1) : 0;
                
                document.getElementById('rev-total-bills').textContent = '$' + totalRevenueBills.toLocaleString();
                document.getElementById('rev-total-bookings').textContent = '$' + totalRevenueBookings.toLocaleString();
                document.getElementById('rev-completed').textContent = completedBookings.length;
                document.getElementById('rev-cancel-rate').textContent = cancelRate + '%';
                
                // 2. Prepare Data for Charts
                // Bookings by Status
                const statusCounts = { Pending: 0, Completed: 0, Cancelled: 0 };
                bookings.forEach(b => {
                    let st = b.BookingStatus;
                    if (st === 'CheckedOut') st = 'Completed';
                    if (statusCounts[st] !== undefined) statusCounts[st]++;
                });
                
                // Revenue Trend Logic
                const filter = document.getElementById('revenue-trend-filter') ? document.getElementById('revenue-trend-filter').value : 'monthly';
                const currentYear = new Date().getFullYear();
                let trendLabels = [];
                let trendData = [];
                let datasetLabel = 'Revenue ($)';

                if (filter === 'weekly') {
                    datasetLabel = 'Daily Revenue ($)';
                    if (document.getElementById('revenue-trend-title')) document.getElementById('revenue-trend-title').textContent = 'Revenue Trend (Last 7 Days)';
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    for (let i = 6; i >= 0; i--) {
                        const d = new Date(today);
                        d.setDate(today.getDate() - i);
                        trendLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                        trendData.push(0);
                    }
                    paidBills.forEach(b => {
                        if (!b.PaymentDate) return;
                        const bd = new Date(b.PaymentDate);
                        const label = bd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const idx = trendLabels.indexOf(label);
                        if (idx >= 0) {
                            trendData[idx] += (Number(b.TotalAmount) || 0);
                        }
                    });
                } else if (filter === 'yearly') {
                    datasetLabel = 'Yearly Revenue ($)';
                    if (document.getElementById('revenue-trend-title')) document.getElementById('revenue-trend-title').textContent = 'Revenue Trend (Yearly)';
                    for (let i = 4; i >= 0; i--) {
                        trendLabels.push((currentYear - i).toString());
                        trendData.push(0);
                    }
                    paidBills.forEach(b => {
                        if (!b.PaymentDate) return;
                        const year = parseInt(b.PaymentDate.substring(0, 4));
                        const idx = trendLabels.indexOf(year.toString());
                        if (idx >= 0) trendData[idx] += (Number(b.TotalAmount) || 0);
                    });
                } else {
                    datasetLabel = 'Monthly Revenue ($)';
                    if (document.getElementById('revenue-trend-title')) document.getElementById('revenue-trend-title').textContent = 'Revenue Trend (Monthly)';
                    trendLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    trendData = new Array(12).fill(0);
                    
                    paidBills.forEach(b => {
                        if (!b.PaymentDate) return;
                        const year = parseInt(b.PaymentDate.substring(0, 4));
                        const monthIndex = parseInt(b.PaymentDate.substring(5, 7)) - 1;
                        if (year === currentYear && monthIndex >= 0 && monthIndex < 12) {
                            trendData[monthIndex] += (Number(b.TotalAmount) || 0);
                        }
                    });
                }
                
                // 3. Render Charts
                const ctxTrend = document.getElementById('revenueTrendChart').getContext('2d');
                if (revTrendChartInst) revTrendChartInst.destroy();
                revTrendChartInst = new Chart(ctxTrend, {
                    type: 'line',
                    data: {
                        labels: trendLabels,
                        datasets: [{
                            label: datasetLabel,
                            data: trendData,
                            borderColor: '#cba052',
                            backgroundColor: 'rgba(203, 160, 82, 0.2)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { labels: { color: '#fff' } } },
                        scales: {
                            x: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                            y: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                        }
                    }
                });
                
                const ctxStatus = document.getElementById('bookingStatusChart').getContext('2d');
                if (bookingStatusChartInst) bookingStatusChartInst.destroy();
                bookingStatusChartInst = new Chart(ctxStatus, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(statusCounts),
                        datasets: [{
                            data: Object.values(statusCounts),
                            backgroundColor: ['#f1c40f', '#2ecc71', '#e74c3c'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { color: '#fff' } }
                        }
                    }
                });
                
            } catch (error) { console.error("Error loading revenue dashboard:", error); }
        }

        async function updateStatus(id, status) {
            let reason = null;
            if (status === 'Cancelled') {
                reason = prompt(`Are you sure you want to cancel this booking? \nPlease enter the reason:`);
                if (!reason) return; // cancelled prompt
            } else {
                if (!confirm(`Are you sure you want to mark this booking as ${status}?`)) return;
            }
            try {
                const res = await fetch(`/api/bookings/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status, cancelReason: reason })
                });
                if (res.ok) { fetchBookings(); }
                else { const err = await res.json(); alert(err.message || 'Failed to update status'); }
            } catch (error) { console.error(error); alert('Network error'); }
        }

        async function fetchBookings() {
            try {
                const response = await fetch(`/api/bookings`);
                const bookings = await response.json();
                const tbody = document.getElementById('bookings-tbody');

                if (response.status === 403) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">You do not have permission to view this.</td></tr>';
                    return;
                }

                tbody.innerHTML = '';
                if (bookings.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No bookings found.</td></tr>';
                    return;
                }

                bookings.forEach(b => {
                    const dr = new Date(b.ArrivalDate).toLocaleDateString();
                    const dp = new Date(b.DepartureDate).toLocaleDateString();
                    const bStatus = b.BookingStatus || 'Pending';
                    let statusClass = 'color: var(--primary);';
                    if (bStatus === 'CheckedIn') statusClass = 'color: #2ecc71;';
                    else if (bStatus === 'CheckedOut') statusClass = 'color: #3498db;';
                    else if (bStatus === 'Cancelled') statusClass = 'color: #e74c3c;';

                    let actions = `<button class="btn-action" style="background:#4a5568; color:#fff;" onclick="openBookingModal('${b.BookingID}', '${b.GuestName}', '${b.GuestPhone || ''}', '${b.GuestEmail || ''}', ${b.NumAdults || 1}, ${b.NumChildren || 0}, '${(b.SpecialReq || '').replace(/'/g, "\\'")}', '${(b.CancelReason || '').replace(/'/g, "\\'")}')">View</button>`;
                    const canManage = emp.RoleTitle === 'Admin' || emp.RoleTitle === 'Manager' || emp.RoleTitle === 'Receptionist';
                    if (canManage) {
                        if (bStatus === 'Pending' || bStatus === 'Confirmed') {
                            actions += `<button class="btn-action btn-checkin" onclick="openCheckInModal(${b.BookingID})">Check In</button>`;
                            actions += `<button class="btn-action btn-cancel" onclick="updateStatus(${b.BookingID}, 'Cancelled')">Cancel</button>`;
                        } else if (bStatus === 'CheckedIn') {
                            actions += `<button class="btn-action btn-checkout" onclick="updateStatus(${b.BookingID}, 'CheckedOut')">Check Out</button>`;
                        }
                    }

                    tbody.innerHTML += `
                        <tr>
                            <td>#${b.BookingID}</td>
                            <td>${b.GuestName}</td>
                            <td>${b.RoomType}</td>
                            <td>${dr}</td>
                            <td>${dp}</td>
                            <td style="${statusClass} font-weight: 600;">${bStatus}</td>
                            <td style="display:flex; gap:0.5rem; justify-content:center;">${actions}</td>
                        </tr>
                    `;
                });
            } catch (error) { console.error(error); }
        }

        async function openCheckInModal(invoiceNo) {
            try {
                const res = await fetch(`/api/bookings/${invoiceNo}/details`);
                const data = await res.json();
                
                document.getElementById('checkin-invoice-no').textContent = invoiceNo;
                const container = document.getElementById('checkin-rooms-container');
                container.innerHTML = '';
                
                data.bookings.forEach((b, index) => {
                    const roomType = b.RoomType || 'Unassigned Type';
                    
                    if (b.RoomNo) {
                        container.innerHTML += `
                            <div style="background: var(--bg-dark); padding: 1rem; border-radius: 8px;">
                                <div style="margin-bottom:0.5rem;"><strong>Booking ID:</strong> #${b.BookingID} (${roomType})</div>
                                <div style="color: #2ecc71;"><strong>Assigned Room:</strong> ${b.RoomNo}</div>
                            </div>
                        `;
                    } else {
                        let options = '<option value="">Select Room</option>';
                        Object.keys(data.availableRooms).forEach(type => {
                            const groupRooms = data.availableRooms[type];
                            if (groupRooms && groupRooms.length > 0) {
                                options += `<optgroup label="${type}">`;
                                groupRooms.forEach(r => {
                                    options += `<option value="${r}">${r}</option>`;
                                });
                                options += `</optgroup>`;
                            }
                        });
                        
                        container.innerHTML += `
                            <div style="background: var(--bg-dark); padding: 1rem; border-radius: 8px;">
                                <div style="margin-bottom:0.5rem;"><strong>Booking ID:</strong> #${b.BookingID} (${roomType})</div>
                                <select class="checkin-room-select" data-bookingid="${b.BookingID}" data-roomtype="${roomType}" style="width:100%; padding:8px; border-radius:4px; border:1px solid #4a5568; background:#1a202c; color:#fff;">
                                    ${options}
                                </select>
                            </div>
                        `;
                    }
                });
                
                document.getElementById('checkin-modal').style.display = 'flex';
            } catch (error) {
                console.error(error);
                alert('Failed to load booking details');
            }
        }

        async function submitCheckIn() {
            const invoiceNo = document.getElementById('checkin-invoice-no').textContent;
            const selects = document.querySelectorAll('.checkin-room-select');
            
            const assignments = [];
            const selectedRooms = new Set();
            for (let select of selects) {
                const roomNo = select.value;
                if (!roomNo) {
                    alert(`Please select a room for all bookings.`);
                    return;
                }
                if (selectedRooms.has(roomNo)) {
                    alert(`Room ${roomNo} is selected multiple times.`);
                    return;
                }
                selectedRooms.add(roomNo);
                assignments.push({ bookingId: select.dataset.bookingid, roomNo: roomNo });
            }
            
            try {
                const res = await fetch(`/api/bookings/${invoiceNo}/checkin`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assignments })
                });
                
                if (res.ok) {
                    document.getElementById('checkin-modal').style.display = 'none';
                    fetchBookings();
                } else {
                    const err = await res.json();
                    alert(err.message || 'Failed to check in');
                }
            } catch (error) {
                console.error(error);
                alert('Network error');
            }
        }

        function openBookingModal(invoiceNo, name, phone, email, adults, children, req, cancelReason) {
            document.getElementById('modal-invoice-no').textContent = invoiceNo;
            document.getElementById('modal-guest-name').textContent = name;
            document.getElementById('modal-guest-phone').textContent = phone;
            document.getElementById('modal-guest-email').textContent = email;
            document.getElementById('modal-adults').textContent = adults;
            document.getElementById('modal-children').textContent = children;
            document.getElementById('modal-special-req').textContent = req || 'None';
            
            const cancelContainer = document.getElementById('modal-cancel-reason-container');
            if (cancelReason) {
                document.getElementById('modal-cancel-reason').textContent = cancelReason;
                cancelContainer.style.display = 'block';
            } else {
                cancelContainer.style.display = 'none';
            }
            
            document.getElementById('booking-modal').style.display = 'flex';
        }

        async function fetchRooms() {
            try {
                const response = await fetch(`/api/rooms/status`);
                const rooms = await response.json();
                const tbody = document.getElementById('rooms-tbody');

                if (response.status === 403) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">You do not have permission to view this.</td></tr>';
                    return;
                }

                tbody.innerHTML = '';
                let displayRooms = rooms;
                if (emp.RoleTitle === 'Housekeeper') {
                    displayRooms = rooms.filter(r => r.RoomStatus === 'Cleaning');
                }

                if (displayRooms.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No rooms found.</td></tr>';
                    return;
                }

                displayRooms.forEach(r => {
                    const status = r.RoomStatus || 'Available';
                    const statusClass = 'status-' + status.toLowerCase();
                    let actionHtml = '';

                    if (emp.RoleTitle === 'Manager' || emp.RoleTitle === 'Receptionist') {
                        if (status === 'Available') {
                            actionHtml = `<button class="btn-action" style="background:#f39c12; color:#fff; margin-left:10px;" onclick="updateRoomStatus('${r.RoomNo}', 'Cleaning')">Needs Cleaning</button>`;
                            actionHtml += `<button class="btn-action" style="background:#e74c3c; color:#fff; margin-left:10px;" onclick="updateRoomStatus('${r.RoomNo}', 'Maintenance')">To Maintenance</button>`;
                        } else if (status === 'Cleaning' || status === 'Maintenance') {
                            actionHtml = `<button class="btn-action btn-checkin" style="margin-left:10px;" onclick="updateRoomStatus('${r.RoomNo}', 'Available')">To Available</button>`;
                        }
                    } else if (emp.RoleTitle === 'Housekeeper') {
                        if (status === 'Cleaning') {
                            actionHtml = `<button class="btn-action btn-checkin" style="margin-left:10px;" onclick="updateRoomStatus('${r.RoomNo}', 'Available')">Mark Cleaned</button>`;
                        }
                    }

                    const badgeHtml = `<span class="room-status-badge ${statusClass}">${status}</span>`;
                    const statusCell = badgeHtml + actionHtml;

                    tbody.innerHTML += `
                        <tr>
                            <td>${r.RoomNo}</td>
                            <td>${r.RoomType}</td>
                            <td>${r.FloorNo}</td>
                            <td>Max ${r.Occupancy}</td>
                            <td>$${r.RoomPrice}</td>
                            <td>${statusCell}</td>
                        </tr>
                    `;
                });
            } catch (error) { console.error(error); }
        }

        async function updateRoomStatus(roomNo, status) {
            try {
                const res = await fetch(`/api/rooms/${roomNo}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                if (!res.ok) { 
                    const err = await res.json(); 
                    alert(err.message || 'Failed to update room status'); 
                } else {
                    fetchRooms();
                }
            } catch (error) { console.error(error); alert('Network error'); }
        }

        // ---------- BILLS ----------
        async function fetchBills() {
            try {
                const response = await fetch(`/api/bills`);
                const bills = await response.json();
                const tbody = document.getElementById('bills-tbody');

                if (response.status === 403) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">You do not have permission to view this.</td></tr>';
                    return;
                }

                tbody.innerHTML = '';
                if (bills.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No bills found.</td></tr>';
                    return;
                }

                const canManage = emp.RoleTitle === 'Admin' || emp.RoleTitle === 'Manager' || emp.RoleTitle === 'Receptionist';

                bills.forEach(b => {
                    const statusClass = b.PaymentStatus === 'Paid' ? 'color:#2ecc71;' : 'color:#f39c12;';
                    let actions = `<button class="btn-action" style="background:#4a5568; color:#fff;" onclick="openBillModal(${b.InvoiceNo})">View</button>`;
                    if (canManage && b.PaymentStatus !== 'Paid') {
                        actions += `<button class="btn-action btn-checkin" onclick="payInvoice(${b.InvoiceNo}, 'Cash')">Pay (Cash)</button>
                           <button class="btn-action btn-checkout" onclick="payInvoice(${b.InvoiceNo}, 'Credit Card')">Pay (Card)</button>`;
                    }

                    tbody.innerHTML += `
                        <tr>
                            <td>#${b.InvoiceNo}</td>
                            <td>${b.GuestName}</td>
                            <td>$${Number(b.TotalAmount).toLocaleString()}</td>
                            <td style="${statusClass} font-weight:600;">${b.PaymentStatus}</td>
                            <td>${b.PaymentMode || '-'}</td>
                            <td>${b.PaymentDate ? new Date(b.PaymentDate).toLocaleDateString() : '-'}</td>
                            <td style="display:flex; gap:0.5rem; justify-content:center;">${actions}</td>
                        </tr>
                    `;
                });
            } catch (error) { console.error(error); }
        }

        async function openBillModal(invoiceNo) {
            try {
                const res = await fetch(`/api/bills/${invoiceNo}`);
                if (!res.ok) throw new Error('Failed to fetch bill');
                const bill = await res.json();

                document.getElementById('bill-modal-invoice-no').textContent = bill.InvoiceNo;
                document.getElementById('bill-modal-guest-name').textContent = bill.GuestName;
                document.getElementById('bill-modal-guest-phone').textContent = bill.PhoneNo || 'N/A';
                document.getElementById('bill-modal-guest-email').textContent = bill.Email || 'N/A';
                document.getElementById('bill-modal-total').textContent = '$' + Number(bill.TotalAmount).toLocaleString();
                document.getElementById('bill-modal-status').textContent = bill.PaymentStatus;
                document.getElementById('bill-modal-mode').textContent = bill.PaymentMode || 'N/A';
                document.getElementById('bill-modal-date').textContent = bill.PaymentDate ? new Date(bill.PaymentDate).toLocaleDateString() : 'N/A';

                const bookingsTbody = document.getElementById('bill-modal-bookings-tbody');
                bookingsTbody.innerHTML = '';
                if (bill.bookings && bill.bookings.length > 0) {
                    bill.bookings.forEach(b => {
                        bookingsTbody.innerHTML += `
                            <tr>
                                <td>#${b.BookingID}</td>
                                <td>${b.RoomType}</td>
                                <td>${b.RoomNo || 'N/A'}</td>
                                <td>${new Date(b.ArrivalDate).toLocaleDateString()} - ${new Date(b.DepartureDate).toLocaleDateString()}</td>
                            </tr>
                        `;
                    });
                } else {
                    bookingsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No bookings found.</td></tr>';
                }

                document.getElementById('bill-modal').style.display = 'flex';
            } catch (error) {
                console.error(error);
                alert('Failed to load bill details.');
            }
        }

        async function payInvoice(invoiceNo, paymentMode) {
            if (!confirm(`Mark this invoice as paid with ${paymentMode}?`)) return;
            try {
                const res = await fetch(`/api/bills/pay/${invoiceNo}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentMode: paymentMode })
                });
                if (res.ok) fetchBills();
                else { const err = await res.json(); alert(err.message || 'Failed to update invoice'); }
            } catch (error) { console.error(error); alert('Network error'); }
        }

        // ---------- EMPLOYEES ----------
        async function fetchRoles() {
            try {
                const response = await fetch(`/api/employees/roles`);
                if (!response.ok) return;
                const roles = await response.json();
                const select = document.getElementById('emp-role');
                const editSelect = document.getElementById('edit-emp-role');
                select.innerHTML = '<option value="">Select Role...</option>';
                editSelect.innerHTML = '<option value="">Select Role...</option>';
                roles.forEach(r => {
                    select.innerHTML += `<option value="${r.RoleID}" style="color:#000;">${r.RoleTitle}</option>`;
                    editSelect.innerHTML += `<option value="${r.RoleID}" style="color:#000;">${r.RoleTitle}</option>`;
                });
            } catch (err) { console.error(err); }
        }

        let allEmployeesData = [];
        async function fetchEmployees() {
            try {
                const response = await fetch(`/api/employees`);
                const tbody = document.getElementById('employees-tbody');
                if (response.status === 403) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">You do not have permission to view this.</td></tr>';
                    return;
                }
                const employees = await response.json();
                allEmployeesData = employees;
                tbody.innerHTML = '';
                const groupedEmployees = {};
                employees.forEach(e => {
                    if (!groupedEmployees[e.RoleTitle]) groupedEmployees[e.RoleTitle] = [];
                    groupedEmployees[e.RoleTitle].push(e);
                });

                const sortOrder = ['Admin', 'Receptionist', 'Manager', 'Housekeeper'];
                const sortedEntries = Object.entries(groupedEmployees).sort((a, b) => {
                    let indexA = sortOrder.indexOf(a[0]);
                    let indexB = sortOrder.indexOf(b[0]);
                    if (indexA === -1) indexA = 999;
                    if (indexB === -1) indexB = 999;
                    return indexA - indexB;
                });

                for (const [role, emps] of sortedEntries) {
                    tbody.innerHTML += `<tr><td colspan="5" style="background:#2d3748; color:#a0aec0; font-weight:bold; padding:10px;">${role}</td></tr>`;
                    emps.forEach(e => {
                        let actionBtns = '-';
                        if (e.EmployeeID != 1) { 
                            if (e.RoleTitle === 'Manager' && emp.RoleTitle !== 'Admin') {
                                // Manager cannot edit/delete another Manager
                            } else if (e.RoleTitle === 'Admin' && emp.RoleTitle !== 'Admin') {
                                // Manager cannot edit/delete Admin
                            } else {
                                actionBtns = `
                                    <button class="btn-action" style="background:rgba(243, 156, 18, 0.2); color:#f39c12; border:1px solid rgba(243, 156, 18, 0.4);" onclick="openEditEmployee(${e.EmployeeID})">Edit</button>
                                    <button class="btn-action btn-cancel" onclick="deleteEmployee(${e.EmployeeID})">Delete</button>
                                `;
                            }
                        } else if (emp.RoleTitle === 'Admin') {
                            actionBtns = `
                                <button class="btn-action" style="background:rgba(243, 156, 18, 0.2); color:#f39c12; border:1px solid rgba(243, 156, 18, 0.4);" onclick="openEditEmployee(${e.EmployeeID})">Edit</button>
                            `;
                        }

                        tbody.innerHTML += `
                            <tr>
                                <td>#${e.EmployeeID}</td>
                                <td>${e.FirstName} ${e.LastName}</td>
                                <td>${e.Email}</td>
                                <td><span class="room-status-badge status-occupied">${e.RoleTitle}</span></td>
                                <td>${actionBtns}</td>
                            </tr>
                        `;
                    });
                }
            } catch (err) { console.error(err); }
        }

        document.getElementById('add-employee-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                firstName: document.getElementById('emp-first-name').value,
                lastName: document.getElementById('emp-last-name').value,
                email: document.getElementById('emp-email').value,
                phoneNo: document.getElementById('emp-phone').value,
                dob: document.getElementById('emp-dob').value,
                gender: document.getElementById('emp-gender').value,
                salary: document.getElementById('emp-salary').value,
                password: document.getElementById('emp-password').value,
                roleId: document.getElementById('emp-role').value,
                hotelCode: document.getElementById('emp-hotel-code').value
            };
            try {
                const res = await fetch('/api/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    document.getElementById('add-employee-form').reset();
                    document.getElementById('add-employee-form-container').style.display = 'none';
                    fetchEmployees();
                } else {
                    const err = await res.json();
                    alert(err.message || 'Failed to add employee');
                }
            } catch (err) { console.error(err); alert('Network error'); }
        });
        
        function openEditEmployee(id) {
            const e = allEmployeesData.find(x => x.EmployeeID === id);
            if (!e) return;
            document.getElementById('edit-emp-id').value = e.EmployeeID;
            document.getElementById('edit-emp-first-name').value = e.FirstName || '';
            document.getElementById('edit-emp-last-name').value = e.LastName || '';
            document.getElementById('edit-emp-email').value = e.Email || '';
            document.getElementById('edit-emp-phone').value = e.PhoneNo || '';
            
            const dobInput = document.getElementById('edit-emp-dob');
            if (e.DOB) {
                dobInput.type = 'date';
                dobInput.value = new Date(e.DOB).toISOString().split('T')[0];
            } else {
                dobInput.type = 'text';
                dobInput.value = '';
            }

            document.getElementById('edit-emp-gender').value = e.Gender || '';
            document.getElementById('edit-emp-salary').value = e.Salary || '';
            document.getElementById('edit-emp-role').value = e.RoleID || '';
            document.getElementById('edit-emp-hotel-code').value = e.HotelCode || 1;
            document.getElementById('edit-employee-modal').style.display = 'flex';
        }

        document.getElementById('edit-employee-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-emp-id').value;
            const data = {
                firstName: document.getElementById('edit-emp-first-name').value,
                lastName: document.getElementById('edit-emp-last-name').value,
                email: document.getElementById('edit-emp-email').value,
                phoneNo: document.getElementById('edit-emp-phone').value,
                dob: document.getElementById('edit-emp-dob').value,
                gender: document.getElementById('edit-emp-gender').value,
                salary: document.getElementById('edit-emp-salary').value,
                roleId: document.getElementById('edit-emp-role').value,
                hotelCode: document.getElementById('edit-emp-hotel-code').value
            };
            try {
                const res = await fetch(`/api/employees/${id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    document.getElementById('edit-employee-modal').style.display = 'none';
                    fetchEmployees();
                } else {
                    const err = await res.json();
                    alert(err.message || 'Failed to update employee');
                }
            } catch (err) { console.error(err); alert('Network error'); }
        });

        async function deleteEmployee(id) {
            if (!confirm('Are you sure you want to delete this employee?')) return;
            try {
                const res = await fetch(`/api/employees/${id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requesterRole: emp.RoleTitle })
                });
                if (res.ok) fetchEmployees();
                else {
                    const err = await res.json();
                    alert(err.message || 'Failed to delete employee');
                }
            } catch (err) { console.error(err); alert('Network error'); }
        }
        // Walk-in booking JS
        async function checkAvailableRoomsForWalkin() {
            const arr = document.getElementById('walkin-arrival').value;
            const dep = document.getElementById('walkin-departure').value;
            const select = document.getElementById('walkin-room-select');
            
            if (!arr || !dep || new Date(arr) >= new Date(dep)) {
                select.innerHTML = '<div style="color:#ccc; grid-column: 1 / -1;">Select valid dates first</div>';
                return;
            }

            try {
                const res = await fetch('/api/rooms/available-specific', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ arrivalDate: arr, departureDate: dep })
                });
                if (res.ok) {
                    const rooms = await res.json();
                    select.innerHTML = '';
                    if (rooms.length === 0) {
                        select.innerHTML = '<div style="color:#e74c3c; grid-column: 1 / -1;">No rooms available</div>';
                    } else {
                        rooms.forEach(r => {
                            const lbl = document.createElement('label');
                            lbl.style.display = 'flex';
                            lbl.style.alignItems = 'center';
                            lbl.style.gap = '0.5rem';
                            lbl.style.background = 'rgba(255, 255, 255, 0.1)';
                            lbl.style.padding = '0.5rem';
                            lbl.style.borderRadius = '6px';
                            lbl.style.cursor = 'pointer';
                            lbl.style.color = '#fff';
                            lbl.style.fontSize = '0.9rem';
                            
                            const cb = document.createElement('input');
                            cb.type = 'checkbox';
                            cb.value = r.RoomNo;
                            cb.className = 'walkin-room-checkbox';
                            cb.style.cursor = 'pointer';

                            const text = document.createElement('span');
                            text.innerHTML = `<b>${r.RoomNo}</b><br><small style="color:#aaa;">${r.RoomType}</small>`;
                            
                            lbl.appendChild(cb);
                            lbl.appendChild(text);
                            select.appendChild(lbl);
                        });
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }

        document.getElementById('walkin-arrival').addEventListener('change', checkAvailableRoomsForWalkin);
        document.getElementById('walkin-departure').addEventListener('change', checkAvailableRoomsForWalkin);

        document.getElementById('walkin-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const firstName = document.getElementById('walkin-fname').value;
            const lastName = document.getElementById('walkin-lname').value;
            const email = document.getElementById('walkin-email').value;
            const phoneNo = document.getElementById('walkin-phone').value;
            const arrivalDate = document.getElementById('walkin-arrival').value;
            const departureDate = document.getElementById('walkin-departure').value;
            const numAdults = document.getElementById('walkin-adults').value;
            const numChildren = document.getElementById('walkin-children').value;
            
            const checkboxes = document.querySelectorAll('.walkin-room-checkbox:checked');
            const roomNos = Array.from(checkboxes).map(cb => cb.value);
            
            if (roomNos.length === 0) return alert('Please select at least one room.');

            try {
                const res = await fetch('/api/bookings/walkin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firstName, lastName, email, phoneNo, arrivalDate, departureDate, numAdults, numChildren, roomNos
                    })
                });
                if (res.ok) {
                    alert('Walk-in booking created successfully!');
                    document.getElementById('walkin-modal').style.display='none';
                    document.getElementById('walkin-form').reset();
                    document.getElementById('walkin-room-select').innerHTML = '<div style="color:#ccc; grid-column: 1 / -1;">Select dates first</div>';
                    fetchBookings();
                    
                } else {
                    const err = await res.json();
                    alert(err.message || 'Failed to create booking');
                }
            } catch (e) {
                alert('Network error');
            }
        });

        // Pricing logic
        async function openPricingModal() {
            try {
                const res = await fetch('/api/rooms/types');
                const types = await res.json();
                const tbody = document.getElementById('pricing-tbody');
                tbody.innerHTML = '';
                types.forEach(t => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${t.RoomType}</td>
                            <td><input type="number" id="price-${t.RoomType.replace(/\s+/g, '-')}" value="${t.RoomPrice}" style="width:80px; padding:0.2rem; background:var(--glass-bg); color:#fff; border:1px solid var(--glass-border); border-radius:4px;"></td>
                            <td><button class="btn-action" style="background:#2ecc71; color:#fff;" onclick="savePrice('${t.RoomType}')">Save</button></td>
                        </tr>
                    `;
                });
                document.getElementById('pricing-modal').style.display = 'flex';
            } catch (err) { console.error(err); alert('Failed to load prices'); }
        }

        async function savePrice(type) {
            const price = document.getElementById(`price-${type.replace(/\s+/g, '-')}`).value;
            try {
                const res = await fetch(`/api/rooms/types/${encodeURIComponent(type)}/price`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ price })
                });
                if (res.ok) {
                    alert('Price updated successfully');
                    fetchRooms();
                } else {
                    alert('Failed to update price');
                }
            } catch (err) { console.error(err); alert('Network error'); }
        }