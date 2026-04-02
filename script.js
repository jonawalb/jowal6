// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// Mobile nav toggle
const toggle = document.getElementById('nav-toggle');
const links = document.getElementById('nav-links');
toggle.addEventListener('click', () => {
    links.classList.toggle('open');
});
// Close mobile nav on link click
links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
});

// Fade-in on scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('visible');
        }
    });
}, { threshold: 0.12 });

document.querySelectorAll(
    '.timeline-item, .pub-item, .grant-card, .pres-item, .teaching-item, .service-item, .about-grid, .edu-item'
).forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
});
