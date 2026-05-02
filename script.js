const doctorForm = document.getElementById('doctor-form');
const reviewForm = document.getElementById('review-form');
const doctorList = document.getElementById('doctor-list');
const searchInput = document.getElementById('search-input');
const searchDropdown = document.getElementById('search-dropdown');
const reviewFilterSelect = document.getElementById('review-filter');
const reviewDoctorSelect = document.getElementById('review-doctor');
const doctorPhotoInput = document.getElementById('doctor-photo');
const reviewPhotoInput = document.getElementById('review-photo');
const reviewResponseInput = document.getElementById('review-response');
const exportDataButton = document.getElementById('export-data');
const importDataTextarea = document.getElementById('import-data');
const importDataButton = document.getElementById('import-data-button');
const editReviewForm = document.getElementById('edit-review-form');
const editReviewDoctorSelect = document.getElementById('edit-review-doctor');
const editReviewItemSelect = document.getElementById('edit-review-item');
const editReviewRatingSelect = document.getElementById('edit-review-rating');
const editReviewText = document.getElementById('edit-review-text');
const editReviewPhotoInput = document.getElementById('edit-review-photo');
const editReviewResponseInput = document.getElementById('edit-review-response');
const editReviewDeleteButton = document.getElementById('edit-review-delete');

const STORAGE_KEY = 'doctor_reviews_app_data';
let editingDoctorIndex = null;
let editingReviewIndex = null;
let doctors = [];

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  doctors = saved ? JSON.parse(saved) : [];
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));
}

function formatRating(rating) {
  return `${rating.toFixed(1)} / 5`;
}

function readImageFile(file) {
  return new Promise(resolve => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function readImageFiles(fileList) {
  const files = Array.from(fileList || []);
  return Promise.all(files.map(file => readImageFile(file))).then(results => results.filter(Boolean));
}

function updateDoctorSelect() {
  reviewDoctorSelect.innerHTML = '<option value="">-- Выберите врача --</option>';
  doctors.forEach((doctor, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${doctor.name} — ${doctor.specialty}`;
    reviewDoctorSelect.appendChild(option);
  });
  updateEditReviewDoctorSelect();
}

function resetEditReviewForm() {
  editingDoctorIndex = null;
  editingReviewIndex = null;
  editReviewItemSelect.innerHTML = '<option value="">-- Выберите отзыв --</option>';
  editReviewItemSelect.disabled = true;
  editReviewRatingSelect.value = '5';
  editReviewText.value = '';
  editReviewResponseInput.value = '';
  editReviewPhotoInput.value = '';
}

function updateEditReviewDoctorSelect() {
  editReviewDoctorSelect.innerHTML = '<option value="">-- Выберите врача --</option>';
  doctors.forEach((doctor, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${doctor.name} — ${doctor.specialty}`;
    editReviewDoctorSelect.appendChild(option);
  });
  resetEditReviewForm();
}

function getFilteredReviews(doctor, filterType) {
  if (filterType === 'good') {
    return doctor.reviews.filter(review => review.rating >= 4);
  }
  if (filterType === 'medium') {
    return doctor.reviews.filter(review => review.rating === 3);
  }
  if (filterType === 'bad') {
    return doctor.reviews.filter(review => review.rating <= 2);
  }
  return doctor.reviews;
}

function getSearchResults(query) {
  const normalized = query.trim().toLowerCase();
  return doctors.filter(doctor => {
    return [doctor.name, doctor.specialty, doctor.clinic]
      .some(value => value.toLowerCase().includes(normalized));
  });
}

function renderSearchSuggestions(query) {
  const matches = query.trim().length === 0 ? doctors : getSearchResults(query);
  searchDropdown.innerHTML = '';
  if (!matches.length) {
    searchDropdown.innerHTML = '<div class="search-suggestion"><span>Врачи не найдены.</span></div>';
    searchDropdown.classList.add('active');
    return;
  }

  matches.forEach((doctor, index) => {
    const average = calculateAverage(doctor);
    const suggestion = document.createElement('div');
    suggestion.className = 'search-suggestion';
    suggestion.innerHTML = `
      ${doctor.photo ? `<img class="suggestion-photo" src="${doctor.photo}" alt="Фото ${escapeHtml(doctor.name)}">` : '<div class="suggestion-photo"></div>'}
      <div class="suggestion-content">
        <p class="suggestion-title">${escapeHtml(doctor.name)}</p>
        <p class="suggestion-meta">${escapeHtml(doctor.specialty)} • ${escapeHtml(doctor.clinic)}</p>
        <span class="suggestion-badge">Рейтинг ${formatRating(average)}</span>
      </div>
    `;
    suggestion.addEventListener('click', () => {
      searchInput.value = doctor.name;
      renderDoctors(doctor.name, reviewFilterSelect.value);
      searchDropdown.classList.remove('active');
    });
    searchDropdown.appendChild(suggestion);
  });
  searchDropdown.classList.add('active');
}

function hideSearchSuggestions() {
  searchDropdown.classList.remove('active');
}

function exportData() {
  const data = JSON.stringify(doctors, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'doctor_reviews_data.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importData() {
  try {
    const parsed = JSON.parse(importDataTextarea.value);
    if (!Array.isArray(parsed)) {
      alert('Ожидается массив врачей в JSON.');
      return;
    }
    doctors = parsed;
    saveData();
    updateDoctorSelect();
    renderDoctors(searchInput.value, reviewFilterSelect.value);
    importDataTextarea.value = '';
    alert('Данные успешно импортированы.');
  } catch (error) {
    alert('Ошибка при импорте данных: неверный JSON.');
  }
}

function populateReviewOptions(doctorIndex) {
  editReviewItemSelect.innerHTML = '<option value="">-- Выберите отзыв --</option>';
  const reviews = doctors[doctorIndex]?.reviews || [];
  if (!reviews.length) {
    editReviewItemSelect.disabled = true;
    return;
  }
  reviews.forEach((review, reviewIndex) => {
    const option = document.createElement('option');
    option.value = reviewIndex;
    option.textContent = `${new Date(review.date).toLocaleDateString('ru-RU')} — ${escapeHtml(review.text).slice(0, 50)}`;
    editReviewItemSelect.appendChild(option);
  });
  editReviewItemSelect.disabled = false;
}

function loadReviewForEdit(doctorIndex, reviewIndex) {
  const review = doctors[doctorIndex]?.reviews[reviewIndex];
  if (!review) {
    resetEditReviewForm();
    return;
  }
  editingDoctorIndex = doctorIndex;
  editingReviewIndex = reviewIndex;
  editReviewRatingSelect.value = String(review.rating);
  editReviewText.value = review.text;
  editReviewResponseInput.value = review.response || '';
  editReviewPhotoInput.value = '';
}

function calculateAverage(doctor) {
  if (!doctor.reviews.length) return 0;
  const total = doctor.reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / doctor.reviews.length;
}

function renderDoctors(filter = '', reviewFilter = 'all') {
  const normalized = filter.trim().toLowerCase();
  const visibleDoctors = doctors.filter(doctor => {
    const matchesSearch = !normalized || [doctor.name, doctor.specialty, doctor.clinic]
      .some(value => value.toLowerCase().includes(normalized));
    if (!matchesSearch) return false;
    const filteredReviews = getFilteredReviews(doctor, reviewFilter);
    return reviewFilter === 'all' || filteredReviews.length > 0;
  });

  doctorList.innerHTML = '';
  if (!visibleDoctors.length) {
    doctorList.innerHTML = '<div class="empty-state">Пока нет врачей или результаты поиска не найдены.</div>';
    return;
  }

  visibleDoctors.forEach((doctor, index) => {
    const card = document.createElement('article');
    card.className = 'doctor-card';

    const average = calculateAverage(doctor);
    
    const visibleReviews = getFilteredReviews(doctor, reviewFilter);
    card.innerHTML = `
      <div class="doctor-card-header">
        ${doctor.photo ? `<img class="doctor-photo" src="${doctor.photo}" alt="Фото ${escapeHtml(doctor.name)}">` : ''}
        <div class="doctor-card-content">
          <h3>${doctor.name}</h3>
          <div class="doctor-meta">
            <span class="badge">${doctor.specialty}</span>
            <span class="badge">${doctor.clinic}</span>
            <span class="badge">Рейтинг: ${formatRating(average)}</span>
            <span class="badge">Отзывы: ${doctor.reviews.length}</span>
          </div>
          <button class="photo-button" type="button">Изменить фото</button>
        </div>
      </div>
      <ul class="review-list">
        ${visibleReviews.length
          ? visibleReviews.map(review => `
              <li class="review-item">
                <strong>Оценка ${review.rating} — ${new Date(review.date).toLocaleDateString('ru-RU')}</strong>
                <p>${escapeHtml(review.text)}</p>
                ${(() => {
                  const reviewPhotos = Array.isArray(review.photos)
                    ? review.photos
                    : review.photo
                      ? [review.photo]
                      : [];
                  return reviewPhotos.map(photo => `<img class="review-photo" src="${photo}" alt="Фото отзыва">`).join('');
                })()}
                ${review.response ? `<div class="review-response"><strong>Ответ врача / клиники:</strong><p>${escapeHtml(review.response)}</p></div>` : ''}
              </li>
            `).join('')
          : '<li class="review-item"><p>Нет отзывов, подходящих под выбранный фильтр.</p></li>'}
      </ul>
      <button class="delete-button" data-index="${index}" type="button">Удалить врача</button>
    `;

    card.querySelector('.photo-button').addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;
        const photo = await readImageFile(file);
        if (!photo) return;
        doctors[index].photo = photo;
        saveData();
        updateDoctorSelect();
        renderDoctors(searchInput.value, reviewFilterSelect.value);
      };
      fileInput.click();
    });

    card.querySelector('.delete-button').addEventListener('click', () => {
      doctors.splice(index, 1);
      saveData();
      updateDoctorSelect();
      renderDoctors(searchInput.value);
    });

    doctorList.appendChild(card);
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

doctorForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = document.getElementById('doctor-name').value.trim();
  const specialty = document.getElementById('doctor-specialty').value.trim();
  const clinic = document.getElementById('doctor-clinic').value.trim();
  const photo = await readImageFile(doctorPhotoInput.files[0]);

  if (!name || !specialty || !clinic) return;

  doctors.push({
    name,
    specialty,
    clinic,
    photo,
    reviews: []
  });

  saveData();
  updateDoctorSelect();
  renderDoctors(searchInput.value, reviewFilterSelect.value);
  doctorForm.reset();
});

reviewForm.addEventListener('submit', async event => {
  event.preventDefault();
  const doctorIndex = Number(reviewDoctorSelect.value);
  const rating = Number(document.getElementById('review-rating').value);
  const text = document.getElementById('review-text').value.trim();
  const response = reviewResponseInput.value.trim();
  const photos = await readImageFiles(reviewPhotoInput.files);

  if (Number.isNaN(doctorIndex) || doctorIndex < 0 || !text) return;

  doctors[doctorIndex].reviews.unshift({
    rating,
    text,
    date: new Date().toISOString(),
    photos,
    response
  });

  saveData();
  renderDoctors(searchInput.value, reviewFilterSelect.value);
  reviewForm.reset();
});

editReviewDoctorSelect.addEventListener('change', () => {
  const doctorIndex = Number(editReviewDoctorSelect.value);
  if (Number.isNaN(doctorIndex) || editReviewDoctorSelect.value === '') {
    resetEditReviewForm();
    return;
  }
  populateReviewOptions(doctorIndex);
});

editReviewItemSelect.addEventListener('change', () => {
  const doctorIndex = Number(editReviewDoctorSelect.value);
  const reviewIndex = Number(editReviewItemSelect.value);
  if (Number.isNaN(doctorIndex) || Number.isNaN(reviewIndex) || editReviewItemSelect.value === '') {
    resetEditReviewForm();
    return;
  }
  loadReviewForEdit(doctorIndex, reviewIndex);
});

editReviewForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (editingDoctorIndex === null || editingReviewIndex === null) return;

  const rating = Number(editReviewRatingSelect.value);
  const text = editReviewText.value.trim();
  const response = editReviewResponseInput.value.trim();
  const newPhotos = await readImageFiles(editReviewPhotoInput.files);

  if (!text) return;

  const review = doctors[editingDoctorIndex].reviews[editingReviewIndex];
  review.rating = rating;
  review.text = text;
  review.response = response;
  if (!Array.isArray(review.photos)) {
    review.photos = review.photo ? [review.photo] : [];
    delete review.photo;
  }
  if (newPhotos.length) {
    review.photos = [...review.photos, ...newPhotos];
  }

  saveData();
  renderDoctors(searchInput.value, reviewFilterSelect.value);
  updateEditReviewDoctorSelect();
  editReviewForm.reset();
});

reviewFilterSelect.addEventListener('change', () => {
  renderDoctors(searchInput.value, reviewFilterSelect.value);
});

searchInput.addEventListener('input', () => {
  renderDoctors(searchInput.value, reviewFilterSelect.value);
  renderSearchSuggestions(searchInput.value);
});

searchInput.addEventListener('focus', () => {
  renderSearchSuggestions(searchInput.value);
});

searchInput.addEventListener('blur', () => {
  setTimeout(hideSearchSuggestions, 200);
});

exportDataButton.addEventListener('click', exportData);
importDataButton.addEventListener('click', importData);

loadData();
updateDoctorSelect();
renderDoctors(searchInput.value, reviewFilterSelect.value);
