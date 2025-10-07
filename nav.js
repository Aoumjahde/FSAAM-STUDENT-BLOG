const hamburger = document.querySelector('.nav_hamburger');
const linksContainer = document.querySelector('.nav_menu');


hamburger.addEventListener('click', () => {
    linksContainer.classList.toggle('active');
    hamburger.classList.toggle('active');
});
