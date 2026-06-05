const API_BASE_URL = "http://127.0.0.1:8000";

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(".nav");

const foodCard = document.querySelector(".food-card");
const rejectBtn = document.querySelector(".reject-btn");
const likeBtn = document.querySelector(".like-btn");
const starBtn = document.querySelector(".star-btn");

const dailyPreferenceModal = document.getElementById("dailyPreferenceModal");

let foods = [];
let users = [];
let foodIndex = 0;
let startX = 0;
let currentX = 0;
let isDragging = false;

const fallbackFoods = [
  {
    id: 1,
    food_name: "Spicy Tteokbokki",
    restaurant_name: "Seoul Street Kitchen",
    img: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80",
    rating: "4.8",
    reviews: "1284 reviews",
    distance: "0.6km",
    insight: "Most users love the bold spicy flavor and chewy texture for the price.",
    cuisine: "Korean · $$",
    tags: ["Spicy", "Savory", "Halal-friendly"]
  },
  {
    id: 2,
    food_name: "Double Smash Burger",
    restaurant_name: "Patty Garage",
    img: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80",
    rating: "4.6",
    reviews: "942 reviews",
    distance: "1.2km",
    insight: "Reviewers rave about the crispy edges and juicy beef.",
    cuisine: "Western · $$",
    tags: ["Cheesy", "Beef", "Crispy"]
  },
  {
    id: 3,
    food_name: "Tonkotsu Ramen",
    restaurant_name: "Mengoku Ramen Bar",
    img: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
    rating: "4.7",
    reviews: "2103 reviews",
    distance: "2.1km",
    insight: "Praised for rich creamy broth, tender toppings, and warm comfort taste.",
    cuisine: "Japanese · $$",
    tags: ["Savory", "Ramen", "Comfort"]
  },
  {
    id: 4,
    food_name: "Nasi Goreng Spesial",
    restaurant_name: "Warung Bahari",
    img: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80",
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80",
    rating: "4.7",
    reviews: "1052 reviews",
    distance: "0.9km",
    insight: "Users love the smoky aroma and authentic Indonesian taste.",
    cuisine: "Indonesian · $",
    tags: ["Local", "Savory", "Affordable"]
  }
];

async function fetchFoods() {
  try {
    const response = await fetch(`${API_BASE_URL}/restaurants`);
    const data = await response.json();

    foods = data.map((food, index) => ({
      id: food.id || index + 1,
      food_name: food.food_name || food.name || "Food Name",
      restaurant_name: food.restaurant_name || food.restaurant || "Restaurant Name",
      img: food.img_url || food.image || "https://picsum.photos/500/700",
      image: food.img_url || food.img || "https://picsum.photos/500/700",
      rating: food.rating || "4.5",
      reviews: food.reviews || food.count_rating || "0 reviews",
      cuisine: food.origin_country || food.cuisine || "Food · $$",
      tags: food.tags || ["Recommended"],
      insight: food.insight || "This food is recommended based on rating and user preference.",
      distance: typeof food.distance === "number" ? `${food.distance}km` : food.distance || "1.0km"
    }));

    if (foods.length === 0) {
      foods = fallbackFoods;
    }

    updateFoodCard();
  } catch (error) {
    console.error("Backend not connected, using fallback data:", error);
    foods = fallbackFoods;
    updateFoodCard();
  }
}

async function fetchUsers() {

  try {
    const response = await fetch(`${API_BASE_URL}/users`);
    const data = await response.json();
    users = data;
    console.log(users);
    // ambil user pertama
    renderUserProfile(users[0]);
  } catch (error) {
    console.error("Failed to fetch users:", error);
  }
}

/* PAGE USER */

function renderUserProfile(user) {

  document.getElementById("profileName").innerText =
    user.username;

  document.getElementById("profileBio").innerText =
    `${user.role || "Foodie"} · ${user.city || "Indonesia"}`;

  document.getElementById("profileAvatar").innerText =
    user.username.charAt(0).toUpperCase();

  document.getElementById("likedCount").innerText =
    user.like || 0;

  document.getElementById("swipeCount").innerText =
    user.swipe || 0;

  document.getElementById("matchPercent").innerText =
    `${user.match || 0}%`;

  document.getElementById("allergies").innerText =
    user.allergy || None;
}

/* PAGE NAVIGATION */

function showPage(pageId) {
  pages.forEach((page) => page.classList.remove("active"));

  const selectedPage = document.getElementById(pageId);
  if (!selectedPage) return;

  selectedPage.classList.add("active");

  const authPages = ["loginPage", "registerPage", "successPage"];

  if (authPages.includes(pageId)) {
    document.body.classList.add("auth-active");
  } else {
    document.body.classList.remove("auth-active");
  }

  navButtons.forEach((button) => button.classList.remove("active"));

  const pageNavMap = {
    homePage: 0,
    searchPage: 1,
    favoritePage: 2,
    nearbyPage: 3,
    profilePage: 4
  };

  if (pageNavMap[pageId] !== undefined) {
    navButtons[pageNavMap[pageId]].classList.add("active");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.showPage = showPage;

/* AUTH FLOW */

function loginUser() {
  const email = document.getElementById("loginEmail")?.value;
  const password = document.getElementById("loginPassword")?.value;

  if (!email || !password) {
    alert("Please fill in your email and password first.");
    return;
  }

  showPage("successPage");
}

window.loginUser = loginUser;

function registerUser() {
  const fullName = document.getElementById("fullName")?.value;
  const username = document.getElementById("username")?.value;
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  const age = document.getElementById("age")?.value;
  const city = document.getElementById("city")?.value;
  const phone = document.getElementById("phone")?.value;
  const gender = document.getElementById("gender")?.value;
  const otherAllergy = document.getElementById("otherAllergy")?.value;

  if (!fullName || !username || !email || !password || !age || !city || !phone || !gender) {
    alert("Please fill in all required fields first.");
    return;
  }

  const selectedAllergies = [...document.querySelectorAll(".allergy-chips span.active")]
    .map((chip) => chip.textContent);

  if (otherAllergy) {
    selectedAllergies.push(otherAllergy);
  }

  const userData = {
    id: Date.now(),
    fullName,
    username,
    email,
    password,
    age,
    city,
    phone,
    gender,
    allergies: selectedAllergies
  };

  localStorage.setItem("fooderUser", JSON.stringify(userData));

  console.log("Registered user:", userData);

  showPage("successPage");
}

window.registerUser = registerUser;

/* DAILY PREFERENCE MODAL */

function openDailyPreference() {
  if (dailyPreferenceModal) {
    dailyPreferenceModal.classList.add("active");
  }
}

window.openDailyPreference = openDailyPreference;

function closeDailyPreference() {
  if (dailyPreferenceModal) {
    dailyPreferenceModal.classList.remove("active");
  }
}

window.closeDailyPreference = closeDailyPreference;

function startSwipeFromPreference() {
  const selectedTodayPreferences = [...document.querySelectorAll(".daily-chips span.active")]
    .map((chip) => chip.textContent);

  localStorage.setItem(
    "todayPreference",
    JSON.stringify(selectedTodayPreferences)
  );

  console.log("Today's preference:", selectedTodayPreferences);

  closeDailyPreference();
  showPage("homePage");
}

window.startSwipeFromPreference = startSwipeFromPreference;

/* FOOD CARD */

function updateFoodCard() {
  if (!foodCard || foods.length === 0) return;

  const food = foods[foodIndex];

  document.querySelector(".food-card img").src = food.img || food.image;
  document.querySelector(".food-card h2").textContent = food.food_name;
  document.querySelector(".restaurant").textContent = food.restaurant_name;
  document.querySelector(".price-tag").textContent = food.cuisine;

  const infoItems = document.querySelectorAll(".food-info span");
  infoItems[0].textContent = `⭐ ${food.rating} (${String(food.reviews).split(" ")[0]})`;
  infoItems[1].textContent = `📍 ${food.distance}`;

  document.querySelector(".review-box p:last-child").textContent = food.insight;

  const tagBox = document.querySelector(".food-tags");
  tagBox.innerHTML = "";

  food.tags.forEach((tag) => {
    const span = document.createElement("span");
    span.textContent = tag;
    tagBox.appendChild(span);
  });

  foodCard.style.transition = "none";
  foodCard.style.transform = "translateX(0) rotate(0deg) scale(0.95)";

  setTimeout(() => {
    foodCard.style.transition = "0.25s ease";
    foodCard.style.transform = "translateX(0) rotate(0deg) scale(1)";
  }, 50);
}

async function saveSwipe(action) {
  if (foods.length === 0) return;

  try {
    await fetch(`${API_BASE_URL}/swipe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: 1,
        food_id: foods[foodIndex].id || foodIndex + 1,
        action: action
      })
    });

    console.log(`Swipe ${action} saved`);
  } catch (error) {
    console.error("Failed to save swipe:", error);
  }
}

function nextFood() {
  foodIndex++;

  if (foodIndex >= foods.length) {
    foodIndex = 0;
  }

  updateFoodCard();
}

function swipeRight() {
  if (!foodCard) return;

  saveSwipe("like");

  foodCard.style.transition = "0.35s ease";
  foodCard.style.transform = "translateX(520px) rotate(25deg)";

  setTimeout(() => {
    nextFood();
  }, 350);
}

function swipeLeft() {
  if (!foodCard) return;

  saveSwipe("dislike");

  foodCard.style.transition = "0.35s ease";
  foodCard.style.transform = "translateX(-520px) rotate(-25deg)";

  setTimeout(() => {
    nextFood();
  }, 350);
}

function resetCard() {
  if (!foodCard) return;

  foodCard.style.transition = "0.3s ease";
  foodCard.style.transform = "translateX(0) rotate(0deg)";
}

/* SWIPE DRAG */

function getClientX(event) {
  if (event.type.includes("mouse")) {
    return event.clientX;
  }

  return event.touches[0].clientX;
}

function startDrag(event) {
  isDragging = true;
  startX = getClientX(event);
  foodCard.style.transition = "none";
}

function dragCard(event) {
  if (!isDragging) return;

  currentX = getClientX(event) - startX;
  const rotate = currentX / 18;

  foodCard.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;
}

function endDrag() {
  if (!isDragging) return;

  isDragging = false;

  if (currentX > 120) {
    swipeRight();
  } else if (currentX < -120) {
    swipeLeft();
  } else {
    resetCard();
  }

  currentX = 0;
}

if (foodCard) {
  foodCard.addEventListener("mousedown", startDrag);
  foodCard.addEventListener("touchstart", startDrag);

  document.addEventListener("mousemove", dragCard);
  document.addEventListener("touchmove", dragCard);

  document.addEventListener("mouseup", endDrag);
  document.addEventListener("touchend", endDrag);
}

if (rejectBtn) {
  rejectBtn.addEventListener("click", swipeLeft);
}

if (likeBtn) {
  likeBtn.addEventListener("click", swipeRight);
}

if (starBtn) {
  starBtn.addEventListener("click", () => {
    starBtn.classList.toggle("saved");
  });
}

/* DETAIL PAGE */

function openFoodDetail(name, restaurant, image, rating, distance, insight, cuisine) {
  showPage("detailPage");

  const hero = document.querySelector(".detail-hero");

  hero.style.background = `
    linear-gradient(
      to bottom,
      rgba(0,0,0,.05),
      rgba(0,0,0,.85)
    ),
    url("${image}")
  `;

  hero.style.backgroundSize = "cover";
  hero.style.backgroundPosition = "center";

  document.querySelector(".detail-info h2").textContent = name;
  document.querySelector(".detail-info p").textContent = restaurant;
  document.querySelector(".detail-price").textContent = cuisine;

  const stats = document.querySelectorAll(".detail-stats b");
  const smallStats = document.querySelectorAll(".detail-stats small");

  stats[0].textContent = `⭐ ${rating}`;
  stats[1].textContent = `📍 ${distance}`;

  smallStats[0].textContent = "1284 reviews";
  smallStats[1].textContent = "from you";

  document.querySelector(".ai-summary > p").textContent = insight;

  const title = name.toLowerCase();

  if (title.includes("burger")) {
    document.querySelector(".desc").textContent =
      "A juicy double smash burger with crispy edges, melted cheese, fresh vegetables, and a soft toasted bun.";
    updateDetailTags(["Cheesy", "Beef", "Crispy"]);
    updateKeywords(["juicy", "crispy", "cheesy", "beefy"]);
    updateScore("74");
  } else if (title.includes("ramen")) {
    document.querySelector(".desc").textContent =
      "Warm Japanese ramen served with rich broth, noodles, egg, and savory toppings.";
    updateDetailTags(["Savory", "Comfort", "Japanese"]);
    updateKeywords(["broth", "creamy", "warm", "egg"]);
    updateScore("81");
  } else if (title.includes("sushi")) {
    document.querySelector(".desc").textContent =
      "Fresh salmon sushi platter served with rice, seaweed, soy sauce, and wasabi.";
    updateDetailTags(["Fresh", "Sushi", "Salmon"]);
    updateKeywords(["fresh", "clean", "salmon", "pretty"]);
    updateScore("78");
  } else if (title.includes("nasi")) {
    document.querySelector(".desc").textContent =
      "Classic Indonesian fried rice with smoky aroma, savory seasoning, egg, and local spices.";
    updateDetailTags(["Local", "Savory", "Affordable"]);
    updateKeywords(["smoky", "local", "savory", "filling"]);
    updateScore("86");
  } else {
    document.querySelector(".desc").textContent =
      "Chewy rice cakes simmered in a sweet-and-spicy gochujang sauce with fish cake and scallions.";
    updateDetailTags(["Spicy", "Savory", "Halal-friendly"]);
    updateKeywords(["spicy", "chewy", "affordable", "saucy", "addictive"]);
    updateScore("67");
  }
}

window.openFoodDetail = openFoodDetail;

function updateDetailTags(tags) {
  const tagContainer = document.querySelector(".detail-tags");
  if (!tagContainer) return;

  tagContainer.innerHTML = "";

  tags.forEach((tag) => {
    const span = document.createElement("span");
    span.textContent = tag;
    tagContainer.appendChild(span);
  });
}

function updateKeywords(keywords) {
  const keywordContainer = document.querySelector(".keywords");
  if (!keywordContainer) return;

  keywordContainer.innerHTML = "";

  keywords.forEach((keyword) => {
    const span = document.createElement("span");
    span.textContent = keyword;
    keywordContainer.appendChild(span);
  });
}

function updateScore(score) {
  const scoreTitle = document.querySelector(".score-card h4");
  if (!scoreTitle) return;

  scoreTitle.innerHTML = `${score} <span>/ 100 match for you</span>`;
}

/* ACTIVE CHIP */

const categoryButtons = document.querySelectorAll(".category");

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
  });
});

const singleSelectChips = document.querySelectorAll(
  ".chips:not(.allergy-chips):not(.daily-chips) span"
);

singleSelectChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const parent = chip.parentElement;

    parent.querySelectorAll("span").forEach((item) => {
      item.classList.remove("active");
    });

    chip.classList.add("active");
  });
});

const multiSelectChips = document.querySelectorAll(
  ".allergy-chips span, .daily-chips span"
);

multiSelectChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chip.classList.toggle("active");
  });
});

/* SEARCH */

const searchInput = document.querySelector(".search-box input");
const listCards = document.querySelectorAll(".list-card");

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.toLowerCase();

    listCards.forEach((card) => {
      const text = card.textContent.toLowerCase();

      if (text.includes(keyword)) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  });
}

/* SAVE BUTTON */

const saveButtons = document.querySelectorAll(
  ".fav-card button, .heart-detail, .save-btn"
);

saveButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    button.classList.toggle("saved");
  });
});

/* INIT */

document.body.classList.add("auth-active");
fetchFoods();
fetchUsers();

/* ═══════════════════════════════════════════════════════════════════
   SENTIMENT ANALYSIS — FooDer (Perbaikan & Integrasi)
   
   Cara kerja:
   1. Saat user membuka detail makanan, frontend memanggil API sentimen
   2. Jika database teman sudah siap  → pakai /sentiment/restaurant/{id}
   3. Jika database belum siap        → pakai review contoh (mock data)
   4. Hasil sentimen dirender ke dalam halaman detail
   ═══════════════════════════════════════════════════════════════════ */

const SENTIMENT_API = "http://127.0.0.1:8000"; // sama dengan backend utama

// ── Contoh review per restoran (dipakai saat DB belum tersedia) ───────────────
const MOCK_REVIEWS = {
  default: [
    "Makanannya enak banget, rasanya mantap dan porsinya besar!",
    "Pelayanan cepat dan ramah, tempatnya bersih juga.",
    "Harga terjangkau, rasa tidak mengecewakan. Recommended!",
    "Agak lama nunggu tapi makanannya worth it.",
    "Lumayan enak tapi bumbunya kurang nendang.",
    "Sudah beberapa kali ke sini, selalu puas!",
    "Tempatnya sempit tapi makanan enak.",
    "Kecewa dengan pelayanannya, lama sekali.",
    "Enak dan murah, cocok buat kantong mahasiswa!",
    "Biasa aja, tidak terlalu istimewa.",
  ],
  spicy: [
    "Pedasnya mantap banget! Cocok untuk pecinta pedas.",
    "Sambalnya nendang, enak dan segar.",
    "Terlalu pedas buat saya tapi rasa dasarnya enak.",
    "Recommended untuk yang suka makanan pedas!",
    "Bumbu pedasnya autentik, juara!",
  ],
  indonesian: [
    "Rasanya seperti masakan rumah, nikmat banget!",
    "Autentik dan lezat, bumbu rempahnya terasa.",
    "Nasi gorengnya enak, porsi besar!",
    "Masakan Indonesia terbaik yang pernah saya coba.",
    "Tempatnya sederhana tapi rasanya tidak kalah dengan restoran mahal.",
  ],
};

// ── Fungsi utama: ambil dan tampilkan sentimen ────────────────────────────────
async function loadSentimentForRestaurant(restaurantId, foodName) {
  showSentimentLoading();

  try {
    // Coba ambil dari DB dulu
    const res = await fetch(`${SENTIMENT_API}/sentiment/restaurant/${restaurantId}`);

    if (res.ok) {
      const data = await res.json();
      if (data.sentiment_score !== null && data.total_reviews > 0) {
        renderSentimentResult(data);
        return;
      }
    }
  } catch (_) {
    // DB belum tersedia, lanjut ke mock
  }

  // Fallback: gunakan mock reviews + kirim ke API sentimen untuk dianalisis
  await loadSentimentFromMock(restaurantId, foodName);
}

async function loadSentimentFromMock(restaurantId, foodName) {
  // Pilih mock review berdasarkan nama makanan
  let reviews = MOCK_REVIEWS.default;
  const lower = (foodName || "").toLowerCase();
  if (lower.includes("pedas") || lower.includes("spicy") || lower.includes("sambal")) {
    reviews = [...MOCK_REVIEWS.spicy, ...MOCK_REVIEWS.default.slice(0, 5)];
  } else if (lower.includes("nasi") || lower.includes("soto") || lower.includes("rendang") || lower.includes("indonesia")) {
    reviews = [...MOCK_REVIEWS.indonesian, ...MOCK_REVIEWS.default.slice(0, 5)];
  }

  try {
    const res = await fetch(`${SENTIMENT_API}/sentiment/restaurant-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: String(restaurantId),
        reviews: reviews,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      renderSentimentResult(data);
    } else {
      // API sentimen juga tidak tersedia, tampilkan hasil statis
      renderSentimentStatic(foodName);
    }
  } catch (_) {
    renderSentimentStatic(foodName);
  }
}

// ── Render: tampilkan loading spinner ────────────────────────────────────────
function showSentimentLoading() {
  const container = document.querySelector(".ai-summary");
  if (!container) return;

  container.innerHTML = `
    <h3>✨ AI Review Summary</h3>
    <div class="sentiment-loading">
      <div class="loading-spinner"></div>
      <p>Menganalisis sentimen review...</p>
    </div>
  `;
}

// ── Render: tampilkan hasil dari API ─────────────────────────────────────────
function renderSentimentResult(data) {
  const container = document.querySelector(".ai-summary");
  if (!container) return;

  const posPct  = data.positive_pct  ?? 0;
  const neuPct  = data.neutral_pct   ?? 0;
  const negPct  = data.negative_pct  ?? 0;
  const score   = data.sentiment_score ?? 0.5;
  const interp  = data.interpretation ?? "";
  const total   = data.total_reviews  ?? 0;

  // Emoji berdasarkan skor
  const emoji = score >= 0.75 ? "😍" : score >= 0.55 ? "🙂" : score >= 0.40 ? "😐" : "😞";

  container.innerHTML = `
    <h3>✨ AI Review Summary</h3>
    <p class="sentiment-interpretation">${emoji} ${interp}</p>

    <div class="sentiment-text">
      <span>Positif ${posPct.toFixed(1)}%</span>
      <span>Netral ${neuPct.toFixed(1)}%</span>
      <span>Negatif ${negPct.toFixed(1)}%</span>
    </div>

    <div class="sentiment-bar">
      <div class="positive" style="width:${posPct}%"></div>
      <div class="neutral"  style="width:${neuPct}%"></div>
      <div class="negative" style="width:${negPct}%"></div>
    </div>

    <p class="sentiment-meta">Berdasarkan ${total > 0 ? total + " review" : "analisis review"} pengguna</p>
  `;

  // Update score card
  const scoreNum = Math.round(score * 100);
  updateScore(scoreNum);
}

// ── Render: fallback statis jika API tidak tersedia ───────────────────────────
function renderSentimentStatic(foodName) {
  const container = document.querySelector(".ai-summary");
  if (!container) return;

  const title = (foodName || "").toLowerCase();
  let posPct = 74, neuPct = 16, negPct = 10, scoreNum = 74;

  if (title.includes("nasi") || title.includes("soto"))   { posPct = 86; neuPct = 9;  negPct = 5;  scoreNum = 86; }
  if (title.includes("burger") || title.includes("pizza")) { posPct = 74; neuPct = 16; negPct = 10; scoreNum = 74; }
  if (title.includes("ramen") || title.includes("mie"))    { posPct = 81; neuPct = 12; negPct = 7;  scoreNum = 81; }
  if (title.includes("sushi") || title.includes("salmon")) { posPct = 78; neuPct = 14; negPct = 8;  scoreNum = 78; }

  container.innerHTML = `
    <h3>✨ AI Review Summary</h3>
    <p class="sentiment-interpretation">🙂 Cukup positif — pengguna umumnya puas</p>

    <div class="sentiment-text">
      <span>Positif ${posPct}%</span>
      <span>Netral ${neuPct}%</span>
      <span>Negatif ${negPct}%</span>
    </div>

    <div class="sentiment-bar">
      <div class="positive" style="width:${posPct}%"></div>
      <div class="neutral"  style="width:${neuPct}%"></div>
      <div class="negative" style="width:${negPct}%"></div>
    </div>

    <p class="sentiment-meta">Berdasarkan analisis review pengguna</p>
  `;

  updateScore(scoreNum);
}

// ── Override openFoodDetail agar memanggil sentimen ───────────────────────────
const _originalOpenFoodDetail = window.openFoodDetail;

window.openFoodDetail = function(name, restaurant, image, rating, distance, insight, cuisine, restaurantId) {
  // Panggil fungsi asli dulu
  _originalOpenFoodDetail(name, restaurant, image, rating, distance, insight, cuisine);

  // Simpan kata kunci positif dari makanan yang sedang dibuka
  const title = name.toLowerCase();
  let keywords = ["enak", "recommended", "porsi besar", "nilai worth"];
  if (title.includes("burger"))  keywords = ["juicy", "crispy", "cheesy", "beefy"];
  if (title.includes("ramen"))   keywords = ["broth", "creamy", "warm", "egg"];
  if (title.includes("sushi"))   keywords = ["fresh", "clean", "salmon", "pretty"];
  if (title.includes("nasi"))    keywords = ["smoky", "lokal", "savory", "filling"];
  if (title.includes("spicy") || title.includes("pedas")) keywords = ["spicy", "chewy", "affordable", "saucy"];
  updateKeywords(keywords);

  // Mulai analisis sentimen (async, tidak memblokir UI)
  const id = restaurantId || 1;
  loadSentimentForRestaurant(id, name);
};

// ── Perbaiki updateFoodCard agar meneruskan restaurantId ke detail ────────────
const _origUpdateFoodCard = window.updateFoodCard;
// Patch tombol detail di dalam updateFoodCard agar menyertakan restaurantId
const _origUpdateFC2 = updateFoodCard;
function updateFoodCard() {
  if (!foodCard || foods.length === 0) return;
  const food = foods[foodIndex];

  document.querySelector(".food-card img").src = food.img || food.image;
  document.querySelector(".food-card h2").textContent = food.food_name;
  document.querySelector(".restaurant").textContent = food.restaurant_name;
  document.querySelector(".price-tag").textContent = food.cuisine;

  const infoItems = document.querySelectorAll(".food-info span");
  infoItems[0].textContent = `⭐ ${food.rating} (${String(food.reviews).split(" ")[0]})`;
  infoItems[1].textContent = `📍 ${food.distance}`;

  document.querySelector(".review-box p:last-child").textContent = food.insight;

  const tagBox = document.querySelector(".food-tags");
  tagBox.innerHTML = "";
  food.tags.forEach((tag) => {
    const span = document.createElement("span");
    span.textContent = tag;
    tagBox.appendChild(span);
  });

  // Patch tombol "View details" agar menyertakan restaurant ID
  const detailBtn = document.querySelector(".detail-btn");
  if (detailBtn) {
    detailBtn.onclick = () => openFoodDetail(
      food.food_name,
      food.restaurant_name,
      food.img || food.image,
      food.rating,
      food.distance,
      food.insight,
      food.cuisine,
      food.id   // <-- kirim ID untuk sentimen
    );
  }

  foodCard.style.transition = "none";
  foodCard.style.transform = "translateX(0) rotate(0deg) scale(0.95)";
  setTimeout(() => {
    foodCard.style.transition = "0.25s ease";
    foodCard.style.transform = "translateX(0) rotate(0deg) scale(1)";
  }, 50);
}

// Re-assign agar updateFoodCard yang baru dipakai
window.updateFoodCard = updateFoodCard;

/* ══ CSS tambahan: diinjeksi saat runtime ══ */
(function injectSentimentCSS() {
  const style = document.createElement("style");
  style.textContent = `
    .sentiment-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 0;
      color: #888;
      font-size: 14px;
    }
    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 3px solid #eee;
      border-top-color: #FF6B6B;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .sentiment-interpretation {
      font-size: 14px;
      color: #555;
      margin: 6px 0 10px;
      font-weight: 500;
    }
    .sentiment-meta {
      font-size: 12px;
      color: #aaa;
      margin-top: 8px;
    }
    .sentiment-bar {
      display: flex;
      height: 8px;
      border-radius: 999px;
      overflow: hidden;
      background: #eee;
      margin: 8px 0;
    }
    .sentiment-bar .positive { background: #4CAF50; transition: width 0.6s ease; }
    .sentiment-bar .neutral  { background: #FFC107; transition: width 0.6s ease; }
    .sentiment-bar .negative { background: #F44336; transition: width 0.6s ease; }
  `;
  document.head.appendChild(style);
})();
