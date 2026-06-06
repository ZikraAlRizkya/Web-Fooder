import re
import time
import requests
 
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException
 
# ─────────────────────────────────────────────────────────────────────────────
# Sesuaikan BASE_URL dengan alamat server FastAPI kamu
# ─────────────────────────────────────────────────────────────────────────────
BASE_URL = "http://localhost:8000"
 
 
# ══════════════════════════════════════════════════════════════════════════════
#  SELENIUM DRIVER
# ══════════════════════════════════════════════════════════════════════════════
 
def get_driver(headless: bool = True) -> webdriver.Chrome:
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--lang=en-US")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
    return webdriver.Chrome(options=options)
 
 
# ══════════════════════════════════════════════════════════════════════════════
#  HELPER – bersihkan angka dari teks
# ══════════════════════════════════════════════════════════════════════════════
 
def parse_float(text: str) -> float | None:
    """'4.5'  →  4.5  |  None jika tidak bisa di-parse."""
    try:
        return float(text.replace(",", ".").strip())
    except (ValueError, AttributeError):
        return None
 
 
def parse_int(text: str) -> int | None:
    """'(1.234)' atau '1234'  →  1234  |  None jika tidak bisa di-parse."""
    try:
        digits = re.sub(r"[^\d]", "", text)
        return int(digits) if digits else None
    except (ValueError, AttributeError):
        return None
 
 
# ══════════════════════════════════════════════════════════════════════════════
#  SCRAPING – detail restoran (buka halaman individu)
# ══════════════════════════════════════════════════════════════════════════════
 
def scrape_detail(driver: webdriver.Chrome) -> dict:
    """
    Ambil data tambahan dari halaman detail restoran:
      - address   : str
      - latitude  : float | None
      - longitude : float | None
 
    Driver diasumsikan sudah berada di halaman detail restoran.
    """
    detail = {"address": "", "latitude": None, "longitude": None}
 
    # Alamat
    try:
        addr_el = driver.find_element(
            By.CSS_SELECTOR,
            'button[data-item-id="address"] .Io6YTe'
        )
        detail["address"] = addr_el.text.strip()
    except NoSuchElementException:
        pass
 
    # Koordinat dari URL
    try:
        url = driver.current_url
        match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", url)
        if match:
            detail["latitude"]  = float(match.group(1))
            detail["longitude"] = float(match.group(2))
    except Exception:
        pass
 
    return detail
 
 
# ══════════════════════════════════════════════════════════════════════════════
#  SCRAPING – review
# ══════════════════════════════════════════════════════════════════════════════
 
def scrape_reviews(driver: webdriver.Chrome, max_reviews: int = 4) -> list[dict]:
    """
    Ambil review dari halaman detail restoran yang sedang terbuka.
 
    Setiap item review berisi:
      - username   : str
      - review_text: str
      - rating     : float | None
    """
    reviews = []
    try:
        wait = WebDriverWait(driver, 10)
 
        # Klik tab Reviews
        review_tab = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, '//button[@role="tab" and contains(., "Review")]')
            )
        )
        review_tab.click()
        time.sleep(3)
 
        # Scroll agar komentar termuat
        try:
            scrollable = driver.find_element(
                By.XPATH,
                '//div[@role="main"]//div[contains(@class,"m6QErb")]'
            )
            for _ in range(3):
                driver.execute_script("arguments[0].scrollTop += 600;", scrollable)
                time.sleep(1.5)
        except NoSuchElementException:
            pass
 
        # Klik "More" agar teks tidak terpotong
        more_btns = driver.find_elements(
            By.XPATH,
            '//button[@aria-label="See more" or @jsaction="pane.review.expandReview"]'
        )
        for btn in more_btns[:max_reviews]:
            try:
                driver.execute_script("arguments[0].click();", btn)
                time.sleep(0.4)
            except Exception:
                pass
 
        # Ambil blok review
        review_blocks = driver.find_elements(By.CSS_SELECTOR, "div.jftiEf")
 
        for block in review_blocks[:max_reviews]:
            # Username
            try:
                username = block.find_element(
                    By.CSS_SELECTOR, ".d4r55"
                ).text.strip()
            except NoSuchElementException:
                username = "Anonymous"
 
            # Rating bintang reviewer (aria-label: "5 stars")
            reviewer_rating = None
            try:
                stars_el = block.find_element(By.CSS_SELECTOR, "span[aria-label*='star']")
                stars_text = stars_el.get_attribute("aria-label") or ""
                m = re.search(r"(\d+(?:[.,]\d+)?)", stars_text)
                if m:
                    reviewer_rating = float(m.group(1).replace(",", "."))
            except NoSuchElementException:
                pass
 
            # Teks komentar
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
 
    except (NoSuchElementException, TimeoutException) as e:
        print(f"    [!] Gagal ambil review: {e}")
 
    return reviews
 
 
# ══════════════════════════════════════════════════════════════════════════════
#  POST ke FastAPI
# ══════════════════════════════════════════════════════════════════════════════
 
def post_restaurant(restaurant_data: dict) -> int | None:
    """
    POST /restaurants/  →  simpan restoran, kembalikan id yang dibuat.
    Payload disesuaikan dengan model Restaurant.
    """
    url = f"{BASE_URL}/restaurants/"
    try:
        resp = requests.post(url, json=restaurant_data, timeout=10)
        resp.raise_for_status()
        result = resp.json()
        restaurant_id = result.get("id")
        print(f"    [DB] Restaurant disimpan  → id={restaurant_id}")
        return restaurant_id
    except requests.RequestException as e:
        print(f"    [DB] Gagal POST restaurant: {e}")
        return None
 
 
def post_review(review_data: dict) -> bool:
    """
    POST /reviews/  →  simpan satu review ke database.
    review_data harus sudah menyertakan 'restaurant_id'.
    """
    url = f"{BASE_URL}/reviews/"
    try:
        resp = requests.post(url, json=review_data, timeout=10)
        resp.raise_for_status()
        print(f"      [DB] Review disimpan  (user: {review_data.get('username')})")
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
    img_url: str = "",
    max_results: int = 5,
    headless: bool = True,
) -> list[dict]:
    """
    1. Scrape Google Maps untuk `food_name` (ambil max `max_results` restoran).
    2. Untuk setiap restoran:
         a. POST data restoran ke /restaurants/  → dapat restaurant_id
         b. Scrape 4 review
         c. POST tiap review ke /reviews/ dengan restaurant_id yang baru didapat
    3. Kembalikan list lengkap hasil scraping (termasuk review).
 
    Parameter tambahan (city, origin_country, description, img_url) diisi
    secara manual karena Google Maps tidak menyediakan field tersebut secara
    langsung — sesuaikan dengan kebutuhan kamu.
    """
    all_results = []
    driver = get_driver(headless=headless)
    wait   = WebDriverWait(driver, 15)
 
    try:
        # ── LANGKAH 1 : Buka Google Maps dan cari ────────────────────────────
        print(f"\n[SCRAPER] Mencari: '{food_name}' …")
        driver.get("https://www.google.com/maps")
        time.sleep(3)
 
        search_box = wait.until(EC.presence_of_element_located((By.ID, "searchboxinput")))
        search_box.clear()
        search_box.send_keys(food_name)
        search_box.send_keys(Keys.ENTER)
        time.sleep(6)
 
        # ── LANGKAH 2 : Kumpulkan kartu dari halaman daftar ──────────────────
        cards = driver.find_elements(By.CSS_SELECTOR, "div.Nv2PK")
        count = min(len(cards), max_results)
        print(f"[SCRAPER] Ditemukan {len(cards)} kartu, akan diproses {count}.\n")
 
        card_snapshots = []
        for i in range(count):
            try:
                card = driver.find_elements(By.CSS_SELECTOR, "div.Nv2PK")[i]
 
                name = ""
                try:
                    name = card.find_element(By.CSS_SELECTOR, ".qBF1Pd").text.strip()
                except NoSuchElementException:
                    pass
 
                rating_raw = ""
                try:
                    rating_raw = card.find_element(By.CSS_SELECTOR, "span.MW4etd").text.strip()
                except NoSuchElementException:
                    pass
 
                review_count_raw = ""
                try:
                    review_count_raw = card.find_element(By.CSS_SELECTOR, "span.UY7F9").text.strip()
                except NoSuchElementException:
                    pass
 
                link = None
                try:
                    link = card.find_element(By.CSS_SELECTOR, "a.hfpxzc").get_attribute("href")
                except NoSuchElementException:
                    pass
 
                card_snapshots.append({
                    "restaurant_name":  name,
                    "rating":           parse_float(rating_raw),
                    "count_rating":     parse_int(review_count_raw),
                    "link":             link,
                })
            except Exception as e:
                print(f"  [!] Gagal baca kartu ke-{i}: {e}")
 
        # ── LANGKAH 3 : Buka tiap halaman detail, scrape & simpan ke DB ──────
        for idx, snap in enumerate(card_snapshots):
            print(f"[{idx+1}/{len(card_snapshots)}] {snap['restaurant_name']}")
 
            detail  = {"address": "", "latitude": None, "longitude": None}
            reviews = []
 
            if snap["link"]:
                try:
                    driver.get(snap["link"])
                    time.sleep(4)
                    detail  = scrape_detail(driver)
                    reviews = scrape_reviews(driver, max_reviews=4)
                    print(f"  → Alamat   : {detail['address'] or '-'}")
                    print(f"  → Koordinat: {detail['latitude']}, {detail['longitude']}")
                    print(f"  → Review   : {len(reviews)} komentar")
                except Exception as e:
                    print(f"  [!] Error buka halaman detail: {e}")
            else:
                print("  [!] Tidak ada link detail, skip.")
 
            # ── POST restaurant ───────────────────────────────────────────
            restaurant_payload = {
                "restaurant_name": snap["restaurant_name"],
                "address":         detail["address"],
                "city":            city,
                "latitude":        detail["latitude"],
                "longitude":       detail["longitude"],
                "rating":          snap["rating"],
                "count_rating":    snap["count_rating"],
                "food_name":       food_name,
                "description":     description,
                "origin_country":  origin_country,
                "img_url":         img_url,
            }
            restaurant_id = post_restaurant(restaurant_payload)
 
            # ── POST tiap review (sertakan restaurant_id) ─────────────────
            saved_reviews = []
            if restaurant_id is not None:
                for rv in reviews:
                    review_payload = {
                        "restaurant_id": restaurant_id,   # relasi ke tabel restaurants
                        "username":      rv["username"],
                        "review_text":   rv["review_text"],
                        "rating":        rv["rating"],
                    }
                    post_review(review_payload)
                    saved_reviews.append(rv)
 
            all_results.append({
                **snap,
                "address":         detail["address"],
                "latitude":        detail["latitude"],
                "longitude":       detail["longitude"],
                "restaurant_id":   restaurant_id,
                "reviews":         saved_reviews,
            })
            print()
 
    finally:
        driver.quit()
 
    return all_results
 
 
# ══════════════════════════════════════════════════════════════════════════════
#  CONTOH PEMAKAIAN
# ══════════════════════════════════════════════════════════════════════════════
 
if __name__ == "__main__":
    data = search_and_save(
        food_name      = "restoran sunda bandung",
        city           = "Bandung",
        origin_country = "Indonesia",
        description    = "Restoran masakan Sunda khas Jawa Barat",
        img_url        = "",
        max_results    = 5,
        headless       = False,     # set True untuk mode headless
    )
 
    print("\n" + "═" * 60)
    print("HASIL AKHIR")
    print("═" * 60)
    for r in data:
        print(f"\n● {r['restaurant_name']}  (DB id={r['restaurant_id']})")
        print(f"  Rating      : {r['rating']}  ({r['count_rating']} ulasan)")
        print(f"  Alamat      : {r['address']}")
        print(f"  Koordinat   : {r['latitude']}, {r['longitude']}")
        print(f"  Reviews ({len(r['reviews'])}):")
        for rv in r["reviews"]:
            preview = rv["review_text"][:80].replace("\n", " ")
            print(f"    - [{rv['username']}] ★{rv['rating']}  {preview}…")