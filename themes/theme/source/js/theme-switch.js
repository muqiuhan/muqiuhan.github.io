document.addEventListener('DOMContentLoaded', () => {
  const themeSwitch = document.getElementById('theme-switch-btn');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  
  // 检查本地存储中的主题设置
  const currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-theme');
    themeSwitch.querySelector('i').classList.replace('icon-moon', 'icon-sun');
  } else if (currentTheme === 'light') {
    document.body.classList.remove('dark-theme');
  } else if (prefersDarkScheme.matches) {
    document.body.classList.add('dark-theme');
    themeSwitch.querySelector('i').classList.replace('icon-moon', 'icon-sun');
  }
  
  // 切换主题
  themeSwitch.addEventListener('click', (e) => {
    e.preventDefault();
    
    if (document.body.classList.contains('dark-theme')) {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
      themeSwitch.querySelector('i').classList.replace('icon-sun', 'icon-moon');
    } else {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
      themeSwitch.querySelector('i').classList.replace('icon-moon', 'icon-sun');
    }
  });
}); 