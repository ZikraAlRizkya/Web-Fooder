const API_BASE_URL = "https://gray-resume-unwitting.ngrok-free.dev";

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(".nav");

const foodCard = document.querySelector(".food-card");
const rejectBtn = document.querySelector(".reject-btn");
const likeBtn = document.querySelector(".like-btn");
const darkModeToggle = document.getElementById("darkModeToggle");

let currentCuisine = "All";

async function apiFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      "ngrok-skip-browser-warning": "true",
      ...(options.headers || {})
    }
  });
}

if (localStorage.getItem("darkMode") === "enabled") {
  document.body.classList.add("dark-mode");

  if (darkModeToggle) {
    darkModeToggle.checked = true;
  }
}

if (darkModeToggle) {
  darkModeToggle.addEventListener("change", function () {
    if (this.checked) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("darkMode", "enabled");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("darkMode", "disabled");
    }
  });
}

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

function renderSearchFoods(
  foods
){

  const list =
    document.getElementById(
      "searchResultList"
    );

  const resultCount =
    document.getElementById(
      "searchResultCount"
    );

  if(resultCount){
    resultCount.textContent =
      `${foods.length} results`;
  }

  list.innerHTML =
    foods.map(food => `
      <div class="list-card" onclick="confirmRestaurantSearch('${food.food_name}','${food.category}')">
        <img src="${
          food.img_url
        }">
        <div>
          <h4>
            ${toTitleCase(
              food.food_name
            )}
          </h4>
          <p>
            ${toTitleCase(
              food.category
            )}
          </p>
          <small>
            ${
              food.origin_country
            }
          </small>
        </div>
      </div>
    `).join("");
}

function confirmRestaurantSearch(
  foodName
){
  console.log("CARD DIKLIK:", foodName);
  const existing =
    document.getElementById(
      "foodSearchModal"
    );

  if(existing){
    existing.remove();
  }

  const modal =
    document.createElement("div");

  modal.id =
    "foodSearchModal";

  modal.innerHTML = `
    <div class="rr-popup">

      <div class="rr-popup-box">

        <button
          class="rr-popup-close"
          onclick="
            document
              .getElementById('foodSearchModal')
              .remove()
          "
        >
          ×
        </button>

        <h2 class="rr-popup-title">
          🍽️ Temukan Restoran
        </h2>

        <p
          style="
            margin-top:14px;
            font-size:18px;
            line-height:1.6;
            color:#5f5147;
          "
        >
          Kami akan mencari restoran terbaik yang
          menyajikan:
        </p>

        <div
          style="
            margin:18px 0;
            background:#fff;
            border-radius:18px;
            padding:14px;
            font-weight:700;
            font-size:20px;
            color:#ff844d;
            text-align:center;
            box-shadow:0 4px 14px rgba(0,0,0,.05);
          "
        >
          🍜 ${foodName}
        </div>

        <p
          style="
            font-size:15px;
            color:#8b7d73;
            line-height:1.6;
          "
        >
          📍 Pencarian akan disesuaikan dengan lokasi dan preferensi kulinermu untuk menemukan pilihan yang paling relevan.
        </p>

        <div class="food-search-actions">

          <button
            class="food-search-btn-cancel"
            style="flex:1"
            onclick="
              document
                .getElementById('foodSearchModal')
                .remove()
            "
          >
            😊 Nanti Saja
          </button>

          <button
            class="food-search-btn-confirm"
            style="flex:1"
            onclick="
              startRestaurantSearch(
                '${foodName.replace(/'/g, "\\'")}'
              )
            "
          >
            🔍 Cari Sekarang
          </button>

        </div>

      </div>

    </div>
  `;
  document.body.appendChild(
    modal
  );
}
async function startRestaurantSearch(
  foodName
){
  document
    .getElementById(
      "foodSearchModal"
    )
    ?.remove();
  try{
    const user =
      JSON.parse(
        localStorage.getItem(
          "fooderUser"
        )
      );
    if(!user){
      alert(
        "Silakan login terlebih dahulu."
      );
      return;
    }
    showLoading();
    const response =
      await fetch(
        `${API_BASE_URL}/match/${encodeURIComponent(foodName)}/${user.id}`
      );
    const data =
      await response.json();
    hideLoading();
    await showRestaurantResultPage(
      foodName,
      data.restaurants
    );
    showPage(
      "nearbyPage"
    );
  }
  catch(error){
    hideLoading();
    console.error(
      error
    );
    alert(
      "Gagal mencari restoran."
    );
  }
}

document.addEventListener(
  "DOMContentLoaded",
  () => {

    updateChatbotVisibility();

  }
);

const chatInput =
  document.getElementById("chatInput");

chatInput.addEventListener(
  "input",
  function () {

    this.style.height = "auto";

    this.style.height =
      this.scrollHeight + "px";
  }
);

function toggleChatbot() {

  const box =
    document.getElementById("chatbotBox");

  if (box.style.display === "flex") {
    box.style.display = "none";
  } else {
    box.style.display = "flex";
  }
}

function updateChatbotVisibility() {

  const chatbotBtn =
    document.getElementById("chatbotBtn");

  const chatbotBox =
    document.getElementById("chatbotBox");

  if (!chatbotBtn || !chatbotBox) return;

  const allowedPages = [
    "homePage",
    "searchPage",
    "favoritePage",
    "nearbyPage",
    "profilePage"
  ];

  const shouldShow =
    allowedPages.includes(
      document.querySelector(".page.active")?.id
    );

  chatbotBtn.style.display =
    shouldShow ? "flex" : "none";

  if (!shouldShow) {
    chatbotBox.style.display = "none";
  }
}

document
  .getElementById("chatbotBtn")
  .addEventListener(
    "click",
    toggleChatbot
  );

async function sendChat() {

  const input =
    document.getElementById("chatInput");

  const text =
    input.value.trim();

  if (!text) return;

  const messages =
    document.getElementById("chatMessages");

  messages.innerHTML += `
    <div class="user-msg">
      ${text}
    </div>
  `;

    messages.innerHTML += `
    <div class="bot-msg" id="typingIndicator">
      FoodBot sedang berpikir...
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  input.value = "";

  messages.scrollTop =
    messages.scrollHeight;

  try {

    const response =
      await fetch(
        `${API_BASE_URL}/chat`,
        {
          method:"POST",

          headers:{
            "Content-Type":"application/json",
            "ngrok-skip-browser-warning":"true"
          },

          body:JSON.stringify({
            message:text
          })
        }
      );

    const data =
      await response.json();

    document.getElementById("typingIndicator")?.remove();

    messages.innerHTML += `
      <div class="bot-msg">
        ${marked.parse(data.reply)}
      </div>
    `;

    messages.scrollTop =
      messages.scrollHeight;

  }
  catch(error){

    messages.innerHTML += `
      <div class="bot-msg">
        Maaf, chatbot sedang bermasalah.
      </div>
    `;
  }
}

async function loadFoodsByCuisine(
  cuisine
) {
  try {
    const response =
      await apiFetch(
        `${API_BASE_URL}/foods/cuisine/${cuisine}`
      );
    const foods =
      await response.json();
    renderSearchFoods(
      foods
    );
  }
  catch(err){
    console.error(err);
  }
}

async function loadSearchFoods() {
  const list =
    document.getElementById(
      "searchResultList"
    );
  if (!list) return;
  try {
    const response =
      await apiFetch(
        `${API_BASE_URL}/foods`
      );
    const foods =
      await response.json();
    const firstTen =
      foods.slice(0, 10);
    list.innerHTML =
      firstTen.map(food => `
        <div
          class="list-card"
          data-cuisine="${
            (
              food.origin_country ||
              ""
            ).toLowerCase()
          }"
        >
          <img src="${
            food.img_url ||
            "https://picsum.photos/300"
          }">
          <div>
            <h4>
              ${toTitleCase(
                food.food_name
              )}
            </h4>
            <p>
              ${
                food.category ||
                "Food"
              }
            </p>
            <small>
              ${
                food.origin_country ||
                "Unknown"
              }
            </small>
          </div>
        </div>
      `).join("");
      const resultCount =
        document.getElementById(
          "searchResultCount"
        );

      if(resultCount){
        resultCount.textContent =
          `${firstTen.length} results`;
      }
  } catch(err) {
    console.error(
      "Search foods error:",
      err
    );
  }
  console.log(
    "TOTAL FOODS:",
    foods.length
  );

  console.log(
    "FIRST TEN:",
    firstTen
  );
}

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
    const response = await apiFetch(`${API_BASE_URL}/foods`);
    const data = await response.json();

    foods = data.map((food, index) => {
      // Bangun tags dari category dan ingredient karena API tidak kirim field tags
      const categoryStr = food.category || "";
      const ingredientStr = food.ingredient || "";
      const autoTags = [
        ...categoryStr.split(",").map(s => s.trim()).filter(Boolean),
        ...ingredientStr.split(",").map(s => s.trim()).filter(Boolean).slice(0, 2)
      ].slice(0, 4);

      return {
        id: food.id || index + 1,
        food_name: capitalizeWords(food.food_name || food.title_cleaned || food.name || "Food Name"),
        img: food.img_url || "https://picsum.photos/500/700",
        image: food.img_url || "https://picsum.photos/500/700",
        cuisine: [food.category, food.origin_country].filter(Boolean).join(" · ") || "Food",
        tags: autoTags.length > 0 ? autoTags : ["Recommended"],
        insight: food.description || food.insight || "This food is recommended based on rating and user preference.",
      };
    });

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
    const response = await apiFetch(`${API_BASE_URL}/users`);
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
  if (!user) return;

  const nameEl = document.getElementById("profileName");
  const bioEl = document.getElementById("profileBio");
  const avatarEl = document.getElementById("profileAvatar");
  const likeEl = document.getElementById("likedCount");
  const swipeEl = document.getElementById("swipeCount");
  const matchEl = document.getElementById("matchCount");
  const allergyEl = document.getElementById("allergie");

  if (nameEl) nameEl.innerText = user.username || user.name || "User";
  if (bioEl) bioEl.innerText = `Foodie · ${user.city || "Indonesia"}`;
  if (avatarEl) avatarEl.innerText = (user.username || user.name || "U").charAt(0).toUpperCase();
  if (likeEl) likeEl.innerText = user.like || 0;
  if (swipeEl) swipeEl.innerText = user.swipe || 0;
  if (matchEl) matchEl.innerText = user.match || 0;
  if (allergyEl) allergyEl.innerText = user.allergy || "Tidak ada";
}

function showLoading() {
  const overlay =
    document.getElementById(
      "loadingOverlay"
    );
  overlay.classList.add("active");
}
function hideLoading() {
  const overlay =
    document.getElementById(
      "loadingOverlay"
    );
  overlay.classList.remove("active");
}

/* PAGE NAVIGATION */

function showPage(pageId) {
  pages.forEach((page) =>
    page.classList.remove("active")
  );

  const selectedPage =
    document.getElementById(pageId);

  if (!selectedPage) return;

  selectedPage.classList.add("active");

  const authPages = [
    "loginPage",
    "registerPage",
    "successPage"
  ];

  if (authPages.includes(pageId)) {
    document.body.classList.add("auth-active");
  } else {
    document.body.classList.remove("auth-active");
  }

  navButtons.forEach((button) =>
    button.classList.remove("active")
  );

  const pageNavMap = {
    homePage: 0,
    searchPage: 1,
    favoritePage: 2,
    nearbyPage: 3,
    profilePage: 4
  };

  if (pageNavMap[pageId] !== undefined) {
    navButtons[
      pageNavMap[pageId]
    ].classList.add("active");
  }

  if (pageId === "favoritePage") {
    renderFavoritePage();
  }

  if (pageId === "searchPage") {
    currentCuisine = "All";
    performSearch();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
  updateChatbotVisibility();
}

window.showPage = showPage;

/* AUTH FLOW */

async function loginUser() {
  const username = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;

  if (!username || !password) {
    alert("Harap isi username dan password terlebih dahulu.");
    return;
  }

  try {
    const response = await apiFetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();

    if (data.success) {
      // Simpan data user ke localStorage untuk sesi ini
      localStorage.setItem("fooderUser", JSON.stringify(data.user));
      renderUserProfile(data.user);
      showPage("successPage");
    } else {
      alert(data.message || "Username atau password salah.");
    }
  } catch (error) {
    console.error("Login failed:", error);
    alert("Gagal terhubung ke server. Pastikan backend berjalan.");
  }
}

window.loginUser = loginUser;

async function registerUser() {
  const fullName = document.getElementById("fullName")?.value.trim();
  const username = document.getElementById("username")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;
  const age = document.getElementById("age")?.value;
  const city = document.getElementById("city")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const gender = document.getElementById("gender")?.value;
  const otherAllergy = document.getElementById("otherAllergy")?.value;

  if (!fullName || !username || !email || !password || !age || !city || !phone || !gender) {
    alert("Harap isi semua field yang diperlukan.");
    return;
  }

  const selectedAllergies = [...document.querySelectorAll(".allergy-chips span.active")]
    .map((chip) => chip.textContent);
  if (otherAllergy) selectedAllergies.push(otherAllergy);

  try {
    const response = await apiFetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fullName,
        username,
        email,
        password,
        age: parseInt(age),
        city,
        phone,
        allergy: selectedAllergies.join(", "),
        gender
      })
    });
    const data = await response.json();

    if (data.success) {
      // Simpan user ke localStorage dan langsung login
      localStorage.setItem("fooderUser", JSON.stringify(data.user));
      renderUserProfile(data.user);
      showPage("successPage");
    } else {
      // Tampilkan peringatan (termasuk username sudah ada)
      alert(data.message || "Registrasi gagal.");
    }
  } catch (error) {
    console.error("Register failed:", error);
    alert("Gagal terhubung ke server. Pastikan backend berjalan.");
  }
}

window.registerUser = registerUser;

async function logoutUser() {
  const currentUser =
    JSON.parse(
      localStorage.getItem(
        "fooderUser"
      )
    );

  if (currentUser) {
    try {
      await apiFetch(
        `${API_BASE_URL}/logout/${currentUser.id}`,
        {
          method: "POST"
        }
      );
    } catch (err) {
      console.error(err);
    }
  }

  localStorage.clear();
  sessionStorage.clear();

  foods = [];
  foodIndex = 0;

  showPage("loginPage");
}

window.logoutUser = logoutUser;

/* DAILY PREFERENCE MODAL */

function openDailyPreference() {
  if (dailyPreferenceModal) {
    dailyPreferenceModal.classList.add("active");
    const modalContent =
      dailyPreferenceModal.querySelector(
        ".modal-content"
      );
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  }
}

window.openDailyPreference = openDailyPreference;

function closeDailyPreference() {
  if (dailyPreferenceModal) {
    dailyPreferenceModal.classList.remove("active");
  }
}

window.closeDailyPreference = closeDailyPreference;

async function startSwipeFromPreference() {
  showLoading();
  try {
    document.getElementById(
      "loadingText"
    ).textContent =
      "Saving your preferences...";
    const selectedTodayPreferences =
      [...document.querySelectorAll(".daily-chips span.active")]
        .map(chip => chip.textContent.trim());
    console.log(
      "Today's preference:",
      selectedTodayPreferences
    );
    localStorage.setItem(
      "todayPreference",
      JSON.stringify(selectedTodayPreferences)
    );
    const currentUser =
      JSON.parse(
        localStorage.getItem("fooderUser")
      );
    if (!currentUser) {
      console.error("User not found");
      hideLoading();
      return;
    }
    const moods = [];
    const foodTypes = [];
    const cuisines = [];
    const requirements = [];
    selectedTodayPreferences.forEach(pref => {
      if (
        [
          "Spicy",
          "Sweet",
          "Savory",
          "Comfort Food",
          "Healthy"
        ].includes(pref)
      ) {
        moods.push(pref);
      }
      else if (
        [
          "Rice",
          "Noodles",
          "Chicken",
          "Seafood",
          "Snack",
          "Dessert"
        ].includes(pref)
      ) {
        foodTypes.push(pref);
      }
      else if (
        [
          "Indonesian",
          "Korean",
          "Japanese",
          "Western",
          "Chinese"
        ].includes(pref)
      ) {
        cuisines.push(pref);
      }
      else {
        requirements.push(pref);
      }
    });
    // ==========================================
    // SAVE PREFERENCES
    // ==========================================
    const response = await apiFetch(
      `${API_BASE_URL}/preferences`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          moods: moods,
          food_types: foodTypes,
          cuisines: cuisines,
          requirements: requirements
        })
      }
    );
    const result =
      await response.json();
    console.log(
      "Preference Saved:",
      result
    );
    // ==========================================
    // BUILD MODEL
    // ==========================================
    document.getElementById(
      "loadingText"
    ).textContent =
      "Building recommendation model...";
    await new Promise(resolve =>
      setTimeout(resolve, 500)
    );
    // ==========================================
    // LOAD RECOMMENDATIONS
    // ==========================================
    document.getElementById(
      "loadingText"
    ).textContent =
      "Calculating your recommendations...";
    const recResponse = await apiFetch(
      `${API_BASE_URL}/recommendations/personal/${currentUser.id}`
    );
    const recData =
      await recResponse.json();
    console.log(
      "INITIAL RECOMMENDATIONS:",
      recData
    );
    if (recData.recommendations) {
      foods =
        recData.recommendations;
      foodIndex = 0;
      updateFoodCard();
    }
    // ==========================================
    // FINISH
    // ==========================================
    closeDailyPreference();
    showPage("homePage");
  }
  catch (err) {
    console.error(
      "Failed to start recommendation flow:",
      err
    );
  }
  finally {
    hideLoading();
  }
}

window.startSwipeFromPreference = startSwipeFromPreference;

function showLoading() {
  document
    .getElementById("loadingOverlay")
    .classList.add("active");

}

function hideLoading() {
  document
    .getElementById("loadingOverlay")
    .classList.remove("active");

}

async function saveSwipe(action) {
  if (foods.length === 0) return;

  // Ambil user dari sesi login
  const storedUser = localStorage.getItem("fooderUser");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const userId = currentUser?.id || 1;

  try {
    const swipeResponse = await apiFetch(
        `${API_BASE_URL}/swipe`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: userId,
                food_id:
                    foods[foodIndex].food_id ??
                    foods[foodIndex].id,
                action: action
            })
        }
    );

    const swipeData =
        await swipeResponse.json();

    console.log(
        "SWIPE RESPONSE:",
        swipeData
    );

    if (
        swipeData.match &&
        swipeData.match.matched
    ) {
        console.log(
            "MATCH FOUND:",
            swipeData.match.food_name
        );

        await triggerFoodMatch({
            food_name:
                swipeData.match.food_name,
            image:
                foods[foodIndex].img_url ||
                foods[foodIndex].image ||
                foods[foodIndex].img
        });

        return;
    }

    const recResponse = await apiFetch(
      `${API_BASE_URL}/recommendations/personal/${userId}`
    );

    const recData = await recResponse.json();

    console.log("NEW TFIDF RECOMMENDATIONS:", recData);
    if (recData.recommendations) {
        foods = recData.recommendations;
    }
    // Update hitungan lokal di localStorage (swipe DB + sesi ini)
    if (currentUser) {
      currentUser.swipe = (currentUser.swipe || 0) + 1;
      if (action === "like") {
        currentUser.like = (currentUser.like || 0) + 1;
      }
      localStorage.setItem("fooderUser", JSON.stringify(currentUser));

      // Perbarui tampilan profil jika sudah di-render
      const swipeEl = document.getElementById("swipeCount");
      const likeEl = document.getElementById("likedCount");
      if (swipeEl) swipeEl.innerText = currentUser.swipe;
      if (likeEl) likeEl.innerText = currentUser.like;
    }

    console.log(`Swipe ${action} saved for user ${userId}`);

  } catch (error) {
    console.error("Failed to save swipe:", error);
  }
}

function nextFood() {
  foodIndex++;
  if (foodIndex >= foods.length) {
    foodIndex = 0;
  }
  console.log(
    "SWIPE TO ->",
    foodIndex,
    foods[foodIndex]?.food_name
  );
  updateFoodCard();
}

function saveLikedFood(food) {
  if (!food) return;

  const likedFoods = JSON.parse(localStorage.getItem("likedFoods")) || [];

  const alreadyLiked = likedFoods.some((item) => item.id === food.id);

  if (!alreadyLiked) {
    likedFoods.push(food);
    localStorage.setItem("likedFoods", JSON.stringify(likedFoods));
  }
}

function renderFavoritePage() {

  const favoriteGrid =
    document.getElementById(
      "favoriteGrid"
    );

  if (!favoriteGrid) return;

  const likedFoods =
    JSON.parse(
      localStorage.getItem(
        "likedFoods"
      )
    ) || [];

  if (likedFoods.length === 0) {

    favoriteGrid.innerHTML = `
      <div class="empty-favorite">
        <h3>
          Belum ada makanan yang disukai
        </h3>
        <p>
          Swipe kanan dulu makanan yang kamu suka,
          nanti muncul di sini.
        </p>
      </div>
    `;

    return;
  }

  favoriteGrid.innerHTML =
    likedFoods.map(food => `

      <div class="fav-card">

        <img
          src="${
            food.img_url ||
            food.img ||
            food.image ||
            'https://picsum.photos/400/400'
          }"
          alt="${food.food_name}"
        >

        <button>❤️</button>

        <h4>
          ${toTitleCase(
            food.food_name || "Food"
          )}
        </h4>

        <p>
          ${toTitleCase(
            food.category || "Other"
          )}
        </p>

        <p>
          ${
            food.origin_country ||
            "Unknown"
          }
        </p>

      </div>

    `).join("");
}

function swipeRight() {
  if (!foodCard) return;

  const currentFood = foods[foodIndex];

  saveLikedFood(currentFood);

  saveSwipe("like");

  foodCard.style.transition = "0.35s ease";
  foodCard.style.transform = "translateX(520px) rotate(25deg)";

  setTimeout(() => {
    nextFood();
  }, 350);
}

async function loadRecommendations(userId) {
  try {
    const response = await apiFetch(
      `${API_BASE_URL}/recommendations/personal/${userId}`
    );

    const data = await response.json();

    console.log("TF-IDF Recommendations:", data);

    if (data.recommendations) {
      foods = data.recommendations;
    }
  } catch (err) {
    console.error(err);
  }
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
  const foodName =
    food?.food_name || "makanan ini";
  const foodImage =
    food?.image ||
    food?.img ||
    "https://picsum.photos/400/400";
  const currentUser =
    JSON.parse(
      localStorage.getItem(
        "fooderUser"
      )
    );
  const userId =
    currentUser?.id;
  if (!userId) {
    console.error(
      "User ID tidak ditemukan"
    );
    return;
  }
  // Mulai scraping SEKARANG
  const scrapingPromise =
    apiFetch(
      `${API_BASE_URL}/match/${encodeURIComponent(foodName)}/${userId}`
    )
      .then(r => r.json())
      .catch(() => null);
  // Tampilkan animasi match
  await showFoodMatchCard(
    foodName,
    foodImage
  );
  // Loader scraping
  showScrapingLoader(
    foodName
  );
  try {
    const data =
      await scrapingPromise;

    console.log(
      "MATCH RESPONSE:",
      data
    );
    window._matchedFood =
      foodName;
    window._matchedRestaurants =
      (
        data &&
        data.restaurants
      )
        ? data.restaurants
        : [];

    await waitForLoaderFinish();
    hideScrapingLoader();
    showRestaurantResultPage(
      foodName,
      window._matchedRestaurants
    );
  }
  catch (error) {
    console.error(
      "Match/scraping failed:",
      error
    );
    await waitForLoaderFinish();
    hideScrapingLoader();
    showRestaurantResultPage(
      foodName,
      []
    );

  }
}

function showFoodMatchCard(foodName, foodImage) {
  return new Promise(resolve => {
    injectLoaderAndResultCSS();

    const existing = document.getElementById("foodMatchCardPopup");
    if (existing) existing.remove();

    const popup = document.createElement("div");
    popup.id = "foodMatchCardPopup";
    popup.innerHTML = `
      <div class="fmc-overlay">
        <div class="fmc-card-wrap">
          <div class="fmc-sparkles">
            <span class="fmc-spark fmc-spark1">✨</span>
            <span class="fmc-spark fmc-spark2">⭐</span>
            <span class="fmc-spark fmc-spark3">🌟</span>
            <span class="fmc-spark fmc-spark4">✨</span>
          </div>
          <div class="fmc-card">
            <div class="fmc-badge">🎉 MATCH!</div>
            <div class="fmc-img-wrap">
              <img class="fmc-img" src="${foodImage}" alt="${foodName}" onerror="this.src='https://picsum.photos/400/400'">
              <div class="fmc-img-overlay"></div>
            </div>
            <div class="fmc-content">
              <p class="fmc-label">Makanan yang cocok untuk mu hari ini!</p>
              <h2 class="fmc-name">${foodName}</h2>
              <div class="fmc-hearts">
                <span>❤️</span><span>❤️</span><span>❤️</span>
              </div>
            </div>
          </div>
          <div class="fmc-loading-bar">
            <div class="fmc-loading-fill" id="fmcLoadingFill"></div>
          </div>
          <p class="fmc-hint">Sedang menyiapkan rekomendasi...</p>
        </div>
      </div>
    `;

    // Inject CSS if not already done
    if (!document.getElementById("fmcCSS")) {
      const s = document.createElement("style");
      s.id = "fmcCSS";
      s.textContent = `
        @keyframes fmcFadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes fmcSlideUp  { from{opacity:0;transform:translateY(40px) scale(0.92)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fmcWobble   {
          0%   { transform: rotate(0deg) scale(1); }
          10%  { transform: rotate(-4deg) scale(1.02); }
          20%  { transform: rotate(4deg) scale(1.02); }
          30%  { transform: rotate(-3deg) scale(1.01); }
          40%  { transform: rotate(3deg) scale(1.01); }
          50%  { transform: rotate(-2deg) scale(1.005); }
          60%  { transform: rotate(2deg) scale(1.005); }
          70%  { transform: rotate(-1.5deg) scale(1); }
          80%  { transform: rotate(1.5deg) scale(1); }
          90%  { transform: rotate(-0.5deg) scale(1); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes fmcSpark1   { 0%,100%{transform:translate(0,0) scale(1);opacity:1} 50%{transform:translate(-12px,-18px) scale(1.3);opacity:.7} }
        @keyframes fmcSpark2   { 0%,100%{transform:translate(0,0) scale(1);opacity:1} 50%{transform:translate(14px,-14px) scale(1.4);opacity:.6} }
        @keyframes fmcSpark3   { 0%,100%{transform:translate(0,0) scale(1);opacity:1} 50%{transform:translate(-10px,16px) scale(1.2);opacity:.8} }
        @keyframes fmcSpark4   { 0%,100%{transform:translate(0,0) scale(1);opacity:1} 50%{transform:translate(12px,12px) scale(1.5);opacity:.5} }
        @keyframes fmcHeartBeat { 0%,100%{transform:scale(1)} 50%{transform:scale(1.25)} }
        @keyframes fmcShimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fmcFillBar  { from{width:0%} to{width:100%} }

        .fmc-overlay {
          position: fixed; inset: 0;
          background: rgba(43,33,27,.65);
          backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          z-index: 99999;
          animation: fmcFadeIn 0.4s ease;
        }
        .fmc-card-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          animation: fmcSlideUp 0.5s cubic-bezier(0.34,1.56,0.64,1);
        }
        .fmc-sparkles {
          position: absolute;
          pointer-events: none;
          font-size: 22px;
          width: 300px; height: 300px;
          display: flex; align-items: center; justify-content: center;
        }
        .fmc-spark { position: absolute; }
        .fmc-spark1 { top: 20px; left: 40px; animation: fmcSpark1 2.1s ease-in-out infinite; }
        .fmc-spark2 { top: 30px; right: 30px; animation: fmcSpark2 1.8s ease-in-out infinite .3s; }
        .fmc-spark3 { bottom: 40px; left: 30px; animation: fmcSpark3 2.3s ease-in-out infinite .6s; }
        .fmc-spark4 { bottom: 30px; right: 40px; animation: fmcSpark4 1.9s ease-in-out infinite .9s; }

        .fmc-card {
          width: 280px;
          background: white;
          border-radius: 32px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(255,95,95,.28), 0 12px 32px rgba(0,0,0,.12);
          animation: fmcWobble 15s cubic-bezier(0.36,0.07,0.19,0.97);
          position: relative;
        }
        .fmc-badge {
          position: absolute; top: 14px; left: 14px; z-index: 2;
          background: linear-gradient(135deg,#ff844d,#ff5f5f);
          color: white; font-size: 12px; font-weight: 900;
          padding: 6px 14px; border-radius: 999px;
          box-shadow: 0 6px 18px rgba(255,95,95,.35);
          letter-spacing: .5px;
        }
        .fmc-img-wrap { position: relative; width: 100%; height: 200px; overflow: hidden; }
        .fmc-img { width: 100%; height: 100%; object-fit: cover; }
        .fmc-img-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, transparent 40%, rgba(43,33,27,.5) 100%);
        }
        .fmc-content {
          padding: 18px 18px 20px;
          text-align: center;
          background: #fff8ef;
        }
        .fmc-label {
          font-size: 11px; font-weight: 700; color: #ff844d;
          text-transform: uppercase; letter-spacing: 1px;
          margin-bottom: 6px;
        }
        .fmc-name {
          font-size: 22px; font-weight: 900; color: #2b211b;
          margin-bottom: 12px; line-height: 1.2;
        }
        .fmc-hearts { display: flex; justify-content: center; gap: 6px; font-size: 18px; }
        .fmc-hearts span:nth-child(1) { animation: fmcHeartBeat 1.2s ease-in-out infinite; }
        .fmc-hearts span:nth-child(2) { animation: fmcHeartBeat 1.2s ease-in-out infinite .2s; }
        .fmc-hearts span:nth-child(3) { animation: fmcHeartBeat 1.2s ease-in-out infinite .4s; }

        .fmc-loading-bar {
          width: 260px; height: 6px;
          background: rgba(255,255,255,.3);
          border-radius: 999px; overflow: hidden;
        }
        .fmc-loading-fill {
          height: 100%; width: 0%;
          background: linear-gradient(90deg, #ff844d, #ff5f5f);
          background-size: 200% 100%;
          border-radius: 999px;
          animation: fmcFillBar 15s linear forwards, fmcShimmer 1.5s linear infinite;
        }
        .fmc-hint { font-size: 12px; color: rgba(255,255,255,.75); font-weight: 600; letter-spacing: .3px; }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(popup);

    setTimeout(() => {
      popup.style.opacity = "0";
      popup.style.transition = "opacity 0.4s ease";
      setTimeout(() => { popup.remove(); resolve(); }, 400);
    }, 15000);
  });
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
    span.textContent =
      toTitleCase(tag);
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

const categoryButtons =
  document.querySelectorAll(
    "#searchPage .chips span"
  );

const searchInput =
  document.getElementById(
    "searchInput"
  );

if (searchInput) {

  searchInput.addEventListener(
    "input",
    () => {

      performSearch();

    }
  );

}

async function performSearch() {

  const keyword =
    document
      .getElementById("searchInput")
      ?.value
      ?.trim() || "";

  try {

    const response =
      await apiFetch(
        `${API_BASE_URL}/foods/search?keyword=${encodeURIComponent(keyword)}&cuisine=${encodeURIComponent(currentCuisine)}`
      );

    const foods =
      await response.json();

    renderSearchFoods(
      foods
    );

  }
  catch(err){

    console.error(err);

  }

}

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((btn) =>
      btn.classList.remove("active")
    );
    button.classList.add("active");
    currentCuisine =
      button.dataset.cuisine || "All";
    const keyword =
      document.getElementById(
        "searchInput"
      )?.value?.trim() || "";
    console.log(
      "CURRENT CUISINE:",
      currentCuisine
    );
    if (keyword === "") {
      if (currentCuisine === "All") {
        loadSearchFoods();
      } else {
        loadFoodsByCuisine(
          currentCuisine
        );
      }
    } else {
      performSearch();
    }
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

/* SEARCH FILTER */

// const searchInput = document.querySelector(".search-box input");
const searchCards = document.querySelectorAll("#searchResultList .list-card");
const searchResultCount = document.getElementById("searchResultCount");

const distanceRange = document.getElementById("distanceRange");
const distanceValue = document.getElementById("distanceValue");
const ratingRange = document.getElementById("ratingRange");
const ratingValue = document.getElementById("ratingValue");

function getActiveFilterText(title) {
  const titles = [...document.querySelectorAll(".filter-title")];
  const targetTitle = titles.find((item) => item.textContent.trim().toLowerCase() === title);

  if (!targetTitle) return "all";

  const chips = targetTitle.nextElementSibling;
  const activeChip = chips?.querySelector("span.active");

  if (!activeChip) return "all";

  return activeChip.textContent
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase();
}

function applySearchFilters() {
  const keyword = searchInput?.value.toLowerCase() || "";
  const cuisine = getActiveFilterText("cuisine");

  let visibleCount = 0;

  searchCards.forEach((card) => {
    const text = card.textContent.toLowerCase();
    const cardCuisine = card.dataset.cuisine || "";

    const matchKeyword = text.includes(keyword);
    const matchCuisine = cuisine === "all" || cardCuisine.includes(cuisine);

    const isVisible =
      matchKeyword &&
      matchCuisine;

    card.style.display = isVisible ? "flex" : "none";

    if (isVisible) visibleCount++;
  });

  if (searchResultCount) {
    searchResultCount.innerText = `${visibleCount} results`;
  }
}

if (searchInput) {
  searchInput.addEventListener("input", applySearchFilters);
}

if (distanceRange && distanceValue) {
  distanceRange.addEventListener("input", function () {
    distanceValue.innerText = `${this.value} km`;
    applySearchFilters();
  });
}

if (ratingRange && ratingValue) {
  ratingRange.addEventListener("input", function () {
    ratingValue.innerText = `${Number(this.value).toFixed(1)}+`;
    applySearchFilters();
  });
}

document.querySelectorAll(".daily-chips span")
  .forEach(chip => {

    chip.addEventListener("click", () => {

      const group = chip.closest(".daily-group");

      group.querySelectorAll("span")
        .forEach(item => {
          item.classList.remove("active");
        });

      chip.classList.add("active");
    });

  });
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

const editProfileModal = document.getElementById("editProfileModal");
const editUsername = document.getElementById("editUsername");
const editProfilePicture = document.getElementById("editProfilePicture");

function openEditProfileModal() {
  if (!editProfileModal) return;

  const currentName = document.getElementById("profileName")?.innerText;

  if (editUsername && currentName !== "Loading...") {
    editUsername.value = currentName;
  }

  editProfileModal.classList.add("active");
}

window.openEditProfileModal = openEditProfileModal;

function closeEditProfileModal() {
  if (!editProfileModal) return;
  editProfileModal.classList.remove("active");
}

window.closeEditProfileModal = closeEditProfileModal;

function saveProfileChanges() {
  const newUsername = editUsername?.value.trim();
  const file = editProfilePicture?.files[0];

  if (newUsername) {
    document.getElementById("profileName").innerText = newUsername;
    document.getElementById("profileAvatar").innerText =
      newUsername.charAt(0).toUpperCase();

    localStorage.setItem("profileUsername", newUsername);
  }

  if (file) {
    const reader = new FileReader();

    reader.onload = function (event) {
      const avatar = document.getElementById("profileAvatar");

      avatar.innerHTML = `
        <img src="${event.target.result}" alt="Profile Picture">
      `;

      localStorage.setItem("profilePicture", event.target.result);
    };

    reader.readAsDataURL(file);
  }

  closeEditProfileModal();
}

window.saveProfileChanges = saveProfileChanges;

function loadSavedProfile() {
  const savedUsername = localStorage.getItem("profileUsername");
  const savedPicture = localStorage.getItem("profilePicture");

  if (savedUsername) {
    document.getElementById("profileName").innerText = savedUsername;
    document.getElementById("profileAvatar").innerText =
      savedUsername.charAt(0).toUpperCase();
  }

  if (savedPicture) {
    document.getElementById("profileAvatar").innerHTML = `
      <img src="${savedPicture}" alt="Profile Picture">
    `;
  }
}

/* INIT */

document.body.classList.add("auth-active");
// fetchFoods();

// Hapus sesi sebelumnya agar user selalu wajib login ulang setiap aplikasi dibuka
localStorage.removeItem("fooderUser");

loadSavedProfile();

// Inisialisasi halaman awal — selalu mulai dari halaman login
showPage("loginPage");

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
    const res = await apiFetch(`${SENTIMENT_API}/sentiment/restaurant/${restaurantId}`);

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
    const res = await apiFetch(`${SENTIMENT_API}/sentiment/restaurant-score`, {
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

function toTitleCase(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(" ")
    .map(word =>
      word.charAt(0).toUpperCase() +
      word.slice(1)
    )
    .join(" ");
}

// ── Perbaiki updateFoodCard agar meneruskan restaurantId ke detail ────────────
const _origUpdateFoodCard = window.updateFoodCard;
// Patch tombol detail di dalam updateFoodCard agar menyertakan restaurantId
const _origUpdateFC2 = updateFoodCard;
function updateFoodCard() {
    console.log(
      "UPDATE CARD",
      foodIndex,
      foods[foodIndex]
    );
  if (!foodCard || foods.length === 0) return;
  const food = foods[foodIndex];
  const imgElement =
    document.querySelector(".food-card img");
  imgElement.src =
    food.img_url ||
    "https://picsum.photos/500/700";
  document.querySelector(".food-card h2").textContent =
    toTitleCase(
      food.food_name || "Unknown Food"
    );
  // kanan atas = origin country
  document.querySelector(".price-tag").textContent =
    food.origin_country || "Food";
  // badge kiri bawah
  const scoreBadge =
    document.querySelector(".score-pill");
  console.log("CATEGORY =", food.category);
  console.log("TASTE_MOOD =", food.taste_mood);
  console.log("FULL FOOD =", food);
  console.log(
    "CATEGORY TITLE =",
    toTitleCase(food.category)
  );
  if (scoreBadge) {
    scoreBadge.textContent =
      `${toTitleCase(food.category || "")} • ${toTitleCase(food.taste_mood || "")}`;
  }
  // best match
  const bestMatch =
    document.querySelector(".best-match");
  if (bestMatch) {
    const finalScore =
      parseFloat(food.final_score || 0);
    console.log(
      "BEST MATCH CHECK:",
      food.food_name,
      finalScore
    );
    if (finalScore >= 0.45) {
      bestMatch.style.visibility  = "visible";
    } else {
      bestMatch.style.visibility  = "hidden";
    }
  }

  const tagBox =
    document.querySelector(".food-tags");

  if (tagBox) {
    tagBox.innerHTML = "";
    const tags = [];
    if (food.category)
      tags.push(food.category);
    if (food.taste_mood)
      tags.push(food.taste_mood);
    tags.forEach(tag => {
      const span =
        document.createElement("span");
      span.textContent = toTitleCase(tag);
      tagBox.appendChild(span);
    });
  }
  console.log("FOOD NAME:", food.food_name);
  console.log("FINAL SCORE:", food.final_score);
  console.log("TYPE:", typeof food.final_score);
  foodCard.style.transition = "none";
  foodCard.style.transform =
    "translateX(0) rotate(0deg) scale(0.95)";

  setTimeout(() => {

    foodCard.style.transition =
      "0.25s ease";

    foodCard.style.transform =
      "translateX(0) rotate(0deg) scale(1)";

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
  { icon: "📍", text: "Menemukan lokasi restoran..." },
  { icon: "⭐", text: "Mengambil data rating & ulasan..." },
  { icon: "💾", text: "Menyimpan ke database..." },
  { icon: "✨", text: "Tunggu sebentar..." },
  { icon: "🔍", text: "Melakukan analisis restoran..." },
  { icon: "😊", text: "Sabarr yaa..." },
  { icon: "😄", text: "Hampir selesai..." },
];

// Durasi tiap step (ms) — total ~120 detik dibagi jumlah step
const STEP_DURATION = Math.floor(120000 / LOADER_MESSAGES.length);

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
        <div class="fl-title">Makanan untukmu hari ini!</div>
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

        <div class="fl-steps" id="flSteps"></div>
      </div>
    </div>
  `;
  document.body.appendChild(loader);

  // Inject keyframe animasi masuk step jika belum ada
  if (!document.getElementById("flStepEntryKeyframe")) {
    const s = document.createElement("style");
    s.id = "flStepEntryKeyframe";
    s.textContent = `
      @keyframes flStepEnter {
        from { opacity: 0; transform: translateY(10px) scale(0.96); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(s);
  }

  let step = 0;

  function animateStep() {
    if (step >= LOADER_MESSAGES.length) return;

    const stepsContainer = document.getElementById("flSteps");
    const msgEl  = document.getElementById("flMsg");
    const iconEl = document.getElementById("flIcon");
    const fillEl = document.getElementById("flBarFill");

    // Tandai step sebelumnya sebagai selesai ✅
    const prevCheck = document.getElementById(`flCheck${step - 1}`);
    if (prevCheck) prevCheck.textContent = "✅";

    // Buat elemen step baru dan tambahkan ke DOM (muncul satu per satu)
    const stepEl = document.createElement("div");
    stepEl.className = "fl-step active";
    stepEl.id = `flStep${step}`;
    stepEl.style.animation = "flStepEnter 0.35s cubic-bezier(0.34,1.56,0.64,1) both";
    stepEl.innerHTML = `
      <span class="fl-step-icon">${LOADER_MESSAGES[step].icon}</span>
      <span class="fl-step-text">${LOADER_MESSAGES[step].text}</span>
      <span class="fl-step-check" id="flCheck${step}">⏳</span>
    `;
    if (stepsContainer) stepsContainer.appendChild(stepEl);

    // Scroll container ke bawah agar step terbaru selalu terlihat
    if (stepsContainer) stepsContainer.scrollTop = stepsContainer.scrollHeight;

    // Update teks pesan & ikon animasi di tengah
    if (msgEl) msgEl.textContent = LOADER_MESSAGES[step].text;
    if (iconEl) {
      iconEl.style.transform = "scale(0)";
      setTimeout(() => {
        iconEl.textContent = LOADER_MESSAGES[step].icon;
        iconEl.style.transform = "scale(1)";
      }, 150);
    }

    // Update progress bar
    if (fillEl) fillEl.style.width = ((step + 1) / LOADER_MESSAGES.length * 100) + "%";

    step++;

    if (step < LOADER_MESSAGES.length) {
      loaderInterval = setTimeout(animateStep, STEP_DURATION);
    } else {
      // Tandai step terakhir selesai setelah sebentar
      setTimeout(() => {
        const lastCheck = document.getElementById(`flCheck${LOADER_MESSAGES.length - 1}`);
        if (lastCheck) lastCheck.textContent = "✅";
      }, 300);
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

// Dummy restaurant images based on index
const RESTAURANT_DUMMY_IMAGES = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1552566626-52f8b828329c?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=600&q=80",
];

// Dummy sentiment data per restaurant
const DUMMY_SENTIMENT = [
  { positive: 88, negative: 12, keywords: ["enak", "recommended", "ramah", "porsi besar"] },
  { positive: 74, negative: 26, keywords: ["worth it", "lezat", "tempatnya nyaman"] },
  { positive: 91, negative: 9,  keywords: ["terbaik", "murah", "cepat", "segar"] },
  { positive: 67, negative: 33, keywords: ["lumayan", "enak", "agak lama"] },
  { positive: 82, negative: 18, keywords: ["juara", "mantap", "harga pas"] },
];

async function showRestaurantResultPage(
  foodName,
  restaurants
) {
  injectLoaderAndResultCSS();

  const list = restaurants || [];

  const nearbyContent =
    document.getElementById(
      "nearbyContent"
    );

  if (!nearbyContent) return;

  if (list.length === 0) {

    nearbyContent.innerHTML = `
      <div class="empty-result">

        <div class="empty-result-icon">
          🍽️
        </div>

        <h2>
          Maaf, restoran untuk
          "${foodName}"
          belum ditemukan
        </h2>

        <p>
          Coba pilih makanan lain,
          lakukan swipe lagi untuk
          mendapatkan match baru,
          atau gunakan nama makanan
          yang lebih umum agar hasil
          pencarian restoran lebih banyak.
        </p>

      </div>
    `;

    showPage("nearbyPage");
    return;
  }

  const cards = await Promise.all(

    list.map(async (r, i) => {

      const img =
        r.img_url ||
        r.image_url ||
        RESTAURANT_DUMMY_IMAGES[
          i %
          RESTAURANT_DUMMY_IMAGES.length
        ];

      const sentiment =
        await getRestaurantInsight(
          r.restaurant_id
        );
      
      const safeSummary =
        sanitizeForOnclick(
          sentiment.human_readable_summary
        );

      const safeAutoSummary =
        sanitizeForOnclick(
          sentiment.auto_summary
        );
      
      console.log(
        "Sentiment:",
        r.restaurant_name,
        sentiment
      );

      const rname =
        (
          r.restaurant_name ||
          foodName
        ).replace(/'/g, "\\'");

      const rnameSafe =
        r.restaurant_name ||
        "Nama Restoran";

      return `
        <div class="rr-card">

          <div class="rr-card-img-wrap">

            <div class="rr-rank">
              ${i + 1}
            </div>

            <img
              class="rr-card-img"
              src="${img}"
              alt="${rnameSafe}"
              onerror="this.src='https://picsum.photos/120/120'"
            >

          </div>

          <div class="rr-card-body">

            <div class="rr-card-top">

              <div>

                <div class="rr-card-name">
                  ${rnameSafe}
                </div>

                <div class="rr-card-food">
                  🍽️ ${r.food_name || foodName}
                </div>

              </div>

              <div class="rr-card-rating">
                ⭐ ${r.rating || "-"}
              </div>

            </div>

            <div class="rr-card-addr">

              📍 ${r.address || r.city || "Lokasi tidak tersedia"}

              ${
                r.count_rating
                  ? `
                  <span class="rr-review-count">
                    ${Number(
                      r.count_rating
                    ).toLocaleString()}
                    ulasan
                  </span>
                `
                  : ""
              }

            </div>

            <div class="rr-sentiment-row">

              <div class="rr-sentiment-bar-wrap">

                <div class="rr-sentiment-bar">

                  <div
                    class="rr-sentiment-pos"
                    style="width:${sentiment.positive_pct || 0}%"
                  ></div>

                  <div
                    class="rr-sentiment-neg"
                    style="width:${sentiment.negative_pct || 0}%"
                  ></div>

                </div>

                <div class="rr-sentiment-labels">

                  <span class="rr-sent-pos">
                    😊 ${sentiment.positive_pct || 0}% Positif
                  </span>

                  <span class="rr-sent-neg">
                    😞 ${sentiment.negative_pct || 0}% Negatif
                  </span>

                </div>

              </div>

            </div>

            <div class="rr-card-actions">

              <button
                class="rr-btn rr-btn-primary"
                onclick="openGoogleMaps(
                  '${encodeURIComponent(
                    r.restaurant_name || foodName
                  )}'
                )"
              >
                🗺️ Buka Maps
              </button>

              <button
                class="rr-btn rr-btn-secondary"
                onclick="shareRestaurant(
                  '${rname}'
                )"
              >
                📤 Bagikan
              </button>

              <button
                class="rr-btn rr-btn-detail"
                onclick="openRestaurantDetail(
                  ${i},
                  '${rname}',
                  '${img}',
                  ${r.rating || 0},
                  ${r.count_rating || 0},
                  '${(r.address || "").replace(/'/g, "\\'")}',
                  ${sentiment.positive_pct || 0},
                  ${sentiment.negative_pct || 0},
                  '${(
                    sentiment.dominant_positive_keywords || []
                  ).join(",")}',
                  '${safeSummary}',
                  '${safeAutoSummary}'
                )"
              >
                🔍 Selengkapnya
              </button>

            </div>

          </div>

        </div>
      `;
    })
  );

  nearbyContent.innerHTML = `
    <h2 class="rr-nearby-title">
      ${foodName}
    </h2>

    <div
      class="trending-badge"
      style="margin-bottom:16px;"
    >
      🎉 ${list.length} Restoran Ditemukan
    </div>

    <div class="rr-popup-list">
      ${cards.join("")}
    </div>
  `;

  showPage("nearbyPage");
}

function sanitizeForOnclick(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n/g, " ")
    .replace(/\t/g, " ");
}

function openRestaurantDetail(idx, name, img, rating, countRating, address, posPercent, negPercent, keywordsStr, summary, autoSummary) {
  const existing = document.getElementById("rrDetailModal");
  if (existing) existing.remove();
  const keywords = (keywordsStr || "").split(",").filter(Boolean);
  const neutralPercent = Math.max(0, 100 - posPercent - negPercent);
  // Tentukan deskripsi & tags berdasarkan nama makanan (sama seperti openFoodDetail)
  const title = (name || "").toLowerCase();
  const desc =
    summary ||
    "Belum ada ringkasan review.";
  const tags =
    keywords.length > 0
      ? keywords.slice(0, 6)
      : ["Popular", "Recommended"];
  let score = posPercent;
  // Gunakan skor sentimen jika tersedia
  const displayScore = posPercent > 0 ? posPercent : score;
  const modal = document.createElement("div");
  modal.id = "rrDetailModal";
  modal.innerHTML = `
    <div class="rrd-overlay" onclick="closeRestaurantDetail()">
      <div class="rrd-box" onclick="event.stopPropagation()">
        <button class="rrd-close" onclick="closeRestaurantDetail()">×</button>
        <!-- HERO (mirip detail-hero) -->
        <div class="rrd-hero">
          <img class="rrd-img" src="${img}" alt="${name}" onerror="this.src='https://picsum.photos/400/200'">
          <div class="rrd-img-overlay"></div>
          <div class="rrd-hero-info">
            <div class="price-tag detail-price" style="margin-bottom:8px;">${address || "Bandung"}</div>
            <h2 class="rrd-name">${name}</h2>
          </div>
        </div>
        <!-- STATS (mirip detail-stats) -->
        <div class="rrd-body">
          <div class="rrd-stats-row">
            <div class="rrd-stat">
              <b>⭐ ${rating || "–"}</b>
              <span>${countRating ? Number(countRating).toLocaleString() + " reviews" : "reviews"}</span>
            </div>
            <div class="rrd-stat-div"></div>
            <div class="rrd-stat">
              <b>📍 ${address ? address.split(",")[0] : "Bandung"}</b>
              <span>from you</span>
            </div>
            <div class="rrd-stat-div"></div>
            <div class="rrd-stat">
              <b>🕒</b>
              <span>11:00–22:00</span>
            </div>
          </div>
          <!-- REVIEW SUMMARY -->
          <h3 style="font-size:16px;font-weight:800;color:#2b211b;margin:0 0 8px;">
            Review Summary
          </h3>

          <p
            style="
              font-size:14px;
              color:#7b6f67;
              line-height:1.6;
              margin-bottom:10px;
            "
          >
            ${summary || "Belum ada ringkasan review."}
          </p>

          <p
            style="
              font-size:13px;
              color:#9a8f87;
              line-height:1.6;
              font-style:italic;
              margin-bottom:14px;
            "
          >
            ${autoSummary || ""}
          </p>

          <!-- AI REVIEW SUMMARY -->
          <div class="rrd-section" style="background:white;border-radius:20px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,.05);">
            <h3 class="rrd-section-title">✨ AI Review Summary</h3>
            <div class="rrd-sent-labels">
              <span class="rrd-label-pos">Positive ${posPercent}%</span>
              <span style="color:#b0a49c;font-size:13px;font-weight:700;">Neutral ${neutralPercent}%</span>
              <span class="rrd-label-neg">Negative ${negPercent}%</span>
            </div>
            <div class="rrd-sent-bar" style="margin:10px 0;">
              <div class="rrd-sent-pos-fill" style="width:${posPercent}%"><span>${posPercent}%</span></div>
              <div style="height:100%;background:#FFC107;width:${neutralPercent}%;display:flex;align-items:center;justify-content:center;color:#2b211b;font-size:11px;font-weight:800;">${neutralPercent > 5 ? neutralPercent + "%" : ""}</div>
              <div class="rrd-sent-neg-fill" style="width:${negPercent}%"><span>${negPercent > 5 ? negPercent + "%" : ""}</span></div>
            </div>
            <p style="font-size:11px;color:#b0a49c;font-weight:700;letter-spacing:.5px;margin:12px 0 8px;">MOST MENTIONED</p>
            <div class="rrd-keywords">
              ${keywords.map(k => `<span class="rrd-keyword">${k}</span>`).join("")}
            </div>
          </div>
          <!-- RECOMMENDATION SCORE -->
          <div class="rrd-section" style="background:white;border-radius:20px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,.05);margin-top:14px;text-align:center;">
            <h3 class="rrd-section-title" style="text-align:left;">Recommendation score</h3>
            <h4 style="font-size:32px;font-weight:900;color:#ff844d;margin:4px 0;">
              ${displayScore} <span style="font-size:16px;color:#7b6f67;font-weight:600;">/ 100 match for you</span>
            </h4>
            <p style="font-size:13px;color:#b0a49c;">Based on your swipes, taste profile, and location.</p>
          </div>
          <!-- ACTIONS -->
          <div class="rrd-actions" style="margin-top:20px;">
            <button class="rr-btn rr-btn-secondary" onclick="openGoogleMaps('${encodeURIComponent(name)}'); closeRestaurantDetail();">
              ➤ Directions
            </button>
            <button class="rr-btn rr-btn-primary" onclick="closeRestaurantDetail();">
              Order now
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function getRestaurantInsight(
  restaurantId
) {
  try {

    const response = await apiFetch(
      `${API_BASE_URL}/review/insight/${restaurantId}`
    );

    return await response.json();

  } catch (error) {

    console.error(
      "Insight Error:",
      error
    );

    return {
      positive_pct: 0,
      negative_pct: 0,
      neutral_pct: 0,
      dominant_positive_keywords: [],
      human_readable_summary: "",
      auto_summary: ""
    };
  }
}

function closeRestaurantDetail() {
  const modal = document.getElementById("rrDetailModal");
  if (modal) {
    modal.style.opacity = "0";
    modal.style.transition = "opacity 0.3s ease";
    setTimeout(() => modal.remove(), 300);
  }
}

function closeRestaurantResultPage() {
  // Hasil rekomendasi kini ditampilkan di halaman Lokasi, bukan popup
  // Kembali ke halaman home dan lanjutkan ke makanan berikutnya
  showPage("homePage");
  nextFood();
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

    .fl-steps { display: flex; flex-direction: column; gap: 6px; text-align: left; max-height: 220px; overflow-y: auto; scroll-behavior: smooth; }
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
      overflow: hidden;
      box-shadow: 0 12px 30px rgba(0,0,0,.05);
      animation: rrSlideUp 0.4s ease both;
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

    /* ── RESTAURANT CARD IMAGE ────────────────────────────────── */
    .rr-card {
      display: flex;
      gap: 0;
      flex-direction: column;
      overflow: hidden;
    }
    .rr-card-img-wrap {
      position: relative;
      width: 100%; height: 140px;
      overflow: hidden;
      border-radius: 26px 26px 0 0;
      flex-shrink: 0;
    }
    .rr-card-img {
      width: 100%; height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .rr-card:hover .rr-card-img { transform: scale(1.04); }
    .rr-rank {
      position: absolute;
      top: 10px; left: 10px;
      width: 32px; height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg,#ff844d,#ff5f5f);
      color: white; font-size: 14px; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(255,95,95,.4);
      z-index: 2;
    }
    .rr-card-body {
      padding: 14px 14px 14px;
    }

    /* ── SENTIMENT ROW ─────────────────────────────────────────── */
    .rr-sentiment-row { margin: 4px 0 2px; }
    .rr-sentiment-bar-wrap {}
    .rr-sentiment-bar {
      height: 8px; border-radius: 999px;
      overflow: hidden; display: flex;
      background: #f0e8df; margin-bottom: 6px;
    }
    .rr-sentiment-pos {
      height: 100%;
      background: linear-gradient(90deg, #4ade80, #22c55e);
      border-radius: 999px 0 0 999px;
      transition: width 0.6s ease;
    }
    .rr-sentiment-neg {
      height: 100%;
      background: linear-gradient(90deg, #f87171, #ef4444);
      border-radius: 0 999px 999px 0;
      transition: width 0.6s ease;
    }
    .rr-sentiment-labels {
      display: flex; justify-content: space-between;
      font-size: 11px; font-weight: 700;
    }
    .rr-sent-pos { color: #16a34a; }
    .rr-sent-neg { color: #dc2626; }

    /* ── DETAIL BUTTON ─────────────────────────────────────────── */
    .rr-btn-detail {
      background: #f0f9ff;
      color: #0ea5e9;
      border: 1.5px solid #bae6fd;
    }
    .rr-card-actions { flex-wrap: wrap; }

    /* ── RESTAURANT DETAIL MODAL ────────────────────────────────── */
    @keyframes rrdSlideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }

    .rrd-overlay {
      position: fixed; inset: 0;
      background: rgba(43,33,27,.6);
      backdrop-filter: blur(10px);
      z-index: 999999;
      display: flex; align-items: flex-end; justify-content: center;
    }
    .rrd-box {
      background: #fff8ef;
      border-radius: 36px 36px 0 0;
      width: 100%; max-width: 430px;
      max-height: 88vh;
      overflow-y: auto;
      animation: rrdSlideUp 0.4s cubic-bezier(0.34,1.2,0.64,1);
      position: relative;
    }
    .rrd-close {
      position: absolute; top: 16px; right: 16px;
      width: 36px; height: 36px; border-radius: 50%;
      background: white; border: none;
      font-size: 20px; color: #7b6f67;
      cursor: pointer; z-index: 2;
      box-shadow: 0 4px 14px rgba(0,0,0,.1);
      display: flex; align-items: center; justify-content: center;
    }
    .rrd-hero {
      position: relative; width: 100%; height: 200px;
      overflow: hidden; border-radius: 36px 36px 0 0;
    }
    .rrd-img { width: 100%; height: 100%; object-fit: cover; }
    .rrd-img-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to bottom, transparent 30%, rgba(43,33,27,.75) 100%);
    }
    .rrd-hero-info {
      position: absolute; bottom: 18px; left: 20px; right: 20px; z-index: 1;
    }
    .rrd-name { font-size: 20px; font-weight: 900; color: white; margin-bottom: 4px; }
    .rrd-meta { font-size: 13px; color: rgba(255,255,255,.85); font-weight: 600; }

    .rrd-body { padding: 20px 20px 100px; }

    .rrd-stats-row {
      display: flex; align-items: center; justify-content: space-between;
      background: white; border-radius: 20px; padding: 16px 20px;
      margin-bottom: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,.05);
    }
    .rrd-stat { text-align: center; flex: 1; }
    .rrd-stat b { display: block; font-size: 16px; font-weight: 900; color: #ff844d; }
    .rrd-stat span { font-size: 10px; color: #7b6f67; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
    .rrd-stat-div { width: 1px; height: 36px; background: #f0e8df; }

    .rrd-section { margin-bottom: 20px; }
    .rrd-section-title { font-size: 14px; font-weight: 800; color: #2b211b; margin-bottom: 10px; }

    .rrd-sent-labels {
      display: flex; justify-content: space-between; margin-bottom: 8px;
      font-size: 13px; font-weight: 700;
    }
    .rrd-label-pos { color: #16a34a; }
    .rrd-label-neg { color: #dc2626; }

    .rrd-sent-bar {
      height: 28px; border-radius: 14px;
      overflow: hidden; display: flex;
      background: #f0e8df;
      box-shadow: inset 0 2px 6px rgba(0,0,0,.06);
    }
    .rrd-sent-pos-fill {
      height: 100%;
      background: linear-gradient(90deg, #4ade80, #22c55e);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 11px; font-weight: 800;
      transition: width 0.7s ease;
    }
    .rrd-sent-neg-fill {
      height: 100%;
      background: linear-gradient(90deg, #f87171, #ef4444);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 11px; font-weight: 800;
      transition: width 0.7s ease;
    }
    .rrd-sent-note { font-size: 11px; color: #b0a49c; margin-top: 6px; }

    .rrd-keywords { display: flex; flex-wrap: wrap; gap: 8px; }
    .rrd-keyword {
      background: white;
      border: 1.5px solid #ffe4dc;
      color: #ff844d;
      padding: 6px 14px; border-radius: 999px;
      font-size: 12px; font-weight: 700;
    }
    .rrd-address { font-size: 13px; color: #7b6f67; font-weight: 600; }
    .rrd-actions { display: flex; gap: 10px; margin-top: 24px; }
  `;
  document.head.appendChild(s);
}