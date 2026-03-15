function toggleMenu() {
  var menuList = document.getElementsByClassName("menu-list")[0];
  var menuButton = document.getElementById("menu-btn");
  if (menuList.classList.contains("active")) {
    menuList.classList.remove("active");
    menuButton.innerHTML = "菜单";
  } else {
    menuList.classList.add("active");
    menuButton.innerHTML = "菜单";
  }
}

function closeMenu() {
  var menuList = document.getElementsByClassName("menu-list")[0];
  var menuButton = document.getElementById("menu-btn");
  if (menuList.classList.contains("active")) {
    menuList.classList.remove("active");
    menuButton.innerHTML = "菜单";
  }
}

document.addEventListener("DOMContentLoaded", function() {
  var menuItems = document.querySelectorAll(".menu-item a");
  menuItems.forEach(function(item) {
    item.addEventListener("click", closeMenu);
  });
});