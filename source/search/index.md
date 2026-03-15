---
title: 搜索
---

<div class="search-page">
  <div class="search-input-container">
    <input autocomplete="off" autocapitalize="off" maxlength="80"
           placeholder="输入关键词搜索..." spellcheck="false"
           type="search" class="search-input" id="search-input">
  </div>
  <div class="search-result-container" id="search-results">
    <div class="search-result-message"></div>
  </div>
</div>

<script>
    const searchConfig = {
        path             : "/search.xml",
        top_n_per_article: "-1",
        unescape         : "false",
        trigger: "auto",
        preload: "false"
    }
</script>
<script src="https://cdn.jsdelivr.net/npm/hexo-generator-searchdb@1.4.0/dist/search.js"></script>
<script src="/js/search.js"></script>
