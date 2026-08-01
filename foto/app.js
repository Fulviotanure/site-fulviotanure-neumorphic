// FULVIO TANURE | FOTOGRAFIA - Modern Portfolio Engine (Light & Interactive Edition)

// --- State Management ---
let activeFilter = "todos";
let filteredPhotos = [];
let loadedCount = 0;
const itemsPerPage = 16;
let isLoading = false;
let currentLightboxIndex = 0;
let infiniteScrollObserver = null;
let revealObserver = null;

// Hero Showcase State
let showcaseIndex = 0;
let showcaseTimer = null;



// --- DOM Elements ---
const header = document.querySelector("header");
const navMenu = document.getElementById("navMenu");
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.querySelectorAll(".nav-link");
const filterButtons = document.querySelectorAll(".filter-btn");
const galleryGrid = document.getElementById("galleryGrid");
const spinner = document.getElementById("spinner");
const lightbox = document.getElementById("lightbox");
const lightboxImg = lightbox.querySelector(".lightbox-img");
const lightboxCaption = lightbox.querySelector(".lightbox-caption");
const lightboxMeta = lightbox.querySelector(".lightbox-meta");
const lightboxClose = lightbox.querySelector(".lightbox-close");
const lightboxPrev = lightbox.querySelector(".lightbox-prev");
const lightboxNext = lightbox.querySelector(".lightbox-next");
const contactForm = document.getElementById("contactForm");
const formFeedback = document.getElementById("formFeedback");
const backButtonContainer = document.getElementById("backButtonContainer");


const showcaseSlides = document.querySelectorAll(".showcase-slide");

// --- Banco de fotos (preenchido via API ou fallback estático) ---
let photos = [];

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  setupHeaderScroll();
  setupMenuToggle();
  setupScrollReveal();
  setupLightbox();
  setupContactForm();
  setupScrollIndicator();
  setupHeroShowcase();

  // Tenta carregar fotos da API do servidor local (scan ao vivo)
  // Se não tiver servidor, usa o photos_data.js estático como fallback
  fetch("/foto/api/photos")
    .then(res => {
      if (!res.ok) throw new Error("API indisponível");
      return res.json();
    })
    .then(data => {
      photos = data;
      console.log(`[API] ${photos.length} fotos carregadas do servidor`);
      initGallery();
    })
    .catch(() => {
      // Fallback: usa o array global do photos_data.js
      if (typeof photosData !== "undefined" && Array.isArray(photosData)) {
        photos = photosData;
        console.log(`[Fallback] ${photos.length} fotos carregadas do arquivo estático`);
      } else {
        console.warn("Nenhuma fonte de fotos disponível.");
      }
      initGallery();
    });
});

function initGallery() {
  const hash = window.location.hash.substring(1);
  const initialFilter = ["retratos", "cenas", "ensaios"].includes(hash) ? hash : "todos";
  setupFilterButtons(initialFilter);
  setupInfiniteScroll();
}


// --- Hero Showcase Auto Slideshow ---
function setupHeroShowcase() {
  if (showcaseSlides.length === 0) return;

  // Function to switch showcase slide
  function switchSlide(index) {
    showcaseIndex = index;
    
    showcaseSlides.forEach(slide => slide.classList.remove("active"));
    showcaseSlides[showcaseIndex].classList.add("active");
  }

  // Automatic slideshow tick
  function startShowcaseTimer() {
    showcaseTimer = setInterval(() => {
      let next = (showcaseIndex + 1) % showcaseSlides.length;
      switchSlide(next);
    }, 4500); // Rotate every 4.5 seconds
  }

  startShowcaseTimer();
}

// --- Scroll-Reveal Logic (IntersectionObserver) ---
function setupScrollReveal() {
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal-active");
        revealObserver.unobserve(entry.target); // Animate once
      }
    });
  }, {
    root: null,
    rootMargin: "0px 0px -60px 0px", // Trigger when element is slightly inside screen
    threshold: 0.1
  });

  // Observe all static reveal items on initial load
  const revealItems = document.querySelectorAll(".reveal");
  revealItems.forEach(item => {
    revealObserver.observe(item);
  });
}

// --- Header Scroll Effect ---
function setupHeaderScroll() {
  const handleScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  };
  window.addEventListener("scroll", handleScroll);
  handleScroll();
}

// --- Mobile Navigation Drawer Menu ---
function setupMenuToggle() {
  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("open");
    navMenu.classList.toggle("open");
  });

  const mobileLinks = navMenu.querySelectorAll("a");
  mobileLinks.forEach(link => {
    link.addEventListener("click", () => {
      menuToggle.classList.remove("open");
      navMenu.classList.remove("open");
    });
  });
}

// --- Portfolio Filter & Category selection ---
function setupFilterButtons(initialFilter) {
  filterButtons.forEach(btn => {
    if (btn.getAttribute("data-filter") === initialFilter) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
    
    btn.addEventListener("click", (e) => {
      const filter = e.target.getAttribute("data-filter");
      if (filter === activeFilter) return;

      filterButtons.forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");

      applyCategoryFilter(filter);
    });
  });

  applyCategoryFilter(initialFilter);
}

// --- Fisher-Yates Shuffle ---
function shuffleArray(arr) {
  const shuffled = [...arr]; // cria cópia para não alterar o array original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function applyCategoryFilter(filter) {
  activeFilter = filter;
  loadedCount = 0;
  galleryGrid.innerHTML = "";
  
  // Reset back button and album view class by default
  if (backButtonContainer) {
    backButtonContainer.style.display = "none";
    backButtonContainer.innerHTML = "";
  }
  galleryGrid.classList.remove("album-view");
  
  if (filter === "todos") {
    // Galeria: todas as fotos exceto ensaios privados, em ordem aleatória a cada carregamento
    const base = photos.filter(p => p.category !== "karen" && p.category !== "raphaela");
    filteredPhotos = shuffleArray(base);
  } else if (filter === "ensaios") {
    // Render Photoshoots Album Index (Karen & Raphaela)
    galleryGrid.classList.add("album-view");
    
    const countKaren = photos.filter(p => p.category === "karen").length;
    const countRaphaela = photos.filter(p => p.category === "raphaela").length;
    
    // Find cover photos (2nd photo for Karen, 7th photo for Raphaela)
    const coverKaren = photos.filter(p => p.category === "karen")[1]?.src || "";
    const coverRaphaela = photos.filter(p => p.category === "raphaela")[6]?.src || "";
    
    galleryGrid.innerHTML = `
      <div class="album-card reveal reveal-up" onclick="openPhotoshoot('karen')">
        <div class="album-cover-container">
          <img src="${coverKaren}" alt="Karen" loading="lazy">
        </div>
        <div class="album-info">
          <h3 class="album-title">Karen</h3>
          <p class="album-count">${countKaren} Fotos</p>
        </div>
      </div>
      <div class="album-card reveal reveal-up" onclick="openPhotoshoot('raphaela')">
        <div class="album-cover-container">
          <img src="${coverRaphaela}" alt="Raphaela" loading="lazy">
        </div>
        <div class="album-info">
          <h3 class="album-title">Raphaela</h3>
          <p class="album-count">${countRaphaela} Fotos</p>
        </div>
      </div>
    `;
    
    const revealCards = galleryGrid.querySelectorAll(".reveal");
    revealCards.forEach(c => revealObserver.observe(c));
    
    spinner.style.display = "none";
    isLoading = false;
    return;
  } else if (filter === "cenas") {
    // Cenas: agrupa urbana + natureza + macro sob uma única visão artística
    filteredPhotos = photos.filter(p => p.category === "cenas");
  } else if (filter === "retratos") {
    filteredPhotos = photos.filter(p => p.category === "pessoas");
  }

  spinner.style.display = "flex";
  loadNextBatch();
}

// Photoshoot navigation functions
function openPhotoshoot(category) {
  galleryGrid.classList.remove("album-view");
  galleryGrid.innerHTML = "";
  
  if (backButtonContainer) {
    backButtonContainer.style.display = "flex";
    backButtonContainer.innerHTML = `
      <button class="btn-back" onclick="goBackToEnsaios()">
        &larr; Voltar para Ensaios
      </button>
    `;
    // Ensure back button transitions nicely
    backButtonContainer.classList.add("reveal", "reveal-fade");
    revealObserver.observe(backButtonContainer);
  }

  filteredPhotos = photos.filter(p => p.category === category);
  loadedCount = 0;
  
  spinner.style.display = "flex";
  loadNextBatch();
}

function goBackToEnsaios() {
  applyCategoryFilter("ensaios");
}

// Map photoshoot functions to window scope to trigger from inline HTML onclick handlers
window.openPhotoshoot = openPhotoshoot;
window.goBackToEnsaios = goBackToEnsaios;

// --- Infinite Scroll ---
function setupInfiniteScroll() {
  infiniteScrollObserver = new IntersectionObserver((entries) => {
    const spinnerEntry = entries[0];
    if (spinnerEntry.isIntersecting && !isLoading) {
      loadNextBatch();
    }
  }, {
    root: null,
    rootMargin: "300px",
    threshold: 0.1
  });

  infiniteScrollObserver.observe(spinner);
}

function loadNextBatch() {
  if (isLoading || loadedCount >= filteredPhotos.length) {
    if (loadedCount >= filteredPhotos.length) {
      spinner.style.display = "none";
    }
    return;
  }

  isLoading = true;
  const start = loadedCount;
  const end = Math.min(start + itemsPerPage, filteredPhotos.length);

  for (let i = start; i < end; i++) {
    const photo = filteredPhotos[i];
    const card = createPhotoCard(photo, i);
    galleryGrid.appendChild(card);
    
    // Register dynamically added cards in scroll reveal observer
    if (revealObserver) {
      revealObserver.observe(card);
    }
  }

  loadedCount = end;
  isLoading = false;

  if (loadedCount < filteredPhotos.length && spinner.getBoundingClientRect().top < window.innerHeight) {
    loadNextBatch();
  }
}

function createPhotoCard(photo, index) {
  const item = document.createElement("div");
  // Set reveal animation classes so the element transitions nicely on scroll
  item.className = "gallery-item reveal reveal-up";
  item.setAttribute("data-index", index);
  


  item.innerHTML = `
    <div class="image-container">
      <img src="${photo.src}" alt="${photo.title}" loading="lazy">
    </div>
  `;

  item.addEventListener("click", () => {
    openLightbox(index);
  });

  return item;
}

// --- Lightbox ---
function setupLightbox() {
  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", showPrevImage);
  lightboxNext.addEventListener("click", showNextImage);
  
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.classList.contains("lightbox-image-wrapper")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "ArrowLeft") showPrevImage();
    else if (e.key === "ArrowRight") showNextImage();
    else if (e.key === "Escape") closeLightbox();
  });
}

function openLightbox(index) {
  currentLightboxIndex = index;
  updateLightboxImage();
  
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  
  setTimeout(() => {
    lightboxImg.src = "";
  }, 400);
}

function showPrevImage() {
  if (currentLightboxIndex > 0) {
    currentLightboxIndex--;
  } else {
    currentLightboxIndex = filteredPhotos.length - 1;
  }
  updateLightboxImage();
}

function showNextImage() {
  if (currentLightboxIndex < filteredPhotos.length - 1) {
    currentLightboxIndex++;
  } else {
    currentLightboxIndex = 0;
  }
  updateLightboxImage();
}

function updateLightboxImage() {
  const photo = filteredPhotos[currentLightboxIndex];
  if (!photo) return;

  lightboxImg.style.opacity = "0";
  lightboxImg.style.transform = "translate3d(0, 0, 0) scale(0.97)";

  const imgLoader = new Image();
  imgLoader.src = photo.src;
  
  imgLoader.onload = () => {
    lightboxImg.src = photo.src;
    lightboxImg.alt = photo.title;
    
    // lightboxCaption.textContent = photo.title;
    
    let categoryLabel = photo.category;
    if (photo.category === "cenas") categoryLabel = "Cenas";
    else if (photo.category === "pessoas") categoryLabel = "Retratos";
    else if (photo.category === "karen") categoryLabel = "Ensaio — Karen";
    else if (photo.category === "raphaela") categoryLabel = "Ensaio — Raphaela";

    lightboxMeta.textContent = `${categoryLabel} • ${currentLightboxIndex + 1} de ${filteredPhotos.length}`;
    
    lightboxImg.style.opacity = "1";
    lightboxImg.style.transform = "translate3d(0, 0, 0) scale(1)";
  };
}

// --- Contact Form ---
function setupContactForm() {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name    = document.getElementById("name").value.trim();
    const email   = document.getElementById("email").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const message = document.getElementById("message").value.trim();

    const mailtoSubject = encodeURIComponent(subject || "Contato via site");
    const mailtoBody    = encodeURIComponent(
      `Nome: ${name}\nE-mail: ${email}\n\n${message}`
    );

    const submitBtn = contactForm.querySelector(".btn-submit");
    submitBtn.textContent = "Abrindo e-mail...";
    submitBtn.disabled = true;

    // Abre o cliente de e-mail com os dados preenchidos
    window.location.href = `mailto:ftanure3@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;

    setTimeout(() => {
      submitBtn.textContent = "Enviar Mensagem";
      submitBtn.disabled = false;

      formFeedback.className = "form-feedback success";
      formFeedback.textContent = "Cliente de e-mail aberto! Basta enviar a mensagem.";
      contactForm.reset();

      setTimeout(() => {
        formFeedback.textContent = "";
        formFeedback.className = "form-feedback";
      }, 6000);
    }, 800);
  });
}

// --- Scroll Indicator & Active Page highlight ---
function setupScrollIndicator() {
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".nav-link");

  window.addEventListener("scroll", () => {
    let current = "";
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active");
      }
    });
  });
}


