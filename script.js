/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch"); // LevelUp: Search Input
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInputField = document.getElementById("userInput");
const rtlToggleBtn = document.getElementById("rtlToggleBtn"); // LevelUp: RTL Button

/* --- Global State --- */
let allProducts = []; // To store all products from JSON
let selectedProductIds = new Set(); // To store IDs of selected products
let conversationHistory = []; // To store chat messages
const WORKER_URL = "https://loreal-ai.jhtheultimate0628.workers.dev"; // 님의 Worker URL

/* Show initial placeholder */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;
updateGenerateButtonState(); // Disable button initially

/* --- Data Fetching and Initialization --- */

/**
 * Main function to initialize the application
 */
async function initializeStore() {
  try {
    const products = await loadProducts();
    allProducts = products; // Store products globally
    loadFromLocalStorage(); // Load saved selections
    renderSelectedProductsList(); // Render the list based on loaded data
    filterAndRenderProducts(); // Initial render of products
  } catch (error) {
    console.error("Error initializing store:", error);
    productsContainer.innerHTML = `<div class="placeholder-message">Error loading products. Please try again.</div>`;
  }
}

/**
 * Load product data from JSON file
 */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* --- Product Grid Rendering (LevelUp: Combined Filters) --- */

/**
 * Filters products based on BOTH category and search, then renders the grid
 */
function filterAndRenderProducts() {
  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearch.value.toLowerCase().trim();

  let filteredProducts = allProducts;

  // 1. Filter by Category (if one is selected)
  if (selectedCategory && selectedCategory !== "all") {
    filteredProducts = filteredProducts.filter(
      (product) => product.category === selectedCategory
    );
  }

  // 2. Filter by Search Term (if one is entered)
  if (searchTerm) {
    filteredProducts = filteredProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );
  }

  // 3. Display the results
  displayFilteredProducts(filteredProducts);
}

/**
 * Renders the actual product cards to the DOM
 * @param {Array} productsToDisplay - The final array of products to show
 */
function displayFilteredProducts(productsToDisplay) {
  // If no category is selected AND no search term, show placeholder
  if (
    (!categoryFilter.value || categoryFilter.value === "") &&
    !productSearch.value
  ) {
    productsContainer.innerHTML = `<div class="placeholder-message">Select a category to view products</div>`;
    return;
  }

  if (productsToDisplay.length === 0) {
    productsContainer.innerHTML = `<div class="placeholder-message">No products found matching your criteria.</div>`;
    return;
  }

  productsContainer.innerHTML = productsToDisplay
    .map((product) => {
      const isSelected = selectedProductIds.has(product.id);
      return `
    <div 
      class="product-card ${isSelected ? "selected" : ""}" 
      data-product-id="${product.id}"
    >
      <div class="product-card-content">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
        </div>
      </div>
      <button class="toggle-desc">Details</button>
      <p class="product-description">${product.description}</p>
    </div>
  `;
    })
    .join("");
}

/* --- Product Selection Logic --- */

function toggleProductSelection(card) {
  const productId = parseInt(card.dataset.productId);
  if (selectedProductIds.has(productId)) {
    selectedProductIds.delete(productId);
    card.classList.remove("selected");
  } else {
    selectedProductIds.add(productId);
    card.classList.add("selected");
  }
  saveToLocalStorage();
  renderSelectedProductsList();
  updateGenerateButtonState();
}

function toggleDescription(button) {
  const card = button.closest(".product-card");
  card.classList.toggle("expanded");
  button.textContent = card.classList.contains("expanded")
    ? "Hide"
    : "Details";
}

/* --- Selected Products List Logic --- */

function renderSelectedProductsList() {
  if (selectedProductIds.size === 0) {
    selectedProductsList.innerHTML = `<p class="placeholder-message">No products selected yet.</p>`;
    return;
  }
  const selectedProducts = allProducts.filter((product) =>
    selectedProductIds.has(product.id)
  );
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
    <div class="selected-product-item" data-product-id="${product.id}">
      <span>${product.name}</span>
      <button class="remove-product-btn">&times;</button>
    </div>
  `
    )
    .join("");
}

function removeProductFromList(button) {
  const item = button.closest(".selected-product-item");
  const productId = parseInt(item.dataset.productId);
  selectedProductIds.delete(productId);
  saveToLocalStorage();
  renderSelectedProductsList();
  updateGenerateButtonState();
  const cardInGrid = productsContainer.querySelector(
    `.product-card[data-product-id="${productId}"]`
  );
  if (cardInGrid) {
    cardInGrid.classList.remove("selected");
  }
}

function updateGenerateButtonState() {
  generateRoutineBtn.disabled = selectedProductIds.size === 0;
}

/* --- LocalStorage --- */

function saveToLocalStorage() {
  localStorage.setItem(
    "selectedProductIds",
    JSON.stringify(Array.from(selectedProductIds))
  );
}

function loadFromLocalStorage() {
  const savedIds = localStorage.getItem("selectedProductIds");
  if (savedIds) {
    selectedProductIds = new Set(JSON.parse(savedIds).map(Number));
  }
}

/*
 * 🚀 --- AI & CHAT LOGIC --- 🚀
 */

function appendMessage(htmlContent, sender) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("chat-message", `${sender}-message`);
  messageElement.innerHTML = htmlContent;
  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

generateRoutineBtn.addEventListener("click", async () => {
  appendMessage("Generating your personalized routine...", "ai-loading");
  const selectedProducts = allProducts.filter((product) =>
    selectedProductIds.has(product.id)
  );
  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedProducts: selectedProducts }),
    });
    if (!response.ok) throw new Error(`AI Worker error: ${response.statusText}`);
    const data = await response.json();
    const routineHtml = data.routine;
    chatWindow.querySelector(".ai-loading").remove();
    appendMessage(routineHtml, "ai");
    conversationHistory = [
      {
        role: "system",
        content:
          "You are a helpful skincare and beauty routine advisor with up-to-date knowledge. The user has just received a routine. Continue the conversation helpfully.",
      },
      { role: "assistant", content: routineHtml },
    ];
  } catch (error) {
    console.error("Error generating routine:", error);
    chatWindow.querySelector(".ai-loading")?.remove();
    appendMessage(
      `Sorry, I couldn't generate a routine. Error: ${error.message}`,
      "ai-error"
    );
  }
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userMessage = userInputField.value.trim();
  if (userMessage === "") return;
  appendMessage(userMessage, "user");
  userInputField.value = "";
  conversationHistory.push({ role: "user", content: userMessage });
  appendMessage("Thinking...", "ai-loading");
  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationHistory: conversationHistory }),
    });
    if (!response.ok) throw new Error(`AI Worker error: ${response.statusText}`);
    const data = await response.json();
    const aiResponseHtml = data.routine;
    chatWindow.querySelector(".ai-loading").remove();
    appendMessage(aiResponseHtml, "ai");
    conversationHistory.push({ role: "assistant", content: aiResponseHtml });
  } catch (error) {
    console.error("Error in chat follow-up:", error);
    chatWindow.querySelector(".ai-loading")?.remove();
    appendMessage(
      `Sorry, I ran into an error. ${error.message}`,
      "ai-error"
    );
  }
});

/* --- Event Listeners --- */

// 1. Category Filter
categoryFilter.addEventListener("change", filterAndRenderProducts);

// 2. LevelUp: Search Input
productSearch.addEventListener("input", filterAndRenderProducts);

// 3. Product Grid (Event Delegation)
productsContainer.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest(".toggle-desc");
  if (toggleBtn) {
    e.stopPropagation();
    toggleDescription(toggleBtn);
    return;
  }
  const card = e.target.closest(".product-card");
  if (card) {
    toggleProductSelection(card);
  }
});

// 4. Selected Products List (Event Delegation)
selectedProductsList.addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".remove-product-btn");
  if (removeBtn) {
    removeProductFromList(removeBtn);
  }
});

// 5. LevelUp: RTL Toggle Button
rtlToggleBtn.addEventListener("click", () => {
  const htmlEl = document.documentElement;
  htmlEl.dir = htmlEl.dir === "rtl" ? "ltr" : "rtl";
});

// --- Initial Load ---
const allOption = document.createElement("option");
allOption.value = "all";
allOption.textContent = "All Products";
categoryFilter.prepend(allOption);
categoryFilter.value = ""; // Start with no category selected

initializeStore();