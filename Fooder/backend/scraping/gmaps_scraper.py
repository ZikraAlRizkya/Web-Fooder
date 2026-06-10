import re
import time
import requests

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from webdriver_manager.chrome import ChromeDriverManager
from urllib.parse import quote_plus

# ─────────────────────────────────────────────────────────────────────────────
BASE_URL = "http://localhost:8000"


# ══════════════════════════════════════════════════════════════════════════════
#  DRIVER
# ══════════════════════════════════════════════════════════════════════════════

def get_driver():

    options = webdriver.ChromeOptions()

    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    options.add_argument(
        "--window-size=1920,1080"
    )

    options.add_argument(
        "--disable-blink-features=AutomationControlled"
    )

    # Tambahkan ini
    options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
    )

    options.add_experimental_option(
        "excludeSwitches",
        ["enable-automation"]
    )

    options.add_experimental_option(
        "useAutomationExtension",
        False
    )

    driver = webdriver.Chrome(
        service=Service(
            ChromeDriverManager().install()
        ),
        options=options
    )

    driver.execute_script("""
        Object.defineProperty(
            navigator,
            'webdriver',
            {
                get: () => undefined
            }
        )
    """)

    # Tambahkan ini juga
    driver.execute_cdp_cmd(
        "Network.setUserAgentOverride",
        {
            "userAgent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
        }
    )

    # Debug
    print("=" * 50)
    print("USER AGENT")
    print(
        driver.execute_script(
            "return navigator.userAgent"
        )
    )
    print("=" * 50)

    return driver


# ══════════════════════════════════════════════════════════════════════════════
#  HELPER
# ══════════════════════════════════════════════════════════════════════════════

def parse_float(text: str) -> float | None:
    try:
        return float(re.sub(r"[^\d,.]", "", text).replace(",", "."))
    except (ValueError, AttributeError):
        return None

def parse_int(text: str) -> int | None:
    try:
        digits = re.sub(r"[^\d]", "", text)
        return int(digits) if digits else None
    except (ValueError, AttributeError):
        return None


# ══════════════════════════════════════════════════════════════════════════════
#  SCRAPE DETAIL RESTORAN
# ══════════════════════════════════════════════════════════════════════════════

def scrape_detail(driver: webdriver.Chrome) -> dict:
    detail = {
        "restaurant_name": "",
        "rating":          None,
        "count_rating":    None,
        "category":        "",
        "address":         "",
        "latitude":        None,
        "longitude":       None,
        "img_url":         "",
        "gmaps_url":       "",
    }

    # Tunggu halaman detail benar-benar siap (h1 muncul)
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "h1.DUwDvf"))
        )
    except TimeoutException:
        print("    [!] Halaman detail lambat dimuat.")

    # 1. Nama restoran
    try:
        detail["restaurant_name"] = driver.find_element(
            By.CSS_SELECTOR, "h1.DUwDvf"
        ).text.strip()
    except NoSuchElementException:
        pass

    # 2. Rating
    try:
        rating_el = driver.find_element(
            By.CSS_SELECTOR, "span.ceNzKf span[aria-hidden='true']"
        )
        detail["rating"] = parse_float(rating_el.text)
    except NoSuchElementException:
        try:
            for el in driver.find_elements(By.CSS_SELECTOR, "span[aria-hidden='true']"):
                val = parse_float(el.text)
                if val and 1.0 <= val <= 5.0:
                    detail["rating"] = val
                    break
        except Exception:
            pass

    # 3. Count rating
    try:
        cr_el = driver.find_element(
            By.CSS_SELECTOR, "span[role='img'][aria-label*='ulasan']"
        )
        detail["count_rating"] = parse_int(cr_el.text)
    except NoSuchElementException:
        try:
            cr_el = driver.find_element(
                By.CSS_SELECTOR, "span[role='img'][aria-label*='review']"
            )
            detail["count_rating"] = parse_int(cr_el.text)
        except NoSuchElementException:
            pass

    # 4. Category
    try:
        detail["category"] = driver.find_element(
            By.CSS_SELECTOR, "button.DkEaL"
        ).text.strip()
    except NoSuchElementException:
        pass

    # 5. Alamat
    try:
        detail["address"] = driver.find_element(
            By.CSS_SELECTOR, "div.Io6YTe.fontBodyMedium.kR99db.fdkmkc"
        ).text.strip()
    except NoSuchElementException:
        try:
            detail["address"] = driver.find_element(
                By.CSS_SELECTOR, 'button[data-item-id="address"] .Io6YTe'
            ).text.strip()
        except NoSuchElementException:
            pass

    # 6. Gambar
    try:
        detail["img_url"] = driver.find_element(
            By.CSS_SELECTOR, "button.aoRNLd img"
        ).get_attribute("src") or ""
    except NoSuchElementException:
        pass

    # 7. Koordinat dari URL
    try:
        WebDriverWait(driver, 5).until(lambda d: "@" in d.current_url)
    except TimeoutException:
        pass
    try:
        match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", driver.current_url)
        if match:
            detail["latitude"]  = float(match.group(1))
            detail["longitude"] = float(match.group(2))
    except Exception:
        pass

    # 8. GMaps URL — simpan SEBELUM pindah ke tab Ulasan
    detail["gmaps_url"] = driver.current_url

    return detail


# ══════════════════════════════════════════════════════════════════════════════
#  SCRAPE REVIEW
# ══════════════════════════════════════════════════════════════════════════════

def scrape_reviews(driver: webdriver.Chrome, max_reviews: int = 10) -> list[dict]:
    """
    Alur:
      1. Tunggu tab Ulasan muncul, klik pakai JS
      2. Tunggu blok review pertama muncul
      3. Scroll panel 5x agar review termuat
      4. Per blok: klik "Lainnya" dulu, baru ambil teks
    """
    reviews = []
    try:
        wait = WebDriverWait(driver, 15)

        # ── LANGKAH 1: Klik tab Ulasan / Review ──────────────────────────────
        print("\n===== DEBUG TABS =====")
        tabs = driver.find_elements(
            By.XPATH,
            "//*[@role='tab']"
        )
        print("TOTAL TABS:", len(tabs))
        for t in tabs:
            try:
                print("TAB:", t.text)
            except:
                pass
        print("======================\n")
        review_tab = None
        
        for label in ["Ulasan", "Review"]:
            try:
                review_tab = wait.until(
                    EC.element_to_be_clickable(
                        (By.XPATH, f'//*[@role="tab" and contains(., "{label}")]')
                    )
                )
                break
            except TimeoutException:
                continue
        
        if review_tab is None:
            print("    [!] Tab Ulasan tidak ditemukan, skip.")
            return reviews

        driver.execute_script("arguments[0].click();", review_tab)

        # ── LANGKAH 2: Tunggu blok review pertama muncul ─────────────────────
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.jftiEf"))
            )
        except TimeoutException:
            print("    [!] Blok review tidak muncul setelah 10 detik.")
            return reviews

        time.sleep(2)

        # ── LANGKAH 3: Scroll panel review ke bawah ──────────────────────────
        try:
            scrollable = driver.find_element(
                By.XPATH, '//div[@role="main"]//div[contains(@class,"m6QErb")]'
            )
            for _ in range(5):
                driver.execute_script("arguments[0].scrollTop += 800;", scrollable)
                time.sleep(1.2)
        except NoSuchElementException:
            pass

        # ── LANGKAH 4: Ambil blok review, klik "Lainnya" per blok ────────────
        review_blocks = driver.find_elements(By.CSS_SELECTOR, "div.jftiEf")
        print(f"    [INFO] Total blok review: {len(review_blocks)}, ambil {min(len(review_blocks), max_reviews)}")

        for block in review_blocks[:max_reviews]:
            # Klik "Lainnya" / "See more" di dalam blok ini dulu
            # Selector: button.w8nwRe.kyuRq atau aria-label "Lihat lainnya"
            try:
                expand_btn = block.find_element(
                    By.CSS_SELECTOR,
                    "button.w8nwRe.kyuRq, button[aria-label='Lihat lainnya'], button[aria-label='See more']"
                )
                driver.execute_script("arguments[0].click();", expand_btn)
                time.sleep(0.5)
            except NoSuchElementException:
                pass  # tidak ada tombol "Lainnya", teks sudah penuh

            # Username  →  <div class="d4r55 fontTitleMedium">juniarti</div>
            try:
                username = block.find_element(By.CSS_SELECTOR, "div.d4r55").text.strip()
            except NoSuchElementException:
                username = "Anonymous"

            # Rating reviewer
            reviewer_rating = None
            try:
                stars_el = block.find_element(
                    By.CSS_SELECTOR,
                    "span[aria-label*='bintang'], span[aria-label*='star']"
                )
                m = re.search(r"(\d+(?:[.,]\d+)?)", stars_el.get_attribute("aria-label") or "")
                if m:
                    reviewer_rating = float(m.group(1).replace(",", "."))
            except NoSuchElementException:
                pass

            # Teks review  →  <span class="wiI7pd">
            review_text = ""
            try:
                review_text = block.find_element(
                    By.CSS_SELECTOR, "span.wiI7pd"
                ).text.strip()
            except NoSuchElementException:
                pass

            if review_text:
                reviews.append({
                    "username":    username,
                    "review_text": review_text,
                    "rating":      reviewer_rating,
                })

    except Exception as e:
        print(f"    [!] Gagal ambil review: {e}")

    return reviews


# ══════════════════════════════════════════════════════════════════════════════
#  POST ke FastAPI
# ══════════════════════════════════════════════════════════════════════════════

def post_restaurant(payload: dict) -> int | None:
    try:
        resp = requests.post(f"{BASE_URL}/restaurants/", json=payload, timeout=10)
        resp.raise_for_status()
        rid = resp.json().get("id")
        print(f"    [DB] Restaurant disimpan → id={rid}")
        return rid
    except requests.RequestException as e:
        print(f"    [DB] Gagal POST restaurant: {e}")
        return None

def post_review(payload: dict) -> bool:
    try:
        resp = requests.post(f"{BASE_URL}/reviews/", json=payload, timeout=10)
        resp.raise_for_status()
        print(f"      [DB] Review disimpan (user: {payload.get('username')})")
        return True
    except requests.RequestException as e:
        print(f"      [DB] Gagal POST review: {e}")
        return False


# ══════════════════════════════════════════════════════════════════════════════
#  FUNGSI UTAMA
# ══════════════════════════════════════════════════════════════════════════════

def search_and_save(
    food_name: str,
    city: str = "",
    origin_country: str = "",
    description: str = "",
    max_results: int = 3,
) -> list[dict]:
    all_results = []
    driver = get_driver()
    wait   = WebDriverWait(driver, 15)

    try:
        search_query = food_name
        if city:
            search_query += f" {city}"
        encoded_query = quote_plus(
            search_query
        )
        print(
            f"\n[SCRAPER] Mencari: '{search_query}' …"
        )
        driver.get(
            f"https://www.google.com/maps/search/{encoded_query}"
        )
        
        time.sleep(4)
        cards = driver.find_elements(By.CSS_SELECTOR, "div.Nv2PK")
        count = min(len(cards), max_results)
        print(f"[SCRAPER] Ditemukan {len(cards)} kartu, akan diproses {count}.\n")

        links = []
        for i in range(count):
            try:
                card = driver.find_elements(By.CSS_SELECTOR, "div.Nv2PK")[i]
                link = card.find_element(By.CSS_SELECTOR, "a.hfpxzc").get_attribute("href")
                links.append(link)
            except Exception as e:
                print(f"  [!] Gagal ambil link kartu ke-{i}: {e}")

        for idx, link in enumerate(links):
            print(f"[{idx+1}/{len(links)}] Membuka halaman detail…")
            
            detail  = {}
            reviews = []

            try:
                driver.get(link)
                # Tunggu halaman benar-benar siap sebelum scrape
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "h1.DUwDvf"))
                )
                time.sleep(2)

                detail  = scrape_detail(driver)   # gmaps_url disimpan di sini
                reviews = scrape_reviews(driver, max_reviews=10)

                print(f"  → Nama      : {detail.get('restaurant_name', '-')}")
                print(f"  → Rating    : {detail.get('rating')}  ({detail.get('count_rating')} ulasan)")
                print(f"  → Kategori  : {detail.get('category', '-')}")
                print(f"  → Alamat    : {detail.get('address', '-')}")
                print(f"  → Koordinat : {detail.get('latitude')}, {detail.get('longitude')}")
                print(f"  → Img URL   : {(detail.get('img_url') or '')[:60]}…")
                print(f"  → GMaps URL : {(detail.get('gmaps_url') or '')[:60]}…")
                print(f"  → Review    : {len(reviews)} komentar")

            except Exception as e:
                print(f"  [!] Error scrape: {e}")

            # POST restaurant
            restaurant_payload = {
                "restaurant_name": detail.get("restaurant_name", ""),
                "address":         detail.get("address", ""),
                "city":            city,
                "latitude":        detail.get("latitude"),
                "longitude":       detail.get("longitude"),
                "rating":          detail.get("rating"),
                "count_rating":    detail.get("count_rating"),
                "food_name":       food_name,
                "description":     detail.get("category", "") or description,
                "img_url":         detail.get("img_url", ""),
                "gmaps_url":       detail.get("gmaps_url", ""),
            }
            restaurant_id = post_restaurant(restaurant_payload)

            # POST tiap review
            saved_reviews = []
            if restaurant_id is not None:
                for rv in reviews:
                    post_review({
                        "restaurant_id": restaurant_id,
                        "username":      rv["username"],
                        "review_text":   rv["review_text"],
                        "rating":        rv["rating"],
                    })
                    saved_reviews.append(rv)

            all_results.append({
                **detail,
                "food_name":     food_name,
                "city":          city,
                "restaurant_id": restaurant_id,
                "reviews":       saved_reviews,
            })
            print()

    finally:
        driver.quit()

    return all_results
