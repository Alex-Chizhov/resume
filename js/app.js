/**
 * QAlify Blog Application Logic
 * Modular Article Architecture: Each article is stored in its own folder under `articles/<slug>/`.
 * Loads article list from `articles/index.json` and body from `articles/<slug>/content.html`.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // State management
  const INITIAL_PAGE_SIZE = 10;
  const LOAD_MORE_STEP = 5;
  let visibleArticlesCount = INITIAL_PAGE_SIZE;
  let currentCategory = 'all';
  let articlesData = [];

  // DOM Elements
  const articlesFeedElement = document.getElementById('articlesFeed');
  const feedCounterElement = document.getElementById('feedCounter');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const loadMoreContainer = document.getElementById('loadMoreContainer');
  
  const mainFeedView = document.getElementById('mainFeedView');
  const articleDetailView = document.getElementById('articleDetailView');
  const articleDetailContent = document.getElementById('articleDetailContent');
  const btnBack = document.getElementById('btnBackToFeed');
  const brandLogo = document.getElementById('brandLogo');

  // Load articles index from articles/index.json
  async function loadArticlesIndex() {
    try {
      const response = await fetch('articles/index.json');
      if (!response.ok) throw new Error('Failed to load articles index');
      articlesData = await response.json();
      renderArticlesFeed();
      handleRoute();
    } catch (err) {
      console.error('Error loading articles index:', err);
      articlesFeedElement.innerHTML = `
        <div style="padding: 30px; text-align: center; color: var(--accent-rose);">
          <p>Ошибка загрузки списка статей. Убедитесь, что сервер запущен.</p>
        </div>
      `;
    }
  }

  // Helper: Truncate text to approximately 100 characters
  function truncateText(text, maxLength = 100) {
    if (!text) return '';
    const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
    if (cleanText.length <= maxLength) return cleanText;
    
    let truncated = cleanText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 70) {
      truncated = truncated.substring(0, lastSpace);
    }
    return truncated + '...';
  }

  // Render article feed list
  function renderArticlesFeed() {
    let filtered = articlesData;
    if (currentCategory !== 'all') {
      filtered = articlesData.filter(art => art.category === currentCategory);
    }

    const totalCount = filtered.length;
    const articlesToDisplay = filtered.slice(0, visibleArticlesCount);

    if (articlesToDisplay.length === 0) {
      articlesFeedElement.innerHTML = `
        <div class="no-articles" style="padding: 40px; text-align: center; color: var(--text-muted);">
          <p>Статьи в данной категории не найдены.</p>
        </div>
      `;
      feedCounterElement.textContent = `0 из ${totalCount} статей`;
      loadMoreContainer.style.display = 'none';
      return;
    }

    // Build article card HTML
    articlesFeedElement.innerHTML = articlesToDisplay.map(article => {
      const snippet = truncateText(article.excerpt, 100);
      return `
        <article class="article-card" data-slug="${article.slug}">
          <div class="card-image-wrapper">
            <img class="card-image" src="${article.image}" alt="${article.title}" loading="lazy" />
            <span class="card-badge">${article.category}</span>
          </div>
          <div class="card-body">
            <div>
              <div class="card-meta">
                <span>📅 ${article.date}</span>
                <span>•</span>
                <span>⏱️ ${article.readTime}</span>
              </div>
              <h2 class="card-title">${article.title}</h2>
              <p class="card-excerpt">${snippet}</p>
            </div>
            <div class="card-footer">
              <span class="read-more-link">Читать дальше →</span>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Update counter text
    feedCounterElement.textContent = `Показано ${articlesToDisplay.length} из ${totalCount} статей`;

    // Handle "Load More" button visibility
    if (visibleArticlesCount < totalCount) {
      loadMoreContainer.style.display = 'flex';
      loadMoreBtn.disabled = false;
      loadMoreBtn.innerHTML = `Загрузить еще (${totalCount - visibleArticlesCount})`;
    } else {
      loadMoreContainer.style.display = 'none';
    }

    // Add click listeners to cards
    const cards = articlesFeedElement.querySelectorAll('.article-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.getAttribute('data-slug');
        openArticle(slug);
      });
    });
  }

  // Open single article view by fetching content from articles/<slug>/content.html
  async function openArticle(slug) {
    const article = articlesData.find(a => a.slug === slug);
    if (!article) return;

    articleDetailContent.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted);">
        <p>Загрузка статьи...</p>
      </div>
    `;

    mainFeedView.style.display = 'none';
    articleDetailView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.location.hash = `/article/${slug}`;

    try {
      // Fetch article content HTML from its specific folder
      const contentRes = await fetch(`articles/${slug}/content.html`);
      if (!contentRes.ok) throw new Error('Could not load article content');
      const bodyHtml = await contentRes.text();

      articleDetailContent.innerHTML = `
        <div class="detail-header">
          <span class="detail-category">${article.category}</span>
          <h1 class="detail-title">${article.title}</h1>
          <div class="detail-meta">
            <span>📅 ${article.date}</span>
            <span>•</span>
            <span>⏱️ Время чтения: ${article.readTime}</span>
          </div>
        </div>

        <img class="detail-hero-cover" src="${article.image}" alt="${article.title}" />

        <div class="detail-body">
          ${bodyHtml}
        </div>
      `;

      // Trigger IDE syntax highlighting if Highlight.js is present
      if (window.hljs) {
        document.querySelectorAll('#articleDetailContent pre code').forEach((el) => {
          window.hljs.highlightElement(el);
        });
      }

      // Add smooth scroll listener for Table of Contents anchor links
      document.querySelectorAll('#articleDetailContent a[href^="#pattern-"]').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const targetId = anchor.getAttribute('href').substring(1);
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });
    } catch (err) {
      console.error(err);
      articleDetailContent.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--accent-rose);">
          <p>Не удалось загрузить содержимое статьи.</p>
        </div>
      `;
    }
  }

  // Show main feed view
  function showFeed() {
    articleDetailView.classList.remove('active');
    mainFeedView.style.display = 'block';
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Event Listeners
  loadMoreBtn.addEventListener('click', () => {
    visibleArticlesCount += LOAD_MORE_STEP;
    renderArticlesFeed();
  });

  btnBack.addEventListener('click', (e) => {
    e.preventDefault();
    showFeed();
  });

  brandLogo.addEventListener('click', (e) => {
    e.preventDefault();
    showFeed();
  });

  // Handle Hash Routing
  function handleRoute() {
    if (!articlesData.length) return;
    const hash = window.location.hash;
    if (hash.startsWith('#/article/')) {
      const slug = hash.replace('#/article/', '');
      openArticle(slug);
    } else {
      showFeed();
    }
  }

  window.addEventListener('popstate', handleRoute);

  // Category tags filter
  const tagItems = document.querySelectorAll('.tag-item');
  tagItems.forEach(tag => {
    tag.addEventListener('click', () => {
      tagItems.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      currentCategory = tag.getAttribute('data-category');
      visibleArticlesCount = INITIAL_PAGE_SIZE;
      renderArticlesFeed();
    });
  });

  // Start by loading the articles index
  loadArticlesIndex();
});
