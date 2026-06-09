import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Initialize Chrome Web Driver
driver = webdriver.Chrome()

try:
    print("Launching CMS E2E Automation Validation...")
    # 1. Open the local Vite React application URL
    driver.get("http://localhost:5173")
    driver.maximize_window()
    
    # Wait for page elements to load
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.CLASS_NAME, "logo-text-large")))
    print("CMS Portal Home Page loaded successfully.")

    # 2. Click Sign In Button
    login_nav = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Sign In')]")))
    login_nav.click()
    print("Navigated to secure Sign In screen.")

    # 3. Complete Authentication Form
    email_input = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@type='email']")))
    password_input = driver.find_element(By.XPATH, "//input[@type='password']")
    
    email_input.send_keys("admin@oromia.gov.et")
    password_input.send_keys("AdminPassword123!")
    
    login_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Authenticate Securely')]")
    login_btn.click()
    print("Seeded credentials supplied. Authenticating...")

    # 4. Verify Role Dashboard Loads
    wait.until(EC.presence_of_element_located((By.XPATH, "//h3[contains(text(), 'Admin')]")))
    print("Role: Administrator verified. Dashboard layout loaded successfully.")

    # 5. Review active logs
    complaints_tab = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Complaints Queue')]")))
    complaints_tab.click()
    wait.until(EC.presence_of_element_located((By.CLASS_NAME, "premium-table")))
    print("Complaints Queue table loaded. Test cases finalized successfully.")

    # Pause to visualize
    time.sleep(3)

except Exception as e:
    print(f"E2E Automated test failed: {e}")

finally:
    driver.quit()
    print("Browser closed. E2E process finalized.")
