// Search functionality for standalone search page

(function () {
  'use strict';

  let localSearch = null;
  let isDataLoaded = false;

  function initSearch() {
    const input = document.getElementById('search-input');
    const container = document.getElementById('search-results');

    if (!input || !container || typeof LocalSearch === 'undefined') {
      container.innerHTML = '<div class="search-result-message">搜索功能初始化失败</div>';
      return;
    }

    localSearch = new LocalSearch({
      path: searchConfig.path,
      top_n_per_article: searchConfig.top_n_per_article,
      unescape: searchConfig.unescape
    });

    localSearch.fetchData();

    window.addEventListener('search:loaded', function () {
      isDataLoaded = true;
      container.innerHTML = '<div class="search-result-message"></div>';
    });

    function displaySearchResult() {
      if (!isDataLoaded) {
        container.innerHTML = '<div class="search-result-message">加载中...</div>';
        return;
      }

      const searchText = input.value.trim().toLowerCase();

      if (searchText.length === 0) {
        container.innerHTML = '<div class="search-result-message"></div>';
        return;
      }

      const keywords = searchText.split(/[-\s]+/);
      const resultItems = localSearch.getResultItems(keywords);

      if (resultItems.length === 0) {
        container.innerHTML = '<div class="search-result-message">未找到相关结果</div>';
      } else {
        container.innerHTML = `
          <div class="search-result-message">找到 ${resultItems.length} 个结果</div>
          <ul class="search-result-list">
            ${resultItems.map(result => result.item).join('')}
          </ul>
        `;
      }
    }

    input.addEventListener('input', displaySearchResult);
    input.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
  } else {
    initSearch();
  }
})();
