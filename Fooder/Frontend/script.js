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

// ── Swipe counter untuk deteksi 5x swipe kanan ────────────────────────────
let rightSwipeCount = 0;
const RIGHT_SWIPE_THRESHOLD = 5;

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

function capitalizeWords(text) {
  if (!text) return "";

  return text
    .toLowerCase()
    .split(" ")
    .map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

async function fetchFoods() {
  try {
    const response = await fetch(`${API_BASE_URL}/foods`);
    const data = await response.json();

    foods = data.map((food, index) => ({
      id: food.id || index + 1,
      food_name: capitalizeWords(
          food.food_name || food.name || "Food Name"
      ),
      img: food.img_url || food.image || "https://picsum.photos/500/700",
      image: food.img_url || food.img || "https://picsum.photos/500/700",
      cuisine: food.origin_country || food.cuisine || "Food · $$",
      tags: food.tags || ["Recommended"],
      insight: food.insight || "This food is recommended based on rating and user preference.",
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
  document.querySelector(".price-tag").textContent = food.cuisine;

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

  const currentFood = foods[foodIndex];

  // ── Tambah hitungan swipe kanan global (bukan per makanan) ──
  rightSwipeCount++;

  saveSwipe("like");

  // Tampilkan indikator progress swipe
  showSwipeProgress(rightSwipeCount, currentFood);

  foodCard.style.transition = "0.35s ease";
  foodCard.style.transform = "translateX(520px) rotate(25deg)";

  setTimeout(() => {
    // Swipe ke-5 → makanan SAAT INI yang terpilih
    if (rightSwipeCount >= RIGHT_SWIPE_THRESHOLD) {
      rightSwipeCount = 0; // reset untuk sesi berikutnya
      triggerFoodMatch(currentFood);
    } else {
      nextFood();
    }
  }, 350);
}

function showSwipeProgress(count, food) {
  const existing = document.getElementById("swipeProgressIndicator");
  if (existing) existing.remove();

  if (count >= RIGHT_SWIPE_THRESHOLD) return;

  const indicator = document.createElement("div");
  indicator.id = "swipeProgressIndicator";
  indicator.innerHTML = `
    <div style="display:flex; gap:8px; align-items:center;">
      <span style="font-size:13px; color:#2b211b; font-weight:700;">${count}/${RIGHT_SWIPE_THRESHOLD}</span>
      <div style="display:flex; gap:4px;">
        ${Array.from({length: RIGHT_SWIPE_THRESHOLD}, (_, i) =>
          `<div style="width:10px;height:10px;border-radius:50%;background:${i < count ? 'linear-gradient(135deg,#ff844d,#ff5f5f)' : '#e8ddd5'};transition:background 0.2s;"></div>`
        ).join('')}
      </div>
      <span style="font-size:13px;">❤️</span>
    </div>
  `;
  indicator.style.cssText = `
    position: fixed;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    background: #fff8ef;
    border: 2px solid #ffe4dc;
    padding: 8px 18px;
    border-radius: 999px;
    z-index: 9999;
    box-shadow: 0 8px 24px rgba(255,95,95,0.15);
    pointer-events: none;
    animation: swipeIndicatorIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
  `;
  document.body.appendChild(indicator);

  // Inject keyframe jika belum ada
  if (!document.getElementById("swipeIndicatorKeyframe")) {
    const s = document.createElement("style");
    s.id = "swipeIndicatorKeyframe";
    s.textContent = `
      @keyframes swipeIndicatorIn {
        from { opacity:0; transform:translateX(-50%) translateY(-8px) scale(0.9); }
        to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(s);
  }

  setTimeout(() => { if (indicator.parentNode) indicator.remove(); }, 1800);
}

async function triggerFoodMatch(food) {
  const foodName = food?.food_name || "makanan ini";

  showScrapingLoader(foodName);

  try {
    const response = await fetch(`${API_BASE_URL}/match/${encodeURIComponent(foodName)}`);
    const data = await response.json();
    window._matchedFood = foodName;
    window._matchedRestaurants = data.restaurants || [];

    await waitForLoaderFinish();
    hideScrapingLoader();
    showRestaurantResultPage(foodName, window._matchedRestaurants);
  } catch (error) {
    console.error("Match/scraping failed:", error);
    await waitForLoaderFinish();
    hideScrapingLoader();
    showRestaurantResultPage(foodName, []);
  }
}

function waitForLoaderFinish() {
  return new Promise(resolve => setTimeout(resolve, 3500));
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
  document.querySelector(".price-tag").textContent = food.cuisine;

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
      food.img || food.image,
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

// ══════════════════════════════════════════════════════════════════════════════
//  SCRAPING LOADER – animasi loading saat scraping Google Maps
// ══════════════════════════════════════════════════════════════════════════════

const LOADER_MESSAGES = [
  { icon: "🗺️", text: "Mencari restoran di Google Maps..." },
  { icon: "📍", text: "Menemukan lokasi terdekat..." },
  { icon: "⭐", text: "Mengambil data rating & ulasan..." },
  { icon: "💾", text: "Menyimpan ke database..." },
  { icon: "✨", text: "Hampir selesai..." },
];

let loaderInterval = null;

function showScrapingLoader(foodName) {
  const existing = document.getElementById("scrapingLoader");
  if (existing) existing.remove();

  injectLoaderAndResultCSS();

  const loader = document.createElement("div");
  loader.id = "scrapingLoader";
  loader.innerHTML = `
    <div class="fl-overlay">
      <div class="fl-box">
        <div class="fl-food-name">🍽️ ${foodName}</div>
        <div class="fl-title">Kamu memilih makanan ini!</div>
        <div class="fl-subtitle">Sedang mencari restoran terbaik untukmu...</div>

        <div class="fl-anim">
          <div class="fl-ring"></div>
          <div class="fl-ring fl-ring2"></div>
          <div class="fl-icon-wrap">
            <span class="fl-icon" id="flIcon">🗺️</span>
          </div>
        </div>

        <div class="fl-msg" id="flMsg">Mencari restoran di Google Maps...</div>

        <div class="fl-bar-wrap">
          <div class="fl-bar-fill" id="flBarFill"></div>
        </div>

        <div class="fl-steps" id="flSteps">
          ${LOADER_MESSAGES.map((m, i) => `
            <div class="fl-step" id="flStep${i}">
              <span class="fl-step-icon">${m.icon}</span>
              <span class="fl-step-text">${m.text}</span>
              <span class="fl-step-check" id="flCheck${i}">⏳</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(loader);

  // Animate steps
  let step = 0;
  const stepDuration = 3500 / LOADER_MESSAGES.length;

  function animateStep() {
    if (step >= LOADER_MESSAGES.length) return;
    const prev = document.getElementById(`flCheck${step - 1}`);
    const stepEl = document.getElementById(`flStep${step}`);
    const msgEl = document.getElementById("flMsg");
    const iconEl = document.getElementById("flIcon");
    const fillEl = document.getElementById("flBarFill");

    if (prev) prev.textContent = "✅";
    if (stepEl) stepEl.classList.add("active");
    if (msgEl) msgEl.textContent = LOADER_MESSAGES[step].text;
    if (iconEl) {
      iconEl.style.transform = "scale(0)";
      setTimeout(() => {
        iconEl.textContent = LOADER_MESSAGES[step].icon;
        iconEl.style.transform = "scale(1)";
      }, 150);
    }
    if (fillEl) fillEl.style.width = ((step + 1) / LOADER_MESSAGES.length * 100) + "%";

    step++;
    if (step < LOADER_MESSAGES.length) {
      loaderInterval = setTimeout(animateStep, stepDuration);
    } else {
      setTimeout(() => {
        const last = document.getElementById(`flCheck${LOADER_MESSAGES.length - 1}`);
        if (last) last.textContent = "✅";
      }, 200);
    }
  }

  animateStep();
}

function hideScrapingLoader() {
  if (loaderInterval) { clearTimeout(loaderInterval); loaderInterval = null; }
  const loader = document.getElementById("scrapingLoader");
  if (loader) {
    loader.style.opacity = "0";
    loader.style.transition = "opacity 0.4s ease";
    setTimeout(() => loader.remove(), 400);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  HALAMAN HASIL RESTORAN
// ══════════════════════════════════════════════════════════════════════════════

function showRestaurantResultPage(foodName, restaurants) {
  const existing = document.getElementById("restaurantResultPage");
  if (existing) existing.remove();

  // Sembunyikan semua page, tapi JANGAN sembunyikan navbar
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

  const fallback = [
    { restaurant_name: "Warung Makan Sederhana", food_name: foodName, rating: 4.7, count_rating: 842,  city: "Bandung", address: "Jl. Braga No.12, Bandung" },
    { restaurant_name: "Resto Nusantara",        food_name: foodName, rating: 4.5, count_rating: 1203, city: "Bandung", address: "Jl. Dago No.88, Bandung" },
    { restaurant_name: "Kedai Rasa Asli",        food_name: foodName, rating: 4.3, count_rating: 567,  city: "Bandung", address: "Jl. Cihampelas No.45, Bandung" },
  ];
  const list = (restaurants && restaurants.length > 0) ? restaurants : fallback;

  const avgRating = list.length
    ? (list.reduce((s, r) => s + (r.rating || 0), 0) / list.length).toFixed(1)
    : "–";

  const page = document.createElement("section");
  page.id = "restaurantResultPage";
  page.className = "page active rr-page";

  page.innerHTML = `
    <!-- Hero -->
    <div class="rr-hero">
      <button class="rr-back" onclick="closeRestaurantResultPage()">←</button>
      <div>
        <p class="small-text" style="color:#ff844d;">PILIHAN KAMU</p>
        <h1 style="font-size:34px;">${foodName}</h1>
        <div class="trending-badge">🎉 ${list.length} Restoran Ditemukan</div>
      </div>
    </div>

    <!-- Stats row -->
    <div class="rr-stats">
      <div class="rr-stat">
        <b>${list.length}</b>
        <span>Restoran</span>
      </div>
      <div class="rr-stat-divider"></div>
      <div class="rr-stat">
        <b>⭐ ${avgRating}</b>
        <span>Avg Rating</span>
      </div>
      <div class="rr-stat-divider"></div>
      <div class="rr-stat">
        <b>📍 Terdekat</b>
        <span>Diurutkan</span>
      </div>
    </div>

    <!-- List -->
    <div class="rr-list">
      ${list.length ? list.map((r, i) => `
        <div class="rr-card" style="animation-delay:${i * 0.07}s">
          <div class="rr-card-left">
            <div class="rr-rank">${i + 1}</div>
          </div>
          <div class="rr-card-body">
            <div class="rr-card-top">
              <div>
                <div class="rr-card-name">${r.restaurant_name || "Nama Restoran"}</div>
                <div class="rr-card-food">🍽️ ${r.food_name || foodName}</div>
              </div>
              <div class="rr-card-rating">⭐ ${r.rating || "–"}</div>
            </div>
            <div class="rr-card-addr">
              📍 ${r.address || r.city || "Lokasi tidak tersedia"}
              ${r.count_rating ? `<span class="rr-review-count">${Number(r.count_rating).toLocaleString()} ulasan</span>` : ""}
            </div>
            <div class="rr-card-actions">
              <button class="rr-btn rr-btn-primary" onclick="openGoogleMaps('${encodeURIComponent(r.restaurant_name || foodName)}')">🗺️ Buka Maps</button>
              <button class="rr-btn rr-btn-secondary" onclick="shareRestaurant('${(r.restaurant_name || foodName).replace(/'/g, "\\'")}')">📤 Bagikan</button>
            </div>
          </div>
        </div>
      `).join('') : `
        <div class="rr-empty">
          <div style="font-size:52px;margin-bottom:14px;">😔</div>
          <h3 style="margin-top:0;">Belum ada restoran</h3>
          <p>Coba lagi nanti ya!</p>
        </div>
      `}
    </div>
  `;

  // Sisipkan sebelum navbar agar tetap dalam .app
  const app = document.querySelector(".app");
  app.appendChild(page);

  // Scroll ke atas
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeRestaurantResultPage() {
  const page = document.getElementById("restaurantResultPage");
  if (page) page.remove();
  showPage("homePage");
}

function openGoogleMaps(encoded) {
  const name = decodeURIComponent(encoded);
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`, "_blank");
}

function shareRestaurant(name) {
  if (navigator.share) {
    navigator.share({ title: "FooDer Rekomendasi", text: `Coba ${name} — ditemukan via FooDer! 🍽️` });
  } else {
    alert(`Restoran: ${name}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  INJECT CSS – Loader + Restaurant Result (sesuai tema #fff8ef / orange)
// ══════════════════════════════════════════════════════════════════════════════

function injectLoaderAndResultCSS() {
  if (document.getElementById("foorderDynamicCSS")) return;
  const s = document.createElement("style");
  s.id = "foorderDynamicCSS";
  s.textContent = `

    /* ── LOADER ─────────────────────────────────────────────────── */
    @keyframes flFadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes flPulse    { 0%{transform:scale(0.85);opacity:.7} 100%{transform:scale(1.55);opacity:0} }
    @keyframes flPulse2   { 0%{transform:scale(0.85);opacity:.4} 100%{transform:scale(1.9);opacity:0} }
    @keyframes flIconPop  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.18)} }
    @keyframes flShimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

    .fl-overlay {
      position: fixed; inset: 0;
      background: rgba(43,33,27,.55);
      backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      z-index: 99999;
      animation: flFadeIn 0.3s ease;
    }
    .fl-box {
      background: #fff8ef;
      border-radius: 36px;
      padding: 32px 24px 28px;
      width: 320px; max-width: 90vw;
      text-align: center;
      box-shadow: 0 24px 60px rgba(255,95,95,.18), 0 8px 20px rgba(0,0,0,.08);
    }
    .fl-food-name {
      font-size: 22px; font-weight: 900; color: #ff844d;
      margin-bottom: 2px;
    }
    .fl-title {
      font-size: 17px; font-weight: 800; color: #2b211b;
      margin-bottom: 4px;
    }
    .fl-subtitle { font-size: 13px; color: #7b6f67; margin-bottom: 22px; }

    .fl-anim {
      position: relative; width: 80px; height: 80px;
      margin: 0 auto 18px;
    }
    .fl-ring {
      position: absolute; inset: 0; border-radius: 50%;
      border: 3px solid #ff844d;
      animation: flPulse 1.4s ease-out infinite;
    }
    .fl-ring2 { animation: flPulse2 1.4s ease-out .5s infinite; border-color: #ff5f5f; }
    .fl-icon-wrap {
      position: absolute; inset: 0; border-radius: 50%;
      background: #ffe4dc;
      display: flex; align-items: center; justify-content: center;
    }
    .fl-icon {
      font-size: 30px; transition: transform 0.25s ease;
      animation: flIconPop 1.8s ease infinite;
    }

    .fl-msg { font-size: 13px; color: #7b6f67; min-height: 20px; margin-bottom: 14px; }

    .fl-bar-wrap {
      height: 8px; background: #f8e3cb; border-radius: 999px;
      margin-bottom: 18px; overflow: hidden;
    }
    .fl-bar-fill {
      height: 100%; width: 0%; border-radius: 999px;
      background: linear-gradient(90deg, #ff844d, #ff5f5f);
      background-size: 200% 100%;
      transition: width 0.6s ease;
      animation: flShimmer 1.5s linear infinite;
    }

    .fl-steps { display: flex; flex-direction: column; gap: 6px; text-align: left; }
    .fl-step {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 14px;
      background: #fff2e5; opacity: 0.4;
      transition: opacity .3s, background .3s;
    }
    .fl-step.active { opacity: 1; background: white; box-shadow: 0 4px 14px rgba(0,0,0,.06); }
    .fl-step-icon { font-size: 15px; }
    .fl-step-text { flex: 1; font-size: 12px; color: #6b5c51; font-weight: 600; }
    .fl-step-check { font-size: 13px; }

    /* ── RESTAURANT RESULT PAGE ──────────────────────────────────── */
    @keyframes rrSlideUp {
      from { opacity:0; transform:translateY(22px); }
      to   { opacity:1; transform:translateY(0); }
    }

    .rr-page { padding-bottom: 120px; }

    .rr-hero {
      padding: 28px 0 16px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .rr-back {
      flex-shrink: 0;
      width: 52px; height: 52px;
      border: none; border-radius: 50%;
      background: white;
      font-size: 22px; cursor: pointer;
      box-shadow: 0 10px 30px rgba(0,0,0,.08);
      margin-top: 4px;
    }

    .rr-stats {
      display: flex; align-items: center; justify-content: space-between;
      background: white; border-radius: 26px;
      padding: 18px 20px; margin-bottom: 24px;
      box-shadow: 0 12px 30px rgba(0,0,0,.05);
    }
    .rr-stat { text-align: center; flex: 1; }
    .rr-stat b { display: block; font-size: 17px; font-weight: 900; color: #2b211b; }
    .rr-stat span { font-size: 11px; color: #7b6f67; font-weight: 700; letter-spacing: .5px; }
    .rr-stat-divider { width: 1px; height: 36px; background: #f0e8df; }

    .rr-list { display: flex; flex-direction: column; gap: 14px; }

    .rr-card {
      background: white;
      border-radius: 26px;
      padding: 14px;
      display: flex;
      gap: 14px;
      align-items: flex-start;
      box-shadow: 0 12px 30px rgba(0,0,0,.05);
      animation: rrSlideUp 0.4s ease both;
    }

    .rr-card-left { padding-top: 2px; }
    .rr-rank {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg,#ff844d,#ff5f5f);
      color: white; font-size: 14px; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .rr-card-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }

    .rr-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .rr-card-name { font-size: 16px; font-weight: 800; color: #2b211b; margin-bottom: 3px; }
    .rr-card-food { font-size: 12px; color: #ff844d; font-weight: 700; }

    .rr-card-rating {
      background: #fff2e5; color: #ff844d;
      font-size: 13px; font-weight: 800;
      padding: 5px 12px; border-radius: 999px;
      white-space: nowrap; flex-shrink: 0;
    }

    .rr-card-addr {
      font-size: 12px; color: #7b6f67;
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    }
    .rr-review-count { margin-left: auto; color: #b0a49c; font-size: 11px; }

    .rr-card-actions { display: flex; gap: 8px; }
    .rr-btn {
      flex: 1; padding: 11px 10px; border-radius: 999px;
      border: none; font-size: 12px; font-weight: 800;
      cursor: pointer; transition: opacity .15s, transform .15s;
    }
    .rr-btn:active { opacity: .75; transform: scale(.97); }
    .rr-btn-primary {
      background: linear-gradient(135deg,#ff844d,#ff5f5f);
      color: white;
      box-shadow: 0 8px 20px rgba(255,95,95,.22);
    }
    .rr-btn-secondary { background: #fff2e5; color: #ff844d; }

    .rr-empty {
      text-align: center; padding: 48px 20px;
      color: #7b6f67;
    }
  `;
  document.head.appendChild(s);
}