// ===== ДАННЫЕ И ПЕРЕМЕННЫЕ =====
let cars = JSON.parse(localStorage.getItem('cars')) || [];
let currentEditCarName = '';
let currentEditTripIndex = -1;
let currentRenameCarName = '';
let currentNotesCarName = '';
let currentTripsCarName = '';
let filteredCars = [];

// ПАГИНАЦИЯ
let currentPage = 1;
const itemsPerPage = 5; // Максимум 5 машин на странице

// ===== БАЗОВЫЕ ФУНКЦИИ =====

function saveCars() {
    localStorage.setItem('cars', JSON.stringify(cars));
}

function isCarNameUnique(name) {
    return !cars.some(car => car.name.toLowerCase() === name.toLowerCase());
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    const carNameInput = document.getElementById('carName');
    carNameInput.classList.add('error');
    setTimeout(() => {
        errorElement.textContent = '';
        carNameInput.classList.remove('error');
    }, 3000);
}

function showNotification(message, title = "ВНИМАНИЕ!") {
    const notification = document.getElementById('fullscreenNotification');
    const titleElement = document.getElementById('notificationTitle');
    const messageElement = document.getElementById('notificationMessage');
    titleElement.textContent = title;
    messageElement.textContent = message;
    notification.classList.add('show');
}

function hideNotification() {
    document.getElementById('fullscreenNotification').classList.remove('show');
}

// ===== CSRF ТОКЕН ДЛЯ DJANGO =====

function getCsrfToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ===== СИНХРОНИЗАЦИЯ С СЕРВЕРОМ =====

async function syncToServer(endpoint, data) {
    try {
        await fetch(`/api/sync/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(data)
        });
    } catch (err) {
        console.warn('⚠️ Ошибка синхронизации:', err);
    }
}

// ===== ОСНОВНЫЕ ФУНКЦИИ (со встроенной синхронизацией) =====

function addCar(name) {
    if (!name.trim()) { showError('Введите название машины'); return; }
    if (!isCarNameUnique(name)) { showError('Машина с таким названием уже существует'); return; }

    const car = {
        name: name.trim(),
        trips: [],
        oilCheckDate: '', tireCheckDate: '',
        oilCheckKm: 0, tireCheckKm: 0,
        oilInterval: 50000, tireInterval: 60000,
        notes: ''
    };
    cars.push(car);
    saveCars();
    renderCars();
    showNotification(`Машина "${name}" добавлена`);

    // Синхронизация с сервером
    syncToServer('cars/', {
        name: name,
        oilInterval: car.oilInterval,
        tireInterval: car.tireInterval,
        notes: car.notes
    });
}

function deleteCar(carName) {
    cars = cars.filter(car => car.name !== carName);
    saveCars();

    // Пересчитываем filteredCars после удаления
    const term = document.getElementById('searchInput').value.toLowerCase().trim();
    filteredCars = term ? cars.filter(c => c.name.toLowerCase().includes(term)) : [...cars];

    // Проверка пагинации после удаления
    const totalPages = Math.ceil(filteredCars.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    } else if (totalPages === 0) {
        currentPage = 1;
    }

    renderCars();
    showNotification(`Машина "${carName}" удалена`);

    // Синхронизация
    syncToServer(`cars/${encodeURIComponent(carName)}/delete/`, {});
}

function addTrip(carName, km, date) {
    const car = cars.find(c => c.name === carName);
    if (!car) return;
    car.trips.push({ km: parseInt(km), date: date });
    saveCars();
    renderCars();
    checkAndShowNotifications();

    // Синхронизация
    syncToServer(`cars/${encodeURIComponent(carName)}/trips/`, { km, date });
}

function editTrip(carName, index, newKm, newDate) {
    const car = cars.find(c => c.name === carName);
    if (!car) return;
    car.trips[index].km = parseInt(newKm);
    car.trips[index].date = newDate;
    saveCars();
    renderCars();
    showNotification('Запись о пробеге обновлена');
    checkAndShowNotifications();

    // Синхронизация всех поездок (простой способ)
    syncToServer('trips/by-car/', { carName, trips: car.trips });
}

function deleteTrip(carName, index) {
    const car = cars.find(c => c.name === carName);
    if (!car) return;
    car.trips.splice(index, 1);
    saveCars();
    renderCars();
    showNotification('Запись о пробеге удалена');
    checkAndShowNotifications();

    // Синхронизация
    syncToServer('trips/by-car/', { carName, trips: car.trips });
}

function saveNotes() {
    if (currentNotesCarName === '') return;
    const notes = document.getElementById('notesTextarea').value;
    const car = cars.find(c => c.name === currentNotesCarName);
    if (car) {
        car.notes = notes;
        saveCars();
        renderCars();
        showNotification(`Заметки сохранены`);
        syncToServer(`cars/${encodeURIComponent(currentNotesCarName)}/notes/`, { notes });
    }
    closeNotesModal();
}

function setIntervals(carName, oilInterval, tireInterval) {
    const car = cars.find(c => c.name === carName);
    if (!car) return;

    car.oilInterval = parseInt(oilInterval) || car.oilInterval;
    car.tireInterval = parseInt(tireInterval) || car.tireInterval;

    saveCars();
    renderCars();
    showNotification('Интервалы обновлены');
    checkAndShowNotifications();

    // Синхронизация
    syncToServer(`cars/${encodeURIComponent(carName)}/maintenance/`, {
        oilInterval: car.oilInterval,
        tireInterval: car.tireInterval
    });
}

function saveRenamedCar() {
    if (currentRenameCarName === '') return;
    const newName = document.getElementById('renameInput').value.trim();
    if (!newName) { showError('Введите название'); return; }
    if (!isCarNameUnique(newName) && newName !== currentRenameCarName) {
        showError('Машина с таким названием уже существует'); return;
    }

    const car = cars.find(c => c.name === currentRenameCarName);
    if (car) {
        const oldName = car.name;
        car.name = newName;
        saveCars();
        renderCars();
        showNotification(`"${oldName}" → "${newName}"`);

        // Синхронизация
        syncToServer(`cars/${encodeURIComponent(oldName)}/rename/`, { new_name: newName });
    }
    closeRenameModal();
}

// ===== ЛОГИКА ТО =====

function calculateTotalKm(car) {
    return car.trips.reduce((sum, trip) => sum + trip.km, 0);
}

function getLatestMaintenanceDates(car) {
    let lastOilChangeKm = 0, lastOilChangeDate = '';
    let lastTireChangeKm = 0, lastTireChangeDate = '';

    for (let i = car.trips.length - 1; i >= 0; i--) {
        const trip = car.trips[i];
        if (trip.km >= lastOilChangeKm + car.oilInterval) {
            lastOilChangeKm = trip.km;
            lastOilChangeDate = trip.date;
        }
        if (trip.km >= lastTireChangeKm + car.tireInterval) {
            lastTireChangeKm = trip.km;
            lastTireChangeDate = trip.date;
        }
    }

    car.oilCheckKm = lastOilChangeKm;
    car.oilCheckDate = lastOilChangeDate;
    car.tireCheckKm = lastTireChangeKm;
    car.tireCheckDate = lastTireChangeDate;

    return {
        oil: { km: lastOilChangeKm, date: lastOilChangeDate },
        tire: { km: lastTireChangeKm, date: lastTireChangeDate }
    };
}

function checkAndShowNotifications() {
    let notifications = [];
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    let somethingChanged = false;

    cars.forEach(car => {
        const totalKm = calculateTotalKm(car);
        const maintenanceData = getLatestMaintenanceDates(car);

        if (totalKm >= maintenanceData.oil.km + car.oilInterval) {
            notifications.push(`${car.name}: Замените масло (каждые ${car.oilInterval} км)`);
            car.oilCheckDate = dateString;
            car.oilCheckKm = totalKm;
            somethingChanged = true;
        }
        if (totalKm >= maintenanceData.tire.km + car.tireInterval) {
            notifications.push(`${car.name}: Замените резину (каждые ${car.tireInterval} км)`);
            car.tireCheckDate = dateString;
            car.tireCheckKm = totalKm;
            somethingChanged = true;
        }
    });

    if (somethingChanged) { saveCars(); renderCars(); }
    if (notifications.length > 0) {
        showNotification(notifications.join('\n\n'), "ПРЕДУПРЕЖДЕНИЯ!");
    }
}

// ===== МОДАЛЬНЫЕ ОКНА =====

function openNotesModal(carName) {
    const car = cars.find(c => c.name === carName);
    if (!car) return;
    currentNotesCarName = carName;
    document.getElementById('notesTextarea').value = car.notes || '';
    document.getElementById('notesModal').style.display = 'block';
}
function closeNotesModal() { document.getElementById('notesModal').style.display = 'none'; currentNotesCarName = ''; }

function openEditModal(carName, index) {
    const car = cars.find(c => c.name === carName);
    if (!car) return;
    currentEditCarName = carName;
    currentEditTripIndex = index;
    document.getElementById('editKm').value = car.trips[index].km;
    document.getElementById('editDate').value = car.trips[index].date;
    document.getElementById('editModal').style.display = 'block';
}
function closeEditModal() { document.getElementById('editModal').style.display = 'none'; currentEditCarName = ''; currentEditTripIndex = -1; }
function saveEditedTrip() {
    if (currentEditCarName && currentEditTripIndex >= 0) {
        editTrip(currentEditCarName, currentEditTripIndex,
                 document.getElementById('editKm').value,
                 document.getElementById('editDate').value);
        closeEditModal();
    }
}

function openRenameModal(carName) {
    currentRenameCarName = carName;
    document.getElementById('renameInput').value = carName;
    document.getElementById('renameModal').style.display = 'block';
}
function closeRenameModal() { document.getElementById('renameModal').style.display = 'none'; currentRenameCarName = ''; }

// ===== ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА ПРОБЕГА =====

function openTripsModal(carName) {
    const car = cars.find(c => c.name === carName);
    if (!car) return;

    currentTripsCarName = carName;
    const tripsList = document.getElementById('tripsList');

    if (car.trips.length === 0) {
        tripsList.innerHTML = '<p style="text-align:center;color:#888;">Нет записей о пробеге</p>';
    } else {
        tripsList.innerHTML = car.trips.slice().reverse().map((trip, idx) => {
            const realIndex = car.trips.length - 1 - idx;
            return `<div class="trip-item">
                <span> Дата: ${trip.date} |  Пробег: ${trip.km} км</span>
                <div class="trip-item-actions">
                    <button class="edit-btn" onclick="openEditModalFromTrips('${car.name}', ${realIndex})">Изменить</button>
                    <button class="delete-btn" onclick="deleteTripFromModal('${car.name}', ${realIndex})">Удалить</button>
                </div>
            </div>`;
        }).join('');
    }

    document.getElementById('tripsModal').style.display = 'block';
}

function closeTripsModal() {
    document.getElementById('tripsModal').style.display = 'none';
    currentTripsCarName = '';
}

function openEditModalFromTrips(carName, index) {
    closeTripsModal();
    setTimeout(() => {
        openEditModal(carName, index);
    }, 200);
}

function deleteTripFromModal(carName, index) {
    deleteTrip(carName, index);
    setTimeout(() => {
        openTripsModal(carName);
    }, 100);
}

// ===== ФУНКЦИЯ СМЕНЫ СТРАНИЦЫ =====

function changePage(newPage) {
    currentPage = newPage;
    renderFilteredCars();
}

// ===== РЕНДЕРИНГ =====

function searchCars() {
    const term = document.getElementById('searchInput').value.toLowerCase().trim();
    filteredCars = term ? cars.filter(c => c.name.toLowerCase().includes(term)) : [...cars];

    // Сброс на первую страницу при поиске
    currentPage = 1;

    renderFilteredCars();
}

function renderFilteredCars() {
    const container = document.getElementById('carsList');
    container.innerHTML = '';

    if (filteredCars.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#ccc;">' +
            (document.getElementById('searchInput').value.trim() ? 'Автомобили не найдены' : 'Нет добавленных машин') + '</p>';
        return;
    }

    // --- ЛОГИКА ПАГИНАЦИИ ---
    const totalPages = Math.ceil(filteredCars.length / itemsPerPage);

    // Защита от выхода за пределы
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const carsToShow = filteredCars.slice(startIndex, endIndex);
    // ------------------------

    carsToShow.forEach(car => {
        const totalKm = calculateTotalKm(car);
        const maintenanceData = getLatestMaintenanceDates(car);
        const div = document.createElement('div');
        div.className = 'car-card';

        let oilHtml = `<div class="check-item"><div>Масло: каждые ${car.oilInterval} км</div>`;
        if (maintenanceData.oil.km > 0 && maintenanceData.oil.date) {
            oilHtml += `<div class="last-change-info">Последняя замена: <span class="highlight-date">${maintenanceData.oil.km}</span> км (<span class="highlight-date">${maintenanceData.oil.date}</span>)</div>`;
        }
        oilHtml += '</div>';

        let tireHtml = `<div class="check-item"><div>Резина: каждые ${car.tireInterval} км</div>`;
        if (maintenanceData.tire.km > 0 && maintenanceData.tire.date) {
            tireHtml += `<div class="last-change-info">Последняя замена: <span class="highlight-date">${maintenanceData.tire.km}</span> км (<span class="highlight-date">${maintenanceData.tire.date}</span>)</div>`;
        }
        tireHtml += '</div>';

        const notesText = car.notes || '';
        const notesDisplay = notesText ? notesText : 'Заметок нет';
        const notesClass = notesText ? 'notes-text' : 'notes-text empty';

        div.innerHTML = `
            <div class="car-header">
                <div class="car-name">${car.name}</div>
                <div>
                    <button class="edit-car-btn" onclick="openRenameModal('${car.name}')">Изменить</button>
                    <button class="delete-btn" onclick="deleteCar('${car.name}')">Удалить</button>
                </div>
            </div>
            <div class="car-stats">Общий пробег: <strong>${totalKm}</strong> км</div>
            <div class="car-checks">
                <div class="car-checks-title">Техническое обслуживание:</div>
                ${oilHtml}${tireHtml}
            </div>
            <div class="notes-section">
                <div class="notes-title">Ввод пробега:</div>
             <form class="add-trip-form" data-car="${car.name}">
                <input type="number" placeholder="Км" required min="0">
                <input type="date" required>
                <button type="submit">Добавить пробег</button>
            </form>
            </div>
            <form class="settings-form" data-car="${car.name}">
                <div class="settings-form-title">Настройка уведомлений</div>
                <label>Масло:</label><input type="number" value="${car.oilInterval}" min="1000">
                <label>Резина:</label><input type="number" value="${car.tireInterval}" min="1000">
                <button type="submit">Установить</button>
            </form>
            <div class="notes-section">
                <div class="notes-title">Заметки:</div>
                <div class="${notesClass}">${notesDisplay}</div>
                <button class="edit-notes-btn" onclick="openNotesModal('${car.name}')">Редактировать заметки</button>
            </div>
            <div class="trips-section">
                <button class="trips-btn" onclick="openTripsModal('${car.name}')">
                     История пробега (${car.trips.length} записей)
                </button>
            </div>
        `;

        container.appendChild(div);
    });

    // --- ДОБАВЛЕНИЕ КНОПОК ПАГИНАЦИИ ---
    if (totalPages > 1) {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination-container';

        let paginationHTML = '';

        // Кнопка Назад
        paginationHTML += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">← Назад</button>`;

        // Номера страниц
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        }

        // Кнопка Вперед
        paginationHTML += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Вперед →</button>`;

        paginationDiv.innerHTML = paginationHTML;
        container.appendChild(paginationDiv);
    }
    // -----------------------------------

    // Обработчики форм
    document.querySelectorAll('.add-trip-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const carName = this.dataset.car;
            const km = this.querySelector('input[type="number"]').value;
            const date = this.querySelector('input[type="date"]').value;
            if (km && date) { addTrip(carName, km, date); this.reset(); }
        });
    });

    document.querySelectorAll('.settings-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const carName = this.dataset.car;
            const oilInterval = this.querySelectorAll('input[type="number"]')[0].value;
            const tireInterval = this.querySelectorAll('input[type="number"]')[1].value;
            if (oilInterval && tireInterval) { setIntervals(carName, oilInterval, tireInterval); }
        });
    });
}

function renderCars() {
    filteredCars = [...cars];
    renderFilteredCars();
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

document.getElementById('addCarForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('carName').value.trim();
    if (name) { addCar(name); this.reset(); }
});

document.getElementById('searchInput').addEventListener('input', searchCars);

window.onclick = function(event) {
    ['editModal', 'renameModal', 'notesModal', 'tripsModal'].forEach(id => {
        const modal = document.getElementById(id);
        if (event.target === modal) {
            if (id === 'editModal') closeEditModal();
            if (id === 'renameModal') closeRenameModal();
            if (id === 'notesModal') closeNotesModal();
            if (id === 'tripsModal') closeTripsModal();
        }
    });
};

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideNotification();
        closeEditModal();
        closeRenameModal();
        closeNotesModal();
        closeTripsModal();
    }
});

// ===== НОВЫЙ БЛОК: СИНХРОНИЗАЦИЯ С DJANGO ПРИ ЗАГРУЗКЕ =====
// Этот код выполняется ПОСЛЕ загрузки всех функций, поэтому saveCars() и renderCars() уже существуют
document.addEventListener('DOMContentLoaded', function() {
    // Если Django передал машины из базы — используем их вместо localStorage
    if (typeof window.initialCars !== 'undefined' && window.initialCars && window.initialCars.length > 0) {
        console.log('🔄 Загружаю машины из базы Django:', window.initialCars);

        // Преобразуем данные из Django в формат, который понимает ваш JS
        cars = window.initialCars.map(car => ({
            name: car.name,
            notes: car.notes || '',
            oilInterval: car.oil_change_interval || 50000,
            tireInterval: car.tire_change_interval || 60000,
            oilCheckKm: car.last_oil_change_km || 0,
            tireCheckKm: car.last_tire_change_km || 0,
            trips: [] // Поездки пока не передаём, можно добавить позже
        }));

        // Сохраняем в localStorage, чтобы JS работал как обычно
        saveCars();

        // Перерисовываем интерфейс
        renderCars();
        checkAndShowNotifications();
    } else {
        // Если данных из Django нет, просто рисуем то, что в localStorage
        renderCars();
        checkAndShowNotifications();
    }
});
// ===== КОНЕЦ БЛОКА СИНХРОНИЗАЦИИ =====